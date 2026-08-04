param()

$ErrorActionPreference = "Continue"
Set-StrictMode -Version Latest

$Root = "D:\Leeway-Ecosystem v2.1.4"
$ReceiptDir = Join-Path $Root "Archive\receipts"
New-Item -ItemType Directory -Force -Path $ReceiptDir | Out-Null

$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$Receipt = Join-Path $ReceiptDir "agent-lee-model-warmup-validate-$Stamp.json"

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
    $result.bodyPreview = $content.Substring(0, [Math]::Min(2000, $content.Length))
    try { $result.parsed = $content | ConvertFrom-Json } catch {}
  } catch {
    $result.error = $_.Exception.Message
  }

  $result.ms = [int]((Get-Date) - $started).TotalMilliseconds
  return [pscustomobject]$result
}

function Start-Ollama {
  $port = Test-Port 11434
  if ($port.listening) { return $true }

  Start-Process -FilePath "ollama.exe" -ArgumentList "serve" -WindowStyle Minimized -ErrorAction SilentlyContinue | Out-Null
  Start-Sleep -Seconds 8
  return (Test-Port 11434).listening
}

function Warm-Model {
  param(
    [string]$Model,
    [string]$Lane,
    [bool]$Required,
    [int]$NumPredict,
    [int]$TimeoutSec
  )

  $body = @{
    model = $Model
    stream = $false
    prompt = "Reply with exactly: ready"
    options = @{
      num_predict = $NumPredict
    }
  } | ConvertTo-Json -Depth 20

  $probe = Invoke-Json -Name "warm-$Model" -Uri "http://127.0.0.1:11434/api/generate" -Method "POST" -Body $body -TimeoutSec $TimeoutSec

  $loadMs = $null
  $totalMs = $null
  if ($probe.parsed) {
    if ($probe.parsed.load_duration) { $loadMs = [int]([double]$probe.parsed.load_duration / 1000000) }
    if ($probe.parsed.total_duration) { $totalMs = [int]([double]$probe.parsed.total_duration / 1000000) }
  }

  return [pscustomobject][ordered]@{
    id = $Model
    lane = $Lane
    required = $Required
    ok = $probe.ok
    httpMs = $probe.ms
    loadMs = $loadMs
    totalMs = $totalMs
    error = $probe.error
    bodyPreview = $probe.bodyPreview
  }
}

$result = [ordered]@{
  ok = $false
  status = "STARTED"
  error = $null
  receipt = $Receipt
  ollamaStarted = $false
  port11434 = $null
  tags = $null
  models = @()
  requiredOk = $false
  optionalOk = $false
  startedAt = (Get-Date).ToString("o")
  endedAt = $null
}

try {
  $result.ollamaStarted = Start-Ollama
  $result.port11434 = Test-Port 11434
  $result.tags = Invoke-Json -Name "ollamaTags" -Uri "http://127.0.0.1:11434/api/tags" -TimeoutSec 20

  if (-not $result.port11434.listening) {
    $result.status = "OLLAMA_PORT_DOWN"
    $result.error = "Port 11434 is not listening."
  } elseif (-not $result.tags.ok) {
    $result.status = "OLLAMA_TAGS_FAILED"
    $result.error = $result.tags.error
  } else {
    $warmTargets = @(
      @{ id = "qwen2.5-coder:latest"; lane = "coding"; required = $true; numPredict = 8; timeout = 180 },
      @{ id = "deepseek-coder:latest"; lane = "coding_fallback"; required = $false; numPredict = 8; timeout = 120 },
      @{ id = "qwen2.5vl:7b"; lane = "vision"; required = $false; numPredict = 4; timeout = 120 },
      @{ id = "qwen3:latest"; lane = "conversation_reasoning"; required = $true; numPredict = 8; timeout = 240 }
    )

    foreach ($m in $warmTargets) {
      $result.models += Warm-Model -Model $m.id -Lane $m.lane -Required ([bool]$m.required) -NumPredict ([int]$m.numPredict) -TimeoutSec ([int]$m.timeout)
    }

    $requiredFailures = @($result.models | Where-Object { $_.required -and -not $_.ok })
    $optionalFailures = @($result.models | Where-Object { -not $_.required -and -not $_.ok })

    $result.requiredOk = ($requiredFailures.Count -eq 0)
    $result.optionalOk = ($optionalFailures.Count -eq 0)

    if ($result.requiredOk) {
      $result.ok = $true
      $result.status = "PASS"
    } else {
      $result.status = "REQUIRED_MODEL_WARMUP_FAILED"
      $result.error = "Required models failed: " + (($requiredFailures | ForEach-Object { $_.id }) -join ", ")
    }
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
