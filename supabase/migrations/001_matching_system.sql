-- ============================================
-- RAATAP: Student Pairing System - Database Setup
-- ============================================
-- Run these migrations in order in Supabase SQL Editor
-- ============================================

-- ============================================
-- STEP 1: Enable PostGIS Extension
-- ============================================
-- This adds geospatial capabilities to PostgreSQL

CREATE EXTENSION IF NOT EXISTS postgis;

-- Verify PostGIS is enabled
SELECT postgis_version();

-- ============================================
-- STEP 2: Add Geography Columns to Profiles
-- ============================================
-- Store coordinates as GEOGRAPHY points for accurate distance calculations

-- Add coordinate columns (for backward compatibility with existing data)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS from_lat DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS from_lng DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS to_lat DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS to_lng DOUBLE PRECISION;

-- Add geography point columns (for PostGIS queries)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS home_location GEOGRAPHY(POINT, 4326),
ADD COLUMN IF NOT EXISTS college_location GEOGRAPHY(POINT, 4326);

-- Create trigger to auto-populate geography from lat/lng
CREATE OR REPLACE FUNCTION update_profile_geography()
RETURNS TRIGGER AS $$
BEGIN
  -- Update home_location when from_lat/from_lng change
  IF NEW.from_lat IS NOT NULL AND NEW.from_lng IS NOT NULL THEN
    NEW.home_location := ST_SetSRID(ST_MakePoint(NEW.from_lng, NEW.from_lat), 4326)::geography;
  END IF;
  
  -- Update college_location when to_lat/to_lng change
  IF NEW.to_lat IS NOT NULL AND NEW.to_lng IS NOT NULL THEN
    NEW.college_location := ST_SetSRID(ST_MakePoint(NEW.to_lng, NEW.to_lat), 4326)::geography;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_update_profile_geography ON profiles;
CREATE TRIGGER trigger_update_profile_geography
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_profile_geography();

-- Create spatial indexes on profiles
CREATE INDEX IF NOT EXISTS idx_profiles_home_location ON profiles USING GIST (home_location);
CREATE INDEX IF NOT EXISTS idx_profiles_college_location ON profiles USING GIST (college_location);

-- ============================================
-- STEP 3: Create Ride Templates Table
-- ============================================
-- Hosts create recurring ride templates (their schedule offerings)

CREATE TABLE IF NOT EXISTS ride_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Route information
  from_location TEXT NOT NULL,
  from_lat DOUBLE PRECISION NOT NULL,
  from_lng DOUBLE PRECISION NOT NULL,
  from_point GEOGRAPHY(POINT, 4326),
  
  to_location TEXT NOT NULL,
  to_lat DOUBLE PRECISION NOT NULL,
  to_lng DOUBLE PRECISION NOT NULL,
  to_point GEOGRAPHY(POINT, 4326),
  
  -- Schedule
  departure_time TIME NOT NULL,
  return_time TIME,
  days_available TEXT[] NOT NULL DEFAULT '{}',
  
  -- Capacity & Vehicle
  vehicle_type TEXT NOT NULL CHECK (vehicle_type IN ('2_wheeler', '4_wheeler')),
  available_seats INTEGER NOT NULL DEFAULT 1 CHECK (available_seats >= 1),
  seats_taken INTEGER NOT NULL DEFAULT 0 CHECK (seats_taken >= 0),
  
  -- Preferences
  gender_preference TEXT DEFAULT 'both' CHECK (gender_preference IN ('male', 'female', 'both')),
  max_detour_meters INTEGER DEFAULT 2000, -- Max detour in meters (default 2km)
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived')),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to auto-populate geography points
CREATE OR REPLACE FUNCTION update_ride_template_geography()
RETURNS TRIGGER AS $$
BEGIN
  NEW.from_point := ST_SetSRID(ST_MakePoint(NEW.from_lng, NEW.from_lat), 4326)::geography;
  NEW.to_point := ST_SetSRID(ST_MakePoint(NEW.to_lng, NEW.to_lat), 4326)::geography;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_ride_template_geography ON ride_templates;
CREATE TRIGGER trigger_update_ride_template_geography
  BEFORE INSERT OR UPDATE ON ride_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_ride_template_geography();

-- Indexes for ride_templates
CREATE INDEX IF NOT EXISTS idx_ride_templates_host ON ride_templates(host_id);
CREATE INDEX IF NOT EXISTS idx_ride_templates_status ON ride_templates(status);
CREATE INDEX IF NOT EXISTS idx_ride_templates_from_point ON ride_templates USING GIST (from_point);
CREATE INDEX IF NOT EXISTS idx_ride_templates_to_point ON ride_templates USING GIST (to_point);

