# SEE STUDIO ZEE Desktop Pi Hub

Game launcher interface for Raspberry Pi that connects to your gaming PC to access and launch Steam games remotely.

## 🎮 Features

- **Stunning UI** with reactive animated background particles
- **Startup animation** with dissolving effects
- **PC Connection** via WiFi, Ethernet, USB, or Bluetooth
- **Steam Library Sync** - automatically pulls games from your PC
- **Empty State** - guides you through setup when not connected
- **Persistent Storage** - remembers your PC connection settings
- **Modern Design** - Dark theme with neon accents

## 🚀 Quick Start

### For the Raspberry Pi (SEE STUDIO ZEE Launcher):

1. Navigate to the launcher directory:
```bash
cd seezee-launcher
npm install
npm run dev
```

2. Open browser to `http://localhost:3000`

3. Click connection status button and configure your PC connection

### For the Gaming PC (Server):

1. Install dependencies:
```bash
pip install flask flask-cors
```

2. Run the server:
```bash
python seezee_server.py
```

3. Note your PC's IP address (shown in terminal)

4. Configure firewall to allow port 5555

## 📖 Full Setup Guide

See [SETUP_GUIDE.md](seezee-launcher/SETUP_GUIDE.md) for complete instructions on:
- Connecting Pi to PC (WiFi, Ethernet, USB, Bluetooth)
- Setting up the Python server on your gaming PC
- Configuring Steam library paths
- Troubleshooting connection issues

## 🖥️ PC Agent Setup (Auto-Monitoring)

For system monitoring and auto-startup on your gaming PC:

### Quick Start:
```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
.\windows\setup-agent-startup.ps1
```

This sets up:
- ✅ SeeZee Agent to run on Windows startup
- ✅ System monitoring on port 5050 (CPU, memory, disk, temps)
- ✅ Automatic restart if it crashes
- ✅ Logging to `seezee_agent.log`

Then add your PC's IP to `seezee_config.json` under the `agents` section.

📖 **Full instructions**: [WINDOWS_AGENT_SETUP.md](WINDOWS_AGENT_SETUP.md) or [WINDOWS_AGENT_QUICK_START.md](WINDOWS_AGENT_QUICK_START.md)

## 🎨 UI Features

- **Reactive Background**: Animated particles that respond to mouse movement
- **Connection Modal**: Configure PC IP, port, and library path
- **Empty State**: Beautiful onboarding when no games are available
- **Startup Screen**: "Welcome Back Sean - SeeZee Studios" animation
- **Theme Support**: Built-in dark theme with customizable accents

## 🛠 Tech Stack

- **Frontend**: Next.js 15, React, TypeScript, Tailwind CSS
- **State Management**: Zustand with localStorage persistence
- **Backend**: Python Flask server on gaming PC
- **Deployment**: Runs on Raspberry Pi 4/5

## 📁 Project Structure

```
desktop pi hub/
├── seezee-launcher/          # Next.js frontend (Pi)
│   ├── app/                  # App routes and pages
│   ├── components/           # React components
│   │   ├── StartupScreen.tsx
│   │   ├── ReactiveBackground.tsx
│   │   ├── ConnectionModal.tsx
│   │   ├── EmptyGameLibrary.tsx
│   │   └── ...
│   ├── lib/                  # Utilities and stores
│   │   └── connectionStore.ts
│   └── SETUP_GUIDE.md
├── seezee_server.py          # Python server (PC)
└── logos/                    # Brand assets
```

## 🔧 Configuration

The app stores these settings in localStorage:
- PC IP Address
- Connection Port
- Game Library Path
- Connection Type (WiFi/Ethernet/USB/Bluetooth)
- Connection Status

## 🎯 Future Enhancements

- [ ] Actual game streaming integration (Moonlight/Parsec)
- [ ] Auto-discovery of PC on network
- [ ] Controller navigation support
- [ ] Game launching progress indicator
- [ ] Recently played games tracking
- [ ] Game categories and filtering
- [ ] Touch-friendly mobile interface
- [ ] Voice control integration

## 📝 Notes

- Currently, games launch **on your PC**, not streamed to Pi
- For game streaming, integrate Moonlight (NVIDIA) or Parsec
- Server has no authentication - keep on local network only
- Tested on Raspberry Pi 4 with 4GB RAM

## 💡 Tips

- Use Ethernet for best performance
- Keep Pi and PC on same network
- Enable firewall exception for port 5555
- Steam library is usually at `C:\Program Files (x86)\Steam\steamapps`

---

**Made for gaming on Raspberry Pi** 🎮🥧
