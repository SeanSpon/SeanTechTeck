# SeeZee Launch Script (PowerShell)
# Starts server and hub, then opens in browser

param(
    [switch]$Kiosk = $false,
    [switch]$NoOpen = $false
)

$RepoDir = Split-Path -Parent $PSScriptRoot
$LauncherDir = Join-Path $RepoDir "seezee-launcher"
$ServerPort = 5555
$HubPort = 3000
$HubUrl = "http://localhost:3000"

Write-Host "`n" -ForegroundColor Cyan
Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  SeeZee Game Launcher                  ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Kill existing processes
Write-Host "🧹 Cleaning up old processes..." -ForegroundColor Yellow
Get-Process python -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*python*" } | Stop-Process -Force -ErrorAction SilentlyContinue
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Start Python server
Write-Host "🚀 Starting server on port $ServerPort..." -ForegroundColor Green
$serverProcess = Start-Process -FilePath "python" -ArgumentList "seezee_server.py" `
    -WorkingDirectory $RepoDir `
    -PassThru `
    -NoNewWindow `
    -ErrorAction SilentlyContinue

if ($null -eq $serverProcess) {
    Write-Host "❌ Failed to start server. Make sure Python is installed." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "   PID: $($serverProcess.Id)" -ForegroundColor Gray
Start-Sleep -Seconds 3

# Check if server is responding
Write-Host "⏳ Waiting for server to be ready..." -ForegroundColor Yellow
$retries = 0
while ($retries -lt 10) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:$ServerPort/api/health" -UseBasicParsing -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-Host "   ✅ Server ready!" -ForegroundColor Green
            break
        }
    } catch {
        $retries++
        Start-Sleep -Seconds 1
    }
}

if ($retries -ge 10) {
    Write-Host "   ⚠️  Server not responding, but continuing anyway..." -ForegroundColor Yellow
}

# Start Next.js hub
Write-Host "`n📱 Starting hub on port $HubPort..." -ForegroundColor Green
$hubProcess = Start-Process -FilePath "npm" -ArgumentList "run", "dev" `
    -WorkingDirectory $LauncherDir `
    -PassThru `
    -NoNewWindow `
    -ErrorAction SilentlyContinue

if ($null -eq $hubProcess) {
    Write-Host "❌ Failed to start hub. Make sure Node.js is installed." -ForegroundColor Red
    Stop-Process -Id $serverProcess.Id -Force -ErrorAction SilentlyContinue
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "   PID: $($hubProcess.Id)" -ForegroundColor Gray
Start-Sleep -Seconds 5

# Open browser
if (-not $NoOpen) {
    Write-Host "`n🌐 Opening hub in browser..." -ForegroundColor Green
    
    if ($Kiosk) {
        Write-Host "   (Opening in kiosk mode - press Alt+F4 to exit)" -ForegroundColor Gray
        
        # Try Edge
        $edge = Get-Command msedge -ErrorAction SilentlyContinue
        if ($edge) {
            Start-Process -FilePath $edge.Source -ArgumentList "--kiosk", $HubUrl
            goto Wait
        }
        
        # Try Chrome
        $chrome = Get-Command chrome -ErrorAction SilentlyContinue
        if ($chrome) {
            Start-Process -FilePath $chrome.Source -ArgumentList "--kiosk", $HubUrl
            goto Wait
        }
    }
    
    Start-Process $HubUrl
}

:Wait

Write-Host ""
Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  ✅ SeeZee is Running!                 ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Services:" -ForegroundColor Cyan
Write-Host "   • Server: http://localhost:$ServerPort" -ForegroundColor Gray
Write-Host "   • Hub:    http://localhost:$HubPort" -ForegroundColor Gray
Write-Host ""
Write-Host "🎮 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Configure connection (port $ServerPort)" -ForegroundColor Gray
Write-Host "   2. Add your game folder (Steam library path)" -ForegroundColor Gray
Write-Host "   3. Click games to launch them" -ForegroundColor Gray
Write-Host ""
Write-Host "❌ To stop: Close this window" -ForegroundColor Yellow
Write-Host ""

# Wait for user to close window
$Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") | Out-Null

# Cleanup
Write-Host "`nStopping services..." -ForegroundColor Yellow
Stop-Process -Id $serverProcess.Id -Force -ErrorAction SilentlyContinue
Stop-Process -Id $hubProcess.Id -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

Write-Host "✅ Done" -ForegroundColor Green
