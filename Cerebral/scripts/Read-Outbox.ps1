param(
    [string]$TaskId = "read_outbox"
)

$cfg = Get-Content "C:\Cerebral\config\cerebral.paths.json" -Raw | ConvertFrom-Json
$outboxDir = $cfg.outboxDir

Get-ChildItem $outboxDir -Filter *.json | Sort-Object LastWriteTime -Descending | ForEach-Object {
    Write-Host "--- $($_.Name) ---"
    Get-Content $_.FullName | Write-Host
}
