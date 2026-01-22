const { app, BrowserWindow, Tray, Menu, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow = null;
let tray = null;
let pythonProcess = null;
const API_URL = 'http://127.0.0.1:8000';

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false
    },
    autoHideMenuBar: true,
    title: 'Accountability System'
  });

  // Load the dashboard - wait for backend first
  mainWindow.loadURL('http://127.0.0.1:8000');

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
    return false;
  });

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
}

function checkBackendRunning() {
  return new Promise((resolve) => {
    const http = require('http');
    const req = http.get('http://127.0.0.1:8000/docs', (res) => {
      console.log('Backend is already running!');
      resolve(true);
    });
    
    req.on('error', () => {
      console.log('Backend is not running yet');
      resolve(false);
    });
    
    req.setTimeout(2000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

function killExistingBackend() {
  return new Promise((resolve) => {
    if (process.platform === 'win32') {
      // Windows: Kill any process using port 8000
      const { exec } = require('child_process');
      exec('for /f "tokens=5" %a in (\'netstat -aon ^| findstr :8000 ^| findstr LISTENING\') do taskkill /F /PID %a', (error) => {
        if (error) {
          console.log('No existing backend to kill');
        } else {
          console.log('Killed existing backend process');
        }
        // Wait a bit for port to be released
        setTimeout(resolve, 1000);
      });
    } else {
      // Unix-like systems
      const { exec } = require('child_process');
      exec('lsof -ti:8000 | xargs kill -9', (error) => {
        if (error) {
          console.log('No existing backend to kill');
        } else {
          console.log('Killed existing backend process');
        }
        setTimeout(resolve, 1000);
      });
    }
  });
}

function startPythonBackend() {
  return new Promise(async (resolve, reject) => {
    // Check if backend is already running
    const isRunning = await checkBackendRunning();
    if (isRunning) {
      console.log('✓ Backend is already running');
      return resolve();
    }
    
    // Kill any stuck processes
    await killExistingBackend();
    
    // Use Python from environment variable (set by Accountability.bat) or find it
    let pythonPath = process.env.PYTHON_PATH;
    
    if (!pythonPath || !require('fs').existsSync(pythonPath)) {
      // Fallback: try to find Python in venv
      const venvPaths = [
        path.join(__dirname, '.venv', 'Scripts', 'python.exe'),
        path.join(__dirname, 'venv', 'Scripts', 'python.exe'),
      ];
      
      for (const venvPath of venvPaths) {
        if (require('fs').existsSync(venvPath)) {
          pythonPath = venvPath;
          console.log('✓ Found Python in virtual environment:', pythonPath);
          break;
        }
      }
      
      // Last resort: system Python
      if (!pythonPath) {
        console.warn('⚠ WARNING: Using system Python (venv not found)');
        pythonPath = process.platform === 'win32' ? 'python' : 'python3';
      }
    } else {
      console.log('✓ Using Python from launcher:', pythonPath);
    }
    
    console.log('Starting FastAPI backend...');
    
    // Use uvicorn to start the FastAPI app
    pythonProcess = spawn(pythonPath, ['-m', 'uvicorn', 'main:app', '--host', '127.0.0.1', '--port', '8000'], {
      cwd: __dirname,
      stdio: 'pipe',
      shell: true
    });

    let hasResolved = false;

    pythonProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(`[Backend] ${output.trim()}`);
      if (!hasResolved && (output.includes('Uvicorn running') || output.includes('Application startup complete'))) {
        console.log('[✓] Backend is ready and accepting connections');
        hasResolved = true;
        setTimeout(resolve, 2000); // Give it 2 more seconds to fully start
      }
    });

    pythonProcess.stderr.on('data', (data) => {
      const errorMsg = data.toString();
      console.error(`[Backend Error] ${errorMsg.trim()}`);
      
      // Check for port already in use error
      if (errorMsg.includes('10048') || errorMsg.includes('address already in use')) {
        console.error('[!] Port 8000 is already in use!');
        if (!hasResolved) {
          hasResolved = true;
          console.log('[!] Attempting to use existing backend...');
          resolve(); // Try to continue anyway
        }
      }
    });

    pythonProcess.on('error', (error) => {
      console.error('[!] Failed to start backend process:', error.message);
      if (!hasResolved) {
        hasResolved = true;
        reject(error);
      }
    });

    // Timeout after 15 seconds
    setTimeout(() => {
      if (!hasResolved) {
        console.log('[!] Backend startup timeout (15s), checking accessibility...');
        checkBackendRunning().then((running) => {
          if (running) {
            console.log('[✓] Backend is accessible despite timeout');
            hasResolved = true;
            resolve();
          } else {
            console.error('[✗] Backend is not accessible after timeout');
            console.error('    Check Accountability.bat window for errors');
            hasResolved = true;
            reject(new Error('Backend startup timeout'));
          }
        });
      }
    }, 15000);
  });
}


function createTray() {
  // Create a simple tray icon using data URL (emoji-based)
  const { nativeImage } = require('electron');
  
  // Try to load icon, fallback to creating one
  let iconPath = path.join(__dirname, 'icon.png');
  let trayIcon;
  
  if (require('fs').existsSync(iconPath)) {
    trayIcon = nativeImage.createFromPath(iconPath);
  } else {
    // Create a simple colored square as fallback
    trayIcon = nativeImage.createFromDataURL('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAGPSURBVHgB7ZfBTcMwFIb/Z1okRoANygbNBmWDsgFsUDYoG8AGhQ3KBrBB2aBsECYII/RA4tBI4cSJ7SROm+9QqVLsN37vv58tB3jDfwNM8YCqqiYAFgDmAMYmPxNFURWGYQFgD2DX9/1X0/VGBqCqKjfLsnW/308BvAB4bQlrGIZhFkXRBsASwKzNfKcD5HnuJknyVL+jZVlO/wAc/yPoHGCxWEwBvLcYL4uieGgxPvTtcRvjJvQOEMfx9Q/Gm3BxAMyAGTADZsAM/JuBB/QIUFXVEMCyjV7Tnh0AADabzQrAIY5jry7xr1n+5HneOkmSB5sdAHS+hHEc+3VJluW7NnrTDXiedNZEURQZO8DARW1jZ/RTkiQYOiltzAzAoBkwA2bADJgBM2AGzIAZMANmwAyYATNgBsyAGTADZuCv/wQsy7LU09B07ZIk+dTTMNeXQJqmy67+1vgIpGl6JenW5E2bzWZPkg4m68uybGZ6Bm7qb41PwfV67QG4M/uh1ff9d5P1w3vDG/4bvgEAAP//ncxBP95uisAAAAAASUVORK5CYII=');
  }
  
  tray = new Tray(trayIcon.resize({ width: 16, height: 16 }));
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show App',
      click: () => {
        mainWindow.show();
      }
    },
    {
      label: 'New Activity',
      click: () => {
        mainWindow.show();
        mainWindow.webContents.send('open-create-modal');
      }
    },
    {
      type: 'separator'
    },
    {
      label: 'Quit',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setToolTip('Accountability System');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    mainWindow.show();
  });
}

