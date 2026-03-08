# BizManager

**Local Business Management Software** — A full-stack application for managing customers, inventory, sales, expenses, and employees.

## Prerequisites

- Node.js v18+
- npm v9+

## Quick Start

```bash
# 1. Clone the repository
git clone <repo-url>
cd bizmanager

# 2. Backend setup
cd backend
cp .env.example .env          # Edit JWT secrets and other settings
npm install
npm run setup                  # Initialize DB and default admin user
npm run dev                    # Starts on http://localhost:5000

# 3. Frontend setup (new terminal)
cd frontend
npm install
npm run dev                    # Starts on http://localhost:5173
```

## Default Login

| Email | Password |
|-------|----------|
| admin@bizmanager.local | admin123 |

> ⚠️ **Change the default password after first login!**

## Production Build

```bash
# Backend
cd backend && npm start

# Frontend
cd frontend && npm run build   # Output in dist/
```

## User Roles

| Feature | Admin | Manager | Employee |
|---------|-------|---------|----------|
| Dashboard | ✅ | ✅ | ✅ |
| Customers (view) | ✅ | ✅ | ✅ |
| Customers (create/edit/delete) | ✅ | ✅ | ❌ |
| Inventory | ✅ | ✅ | ❌ |
| Sales (view/create) | ✅ | ✅ | ✅ |
| Sales (update status) | ✅ | ✅ | ❌ |
| Sales (delete) | ✅ | ❌ | ❌ |
| Expenses | ✅ | ✅ | ❌ |
| Employees | ✅ | ✅ | ❌ |
| Reports | ✅ | ✅ | ❌ |
| Settings | ✅ | ❌ | ❌ |
| Backup | ✅ | ❌ | ❌ |

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Backend port | `5000` |
| `NODE_ENV` | Environment | `development` |
| `JWT_SECRET` | JWT signing secret | (required) |
| `JWT_REFRESH_SECRET` | Refresh token secret | (required) |
| `JWT_EXPIRES_IN` | Access token TTL | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token TTL | `7d` |
| `DB_PATH` | SQLite database path | `./database/bizmanager.db` |
| `FRONTEND_URL` | CORS allowed origin | `http://localhost:5173` |

## Database Backup

Use the Settings page in the application to download a backup, or use the API:

```bash
curl -H "Authorization: Bearer <token>" http://localhost:5000/api/backup/download -o backup.db
```

## Architecture

```
Frontend (React/Vite/Tailwind)
    │
    ├── axios (with token refresh interceptor)
    │
    ▼
Backend (Express.js)
    │
    ├── JWT Authentication
    ├── Role-based Authorization
    ├── Input Validation
    │
    ▼
SQLite (better-sqlite3)
    └── bizmanager.db
```
