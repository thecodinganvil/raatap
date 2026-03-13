-- =====================================================
-- QUICK DEBUG: Why No Matches?
-- =====================================================
-- Copy-paste this ENTIRE script into Supabase SQL Editor
-- It will automatically find and analyze your data
-- =====================================================

-- 1. Show all templates and requests
SELECT '=== YOUR DATA ===' as section;
SELECT 
    'TEMPLATE (Host)' as type,
    rt.id,
    rp.full_name as host_name,
    rt.from_location || ' → ' || rt.to_location as route,
    rt.departure_time,
    rt.days_available,
    rt.vehicle_type,
    rt.gender_preference,
    rt.max_detour_meters,
    rt.status
FROM ride_templates rt
JOIN profiles rp ON rt.host_id = rp.id
ORDER BY rt.created_at DESC;

SELECT 
    'REQUEST (Rider)' as type,
    rr.id,
    rp.full_name as rider_name,
    rr.pickup_location || ' → ' || rr.destination_location as route,
    rr.preferred_arrival_time,
    rr.days_needed,
    rr.vehicle_preference,
    rr.gender_preference,
    rr.time_flexibility_mins,
    rr.status
FROM ride_requests rr
JOIN profiles rp ON rr.rider_id = rp.id
ORDER BY rr.created_at DESC;

-- 2. Test match between first template and first request
SELECT '=== MATCH TEST ===' as section;

WITH first_pair AS (
    SELECT 
        (SELECT id FROM ride_templates WHERE status = 'active' ORDER BY created_at DESC LIMIT 1) as template_id,
        (SELECT id FROM ride_requests WHERE status = 'active' ORDER BY created_at DESC LIMIT 1) as request_id
)
SELECT 
    fp.template_id,
    fp.request_id,
    calculate_route_match_score(fp.template_id, fp.request_id) as full_result,
    (calculate_route_match_score(fp.template_id, fp.request_id)->>'compatible') as is_compatible,
    (calculate_route_match_score(fp.template_id, fp.request_id)->>'reason') as failure_reason,
    (calculate_route_match_score(fp.template_id, fp.request_id)->>'overall_score') as score,
    (calculate_route_match_score(fp.template_id, fp.request_id)->>'pickup_distance_meters') as pickup_distance
FROM first_pair fp
WHERE fp.template_id IS NOT NULL AND fp.request_id IS NOT NULL;

-- 3. Check all 7 compatibility requirements
SELECT '=== 7 COMPATIBILITY CHECKS ===' as section;

WITH test_pair AS (
    SELECT 
        (SELECT id FROM ride_templates WHERE status = 'active' ORDER BY created_at DESC LIMIT 1) as tid,
        (SELECT id FROM ride_requests WHERE status = 'active' ORDER BY created_at DESC LIMIT 1) as rid
)
SELECT 
    '1. Template Active' as check_name,
    (SELECT status FROM ride_templates WHERE id = (SELECT tid FROM test_pair)) as value,
    CASE WHEN (SELECT status FROM ride_templates WHERE id = (SELECT tid FROM test_pair)) = 'active' THEN '✓' ELSE '✗' END as result
UNION ALL
SELECT 
    '2. Request Active',
    (SELECT status FROM ride_requests WHERE id = (SELECT rid FROM test_pair)),
    CASE WHEN (SELECT status FROM ride_requests WHERE id = (SELECT rid FROM test_pair)) = 'active' THEN '✓' ELSE '✗' END
UNION ALL
SELECT 
    '3. Different Users',
    (SELECT host_id FROM ride_templates WHERE id = (SELECT tid FROM test_pair)) || ' vs ' || 
    (SELECT rider_id FROM ride_requests WHERE id = (SELECT rid FROM test_pair)),
    CASE WHEN (SELECT host_id FROM ride_templates WHERE id = (SELECT tid FROM test_pair)) 
              != (SELECT rider_id FROM ride_requests WHERE id = (SELECT rid FROM test_pair)) THEN '✓' ELSE '✗' END
