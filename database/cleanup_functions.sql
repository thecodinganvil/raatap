-- =================================================================
-- Cleanup Script for Old/Conflicting Functions and Triggers
-- =================================================================
-- Run this script to remove old functions that might be conflicting
-- with the new implementation.

-- 1. Drop trigger on ride_requests (if any)
DROP TRIGGER IF EXISTS on_ride_request_created ON ride_requests;
DROP TRIGGER IF EXISTS trigger_auto_match_suggestions ON ride_requests;

-- 2. Drop trigger on ride_templates (if any)
DROP TRIGGER IF EXISTS on_ride_template_created ON ride_templates;
DROP TRIGGER IF EXISTS trigger_auto_match_suggestions_template ON ride_templates;

-- 3. Drop old functions
DROP FUNCTION IF EXISTS auto_generate_match_suggestions() CASCADE;
DROP FUNCTION IF EXISTS find_compatible_templates(double precision,double precision,double precision,double precision,text[],time without time zone,integer,text,text,text,integer) CASCADE;

-- 4. Re-verify function existence (optional)
-- SELECT proname FROM pg_proc WHERE proname IN ('auto_generate_match_suggestions', 'find_compatible_templates');
