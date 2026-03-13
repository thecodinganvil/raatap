-- =====================================================
-- DEBUG: Why Aren't These Two Matching?
-- =====================================================
-- Replace the UUIDs below with actual template_id and request_id
-- =====================================================

-- STEP 1: Set your test IDs here
DO $$
DECLARE
    test_template_id UUID := 'YOUR_TEMPLATE_ID_HERE';  -- ← Replace this
    test_request_id UUID := 'YOUR_REQUEST_ID_HERE';    -- ← Replace this
    match_result JSON;
BEGIN
    -- Get the match calculation result
    SELECT calculate_route_match_score(test_template_id, test_request_id) INTO match_result;
    
    RAISE NOTICE '';
    RAISE NOTICE '=== MATCH ANALYSIS ===';
    RAISE NOTICE 'Template ID: %', test_template_id;
    RAISE NOTICE 'Request ID: %', test_request_id;
    RAISE NOTICE '';
    RAISE NOTICE 'Result: %', match_result;
    RAISE NOTICE '';
    RAISE NOTICE 'Compatible: %', match_result->>'compatible';
    RAISE NOTICE 'Reason (if not compatible): %', match_result->>'reason';
    RAISE NOTICE '';
    RAISE NOTICE 'Route Match Score: %', match_result->>'route_match_score';
    RAISE NOTICE 'Schedule Match Score: %', match_result->>'schedule_match_score';
    RAISE NOTICE 'Overall Score: %', match_result->>'overall_score';
    RAISE NOTICE 'Pickup Distance: % meters', match_result->>'pickup_distance_meters';
    RAISE NOTICE 'Day Overlap: %', match_result->>'day_overlap';
    RAISE NOTICE 'Time Compatibility: %', match_result->>'time_compatibility';
    RAISE NOTICE 'Days Overlap Count: %', match_result->>'days_overlap_count';
END $$;


-- =====================================================
-- STEP 2: Detailed Breakdown of All Checks
-- =====================================================
-- Run this to see EVERY compatibility check in detail
-- =====================================================

SELECT 
    '=== DETAILED COMPATIBILITY CHECK ===' as section;

-- Get all the raw data
WITH template_data AS (
    SELECT 
        id,
        host_id,
        from_location,
        to_location,
        from_point,
        to_point,
        departure_time,
        return_time,
        days_available,
        vehicle_type,
        available_seats,
        max_detour_meters,
        gender_preference,
        status
    FROM ride_templates
    WHERE id = 'YOUR_TEMPLATE_ID_HERE'  -- ← Replace this
),
request_data AS (
    SELECT 
        id,
        rider_id,
        pickup_location,
        destination_location,
        pickup_point,
        preferred_arrival_time,
        time_flexibility_mins,
        days_needed,
        vehicle_preference,
        gender_preference,
        status
    FROM ride_requests
    WHERE id = 'YOUR_REQUEST_ID_HERE'  -- ← Replace this
),
profile_data AS (
    SELECT 
        rp.id as host_id,
        rp.full_name as host_name,
        rp.gender as host_gender,
        rp.comfortable_with as host_comfortable_with,
        rpr.id as rider_id,
        rpr.full_name as rider_name,
        rpr.gender as rider_gender,
        rpr.comfortable_with as rider_comfortable_with
    FROM profiles rp
    CROSS JOIN profiles rpr
    WHERE rp.id = (SELECT host_id FROM template_data)
    AND rpr.id = (SELECT rider_id FROM request_data)
)
SELECT 
    'HOST INFO' as category,
    host_name,
    host_gender,
    host_comfortable_with,
    from_location as route,
    departure_time::text,
    days_available::text,
    vehicle_type,
    gender_preference as vehicle_gender_pref,
    max_detour_meters
FROM template_data t
JOIN profile_data p ON t.host_id = p.host_id

UNION ALL

SELECT 
    'RIDER INFO' as category,
    rider_name,
    rider_gender,
    rider_comfortable_with,
    pickup_location || ' → ' || destination_location as route,
    preferred_arrival_time::text,
    days_needed::text,
    vehicle_preference,
    gender_preference as vehicle_gender_pref,
    time_flexibility_mins::text as max_detour
FROM request_data r
JOIN profile_data p ON r.rider_id = p.rider_id;


