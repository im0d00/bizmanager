# BizManager — User Guide

This guide walks you through every feature of BizManager from the perspective of a daily business user.  
No technical knowledge is required.

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Dashboard](#2-dashboard)
3. [Customers](#3-customers)
4. [Products & Inventory](#4-products--inventory)
5. [Sales & Invoices](#5-sales--invoices)
6. [Expenses](#6-expenses)
7. [Employees](#7-employees)
8. [Reports](#8-reports)
9. [Settings](#9-settings)
10. [Database Backup](#10-database-backup)
11. [User Roles & Permissions](#11-user-roles--permissions)
12. [Tips & Best Practices](#12-tips--best-practices)

---

## 1. Getting Started

### Launching the application

Follow the installation steps in [README.md](../README.md) to start the backend and frontend servers.  
Once both are running, open your browser and go to:

```
http://localhost:5173
```

### Logging in

You will see the **Login** screen.

| Field | Value |
|-------|-------|
| Email | `admin@bizmanager.local` |
| Password | `admin123` |

> ⚠️ **Change your password immediately after first login** (Settings → Business Information is not a password change screen — ask your administrator to create a new account for you with a secure password, or use the register API described in the [Developer Guide](DEVELOPER_GUIDE.md)).

### Logging out

Click your **name / avatar** in the top-right corner of the header and choose **Log out**.  
Your session is securely ended and tokens are invalidated.

---

## 2. Dashboard

The Dashboard is the home screen. It loads automatically after login and gives you a real-time snapshot of your business.

### Key metrics (top row)

| Card | What it shows |
|------|---------------|
| **Today's Revenue** | Total of all *paid* sales created today |
| **Month Revenue** | Total paid sales for the current calendar month |
| **Total Customers** | Count of all customer records in the database |
| **Total Products** | Count of active (non-deleted) products |

### Second metrics row

| Card | What it shows |
|------|---------------|
| **Month Expenses** | Sum of all expense entries this month |
| **Net Profit** | Month Revenue minus Month Expenses |
| **Low Stock Items** | Number of products at or below their reorder threshold |

### Charts

- **Daily Sales (30 days)** — line chart showing paid revenue per day for the last 30 days.  
- **Monthly Revenue** — bar chart showing monthly revenue totals for the current year.

### Low Stock Alerts

Products whose current stock quantity is at or below their *Low Stock Threshold* appear here in yellow.  
Click through to **Products** to restock them.

### Recent Sales

The 10 most recent sales are listed with invoice number, customer name, date/time, status badge, and total amount.

---

## 3. Customers

Navigate to **Customers** in the left sidebar.

### Viewing customers

The table shows all customers with their name, email, phone, address, total spent, and creation date.

- **Search** — type in the search box to filter by name, email, or phone number in real time.
- **Pagination** — use the page controls at the bottom to move between pages (20 records per page by default).

### Adding a customer

1. Click **Add Customer** (top-right of the page).
2. Fill in the form:
   - **Name** *(required)* — full name or business name.
   - **Email** — contact email address.
   - **Phone** — phone number in any format.
   - **Address** — full postal address.
   - **Notes** — any additional internal notes.
3. Click **Save**.

### Editing a customer

1. Find the customer in the table.
2. Click the **pencil (edit) icon** in the Actions column.
3. Update the fields and click **Save**.

### Deleting a customer

1. Click the **trash icon** in the Actions column.
2. Confirm the deletion in the dialog.

> ⚠️ Deleting a customer does **not** delete their sales history. Sales retain the customer name at the time of the sale.

---

## 4. Products & Inventory

Navigate to **Products** in the left sidebar.

### Viewing products

The table shows all products with SKU, category, price, cost, stock level, and active status.

- **Search** — filter by product name or SKU.
- **Filter by category** — use the category dropdown to show only one category.
- **Low stock filter** — toggle to show only products below their reorder threshold.

### Product fields explained

| Field | Description |
|-------|-------------|
| **Name** | Display name of the product |
| **SKU** | Stock Keeping Unit — unique identifier code (e.g. `PROD-001`) |
| **Category** | Logical grouping (e.g. *Electronics*, *Clothing*) |
| **Description** | Optional free-text description |
| **Price** | Selling price per unit (used in sales) |
| **Cost** | Purchase/cost price per unit (used in profit calculations) |
| **Stock** | Current quantity on hand |
| **Low Stock Threshold** | When stock falls to or below this number, a warning is shown |
| **Active** | Toggle to hide/show the product without deleting it |

### Adding a product

1. Click **Add Product**.
2. Fill in all required fields (Name and Price are mandatory).
3. If the category you need doesn't exist, type a new one in the category field — you'll be prompted to create it.
4. Click **Save**.

### Editing a product

Click the **pencil icon** next to the product, make changes, and click **Save**.

> **Adjusting stock manually:** Edit the product and change the **Stock** field directly. Stock is also decremented automatically when a sale is created and restored if the sale is deleted.

### Deleting a product

Click the **trash icon** and confirm. Only admins can delete products.

### Product categories

Categories are created on the fly when you add or edit a product.  
They can also be pre-created via the API (see the Developer Guide).

---

## 5. Sales & Invoices

Navigate to **Sales** in the left sidebar.

### Understanding sales

Every sale generates an **invoice** with a unique number (e.g. `INV-00001`).  
A sale can be in one of three statuses:

| Status | Meaning |
|--------|---------|
| **paid** | Transaction is complete and revenue is counted |
| **pending** | Awaiting payment; revenue is *not* counted yet |
| **cancelled** | Voided; revenue is not counted |

### Viewing sales

The table lists all invoices with invoice number, customer, date, status, and total.

- **Search** — filter by invoice number or customer name.
- **Filter by status** — show only `paid`, `pending`, or `cancelled` sales.
- **Filter by date range** — use the *From* and *To* date pickers to narrow results.

### Creating a sale

1. Click **New Sale**.
2. Optionally select a **Customer** from the dropdown (leave blank for walk-in sales).
3. Add line items:
   - Click **Add Item** (or the `+` button).
   - Start typing in the product search field and select the product.
   - Set the **quantity**. The price is filled from the product's selling price automatically.
   - Repeat for more items.
4. Optionally enter a **Discount** amount (deducted from the total).
5. Add **Notes** if needed.
6. The tax is calculated automatically using the **Tax Rate** set in Settings.
7. Review the **Subtotal**, **Tax**, **Discount**, and **Total**.
8. Click **Create Sale**.

The invoice number is assigned automatically and stock is decremented for each product.

### Viewing a sale / invoice

Click the **eye icon** next to a sale to open a detailed view showing all line items, customer information, and totals.

### Changing sale status

Managers and admins can change a sale's status:

1. Open the sale detail view.
2. Click the status badge or the **Update Status** button.
3. Select the new status and confirm.

### Deleting a sale

Only admins can delete sales. Deleting a sale restores all product stock quantities.

---

## 6. Expenses

Navigate to **Expenses** in the left sidebar.

### Viewing expenses

The table shows all expenses with title, amount, category, date, and notes.

- **Search** — filter by expense title.
- **Filter by category** — dropdown populated from existing categories.
- **Date range** — filter by *From* / *To* date.
- **Total** — the sum of filtered expenses is shown below the table.

### Adding an expense

1. Click **Add Expense**.
2. Fill in the form:
   - **Title** *(required)* — short description (e.g. *Office supplies*, *Electricity bill*).
   - **Amount** *(required)* — monetary amount.
   - **Category** — free-text category (e.g. *Utilities*, *Salaries*, *Marketing*). Type a new one to create it.
   - **Date** — defaults to today.
   - **Notes** — optional detail.
3. Click **Save**.

### Editing / deleting an expense

Use the **pencil** or **trash** icons in the Actions column.

---

## 7. Employees

Navigate to **Employees** in the left sidebar.  
*(Requires Admin or Manager role.)*

### Viewing employees

The table shows all employee records with name, email, department, role, salary, hire date, and active status.

### Employee fields explained

| Field | Description |
|-------|-------------|
| **Name** | Full name |
| **Email** | Work email address |
| **Phone** | Contact number |
| **Role** | Job role within the business (free text, e.g. *Cashier*, *Supervisor*) |
| **Department** | Department name (e.g. *Sales*, *Warehouse*) |
| **Salary** | Monthly or annual salary figure |
| **Hire Date** | Date the employee joined |
| **Active** | Whether the employee is currently employed |
| **Create User Account** | If checked, creates a login account for this employee |
| **Password** | Only shown when *Create User Account* is checked |

### Adding an employee

1. Click **Add Employee**.
2. Fill in the required fields (Name is required).
3. If you want this employee to be able to log in to BizManager, enable **Create User Account** and set a password.
4. Click **Save**.

### Editing an employee

Click the **pencil icon**, update the fields, and click **Save**.

### Deactivating vs. deleting

- Set **Active** to `false` (unchecked) to deactivate an employee without removing their record.
- Click the **trash icon** to permanently delete (admin only).

---

## 8. Reports

Navigate to **Reports** in the left sidebar.  
*(Requires Admin or Manager role.)*

Reports give you analytical insights into your business performance.

### Summary Report

Shows key financial metrics for a selected date range:

| Metric | Calculation |
|--------|-------------|
| **Revenue** | Sum of all *paid* sales |
| **Expenses** | Sum of all expense entries |
| **Cost of Goods Sold (COGS)** | Sum of (cost × quantity) for all sold items |
| **Gross Profit** | Revenue − COGS |
| **Net Profit** | Revenue − Total Expenses |

Use the **From** / **To** date pickers to change the period (defaults to the current month).

### Daily Sales

A line chart and data table showing paid revenue and sale count for each day over the last 30 days (configurable).

### Monthly Sales

A bar chart showing revenue and sale count for each month of a chosen year.

### Top Products

Lists the top 10 best-selling products by revenue for the selected period, showing quantity sold, revenue, and cost.

### Top Customers

Lists the top 10 customers by total spend (lifetime).

### Expenses by Category

Pie/bar breakdown of expenses by category for the selected period.

---

## 9. Settings

Navigate to **Settings** in the left sidebar.  
*(Requires Admin role.)*

### Business Information

| Field | Notes |
|-------|-------|
| **Business Name** | Appears on invoices |
| **Phone** | Business contact number |
| **Email** | Business email address |
| **Address** | Business address |

### Currency & Tax

| Field | Notes |
|-------|-------|
| **Currency Code** | ISO code (e.g. `USD`, `EUR`, `GBP`) |
| **Currency Symbol** | Symbol used in the UI (e.g. `$`, `€`, `£`) |
| **Tax Name** | Label used on invoices (e.g. *VAT*, *GST*, *Tax*) |
| **Tax Rate (%)** | Applied to every new sale automatically |

### Invoice & Inventory

| Field | Notes |
|-------|-------|
| **Invoice Prefix** | Prefix for invoice numbers (e.g. `INV-` → `INV-00001`) |
| **Low Stock Threshold** | Global default for new products |

Click **Save Settings** to apply changes. Settings take effect immediately on the next sale or page refresh.

---

## 10. Database Backup

BizManager stores all data in a single SQLite file (`bizmanager.db`).  
It is strongly recommended to take regular backups.

### Download a backup

1. Go to **Settings**.
2. Scroll to the **Database Backup** section.
3. Click **Download Backup**.

A `.db` file is downloaded to your computer named with a timestamp  
(e.g. `bizmanager-backup-2025-06-01T12-00-00-000Z.db`).

### Restoring from a backup

1. Stop the backend server.
2. Replace `backend/database/bizmanager.db` with your backup file (rename it to `bizmanager.db`).
3. Restart the backend server.

> Store backup files in a secure, off-site location (cloud storage, external drive).  
> Consider automating backups using a cron job or task scheduler — see the [Developer Guide](DEVELOPER_GUIDE.md#backup-automation).

---

## 11. User Roles & Permissions

BizManager has three built-in roles:

| Permission | Admin | Manager | Employee |
|------------|:-----:|:-------:|:--------:|
| View Dashboard | ✅ | ✅ | ✅ |
| View Customers | ✅ | ✅ | ✅ |
| Create / Edit / Delete Customers | ✅ | ✅ | ❌ |
| View Products | ✅ | ✅ | ✅ |
| Create / Edit Products | ✅ | ✅ | ❌ |
| Delete Products | ✅ | ❌ | ❌ |
| View Sales | ✅ | ✅ | ✅ |
| Create Sales | ✅ | ✅ | ✅ |
| Update Sale Status | ✅ | ✅ | ❌ |
| Delete Sales | ✅ | ❌ | ❌ |
| Expenses (all) | ✅ | ✅ | ❌ |
| Employees (view / create / edit) | ✅ | ✅ | ❌ |
| Delete Employees | ✅ | ❌ | ❌ |
| Reports | ✅ | ✅ | ❌ |
| Settings | ✅ | ❌ | ❌ |
| Database Backup | ✅ | ❌ | ❌ |

### Assigning roles

Roles are set when creating a user account (via the Employee form or the register API).  
Only an Admin can create accounts with the *admin* or *manager* role.

---

## 12. Tips & Best Practices

### Keep your data accurate

- Record sales **at the time of transaction** to keep stock levels and reports up to date.
- Log expenses promptly and use consistent category names (e.g. always use *Utilities* not *utility* or *Utilities bill*).
- Mark sales as **cancelled** rather than deleting them to preserve audit history.

### Monitor low stock

Check the Dashboard's **Low Stock Alerts** panel daily.  
Set realistic *Low Stock Threshold* values on each product to get timely warnings.

### Run regular backups

Download a backup at least once a week, or more frequently if you process many transactions daily.  
Store backups in a location separate from the server machine.

### Use meaningful SKUs

Give products unique, human-readable SKU codes (e.g. `ELEC-TV-55-SMSNG`) so they are easy to search and identify on invoices.

### Keep your JWT secrets secure

If you are the person who set up the server, ensure you edited `backend/.env` and replaced the placeholder `JWT_SECRET` and `JWT_REFRESH_SECRET` values with long random strings before going live.

---

*For technical setup, API reference, and developer information — see the [Developer Guide](DEVELOPER_GUIDE.md).*
