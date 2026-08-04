param()

$ErrorActionPreference = "Continue"
Set-StrictMode -Version Latest

$Root = "D:\Leeway-Ecosystem v2.1.4"
$ReceiptDir = Join-Path $Root "Archive\receipts"
$LogDir = Join-Path $Root "Archive\logs\agent-lee-model-warmup"
New-Item -ItemType Directory -Force -Path $ReceiptDir,$LogDir | Out-Null

$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$Receipt = Join-Path $ReceiptDir "agent-lee-warmup-and-full-lock-$Stamp.json"

function Test-Port {
  param([int]$Port)

  $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
  $entry = [ordered]@{
    port = $Port
    listening = $false
    procId = $null
    processName = $null
    commandLine = $null
  }

  if ($conn) {
    $entry.listening = $true
    $entry.procId = $conn.OwningProcess
    $proc = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
    if ($proc) { $entry.processName = $proc.ProcessName }
    try {
      $entry.commandLine = (Get-CimInstance Win32_Process -Filter "ProcessId=$($conn.OwningProcess)").CommandLine
    } catch {}
  }

  return [pscustomobject]$entry
}

function Invoke-Http {
  param(
    [string]$Name,
    [string]$Uri,
    [string]$Method = "GET",
    [string]$Body = $null,
    [int]$TimeoutSec = 10
  )

  $started = Get-Date
  $result = [ordered]@{
    name = $Name
    uri = $Uri
    method = $Method
    ok = $false
    statusCode = $null
    ms = $null
    error = $null
    rawLength = 0
    bodyPreview = $null
    parsed = $null
  }

  try {
    if ($Method -eq "POST") {
      $r = Invoke-WebRequest -Uri $Uri -Method POST -ContentType "application/json" -Body $Body -UseBasicParsing -TimeoutSec $TimeoutSec
    } else {
      $r = Invoke-WebRequest -Uri $Uri -UseBasicParsing -TimeoutSec $TimeoutSec
    }

    $content = [string]$r.Content
    $result.ok = $true
    $result.statusCode = $r.StatusCode
    $result.rawLength = $content.Length
    $result.bodyPreview = $content.Substring(0, [Math]::Min(2500, $content.Length))

    try {
      $result.parsed = $content | ConvertFrom-Json
    } catch {}
  } catch {
    $result.error = $_.Exception.Message
  }

  $result.ms = [int]((Get-Date) - $started).TotalMilliseconds
  return [pscustomobject]$result
}

function Start-Adapter8787 {
  $adapterDir = Join-Path $Root ".leeway-vscode\agent-lee-vscode-adapter"
  $out = Join-Path $LogDir "adapter-8787-$Stamp.stdout.log"
  $err = Join-Path $LogDir "adapter-8787-$Stamp.stderr.log"

  $port = Test-Port 8787
  if ($port.listening) { return $true }

  Start-Process -FilePath "node.exe" -ArgumentList "server.cjs" -WorkingDirectory $adapterDir -RedirectStandardOutput $out -RedirectStandardError $err -PassThru | Out-Null
  Start-Sleep -Seconds 5

  return (Test-Port 8787).listening
}

function Start-Router8080 {
  $routerDir = Join-Path $Root "agent-lee-coding-mode"
  $out = Join-Path $LogDir "router-8080-$Stamp.stdout.log"
  $err = Join-Path $LogDir "router-8080-$Stamp.stderr.log"

  $port = Test-Port 8080
  if ($port.listening) { return $true }

  Start-Process -FilePath "node.exe" -ArgumentList "router/server-brainfix.mjs" -WorkingDirectory $routerDir -RedirectStandardOutput $out -RedirectStandardError $err -PassThru | Out-Null
  Start-Sleep -Seconds 5

  return (Test-Port 8080).listening
}

function Start-Ollama11434 {
  $port = Test-Port 11434
  if ($port.listening) { return $true }

  Start-Process -FilePath "ollama.exe" -ArgumentList "serve" -WindowStyle Minimized -ErrorAction SilentlyContinue | Out-Null
  Start-Sleep -Seconds 8

  return (Test-Port 11434).listening
}

