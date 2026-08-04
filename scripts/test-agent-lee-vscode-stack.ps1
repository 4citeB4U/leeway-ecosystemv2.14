param()

Write-Host "Running Agent Lee VS Code stack validator..."
$validator = Join-Path $PSScriptRoot '..\agent-lee-coding-mode\tools\validate-agent-lee-vscode-chat-full-usability.ps1'
if (Test-Path $validator) { 
    Write-Host "Invoking validator: $validator"
    & powershell -NoProfile -ExecutionPolicy Bypass -File $validator
} else { Write-Host "Validator not found: $validator" }
