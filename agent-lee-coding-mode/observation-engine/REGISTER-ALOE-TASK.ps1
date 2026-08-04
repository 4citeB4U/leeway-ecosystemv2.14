# REGISTER-ALOE-TASK.ps1
# Register ALOE as a Windows Scheduled Task for auto-start on boot

[CmdletBinding()]
param(
    [switch]$Force
)

$ErrorActionPreference = "Stop"

$taskName = "AgentLeeObservationEngine"
$bootstrapPath = "D:\Leeway-Ecosystem v2.1.4\agent-lee-coding-mode\observation-engine\agent-lee-bootstrap.ps1"

Write-Host "=== ALOE SCHEDULED TASK REGISTRATION ===" -ForegroundColor Cyan

# Check if bootstrap exists
if (-not (Test-Path $bootstrapPath)) {
    Write-Error "Bootstrap file not found: $bootstrapPath"
    exit 1
}

# Check if task already exists
$existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue

if ($existingTask -and -not $Force) {
    Write-Warning "Task already exists. Use -Force to overwrite."
    Write-Host "`nCurrent task status: $($existingTask.State)" -ForegroundColor Cyan
    exit 0
}

if ($existingTask) {
    Write-Host "Removing existing task..." -ForegroundColor Yellow
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
}

# Create task action
$action = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$bootstrapPath`""

# Create task trigger (at logon)
$trigger = New-ScheduledTaskTrigger -AtLogOn

# Create task settings
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 1) `
    -ExecutionTimeLimit (New-TimeSpan -Hours 0)

# Create task principal (run as SYSTEM)
$principal = New-ScheduledTaskPrincipal `
    -UserId "SYSTEM" `
    -LogonType ServiceAccount `
    -RunLevel Highest

# Register task
Write-Host "Registering scheduled task..." -ForegroundColor Yellow

Register-ScheduledTask `
    -TaskName $taskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Principal $principal `
    -Description "Agent Lee Observation Engine - Continuous Windows OS state monitoring" `
    -Force | Out-Null

Write-Host "[OK] Task registered successfully" -ForegroundColor Green

# Verify registration
$task = Get-ScheduledTask -TaskName $taskName

Write-Host "`nTask Details:" -ForegroundColor Cyan
Write-Host "  Name: $($task.TaskName)" -ForegroundColor White
Write-Host "  State: $($task.State)" -ForegroundColor White
Write-Host "  Trigger: At logon" -ForegroundColor White
Write-Host "  Action: $bootstrapPath" -ForegroundColor White

Write-Host "`nTo start task manually:" -ForegroundColor Cyan
Write-Host "  Start-ScheduledTask -TaskName $taskName" -ForegroundColor White

Write-Host "`nTo check task status:" -ForegroundColor Cyan
Write-Host "  Get-ScheduledTask -TaskName $taskName" -ForegroundColor White

Write-Host "`nTo unregister task:" -ForegroundColor Cyan
Write-Host "  Unregister-ScheduledTask -TaskName $taskName -Confirm:`$false" -ForegroundColor White

# Made with Bob
