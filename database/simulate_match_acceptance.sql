-- Script to simulate a Host accepting a match suggestion
-- This demonstrates the next step in the workflow: Match -> Pod

DO $$
DECLARE
    target_match_id UUID;
    target_host_id UUID;
    result JSON;
BEGIN
    -- 1. Find a random pending match suggestion
    SELECT id, (SELECT host_id FROM ride_templates WHERE id = ride_template_id)
    INTO target_match_id, target_host_id
    FROM match_suggestions
    WHERE status = 'pending'
    LIMIT 1;

    IF target_match_id IS NULL THEN
        RAISE NOTICE 'No pending matches found. Run generate_all_matches.sql first.';
        RETURN;
    END IF;

    RAISE NOTICE 'Found pending match: % for Host: %', target_match_id, target_host_id;

    -- 2. Host accepts the match (Creating a Pod)
    -- Function: accept_match_suggestion(match_id, host_id, pod_name)
    result := accept_match_suggestion(
        target_match_id,
        target_host_id,
        'My Carpool Pod' -- Optional custom name
    );

    RAISE NOTICE 'Host Acceptance Result: %', result;
    
    -- 3. Verify the changes
    -- Check if Pod was created
    PERFORM * FROM pods WHERE ride_template_id = (SELECT ride_template_id FROM match_suggestions WHERE id = target_match_id);
    IF FOUND THEN
        RAISE NOTICE 'Success: Pod created for the match.';
    END IF;

END;
$$;
