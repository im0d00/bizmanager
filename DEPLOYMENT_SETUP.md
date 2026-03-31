# Complete Deployment & Connection Setup Guide

This guide walks you through deploying BizManager step-by-step, showing exactly where to deploy each component and how to connect them together.

## 📋 Table of Contents

- [Architecture Overview](#architecture-overview)
- [Prerequisites](#prerequisites)
- [Step-by-Step Deployment](#step-by-step-deployment)
- [Environment Variables Reference](#environment-variables-reference)
- [How Components Connect](#how-components-connect)
- [Testing Your Deployment](#testing-your-deployment)
- [Troubleshooting](#troubleshooting)

---

## 🏗️ Architecture Overview

BizManager consists of **two separate applications** that must be deployed independently:

```
┌─────────────────────────────────────────────────────────┐
│                    USERS ACCESS HERE                     │
│              https://your-app.vercel.app                 │
│                                                           │
│  ┌────────────────────────────────────────────────┐    │
│  │  FRONTEND (React + Vite + Tailwind)            │    │
│  │  - User Interface                               │    │
│  │  - Deployed to: Vercel/Netlify/Cloudflare      │    │
│  │  - Port 5173 (dev only)                         │    │
│  └────────────────┬───────────────────────────────┘    │
└───────────────────┼──────────────────────────────────────┘
                    │
                    │ HTTP Requests to /api/*
                    │
┌───────────────────▼──────────────────────────────────────┐
│  BACKEND API                                              │
│  https://your-app.up.railway.app                         │
│                                                           │
│  ┌────────────────────────────────────────────────┐    │
│  │  EXPRESS.JS SERVER (Node.js)                   │    │
│  │  - REST API Endpoints                           │    │
│  │  - JWT Authentication                           │    │
│  │  - Deployed to: Railway.app                     │    │
│  │  - Port 5000                                    │    │
│  │                                                  │    │
│  │  ┌──────────────────────────────────┐         │    │
│  │  │  SQLITE DATABASE                  │         │    │
│  │  │  - bizmanager.db                  │         │    │
│  │  │  - Stored on Railway disk         │         │    │
│  │  └──────────────────────────────────┘         │    │
│  └────────────────────────────────────────────────┘    │
└───────────────────────────────────────────────────────────┘
```

**Key Points:**
- Frontend and Backend are **separate deployments**
- Frontend communicates with Backend via HTTP API calls
- Backend validates requests using CORS (checks `FRONTEND_URL`)
- Database is embedded in the Backend deployment

---

## ✅ Prerequisites

Before you begin, make sure you have:

- [ ] A [Railway.app](https://railway.app) account (free tier available)
- [ ] A [Vercel](https://vercel.com) account (free tier available)
- [ ] Your BizManager repository on GitHub
- [ ] Git installed locally
- [ ] Node.js 18+ installed locally (for testing)

---

## 🚀 Step-by-Step Deployment

### Phase 1: Deploy Backend to Railway

#### Step 1.1: Create Railway Project

1. Go to [Railway.app](https://railway.app) and sign in
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Authorize Railway to access your GitHub
5. Select your **`bizmanager`** repository
6. Railway will automatically detect it as a Node.js project

#### Step 1.2: Configure Backend Environment Variables

In the Railway dashboard, click on your project, then:

1. Click **"Variables"** tab
2. Click **"New Variable"** and add each of these:

```env
PORT=5000
NODE_ENV=production
JWT_SECRET=CHANGE_THIS_TO_RANDOM_64_CHAR_HEX
JWT_REFRESH_SECRET=CHANGE_THIS_TO_DIFFERENT_64_CHAR_HEX
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
DB_PATH=./database/bizmanager.db
FRONTEND_URL=https://TEMPORARY-WILL-UPDATE-LATER.vercel.app
```

**⚠️ IMPORTANT: Generate Secure Secrets**

Don't use the placeholder values above! Generate real secrets:

```bash
# On your local machine, run this twice to get two different secrets:
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Copy the output and use it for `JWT_SECRET` and `JWT_REFRESH_SECRET`.

#### Step 1.3: Deploy Backend

1. Railway will automatically deploy after you save the variables
2. Wait 2-3 minutes for deployment to complete
3. Look for **"Deployments"** tab → Latest deployment should show **"Success"**
4. Click **"Settings"** tab → Find **"Domains"** section
5. Click **"Generate Domain"** to get a public URL
6. **COPY THIS URL** — it will look like: `https://bizmanager-production-XXXX.up.railway.app`

#### Step 1.4: Test Backend

Open a new browser tab and visit:
```
https://your-railway-app.up.railway.app/api/health
```

You should see:
```json
{
  "status": "ok",
  "timestamp": "2026-03-31T12:00:00.000Z"
}
```

✅ **Backend is live!**

---

### Phase 2: Deploy Frontend to Vercel

#### Step 2.1: Update vercel.json

**On your local machine**, edit the file `/vercel.json`:

Find line 12 and update it with your Railway URL:

```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://bizmanager-production-XXXX.up.railway.app/api/:path*"
    }
  ]
}
```

Replace `https://your-backend-url.com` with your **actual Railway URL from Step 1.3**.

**Commit and push this change:**

```bash
git add vercel.json
git commit -m "Configure Vercel to connect to Railway backend"
git push
```

#### Step 2.2: Deploy to Vercel

**Option A: Deploy via Vercel Dashboard (Recommended)**

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New..."** → **"Project"**
3. Import your **`bizmanager`** repository
4. Vercel will auto-detect the configuration
5. Click **"Deploy"**
6. Wait 2-3 minutes for deployment
7. **COPY YOUR VERCEL URL** — it will look like: `https://bizmanager-XXXX.vercel.app`

**Option B: Deploy via CLI**

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy from repository root
vercel --prod

# Follow the prompts, then copy the deployment URL
```

#### Step 2.3: Test Frontend

Visit your Vercel URL in a browser:
```
https://your-app.vercel.app
```

You should see the BizManager login page.

✅ **Frontend is live!**

---

### Phase 3: Connect Frontend ↔ Backend

#### Step 3.1: Update Backend CORS Configuration

1. Go back to **Railway Dashboard**
2. Open your project
3. Click **"Variables"** tab
4. Find the `FRONTEND_URL` variable
5. Update its value to your **actual Vercel URL from Step 2.2**:
   ```
   FRONTEND_URL=https://bizmanager-XXXX.vercel.app
   ```
6. **Important**: No trailing slash at the end!
7. Save the change
8. Railway will automatically redeploy (wait ~2 minutes)

#### Step 3.2: Test the Connection

1. Visit your Vercel URL: `https://your-app.vercel.app`
2. Try to login with default credentials:
   - Email: `admin@bizmanager.local`
   - Password: `admin123`
3. Open Browser DevTools (F12) → Network tab
4. Look for requests to `/api/auth/login`
5. Check the request URL — it should go to your Railway domain

**✅ If login succeeds, everything is connected correctly!**

#### Step 3.3: Change Default Password

⚠️ **Security**: Immediately change the default admin password:

1. Login to your deployed app
2. Click **"Settings"** in the sidebar
3. Navigate to **"Change Password"**
4. Set a strong new password

---

## 🔐 Environment Variables Reference

### Backend Variables (Railway)

| Variable | Example Value | Purpose |
|----------|---------------|---------|
| `PORT` | `5000` | Backend server port (Railway auto-sets this) |
| `NODE_ENV` | `production` | Enables production optimizations |
| `JWT_SECRET` | `a1b2c3...` (64 char hex) | Secret for signing JWT access tokens |
| `JWT_REFRESH_SECRET` | `d4e5f6...` (64 char hex) | Secret for signing JWT refresh tokens |
| `JWT_EXPIRES_IN` | `15m` | How long access tokens are valid |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | How long refresh tokens are valid |
| `DB_PATH` | `./database/bizmanager.db` | Path to SQLite database file |
| `FRONTEND_URL` | `https://your-app.vercel.app` | **CRITICAL**: Frontend domain for CORS validation |

### Frontend Variables (Vercel) - Optional

| Variable | Example Value | Purpose |
|----------|---------------|---------|
| `VITE_API_URL` | (leave empty) | Optional: Override API base URL (not needed if using `vercel.json` rewrites) |

---

## 🔌 How Components Connect

### Request Flow Diagram

```
User Browser
    │
    │ 1. User visits: https://your-app.vercel.app
    │
    ▼
Vercel CDN (serves static files: HTML, CSS, JS)
    │
    │ 2. User clicks "Login" → Frontend makes request: fetch('/api/auth/login')
    │
    ▼
Vercel Rewrites (vercel.json)
    │ Rewrites: /api/* → https://your-app.up.railway.app/api/*
    │
    │ 3. Proxies request to Railway
    │
    ▼
Railway Backend (Express.js)
    │
    │ 4. Checks CORS: Is request from FRONTEND_URL? ✓
    │ 5. Validates credentials
    │ 6. Queries SQLite database
    │ 7. Returns JWT tokens
    │
    ▼
Response flows back: Railway → Vercel → User Browser
```

### Key Configuration Files

#### `/vercel.json` (Frontend Deployment)

```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://your-railway-url.up.railway.app/api/:path*"
    }
  ]
}
```

**Purpose**: Forwards all `/api/*` requests from Vercel to Railway backend.

#### `/frontend/src/api/axios.js` (API Client)

```javascript
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
```

**Purpose**:
- In development: Uses `/api` which Vite proxies to `localhost:5000`
- In production: Uses `/api` which Vercel rewrites to Railway URL

#### Backend CORS Configuration

The backend validates that requests come from the `FRONTEND_URL` environment variable. If the request origin doesn't match, it's rejected with a CORS error.

---

## 🧪 Testing Your Deployment

### Health Check Endpoints

**Backend Health:**
```bash
curl https://your-railway-url.up.railway.app/api/health
# Expected: {"status":"ok","timestamp":"..."}
```

**Frontend:**
```bash
curl https://your-vercel-url.vercel.app
# Expected: HTML content of the login page
```

### Login Test

1. Visit `https://your-vercel-url.vercel.app`
2. Open DevTools (F12) → Network tab
3. Login with: `admin@bizmanager.local` / `admin123`
4. Verify:
   - Request goes to Railway URL
   - Response status is `200 OK`
   - Tokens are stored in localStorage
   - You're redirected to dashboard

### CORS Test

If CORS is configured correctly:
- ✅ Login works
- ✅ Dashboard loads data
- ✅ No errors in browser console

If CORS is misconfigured:
- ❌ Login fails
- ❌ Console shows: `CORS policy: No 'Access-Control-Allow-Origin' header`
- ❌ Network tab shows failed requests

---

## 🔧 Troubleshooting

### Issue 1: "CORS policy: No 'Access-Control-Allow-Origin' header"

**Symptoms:**
- Login fails
- Browser console shows CORS error
- Network tab shows failed API requests

**Solution:**
1. Check Railway environment variables
2. Verify `FRONTEND_URL` exactly matches your Vercel URL
3. Ensure there's **no trailing slash** at the end
4. Redeploy backend (Railway auto-deploys on variable change)
5. Hard-refresh your browser (Ctrl+Shift+R)

**Correct:**
```
FRONTEND_URL=https://bizmanager-abc123.vercel.app
```

**Incorrect:**
```
FRONTEND_URL=https://bizmanager-abc123.vercel.app/    ❌ (trailing slash)
FRONTEND_URL=http://bizmanager-abc123.vercel.app      ❌ (http instead of https)
```

---

### Issue 2: API Returns 404 Not Found

**Symptoms:**
- All API requests return 404
- Frontend shows "Network Error"

**Solution:**
1. Check `vercel.json` line 12
2. Verify Railway URL is correct
3. Test Railway backend directly: `curl https://your-railway-url.up.railway.app/api/health`
4. If backend works but Vercel doesn't, redeploy frontend:
   ```bash
   vercel --prod
   ```

---

### Issue 3: Backend Shows "Application failed to respond"

**Symptoms:**
- Railway deployment succeeds but app doesn't start
- Railway logs show errors

**Solution:**

Check Railway logs:
1. Go to Railway Dashboard
2. Click "Deployments" tab
3. Click latest deployment
4. Check logs for errors

Common causes:
- Missing environment variables
- Database initialization failed
- Port binding issue (should use `process.env.PORT`)

---

### Issue 4: Database Data Lost After Redeploy

**Symptoms:**
- After Railway redeploys, all data is gone
- Must re-login with default credentials

**Cause:**
Railway's free tier has ephemeral storage. SQLite database is deleted on redeploy.

**Solutions:**

**Option A: Use Railway Volumes (Recommended)**
1. Railway Pro plan required
2. Add a volume to persist `/backend/database`
3. Data survives redeployments

**Option B: Migrate to PostgreSQL**
1. Add Railway PostgreSQL addon
2. Update backend code to use PostgreSQL instead of SQLite
3. See [RAILWAY_DEPLOYMENT.md](RAILWAY_DEPLOYMENT.md#upgrading-to-postgresql-recommended-for-production) for details

**Option C: Regular Backups**
1. Use the app's backup feature (Settings → Backup)
2. Download database regularly
3. Restore after redeployment

---

### Issue 5: Build Fails with "npm: command not found"

**Symptoms:**
- Railway deployment fails during build
- Logs show: `npm: command not found`

**Solution:**

This is already fixed in your repository! The files are configured correctly:
- `railway.toml` — Uses Railpack builder
- `nixpacks.toml` — Disables premature npm install
- `start.sh` — Handles all installation at runtime

If you still see this error:
1. Verify `start.sh` is executable: `git update-index --chmod=+x start.sh`
2. Ensure all three files are committed
3. Try redeploying

---

## 📊 Deployment Checklist

Use this checklist to verify your deployment:

### Backend (Railway)
- [ ] Railway project created
- [ ] Repository connected
- [ ] All environment variables set (especially `JWT_SECRET` and `JWT_REFRESH_SECRET`)
- [ ] Deployment succeeded
- [ ] Domain generated
- [ ] Health check endpoint returns `{"status":"ok"}`
- [ ] `FRONTEND_URL` set to Vercel URL

### Frontend (Vercel)
- [ ] `vercel.json` updated with Railway URL
- [ ] Changes committed and pushed to GitHub
- [ ] Vercel project created
- [ ] Repository connected
- [ ] Deployment succeeded
- [ ] Domain generated
- [ ] Login page loads

### Connection
- [ ] Login works
- [ ] No CORS errors in browser console
- [ ] Dashboard loads data
- [ ] Default password changed

---

## 🎯 Quick Reference

### Local Development URLs
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`
- API: `http://localhost:5173/api/*` (proxied by Vite)

### Production URLs
- Frontend: `https://your-app.vercel.app`
- Backend: `https://your-app.up.railway.app`
- API: `https://your-app.vercel.app/api/*` (rewritten by Vercel)

### Default Credentials
- Email: `admin@bizmanager.local`
- Password: `admin123`
- ⚠️ **Change immediately after first login!**

### Useful Commands

```bash
# Generate JWT secrets
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Deploy to Vercel
vercel --prod

# Test backend health
curl https://your-railway-url.up.railway.app/api/health

# View Railway logs
# (Use Railway dashboard → Deployments → Latest → Logs)
```

---

## 📚 Additional Resources

- **Detailed Railway Guide**: [RAILWAY_DEPLOYMENT.md](RAILWAY_DEPLOYMENT.md)
- **Detailed Vercel Guide**: [VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md)
- **API Documentation**: [docs/DEVELOPER_GUIDE.md](docs/DEVELOPER_GUIDE.md)
- **User Guide**: [docs/USER_GUIDE.md](docs/USER_GUIDE.md)

---

## 🆘 Getting Help

If you're stuck:

1. **Check logs**:
   - Railway: Dashboard → Deployments → Logs
   - Vercel: Dashboard → Deployments → Build Logs
   - Browser: DevTools → Console

2. **Verify configuration**:
   - Railway environment variables
   - `vercel.json` rewrite destination
   - CORS settings

3. **Community support**:
   - [Railway Discord](https://discord.gg/railway)
   - [Vercel Support](https://vercel.com/support)
   - Open an issue on GitHub

---

## 🎉 Success!

If you've followed all steps and everything works:

✅ Backend deployed to Railway
✅ Frontend deployed to Vercel
✅ Components connected via CORS + rewrites
✅ Login works
✅ Dashboard loads

**You're all set! Your BizManager instance is live and ready to use.**

---

*Last updated: March 31, 2026*
