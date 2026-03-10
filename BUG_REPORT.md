# 🐛 Raatap Bug Report - Comprehensive Review

**Date:** March 11, 2026  
**Total Issues Found:** 15

---

## 🔴 Critical Issues (Fix Immediately)

### 1. **Field Name Mismatch: `dropoff_location` vs `destination_location`**

**Severity:** 🔴 Critical  
**Files:** `DashboardContent.tsx:966`, `DashboardView.tsx:215,219`

**Issue:**
```typescript
// ❌ WRONG - Field doesn't exist
{member.ride_requests?.dropoff_location || "N/A"}

// ✅ CORRECT
{member.ride_requests?.destination_location || "N/A"}
```

**Impact:** Dropoff locations always show "N/A"  
**Fix:** Replace all `dropoff_location` with `destination_location`

---

### 2. **Hardcoded Vehicle Type in Database Trigger**

**Severity:** 🔴 Critical  
**File:** `database/functions/05_auto_create_triggers.sql:23-27`

**Issue:**
```sql
-- ❌ HARDCODED - Ignores user's actual vehicle preference
PERFORM create_ride_template_from_profile(
    NEW.id,
    '4_wheeler',  -- Always 4-wheeler!
    3,            -- Always 3 seats!
    5000,
    '18:00:00'
);
```

**Impact:** Users selecting "2_wheeler" get wrong vehicle type and seat count  
**Fix:** Use `COALESCE(NEW.vehicle_type, '4_wheeler')` and dynamic seat calculation

---

### 3. **Queue Limit Uses First Request's Vehicle Preference**

**Severity:** 🔴 Critical  
**Files:** `backend/src/services/matching.ts:424`, `backend/src/server.ts:195`

**Issue:**
```typescript
// ❌ Only uses first request's preference
const queueLimit = requests[0].vehicle_preference === '2_wheeler' ? 1 : 3;
```

**Impact:** Users with multiple requests get wrong queue limits  
**Fix:** Calculate queue limit per ride request, not globally

---

### 4. **Race Condition in Seat Locking**

**Severity:** 🔴 Critical  
**Files:** `database/functions/03_match_management.sql`, `08_enforce_capacity.sql`

**Issue:** Multiple hosts can accept same rider simultaneously before `seats_taken` updates

**Impact:** Overbooking - more riders than seats  
**Fix:** Add `FOR UPDATE` row-level locking in database queries

---

## 🟠 High Priority Issues

### 5. **Database Function Defaults to 1 Seat**

**Severity:** 🟠 High  
**File:** `database/functions/01_create_rides.sql:6`

**Issue:**
```sql
-- ❌ Defaults to 1 even if vehicle is 4-wheeler
p_available_seats INTEGER DEFAULT 1,
```

**Impact:** 4-wheeler hosts may get only 1 seat if parameter not passed  
**Fix:** Auto-calculate seats based on vehicle_type in function

---

### 6. **Division by Zero in Seat Progress Bar**

**Severity:** 🟠 High  
**Files:** `DashboardContent.tsx:921`, `DashboardView.tsx:123`

**Issue:**
```typescript
// ❌ No zero check
width: `${(pod.ride_templates.seats_taken / pod.ride_templates.available_seats) * 100}%`
```

**Impact:** NaN rendering if `available_seats` is 0  
**Fix:** Add zero check: `available_seats > 0 ? ... : 0`

---

### 7. **Duplicate Code: Backend Service vs Server**

**Severity:** 🟠 High  
**Files:** `backend/src/services/matching.ts:356-498`, `backend/src/server.ts:141-221`

**Issue:** `/api/matches/suggestions` logic duplicated in both files  
**Impact:** Maintenance nightmare, inconsistent bug fixes  
**Fix:** Server should call service layer, not duplicate logic

---

### 8. **Missing Database Columns: `skipped_by`, `skipped_at`**

**Severity:** 🟠 High  
**File:** `backend/src/services/matching.ts:204-208`

**Issue:**
```typescript
skipped_by: userRole,
skipped_at: new Date().toISOString()
```
Columns don't exist in schema!

**Impact:** Silent failure of skip operation  
**Fix:** Add columns via migration or remove from update

---

### 9. **OTP API Missing Rate Limiting**

**Severity:** 🟠 High  
**File:** `src/app/api/otp/send/route.ts`

**Issue:** No rate limiting on OTP requests  
**Impact:** Email spam, database bloat, DoS vector  
**Fix:** Add 60-second cooldown between OTP requests

---

### 10. **Missing Error Handling in Dashboard Fetch**

**Severity:** 🟠 High  
**File:** `src/app/dashboard/DashboardContent.tsx:259-295`

**Issue:**
```typescript
} catch (error) {
  console.error("Error fetching suggestions:", error);
  // ❌ No user notification!
}
```

**Impact:** Silent failures, users don't know matching failed  
**Fix:** Add user notification on error

---

## 🟡 Medium Priority Issues

### 11. **Inconsistent Gender Preference Logic**

**Severity:** 🟡 Medium  
**File:** `database/functions/02_matching.sql:43-52`

**Issue:** Redundant conditions in gender compatibility check  
**Fix:** Simplify logic

---

### 12. **Admin API Field Name Inconsistency**

**Severity:** 🟡 Medium  
**File:** `src/app/api/admin/pods/route.ts:97`

**Issue:** Mixes `ride_templates.to_location` and `pods.destination_location`  
**Fix:** Standardize field naming

---

### 13. **Hardcoded Detour Distance (2km)**

**Severity:** 🟡 Medium  
**Files:** Multiple

**Issue:** `maxDetourMeters: 2000` hardcoded everywhere  
**Impact:** Users can't customize detour preference  
**Fix:** Add user-configurable setting

---

### 14. **Missing Database Indexes**

**Severity:** 🟡 Medium  
**File:** `schemas.sql`

**Issue:** No index on `match_suggestions.status`  
**Impact:** Slow queries as data grows  
**Fix:** Add indexes on frequently queried columns

---

### 15. **Unused Supabase Import**

**Severity:** 🟡 Medium  
**File:** `src/app/dashboard/DashboardContent.tsx:6`

**Issue:** Potential memory leak from unsubscribed listeners  
**Fix:** Ensure all subscriptions cleaned up

---

## 📊 Summary by Severity

| Severity | Count | Priority |
|----------|-------|----------|
| 🔴 Critical | 4 | Fix NOW |
| 🟠 High | 6 | Fix this sprint |
| 🟡 Medium | 5 | Fix soon |
| **Total** | **15** | |

---

## 🎯 Recommended Fix Order

1. **Field name mismatch** (5 min fix, immediate user impact)
2. **Hardcoded vehicle in trigger** (prevents 2-wheeler usage)
3. **Queue limit bug** (affects matching quality)
4. **Race condition** (prevents overbooking)
5. **Database function defaults** (seat capacity issues)
6. **Division by zero** (UI crash prevention)
7. **Duplicate code** (maintenance)
8. **Missing columns** (data integrity)
9. **OTP rate limiting** (security)
10. **Error handling** (UX improvement)

---

## 📝 Next Steps

1. Create GitHub issues for each bug
2. Prioritize critical fixes
3. Add regression tests
4. Deploy fixes incrementally
5. Monitor for similar patterns

---

**Let me know which bugs you'd like me to fix first!** 🚀
