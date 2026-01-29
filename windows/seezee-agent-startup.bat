@echo off
setlocal

REM SeeZee Agent auto-start helper (Windows)
REM - Copy this file into: shell:startup
REM - Or run it manually to launch the agent.

REM Change this to your repo folder if needed.
set "REPO_DIR=%USERPROFILE%\Desktop\desktop pi hub"

cd /d "%REPO_DIR%" || (
  echo Failed to cd to %REPO_DIR%
  pause
  exit /b 1
)

REM Prefer Python launcher if available.
where py >nul 2>nul
if %ERRORLEVEL%==0 (
  py -3 seezee_agent.py
) else (
  python seezee_agent.py
)
