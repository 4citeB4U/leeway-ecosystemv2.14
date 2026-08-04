# LEEWAY_HEADER - DO NOT REMOVE
#
# ID: LEEWAY_APP::AGENT_LEE::THREE_D_AR_PIPELINE::VALIDATE_AGENT_LEE_3D_AR_PIPELINE
# CLASSIFICATION: VALIDATION
# OWNER: LeeWay Local Runtime Stabilization
# PURPOSE: Prove the 3D/AR asset pipeline, browser research proof, chess scene manifest, and validation receipts.

[CmdletBinding()]
param(
  [ValidateSet('Fast', 'Full')]
  [string]$Mode = 'Fast'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Resolve-WorkspaceRoot {
  Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
}

function Read-JsonBody {
  param([Parameter(Mandatory = $true)][string]$Text)
  if ([string]::IsNullOrWhiteSpace($Text)) { return $null }
  try { return $Text | ConvertFrom-Json } catch { return $Text }
}

function Invoke-JsonRequest {
  param(
    [Parameter(Mandatory = $true)][ValidateSet('GET', 'POST')][string]$Method,
    [Parameter(Mandatory = $true)][string]$Url,
    [Parameter()][object]$Body,
    [int]$TimeoutSec = 120
  )

  try {
    if ($Method -eq 'GET') {
      $response = Invoke-WebRequest -Uri $Url -Method Get -UseBasicParsing -TimeoutSec $TimeoutSec -ErrorAction Stop
    } else {
      $payload = if ($null -ne $Body) { $Body | ConvertTo-Json -Depth 24 } else { '{}' }
      $response = Invoke-WebRequest -Uri $Url -Method Post -ContentType 'application/json' -Body $payload -UseBasicParsing -TimeoutSec $TimeoutSec -ErrorAction Stop
    }

    $data = $null
    if ($response.Content) {
      $data = Read-JsonBody -Text $response.Content
    }

    return [ordered]@{
      ok = ($response.StatusCode -ge 200 -and $response.StatusCode -lt 300)
      statusCode = [int]$response.StatusCode
      url = $Url
      data = $data
      error = $null
    }
  } catch {
    $statusCode = 0
    $bodyText = $null
    if ($_.Exception.Response) {
      try {
        $statusCode = [int]$_.Exception.Response.StatusCode
        $stream = $_.Exception.Response.GetResponseStream()
        if ($stream) {
          $reader = New-Object System.IO.StreamReader($stream)
          $bodyText = $reader.ReadToEnd()
          $reader.Close()
        }
      } catch {}
    }

    $data = if ($bodyText) { Read-JsonBody -Text $bodyText } else { $null }

    return [ordered]@{
      ok = $false
      statusCode = $statusCode
      url = $Url
      data = $data
      error = $_.Exception.Message
    }
  }
}

function Ensure-ReceiptDir {
  param([string]$Path)
  New-Item -ItemType Directory -Force -Path $Path | Out-Null
}

$WorkspaceRoot = Resolve-WorkspaceRoot
$ReceiptDir = Join-Path $WorkspaceRoot 'Archive\receipts'
Ensure-ReceiptDir -Path $ReceiptDir

$RouterBase = 'http://127.0.0.1:8080'
$DesktopBase = 'http://127.0.0.1:8091'
$Stamp = Get-Date -Format 'yyyyMMdd-HHmmss'

$DesktopStatus = Invoke-JsonRequest -Method GET -Url "$DesktopBase/runtime/status" -TimeoutSec 30
$BrowserSearch = $null
if ($Mode -eq 'Full') {
  $BrowserSearch = Invoke-JsonRequest -Method POST -Url "$DesktopBase/runtime/web-search" -TimeoutSec 300 -Body @{
    confirm = 'I_AUTHORIZE_AGENT_LEE_DESKTOP_COMMAND'
    query = 'three.js glTF export chess set selectable themes Agent Lee'
  }
}

$3dStatus = Invoke-JsonRequest -Method GET -Url "$RouterBase/agent-lee/3d-ar/status" -TimeoutSec 30
$3dProof = Invoke-JsonRequest -Method POST -Url "$RouterBase/agent-lee/3d-ar/chess-set-proof" -TimeoutSec 300 -Body @{
  query = 'Create a 3D chess set concept with multiple selectable themed piece families.'
}
$3dStatusAfter = Invoke-JsonRequest -Method GET -Url "$RouterBase/agent-lee/3d-ar/status" -TimeoutSec 30

$ProjectRoot = Join-Path $WorkspaceRoot 'agent-lee-coding-mode\runtime\3d-ar\chess-set-proof'
$ManifestPath = Join-Path $ProjectRoot 'project.manifest.json'
$ScenePath = Join-Path $ProjectRoot 'scene.json'
$RulesPath = Join-Path $ProjectRoot 'rules\chess-rules.stub.mjs'
$EvidencePath = Join-Path $ProjectRoot 'evidence\research.json'
$ProofPath = Join-Path $ProjectRoot 'proof.json'

$Checks = [ordered]@{
  desktopStatus = $DesktopStatus.ok -and $DesktopStatus.statusCode -eq 200
  browserSearch = $Mode -eq 'Fast' -or ($BrowserSearch.ok -and $BrowserSearch.statusCode -eq 200)
  threeDStatus = $3dStatus.ok -and $3dStatus.statusCode -eq 200 -and -not [string]::IsNullOrWhiteSpace([string]$3dStatus.data.status)
  threeDProof = $3dProof.ok -and $3dProof.statusCode -eq 200 -and (Test-Path -LiteralPath $ManifestPath) -and (Test-Path -LiteralPath $ScenePath) -and (Test-Path -LiteralPath $RulesPath) -and (Test-Path -LiteralPath $EvidencePath) -and (Test-Path -LiteralPath $ProofPath)
  pipelineStatus = [string]$3dStatusAfter.data.status -in @('AR_3D_PIPELINE_PARTIAL','AR_3D_PIPELINE_READY','AR_3D_PIPELINE_LOCKED')
}

$OverallOk = -not ($Checks.Values -contains $false)
$FinalStatus = if ($OverallOk) { 'AGENT_LEE_ORCHESTRATION_LOCKED' } else { 'AGENT_LEE_ORCHESTRATION_PARTIAL' }

$Receipt = [ordered]@{
  status = $(if ($OverallOk) { 'PASS' } else { 'FAIL' })
  workspaceRoot = $WorkspaceRoot
  routerBase = $RouterBase
  desktopBase = $DesktopBase
  mode = $Mode
  timestamp = (Get-Date).ToString('o')
  desktopStatus = $DesktopStatus
  browserSearch = $BrowserSearch
  threeDStatus = $3dStatus
  threeDProof = $3dProof
  threeDStatusAfter = $3dStatusAfter
  artifactPaths = [ordered]@{
    projectRoot = $ProjectRoot
    manifest = $ManifestPath
    scene = $ScenePath
    rules = $RulesPath
    evidence = $EvidencePath
    proof = $ProofPath
  }
  checks = $Checks
  finalStatus = $FinalStatus
}

$ReceiptPath = Join-Path $ReceiptDir "agent-lee-3d-ar-pipeline-$Stamp.json"
$Receipt | ConvertTo-Json -Depth 18 | Set-Content -LiteralPath $ReceiptPath -Encoding UTF8

Write-Host "`n=== Agent Lee 3D/AR Pipeline Proof ===" -ForegroundColor Magenta
Write-Host "Receipt: $ReceiptPath" -ForegroundColor DarkGray
Write-Host ($Receipt | ConvertTo-Json -Depth 6)

if ($OverallOk) {
  Write-Host 'Agent Lee 3D/AR pipeline proof passed.' -ForegroundColor Green
  exit 0
}

Write-Host 'Agent Lee 3D/AR pipeline proof failed.' -ForegroundColor Red
exit 1
