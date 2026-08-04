param()

$ErrorActionPreference = "Continue"
Set-StrictMode -Version Latest

$Root = "D:\Leeway-Ecosystem v2.1.4"
$ReceiptDir = Join-Path $Root "Archive\receipts"
New-Item -ItemType Directory -Force -Path $ReceiptDir | Out-Null

$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$ReceiptPath = Join-Path $ReceiptDir "agent-lee-vscode-chat-investigation-prompt-$Stamp.json"

function ConvertTo-JsonSafeObject {
  param([object]$Value)

  if ($null -eq $Value) { return $null }

  if ($Value -is [System.Collections.IDictionary]) {
    $out = [ordered]@{}
    foreach ($key in $Value.Keys) {
      $out[[string]$key] = ConvertTo-JsonSafeObject $Value[$key]
    }
    return [pscustomobject]$out
  }

  if (($Value -is [System.Collections.IEnumerable]) -and -not ($Value -is [string])) {
    $arr = @()
    foreach ($item in $Value) {
      $arr += ConvertTo-JsonSafeObject $item
    }
    return $arr
  }

  if (($Value -is [psobject]) -and -not ($Value -is [string])) {
    $props = @($Value.PSObject.Properties)
    if ($props.Count -gt 0) {
      $out = [ordered]@{}
      foreach ($prop in $props) {
        $out[[string]$prop.Name] = ConvertTo-JsonSafeObject $prop.Value
      }
      return [pscustomobject]$out
    }
  }

  return $Value
}

function Write-Receipt {
  param([object]$Payload)

  try {
    $safe = ConvertTo-JsonSafeObject $Payload
    $safe | ConvertTo-Json -Depth 64 | Set-Content -Path $ReceiptPath -Encoding UTF8
  } catch {
    $fallback = [ordered]@{
      ok = $false
      status = "RECEIPT_WRITE_FAILED"
      error = $_.Exception.Message
      receiptPath = $ReceiptPath
      timestamp = (Get-Date).ToString("o")
    }
    $fallback | ConvertTo-Json -Depth 20 | Set-Content -Path $ReceiptPath -Encoding UTF8
  }
}

function Test-Port {
  param([int]$Port)

  $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
  $entry = [ordered]@{
    port = $Port
    listening = $false
    pid = $null
    processName = $null
    commandLine = $null
  }

  if ($conn) {
    $entry.listening = $true
    $entry.pid = $conn.OwningProcess
    $proc = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
    if ($proc) { $entry.processName = $proc.ProcessName }
    try {
      $entry.commandLine = (Get-CimInstance Win32_Process -Filter "ProcessId=$($conn.OwningProcess)").CommandLine
    } catch {}
  }

  return [pscustomobject]$entry
}

function Invoke-Probe {
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
    bodyPreview = $null
    rawLength = 0
  }

  try {
    if ($Method -eq "POST") {
      $r = Invoke-WebRequest -Uri $Uri -Method POST -ContentType "application/json" -Body $Body -UseBasicParsing -TimeoutSec $TimeoutSec
    } else {
      $r = Invoke-WebRequest -Uri $Uri -UseBasicParsing -TimeoutSec $TimeoutSec
    }

    $elapsed = [int]((Get-Date) - $started).TotalMilliseconds
    $content = [string]$r.Content
    $result.ok = $true
    $result.statusCode = $r.StatusCode
    $result.ms = $elapsed
    $result.rawLength = $content.Length
    $result.bodyPreview = $content.Substring(0, [Math]::Min(2000, $content.Length))
  } catch {
    $elapsed = [int]((Get-Date) - $started).TotalMilliseconds
    $result.ms = $elapsed
    $result.error = $_.Exception.Message
  }

  return [pscustomobject]$result
}

$payload = [ordered]@{
  ok = $false
  status = "STARTED"
  error = $null
  receiptPath = $ReceiptPath
  adapterHealth = $null
  routerIdentity = $null
  chat = $null
  responseLength = 0
  responsePreview = $null
  responseMode = $null
  noInlineDump = $false
  survivalAfterPrompt = @()
  ports = @()
  timestamp = (Get-Date).ToString("o")
}

