# Creates a Task Scheduler entry to run SeeZee Agent at logon.
# Run PowerShell as your user (not admin is fine).
# Usage:
#   Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
#   .\windows\install-seezee-agent-task.ps1

$taskName = 'SeeZee Agent'
$repoDir = Join-Path $env:USERPROFILE 'Desktop\desktop pi hub'
$scriptPath = Join-Path $repoDir 'seezee_agent.py'

if (-not (Test-Path $scriptPath)) {
  Write-Error "Could not find $scriptPath. Edit install-seezee-agent-task.ps1 and set `$repoDir to your repo folder."
  exit 1
}

# Find python
$python = (Get-Command py -ErrorAction SilentlyContinue)
if ($python) {
  $exe = $python.Source
  $args = "-3 `"$scriptPath`""
} else {
  $python = (Get-Command python -ErrorAction SilentlyContinue)
  if (-not $python) {
    Write-Error 'Python not found (py or python). Install Python 3 first.'
    exit 1
  }
  $exe = $python.Source
  $args = "`"$scriptPath`""
}

$action = New-ScheduledTaskAction -Execute $exe -Argument $args -WorkingDirectory $repoDir
$trigger = New-ScheduledTaskTrigger -AtLogOn
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

# Replace existing task
Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue | Out-Null
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Description 'Runs SeeZee PC monitoring agent on port 5050 at logon.' | Out-Null

Write-Host "Installed Task Scheduler entry: $taskName"
Write-Host "Agent will run at logon. You can test now by running:"
Write-Host "  $exe $args"
