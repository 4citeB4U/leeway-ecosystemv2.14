<#
LEEWAY_HEADER - DO NOT REMOVE

REGION: CORE
TAG: CORE.RUNTIME.EXTENSION.VOICE_LIVE_VALIDATION
PURPOSE: Aligns LeeWay Voice route truth, transcript bridge truth, fallback labeling, and human-audible proof into one owner-facing runtime verdict.
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
#>

param(
  [string]$ExtensionDir = (Join-Path $PSScriptRoot ".."),
  [string]$EvidencePath
)

$ErrorActionPreference = "Stop"

function Read-JsonFile {
  param([string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) { return $null }
  try { return Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json } catch { return $null }
}

$resolvedExtensionDir = (Resolve-Path $ExtensionDir).Path
$evidenceDir = Join-Path $resolvedExtensionDir "test-evidence"
$resultPath = if ($EvidencePath) { $EvidencePath } else { Join-Path $evidenceDir "leeway-voice-live-validation-result.json" }

$voiceRoute = Read-JsonFile -Path (Join-Path $evidenceDir "runtime-truth-live-voice-route-result.json")
$bridgeCheck = Read-JsonFile -Path (Join-Path $evidenceDir "leeway-voice-bridge-check-result.json")
$audibleProof = Read-JsonFile -Path (Join-Path $evidenceDir "runtime-truth-live-voice-audible-output-result.json")
$localBridge = Read-JsonFile -Path (Join-Path $evidenceDir "local-transcript-bridge-result.json")

$routePolicyPass = [bool]$voiceRoute.passed
$bridgePass = [string]$bridgeCheck.finalVerdict -eq "PASS" -and [bool]$localBridge.ok
$humanAudibleMissing = [string]$audibleProof.limitation -match 'does not confirm that a human heard'

$finalVerdict = if ($routePolicyPass -and $bridgePass -and -not $humanAudibleMissing) {
  "PASS"
} elseif ($routePolicyPass -and $bridgePass) {
  "PARTIAL"
} else {
  "FAIL"
}

$result = [pscustomobject]@{
  gate = "LEEWAY_VOICE_LIVE_VALIDATION"
  generatedAt = (Get-Date).ToString("o")
  routePolicyTruth = if ($routePolicyPass) { "PASS" } else { "FAIL" }
  transcriptBridgeTruth = if ($bridgePass) { "PASS" } else { "FAIL" }
  humanAudibleTruth = if ($humanAudibleMissing) { "PARTIAL" } else { "PASS" }
  voiceAuthorityTruth = if ($routePolicyPass) { "LEEWAY_VOICE_READY" } else { "LEEWAY_VOICE_DEGRADED" }
  humanAudibleProofMissing = $humanAudibleMissing
  finalVerdict = $finalVerdict
  limitation = [string]$audibleProof.limitation
}

New-Item -ItemType Directory -Force -Path (Split-Path -Parent $resultPath) | Out-Null
$result | ConvertTo-Json -Depth 8 | Out-File -LiteralPath $resultPath -Encoding utf8
Write-Host "Voice live validation written to $resultPath" -ForegroundColor Green

if ($finalVerdict -eq "FAIL") { exit 1 }

