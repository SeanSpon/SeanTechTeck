#!/bin/bash
# Test the full hub setup

echo "🧪 SeeZee Hub Test Checklist"
echo "================================"
echo ""

# Check if on Pi
if [ -f /proc/device-tree/model ]; then
    echo "✓ Running on Raspberry Pi"
else
    echo "⚠️  Not on Pi - some tests may fail"
fi

echo ""
echo "1️⃣  Checking PC Server Connection..."
if curl -s http://10.34.43.145:5555/api/status > /dev/null; then
    echo "   ✓ PC server is online (port 5555)"
else
    echo "   ✗ PC server not responding"
    echo "   → Start: python seezee_server.py"
fi

echo ""
echo "2️⃣  Checking System Monitor Agent..."
if curl -s http://10.34.43.145:7777/health > /dev/null; then
    echo "   ✓ Monitoring agent is online (port 7777)"
else
    echo "   ✗ Monitoring agent not responding"
    echo "   → Start: python seezee_agent.py"
fi

echo ""
echo "3️⃣  Checking Next.js Dev Server..."
if curl -s http://localhost:3000 > /dev/null; then
    echo "   ✓ Next.js is running (port 3000)"
else
    echo "   ✗ Next.js not running"
    echo "   → Start: cd seezee-launcher && npm run dev"
fi

echo ""
echo "================================"
echo "📋 Manual Test Checklist:"
echo ""
echo "Dashboard:"
echo "  [ ] Quick Access tiles appear"
echo "  [ ] Tap Roblox → opens website on PC"
echo "  [ ] Stats show correct counts"
echo ""
echo "Library:"
echo "  [ ] Steam games show cover art"
echo "  [ ] Grid is scrollable (touch)"
echo "  [ ] Filter tabs work (All/Steam/Apps/Tools)"
echo "  [ ] Tap game → launches on PC"
echo ""
echo "System Monitor:"
echo "  [ ] Device cards show online status"
echo "  [ ] CPU/RAM/GPU stats update"
echo "  [ ] Progress bars animate"
echo "  [ ] Stats refresh every 2 seconds"
echo ""
echo "Navigation:"
echo "  [ ] TopBar Home/Library buttons work"
echo "  [ ] Back buttons work"
echo "  [ ] Touch scrolling is smooth"
echo ""
echo "================================"
