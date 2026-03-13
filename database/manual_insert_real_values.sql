    -- =====================================================
    -- AUTO MANUAL INSERT - Uses REAL values from YOUR database
    -- =====================================================
    -- This automatically fetches real IDs and calculates real scores
    -- No dummy values - everything comes from your actual data
    -- =====================================================

    -- This INSERT uses REAL data from your database
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
        t.id as ride_template_id,
        r.id as ride_request_id,
        (result->>'route_match_score')::NUMERIC as route_match_score,
        (result->>'schedule_match_score')::NUMERIC as schedule_match_score,
        (result->>'overall_score')::NUMERIC as overall_score,
        (result->>'pickup_distance_meters')::INTEGER as detour_distance_meters,
        (result->>'pickup_distance_meters')::INTEGER as pickup_distance_meters,
        'pending' as status
    FROM 
        ride_templates t
    CROSS JOIN 
        ride_requests r
    CROSS JOIN LATERAL (
        SELECT calculate_route_match_score(t.id, r.id) as result
    ) calc
    WHERE 
        t.status = 'active'
        AND r.status = 'active'
        AND t.host_id != r.rider_id
        AND (result->>'compatible')::boolean = true
        AND NOT EXISTS (
            SELECT 1 
            FROM match_suggestions ms 
            WHERE ms.ride_template_id = t.id 
            AND ms.ride_request_id = r.id
        )
    ON CONFLICT (ride_template_id, ride_request_id) 
    DO UPDATE SET
        route_match_score = EXCLUDED.route_match_score,
        schedule_match_score = EXCLUDED.schedule_match_score,
        overall_score = EXCLUDED.overall_score,
        detour_distance_meters = EXCLUDED.detour_distance_meters,
        pickup_distance_meters = EXCLUDED.pickup_distance_meters,
        status = 'pending',
        updated_at = now();

    -- =====================================================
    -- VERIFY: Show what was inserted
    -- =====================================================

    SELECT 
        '✓ MATCHES CREATED/UPDATED:' as status,
        COUNT(*) as count
    FROM match_suggestions
    WHERE status = 'pending'
    AND updated_at > now() - interval '1 minute';

    -- =====================================================
    -- SHOW: All pending matches with REAL data
    -- =====================================================

    SELECT 
        '=== PENDING MATCHES (Host View) ===' as section;

    SELECT 
        ms.id as match_id,
        rp.full_name as host_name,
        rt.from_location || ' → ' || rt.to_location as host_route,
        rt.departure_time,
        rpr.full_name as rider_name,
        rr.pickup_location || ' → ' || rr.destination_location as rider_route,
        rr.preferred_arrival_time,
        ROUND((ms.overall_score::NUMERIC * 100), 1) as match_percentage,
        ms.route_match_score,
        ms.schedule_match_score,
        ms.pickup_distance_meters || 'm' as pickup_distance,
        ms.status
    FROM match_suggestions ms
    JOIN ride_templates rt ON ms.ride_template_id = rt.id
    JOIN profiles rp ON rt.host_id = rp.id
    JOIN ride_requests rr ON ms.ride_request_id = rr.id
    JOIN profiles rpr ON rr.rider_id = rpr.id
    WHERE ms.status = 'pending'
    ORDER BY ms.overall_score DESC, ms.created_at DESC;

    -- =====================================================
    -- SHOW: What RIDER will see (after host accepts)
    -- =====================================================

    SELECT 
        '=== ACCEPTED MATCHES (Rider View - After Host Accepts) ===' as section;

    SELECT 
        ms.id as match_id,
        rp.full_name as host_name,
        rt.from_location || ' → ' || rt.to_location as host_route,
        rt.departure_time,
        rt.vehicle_type,
        rt.available_seats || ' seats' as seats,
        rpr.full_name as rider_name,
        rr.pickup_location as rider_pickup,
        rr.preferred_arrival_time,
        ROUND((ms.overall_score::NUMERIC * 100), 1) as match_percentage,
        ms.status,
        ms.host_action_at
    FROM match_suggestions ms
    JOIN ride_templates rt ON ms.ride_template_id = rt.id
    JOIN profiles rp ON rt.host_id = rp.id
    JOIN ride_requests rr ON ms.ride_request_id = rr.id
    JOIN profiles rpr ON rr.rider_id = rpr.id
    WHERE ms.status = 'accepted'
    ORDER BY ms.host_action_at DESC;

    -- =====================================================
    -- SUMMARY: Show all match statistics
    -- =====================================================

    SELECT 
        '=== MATCH STATISTICS ===' as section;

    SELECT 
        status,
        COUNT(*) as count,
        ROUND(AVG(overall_score::NUMERIC * 100), 1) as avg_score
    FROM match_suggestions
    GROUP BY status
    ORDER BY status;
