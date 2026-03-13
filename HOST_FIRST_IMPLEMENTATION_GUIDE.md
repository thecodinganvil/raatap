# Host-First Match Generation - Implementation Guide

## 🚀 Quick Start

### **Step 1: Run the SQL**
1. Go to **Supabase Dashboard** → **SQL Editor**
2. Copy **ALL** content from `database/host_first_match_generation.sql`
3. Paste and **Run**

### **Step 2: Verify Setup**
After running, you should see:
```
✓ Unique constraint added
✓ updated_at column added
✓ Generated X match suggestions
✓ Scheduled job created
```

---

## 📊 Host-First Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    HOST-FIRST MATCH FLOW                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. MATCH GENERATION (Automatic - Every 10 mins)                │
│     ┌──────────────┐                                           │
│     │ pg_cron runs │                                           │
│     │ generate_    │                                           │
│     │ pending_     │                                           │
│     │ matches_auto()│                                          │
│     └──────┬───────┘                                           │
│            │                                                    │
│            ▼                                                    │
│     ┌─────────────────────────────────────────────────────┐   │
│     │ match_suggestions table                             │   │
│     │ status: 'pending'                                   │   │
│     └─────────────────────────────────────────────────────┘   │
│                                                                  │
│  2. HOST VIEW (Shows pending matches)                           │
│     ┌─────────────────────────────────────────────────────┐   │
│     │ Rahul's Dashboard                                   │   │
│     │ "Potential Riders"                                  │   │
│     │ ┌───────────────────────────────────────────────┐   │   │
│     │ │ Priya - 89% Match                            │   │   │
│     │ │ [Accept] [Skip]                              │   │   │
│     │ └───────────────────────────────────────────────┘   │   │
│     └─────────────────────────────────────────────────────┘   │
│            │                                                    │
│            │ Host clicks [Accept]                              │
│            ▼                                                    │
│     ┌─────────────────────────────────────────────────────┐   │
│     │ match_suggestions.status = 'accepted'               │   │
│     │ pod_members.status = 'pending_rider'                │   │
│     └─────────────────────────────────────────────────────┘   │
│                                                                  │
│  3. RIDER VIEW (Shows accepted matches)                         │
│     ┌─────────────────────────────────────────────────────┐   │
│     │ Priya's Dashboard                                   │   │
│     │ "Ride Offers"                                       │   │
│     │ ┌───────────────────────────────────────────────┐   │   │
│     │ │ Rahul is offering a ride                     │   │   │
│     │ │ [Confirm] [Decline]                          │   │   │
│     │ └───────────────────────────────────────────────┘   │   │
│     └─────────────────────────────────────────────────────┘   │
│            │                                                    │
│            │ Rider clicks [Confirm]                            │
│            ▼                                                    │
│     ┌─────────────────────────────────────────────────────┐   │
│     │ match_suggestions.status = 'confirmed'              │   │
│     │ pod_members.status = 'active'                       │   │
│     └─────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔧 API Integration

### **Update Existing API Route**

**File:** `src/app/api/matches/suggestions/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { userId, userRole } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: "Missing userId" },
        { status: 400 }
      );
    }

    let matches;

    if (userRole === 'host') {
      // HOST sees PENDING matches (riders to accept)
      const { data, error } = await supabase.rpc(
        'get_host_match_suggestions',
        { p_host_id: userId }
      );

      if (error) throw error;
      matches = data;

    } else if (userRole === 'rider') {
      // RIDER sees ACCEPTED matches (hosts who accepted)
      const { data, error } = await supabase.rpc(
        'get_rider_match_suggestions',
        { p_rider_id: userId }
      );

      if (error) throw error;
      matches = data;

    } else {
      // Auto-detect role from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('prefer_hosting, prefer_taking_ride')
        .eq('id', userId)
        .single();

      if (profile?.prefer_hosting) {
        const { data, error } = await supabase.rpc(
          'get_host_match_suggestions',
          { p_host_id: userId }
        );
        if (error) throw error;
        matches = data;
      } else {
        const { data, error } = await supabase.rpc(
          'get_rider_match_suggestions',
          { p_rider_id: userId }
        );
        if (error) throw error;
        matches = data;
      }
    }

    return NextResponse.json(matches || []);

  } catch (error) {
    console.error('Error fetching match suggestions:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
```

---

### **Frontend Usage Example**

**File:** `src/app/dashboard/HostView.tsx`

```typescript
// Fetch matches for HOST
const fetchHostMatches = async () => {
  const response = await fetch('/api/matches/suggestions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      userId: user?.id,
      userRole: 'host'
    }),
  });

  const matches = await response.json();
  
  // Display matches
  matches.forEach(match => {
    console.log(`${match.rider_name} - ${match.overall_score * 100}% Match`);
  });
};
```

**File:** `src/app/dashboard/RiderView.tsx`

```typescript
// Fetch matches for RIDER
const fetchRiderMatches = async () => {
  const response = await fetch('/api/matches/suggestions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      userId: user?.id,
      userRole: 'rider'
    }),
  });

  const matches = await response.json();
  
  // Display accepted matches only
  matches.forEach(match => {
    console.log(`${match.host_name} - Ride offered at ${match.departure_time}`);
  });
};
```

---