-- =====================================================
-- STEP 3: Individual Compatibility Checks
-- =====================================================
-- Check EACH requirement separately
-- =====================================================

SELECT '=== INDIVIDUAL CHECKS ===' as section;

-- Check 1: Status Check
SELECT 
    'Status Check' as test,
    (SELECT status FROM ride_templates WHERE id = 'YOUR_TEMPLATE_ID_HERE') as template_status,
    (SELECT status FROM ride_requests WHERE id = 'YOUR_REQUEST_ID_HERE') as request_status,
    CASE 
        WHEN (SELECT status FROM ride_templates WHERE id = 'YOUR_TEMPLATE_ID_HERE') = 'active'
         AND (SELECT status FROM ride_requests WHERE id = 'YOUR_REQUEST_ID_HERE') = 'active'
        THEN '✓ PASS'
        ELSE '✗ FAIL - One or both are not active'
    END as result;

-- Check 2: Same User Check
SELECT 
    'Not Same User Check' as test,
    (SELECT host_id FROM ride_templates WHERE id = 'YOUR_TEMPLATE_ID_HERE') as host_id,
    (SELECT rider_id FROM ride_requests WHERE id = 'YOUR_REQUEST_ID_HERE') as rider_id,
    CASE 
        WHEN (SELECT host_id FROM ride_templates WHERE id = 'YOUR_TEMPLATE_ID_HERE') 
           != (SELECT rider_id FROM ride_requests WHERE id = 'YOUR_REQUEST_ID_HERE')
        THEN '✓ PASS'
        ELSE '✗ FAIL - Host and rider are the same person'
    END as result;

-- Check 3: Gender Compatibility
SELECT 
    'Gender Compatibility' as test,
    (SELECT gender_preference FROM ride_templates WHERE id = 'YOUR_TEMPLATE_ID_HERE') as host_gender_pref,
    (SELECT gender_preference FROM ride_requests WHERE id = 'YOUR_REQUEST_ID_HERE') as rider_gender_pref,
    CASE 
        WHEN (SELECT gender_preference FROM ride_templates WHERE id = 'YOUR_TEMPLATE_ID_HERE') = 'both'
          OR (SELECT gender_preference FROM ride_requests WHERE id = 'YOUR_REQUEST_ID_HERE') = 'both'
          OR (SELECT gender_preference FROM ride_templates WHERE id = 'YOUR_TEMPLATE_ID_HERE') 
             = (SELECT gender_preference FROM ride_requests WHERE id = 'YOUR_REQUEST_ID_HERE')
        THEN '✓ PASS'
        ELSE '✗ FAIL - Gender preferences do not match'
    END as result;

-- Check 4: Vehicle Compatibility
SELECT 
    'Vehicle Compatibility' as test,
    (SELECT vehicle_type FROM ride_templates WHERE id = 'YOUR_TEMPLATE_ID_HERE') as host_vehicle,
    (SELECT vehicle_preference FROM ride_requests WHERE id = 'YOUR_REQUEST_ID_HERE') as rider_vehicle_pref,
    CASE 
        WHEN (SELECT vehicle_preference FROM ride_requests WHERE id = 'YOUR_REQUEST_ID_HERE') = 'any'
          OR (SELECT vehicle_preference FROM ride_requests WHERE id = 'YOUR_REQUEST_ID_HERE') 
             = (SELECT vehicle_type FROM ride_templates WHERE id = 'YOUR_TEMPLATE_ID_HERE')
        THEN '✓ PASS'
        ELSE '✗ FAIL - Vehicle preference mismatch'
    END as result;

