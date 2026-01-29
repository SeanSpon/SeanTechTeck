@echo off
REM SeeZee Kiosk Mode Launcher
REM Starts server and opens hub in fullscreen kiosk mode
REM Perfect for display/monitor mode

setlocal enabledelayedexpansion

set "REPO_DIR=%~dp0"
set "LAUNCHER_DIR=%REPO_DIR%seezee-launcher"

echo.
echo =========================================
echo  SeeZee Kiosk Mode
echo =========================================
echo.

REM Kill any existing instances
taskkill /F /IM seezee* 2>nul
taskkill /F /IM python.exe 2>nul  
taskkill /F /IM node.exe 2>nul
timeout /t 1 /nobreak >nul

REM Start Python server in background
cd /d "%REPO_DIR%"
start /B "SeeZee Server" python seezee_server.py

REM Wait for server to start
echo Waiting for server to start...
timeout /t 3 /nobreak >nul

REM Build the Next.js app
cd /d "%LAUNCHER_DIR%"
echo Building Next.js app...
call npm run build 1>nul 2>&1

REM Start production server
echo Starting hub...
start /B "SeeZee Hub" cmd /c npm start

REM Wait for hub to start
timeout /t 5 /nobreak >nul

REM Find and open fullscreen browser
echo Opening kiosk display...

REM Try Edge with fullscreen
where msedge >nul 2>&1
if %ERRORLEVEL%==0 (
    start msedge --kiosk http://localhost:3000 --start-fullscreen
    goto wait
)

REM Try Chrome with fullscreen
where chrome >nul 2>&1
if %ERRORLEVEL%==0 (
    start chrome --kiosk http://localhost:3000 --start-fullscreen
    goto wait
)

REM Fallback: start http://localhost:3000
start http://localhost:3000

:wait
echo.
echo =========================================
echo  Kiosk Mode Active
echo =========================================
echo.
echo 🎮 Hub running at http://localhost:3000
echo 📊 Server running at http://localhost:5555
echo.
echo Press Ctrl+Alt+Delete to exit fullscreen
echo Or close this window to stop everything
echo.
pause

REM Cleanup on exit
taskkill /F /IM python.exe 2>nul
taskkill /F /IM node.exe 2>nul
taskkill /F /IM msedge.exe 2>nul
taskkill /F /IM chrome.exe 2>nul

echo Stopped SeeZee
