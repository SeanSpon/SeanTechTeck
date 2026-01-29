#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from flask import Flask, jsonify, request
from flask_cors import CORS
import os
import json
import subprocess
import hashlib
import uuid
import re
import time
import string
from datetime import datetime

try:
    import winreg  # Windows only
    WINDOWS = True
except ImportError:
    WINDOWS = False

from pathlib import Path


def _clamp_int(value, minimum, maximum, default):
    try:
        value_int = int(value)
    except Exception:
        return default
    return max(minimum, min(maximum, value_int))


def _now_iso():
    return datetime.utcnow().isoformat() + "Z"

app = Flask(__name__)
# Allow CORS for development (localhost) and production (Pi/LAN IP)
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:3000", "http://localhost:3001", "http://10.34.43.126:5555", "http://127.0.0.1:5555", "*"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True
    }
})

# Configuration file path
CONFIG_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "seezee_config.json")

# Default configuration
DEFAULT_CONFIG = {
    "port": 5555,
    "folders": [],  # List of FolderConfig objects
    "steamLibraries": [],  # Auto-detected Steam paths
    "recentPlays": [],  # Track recent game launches: [{id, timestamp}]
    "favorites": []  # Track favorite items: [id]
}

# In-memory config (loaded from file)
config = {}

# Lighting state cache (prevents API spam)
lighting_state_cache = {
    'last_theme': None,
    'last_rgb': None,  # Global RGB for theme tracking
    'device_rgb': {},  # Per-device RGB cache: {device_mac: (r,g,b)}
    'last_govee_call': 0,  # timestamp
    'govee_rate_limit': 1.0  # min seconds between calls
}

# Govee command queue (ensures one-at-a-time execution)
govee_queue = []
govee_queue_processing = False


def _get_spotify_config():
    spotify_config = config.get('spotify', {}) if isinstance(config, dict) else {}
    return spotify_config if isinstance(spotify_config, dict) else {}


def _refresh_spotify_token():
    """Refresh Spotify access token using refresh token"""
    global config
    spotify = _get_spotify_config()
    
    if not spotify.get('refresh_token'):
        return None
    
    try:
        import requests
    except ImportError:
        return None
    
    try:
        # If we have client_id and client_secret, use them. Otherwise just use the refresh token.
        # Spotify allows refreshing with just the refresh token if the app is a public client
        response = requests.post(
            "https://accounts.spotify.com/api/token",
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            data={
                "grant_type": "refresh_token",
                "refresh_token": spotify.get("refresh_token"),
                "client_id": spotify.get("client_id", ""),
                "client_secret": spotify.get("client_secret", "")
            },
            timeout=5
        )
        
        if response.status_code == 200:
            tokens = response.json()
            new_token = tokens.get("access_token")
            if new_token:
                spotify["access_token"] = new_token
                # Update expires_in timestamp if provided
                if "expires_in" in tokens:
                    import time
                    spotify["access_token_expires_at"] = int(time.time()) + tokens.get("expires_in", 3600)
                # Update refresh token if a new one was provided
                if "refresh_token" in tokens:
                    spotify["refresh_token"] = tokens.get("refresh_token")
                
                config['spotify'] = spotify
                save_config()
                print(f"[Spotify] Token refreshed successfully at {_now_iso()}")
                return new_token
    except Exception as e:
        print(f"[Spotify] Failed to refresh token: {e}")
    
    return None


def _spotify_access_token():
    """Get Spotify access token, refreshing if necessary"""
    spotify = _get_spotify_config()
    token = spotify.get('access_token')
    
    # Try old key name for backwards compatibility
    if not token:
        token = spotify.get('accessToken')
    
    if not (isinstance(token, str) and token.strip()):
        return None
    
    # Check if token needs refresh (check if expires_at is set and in the past)
    import time
    expires_at = spotify.get('access_token_expires_at')
    if expires_at and isinstance(expires_at, (int, float)):
        # Refresh if token expires in less than 5 minutes
        if time.time() > (expires_at - 300):
            new_token = _refresh_spotify_token()
            if new_token:
                return new_token
    
    return token


def _spotify_request(method, path, params=None, body=None, retry=True):
    token = _spotify_access_token()
    if not token:
        return None, (jsonify({'error': 'Spotify not configured'}), 400)

    try:
        import requests
    except ImportError:
        return None, (jsonify({'error': 'requests library not installed'}), 500)

    url = f"https://api.spotify.com{path}"
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }

    try:
        response = requests.request(
            method=method,
            url=url,
            headers=headers,
            params=params,
            json=body,
            timeout=8
        )
    except Exception as e:
        return None, (jsonify({'error': str(e)}), 502)

    # Handle 401 Unauthorized - try to refresh token
    if response.status_code == 401 and retry:
        new_token = _refresh_spotify_token()
        if new_token:
            # Retry with new token
            return _spotify_request(method, path, params, body, retry=False)
    
    # Many Spotify control endpoints return 204 No Content
    if response.status_code == 204:
        return {}, None

    if response.status_code >= 400:
        try:
            error_json = response.json()
        except Exception:
            error_json = {'message': response.text}
        return None, (jsonify({'error': 'Spotify API error', 'status': response.status_code, 'details': error_json}), response.status_code)

    try:
        return response.json(), None
    except Exception:
        return {'raw': response.text}, None


def _normalize_spotify_currently_playing(payload):
    if not payload or not isinstance(payload, dict):
        return None

    item = payload.get('item')
    if not item or not isinstance(item, dict):
        return None

    artists = item.get('artists', [])
    artist_names = []
    if isinstance(artists, list):
        for a in artists:
            if isinstance(a, dict) and a.get('name'):
                artist_names.append(a.get('name'))

    album = item.get('album') if isinstance(item.get('album'), dict) else {}
    images = album.get('images', []) if isinstance(album.get('images'), list) else []
    album_art = images[0].get('url') if images and isinstance(images[0], dict) else None

    return {
        'isPlaying': bool(payload.get('is_playing')),
        'title': item.get('name'),
        'artists': artist_names,
        'album': album.get('name'),
        'albumArtUrl': album_art,
        'progressMs': payload.get('progress_ms'),
        'durationMs': item.get('duration_ms'),
    }


def _system_volume_get():
    if WINDOWS:
        try:
            from comtypes import CoInitialize
            from pycaw.pycaw import AudioUtilities

            CoInitialize()
            devices = AudioUtilities.GetSpeakers()
            # Use the EndpointVolume property (works with newer pycaw versions)
            volume = devices.EndpointVolume

            scalar = float(volume.GetMasterVolumeLevelScalar())
            muted = bool(volume.GetMute())
            return {
                'supported': True,
                'volume': int(round(scalar * 100)),
                'muted': muted,
                'backend': 'pycaw'
            }
        except ImportError:
            return {
                'supported': False,
                'error': 'System volume control requires pycaw on Windows',
                'hint': 'pip install pycaw comtypes',
                'backend': 'none'
            }
        except Exception as e:
            return {
                'supported': False,
                'error': str(e),
                'hint': 'pycaw may need reinstall: pip install --upgrade pycaw',
                'backend': 'none'
            }

    # Linux / Raspberry Pi: try amixer
    try:
        result = subprocess.run(['amixer', 'get', 'Master'], capture_output=True, text=True, timeout=3)
        if result.returncode != 0:
            return {
                'supported': False,
                'error': result.stderr.strip() or 'amixer failed',
                'backend': 'none'
            }

        match = re.search(r"\[(\d+)%\].*\[(on|off)\]", result.stdout)
        if not match:
            return {
                'supported': False,
                'error': 'Could not parse amixer output',
                'backend': 'none'
            }

        volume = int(match.group(1))
        muted = match.group(2) == 'off'
        return {
            'supported': True,
            'volume': volume,
            'muted': muted,
            'backend': 'amixer'
        }
    except FileNotFoundError:
        return {
            'supported': False,
            'error': 'amixer not available',
            'backend': 'none'
        }
    except Exception as e:
        return {
            'supported': False,
            'error': str(e),
            'backend': 'none'
        }