function Warm-OllamaModel {
  param(
    [string]$Model,
    [string]$Lane,
    [bool]$Required,
    [int]$NumPredict = 8,
    [int]$TimeoutSec = 240
  )

  $body = @{
    model = $Model
    stream = $false
    prompt = "Reply with exactly: ready"
    options = @{
      num_predict = $NumPredict
    }
  } | ConvertTo-Json -Depth 20

  $probe = Invoke-Http -Name "warm-$Model" -Uri "http://127.0.0.1:11434/api/generate" -Method "POST" -Body $body -TimeoutSec $TimeoutSec

  return [pscustomobject][ordered]@{
    id = $Model
    lane = $Lane
    required = $Required
    ok = $probe.ok
    ms = $probe.ms
    error = $probe.error
    bodyPreview = $probe.bodyPreview
  }
}

$result = [ordered]@{
  ok = $false
  status = "STARTED"
  error = $null
  receipt = $Receipt
  servicesBefore = @()
  servicesAfter = @()
  adapterStarted = $false
  routerStarted = $false
  ollamaStarted = $false
  adapterHealth = $null
  routerIdentity = $null
  ollamaTags = $null
  adapterWarmupEndpoint = $null
  modelWarmups = @()
  fullConversation = $null
  responseMode = $null
  assistantContent = $null
  noRawDump = $false
  noTimeoutString = $false
  notTinyReady = $false
  survived = @()
  startedAt = (Get-Date).ToString("o")
  endedAt = $null
}

