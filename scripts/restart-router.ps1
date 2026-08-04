$p = Get-NetTCPConnection -LocalPort 8080 -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty OwningProcess
if ($p -ne $null) {
  Stop-Process -Id $p -Force
  Write-Output "Stopped:$p"
} else {
  Write-Output "NoProcess"
}
$logPathOut = 'agent-lee-coding-mode\logs\router.out.log'
$logPathErr = 'agent-lee-coding-mode\logs\router.err.log'
Remove-Item -Path $logPathOut -ErrorAction SilentlyContinue
Remove-Item -Path $logPathErr -ErrorAction SilentlyContinue
$proc = Start-Process -WindowStyle Hidden -FilePath node -ArgumentList 'agent-lee-coding-mode\router\server-brainfix.mjs' -WorkingDirectory 'D:\Leeway-Ecosystem v2.1.4' -RedirectStandardOutput $logPathOut -RedirectStandardError $logPathErr -PassThru
$proc | Select-Object Id,StartTime,Path | ConvertTo-Json -Compress
Write-Output "Logging to $logPathOut and $logPathErr"
