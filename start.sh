#!/usr/bin/env bash
# BizManager – Railway.app Deployment Script
# This script is executed by Railway's Railpack build system
set -e

echo "============================================================"
echo " BizManager – Railway Deployment"
echo "============================================================"

# Navigate to backend directory
cd backend

# Install dependencies
echo "[1/3] Installing backend dependencies..."
npm install

# Initialize .env file if it doesn't exist
if [ ! -f .env ]; then
  echo "[2/3] Initializing .env file..."
  npm run init
fi

# Set up database
echo "[3/3] Setting up database..."
npm run setup

# Start the backend server
echo "Starting BizManager API server..."
npm start
