@echo off
echo ========================================
echo   Checking Your Build Environment
echo ========================================
echo.

REM Check Node.js
echo [1/5] Checking Node.js...
where node >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
    echo   ✓ Node.js installed: %NODE_VERSION%
) else (
    echo   ✗ Node.js NOT found
    echo   Download from: https://nodejs.org/
    set MISSING=1
)
echo.

REM Check npm
echo [2/5] Checking npm...
where npm >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
    echo   ✓ npm installed: %NPM_VERSION%
) else (
    echo   ✗ npm NOT found
    set MISSING=1
)
echo.

REM Check if node_modules exists
echo [3/5] Checking project dependencies...
if exist "node_modules\" (
    echo   ✓ Dependencies installed
) else (
    echo   ✗ Dependencies NOT installed
    echo   Run: npm install
    set MISSING=1
)
echo.

REM Check electron-builder
echo [4/5] Checking electron-builder...
if exist "node_modules\electron-builder\" (
    echo   ✓ electron-builder installed
) else (
    echo   ✗ electron-builder NOT installed
    echo   Run: npm install
    set MISSING=1
)
echo.

REM Check Python
echo [5/5] Checking Python...
where python >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    for /f "tokens=*" %%i in ('python --version') do set PYTHON_VERSION=%%i
    echo   ✓ Python installed: %PYTHON_VERSION%
) else (
    echo   ⚠ Python NOT found (app will still build, but users need Python)
)
echo.

echo ========================================
echo   Summary
echo ========================================
echo.

if defined MISSING (
    echo ❌ MISSING REQUIREMENTS
    echo.
    echo Please install missing tools:
    echo   1. Node.js: https://nodejs.org/
    echo   2. Run: npm install
    echo.
    echo After installing, run this check again.
) else (
    echo ✅ YOUR SYSTEM IS READY TO BUILD!
    echo.
    echo You can now:
    echo   1. Run BUILD_INSTALLER.bat to create installer
    echo   2. Or run: npm run build-windows
    echo.
    echo The installer will be created in the 'dist' folder.
    echo.
    echo ----------------------------------------
    echo   Current Setup:
    echo ----------------------------------------
    if exist "node_modules\" (
        echo   Dependencies: Installed ✓
    )
    if exist "node_modules\electron-builder\" (
        echo   Build Tool: electron-builder ✓
    )
    if exist "icon.ico" (
        echo   App Icon: Found ✓
    )
    if exist "frontend\" (
        echo   Frontend: Found ✓
    )
    if exist "main.py" (
        echo   Backend: Found ✓
    )
    echo.
    echo   Package Format: NSIS Installer (.exe)
    echo   Target Platform: Windows 10/11 (x64)
    echo   Estimated Build Time: 3-5 minutes
    echo   Output Size: ~180-250 MB
    echo.
)

echo ========================================
echo.

REM Optional: Check for Windows SDK (for Store packaging)
echo BONUS: Checking for Microsoft Store packaging tools...
if exist "C:\Program Files (x86)\Windows Kits\10\" (
    echo   ✓ Windows SDK found (can build MSIX for Store)
) else (
    echo   ⚠ Windows SDK not found
    echo     • Not needed for basic installer
    echo     • Only needed for Microsoft Store
    echo     • See: WINDOWS_PACKAGING_SETUP.md
)
echo.

pause
