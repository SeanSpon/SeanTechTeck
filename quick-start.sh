#!/bin/bash
# SeeZee Quick Start - Run this on the Pi

echo "🚀 SeeZee Launcher Quick Start"
echo "================================"
echo ""

# Pull latest changes
echo "📥 Pulling latest code from GitHub..."
cd ~/Desktop/SeanTechTeck
git pull

echo ""
echo "✓ Code updated!"
echo ""
echo "Next steps:"
echo ""
echo "Terminal 1 (this one):"
echo "  cd seezee-launcher"
echo "  npm run dev"
echo ""
echo "Terminal 2 (new window):"
echo "  ./launch-kiosk.sh"
echo ""
echo "Or run everything at once:"
echo "  cd seezee-launcher && npm run dev &"
echo "  sleep 5 && ./launch-kiosk.sh"
echo ""
