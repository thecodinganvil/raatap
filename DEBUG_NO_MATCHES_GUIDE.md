# Debug: No Match Suggestions Generated

## Quick Diagnosis

Run this in **Supabase SQL Editor**:

```sql
-- 1. Check data exists
SELECT 
    (SELECT COUNT(*) FROM ride_requests WHERE status = 'active') as active_requests,
    (SELECT COUNT(*) FROM ride_templates WHERE status = 'active') as active_templates,
    (SELECT COUNT(*) FROM match_suggestions WHERE status = 'pending') as pending_matches;

-- 2. Test matching function
SELECT calculate_route_match_score(
    (SELECT id FROM ride_templates LIMIT 1),
    (SELECT id FROM ride_requests LIMIT 1)
) as match_result;
```

---

## Common Reasons for No Matches

### 1️⃣ **No Active Hosts (Rider's perspective)**
```sql
SELECT * FROM ride_templates WHERE status = 'active';
```
**Fix:** You need at least one host with an active ride template on a similar route.

---

### 2️⃣ **No Active Riders (Host's perspective)**
```sql
SELECT * FROM ride_requests WHERE status = 'active';
```
**Fix:** You need riders requesting rides on your route.

---

### 3️⃣ **Route Mismatch**
The rider's pickup point is too far from the host's route.

```sql
-- Check max_detour_meters setting
SELECT id, from_location, to_location, max_detour_meters 
FROM ride_templates WHERE status = 'active';
```
**Default:** `max_detour_meters = 5000` (5km)

**Fix:** 
- Rider needs to be closer to host's route
- Or increase `max_detour_meters` in the trigger

---

### 4️⃣ **Days Don't Overlap**
Host and rider don't share any common commute days.

```sql
-- Check days_of_commute
SELECT 
    (SELECT days_of_commute FROM profiles WHERE id = (SELECT host_id FROM ride_templates LIMIT 1)) as host_days,
    (SELECT days_of_commute FROM profiles WHERE id = (SELECT rider_id FROM ride_requests LIMIT 1)) as rider_days;
```

**Fix:** Ensure overlapping days in `days_of_commute` array (e.g., both have "Monday")

---

### 5️⃣ **Time Incompatibility**
Departure time doesn't match rider's preferred arrival.

```sql
-- Check times
SELECT 
    (SELECT return_time FROM ride_templates LIMIT 1) as host_departure,
    (SELECT preferred_arrival_time FROM ride_requests LIMIT 1) as rider_arrival;
```

**Default flexibility:** 30 minutes

**Fix:** Times need to be within `time_flexibility_mins` window

---

### 6️⃣ **Gender/Vehicle Mismatch**
```sql
-- Check preferences
SELECT 
    gender_preference, vehicle_type FROM ride_templates LIMIT 1;
SELECT 
    gender_preference, vehicle_preference FROM ride_requests LIMIT 1;
```

**Fix:** Ensure compatible preferences

---

### 7️⃣ **Trigger Not Working**
```sql
-- Check if trigger exists
SELECT tgname, tgenabled 
FROM pg_trigger 
WHERE tgname = 'on_profile_update_create_ride';
```

**Fix:** Deploy the trigger from `database/functions/05_auto_create_triggers.sql`

---

### 8️⃣ **Duplicate Key Error**
```sql
-- Check constraint
SELECT conname FROM pg_constraint 
WHERE conname = 'match_suggestions_ride_pair_key';
```

**Fix:** Run `database/fix_duplicate_matches.sql`

---

### 9️⃣ **Function Not Called**
The trigger creates `ride_request` but doesn't call match generation.

**Fix:** Deploy updated trigger with `PERFORM generate_all_matches();`

---

## Manual Test

Force generate matches:

```sql
SELECT generate_all_matches();

-- Check results
SELECT * FROM match_suggestions 
WHERE status = 'pending'
ORDER BY created_at DESC;
```

---

## Expected Flow

```
1. User saves profile (prefer_taking_ride = true)
   ↓
2. Trigger fires: on_profile_update_create_ride
   ↓
3. Creates ride_request via create_ride_request_from_profile()
   ↓
4. Calls generate_all_matches()
   ↓
5. Loops through all active ride_templates
   ↓
6. For each template, calls calculate_route_match_score()
   ↓
7. If compatible (route + schedule + preferences)
   ↓
8. Creates match_suggestions record
   ↓
9. Dashboard fetches suggestions via /api/matches/suggestions
```

---

## Quick Fix Checklist

- [ ] Run `database/fix_duplicate_matches.sql` (add unique constraint)
- [ ] Deploy updated `deploy-all-functions.sql`
- [ ] Verify trigger exists: `SELECT * FROM pg_trigger WHERE tgname = 'on_profile_update_create_ride';`
- [ ] Check active ride_requests: `SELECT * FROM ride_requests WHERE status = 'active';`
- [ ] Check active ride_templates: `SELECT * FROM ride_templates WHERE status = 'active';`
- [ ] Manually run: `SELECT generate_all_matches();`
- [ ] Check results: `SELECT * FROM match_suggestions WHERE status = 'pending';`
