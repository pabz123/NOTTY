@echo off
echo ========================================
echo   Building Accountability System
echo   Distribution Packages
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo [1/4] Checking dependencies...
if not exist "node_modules\" (
    echo Installing dependencies...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Failed to install dependencies
        pause
        exit /b 1
    )
)

echo [2/4] Checking build tools...
npm list electron-builder >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Installing electron-builder...
    call npm install --save-dev electron-builder
)

echo [3/4] Building Windows installer...
echo This may take several minutes...
call npm run build-windows
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Build failed!
    pause
    exit /b 1
)

echo.
echo ========================================
echo   Build Complete!
echo ========================================
echo.
echo Your installer is ready:
echo   Location: dist\Accountability System Setup.exe
echo.
echo You can now:
echo   1. Test the installer on this computer
echo   2. Share it with others via Google Drive, Dropbox, etc.
echo   3. Upload to your website for download
echo.
echo The installer includes:
echo   - Application files
echo   - Python backend
echo   - Desktop shortcut creator
echo   - Automatic uninstaller
echo.

REM Open the dist folder
if exist "dist\" (
    echo Opening dist folder...
    start explorer "dist"
)

echo.
pause
