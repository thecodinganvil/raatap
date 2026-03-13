# Match Suggestion System - Redesign

## Current Problems
1. ❌ Complex trigger chain (profile → ride_request → generate_all_matches → loop → calculate)
2. ❌ ON CONFLICT requires unique constraint (often missing)
3. ❌ Silent failures in PL/pgSQL functions
4. ❌ No logging/debugging
5. ❌ generate_all_matches() runs twice (for templates + requests)

---

## 🎯 Solution 1: Simple Direct Insert (Recommended)

**Skip the complex functions. Just insert directly.**

```sql
-- Simple match generation - Run this directly
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
    -- Calculate scores inline
    GREATEST(0, 1.0 - (ST_Distance(
        r.pickup_point::geography,
        ST_MakeLine(t.from_point::geometry, t.to_point::geometry)::geography
    )::NUMERIC / t.max_detour_meters::NUMERIC)) as route_match_score,
    0.7 as schedule_match_score, -- Simplified
    0.75 as overall_score,
    100 as detour_distance_meters,
    100 as pickup_distance_meters,
    'pending' as status
FROM ride_templates t
CROSS JOIN ride_requests r
WHERE t.status = 'active'
  AND r.status = 'active'
  AND t.host_id != r.rider_id
  -- Add more filters as needed
ON CONFLICT (ride_template_id, ride_request_id) 
DO UPDATE SET
    overall_score = EXCLUDED.overall_score,
    updated_at = now();
```

**Pros:** Simple, debuggable, no function dependencies
**Cons:** Less modular

---

## 🎯 Solution 2: Materialized View (Best for Performance)

**Pre-calculate matches, refresh on demand.**

```sql
-- Create materialized view
CREATE MATERIALIZED VIEW match_suggestions_mv AS
SELECT 
    t.id as template_id,
    r.id as request_id,
    calculate_route_match_score(t.id, r.id) as match_data
FROM ride_templates t
CROSS JOIN ride_requests r
WHERE t.status = 'active'
  AND r.status = 'active'
  AND t.host_id != r.rider_id;

-- Create index
CREATE INDEX idx_match_mv_template ON match_suggestions_mv(template_id);
CREATE INDEX idx_match_mv_request ON match_suggestions_mv(request_id);

-- Refresh when needed
REFRESH MATERIALIZED VIEW CONCURRENTLY match_suggestions_mv;

-- Query matches
SELECT * FROM match_suggestions_mv 
WHERE (match_data->>'compatible')::boolean = true;
```

**Pros:** Fast queries, pre-computed, easy to debug
**Cons:** Need to refresh manually

---

## 🎯 Solution 3: Event-Driven with Queues (Production Ready)

**Use Supabase Edge Functions + Queues.**

```
┌─────────────┐
│ User Saves  │
│ Profile     │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Supabase    │
│ Webhook     │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Edge        │
│ Function    │
│ (Queue)     │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Background  │
│ Worker      │
│ (Matching)  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Insert into │
│ match_      │
│ suggestions │
└─────────────┘
```

**Implementation:**
```typescript
// supabase/functions/generate-matches/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  const { template_id, request_id } = await req.json()
  
  // Call Supabase RPC
  const { data, error } = await supabase.rpc(
    'calculate_route_match_score',
    { template_id, request_id }
  )
  
  if (data.compatible) {
    await supabase.from('match_suggestions').insert({
      ride_template_id: template_id,
      ride_request_id: request_id,
      overall_score: data.overall_score,
      status: 'pending'
    })
  }
  
  return new Response(JSON.stringify({ success: true }))
})
```

**Pros:** Scalable, retry logic, observable
**Cons:** More infrastructure

---

## 🎯 Solution 4: pg_cron Scheduled Job (Set & Forget)

**Run matching every N minutes automatically.**

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule matching every 5 minutes
SELECT cron.schedule(
    'generate-matches-every-5-mins',
    '*/5 * * * *',  -- Every 5 minutes
    $$
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
        t.id, r.id,
        (calculate_route_match_score(t.id, r.id)->>'route_match_score')::NUMERIC,
        (calculate_route_match_score(t.id, r.id)->>'schedule_match_score')::NUMERIC,
        (calculate_route_match_score(t.id, r.id)->>'overall_score')::NUMERIC,
        (calculate_route_match_score(t.id, r.id)->>'pickup_distance_meters')::INTEGER,
        (calculate_route_match_score(t.id, r.id)->>'pickup_distance_meters')::INTEGER,
        'pending'
    FROM ride_templates t
    CROSS JOIN ride_requests r
    WHERE t.status = 'active'
      AND r.status = 'active'
      AND t.host_id != r.rider_id
      AND NOT EXISTS (
          SELECT 1 FROM match_suggestions ms
          WHERE ms.ride_template_id = t.id
          AND ms.ride_request_id = r.id
      )
    ON CONFLICT (ride_template_id, ride_request_id) 
    DO UPDATE SET
        overall_score = EXCLUDED.overall_score,
        updated_at = now();
    $$
);

