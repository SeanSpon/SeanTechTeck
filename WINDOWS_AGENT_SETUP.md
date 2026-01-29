# SeeZee Agent Setup - Windows Auto-Startup Guide

## ⚡ Quick Start (2 minutes)

### Step 1: Run Setup Script
Open PowerShell in the repo folder and run:
```powershell
powershell -ExecutionPolicy Bypass -File windows\setup-agent-startup.ps1
```

This will:
- ✅ Install Python dependencies (psutil, flask, flask-cors)
- ✅ Create a Windows Scheduled Task for auto-startup
- ✅ Create a hidden launcher EXE (optional)

### Step 2: Add to seezee_config.json
Edit `seezee_config.json` and add the `agents` section:
```json
{
  "port": 5555,
  "agents": [
    {
      "name": "Desktop PC",
      "url": "http://YOUR_PC_IP:5050",
      "enabled": true
    }
  ],
  // ... rest of config
}
```

Replace `YOUR_PC_IP` with your actual PC IP address (e.g., `192.168.1.100`)

### Step 3: Restart & Verify
Restart your PC. The agent will auto-start. Check it's running:
```powershell
Invoke-RestMethod http://localhost:5050/stats | ConvertTo-Json
```

---

## 🔧 Manual Setup (if quick start doesn't work)

### Option A: Scheduled Task (Recommended)
1. Install dependencies:
   ```cmd
   pip install psutil flask flask-cors
   ```

2. Run PowerShell as your user (NOT admin):
   ```powershell
   Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
   .\windows\install-seezee-agent-task.ps1
   ```

3. Verify task is created:
   ```powershell
   Get-ScheduledTask "SeeZee Agent"
   ```

### Option B: Startup Folder (Alternative)
1. Create a shortcut to `windows\seezee-agent-launcher.bat`
2. Copy to Windows Startup folder:
   ```
   shell:startup
   ```
3. The batch file will run on next login

### Option C: Hidden EXE (Most User-Friendly)
```powershell
# Create the EXE launcher
python windows\create_exe_launcher.py

# This creates: windows\dist\SeeZee-Agent-Launcher.exe
# Copy to shell:startup for auto-launch
```

---

## 🔍 What Gets Installed

### Python Packages
- `psutil` - System monitoring (CPU, memory, disk, temps)
- `flask` - HTTP server framework
- `flask-cors` - Cross-origin requests support

### Agent Service
- **Port:** 5050 (default)
- **Endpoints:**
  - `GET /stats` - System statistics
  - `GET /health` - Health check
  - `GET /` - Info page (in browser)

### Windows Integration
- **Startup Method:** Windows Task Scheduler
- **Trigger:** At user logon
- **Auto-restart:** Yes (if it crashes)
- **Log File:** `seezee_agent.log` in repo root

---

## 📊 Agent Features

### System Stats Provided
```json
{
  "hostname": "YOUR-PC",
  "cpu": {
    "percent": 23.5,
    "count": 8,
    "freq_mhz": 3400
  },
  "memory": {
    "total_gb": 16.0,
    "available_gb": 9.2,
    "percent": 42.5
  },
  "disk": {
    "total_gb": 512.0,
    "free_gb": 234.5,
    "percent": 54.2
  },
  "network": {
    "bytes_sent": 1024000,
    "bytes_recv": 2048000
  },
  "temperatures": {
    "cpu": 45.5
  }
}
```

---

## 🐛 Troubleshooting

### Agent doesn't start at login
1. Check if task exists:
   ```powershell
   Get-ScheduledTask "SeeZee Agent"
   ```

2. Check log file:
   ```
   seezee_agent.log
   ```

3. Run manually to see errors:
   ```cmd
   windows\seezee-agent-launcher.bat
   ```

### Port 5050 already in use
Edit `seezee_agent.py` and change:
```python
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5051)  # Change to different port
```

Then update `seezee_config.json` with new port.

### Python not found
- Install Python 3.8+ from python.org
- Make sure it's in your PATH
- Or use: `py -3 -m pip install psutil flask flask-cors`

### Connection refused from hub
- Verify agent is running: `curl http://localhost:5050/stats`
- Check Windows Firewall allows port 5050
- Verify IP in seezee_config.json is correct (use `ipconfig` to find)

---

## 🔐 Security Notes

- Agent runs as your user (not admin/SYSTEM)
- Uses HTTP only (no HTTPS) - local network only
- Exposes system stats (CPU, memory, temp) - be careful in untrusted networks
- No authentication by default - add to Flask if needed

---

## 📝 Customization

### Change Agent Port
Edit `seezee_agent.py` line ~140:
```python
app.run(host='0.0.0.0', port=5050)  # Change port here
```

### Run on Startup WITHOUT Scheduled Task
Copy batch file to startup folder:
```powershell
$source = "c:\Users\Sean\Desktop\desktop pi hub\windows\seezee-agent-launcher.bat"
$startup = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup"
Copy-Item $source $startup
```

### Monitor via Dashboard
Once agent is running, visit the hub at `http://localhost:3000` and check the Monitor tab to see agent stats.

---

## 📞 Support

Logs: `seezee_agent.log` (created in repo root)
Config: `seezee_config.json` (add agents section with URL)
Test: `curl http://localhost:5050/stats` or PowerShell `Invoke-RestMethod`
