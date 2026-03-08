#!/usr/bin/env bash
# BizManager – Linux / macOS Quick Start
# Usage: bash start-linux.sh
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "============================================================"
echo " BizManager – Linux / macOS Quick Start"
echo "============================================================"
echo ""

# ── Check prerequisites ──────────────────────────────────────
if ! command -v node &>/dev/null; then
    echo "ERROR: Node.js is not installed."
    echo "  Install via your package manager:"
    echo "    Ubuntu/Debian : sudo apt install nodejs npm"
    echo "    Fedora/RHEL   : sudo dnf install nodejs"
    echo "  Or use nvm     : https://github.com/nvm-sh/nvm"
    echo "  Minimum version: Node.js 18.11"
    exit 1
fi

NODE_VER=$(node --version)
echo "[OK] Node.js $NODE_VER found."
echo ""

# ── BACKEND ─────────────────────────────────────────────────
echo "[1/4] Installing backend dependencies..."
cd "$SCRIPT_DIR/backend"
npm install

echo ""
echo "[2/4] Initialising .env file..."
npm run init

echo ""
echo "[3/4] Setting up database..."
npm run setup

# ── FRONTEND ────────────────────────────────────────────────
echo ""
echo "[4/4] Installing frontend dependencies..."
cd "$SCRIPT_DIR/frontend"
npm install

# ── LAUNCH ──────────────────────────────────────────────────
echo ""
echo "============================================================"
echo " Starting servers..."
echo " Backend  -> http://localhost:5000"
echo " Frontend -> http://localhost:5173"
echo " Open http://localhost:5173 in your browser."
echo " Press Ctrl+C to stop both servers."
echo "============================================================"
echo ""

# Start backend in background and capture its PID
cd "$SCRIPT_DIR/backend"
npm run dev &
BACKEND_PID=$!

# Give the backend a moment to start
sleep 2

# Start frontend (foreground; Ctrl+C will stop both)
cd "$SCRIPT_DIR/frontend"
trap "echo ''; echo 'Stopping BizManager...'; kill $BACKEND_PID 2>/dev/null; exit 0" SIGINT SIGTERM
npm run dev &
FRONTEND_PID=$!

# Try to open the browser (best-effort)
sleep 3
if command -v xdg-open &>/dev/null; then
    xdg-open "http://localhost:5173" &>/dev/null &
elif command -v open &>/dev/null; then
    open "http://localhost:5173" &>/dev/null &
fi

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
