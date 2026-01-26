@echo off
echo ========================================
echo  Installing Dependencies
echo ========================================
echo.

REM Check if virtual environment exists
if exist venv\Scripts\activate.bat (
    echo Found virtual environment in 'venv'
    call venv\Scripts\activate.bat
    echo.
    echo Installing/Updating packages...
    pip install -r requirements.txt
) else if exist .venv\Scripts\activate.bat (
    echo Found virtual environment in '.venv'
    call .venv\Scripts\activate.bat
    echo.
    echo Installing/Updating packages...
    pip install -r requirements.txt
) else (
    echo.
    echo WARNING: No virtual environment found!
    echo.
    echo Creating virtual environment...
    python -m venv venv
    
    if %errorlevel% == 0 (
        echo Virtual environment created successfully!
        call venv\Scripts\activate.bat
        echo.
        echo Installing packages...
        pip install -r requirements.txt
    ) else (
        echo.
        echo ERROR: Failed to create virtual environment.
        echo Please create it manually:
        echo   python -m venv venv
        echo   venv\Scripts\activate
        echo   pip install -r requirements.txt
        pause
        exit /b 1
    )
)

if %errorlevel% == 0 (
    echo.
    echo ========================================
    echo  Installation successful!
    echo ========================================
    echo.
    echo Next steps:
    echo 1. Run: RUN_MIGRATION.bat
    echo 2. Start app: python main.py
    echo.
) else (
    echo.
    echo ========================================
    echo  Installation failed!
    echo ========================================
    echo.
    echo Please check the error messages above.
    echo.
)

pause
