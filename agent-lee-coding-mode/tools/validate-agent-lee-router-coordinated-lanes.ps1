$Root = "D:\Leeway-Ecosystem v2.1.4"
$ReceiptDir = Join-Path $Root "Archive\receipts"
New-Item -ItemType Directory -Force -Path $ReceiptDir | Out-Null

$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$Receipt = Join-Path $ReceiptDir "agent-lee-router-coordinated-lanes-proof-$Stamp.json"

$Cases = @(
  @{
    name = "reasoning"
    expectedBackend = "qwen3:latest"
    token = "ROUTER_REASONING_LANE_OK"
    prompt = "/no_think`nReturn exactly this line and nothing else:`nROUTER_REASONING_LANE_OK YAWEEL"
  },
  @{
    name = "coding"
    expectedBackend = "qwen2.5-coder:latest"
    token = "ROUTER_CODING_LANE_OK"
    prompt = "Return exactly this line and nothing else:`nROUTER_CODING_LANE_OK YAWEEL"
  },
  @{
    name = "coding_fallback"
    expectedBackend = "deepseek-coder:latest"
    token = "ROUTER_DEEPSEEK_LANE_OK"
    prompt = "Return exactly this line and nothing else:`nROUTER_DEEPSEEK_LANE_OK YAWEEL"
  },
  @{
    name = "vision"
    expectedBackend = "qwen2.5vl:7b"
    token = "ROUTER_VISION_LANE_OK"
    prompt = "Return exactly this line and nothing else:`nROUTER_VISION_LANE_OK YAWEEL"
  }
)

function Get-ChoiceText {
  param($Parsed)
  if ($Parsed.choices -and $Parsed.choices.Count -gt 0) {
    if ($Parsed.choices[0].message.content) { return [string]$Parsed.choices[0].message.content }
    if ($Parsed.choices[0].text) { return [string]$Parsed.choices[0].text }
  }
  return ""
}

function Get-ResolvedBackend {
  param($Parsed)

  if ($Parsed.agentLeeRouter) {
    if ($Parsed.agentLeeRouter.resolvedBackend) { return [string]$Parsed.agentLeeRouter.resolvedBackend }
    if ($Parsed.agentLeeRouter.selectedBackend) { return [string]$Parsed.agentLeeRouter.selectedBackend }
    if ($Parsed.agentLeeRouter.ollamaModel) { return [string]$Parsed.agentLeeRouter.ollamaModel }
  }

  if ($Parsed.agentLeeTurbo) {
    if ($Parsed.agentLeeTurbo.resolvedBackend) { return [string]$Parsed.agentLeeTurbo.resolvedBackend }
    if ($Parsed.agentLeeTurbo.selectedBackend) { return [string]$Parsed.agentLeeTurbo.selectedBackend }
  }

  return ""
}

$result = [ordered]@{
  ok = $false
  status = "STARTED"
  receipt = $Receipt
  routerHealth = $null
  cases = @()
  failedCases = @()
  softFailedCases = @()
  error = $null
  ollamaPsAfter = $null
  startedAt = (Get-Date).ToString("o")
  endedAt = $null
}

