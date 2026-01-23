@echo off
echo ========================================
echo   Build Troubleshooting
echo ========================================
echo.

echo Step 1: Checking dependencies...
if not exist "node_modules\" (
    echo Installing dependencies first...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo FAILED to install dependencies!
        echo Please check your internet connection.
        pause
        exit /b 1
    )
)

echo.
echo Step 2: Building with verbose output...
echo This may take 5-10 minutes...
echo.

call npm run build-windows -- --verbose

echo.
echo ========================================
echo   Build Complete Check
echo ========================================
echo.

if exist "dist\" (
    echo SUCCESS! dist folder created
    dir dist
) else (
    echo ERROR! dist folder not created
    echo.
    echo Possible issues:
    echo 1. Not enough disk space (need 2GB free)
    echo 2. Antivirus blocked electron-builder
    echo 3. Node.js version incompatible
    echo.
    echo Try:
    echo - Free up disk space
    echo - Temporarily disable antivirus
    echo - Run: npm cache clean --force
)

pause
