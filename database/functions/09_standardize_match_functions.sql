-- Match Suggestion Functions with Standardized Parameter Naming (p_* prefix)
-- This file consolidates all match management functions with consistent naming conventions

-- Helper function to expire matches if full
CREATE OR REPLACE FUNCTION expire_pending_matches_if_full(p_template_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    template_record RECORD;
BEGIN
    SELECT * INTO template_record FROM ride_templates WHERE id = p_template_id;

    IF template_record.seats_taken >= template_record.available_seats THEN
        UPDATE match_suggestions
        SET status = 'expired'
        WHERE ride_template_id = p_template_id
        AND status = 'pending';
    END IF;
END;
$$;

-- Function for host to accept a match (creates pod member in pending_rider status)
CREATE OR REPLACE FUNCTION accept_match_suggestion(
    p_match_id UUID,
    p_host_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    match_record RECORD;
    new_pod UUID;
    existing_pod UUID;
BEGIN
    -- Get match suggestion details with template info
    SELECT ms.*,
           rt.host_id,
           rt.seats_taken,
           rt.available_seats,
           rt.from_location,
           rt.to_location,
           rt.departure_time,
           rt.days_available
    INTO match_record
    FROM match_suggestions ms
    JOIN ride_templates rt ON ms.ride_template_id = rt.id
    WHERE ms.id = p_match_id;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Match not found');
    END IF;

    -- Verify host ownership
    IF match_record.host_id != p_host_id THEN
        RETURN json_build_object('success', false, 'error', 'Not authorized');
    END IF;

    -- CRITICAL: Check capacity
    IF match_record.seats_taken >= match_record.available_seats THEN
        RETURN json_build_object('success', false, 'error', 'Ride is full. Cannot accept more riders.');
    END IF;

    -- Check if a pod already exists for this ride template
    SELECT id INTO existing_pod
    FROM pods
    WHERE ride_template_id = match_record.ride_template_id
    AND status = 'active'
    LIMIT 1;

    IF existing_pod IS NULL THEN
        -- Create new pod
        INSERT INTO pods (
            ride_template_id,
            host_id,
            name,
            days_active,
            departure_time,
            origin_location,
            destination_location,
            status
        ) VALUES (
            match_record.ride_template_id,
            p_host_id,
            COALESCE('Daily Commute - ' || match_record.from_location, 'Ride Pod'),
            match_record.days_available,
            match_record.departure_time,
            match_record.from_location,
            match_record.to_location,
            'active'
        ) RETURNING id INTO new_pod;
    ELSE
        new_pod := existing_pod;
    END IF;

    -- Update match suggestion status
    UPDATE match_suggestions
    SET status = 'accepted',
        host_action_at = NOW()
    WHERE id = p_match_id;

    -- Increment seats taken on template (temporary seat lock)
    UPDATE ride_templates
    SET seats_taken = seats_taken + 1
    WHERE id = match_record.ride_template_id;

    -- Create pod member in pending_rider status
    INSERT INTO pod_members (
        pod_id,
        rider_id,
        ride_request_id,
        pickup_location,
        pickup_lat,
        pickup_lng,
        pickup_point,
        pickup_landmark,
        status,
        host_approved_at
    ) SELECT
        new_pod,
        rr.rider_id,
        rr.id,
        rr.pickup_location,
        rr.pickup_lat,
        rr.pickup_lng,
        rr.pickup_point,
        rr.pickup_landmark,
        'pending_rider',
        NOW()
    FROM ride_requests rr
    WHERE rr.id = match_record.ride_request_id;

    -- Update ride request status
    UPDATE ride_requests
    SET status = 'matched'
    WHERE id = match_record.ride_request_id;

    -- CRITICAL: Check if we just filled the last seat and expire others
    PERFORM expire_pending_matches_if_full(match_record.ride_template_id);

    RETURN json_build_object(
        'success', true,
        'pod_id', new_pod,
        'match_id', p_match_id,
        'message', 'Match accepted. Waiting for rider confirmation.'
    );

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;

-- Function for rider to confirm a match (activates pod membership)
CREATE OR REPLACE FUNCTION confirm_match_suggestion(
    p_match_id UUID,
    p_rider_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    match_record RECORD;
    pod_member_id UUID;
BEGIN
    -- Get match suggestion and verify rider ownership
    SELECT ms.*, rr.rider_id
    INTO match_record
    FROM match_suggestions ms
    JOIN ride_requests rr ON ms.ride_request_id = rr.id
    WHERE ms.id = p_match_id
    AND ms.status = 'accepted'
    AND rr.rider_id = p_rider_id;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Match not found or not ready for confirmation');
    END IF;

    -- Find and update the pod member to active
    UPDATE pod_members
    SET status = 'active',
        rider_confirmed_at = NOW(),
        joined_at = NOW()
    WHERE ride_request_id = match_record.ride_request_id
    AND status = 'pending_rider'
    RETURNING id INTO pod_member_id;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Pod member not found');
    END IF;

    -- Update confirmed match status
    UPDATE match_suggestions
    SET status = 'confirmed'
    WHERE id = p_match_id;

    -- CRITICAL: Expire all OTHER matches for this rider (prevent double booking)
    UPDATE match_suggestions
    SET status = 'expired'
    WHERE ride_request_id = match_record.ride_request_id
    AND id != p_match_id
    AND status IN ('pending', 'shown', 'accepted');

    -- CRITICAL: Check if seat is now full for this template
    PERFORM expire_pending_matches_if_full(match_record.ride_template_id);

    RETURN json_build_object(
        'success', true,
        'pod_member_id', pod_member_id,
        'match_id', p_match_id,
        'message', 'Match confirmed! You are now part of the ride.'
    );

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;

-- Function to skip/decline a match (handles both host and rider rejection)
CREATE OR REPLACE FUNCTION skip_match_suggestion(
    p_match_id UUID,
    p_user_id UUID,
    p_user_role TEXT -- 'host' or 'rider'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    match_record RECORD;
    is_owner BOOLEAN := false;
BEGIN
    -- Verify match ownership based on role
    IF p_user_role = 'host' THEN
        SELECT ms.*, rt.host_id
        INTO match_record
        FROM match_suggestions ms
        JOIN ride_templates rt ON ms.ride_template_id = rt.id
        WHERE ms.id = p_match_id AND rt.host_id = p_user_id;

        is_owner := FOUND;

    ELSIF p_user_role = 'rider' THEN
        SELECT ms.*, rr.rider_id
        INTO match_record
        FROM match_suggestions ms
        JOIN ride_requests rr ON ms.ride_request_id = rr.id
        WHERE ms.id = p_match_id AND rr.rider_id = p_user_id;

        is_owner := FOUND;

    ELSE
        RETURN json_build_object('success', false, 'error', 'Invalid user role');
    END IF;

    IF NOT FOUND OR NOT is_owner THEN
        RETURN json_build_object('success', false, 'error', 'Match not found or not accessible');
    END IF;

    -- Logic Branching based on role
    IF p_user_role = 'host' THEN
        -- Host skipped: just mark skipped
        UPDATE match_suggestions
        SET status = 'skipped'
        WHERE id = p_match_id;

    ELSIF p_user_role = 'rider' THEN
        -- Rider rejected:
        -- If status was 'accepted' (Host waiting), we need to revert seat count
        IF match_record.status = 'accepted' THEN
             UPDATE ride_templates
             SET seats_taken = seats_taken - 1
             WHERE id = match_record.ride_template_id;

             DELETE FROM pod_members
             WHERE ride_request_id = match_record.ride_request_id
             AND status = 'pending_rider';
        END IF;

        -- Mark as skipped
        UPDATE match_suggestions
        SET status = 'skipped'
        WHERE id = p_match_id;

    END IF;

    RETURN json_build_object(
        'success', true,
        'message', 'Match skipped/rejected'
    );

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;
