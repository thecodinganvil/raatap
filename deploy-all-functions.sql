-- =====================================================
-- RAATAP - Complete Database Functions Deployment
-- =====================================================
-- Run this file in Supabase Dashboard > SQL Editor
-- Or use: supabase db push
-- =====================================================

-- =====================================================
-- STEP 0: Setup Unique Constraint for match_suggestions
-- =====================================================
-- This is required for ON CONFLICT to work in matching functions

-- Clean up duplicates first
DELETE FROM match_suggestions a USING match_suggestions b
WHERE a.id < b.id
AND a.ride_template_id = b.ride_template_id
AND a.ride_request_id = b.ride_request_id;

-- Add unique constraint if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'match_suggestions_ride_pair_key'
    ) THEN
        ALTER TABLE match_suggestions
        ADD CONSTRAINT match_suggestions_ride_pair_key 
        UNIQUE (ride_template_id, ride_request_id);
    END IF;
END $$;

-- Add updated_at column if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'match_suggestions' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE match_suggestions
        ADD COLUMN updated_at timestamp with time zone DEFAULT now();
    END IF;
END $$;

-- =====================================================
-- STEP 1: Drop Old Functions (to avoid parameter conflicts)
-- =====================================================

DROP FUNCTION IF EXISTS expire_pending_matches_if_full(uuid);
DROP FUNCTION IF EXISTS decrement_seats_taken(uuid);
DROP FUNCTION IF EXISTS create_ride_template_from_profile(uuid, text, integer, integer, time);
DROP FUNCTION IF EXISTS calculate_route_match_score(uuid, uuid);
DROP FUNCTION IF EXISTS generate_match_suggestions_for_ride_template(uuid);
DROP FUNCTION IF EXISTS generate_match_suggestions_for_ride_request(uuid);
DROP FUNCTION IF EXISTS accept_match_suggestion(uuid, uuid, text);
DROP FUNCTION IF EXISTS accept_match_suggestion(uuid, uuid);
DROP FUNCTION IF EXISTS confirm_match_suggestion(uuid, uuid);
DROP FUNCTION IF EXISTS skip_match_suggestion(uuid, uuid, text);
DROP FUNCTION IF EXISTS generate_all_matches();

-- Drop trigger first (before recreating)
DROP TRIGGER IF EXISTS on_profile_update_create_ride ON profiles;
DROP FUNCTION IF EXISTS trigger_auto_create_ride_from_profile();

-- =====================================================
-- STEP 1: Helper Functions
-- =====================================================

