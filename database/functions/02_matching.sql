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
    -- Convert times to minutes since midnight for comparison
    time_diff_minutes := ABS(
        EXTRACT(HOUR FROM template.departure_time) * 60 + 
        EXTRACT(MINUTE FROM template.departure_time) -
        (EXTRACT(HOUR FROM ride_request.preferred_arrival_time) * 60 + 
        EXTRACT(MINUTE FROM ride_request.preferred_arrival_time))
    );
    
    time_window_minutes := ride_request.time_flexibility_mins;
    
    IF time_diff_minutes > time_window_minutes THEN
        -- Check if departure is after preferred arrival (invalid case)
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
    -- Route: 85% (hard to change), Schedule: 15% (people can adjust timing)
    overall_score := (route_match_score * 0.85 + schedule_match_score * 0.15);

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
    existing_match UUID;
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
        -- Check if match already exists
        SELECT id INTO existing_match
        FROM match_suggestions
        WHERE ride_template_id = template_id
        AND ride_request_id = request.id
        AND status IN ('pending', 'shown', 'accepted');
        
        IF existing_match IS NULL THEN
            -- Calculate match
            match_result := calculate_route_match_score(template_id, request.id);
            
            IF (match_result->>'compatible')::BOOLEAN = true THEN
                -- Create match suggestion
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
                );
                
                suggestions_created := suggestions_created + 1;
            END IF;
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
    existing_match UUID;
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
        -- Check if match already exists
        SELECT id INTO existing_match
        FROM match_suggestions
        WHERE ride_template_id = template.id
        AND ride_request_id = request_id
        AND status IN ('pending', 'shown', 'accepted');
        
        IF existing_match IS NULL THEN
            -- Calculate match
            match_result := calculate_route_match_score(template.id, request_id);
            
            IF (match_result->>'compatible')::BOOLEAN = true THEN
                -- Create match suggestion
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
                );
                
                suggestions_created := suggestions_created + 1;
            END IF;
        END IF;
    END LOOP;
    
    RETURN suggestions_created;
END;
$$;