# RAATAP — FOUNDATIONAL STARTUP DOCUMENT

> **This document is the source of truth for Raatap's identity, philosophy, and architecture.**
> Every feature, design decision, and code change must align with these principles.

---

## 1. One-Line Definition

**Raatap is a closed-community, schedule-first ride coordination infrastructure for verified daily commuters.**

---

## 2. What Raatap Is NOT (Hard Positioning)

| ❌ NOT This              | ✅ Raatap Is                    |
| ------------------------ | ------------------------------- |
| Uber                     | Coordination infrastructure     |
| Ola                      | For trusted, recurring mobility |
| Public ride-hailing      | Closed community only           |
| Instant rides            | Schedule-first                  |
| A social network         | Utility-focused                 |
| Carpooling for strangers | Verified members only           |

**Raatap is not a marketplace.**
**Raatap is coordination infrastructure for trusted, recurring mobility.**

---

## 3. Core Problem

Daily commuters in institutions (colleges, corporate campuses) travel on:

- Fixed routes
- Fixed days
- Fixed time windows

Yet existing solutions assume:

- One-time rides
- Random drivers
- Public exposure
- No trust continuity

This creates:

- ⚠️ Safety issues
- ⚠️ Unpredictability
- ⚠️ Friction every single day

---

## 4. Raatap's Core Insight

> **Daily commute is a routine, not an event.**

Therefore:

- Matching must be **recurring**
- Access must be **restricted**
- Trust must **compound over time**
- Consent must exist on **both sides**
- Schedules must come **before matching**

---

## 5. Target Users (Strict Scope)

Raatap is built **ONLY** for:

- Students
- Faculty
- Employees

Within:

- Colleges
- Corporate campuses
- Institutional corridors

**🚫 No general public access.**

---

## 6. Closed Community Principle (Non-Negotiable)

- ✅ Every member must be verified
- ✅ Verification is mandatory before matching
- ✅ Communities are bounded by institution / cluster
- ✅ Visibility is restricted to verified members only

**Closed > Open. Always.**

---

## 7. Core User Roles (Locked)

There are **ONLY TWO SYSTEM ROLES.**

### Rider

- Does not own a vehicle
- Requests a recurring commute pod
- Pays per pod / period
- Low system privileges
- Easy to suspend or ban

### Host

- Owns a vehicle (2W / 4W)
- Offers seats on a recurring route
- Recovers fuel costs
- Higher responsibility
- Higher penalties

### ⚠️ Rules

- A user **cannot** act as both roles in the same pod
- Role switching is allowed only via explicit re-declaration
- No hybrid behavior at system level

---

## 8. Schedule-First Model (Core Architecture)

**Raatap does not start with rides. It starts with schedules.**

### Host defines:

- Fixed route (corridor)
- Days of travel
- Time window
- Available seats
- → Creates a **Recurring Ride Template**

### Rider defines:

- Fixed route
- Days
- Preferred time window
- Flexibility margin
- → Creates a **Recurring Ride Request**

**No schedule = no matching.**

---

## 9. Matching Philosophy

Matching happens **only when ALL conditions are true:**

- ✅ Same route
- ✅ Overlapping days
- ✅ Overlapping time window
- ✅ Preference compatibility
- ✅ Both members verified

If any condition fails → **no match attempt**

> **There is no forced optimization.**
> **Human comfort > algorithmic efficiency.**

---

## 10. Two-Gate Consent System

Raatap enforces **mutual consent**.

### Gate 1 — Host Approval

- Host sees a limited preview
- Can Accept or Skip
- Skip has no penalty
- No "reject" language

### Gate 2 — Rider Confirmation

- Rider explicitly confirms
- Acknowledges recurring nature
- Pays one-time pod reservation fee

**No pod exists without double consent.**

---

## 11. Pods (Core Unit)

A **Pod** is:

- A recurring commute group
- Fixed route
- Fixed days
- Fixed time window
- Verified members only

Pods are:

- Predictable
- Repeatable
- Trust-based

**Pods ≠ rides**

---

## 12. Trust System (Implicit, Not Gamified)

Trust is built through:

- Verification status
- Ride completion history
- No-shows
- Cancellations
- Admin interventions

**No public ratings.**
**No social scoring.**
**Trust is system-managed, not performative.**

---

## 13. Verification System

**Verification is mandatory.**

Methods:

- Institutional email OTP
- Campus / cluster admin approval

Unverified members:

- ✅ Can create profiles
- ❌ Cannot be matched
- ⚠️ Are clearly marked as pending

---

## 14. Admin Structure

### Platform Admin

- Corridor creation
- Host approvals
- User suspension
- System-level visibility

### Cluster / Campus Admin

- Profile verification
- Local enforcement
- Identity checks

**Admins are gatekeepers, not moderators.**

---

## 15. Language Discipline (Cultural Rule)

> **Words are not cosmetic. They enforce behavior.**

### Always say:

| ❌ Don't Say | ✅ Say       |
| ------------ | ------------ |
| Users        | Members      |
| Rides        | Pods         |
| Booking      | Coordination |
| Trusted      | Verified     |

Language must reinforce:

- Recurrence
- Seriousness
- Safety
- Predictability

---

## 16. Economic Principle

- ❌ No surge pricing
- ❌ No bidding
- ❌ No dynamic pricing

Payments exist only to:

- Reserve commitment
- Reduce flakiness
- Sustain operations

**Money is friction control, not profit extraction.**

---

## 17. Core Values (Unwritten Rules)

| Priority       | Over        |
| -------------- | ----------- |
| Predictability | Convenience |
| Safety         | Scale       |
| Consent        | Utilization |
| Trust          | Speed       |
| Infrastructure | Social      |

---

## 18. Long-Term Identity

Raatap is **not** a "startup app".

Raatap aims to become:

- Mobility infrastructure for institutions
- A layer that sits between people and movement
- **Invisible, boring, reliable — like electricity**

---

## 19. The One Line That Must Survive

> **Raatap coordinates verified people who commute the same route, at the same time, every day — safely and predictably.**

---

## Development Guidelines

When building features, always ask:

1. **Does this enforce verification?** — No feature should work for unverified members
2. **Is this schedule-first?** — No instant/on-demand features
3. **Does this respect consent?** — Both parties must agree
4. **Is this recurring?** — One-time features are anti-pattern
5. **Does the language match?** — Use "members", "pods", "coordination"
6. **Is this closed-community?** — No public exposure of data

---

_Last updated: January 31, 2026_
