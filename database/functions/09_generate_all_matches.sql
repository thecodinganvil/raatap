-- =====================================================
-- GENERATE ALL MATCHES - Single function to run all matching
-- =====================================================
-- This function generates match suggestions for ALL active
-- ride templates and ride requests in one call
-- =====================================================

CREATE OR REPLACE FUNCTION generate_all_matches()
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    template_record RECORD;
    request_record RECORD;
    total_templates INTEGER := 0;
    total_requests INTEGER := 0;
    total_matches INTEGER := 0;
BEGIN
    -- =====================================================
    -- STEP 1: Generate matches for all active ride templates
    -- =====================================================
    FOR template_record IN 
        SELECT id, host_id, from_location, to_location
        FROM ride_templates
        WHERE status = 'active'
    LOOP
        -- Generate matches for this template
        PERFORM generate_match_suggestions_for_ride_template(template_record.id);
        
        total_templates := total_templates + 1;
    END LOOP;

    -- =====================================================
    -- STEP 2: Generate matches for all active ride requests
    -- =====================================================
    FOR request_record IN 
        SELECT id, rider_id, pickup_location, destination_location
        FROM ride_requests
        WHERE status = 'active'
    LOOP
        -- Generate matches for this request
        PERFORM generate_match_suggestions_for_ride_request(request_record.id);
        
        total_requests := total_requests + 1;
    END LOOP;

    -- =====================================================
    -- STEP 3: Count total matches created
    -- =====================================================
    SELECT COUNT(*) INTO total_matches
    FROM match_suggestions
    WHERE status = 'pending';

    -- =====================================================
    -- RETURN SUMMARY
    -- =====================================================
    RETURN json_build_object(
        'success', true,
        'templates_processed', total_templates,
        'requests_processed', total_requests,
        'total_matches', total_matches,
        'message', 'Match generation complete'
    );
END;
$$;

-- =====================================================
-- USAGE:
-- =====================================================
-- SELECT generate_all_matches();
-- 
-- Returns:
-- {
--   "success": true,
--   "templates_processed": 4,
--   "requests_processed": 3,
--   "total_matches": 12,
--   "message": "Match generation complete"
-- }
-- =====================================================
