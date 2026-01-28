"""
SeeZee System Monitor Agent
Lightweight background service that exposes system stats via HTTP

Install: pip install psutil flask flask-cors
Run: python seezee_agent.py
"""

from flask import Flask, jsonify
from flask_cors import CORS
import psutil
import os
import socket

app = Flask(__name__)
CORS(app)

def get_hostname():
    """Get system hostname"""
    return socket.gethostname()

@app.route('/stats', methods=['GET'])
def get_stats():
    """Return system statistics"""
    try:
        # CPU
        cpu_percent = psutil.cpu_percent(interval=0.1)
        cpu_freq = psutil.cpu_freq()
        cpu_count = psutil.cpu_count()
        
        # Memory
        mem = psutil.virtual_memory()
        
        # Disk
        disk = psutil.disk_usage('/')
        
        # Network
        net = psutil.net_io_counters()
        
        # Temperatures (if available)
        temps = {}
        try:
            temps_raw = psutil.sensors_temperatures()
            if temps_raw:
                for name, entries in temps_raw.items():
                    if entries:
                        temps[name] = entries[0].current
        except:
            pass
        
        stats = {
            'hostname': get_hostname(),
            'ip': get_local_ip(),
            'timestamp': int(psutil.boot_time()),
            'uptime': int(psutil.boot_time()),
            'cpu': {
                'usage': round(cpu_percent, 1),
                'cores': cpu_count,
                'freq': round(cpu_freq.current, 0) if cpu_freq else 0
            },
            'memory': {
                'used': round(mem.used / (1024**3), 2),
                'total': round(mem.total / (1024**3), 2),
                'percent': round(mem.percent, 1)
            },
            'disk': {
                'used': round(disk.used / (1024**3), 2),
                'total': round(disk.total / (1024**3), 2),
                'percent': round(disk.percent, 1)
            },
            'network': {
                'sent': round(net.bytes_sent / (1024**3), 2),
                'recv': round(net.bytes_recv / (1024**3), 2)
            },
            'temps': temps
        }
        
        # Try to get GPU stats (NVIDIA only for now)
        try:
            import pynvml
            pynvml.nvmlInit()
            device_count = pynvml.nvmlDeviceGetCount()
            
            gpus = []
            for i in range(device_count):
                handle = pynvml.nvmlDeviceGetHandleByIndex(i)
                name = pynvml.nvmlDeviceGetName(handle)
                util = pynvml.nvmlDeviceGetUtilizationRates(handle)
                mem_info = pynvml.nvmlDeviceGetMemoryInfo(handle)
                temp = pynvml.nvmlDeviceGetTemperature(handle, 0)
                
                gpus.append({
                    'name': name,
                    'usage': util.gpu,
                    'memory': {
                        'used': round(mem_info.used / (1024**3), 2),
                        'total': round(mem_info.total / (1024**3), 2),
                        'percent': round((mem_info.used / mem_info.total) * 100, 1)
                    },
                    'temp': temp
                })
            
            stats['gpu'] = gpus[0] if len(gpus) == 1 else gpus
            pynvml.nvmlShutdown()
        except:
            pass
        
        return jsonify(stats)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def get_local_ip():
    """Get local IP address"""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except:
        return "127.0.0.1"

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'online',
        'hostname': get_hostname(),
        'ip': get_local_ip()
    })

if __name__ == '__main__':
    print("=" * 60)
    print("  SeeZee System Monitor Agent")
    print("=" * 60)
    print(f"\n📊 Hostname: {get_hostname()}")
    print(f"🌐 IP Address: {get_local_ip()}")
    print(f"🚀 Server starting on: http://0.0.0.0:7777")
    print("\n💡 Add this device to your Pi's seezee_config.json")
    print("⌨️  Press Ctrl+C to stop\n")
    print("=" * 60 + "\n")
    
    try:
        app.run(host='0.0.0.0', port=7777, debug=False)
    except KeyboardInterrupt:
        print("\n\n👋 Agent stopped. Goodbye!")
