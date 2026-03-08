PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'employee' CHECK(role IN ('admin','manager','employee')),
  is_active INTEGER NOT NULL DEFAULT 1,
  avatar_url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Settings key-value store
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT OR IGNORE INTO settings (key, value) VALUES
  ('business_name', 'My Business'),
  ('address', ''),
  ('phone', ''),
  ('email', ''),
  ('currency', 'USD'),
  ('currency_symbol', '$'),
  ('tax_rate', '0'),
  ('tax_name', 'Tax'),
  ('invoice_prefix', 'INV-'),
  ('low_stock_threshold', '10');

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  notes TEXT,
  total_spent REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT UNIQUE NOT NULL
);

INSERT OR IGNORE INTO categories (id, name) VALUES ('cat-general', 'General');

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL,
  sku TEXT UNIQUE,
  description TEXT,
  price REAL NOT NULL DEFAULT 0,
  cost REAL NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  low_stock_at INTEGER NOT NULL DEFAULT 10,
  category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);

-- Sales table
CREATE TABLE IF NOT EXISTS sales (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  invoice_number TEXT UNIQUE NOT NULL,
  customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  subtotal REAL NOT NULL DEFAULT 0,
  tax_amount REAL NOT NULL DEFAULT 0,
  discount REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'paid' CHECK(status IN ('paid','pending','cancelled')),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_created ON sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(status);

-- Sale items table
CREATE TABLE IF NOT EXISTS sale_items (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  sale_id TEXT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  price REAL NOT NULL DEFAULT 0,
  cost REAL NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 1,
  subtotal REAL NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product ON sale_items(product_id);

-- Expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  title TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'General',
  date TEXT NOT NULL DEFAULT (date('now')),
  notes TEXT,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);

-- Employees table
CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'employee',
  department TEXT,
  salary REAL NOT NULL DEFAULT 0,
  hire_date TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Refresh tokens table
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info' CHECK(type IN ('info','warning','error','success')),
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
