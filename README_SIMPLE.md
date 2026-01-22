# 🚀 Accountability System - Simple Setup Guide

## First Time Setup

**Step 1:** Double-click `INSTALL.bat`
- Installs Node.js dependencies
- Creates desktop shortcut
- Takes 2-3 minutes

**Step 2:** Double-click desktop shortcut **"Accountability System"**
OR run `Accountability.bat`

That's it! The app will:
✅ Auto-setup Python virtual environment (first run only)
✅ Install Python dependencies (first run only)
✅ Start backend server automatically
✅ Open Electron desktop window

---

## Daily Usage

Just double-click the desktop shortcut! Everything else is automatic.

The first run takes 3-5 minutes for setup. After that, it starts in seconds.

---

## Requirements

- **Python 3.8+** - Download from https://python.org/
- **Node.js 18+** - Download from https://nodejs.org/

---

## Troubleshooting

### "Node.js not found"
Install Node.js from https://nodejs.org/, then run INSTALL.bat again.

### "Python not found"  
Install Python from https://python.org/, make sure to check "Add to PATH", then restart.

### Port 8000 busy / Error 10048
Close all Python/Electron windows and try again. The launcher auto-kills stuck processes.

### Registration not working
1. Press F12 in the app window
2. Click Console tab
3. Try to register
4. Share any red errors you see

---

## What the Launcher Does

`Accountability.bat` handles everything automatically:

1. ✅ Checks Node.js installed
2. ✅ Installs Node dependencies (first run)
3. ✅ Creates Python virtual environment (first run)
4. ✅ Installs Python dependencies (first run)
5. ✅ Kills stuck processes on port 8000
6. ✅ Starts FastAPI backend
7. ✅ Opens Electron window
8. ✅ Uses correct Python from venv

No manual steps needed!

---

## Files You Need

- **INSTALL.bat** - Run this first (one time only)
- **Accountability.bat** - Main launcher (desktop shortcut uses this)
- **setup-icons.bat** - Regenerate icons (optional)

Everything else is managed automatically!

---

## Get Help

If something isn't working:
1. Check that Python and Node.js are installed
2. Run INSTALL.bat if you haven't yet
3. Open the app and press F12 → Console tab
4. Share any error messages you see

The app is designed to "just work" - if it doesn't, there's likely a simple fix!
