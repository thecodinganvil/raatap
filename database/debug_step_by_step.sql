-- =====================================================
-- STEP-BY-STEP DEBUG: Why aren't matches being created?
-- =====================================================
-- Run EACH section separately and share the results
-- =====================================================

-- SECTION 1: Check basic data
SELECT '=== SECTION 1: Data Check ===' as step;
SELECT 
    (SELECT COUNT(*) FROM ride_templates WHERE status = 'active') as active_templates,
    (SELECT COUNT(*) FROM ride_requests WHERE status = 'active') as active_requests,
    (SELECT COUNT(*) FROM match_suggestions) as existing_matches;

-- SECTION 2: Check constraint exists
SELECT '=== SECTION 2: Constraint Check ===' as step;
SELECT 
    conname as constraint_name,
    contype as constraint_type
FROM pg_constraint 
WHERE conrelid = 'match_suggestions'::regclass;

-- SECTION 3: Test calculate_route_match_score
SELECT '=== SECTION 3: Match Calculation ===' as step;
SELECT 
    t.id as template_id,
    r.id as request_id,
    calculate_route_match_score(t.id, r.id) as full_result
FROM ride_templates t
CROSS JOIN ride_requests r
WHERE t.status = 'active' AND r.status = 'active'
LIMIT 1;

-- SECTION 4: Try direct INSERT (bypass function)
SELECT '=== SECTION 4: Direct INSERT Test ===' as step;
DO $$
DECLARE
    tpl_id UUID;
    req_id UUID;
    match_result JSON;
BEGIN
    -- Get IDs
    SELECT id INTO tpl_id FROM ride_templates WHERE status = 'active' LIMIT 1;
    SELECT id INTO req_id FROM ride_requests WHERE status = 'active' LIMIT 1;
    
    RAISE NOTICE 'Template ID: %', tpl_id;
    RAISE NOTICE 'Request ID: %', req_id;
    
    -- Calculate match
    SELECT calculate_route_match_score(tpl_id, req_id) INTO match_result;
    
    RAISE NOTICE 'Match result: %', match_result;
    RAISE NOTICE 'Compatible: %', match_result->>'compatible';
    
    -- Try INSERT
    INSERT INTO match_suggestions (
        ride_template_id,
        ride_request_id,
        route_match_score,
        schedule_match_score,
        overall_score,
        detour_distance_meters,
        pickup_distance_meters,
        status
    ) VALUES (
        tpl_id,
        req_id,
        (match_result->>'route_match_score')::NUMERIC,
        (match_result->>'schedule_match_score')::NUMERIC,
        (match_result->>'overall_score')::NUMERIC,
        (match_result->>'pickup_distance_meters')::INTEGER,
        (match_result->>'pickup_distance_meters')::INTEGER,
        'pending'
    );
    
    RAISE NOTICE 'INSERT completed successfully!';
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'INSERT FAILED: %', SQLERRM;
END $$;

-- SECTION 5: Check if insert worked
SELECT '=== SECTION 5: Verify Insert ===' as step;
SELECT 
    id,
    ride_template_id,
    ride_request_id,
    overall_score,
    status,
    created_at
FROM match_suggestions
ORDER BY created_at DESC
LIMIT 5;

-- SECTION 6: Test generate_match_suggestions_for_ride_template function
SELECT '=== SECTION 6: Function Test ===' as step;
SELECT 
    generate_match_suggestions_for_ride_template(
        (SELECT id FROM ride_templates WHERE status = 'active' LIMIT 1)
    ) as matches_created;

-- SECTION 7: Final count
SELECT '=== SECTION 7: Final Count ===' as step;
SELECT COUNT(*) as total_match_suggestions FROM match_suggestions;
