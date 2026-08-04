$ErrorActionPreference = "Continue"

function Test-Port {
  param(
    [string]$HostName,
    [int]$Port,
    [int]$TimeoutMs = 1500
  )

  try {
    $client = New-Object System.Net.Sockets.TcpClient
    $async = $client.BeginConnect($HostName, $Port, $null, $null)
    $ok = $async.AsyncWaitHandle.WaitOne($TimeoutMs, $false)

    if ($ok) {
      $client.EndConnect($async)
      $client.Close()
      return $true
    }

    $client.Close()
    return $false
  }
  catch {
    return $false
  }
}

function Add-Result {
  param(
    [string]$Check,
    [string]$Status,
    [string]$Details
  )

  [PSCustomObject]@{
    Check = $Check
    Status = $Status
    Details = $Details
  }
}

$results = @()

Write-Host ""
Write-Host "=== Agent Lee Tool / Port Proof ===" -ForegroundColor Cyan
Write-Host ""

# 1. Agent Lee router port.
if (Test-Port -HostName "localhost" -Port 8080) {
  try {
    $health = Invoke-RestMethod "http://localhost:8080/health" -TimeoutSec 5
    $results += Add-Result "Agent Lee HTTP port 8080" "PASS" "Router online: $($health.name), mode=$($health.mode)"
  }
  catch {
    $results += Add-Result "Agent Lee HTTP port 8080" "PARTIAL" "Port open but /health failed: $($_.Exception.Message)"
  }
}
else {
  $results += Add-Result "Agent Lee HTTP port 8080" "FAIL" "Port closed. Start router with npm start."
}

# 2. Agent Lee model endpoint.
try {
  $models = Invoke-RestMethod "http://localhost:8080/v1/models" -TimeoutSec 5
  $modelIds = ($models.data | ForEach-Object { $_.id }) -join ", "
  $results += Add-Result "Agent Lee OpenAI-compatible models" "PASS" "Models exposed: $modelIds"
}
catch {
  $results += Add-Result "Agent Lee OpenAI-compatible models" "FAIL" $_.Exception.Message
}

# 3. Agent Lee routes/tool map.
try {
  $routes = Invoke-RestMethod "http://localhost:8080/routes" -TimeoutSec 5
  $results += Add-Result "Agent Lee route map" "PASS" "Routes endpoint available. Router can classify tool/recovery/governed modes."
}
catch {
  $results += Add-Result "Agent Lee route map" "FAIL" $_.Exception.Message
}

# 4. Ollama port.
if (Test-Port -HostName "localhost" -Port 11434) {
  try {
    $ollama = Invoke-RestMethod "http://localhost:11434/api/tags" -TimeoutSec 10
    $installed = ($ollama.models | ForEach-Object { $_.name }) -join ", "
    $results += Add-Result "Ollama HTTP port 11434" "PASS" "Ollama online. Models: $installed"
  }
  catch {
    $results += Add-Result "Ollama HTTP port 11434" "PARTIAL" "Port open but /api/tags failed: $($_.Exception.Message)"
  }
}
else {
  $results += Add-Result "Ollama HTTP port 11434" "FAIL" "Port closed. Check Docker container leeway-qwen-coders."
}

# 5. VS Code CLI.
try {
  $codeCmd = Get-Command code -ErrorAction Stop
  $results += Add-Result "VS Code CLI" "PASS" $codeCmd.Source
}
catch {
  $results += Add-Result "VS Code CLI" "FAIL" "code command not found in PATH."
}

# 6. VS Code extension list relevant to agents/tools.
try {
  $extensions = code --list-extensions
  $matches = $extensions | Where-Object { $_ -match "copilot|chatgpt|openai|mcp|continue|cline|roo|ollama|devtools|browser" }

  if ($matches) {
    $results += Add-Result "VS Code agent/tool extensions" "PASS" (($matches | Sort-Object) -join ", ")
  }
  else {
    $results += Add-Result "VS Code agent/tool extensions" "PARTIAL" "No matching agent/tool extensions found."
  }
}
catch {
  $results += Add-Result "VS Code agent/tool extensions" "FAIL" $_.Exception.Message
}

# 7. MCP config file.
$mcpConfig = Join-Path $env:USERPROFILE ".leeway-vscode\agent-lee-coding-mode\.vscode\mcp.json"
if (Test-Path -LiteralPath $mcpConfig) {
  $results += Add-Result "MCP config file" "PASS" $mcpConfig
}
else {
  $results += Add-Result "MCP config file" "FAIL" "Missing: $mcpConfig"
}

# 8. Node/npx availability for MCP servers.
try {
  $node = node --version
  $npx = npx --version
  $results += Add-Result "Node/npx for MCP servers" "PASS" "node=$node npx=$npx"
}
catch {
  $results += Add-Result "Node/npx for MCP servers" "FAIL" $_.Exception.Message
}

# 9. Browser DevTools HTTP port.
if (Test-Port -HostName "localhost" -Port 9222) {
  try {
    $devtools = Invoke-RestMethod "http://localhost:9222/json/version" -TimeoutSec 5
    $results += Add-Result "Browser DevTools port 9222" "PASS" "Browser=$($devtools.Browser), Protocol=$($devtools.'Protocol-Version')"
  }
  catch {
    $results += Add-Result "Browser DevTools port 9222" "PARTIAL" "Port open but /json/version failed: $($_.Exception.Message)"
  }
}
else {
  $results += Add-Result "Browser DevTools port 9222" "NOT RUNNING" "Launch Chrome/Edge with --remote-debugging-port=9222 to enable DevTools HTTP control."
}

# 10. Agent Lee chat proof.
try {
  $body = @{
    model = "agent-lee"
    messages = @(
      @{
        role = "user"
        content = "Agent Lee, confirm in one sentence that your HTTP router, route map, and local tool proof script are active."
      }
    )
  } | ConvertTo-Json -Depth 8

  $response = Invoke-RestMethod `
    -Uri "http://localhost:8080/v1/chat/completions" `
    -Method Post `
    -ContentType "application/json" `
    -Body $body `
    -TimeoutSec 15

  $results += Add-Result "Agent Lee chat endpoint" "PASS" $response.choices[0].message.content
}
catch {
  $results += Add-Result "Agent Lee chat endpoint" "FAIL" $_.Exception.Message
}

$results | Format-Table -AutoSize

$out = Join-Path $env:USERPROFILE ".leeway-vscode\agent-lee-coding-mode\agent-lee-tool-port-proof.json"
$results | ConvertTo-Json -Depth 5 | Out-File -Encoding UTF8 $out

Write-Host ""
Write-Host "Proof saved to: $out" -ForegroundColor Green
