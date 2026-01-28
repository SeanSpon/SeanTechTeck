# SeeZee Hub - Complete Feature Guide 🚀

## What You Just Got

Your Pi is now a **full control hub** with:
- 🎮 Game library (Steam auto-detection + manual apps)
- 📊 System monitoring (CPU/GPU/RAM for all PCs)
- ⚡ Quick access (1-tap launch for anything)
- 🔴 Coming: Govee + SignalRGB controls

---

## 🎯 Architecture (Simple)

```
┌─────────────────────────────────────────┐
│           Raspberry Pi (Hub)            │
│  ┌──────────────────────────────────┐   │
│  │   SeeZee Launcher (Chromium)     │   │
│  │   - Dashboard                    │   │
│  │   - Game Library                 │   │
│  │   - System Monitor               │   │
│  │   - Settings                     │   │
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
              ↕ HTTP (port 5555)
┌─────────────────────────────────────────┐
│      Windows PC (Game Server)           │
│  ┌──────────────────────────────────┐   │
│  │  seezee_server.py (port 5555)    │   │
│  │  - Steam detection               │   │
│  │  - Launch games/apps             │   │
│  │  - Quick access API              │   │
│  └──────────────────────────────────┘   │
│  ┌──────────────────────────────────┐   │
│  │  seezee_agent.py (port 7777)     │   │
│  │  - System stats (CPU/GPU/RAM)    │   │
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

---

## 🎮 Feature 1: Game Library

### What Works Now:
- ✅ Auto-detects Steam games (appid + images)
- ✅ Scans custom folders for .exe files
- ✅ Steam cover art from CDN
- ✅ Touch-friendly grid (2-5 columns)
- ✅ Filter by: All, Steam, Apps, Tools

### How to Add More Games:
Edit `seezee_config.json` on PC:
```json
{
  "folders": [
    {
      "path": "C:\\Epic Games",
      "type": "games",
      "label": "Epic Games",
      "scanDepth": 2
    }
  ]
}
```

---

## ⚡ Feature 2: Quick Access (NEW)

### What It Does:
One-tap launch for:
- 🌐 Websites (Roblox, YouTube, Gmail)
- 💻 Apps (Chrome, VS Code, Steam)
- 🎮 Games (direct launch, no library browsing)

### How to Add Items:

**For websites:**
```json
{
  "manualUrls": [
    {
      "id": "url_roblox",
      "title": "Roblox",
      "category": "quick",
      "icon": "🎮",
      "url": "https://www.roblox.com/home",
      "enabled": true
    }
  ]
}
```

**For apps:**
```json
{
  "manualApps": [
    {
      "id": "app_chrome",
      "title": "Chrome",
      "category": "quick",
      "icon": "🌐",
      "launchType": "cmd",
      "launchValue": "chrome",
      "enabled": true
    }
  ]
}
```

Categories: `"quick"`, `"games"`, `"tools"`, `"web"`

---

## 📊 Feature 3: System Monitor (NEW)

### What It Shows:
For each PC on your network:
- 🧠 CPU usage + core count
- 💾 RAM used/total
- 🎮 GPU usage + VRAM (NVIDIA only for now)
- 🌐 Network sent/received
- 🟢 Online/offline status

Updates **every 2 seconds** (real-time).

### How to Add a PC:

**Step 1: Install agent on the PC**
```bash
pip install psutil flask flask-cors pynvml
```

**Step 2: Run the agent**
```bash
python seezee_agent.py
```
It will start on port 7777 and show its IP.

**Step 3: Add to config**
Edit `seezee_config.json`:
```json
{
  "devices": [
    {
      "id": "device_main_pc",
      "name": "Gaming PC",
      "type": "pc",
      "ip": "10.34.43.145",
      "port": 7777,
      "enabled": true,
      "monitorStats": true
    }
  ]
}
```

**Step 4: Restart PC server**
```bash
python seezee_server.py
```

Done! You'll see live stats in the System Monitor tab.

---

## 🔴 Feature 4: Govee + SignalRGB (Coming Soon)

### Govee Setup:
```json
{
  "govee": {
    "enabled": true,
    "devices": [
      {
        "id": "govee_desk_lamp",
        "name": "Desk Lamp",
        "ip": "192.168.1.100",
        "model": "H6159"
      }
    ]
  }
}
```

Will add dashboard tiles:
- "Desk Lamp ON"
- "Desk Lamp OFF"
- "Set Color"

### SignalRGB Setup:
```json
{
  "signalrgb": {
    "enabled": true,
    "pcEndpoint": "http://10.34.43.145:8888"
  }
}
```

Pi → PC bridge for scene control.

---

## 📁 File Structure

```
desktop pi hub/
├── seezee_server.py       ← PC server (port 5555)
├── seezee_agent.py        ← PC monitoring agent (port 7777)
├── seezee_config.json     ← Your config
├── launch-kiosk.sh        ← Pi launcher script
├── KIOSK_SETUP.md         ← Kiosk instructions
├── UPDATE_SUMMARY.md      ← Previous changes
└── seezee-launcher/       ← Next.js UI
    ├── app/
    │   ├── page.tsx          → Startup → dashboard
    │   ├── dashboard/        → Main hub
    │   ├── library/          → Game grid
    │   ├── monitor/          → System stats
    │   └── settings/         → Connection config
    └── components/
        ├── GameGrid.tsx
        ├── GameTile.tsx
        └── TopBar.tsx
