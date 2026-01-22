const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 Accountability System - First Time Setup\n');

// Check if Node.js modules are installed
if (!fs.existsSync(path.join(__dirname, 'node_modules'))) {
  console.log('📦 Installing Node.js dependencies...');
  console.log('This may take a few minutes on first run.\n');
  
  exec('npm install', (error, stdout, stderr) => {
    if (error) {
      console.error('❌ Failed to install dependencies:', error);
      console.error('\nPlease run: npm install');
      process.exit(1);
    }
    
    console.log(stdout);
    console.log('✅ Dependencies installed!\n');
    startApp();
  });
} else {
  startApp();
}

function startApp() {
  console.log('🎯 Starting Accountability System...\n');
  
  const electron = require('electron');
  const proc = require('child_process');
  
  // Start Electron
  const child = proc.spawn(electron, ['.'], {
    stdio: 'inherit',
    windowsHide: false
  });
  
  child.on('close', (code) => {
    process.exit(code);
  });
}