app.whenReady().then(async () => {
  try {
    console.log('========================================');
    console.log('  Accountability System Starting...');
    console.log('========================================\n');
    
    console.log('[1/3] Starting Python backend...');
    await startPythonBackend();
    console.log('[✓] Backend started successfully\n');
    
    // Add a small delay to ensure backend is fully ready
    console.log('Waiting 2 seconds for backend to stabilize...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('[2/3] Creating application window...');
    createWindow();
    console.log('[✓] Window created\n');
    
    console.log('[3/3] Setting up system tray...');
    createTray();
    console.log('[✓] Tray icon ready\n');
    
    console.log('========================================');
    console.log('  ✓ Application Ready!');
    console.log('  Dashboard: http://127.0.0.1:8000');
    console.log('========================================\n');
    console.log('App is running. Minimize to tray with X button.');
    console.log('To fully quit: Right-click tray icon → Quit\n');
  } catch (error) {
    console.error('========================================');
    console.error('  ✗ Failed to start application!');
    console.error('========================================');
    console.error('Error details:', error);
    console.error('Error stack:', error.stack);
    console.error('\nPlease check:');
    console.error('  1. Python and dependencies are installed');
    console.error('  2. Port 8000 is not blocked by firewall');
    console.error('  3. No other app is using port 8000');
    console.error('\nPress Ctrl+C to exit\n');
    
    // Don't quit immediately - give user time to see error
    setTimeout(() => {
      app.quit();
    }, 30000); // Wait 30 seconds before quitting
  }
});

app.on('window-all-closed', () => {
  // Don't quit on window close, keep running in tray
  if (process.platform !== 'darwin') {
    // mainWindow is hidden, not closed
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  } else {
    mainWindow.show();
  }
});

app.on('before-quit', () => {
  app.isQuitting = true;
});

app.on('quit', () => {
  if (pythonProcess) {
    pythonProcess.kill();
  }
});

// Handle shutdown gracefully
process.on('SIGINT', () => {
  console.log('\n[!] Received shutdown signal (Ctrl+C)');
  if (pythonProcess) {
    console.log('[!] Stopping backend process...');
    pythonProcess.kill();
  }
  app.quit();
});

// Catch unhandled errors
process.on('uncaughtException', (error) => {
  console.error('========================================');
  console.error('  ✗ UNCAUGHT EXCEPTION!');
  console.error('========================================');
  console.error('Error:', error);
  console.error('Stack:', error.stack);
  console.error('\nThe app will stay open for 30 seconds so you can see this error.');
  console.error('Press Ctrl+C to exit immediately.\n');
  
  // Keep app alive for 30 seconds to show error
  setTimeout(() => {
    process.exit(1);
  }, 30000);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('========================================');
  console.error('  ✗ UNHANDLED PROMISE REJECTION!');
  console.error('========================================');
  console.error('Reason:', reason);
  console.error('Promise:', promise);
  console.error('\nThe app will stay open for 30 seconds so you can see this error.');
  console.error('Press Ctrl+C to exit immediately.\n');
});