UNION ALL
SELECT 
    '4. Gender Match',
    (SELECT gender_preference FROM ride_templates WHERE id = (SELECT tid FROM test_pair)) || ' vs ' ||
    (SELECT gender_preference FROM ride_requests WHERE id = (SELECT rid FROM test_pair)),
    CASE WHEN (SELECT gender_preference FROM ride_templates WHERE id = (SELECT tid FROM test_pair)) = 'both'
          OR (SELECT gender_preference FROM ride_requests WHERE id = (SELECT rid FROM test_pair)) = 'both'
          OR (SELECT gender_preference FROM ride_templates WHERE id = (SELECT tid FROM test_pair)) 
             = (SELECT gender_preference FROM ride_requests WHERE id = (SELECT rid FROM test_pair))
         THEN '✓' ELSE '✗' END
UNION ALL
SELECT 
    '5. Vehicle Match',
    (SELECT vehicle_type FROM ride_templates WHERE id = (SELECT tid FROM test_pair)) || ' vs ' ||
    (SELECT vehicle_preference FROM ride_requests WHERE id = (SELECT rid FROM test_pair)),
    CASE WHEN (SELECT vehicle_preference FROM ride_requests WHERE id = (SELECT rid FROM test_pair)) = 'any'
          OR (SELECT vehicle_preference FROM ride_requests WHERE id = (SELECT rid FROM test_pair)) 
             = (SELECT vehicle_type FROM ride_templates WHERE id = (SELECT tid FROM test_pair))
         THEN '✓' ELSE '✗' END
UNION ALL
SELECT 
    '6. Days Overlap',
    (SELECT days_available::text FROM ride_templates WHERE id = (SELECT tid FROM test_pair)) || ' vs ' ||
    (SELECT days_needed::text FROM ride_requests WHERE id = (SELECT rid FROM test_pair)),
    CASE WHEN (SELECT array_length(
        ARRAY(SELECT unnest(days_available) FROM ride_templates WHERE id = (SELECT tid FROM test_pair)
              INTERSECT
              SELECT unnest(days_needed) FROM ride_requests WHERE id = (SELECT rid FROM test_pair)), 1
    )) > 0 THEN '✓' ELSE '✗' END
UNION ALL
SELECT 
    '7. Time Match',
    (SELECT departure_time::text FROM ride_templates WHERE id = (SELECT tid FROM test_pair)) || ' vs ' ||
    (SELECT preferred_arrival_time::text FROM ride_requests WHERE id = (SELECT rid FROM test_pair)) || 
    ' (flex: ' || (SELECT time_flexibility_mins FROM ride_requests WHERE id = (SELECT rid FROM test_pair)) || 'm)',
    CASE WHEN ABS(
        EXTRACT(HOUR FROM (SELECT departure_time FROM ride_templates WHERE id = (SELECT tid FROM test_pair))) * 60 +
        EXTRACT(MINUTE FROM (SELECT departure_time FROM ride_templates WHERE id = (SELECT tid FROM test_pair))) -
        (EXTRACT(HOUR FROM (SELECT preferred_arrival_time FROM ride_requests WHERE id = (SELECT rid FROM test_pair))) * 60 +
        EXTRACT(MINUTE FROM (SELECT preferred_arrival_time FROM ride_requests WHERE id = (SELECT rid FROM test_pair))))
    ) <= (SELECT time_flexibility_mins FROM ride_requests WHERE id = (SELECT rid FROM test_pair))
         THEN '✓' ELSE '✗' END;

-- 4. Check existing match_suggestions
SELECT '=== EXISTING MATCHES ===' as section;
SELECT 
    COUNT(*) as total_matches,
    COUNT(*) FILTER (WHERE status = 'pending') as pending,
    COUNT(*) FILTER (WHERE status = 'accepted') as accepted,
    COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed,
    COUNT(*) FILTER (WHERE status = 'expired') as expired
FROM match_suggestions;

-- 5. Show why pairs might not match
SELECT '=== COMMON ISSUES ===' as section;
SELECT 
    'Issue' as category,
    'Count' as affected,
    'Fix' as solution
UNION ALL
SELECT 
    'Inactive templates',
    (SELECT COUNT(*)::text FROM ride_templates WHERE status != 'active'),
    'Update status to active'
UNION ALL
SELECT 
    'Inactive requests',
    (SELECT COUNT(*)::text FROM ride_requests WHERE status != 'active'),
    'Update status to active'
UNION ALL
SELECT 
    'No days overlap',
    'Check #6 above',
    'Add common commute days'
UNION ALL
SELECT 
    'Time mismatch',
    'Check #7 above',
    'Increase time_flexibility_mins'
UNION ALL
SELECT 
    'Too far from route',
    'Check pickup_distance in match test',
    'Increase max_detour_meters';
