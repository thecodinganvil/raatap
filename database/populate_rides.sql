-- =====================================================
-- POPULATE RIDES - Auto-create ride templates and requests
-- =====================================================
-- This file CALLS the functions to create rides for all users
-- Run this AFTER 01_create_rides.sql
-- DUPLICATE SAFE: Checks if ride already exists before creating
-- =====================================================

-- =====================================================
-- CREATE RIDE TEMPLATES FOR ALL HOSTS
-- =====================================================
-- Users with prefer_hosting = true AND email_verified = true
-- SKIPS if host already has an active ride template

DO $$
DECLARE
    host_record RECORD;
    result JSON;
    existing_template_count INTEGER;
BEGIN
    FOR host_record IN 
        SELECT id, vehicle_type, comfortable_with
        FROM profiles
        WHERE prefer_hosting = true 
        AND email_verified = true
    LOOP
        -- Check if this host already has an active ride template
        SELECT COUNT(*) INTO existing_template_count
        FROM ride_templates
        WHERE host_id = host_record.id
        AND status = 'active';

        IF existing_template_count = 0 THEN
            -- No existing template, create one
            SELECT create_ride_template_from_profile(
                host_record.id,
                host_record.vehicle_type,
                1,  -- available_seats
                2000,  -- max_detour_meters
                NULL  -- return_time
            ) INTO result;

            RAISE NOTICE 'Host %: %', host_record.id, result;
        ELSE
            RAISE NOTICE 'Host %: SKIPPED (already has active template)', host_record.id;
        END IF;
    END LOOP;
END $$;

-- =====================================================
-- CREATE RIDE REQUESTS FOR ALL RIDERS
-- =====================================================
-- Users with prefer_taking_ride = true AND email_verified = true
-- SKIPS if rider already has an active ride request

DO $$
DECLARE
    rider_record RECORD;
    result JSON;
    existing_request_count INTEGER;
BEGIN
    FOR rider_record IN 
        SELECT id, vehicle_type, comfortable_with
        FROM profiles
        WHERE prefer_taking_ride = true 
        AND email_verified = true
    LOOP
        -- Check if this rider already has an active ride request
        SELECT COUNT(*) INTO existing_request_count
        FROM ride_requests
        WHERE rider_id = rider_record.id
        AND status = 'active';

        IF existing_request_count = 0 THEN
            -- No existing request, create one
            SELECT create_ride_request_from_profile(
                rider_record.id,
                '09:00:00'::time,  -- preferred_arrival_time
                15,  -- time_flexibility_mins
                'any',  -- vehicle_preference
                'both'  -- gender_preference
            ) INTO result;

            RAISE NOTICE 'Rider %: %', rider_record.id, result;
        ELSE
            RAISE NOTICE 'Rider %: SKIPPED (already has active request)', rider_record.id;
        END IF;
    END LOOP;
END $$;

-- =====================================================
-- VERIFY RESULTS
-- =====================================================

-- Count ride templates created
SELECT 'Ride Templates Created' AS table_name, COUNT(*) AS count 
FROM ride_templates;

-- Count ride requests created
SELECT 'Ride Requests Created' AS table_name, COUNT(*) AS count 
FROM ride_requests;

-- View all ride templates
SELECT 
    rt.id AS template_id,
    p.full_name AS host_name,
    rt.vehicle_type,
    rt.available_seats,
    rt.from_location,
    rt.to_location,
    rt.departure_time,
    rt.days_available,
    rt.status
FROM ride_templates rt
JOIN profiles p ON rt.host_id = p.id;

-- View all ride requests
SELECT 
    rr.id AS request_id,
    p.full_name AS rider_name,
    rr.vehicle_preference,
    rr.pickup_location,
    rr.destination_location,
    rr.preferred_arrival_time,
    rr.days_needed,
    rr.status
FROM ride_requests rr
JOIN profiles p ON rr.rider_id = p.id;
