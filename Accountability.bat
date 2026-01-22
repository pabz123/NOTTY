@echo off
title Accountability System
cd /d "%~dp0"
setlocal enabledelayedexpansion

echo.
echo ==========================================
echo   ACCOUNTABILITY SYSTEM LAUNCHER
echo ==========================================
echo.

REM ========================================
REM  STEP 1: Check Node.js
REM ========================================
echo [1/6] Checking Node.js...
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo   ❌ ERROR: Node.js is not installed!
    echo.
    echo   Please install Node.js from: https://nodejs.org/
    echo   After installing, restart and run this launcher again.
    echo.
    pause
    exit /b 1
)
node --version
echo   ✅ Node.js found
echo.

REM ========================================
REM  STEP 2: Check Python
REM ========================================
echo [2/6] Checking Python...
where python >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo   ❌ ERROR: Python is not installed!
    echo.
    echo   Please install Python 3.8+ from: https://python.org/
    echo   Make sure to check "Add Python to PATH" during installation.
    echo   After installing, restart and run this launcher again.
    echo.
    pause
    exit /b 1
)
python --version
echo   ✅ Python found
echo.

REM ========================================
REM  STEP 3: Check/Install Node Dependencies
REM ========================================
if not exist "node_modules" (
    echo [3/6] Installing Node.js dependencies...
    echo   This will take 2-3 minutes (first time only)...
    echo.
    call npm install --silent
    if %ERRORLEVEL% NEQ 0 (
        echo.
        echo   ❌ ERROR: Failed to install Node dependencies!
        echo   Try running: npm install
        pause
        exit /b 1
    )
    echo   ✅ Node dependencies installed
    echo.
) else (
    echo [3/6] Checking Node.js dependencies...
    echo   ✅ Node dependencies already installed
    echo.
)

REM ========================================
REM  STEP 4: Setup/Check Python Virtual Environment
REM ========================================
if not exist ".venv\Scripts\python.exe" (
    echo [4/6] Creating Python virtual environment...
    echo   This will take 2-3 minutes (first time only)...
    echo.
    python -m venv .venv
    if errorlevel 1 (
        echo   ❌ ERROR: Failed to create virtual environment!
        echo   Make sure Python 3.8+ is installed correctly.
        pause
        exit /b 1
    )
    
    echo   Installing Python dependencies...
    .venv\Scripts\python.exe -m pip install --upgrade pip --quiet
    .venv\Scripts\python.exe -m pip install -r requirements.txt --quiet
    if errorlevel 1 (
        echo   ❌ ERROR: Failed to install Python dependencies!
        echo   Check requirements.txt and try again.
        pause
        exit /b 1
    )
    echo   ✅ Python environment ready
    echo.
) else (
    echo [4/6] Checking Python virtual environment...
    echo   ✅ Python venv already configured
    echo.
)

REM ========================================
REM  STEP 5: Kill Any Stuck Processes
REM ========================================
echo [5/6] Checking for stuck processes on port 8000...
set "PORT_BUSY=0"
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000 ^| findstr LISTENING 2^>nul') do (
    set "PORT_BUSY=1"
    echo   Killing stuck process (PID %%a)...
    taskkill /F /PID %%a >nul 2>&1
)
if "%PORT_BUSY%"=="1" (
    echo   ✅ Cleaned up stuck processes
    timeout /t 2 /nobreak >nul
) else (
    echo   ✅ Port 8000 is free
)
echo.

REM ========================================
REM  STEP 6: Launch Application
REM ========================================
echo [6/6] Launching Accountability System...
echo.
echo ==========================================
echo   Starting application...
echo ==========================================
echo.
echo   Backend will start automatically
echo   Electron window will open shortly
echo.
echo   First run: ~10 seconds
echo   Subsequent runs: ~3 seconds
echo.

REM Set environment variable so Electron knows where Python is
set "PYTHON_PATH=%~dp0.venv\Scripts\python.exe"

REM Start the Electron app (which will start backend)
echo Starting Electron...
node run.js

REM Capture exit code
set "EXIT_CODE=%ERRORLEVEL%"

REM If we get here, the app closed
echo.
echo ==========================================
echo   Application closed
echo   Exit code: %EXIT_CODE%
echo ==========================================
echo.

if "%EXIT_CODE%" NEQ "0" (
    echo The app closed with an error!
    echo Exit code %EXIT_CODE% usually means:
    if "%EXIT_CODE%"=="1" echo   - General error or exception
    if "%EXIT_CODE%"=="3" echo   - Configuration error
    if "%EXIT_CODE%"=="4" echo   - Missing dependency
    echo.
    echo To see detailed errors, run: debug-start.bat
    echo.
)

pause
