-- =====================================================
-- FIX: Match Suggestions Not Being Created
-- =====================================================
-- Run this ENTIRE script in Supabase SQL Editor
-- =====================================================

-- STEP 1: Check if unique constraint exists
SELECT 
    'Constraint exists' as status,
    conname as constraint_name
FROM pg_constraint 
WHERE conname = 'match_suggestions_ride_pair_key';

-- STEP 2: Add unique constraint if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'match_suggestions_ride_pair_key'
    ) THEN
        -- First, remove duplicates
        DELETE FROM match_suggestions a USING match_suggestions b
        WHERE a.id < b.id
        AND a.ride_template_id = b.ride_template_id
        AND a.ride_request_id = b.ride_request_id;
        
        -- Add the constraint
        ALTER TABLE match_suggestions
        ADD CONSTRAINT match_suggestions_ride_pair_key 
        UNIQUE (ride_template_id, ride_request_id);
        
        RAISE NOTICE 'Unique constraint added successfully';
    ELSE
        RAISE NOTICE 'Unique constraint already exists';
    END IF;
END $$;

-- STEP 3: Add updated_at column if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'match_suggestions' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE match_suggestions
        ADD COLUMN updated_at timestamp with time zone DEFAULT now();
        RAISE NOTICE 'updated_at column added';
    END IF;
END $$;

-- STEP 4: Test manual insert (bypass the function)
DO $$
DECLARE
    test_template_id UUID;
    test_request_id UUID;
BEGIN
    SELECT id INTO test_template_id FROM ride_templates WHERE status = 'active' LIMIT 1;
    SELECT id INTO test_request_id FROM ride_requests WHERE status = 'active' LIMIT 1;
    
    IF test_template_id IS NOT NULL AND test_request_id IS NOT NULL THEN
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
            test_template_id,
            test_request_id,
            (result->>'route_match_score')::NUMERIC,
            (result->>'schedule_match_score')::NUMERIC,
            (result->>'overall_score')::NUMERIC,
            (result->>'pickup_distance_meters')::INTEGER,
            (result->>'pickup_distance_meters')::INTEGER,
            'pending'
        FROM (
            SELECT calculate_route_match_score(test_template_id, test_request_id) as result
        ) sub
        ON CONFLICT (ride_template_id, ride_request_id)
        DO UPDATE SET
            route_match_score = EXCLUDED.route_match_score,
            schedule_match_score = EXCLUDED.schedule_match_score,
            overall_score = EXCLUDED.overall_score,
            updated_at = now();
        
        RAISE NOTICE 'Manual insert test completed';
        RAISE NOTICE 'Template ID: %', test_template_id;
        RAISE NOTICE 'Request ID: %', test_request_id;
    ELSE
        RAISE NOTICE 'No active templates or requests found';
    END IF;
END $$;

-- STEP 5: Check if match was created
SELECT 'Match suggestions after fix:' as status, COUNT(*) as count 
FROM match_suggestions WHERE status = 'pending';

SELECT * FROM match_suggestions 
ORDER BY created_at DESC 
LIMIT 5;

-- STEP 6: Test the generate function
SELECT 
    'Function test result:' as status,
    generate_match_suggestions_for_ride_template(
        (SELECT id FROM ride_templates WHERE status = 'active' LIMIT 1)
    ) as matches_created;

-- STEP 7: Final check
SELECT 
    'Final count:' as status,
    COUNT(*) as total_pending_matches
FROM match_suggestions 
WHERE status = 'pending';
