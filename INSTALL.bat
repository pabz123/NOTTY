@echo off
echo.
echo ================================================
echo   ACCOUNTABILITY SYSTEM - DESKTOP INSTALLER
echo ================================================
echo.
echo This will:
echo  - Install Node.js dependencies
echo  - Create a desktop shortcut
echo  - Set up the application
echo.
pause

cd /d "%~dp0"

echo.
echo [1/3] Checking Node.js...
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed!
    echo.
    echo Please install Node.js first from: https://nodejs.org/
    echo Then run this installer again.
    echo.
    pause
    exit /b 1
)
echo [OK] Node.js is installed

echo.
echo [2/3] Installing dependencies (this may take 2-3 minutes)...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install dependencies
    pause
    exit /b 1
)
echo [OK] Dependencies installed

echo.
echo [3/3] Creating desktop shortcut...
cscript //nologo create-shortcut.vbs "%CD%"
if %ERRORLEVEL% NEQ 0 (
    echo [WARNING] Could not create desktop shortcut automatically
    echo You can manually create a shortcut to: Accountability.bat
) else (
    echo [OK] Desktop shortcut created
)

echo.
echo ================================================
echo   INSTALLATION COMPLETE!
echo ================================================
echo.
echo You can now:
echo  1. Double-click "Accountability System" on your desktop
echo  2. Or run "Accountability.bat" from this folder
echo.
echo The app will start automatically!
echo.
pause
