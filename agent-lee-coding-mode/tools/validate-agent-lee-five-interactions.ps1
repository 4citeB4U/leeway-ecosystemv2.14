Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$Root = "D:\Leeway-Ecosystem v2.1.4"
$AdapterUrl = "http://127.0.0.1:8787/v1/chat/completions"
$ReceiptDir = Join-Path $Root "Archive\receipts"
New-Item -ItemType Directory -Force -Path $ReceiptDir | Out-Null

$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$ReceiptPath = Join-Path $ReceiptDir "agent-lee-five-interactions-transcript-$Stamp.json"

$Prompts = @(
  "Agent Lee, who are you?",
  "Agent Lee, are you online?",
  "Agent Lee, what is your status?",
  "Agent Lee, is the voice output ready?",
  "Agent Lee, are you in the fast lane?"
)

function Invoke-Chat {
  param([string]$Prompt)

  $body = @{
    model = "agent-lee-code-mode"
    stream = $false
    temperature = 0
    max_tokens = 512
    messages = @(
      @{ role = "user"; content = $Prompt }
    )
  } | ConvertTo-Json -Depth 20

  $start = Get-Date
  try {
    $response = Invoke-RestMethod -Uri $AdapterUrl -Method Post -ContentType "application/json" -Body $body -TimeoutSec 180
    $elapsed = [int]((Get-Date) - $start).TotalMilliseconds
    
    $content = $response.choices[0].message.content
    $selectedBackend = $response.agentLeeTurbo.selectedBackend
    $responseMode = $response.agentLeeTurbo.responseMode

    # Verify not fallback text or timeout
    $isFallback = $content -match "expired|aborted|timed out|downstream model backend did not respond|Backend note"
    $isCanned = $content -eq "Agent Lee ready." -or $content -eq "ready"
    $isAgentLee = $content -match "Agent Lee" -or $content -match "Lee" -or $content -match "Ecosystem" -or $content -match "orchestration" -or $content -match "sovereign"

    return [ordered]@{
      prompt = $Prompt
      response = $content
      selectedBackend = $selectedBackend
      responseMode = $responseMode
      elapsedMs = $elapsed
      ok = ($response.choices.Count -gt 0 -and -not $isFallback -and -not $isCanned -and $isAgentLee)
      error = if ($isFallback) { "Fallback/timeout text matched." } elseif ($isCanned) { "Canned response matched." } elseif (-not $isAgentLee) { "Identity mention missing." } else { $null }
    }
  } catch {
    return [ordered]@{
      prompt = $Prompt
      response = $null
      selectedBackend = $null
      responseMode = $null
      elapsedMs = 0
      ok = $false
      error = $_.Exception.Message
    }
  }
}

$results = @()
$allPassed = $true

foreach ($p in $Prompts) {
  Write-Host "Sending prompt: $p" -ForegroundColor Cyan
  $res = Invoke-Chat -Prompt $p
  $results += [pscustomobject]$res
  
  if (-not $res.ok) {
    $allPassed = $false
    Write-Host "Response verification FAILED: $($res.error)" -ForegroundColor Red
  } else {
    Write-Host "Response verification PASSED (Backend: $($res.selectedBackend))" -ForegroundColor Green
  }
  Write-Host "Response: $($res.response)`n"
}

$Receipt = [ordered]@{
  schema = "leeway.agent-lee.five-interactions-transcript.v1"
  status = if ($allPassed) { "PASS" } else { "FAIL" }
  ok = $allPassed
  timestamp = (Get-Date).ToString("o")
  interactions = $results
}

$Receipt | ConvertTo-Json -Depth 20 | Set-Content -Path $ReceiptPath -Encoding UTF8
Write-Host "Five Interactions Receipt saved to: $ReceiptPath"

if (-not $allPassed) {
  exit 1
}
exit 0
