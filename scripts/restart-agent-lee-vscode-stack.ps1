param()

Write-Host "Restarting Agent Lee VS Code stack..."
& "$PSScriptRoot\stop-agent-lee-vscode-stack.ps1"
Start-Process -WindowStyle Hidden -FilePath powershell -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSScriptRoot\start-agent-lee-vscode-stack.ps1`""

Write-Host "Restart triggered."
