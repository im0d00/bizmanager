#!/usr/bin/env bash
# BizManager – Railway.app Deployment Script
# This script is executed by Railway's Nixpacks build system
set -e

echo "============================================================"
echo " BizManager – Railway Deployment"
echo "============================================================"

# Debug: Print PATH and available commands
echo "Current PATH: $PATH"
echo "Checking for Node.js and npm..."

# Try to find node and npm in common locations
if command -v node &> /dev/null; then
    echo "✓ Node.js found: $(which node)"
    echo "  Node.js version: $(node --version)"
else
    echo "✗ Node.js not found in PATH"
fi

if command -v npm &> /dev/null; then
    echo "✓ npm found: $(which npm)"
    echo "  npm version: $(npm --version)"
else
    echo "✗ npm not found in PATH"
    echo "ERROR: npm not found. Node.js may not be installed."
    echo "Please ensure nixpacks.toml is configured correctly."
    exit 1
fi

echo "------------------------------------------------------------"

# Unset the deprecated npm production config to suppress
# "npm warn config production Use --omit=dev instead" warnings.
# Railway's environment may set npm_config_production=true; start.sh
# already passes --omit=dev explicitly where needed.
unset npm_config_production

# Navigate to backend directory
cd backend

# Install dependencies (dev deps excluded via --omit=dev)
echo "[1/3] Installing backend dependencies..."
npm ci --omit=dev --prefer-offline || npm install --omit=dev

# Initialize .env file if it doesn't exist
if [ ! -f .env ]; then
  echo "[2/3] Initializing .env file..."
  npm run init
fi

# Set up database
echo "[3/3] Setting up database..."
npm run setup

# Start the backend server
echo "============================================================"
echo " Starting BizManager API server..."
echo "============================================================"
npm start