try {
  $result.servicesBefore = @(8787,8080,8765,8091,11434,4001,4000,3000 | ForEach-Object { Test-Port $_ })

  $result.routerStarted = Start-Router8080
  $result.adapterStarted = Start-Adapter8787
  $result.ollamaStarted = Start-Ollama11434

  $result.adapterHealth = Invoke-Http -Name "adapterHealth" -Uri "http://127.0.0.1:8787/health" -TimeoutSec 8
  $result.routerIdentity = Invoke-Http -Name "routerIdentity" -Uri "http://127.0.0.1:8080/agent-lee/identity" -TimeoutSec 8
  $result.ollamaTags = Invoke-Http -Name "ollamaTags" -Uri "http://127.0.0.1:11434/api/tags" -TimeoutSec 20

  $result.adapterWarmupEndpoint = Invoke-Http -Name "adapterModelWarmupRun" -Uri "http://127.0.0.1:8787/model-warmup/run" -Method "POST" -Body "{}" -TimeoutSec 5

  $models = @(
    @{ id = "qwen2.5-coder:latest"; lane = "coding"; required = $true; numPredict = 8 },
    @{ id = "deepseek-coder:latest"; lane = "coding_fallback"; required = $false; numPredict = 8 },
    @{ id = "qwen2.5vl:7b"; lane = "vision"; required = $false; numPredict = 4 },
    @{ id = "qwen3:latest"; lane = "conversation_reasoning"; required = $true; numPredict = 8 }
  )

  foreach ($m in $models) {
    $result.modelWarmups += Warm-OllamaModel -Model $m.id -Lane $m.lane -Required ([bool]$m.required) -NumPredict ([int]$m.numPredict) -TimeoutSec 240
  }

  $body = @{
    model = "agent-lee-code-mode"
    stream = $false
    max_tokens = 1200
    messages = @(
      @{
        role = "system"
        content = "You are Agent Lee in canonical Code Mode, Supreme Agent Lead for the Leeway ecosystem. Respond as the full agent lead. Do not dump raw JSON, raw cache, raw manifests, or giant path lists. Summarize what you understand, identify active services, missing/offline services, and next actions."
      },
      @{
        role = "user"
        content = "OK Agent Lee. Let's take an investigation into this Leeway ecosystem. Let me know what more you understand about it."
      }
    )
  } | ConvertTo-Json -Depth 20

  $result.fullConversation = Invoke-Http -Name "fullConversationInvestigation" -Uri "http://127.0.0.1:8787/v1/chat/completions" -Method "POST" -Body $body -TimeoutSec 180

  $content = ""
  if ($result.fullConversation.parsed -and $result.fullConversation.parsed.choices) {
    $content = [string]$result.fullConversation.parsed.choices[0].message.content
    $result.assistantContent = $content
  } else {
    $result.assistantContent = $result.fullConversation.bodyPreview
  }

  if ($result.fullConversation.parsed -and $result.fullConversation.parsed.agentLeeTurbo) {
    $result.responseMode = $result.fullConversation.parsed.agentLeeTurbo.responseMode
  }

  $dumpMarkers = @(
    "activeSkillSearchPaths",
    "activeCapabilitySearchPaths",
    "statefulResearchHarnessCopies",
    "universeManifestPath",
    "capability-registry",
    "raw fabric",
    "raw cache"
  )

  $hasDump = $false
  foreach ($marker in $dumpMarkers) {
    if ([string]$result.assistantContent -match [regex]::Escape($marker)) { $hasDump = $true }
  }

  $result.noRawDump = -not $hasDump
  $result.noTimeoutString = -not ([string]$result.assistantContent -match "adapter error: request timed out|request timed out")
  $result.notTinyReady = -not ([string]$result.assistantContent -match "^(Agent Lee ready\.|ready)$")

  $result.survived = @(8787,8080,8765,8091,11434 | ForEach-Object { Test-Port $_ })
  $result.servicesAfter = @(8787,8080,8765,8091,11434,4001,4000,3000 | ForEach-Object { Test-Port $_ })

  $requiredWarmupsOk = @($result.modelWarmups | Where-Object { $_.required -and -not $_.ok }).Count -eq 0
  $requiredPortsOk = @($result.survived | Where-Object { ($_.port -eq 8787 -or $_.port -eq 8080 -or $_.port -eq 11434) -and -not $_.listening }).Count -eq 0

  if (-not $result.adapterHealth.ok) {
    $result.status = "ADAPTER_HEALTH_FAILED"
    $result.error = $result.adapterHealth.error
  } elseif (-not $result.routerIdentity.ok) {
    $result.status = "ROUTER_IDENTITY_FAILED"
    $result.error = $result.routerIdentity.error
  } elseif (-not $result.ollamaTags.ok) {
    $result.status = "OLLAMA_TAGS_FAILED"
    $result.error = $result.ollamaTags.error
  } elseif (-not $requiredWarmupsOk) {
    $result.status = "REQUIRED_MODEL_WARMUP_FAILED"
    $result.error = "One or more required model warmups failed."
  } elseif (-not $result.fullConversation.ok) {
    $result.status = "FULL_CONVERSATION_HTTP_FAILED"
    $result.error = $result.fullConversation.error
  } elseif (-not $result.noTimeoutString) {
    $result.status = "RAW_TIMEOUT_STRING_LEAKED"
    $result.error = "Full conversation returned a raw timeout string."
  } elseif (-not $result.notTinyReady) {
    $result.status = "TINY_READY_RESPONSE"
    $result.error = "Full conversation returned tiny readiness response."
  } elseif (-not $result.noRawDump) {
    $result.status = "RAW_DUMP_DETECTED"
    $result.error = "Full conversation returned raw fabric/cache markers."
  } elseif (-not $requiredPortsOk) {
    $result.status = "SERVICE_SURVIVAL_FAILED"
    $result.error = "Required services did not survive."
  } else {
    $result.ok = $true
    $result.status = "PASS"
  }
} catch {
  $result.status = "EXCEPTION"
  $result.error = $_.Exception.Message
} finally {
  $result.endedAt = (Get-Date).ToString("o")
  $result | ConvertTo-Json -Depth 64 | Set-Content -Path $Receipt -Encoding UTF8

  Write-Host "Receipt: $Receipt"
  Write-Host "Status: $($result.status)"
  Write-Host "OK: $($result.ok)"
  if ($result.error) { Write-Host "Error: $($result.error)" }

  if (-not $result.ok) { exit 1 }
}
