-- =====================================================
-- FIX: Idempotent Matching - Handle Duplicate Keys
-- =====================================================
-- Run this ONCE in Supabase SQL Editor to fix the 
-- duplicate key error in match_suggestions
-- =====================================================

-- Step 1: Clean up existing duplicates
DELETE FROM match_suggestions a USING match_suggestions b
WHERE a.id < b.id
AND a.ride_template_id = b.ride_template_id
AND a.ride_request_id = b.ride_request_id;

-- Step 2: Add unique constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'match_suggestions_ride_pair_key'
        AND conrelid = 'match_suggestions'::regclass
    ) THEN
        ALTER TABLE match_suggestions
        ADD CONSTRAINT match_suggestions_ride_pair_key 
        UNIQUE (ride_template_id, ride_request_id);
        RAISE NOTICE 'Unique constraint added successfully';
    ELSE
        RAISE NOTICE 'Unique constraint already exists';
    END IF;
END $$;

-- Step 3: Add updated_at column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'match_suggestions' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE match_suggestions
        ADD COLUMN updated_at timestamp with time zone DEFAULT now();
        RAISE NOTICE 'updated_at column added successfully';
    ELSE
        RAISE NOTICE 'updated_at column already exists';
    END IF;
END $$;

-- Step 4: Verify
SELECT 
    constraint_name, 
    constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'match_suggestions' 
AND constraint_type = 'U';

-- =====================================================
-- After running this, deploy the updated functions
-- =====================================================
