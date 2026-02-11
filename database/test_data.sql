-- Instructions:
-- 1. Create two new users in your Supabase Auth (or use existing ones).
-- 2. Find their UUIDs in method 1: Dashboard -> Database -> SQL Editor, run "SELECT id, email FROM auth.users;"
--    Or method 2: Dashboard -> Authentication -> Users.
-- 3. Replace 'HOST_USER_ID_HERE' and 'RIDER_USER_ID_HERE' with those actual UUIDs.

-- Host ID: 15fa116f-ae62-4c99-b3e6-f39a62c0a742
-- Rider ID: d0fa728d-cec7-43b0-b82d-4eac6d298643

-- =================================================================
-- 1. Create Profiles
-- =================================================================

-- Create Host Profile
INSERT INTO public.profiles (
  id, 
  email, 
  prefer_hosting, 
  from_location, from_lat, from_lng, 
  to_location, to_lat, to_lng, 
  leave_home_time, 
  days_of_commute
) VALUES (
  '15fa116f-ae62-4c99-b3e6-f39a62c0a742', 
  'host@example.com', 
  true, 
  'Connaught Place, New Delhi', 28.6304, 77.2177, 
  'Gurugram Cyber City', 28.4950, 77.0895, 
  '09:00:00', 
  ARRAY['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
) ON CONFLICT (id) DO UPDATE 
SET prefer_hosting = true, 
    from_lat = EXCLUDED.from_lat, from_lng = EXCLUDED.from_lng,
    to_lat = EXCLUDED.to_lat, to_lng = EXCLUDED.to_lng;

-- Create Rider Profile
INSERT INTO public.profiles (
  id, 
  email, 
  prefer_taking_ride, 
  from_location, from_lat, from_lng, 
  to_location, to_lat, to_lng, 
  leave_home_time, 
  days_of_commute
) VALUES (
  'd0fa728d-cec7-43b0-b82d-4eac6d298643', 
  'rider@example.com', 
  true, 
  'India Gate, New Delhi', 28.6129, 77.2295, -- Near CP
  'Udyog Vihar, Gurugram', 28.5020, 77.0850, -- Near Cyber City
  '09:00:00', 
  ARRAY['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
) ON CONFLICT (id) DO UPDATE 
SET prefer_taking_ride = true,
    from_lat = EXCLUDED.from_lat, from_lng = EXCLUDED.from_lng,
    to_lat = EXCLUDED.to_lat, to_lng = EXCLUDED.to_lng;

-- =================================================================
-- 2. Create Ride Template (Host)
-- =================================================================

-- This calls the PL/pgSQL function to create a ride template
SELECT create_ride_template_from_profile(
    '15fa116f-ae62-4c99-b3e6-f39a62c0a742', -- Host UUID
    'Sedan',          -- Vehicle Type
    3,                -- Seats
    5000,             -- Max Detour (meters)
    '18:00:00'        -- Return Time
);

-- Check if template was created
SELECT * FROM ride_templates WHERE host_id = '15fa116f-ae62-4c99-b3e6-f39a62c0a742';

-- =================================================================
-- 3. Create Ride Request (Rider)
-- =================================================================

-- This calls the PL/pgSQL function to create a ride request
SELECT create_ride_request_from_profile(
    'd0fa728d-cec7-43b0-b82d-4eac6d298643', -- Rider UUID
    '09:15:00',       -- Preferred Arrival Time
    30,               -- Flexibility (mins)
    'any',            -- Vehicle Preference
    'both'            -- Gender Preference
);

-- Check if request was created
SELECT * FROM ride_requests WHERE rider_id = 'd0fa728d-cec7-43b0-b82d-4eac6d298643';

-- =================================================================
-- 4. Verify Match
-- =================================================================

-- The match should have been generated automatically by the trigger/function
SELECT * FROM match_suggestions;
