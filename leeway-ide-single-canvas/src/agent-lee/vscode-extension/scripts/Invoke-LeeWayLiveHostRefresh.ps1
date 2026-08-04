<#
LEEWAY_HEADER - DO NOT REMOVE

REGION: CORE
TAG: CORE.RUNTIME.EXTENSION.LIVE_HOST_REFRESH
PURPOSE: Captures before-and-after live-host self-attestation evidence around a clean Agent Lee runtime reload.
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
#>

param(
  [string]$ExtensionDir = (Join-Path $PSScriptRoot ".."),
  [string]$EvidencePath,
  [string]$WorkspaceRoot
)

$ErrorActionPreference = "Stop"

function Read-JsonFile {
  param([string]$Path)
  if (-not $Path -or -not (Test-Path -LiteralPath $Path)) { return $null }
  try { return Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json } catch { return $null }
}

function Get-HashSafe {
  param([string]$Path)
  if (-not $Path -or -not (Test-Path -LiteralPath $Path)) { return "" }
  try { return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash } catch { return "" }
}

function Get-AttestationTimestamp {
  param($Attestation)

  $rawTimestamp = [string]($Attestation.attestedAt)
  if (-not $rawTimestamp) {
    $rawTimestamp = [string]($Attestation.activationTimestamp)
  }
  if (-not $rawTimestamp) {
    $rawTimestamp = [string]($Attestation.attestedTimestamp)
  }

  $parsedTimestamp = [datetimeoffset]::MinValue
  if ($rawTimestamp) {
    [void][datetimeoffset]::TryParse($rawTimestamp, [ref]$parsedTimestamp)
  }

  return [pscustomobject]@{
    raw = $rawTimestamp
    parsed = $parsedTimestamp
  }
}

function Get-LiveHostSelfAttestation {
  param([string[]]$CandidatePaths)

  $resolvedCandidates = New-Object System.Collections.Generic.List[object]

  foreach ($candidate in ($CandidatePaths | Where-Object { $_ } | Sort-Object -Unique)) {
    if (-not (Test-Path -LiteralPath $candidate)) { continue }
    $json = Read-JsonFile -Path $candidate
    if ($null -eq $json) { continue }
    $timestamp = Get-AttestationTimestamp -Attestation $json
    $resolvedCandidates.Add([pscustomobject]@{
      path = $candidate
      data = $json
      timestamp = $timestamp.raw
      parsedTimestamp = $timestamp.parsed
    })
  }

  if ($resolvedCandidates.Count -eq 0) {
    return $null
  }

  return $resolvedCandidates |
    Sort-Object @{ Expression = { $_.parsedTimestamp }; Descending = $true }, @{ Expression = { $_.path } } |
    Select-Object -First 1
}

function Get-RunningCodeProcesses {
  try {
    return @(Get-CimInstance Win32_Process -Filter "Name = 'Code.exe'" -ErrorAction Stop)
  } catch {
    return @()
  }
}

$resolvedExtensionDir = (Resolve-Path $ExtensionDir).Path
$resolvedWorkspaceRoot = if ($WorkspaceRoot) { (Resolve-Path $WorkspaceRoot).Path } else { (Resolve-Path (Join-Path $resolvedExtensionDir "..\..\.." )).Path }
$evidenceDir = Join-Path $resolvedExtensionDir "test-evidence"
$resultPath = if ($EvidencePath) { $EvidencePath } else { Join-Path $evidenceDir "leeway-live-host-refresh-result.json" }
$buildInfoPath = Join-Path $resolvedExtensionDir "build\runtime-build-info.json"
$installedCheckPath = Join-Path $evidenceDir "leeway-installed-extension-check-result.json"
$attestationBaselinePath = Join-Path $evidenceDir "leeway-active-runtime-attestation-result.json"
$codeCli = Join-Path $env:LOCALAPPDATA "Programs\Microsoft VS Code\bin\code.cmd"

$buildInfo = Read-JsonFile -Path $buildInfoPath
$installedCheck = Read-JsonFile -Path $installedCheckPath
$baselineAttestation = Read-JsonFile -Path $attestationBaselinePath
$candidateAttestationPaths = @(
  (Join-Path $env:APPDATA "Code\User\globalStorage\leeway.agent-lee-leeway-coding-system\live-host-attestation-current.json"),
  (Join-Path $env:APPDATA "Code - Insiders\User\globalStorage\leeway.agent-lee-leeway-coding-system\live-host-attestation-current.json"),
  (Join-Path $env:APPDATA "Antigravity\User\globalStorage\leeway.agent-lee-leeway-coding-system\live-host-attestation-current.json"),
  "C:\Users\Leona\.leeway-vscode\sandbox\runtime-host-userdata\User\globalStorage\leeway.agent-lee-leeway-coding-system\live-host-attestation-current.json",
  [string]$baselineAttestation.liveHostSelfAttestationPath
)

