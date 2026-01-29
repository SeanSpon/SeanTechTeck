@echo off
REM SeeZee Agent Launcher
REM Runs the SeeZee Agent with proper Python environment detection and error handling

setlocal enabledelayedexpansion

REM Get the repo directory (parent of windows folder)
for %%~dp0 in ("%~dp0") do set "REPO_DIR=%%~dp0.."

REM Log file for debugging
set "LOG_FILE=%REPO_DIR%\seezee_agent.log"

REM Clear log
if exist "%LOG_FILE%" del /q "%LOG_FILE%"

echo [%date% %time%] Starting SeeZee Agent >> "%LOG_FILE%"
echo Repository: %REPO_DIR% >> "%LOG_FILE%"

REM Check if repo directory exists
if not exist "%REPO_DIR%" (
  echo [ERROR] Repository directory not found: %REPO_DIR% >> "%LOG_FILE%"
  exit /b 1
)

cd /d "%REPO_DIR%"

REM Check if seezee_agent.py exists
if not exist "seezee_agent.py" (
  echo [ERROR] seezee_agent.py not found in %REPO_DIR% >> "%LOG_FILE%"
  exit /b 1
)

REM Check for virtual environment first
if exist ".venv\Scripts\python.exe" (
  echo [INFO] Using virtual environment >> "%LOG_FILE%"
  call ".venv\Scripts\python.exe" seezee_agent.py >> "%LOG_FILE%" 2>&1
  exit /b !ERRORLEVEL!
)

REM Try Python launcher (py)
where py >nul 2>nul
if !ERRORLEVEL!==0 (
  echo [INFO] Using py launcher >> "%LOG_FILE%"
  py -3 seezee_agent.py >> "%LOG_FILE%" 2>&1
  exit /b !ERRORLEVEL!
)

REM Fallback to python command
echo [INFO] Using python command >> "%LOG_FILE%"
python seezee_agent.py >> "%LOG_FILE%" 2>&1
exit /b !ERRORLEVEL!
