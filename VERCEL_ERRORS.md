# Quick Fix Guide: Common Vercel Errors

## Error: "Cannot find module 'better-sqlite3'"

**What it means:** You're trying to deploy the backend to Vercel (won't work)

**Solution:**
1. Only deploy frontend to Vercel
2. Deploy backend to Railway, Render, or VPS
3. Update `vercel.json` with backend URL

---

## Error: "ENOENT: no such file or directory, open 'bizmanager.db'"

**What it means:** SQLite database file doesn't exist (serverless has no persistent storage)

**Solution:**
- SQLite is incompatible with Vercel serverless
- Use Railway/Render/Fly.io for backend with persistent storage

---

## Error: "No 'Access-Control-Allow-Origin' header present"

**What it means:** CORS is blocking requests from Vercel domain to your backend

**Solution:**
1. Update backend `.env`:
   ```
   FRONTEND_URL=https://your-app.vercel.app
   ```
2. Redeploy backend
3. Clear browser cache and try again

---

## Error: "Failed to load resource: net::ERR_NAME_NOT_RESOLVED"

**What it means:** Invalid backend URL in `vercel.json`

**Solution:**
1. Check `vercel.json` `rewrites` section
2. Verify backend URL is correct and accessible
3. Test backend URL in browser: `https://your-backend.com/api/health`
4. Redeploy Vercel frontend: `vercel --prod`

---

## Error: "Build failed" during Vercel deployment

**Common causes:**
- Missing `npm install` in frontend directory
- Build command running in wrong directory
- Missing environment variables

**Solution:**
1. Check `vercel.json` has correct paths:
   ```json
   "buildCommand": "cd frontend && npm install && npm run build",
   "outputDirectory": "frontend/dist"
   ```
2. Set environment variables in Vercel dashboard
3. Check build logs for specific error

---

## Frontend loads but can't login / API calls fail

**Possible causes:**
1. Backend not running
2. Wrong backend URL in `vercel.json`
3. CORS not configured
4. Backend requires environment variable not set

**Debug steps:**
1. Open browser DevTools → Network tab
2. Try to login
3. Check failed request URL - where is it going?
4. Check response - what error message?
5. Test backend directly: `curl https://your-backend.com/api/health`

**Solution:**
- If 404: Update URL in `vercel.json`
- If CORS error: Update `FRONTEND_URL` in backend
- If 500: Check backend logs for errors
- If timeout: Backend may be sleeping (free tier), wait 30s and retry

---

## Environment variables not working

**Issue:** `VITE_API_URL` not being used

**Solution:**
1. Variable must be prefixed with `VITE_` to be accessible in Vite
2. Set in Vercel dashboard: Project → Settings → Environment Variables
3. Must redeploy after adding variables: `vercel --prod`
4. Variable should NOT include `/api` suffix if using rewrites in `vercel.json`

---

## Backend works locally but not in production

**Common issues:**
1. Environment variables not set on hosting platform
2. Database not initialized (run `npm run setup`)
3. Port conflicts (use `process.env.PORT`)
4. Missing `NODE_ENV=production`

**Solution:**
1. Check all env vars are set on hosting platform
2. Check logs for specific error
3. Ensure database file exists and is writable
4. Verify persistent volume is mounted (Railway/Render)

---

## Need More Help?

1. Check full guide: [VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md)
2. Check Vercel logs: `vercel logs`
3. Check backend logs on your hosting platform
4. Test backend health: `https://your-backend.com/api/health`
5. Verify CORS: Should return `Access-Control-Allow-Origin` header

---

## Recommended Architecture

```
Frontend (Vercel)
  ↓ HTTPS
Backend (Railway/Render)
  ↓
SQLite Database (persistent volume)
```

**Do this:** Split frontend/backend deployment
**Don't do this:** Try to run SQLite on Vercel serverless
