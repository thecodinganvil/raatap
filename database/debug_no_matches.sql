-- =====================================================
-- DEBUG: Why aren't match suggestions being generated?
-- =====================================================
-- Run this in Supabase SQL Editor to diagnose the issue
-- =====================================================

-- 1. Check if ride_requests exist
SELECT 'RIDE REQUESTS' as check_type, COUNT(*) as count FROM ride_requests WHERE status = 'active';
SELECT * FROM ride_requests WHERE status = 'active';

-- 2. Check if ride_templates exist  
SELECT 'RIDE TEMPLATES' as check_type, COUNT(*) as COUNT FROM ride_templates WHERE status = 'active';
SELECT * FROM ride_templates WHERE status = 'active';

-- 3. Check existing match suggestions
SELECT 'MATCH SUGGESTIONS' as check_type, COUNT(*) as count FROM match_suggestions;
SELECT * FROM match_suggestions ORDER BY created_at DESC LIMIT 10;

-- 4. Test calculate_route_match_score for a specific pair
-- Replace with your actual template_id and request_id
SELECT 'TEST MATCH CALCULATION' as test,
       calculate_route_match_score(
           (SELECT id FROM ride_templates LIMIT 1),
           (SELECT id FROM ride_requests LIMIT 1)
       ) as result;

-- 5. Check if trigger exists and is active
SELECT 'TRIGGER STATUS' as check_type, 
       tgname as trigger_name,
       tgenabled as enabled
FROM pg_trigger 
WHERE tgname = 'on_profile_update_create_ride';

-- 6. Check profiles with prefer_taking_ride or prefer_hosting
SELECT 'PROFILES READY' as check_type,
       COUNT(*) as total,
       SUM(CASE WHEN prefer_taking_ride = true THEN 1 ELSE 0 END) as riders,
       SUM(CASE WHEN prefer_hosting = true THEN 1 ELSE 0 END) as hosts
FROM profiles
WHERE from_lat IS NOT NULL 
  AND to_lat IS NOT NULL 
  AND days_of_commute IS NOT NULL;

-- 7. Check if generate_all_matches works
SELECT 'GENERATE ALL MATCHES' as test, generate_all_matches() as result;

-- 8. Check unique constraint
SELECT 'CONSTRAINTS' as check_type,
       conname as constraint_name
FROM pg_constraint 
WHERE conrelid = 'match_suggestions'::regclass 
AND contype = 'u';