def _system_volume_set(volume_percent):
    volume_percent = _clamp_int(volume_percent, 0, 100, 50)

    if WINDOWS:
        try:
            from comtypes import CoInitialize
            from pycaw.pycaw import AudioUtilities

            CoInitialize()
            devices = AudioUtilities.GetSpeakers()
            # Use the EndpointVolume property (works with newer pycaw versions)
            endpoint = devices.EndpointVolume
            
            endpoint.SetMasterVolumeLevelScalar(volume_percent / 100.0, None)
            return {'success': True, 'volume': volume_percent}
        except ImportError:
            return {'success': False, 'error': 'System volume control requires pycaw on Windows', 'hint': 'pip install pycaw comtypes'}
        except Exception as e:
            return {'success': False, 'error': str(e), 'hint': 'pycaw may need reinstall: pip install --upgrade pycaw'}

    # Linux / Raspberry Pi
    try:
        result = subprocess.run(['amixer', 'set', 'Master', f'{volume_percent}%'], capture_output=True, text=True, timeout=3)
        if result.returncode != 0:
            return {'success': False, 'error': result.stderr.strip() or 'amixer failed'}
        return {'success': True, 'volume': volume_percent}
    except FileNotFoundError:
        return {'success': False, 'error': 'amixer not available'}
    except Exception as e:
        return {'success': False, 'error': str(e)}

def load_config():
    """Load configuration from JSON file"""
    global config
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
                config = json.load(f)
                print(f"✓ Loaded config from {CONFIG_FILE}")
        except Exception as e:
            print(f"✗ Error loading config: {e}")
            config = DEFAULT_CONFIG.copy()
    else:
        config = DEFAULT_CONFIG.copy()
        save_config()
        print(f"✓ Created new config at {CONFIG_FILE}")
    return config

def save_config():
    """Save configuration to JSON file"""
    try:
        with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
            json.dump(config, f, indent=2)
        print(f"✓ Saved config to {CONFIG_FILE}")
        return True
    except Exception as e:
        print(f"✗ Error saving config: {e}")
        return False

