# Run this as Administrator
$TaskName = "CerebralCommander"
$PythonPath = "C:\Cerebral\.venv\Scripts\python.exe"
$DaemonScript = "C:\Cerebral\CerebralDaemon.py"
$MCPScript = "C:\Cerebral\cerebral_mcp_server.py"

# Create a batch file to launch both at once hidden
$BatchFile = "C:\Cerebral\start_cerebral.bat"
@"
@echo off
start /b "" "$PythonPath" "$DaemonScript"
start /b "" "$PythonPath" "$MCPScript"
"@ | Out-File -FilePath $BatchFile -Encoding ASCII

# Register the task to run at logon
$Action = New-ScheduledTaskAction -Execute $BatchFile -WorkingDirectory "C:\Cerebral"
$Trigger = New-ScheduledTaskTrigger -AtLogOn
$Principal = New-ScheduledTaskPrincipal -UserId "$env:USERNAME" -LogonType Interactive -RunLevel Highest

Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Principal $Principal -Force

Write-Host "Cerebral is now set to run automatically at every boot/login." -ForegroundColor Green
