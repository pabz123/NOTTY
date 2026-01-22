@echo off
echo ================================================
echo   Creating Accountability System Icons
echo ================================================
echo.

cd /d "%~dp0"

echo [1/2] Installing Pillow (image library)...
python -m pip install --quiet Pillow

echo [2/2] Generating icons...
python create-icons.py

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ================================================
    echo   SUCCESS! Icons created!
    echo ================================================
    echo.
    echo Icon files created:
    dir /b icon*.png icon.ico 2>nul
    echo.
    echo You can now launch: Accountability.bat
) else (
    echo.
    echo ================================================
    echo   ERROR: Icon creation failed!
    echo ================================================
    echo.
    echo The app will still work with a fallback icon.
)

echo.
pause
