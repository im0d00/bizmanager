const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || './database/bizmanager.db';
const dbPath = path.resolve(DB_PATH);
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

db.pragma('journal_mode=WAL');
db.pragma('foreign_keys=ON');
db.pragma('synchronous=NORMAL');
db.pragma('cache_size=-64000');
db.pragma('temp_store=MEMORY');

const schemaPath = path.join(__dirname, 'schema.sql');
if (fs.existsSync(schemaPath)) {
  const schema = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schema);
}

const migrateUserRolesConstraint = () => {
  const row = db.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name='users'`).get();
  if (!row || !row.sql) return;
  if (row.sql.includes("'auditor'") && row.sql.includes("'warehouse'")) return;

  db.exec(`
    CREATE TABLE IF NOT EXISTS users_new (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'employee' CHECK(role IN ('admin','manager','employee','auditor','warehouse')),
      is_active INTEGER NOT NULL DEFAULT 1,
      avatar_url TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    INSERT INTO users_new (id, name, email, password, role, is_active, avatar_url, created_at, updated_at)
    SELECT id, name, email, password, role, is_active, avatar_url, created_at, updated_at
    FROM users;

    DROP TABLE users;
    ALTER TABLE users_new RENAME TO users;
  `);
};

migrateUserRolesConstraint();

db.prepare(
  `INSERT OR IGNORE INTO warehouses (id, name, code, is_active) VALUES ('wh-default', 'Main Warehouse', 'MAIN', 1)`
).run();
db.prepare(
  `INSERT OR IGNORE INTO product_inventory (product_id, warehouse_id, stock, updated_at)
   SELECT id, 'wh-default', stock, datetime('now') FROM products`
).run();

module.exports = db;
