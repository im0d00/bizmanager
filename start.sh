#!/usr/bin/env bash
# BizManager – Railway.app Deployment Script
# This script is executed by Railway's Railpack build system
set -e

echo "============================================================"
echo " BizManager – Railway Deployment"
echo "============================================================"

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo "ERROR: npm not found. Node.js may not be installed."
    exit 1
fi

# Check Node.js version
echo "Node.js version: $(node --version)"
echo "npm version: $(npm --version)"

# Navigate to backend directory
cd backend

# Install dependencies with production flag to reduce memory usage
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
