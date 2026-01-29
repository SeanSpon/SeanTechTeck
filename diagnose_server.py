#!/usr/bin/env python3
"""
Diagnostic: Check SeeZee Server Status and Game Launch Configuration
"""

import subprocess
import json
import time
import sys
from pathlib import Path

REPO_DIR = Path(__file__).parent.parent
CONFIG_FILE = REPO_DIR / "seezee_config.json"
SERVER_URL = "http://127.0.0.1:5555"

print("\n" + "="*60)
print("  SeeZee Server Diagnostic")
print("="*60 + "\n")

# Check if server is running
print("🔍 Checking if server is running...")
try:
    result = subprocess.run(
        ["powershell", "-Command", f"Invoke-RestMethod {SERVER_URL}/api/status"],
        capture_output=True,
        text=True,
        timeout=5
    )
    if result.returncode == 0:
        print("   ✅ Server is RUNNING")
    else:
        print("   ❌ Server is NOT responding")
        print(f"   Error: {result.stderr}")
except Exception as e:
    print(f"   ❌ Error checking server: {e}")

# Check config
print(f"\n📋 Reading config from: {CONFIG_FILE}")
if CONFIG_FILE.exists():
    with open(CONFIG_FILE) as f:
        config = json.load(f)
    
    folders = config.get("folders", [])
    print(f"   Configured folders: {len(folders)}")
    for folder in folders:
        print(f"     • {folder.get('label')} -> {folder.get('path')}")
        print(f"       Enabled: {folder.get('enabled')}")
        print(f"       Type: {folder.get('type')}")
    
    if not folders:
        print("   ⚠️  WARNING: No folders configured!")
else:
    print(f"   ❌ Config file not found!")

# Try to get games
print(f"\n🎮 Fetching games from server...")
try:
    result = subprocess.run(
        ["powershell", "-Command", f"(Invoke-RestMethod {SERVER_URL}/api/games) | ConvertTo-Json"],
        capture_output=True,
        text=True,
        timeout=10
    )
    if result.returncode == 0:
        games_data = json.loads(result.stdout)
        games_list = games_data if isinstance(games_data, list) else games_data.get("games", [])
        print(f"   ✅ Found {len(games_list)} games")
        
        if games_list:
            print("\n   Sample games:")
            for game in games_list[:3]:
                print(f"     • {game.get('title')} ({game.get('source')})")
                if game.get('steamAppId'):
                    print(f"       Steam ID: {game.get('steamAppId')}")
                if game.get('execPath'):
                    print(f"       Path: {game.get('execPath')}")
    else:
        print(f"   ❌ Failed to fetch games")
        print(f"   Error: {result.stderr}")
except Exception as e:
    print(f"   ❌ Error fetching games: {e}")

# Test launching a Steam game
print(f"\n🧪 Testing Steam game launch...")
try:
    test_payload = {"steamAppId": "570"}  # Dota 2
    test_json = json.dumps(test_payload)
    
    result = subprocess.run(
        ["powershell", "-Command", 
         f"Invoke-RestMethod -Uri '{SERVER_URL}/api/launch' -Method POST " +
         f"-Body '{test_json.replace(chr(39), chr(92)+chr(34))}' " +
         f"-ContentType 'application/json' | ConvertTo-Json"],
        capture_output=True,
        text=True,
        timeout=5
    )
    
    if result.returncode == 0:
        print("   ✅ Steam launch endpoint works")
        data = json.loads(result.stdout)
        print(f"   Response: {data.get('message')}")
    else:
        print(f"   ❌ Steam launch failed: {result.stderr}")
except Exception as e:
    print(f"   ❌ Error testing launch: {e}")

print("\n" + "="*60)
print("  SUMMARY")
print("="*60)

issues = []

# Check server
try:
    subprocess.run(
        ["powershell", "-Command", f"Invoke-RestMethod {SERVER_URL}/api/status"],
        capture_output=True, timeout=3
    )
except:
    issues.append("❌ Server not running - run: python seezee_server.py")

# Check config
if not CONFIG_FILE.exists():
    issues.append(f"❌ Config missing: {CONFIG_FILE}")
else:
    config = json.load(open(CONFIG_FILE))
    if not config.get("folders"):
        issues.append("❌ No folders configured in seezee_config.json")

if issues:
    print("\nISSUES FOUND:")
    for issue in issues:
        print(f"  {issue}")
else:
    print("\n✅ Everything looks good!")

print("\n" + "="*60 + "\n")
