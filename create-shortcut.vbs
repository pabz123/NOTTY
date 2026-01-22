Set oWS = WScript.CreateObject("WScript.Shell")
sLinkFile = oWS.SpecialFolders("Desktop") & "\Accountability System.lnk"
Set oLink = oWS.CreateShortcut(sLinkFile)
    oLink.TargetPath = WScript.Arguments(0) & "\Accountability.bat"
    oLink.WorkingDirectory = WScript.Arguments(0)
    oLink.Description = "Accountability System - Task Management"
    oLink.IconLocation = WScript.Arguments(0) & "\icon.ico"
    oLink.WindowStyle = 1
oLink.Save

WScript.Echo "Desktop shortcut created successfully!"
WScript.Echo "You can now launch Accountability System from your desktop!"
