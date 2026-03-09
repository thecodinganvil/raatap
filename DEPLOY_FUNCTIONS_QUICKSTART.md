# 🚀 Quick Start: Deploy Supabase Functions

## TL;DR - Run These Commands

```bash
# 1. Install Supabase CLI globally
npm install -g supabase

# 2. Login to Supabase
supabase login

# 3. Link your project (replace with your actual project ID)
supabase link --project-ref YOUR_PROJECT_REF

# 4. Check current database status
npm run db:check

# 5. Deploy all functions
npm run db:deploy
# OR
npm run db:migrate

# 6. Verify deployment
npm run db:check
```

---

## 📁 Files Created

| File | Purpose |
|------|---------|
| `deploy-db.bat` | Windows batch script for deployment |
| `scripts/deploy-db.js` | Node.js deployment script |
| `check-db.js` | Database status checker |
| `SUPABASE_DEPLOYMENT_GUIDE.md` | Detailed documentation |

---

## 🔧 Available Commands

```bash
# Check database status (tables, functions, triggers)
npm run db:check

# Deploy using Supabase CLI
npm run db:deploy

# Deploy using Node.js script
npm run db:migrate

# Login to Supabase
npm run supabase:login

# Link to project
npm run supabase:link YOUR_PROJECT_REF
```

---

## 📊 How Functions Run Automatically

### 1. **Triggers** (Automatic on Database Changes)

Once deployed, these triggers run **automatically**:

```sql
-- When user updates profile with prefer_hosting = true
-- → Automatically creates ride_template

-- When user updates profile with prefer_taking_ride = true  
-- → Automatically creates ride_request
```

**No manual intervention needed!**

---

### 2. **API Calls** (On-Demand)

Your Next.js API routes call these functions:

| API Endpoint | Database Function |
|-------------|-------------------|
| `/api/matches/accept` | `accept_match_suggestion()` |
| `/api/matches/confirm` | `confirm_match_suggestion()` |
| `/api/matches/skip` | `skip_match_suggestion()` |
| `/api/pods/current` | Queries `pods` and `pod_members` |

---

### 3. **Scheduled Jobs** (Optional - pg_cron)

To auto-generate matches every hour:

```sql
-- Run this once in Supabase SQL Editor
SELECT cron.schedule(
  'generate-matches-hourly',
  '0 * * * *',
  $$SELECT generate_all_matches()$$
);
```

---

## 🧪 Test Deployment

### Step 1: Check Before Deployment

```bash
npm run db:check
```

Expected output (functions NOT found):
```
=== DATABASE FUNCTIONS ===
  ❌ accept_match_suggestion: NOT FOUND or ERROR
  ❌ confirm_match_suggestion: NOT FOUND or ERROR
  ❌ skip_match_suggestion: NOT FOUND or ERROR
```

### Step 2: Deploy

```bash
npm run db:deploy
```

### Step 3: Check After Deployment

```bash
npm run db:check
```

Expected output (functions OK):
```
=== DATABASE FUNCTIONS ===
  ✅ accept_match_suggestion: OK
  ✅ confirm_match_suggestion: OK
  ✅ skip_match_suggestion: OK
  ✅ generate_all_matches: OK
  ✅ expire_pending_matches_if_full: OK
```

---

## 🔍 Find Your Project Reference

1. Go to **Supabase Dashboard**
2. Click on your project
3. Go to **Settings** → **General**
4. Copy the **Project Reference** (e.g., `abcdefghijklnopqrst`)

---

## 🐛 Troubleshooting

### "supabase: command not found"
```bash
npm install -g supabase
```

### "Not logged in"
```bash
supabase login
```

### "Project not linked"
```bash
supabase link --project-ref YOUR_PROJECT_REF
```

### "Function not found after deployment"
1. Open Supabase Dashboard → **SQL Editor**
2. Manually run the SQL files in order:
   - `database/functions/09_standardize_match_functions.sql`

### "Permission denied"
- Make sure you're using `SUPABASE_SERVICE_ROLE_KEY` (not anon key)
- Check `.env.local` has correct credentials

---

## 📝 Environment Variables

Create `.env.local` with:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```

**Where to find keys:**
- Supabase Dashboard → **Settings** → **API**

---

## ✅ Verification Checklist

After deployment, verify:

- [ ] All 5 functions show ✅ in `npm run db:check`
- [ ] Triggers exist (run in SQL Editor):
  ```sql
  SELECT * FROM pg_trigger WHERE tgname = 'on_profile_update_create_ride';
  ```
- [ ] RLS policies enabled:
  ```sql
  SELECT tablename, rowsecurity FROM pg_tables WHERE rowsecurity = true;
  ```
- [ ] Test match flow in the app:
  1. Create a host profile
  2. Create a rider profile  
  3. Generate matches
  4. Accept/confirm a match

---

## 📞 Need Help?

1. Check **Supabase Dashboard** → **Logs** → **Database Logs**
2. Read `SUPABASE_DEPLOYMENT_GUIDE.md` for detailed docs
3. Test functions manually in **SQL Editor**

---

**Last Updated:** March 9, 2026
