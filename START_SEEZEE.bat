@echo off
REM SeeZee Complete Launcher
REM Starts:
REM   1. Python server (port 5555)
REM   2. Next.js hub dev server (port 3000)
REM   3. Opens hub in Chrome/Edge fullscreen
REM   4. All logs to console

setlocal enabledelayedexpansion

set "REPO_DIR=%~dp0"
set "LAUNCHER_DIR=%REPO_DIR%seezee-launcher"
set "PORT_SERVER=5555"
set "PORT_HUB=3000"
set "HUB_URL=http://localhost:3000"

echo.
echo =========================================
echo  SeeZee Complete Launcher
echo =========================================
echo.
echo Repository: %REPO_DIR%
echo Launcher: %LAUNCHER_DIR%
echo.

REM Check if Python exists
python --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ❌ Python not found
    echo Install Python 3.8+ or add to PATH
    pause
    exit /b 1
)

REM Check if npm exists
npm --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ❌ Node/npm not found
    echo Install Node.js from nodejs.org
    pause
    exit /b 1
)

echo ✅ Python found
echo ✅ Node/npm found
echo.

REM Kill any existing processes on our ports
echo Cleaning up old processes...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5555') do taskkill /PID %%a /F 2>nul
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do taskkill /PID %%a /F 2>nul
timeout /t 1 /nobreak >nul

echo.
echo =========================================
echo  Starting Services
echo =========================================
echo.

REM Terminal 1: Python Server
echo [1/2] Starting Python server on port %PORT_SERVER%...
echo        (This window will show server logs)
echo.
start "SeeZee Server" cmd /k "cd /d %REPO_DIR% && python seezee_server.py"

timeout /t 3 /nobreak >nul

REM Terminal 2: Next.js Hub
echo [2/2] Starting Next.js hub on port %PORT_HUB%...
echo        (This window will show hub logs)
echo.
start "SeeZee Hub" cmd /k "cd /d %LAUNCHER_DIR% && npm run dev"

timeout /t 5 /nobreak >nul

REM Open in browser
echo.
echo =========================================
echo  Opening Hub
echo =========================================
echo.
echo 🌐 Opening %HUB_URL% in browser...
echo.

REM Try Edge first, then Chrome, then default browser
where msedge >nul 2>&1
if %ERRORLEVEL%==0 (
    start msedge --app=%HUB_URL%
    goto done
)

where chrome >nul 2>&1
if %ERRORLEVEL%==0 (
    start chrome --app=%HUB_URL%
    goto done
)

REM Default browser
start %HUB_URL%

:done
echo.
echo =========================================
echo  Services Running
echo =========================================
echo.
echo 🖥️  Server: http://localhost:5555
echo 🎮 Hub:    http://localhost:3000
echo.
echo 📋 Logs: Check the terminal windows above
echo.
echo 🎯 Next Steps:
echo   1. Configure your PC connection in hub (gear icon)
echo   2. Add Steam library path or game folders
echo   3. Click a game to launch it
echo.
echo ⚠️  To stop everything: Close the terminal windows
echo.
pause
