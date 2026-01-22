# 🚀 Accountability System - Electron Desktop App

## Quick Start (One Command!)

### Step 1: Run the Installer
Double-click: **`INSTALL.bat`**

This will:
- ✅ Check if Node.js is installed
- ✅ Install all dependencies automatically
- ✅ Create a desktop shortcut with icon
- ✅ Set up everything for you

### Step 2: Launch the App
Double-click: **"Accountability System"** on your desktop

OR

Double-click: **`Accountability.bat`** in this folder

---

## 📋 What Happens When You Run It

1. **Automatic Node.js Check**
   - Verifies Node.js is installed
   - Shows clear error if missing

2. **One-Time Setup** (first run only)
   - Installs Electron and dependencies (~100MB)
   - Takes 2-3 minutes
   - Only happens once!

3. **Python Backend Starts**
   - Automatically finds your Python virtual environment
   - Starts FastAPI server with uvicorn
   - No manual commands needed!

4. **Electron Window Opens**
   - Beautiful native desktop window
   - System tray icon
   - Minimize to tray (app keeps running)
   - Notification support

---

## 🎯 Features

### Desktop Experience
- ✅ **Native Window**: Runs like a real desktop app
- ✅ **System Tray**: Minimize to tray, quick access menu
- ✅ **Auto-Start Backend**: Python server starts automatically
- ✅ **Desktop Icon**: Professional icon on desktop
- ✅ **Windows Integration**: Appears in taskbar normally

### Application Features
- ✅ **Custom Confirmations**: Beautiful in-app dialogs
- ✅ **Browser Notifications**: System-level popups
- ✅ **Recurring Activities**: Daily routines made easy
- ✅ **Templates**: Reusable activity templates
- ✅ **Settings**: Profile, password, preferences
- ✅ **Dark/Light Theme**: Your choice

---

## 🔧 Requirements

### Must Have:
1. **Python 3.8+** 
   - Check: Open CMD, type `python --version`
   - Install: https://www.python.org/

2. **Node.js 18+**
   - Check: Open CMD, type `node --version`
   - Install: https://nodejs.org/

### That's It!
Everything else installs automatically via `INSTALL.bat`

---

## 📁 Important Files

### For Users:
- **`INSTALL.bat`** - Run this first (one-time setup)
- **`Accountability.bat`** - Main launcher
- **Desktop Shortcut** - Created by installer

### For Developers:
- `electron-main.js` - Electron main process
- `run.js` - Launcher helper
- `package.json` - Dependencies

---

## 🐛 Troubleshooting

### "Node.js is not installed"
**Solution**: Install Node.js from https://nodejs.org/
- Download the LTS version
- Run installer
- Restart CMD/terminal
- Run `INSTALL.bat` again

### "Failed to start backend"
**Solution**: Check Python and dependencies
```bash
# Check Python
python --version

# Install Python dependencies
pip install -r requirements.txt

# Try manual start to see errors
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

### "Port 8000 already in use"
**Solution**: Close other instances
- Check Task Manager for python.exe
- Or change port in `electron-main.js`

### Desktop shortcut not created
**Solution**: Create manually
1. Right-click `Accountability.bat`
2. Send to > Desktop (create shortcut)
3. Right-click shortcut > Properties
4. Change icon > Browse > Select `icon.ico`

---

## 🎨 Creating Icons (Optional)

If you want to regenerate icons:
```bash
# Install Pillow (if not already installed)
pip install Pillow

# Run icon creator
python create-icons.py
```

Or just double-click: `setup-icons.bat`

---

## 📦 Building Installer (Optional)

To create a `.exe` installer:

```bash
# Make sure dependencies are installed
npm install

# Build installer for Windows
npm run build-windows
```

Installer will be in `dist/` folder - share with others!

---

## 🚀 Usage Tips

### System Tray
- Click tray icon to show/hide window
- Right-click for menu:
  - Show App
  - New Activity (coming soon)
  - Quit

### Closing the App
- ❌ Click X: Minimizes to tray (app keeps running)
- ✅ Right-click tray > Quit: Fully closes app

### Keyboard Shortcuts
- `ESC` - Close modals
- `Ctrl+Shift+I` - Developer tools (debug)

---

## 🔄 Updates

### Updating the App
1. Pull latest code from repository
2. Run `npm install` (if package.json changed)
3. Launch normally with `Accountability.bat`

### Auto-Updates (Coming Soon)
Future versions will check for updates automatically!

---

## 📝 Notes

- First run installs ~100MB of Node dependencies
- Backend starts in ~5 seconds
- Database file: `activities.db`
- Logs: Check console window (kept open for debugging)
- Developer mode: Set `NODE_ENV=development` in Electron

---

## 🎉 You're Ready!

1. Double-click **`INSTALL.bat`** (first time only)
2. Wait for setup to complete
3. Double-click **"Accountability System"** on desktop
4. Create your first activity!

**Enjoy your new desktop app!** 🚀

---

## 📞 Support

Having issues? Check:
1. This README troubleshooting section
2. `QUICK_START.md` for more details
3. GitHub Issues (if repository available)

---

*Built with ❤️ using Electron + FastAPI + Vanilla JavaScript*
