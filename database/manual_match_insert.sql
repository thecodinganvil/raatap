-- =====================================================
-- MANUAL MATCH INSERT - Force Create Match Suggestion
-- =====================================================
-- Use this when calculate_route_match_score returns compatible=true
-- but no match_suggestions record exists
-- =====================================================

-- STEP 1: Get your template and request IDs
SELECT 
    'TEMPLATE IDs (Host)' as info,
    id,
    from_location || ' → ' || to_location as route,
    host_id
FROM ride_templates 
WHERE status = 'active';

SELECT 
    'REQUEST IDs (Rider)' as info,
    id,
    pickup_location || ' → ' || destination_location as route,
    rider_id
FROM ride_requests 
WHERE status = 'active';

-- STEP 2: MANUAL INSERT - Replace IDs below
-- =====================================================
-- COPY FROM HERE - Replace the IDs with your actual IDs
-- =====================================================

INSERT INTO match_suggestions (
    ride_template_id,   -- ← Your template ID from STEP 1
    ride_request_id,    -- ← Your request ID from STEP 1
    route_match_score,
    schedule_match_score,
    overall_score,
    detour_distance_meters,
    pickup_distance_meters,
    status
)
SELECT 
    'YOUR_TEMPLATE_ID_HERE',    -- ← PASTE TEMPLATE ID HERE
    'YOUR_REQUEST_ID_HERE',     -- ← PASTE REQUEST ID HERE
    (result->>'route_match_score')::NUMERIC,
    (result->>'schedule_match_score')::NUMERIC,
    (result->>'overall_score')::NUMERIC,
    (result->>'pickup_distance_meters')::INTEGER,
    (result->>'pickup_distance_meters')::INTEGER,
    'pending'  -- Host-first: starts as pending
FROM (
    SELECT calculate_route_match_score(
        'YOUR_TEMPLATE_ID_HERE',   -- ← PASTE TEMPLATE ID HERE (same as above)
        'YOUR_REQUEST_ID_HERE'     -- ← PASTE REQUEST ID HERE (same as above)
    ) as result
) sub
ON CONFLICT (ride_template_id, ride_request_id) 
DO UPDATE SET
    overall_score = EXCLUDED.overall_score,
    status = 'pending',
    updated_at = now();

-- =====================================================
-- TO HERE - Replace all 4 occurrences of IDs
-- =====================================================

-- STEP 3: Verify the insert worked
SELECT 
    '✓ Match Created!' as status,
    id,
    ride_template_id,
    ride_request_id,
    overall_score,
    status,
    created_at
FROM match_suggestions
ORDER BY created_at DESC
LIMIT 1;

-- STEP 4: Check what the HOST sees
SELECT 
    'HOST VIEW - Pending Matches' as dashboard,
    ms.id as match_id,
    rp.full_name as rider_name,
    rr.pickup_location as rider_pickup,
    ms.overall_score as match_percentage,
    ms.status
FROM match_suggestions ms
JOIN ride_templates rt ON ms.ride_template_id = rt.id
JOIN ride_requests rr ON ms.ride_request_id = rr.id
JOIN profiles rp ON rr.rider_id = rp.id
WHERE rt.host_id = 'YOUR_TEMPLATE_OWNER_ID_HERE'  -- ← Replace with host's user ID
  AND ms.status = 'pending';

-- STEP 5: Check what the RIDER sees (should be empty until host accepts)
SELECT 
    'RIDER VIEW - Accepted Matches' as dashboard,
    ms.id as match_id,
    hp.full_name as host_name,
    rt.from_location as host_route,
    ms.overall_score as match_percentage,
    ms.status
FROM match_suggestions ms
JOIN ride_requests rr ON ms.ride_request_id = rr.id
JOIN ride_templates rt ON ms.ride_template_id = rt.id
JOIN profiles hp ON rt.host_id = hp.id
WHERE rr.rider_id = 'YOUR_REQUEST_OWNER_ID_HERE'  -- ← Replace with rider's user ID
  AND ms.status = 'accepted';  -- Rider only sees accepted matches


-- =====================================================
-- ALTERNATIVE: Simple Direct Insert
-- =====================================================
-- If ON CONFLICT is causing issues, use this simpler version
-- =====================================================

-- First, check if match already exists
SELECT * FROM match_suggestions 
WHERE ride_template_id = 'YOUR_TEMPLATE_ID_HERE'
  AND ride_request_id = 'YOUR_REQUEST_ID_HERE';

-- If it exists with wrong status, update it
UPDATE match_suggestions 
SET status = 'pending',
    updated_at = now()
WHERE ride_template_id = 'YOUR_TEMPLATE_ID_HERE'
  AND ride_request_id = 'YOUR_REQUEST_ID_HERE';

-- If it doesn't exist, insert it
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
VALUES (
    'YOUR_TEMPLATE_ID_HERE',
    'YOUR_REQUEST_ID_HERE',
    0.85,  -- Default scores
    0.75,
    0.80,
    100,
    100,
    'pending'
);


-- =====================================================
-- TEST THE COMPLETE FLOW
-- =====================================================

-- 1. Create manual match (use actual IDs)
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
    'paste-template-id-here',
    'paste-request-id-here',
    0.89,
    0.85,
    0.87,
    150,
    150,
    'pending'
);

-- 2. Verify it was created
SELECT COUNT(*) as match_count 
FROM match_suggestions 
WHERE status = 'pending';

-- 3. Show the match
SELECT * FROM match_suggestions 
ORDER BY created_at DESC 
LIMIT 5;
