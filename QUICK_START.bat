@echo off
cd /d "%~dp0"

REM Kill stuck processes silently
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000 ^| findstr LISTENING 2^>nul') do taskkill /F /PID %%a >nul 2>&1

REM Start backend hidden
start "" /B cmd /c ".venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000 >nul 2>&1"

REM Wait for backend
timeout /t 7 /nobreak >nul

REM Start electron
start "" /B node run.js

REM Exit immediately
exit
