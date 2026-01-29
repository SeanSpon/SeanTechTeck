@echo off
REM SeeZee Agent One-Click Installer for Windows
REM This script handles the entire setup process

setlocal enabledelayedexpansion

set "REPO_DIR=%~dp0.."
set "LOG_FILE=%REPO_DIR%\agent_install.log"

echo. >> "%LOG_FILE%"
echo [%date% %time%] SeeZee Agent Installation Started >> "%LOG_FILE%"

REM Check if running with admin rights
net session >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo.
    echo =========================================
    echo  SeeZee Agent Installer
    echo =========================================
    echo.
    echo This script needs to run as Administrator
    echo to create the Windows Scheduled Task.
    echo.
    echo Please right-click this file and select
    echo "Run as Administrator"
    echo.
    pause
    exit /b 1
)

echo.
echo =========================================
echo  SeeZee Agent One-Click Setup
echo =========================================
echo.

REM Step 1: Install dependencies
echo [Step 1] Installing Python dependencies...
echo   - psutil
echo   - flask
echo   - flask-cors
echo.

python -m pip install psutil flask flask-cors -q
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Failed to install dependencies >> "%LOG_FILE%"
    echo Failed to install dependencies. Check that Python is installed.
    pause
    exit /b 1
)

echo [OK] Dependencies installed >> "%LOG_FILE%"
echo     ✓ Installed

REM Step 2: Create scheduled task
echo.
echo [Step 2] Creating Windows Scheduled Task...

cd /d "%REPO_DIR%"

REM Get Python executable path
for /f "delims=" %%i in ('python -c "import sys; print(sys.executable)"') do set "PYTHON_EXE=%%i"

if not defined PYTHON_EXE (
    echo [ERROR] Could not find Python executable >> "%LOG_FILE%"
    echo Failed to find Python executable.
    pause
    exit /b 1
)

REM Create scheduled task using PowerShell
powershell -Command ^
    "$taskName = 'SeeZee Agent'; " ^
    "$launcherBat = '%REPO_DIR%\windows\seezee-agent-launcher.bat'; " ^
    "Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue; " ^
    "$action = New-ScheduledTaskAction -Execute $launcherBat -WorkingDirectory '%REPO_DIR%'; " ^
    "$trigger = New-ScheduledTaskTrigger -AtLogOn; " ^
    "$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable; " ^
    "Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Description 'SeeZee Agent - System Monitoring on port 5050' | Out-Null; " ^
    "Write-Host '     ✓ Task Created'"

if %ERRORLEVEL% neq 0 (
    echo [ERROR] Failed to create scheduled task >> "%LOG_FILE%"
    echo Failed to create Windows Scheduled Task.
    echo Make sure you're running as Administrator.
    pause
    exit /b 1
)

echo [OK] Scheduled task created >> "%LOG_FILE%"

REM Step 3: Verify agent can run
echo.
echo [Step 3] Verifying agent configuration...

if not exist "%REPO_DIR%\seezee_agent.py" (
    echo [ERROR] seezee_agent.py not found >> "%LOG_FILE%"
    echo Failed: seezee_agent.py not found
    pause
    exit /b 1
)

echo [OK] Agent configuration verified >> "%LOG_FILE%"
echo     ✓ Configuration valid

REM Summary
echo.
echo =========================================
echo  ✅ Installation Complete!
echo =========================================
echo.
echo Agent Details:
echo   • Port: 5050
echo   • Startup: Automatic at logon
echo   • Log file: %REPO_DIR%\seezee_agent.log
echo.
echo Next Steps:
echo   1. Edit seezee_config.json
echo   2. Add this PC's IP in agents section
echo   3. Restart your PC
echo.
echo Test Now:
echo   python seezee_agent.py
echo.
echo Then check from another terminal:
echo   powershell -Command "Invoke-RestMethod http://localhost:5050/stats"
echo.
echo =========================================
echo.

echo [OK] Installation completed successfully >> "%LOG_FILE%"
pause
exit /b 0
