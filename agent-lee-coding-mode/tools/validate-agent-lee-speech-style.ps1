# LEEWAY_HEADER - DO NOT REMOVE
#
# ID: LEEWAY_APP::AGENT_LEE::SPEECH_STYLE::VALIDATE_AGENT_LEE_SPEECH_STYLE
# CLASSIFICATION: VALIDATION
# OWNER: LeeWay Local Runtime Stabilization
# PURPOSE: Prove the speech style policy is natural, Leeway-first, and wired into the live router.

[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Resolve-WorkspaceRoot {
  Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
}

function Read-JsonFile {
  param([Parameter(Mandatory = $true)][string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) { return $null }
  try { return (Get-Content -LiteralPath $Path -Raw) | ConvertFrom-Json } catch { return $null }
}

function Invoke-JsonRequest {
  param(
    [Parameter(Mandatory = $true)][ValidateSet('GET', 'POST')][string]$Method,
    [Parameter(Mandatory = $true)][string]$Url,
    [Parameter()][object]$Body = $null,
    [int]$TimeoutSec = 120
  )

  try {
    if ($Method -eq 'GET') {
      $response = Invoke-WebRequest -Uri $Url -Method Get -UseBasicParsing -TimeoutSec $TimeoutSec -ErrorAction Stop
    } else {
      $payload = if ($null -ne $Body) { $Body | ConvertTo-Json -Depth 32 } else { '{}' }
      $response = Invoke-WebRequest -Uri $Url -Method Post -ContentType 'application/json' -Body $payload -UseBasicParsing -TimeoutSec $TimeoutSec -ErrorAction Stop
    }

    $data = $null
    if ($response.Content) {
      try { $data = $response.Content | ConvertFrom-Json } catch { $data = $response.Content }
    }

    return [ordered]@{
      ok = ($response.StatusCode -ge 200 -and $response.StatusCode -lt 300)
      statusCode = [int]$response.StatusCode
      data = $data
      headers = $response.Headers
      error = $null
    }
  } catch {
    $statusCode = 0
    $body = $null
    if ($_.Exception.Response) {
      try {
        $statusCode = [int]$_.Exception.Response.StatusCode
        $stream = $_.Exception.Response.GetResponseStream()
        if ($stream) {
          $reader = New-Object System.IO.StreamReader($stream)
          $body = $reader.ReadToEnd()
          $reader.Close()
        }
      } catch {}
    }
    $data = $null
    if ($body) {
      try { $data = $body | ConvertFrom-Json } catch { $data = $body }
    }
    return [ordered]@{
      ok = $false
      statusCode = $statusCode
      data = $data
      headers = $null
      error = $_.Exception.Message
    }
  }
}

function Assert-Contains {
  param(
    [Parameter(Mandatory = $true)][string[]]$Needles,
    [Parameter(Mandatory = $true)][string]$Haystack,
    [Parameter(Mandatory = $true)][string]$Label
  )

  foreach ($needle in $Needles) {
    if ($Haystack -notmatch [regex]::Escape($needle)) {
      throw "$Label missing required phrase: $needle"
    }
  }
}

$WorkspaceRoot = Resolve-WorkspaceRoot
$ReceiptDir = Join-Path $WorkspaceRoot 'Archive\receipts'
New-Item -ItemType Directory -Force -Path $ReceiptDir | Out-Null

$PolicyPath = Join-Path $WorkspaceRoot 'agent-lee-coding-mode\runtime\agent-lee-speech-style-policy.json'
$Policy = Read-JsonFile -Path $PolicyPath
if (-not $Policy) {
  throw "Could not parse speech style policy at $PolicyPath"
}

$PolicyStatus = Invoke-JsonRequest -Method GET -Url 'http://127.0.0.1:8080/agent-lee/language/policy' -TimeoutSec 60
if (-not $PolicyStatus.ok) {
  throw "Router policy endpoint failed: $($PolicyStatus.error)"
}

$SpeechPolicy = $PolicyStatus.data.speechStylePolicy
$PolicyText = ($Policy.styleRules + $Policy.preferredProgressPhrases + $Policy.progressGuidance.avoidBureaucraticPhrases) -join "`n"
Assert-Contains -Needles @('Agent Lee speaks naturally.', 'Agent Lee avoids robotic tool narration.', 'Leeway') -Haystack $PolicyText -Label 'Speech policy'

if (-not $SpeechPolicy -or $SpeechPolicy.progressTone -ne 'Leeway') {
  throw 'Live router speech style policy does not advertise the Leeway progress tone.'
}

$SpeakResponse = Invoke-JsonRequest -Method POST -Url 'http://127.0.0.1:8080/agent-lee/voice/speak' -TimeoutSec 120 -Body @{
  text = "Web is up. I'm keeping the build lane moving."
  language = 'en'
  name = 'agent-lee-speech-style-proof'
}

if (-not $SpeakResponse.ok) {
  throw "Voice speak endpoint failed: $($SpeakResponse.error)"
}

$StreamPath = Join-Path $ReceiptDir "agent-lee-speech-style-preview-$((Get-Date).ToString('yyyyMMdd-HHmmss')).mp3"
$StreamHeaders = $null
try {
  Add-Type -AssemblyName System.Net.Http
  $client = [System.Net.Http.HttpClient]::new()
  $payload = (@{
    text = "I have the receipts lined up. This one's not just talk."
    language = 'en'
    name = 'agent-lee-speech-style-stream'
  } | ConvertTo-Json -Depth 16)
  $content = [System.Net.Http.StringContent]::new($payload, [System.Text.Encoding]::UTF8, 'application/json')
  $response = $client.PostAsync('http://127.0.0.1:8080/agent-lee/voice/speak-stream', $content).GetAwaiter().GetResult()
  $bytes = $response.Content.ReadAsByteArrayAsync().GetAwaiter().GetResult()
  [System.IO.File]::WriteAllBytes($StreamPath, $bytes)
  $StreamHeaders = [ordered]@{}
  foreach ($header in $response.Headers) {
    $StreamHeaders[$header.Key] = ($header.Value -join ',')
  }
  foreach ($header in $response.Content.Headers) {
    $StreamHeaders[$header.Key] = ($header.Value -join ',')
  }
} catch {
  throw "Streaming speech endpoint failed: $($_.Exception.Message)"
}

if (-not (Test-Path -LiteralPath $StreamPath)) {
  throw "Streaming speech artifact was not written: $StreamPath"
}

$HeadersText = if ($StreamHeaders) { ($StreamHeaders.GetEnumerator() | ForEach-Object { "$($_.Key)=$($_.Value)" }) -join '; ' } else { '' }
if ($HeadersText -notmatch 'x-agent-lee-speech-style=Leeway') {
  throw 'Streaming speech response did not advertise the Leeway speech style header.'
}

$Receipt = [ordered]@{
  status = 'PASS'
  workspaceRoot = $WorkspaceRoot
  policyPath = $PolicyPath
  policy = $Policy
  routerPolicy = $PolicyStatus.data
  speakResponse = $SpeakResponse
  streamingArtifact = $StreamPath
  streamingHeaders = $HeadersText
  checks = [ordered]@{
    policyParsed = $true
    styleRulesPresent = $true
    naturalTonePresent = $true
    leewayTonePresent = $true
    routerPolicyPresent = $true
    speakEndpointOk = $SpeakResponse.ok
    streamHeaderOk = $true
    streamArtifactOk = (Test-Path -LiteralPath $StreamPath)
  }
}

$ReceiptPath = Join-Path $ReceiptDir "agent-lee-speech-style-$((Get-Date).ToString('yyyyMMdd-HHmmss')).json"
$Receipt | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $ReceiptPath -Encoding UTF8

Write-Host "`n=== Agent Lee Speech Style Proof ===" -ForegroundColor Magenta
Write-Host "Receipt: $ReceiptPath" -ForegroundColor DarkGray
Write-Host ($Receipt | ConvertTo-Json -Depth 6)
Write-Host 'Agent Lee speech style proof passed.' -ForegroundColor Green
exit 0
