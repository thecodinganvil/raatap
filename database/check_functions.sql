-- =====================================================
-- QUICK TEST: Check if functions exist
-- =====================================================

-- Check if generate_match_suggestions_for_ride_template exists
SELECT 
    'Function Check' as test,
    proname as function_name,
    CASE WHEN proname IS NOT NULL THEN 'EXISTS' ELSE 'MISSING' END as status
FROM pg_proc 
WHERE proname = 'generate_match_suggestions_for_ride_template';

-- Check if calculate_route_match_score exists
SELECT 
    'Function Check' as test,
    proname as function_name,
    CASE WHEN proname IS NOT NULL THEN 'EXISTS' ELSE 'MISSING' END as status
FROM pg_proc 
WHERE proname = 'calculate_route_match_score';

-- Check current functions in database
SELECT 
    'All matching functions:' as info,
    proname 
FROM pg_proc 
WHERE proname LIKE '%match%' OR proname LIKE '%ride_template%' OR proname LIKE '%ride_request%'
ORDER BY proname;
