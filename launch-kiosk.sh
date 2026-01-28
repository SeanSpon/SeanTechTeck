#!/bin/bash

# SeeZee Launcher - Chromium Kiosk Mode Launch Script
# This script properly launches Chromium in kiosk mode on Wayland without sudo

echo "🚀 Starting SeeZee Launcher..."

# Ensure we're not running as root
if [ "$EUID" -eq 0 ]; then 
   echo "❌ Do not run this script with sudo!"
   echo "Run it as your regular user: ./launch-kiosk.sh"
   exit 1
fi

# Set Wayland environment variables
export XDG_RUNTIME_DIR=/run/user/$(id -u)
export WAYLAND_DISPLAY=wayland-0

# Check if Next.js dev server is running
if ! curl -s http://localhost:3000 > /dev/null; then
    echo "⚠️  Next.js dev server not running on port 3000"
    echo "Start it first with: cd seezee-launcher && npm run dev"
    exit 1
fi

echo "✓ Next.js server is running"
echo "✓ Launching Chromium in kiosk mode..."

# Launch Chromium with proper Wayland and kiosk settings
chromium \
  --ozone-platform=wayland \
  --enable-features=UseOzonePlatform \
  --kiosk \
  --disable-infobars \
  --disable-session-crashed-bubble \
  --disable-translate \
  --disable-features=TranslateUI \
  --noerrdialogs \
  --disable-pinch \
  --overscroll-history-navigation=0 \
  --app=http://localhost:3000

echo "✓ Chromium closed"
