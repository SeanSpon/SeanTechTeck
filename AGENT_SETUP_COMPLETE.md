# 🎯 SeeZee Agent & Auto-Startup Implementation - Complete Summary

## What Was Set Up

You now have a complete Windows auto-startup system for the SeeZee Agent that:
- ✅ Runs automatically when your PC boots
- ✅ Exposes system monitoring data on port 5050
- ✅ Auto-restarts if it crashes
- ✅ Works with the SeeZee Hub to display PC stats
- ✅ Requires zero user interaction after initial setup

---

## 📦 Files Created

### Core Setup Files

| File | Purpose | What to Do |
|------|---------|-----------|
| `windows\seezee-agent-launcher.bat` | Main launcher that finds Python & runs agent | Used by scheduled task |
| `windows\setup-agent-startup.ps1` | **One-click setup** (Recommended) | Run this first |
| `WINDOWS_AGENT_QUICK_START.md` | Quick reference guide | Read this |
| `WINDOWS_AGENT_SETUP.md` | Detailed documentation | Read for troubleshooting |

### Helper Utilities

| File | Purpose | Use When |
|------|---------|----------|
| `windows\create_exe_launcher.py` | Creates a hidden .exe for startup | Alternative to batch file |
| `windows\add_agent_to_config.py` | Helper to add agent to config | After agent is running |
| `windows\SeeZee-Agent-Startup.vbs` | VBScript silent launcher | Alternative to batch file |

---

## 🚀 Getting Started (3 Steps)

### Step 1: Install Dependencies
```cmd
pip install psutil flask flask-cors
```

### Step 2: Run Setup
```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
.\windows\setup-agent-startup.ps1
```

This will:
- ✅ Install Python packages
- ✅ Create Windows Scheduled Task (auto-startup)
- ✅ Optionally create hidden EXE launcher

### Step 3: Configure Hub
Edit `seezee_config.json`:
```json
{
  "agents": [
    {
      "name": "My Desktop",
      "url": "http://YOUR_PC_IP:5050",
      "enabled": true
    }
  ]
}
```

Find your IP:
```powershell
Get-NetIPConfiguration | Select IPv4Address
```

---

## 🧪 Testing

### Verify Agent Runs
```powershell
# Check manually
python seezee_agent.py

# Verify in another PowerShell window
Invoke-RestMethod http://localhost:5050/stats
```

### Check Auto-Startup
```powershell
# Verify task exists
Get-ScheduledTask "SeeZee Agent"

# Check log after restart
Get-Content seezee_agent.log | Select-Object -Last 20
```

---

## 🎯 How It Works

### When PC Boots:
1. Windows Task Scheduler triggers "SeeZee Agent" task
2. Runs: `seezee-agent-launcher.bat`
3. Batch file detects Python in venv or system PATH
4. Starts: `python seezee_agent.py`
5. Agent listens on port 5050

### Agent Provides:
```
GET /stats  → System statistics (CPU, memory, disk, temps)
GET /health → Status check
GET /       → Info page in browser
```

### Hub Displays:
- PC name and IP
- Real-time CPU, memory, disk usage
- Temperatures (if available)
- Network activity

---

## 📊 Agent Data Exposed

```json
{
  "hostname": "YOUR-PC-NAME",
  "ip": "192.168.1.100",
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
    "cpu_package": 45.5,
    "core_0": 44.2
  }
}
```

---

## 🔄 Auto-Boot for Monitor/Kiosk

For auto-launching the SeeZee monitor display:

### Option 1: Auto-run Next.js Dev Server (Pi)
The launcher already handles this - just keep the Pi running.

### Option 2: Auto-launch Browser in Kiosk Mode
Add to Windows startup (via Scheduled Task):
```cmd
chromium --kiosk --app=http://localhost:3000
```

---

## 🐛 Troubleshooting

### Agent won't start
**Check log:**
```cmd
type seezee_agent.log
```

**Run manually:**
```cmd
cd "C:\Users\Sean\Desktop\desktop pi hub"
python seezee_agent.py
```

### Port 5050 already in use
**Find what's using it:**
```powershell
netstat -ano | findstr :5050
```

**Change port in seezee_agent.py (line ~140):**
```python
app.run(host='0.0.0.0', port=5051)  # Change to 5051
```

### Python not found
**Verify Python is in PATH:**
```powershell
py --version
python --version
```

**Or use the venv:**
```cmd
.venv\Scripts\python.exe seezee_agent.py
```

### Hub can't connect to agent
1. Verify agent is running:
   ```powershell
   Invoke-RestMethod http://localhost:5050/stats
   ```

2. Check Windows Firewall:
   - Allow Python through firewall
   - Or allow port 5050

3. Verify config has correct IP:
   ```powershell
   ipconfig | findstr IPv4
   ```

---

## 📁 Files Modified

- `seezee_config.json` - Added `agents` section

---

## 📝 Configuration Details

### seezee_config.json Structure
```json
{
  "port": 5555,
  "agents": [
    {
      "name": "Desktop PC",
      "url": "http://192.168.1.100:5050",
      "enabled": true
    }
  ],
  // ... rest of config
}
```

### Task Scheduler Entry
- **Task Name:** SeeZee Agent
- **Trigger:** At User Logon
- **Action:** Run `seezee-agent-launcher.bat`
- **Settings:** Auto-restart if fails
- **User:** Your Windows user account

---

## ✅ Verification Checklist

- [ ] Dependencies installed: `pip install psutil flask flask-cors`
- [ ] Setup script ran: `.\windows\setup-agent-startup.ps1`
- [ ] Scheduled task created: `Get-ScheduledTask "SeeZee Agent"`
- [ ] Agent runs manually: `python seezee_agent.py`
- [ ] Agent responds to requests: `Invoke-RestMethod http://localhost:5050/stats`
- [ ] Config updated with agent URL
- [ ] PC restarted and agent auto-started
- [ ] Hub shows agent in monitor tab

---

## 🔐 Security Notes

- Agent runs as your Windows user (not admin)
- No authentication - keep on local network only
- Exposes system stats - consider firewall rules if on shared network
- Uses HTTP only - no HTTPS for local network

---

## 📞 Quick Reference

**Start agent manually:**
```cmd
windows\seezee-agent-launcher.bat
```

**Test connection:**
```powershell
Invoke-RestMethod http://localhost:5050/stats -AsHashtable
```

**View logs:**
```powershell
Get-Content seezee_agent.log -Tail 50
```

**Add another agent:**
```powershell
python windows\add_agent_to_config.py http://OTHER_PC_IP:5050 "Other PC"
```

**Reinstall everything:**
```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
.\windows\setup-agent-startup.ps1
```

---

## 🎯 What's Next

1. **Verify setup works** - Restart PC and check agent auto-starts
2. **Monitor in hub** - View agent stats in SeeZee Hub monitor tab
3. **Add more PCs** - Repeat steps on other Windows machines
4. **Configure alerts** - Set up monitoring thresholds if needed

---

**Setup Complete! 🎉** Your agent will now auto-start with Windows.
