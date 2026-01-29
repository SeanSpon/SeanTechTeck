# ⚡ SeeZee Agent Quick Setup

## 🚀 Setup in 3 Steps

### 1️⃣ Install Python Dependencies
```cmd
pip install psutil flask flask-cors
```

### 2️⃣ Enable Auto-Startup
Choose ONE option below:

#### Option A: PowerShell (Recommended - Scheduled Task)
```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
.\windows\setup-agent-startup.ps1
```

#### Option B: Startup Folder (Simple)
1. Copy this file: `windows\seezee-agent-launcher.bat`
2. Paste into: Press `Win + R`, type `shell:startup`, press Enter
3. Done! Restarts to auto-start

#### Option C: VBScript (Silent)
1. Copy `windows\SeeZee-Agent-Startup.vbs` 
2. Paste into: `shell:startup`

### 3️⃣ Add to Config
Edit `seezee_config.json`:
```json
"agents": [
  {
    "name": "My Desktop",
    "url": "http://YOUR_PC_IP:5050",
    "enabled": true
  }
]
```

Find your IP:
```powershell
Get-NetIPConfiguration | Select IPv4Address
```

---

## ✅ Verify It Works

### Check Agent Running
```powershell
Invoke-RestMethod http://localhost:5050/stats | ConvertTo-Json
```

### Check Config Updated
```powershell
Get-Content seezee_config.json | ConvertFrom-Json | Select -ExpandProperty agents
```

---

## 📁 What Was Created

| File | Purpose |
|------|---------|
| `windows\seezee-agent-launcher.bat` | Main launcher (finds Python & runs agent) |
| `windows\setup-agent-startup.ps1` | Auto-setup script |
| `windows\create_exe_launcher.py` | Creates hidden EXE for startup |
| `windows\add_agent_to_config.py` | Helper to add agent to config |
| `windows\SeeZee-Agent-Startup.vbs` | Silent VBScript launcher |
| `WINDOWS_AGENT_SETUP.md` | Detailed guide |

---

## 🔍 Troubleshooting

### Agent won't start
```cmd
# Run manually to see errors
windows\seezee-agent-launcher.bat

# Check log file
type seezee_agent.log
```

### Port 5050 in use
Change port in `seezee_agent.py` line ~140:
```python
app.run(host='0.0.0.0', port=5051)  # Change 5050 to 5051
```

### Python not found
Install from python.org, or use:
```cmd
py -m pip install psutil flask flask-cors
```

---

## 📊 What Agent Reports

✅ CPU usage & frequency  
✅ Memory (total, available, % used)  
✅ Disk space (total, free, % used)  
✅ Network (bytes sent/received)  
✅ Temperatures (if available)  
✅ Hostname & IP address  

---

## 🎯 Next Steps

1. **Test locally:**
   ```powershell
   python seezee_agent.py
   ```

2. **Setup auto-start** (pick one method above)

3. **Add to config** (update seezee_config.json with your PC's IP:5050)

4. **Restart PC** and verify agent starts automatically

5. **View in hub** at `http://localhost:3000` → Monitor tab

---

## 📖 Full Documentation
See `WINDOWS_AGENT_SETUP.md` for detailed instructions and troubleshooting.
