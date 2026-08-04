for ($i=0; $i -lt 3; $i++) {
  $body = @{ subject = "gec-sample-$i"; operatorName = "tester" } | ConvertTo-Json
  try {
    $r = Invoke-RestMethod -Uri 'http://127.0.0.1:8080/agent-lee/conversation/start' -Method Post -Body $body -ContentType 'application/json' -ErrorAction Stop
    $r | ConvertTo-Json -Depth 5
  } catch {
    Write-Error $_
  }
  Start-Sleep -Milliseconds 300
}
