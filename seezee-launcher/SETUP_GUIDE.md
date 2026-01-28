# SeeZee Launcher - PC Connection Setup Guide

## Overview
SeeZee Launcher runs on your Raspberry Pi and connects to your gaming PC to stream games and access your Steam library remotely. This guide will walk you through setting up the connection between your Pi and PC.

---

## Hardware Requirements

### Raspberry Pi Setup
- **Raspberry Pi 4 or 5** (4GB+ RAM recommended)
- MicroSD card (32GB+ with Raspberry Pi OS)
- HDMI cable for display
- USB keyboard/mouse or Bluetooth controller
- Power supply

### Gaming PC Requirements
- Windows 10/11 or Linux
- Steam installed (optional: for automatic library detection)
- Network connection (WiFi or Ethernet)

---

## Connection Methods

### Option 1: WiFi Network (Recommended)
**Best for:** Most home setups, easy configuration, decent performance

1. Connect both Pi and PC to the same WiFi network
2. Note your PC's local IP address:
   - **Windows**: Open Command Prompt → type `ipconfig` → find "IPv4 Address"
   - **Linux**: Open Terminal → type `ip addr` or `hostname -I`
   - Example: `192.168.1.100`

### Option 2: Ethernet (Best Performance)
**Best for:** Maximum performance, lowest latency

1. Connect both Pi and PC to your router via Ethernet cables
2. Find your PC's IP address (same steps as WiFi above)
3. This provides the most stable connection for game streaming

### Option 3: Direct Ethernet Connection
**Best for:** Portable setup without router, LAN parties

1. Connect Pi directly to PC using an Ethernet cable
2. On PC, enable Internet Connection Sharing on your main network adapter
3. PC will typically auto-assign IP like `192.168.137.1`
4. Configure static IP on Pi: `192.168.137.2`

### Option 4: USB Tethering
**Best for:** Quick testing, no network available

1. Connect Pi to PC via USB cable
2. Enable USB gadget mode on Pi
3. PC IP will be auto-assigned (check `ipconfig` or `ip addr`)

### Option 5: Bluetooth (Limited)
**Best for:** Controller input only, not for game streaming

- Bluetooth is too slow for game streaming
- Use for wireless controller connectivity only
- Pair your controller through Pi's Bluetooth settings

---

## PC Server Setup

### Step 1: Install SeeZee PC Server

Create a Python server on your PC to handle requests from the Pi:

**Windows/Linux:**

```bash
pip install flask flask-cors
```

### Step 2: Create the Server Script

Save this as `seezee_server.py` on your PC:

```python
from flask import Flask, jsonify, request
from flask_cors import CORS
import os
import json
import winreg  # Windows only - remove for Linux
from pathlib import Path

app = Flask(__name__)
CORS(app)  # Allow Pi to connect

# Configuration
STEAM_LIBRARY_PATHS = []

def find_steam_libraries():
    """Auto-detect Steam library folders"""
    libraries = []
    
    # Try Windows registry
    try:
        key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, r"Software\Valve\Steam")
        steam_path = winreg.QueryValueEx(key, "SteamPath")[0]
        libraries.append(os.path.join(steam_path, "steamapps"))
        
        # Check libraryfolders.vdf for additional libraries
        vdf_path = os.path.join(steam_path, "steamapps", "libraryfolders.vdf")
        if os.path.exists(vdf_path):
            with open(vdf_path, 'r') as f:
                content = f.read()
                # Parse additional library paths (simplified)
                # Full VDF parsing recommended for production
                
    except Exception as e:
        print(f"Steam auto-detect failed: {e}")
    
    # Fallback: Common Steam locations
    common_paths = [
        "C:\\Program Files (x86)\\Steam\\steamapps",
        "C:\\Program Files\\Steam\\steamapps",
        os.path.expanduser("~/.steam/steam/steamapps"),  # Linux
    ]
    
    for path in common_paths:
        if os.path.exists(path) and path not in libraries:
            libraries.append(path)
    
    return libraries

def scan_steam_games(library_path):
    """Scan Steam library for installed games"""
    games = []
    manifests_dir = os.path.join(library_path, "common")
    
    if not os.path.exists(library_path):
        return games
    
    # Find .acf manifest files
    for file in os.listdir(library_path):
        if file.startswith("appmanifest_") and file.endswith(".acf"):
            manifest_path = os.path.join(library_path, file)
            
            try:
                with open(manifest_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    
                    # Simple parsing (use proper VDF parser for production)
                    name_start = content.find('"name"')
                    if name_start > 0:
                        name_line = content[name_start:].split('\n')[0]
                        game_name = name_line.split('"')[3]
                        
                        appid_start = content.find('"appid"')
                        appid_line = content[appid_start:].split('\n')[0]
                        app_id = appid_line.split('"')[3]
                        
                        games.append({
                            'name': game_name,
                            'appId': app_id,
                            'source': 'steam',
                            'path': os.path.join(manifests_dir, game_name)
                        })
            except Exception as e:
                print(f"Error reading manifest {file}: {e}")
    
    return games

@app.route('/api/status', methods=['GET'])
def status():
    """Check if server is running"""
    return jsonify({'status': 'online', 'version': '1.0.0'})

@app.route('/api/games', methods=['GET'])
def get_games():
    """Return list of all games"""
    all_games = []
    
    # Use configured path or auto-detect
    libraries = STEAM_LIBRARY_PATHS if STEAM_LIBRARY_PATHS else find_steam_libraries()
    
    for library in libraries:
        all_games.extend(scan_steam_games(library))
    
    return jsonify({'games': all_games, 'count': len(all_games)})

@app.route('/api/launch', methods=['POST'])
def launch_game():
    """Launch a game via Steam protocol"""
    data = request.json
    app_id = data.get('appId')
    
    if not app_id:
        return jsonify({'error': 'No appId provided'}), 400
    
    # Launch via Steam protocol
    os.system(f'start steam://rungameid/{app_id}')
    
    return jsonify({'success': True, 'message': f'Launching game {app_id}'})

@app.route('/api/config', methods=['POST'])
def set_config():
    """Update library paths"""
    data = request.json
    global STEAM_LIBRARY_PATHS
    
    if 'libraryPaths' in data:
        STEAM_LIBRARY_PATHS = data['libraryPaths']
        return jsonify({'success': True})
    
    return jsonify({'error': 'Invalid config'}), 400

if __name__ == '__main__':
    print("=" * 50)
    print("SeeZee PC Server Starting...")
    print("=" * 50)
    
    libraries = find_steam_libraries()
    print(f"\nFound {len(libraries)} Steam library folder(s):")
    for lib in libraries:
        print(f"  - {lib}")
    
    print("\nServer will run on: http://0.0.0.0:5555")
    print("Make sure Windows Firewall allows this port!")
    print("\nPress Ctrl+C to stop\n")
    
    app.run(host='0.0.0.0', port=5555, debug=True)
```

