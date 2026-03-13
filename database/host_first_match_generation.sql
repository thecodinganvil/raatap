-- =====================================================
-- RAATAP - HOST-FIRST MATCH GENERATION SYSTEM
-- =====================================================
-- Complete Solution: Phase 1 + Phase 2
-- 
-- This implements the Host-First approach where:
-- 1. Match suggestions are shown to HOSTS first
-- 2. Host accepts → Rider gets notified
-- 3. Rider confirms → Match becomes active
-- =====================================================

-- =====================================================
-- PHASE 1: IMMEDIATE FIX - Generate Matches NOW
-- =====================================================
-- Run this ONCE to generate all pending matches
-- =====================================================

-- Step 1: Ensure unique constraint exists (required for ON CONFLICT)
DO $$
BEGIN
    -- Clean up duplicates first
    DELETE FROM match_suggestions a USING match_suggestions b
    WHERE a.id < b.id
    AND a.ride_template_id = b.ride_template_id
    AND a.ride_request_id = b.ride_request_id;
    
    -- Add unique constraint if missing
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'match_suggestions_ride_pair_key'
    ) THEN
        ALTER TABLE match_suggestions
        ADD CONSTRAINT match_suggestions_ride_pair_key 
        UNIQUE (ride_template_id, ride_request_id);
        
        RAISE NOTICE '✓ Unique constraint added';
    ELSE
        RAISE NOTICE '✓ Unique constraint already exists';
    END IF;
END $$;

-- Step 2: Add updated_at column if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'match_suggestions' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE match_suggestions
        ADD COLUMN updated_at timestamp with time zone DEFAULT now();
        RAISE NOTICE '✓ updated_at column added';
    END IF;
END $$;

-- Step 3: Generate all compatible matches (HOST-FIRST)
-- This creates match_suggestions with status = 'pending'
-- These will be shown to HOSTS first, not riders
WITH compatible_pairs AS (
    SELECT 
        t.id as template_id,
        r.id as request_id,
        calculate_route_match_score(t.id, r.id) as match_data
    FROM ride_templates t
    CROSS JOIN ride_requests r
    WHERE t.status = 'active'
      AND r.status = 'active'
      AND t.host_id != r.rider_id
      -- Only create match if it doesn't already exist
      AND NOT EXISTS (
          SELECT 1 FROM match_suggestions ms
          WHERE ms.ride_template_id = t.id
          AND ms.ride_request_id = r.id
      )
)
INSERT INTO match_suggestions (
    ride_template_id,
    ride_request_id,
    route_match_score,
    schedule_match_score,
    overall_score,
    detour_distance_meters,
    pickup_distance_meters,
    status
)
SELECT 
    template_id,
    request_id,
    (match_data->>'route_match_score')::NUMERIC,
    (match_data->>'schedule_match_score')::NUMERIC,
    (match_data->>'overall_score')::NUMERIC,
    (match_data->>'pickup_distance_meters')::INTEGER,
    (match_data->>'pickup_distance_meters')::INTEGER,
    'pending'  -- HOST-FIRST: Start as pending, shown to host first
FROM compatible_pairs
WHERE (match_data->>'compatible')::boolean = true
ON CONFLICT (ride_template_id, ride_request_id) 
DO UPDATE SET
    route_match_score = EXCLUDED.route_match_score,
    schedule_match_score = EXCLUDED.schedule_match_score,
    overall_score = EXCLUDED.overall_score,
    detour_distance_meters = EXCLUDED.detour_distance_meters,
    pickup_distance_meters = EXCLUDED.pickup_distance_meters,
    updated_at = now();

-- Step 4: Verify matches were created
SELECT 
    '✓ Generated ' || COUNT(*) || ' match suggestions' as result,
    (SELECT COUNT(DISTINCT ride_template_id) FROM match_suggestions WHERE status = 'pending') as templates_with_matches,
    (SELECT COUNT(DISTINCT ride_request_id) FROM match_suggestions WHERE status = 'pending') as requests_with_matches
FROM match_suggestions 
WHERE status = 'pending';

-- Step 5: Show sample matches
SELECT 
    'Sample Match:' as info,
    rt.from_location || ' → ' || rt.to_location as host_route,
    rp.full_name as host_name,
    rr.pickup_location as rider_pickup,
    rip.full_name as rider_name,
    ms.overall_score as match_score
