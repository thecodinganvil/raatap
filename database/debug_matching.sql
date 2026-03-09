-- =====================================================
-- DEBUG MATCHING - Find why no matches are created
-- =====================================================

-- =====================================================
-- STEP 1: Check if ride_templates and ride_requests exist
-- =====================================================
SELECT 'Ride Templates' AS table_name, COUNT(*) AS count FROM ride_templates
UNION ALL
SELECT 'Ride Requests' AS table_name, COUNT(*) AS count FROM ride_requests;

-- =====================================================
-- STEP 2: View all active ride templates
-- =====================================================
SELECT 
    id,
    host_id,
    from_location,
    to_location,
    departure_time,
    days_available,
    vehicle_type,
    status
FROM ride_templates
WHERE status = 'active';

-- =====================================================
-- STEP 3: View all active ride requests
-- =====================================================
SELECT 
    id,
    rider_id,
    pickup_location,
    destination_location,
    preferred_arrival_time,
    days_needed,
    vehicle_preference,
    status
FROM ride_requests
WHERE status = 'active';

-- =====================================================
-- STEP 4: Test match calculation for one template-request pair
-- =====================================================
-- Replace with actual IDs from above queries
SELECT calculate_route_match_score(
    (SELECT id FROM ride_templates LIMIT 1),
    (SELECT id FROM ride_requests LIMIT 1)
) AS match_result;

-- =====================================================
-- STEP 5: Check profiles data for users
-- =====================================================
SELECT 
    id,
    full_name,
    prefer_hosting,
    prefer_taking_ride,
    email_verified,
    from_location,
    to_location,
    days_of_commute
FROM profiles
WHERE email_verified = true;

-- =====================================================
-- STEP 6: Check if match_suggestions table exists
-- =====================================================
SELECT COUNT(*) AS existing_matches FROM match_suggestions;

-- =====================================================
-- STEP 7: Manual match test - detailed output
-- =====================================================
DO $$
DECLARE
    test_template_id UUID;
    test_request_id UUID;
    match_result JSON;
    template_rec RECORD;
    request_rec RECORD;
BEGIN
    -- Get first active template
    SELECT * INTO template_rec FROM ride_templates WHERE status = 'active' LIMIT 1;
    
    -- Get first active request
    SELECT * INTO request_rec FROM ride_requests WHERE status = 'active' LIMIT 1;
    
    IF template_rec IS NULL THEN
        RAISE NOTICE 'NO ACTIVE RIDE TEMPLATES FOUND';
        RETURN;
    END IF;
    
    IF request_rec IS NULL THEN
        RAISE NOTICE 'NO ACTIVE RIDE REQUESTS FOUND';
        RETURN;
    END IF;
    
    test_template_id := template_rec.id;
    test_request_id := request_rec.id;
    
    RAISE NOTICE 'Testing match: Template % vs Request %', test_template_id, test_request_id;
    RAISE NOTICE 'Template: % -> %', template_rec.from_location, template_rec.to_location;
    RAISE NOTICE 'Request: % -> %', request_rec.pickup_location, request_rec.destination_location;
    
    -- Calculate match
    SELECT calculate_route_match_score(test_template_id, test_request_id) INTO match_result;
    
    RAISE NOTICE 'Match Result: %', match_result;
END $$;
