/**
 * Cross-platform helper: copies .env.example to .env if .env doesn't already exist.
 * Works on Windows, Linux, and macOS — no shell utilities required.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const src = path.join(root, '.env.example');
const dest = path.join(root, '.env');

if (fs.existsSync(dest)) {
  console.log('.env already exists — skipping copy.');
} else if (!fs.existsSync(src)) {
  console.error('ERROR: .env.example not found. Cannot create .env.');
  process.exit(1);
} else {
  fs.copyFileSync(src, dest);
  console.log('.env created from .env.example');
  console.log('');
  console.log('IMPORTANT: Open backend/.env and replace the placeholder JWT secrets:');
  console.log('  JWT_SECRET=<your-long-random-string>');
  console.log('  JWT_REFRESH_SECRET=<another-long-random-string>');
}
