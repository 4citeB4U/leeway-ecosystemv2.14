$durationSeconds = 120
$end = (Get-Date).AddSeconds($durationSeconds)
$count = 0
Write-Output "Starting GEC synthetic workload for $durationSeconds seconds..."
while ((Get-Date) -lt $end) {
  $body = @{ subject = "gec-sample-$count"; operatorName = "tester"; meta = @{ trial = 1; idx = $count } } | ConvertTo-Json
  try {
    $r = Invoke-RestMethod -Uri 'http://127.0.0.1:8080/agent-lee/conversation/start' -Method Post -Body $body -ContentType 'application/json' -ErrorAction Stop
    if ($count % 10 -eq 0) { Write-Output "sent $count requests..." }
  } catch {
    Write-Output "ERROR: $_"
  }
  Start-Sleep -Milliseconds 500
  $count++
}
Write-Output "Completed. Sent $count requests."