```

---

## 🚀 Quick Start (From Scratch)

### On Windows PC:
```powershell
cd "C:\Users\Sean\Desktop\desktop pi hub"

# Terminal 1: Main server
python seezee_server.py

# Terminal 2: Monitoring agent
python seezee_agent.py
```

### On Raspberry Pi (via SSH):
```bash
cd ~/Desktop/SeanTechTeck

# Pull latest code
git pull

# Terminal 1: Start Next.js
cd seezee-launcher
npm run dev

# Terminal 2: Launch kiosk
cd ..
./launch-kiosk.sh
```

---

## ⚙️ Config Examples

### Full Config Template:
```json
{
  "port": 5555,
  "folders": [
    {
      "id": "folder_1",
      "label": "Epic Games",
      "path": "C:\\Epic Games",
      "type": "games",
      "scanDepth": 2,
      "enabled": true
    }
  ],
  "steamLibraries": [],
  "manualApps": [
    {
      "id": "app_chrome",
      "title": "Chrome",
      "category": "quick",
      "icon": "🌐",
      "launchType": "cmd",
      "launchValue": "chrome",
      "enabled": true
    },
    {
      "id": "app_steam",
      "title": "Steam Big Picture",
      "category": "quick",
      "icon": "🎮",
      "launchType": "url",
      "launchValue": "steam://open/bigpicture",
      "enabled": true
    }
  ],
  "manualUrls": [
    {
      "id": "url_roblox",
      "title": "Roblox",
      "category": "quick",
      "icon": "🎮",
      "url": "https://www.roblox.com/home",
      "enabled": true
    },
    {
      "id": "url_youtube",
      "title": "YouTube",
      "category": "web",
      "icon": "📺",
      "url": "https://www.youtube.com",
      "enabled": true
    }
  ],
  "devices": [
    {
      "id": "device_gaming_pc",
      "name": "Gaming PC",
      "type": "pc",
      "ip": "10.34.43.145",
      "port": 7777,
      "enabled": true,
      "monitorStats": true
    }
  ],
  "govee": {
    "enabled": false,
    "devices": []
  },
  "signalrgb": {
    "enabled": false,
    "pcEndpoint": "http://10.34.43.145:8888"
  }
}
```

---

## 🐛 Troubleshooting

### Quick Access not showing?
- Check `seezee_config.json` has `manualApps` or `manualUrls`
- Set `category: "quick"`
- Restart `seezee_server.py`

### System Monitor shows "No Devices"?
- Run `seezee_agent.py` on your PC
- Make sure port 7777 is open in firewall
- Add device to `devices` array in config
- Check agent IP matches config IP

### Can't launch apps from Pi?
- Apps launch **on the PC**, not the Pi
- Pi is just sending commands to PC server
- Check PC server console for errors

### Games not detected?
- Steam: Paths auto-detected from registry
- Others: Add folder to `folders` array
- Restart server after config changes

---

## 🔥 What to Add Next

### Easy:
- [ ] More Quick Access shortcuts
- [ ] Epic Games folder
- [ ] More PCs to system monitor
- [ ] Desktop wallpaper on idle

### Medium:
- [ ] Govee light controls
- [ ] SignalRGB scene switcher
- [ ] Recently played section
- [ ] Search/filter in library

### Hard:
- [ ] Auto-discover devices (subnet scan)
- [ ] Chart history for system stats
- [ ] Process manager (kill tasks)
- [ ] Wake-on-LAN

---

## 📝 API Reference

### PC Server (port 5555)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/games` | GET | All games (Steam + folders) |
| `/api/launch` | POST | Launch Steam game or exe |
| `/api/quick-access` | GET | Quick access items |
| `/api/launch-app` | POST | Launch manual app/URL |
| `/api/system-stats` | GET | PC's own stats |
| `/api/devices` | GET | All devices + their stats |
| `/api/config` | GET | Full config |

### Monitoring Agent (port 7777)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/stats` | GET | CPU/GPU/RAM/Network |
| `/health` | GET | Online check |

---

## 🎨 UI Structure

```
Startup (3.5s)
     ↓
Dashboard (/dashboard)
├── Quick Access (horizontal scroll)
│   ├── Roblox
│   ├── Chrome
│   └── YouTube
├── Stats Grid (4 cards)
│   ├── Total Items
│   ├── Steam Games
│   ├── Local Apps
│   └── Tools
└── Main Nav (3 cards)
    ├── Game Library → /library
    ├── System Monitor → /monitor
    └── Settings → /settings
```

---

## 💪 You Now Have

✅ Auto-detected Steam library with images
✅ Custom game/app folders
✅ One-tap shortcuts for anything
✅ Live system monitoring for all PCs
✅ Touch-optimized UI
✅ Real control hub, not a toy

**This is legit** 🔥

---

## Next Response Needed

Pick ONE to implement next:

1. **"Add Govee controls"** - I'll build the LAN/cloud API + dashboard tiles
2. **"Add SignalRGB bridge"** - I'll build PC endpoint + scene switcher
3. **"Auto-discover devices"** - I'll add subnet scanner + auto-add
4. **"Test what we have"** - I'll give you exact test checklist

Or just tell me what you want to add to Quick Access and I'll update the config.
