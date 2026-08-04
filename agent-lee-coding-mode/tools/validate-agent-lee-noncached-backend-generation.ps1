param(
  [string]$Root = "D:\Leeway-Ecosystem v2.1.4",
  [string]$ExpectedModel = "",
  [string[]]$AllowedAnsweringModels = @("qwen3:latest", "qwen2.5-coder:latest", "deepseek-coder:latest")
)

$ErrorActionPreference = "Stop"

$ReceiptDir = Join-Path $Root "Archive\receipts"
New-Item -ItemType Directory -Force -Path $ReceiptDir | Out-Null

$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$Receipt = Join-Path $ReceiptDir "agent-lee-noncached-backend-generation-$Stamp.json"

function Invoke-Probe {
  param(
    [string]$Name,
    [string]$Uri,
    [string]$Body,
    [int]$TimeoutSec = 180
  )

  $started = Get-Date
  $r = [ordered]@{
    name = $Name
    uri = $Uri
    ok = $false
    statusCode = $null
    ms = $null
    error = $null
    body = $null
    parsed = $null
  }

  try {
    $resp = Invoke-WebRequest -Uri $Uri -Method POST -ContentType "application/json" -Body $Body -UseBasicParsing -TimeoutSec $TimeoutSec
    $r.ok = $true
    $r.statusCode = $resp.StatusCode
    $r.body = [string]$resp.Content
    try { $r.parsed = $r.body | ConvertFrom-Json } catch {}
  } catch {
    $r.error = $_.Exception.Message
    if ($_.Exception.Response) {
      try {
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $r.body = $reader.ReadToEnd()
      } catch {}
    }
  }

  $r.ms = [int]((Get-Date) - $started).TotalMilliseconds
  return [pscustomobject]$r
}

function Get-ChoiceText {
  param($Parsed)

  if ($Parsed -and $Parsed.choices -and $Parsed.choices.Count -gt 0) {
    if ($Parsed.choices[0].message -and $Parsed.choices[0].message.content) {
      return [string]$Parsed.choices[0].message.content
    }
    if ($Parsed.choices[0].text) {
      return [string]$Parsed.choices[0].text
    }
  }

  return ""
}

$result = [ordered]@{
  ok = $false
  status = "STARTED"
  receipt = $Receipt
  expectedModel = $ExpectedModel
  adapterChat = $null
  adapterContent = ""
  responseMode = $null
  timeout = $null
  resolvedBackend = $null
  acceptedEvidence = @()
  rejectedEvidence = @()
  error = $null
  startedAt = (Get-Date).ToString("o")
  endedAt = $null
}