-- View scheduled jobs
SELECT * FROM cron.job;
```

**Pros:** Automatic, no code changes
**Cons:** Not real-time, requires pg_cron

---

## 🎯 Solution 5: Database Trigger on Both Tables (Immediate)

**Trigger fires on ride_templates AND ride_requests inserts.**

```sql
-- Trigger function for ride_templates
CREATE OR REPLACE FUNCTION trigger_generate_matches_on_template()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert matches for all existing ride_requests
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
        NEW.id,
        r.id,
        (calculate_route_match_score(NEW.id, r.id)->>'route_match_score')::NUMERIC,
        (calculate_route_match_score(NEW.id, r.id)->>'schedule_match_score')::NUMERIC,
        (calculate_route_match_score(NEW.id, r.id)->>'overall_score')::NUMERIC,
        (calculate_route_match_score(NEW.id, r.id)->>'pickup_distance_meters')::INTEGER,
        (calculate_route_match_score(NEW.id, r.id)->>'pickup_distance_meters')::INTEGER,
        'pending'
    FROM ride_requests r
    WHERE r.status = 'active'
      AND r.rider_id != NEW.host_id
    ON CONFLICT (ride_template_id, ride_request_id) 
    DO UPDATE SET
        overall_score = EXCLUDED.overall_score,
        updated_at = now();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER on_template_created
AFTER INSERT ON ride_templates
FOR EACH ROW
EXECUTE FUNCTION trigger_generate_matches_on_template();

-- Same for ride_requests (reverse direction)
CREATE TRIGGER on_request_created
AFTER INSERT ON ride_requests
FOR EACH ROW
EXECUTE FUNCTION trigger_generate_matches_on_request();
```

**Pros:** Immediate, automatic
**Cons:** Still uses triggers (like current system)

---

## 🏆 Recommended Approach: **Solution 1 + Solution 4**

### **Immediate Fix (Solution 1):**
Run this SQL to generate matches NOW:

```sql
-- Direct insert - bypasses all functions
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
    t.id,
    r.id,
    (calculate_route_match_score(t.id, r.id)->>'route_match_score')::NUMERIC,
    (calculate_route_match_score(t.id, r.id)->>'schedule_match_score')::NUMERIC,
    (calculate_route_match_score(t.id, r.id)->>'overall_score')::NUMERIC,
    (calculate_route_match_score(t.id, r.id)->>'pickup_distance_meters')::INTEGER,
    (calculate_route_match_score(t.id, r.id)->>'pickup_distance_meters')::INTEGER,
    'pending'
FROM ride_templates t
CROSS JOIN ride_requests r
WHERE t.status = 'active'
  AND r.status = 'active'
  AND t.host_id != r.rider_id
  AND (calculate_route_match_score(t.id, r.id)->>'compatible')::boolean = true
ON CONFLICT (ride_template_id, ride_request_id) 
DO UPDATE SET
    overall_score = EXCLUDED.overall_score,
    updated_at = now();

-- Verify
SELECT COUNT(*) FROM match_suggestions WHERE status = 'pending';
```

### **Long-term Fix (Solution 4):**
Schedule automatic matching every 5 minutes with pg_cron.

---

## Quick Decision Guide

| Need | Solution |
|------|----------|
| Fix it NOW | Solution 1 (Direct INSERT) |
| Set & forget | Solution 4 (pg_cron) |
| Production scale | Solution 3 (Edge Functions) |
| Best performance | Solution 2 (Materialized View) |
| Real-time | Solution 5 (Triggers) |

---

## Run This NOW (Solution 1):

Copy-paste this into Supabase SQL Editor:

```sql
-- Generate all pending matches in one query
WITH compatible_pairs AS (
    SELECT 
        t.id as template_id,
        r.id as request_id,
        calculate_route_match_score(t.id, r.id) as match_data
    FROM ride_templates t
    CROSS JOIN ride_requests r
    WHERE t.status = 'active'
      AND r.status = 'active'
      AND t.host_id != r.rider_id
)
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
    template_id,
    request_id,
    (match_data->>'route_match_score')::NUMERIC,
    (match_data->>'schedule_match_score')::NUMERIC,
    (match_data->>'overall_score')::NUMERIC,
    (match_data->>'pickup_distance_meters')::INTEGER,
    (match_data->>'pickup_distance_meters')::INTEGER,
    'pending'
FROM compatible_pairs
WHERE (match_data->>'compatible')::boolean = true
ON CONFLICT (ride_template_id, ride_request_id) 
DO UPDATE SET
    overall_score = EXCLUDED.overall_score,
    updated_at = now();

-- Show results
SELECT 
    'Generated ' || COUNT(*) || ' match suggestions' as result
FROM match_suggestions 
WHERE status = 'pending';
```