-- Check 5: Pickup Distance
SELECT 
    'Pickup Distance Check' as test,
    ROUND(ST_Distance(
        (SELECT pickup_point FROM ride_requests WHERE id = 'YOUR_REQUEST_ID_HERE')::geography,
        ST_MakeLine(
            (SELECT from_point FROM ride_templates WHERE id = 'YOUR_TEMPLATE_ID_HERE')::geometry,
            (SELECT to_point FROM ride_templates WHERE id = 'YOUR_TEMPLATE_ID_HERE')::geometry
        )::geography
    )) as pickup_distance_meters,
    (SELECT max_detour_meters FROM ride_templates WHERE id = 'YOUR_TEMPLATE_ID_HERE') as max_allowed,
    CASE 
        WHEN ST_Distance(
            (SELECT pickup_point FROM ride_requests WHERE id = 'YOUR_REQUEST_ID_HERE')::geography,
            ST_MakeLine(
                (SELECT from_point FROM ride_templates WHERE id = 'YOUR_TEMPLATE_ID_HERE')::geometry,
                (SELECT to_point FROM ride_templates WHERE id = 'YOUR_TEMPLATE_ID_HERE')::geometry
            )::geography
        ) <= (SELECT max_detour_meters FROM ride_templates WHERE id = 'YOUR_TEMPLATE_ID_HERE')
        THEN '✓ PASS'
        ELSE '✗ FAIL - Pickup too far from host route'
    END as result;

-- Check 6: Days Overlap
SELECT 
    'Days Overlap Check' as test,
    (SELECT days_available FROM ride_templates WHERE id = 'YOUR_TEMPLATE_ID_HERE') as host_days,
    (SELECT days_needed FROM ride_requests WHERE id = 'YOUR_REQUEST_ID_HERE') as rider_days,
    (SELECT array_length(
        ARRAY(
            SELECT unnest((SELECT days_available FROM ride_templates WHERE id = 'YOUR_TEMPLATE_ID_HERE'))
            INTERSECT
            SELECT unnest((SELECT days_needed FROM ride_requests WHERE id = 'YOUR_REQUEST_ID_HERE'))
        ), 1
    )) as overlapping_days,
    CASE 
        WHEN (SELECT array_length(
            ARRAY(
                SELECT unnest((SELECT days_available FROM ride_templates WHERE id = 'YOUR_TEMPLATE_ID_HERE'))
                INTERSECT
                SELECT unnest((SELECT days_needed FROM ride_requests WHERE id = 'YOUR_REQUEST_ID_HERE'))
            ), 1
        )) > 0
        THEN '✓ PASS - ' || (SELECT array_length(
            ARRAY(
                SELECT unnest((SELECT days_available FROM ride_templates WHERE id = 'YOUR_TEMPLATE_ID_HERE'))
                INTERSECT
                SELECT unnest((SELECT days_needed FROM ride_requests WHERE id = 'YOUR_REQUEST_ID_HERE'))
            ), 1
        ))::text || ' days overlap'
        ELSE '✗ FAIL - No common days'
    END as result;

-- Check 7: Time Compatibility
SELECT 
    'Time Compatibility Check' as test,
    (SELECT departure_time FROM ride_templates WHERE id = 'YOUR_TEMPLATE_ID_HERE') as host_departure,
    (SELECT preferred_arrival_time FROM ride_requests WHERE id = 'YOUR_REQUEST_ID_HERE') as rider_arrival,
    (SELECT time_flexibility_mins FROM ride_requests WHERE id = 'YOUR_REQUEST_ID_HERE') as rider_flexibility,
    ABS(
        EXTRACT(HOUR FROM (SELECT departure_time FROM ride_templates WHERE id = 'YOUR_TEMPLATE_ID_HERE')) * 60 +
        EXTRACT(MINUTE FROM (SELECT departure_time FROM ride_templates WHERE id = 'YOUR_TEMPLATE_ID_HERE')) -
        (EXTRACT(HOUR FROM (SELECT preferred_arrival_time FROM ride_requests WHERE id = 'YOUR_REQUEST_ID_HERE')) * 60 +
        EXTRACT(MINUTE FROM (SELECT preferred_arrival_time FROM ride_requests WHERE id = 'YOUR_REQUEST_ID_HERE')))
    ) as time_diff_minutes,
    CASE 
        WHEN ABS(
            EXTRACT(HOUR FROM (SELECT departure_time FROM ride_templates WHERE id = 'YOUR_TEMPLATE_ID_HERE')) * 60 +
            EXTRACT(MINUTE FROM (SELECT departure_time FROM ride_templates WHERE id = 'YOUR_TEMPLATE_ID_HERE')) -
            (EXTRACT(HOUR FROM (SELECT preferred_arrival_time FROM ride_requests WHERE id = 'YOUR_REQUEST_ID_HERE')) * 60 +
            EXTRACT(MINUTE FROM (SELECT preferred_arrival_time FROM ride_requests WHERE id = 'YOUR_REQUEST_ID_HERE')))
        ) <= (SELECT time_flexibility_mins FROM ride_requests WHERE id = 'YOUR_REQUEST_ID_HERE')
        THEN '✓ PASS'
        ELSE '✗ FAIL - Time difference too large'
    END as result;


