@echo off
echo ========================================
echo  Creating Notifications Table
echo ========================================
echo.
echo This will fix the HTTP 500 error on the notifications page.
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
echo Creating database tables...
python create_notifications_table.py

if %errorlevel% == 0 (
    echo.
    echo ========================================
    echo  SUCCESS! Notifications table created!
    echo ========================================
    echo.
    echo The HTTP 500 error should now be fixed.
    echo You can now use the Notifications panel.
    echo.
    echo Next: Start your app with: python main.py
    echo.
) else (
    echo.
    echo ========================================
    echo  ERROR: Failed to create tables
    echo ========================================
    echo.
    echo Please check the error messages above.
    echo.
)

pause
