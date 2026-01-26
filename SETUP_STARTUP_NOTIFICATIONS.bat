@echo off
echo ===============================================
echo  Setting up Startup Notifications
echo ===============================================
echo.

REM Create startup task
schtasks /create /tn "AccountabilityStartupNotifications" /tr "C:\Users\PRECIOUS\Desktop\accountability_backend\venv\Scripts\python.exe C:\Users\PRECIOUS\Desktop\accountability_backend\startup_notifications.py" /sc onlogon /rl highest /f

if %errorlevel% == 0 (
    echo.
    echo SUCCESS: Startup notifications configured!
    echo You will now receive notifications for missed/due activities when you log in.
    echo.
) else (
    echo.
    echo ERROR: Failed to create startup task. Please run as Administrator.
    echo.
)

pause
