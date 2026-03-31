# Railway.app Deployment Guide

This guide explains how to deploy BizManager's backend to Railway.app.

## Prerequisites

- A [Railway.app](https://railway.app) account
- Your BizManager repository on GitHub

## Important Notes

⚠️ **Database Considerations:**
- Railway supports SQLite, but it's ephemeral (data will be lost on redeployments)
- For production, consider using Railway's PostgreSQL addon and migrating from SQLite
- Alternatively, use Railway for the backend and a persistent storage solution elsewhere

⚠️ **Frontend Deployment:**
- Railway can host the backend API
- Deploy the frontend separately to Vercel, Netlify, or Cloudflare Pages
- See [VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md) for frontend deployment instructions

---

## Quick Start

### 1. Create a New Railway Project

1. Log in to [Railway.app](https://railway.app)
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose your `bizmanager` repository
5. Railway will automatically detect the configuration

### 2. Configure Environment Variables

After deployment, add these environment variables in Railway's dashboard:

| Variable | Value | Notes |
|----------|-------|-------|
| `PORT` | `5000` | Railway will automatically set this, but you can override |
| `NODE_ENV` | `production` | Set to production mode |
| `JWT_SECRET` | `<your-secret>` | ⚠️ Generate a strong random secret |
| `JWT_REFRESH_SECRET` | `<your-secret>` | ⚠️ Generate a different strong secret |
| `JWT_EXPIRES_IN` | `15m` | Access token lifetime |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | Refresh token lifetime |
| `DB_PATH` | `./database/bizmanager.db` | SQLite database path |
| `FRONTEND_URL` | `https://your-frontend.vercel.app` | Your frontend URL for CORS |

**To generate secure secrets:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 3. Deploy

Railway will automatically:
1. Run the `start.sh` script
2. Install backend dependencies
3. Initialize the `.env` file
4. Set up the SQLite database
5. Start the backend server

Your API will be available at: `https://your-app.up.railway.app`

---

## Deployment Files

The following files enable Railway deployment:

### `start.sh` (Primary)
The main deployment script that Railway executes. It:
- Installs backend dependencies
- Initializes environment configuration
- Sets up the database
- Starts the Node.js server

### `railway.toml` (Configuration)
Railway-specific configuration:
```toml
[deploy]
startCommand = "bash start.sh"
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 10
```

**Note:** We use Railway's default Railpack builder, which automatically detects Node.js projects. The `start.sh` script handles all build and deployment steps.

### `nixpacks.toml` (Build Configuration)
Nixpacks configuration that explicitly installs Node.js:
```toml
[phases.setup]
nixPkgs = ["nodejs", "npm"]

[phases.install]
# Skip automatic install - start.sh handles it

[phases.build]
# Skip build phase - start.sh handles everything

[start]
cmd = "bash start.sh"
```

**Note:** This file explicitly tells Nixpacks to install Node.js and npm as system packages during the setup phase. This ensures Node.js is available when `start.sh` runs. All application installation and setup is then handled by `start.sh` at runtime.

---

## Troubleshooting

### ⚠ Script start.sh not found

**Cause:** This error occurs when Railway's Railpack can't find the `start.sh` file.

**Solution:**
- Ensure `start.sh` is in the root directory
- Verify it has executable permissions: `chmod +x start.sh`
- Check that the file is committed to your repository

### Database Issues

**Ephemeral Storage:**
Railway's filesystem is ephemeral. Data in SQLite will be lost on:
- Redeployments
- Service restarts
- Scaling events

**Solutions:**
1. **Use Railway PostgreSQL:**
   - Add a PostgreSQL addon in Railway
   - Modify the backend to use PostgreSQL instead of SQLite
   - Update database connection code

2. **Mount a Volume (Railway Pro):**
   - Use Railway's volume feature to persist SQLite
   - Mount volume at `./backend/database`

### Build Failures

**Symptom:** "npm: command not found" or exit code 137 during build

**Causes:**
1. Incorrect builder configuration causing npm to not be available
2. Out of memory during npm install (exit code 137)
3. Redundant build commands consuming too much memory

**Solution:**
- Use the simplified `railway.toml` without a custom build command
- Let Railway's Railpack auto-detect the Node.js environment
- The `start.sh` script uses `npm ci --omit=dev` to reduce memory usage
- If still failing, upgrade to Railway Pro for more memory

**Symptom:** "Railpack could not determine how to build the app"

**Solution:**
- Ensure `start.sh`, `railway.toml`, and `Procfile` are present
- Verify `backend/package.json` exists
- Check that all scripts in package.json are valid

### Port Issues

**Symptom:** Application fails to start or Railway shows "Application failed to respond"

**Solution:**
- Railway automatically sets the `PORT` environment variable
- The backend uses `process.env.PORT || 5000`
- Ensure your code listens on `0.0.0.0`, not `localhost`

If needed, modify `backend/server.js`:
```javascript
app.listen(PORT, '0.0.0.0', () => {
  console.log(`BizManager API running on port ${PORT}`);
});
```

### CORS Errors

**Symptom:** Frontend can't connect to backend API

**Solution:**
- Set `FRONTEND_URL` environment variable in Railway to your frontend URL
- Example: `https://your-app.vercel.app`
- Ensure there's no trailing slash
- Redeploy after changing environment variables

---

## Monitoring and Logs

### View Logs
1. Open your Railway project
2. Click on your service
3. Navigate to **"Deployments"** tab
4. Click on the latest deployment
5. View real-time logs in the **"Build Logs"** and **"Deploy Logs"** tabs

### Health Check
Your backend includes a health check endpoint:
```bash
curl https://your-app.up.railway.app/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-03-31T08:20:00.000Z"
}
```

---

## Full Deployment Architecture

```
┌─────────────────────────────────────────┐
│  Frontend (Vercel/Netlify/Cloudflare)  │
│  React + Vite + Tailwind CSS            │
│  https://your-app.vercel.app            │
└─────────────┬───────────────────────────┘
              │
              │ HTTPS API Calls
              │
┌─────────────▼───────────────────────────┐
│  Backend (Railway.app)                  │
│  Express.js + Node.js                   │
│  https://your-app.up.railway.app        │
│                                          │
│  ┌────────────────────────────────┐    │
│  │  SQLite Database (Ephemeral)   │    │
│  │  backend/database/bizmanager.db │    │
│  └────────────────────────────────┘    │
└──────────────────────────────────────────┘
```

---

## Upgrading to PostgreSQL (Recommended for Production)

For production deployments, migrate from SQLite to PostgreSQL:

### 1. Add PostgreSQL to Railway
1. In Railway dashboard, click **"New"** → **"Database"** → **"PostgreSQL"**
2. Railway will automatically create a PostgreSQL database
3. Copy the `DATABASE_URL` connection string

### 2. Update Backend Dependencies
```bash
cd backend
npm install pg
npm uninstall better-sqlite3
```

### 3. Modify Database Connection
Replace `backend/database/db.js` with PostgreSQL connection code (not covered in this guide).

### 4. Update Environment Variable
Add to Railway environment variables:
- `DATABASE_URL`: Your PostgreSQL connection string (automatically provided by Railway)

---

## Cost Considerations

- **Railway Free Tier:** $5 worth of usage per month
- **Typical usage:** Small apps usually stay within free tier
- **Monitor usage:** Check Railway dashboard regularly
- **Sleep after inactivity:** Enable to reduce costs (app wakes on first request)

---

## Additional Resources

- [Railway Documentation](https://docs.railway.app/)
- [Railway Nixpacks](https://nixpacks.com/)
- [Vercel Frontend Deployment](VERCEL_DEPLOYMENT.md)
- [BizManager Developer Guide](docs/DEVELOPER_GUIDE.md)

---

## Need Help?

If you encounter issues:
1. Check Railway's build and deployment logs
2. Review this troubleshooting guide
3. Check the [Railway Discord](https://discord.gg/railway) for community support
4. Open an issue on the BizManager GitHub repository
