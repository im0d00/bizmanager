@echo off
setlocal enabledelayedexpansion

echo ============================================================
echo  BizManager - Windows Quick Start
echo ============================================================
echo.

:: Check Node.js
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH.
    echo Download it from: https://nodejs.org/  (choose LTS, v18.11 or newer)
    pause
    exit /b 1
)

for /f "tokens=1 delims=v" %%i in ('node --version') do set NODE_VER=%%i
node --version > "%TEMP%\node_ver.txt"
set /p NODE_FULL=<"%TEMP%\node_ver.txt"
echo [OK] Node.js %NODE_FULL% found.
echo.

:: ── BACKEND ─────────────────────────────────────────────────
echo [1/4] Installing backend dependencies...
cd /d "%~dp0backend"
call npm install
if %ERRORLEVEL% neq 0 (
    echo ERROR: Backend npm install failed.
    echo       On Windows, better-sqlite3 requires Visual C++ Build Tools.
    echo       Install option A (recommended):
    echo         npm install --global windows-build-tools
    echo       Install option B: https://visualstudio.microsoft.com/visual-cpp-build-tools/
    pause
    exit /b 1
)

echo.
echo [2/4] Initialising .env file...
call npm run init

echo.
echo [3/4] Setting up database...
call npm run setup

:: ── FRONTEND ────────────────────────────────────────────────
echo.
echo [4/4] Installing frontend dependencies...
cd /d "%~dp0frontend"
call npm install
if %ERRORLEVEL% neq 0 (
    echo ERROR: Frontend npm install failed.
    pause
    exit /b 1
)

:: ── LAUNCH ──────────────────────────────────────────────────
echo.
echo ============================================================
echo  Starting servers...
echo  Backend  -> http://localhost:5000
echo  Frontend -> http://localhost:5173
echo  Open http://localhost:5173 in your browser.
echo  Press Ctrl+C in each window to stop.
echo ============================================================
echo.

:: Open a new cmd window for the backend
start "BizManager Backend" cmd /k "cd /d "%~dp0backend" && npm run dev"

:: Small delay so the backend starts before the browser opens
timeout /t 3 /nobreak >nul

:: Open a new cmd window for the frontend
start "BizManager Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

:: Optional: open the browser automatically after a short delay
timeout /t 4 /nobreak >nul
start "" "http://localhost:5173"

endlocal