## 📋 Database Functions Reference

### **1. generate_pending_matches_auto()**
- **Purpose:** Automatically generate new matches
- **Runs:** Every 10 minutes via pg_cron
- **Returns:** Number of matches created
- **Usage:** `SELECT generate_pending_matches_auto();`

### **2. get_host_match_suggestions(p_host_id UUID)**
- **Purpose:** Get pending matches for a host
- **Returns:** Table of rider matches
- **Status Filter:** `status = 'pending'`
- **Usage:** 
```sql
SELECT * FROM get_host_match_suggestions('host-uuid-here');
```

### **3. get_rider_match_suggestions(p_rider_id UUID)**
- **Purpose:** Get accepted matches for a rider
- **Returns:** Table of host matches
- **Status Filter:** `status = 'accepted'`
- **Usage:**
```sql
SELECT * FROM get_rider_match_suggestions('rider-uuid-here');
```

---

## 🧪 Testing the Flow

### **Test Scenario: Rahul (Host) + Priya (Rider)**

```sql
-- 1. Create test data
-- (Assuming profiles already exist)

-- 2. Generate matches manually
SELECT generate_pending_matches_auto();

-- 3. Check matches created
SELECT * FROM match_suggestions WHERE status = 'pending';

-- 4. View from HOST perspective (Rahul)
SELECT * FROM get_host_match_suggestions('rahul-uuid');
-- Should show Priya as pending match

-- 5. Simulate host accepting
SELECT accept_match_suggestion(
  (SELECT id FROM match_suggestions LIMIT 1),
  'rahul-uuid'
);

-- 6. Check status changed
SELECT status FROM match_suggestions;
-- Should be 'accepted'

-- 7. View from RIDER perspective (Priya)
SELECT * FROM get_rider_match_suggestions('priya-uuid');
-- Should now show Rahul's match

-- 8. Simulate rider confirming
SELECT confirm_match_suggestion(
  (SELECT id FROM match_suggestions LIMIT 1),
  'priya-uuid'
);

-- 9. Final status
SELECT status FROM match_suggestions;
-- Should be 'confirmed'
```

---

## 🎯 Match Status Flow

```
┌─────────────┐
│ pending     │ ← Created by match generation
│             │ ← Shown to HOST first
└──────┬──────┘
       │
       │ Host clicks [Accept]
       │ accept_match_suggestion()
       ▼
┌─────────────┐
│ accepted    │ ← Host accepted
│             │ ← Shown to RIDER
└──────┬──────┘
       │
       │ Rider clicks [Confirm]
       │ confirm_match_suggestion()
       ▼
┌─────────────┐
│ confirmed   │ ← Both agreed
│             │ ← Pod member active
└─────────────┘
```

---

## ⚠️ Important Notes

### **1. pg_cron Setup**
Before Phase 2 works, enable pg_cron:
1. Go to **Supabase Dashboard**
2. **Database** → **Extensions**
3. Search for **"pg_cron"**
4. Click **Enable**

### **2. Verify Scheduled Job**
```sql
-- Check if job is scheduled
SELECT * FROM cron.job WHERE jobname = 'raatap-generate-matches-auto';

-- Check job logs
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'raatap-generate-matches-auto')
ORDER BY start_time DESC
LIMIT 10;
```

### **3. Manual Trigger**
If pg_cron isn't working, trigger manually:
```sql
SELECT generate_pending_matches_auto();
```

### **4. Clean Up Old Matches**
```sql
-- Expire old pending matches (older than 7 days)
UPDATE match_suggestions
SET status = 'expired'
WHERE status = 'pending'
AND created_at < now() - interval '7 days';
```

---

## 📊 Dashboard Query Examples

### **Host Dashboard Stats**
```sql
SELECT 
  COUNT(*) as total_pending_matches,
  COUNT(DISTINCT ride_template_id) as templates_with_matches,
  AVG(overall_score) as average_match_score
FROM match_suggestions
WHERE status = 'pending';
```

### **Rider Dashboard Stats**
```sql
SELECT 
  COUNT(*) as accepted_offers,
  AVG(overall_score) as average_score,
  MAX(host_action_at) as last_offer_time
FROM match_suggestions ms
JOIN ride_requests rr ON ms.ride_request_id = rr.id
WHERE rr.rider_id = 'priya-uuid'
AND ms.status = 'accepted';
```

---

## 🚀 Deployment Checklist

- [ ] Run `host_first_match_generation.sql` in Supabase
- [ ] Enable pg_cron extension
- [ ] Verify scheduled job created
- [ ] Update API route `/api/matches/suggestions`
- [ ] Update Host Dashboard to show pending matches
- [ ] Update Rider Dashboard to show accepted matches
- [ ] Test complete flow with 2 test users
- [ ] Verify notifications work (optional)
- [ ] Monitor pg_cron logs

---

## ✅ Success Criteria

After deployment:
1. ✓ Match suggestions auto-generated every 10 minutes
2. ✓ Hosts see pending matches in their dashboard
3. ✓ Host can accept/reject matches
4. ✓ Riders see accepted matches in their dashboard
5. ✓ Rider can confirm/decline matches
6. ✓ Confirmed matches create active pod members

---

**Questions? Run the verification queries in the SQL file!**
