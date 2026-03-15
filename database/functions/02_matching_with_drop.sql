-- Core PostGIS matching function WITH DROP POINT DISTANCE
-- Now calculates both pickup AND drop distances for accurate matching

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
    pickup_distance NUMERIC;
    drop_distance NUMERIC;
    average_detour_distance NUMERIC;
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
    log_id UUID;
BEGIN
    -- Log function entry
    log_id := log_activity(
        'DEBUG',
        'calculate_route_match_score',
        'Starting match calculation with pickup and drop distances',
        NULL,
        'match',
        NULL,
        jsonb_build_object('template_id', template_id, 'request_id', request_id)
    );

    -- Get ride template
    SELECT * INTO template
    FROM ride_templates
    WHERE id = template_id AND status = 'active';

    IF NOT FOUND THEN
        PERFORM log_error(
            'calculate_route_match_score',
            'Template not found or inactive',
            'Template ID not found or not active',
            NULL,
            'ride_template',
            template_id,
            jsonb_build_object('request_id', request_id)
        );
        
        RETURN json_build_object('compatible', false, 'reason', 'Template not found or inactive');
    END IF;

    -- Get ride request
    SELECT * INTO ride_request
    FROM ride_requests
    WHERE id = request_id AND status = 'active';

    IF NOT FOUND THEN
        PERFORM log_error(
            'calculate_route_match_score',
            'Request not found or inactive',
            'Request ID not found or not active',
            NULL,
            'ride_request',
            request_id,
            jsonb_build_object('template_id', template_id)
        );
        
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
        PERFORM log_activity(
            'INFO',
            'calculate_route_match_score',
            'Gender preference mismatch',
            NULL,
            'match',
            NULL,
            jsonb_build_object(
                'template_id', template_id,
                'request_id', request_id,
                'template_gender', template.gender_preference,
                'request_gender', ride_request.gender_preference
            )
        );
        
        RETURN json_build_object('compatible', false, 'reason', 'Gender preference mismatch');
    END IF;

    -- Check vehicle compatibility
    vehicle_compatible := (
        ride_request.vehicle_preference = 'any' OR
        ride_request.vehicle_preference = template.vehicle_type
    );

    IF NOT vehicle_compatible THEN
        PERFORM log_activity(
            'INFO',
            'calculate_route_match_score',
            'Vehicle preference mismatch',
            NULL,
            'match',
            NULL,
            jsonb_build_object(
                'template_id', template_id,
                'request_id', request_id,
                'template_vehicle', template.vehicle_type,
                'request_vehicle', ride_request.vehicle_preference
            )
        );
        
        RETURN json_build_object('compatible', false, 'reason', 'Vehicle preference mismatch');
    END IF;

    -- Create host route line (from → to)
    host_route_line := ST_MakeLine(template.from_point::geometry, template.to_point::geometry);

    -- Calculate PICKUP distance from rider pickup to host route
    pickup_distance := ST_Distance(
        ride_request.pickup_point::geography,
        host_route_line::geography,
        true -- use_spheroid
    );

    -- Calculate DROP distance from rider drop to host route
    drop_distance := ST_Distance(
        ride_request.drop_point::geography,
        host_route_line::geography,
        true -- use_spheroid
    );

    -- Calculate average detour distance (mean of pickup and drop)
    average_detour_distance := (pickup_distance + drop_distance) / 2;

    -- Log pickup and drop distances
    PERFORM log_activity(
        'DEBUG',
        'calculate_route_match_score',
        'Calculated pickup and drop distances',
        NULL,
        'match',
        NULL,
        jsonb_build_object(
            'template_id', template_id,
            'request_id', request_id,
            'pickup_distance_meters', ROUND(pickup_distance),
            'drop_distance_meters', ROUND(drop_distance),
            'average_detour_meters', ROUND(average_detour_distance),
            'max_detour_meters', template.max_detour_meters
        )
    );

    -- Check if pickup is within max detour
    IF pickup_distance > template.max_detour_meters THEN
        PERFORM log_activity(
            'INFO',
            'calculate_route_match_score',
            'Pickup too far from route',
            NULL,
            'match',
            NULL,
            jsonb_build_object(
                'template_id', template_id,
                'request_id', request_id,
                'pickup_distance_meters', ROUND(pickup_distance),
                'max_detour_meters', template.max_detour_meters,
                'excess_meters', ROUND(pickup_distance - template.max_detour_meters)
            )
        );
        
        RETURN json_build_object(
            'compatible', false, 
            'reason', 'Pickup too far from route', 
            'distance', pickup_distance
        );
    END IF;

    -- Check if drop is within max detour
    IF drop_distance > template.max_detour_meters THEN
        PERFORM log_activity(
            'INFO',
            'calculate_route_match_score',
            'Drop too far from route',
            NULL,
            'match',
            NULL,
            jsonb_build_object(
                'template_id', template_id,
                'request_id', request_id,
                'drop_distance_meters', ROUND(drop_distance),
                'max_detour_meters', template.max_detour_meters,
                'excess_meters', ROUND(drop_distance - template.max_detour_meters)
            )
        );
        
        RETURN json_build_object(
            'compatible', false, 
            'reason', 'Drop location too far from route', 
            'distance', drop_distance
        );
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
        PERFORM log_activity(
            'INFO',
            'calculate_route_match_score',
            'No overlapping days',
            NULL,
            'match',
            NULL,
            jsonb_build_object(
                'template_id', template_id,
                'request_id', request_id,
                'template_days', template.days_available,
                'request_days', ride_request.days_needed
            )
        );
        
        RETURN json_build_object('compatible', false, 'reason', 'No overlapping days');
    END IF;

    day_overlap := days_overlap_count::NUMERIC / total_days::NUMERIC;

    -- Log day overlap
    PERFORM log_activity(
        'DEBUG',
        'calculate_route_match_score',
        'Day overlap calculated',
        NULL,
        'match',
        NULL,
        jsonb_build_object(
            'template_id', template_id,
            'request_id', request_id,
            'overlap_count', days_overlap_count,
            'total_days', total_days,
            'overlap_ratio', ROUND(day_overlap::NUMERIC, 2)
        )
    );

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
            PERFORM log_activity(
                'INFO',
                'calculate_route_match_score',
                'Departure after preferred arrival',
                NULL,
                'match',
                NULL,
                jsonb_build_object(
                    'template_id', template_id,
                    'request_id', request_id,
                    'departure_time', template.departure_time,
                    'preferred_arrival_time', ride_request.preferred_arrival_time
                )
            );
            
            RETURN json_build_object('compatible', false, 'reason', 'Departure after preferred arrival');
        END IF;
    END IF;

    -- Time score: perfect if within flexibility, decreases linearly outside
    IF time_diff_minutes <= time_window_minutes THEN
        time_compatibility := 1.0;
    ELSE
        time_compatibility := GREATEST(0, 1.0 - (time_diff_minutes - time_window_minutes)::NUMERIC / 60.0);
    END IF;

    -- Log time compatibility
    PERFORM log_activity(
        'DEBUG',
        'calculate_route_match_score',
        'Time compatibility calculated',
        NULL,
        'match',
        NULL,
        jsonb_build_object(
            'template_id', template_id,
            'request_id', request_id,
            'time_diff_minutes', time_diff_minutes,
            'flexibility_minutes', time_window_minutes,
            'time_compatibility', ROUND(time_compatibility::NUMERIC, 2)
        )
    );

    -- Route match score: based on AVERAGE of pickup and drop distances
    -- Weighted: 60% pickup (getting there), 40% drop (reaching destination)
    route_match_score := GREATEST(
        0, 
        1.0 - ((pickup_distance * 0.6 + drop_distance * 0.4)::NUMERIC / template.max_detour_meters::NUMERIC)
    );

    -- Schedule match score: weighted average of time and day compatibility
    schedule_match_score := (time_compatibility * 0.7 + day_overlap * 0.3);

    -- Overall score: weighted average
    -- Route: 60%, Schedule: 40%
    overall_score := (route_match_score * 0.6 + schedule_match_score * 0.4);

    -- Log final scores
    PERFORM log_activity(
        'INFO',
        'calculate_route_match_score',
        'Match calculation completed with pickup and drop distances',
        NULL,
        'match',
        NULL,
        jsonb_build_object(
            'template_id', template_id,
            'request_id', request_id,
            'route_match_score', ROUND(route_match_score::NUMERIC, 3),
            'schedule_match_score', ROUND(schedule_match_score::NUMERIC, 3),
            'overall_score', ROUND(overall_score::NUMERIC, 3),
            'pickup_distance_meters', ROUND(pickup_distance),
            'drop_distance_meters', ROUND(drop_distance),
            'average_detour_meters', ROUND(average_detour_distance),
            'day_overlap', ROUND(day_overlap::NUMERIC, 2),
            'time_compatibility', ROUND(time_compatibility::NUMERIC, 2),
            'days_overlap_count', days_overlap_count,
            'compatible', true
        )
    );

    RETURN json_build_object(
        'compatible', true,
        'route_match_score', route_match_score,
        'schedule_match_score', schedule_match_score,
        'overall_score', overall_score,
        'pickup_distance_meters', ROUND(pickup_distance),
        'drop_distance_meters', ROUND(drop_distance),
        'average_detour_meters', ROUND(average_detour_distance),
        'day_overlap', day_overlap,
        'time_compatibility', time_compatibility,
        'days_overlap_count', days_overlap_count
    );

EXCEPTION WHEN OTHERS THEN
    -- Log unexpected error
    PERFORM log_error(
        'calculate_route_match_score',
        'Unexpected error in match calculation',
        SQLERRM,
        NULL,
        'match',
        NULL,
        jsonb_build_object(
            'template_id', template_id,
            'request_id', request_id,
            'sql_state', SQLSTATE
        )
    );
    
    RETURN json_build_object(
        'compatible', false, 
        'reason', 'Internal error during match calculation',
        'error', SQLERRM
    );
END;
$$;