FROM match_suggestions ms
JOIN ride_templates rt ON ms.ride_template_id = rt.id
JOIN profiles rp ON rt.host_id = rp.id
JOIN ride_requests rr ON ms.ride_request_id = rr.id
JOIN profiles rip ON rr.rider_id = rip.id
WHERE ms.status = 'pending'
ORDER BY ms.created_at DESC
LIMIT 5;


-- =====================================================
-- PHASE 2: AUTOMATIC - pg_cron Every 10 Minutes
-- =====================================================
-- This automatically generates new matches for new users
-- =====================================================

-- Enable pg_cron extension (if not already enabled)
-- Go to Supabase Dashboard > Database > Extensions > Enable "pg_cron"

-- Step 1: Create the match generation function (idempotent)
CREATE OR REPLACE FUNCTION generate_pending_matches_auto()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    matches_created INTEGER;
BEGIN
    -- Generate matches for all compatible pairs
    WITH compatible_pairs AS (
        SELECT 
            t.id as template_id,
            r.id as request_id,
            calculate_route_match_score(t.id, r.id) as match_data
        FROM ride_templates t
        CROSS JOIN ride_requests r
        WHERE t.status = 'active'
          AND r.status = 'active'
          AND t.host_id != r.rider_id
          -- Only create if doesn't exist
          AND NOT EXISTS (
              SELECT 1 FROM match_suggestions ms
              WHERE ms.ride_template_id = t.id
              AND ms.ride_request_id = r.id
          )
    )
    INSERT INTO match_suggestions (
        ride_template_id,
        ride_request_id,
        route_match_score,
        schedule_match_score,
        overall_score,
        detour_distance_meters,
        pickup_distance_meters,
        status
    )
    SELECT 
        template_id,
        request_id,
        (match_data->>'route_match_score')::NUMERIC,
        (match_data->>'schedule_match_score')::NUMERIC,
        (match_data->>'overall_score')::NUMERIC,
        (match_data->>'pickup_distance_meters')::INTEGER,
        (match_data->>'pickup_distance_meters')::INTEGER,
        'pending'
    FROM compatible_pairs
    WHERE (match_data->>'compatible')::boolean = true
    ON CONFLICT (ride_template_id, ride_request_id) 
    DO UPDATE SET
        overall_score = EXCLUDED.overall_score,
        updated_at = now();
    
    -- Count how many were created
    SELECT COUNT(*) INTO matches_created
    FROM match_suggestions
    WHERE status = 'pending'
    AND updated_at > now() - interval '1 minute';
    
    RETURN matches_created;
END;
$$;

-- Step 2: Schedule automatic generation every 10 minutes
SELECT cron.schedule(
    'raatap-generate-matches-auto',
    '*/10 * * * *',  -- Every 10 minutes
    $$SELECT generate_pending_matches_auto()$$
);

-- Step 3: Verify schedule was created
SELECT 
    '✓ Scheduled job created' as result,
    jobname,
    schedule
FROM cron.job
WHERE jobname = 'raatap-generate-matches-auto';


-- =====================================================
-- PHASE 3: API HELPER FUNCTIONS (Optional but Recommended)
-- =====================================================

