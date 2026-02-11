# Supabase Implementation Guide for Ride Matching System

This guide explains how to deploy the database functions found in `database/functions` to your Supabase project.

## 1. Enable Required Extensions

The matching logic relies on PostGIS for geospatial calculations. You also need `pg_cron` for scheduling cleanup tasks.

Run this SQL in your Supabase SQL Editor:

```sql
-- Enable PostGIS for geospatial queries (ST_Distance, ST_MakeLine, etc.)
CREATE EXTENSION IF NOT EXISTS postgis;

-- Enable pg_cron for scheduled tasks
CREATE EXTENSION IF NOT EXISTS pg_cron;
```

## 2. Create Database Schema

The functions assume the existence of several tables. Below is the inferred schema based on the function definitions. Run this to create the necessary tables.

```sql
-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    prefer_hosting BOOLEAN DEFAULT false,
    prefer_taking_ride BOOLEAN DEFAULT false,
    from_location TEXT,
    from_lat DOUBLE PRECISION,
    from_lng DOUBLE PRECISION,
    to_location TEXT,
    to_lat DOUBLE PRECISION,
    to_lng DOUBLE PRECISION,
    leave_home_time TIME,
    days_of_commute TEXT[], -- e.g. ['Mon', 'Tue']
    comfortable_with TEXT DEFAULT 'both', -- 'male', 'female', 'both'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ride Templates (Hosts)
CREATE TABLE IF NOT EXISTS public.ride_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    host_id UUID REFERENCES public.profiles(id) NOT NULL,
    from_location TEXT NOT NULL,
    from_lat DOUBLE PRECISION NOT NULL,
    from_lng DOUBLE PRECISION NOT NULL,
    from_point GEOMETRY(POINT, 4326), 
    to_location TEXT NOT NULL,
    to_lat DOUBLE PRECISION NOT NULL,
    to_lng DOUBLE PRECISION NOT NULL,
    to_point GEOMETRY(POINT, 4326),
    departure_time TIME NOT NULL,
    return_time TIME,
    days_available TEXT[],
    vehicle_type TEXT NOT NULL,
    available_seats INTEGER DEFAULT 1,
    seats_taken INTEGER DEFAULT 0,
    max_detour_meters INTEGER DEFAULT 2000,
    gender_preference TEXT DEFAULT 'both',
    status TEXT DEFAULT 'active', -- 'active', 'inactive'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ride_templates_geo_idx ON ride_templates USING GIST (from_point);

-- Ride Requests (Riders)
CREATE TABLE IF NOT EXISTS public.ride_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rider_id UUID REFERENCES public.profiles(id) NOT NULL,
    pickup_location TEXT NOT NULL,
    pickup_lat DOUBLE PRECISION NOT NULL,
    pickup_lng DOUBLE PRECISION NOT NULL,
    pickup_point GEOMETRY(POINT, 4326),
    destination_location TEXT NOT NULL,
    destination_lat DOUBLE PRECISION NOT NULL,
    destination_lng DOUBLE PRECISION NOT NULL,
    destination_point GEOMETRY(POINT, 4326),
    preferred_arrival_time TIME NOT NULL,
    time_flexibility_mins INTEGER DEFAULT 15,
    days_needed TEXT[],
    vehicle_preference TEXT DEFAULT 'any',
    gender_preference TEXT DEFAULT 'both',
    status TEXT DEFAULT 'active', -- 'active', 'matched', 'completed', 'cancelled'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ride_requests_geo_idx ON ride_requests USING GIST (pickup_point);

-- Match Suggestions
CREATE TABLE IF NOT EXISTS public.match_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ride_template_id UUID REFERENCES public.ride_templates(id),
    ride_request_id UUID REFERENCES public.ride_requests(id),
    route_match_score NUMERIC,
    schedule_match_score NUMERIC,
    overall_score NUMERIC,
    detour_distance_meters INTEGER,
    pickup_distance_meters INTEGER,
    status TEXT DEFAULT 'pending', -- 'pending', 'shown', 'accepted', 'skipped', 'expired', 'rejected'
    host_action_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours') -- Example expiration
);

-- Pods (Formed Carpools)
CREATE TABLE IF NOT EXISTS public.pods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ride_template_id UUID REFERENCES public.ride_templates(id),
    host_id UUID REFERENCES public.profiles(id),
    name TEXT,
    days_active TEXT[],
    departure_time TIME,
    origin_location TEXT,
    destination_location TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pod Members
CREATE TABLE IF NOT EXISTS public.pod_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pod_id UUID REFERENCES public.pods(id),
    rider_id UUID REFERENCES public.profiles(id),
    ride_request_id UUID REFERENCES public.ride_requests(id),
    pickup_location TEXT,
    pickup_lat DOUBLE PRECISION,
    pickup_lng DOUBLE PRECISION,
    pickup_point GEOMETRY(POINT, 4326),
    status TEXT DEFAULT 'pending_rider', -- 'pending_rider', 'active', 'left', 'removed'
    host_approved_at TIMESTAMP WITH TIME ZONE,
    rider_confirmed_at TIMESTAMP WITH TIME ZONE,
    joined_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 3. Deploy Functions

You can deploy the functions by running the SQL scripts in the following order in your Supabase SQL Editor:

1.  `database/functions/01_create_rides.sql`
2.  `database/functions/02_matching.sql`
3.  `database/functions/03_match_management.sql`
4.  `database/functions/04_seat_management.sql`

*Note: Since the functions use `SECURITY DEFINER`, they will run with the privileges of the creator (usually the postgres superuser or the role that ran the script). This bypasses Row Level Security (RLS) on the tables within the function. Ensure your RLS policies on the tables themselves are set up correctly for direct table access if you allow it.*

## 4. Schedule Cleanup Task

The function `cleanup_expired_matches()` in `04_seat_management.sql` handles expiring old matches and releasing seat locks. You should schedule this to run periodically (e.g., every 15 minutes) using `pg_cron`.

Run this SQL to schedule the job:

```sql
-- Schedule cleanup to run every 15 minutes
SELECT cron.schedule(
    'cleanup-matches', -- unique job name
    '*/15 * * * *',    -- cron schedule (every 15 mins)
    $$SELECT cleanup_expired_matches()$$ -- SQL command
);

-- To check scheduled jobs:
-- SELECT * FROM cron.job;

-- To unschedule:
-- SELECT cron.unschedule('cleanup-matches');
```

## 5. Usage in Client App

You can call these functions from your client application using the Supabase Client SDK (e.g., `supabase.rpc`).

**Example: Creating a Ride Request (Rider)**

```javascript
const { data, error } = await supabase
  .rpc('create_ride_request_from_profile', {
    user_id: supabase.auth.user().id,
    p_preferred_arrival_time: '09:00:00',
    p_time_flexibility_mins: 15,
    p_vehicle_preference: 'any',
    p_gender_preference: 'both'
  });

if (error) console.error(error);
else console.log('Ride Request Created:', data);
```

**Example: Getting User Rides**

```javascript
const { data, error } = await supabase
  .rpc('get_user_rides', {
    user_id: supabase.auth.user().id
  });
```
