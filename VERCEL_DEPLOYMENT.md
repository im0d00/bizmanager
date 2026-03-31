# Vercel Deployment Guide for BizManager

## ⚠️ Important Limitations

**BizManager uses SQLite database, which is NOT compatible with Vercel's serverless architecture.**

### Why SQLite doesn't work on Vercel:

1. **No persistent filesystem**: Vercel serverless functions use ephemeral storage that resets between invocations
2. **Native modules**: The `better-sqlite3` package requires compilation and doesn't work in serverless environments
3. **File-based database**: SQLite requires a persistent file that can be read/written, which Vercel doesn't provide

## What CAN Be Deployed to Vercel

### ✅ Frontend Only

You can deploy the **React frontend** to Vercel, but you'll need to host the backend elsewhere.

#### Steps:

1. **Deploy Frontend to Vercel:**
   ```bash
   # Install Vercel CLI
   npm install -g vercel

   # Deploy from project root
   vercel
   ```

2. **Update API endpoint:**
   - The `vercel.json` configuration includes a rewrite rule for `/api/*` endpoints
   - Update the `destination` URL in `vercel.json` to point to your actual backend:
   ```json
   "rewrites": [
     {
       "source": "/api/:path*",
       "destination": "https://your-backend-url.com/api/:path*"
     }
   ]
   ```

3. **Deploy your backend to one of these platforms:**
   - Railway (recommended for SQLite)
   - Render
   - DigitalOcean App Platform
   - Fly.io
   - Heroku
   - AWS EC2 / Lightsail
   - Any VPS (Ubuntu + PM2)

## Recommended: Split Deployment Strategy

### Option 1: Vercel (Frontend) + Railway (Backend)

**Frontend on Vercel:**
- Fast global CDN
- Free tier: Unlimited bandwidth for non-commercial
- Automatic HTTPS
- Preview deployments for PRs

**Backend on Railway:**
- Supports SQLite with persistent volumes
- Easy environment variable management
- $5/month starter plan
- Automatic deployments from GitHub

#### Railway Backend Setup:

1. Create a new project on [Railway](https://railway.app/)
2. Connect your GitHub repository
3. Set root directory to `backend`
4. Add environment variables:
   ```
   PORT=5000
   NODE_ENV=production
   JWT_SECRET=<generate-a-secure-secret>
   JWT_REFRESH_SECRET=<generate-another-secure-secret>
   FRONTEND_URL=https://your-vercel-app.vercel.app
   ```
5. Railway will automatically detect and run `npm start`
6. Copy the Railway deployment URL

#### Update Vercel Configuration:

Edit `vercel.json` and replace the API destination:
```json
"rewrites": [
  {
    "source": "/api/:path*",
    "destination": "https://your-app.up.railway.app/api/:path*"
  }
]
```

### Option 2: Vercel (Frontend) + Render (Backend)

[Render](https://render.com/) also supports SQLite with persistent disks.

1. Create a new Web Service on Render
2. Connect your repository
3. Configure:
   - Root Directory: `backend`
   - Build Command: `npm install`
   - Start Command: `npm start`
4. Add a persistent disk (required for SQLite):
   - Mount path: `/home/runner/work/bizmanager/bizmanager/backend/database`
5. Set environment variables (same as Railway)

### Option 3: All-in-One Hosting (Not Vercel)

If you prefer to host everything together, consider:

- **Railway** - Deploy entire monorepo
- **Render** - Deploy frontend + backend separately
- **DigitalOcean App Platform**
- **Fly.io** - Good for SQLite, includes persistent volumes
- **Traditional VPS** - DigitalOcean Droplet, Linode, etc.

## Alternative: Migrate to PostgreSQL/MySQL

If you want to use Vercel for both frontend and backend (as serverless functions), you'll need to:

1. **Replace SQLite with a hosted database:**
   - Vercel Postgres
   - Supabase (PostgreSQL)
   - PlanetScale (MySQL)
   - Neon (PostgreSQL)

2. **Replace `better-sqlite3` with:**
   - `pg` (PostgreSQL)
   - `mysql2` (MySQL)

3. **Modify database schema and queries**

This requires significant code changes and is beyond the scope of a simple Vercel deployment.

## Vercel Environment Variables

When deploying frontend to Vercel, you can set environment variables in the Vercel dashboard:

1. Go to your project → Settings → Environment Variables
2. Add variables prefixed with `VITE_` to make them available in the React app:
   ```
   VITE_API_URL=https://your-backend-url.com
   ```
3. Update `frontend/src/lib/axios.js` to use:
   ```javascript
   const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
   ```

## Testing the Deployment

1. **Test frontend:**
   ```bash
   # Visit your Vercel URL
   https://your-app.vercel.app
   ```

2. **Verify API connection:**
   - Open browser DevTools → Network tab
   - Try to login
   - Check that API requests go to your backend URL
   - Verify CORS headers allow requests from Vercel domain

3. **Update backend CORS:**
   In your backend `.env` or hosting platform environment variables:
   ```
   FRONTEND_URL=https://your-app.vercel.app
   ```

## Common Errors and Solutions

### Error: "Module not found: better-sqlite3"

**Cause:** Trying to deploy backend to Vercel
**Solution:** Deploy backend to Railway/Render/etc. Only deploy frontend to Vercel

### Error: "CORS policy: No 'Access-Control-Allow-Origin' header"

**Cause:** Backend CORS not configured for Vercel frontend URL
**Solution:** Update `FRONTEND_URL` in backend environment variables

### Error: "Failed to proxy request"

**Cause:** Invalid or unreachable backend URL in `vercel.json`
**Solution:** Verify backend is running and URL is correct in the `rewrites` section

### Error: "Database is locked"

**Cause:** Multiple serverless instances trying to access SQLite
**Solution:** SQLite doesn't work in serverless - use Railway/Render instead

**📋 For more errors and solutions, see [VERCEL_ERRORS.md](VERCEL_ERRORS.md)**

## Summary

- ✅ **Deploy frontend to Vercel** (fast, free, easy)
- ❌ **Do NOT deploy SQLite backend to Vercel** (won't work)
- ✅ **Deploy backend to Railway, Render, or VPS** (persistent storage)
- 🔄 **Use API rewrites in vercel.json** to proxy backend requests
- 🔐 **Update CORS and environment variables** for production URLs

## Quick Deploy Commands

```bash
# 1. Deploy frontend to Vercel
npm install -g vercel
vercel --prod

# 2. Deploy backend to Railway (using Railway CLI)
npm install -g @railway/cli
railway login
cd backend
railway init
railway up

# 3. Update vercel.json with Railway URL and redeploy
vercel --prod
```

## Need Help?

- [Vercel Documentation](https://vercel.com/docs)
- [Railway Documentation](https://docs.railway.app/)
- [Render Documentation](https://render.com/docs)
- [Fly.io for SQLite](https://fly.io/docs/reference/sqlite/)
