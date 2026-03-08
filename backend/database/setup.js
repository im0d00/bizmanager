require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

const DB_PATH = process.env.DB_PATH || './database/bizmanager.db';
const dbPath = path.resolve(__dirname, '..', DB_PATH);
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);
db.pragma('journal_mode=WAL');
db.pragma('foreign_keys=ON');

const schemaPath = path.join(__dirname, 'schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf8');
db.exec(schema);

const existing = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@bizmanager.local');
if (!existing) {
  const hash = bcrypt.hashSync('admin123', 12);
  db.prepare(
    `INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)`
  ).run('Admin', 'admin@bizmanager.local', hash, 'admin');
  console.log('Default admin user created: admin@bizmanager.local / admin123');
}

db.close();
console.log('Database setup complete.');
