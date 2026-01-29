# 🎯 COMPLETE: SeeZee PC Agent & Auto-Startup Setup

## ⚡ 1-Minute Quick Start

### On Your PC:
```powershell
# 1. Open PowerShell as Administrator
# 2. Navigate to your repo
cd "C:\Users\Sean\Desktop\desktop pi hub"

# 3. Run one-click installer
.\windows\install-agent.bat

# 4. Follow prompts
```

**Done!** Agent will auto-start on next boot.

---

## 📋 What You Get

✅ **SeeZee Agent** - Monitoring service on port 5050  
✅ **Auto-Startup** - Runs automatically when PC boots  
✅ **Error Recovery** - Auto-restarts if it crashes  
✅ **System Monitoring** - CPU, memory, disk, temps  
✅ **Web API** - JSON endpoints for hub integration  
✅ **Logging** - All activity logged to `seezee_agent.log`  

---

## 🚀 Installation Options

### Option 1: One-Click Setup (EASIEST ⭐)
```cmd
# Run as Administrator
windows\install-agent.bat
```

### Option 2: PowerShell Setup
```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
.\windows\setup-agent-startup.ps1
```

### Option 3: Manual Scheduled Task
```powershell
.\windows\install-seezee-agent-task.ps1
```

### Option 4: Startup Folder Method
1. Copy to `shell:startup`:
   - `windows\seezee-agent-launcher.bat`, OR
   - `windows\SeeZee-Agent-Startup.vbs`

---

## 🔧 Manual Dependencies (if auto-installer fails)

```cmd
pip install psutil
pip install flask
pip install flask-cors
```

---

## 📝 Configuration

### 1. Update seezee_config.json
Add agents section with your PC's IP:

```json
{
  "port": 5555,
  "agents": [
    {
      "name": "My Gaming PC",
      "url": "http://192.168.1.100:5050",
      "enabled": true
    }
  ],
  // ... rest of config
}
```

**Find your PC's IP:**
```powershell
Get-NetIPConfiguration | Select IPv4Address
```

### 2. (Optional) Add More PCs
```powershell
python windows\add_agent_to_config.py http://192.168.1.101:5050 "Workstation"
```

---

## ✅ Verify It Works

### Check Agent Runs
```powershell
# Run agent manually
python seezee_agent.py

# In another PowerShell window:
Invoke-RestMethod http://localhost:5050/stats | ConvertTo-Json
```

### Check Scheduled Task
```powershell
Get-ScheduledTask "SeeZee Agent"
```

### Test After Restart
1. Restart PC
2. Wait 10 seconds
3. Check if running:
```powershell
netstat -ano | findstr :5050
```

---

## 📊 Agent Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/stats` | GET | System statistics (CPU, memory, disk, temps) |
| `/health` | GET | Health check + hostname + IP |
| `/` | GET | Info page in browser |

### Example Response:
```json
{
  "hostname": "DESKTOP-XYZ",
  "ip": "192.168.1.100",
  "cpu": {
    "percent": 35.2,
    "count": 8,
    "freq_mhz": 3500
  },
  "memory": {
    "total_gb": 16.0,
    "available_gb": 8.5,
    "percent": 46.9
  },
  "disk": {
    "total_gb": 1000.0,
    "free_gb": 450.0,
    "percent": 55.0
  },
  "temperatures": {
    "CPU Package": 52.0,
    "Core 0": 50.5
  }
}
```

---

## 🎯 File Structure

```
windows/
├── install-agent.bat                    ⭐ One-click installer
├── seezee-agent-launcher.bat            Core launcher (finds Python)
├── setup-agent-startup.ps1              PowerShell setup
├── install-seezee-agent-task.ps1        Scheduled task (original)
├── create_exe_launcher.py               Creates hidden .exe
├── add_agent_to_config.py               Helper to add agents to config
└── SeeZee-Agent-Startup.vbs             VBScript silent launcher

Root/
├── WINDOWS_AGENT_QUICK_START.md         Quick reference
├── WINDOWS_AGENT_SETUP.md               Detailed guide
├── AGENT_SETUP_COMPLETE.md              Comprehensive summary
├── seezee_agent.py                      The actual agent
├── seezee_config.json                   Hub config (updated)
└── README.md                            Main docs (updated)
```

---

## 🐛 Troubleshooting

### Agent won't start
**Check log:**
```cmd
type seezee_agent.log | more
```

**Run manually to see errors:**
```cmd
windows\seezee-agent-launcher.bat
```

### Port 5050 in use
**Find what's using it:**
```powershell
netstat -ano | findstr :5050
```

**Change port in seezee_agent.py (~line 140):**
```python
app.run(host='0.0.0.0', port=5051)
```

### Hub can't connect
1. Verify IP is correct: `ipconfig`
2. Check firewall allows Python on port 5050
3. Verify config has `http://` prefix

### Python not found
**Verify Python installed:**
```powershell
python --version
```

**Or use PowerShell launcher:**
```powershell
& "C:\Users\Sean\Desktop\desktop pi hub\.venv\Scripts\python.exe" seezee_agent.py
```

---

## 🔄 Advanced: Create Hidden Launcher EXE

For a professional-looking startup entry:

```powershell
# Requires PyInstaller
pip install pyinstaller

# Create EXE
python windows\create_exe_launcher.py

# Creates: windows\dist\SeeZee-Agent-Launcher.exe
# Copy to shell:startup
```

---

## 🌐 View in Hub

Once agent is running and configured:

1. Open hub at `http://localhost:3000` (or your Pi's IP)
2. Go to **Monitor** tab
3. See real-time stats from your PC

---

## 🔐 Security

- Agent runs as your Windows user (not admin)
- No authentication (local network only)
- Exposes system info via HTTP
- No sensitive data (credentials, passwords)
- Consider firewall rules if on shared networks

---

## 💡 Quick Reference Commands

```powershell
# Test agent
Invoke-RestMethod http://localhost:5050/stats

# View logs
Get-Content seezee_agent.log -Tail 50

# Check scheduled task
Get-ScheduledTask "SeeZee Agent"

# Run agent manually
python seezee_agent.py

# Find your IP
ipconfig | findstr IPv4

# Update config with new agent
python windows\add_agent_to_config.py
```

---

## ✨ What Happens at Boot

1. Windows starts
2. Task Scheduler triggers "SeeZee Agent"
3. Runs: `seezee-agent-launcher.bat`
4. Batch detects Python (venv → system)
5. Starts: `python seezee_agent.py`
6. Agent listens on port 5050
7. Hub can now see PC stats

**All automated - zero user action needed!**

---

## 🎯 Next Steps

1. ✅ Run `install-agent.bat` (with admin rights)
2. ✅ Verify dependencies installed
3. ✅ Update `seezee_config.json` with your PC IP:5050
4. ✅ Test: `Invoke-RestMethod http://localhost:5050/stats`
5. ✅ Restart PC
6. ✅ Verify agent auto-starts
7. ✅ View in hub Monitor tab

---

**🎉 Installation Complete! Your PC agent is ready for auto-startup.**

Need help? Check:
- [WINDOWS_AGENT_SETUP.md](WINDOWS_AGENT_SETUP.md) - Full setup guide
- [WINDOWS_AGENT_QUICK_START.md](WINDOWS_AGENT_QUICK_START.md) - Quick reference
- [AGENT_SETUP_COMPLETE.md](AGENT_SETUP_COMPLETE.md) - Comprehensive docs
- `seezee_agent.log` - Error logs
