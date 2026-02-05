# Raatap Matching System - Simple Guide

Hey! This guide explains what I built for the student pairing feature. I'll keep it simple and easy to follow.

---

## Quick Answer: Do I Need to Create Tables?

**YES!** Here's how:

1. Go to your Supabase project
2. Click "SQL Editor" on the left
3. Create a new query
4. Copy-paste everything from `supabase/migrations/001_matching_system.sql`
5. Hit Run

That's it! All tables will be created automatically.

---

## What Did I Build?

Think of it like this: I built the "brain" that matches students who need rides with students who can give rides.

### The Big Picture

```
RIDER wants a ride  ──────┐
                          │
                          ▼
                   MATCHING SYSTEM  ──────► Finds compatible hosts
                          │
                          ▼
HOST gets notified  ◄─────┘
        │
        ▼
   Host accepts?
        │
    YES │ NO
        ▼
   Rider confirms?
        │
    YES │
        ▼
   🎉 They're matched!
   Contact details shared
```

---

## Files I Created - Plain English Version

### 1. Database Stuff

**File: `supabase/migrations/001_matching_system.sql`**

This creates 5 tables in your database:

| Table | What it stores |
|-------|----------------|
| `ride_templates` | "I drive from A to B every Mon/Wed at 8am" |
| `ride_requests` | "I need a ride from X to Y by 9am on weekdays" |
| `pods` | Active carpool groups |
| `pod_members` | Who's in each group |
| `match_suggestions` | Pending matches waiting for approval |

---

### 2. The Matching Brain (`src/lib/matching/`)

**`types.ts`** - Just definitions. Like a dictionary of all the data types we use.

**`route-utils.ts`** - Answers questions like:
- How far apart are two locations?
- Is this pickup "on the way" for the host?
- How much extra driving would picking someone up add?

**`schedule-utils.ts`** - Answers questions like:
- Do their schedules overlap? (Both travel on Monday?)
- Will the rider arrive on time?
- How good is the schedule match? (scores 0-100)

**`algorithm.ts`** - The main brain! It:
- Finds compatible hosts for a rider
- Calculates match scores
- Handles the approval flow (host accepts → rider confirms)

---

### 3. API Endpoints (How the app talks to the database)

Think of these as buttons the app can press:

**For Hosts:**
| Button | What it does |
|--------|--------------|
| `POST /api/ride-templates` | "I want to offer rides" |
| `GET /api/matching/suggestions` | "Show me riders who need a lift" |
| `POST /api/matching/respond` | "I accept/skip this rider" |

**For Riders:**
| Button | What it does |
|--------|--------------|
| `POST /api/ride-requests` | "I need a ride" |
| `POST /api/matching/find` | "Find me matching hosts" |
| `POST /api/pods/confirm` | "Yes, I want to join this carpool" |

**For Both:**
| Button | What it does |
|--------|--------------|
| `GET /api/pods` | "Show my carpools" |

---

### 4. Better Location Input

**File: `src/components/LocationInputWithCoords.tsx`**

The old location input only saved the address text. This new one also saves the exact GPS coordinates (latitude, longitude). This is needed for the matching to work!

---

## How Matching Works - Simple Version

**Step 1**: Host says "I drive from Home to College at 8am on weekdays, I have 1 extra seat"

**Step 2**: Rider says "I need to reach College by 9am on weekdays, pickup from my home"

**Step 3**: System checks:
- Is the pickup near the host's route? ✓
- Do their days match? ✓
- Will rider arrive on time? ✓

**Step 4**: If all checks pass → Host sees a suggestion

**Step 5**: Host accepts → Rider gets notified

**Step 6**: Rider confirms → They're matched! 🎉

Both can now see each other's phone numbers.

---

## The Two-Gate Consent System

This is a safety feature:

```
Gate 1: Host must accept the rider
                ↓
Gate 2: Rider must confirm they want to join

Only after BOTH gates are passed, contact info is shared.
```

This prevents unwanted matches and keeps everyone safe.

---

## What You Need to Do

1. **Run the SQL migration** (one-time setup)
   - Copy `supabase/migrations/001_matching_system.sql`
   - Paste in Supabase SQL Editor
   - Run it

2. **Make sure you have these environment variables:**
   ```
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_key
   NEXT_PUBLIC_SUPABASE_URL=your_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
   ```

3. **Build the UI** (next step)
   - Dashboard showing host suggestions
   - Rider invitations view
   - Pod/carpool management screen

---

## Summary

| I Created | Purpose |
|-----------|---------|
| 1 SQL file | Creates database tables |
| 5 matching library files | The brains - math & logic |
| 9 API endpoints | Communication between app & database |
| 1 new component | Location input that saves coordinates |

**Total: 16 new files**

The backend is ready! Now you just need to:
1. Run the SQL migration
2. Build the frontend UI to use these APIs

Let me know if you want me to explain any part in more detail! 🚀
