# Supabase Functions Deployment Guide

This guide explains how to deploy and automatically run Supabase database functions, triggers, and match-making logic.

---

## 📋 Overview

Your Raatap app uses Supabase for:
- **Database functions** (RPC calls like `accept_match_suggestion`, `confirm_match_suggestion`)
- **Triggers** (auto-create ride templates/requests when profiles are updated)
- **Match generation** (automatically find matching riders/hosts)

---

## 🚀 Quick Start (3 Options)

### Option 1: Manual Deployment (Fastest for Testing)

1. Open **Supabase Dashboard** → **SQL Editor**
2. Copy contents from each SQL file in order:
   ```
   database/functions/01_create_rides.sql
   database/functions/02_matching.sql
   database/functions/03_match_management.sql
   database/functions/04_seat_management.sql
   database/functions/05_auto_create_triggers.sql
   database/functions/06_idempotent_matching.sql
   database/functions/07_match_workflow_updates.sql
   database/functions/08_enforce_capacity.sql
   database/functions/09_standardize_match_functions.sql
   ```
3. Paste and click **Run** for each file

---

### Option 2: Using npm Scripts (Recommended)

```bash
# 1. Install Supabase CLI (if not already installed)
npm install -g supabase

# 2. Login to Supabase
npm run supabase:login

# 3. Link to your project (replace with your project ID)
npm run supabase:link YOUR_PROJECT_REF

# 4. Deploy all database functions
npm run db:deploy
```

---

### Option 3: Using Node.js Script

```bash
# Make sure .env.local has your Supabase credentials
# NEXT_PUBLIC_SUPABASE_URL=your_url
# SUPABASE_SERVICE_ROLE_KEY=your_key

# Run the deployment script
npm run db:migrate
```

---

## ⚙️ Automatic Execution

### Triggers (Run Automatically on Database Changes)

These triggers are already defined in `05_auto_create_triggers.sql`:

| Trigger Name | Fires On | Action |
|-------------|----------|--------|
| `on_profile_update_create_ride` | INSERT/UPDATE on `profiles` | Auto-creates `ride_templates` for hosts or `ride_requests` for riders |

**How it works:**
```sql
-- When a user sets prefer_hosting = true, this automatically creates a ride template
CREATE TRIGGER on_profile_update_create_ride
AFTER INSERT OR UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION trigger_auto_create_ride_from_profile();
```

**No manual intervention needed** - triggers run automatically once deployed!

---

### Scheduled Functions (pg_cron)

To run match generation automatically (e.g., every hour):

1. Enable **pg_cron** extension in Supabase Dashboard:
   - Go to **Database** → **Extensions**
   - Enable `pg_cron`

2. Create a scheduled job:
```sql
-- Run generate_all_matches() every hour
SELECT cron.schedule(
  'generate-matches-hourly',
  '0 * * * *',  -- Cron syntax: every hour
  $$SELECT generate_all_matches()$$
);

-- Run every day at 6 AM
SELECT cron.schedule(
  'generate-matches-daily',
  '0 6 * * *',
  $$SELECT generate_all_matches()$$
);
```

3. View scheduled jobs:
```sql
SELECT * FROM cron.job;
```

4. Remove a scheduled job:
```sql
SELECT cron.unschedule('generate-matches-hourly');
```

---

## 🔧 Available Database Functions

### Match Management

| Function | Purpose | Called By |
|----------|---------|-----------|
| `accept_match_suggestion(match_id, host_id)` | Host accepts a rider's match request | `/api/matches/accept` |
| `confirm_match_suggestion(match_id, rider_id)` | Rider confirms the match | `/api/matches/confirm` |
| `skip_match_suggestion(match_id, user_id, user_role)` | Host/Rider skips/rejects a match | `/api/matches/skip` |
| `generate_all_matches()` | Creates match suggestions based on routes/schedules | Manual or pg_cron |
| `expire_pending_matches_if_full(template_id)` | Expires pending matches when ride is full | Called internally |

---

## 🧪 Testing Functions Manually

In Supabase SQL Editor:

```sql
-- Test accepting a match
SELECT accept_match_suggestion(
  'MATCH_UUID_HERE',
  'HOST_USER_ID_HERE'
);

-- Test confirming a match
SELECT confirm_match_suggestion(
  'MATCH_UUID_HERE',
  'RIDER_USER_ID_HERE'
);

-- Test skipping a match (host side)
SELECT skip_match_suggestion(
  'MATCH_UUID_HERE',
  'HOST_USER_ID_HERE',
  'host'
);

-- Test rejecting a match (rider side)
SELECT skip_match_suggestion(
  'MATCH_UUID_HERE',
  'RIDER_USER_ID_HERE',
  'rider'
);

-- Generate all matches manually
SELECT generate_all_matches();
```

---

## 📊 Monitoring

### Check Active Pods
```sql
SELECT 
  p.id,
  pr.full_name AS host_name,
  rt.vehicle_type,
  rt.seats_taken,
  rt.available_seats,
  COUNT(pm.id) AS member_count
FROM pods p
JOIN profiles pr ON p.host_id = pr.id
JOIN ride_templates rt ON p.ride_template_id = rt.id
LEFT JOIN pod_members pm ON p.id = pm.pod_id
WHERE p.status = 'active'
GROUP BY p.id, pr.full_name, rt.vehicle_type, rt.seats_taken, rt.available_seats;
```

### Check Match Suggestions
```sql
SELECT 
  ms.id,
  ms.status,
  ms.overall_score,
  pr.full_name AS rider_name,
  hp.full_name AS host_name
FROM match_suggestions ms
JOIN ride_requests rr ON ms.ride_request_id = rr.id
JOIN profiles pr ON rr.rider_id = pr.id
JOIN ride_templates rt ON ms.ride_template_id = rt.id
JOIN profiles hp ON rt.host_id = hp.id
ORDER BY ms.created_at DESC;
```

### Check Pod Members
```sql
SELECT 
  p.id AS pod_id,
  pr.full_name AS host_name,
  pm.status,
  rpr.full_name AS rider_name,
  pm.pickup_location
FROM pod_members pm
JOIN pods p ON pm.pod_id = p.id
JOIN profiles pr ON p.host_id = pr.id
JOIN profiles rpr ON pm.rider_id = rpr.id
ORDER BY p.id, pm.status;
```

---

## 🔐 Security (RLS Policies)

Make sure Row Level Security is enabled:

```sql
-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ride_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE ride_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pods ENABLE ROW LEVEL SECURITY;
ALTER TABLE pod_members ENABLE ROW LEVEL SECURITY;
```

Policies are defined in `database/migrations/08_enable_rls_policies.sql`.

---

## 🐛 Troubleshooting

### Functions Not Found
- **Solution:** Re-run the SQL files in order
- **Check:** Supabase Dashboard → Database → Functions

### Triggers Not Firing
- **Solution:** Verify trigger exists:
  ```sql
  SELECT * FROM pg_trigger WHERE tgname = 'on_profile_update_create_ride';
  ```

### Matches Not Generating
- **Solution:** Run manually:
  ```sql
  SELECT generate_all_matches();
  ```
- **Check:** Ensure `from_lat`, `from_lng`, `to_lat`, `to_lng` are populated in profiles

### Permission Errors
- **Solution:** Use `SECURITY DEFINER` in function definitions (already included)
- **Check:** Service role key is used for deployment

---

## 📞 Support

If you encounter issues:
1. Check Supabase Dashboard → **Logs** → **Database Logs**
2. Review function definitions in `database/functions/`
3. Test functions manually in SQL Editor

---

**Last Updated:** March 9, 2026
