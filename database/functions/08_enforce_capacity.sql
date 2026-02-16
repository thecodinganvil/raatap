-- 08_enforce_capacity.sql
-- Updates accept_match_suggestion to prevent overbooking and clean up pending matches
-- FIX: Renamed parameters to p_* to avoid "ambiguous column reference" errors
-- FIX: Added helper function definition to be self-contained

-- Helper function to expire matches if full (Ensuring it exists)
CREATE OR REPLACE FUNCTION expire_pending_matches_if_full(template_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    template_record RECORD;
BEGIN
    SELECT * INTO template_record FROM ride_templates WHERE id = template_id;
    
    IF template_record.seats_taken >= template_record.available_seats THEN
        UPDATE match_suggestions
        SET status = 'expired'
        WHERE ride_template_id = template_id
        AND status = 'pending';
    END IF;
END;
$$;

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
        'pending_rider',
        NOW()
    FROM ride_requests rr
    WHERE rr.id = match_record.ride_request_id;
    
    -- Update ride request status
    UPDATE ride_requests 
    SET status = 'matched'
    WHERE id = match_record.ride_request_id;

    -- CRITICAL: Check if we just filled the last seat and expire others
    -- We use the helper function defined above
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
