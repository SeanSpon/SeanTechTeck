# 🎮 SEEZEE - Launch Games NOW!

## ⚡ Quick Start (30 seconds)

### Double-click ONE of these:

**For Development (recommended first time):**
```
START_SEEZEE.bat
```
Opens hub in browser with console logs visible for debugging.

**For Kiosk/Monitor Display:**
```
START_KIOSK.bat
```
Opens hub in fullscreen mode on your monitor.

---

## 🎯 What Happens When You Click A Game?

1. **Steam games** → Automatically launches via Steam protocol
2. **Local executables** → Runs from configured folder paths

### For games to work, you MUST:

**1️⃣ Configure a Game Folder in the Hub**

In SeeZee Hub:
- Click ⚙️ (Settings)
- Go to "Game Libraries"
- Click "Add Folder"
- Select your Steam folder: `C:\Program Files (x86)\Steam\steamapps`

**2️⃣ The Hub will scan and auto-populate games**

**3️⃣ Click any game to launch it**

---

## 🚀 Detailed Setup Steps

### Step 1: Start Everything
```cmd
START_SEEZEE.bat
```

This automatically:
- ✅ Starts Python server (port 5555)
- ✅ Starts Next.js hub (port 3000)  
- ✅ Opens browser to http://localhost:3000
- ✅ Shows logs in console windows

### Step 2: Configure Connection (First Time Only)

In the hub, you'll see a **connection status button** at top-left.

Click it and set:
- **PC IP:** `127.0.0.1` (or your actual IP for network)
- **Port:** `5555` (default)
- **Click "Connect"**

### Step 3: Add Game Folder

Click ⚙️ **Settings** → **Game Libraries**

Click **"+ Add Folder"**

Select: `C:\Program Files (x86)\Steam\steamapps`

Then click **"Scan"**

### Step 4: Launch Games

Games appear in the hub automatically.

**Click any game to launch it.**

---

## 📊 What's Running

| Service | Port | Purpose |
|---------|------|---------|
| Python Server | 5555 | Game data, launch endpoint |
| Next.js Hub | 3000 | Web interface |

---

## 🐛 Troubleshooting

### Games won't launch when clicked

**Check 1: Is server running?**
```powershell
netstat -ano | findstr :5555
```
If nothing shows, the server isn't running.

**Check 2: Is folder configured?**
In Settings → Game Libraries, you should see at least one folder.

**Check 3: Do games have paths?**
In the hub, click a game. The console should show its `execPath` or `steamAppId`.

**Check 4: Does the path exist?**
Run in PowerShell:
```powershell
Test-Path "C:\Program Files (x86)\Steam\steamapps\common\YOUR_GAME"
```

### Hub won't load

**Port 3000 in use?**
```powershell
netstat -ano | findstr :3000
```

Kill it and try again:
```powershell
taskkill /F /IM node.exe
```

### Server won't start

**Check Python:**
```cmd
python --version
```

**Check dependencies:**
```cmd
pip install flask flask-cors psutil
```

**Manual start to see error:**
```cmd
cd "C:\Users\Sean\Desktop\desktop pi hub"
python seezee_server.py
```

---

## 🎮 Steam Games - Automatic

Steam games work automatically because they have a `steamAppId`.

Just click them and they'll launch via `steam://` protocol.

Example: Clicking "Dota 2" sends `steam://rungameid/570` to Steam.

---

## 🎯 Local Games - Manual Configuration

For non-Steam games, you need to:

1. **Find the folder** where games are installed
2. **Add it** in Settings → Game Libraries
3. **Hub scans** for .exe files
4. **Click game** to launch

Example:
- Folder: `C:\Games\MyGame`
- Hub finds: `MyGame.exe`
- Hub can launch it ✅

---

## 📝 Configuration Details

### seezee_config.json

Games and folders are stored here:

```json
{
  "port": 5555,
  "folders": [
    {
      "label": "Steam",
      "path": "C:\\Program Files (x86)\\Steam\\steamapps",
      "type": "games",
      "enabled": true
    }
  ]
}
```

Edit manually to add more folders:
```json
{
  "label": "Epic Games",
  "path": "C:\\Program Files\\Epic Games",
  "type": "games",
  "enabled": true
}
```

Then restart the server.

---

## 🔥 Advanced: Kiosk Mode (Full Screen)

Use this for a dedicated gaming monitor/display:

```cmd
START_KIOSK.bat
```

Features:
- ✅ Fullscreen mode
- ✅ Auto-hides address bar
- ✅ Perfect for wall-mounted displays
- ✅ Press Ctrl+Alt+Delete to exit

---

## 🧪 Test Everything

### Test Server API
```powershell
Invoke-RestMethod http://localhost:5555/api/games | ConvertTo-Json | head -20
```

### Test Launch (Steam Dota 2)
```powershell
$body = @{steamAppId = "570"} | ConvertTo-Json
Invoke-RestMethod -Uri http://localhost:5555/api/launch -Method POST -Body $body -ContentType "application/json"
```

### Check Logs
Open the console windows to see:
- Server logs: Shows what's happening
- Hub logs: Shows connection/errors

---

## 🎁 What Works

✅ Steam games (via steam:// protocol)  
✅ Local .exe files (from configured folders)  
✅ Multiple game folders  
✅ Real-time scanning  
✅ Beautiful UI  
✅ Full-screen kiosk mode  

---

## ⚠️ What Doesn't Work

❌ Game streaming (streaming requires Moonlight/Parsec)  
❌ Non-Windows systems (Linux needs slight adjustments)  
❌ Games without steamAppId or .exe path  

---

## 🎯 For Your Setup

You have:
- ✅ Python server (seezee_server.py)
- ✅ Next.js hub (seezee-launcher)
- ✅ Both ready to run

**Just run: `START_SEEZEE.bat`**

Then configure your game folder and click games!

---

## 📞 Quick Help

**Games not showing?**
- Check server running: `netstat -ano | findstr :5555`
- Check folder configured in Settings

**Games won't launch?**
- Check folder path exists: `Test-Path "C:\Program Files (x86)\Steam\steamapps\common\GAME_NAME"`
- Check console for error messages

**Still stuck?**
- Run `diagnose_server.py` for detailed diagnostics
- Check seezee_config.json for correct paths
- Verify dependencies: `pip list | findstr flask`

---

**Ready? Double-click: `START_SEEZEE.bat` 🚀**
