# SeeZee Launcher - Kiosk Mode Setup Guide

## 🚀 How to Launch Properly

### ✅ CORRECT WAY (no sudo)

```bash
# Terminal 1: Start the server
cd "seezee-launcher"
npm run dev

# Terminal 2: Launch kiosk (as regular user)
./launch-kiosk.sh
```

Or manually:
```bash
chromium \
  --ozone-platform=wayland \
  --enable-features=UseOzonePlatform \
  --kiosk \
  --disable-infobars \
  --app=http://localhost:3000
```

### ❌ NEVER DO THIS

```bash
sudo chromium          # ← WRONG
sudo -E chromium       # ← WRONG
```

Running Chromium as root causes:
- DBus connection failures
- Cache permission errors
- Touch input issues
- Weston conflicts

---

## 🧹 About Those "14 Issues"

The logs you're seeing like:
```
[12:55:10.502] touch event received with 2 points down but no surface focused
```

These are **Weston input routing messages**, not errors.

They mean:
- ✅ Touch events ARE working
- ✅ Keyboard detected
- ✅ Mouse detected
- ℹ️ Weston is processing multi-touch gestures

**You can ignore them.** They're normal in kiosk environments.

---

## 🔧 If Scrolling Still Doesn't Work

1. **Open browser dev tools** (before kiosk):
   ```bash
   chromium --ozone-platform=wayland http://localhost:3000
   ```
   Press F12 → Console tab

2. **Try single-finger drag** on the game grid area

3. **Check if element has proper height**:
   In console: `document.querySelector('.touch-scroll').scrollHeight`

4. **Force smooth scrolling** (temporary test):
   In console:
   ```js
   document.querySelector('.touch-scroll').style.overflowY = 'scroll'
   ```

---

## 🎯 Navigation Structure

```
/                     → Startup screen → redirects to /dashboard
/dashboard            → Main hub with stats and big nav cards
/library              → Full scrollable game grid (touch-enabled)
/settings             → Connection and configuration
```

---

## 🎮 Steam Images

Images auto-load from CDN:
```
https://cdn.cloudflare.steamstatic.com/steam/apps/<APPID>/library_600x900.jpg
```

If an image fails to load (404), the tile falls back to:
- Gradient background
- Large title text
- Source badge

This is **intentional design** (not a bug).

---

## 📱 Touch-Friendly Changes

✅ Grid layout (no horizontal scroll)
✅ Larger touch targets (min 240px height)
✅ Proper scroll container with `touch-pan-y`
✅ Active touch feedback (`onTouchStart`/`onTouchEnd`)
✅ Responsive columns (2-5 based on screen size)

---

## 🚦 Testing Checklist

- [ ] Chromium launches without sudo
- [ ] Touch scrolling works in /library
- [ ] Steam games show images
- [ ] Tapping a game launches it
- [ ] Navigation between dashboard/library works
- [ ] Settings page loads

---

## 🔥 Next Steps

1. Test touch scrolling in kiosk mode
2. Add more game folders via Settings
3. Set up auto-start on boot (optional)
4. Push to GitHub

