param(
    [string]$TaskId = ("clean_temp_" + (Get-Date -Format "yyyyMMdd_HHmmss"))
)

$cfg = Get-Content "C:\Cerebral\config\cerebral.paths.json" -Raw | ConvertFrom-Json
$taskPath = Join-Path $cfg.tasksDir "$TaskId.json"

@{
    task_id = $TaskId
    command = "clean_temp"
} | ConvertTo-Json -Compress | Set-Content $taskPath

Write-Host "Created task: $taskPath"
