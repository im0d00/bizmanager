/**
 * Cross-platform helper: copies .env.example to .env if .env doesn't already exist,
 * replacing placeholder JWT secrets with cryptographically random values.
 * Works on Windows, Linux, and macOS — no shell utilities required.
 */
const crypto = require('crypto');
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
  let contents = fs.readFileSync(src, 'utf8');

  // Replace placeholder JWT secrets with cryptographically random 64-byte hex strings
  contents = contents.replace(
    /^(JWT_SECRET=).*$/m,
    `$1${crypto.randomBytes(64).toString('hex')}`
  );
  contents = contents.replace(
    /^(JWT_REFRESH_SECRET=).*$/m,
    `$1${crypto.randomBytes(64).toString('hex')}`
  );

  fs.writeFileSync(dest, contents);
  try {
    fs.chmodSync(dest, 0o600);
  } catch (_) {
    // chmod is not supported on Windows — remind the user to restrict the file manually
    console.warn('WARNING: Could not set restrictive permissions on .env (unsupported on Windows).');
    console.warn('         Manually restrict access to backend/.env to protect your JWT secrets.');
  }
  console.log('.env created from .env.example with auto-generated JWT secrets.');
}