### Step 3: Run the Server

**Windows:**
```bash
python seezee_server.py
```

**Run on Startup (Windows):**
1. Press `Win+R` → type `shell:startup`
2. Create shortcut to `pythonw.exe seezee_server.py`
3. Server will auto-start with Windows

**Linux:**
```bash
python3 seezee_server.py
```

### Step 4: Configure Firewall

**Windows:**
```powershell
New-NetFirewallRule -DisplayName "SeeZee Server" -Direction Inbound -Port 5555 -Protocol TCP -Action Allow
```

**Linux:**
```bash
sudo ufw allow 5555/tcp
```

---

## Pi Configuration

### Step 1: Find Your PC's IP Address

On your PC, run:
- **Windows**: `ipconfig`
- **Linux**: `ip addr` or `hostname -I`

Note the IPv4 address (e.g., `192.168.1.100`)

### Step 2: Configure SeeZee Launcher

1. Launch SeeZee Launcher on your Pi
2. Click the connection status button (top bar)
3. Enter your PC's IP address
4. Enter port `5555` (default)
5. Select connection type (WiFi/Ethernet)
6. Enter Steam library path:
   - Windows: `C:\Program Files (x86)\Steam\steamapps`
   - Linux: `~/.steam/steam/steamapps`
7. Click "Test Connection"
8. Click "Save Configuration"

Your games should now appear!

---

## Troubleshooting

### Pi Can't Connect to PC

1. **Check if both devices are on same network:**
   ```bash
   ping [PC_IP_ADDRESS]
   ```

2. **Verify PC server is running:**
   - Check terminal/command prompt for error messages
   - Server should show "Running on http://0.0.0.0:5555"

3. **Test from browser on Pi:**
   ```
   http://[PC_IP]:5555/api/status
   ```
   Should return: `{"status":"online","version":"1.0.0"}`

4. **Check firewall:**
   - Windows Defender might be blocking port 5555
   - Temporarily disable to test
   - Add permanent exception (see Step 4 above)

### No Games Showing Up

1. **Verify Steam library path:**
   - Check if path exists on PC
   - Look for `.acf` manifest files
   - Common location: `C:\Program Files (x86)\Steam\steamapps`

2. **Check server logs:**
   - Terminal should show game scanning results
   - Restart server to re-scan

3. **Manual library path:**
   - In connection settings, manually enter exact Steam path
   - Include full path to `steamapps` folder

### Games Launch on PC but Not on Pi Screen

This is expected! SeeZee Launcher currently **triggers games on your PC**, not streaming them.

For game streaming:
- Use **Moonlight** + **NVIDIA GameStream** (NVIDIA GPU required)
- Use **Parsec** for streaming
- Future SeeZee versions will integrate streaming

---

## Performance Tips

✅ **Use Ethernet** instead of WiFi for best performance  
✅ **Keep PC and Pi close** to router to minimize latency  
✅ **Use 5GHz WiFi** if available (faster than 2.4GHz)  
✅ **Close background apps** on both Pi and PC  
✅ **Update Pi firmware**: `sudo apt update && sudo apt upgrade`

---

## Advanced: Auto-Discovery (Future Feature)

Future versions will support automatic PC discovery via:
- **mDNS/Bonjour**: Zero-config networking
- **UDP broadcast**: LAN device detection
- **QR code pairing**: Scan from phone to configure

---

## Security Notes

⚠️ **This server has no authentication!** Anyone on your network can access it.

For production use:
- Add API key authentication
- Use HTTPS with SSL certificates
- Implement rate limiting
- Restrict to local network only

---

## Getting Help

- Check logs in PC terminal
- Use browser dev tools on Pi (F12)
- Verify network connectivity with `ping`
- Test API endpoints directly

---

**Built with ❤️ for Raspberry Pi gaming**
