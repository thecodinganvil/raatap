-- Match Workflow Updates

-- 1. Update confirm_match_suggestion to expire competing matches
DROP FUNCTION IF EXISTS confirm_match_suggestion(uuid, uuid);

CREATE OR REPLACE FUNCTION confirm_match_suggestion(
    match_id UUID,
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
    WHERE ms.id = match_id 
    AND ms.status = 'accepted' -- Must be accepted by host
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
    WHERE id = match_id;

    -- CRITICAL: Expire all OTHER matches for this rider (prevent double booking)
    UPDATE match_suggestions
    SET status = 'expired'
    WHERE ride_request_id = match_record.ride_request_id
    AND id != match_id
    AND status IN ('pending', 'shown', 'accepted');

    -- CRITICAL: Check if seat is now full for this template?
    -- (Logic: If seats_taken >= available_seats, expire pending matches for this template)
    -- We can do a check here or trust the `accept_match_suggestion` logic which incremented seats_taken.
    -- Better safe:
    PERFORM expire_pending_matches_if_full(match_record.ride_template_id);
    
    RETURN json_build_object(
        'success', true,
        'pod_member_id', pod_member_id,
        'match_id', match_id,
        'message', 'Match confirmed! You are now part of the ride.'
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false, 
        'error', SQLERRM
    );
END;
$$;

-- Helper function to expire matches if full
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

-- 2. Update skip_match_suggestion to handle Rider rejection correctly
CREATE OR REPLACE FUNCTION skip_match_suggestion(
    match_id UUID,
    user_id UUID,
    user_role TEXT -- 'host' or 'rider'
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
    IF user_role = 'host' THEN
        SELECT ms.*, rt.host_id
        INTO match_record
        FROM match_suggestions ms
        JOIN ride_templates rt ON ms.ride_template_id = rt.id
        WHERE ms.id = match_id AND rt.host_id = user_id;
        
        is_owner := FOUND;
        
    ELSIF user_role = 'rider' THEN
        SELECT ms.*, rr.rider_id
        INTO match_record
        FROM match_suggestions ms
        JOIN ride_requests rr ON ms.ride_request_id = rr.id
        WHERE ms.id = match_id AND rr.rider_id = user_id;
        
        is_owner := FOUND;
        
    ELSE
        RETURN json_build_object('success', false, 'error', 'Invalid user role');
    END IF;
    
    IF NOT FOUND OR NOT is_owner THEN
        RETURN json_build_object('success', false, 'error', 'Match not found or not accessible');
    END IF;
    
    -- Logic Branching
    IF user_role = 'host' THEN
        -- Host skipped: just mark skipped
        UPDATE match_suggestions 
        SET status = 'skipped'
        WHERE id = match_id;
        
    ELSIF user_role = 'rider' THEN
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
        
        -- Mark as skipped (or expired? "skipped" by user seems correct action)
        UPDATE match_suggestions 
        SET status = 'skipped'
        WHERE id = match_id;
        
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