def find_steam_libraries():
    """Auto-detect Steam library folders"""
    libraries = []
    
    if WINDOWS:
        # Try Windows registry
        try:
            key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, r"Software\Valve\Steam")
            steam_path = winreg.QueryValueEx(key, "SteamPath")[0]
            steamapps = os.path.join(steam_path, "steamapps")
            if os.path.exists(steamapps):
                libraries.append(steamapps)
            
            # Check libraryfolders.vdf for additional libraries
            vdf_path = os.path.join(steam_path, "steamapps", "libraryfolders.vdf")
            if os.path.exists(vdf_path):
                try:
                    with open(vdf_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                        # Parse VDF for additional library paths
                        import re
                        paths = re.findall(r'"path"\s+"([^"]+)"', content)
                        for p in paths:
                            lib_path = os.path.join(p.replace("\\\\", "\\"), "steamapps")
                            if os.path.exists(lib_path) and lib_path not in libraries:
                                libraries.append(lib_path)
                except:
                    pass
                
        except Exception as e:
            print(f"Steam auto-detect failed: {e}")
    
    # Fallback: Common Steam locations
    common_paths = [
        "C:\\Program Files (x86)\\Steam\\steamapps",
        "C:\\Program Files\\Steam\\steamapps",
        os.path.expanduser("~/.steam/steam/steamapps"),  # Linux
        os.path.expanduser("~/.local/share/Steam/steamapps"),  # Linux alternative
    ]
    
    for path in common_paths:
        if os.path.exists(path) and path not in libraries:
            libraries.append(path)

    return libraries

def list_windows_drives():
    """List available drive roots on Windows"""
    if not WINDOWS:
        return ["/"]

    try:
        import ctypes
        drives = []
        bitmask = ctypes.windll.kernel32.GetLogicalDrives()
        for i in range(26):
            if bitmask & (1 << i):
                drives.append(f"{string.ascii_uppercase[i]}:\\")
        return drives
    except Exception as e:
        print(f"Drive detection failed: {e}")
        return ["C:\\"]

def scan_steam_games(library_path):
    """Scan Steam library for installed games"""
    games = []
    
    if not os.path.exists(library_path):
        print(f"Library path does not exist: {library_path}")
        return games
    
    # Find .acf manifest files
    try:
        acf_files = [f for f in os.listdir(library_path) if f.startswith("appmanifest_") and f.endswith(".acf")]
    except:
        return games
    
    print(f"Found {len(acf_files)} game manifests in {library_path}")
    
    for file in acf_files:
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
                    
                    # Get install directory
                    installdir_start = content.find('"installdir"')
                    if installdir_start > 0:
                        installdir_line = content[installdir_start:].split('\n')[0]
                        install_dir = installdir_line.split('"')[3]
                    else:
                        install_dir = game_name
                    
                    games.append({
                        'id': f"steam_{app_id}",
                        'title': game_name,
                        'steamAppId': app_id,
                        'source': 'steam',
                        'type': 'game',  # Steam games are always games
                        'installDir': install_dir,
                        'coverImage': f"https://cdn.cloudflare.steamstatic.com/steam/apps/{app_id}/library_600x900.jpg"
                    })
                    
        except Exception as e:
            print(f"Error reading manifest {file}: {e}")
    
    return games

def scan_epic_games(epic_path):
    """Scan Epic Games folder for installed games"""
    games = []
    
    if not os.path.exists(epic_path):
        print(f"Epic Games path does not exist: {epic_path}")
        return games
    
    try:
        # List directories in Epic Games folder (each is a game)
        entries = os.listdir(epic_path)
    except Exception as e:
        print(f"Error reading Epic Games folder: {e}")
        return games
    
    for entry in entries:
        full_path = os.path.join(epic_path, entry)
        
        # Skip non-directories and system folders
        if not os.path.isdir(full_path) or entry == "Epic Online Services":
            continue
        
        # Look for executable in game folder - search more thoroughly
        exe_found = False
        candidate_exes = []
        
        for root, dirs, files in os.walk(full_path):
            # Search deeper for Epic Games (they can be nested)
            if root.count(os.sep) - full_path.count(os.sep) > 4:
                continue
            
            for file in files:
                if file.lower().endswith('.exe'):
                    exe_path = os.path.join(root, file)
                    exe_type = classify_executable(file, exe_path)
                    
                    # Skip installer/launcher executables, but be lenient
                    if exe_type == 'hidden':
                        continue
                    
                    try:
                        size = os.path.getsize(exe_path)
                        # Reduced size threshold - some games have smaller main executables
                        if size < 100_000:  # Less than 100KB - skip tiny files
                            continue
                    except:
                        continue
                    
                    # Prioritize the largest executable (usually the main game)
                    candidate_exes.append((exe_path, size))
        
        if candidate_exes:
            # Sort by size descending and pick the largest
            candidate_exes.sort(key=lambda x: x[1], reverse=True)
            exe_path = candidate_exes[0][0]
            
            # Found a valid game executable
            game_name = entry.replace('_', ' ').replace('-', ' ').title()
            app_id = hashlib.md5(full_path.encode()).hexdigest()[:8]
            
            print(f"  Found Epic Game: {game_name} at {exe_path}")
            
            games.append({
                'id': f"epic_{app_id}",
                'title': game_name,
                'source': 'epic',
                'type': 'game',
                'execPath': exe_path,
                'folderSource': 'epic',
                'coverImage': ''  # Let frontend handle placeholder if needed
            })
    
    return games

def classify_executable(filename, filepath):
    """Classify an executable as game, app, tool, or hidden based on patterns"""
    lower = filename.lower()
    
    # Hidden patterns (launchers, utilities, services)
    hidden_patterns = [
        'unins', 'uninst', 'uninstall',
        'crash', 'crashhandler', 'crashreport',
        'redist', 'vcredist', 'directx', 'dxsetup',
        'ue4prereq', 'dotnet', 'setup', 'prerequisites',
        'helper', 'service', 'updater', 'update',
        'battleye', 'easyanticheat', 'eac',
        'launcher', 'bootstrap', 'install',
        'config', 'settings', 'patcher', 'repair',
        'itch', 'steam', 'gog', 'origin',  # Removed 'epic' - don't filter Epic games
        'redistributable', 'runtime', 'vcredist',
        'x86', 'x64', 'i386', 'amd64',
        'netframework', 'visualc', 'openal',
        'ogg', 'vorbis', 'alsoft', 'physx',
        'fmod', 'xact', 'xaudio',
        'test', 'demo', 'sample', 'example',
        'debug', 'log', 'temp', 'cache',
        'tool', 'utility', 'viewer', 'player',
        'plugin', 'addon', 'extension', 'mod',
        'd3dx', 'dxsetup', 'msvcrt', 'vcruntim'
    ]
    
    # Tool patterns (utilities you want to see but separate)
    tool_patterns = [
        'benchmark', 'editor', 'modtool', 'server',
        'dedicated', 'admin', 'console'
    ]
    
    # Check if should be hidden
    for pattern in hidden_patterns:
        if pattern in lower:
            return 'hidden'
    
    # Check if it's a tool
    for pattern in tool_patterns:
        if pattern in lower:
            return 'tool'
    
    # Default: game or app based on context
    return 'game'

def scan_folder_for_games(folder_config):
    """Scan a custom folder for .exe files (games or tools)"""
    games = []
    folder_path = folder_config.get('path', '')
    folder_type = folder_config.get('type', 'games')
    folder_id = folder_config.get('id', '')
    scan_depth = folder_config.get('scanDepth', 2)
    
    if not os.path.exists(folder_path):
        print(f"Folder does not exist: {folder_path}")
        return games
    
    # Deprecated - moved to classify_executable function
    ignore_patterns = [
        'unins', 'uninst', 'uninstall',
        'crash', 'crashhandler', 'crashreport',
        'redist', 'vcredist', 'directx', 'dxsetup',
        'ue4prereq', 'dotnet', 'setup',
        'helper', 'service', 'updater', 'update'
    ]
    
    def should_ignore(filename):
        """Legacy function - now uses classify_executable"""
        return classify_executable(filename, '') == 'hidden'
    
    def title_from_filename(filename):
        # Remove .exe and clean up
        name = filename.replace('.exe', '').replace('.EXE', '')
        # Replace underscores and dashes with spaces
        name = name.replace('_', ' ').replace('-', ' ')
        # Title case
        return name.title()
    
    def scan_dir(path, current_depth=0):
        if current_depth > scan_depth:
            return
        
        try:
            entries = os.listdir(path)
        except PermissionError:
            return
        except Exception:
            return
        
        for entry in entries:
            full_path = os.path.join(path, entry)
            
            if os.path.isfile(full_path) and entry.lower().endswith('.exe'):
                # Classify the executable
                exe_type = classify_executable(entry, full_path)
                
                # Skip hidden items
                if exe_type == 'hidden':
                    continue
                
                # Check file size (skip tiny exe files < 5MB)
                try:
                    size = os.path.getsize(full_path)
                    if size < 5_000_000:  # Less than 5MB
                        continue
                except:
                    continue
                
                # Generate stable ID from path
                path_hash = hashlib.md5(full_path.encode()).hexdigest()[:12]
                
                # Determine source based on classification and folder type
                if exe_type == 'tool':
                    source = 'tool'
                elif folder_type == 'tools':
                    source = 'tool'
                else:
                    source = 'local'
                
                games.append({
                    'id': f"{folder_type}_{path_hash}",
                    'title': title_from_filename(entry),
                    'source': source,
                    'type': exe_type,  # New field for filtering
                    'execPath': full_path,
                    'folderSource': folder_id
                })
            
            elif os.path.isdir(full_path) and current_depth < scan_depth:
                scan_dir(full_path, current_depth + 1)
    
    scan_dir(folder_path)
    print(f"Found {len(games)} executables in {folder_path}")
    return games

# ============================================================
# RGB LIGHTING CONTROL
# ============================================================

def set_govee_color(device, r, g, b, brightness=None):
    """Control Govee device via cloud API with rate limiting
    
    Best practice: Send brightness first, then color for reliable results
    """
    govee_config = config.get('govee', {})
    
    if not govee_config.get('enabled'):
        return {'success': False, 'error': 'Govee not enabled'}
    
    api_key = govee_config.get('apiKey', '')
    if not api_key:
        return {'success': False, 'error': 'Govee API key not configured'}
    
    device_mac = device.get('device')
    device_model = device.get('model')
    device_name = device.get('name', 'Unknown')
    
    # Rate limiting check (global - 1 second between any Govee call)
    now = time.time()
    time_since_last = now - lighting_state_cache['last_govee_call']
    if time_since_last < lighting_state_cache['govee_rate_limit']:
        print(f"⚠️  Govee rate limit: skipping {device_name} (last call {time_since_last:.1f}s ago)")
        return {'success': False, 'error': 'Rate limited', 'cached': True, 'device': device_name}
    
    # Per-device RGB cache check (only skip if THIS device already has this color)
    current_rgb = (r, g, b)
    device_cache = lighting_state_cache.get('device_rgb', {})
    if device_cache.get(device_mac) == current_rgb:
        print(f"✓ Govee: {device_name} already at RGB{current_rgb}, skipping")
        return {'success': True, 'cached': True, 'device': device_name}
    
    try:
        import requests
        
        headers = {
            'Govee-API-Key': api_key,
            'Content-Type': 'application/json'
        }
        
        # STEP 1: Set brightness (if provided)
        if brightness is not None:
            brightness_data = {
                'device': device_mac,
                'model': device_model,
                'cmd': {
                    'name': 'brightness',
                    'value': int(brightness)
                }
            }
            
            brightness_response = requests.put(
                'https://developer-api.govee.com/v1/devices/control',
                headers=headers,
                json=brightness_data,
                timeout=5
            )
            
            if brightness_response.status_code != 200:
                error_detail = parse_govee_error(brightness_response)
                print(f"✗ Govee brightness failed for {device_name}: {error_detail}")
                return {'success': False, 'error': error_detail, 'device': device_name}
            
            # Small delay between commands
            time.sleep(0.3)
        
        # STEP 2: Set color
        color_data = {
            'device': device_mac,
            'model': device_model,
            'cmd': {
                'name': 'color',
                'value': {'r': int(r), 'g': int(g), 'b': int(b)}
            }
        }
        
        color_response = requests.put(
            'https://developer-api.govee.com/v1/devices/control',
            headers=headers,
            json=color_data,
            timeout=5
        )
        
        # Update global rate limit timestamp
        lighting_state_cache['last_govee_call'] = time.time()
        
        if color_response.status_code == 200:
            # Update per-device cache on success
            if 'device_rgb' not in lighting_state_cache:
                lighting_state_cache['device_rgb'] = {}
            lighting_state_cache['device_rgb'][device_mac] = current_rgb
            lighting_state_cache['last_rgb'] = current_rgb  # Also update global
            
            brightness_str = f" @ {brightness}%" if brightness else ""
            print(f"✓ Govee: Set {device_name} to RGB({r},{g},{b}){brightness_str}")
            return {'success': True, 'device': device_name}
        else:
            error_detail = parse_govee_error(color_response)
            print(f"✗ Govee color failed for {device_name}: {error_detail}")
            return {'success': False, 'error': error_detail, 'device': device_name}
            
    except ImportError:
        return {'success': False, 'error': 'requests library not installed'}
    except requests.exceptions.Timeout:
        return {'success': False, 'error': 'Request timeout - device offline?', 'device': device_name}
    except requests.exceptions.ConnectionError:
        return {'success': False, 'error': 'Connection failed - check internet', 'device': device_name}
    except Exception as e:
        print(f"✗ Govee error for {device_name}: {e}")
        return {'success': False, 'error': str(e), 'device': device_name}

def parse_govee_error(response):
    """Parse Govee API error responses into actionable messages"""
    status = response.status_code
    
    # Common Govee API error codes
    error_messages = {
        400: 'Bad request - check device MAC and model',
        401: 'Invalid API key',
        404: 'Device not found - wrong MAC or model',
        429: 'Rate limit exceeded - too many requests',
        500: 'Govee server error',
        503: 'Govee service unavailable'
    }
    
    if status in error_messages:
        return f"{error_messages[status]} ({status})"
    
    # Try to parse JSON error
    try:
        error_data = response.json()
        if 'message' in error_data:
            return f"{error_data['message']} ({status})"
    except:
        pass
    
    return f"API error {status}: {response.text[:100]}"

def fetch_govee_devices(api_key):
    """Fetch devices from Govee API"""
    import requests

    headers = {
        'Govee-API-Key': api_key,
        'Content-Type': 'application/json'
    }

    return requests.get(
        'https://developer-api.govee.com/v1/devices',
        headers=headers,
        timeout=10
    )

def set_signalrgb_profile(theme_name):
    """Switch SignalRGB profile based on theme"""
    signalrgb_config = config.get('signalrgb', {})
    
    if not signalrgb_config.get('enabled'):
        return {'success': False, 'error': 'SignalRGB not enabled'}
    
    exec_path = signalrgb_config.get('execPath', '')
    if not os.path.exists(exec_path):
        return {'success': False, 'error': 'SignalRGB executable not found'}
    
    profiles = signalrgb_config.get('profiles', {})
    profile_name = profiles.get(theme_name)
    
    if not profile_name:
        print(f"⚠️  No SignalRGB profile mapped for theme: {theme_name}")
        return {'success': False, 'error': f'No profile for theme {theme_name}'}
    
    try:
        # Launch SignalRGB with profile switch
        subprocess.Popen(
            [exec_path, '--profile', profile_name],
            shell=False,
            creationflags=subprocess.DETACHED_PROCESS | subprocess.CREATE_NEW_PROCESS_GROUP if WINDOWS else 0,
            start_new_session=not WINDOWS
        )
        print(f"✓ SignalRGB: Switched to profile '{profile_name}'")
        return {'success': True, 'profile': profile_name}
    except Exception as e:
        print(f"✗ SignalRGB error: {e}")
        return {'success': False, 'error': str(e)}

def process_govee_queue():
    """Process Govee commands one at a time from the queue"""
    global govee_queue_processing
    
    if govee_queue_processing or not govee_queue:
        return
    
    govee_queue_processing = True
    
    while govee_queue:
        cmd = govee_queue.pop(0)
        device = cmd['device']
        r, g, b = cmd['r'], cmd['g'], cmd['b']
        brightness = cmd.get('brightness')
        device_name = device.get('name', 'Unknown')
        
        print(f"\n🎨 Processing queue: {device_name}")
        print(f"   RGB: ({r}, {g}, {b}) @ {brightness}%")
        
        # Execute the command
        result = set_govee_color(device, r, g, b, brightness)
        
        # Log result
        if result.get('success'):
            print(f"✓ {device_name} updated successfully")
        else:
            print(f"✗ {device_name} failed: {result.get('error')}")
        
        # Wait 1.1 seconds before next command (Govee rate limit safety)
        if govee_queue:  # Only wait if more commands remain
            print(f"⏱️  Waiting 1.1s before next command... ({len(govee_queue)} remaining)")
            time.sleep(1.1)
    
    govee_queue_processing = False
    print(f"\n✓ Queue completed\n")

def queue_govee_command(device, r, g, b, brightness=None):
    """Add a Govee command to the queue"""
    global govee_queue
    
    device_name = device.get('name', 'Unknown')
    print(f"📝 Queued: {device_name} → RGB({r},{g},{b}) @ {brightness}%")
    
    govee_queue.append({
        'device': device,
        'r': r,
        'g': g,
        'b': b,
        'brightness': brightness
    })

def apply_theme(theme_name=None):
    """Apply theme to all enabled lighting systems"""
    theme = config.get('theme', {})
    
    if theme_name:
        # If theme name provided, look it up or update current theme name
        theme['name'] = theme_name
    
    rgb = theme.get('rgb', {})
    r, g, b = rgb.get('r', 255), rgb.get('g', 255), rgb.get('b', 255)
    brightness = theme.get('brightness', 80)
    sync_config = theme.get('sync', {})
    
    results = {
        'theme': theme['name'],
        'rgb': rgb,
        'signalrgb': None,
        'govee': None,
        'lan': None
    }
    
    # 1. SignalRGB (PC hardware)
    if sync_config.get('signalrgb'):
        results['signalrgb'] = set_signalrgb_profile(theme['name'])
    
    # 2. Govee (cloud API) - queue commands, don't execute yet
    if sync_config.get('govee'):
        govee_devices = config.get('govee', {}).get('devices', [])
        enabled_devices = [d for d in govee_devices if d.get('enabled', True)]
        
        print(f"\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
        print(f"🎨 Queuing {len(enabled_devices)} Govee device(s)")
        print(f"   Theme: {theme['name']}")
        print(f"   RGB: ({r}, {g}, {b})")
        print(f"   Brightness: {brightness}%")
        print(f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
        
        # Clear existing queue and add new commands
        global govee_queue
        govee_queue.clear()
        
        for device in enabled_devices:
            queue_govee_command(device, r, g, b, brightness)
        
        # Start processing queue in background
        import threading
        threading.Thread(target=process_govee_queue, daemon=True).start()
        
        results['govee'] = {
            'queued': len(enabled_devices),
            'devices': [d.get('name') for d in enabled_devices]
        }
    
    # 3. LAN lights (future: HTTP/UDP control)
    if sync_config.get('lan'):
        results['lan'] = {'success': False, 'error': 'LAN control not yet implemented'}
    
    # Update last applied timestamp
    theme['lastUpdated'] = datetime.now().isoformat()
    lighting_state_cache['last_theme'] = theme['name']
    save_config()
    
    return results

# ============================================================
# API ENDPOINTS
# ============================================================

@app.route('/api/status', methods=['GET'])
def status():
    """Check if server is running"""
    return jsonify({
        'status': 'online', 
        'version': '2.0.0',
        'platform': 'windows' if WINDOWS else 'linux'
    })

@app.route('/api/folders', methods=['GET'])
def get_folders():
    """Get all configured folders"""
    return jsonify({
        'folders': config.get('folders', [])
    })

@app.route('/api/folders', methods=['POST'])
def add_folder():
    """Add a new folder"""
    data = request.json
    
    if not data.get('path'):
        return jsonify({'error': 'Path is required'}), 400
    
    # Validate path exists
    if not os.path.exists(data['path']):
        return jsonify({'error': f"Path does not exist: {data['path']}"}), 400
    
    new_folder = {
        'id': str(uuid.uuid4()),
        'label': data.get('label', os.path.basename(data['path'])),
        'path': data['path'],
        'type': data.get('type', 'games'),
        'scanDepth': data.get('scanDepth', 2),
        'enabled': True
    }
    
    if 'folders' not in config:
        config['folders'] = []
    
    config['folders'].append(new_folder)
    save_config()
    
    print(f"✓ Added folder: {new_folder['path']} ({new_folder['type']})")
    
    return jsonify({
        'success': True,
        'folder': new_folder,
        'folders': config['folders']
    })

@app.route('/api/folders', methods=['DELETE'])
def delete_folder():
    """Delete a folder by ID"""
    folder_id = request.args.get('id')
    
    if not folder_id:
        return jsonify({'error': 'Folder ID is required'}), 400
    
    folders = config.get('folders', [])
    original_count = len(folders)
    config['folders'] = [f for f in folders if f.get('id') != folder_id]
    
    if len(config['folders']) < original_count:
        save_config()
        print(f"✓ Deleted folder: {folder_id}")
        return jsonify({
            'success': True,
            'folders': config['folders']
        })
    
    return jsonify({'error': 'Folder not found'}), 404

@app.route('/api/fs/drives', methods=['GET'])
def get_drives():
    """List drive roots for browsing"""
    drives = list_windows_drives()
    return jsonify({
        'drives': drives
    })

@app.route('/api/fs/list', methods=['GET'])
def list_directory():
    """List subdirectories for a given path"""
    path = request.args.get('path')
    if not path:
        return jsonify({'error': 'Path is required'}), 400

    try:
        abs_path = os.path.abspath(path)
        if not os.path.exists(abs_path):
            return jsonify({'error': f"Path not found: {abs_path}"}), 404
        if not os.path.isdir(abs_path):
            return jsonify({'error': f"Path is not a directory: {abs_path}"}), 400

        entries = []
        with os.scandir(abs_path) as it:
            for entry in it:
                if entry.is_dir():
                    entries.append({
                        'name': entry.name,
                        'path': entry.path
                    })

        entries.sort(key=lambda x: x['name'].lower())
        return jsonify({
            'path': abs_path,
            'directories': entries
        })
    except PermissionError:
        return jsonify({'error': f"Access denied: {path}"}), 403
    except Exception as e:
        return jsonify({'error': f"Failed to list directory: {e}"}), 500

@app.route('/api/fs/create', methods=['POST'])
def create_directory():
    """Create a new directory at the given path"""
    data = request.json or {}
    path = data.get('path')
    if not path:
        return jsonify({'error': 'Path is required'}), 400

    try:
        abs_path = os.path.abspath(path)
        if os.path.exists(abs_path):
            return jsonify({'error': f"Path already exists: {abs_path}"}), 400

        os.makedirs(abs_path, exist_ok=False)
        return jsonify({
            'success': True,
            'path': abs_path
        })
    except PermissionError:
        return jsonify({'error': f"Access denied: {path}"}), 403
    except Exception as e:
        return jsonify({'error': f"Failed to create folder: {e}"}), 500

@app.route('/api/games', methods=['GET'])
def get_games():
    """Return list of all games from Steam + Epic Games + custom folders"""
    all_games = []
    
    # 1. Scan Steam libraries
    steam_libraries = find_steam_libraries()
    print(f"\nScanning {len(steam_libraries)} Steam library path(s)...")
    for library in steam_libraries:
        games = scan_steam_games(library)
        all_games.extend(games)
        print(f"  Steam: {library}: {len(games)} games")
    
    # 2. Scan Epic Games
    epic_path = "C:\\Program Files (x86)\\Epic Games"
    if os.path.exists(epic_path):
        print(f"\nScanning Epic Games...")
        epic_games = scan_epic_games(epic_path)
        all_games.extend(epic_games)
        print(f"  Epic Games: {len(epic_games)} games")
    
    # 3. Scan custom folders
    folders = config.get('folders', [])
    print(f"\nScanning {len(folders)} custom folder(s)...")
    for folder in folders:
        if folder.get('enabled', True):
            games = scan_folder_for_games(folder)
            all_games.extend(games)
    
    # 4. Deduplicate by game ID (fixes duplicate library paths)
    seen_ids = set()
    unique_games = []
    for game in all_games:
        game_id = game.get('id')
        if game_id not in seen_ids:
            seen_ids.add(game_id)
            unique_games.append(game)
    
    print(f"\n✓ Total items found: {len(all_games)} ({len(all_games) - len(unique_games)} duplicates removed)")
    print(f"✓ Unique games: {len(unique_games)}\n")
    
    return jsonify({
        'games': unique_games, 
        'count': len(unique_games),
        'steamLibraries': steam_libraries,
        'customFolders': len(folders)
    })

@app.route('/api/launch', methods=['POST'])
def launch_game():
    """Launch a game via Steam protocol or executable path"""
    data = request.json
    steam_app_id = data.get('steamAppId')
    exec_path = data.get('execPath')
    
    # Launch Steam game
    if steam_app_id:
        print(f"🎮 Launching Steam game: {steam_app_id}")
        
        if WINDOWS:
            os.system(f'start steam://rungameid/{steam_app_id}')
        else:
            os.system(f'xdg-open steam://rungameid/{steam_app_id}')
        
        return jsonify({
            'success': True, 
            'message': f'Launching Steam game {steam_app_id}',
            'steamAppId': steam_app_id
        })
    
    # Launch executable
    if exec_path:
        # Security: Validate the path is inside a configured folder
        # Normalize paths for comparison
        exec_path_normalized = os.path.normpath(exec_path).lower()
        allowed = False
        
        for folder in config.get('folders', []):
            folder_path = folder.get('path', '')
            folder_path_normalized = os.path.normpath(folder_path).lower()
            
            # Check if exec_path starts with folder_path (normalized)
            if exec_path_normalized.startswith(folder_path_normalized):
                # Ensure it's a proper path boundary (not partial directory name match)
                remaining = exec_path_normalized[len(folder_path_normalized):]
                if remaining == '' or remaining.startswith(os.sep.lower()):
                    allowed = True
                    break
        
        if not allowed:
            print(f"❌ Security: Executable path not in configured folders: {exec_path}")
            print(f"   Configured folders: {[f.get('path', '') for f in config.get('folders', [])]}")
            return jsonify({'error': 'Executable path is not in an allowed folder'}), 403
        
        if not os.path.exists(exec_path):
            print(f"❌ Executable not found: {exec_path}")
            return jsonify({'error': 'Executable not found'}), 404
        
        print(f"🚀 Launching executable: {exec_path}")
        
        try:
            if WINDOWS:
                # Launch detached on Windows
                subprocess.Popen(
                    exec_path,
                    shell=True,
                    cwd=os.path.dirname(exec_path),
                    creationflags=subprocess.DETACHED_PROCESS | subprocess.CREATE_NEW_PROCESS_GROUP
                )
            else:
                subprocess.Popen(
                    exec_path,
                    shell=True,
                    cwd=os.path.dirname(exec_path),
                    start_new_session=True
                )
            
            return jsonify({
                'success': True,
                'message': f'Launching {os.path.basename(exec_path)}',
                'execPath': exec_path
            })
        except Exception as e:
            print(f"❌ Error launching executable: {e}")
            return jsonify({'error': str(e)}), 500
    
    return jsonify({'error': 'No steamAppId or execPath provided'}), 400

@app.route('/api/track-recent', methods=['POST'])
def track_recent_play():
    """Track a game as recently played"""
    global config
    data = request.json
    game_id = data.get('id')
    
    if not game_id:
        return jsonify({'error': 'Game id required'}), 400
    
    # Initialize recentPlays if not exists
    if 'recentPlays' not in config:
        config['recentPlays'] = []
    
    # Remove if already exists (to move to top)
    config['recentPlays'] = [r for r in config['recentPlays'] if r.get('id') != game_id]
    
    # Add to front with timestamp
    config['recentPlays'].insert(0, {
        'id': game_id,
        'timestamp': _now_iso()
    })
    
    # Keep only last 50 recent plays
    config['recentPlays'] = config['recentPlays'][:50]
    
    # Save config
    _save_config()
    
    return jsonify({'success': True, 'recentPlays': config['recentPlays']})

@app.route('/api/recent-plays', methods=['GET'])
def get_recent_plays():
    """Get list of recently played game IDs"""
    recent = config.get('recentPlays', [])
    return jsonify({'recentPlays': recent})

@app.route('/api/favorites', methods=['GET'])
def get_favorites():
    """Get list of favorite item IDs"""
    favorites = config.get('favorites', [])
    return jsonify({'favorites': favorites})

@app.route('/api/favorites', methods=['POST'])
def update_favorites():
    """Add or remove a favorite"""
    global config
    data = request.json
    item_id = data.get('id')
    action = data.get('action')  # 'add' or 'remove'
    
    if not item_id or action not in ('add', 'remove'):
        return jsonify({'error': 'id and action (add/remove) required'}), 400
    
    if 'favorites' not in config:
        config['favorites'] = []
    
    if action == 'add':
        if item_id not in config['favorites']:
            config['favorites'].append(item_id)
    elif action == 'remove':
        config['favorites'] = [f for f in config['favorites'] if f != item_id]
    
    # Save config
    _save_config()
    
    return jsonify({'success': True, 'favorites': config['favorites']})

@app.route('/api/browse', methods=['GET'])
def browse_folder():
    """Browse directories (for remote folder picker)"""
    path = request.args.get('path', '')
    
    # Default to drives on Windows, root on Linux
    if not path:
        if WINDOWS:
            # List available drives
            import string
            drives = []
            for letter in string.ascii_uppercase:
                drive = f"{letter}:\\"
                if os.path.exists(drive):
                    drives.append({
                        'name': f"{letter}:",
                        'path': drive,
                        'isDir': True
                    })
            return jsonify({'items': drives, 'path': ''})
        else:
            path = '/'
    
    if not os.path.exists(path):
        return jsonify({'error': 'Path does not exist'}), 404
    
    if not os.path.isdir(path):
        return jsonify({'error': 'Path is not a directory'}), 400
    
    items = []
    try:
        for entry in os.listdir(path):
            full_path = os.path.join(path, entry)
            try:
                is_dir = os.path.isdir(full_path)
                if is_dir:  # Only show directories for folder picker
                    items.append({
                        'name': entry,
                        'path': full_path,
                        'isDir': True
                    })
            except PermissionError:
                continue
    except PermissionError:
        return jsonify({'error': 'Permission denied'}), 403
    
    # Sort alphabetically
    items.sort(key=lambda x: x['name'].lower())
    
    return jsonify({
        'items': items,
        'path': path,
        'parent': os.path.dirname(path) if path != '/' and path != path[:3] else None
    })

@app.route('/api/config', methods=['GET'])
def get_config():
    """Get current configuration"""
    return jsonify({
        'folders': config.get('folders', []),
        'steamLibraries': find_steam_libraries(),
        'manualApps': config.get('manualApps', []),
        'manualUrls': config.get('manualUrls', []),
        'devices': config.get('devices', []),
        'govee': config.get('govee', {}),
        'signalrgb': config.get('signalrgb', {}),
        'theme': config.get('theme', {}),
        'platform': 'windows' if WINDOWS else 'linux'
    })

@app.route('/api/config', methods=['POST'])
def update_config():
    """Update configuration (for Govee/SignalRGB settings)"""
    data = request.json
    
    # Update Govee config
    if 'govee' in data:
        if 'govee' not in config:
            config['govee'] = {}
        config['govee'].update(data['govee'])
    
    # Update SignalRGB config
    if 'signalrgb' in data:
        if 'signalrgb' not in config:
            config['signalrgb'] = {}
        config['signalrgb'].update(data['signalrgb'])
    
    # Save to file
    save_config()
    
    return jsonify({
        'success': True,
        'message': 'Configuration updated',
        'config': config
    })

@app.route('/api/quick-access', methods=['GET'])
def get_quick_access():
    """Get quick access items (manual apps + URLs marked as 'quick')"""
    quick_items = []
    
    # Manual apps with quick category
    for app in config.get('manualApps', []):
        if app.get('enabled', True) and app.get('category') == 'quick':
            quick_items.append({
                'id': app['id'],
                'title': app['title'],
                'icon': app.get('icon', '📱'),
                'type': 'app',
                'launchType': app['launchType'],
                'launchValue': app['launchValue']
            })
    
    # Manual URLs with quick category
    for url in config.get('manualUrls', []):
        if url.get('enabled', True) and url.get('category') == 'quick':
            quick_items.append({
                'id': url['id'],
                'title': url['title'],
                'icon': url.get('icon', '🌐'),
                'type': 'url',
                'url': url['url']
            })
    
    return jsonify({'items': quick_items})

@app.route('/api/launch-app', methods=['POST'])
def launch_app():
    """Launch a manual app or URL from config"""
    data = request.json
    app_id = data.get('id')
    
    if not app_id:
        return jsonify({'error': 'No app ID provided'}), 400
    
    # Check manual apps
    for app in config.get('manualApps', []):
        if app['id'] == app_id:
            launch_type = app['launchType']
            launch_value = app['launchValue']
            
            try:
                if launch_type == 'url':
                    # Open URL in default browser
                    if WINDOWS:
                        os.system(f'start "" "{launch_value}"')
                    else:
                        os.system(f'xdg-open "{launch_value}"')
                elif launch_type == 'cmd':
                    # Execute command
                    subprocess.Popen(launch_value, shell=True, start_new_session=True)
                
                return jsonify({
                    'success': True,
                    'message': f'Launched {app["title"]}'
                })
            except Exception as e:
                return jsonify({'error': str(e)}), 500
    
    # Check manual URLs
    for url in config.get('manualUrls', []):
        if url['id'] == app_id:
            try:
                if WINDOWS:
                    os.system(f'start "" "{url["url"]}"')
                else:
                    os.system(f'xdg-open "{url["url"]}"')
                
                return jsonify({
                    'success': True,
                    'message': f'Opened {url["title"]}'
                })
            except Exception as e:
                return jsonify({'error': str(e)}), 500
    
    return jsonify({'error': f'App/URL not found: {app_id}'}), 404

@app.route('/api/system-stats', methods=['GET'])
def get_system_stats():
    """Get system stats for this PC"""
    try:
        import psutil
        
        # CPU
        cpu_percent = psutil.cpu_percent(interval=0.1)
        cpu_count = psutil.cpu_count()
        
        # Memory
        mem = psutil.virtual_memory()
        
        # Disk
        disk = psutil.disk_usage('/')
        
        # Network
        net = psutil.net_io_counters()
        
        stats = {
            'hostname': os.environ.get('COMPUTERNAME', os.environ.get('HOSTNAME', 'Unknown')),
            'platform': 'windows' if WINDOWS else 'linux',
            'cpu': {
                'usage': cpu_percent,
                'cores': cpu_count
            },
            'memory': {
                'used': round(mem.used / (1024**3), 2),
                'total': round(mem.total / (1024**3), 2),
                'percent': mem.percent
            },
            'disk': {
                'used': round(disk.used / (1024**3), 2),
                'total': round(disk.total / (1024**3), 2),
                'percent': disk.percent
            },
            'network': {
                'sent': round(net.bytes_sent / (1024**2), 2),
                'recv': round(net.bytes_recv / (1024**2), 2)
            }
        }
        
        # Try to get GPU stats (optional)
        try:
            # This will only work if nvidia-ml-py3 is installed
            import pynvml
            pynvml.nvmlInit()
            handle = pynvml.nvmlDeviceGetHandleByIndex(0)
            gpu_util = pynvml.nvmlDeviceGetUtilizationRates(handle)
            gpu_mem = pynvml.nvmlDeviceGetMemoryInfo(handle)
            
            stats['gpu'] = {
                'usage': gpu_util.gpu,
                'memory': {
                    'used': round(gpu_mem.used / (1024**3), 2),
                    'total': round(gpu_mem.total / (1024**3), 2)
                }
            }
            pynvml.nvmlShutdown()
        except:
            pass
        
        return jsonify(stats)
    
    except ImportError:
        return jsonify({'error': 'psutil not installed. Run: pip install psutil'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/devices', methods=['GET'])
def get_devices():
    """Get all configured devices and their status"""
    devices = config.get('devices', [])
    device_stats = []
    
    for device in devices:
        if not device.get('enabled', True):
            continue
        
        device_info = {
            'id': device.get('id') or f"{device.get('name', 'device')}-{device.get('ip', 'unknown')}",
            'name': device.get('name', 'Unknown Device'),
            'type': device.get('type', 'pc'),
            'ip': device.get('ip', '0.0.0.0'),
            'online': False,
            'stats': None
        }
        
        # Try to fetch stats if monitoring is enabled
        if device.get('monitorStats', True):
            try:
                import requests
                response = requests.get(
                    f"http://{device.get('ip')}:{device.get('port', 5050)}/stats",
                    timeout=2
                )
                if response.status_code == 200:
                    device_info['online'] = True
                    device_info['stats'] = response.json()
            except:
                pass
        
        device_stats.append(device_info)
    
    return jsonify({'devices': device_stats})


@app.route('/api/devices/test', methods=['POST'])
def test_device_agent():
    """Test connectivity to a SeeZee Agent instance."""
    data = request.json or {}
    ip = (data.get('ip') or '').strip()
    port = _clamp_int(data.get('port', 5050), 1, 65535, 5050)

    if not ip:
        return jsonify({'ok': False, 'error': 'ip is required'}), 400

    try:
        import requests
    except ImportError:
        return jsonify({'ok': False, 'error': 'requests library not installed on server'}), 500

    base = f"http://{ip}:{port}"
    try:
        health = requests.get(f"{base}/health", timeout=2)
        if health.status_code != 200:
            return jsonify({'ok': False, 'error': f'Agent health check returned {health.status_code}'}), 502
        payload = health.json() if health.headers.get('content-type', '').startswith('application/json') else None
        return jsonify({'ok': True, 'ip': ip, 'port': port, 'health': payload})
    except Exception as e:
        return jsonify({'ok': False, 'error': str(e)}), 502


@app.route('/api/devices', methods=['POST'])
def add_device():
    """Add a device to monitoring config."""
    data = request.json or {}
    name = (data.get('name') or '').strip() or 'PC'
    ip = (data.get('ip') or '').strip()
    port = _clamp_int(data.get('port', 5050), 1, 65535, 5050)
    device_type = (data.get('type') or 'pc').strip() or 'pc'

    if not ip:
        return jsonify({'error': 'ip is required'}), 400

    devices = config.get('devices', [])
    if not isinstance(devices, list):
        devices = []

    # De-dupe by ip+port
    for existing in devices:
        if str(existing.get('ip', '')).strip() == ip and int(existing.get('port', 5050) or 5050) == port:
            existing['enabled'] = True
            existing['name'] = existing.get('name') or name
            if 'type' not in existing:
                existing['type'] = device_type
            config['devices'] = devices
            save_config()
            return jsonify({'success': True, 'device': existing, 'deduped': True})

    new_device = {
        'id': str(uuid.uuid4()),
        'name': name,
        'ip': ip,
        'port': port,
        'type': device_type,
        'enabled': True,
        'monitorStats': True
    }
    devices.append(new_device)
    config['devices'] = devices
    save_config()

    return jsonify({'success': True, 'device': new_device, 'deduped': False})

@app.route('/api/theme/current', methods=['GET'])
def get_current_theme():
    """Get current theme state"""
    theme = config.get('theme', {})
    return jsonify({
        'theme': theme,
        'cache': {
            'last_theme': lighting_state_cache['last_theme'],
            'last_rgb': lighting_state_cache['last_rgb']
        }
    })

@app.route('/api/theme/set', methods=['POST'])
def set_theme():
    """Apply a theme to all lighting systems"""
    data = request.json
    theme_name = data.get('name')
    rgb = data.get('rgb')  # {r, g, b}
    brightness = data.get('brightness')
    
    if not theme_name and not rgb:
        return jsonify({'error': 'Theme name or RGB values required'}), 400
    
    # Update config
    if 'theme' not in config:
        config['theme'] = {}
    
    if theme_name:
        config['theme']['name'] = theme_name
    
    if rgb:
        config['theme']['rgb'] = rgb
    
    if brightness is not None:
        config['theme']['brightness'] = brightness
    
    # Apply to all systems
    try:
        results = apply_theme(theme_name)
        return jsonify({
            'success': True,
            'message': f"Applied theme: {config['theme']['name']}",
            'results': results
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/lighting/devices', methods=['GET'])
def get_lighting_devices():
    """Get all configured lighting devices"""
    return jsonify({
        'govee': {
            'enabled': config.get('govee', {}).get('enabled', False),
            'devices': config.get('govee', {}).get('devices', [])
        },
        'signalrgb': {
            'enabled': config.get('signalrgb', {}).get('enabled', False),
            'profiles': config.get('signalrgb', {}).get('profiles', {})
        },
        'lan': {
            'enabled': config.get('lan_lights', {}).get('enabled', False),
            'devices': config.get('lan_lights', {}).get('devices', [])
        }
    })

@app.route('/api/lighting/sync', methods=['POST'])
def sync_lighting():
    """Force sync current theme to all devices (bypass cache)"""
    # Clear cache to force update
    lighting_state_cache['last_rgb'] = None
    lighting_state_cache['last_theme'] = None
    
    try:
        results = apply_theme()
        return jsonify({
            'success': True,
            'message': 'Forced lighting sync',
            'results': results
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/lighting/govee/devices', methods=['GET'])
def discover_govee_devices():
    """Query Govee API for actual devices on account (VERIFICATION)"""
    govee_config = config.get('govee', {})
    
    if not govee_config.get('enabled'):
        return jsonify({'error': 'Govee not enabled in config'}), 400
    
    api_key = govee_config.get('apiKey', '')
    if not api_key:
        return jsonify({'error': 'Govee API key not configured'}), 400
    
    try:
        response = fetch_govee_devices(api_key)
        
        if response.status_code == 200:
            data = response.json()
            
            # Extract devices from API response
            api_devices = data.get('data', {}).get('devices', [])
            
            # Return in expected format for frontend
            return jsonify({
                'success': True,
                'devices': api_devices
            })
        else:
            return jsonify({
                'success': False,
                'status': response.status_code,
                'error': response.text,
                'message': 'Govee API returned error'
            }), response.status_code
            
    except ImportError:
        return jsonify({'error': 'requests library not installed'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/lighting/govee/sync', methods=['POST'])
def sync_govee_devices():
    """Fetch devices from Govee API and sync into config"""
    govee_config = config.get('govee', {})
    
    if not govee_config.get('enabled'):
        return jsonify({'error': 'Govee not enabled in config'}), 400
    
    api_key = govee_config.get('apiKey', '')
    if not api_key:
        return jsonify({'error': 'Govee API key not configured'}), 400
    
    try:
        response = fetch_govee_devices(api_key)
        
        if response.status_code != 200:
            return jsonify({
                'success': False,
                'status': response.status_code,
                'error': response.text,
                'message': 'Govee API returned error'
            }), response.status_code
        
        data = response.json()
        api_devices = data.get('data', {}).get('devices', [])
        
        # Preserve enabled flags for existing devices
        existing = {d.get('device'): d for d in govee_config.get('devices', [])}
        synced = []
        
        for d in api_devices:
            device_id = d.get('device')
            if not device_id:
                continue
            synced.append({
                'device': device_id,
                'model': d.get('model'),
                'name': d.get('deviceName') or d.get('name') or device_id,
                'enabled': existing.get(device_id, {}).get('enabled', True)
            })
        
        if 'govee' not in config:
            config['govee'] = {}
        config['govee']['devices'] = synced
        save_config()
        
        return jsonify({
            'success': True,
            'devices': synced,
            'count': len(synced)
        })
    
    except ImportError:
        return jsonify({'error': 'requests library not installed'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/lighting/govee/state', methods=['GET'])
def get_govee_device_state():
    """Query current state of a Govee device"""
    device_mac = request.args.get('device')
    model = request.args.get('model')
    
    if not device_mac or not model:
        return jsonify({'error': 'device and model parameters required'}), 400
    
    govee_config = config.get('govee', {})
    api_key = govee_config.get('apiKey', '')
    
    if not api_key:
        return jsonify({'error': 'Govee API key not configured'}), 400
    
    try:
        import requests
        
        headers = {
            'Govee-API-Key': api_key,
            'Content-Type': 'application/json'
        }
        
        response = requests.get(
            f'https://developer-api.govee.com/v1/devices/state',
            headers=headers,
            params={'device': device_mac, 'model': model},
            timeout=5
        )
        
        return jsonify({
            'status': response.status_code,
            'response': response.json() if response.status_code == 200 else response.text
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/lighting/batch', methods=['POST'])
def lighting_batch_control():
    """Apply lighting to multiple devices with queuing"""
    data = request.json
    device_macs = data.get('devices', [])
    rgb = data.get('rgb', {'r': 255, 'g': 255, 'b': 255})
    brightness = data.get('brightness', 80)
    delay = data.get('delay', 1.1)
    enable_signalrgb = data.get('enableSignalRGB', True)
    enable_govee = data.get('enableGovee', True)
    
    results = {
        'signalrgb': None,
        'govee': None
    }
    
    # Apply SignalRGB if enabled
    if enable_signalrgb:
        signalrgb_config = config.get('signalrgb', {})
        if signalrgb_config.get('enabled'):
            # Map RGB to closest profile or apply direct color
            results['signalrgb'] = {
                'success': True,
                'message': f'Applied RGB({rgb["r"]}, {rgb["g"]}, {rgb["b"]})'
            }
    
    # Queue Govee commands if enabled
    if enable_govee and device_macs:
        govee_config = config.get('govee', {})
        all_devices = govee_config.get('devices', [])
        
        # Find matching devices
        selected_devices = [d for d in all_devices if d.get('device') in device_macs]
        
        if selected_devices:
            global govee_queue
            govee_queue.clear()
            
            r, g, b = rgb['r'], rgb['g'], rgb['b']
            
            print(f"\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
            print(f"🎨 Batch queue: {len(selected_devices)} device(s)")
            print(f"   RGB: ({r}, {g}, {b}) @ {brightness}%")
            print(f"   Delay: {delay}s between commands")
            print(f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
            
            for device in selected_devices:
                queue_govee_command(device, r, g, b, brightness)
            
            # Start processing
            import threading
            threading.Thread(target=process_govee_queue, daemon=True).start()
            
            results['govee'] = {
                'queued': len(selected_devices),
                'devices': [d.get('name', 'Unknown') for d in selected_devices],
                'estimated_time': len(selected_devices) * delay
            }
    
    return jsonify(results)

@app.route('/api/lighting/device', methods=['POST'])
def lighting_device_control():
    """Apply lighting to a single device immediately"""
    data = request.json
    device_mac = data.get('device')
    rgb = data.get('rgb', {'r': 255, 'g': 255, 'b': 255})
    brightness = data.get('brightness', 80)
    
    if not device_mac:
        return jsonify({'error': 'device MAC required'}), 400
    
    # Find device in config
    govee_config = config.get('govee', {})
    all_devices = govee_config.get('devices', [])
    device = next((d for d in all_devices if d.get('device') == device_mac), None)
    
    if not device:
        return jsonify({'error': 'Device not found in configuration'}), 404
    
    r, g, b = rgb['r'], rgb['g'], rgb['b']
    result = set_govee_color(device, r, g, b, brightness)
    
    return jsonify(result)


# ============================================================
# AUDIO
# ============================================================

@app.route('/api/audio/state', methods=['GET'])
def get_audio_state():
    """Return current audio control capabilities and state."""
    system_state = _system_volume_get()
    spotify_configured = _spotify_access_token() is not None
    spotify_now_playing = None
    spotify_error = None

    if spotify_configured:
        data, error = _spotify_request('GET', '/v1/me/player/currently-playing')
        if error is None:
            spotify_now_playing = _normalize_spotify_currently_playing(data)
        else:
            # error is a tuple of (response, status_code)
            # Try to extract a meaningful message
            try:
                response_obj, status_code = error
                if hasattr(response_obj, 'json'):
                    error_data = response_obj.get_json()
                    if isinstance(error_data, dict):
                        spotify_error = error_data.get('details', {}).get('error', {}).get('message', f'Spotify error {status_code}')
                        if not spotify_error:
                            if status_code == 401:
                                spotify_error = 'Invalid or expired Spotify token'
                            elif status_code == 404:
                                spotify_error = 'No active Spotify device found'
                            else:
                                spotify_error = error_data.get('error', f'Spotify error {status_code}')
            except:
                pass

    return jsonify({
        'system': system_state,
        'spotify': {
            'configured': spotify_configured,
            'nowPlaying': spotify_now_playing,
            'error': spotify_error
        },
        'timestamp': _now_iso()
    })


@app.route('/api/audio/system/volume', methods=['GET'])
def get_system_volume():
    return jsonify(_system_volume_get())


@app.route('/api/audio/system/volume', methods=['POST'])
def set_system_volume():
    data = request.json or {}
    volume = data.get('volume')
    result = _system_volume_set(volume)
    status = 200 if result.get('success') else 500
    return jsonify(result), status


@app.route('/api/audio/spotify/token', methods=['POST'])
def set_spotify_token():
    """Store Spotify access and refresh tokens in config"""
    global config
    data = request.json or {}
    access_token = data.get('accessToken')
    refresh_token = data.get('refreshToken')

    if not access_token or not isinstance(access_token, str) or not access_token.strip():
        return jsonify({'error': 'accessToken required'}), 400

    if 'spotify' not in config or not isinstance(config.get('spotify'), dict):
        config['spotify'] = {}

    config['spotify']['access_token'] = access_token.strip()
    if refresh_token and isinstance(refresh_token, str) and refresh_token.strip():
        config['spotify']['refresh_token'] = refresh_token.strip()
    
    config['spotify']['lastUpdated'] = _now_iso()
    save_config()

    return jsonify({'success': True, 'message': 'Spotify tokens saved'}), 200


@app.route('/api/audio/spotify/currently-playing', methods=['GET'])
def spotify_currently_playing():
    data, error = _spotify_request('GET', '/v1/me/player/currently-playing')
    if error is not None:
        return error

    return jsonify({
        'success': True,
        'nowPlaying': _normalize_spotify_currently_playing(data)
    })


@app.route('/api/audio/spotify/player', methods=['GET'])
def spotify_player():
    data, error = _spotify_request('GET', '/v1/me/player')
    if error is not None:
        return error
    return jsonify({'success': True, 'player': data})


@app.route('/api/audio/spotify/play', methods=['POST'])
def spotify_play():
    data, error = _spotify_request('PUT', '/v1/me/player/play')
    if error is not None:
        return error
    return jsonify({'success': True, 'result': data})


@app.route('/api/audio/spotify/pause', methods=['POST'])
def spotify_pause():
    data, error = _spotify_request('PUT', '/v1/me/player/pause')
    if error is not None:
        return error
    return jsonify({'success': True, 'result': data})


@app.route('/api/audio/spotify/next', methods=['POST'])
def spotify_next():
    data, error = _spotify_request('POST', '/v1/me/player/next')
    if error is not None:
        return error
    return jsonify({'success': True, 'result': data})


@app.route('/api/audio/spotify/previous', methods=['POST'])
def spotify_previous():
    data, error = _spotify_request('POST', '/v1/me/player/previous')
    if error is not None:
        return error
    return jsonify({'success': True, 'result': data})


@app.route('/api/audio/spotify/shuffle', methods=['POST'])
def spotify_shuffle():
    payload = request.json or {}
    enabled = payload.get('enabled')
    enabled = bool(enabled)
    data, error = _spotify_request('PUT', '/v1/me/player/shuffle', params={'state': 'true' if enabled else 'false'})
    if error is not None:
        return error
    return jsonify({'success': True, 'enabled': enabled, 'result': data})


@app.route('/api/audio/spotify/repeat', methods=['POST'])
def spotify_repeat():
    payload = request.json or {}
    mode = payload.get('mode')
    if mode not in ('off', 'context', 'track'):
        return jsonify({'error': "mode must be one of: off, context, track"}), 400
    data, error = _spotify_request('PUT', '/v1/me/player/repeat', params={'state': mode})
    if error is not None:
        return error
    return jsonify({'success': True, 'mode': mode, 'result': data})


@app.route('/api/audio/spotify/seek', methods=['POST', 'OPTIONS'])
def spotify_seek():
    if request.method == 'OPTIONS':
        response = jsonify({})
        response.headers.add('Access-Control-Allow-Origin', request.headers.get('Origin', '*'))
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        response.status_code = 200
        return response
    
    payload = request.json or {}
    position_ms = payload.get('positionMs')
    
    if position_ms is None or not isinstance(position_ms, (int, float)):
        return jsonify({'error': 'positionMs required and must be a number'}), 400
    
    position_ms = int(position_ms)
    data, error = _spotify_request('PUT', '/v1/me/player/seek', params={'position_ms': position_ms})
    if error is not None:
        return error
    return jsonify({'success': True, 'positionMs': position_ms, 'result': data})


@app.route('/api/audio/spotify/login', methods=['GET'])
def spotify_login_url():
    """Generate a Spotify OAuth URL for user login.
    
    User should visit this URL to authorize access to Spotify account.
    After auth, they get a code to exchange for an access token.
    """
    client_id = "6eb241b1049a428dbdbfa9cb52596c58a"
    redirect_uri = "http://localhost:8080/callback"
    scope = "user-read-playback-state user-modify-playback-state user-read-currently-playing streaming"
    
    auth_url = (
        f"https://accounts.spotify.com/authorize?"
        f"client_id={client_id}&"
        f"response_type=code&"
        f"redirect_uri={redirect_uri}&"
        f"scope={scope.replace(' ', '%20')}&"
        f"show_dialog=true"
    )
    
    return jsonify({
        'url': auth_url,
        'message': 'Visit this URL to authorize Spotify access'
    })

# ============================================================
# STARTUP
# ============================================================

if __name__ == '__main__':
    print("=" * 60)
    print("  SEE STUDIO ZEE PC Server - Game Library Bridge v2.0")
    print("=" * 60)
    
    # Load configuration
    load_config()
    
    # Auto-detect Steam
    libraries = find_steam_libraries()
    print(f"\n📚 Found {len(libraries)} Steam library folder(s):")
    for lib in libraries:
        exists = "✓" if os.path.exists(lib) else "✗"
        print(f"  {exists} {lib}")
    
    # Show custom folders
    folders = config.get('folders', [])
    if folders:
        print(f"\n📁 Custom folders ({len(folders)}):")
        for folder in folders:
            exists = "✓" if os.path.exists(folder['path']) else "✗"
            print(f"  {exists} [{folder['type']}] {folder['path']}")
    
    print("\n🚀 Server starting on: http://0.0.0.0:5555")
    print("🔒 Make sure your firewall allows connections on port 5555!")
    print("\n📱 Configure your Pi to connect to this PC's IP address")
    print("⌨️  Press Ctrl+C to stop\n")
    print("=" * 60 + "\n")
    
    try:
        app.run(host='0.0.0.0', port=5555, debug=False)
    except KeyboardInterrupt:
        print("\n\n👋 Server stopped. Goodbye!")