-- =====================================================
-- STEP 4: Quick Fix Suggestions
-- =====================================================

SELECT '=== FIX SUGGESTIONS ===' as section;

WITH issues AS (
    SELECT 
        (SELECT status FROM ride_templates WHERE id = 'YOUR_TEMPLATE_ID_HERE') != 'active' as template_inactive,
        (SELECT status FROM ride_requests WHERE id = 'YOUR_REQUEST_ID_HERE') != 'active' as request_inactive,
        (SELECT gender_preference FROM ride_templates WHERE id = 'YOUR_TEMPLATE_ID_HERE') != 'both'
          AND (SELECT gender_preference FROM ride_requests WHERE id = 'YOUR_REQUEST_ID_HERE') != 'both'
          AND (SELECT gender_preference FROM ride_templates WHERE id = 'YOUR_TEMPLATE_ID_HERE') 
             != (SELECT gender_preference FROM ride_requests WHERE id = 'YOUR_REQUEST_ID_HERE') as gender_mismatch,
        (SELECT vehicle_preference FROM ride_requests WHERE id = 'YOUR_REQUEST_ID_HERE') != 'any'
          AND (SELECT vehicle_preference FROM ride_requests WHERE id = 'YOUR_REQUEST_ID_HERE') 
             != (SELECT vehicle_type FROM ride_templates WHERE id = 'YOUR_TEMPLATE_ID_HERE') as vehicle_mismatch,
        ST_Distance(
            (SELECT pickup_point FROM ride_requests WHERE id = 'YOUR_REQUEST_ID_HERE')::geography,
            ST_MakeLine(
                (SELECT from_point FROM ride_templates WHERE id = 'YOUR_TEMPLATE_ID_HERE')::geometry,
                (SELECT to_point FROM ride_templates WHERE id = 'YOUR_TEMPLATE_ID_HERE')::geometry
            )::geography
        ) > (SELECT max_detour_meters FROM ride_templates WHERE id = 'YOUR_TEMPLATE_ID_HERE') as too_far,
        (SELECT array_length(
            ARRAY(
                SELECT unnest((SELECT days_available FROM ride_templates WHERE id = 'YOUR_TEMPLATE_ID_HERE'))
                INTERSECT
                SELECT unnest((SELECT days_needed FROM ride_requests WHERE id = 'YOUR_REQUEST_ID_HERE'))
            ), 1
        )) = 0 as no_days_overlap
)
SELECT 
    CASE WHEN template_inactive THEN '• Activate the ride template' ELSE NULL END as fix1,
    CASE WHEN request_inactive THEN '• Activate the ride request' ELSE NULL END as fix2,
    CASE WHEN gender_mismatch THEN '• Change gender preference to "both" or match each other' ELSE NULL END as fix3,
    CASE WHEN vehicle_mismatch THEN '• Rider: set vehicle_preference to "any" or match host vehicle' ELSE NULL END as fix4,
    CASE WHEN too_far THEN '• Increase max_detour_meters or rider needs to be closer to route' ELSE NULL END as fix5,
    CASE WHEN no_days_overlap THEN '• Add overlapping days to commute schedule' ELSE NULL END as fix6;


-- =====================================================
-- STEP 5: Visual Route Check
-- =====================================================

SELECT '=== ROUTE VISUALIZATION ===' as section;

SELECT 
    'Host Route:' as info,
    from_location as start,
    to_location as end,
    from_lat,
    from_lng,
    to_lat,
    to_lng
FROM ride_templates
WHERE id = 'YOUR_TEMPLATE_ID_HERE'

UNION ALL

SELECT 
    'Rider Route:' as info,
    pickup_location as start,
    destination_location as end,
    pickup_lat as from_lat,
    pickup_lng as from_lng,
    destination_lat as to_lat,
    destination_lng as to_lng
FROM ride_requests
WHERE id = 'YOUR_REQUEST_ID_HERE';