-- Helper function to decrement seats_taken (used when host skips a match)
CREATE OR REPLACE FUNCTION decrement_seats_taken(ride_template_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE ride_templates
    SET seats_taken = GREATEST(0, seats_taken - 1)
    WHERE id = ride_template_id;
END;
$$;

-- Helper function to expire matches if full
CREATE OR REPLACE FUNCTION expire_pending_matches_if_full(p_template_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    template_record RECORD;
BEGIN
    SELECT * INTO template_record FROM ride_templates WHERE id = p_template_id;

    IF template_record.seats_taken >= template_record.available_seats THEN
        UPDATE match_suggestions
        SET status = 'expired'
        WHERE ride_template_id = p_template_id
        AND status = 'pending';
    END IF;
END;
$$;

-- =====================================================
-- STEP 2: Ride Creation Functions (Auto-Seat Calculation)
-- =====================================================

-- Function to create ride_template from profile (HOST only)
-- Auto-calculates seats: 2-wheeler=1, 4-wheeler=3
CREATE OR REPLACE FUNCTION create_ride_template_from_profile(
    user_id UUID,
    p_vehicle_type TEXT,
    p_available_seats INTEGER DEFAULT NULL,
    p_max_detour_meters INTEGER DEFAULT 2000,
    p_return_time TIME DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_profile RECORD;
    new_ride_template UUID;
    role_check BOOLEAN;
    calculated_seats INTEGER;
BEGIN
    -- Validate user role (must be host)
    SELECT prefer_hosting INTO role_check
    FROM profiles
    WHERE id = user_id;

    IF role_check != true THEN
        RETURN json_build_object('success', false, 'error', 'Only hosts can create ride templates');
    END IF;

    -- Get profile data
    SELECT * INTO user_profile
    FROM profiles
    WHERE id = user_id AND prefer_hosting = true;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Profile not found or not a host');
    END IF;

    -- Check email verification
    IF user_profile.email_verified != true THEN
        RETURN json_build_object('success', false, 'error', 'Email verification required. Please verify your institutional email.');
    END IF;

    -- Validate required fields
    IF user_profile.from_lat IS NULL OR user_profile.from_lng IS NULL OR
       user_profile.to_lat IS NULL OR user_profile.to_lng IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Profile coordinates are required');
    END IF;

    IF user_profile.leave_home_time IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Leave home time is required');
    END IF;

    IF user_profile.days_of_commute IS NULL OR array_length(user_profile.days_of_commute, 1) = 0 THEN
        RETURN json_build_object('success', false, 'error', 'Days of commute are required');
    END IF;

    -- Auto-calculate available seats based on vehicle type if not provided
    IF p_available_seats IS NULL OR p_available_seats < 1 THEN
        IF p_vehicle_type = '2_wheeler' THEN
            calculated_seats := 1;  -- Bike: 1 passenger seat
        ELSIF p_vehicle_type = '4_wheeler' THEN
            calculated_seats := 3;  -- Car: 3 passenger seats
        ELSE
            calculated_seats := 1;  -- Default fallback
        END IF;
    ELSE
        calculated_seats := p_available_seats;
    END IF;

    -- Create ride_template
    INSERT INTO ride_templates (
        host_id,
        from_location,
        from_lat,
        from_lng,
        from_point,
        to_location,
        to_lat,
        to_lng,
        to_point,
        departure_time,
        return_time,
        days_available,
        vehicle_type,
        available_seats,
        max_detour_meters,
        gender_preference
    ) VALUES (
        user_id,
        user_profile.from_location,
        user_profile.from_lat,
        user_profile.from_lng,
        ST_GeomFromText('POINT(' || user_profile.from_lng || ' ' || user_profile.from_lat || ')', 4326),
        user_profile.to_location,
        user_profile.to_lat,
        user_profile.to_lng,
        ST_GeomFromText('POINT(' || user_profile.to_lng || ' ' || user_profile.to_lat || ')', 4326),
        user_profile.leave_home_time,
        p_return_time,
        user_profile.days_of_commute,
        p_vehicle_type,
        calculated_seats,
        p_max_detour_meters,
        COALESCE(user_profile.comfortable_with, 'both')
    ) RETURNING id INTO new_ride_template;

    RETURN json_build_object(
        'success', true,
        'ride_template_id', new_ride_template,
        'message', 'Ride template created successfully'
    );

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;

-- =====================================================
-- STEP 3: Core Matching Functions
-- =====================================================

-- Core PostGIS matching function
CREATE OR REPLACE FUNCTION calculate_route_match_score(
    template_id UUID,
    request_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    template RECORD;
    ride_request RECORD;
    host_route_line GEOMETRY;
    route_distance NUMERIC;
    pickup_distance NUMERIC;
    time_compatibility NUMERIC;
    day_overlap NUMERIC;
    route_match_score NUMERIC;
    schedule_match_score NUMERIC;
    overall_score NUMERIC;
    gender_compatible BOOLEAN;
    vehicle_compatible BOOLEAN;
    days_overlap_count INTEGER;
    total_days INTEGER;
    time_diff_minutes INTEGER;
    time_window_minutes INTEGER;
BEGIN
    -- Get ride template
    SELECT * INTO template
    FROM ride_templates
    WHERE id = template_id AND status = 'active';

    IF NOT FOUND THEN
        RETURN json_build_object('compatible', false, 'reason', 'Template not found or inactive');
    END IF;

    -- Get ride request
    SELECT * INTO ride_request
    FROM ride_requests
    WHERE id = request_id AND status = 'active';

    IF NOT FOUND THEN
        RETURN json_build_object('compatible', false, 'reason', 'Request not found or inactive');
    END IF;

    -- Check gender compatibility
    gender_compatible := (
        (template.gender_preference = 'both') OR
        (template.gender_preference = ride_request.gender_preference) OR
        (ride_request.gender_preference = 'both') OR
        (ride_request.gender_preference = template.gender_preference)
    );

    IF NOT gender_compatible THEN
        RETURN json_build_object('compatible', false, 'reason', 'Gender preference mismatch');
    END IF;

    -- Check vehicle compatibility
    vehicle_compatible := (
        ride_request.vehicle_preference = 'any' OR
        ride_request.vehicle_preference = template.vehicle_type
    );

    IF NOT vehicle_compatible THEN
        RETURN json_build_object('compatible', false, 'reason', 'Vehicle preference mismatch');
    END IF;

    -- Create host route line (from → to) (cast geography to geometry for ST_MakeLine)
    host_route_line := ST_MakeLine(template.from_point::geometry, template.to_point::geometry);

    -- Calculate pickup distance from rider pickup to host route (cast to geography for meters)
    pickup_distance := ST_Distance(
        ride_request.pickup_point::geography,
        host_route_line::geography,
        true -- use_spheroid
    );

    -- Check if pickup is within max detour
    IF pickup_distance > template.max_detour_meters THEN
        RETURN json_build_object('compatible', false, 'reason', 'Pickup too far from route', 'distance', pickup_distance);
    END IF;

    -- Calculate day overlap
    days_overlap_count := (
        SELECT array_length(
            ARRAY(
                SELECT unnest(template.days_available)
                INTERSECT
                SELECT unnest(ride_request.days_needed)
            ), 1
        )
    );

    total_days := GREATEST(
        array_length(template.days_available, 1),
        array_length(ride_request.days_needed, 1)
    );

    IF days_overlap_count IS NULL OR days_overlap_count = 0 THEN
        RETURN json_build_object('compatible', false, 'reason', 'No overlapping days');
    END IF;

    day_overlap := days_overlap_count::NUMERIC / total_days::NUMERIC;

    -- Calculate time compatibility
    time_diff_minutes := ABS(
        EXTRACT(HOUR FROM template.departure_time) * 60 +
        EXTRACT(MINUTE FROM template.departure_time) -
        (EXTRACT(HOUR FROM ride_request.preferred_arrival_time) * 60 +
        EXTRACT(MINUTE FROM ride_request.preferred_arrival_time))
    );

    time_window_minutes := ride_request.time_flexibility_mins;

    IF time_diff_minutes > time_window_minutes THEN
        IF template.departure_time > ride_request.preferred_arrival_time THEN
            RETURN json_build_object('compatible', false, 'reason', 'Departure after preferred arrival');
        END IF;
    END IF;

    -- Time score: perfect if within flexibility, decreases linearly outside
    IF time_diff_minutes <= time_window_minutes THEN
        time_compatibility := 1.0;
    ELSE
        time_compatibility := GREATEST(0, 1.0 - (time_diff_minutes - time_window_minutes)::NUMERIC / 60.0);
    END IF;

    -- Route match score: better for closer pickup points
    route_match_score := GREATEST(0, 1.0 - (pickup_distance::NUMERIC / template.max_detour_meters::NUMERIC));

    -- Schedule match score: weighted average of time and day compatibility
    schedule_match_score := (time_compatibility * 0.7 + day_overlap * 0.3);

    -- Overall score: weighted average
    overall_score := (route_match_score * 0.6 + schedule_match_score * 0.4);

    RETURN json_build_object(
        'compatible', true,
        'route_match_score', route_match_score,
        'schedule_match_score', schedule_match_score,
        'overall_score', overall_score,
        'pickup_distance_meters', ROUND(pickup_distance),
        'day_overlap', day_overlap,
        'time_compatibility', time_compatibility,
        'days_overlap_count', days_overlap_count
    );

END;
$$;

-- Function to generate matches for a new ride template
CREATE OR REPLACE FUNCTION generate_match_suggestions_for_ride_template(
    template_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    template RECORD;
    request RECORD;
    match_result JSON;
    suggestions_created INTEGER := 0;
BEGIN
    -- Get the template
    SELECT * INTO template
    FROM ride_templates
    WHERE id = template_id;

    IF NOT FOUND THEN
        RETURN 0;
    END IF;

    -- Loop through all active ride requests
    FOR request IN
        SELECT * FROM ride_requests
        WHERE status = 'active'
        AND rider_id != template.host_id
    LOOP
        -- Calculate match
        match_result := calculate_route_match_score(template_id, request.id);

        IF (match_result->>'compatible')::BOOLEAN = true THEN
            -- Create match suggestion safely (idempotent)
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
                template_id,
                request.id,
                (match_result->>'route_match_score')::NUMERIC,
                (match_result->>'schedule_match_score')::NUMERIC,
                (match_result->>'overall_score')::NUMERIC,
                (match_result->>'pickup_distance_meters')::INTEGER,
                (match_result->>'pickup_distance_meters')::INTEGER,
                'pending'
            )
            ON CONFLICT (ride_template_id, ride_request_id)
            DO UPDATE SET
                route_match_score = (match_result->>'route_match_score')::NUMERIC,
                schedule_match_score = (match_result->>'schedule_match_score')::NUMERIC,
                overall_score = (match_result->>'overall_score')::NUMERIC,
                updated_at = now();

            suggestions_created := suggestions_created + 1;
        END IF;
    END LOOP;

    RETURN suggestions_created;
END;
$$;

-- Function to generate matches for a new ride request
CREATE OR REPLACE FUNCTION generate_match_suggestions_for_ride_request(
    request_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    request RECORD;
    template RECORD;
    match_result JSON;
    suggestions_created INTEGER := 0;
BEGIN
    -- Get the request
    SELECT * INTO request
    FROM ride_requests
    WHERE id = request_id;

    IF NOT FOUND THEN
        RETURN 0;
    END IF;

    -- Loop through all active ride templates
    FOR template IN
        SELECT * FROM ride_templates
        WHERE status = 'active'
        AND host_id != request.rider_id
    LOOP
        -- Calculate match
        match_result := calculate_route_match_score(template.id, request_id);

        IF (match_result->>'compatible')::BOOLEAN = true THEN
            -- Create match suggestion safely (idempotent)
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
                template.id,
                request_id,
                (match_result->>'route_match_score')::NUMERIC,
                (match_result->>'schedule_match_score')::NUMERIC,
                (match_result->>'overall_score')::NUMERIC,
                (match_result->>'pickup_distance_meters')::INTEGER,
                (match_result->>'pickup_distance_meters')::INTEGER,
                'pending'
            )
            ON CONFLICT (ride_template_id, ride_request_id)
            DO UPDATE SET
                route_match_score = (match_result->>'route_match_score')::NUMERIC,
                schedule_match_score = (match_result->>'schedule_match_score')::NUMERIC,
                overall_score = (match_result->>'overall_score')::NUMERIC,
                updated_at = now();

            suggestions_created := suggestions_created + 1;
        END IF;
    END LOOP;

    RETURN suggestions_created;
END;
$$;

-- =====================================================
-- STEP 3: Match Management Functions (Standardized)
-- =====================================================

-- Function for host to accept a match (creates pod member in pending_rider status)
CREATE OR REPLACE FUNCTION accept_match_suggestion(
    p_match_id UUID,
    p_host_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    match_record RECORD;
    new_pod UUID;
    existing_pod UUID;
BEGIN
    -- Get match suggestion details with template info
    SELECT ms.*,
           rt.host_id,
           rt.seats_taken,
           rt.available_seats,
           rt.from_location,
           rt.to_location,
           rt.departure_time,
           rt.days_available
    INTO match_record
    FROM match_suggestions ms
    JOIN ride_templates rt ON ms.ride_template_id = rt.id
    WHERE ms.id = p_match_id;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Match not found');
    END IF;

    -- Verify host ownership
    IF match_record.host_id != p_host_id THEN
        RETURN json_build_object('success', false, 'error', 'Not authorized');
    END IF;

    -- CRITICAL: Check capacity
    IF match_record.seats_taken >= match_record.available_seats THEN
        RETURN json_build_object('success', false, 'error', 'Ride is full. Cannot accept more riders.');
    END IF;

    -- Check if a pod already exists for this ride template
    SELECT id INTO existing_pod
    FROM pods
    WHERE ride_template_id = match_record.ride_template_id
    AND status = 'active'
    LIMIT 1;

    IF existing_pod IS NULL THEN
        -- Create new pod
        INSERT INTO pods (
            ride_template_id,
            host_id,
            name,
            days_active,
            departure_time,
            origin_location,
            destination_location,
            status
        ) VALUES (
            match_record.ride_template_id,
            p_host_id,
            COALESCE('Daily Commute - ' || match_record.from_location, 'Ride Pod'),
            match_record.days_available,
            match_record.departure_time,
            match_record.from_location,
            match_record.to_location,
            'active'
        ) RETURNING id INTO new_pod;
    ELSE
        new_pod := existing_pod;
    END IF;

    -- Update match suggestion status
    UPDATE match_suggestions
    SET status = 'accepted',
        host_action_at = NOW()
    WHERE id = p_match_id;

    -- Increment seats taken on template (temporary seat lock)
    UPDATE ride_templates
    SET seats_taken = seats_taken + 1
    WHERE id = match_record.ride_template_id;

    -- Create pod member in pending_rider status
    INSERT INTO pod_members (
        pod_id,
        rider_id,
        ride_request_id,
        pickup_location,
        pickup_lat,
        pickup_lng,
        pickup_point,
        pickup_landmark,
        status,
        host_approved_at
    ) SELECT
        new_pod,
        rr.rider_id,
        rr.id,
        rr.pickup_location,
        rr.pickup_lat,
        rr.pickup_lng,
        rr.pickup_point,
        rr.pickup_landmark,
        'pending_rider',
        NOW()
    FROM ride_requests rr
    WHERE rr.id = match_record.ride_request_id;

    -- Update ride request status
    UPDATE ride_requests
    SET status = 'matched'
    WHERE id = match_record.ride_request_id;

    -- CRITICAL: Check if we just filled the last seat and expire others
    PERFORM expire_pending_matches_if_full(match_record.ride_template_id);

    RETURN json_build_object(
        'success', true,
        'pod_id', new_pod,
        'match_id', p_match_id,
        'message', 'Match accepted. Waiting for rider confirmation.'
    );

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;

-- Function for rider to confirm a match (activates pod membership)
CREATE OR REPLACE FUNCTION confirm_match_suggestion(
    p_match_id UUID,
    p_rider_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    match_record RECORD;
    pod_member_id UUID;
BEGIN
    -- Get match suggestion and verify rider ownership
    SELECT ms.*, rr.rider_id
    INTO match_record
    FROM match_suggestions ms
    JOIN ride_requests rr ON ms.ride_request_id = rr.id
    WHERE ms.id = p_match_id
    AND ms.status = 'accepted'
    AND rr.rider_id = p_rider_id;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Match not found or not ready for confirmation');
    END IF;

    -- Find and update the pod member to active
    UPDATE pod_members
    SET status = 'active',
        rider_confirmed_at = NOW(),
        joined_at = NOW()
    WHERE ride_request_id = match_record.ride_request_id
    AND status = 'pending_rider'
    RETURNING id INTO pod_member_id;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Pod member not found');
    END IF;

    -- Update confirmed match status
    UPDATE match_suggestions
    SET status = 'confirmed'
    WHERE id = p_match_id;

    -- CRITICAL: Expire all OTHER matches for this rider (prevent double booking)
    UPDATE match_suggestions
    SET status = 'expired'
    WHERE ride_request_id = match_record.ride_request_id
    AND id != p_match_id
    AND status IN ('pending', 'shown', 'accepted');

    -- CRITICAL: Check if seat is now full for this template
    PERFORM expire_pending_matches_if_full(match_record.ride_template_id);

    RETURN json_build_object(
        'success', true,
        'pod_member_id', pod_member_id,
        'match_id', p_match_id,
        'message', 'Match confirmed! You are now part of the ride.'
    );

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;

-- Function to skip/decline a match (handles both host and rider rejection)
CREATE OR REPLACE FUNCTION skip_match_suggestion(
    p_match_id UUID,
    p_user_id UUID,
    p_user_role TEXT -- 'host' or 'rider'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    match_record RECORD;
    is_owner BOOLEAN := false;
BEGIN
    -- Verify match ownership based on role
    IF p_user_role = 'host' THEN
        SELECT ms.*, rt.host_id
        INTO match_record
        FROM match_suggestions ms
        JOIN ride_templates rt ON ms.ride_template_id = rt.id
        WHERE ms.id = p_match_id AND rt.host_id = p_user_id;

        is_owner := FOUND;

    ELSIF p_user_role = 'rider' THEN
        SELECT ms.*, rr.rider_id
        INTO match_record
        FROM match_suggestions ms
        JOIN ride_requests rr ON ms.ride_request_id = rr.id
        WHERE ms.id = p_match_id AND rr.rider_id = p_user_id;

        is_owner := FOUND;

    ELSE
        RETURN json_build_object('success', false, 'error', 'Invalid user role');
    END IF;

    IF NOT FOUND OR NOT is_owner THEN
        RETURN json_build_object('success', false, 'error', 'Match not found or not accessible');
    END IF;

    -- Logic Branching based on role
    IF p_user_role = 'host' THEN
        -- Host skipped: just mark skipped
        UPDATE match_suggestions
        SET status = 'skipped'
        WHERE id = p_match_id;

    ELSIF p_user_role = 'rider' THEN
        -- Rider rejected:
        -- If status was 'accepted' (Host waiting), we need to revert seat count
        IF match_record.status = 'accepted' THEN
             UPDATE ride_templates
             SET seats_taken = seats_taken - 1
             WHERE id = match_record.ride_template_id;

             DELETE FROM pod_members
             WHERE ride_request_id = match_record.ride_request_id
             AND status = 'pending_rider';
        END IF;

        -- Mark as skipped
        UPDATE match_suggestions
        SET status = 'skipped'
        WHERE id = p_match_id;

    END IF;

    RETURN json_build_object(
        'success', true,
        'message', 'Match skipped/rejected'
    );

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;

-- =====================================================
-- STEP 4: Generate All Matches (Bulk Operation)
-- =====================================================

CREATE OR REPLACE FUNCTION generate_all_matches()
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    template_record RECORD;
    request_record RECORD;
    total_templates INTEGER := 0;
    total_requests INTEGER := 0;
    total_matches INTEGER := 0;
BEGIN
    -- =====================================================
    -- STEP 1: Generate matches for all active ride templates
    -- =====================================================
    FOR template_record IN
        SELECT id, host_id, from_location, to_location
        FROM ride_templates
        WHERE status = 'active'
    LOOP
        -- Generate matches for this template
        PERFORM generate_match_suggestions_for_ride_template(template_record.id);

        total_templates := total_templates + 1;
    END LOOP;

    -- =====================================================
    -- STEP 2: Generate matches for all active ride requests
    -- =====================================================
    FOR request_record IN
        SELECT id, rider_id, pickup_location, destination_location
        FROM ride_requests
        WHERE status = 'active'
    LOOP
        -- Generate matches for this request
        PERFORM generate_match_suggestions_for_ride_request(request_record.id);

        total_requests := total_requests + 1;
    END LOOP;

    -- =====================================================
    -- STEP 3: Count total matches created
    -- =====================================================
    SELECT COUNT(*) INTO total_matches
    FROM match_suggestions
    WHERE status = 'pending';

    -- =====================================================
    -- RETURN SUMMARY
    -- =====================================================
    RETURN json_build_object(
        'success', true,
        'templates_processed', total_templates,
        'requests_processed', total_requests,
        'total_matches', total_matches,
        'message', 'Match generation complete'
    );
END;
$$;

-- =====================================================
-- STEP 6: Auto-Create Trigger (Uses Vehicle Type)
-- =====================================================

-- Trigger function that auto-creates ride template/request from profile
-- Now uses user's actual vehicle_type instead of hardcoded '4_wheeler'
CREATE OR REPLACE FUNCTION trigger_auto_create_ride_from_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    res JSON;
    calculated_seats INTEGER;
BEGIN
    -- 1. Handling HOST creation
    IF NEW.prefer_hosting = true AND
       NEW.from_lat IS NOT NULL AND NEW.from_lng IS NOT NULL AND
       NEW.to_lat IS NOT NULL AND NEW.to_lng IS NOT NULL AND
       NEW.days_of_commute IS NOT NULL AND array_length(NEW.days_of_commute, 1) > 0 THEN

        IF NOT EXISTS (SELECT 1 FROM ride_templates WHERE host_id = NEW.id AND status = 'active') THEN
            -- Auto-calculate seats based on user's vehicle type
            IF NEW.vehicle_type = '2_wheeler' THEN
                calculated_seats := 1;  -- Bike: 1 passenger seat
            ELSE
                calculated_seats := 3;  -- Car: 3 passenger seats (default)
            END IF;
            
            PERFORM create_ride_template_from_profile(
                NEW.id,
                COALESCE(NEW.vehicle_type, '4_wheeler'),
                calculated_seats,
                5000,
                '18:00:00'
            );
        END IF;
    END IF;

    -- 2. Handling RIDER creation
    IF NEW.prefer_taking_ride = true AND
       NEW.from_lat IS NOT NULL AND NEW.from_lng IS NOT NULL AND
       NEW.to_lat IS NOT NULL AND NEW.to_lng IS NOT NULL AND
       NEW.days_of_commute IS NOT NULL AND array_length(NEW.days_of_commute, 1) > 0 THEN

        IF NOT EXISTS (SELECT 1 FROM ride_requests WHERE rider_id = NEW.id AND status = 'active') THEN
            PERFORM create_ride_request_from_profile(
                NEW.id,
                '09:00:00',
                30,
                'any',
                'both'
            );
            
            -- Trigger match generation for existing ride_templates (hosts)
            PERFORM generate_all_matches();
        END IF;
    END IF;

    -- 3. Handling HOST match generation
    IF NEW.prefer_hosting = true AND
       NEW.from_lat IS NOT NULL AND NEW.from_lng IS NOT NULL AND
       NEW.to_lat IS NOT NULL AND NEW.to_lng IS NOT NULL AND
       NEW.days_of_commute IS NOT NULL AND array_length(NEW.days_of_commute, 1) > 0 THEN

        IF NOT EXISTS (SELECT 1 FROM ride_templates WHERE host_id = NEW.id AND status = 'active') THEN
            -- Trigger match generation for existing ride_requests (riders)
            PERFORM generate_all_matches();
        END IF;
    END IF;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Auto-creation failed for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Create Trigger
CREATE TRIGGER on_profile_update_create_ride
AFTER INSERT OR UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION trigger_auto_create_ride_from_profile();

-- =====================================================
-- DEPLOYMENT COMPLETE!
-- =====================================================
-- To verify, run in SQL Editor:
-- SELECT generate_all_matches();
-- =====================================================
