@echo off
echo ========================================
echo  Running Database Migration
echo ========================================
echo.

REM Activate virtual environment
echo Activating virtual environment...
if exist venv\Scripts\activate.bat (
    call venv\Scripts\activate.bat
) else if exist .venv\Scripts\activate.bat (
    call .venv\Scripts\activate.bat
) else (
    echo Warning: Virtual environment not found. Using system Python.
)

echo.
echo Running migration script...
python migrate_recurring_fields.py

if %errorlevel% == 0 (
    echo.
    echo ========================================
    echo  Migration successful!
    echo ========================================
    echo.
) else (
    echo.
    echo ========================================
    echo  Migration failed!
    echo ========================================
    echo.
    echo Please make sure dependencies are installed:
    echo   pip install -r requirements.txt
    echo.
)

pause
