@echo off
cd /d "%~dp0"
echo Creating modern startup shortcut...
powershell "$s=(New-Object -COM WScript.Shell).CreateShortcut('%USERPROFILE%\Desktop\Accountability System.lnk');$s.TargetPath='%~dp0START_SILENT.vbs';$s.WorkingDirectory='%~dp0';$s.IconLocation='%~dp0icon.ico';$s.WindowStyle=1;$s.Save()"
echo Done! Shortcut created - no black window will appear!
pause
