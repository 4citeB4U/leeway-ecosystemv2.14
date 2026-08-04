param()

$ErrorActionPreference = "Continue"
Set-StrictMode -Version Latest

$Root = "D:\Leeway-Ecosystem v2.1.4"
$ReceiptDir = Join-Path $Root "Archive\receipts"
New-Item -ItemType Directory -Force -Path $ReceiptDir | Out-Null

$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$Receipt = Join-Path $ReceiptDir "agent-lee-full-conversation-investigation-$Stamp.json"

function Test-Port {
  param([int]$Port)
  $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($conn) {
    return [pscustomobject]@{
      port = $Port
      listening = $true
      procId = $conn.OwningProcess
    }
  }
  return [pscustomobject]@{
    port = $Port
    listening = $false
    procId = $null
  }
}

function Invoke-Json {
  param(
    [string]$Name,
    [string]$Uri,
    [string]$Method = "GET",
    [string]$Body = $null,
    [int]$TimeoutSec = 30
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
    $result.bodyPreview = $content.Substring(0, [Math]::Min(3000, $content.Length))
    try { $result.parsed = $content | ConvertFrom-Json } catch {}
  } catch {
    $result.error = $_.Exception.Message
  }

  $result.ms = [int]((Get-Date) - $started).TotalMilliseconds
  return [pscustomobject]$result
}

$result = [ordered]@{
  ok = $false
  status = "STARTED"
  error = $null
  receipt = $Receipt
  portsBefore = @()
  adapterHealth = $null
  routerIdentity = $null
  ollamaTags = $null
  fullConversation = $null
  assistantContent = $null
  responseMode = $null
  timeout = $null
  noRawDump = $false
  noTimeoutString = $false
  notTinyReady = $false
  portsAfter = @()
  startedAt = (Get-Date).ToString("o")
  endedAt = $null
}

try {
  $result.portsBefore = @(8787,8080,11434,8765,8091 | ForEach-Object { Test-Port $_ })

  $result.adapterHealth = Invoke-Json -Name "adapterHealth" -Uri "http://127.0.0.1:8787/health" -TimeoutSec 10
  $result.routerIdentity = Invoke-Json -Name "routerIdentity" -Uri "http://127.0.0.1:8080/agent-lee/identity" -TimeoutSec 10
  $result.ollamaTags = Invoke-Json -Name "ollamaTags" -Uri "http://127.0.0.1:11434/api/tags" -TimeoutSec 20

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

  $result.fullConversation = Invoke-Json -Name "fullConversation" -Uri "http://127.0.0.1:8787/v1/chat/completions" -Method "POST" -Body $body -TimeoutSec 180

  $content = ""
  if ($result.fullConversation.parsed -and $result.fullConversation.parsed.choices) {
    $content = [string]$result.fullConversation.parsed.choices[0].message.content
  } else {
    $content = [string]$result.fullConversation.bodyPreview
  }

  $result.assistantContent = $content

  if ($result.fullConversation.parsed -and $result.fullConversation.parsed.agentLeeTurbo) {
    $result.responseMode = $result.fullConversation.parsed.agentLeeTurbo.responseMode
    $result.timeout = $result.fullConversation.parsed.agentLeeTurbo.timeout
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
    if ($content -match [regex]::Escape($marker)) { $hasDump = $true }
  }

  $result.noRawDump = -not $hasDump
  $result.noTimeoutString = -not ($content -match "Agent Lee turbo adapter error")
  $result.notTinyReady = -not ($content -match "^(Agent Lee ready\.|ready)$")

  $result.portsAfter = @(8787,8080,11434,8765,8091 | ForEach-Object { Test-Port $_ })

  $requiredPortsOk = @($result.portsAfter | Where-Object { ($_.port -eq 8787 -or $_.port -eq 8080 -or $_.port -eq 11434) -and -not $_.listening }).Count -eq 0

  if (-not $result.adapterHealth.ok) {
    $result.status = "ADAPTER_HEALTH_FAILED"
    $result.error = $result.adapterHealth.error
  } elseif (-not $result.routerIdentity.ok) {
    $result.status = "ROUTER_IDENTITY_FAILED"
    $result.error = $result.routerIdentity.error
  } elseif (-not $result.ollamaTags.ok) {
    $result.status = "OLLAMA_TAGS_FAILED"
    $result.error = $result.ollamaTags.error
  } elseif (-not $result.fullConversation.ok) {
    $result.status = "FULL_CONVERSATION_HTTP_FAILED"
    $result.error = $result.fullConversation.error
  } elseif (-not $result.noTimeoutString) {
    $result.status = "RAW_TIMEOUT_STRING_LEAKED"
    $result.error = "Full conversation leaked raw timeout string."
  } elseif (-not $result.notTinyReady) {
    $result.status = "TINY_READY_RESPONSE"
    $result.error = "Full conversation returned tiny readiness."
  } elseif (-not $result.noRawDump) {
    $result.status = "RAW_DUMP_DETECTED"
    $result.error = "Full conversation returned raw fabric/cache markers."
  } elseif (-not $requiredPortsOk) {
    $result.status = "SERVICE_SURVIVAL_FAILED"
    $result.error = "8787, 8080, or 11434 did not survive."
  } elseif ($result.responseMode -eq "hot_cached_identity_response") {
    $result.status = "HOT_CACHED_IDENTITY_RESPONSE"
    $result.error = "Full investigation prompt used tiny hot identity path."
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

