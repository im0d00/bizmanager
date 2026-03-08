# BizManager

**Local Business Management Software** — A full-stack application for managing customers, inventory, sales, expenses, and employees.

Works on **Windows 10/11** and **Linux** (Ubuntu, Debian, Fedora, and other distros).

---

## Prerequisites

| Requirement | Windows | Linux |
|-------------|---------|-------|
| Node.js **≥ 18.11** | [nodejs.org](https://nodejs.org/) (LTS installer) | `sudo apt install nodejs npm` / [nvm](https://github.com/nvm-sh/nvm) |
| npm **≥ 9** | Included with Node.js | Included with Node.js |
| C++ Build Tools *(for `better-sqlite3`)* | See note below | `sudo apt install build-essential python3` |

> **Windows Build Tools note:** `better-sqlite3` is a native addon that must compile from source.
> Run this **once** in an Administrator PowerShell/CMD before the first `npm install`:
> ```powershell
> npm install --global windows-build-tools
> ```
> Or install [Visual C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) manually and reopen your terminal.

---

## Quick Start — One-Click Scripts

The easiest way to get started is to use the included startup scripts.
They install dependencies, set up the database, and launch both servers automatically.

### Windows

Double-click **`start-windows.bat`**, or run in CMD/PowerShell:

```cmd
start-windows.bat
```

### Linux / macOS

```bash
bash start-linux.sh
```

Both scripts open **http://localhost:5173** in your browser when ready.

---

## Manual Setup

If you prefer step-by-step control:

### 1 — Clone the repository

```bash
git clone <repo-url>
cd bizmanager
```

### 2 — Backend

```bash
cd backend
npm install
npm run init      # Creates .env from .env.example (works on Windows & Linux)
npm run setup     # Creates the SQLite database and default admin account
npm run dev       # Starts API server on http://localhost:5000
```

> **Windows CMD note:** `npm run init` uses a Node.js script, so it works identically on all platforms — no `cp` / `copy` needed.

### 3 — Frontend *(new terminal)*

```bash
cd frontend
npm install
npm run dev       # Starts dev server on http://localhost:5173
```

Open **http://localhost:5173** in your browser.

---

## Default Login

| Email | Password |
|-------|----------|
| admin@bizmanager.local | admin123 |

> ⚠️ **Change the default password after first login!**

---

## Production Build

```bash
# Backend (any platform)
cd backend
npm start

# Frontend — build static files
cd frontend
npm run build     # Output written to frontend/dist/
npm run preview   # Preview the production build locally
```

Serve `frontend/dist/` with any static-file host (nginx, IIS, Caddy, etc.) and point the backend at your domain via `FRONTEND_URL` in `.env`.

---

## Environment Variables (`backend/.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | API server port | `5000` |
| `NODE_ENV` | Environment (`development` / `production`) | `development` |
| `JWT_SECRET` | **Change this!** JWT signing secret | placeholder |
| `JWT_REFRESH_SECRET` | **Change this!** Refresh token secret | placeholder |
| `JWT_EXPIRES_IN` | Access token TTL | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token TTL | `7d` |
| `DB_PATH` | SQLite database file path | `./database/bizmanager.db` |
| `FRONTEND_URL` | Allowed CORS origin | `http://localhost:5173` |

> On **Windows** you can edit `.env` with Notepad, VS Code, or any text editor.

---

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

---

## Database Backup

Use the **Settings** page in the app to download a backup, or call the API directly:

```bash
# Linux / macOS / Windows PowerShell
curl -H "Authorization: Bearer <token>" http://localhost:5000/api/backup/download -o backup.db
```

---

## Troubleshooting

### `better-sqlite3` fails to install on Windows

Install the Visual C++ build tools first (see **Prerequisites** above), then retry:

```cmd
cd backend
npm install
```

### `node --watch` is not recognised

Your Node.js version is older than 18.11.  
Upgrade to the current LTS at [nodejs.org](https://nodejs.org/).

### Port already in use

Change `PORT` (backend) in `backend/.env` and update `FRONTEND_URL` to match.  
Change the frontend port in `frontend/vite.config.js` (`server.port`).

### Windows: "execution of scripts is disabled"

Run PowerShell as Administrator and allow scripts:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Then use the `.bat` file or run `npm` commands in CMD instead.

### Linux: `EACCES` permission error on `npm install -g`

Use [nvm](https://github.com/nvm-sh/nvm) to manage Node.js without root, or fix npm permissions:  
https://docs.npmjs.com/resolving-eacces-permissions-errors-when-installing-packages-globally

---

## Architecture

```
Browser (http://localhost:5173)
    │
    ├── React 18 + Vite + Tailwind CSS
    ├── Zustand state management
    ├── axios (auto token-refresh interceptor)
    │
    ▼
Express.js API (http://localhost:5000)
    │
    ├── JWT Authentication (access + refresh tokens)
    ├── Role-based Authorization
    ├── Input Validation (express-validator)
    │
    ▼
SQLite — better-sqlite3
    └── backend/database/bizmanager.db
```