$currentAttestation = Get-LiveHostSelfAttestation -CandidatePaths $candidateAttestationPaths
$sourceBuildHash = [string]$buildInfo.extensionEntryHash
$installedBuildHash = [string]$installedCheck.installedRuntimeHash
$previousLiveHostHash = if ($baselineAttestation) { [string]$baselineAttestation.liveExtensionHostBuildHash } else { "" }
$previousLiveHostTimestamp = if ($baselineAttestation) { [string]$baselineAttestation.extensionActivationTimestamp } else { "" }
$refreshedLiveHostHash = if ($currentAttestation) { [string]$currentAttestation.data.buildHash } else { "" }
$refreshedLiveHostTimestamp = if ($currentAttestation) { [string]$currentAttestation.data.attestedAt } else { "" }
$timestampChanged = [bool]($previousLiveHostTimestamp -and $refreshedLiveHostTimestamp -and $previousLiveHostTimestamp -ne $refreshedLiveHostTimestamp)
$buildHashChanged = [bool]($previousLiveHostHash -and $refreshedLiveHostHash -and $previousLiveHostHash -ne $refreshedLiveHostHash)
$buildHashMatchesCurrent = [bool](
  $sourceBuildHash -and
  $installedBuildHash -and
  $refreshedLiveHostHash -and
  $sourceBuildHash -eq $installedBuildHash -and
  $refreshedLiveHostHash -eq $sourceBuildHash
)

$refreshAttempted = $true
$manualReloadRequired = $true
$diagnoseCommandTriggered = $false
$sidebarOpened = $false

$runningCodeProcesses = @(Get-RunningCodeProcesses)
$runningExtensionHosts = @($runningCodeProcesses | Where-Object { $_.CommandLine -like '*--type=utility*' -and $_.CommandLine -like '*node.mojom.NodeService*' })

if ($manualReloadRequired) {
  Write-Host "Manual live-host refresh required." -ForegroundColor Yellow
  Write-Host "1. Close all VS Code windows using Agent Lee." -ForegroundColor Yellow
  Write-Host "2. Confirm no stale Agent Lee extension host remains." -ForegroundColor Yellow
  Write-Host "3. Reopen VS Code on $resolvedWorkspaceRoot." -ForegroundColor Yellow
  Write-Host "4. Run Developer: Reload Window." -ForegroundColor Yellow
  Write-Host "5. Run Agent Lee: Diagnose Runtime." -ForegroundColor Yellow
  Write-Host "6. Open the Agent Lee sidebar." -ForegroundColor Yellow
  Write-Host "7. Re-run this script and Invoke-LeeWayActiveRuntimeAttestation.ps1." -ForegroundColor Yellow
}

if ((-not $runningCodeProcesses) -and (Test-Path -LiteralPath $codeCli)) {
  Start-Process -FilePath $codeCli -ArgumentList @("--reuse-window", $resolvedWorkspaceRoot) | Out-Null
}

$result = [pscustomobject]@{
  timestamp = (Get-Date).ToString("o")
  sourceBuildHash = $sourceBuildHash
  installedBuildHash = $installedBuildHash
  previousLiveHostHash = $previousLiveHostHash
  refreshedLiveHostHash = $refreshedLiveHostHash
  previousLiveHostTimestamp = $previousLiveHostTimestamp
  refreshedLiveHostTimestamp = $refreshedLiveHostTimestamp
  refreshAttempted = $refreshAttempted
  manualReloadRequired = $manualReloadRequired
  diagnoseCommandTriggered = $diagnoseCommandTriggered
  sidebarOpened = $sidebarOpened
  attestationPath = if ($currentAttestation) { [string]$currentAttestation.path } else { "" }
  runningCodeProcessCount = @($runningCodeProcesses).Count
  runningExtensionHostCount = @($runningExtensionHosts).Count
  timestampChanged = $timestampChanged
  buildHashChanged = $buildHashChanged
  buildHashMatchesCurrent = $buildHashMatchesCurrent
  finalVerdict = if (-not $currentAttestation) {
    "FAIL"
  } elseif ($timestampChanged -and $buildHashMatchesCurrent) {
    "PASS"
  } elseif ($buildHashMatchesCurrent) {
    "PARTIAL"
  } else {
    "FAIL"
  }
}

New-Item -ItemType Directory -Force -Path (Split-Path -Parent $resultPath) | Out-Null
$result | ConvertTo-Json -Depth 8 | Out-File -LiteralPath $resultPath -Encoding utf8
Write-Host "Live host refresh evidence written to $resultPath" -ForegroundColor Green

if ($result.finalVerdict -eq "FAIL") { exit 1 }