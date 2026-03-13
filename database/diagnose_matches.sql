-- =====================================================
-- DIAGNOSE: Why generate_all_matches() creates no matches
-- =====================================================
-- Run this ENTIRE script in Supabase SQL Editor
-- =====================================================

-- 1. Check raw counts
SELECT '=== DATA STATUS ===' as section;
SELECT 
    (SELECT COUNT(*) FROM profiles WHERE from_lat IS NOT NULL) as profiles_with_location,
    (SELECT COUNT(*) FROM ride_templates WHERE status = 'active') as active_templates,
    (SELECT COUNT(*) FROM ride_requests WHERE status = 'active') as active_requests;

-- 2. Show actual data
SELECT '=== RIDE TEMPLATES ===' as section;
SELECT 
    id, 
    host_id, 
    from_location, 
    to_location, 
    vehicle_type,
    gender_preference,
    status,
    max_detour_meters
FROM ride_templates 
WHERE status = 'active';

SELECT '=== RIDE REQUESTS ===' as section;
SELECT 
    id, 
    rider_id, 
    pickup_location, 
    destination_location,
    vehicle_preference,
    gender_preference,
    status,
    preferred_arrival_time,
    time_flexibility_mins
FROM ride_requests 
WHERE status = 'active';

-- 3. Check profiles data (for days_of_commute)
SELECT '=== PROFILES ===' as section;
SELECT 
    id,
    full_name,
    prefer_hosting,
    prefer_taking_ride,
    days_of_commute,
    from_location,
    to_location,
    vehicle_type
FROM profiles
WHERE from_lat IS NOT NULL;

-- 4. Test calculate_route_match_score directly
SELECT '=== MATCH CALCULATION TEST ===' as section;
SELECT 
    t.id as template_id,
    r.id as request_id,
    calculate_route_match_score(t.id, r.id) as match_result
FROM ride_templates t
CROSS JOIN ride_requests r
WHERE t.status = 'active' 
  AND r.status = 'active'
  AND t.host_id != r.rider_id;

-- 5. Check existing match_suggestions
SELECT '=== MATCH SUGGESTIONS ===' as section;
SELECT 
    id,
    ride_template_id,
    ride_request_id,
    overall_score,
    status,
    created_at
FROM match_suggestions
ORDER BY created_at DESC
LIMIT 10;

-- 6. Manual test: Call generate_match_suggestions_for_ride_template
SELECT '=== MANUAL FUNCTION TEST ===' as section;
DO $$
DECLARE
    test_template_id UUID;
    test_result INTEGER;
BEGIN
    -- Get first active template
    SELECT id INTO test_template_id FROM ride_templates WHERE status = 'active' LIMIT 1;
    
    IF test_template_id IS NOT NULL THEN
        -- Call the function
        SELECT generate_match_suggestions_for_ride_template(test_template_id) INTO test_result;
        RAISE NOTICE 'Template ID: %', test_template_id;
        RAISE NOTICE 'Matches created: %', test_result;
    ELSE
        RAISE NOTICE 'No active templates found';
    END IF;
END $$;

-- 7. Check if unique constraint exists
SELECT '=== CONSTRAINTS ===' as section;
SELECT 
    conname as constraint_name,
    contype as constraint_type
FROM pg_constraint 
WHERE conrelid = 'match_suggestions'::regclass;

-- 8. Check trigger status
SELECT '=== TRIGGERS ===' as section;
SELECT 
    tgname as trigger_name,
    tgenabled as enabled,
    tgtype as type
FROM pg_trigger 
WHERE tgname LIKE '%profile%ride%';

-- 9. Check for any errors in match_suggestions (failed inserts)
SELECT '=== POTENTIAL ISSUES ===' as section;
SELECT 
    'Templates: ' || COUNT(*) as issue
FROM ride_templates WHERE status = 'active'
UNION ALL
SELECT 
    'Requests: ' || COUNT(*)
FROM ride_requests WHERE status = 'active'
UNION ALL
SELECT 
    'Pending matches: ' || COUNT(*)
FROM match_suggestions WHERE status = 'pending';