try {
  $payload.ports = @(8787,8080,8765,8091,4001,4000,11434,3000 | ForEach-Object { Test-Port $_ })

  $payload.adapterHealth = Invoke-Probe -Name "adapterHealth" -Uri "http://127.0.0.1:8787/health" -TimeoutSec 5
  $payload.routerIdentity = Invoke-Probe -Name "routerIdentity" -Uri "http://127.0.0.1:8080/agent-lee/identity" -TimeoutSec 5

  $chatBody = @{
    model = "agent-lee-code-mode"
    stream = $false
    max_tokens = 256
    messages = @(
      @{
        role = "user"
        content = "OK Agent Lee. Let's take an investigation into this leeway ecosystem. Let me know what more you understand about it."
      }
    )
  } | ConvertTo-Json -Depth 20

  $payload.chat = Invoke-Probe -Name "investigationChat" -Uri "http://127.0.0.1:8787/v1/chat/completions" -Method "POST" -Body $chatBody -TimeoutSec 30

  $preview = [string]$payload.chat.bodyPreview
  $payload.responseLength = $payload.chat.rawLength
  $payload.responsePreview = $preview

  try {
    $parsed = $preview | ConvertFrom-Json
    if ($parsed.agentLeeTurbo -and $parsed.agentLeeTurbo.responseMode) {
      $payload.responseMode = $parsed.agentLeeTurbo.responseMode
    }
  } catch {}

  $dumpPatterns = @(
    "activeSkillSearchPaths",
    "activeCapabilitySearchPaths",
    "statefulResearchHarnessCopies",
    "universeManifestPath",
    "capability-registry",
    "fabricCache",
    "raw fabric",
    "raw cache"
  )

  $hasDump = $false
  foreach ($pat in $dumpPatterns) {
    if ($preview -match [regex]::Escape($pat)) { $hasDump = $true }
  }

  $payload.noInlineDump = -not $hasDump
  $payload.survivalAfterPrompt = @(8787,8080 | ForEach-Object { Test-Port $_ })

  $adapterAlive = @($payload.survivalAfterPrompt | Where-Object { $_.port -eq 8787 -and $_.listening }).Count -gt 0
  $routerAlive = @($payload.survivalAfterPrompt | Where-Object { $_.port -eq 8080 -and $_.listening }).Count -gt 0

  if (-not $payload.adapterHealth.ok) {
    $payload.status = "ADAPTER_HEALTH_FAILED"
    $payload.error = $payload.adapterHealth.error
  } elseif (-not $payload.routerIdentity.ok) {
    $payload.status = "ROUTER_IDENTITY_FAILED"
    $payload.error = $payload.routerIdentity.error
  } elseif (-not $payload.chat.ok) {
    $payload.status = "CHAT_FAILED"
    $payload.error = $payload.chat.error
  } elseif ($payload.responseLength -gt 2000) {
    $payload.status = "RESPONSE_TOO_LARGE"
    $payload.error = "Response length exceeded 2000 chars."
  } elseif (-not $payload.noInlineDump) {
    $payload.status = "INLINE_DUMP_DETECTED"
    $payload.error = "Response contains raw fabric/cache dump markers."
  } elseif (-not ($adapterAlive -and $routerAlive)) {
    $payload.status = "SURVIVAL_FAILED"
    $payload.error = "8787 or 8080 not alive after prompt."
  } else {
    $payload.ok = $true
    $payload.status = "PASS"
  }
} catch {
  $payload.status = "EXCEPTION"
  $payload.error = $_.Exception.Message
} finally {
  $payload.timestamp = (Get-Date).ToString("o")
  Write-Receipt $payload
  Write-Host "Receipt: $ReceiptPath"
  Write-Host "Status: $($payload.status)"
  Write-Host "OK: $($payload.ok)"
  if ($payload.error) { Write-Host "Error: $($payload.error)" }
  if (-not $payload.ok) { exit 1 }
}
