@echo off
REM SeeZee Hub Launcher - Starts Next.js dev server
REM This runs the hub on http://localhost:3000

setlocal enabledelayedexpansion

set "REPO_DIR=%~dp0.."
set "LAUNCHER_DIR=%REPO_DIR%\seezee-launcher"
set "LOG_FILE=%REPO_DIR%\seezee-hub.log"

echo [%date% %time%] Starting SeeZee Hub >> "%LOG_FILE%"

cd /d "%LAUNCHER_DIR%" || (
  echo [ERROR] Failed to cd to %LAUNCHER_DIR% >> "%LOG_FILE%"
  exit /b 1
)

REM Install dependencies if node_modules missing
if not exist "node_modules" (
  echo [INFO] Installing npm dependencies >> "%LOG_FILE%"
  call npm install >> "%LOG_FILE%" 2>&1
)

REM Start dev server
echo [INFO] Starting Next.js dev server >> "%LOG_FILE%"
call npm run dev >> "%LOG_FILE%" 2>&1