-- ============================================
-- STEP 4: Create Ride Requests Table
-- ============================================
-- Riders create recurring ride requests (their schedule needs)

CREATE TABLE IF NOT EXISTS ride_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Pickup location
  pickup_location TEXT NOT NULL,
  pickup_lat DOUBLE PRECISION NOT NULL,
  pickup_lng DOUBLE PRECISION NOT NULL,
  pickup_point GEOGRAPHY(POINT, 4326),
  
  -- Destination
  destination_location TEXT NOT NULL,
  destination_lat DOUBLE PRECISION NOT NULL,
  destination_lng DOUBLE PRECISION NOT NULL,
  destination_point GEOGRAPHY(POINT, 4326),
  
  -- Schedule
  preferred_arrival_time TIME NOT NULL,
  time_flexibility_mins INTEGER DEFAULT 15 CHECK (time_flexibility_mins >= 0),
  days_needed TEXT[] NOT NULL DEFAULT '{}',
  
  -- Preferences
  vehicle_preference TEXT DEFAULT 'any' CHECK (vehicle_preference IN ('2_wheeler', '4_wheeler', 'any')),
  gender_preference TEXT DEFAULT 'both' CHECK (gender_preference IN ('male', 'female', 'both')),
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'matched', 'archived')),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger for geography points
CREATE OR REPLACE FUNCTION update_ride_request_geography()
RETURNS TRIGGER AS $$
BEGIN
  NEW.pickup_point := ST_SetSRID(ST_MakePoint(NEW.pickup_lng, NEW.pickup_lat), 4326)::geography;
  NEW.destination_point := ST_SetSRID(ST_MakePoint(NEW.destination_lng, NEW.destination_lat), 4326)::geography;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_ride_request_geography ON ride_requests;
CREATE TRIGGER trigger_update_ride_request_geography
  BEFORE INSERT OR UPDATE ON ride_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_ride_request_geography();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ride_requests_rider ON ride_requests(rider_id);
CREATE INDEX IF NOT EXISTS idx_ride_requests_status ON ride_requests(status);
CREATE INDEX IF NOT EXISTS idx_ride_requests_pickup ON ride_requests USING GIST (pickup_point);
CREATE INDEX IF NOT EXISTS idx_ride_requests_destination ON ride_requests USING GIST (destination_point);

-- ============================================
-- STEP 5: Create Pods Table
-- ============================================
-- A Pod is a recurring commute group formed after mutual consent

CREATE TABLE IF NOT EXISTS pods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Core relationships
  ride_template_id UUID NOT NULL REFERENCES ride_templates(id) ON DELETE CASCADE,
  host_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Pod name (auto-generated or custom)
  name TEXT,
  
  -- Schedule (locked at pod creation)
  days_active TEXT[] NOT NULL DEFAULT '{}',
  departure_time TIME NOT NULL,
  
  -- Route (copied from template)
  origin_location TEXT NOT NULL,
  destination_location TEXT NOT NULL,
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'dissolved')),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  dissolved_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pods_host ON pods(host_id);
CREATE INDEX IF NOT EXISTS idx_pods_template ON pods(ride_template_id);
CREATE INDEX IF NOT EXISTS idx_pods_status ON pods(status);

-- ============================================
-- STEP 6: Create Pod Members Table
-- ============================================
-- Members of a pod (riders who have been accepted)

CREATE TABLE IF NOT EXISTS pod_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pod_id UUID NOT NULL REFERENCES pods(id) ON DELETE CASCADE,
  rider_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  ride_request_id UUID REFERENCES ride_requests(id) ON DELETE SET NULL,
  
  -- Pickup details
  pickup_location TEXT NOT NULL,
  pickup_lat DOUBLE PRECISION NOT NULL,
  pickup_lng DOUBLE PRECISION NOT NULL,
  pickup_point GEOGRAPHY(POINT, 4326),
  
  -- Consent tracking (Two-Gate System)
  host_approved_at TIMESTAMPTZ,       -- Gate 1: Host accepts
  rider_confirmed_at TIMESTAMPTZ,     -- Gate 2: Rider confirms
  
  -- Status
  status TEXT DEFAULT 'pending_host' CHECK (status IN (
    'pending_host',     -- Waiting for host to approve
    'pending_rider',    -- Host approved, waiting for rider
    'active',           -- Both approved, member is active
    'removed',          -- Removed from pod
    'left'              -- Rider left voluntarily
  )),
  
  -- Timestamps
  joined_at TIMESTAMPTZ,
  left_at TIMESTAMPTZ,
  
  UNIQUE(pod_id, rider_id)
);

