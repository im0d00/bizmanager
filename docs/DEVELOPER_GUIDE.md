# BizManager — Developer Guide

A complete technical reference for developers who want to install, extend, contribute to, or deploy BizManager.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Project Structure](#2-project-structure)
3. [Local Development Setup](#3-local-development-setup)
4. [Environment Variables](#4-environment-variables)
5. [Database](#5-database)
6. [Backend — API Reference](#6-backend--api-reference)
   - [Authentication](#61-authentication)
   - [Dashboard](#62-dashboard)
   - [Customers](#63-customers)
   - [Products](#64-products)
   - [Sales](#65-sales)
   - [Expenses](#66-expenses)
   - [Employees](#67-employees)
   - [Reports](#68-reports)
   - [Settings](#69-settings)
   - [Backup](#610-backup)
7. [Authentication Flow](#7-authentication-flow)
8. [Role-Based Access Control](#8-role-based-access-control)
9. [Frontend Architecture](#9-frontend-architecture)
10. [Adding a New Feature](#10-adding-a-new-feature)
11. [Production Deployment](#11-production-deployment)
12. [Backup Automation](#12-backup-automation)
13. [Contributing](#13-contributing)

---

## 1. Architecture Overview

```
Browser (http://localhost:5173)
         │
         │  React 18 + Vite + Tailwind CSS
         │  Zustand (state management)
         │  axios (HTTP client with token-refresh interceptor)
         │
         │  Vite dev-server proxies /api → http://localhost:5000
         │
         ▼
Express.js API (http://localhost:5000)
         │
         ├── helmet  (security headers)
         ├── cors    (origin whitelist via FRONTEND_URL)
         ├── morgan  (HTTP request logging)
         ├── express-rate-limit (auth: 20 req/15 min, api: 200 req/min)
         ├── express-validator  (input validation)
         │
         ├── JWT Authentication
         │     access token  → 15 m TTL  (signed with JWT_SECRET)
         │     refresh token → 7 d TTL   (signed with JWT_REFRESH_SECRET)
         │     stored in SQLite refresh_tokens table
         │
         ├── Role-Based Authorization (admin / manager / employee)
         │
         ▼
SQLite — better-sqlite3 (synchronous, embedded)
         └── backend/database/bizmanager.db
```

**Key design choices:**

- **SQLite** — zero-config, file-based database. Perfect for single-server / local deployments. No separate database process needed.
- **Synchronous DB layer** — `better-sqlite3` is fully synchronous, which simplifies the Express route handlers (no `async/await` needed for queries).
- **JWT with refresh tokens** — short-lived access tokens (15 min) plus long-lived refresh tokens (7 days) stored server-side. Tokens are rotated on every refresh.
- **Vite proxy** — in development the frontend's `/api` requests are proxied by Vite's dev server, so no CORS configuration is needed during development (CORS only matters for production deployments).

---

## 2. Project Structure

```
bizmanager/
├── README.md
├── start-linux.sh            # one-click startup for Linux/macOS
├── start-windows.bat         # one-click startup for Windows
├── docs/
│   ├── USER_GUIDE.md         # end-user documentation
│   └── DEVELOPER_GUIDE.md    # this file
│
├── backend/
│   ├── server.js             # Express app entry point
│   ├── package.json
│   ├── .env.example          # template for environment variables
│   ├── scripts/
│   │   └── init-env.js       # cross-platform .env initialiser
│   ├── database/
│   │   ├── schema.sql        # DDL — all CREATE TABLE / INSERT statements
│   │   ├── db.js             # opens the SQLite connection + runs schema
│   │   └── setup.js          # one-time seed: creates the default admin user
│   ├── middleware/
│   │   ├── auth.js           # authenticate() and authorize() middleware
│   │   ├── errorHandler.js   # global Express error handler
│   │   └── validate.js       # wraps express-validator result checking
│   ├── routes/               # thin router files — only wiring
│   │   ├── auth.js
│   │   ├── backup.js
│   │   ├── customers.js
│   │   ├── dashboard.js
│   │   ├── employees.js
│   │   ├── expenses.js
│   │   ├── products.js
│   │   ├── reports.js
│   │   ├── sales.js
│   │   └── settings.js
│   └── controllers/          # business logic
│       ├── authController.js
│       ├── backupController.js
│       ├── customerController.js
│       ├── dashboardController.js
│       ├── employeeController.js
│       ├── expenseController.js
│       ├── productController.js
│       ├── reportController.js
│       ├── saleController.js
│       └── settingsController.js
│
└── frontend/
    ├── index.html
    ├── vite.config.js        # Vite + /api proxy config
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── package.json
    └── src/
        ├── main.jsx          # React + Router entry point
        ├── App.jsx           # route definitions + auth guard
        ├── index.css         # Tailwind directives + custom CSS classes
        ├── api/
        │   └── axios.js      # axios instance with token-refresh interceptor
        ├── store/
        │   ├── authStore.js  # Zustand store — user / login / logout
        │   └── appStore.js   # Zustand store — dark mode / notifications / confirm modal
        ├── hooks/
        │   └── useApi.js     # thin hook wrapping api calls with loading/error state
        ├── utils/
        │   └── format.js     # formatCurrency / formatDate / formatDateTime
        ├── components/
        │   ├── Layout.jsx
        │   ├── Sidebar.jsx
        │   ├── Header.jsx
        │   ├── DataTable.jsx
        │   ├── Modal.jsx
        │   ├── ConfirmModal.jsx
        │   ├── NotificationContainer.jsx
        │   └── StatsCard.jsx
        └── pages/
            ├── Login.jsx
            ├── Dashboard.jsx
            ├── Customers.jsx
            ├── Products.jsx
            ├── Sales.jsx
            ├── Expenses.jsx
            ├── Employees.jsx
            ├── Reports.jsx
            └── Settings.jsx
```

---

## 3. Local Development Setup

### Prerequisites

| Tool | Minimum version | Notes |
|------|-----------------|-------|
| Node.js | **18.11** | Required for `node --watch` |
| npm | **9** | Bundled with Node.js LTS |
| C++ build tools | — | Required by `better-sqlite3` |

**Install C++ build tools:**

- **Windows:** `npm install -g windows-build-tools` (run as Administrator) *or* install [Visual C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
- **Ubuntu/Debian:** `sudo apt install build-essential python3`
- **Fedora/RHEL:** `sudo dnf install gcc-c++ make python3`
- **macOS:** `xcode-select --install`

### Step-by-step

```bash
# 1. Clone the repository
git clone <repo-url>
cd bizmanager

# 2. Set up the backend
cd backend
npm install           # installs all dependencies and compiles better-sqlite3
npm run init          # copies .env.example → .env  (cross-platform Node.js script)
                      # IMPORTANT: open .env and set your own JWT secrets!
npm run setup         # creates the SQLite database and default admin account

# 3. Set up the frontend (new terminal)
cd ../frontend
npm install

# 4. Start both servers
# Terminal A (backend):
cd backend && npm run dev   # nodemon-like: restarts on file changes (node --watch)

# Terminal B (frontend):
cd frontend && npm run dev  # Vite HMR dev server
```

Open **http://localhost:5173** — Vite proxies all `/api` requests to the backend at port 5000.

### One-click alternatives

```bash
# Linux / macOS
bash start-linux.sh

# Windows (CMD or double-click)
start-windows.bat
```

---

## 4. Environment Variables

All variables live in `backend/.env` (copy from `.env.example`).

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Port the Express server listens on | `5000` |
| `NODE_ENV` | `development` or `production` | `development` |
| `JWT_SECRET` | **Must change** — signs access tokens | placeholder |
| `JWT_REFRESH_SECRET` | **Must change** — signs refresh tokens | placeholder |
| `JWT_EXPIRES_IN` | Access token lifetime | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token lifetime | `7d` |
| `DB_PATH` | Path to the SQLite file (relative to `backend/`) | `./database/bizmanager.db` |
| `FRONTEND_URL` | CORS origin whitelist | `http://localhost:5173` |

> **Security:** Use long random strings for JWT secrets in production.  
> Generate them with: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`

---

## 5. Database

### Schema summary

| Table | Purpose |
|-------|---------|
| `users` | Login accounts with hashed passwords and roles |
| `refresh_tokens` | Server-side storage of refresh tokens (invalidated on logout) |
| `settings` | Key-value store for business configuration |
| `categories` | Product categories |
| `products` | Inventory items with price, cost, and stock |
| `customers` | Customer contact records |
| `sales` | Invoice headers (totals, status, customer link) |
| `sale_items` | Individual line items within a sale |
| `expenses` | Business expense entries |
| `employees` | Staff records (optionally linked to a `users` row) |
| `notifications` | Per-user notification records (reserved for future use) |

### Schema file location

`backend/database/schema.sql` — every `CREATE TABLE` uses `IF NOT EXISTS` so the file is safe to re-run on an existing database.

### Resetting the database

```bash
# Delete the database file and re-run setup
rm backend/database/bizmanager.db
cd backend && npm run setup
```

### Running raw queries (development)

```bash
# Linux / macOS
sqlite3 backend/database/bizmanager.db

# Windows (if sqlite3 is installed)
sqlite3 backend\database\bizmanager.db
```

### Migrations

There is no migration framework included. For schema changes:

1. Add the DDL to `schema.sql` using `ALTER TABLE` or a new `CREATE TABLE IF NOT EXISTS`.
2. If adding columns to existing tables, run the `ALTER TABLE` statement manually on deployed databases *before* deploying new code.

---

## 6. Backend — API Reference

All API routes are prefixed with `/api`.  
Authenticated routes require the `Authorization: Bearer <accessToken>` header.

### HTTP status codes used

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (validation error or business rule) |
| 401 | Unauthenticated (missing or expired token) |
| 403 | Forbidden (insufficient role) |
| 404 | Resource not found |
| 409 | Conflict (duplicate unique field) |
| 500 | Internal Server Error |

---

### 6.1 Authentication

Base path: `/api/auth`

#### POST /api/auth/login

Authenticate a user and obtain JWT tokens.

**Request body:**
```json
{
  "email": "admin@bizmanager.local",
  "password": "admin123"
}
```

**Response 200:**
```json
{
  "accessToken": "<jwt>",
  "refreshToken": "<jwt>",
  "user": {
    "id": "...",
    "name": "Admin",
    "email": "admin@bizmanager.local",
    "role": "admin",
    "avatar_url": null
  }
}
```

---

#### POST /api/auth/register

Create a new user account. No authentication required.

**Request body:**
```json
{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "password": "securepassword",
  "role": "manager"
}
```

`role` is optional; defaults to `"employee"`. Accepted values: `admin`, `manager`, `employee`.

**Response 201:** Same shape as `/login`.

---

#### POST /api/auth/refresh

Exchange a valid refresh token for a new access/refresh token pair.  
The old refresh token is deleted (rotation).

**Request body:**
```json
{ "refreshToken": "<jwt>" }
```

**Response 200:**
```json
{
  "accessToken": "<new-jwt>",
  "refreshToken": "<new-jwt>"
}
```

---

#### POST /api/auth/logout

Invalidate a refresh token.

**Request body:**
```json
{ "refreshToken": "<jwt>" }
```

**Response 200:** `{ "message": "Logged out" }`

---

#### GET /api/auth/me  🔒

Return the currently authenticated user's profile.

**Response 200:**
```json
{
  "id": "...",
  "name": "Admin",
  "email": "admin@bizmanager.local",
  "role": "admin",
  "is_active": 1,
  "avatar_url": null
}
```

---

### 6.2 Dashboard

#### GET /api/dashboard  🔒

Returns statistics and chart data for the home screen.

**Response 200:**
```json
{
  "stats": {
    "today_revenue": 1234.50,
    "month_revenue": 45000.00,
    "month_expenses": 12000.00,
    "net_profit": 33000.00,
    "total_customers": 120,
    "total_products": 45,
    "low_stock_count": 3
  },
  "low_stock_items": [ { "id": "...", "name": "...", "sku": "...", "stock": 2, "low_stock_at": 10 } ],
  "recent_sales": [ { "id": "...", "invoice_number": "INV-00001", "customer_name": "...", "total": 99.00, "status": "paid", "created_at": "..." } ],
  "charts": {
    "daily_sales":   [ { "date": "2025-06-01", "revenue": 500.00 } ],
    "monthly_sales": [ { "month": "06", "revenue": 45000.00 } ]
  }
}
```

---

### 6.3 Customers

Base path: `/api/customers` — all routes require authentication.

#### GET /api/customers

List customers with optional search and pagination.

**Query params:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `search` | string | `""` | Filter by name, email, or phone |
| `page` | integer | `1` | Page number |
| `limit` | integer | `20` | Records per page |

**Response 200:**
```json
{
  "customers": [ { "id": "...", "name": "...", "email": "...", "phone": "...", "address": "...", "total_spent": 500.00, "created_at": "..." } ],
  "total": 42
}
```

---

#### GET /api/customers/:id

Get a single customer with their 10 most recent sales.

**Response 200:**
```json
{
  "id": "...",
  "name": "Alice Jones",
  "email": "alice@example.com",
  "phone": "555-1234",
  "address": "123 Main St",
  "notes": null,
  "total_spent": 2300.00,
  "recent_sales": [ { "id": "...", "invoice_number": "INV-00010", ... } ]
}
```

---

#### POST /api/customers  🔒 admin, manager

Create a new customer.

**Request body:**
```json
{
  "name": "Bob Martin",
  "email": "bob@example.com",
  "phone": "555-0000",
  "address": "456 Oak Ave",
  "notes": "VIP customer"
}
```

Only `name` is required. **Response 201:** the created customer object.

---

#### PUT /api/customers/:id  🔒 admin, manager

Update a customer. Same body as POST. **Response 200:** updated customer object.

---

#### DELETE /api/customers/:id  🔒 admin, manager

Delete a customer. **Response 200:** `{ "message": "Customer deleted" }`

---

### 6.4 Products

Base path: `/api/products` — all routes require authentication.

#### GET /api/products

List products.

**Query params:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `search` | string | `""` | Filter by name or SKU |
| `page` | integer | `1` | Page number |
| `limit` | integer | `20` | Records per page |
| `category_id` | string | — | Filter by category UUID |
| `low_stock` | `"true"` | — | Show only low-stock items |

**Response 200:**
```json
{
  "products": [ { "id": "...", "name": "...", "sku": "...", "price": 9.99, "cost": 4.00, "stock": 50, "low_stock_at": 10, "category_name": "General", "is_active": 1 } ],
  "total": 45,
  "categories": [ { "id": "...", "name": "General" } ]
}
```

---

#### GET /api/products/low-stock

Returns all active products whose `stock <= low_stock_at`. **Response 200:** `{ "products": [...] }`

---

#### GET /api/products/:id

Get a single product. **Response 200:** product object with `category_name`.

---

#### POST /api/products  🔒 admin, manager

Create a product.

```json
{
  "name": "Widget A",
  "sku": "WGT-001",
  "description": "A useful widget",
  "price": 19.99,
  "cost": 8.00,
  "stock": 100,
  "low_stock_at": 15,
  "category_id": "<uuid>",
  "is_active": 1
}
```

`name` and `price` are required. **Response 201:** created product.

---

#### PUT /api/products/:id  🔒 admin, manager

Update a product. Same body as POST. **Response 200:** updated product.

---

#### DELETE /api/products/:id  🔒 admin only

Delete a product. **Response 200:** `{ "message": "Product deleted" }`

---

#### POST /api/products/categories  🔒 admin, manager

Create a category.

```json
{ "name": "Electronics" }
```

**Response 201:** `{ "id": "...", "name": "Electronics" }`

---

### 6.5 Sales

Base path: `/api/sales` — all routes require authentication.

#### GET /api/sales

List sales.

**Query params:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `search` | string | `""` | Filter by invoice number or customer name |
| `page` | integer | `1` | Page number |
| `limit` | integer | `20` | Records per page |
| `status` | string | — | `paid` / `pending` / `cancelled` |
| `from` | date | — | `YYYY-MM-DD` — start date |
| `to` | date | — | `YYYY-MM-DD` — end date |

**Response 200:**
```json
{
  "sales": [ { "id": "...", "invoice_number": "INV-00001", "customer_name": "Alice", "total": 150.00, "status": "paid", "created_at": "..." } ],
  "total": 200
}
```

---

#### GET /api/sales/:id

Get a single sale with its line items, customer info, and current settings (for invoice rendering).

**Response 200:**
```json
{
  "id": "...",
  "invoice_number": "INV-00001",
  "customer_name": "Alice",
  "customer_email": "alice@example.com",
  "customer_phone": "555-1234",
  "subtotal": 100.00,
  "tax_amount": 10.00,
  "discount": 5.00,
  "total": 105.00,
  "status": "paid",
  "notes": null,
  "created_at": "...",
  "items": [
    { "id": "...", "product_id": "...", "name": "Widget A", "price": 50.00, "cost": 20.00, "quantity": 2, "subtotal": 100.00 }
  ],
  "settings": { "business_name": "My Business", "currency_symbol": "$", "tax_rate": "10", ... }
}
```

---

#### POST /api/sales  🔒 all authenticated users

Create a sale. Stock is decremented and customer `total_spent` is updated within a transaction.

**Request body:**
```json
{
  "customer_id": "<uuid or null>",
  "items": [
    { "product_id": "<uuid>", "quantity": 2 }
  ],
  "discount": 5.00,
  "notes": "Rush order"
}
```

`items` is required and must not be empty. Price is taken from the product record at the time of sale.

**Response 201:** the created sale (header only; use GET /:id for items).

**Error 400:** returned if any product has insufficient stock.

---

#### PATCH /api/sales/:id/status  🔒 admin, manager

Update sale status.

```json
{ "status": "cancelled" }
```

**Response 200:** updated sale object.

---

#### DELETE /api/sales/:id  🔒 admin only

Delete a sale. Stock is restored for each line item. Customer `total_spent` is decremented if the sale was `paid`.

**Response 200:** `{ "message": "Sale deleted" }`

---

### 6.6 Expenses

Base path: `/api/expenses` — requires admin or manager role.

#### GET /api/expenses

List expenses.

**Query params:** `search`, `page`, `limit`, `category`, `from`, `to`

**Response 200:**
```json
{
  "expenses": [ { "id": "...", "title": "Electricity", "amount": 120.00, "category": "Utilities", "date": "2025-06-01", "notes": null } ],
  "total": 30,
  "totalAmount": 4500.00,
  "categories": ["General", "Salaries", "Utilities"]
}
```

---

#### POST /api/expenses

Create an expense.

```json
{
  "title": "Office supplies",
  "amount": 45.00,
  "category": "General",
  "date": "2025-06-05",
  "notes": "Pens, paper"
}
```

`title` and `amount` are required. **Response 201:** created expense.

---

#### PUT /api/expenses/:id

Update an expense. Same body as POST. **Response 200:** updated expense.

---

#### DELETE /api/expenses/:id

Delete an expense. **Response 200:** `{ "message": "Expense deleted" }`

---

### 6.7 Employees

Base path: `/api/employees` — requires admin or manager role.

#### GET /api/employees

List employees with search and pagination. **Response 200:** `{ "employees": [...], "total": N }`

---

#### POST /api/employees

Create an employee record and optionally a linked user account.

```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "phone": "555-9999",
  "role": "employee",
  "department": "Sales",
  "salary": 3500.00,
  "hire_date": "2025-01-15",
  "notes": "",
  "create_user": true,
  "password": "initialPassword1"
}
```

If `create_user` is `true` and the email doesn't already have a login account, a new `users` row is created with the given password (hashed with bcrypt, cost 12).

**Response 201:** created employee object.

---

#### PUT /api/employees/:id

Update an employee. Does **not** update the linked user account password.

```json
{
  "name": "Jane Doe",
  "role": "manager",
  "department": "Sales",
  "salary": 4000.00,
  "is_active": 1
}
```

**Response 200:** updated employee object.

---

#### DELETE /api/employees/:id  🔒 admin only

Delete an employee record. The linked user account is **not** deleted. **Response 200:** `{ "message": "Employee deleted" }`

---

### 6.8 Reports

Base path: `/api/reports` — requires admin or manager role.

#### GET /api/reports/summary

Financial summary for a date range.

**Query params:** `from` (date), `to` (date). Defaults to current month.

**Response 200:**
```json
{
  "revenue": 45000.00,
  "expenses": 12000.00,
  "cogs": 18000.00,
  "gross_profit": 27000.00,
  "net_profit": 33000.00,
  "today_revenue": 1200.00,
  "total_customers": 120,
  "total_products": 45,
  "low_stock_count": 3
}
```

---

#### GET /api/reports/daily-sales

**Query params:** `days` (integer, default `30`)

**Response 200:** `{ "data": [ { "date": "2025-06-01", "revenue": 800.00, "count": 5 } ] }`

---

#### GET /api/reports/monthly-sales

**Query params:** `year` (e.g. `"2025"`, defaults to current year)

**Response 200:** `{ "data": [ { "month": "06", "revenue": 45000.00, "count": 120 } ] }`

---

#### GET /api/reports/top-products

**Query params:** `from`, `to`, `limit` (default `10`)

**Response 200:** `{ "data": [ { "product_id": "...", "name": "Widget A", "quantity": 50, "revenue": 999.50, "cost": 400.00 } ] }`

---

#### GET /api/reports/top-customers

**Response 200:** `{ "data": [ { "id": "...", "name": "Alice", "email": "...", "total_spent": 5000.00 } ] }`

---

#### GET /api/reports/expenses-by-category

**Query params:** `from`, `to`. Defaults to current month.

**Response 200:** `{ "data": [ { "category": "Utilities", "amount": 600.00, "count": 3 } ] }`

---

### 6.9 Settings

Base path: `/api/settings`

#### GET /api/settings  🔒

Returns all settings as a flat JSON object:

```json
{
  "business_name": "My Business",
  "address": "",
  "phone": "",
  "email": "",
  "currency": "USD",
  "currency_symbol": "$",
  "tax_rate": "10",
  "tax_name": "Tax",
  "invoice_prefix": "INV-",
  "low_stock_threshold": "10"
}
```

---

#### PUT /api/settings  🔒 admin only

Update one or more settings. Sends any subset of the keys above.

```json
{
  "business_name": "Acme Corp",
  "tax_rate": "15",
  "currency_symbol": "£"
}
```

Uses `INSERT OR REPLACE` (upsert) so new keys can also be added.

**Response 200:** full updated settings object.

---

### 6.10 Backup

Base path: `/api/backup` — requires admin role.

#### GET /api/backup/download

Streams a `.db` file backup using `better-sqlite3`'s built-in `backup()` API (online backup; no server restart needed).

**Response 200:** `application/octet-stream` binary file download.

---

#### GET /api/backup/list

Lists backup files currently present in the database directory.

**Response 200:**
```json
{
  "backups": [
    { "name": "backup-2025-06-01T12-00-00-000Z.db", "size": 204800, "created_at": "2025-06-01T12:00:00.000Z" }
  ]
}
```

---

### Health check

#### GET /api/health

No authentication required. Returns server status.

**Response 200:** `{ "status": "ok", "timestamp": "2025-06-01T12:00:00.000Z" }`

---

## 7. Authentication Flow

```
Client                                     Server
  │                                           │
  │── POST /api/auth/login ─────────────────►│
  │◄─ { accessToken, refreshToken, user } ───│
  │                                           │
  │── GET /api/... + Bearer <accessToken> ──►│  (every request)
  │◄─ 200 data ──────────────────────────────│
  │                                           │
  │  (access token expires after 15 minutes) │
  │                                           │
  │── GET /api/... + Bearer <expired> ──────►│
  │◄─ 401 { code: "TOKEN_EXPIRED" } ─────────│
  │                                           │
  │── POST /api/auth/refresh ────────────────►│
  │   { refreshToken: <7-day token> }         │
  │◄─ { accessToken, refreshToken } ──────────│  (old refresh token deleted)
  │                                           │
  │── Retry original request ───────────────►│
  │◄─ 200 data ──────────────────────────────│
  │                                           │
  │── POST /api/auth/logout ────────────────►│
  │   { refreshToken }                        │
  │◄─ 200 { message: "Logged out" } ──────────│  (refresh token deleted)
```

The `axios.js` interceptor in the frontend handles the refresh flow automatically. Concurrent requests that fail with `TOKEN_EXPIRED` are queued and replayed after the new token is obtained.

---

## 8. Role-Based Access Control

The `authorize(...roles)` middleware factory is applied in route files:

```js
// Only admins can delete a product
router.delete('/:id', authenticate, authorize('admin'), ctrl.remove);

// Admins and managers can create/edit
router.post('/', authenticate, authorize('admin', 'manager'), ctrl.create);

// All authenticated users can read
router.get('/', authenticate, ctrl.getAll);
```

`authenticate` populates `req.user` from the JWT. `authorize` then checks `req.user.role`.

To add a new role:
1. Update the `CHECK` constraint in `schema.sql`: `CHECK(role IN ('admin','manager','employee','supervisor'))`.
2. Run the `ALTER TABLE` statement on deployed databases.
3. Add the role string to the relevant `authorize()` calls.

---

## 9. Frontend Architecture

### State management — Zustand

Two stores:

| Store | State |
|-------|-------|
| `authStore` | `user`, `isAuthenticated`, `login()`, `logout()`, `checkAuth()`, `hasRole()` |
| `appStore` | `darkMode`, `sidebarOpen`, `notifications`, `settings`, `confirm` modal |

`authStore` is persisted to `localStorage` via `zustand/middleware/persist`.

### Token storage

Tokens are stored in `localStorage`:
- `access_token` — short-lived JWT
- `refresh_token` — long-lived JWT

### API client

`src/api/axios.js` creates an `axios` instance with:
- `baseURL: '/api'` (resolved to `http://localhost:5000/api` via Vite proxy)
- `timeout: 30000`
- **Request interceptor** — attaches `Authorization: Bearer <token>` header
- **Response interceptor** — handles `TOKEN_EXPIRED` by calling `/api/auth/refresh` and retrying

### Routing

React Router v6. All authenticated routes are wrapped in `<Layout>` which renders `<Sidebar>` + `<Header>` + `<Outlet>`.

### Dark mode

Tailwind's `darkMode: 'class'` strategy. The `toggleDarkMode()` action in `appStore` adds/removes the `dark` class on `document.documentElement`.

### Notifications

`appStore.addNotification({ type, message })` adds a toast that disappears after 5 seconds.  
`<NotificationContainer>` renders the stack of toasts.

### Confirm dialogs

`appStore.showConfirm({ title, message })` returns a Promise that resolves `true`/`false`.  
`<ConfirmModal>` renders the dialog.

---

## 10. Adding a New Feature

Here is a step-by-step walkthrough to add a hypothetical **Suppliers** module.

### Step 1 — Database schema

Add to `backend/database/schema.sql`:

```sql
CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

Run `npm run setup` (or apply the `ALTER TABLE` manually on an existing database).

### Step 2 — Controller

Create `backend/controllers/supplierController.js`:

```js
const db = require('../database/db');

const getAll = (req, res, next) => {
  try {
    const { search = '', page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const like = `%${search}%`;
    const suppliers = db.prepare(
      `SELECT * FROM suppliers WHERE name LIKE ? OR email LIKE ? ORDER BY name ASC LIMIT ? OFFSET ?`
    ).all(like, like, parseInt(limit), offset);
    const { total } = db.prepare(
      `SELECT COUNT(*) as total FROM suppliers WHERE name LIKE ? OR email LIKE ?`
    ).get(like, like);
    res.json({ suppliers, total });
  } catch (err) {
    next(err);
  }
};

// ... create, update, remove (follow same pattern as customerController.js)

module.exports = { getAll };
```

### Step 3 — Route

Create `backend/routes/suppliers.js`:

```js
const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/supplierController');

router.use(authenticate);
router.get('/', ctrl.getAll);
router.post('/', authorize('admin', 'manager'), ctrl.create);
router.put('/:id', authorize('admin', 'manager'), ctrl.update);
router.delete('/:id', authorize('admin'), ctrl.remove);

module.exports = router;
```

### Step 4 — Register route in server.js

```js
app.use('/api/suppliers', apiLimiter, require('./routes/suppliers'));
```

### Step 5 — Frontend page

Create `frontend/src/pages/Suppliers.jsx` following the pattern of `Customers.jsx`.

### Step 6 — Add to sidebar and router

In `frontend/src/components/Sidebar.jsx`, add a new nav item.  
In `frontend/src/App.jsx`, add:

```jsx
import Suppliers from './pages/Suppliers';
// ...
<Route path="/suppliers" element={<Suppliers />} />
```

---

## 11. Production Deployment

### Backend

```bash
cd backend
npm install --omit=dev   # install production dependencies only
npm start                # node server.js
```

Use a process manager to keep the server alive:

```bash
# pm2 (recommended)
npm install -g pm2
pm2 start server.js --name bizmanager-api
pm2 save
pm2 startup   # auto-start on reboot
```

### Frontend

```bash
cd frontend
npm install
npm run build    # outputs static files to frontend/dist/
```

Serve `frontend/dist/` with a static file server (nginx, Caddy, IIS, etc.).

**nginx example** (serves frontend + proxies API):

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    root /var/www/bizmanager/frontend/dist;
    index index.html;

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to the backend
    location /api {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Update `backend/.env`:

```
NODE_ENV=production
FRONTEND_URL=https://yourdomain.com
```

### Security checklist for production

- [ ] Set strong unique values for `JWT_SECRET` and `JWT_REFRESH_SECRET`
- [ ] Set `NODE_ENV=production`
- [ ] Set `FRONTEND_URL` to your actual domain
- [ ] Serve over HTTPS (use Let's Encrypt / Certbot)
- [ ] Restrict SQLite file permissions: `chmod 600 backend/database/bizmanager.db`
- [ ] Keep `backend/.env` out of version control (already in `.gitignore`)
- [ ] Set up regular automated backups (see next section)

---

## 12. Backup Automation

### Linux — cron job

```bash
# Edit crontab
crontab -e

# Run backup every day at 02:00
0 2 * * * curl -s -H "Authorization: Bearer <token>" \
  http://localhost:5000/api/backup/download \
  -o /backups/bizmanager-$(date +\%Y-\%m-\%d).db
```

Replace `<token>` with a long-lived admin token (or generate one programmatically).

### Windows — Task Scheduler

1. Open **Task Scheduler** → **Create Basic Task**.
2. Set trigger to **Daily**.
3. Action: **Start a program** → `powershell.exe`
4. Arguments:
   ```powershell
   -Command "Invoke-WebRequest -Headers @{Authorization='Bearer <token>'} -OutFile 'C:\Backups\bizmanager-$(Get-Date -Format yyyy-MM-dd).db' http://localhost:5000/api/backup/download"
   ```

### Simple file copy alternative

If the application is not running (e.g. during a maintenance window), simply copy the SQLite file:

```bash
# Linux
cp backend/database/bizmanager.db /backups/bizmanager-$(date +%Y-%m-%d).db

# Windows CMD
copy backend\database\bizmanager.db C:\Backups\bizmanager-%DATE%.db
```

---

## 13. Contributing

### Code style

- **Backend:** CommonJS modules (`require`/`module.exports`), no TypeScript, Express conventions.
- **Frontend:** ES modules, functional React components, hooks only (no class components), Tailwind utility classes.
- Follow the existing file and naming conventions in each layer.

### Branching

```
main         ← production-ready code
feature/<name>
fix/<name>
```

### Pull Request checklist

- [ ] Backend: does the new route follow the authenticate → authorize → controller pattern?
- [ ] Backend: are user inputs validated (express-validator or manual checks)?
- [ ] Frontend: does the page handle loading and error states?
- [ ] No secrets or database files committed.
- [ ] README / docs updated if user-facing behaviour changed.

### Running a quick smoke test

```bash
# Start backend
cd backend && npm run dev

# In another terminal — hit the health endpoint
curl http://localhost:5000/api/health
# Expected: {"status":"ok","timestamp":"..."}

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@bizmanager.local","password":"admin123"}'
```

---

*For end-user documentation on how to use the application day-to-day, see the [User Guide](USER_GUIDE.md).*
