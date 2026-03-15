-- =================================================================
-- INSTANT MATCHING TRIGGERS
-- =================================================================
-- Automatically generates matches when:
-- 1. New ride template is created (host)
-- 2. New ride request is created (rider)
-- 
-- This makes matching INSTANT - no manual refresh needed!
-- =================================================================

-- ================================================================
-- 1. Trigger: Auto-match when ride template created
-- ================================================================
-- When a host creates a ride template, instantly find all compatible riders

CREATE OR REPLACE FUNCTION trigger_auto_match_template()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    matches_found INTEGER;
BEGIN
    -- Log trigger execution
    PERFORM log_activity(
        'INFO',
        'trigger_auto_match_template',
        'Auto-generating matches for new ride template',
        NEW.host_id,
        'ride_template',
        NEW.id,
        jsonb_build_object(
            'from_location', NEW.from_location,
            'to_location', NEW.to_location,
            'days_available', NEW.days_available
        )
    );

    -- Generate matches for all active ride requests
    matches_found := generate_match_suggestions_for_ride_template(NEW.id);

    -- Log results
    PERFORM log_activity(
        'INFO',
        'trigger_auto_match_template',
        'Match generation completed',
        NEW.host_id,
        'ride_template',
        NEW.id,
        jsonb_build_object('matches_found', matches_found)
    );

    RETURN NEW;
END;
$$;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_ride_template_created_auto_match ON ride_templates;

-- Create trigger
CREATE TRIGGER on_ride_template_created_auto_match
AFTER INSERT ON ride_templates
FOR EACH ROW
EXECUTE FUNCTION trigger_auto_match_template();

COMMENT ON TRIGGER on_ride_template_created_auto_match ON ride_templates IS 
'Automatically generates match suggestions when a new ride template is created';


-- ================================================================
-- 2. Trigger: Auto-match when ride request created
-- ================================================================
-- When a rider creates a ride request, instantly find all compatible hosts

CREATE OR REPLACE FUNCTION trigger_auto_match_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    matches_found INTEGER;
BEGIN
    -- Log trigger execution
    PERFORM log_activity(
        'INFO',
        'trigger_auto_match_request',
        'Auto-generating matches for new ride request',
        NEW.rider_id,
        'ride_request',
        NEW.id,
        jsonb_build_object(
            'pickup_location', NEW.pickup_location,
            'drop_location', NEW.drop_location,
            'days_needed', NEW.days_needed
        )
    );

    -- Generate matches for all active ride templates
    matches_found := generate_match_suggestions_for_ride_request(NEW.id);

    -- Log results
    PERFORM log_activity(
        'INFO',
        'trigger_auto_match_request',
        'Match generation completed',
        NEW.rider_id,
        'ride_request',
        NEW.id,
        jsonb_build_object('matches_found', matches_found)
    );

    RETURN NEW;
END;
$$;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_ride_request_created_auto_match ON ride_requests;

-- Create trigger
CREATE TRIGGER on_ride_request_created_auto_match
AFTER INSERT ON ride_requests
FOR EACH ROW
EXECUTE FUNCTION trigger_auto_match_request();

COMMENT ON TRIGGER on_ride_request_created_auto_match ON ride_requests IS 
'Automatically generates match suggestions when a new ride request is created';


-- ================================================================
-- 3. Manual trigger function (for testing/debugging)
-- ================================================================
-- Use this to regenerate matches for existing templates/requests

CREATE OR REPLACE FUNCTION regenerate_matches_for_template(template_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    matches_found INTEGER;
BEGIN
    -- Delete old pending matches for this template
    DELETE FROM match_suggestions
    WHERE ride_template_id = template_id
    AND status IN ('pending', 'shown');

    -- Regenerate matches
    matches_found := generate_match_suggestions_for_ride_template(template_id);

    -- Log regeneration
    PERFORM log_activity(
        'INFO',
        'regenerate_matches_for_template',
        'Regenerated matches for template',
        NULL,
        'ride_template',
        template_id,
        jsonb_build_object('matches_found', matches_found)
    );

    RETURN matches_found;
END;
$$;

CREATE OR REPLACE FUNCTION regenerate_matches_for_request(request_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    matches_found INTEGER;
BEGIN
    -- Delete old pending matches for this request
    DELETE FROM match_suggestions
    WHERE ride_request_id = request_id
    AND status IN ('pending', 'shown');

    -- Regenerate matches
    matches_found := generate_match_suggestions_for_ride_request(request_id);

    -- Log regeneration
    PERFORM log_activity(
        'INFO',
        'regenerate_matches_for_request',
        'Regenerated matches for request',
        NULL,
        'ride_request',
        request_id,
        jsonb_build_object('matches_found', matches_found)
    );

    RETURN matches_found;
END;
$$;


-- ================================================================
-- TESTING
-- ================================================================
/*
-- Test instant matching for template:
SELECT regenerate_matches_for_template('your-template-id');

-- Test instant matching for request:
SELECT regenerate_matches_for_request('your-request-id');

-- Check trigger exists:
SELECT tgname FROM pg_trigger WHERE tgname = 'on_ride_template_created_auto_match';
SELECT tgname FROM pg_trigger WHERE tgname = 'on_ride_request_created_auto_match';

-- View recent auto-match logs:
SELECT * FROM recent_activity_logs 
WHERE function_name LIKE 'trigger_auto_match%'
ORDER BY log_time DESC
LIMIT 10;
*/