-- Trigger for geography
CREATE OR REPLACE FUNCTION update_pod_member_geography()
RETURNS TRIGGER AS $$
BEGIN
  NEW.pickup_point := ST_SetSRID(ST_MakePoint(NEW.pickup_lng, NEW.pickup_lat), 4326)::geography;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_pod_member_geography ON pod_members;
CREATE TRIGGER trigger_update_pod_member_geography
  BEFORE INSERT OR UPDATE ON pod_members
  FOR EACH ROW
  EXECUTE FUNCTION update_pod_member_geography();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pod_members_pod ON pod_members(pod_id);
CREATE INDEX IF NOT EXISTS idx_pod_members_rider ON pod_members(rider_id);
CREATE INDEX IF NOT EXISTS idx_pod_members_status ON pod_members(status);

-- ============================================
-- STEP 7: Create Match Suggestions Table
-- ============================================
-- System-generated potential matches for review

CREATE TABLE IF NOT EXISTS match_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- The matching pair
  ride_template_id UUID NOT NULL REFERENCES ride_templates(id) ON DELETE CASCADE,
  ride_request_id UUID NOT NULL REFERENCES ride_requests(id) ON DELETE CASCADE,
  
  -- Match quality metrics
  route_match_score DECIMAL(5,2) DEFAULT 0,      -- 0-100: How well routes align
  schedule_match_score DECIMAL(5,2) DEFAULT 0,   -- 0-100: How well times align
  overall_score DECIMAL(5,2) DEFAULT 0,          -- Weighted combined score
  
  -- Route details
  detour_distance_meters INTEGER,                -- Extra distance for host
  detour_time_seconds INTEGER,                   -- Extra time for host
  pickup_distance_meters INTEGER,                -- How far pickup is from direct route
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending',      -- Not yet shown to host
    'shown',        -- Shown to host, awaiting decision
    'accepted',     -- Host accepted
    'skipped',      -- Host skipped
    'expired'       -- Timed out
  )),
  
  -- Host action tracking
  shown_to_host_at TIMESTAMPTZ,
  host_action_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  
  -- Prevent duplicate suggestions
  UNIQUE(ride_template_id, ride_request_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_match_suggestions_template ON match_suggestions(ride_template_id);
CREATE INDEX IF NOT EXISTS idx_match_suggestions_request ON match_suggestions(ride_request_id);
CREATE INDEX IF NOT EXISTS idx_match_suggestions_status ON match_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_match_suggestions_score ON match_suggestions(overall_score DESC);

-- ============================================
-- STEP 8: Row Level Security (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE ride_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE ride_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE pods ENABLE ROW LEVEL SECURITY;
ALTER TABLE pod_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_suggestions ENABLE ROW LEVEL SECURITY;

-- Ride Templates: Users can manage their own templates
CREATE POLICY "Users can view their own templates" ON ride_templates
  FOR SELECT USING (auth.uid() = host_id);

CREATE POLICY "Users can create their own templates" ON ride_templates
  FOR INSERT WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Users can update their own templates" ON ride_templates
  FOR UPDATE USING (auth.uid() = host_id);

CREATE POLICY "Users can delete their own templates" ON ride_templates
  FOR DELETE USING (auth.uid() = host_id);

-- Ride Requests: Users can manage their own requests
CREATE POLICY "Users can view their own requests" ON ride_requests
  FOR SELECT USING (auth.uid() = rider_id);

CREATE POLICY "Users can create their own requests" ON ride_requests
  FOR INSERT WITH CHECK (auth.uid() = rider_id);

CREATE POLICY "Users can update their own requests" ON ride_requests
  FOR UPDATE USING (auth.uid() = rider_id);

CREATE POLICY "Users can delete their own requests" ON ride_requests
  FOR DELETE USING (auth.uid() = rider_id);

-- Pods: Hosts and members can view
CREATE POLICY "Hosts can view their pods" ON pods
  FOR SELECT USING (auth.uid() = host_id);

CREATE POLICY "Members can view pods they belong to" ON pods
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM pod_members 
      WHERE pod_members.pod_id = pods.id 
      AND pod_members.rider_id = auth.uid()
      AND pod_members.status = 'active'
    )
  );

CREATE POLICY "Hosts can manage their pods" ON pods
  FOR ALL USING (auth.uid() = host_id);

-- Pod Members: Relevant parties can view
CREATE POLICY "Users can view their memberships" ON pod_members
  FOR SELECT USING (auth.uid() = rider_id);

CREATE POLICY "Hosts can view their pod members" ON pod_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM pods 
      WHERE pods.id = pod_members.pod_id 
      AND pods.host_id = auth.uid()
    )
  );