try {
  $health = Invoke-WebRequest -Uri "http://127.0.0.1:8080/health" -UseBasicParsing -TimeoutSec 20
  $result.routerHealth = $health.Content | ConvertFrom-Json

  foreach ($case in $Cases) {
    Write-Host "`n[ROUTER CASE] $($case.name) expected=$($case.expectedBackend)" -ForegroundColor Cyan

    $body = @{
      model = $case.expectedBackend
      stream = $false
      max_tokens = 512
      temperature = 0
      trace = $true
      messages = @(
        @{
          role = "system"
          content = "You are Agent Lee Code Mode. Use the explicitly requested local backend model. Return visible content only."
        },
        @{
          role = "user"
          content = $case.prompt
        }
      )
    } | ConvertTo-Json -Depth 30

    $caseResult = [ordered]@{
      name = $case.name
      expectedBackend = $case.expectedBackend
      ok = $false
      responseMode = $null
      resolvedBackend = ""
      fallbackUsed = $null
      backendOk = $false
      visibleContentOk = $false
      tokenEchoOk = $false
      content = ""
      error = $null
      responseSummary = $null
    }

    try {
      $resp = Invoke-WebRequest `
        -Uri "http://127.0.0.1:8080/v1/chat/completions" `
        -Method POST `
        -ContentType "application/json" `
        -Body $body `
        -UseBasicParsing `
        -TimeoutSec 360

      $parsed = $resp.Content | ConvertFrom-Json
      $caseResult.content = Get-ChoiceText $parsed
      $caseResult.resolvedBackend = Get-ResolvedBackend $parsed

      if ($parsed.agentLeeRouter) {
        $caseResult.responseMode = $parsed.agentLeeRouter.responseMode
        $caseResult.fallbackUsed = $parsed.agentLeeRouter.fallbackUsed
      }

      $caseResult.responseSummary = [ordered]@{
        model = [string]$parsed.model
        route = [string]$parsed.route
        responseMode = $caseResult.responseMode
        resolvedBackend = $caseResult.resolvedBackend
        fallbackUsed = $caseResult.fallbackUsed
      }

      if ($caseResult.content -match "timed out|timeout|downstream model backend did not respond|Agent Lee online\." ) {
        throw "Router returned timeout text."
      }

      $caseResult.backendOk = $caseResult.resolvedBackend -eq $case.expectedBackend
      $caseResult.visibleContentOk = -not [string]::IsNullOrWhiteSpace($caseResult.content)
      $caseResult.tokenEchoOk = $caseResult.content -match $case.token -and $caseResult.content -match "YAWEEL"

      if (-not $caseResult.backendOk) {
        throw "Resolved backend mismatch. Expected=$($case.expectedBackend) Actual=$($caseResult.resolvedBackend)"
      }

      if (-not $caseResult.visibleContentOk) {
        throw "Missing visible response content."
      }

      if (-not $caseResult.tokenEchoOk) {
        $result.softFailedCases += $case.name
        Write-Host "[WARN] $($case.name): content answered, but proof token did not echo exactly." -ForegroundColor Yellow
      }

      $caseResult.ok = $true
      Write-Host "[PASS] $($case.name) -> $($caseResult.resolvedBackend)" -ForegroundColor Green
    } catch {
      $caseResult.error = $_.Exception.Message
      $result.failedCases += $case.name
      Write-Host "[FAIL] $($case.name): $($caseResult.error)" -ForegroundColor Red
    }

    $result.cases += [pscustomobject]$caseResult
  }

  try { $result.ollamaPsAfter = (& ollama ps) -join "`n" } catch {}

  if ($result.failedCases.Count -gt 0) {
    throw "Failed coordinated router cases: $($result.failedCases -join ', ')"
  }

  $result.ok = $true
  $result.status = "PASS"
} catch {
  $result.status = "FAIL"
  $result.error = $_.Exception.Message
} finally {
  $result.endedAt = (Get-Date).ToString("o")
  $result | ConvertTo-Json -Depth 80 | Set-Content -Path $Receipt -Encoding UTF8

  Write-Host "`nReceipt: $Receipt" -ForegroundColor Cyan
  Write-Host "Status: $($result.status)"
  Write-Host "OK: $($result.ok)"
  if ($result.error) { Write-Host "Error: $($result.error)" -ForegroundColor Red }

  Write-Host "`nFailed cases:" -ForegroundColor Cyan
  $result.failedCases

  Write-Host "`nSoft failed cases:" -ForegroundColor Cyan
  $result.softFailedCases

  Write-Host "`nOllama ps after:" -ForegroundColor Cyan
  $result.ollamaPsAfter

  if (-not $result.ok) { exit 1 }
}
