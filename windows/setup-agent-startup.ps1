# Install SeeZee Agent for Auto-Startup (Windows)
# 
# This script:
# 1. Installs required Python packages
# 2. Creates a hidden launcher EXE
# 3. Registers it as a Windows scheduled task (auto-startup)
#
# Run as regular user (admin not required):
#   powershell -ExecutionPolicy Bypass -File windows\setup-agent-startup.ps1

param(
    [switch]$SkipExe = $false,
    [switch]$SkipDeps = $false
)

$ErrorActionPreference = "Stop"

# Get repo root
$repoRoot = Split-Path -Parent $PSScriptRoot
$agentScript = Join-Path $repoRoot "seezee_agent.py"
$launcherBat = Join-Path $repoRoot "windows" "seezee-agent-launcher.bat"
$createExeScript = Join-Path $repoRoot "windows" "create_exe_launcher.py"

Write-Host "🚀 SeeZee Agent Setup" -ForegroundColor Cyan
Write-Host "   Repository: $repoRoot`n" -ForegroundColor Gray

# Verify agent exists
if (-not (Test-Path $agentScript)) {
    Write-Host "❌ seezee_agent.py not found at $agentScript" -ForegroundColor Red
    exit 1
}

# Step 1: Install dependencies
if (-not $SkipDeps) {
    Write-Host "📦 Installing Python dependencies..." -ForegroundColor Yellow
    $dependencies = @("psutil", "flask", "flask-cors")
    
    # Try venv first
    $pythonExe = $null
    if (Test-Path (Join-Path $repoRoot ".venv" "Scripts" "python.exe")) {
        $pythonExe = Join-Path $repoRoot ".venv" "Scripts" "python.exe"
    } else {
        $pythonExe = (Get-Command python -ErrorAction SilentlyContinue).Source
        if (-not $pythonExe) {
            $pythonExe = (Get-Command py -ErrorAction SilentlyContinue).Source
        }
    }
    
    if (-not $pythonExe) {
        Write-Host "❌ Python not found. Install Python 3.8+ first." -ForegroundColor Red
        exit 1
    }
    
    Write-Host "   Using Python: $pythonExe" -ForegroundColor Gray
    
    foreach ($dep in $dependencies) {
        Write-Host "   Installing $dep..." -ForegroundColor Gray
        & $pythonExe -m pip install $dep --quiet 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "   ✅ $dep" -ForegroundColor Green
        } else {
            Write-Host "   ⚠️  $dep (non-critical)" -ForegroundColor Yellow
        }
    }
}

# Step 2: Create scheduled task
Write-Host "`n⏰ Creating Windows Scheduled Task..." -ForegroundColor Yellow

$taskName = "SeeZee Agent"
$taskDescription = "SeeZee PC monitoring agent (runs on port 5050 at logon)"

# Check if already exists
$existing = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existing) {
    Write-Host "   Removing existing task..." -ForegroundColor Gray
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false | Out-Null
}

# Create new task
$action = New-ScheduledTaskAction -Execute $launcherBat -WorkingDirectory $repoRoot
$trigger = New-ScheduledTaskTrigger -AtLogOn
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -MultipleInstances IgnoreNew

Register-ScheduledTask `
    -TaskName $taskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Description $taskDescription `
    -ErrorAction Stop | Out-Null

Write-Host "   ✅ Scheduled task created: $taskName" -ForegroundColor Green

# Step 3: Optional - Create hidden EXE
if (-not $SkipExe) {
    Write-Host "`n🔨 Creating hidden launcher EXE..." -ForegroundColor Yellow
    Write-Host "   (This allows easy startup folder placement)" -ForegroundColor Gray
    
    if (Test-Path $createExeScript) {
        & $pythonExe $createExeScript 2>&1 | ForEach-Object {
            Write-Host "   $_" -ForegroundColor Gray
        }
    } else {
        Write-Host "   ⚠️  Skipping EXE creation (script not found)" -ForegroundColor Yellow
    }
}

# Summary
Write-Host "`n✅ Setup Complete!" -ForegroundColor Green
Write-Host "`n📌 Configuration:" -ForegroundColor Cyan
Write-Host "   • Agent runs on port 5050" -ForegroundColor Gray
Write-Host "   • Auto-starts at logon" -ForegroundColor Gray
Write-Host "   • Logs to: $repoRoot\seezee_agent.log" -ForegroundColor Gray

Write-Host "`n📝 Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Add this PC's IP + port 5050 to seezee_config.json:" -ForegroundColor Gray
Write-Host "      `"agents`": [{`"url`": `"http://YOUR_PC_IP:5050`"}]" -ForegroundColor Gray

Write-Host "`n🧪 Test the agent now:" -ForegroundColor Cyan
Write-Host "   & `"$launcherBat`"" -ForegroundColor Gray

Write-Host "`n💡 To verify it's running:" -ForegroundColor Cyan
Write-Host "   Invoke-RestMethod http://localhost:5050/stats" -ForegroundColor Gray