CREATE POLICY "Hosts can manage pod members" ON pod_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM pods 
      WHERE pods.id = pod_members.pod_id 
      AND pods.host_id = auth.uid()
    )
  );

CREATE POLICY "Riders can confirm their membership" ON pod_members
  FOR UPDATE USING (auth.uid() = rider_id);

-- Match Suggestions: Hosts can view suggestions for their templates
CREATE POLICY "Hosts can view their suggestions" ON match_suggestions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM ride_templates 
      WHERE ride_templates.id = match_suggestions.ride_template_id 
      AND ride_templates.host_id = auth.uid()
    )
  );

CREATE POLICY "Hosts can respond to suggestions" ON match_suggestions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM ride_templates 
      WHERE ride_templates.id = match_suggestions.ride_template_id 
      AND ride_templates.host_id = auth.uid()
    )
  );

-- ============================================
-- STEP 9: Helper Functions for Matching
-- ============================================

-- Function to find nearby ride templates for a ride request
CREATE OR REPLACE FUNCTION find_compatible_templates(
  p_pickup_lat DOUBLE PRECISION,
  p_pickup_lng DOUBLE PRECISION,
  p_destination_lat DOUBLE PRECISION,
  p_destination_lng DOUBLE PRECISION,
  p_days TEXT[],
  p_arrival_time TIME,
  p_flexibility_mins INTEGER,
  p_vehicle_preference TEXT,
  p_gender_preference TEXT,
  p_rider_gender TEXT,
  p_max_results INTEGER DEFAULT 20
)
RETURNS TABLE (
  template_id UUID,
  host_id UUID,
  host_name TEXT,
  from_location TEXT,
  to_location TEXT,
  departure_time TIME,
  days_available TEXT[],
  vehicle_type TEXT,
  available_seats INTEGER,
  seats_taken INTEGER,
  distance_to_pickup_meters DOUBLE PRECISION,
  distance_to_destination_meters DOUBLE PRECISION,
  days_overlap TEXT[],
  route_score DOUBLE PRECISION,
  schedule_score DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  WITH pickup_point AS (
    SELECT ST_SetSRID(ST_MakePoint(p_pickup_lng, p_pickup_lat), 4326)::geography AS point
  ),
  destination_point AS (
    SELECT ST_SetSRID(ST_MakePoint(p_destination_lng, p_destination_lat), 4326)::geography AS point
  )
  SELECT 
    rt.id AS template_id,
    rt.host_id,
    p.full_name AS host_name,
    rt.from_location,
    rt.to_location,
    rt.departure_time,
    rt.days_available,
    rt.vehicle_type,
    rt.available_seats,
    rt.seats_taken,
    ST_Distance(rt.from_point, (SELECT point FROM pickup_point)) AS distance_to_pickup_meters,
    ST_Distance(rt.to_point, (SELECT point FROM destination_point)) AS distance_to_destination_meters,
    ARRAY(SELECT UNNEST(rt.days_available) INTERSECT SELECT UNNEST(p_days)) AS days_overlap,
    -- Route score: closer to host's route = higher score
    GREATEST(0, 100 - (ST_Distance(rt.from_point, (SELECT point FROM pickup_point)) / 100)) AS route_score,
    -- Schedule score: based on time difference (simplified)
    100.0 AS schedule_score
  FROM ride_templates rt
  JOIN profiles p ON p.id = rt.host_id
  WHERE 
    -- Status check
    rt.status = 'active'
    -- Has available seats
    AND rt.available_seats > rt.seats_taken
    -- Destination is close (within 2km of rider's destination)
    AND ST_DWithin(rt.to_point, (SELECT point FROM destination_point), 2000)
    -- Pickup is within max detour of host's origin
    AND ST_DWithin(rt.from_point, (SELECT point FROM pickup_point), rt.max_detour_meters)
    -- Days overlap
    AND rt.days_available && p_days
    -- Vehicle preference match
    AND (p_vehicle_preference = 'any' OR rt.vehicle_type = p_vehicle_preference)
    -- Gender preference compatibility
    AND (rt.gender_preference = 'both' OR rt.gender_preference = p_rider_gender)
    AND (p_gender_preference = 'both' OR p.gender = p_gender_preference)
    -- Profile is verified
    AND p.email_verified = true
  ORDER BY 
    ST_Distance(rt.from_point, (SELECT point FROM pickup_point)) ASC
  LIMIT p_max_results;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check PostGIS is working
-- SELECT postgis_version();

-- Check tables exist
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- Check geography columns
-- SELECT column_name, udt_name FROM information_schema.columns 
-- WHERE table_name = 'profiles' AND udt_name = 'geography';
