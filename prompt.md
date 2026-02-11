You are acting as a senior full-stack engineer working on a REAL, LIVE startup.

This is NOT a demo project.
Do NOT invent features, tables, or shortcuts.
Follow instructions strictly.

--------------------------------------------------
PRODUCT OVERVIEW
--------------------------------------------------

We are building a campus carpooling platform for college students.

Core idea:
- Daily commute (home ↔ college)
- Cheaper than Ola / Rapido
- Trust-based, recurring rides
- No live GPS tracking
- No real-time ride hailing

--------------------------------------------------
TECH STACK
--------------------------------------------------

Frontend + Backend:
- Next.js (App Router)
- Next.js API routes used as backend
- Supabase (Auth + Postgres + PostGIS + RLS)

Important:
- No separate backend service
- No microservices
- No message queues (for now)

--------------------------------------------------
ROLE MODEL (STRICT)
--------------------------------------------------

A user can be ONLY ONE role:
- HOST  → offers rides
- RIDER → requests rides

Roles are locked at onboarding.
A user can NEVER be both.

--------------------------------------------------
DATA OWNERSHIP MODEL
--------------------------------------------------

profiles
- Identity + role + default commute info
- Stores lat/lng for home & college
- DOES NOT represent an active ride

ride_templates
- Created ONLY by HOSTS
- Represents a recurring ride offer
- Derived from profiles after onboarding

ride_requests
- Created ONLY by RIDERS
- Represents ride demand
- Derived from profiles after onboarding

match_suggestions
- System-generated match proposals
- Tracks pending / accepted / skipped matches
- This is the ONLY place where pending matches live

pods
- Created ONLY after host accepts a match
- Represents a real running carpool

pod_members
- Created ONLY after rider confirms
- Represents final membership

--------------------------------------------------
FRONTEND RESPONSIBILITY
--------------------------------------------------

Frontend MUST:
- Collect address input
- Geocode addresses
- Store lat/lng into profiles

Frontend MUST NOT:
- Compute distances
- Decide matches
- Create pods
- Run business rules

--------------------------------------------------
BACKEND / DB RESPONSIBILITY
--------------------------------------------------

ALL business logic lives in:
- Supabase Postgres functions
- Called via Next.js API routes using supabase.rpc()

--------------------------------------------------
MATCHING PHILOSOPHY
--------------------------------------------------

Matching is OFFLINE and EVENT-DRIVEN.

Trigger matching when:
- A ride_template is created
- A ride_request is created

Matching is NOT:
- Real-time
- GPS-based
- Road-by-road routing

--------------------------------------------------
ROUTING & DISTANCE LOGIC (VERY IMPORTANT)
--------------------------------------------------

We NEVER match home-to-home distance.

Correct logic:
- Host route = LINE from home → college
- Rider pickup = POINT
- Match if rider pickup is within host route corridor

Use PostGIS:
- ST_MakeLine(host.from_point, host.to_point)
- ST_Distance(rider.pickup_point, host.route_line)

If:
- distance <= max_detour_meters
→ route is compatible

This handles cases like:
- Host in Falaknuma
- Rider in LB Nagar
- Rider is still “on the way”

--------------------------------------------------
MATCH SCORING (HIGH LEVEL)
--------------------------------------------------

Score matches using:
- Detour distance
- Time compatibility
- Day overlap
- Preferences (gender, vehicle)

Insert scored results into:
- match_suggestions

DO NOT auto-accept matches.

--------------------------------------------------
UX VISIBILITY RULES
--------------------------------------------------

Before host accepts:
- Host sees rider with LIMITED info
- No phone numbers
- No exact pickup point

After host accepts:
- Rider sees host info
- Still no contact details

After rider confirms:
- Create pod
- Create pod_member
- Now share contact details

--------------------------------------------------
POD CREATION RULES
--------------------------------------------------

Pods are created ONLY when:
- Host accepts a match

Pod members are created ONLY when:
- Rider confirms

Never auto-create pods.

--------------------------------------------------
SECURITY & ENFORCEMENT
--------------------------------------------------

- Never trust frontend role flags
- Always check role using profiles table
- Host cannot create ride_requests
- Rider cannot create ride_templates
- Use Supabase service role key in API routes
- RLS must be respected

--------------------------------------------------
WHAT YOU MUST IMPLEMENT
--------------------------------------------------

Using Next.js API routes + Supabase DB functions:

1. Function to create ride_template from profile (host only)
2. Function to create ride_request from profile (rider only)
3. Function to generate match_suggestions
4. Function for host to accept a match
5. Function for rider to confirm a match
6. Proper status transitions in match_suggestions
7. Seat locking logic (prevent overbooking)

--------------------------------------------------
STRICT RULES (NON-NEGOTIABLE)
--------------------------------------------------

- Do NOT invent new tables
- Do NOT invent new columns
- Do NOT rename existing columns
- Do NOT auto-create pods
- Do NOT auto-accept matches
- Do NOT perform distance logic in frontend
- Do NOT use external routing APIs

If something is missing:
ASK before proceeding.

--------------------------------------------------
DATABASE SCHEMA (AUTHORITATIVE)
--------------------------------------------------

[PASTE schema.sql HERE — full CREATE TABLE definitions]

--------------------------------------------------
DELIVERABLES
--------------------------------------------------

Produce:
1. Clear Next.js API route structure
2. Supabase SQL functions (PL/pgSQL)
3. Explanations for each function
4. No UI code unless explicitly asked

--------------------------------------------------
FINAL NOTE
--------------------------------------------------

This is a real startup system.
Favor correctness, safety, and simplicity over cleverness.
