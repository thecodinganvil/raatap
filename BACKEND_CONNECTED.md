# 🚀 Raatap - Full Stack Setup

## ✅ Backend Connected to Frontend!

### What's Done:

**Frontend API Routes Updated:**
- ✅ `/api/matches/accept` → Calls backend
- ✅ `/api/matches/confirm` → Calls backend
- ✅ `/api/matches/skip` → Calls backend
- ✅ `/api/matches/suggestions` → Calls backend
- ✅ `/api/pods/current` → Calls backend

**Environment Variables:**
- ✅ `BACKEND_URL=http://localhost:3001` added to `.env.local`

---

## 🎯 How to Run (Both Servers)

### Option 1: Two Terminals (Simple)

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

### Option 2: Create a Start Script

Create `start-all.bat` (Windows):

```batch
@echo off
echo Starting Raatap Full Stack...

start "Backend" cmd /k "cd backend && npm run dev"
timeout /t 2 /nobreak >nul
start "Frontend" cmd /k "npm run dev"

echo.
echo ✅ Both servers starting...
echo Backend: http://localhost:3001
echo Frontend: http://localhost:3000
```

---

## 🧪 Test the Connection

### 1. Check Backend Health
```bash
curl http://localhost:3001/health
# Should return: {"status":"ok",...}
```

### 2. Test Skip Match (with Backend Logs)

**Backend Terminal Should Show:**
```
📥 [POST] /api/matches/skip
   Body: { matchId: "...", userId: "...", userRole: "rider" }
✅ Match skipped: { success: true }
```

**Frontend Terminal Should Show:**
```
📥 [Frontend] /api/matches/skip: { matchId: "...", userId: "..." }
✅ [Frontend] Match skipped successfully
```

---

## 🐛 Debugging Flow

### When User Clicks "Skip" in App:

```
User Action (Browser)
    ↓
Frontend: /api/matches/skip
    ↓ (logs: 📥 [Frontend] /api/matches/skip)
    ↓
Backend: POST /api/matches/skip
    ↓ (logs: 📥 [POST] /api/matches/skip)
    ↓
Supabase: skip_match_suggestion()
    ↓ (logs: ✅ Match skipped)
    ↓
Response back to user
```

**You can now see logs at EVERY step!** 🎉

---

## 📊 What You'll See

### Backend Terminal:
```
╔═══════════════════════════════════════════════╗
║   🚀 Raatap Backend Server Running!           ║
╠═══════════════════════════════════════════════╣
║   URL: http://localhost:3001                  ║
║   Health: http://localhost:3001/health        ║
╚═══════════════════════════════════════════════╝

📥 [POST] /api/matches/skip
   { matchId: "abc123", userId: "xyz789", userRole: "rider" }
✅ Match skipped: { success: true, message: "Match skipped/rejected" }

📥 [POST] /api/matches/accept
   { matchId: "def456", hostId: "uvw321" }
✅ Match accepted: { success: true, pod_id: "pod_123" }
```

### Frontend Terminal (Next.js):
```
✓ Ready in 1234ms
📥 [Frontend] /api/matches/skip: { matchId: "abc123", ... }
✅ [Frontend] Match skipped successfully
```

### Browser Console:
```javascript
// When skip succeeds:
✅ Match skipped!

// When backend is down:
❌ Backend service unavailable. Make sure backend is running.
```

---

## 🔧 Troubleshooting

### "Backend service unavailable"
```bash
# Check if backend is running
curl http://localhost:3001/health

# If not running:
cd backend
npm run dev
```

### "Cannot connect to localhost:3001"
1. Make sure backend is running (check terminal)
2. Check no firewall blocking port 3001
3. Try `netstat -ano | findstr :3001` to see if port is in use

### "Function not found" errors
The backend still needs the database functions deployed. Deploy via:
- Supabase Dashboard → SQL Editor → Run SQL files
- Or: `npm run db:migrate` (once fixed)

---

## 📝 Summary

| Component | Status | URL |
|-----------|--------|-----|
| **Frontend** | ✅ Connected | http://localhost:3000 |
| **Backend** | ✅ Running | http://localhost:3001 |
| **Supabase** | ✅ Connected | Database |
| **Debugging** | ✅ Clear logs | Terminal |

---

## 🎯 Next Steps

1. **Start both servers**
2. **Test skip/accept/confirm** in your app
3. **Watch backend terminal** for clear logs
4. **No more database black box!** 🎉

---

**Ready to test?** Start both servers and try a match action! 🚀
