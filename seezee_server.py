from flask import Flask, jsonify, request
from flask_cors import CORS
import os
import json
import subprocess
import hashlib
import uuid
import re
from datetime import datetime

try:
    import winreg  # Windows only
    WINDOWS = True
except ImportError:
    WINDOWS = False

from pathlib import Path

app = Flask(__name__)
CORS(app)  # Allow Pi to connect

# Configuration file path
CONFIG_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "seezee_config.json")

# Default configuration
DEFAULT_CONFIG = {
    "port": 5555,
    "folders": [],  # List of FolderConfig objects
    "steamLibraries": []  # Auto-detected Steam paths
}

# In-memory config (loaded from file)
config = {}

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
                        'installDir': install_dir,
                        'coverImage': f"https://cdn.cloudflare.steamstatic.com/steam/apps/{app_id}/library_600x900.jpg"
                    })
                    
        except Exception as e:
            print(f"Error reading manifest {file}: {e}")
    
    return games

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
    
    # Patterns to ignore
    ignore_patterns = [
        'unins', 'uninst', 'uninstall',
        'crash', 'crashhandler', 'crashreport',
        'redist', 'vcredist', 'directx', 'dxsetup',
        'ue4prereq', 'dotnet', 'setup',
        'helper', 'service', 'updater', 'update'
    ]
    
    def should_ignore(filename):
        lower = filename.lower()
        for pattern in ignore_patterns:
            if pattern in lower:
                return True
        return False
    
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
                if should_ignore(entry):
                    continue
                
                # Check file size (skip tiny exe files < 1MB)
                try:
                    size = os.path.getsize(full_path)
                    if size < 1_000_000:  # Less than 1MB
                        continue
                except:
                    continue
                
                # Generate stable ID from path
                path_hash = hashlib.md5(full_path.encode()).hexdigest()[:12]
                
                games.append({
                    'id': f"{folder_type}_{path_hash}",
                    'title': title_from_filename(entry),
                    'source': 'tool' if folder_type == 'tools' else 'local',
                    'execPath': full_path,
                    'folderSource': folder_id
                })
            
            elif os.path.isdir(full_path) and current_depth < scan_depth:
                scan_dir(full_path, current_depth + 1)
    
    scan_dir(folder_path)
    print(f"Found {len(games)} executables in {folder_path}")
    return games

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

@app.route('/api/games', methods=['GET'])
def get_games():
    """Return list of all games from Steam + custom folders"""
    all_games = []
    
    # 1. Scan Steam libraries
    steam_libraries = find_steam_libraries()
    print(f"\nScanning {len(steam_libraries)} Steam library path(s)...")
    for library in steam_libraries:
        games = scan_steam_games(library)
        all_games.extend(games)
        print(f"  Steam: {library}: {len(games)} games")
    
    # 2. Scan custom folders
    folders = config.get('folders', [])
    print(f"\nScanning {len(folders)} custom folder(s)...")
    for folder in folders:
        if folder.get('enabled', True):
            games = scan_folder_for_games(folder)
            all_games.extend(games)
    
    print(f"\n✓ Total items found: {len(all_games)}\n")
    
    return jsonify({
        'games': all_games, 
        'count': len(all_games),
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
        allowed = False
        for folder in config.get('folders', []):
            folder_path = folder.get('path', '')
            if exec_path.startswith(folder_path):
                allowed = True
                break
        
        if not allowed:
            return jsonify({'error': 'Executable path is not in an allowed folder'}), 403
        
        if not os.path.exists(exec_path):
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
            return jsonify({'error': str(e)}), 500
    
    return jsonify({'error': 'No steamAppId or execPath provided'}), 400

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
        'platform': 'windows' if WINDOWS else 'linux'
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
            'id': device['id'],
            'name': device['name'],
            'type': device['type'],
            'ip': device['ip'],
            'online': False,
            'stats': None
        }
        
        # Try to fetch stats if monitoring is enabled
        if device.get('monitorStats', False):
            try:
                import requests
                response = requests.get(
                    f"http://{device['ip']}:{device.get('port', 7777)}/stats",
                    timeout=2
                )
                if response.status_code == 200:
                    device_info['online'] = True
                    device_info['stats'] = response.json()
            except:
                pass
        
        device_stats.append(device_info)
    
    return jsonify({'devices': device_stats})

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
