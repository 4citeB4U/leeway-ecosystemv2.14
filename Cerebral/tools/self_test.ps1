# Self-test for CerebralDaemon
$base = "http://127.0.0.1:8765"

Write-Host "Testing /health..."
Invoke-RestMethod "$base/health"

Write-Host "Testing /action (open_app dry-run)..."
$payload = @{
  action_id = [guid]::NewGuid().ToString()
  action = "open_app"
  args = @{ app = "taskmgr" }
  confirm = $false
  caller = "self_test"
}
Invoke-RestMethod -Uri "$base/action" -Method Post -Body ($payload | ConvertTo-Json) -ContentType "application/json"

Write-Host "Testing /action (list_dir)..."
$payload = @{
  action_id = [guid]::NewGuid().ToString()
  action = "list_dir"
  args = @{ path = "$env:USERPROFILE\Downloads" }
  confirm = $false
  caller = "self_test"
}
Invoke-RestMethod -Uri "$base/action" -Method Post -Body ($payload | ConvertTo-Json) -ContentType "application/json"
