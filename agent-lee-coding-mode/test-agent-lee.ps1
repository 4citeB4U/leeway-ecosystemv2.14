$ErrorActionPreference = "Stop"

$body = @{
  model = "agent-lee"
  messages = @(
    @{
      role = "user"
      content = "Agent Lee, confirm Coding Mode is online and confirm you are using the locked Leeway source folders."
    }
  )
} | ConvertTo-Json -Depth 8

Invoke-RestMethod `
  -Uri "http://localhost:8080/v1/chat/completions" `
  -Method Post `
  -ContentType "application/json" `
  -Body $body