-- Function to get matches for HOST dashboard
-- Shows pending matches (riders that host can accept)
CREATE OR REPLACE FUNCTION get_host_match_suggestions(p_host_id UUID)
RETURNS TABLE (
    match_id UUID,
    rider_id UUID,
    rider_name TEXT,
    rider_gender TEXT,
    pickup_location TEXT,
    destination_location TEXT,
    overall_score NUMERIC,
    route_match_score NUMERIC,
    schedule_match_score NUMERIC,
    days_needed TEXT[],
    preferred_arrival_time TIME,
    vehicle_preference TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ms.id as match_id,
        rr.rider_id,
        rp.full_name as rider_name,
        rp.gender as rider_gender,
        rr.pickup_location,
        rr.destination_location,
        ms.overall_score,
        ms.route_match_score,
        ms.schedule_match_score,
        rr.days_needed,
        rr.preferred_arrival_time,
        rr.vehicle_preference,
        ms.created_at
    FROM match_suggestions ms
    JOIN ride_templates rt ON ms.ride_template_id = rt.id
    JOIN ride_requests rr ON ms.ride_request_id = rr.id
    JOIN profiles rp ON rr.rider_id = rp.id
    WHERE rt.host_id = p_host_id
      AND ms.status = 'pending'  -- Host sees pending matches
    ORDER BY ms.overall_score DESC, ms.created_at DESC;
END;
$$;

-- Function to get matches for RIDER dashboard
-- Shows accepted matches (hosts that accepted the rider)
CREATE OR REPLACE FUNCTION get_rider_match_suggestions(p_rider_id UUID)
RETURNS TABLE (
    match_id UUID,
    host_id UUID,
    host_name TEXT,
    host_gender TEXT,
    host_rating NUMERIC,
    vehicle_type TEXT,
    available_seats INTEGER,
    from_location TEXT,
    to_location TEXT,
    departure_time TIME,
    days_available TEXT[],
    overall_score NUMERIC,
    status TEXT,
    host_action_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ms.id as match_id,
        rt.host_id,
        hp.full_name as host_name,
        hp.gender as host_gender,
        5.0 as host_rating,  -- Can be replaced with actual rating system
        rt.vehicle_type,
        rt.available_seats,
        rt.from_location,
        rt.to_location,
        rt.departure_time,
        rt.days_available,
        ms.overall_score,
        ms.status,
        ms.host_action_at,
        ms.created_at
    FROM match_suggestions ms
    JOIN ride_requests rr ON ms.ride_request_id = rr.id
    JOIN ride_templates rt ON ms.ride_template_id = rt.id
    JOIN profiles hp ON rt.host_id = hp.id
    WHERE rr.rider_id = p_rider_id
      AND ms.status = 'accepted'  -- Rider sees accepted matches only
    ORDER BY ms.overall_score DESC, ms.host_action_at DESC;
END;
$$;


-- =====================================================
-- VERIFICATION & TESTING
-- =====================================================

-- Check everything is set up correctly
SELECT '=== SETUP VERIFICATION ===' as section;

-- 1. Check constraint
SELECT 
    'Constraint:' as check,
    CASE 
        WHEN conname IS NOT NULL THEN '✓ EXISTS'
        ELSE '✗ MISSING'
    END as status
FROM pg_constraint 
WHERE conname = 'match_suggestions_ride_pair_key';

-- 2. Check scheduled job
SELECT 
    'Scheduled Job:' as check,
    CASE 
        WHEN jobname IS NOT NULL THEN '✓ CREATED'
        ELSE '✗ MISSING'
    END as status
FROM cron.job
WHERE jobname = 'raatap-generate-matches-auto';

-- 3. Check helper functions
SELECT 
    'Helper Functions:' as check,
    proname as function
FROM pg_proc
WHERE proname IN ('get_host_match_suggestions', 'get_rider_match_suggestions', 'generate_pending_matches_auto');

-- 4. Check match count
SELECT 
    'Current Matches:' as check,
    COUNT(*) as total_pending_matches,
    COUNT(DISTINCT ride_template_id) as unique_templates,
    COUNT(DISTINCT ride_request_id) as unique_requests
FROM match_suggestions
WHERE status = 'pending';


-- =====================================================
-- USAGE EXAMPLES
-- =====================================================

-- HOST: Get match suggestions (show to host first)
-- SELECT * FROM get_host_match_suggestions('rahul-uuid-here');

-- RIDER: Get accepted matches (show after host accepts)
-- SELECT * FROM get_rider_match_suggestions('priya-uuid-here');

-- MANUAL: Force generate matches now
-- SELECT generate_pending_matches_auto();

-- ADMIN: View all pending matches
-- SELECT * FROM match_suggestions WHERE status = 'pending' ORDER BY created_at DESC;


-- =====================================================
-- DEPLOYMENT COMPLETE!
-- =====================================================
-- 
-- HOST-FIRST FLOW:
-- 1. ✓ Matches generated (status: pending)
-- 2. ✓ Host sees pending matches in dashboard
-- 3. ✓ Host accepts → status becomes 'accepted'
-- 4. ✓ Rider sees accepted matches in dashboard
-- 5. ✓ Rider confirms → status becomes 'confirmed'
-- 6. ✓ Pod member becomes active
-- 
-- AUTOMATIC GENERATION:
-- ✓ Runs every 10 minutes via pg_cron
-- ✓ New users get matched automatically
-- ✓ No manual intervention needed
-- 
-- NEXT STEPS:
-- 1. Update frontend to use get_host_match_suggestions() for host dashboard
-- 2. Update frontend to use get_rider_match_suggestions() for rider dashboard
-- 3. Test the complete flow with real users
-- =====================================================
