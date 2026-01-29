#!/usr/bin/env python3
"""
Add a PC agent to seezee_config.json
Usage:
  python windows/add_agent_to_config.py http://192.168.1.100:5050 "My Desktop"

Or interactive:
  python windows/add_agent_to_config.py
"""

import json
import sys
import socket
from pathlib import Path

def get_local_ip():
    """Get the local IP address"""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except:
        return "127.0.0.1"

def add_agent(url, name=None):
    """Add an agent to seezee_config.json"""
    
    config_path = Path(__file__).parent.parent / "seezee_config.json"
    
    if not config_path.exists():
        print(f"❌ Config file not found: {config_path}")
        return False
    
    # Load config
    with open(config_path, 'r') as f:
        config = json.load(f)
    
    # Ensure agents list exists
    if "agents" not in config:
        config["agents"] = []
    
    # Check if already exists
    for agent in config["agents"]:
        if agent.get("url") == url:
            print(f"⚠️  Agent already exists: {url}")
            return False
    
    # Add new agent
    new_agent = {
        "name": name or f"PC @ {url}",
        "url": url,
        "enabled": True
    }
    
    config["agents"].append(new_agent)
    
    # Save config
    with open(config_path, 'w') as f:
        json.dump(config, f, indent=2)
    
    print(f"✅ Added agent: {new_agent['name']}")
    print(f"   URL: {url}")
    return True

if __name__ == "__main__":
    if len(sys.argv) > 1:
        # Command line arguments
        url = sys.argv[1]
        name = sys.argv[2] if len(sys.argv) > 2 else None
        add_agent(url, name)
    else:
        # Interactive mode
        print("🚀 Add PC Agent to SeeZee Config\n")
        
        # Suggest local IP
        local_ip = get_local_ip()
        print(f"💡 This PC's IP: {local_ip}")
        print(f"   (Agent runs on port 5050)\n")
        
        url = input("Enter agent URL (e.g., http://192.168.1.100:5050): ").strip()
        if not url.startswith("http"):
            url = f"http://{url}"
        
        name = input("Enter agent name (optional, press Enter to skip): ").strip()
        
        if add_agent(url, name or None):
            print("\n✅ Successfully updated seezee_config.json")
        else:
            print("\n❌ Failed to add agent")
            sys.exit(1)