try {
  $body = @{
    model = "agent-lee-code-mode"
    stream = $false
    max_tokens = 900
    messages = @(
      @{
        role = "system"
        content = "You are Agent Lee in canonical Code Mode. This is a non-cached backend generation proof. Do not answer with only identity status or hot cached identity text."
      },
      @{
        role = "user"
        content = "Build one short sentence that names the backend model you actually used and says whether it answered directly or via fallback."
      }
    )
  } | ConvertTo-Json -Depth 20

  $result.adapterChat = Invoke-Probe `
    -Name "adapterNoncachedChat" `
    -Uri "http://127.0.0.1:8787/v1/chat/completions" `
    -Body $body `
    -TimeoutSec 180

  if (-not $result.adapterChat.ok) {
    throw "Adapter chat HTTP failed: $($result.adapterChat.error) $($result.adapterChat.body)"
  }

  $result.adapterContent = Get-ChoiceText $result.adapterChat.parsed

  if ($result.adapterChat.parsed -and $result.adapterChat.parsed.agentLeeTurbo) {
    $result.responseMode = $result.adapterChat.parsed.agentLeeTurbo.responseMode
    $result.timeout = $result.adapterChat.parsed.agentLeeTurbo.timeout
  }

  if ($result.adapterChat.parsed -and $result.adapterChat.parsed.agentLeeRouter) {
    if ($result.adapterChat.parsed.agentLeeRouter.resolvedBackend) {
      $result.resolvedBackend = $result.adapterChat.parsed.agentLeeRouter.resolvedBackend
    } elseif ($result.adapterChat.parsed.agentLeeRouter.ollamaModel) {
      $result.resolvedBackend = $result.adapterChat.parsed.agentLeeRouter.ollamaModel
    } elseif ($result.adapterChat.parsed.agentLeeRouter.backendModel) {
      $result.resolvedBackend = $result.adapterChat.parsed.agentLeeRouter.backendModel
    }
  }

  if (-not $result.resolvedBackend -and $result.adapterChat.parsed -and $result.adapterChat.parsed.agentLeeTurbo) {
    if ($result.adapterChat.parsed.agentLeeTurbo.resolvedBackend) {
      $result.resolvedBackend = $result.adapterChat.parsed.agentLeeTurbo.resolvedBackend
    } elseif ($result.adapterChat.parsed.agentLeeTurbo.selectedBackend) {
      $result.resolvedBackend = $result.adapterChat.parsed.agentLeeTurbo.selectedBackend
    }
  }

  if (-not $result.adapterContent -or $result.adapterContent.Trim().Length -eq 0) {
    $result.rejectedEvidence += "empty_content"
  } else {
    $result.acceptedEvidence += "nonempty_content"
  }

  if ($result.adapterContent -match "^Agent Lee online\.$") {
    $result.rejectedEvidence += "hot_cached_identity_response"
  }

  if ($result.responseMode -eq "hot_cached_identity_response") {
    $result.rejectedEvidence += "response_mode_hot_cached_identity_response"
  } elseif ($result.responseMode) {
    $result.acceptedEvidence += "response_mode_$($result.responseMode)"
  }

  if ($result.responseMode -eq "downstream_model_deferred") {
    $result.rejectedEvidence += "response_mode_downstream_model_deferred"
  }

  if ($result.timeout -eq $true) {
    $result.rejectedEvidence += "timeout_true"
  } else {
    $result.acceptedEvidence += "timeout_not_true"
  }

  if ($result.adapterContent -match "downstream model backend did not respond|Agent Lee turbo adapter error|request timed out|ECONNREFUSED|connect ECONNREFUSED") {
    $result.rejectedEvidence += "transport_failure_text"
  } else {
    $result.acceptedEvidence += "no_transport_failure_text"
  }

  if ($result.adapterContent -match "raw cache|raw manifest|raw fabric") {
    $result.rejectedEvidence += "raw_dump_marker"
  } else {
    $result.acceptedEvidence += "no_raw_dump_marker"
  }

  if ($result.resolvedBackend) {
    $result.acceptedEvidence += "resolved_backend_$($result.resolvedBackend)"
    if ($AllowedAnsweringModels -and ($AllowedAnsweringModels -notcontains [string]$result.resolvedBackend)) {
      $result.rejectedEvidence += "resolved_backend_not_allowed_$($result.resolvedBackend)"
    }
  } else {
    $result.rejectedEvidence += "resolved_backend_missing"
  }

  if ($ExpectedModel -and $result.resolvedBackend -and ([string]$result.resolvedBackend -ne $ExpectedModel)) {
    $result.rejectedEvidence += "resolved_backend_mismatch_$($result.resolvedBackend)"
  }

  if ($result.rejectedEvidence.Count -gt 0) {
    throw "Noncached backend generation proof rejected: $($result.rejectedEvidence -join ', ')"
  }

  $result.ok = $true
  $result.status = "PASS"
} catch {
  $result.status = "FAIL"
  $result.error = $_.Exception.Message
} finally {
  $result.endedAt = (Get-Date).ToString("o")
  $result | ConvertTo-Json -Depth 100 | Set-Content -Path $Receipt -Encoding UTF8

  Write-Host "`nReceipt: $Receipt" -ForegroundColor Cyan
  Write-Host "Status: $($result.status)"
  Write-Host "OK: $($result.ok)"
  if ($result.error) { Write-Host "Error: $($result.error)" -ForegroundColor Red }

  Write-Host "`nresponseMode:" -ForegroundColor Cyan
  $result.responseMode

  Write-Host "`ntimeout:" -ForegroundColor Cyan
  $result.timeout

  Write-Host "`nresolvedBackend:" -ForegroundColor Cyan
  $result.resolvedBackend

  Write-Host "`nAccepted evidence:" -ForegroundColor Cyan
  $result.acceptedEvidence

  Write-Host "`nRejected evidence:" -ForegroundColor Cyan
  $result.rejectedEvidence

  Write-Host "`nAdapter content:" -ForegroundColor Cyan
  $result.adapterContent

  if (-not $result.ok) { exit 1 }
}
