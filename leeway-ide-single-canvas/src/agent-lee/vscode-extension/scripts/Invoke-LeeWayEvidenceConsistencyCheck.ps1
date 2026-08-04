<#
LEEWAY_HEADER - DO NOT REMOVE

REGION: CORE
TAG: CORE.RUNTIME.EXTENSION.EVIDENCE_CONSISTENCY
PURPOSE: Detects contradictions across source, package, installed, live-runtime, voice, identity, and receipt evidence for the Agent Lee extension.
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

function Read-TextFile {
  param([string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) { return "" }
  return Get-Content -LiteralPath $Path -Raw
}

$resolvedExtensionDir = (Resolve-Path $ExtensionDir).Path
$workspaceRoot = Split-Path -Parent (Split-Path -Parent $resolvedExtensionDir)
$evidenceDir = Join-Path $resolvedExtensionDir "test-evidence"
$receiptsDir = Join-Path $workspaceRoot "agent-lee\receipts"
$resultPath = if ($EvidencePath) { $EvidencePath } else { Join-Path $evidenceDir "leeway-evidence-consistency-result.json" }

$brandingReportPath = Join-Path $receiptsDir "leeway_extension_branding_asset_report.md"
$brandingReportText = Read-TextFile -Path $brandingReportPath
$liveVisual = Read-JsonFile -Path (Join-Path $evidenceDir "leeway-extension-live-visual-validation-result.json")
$installedCheck = Read-JsonFile -Path (Join-Path $evidenceDir "leeway-installed-extension-check-result.json")
$voiceRoute = Read-JsonFile -Path (Join-Path $evidenceDir "runtime-truth-live-voice-route-result.json")
$voiceAudible = Read-JsonFile -Path (Join-Path $evidenceDir "runtime-truth-live-voice-audible-output-result.json")
$identityGraph = Read-JsonFile -Path (Join-Path $evidenceDir "leeway-application-identity-graph-result.json")
$assetCheck = Read-JsonFile -Path (Join-Path $evidenceDir "leeway-extension-asset-check-result.json")
$readmeProof = Read-JsonFile -Path (Join-Path $evidenceDir "leeway-readme-live-proof-result.json")

$contradictions = New-Object System.Collections.Generic.List[object]

if ($brandingReportText -match 'Live visual runtime status:\s*`PASS`' -and [string]$liveVisual.finalVerdict -eq "FAIL") {
  $contradictions.Add([pscustomobject]@{
    id = "CONTRADICTION::BRANDING_PASS_VS_LIVE_FAIL"
    severity = "high"
    proofScope = @("LIVE_RUNTIME", "RECEIPT")
    detail = "Branding receipt claims PASS while latest live visual evidence reports FAIL."
  })
}

if ([bool]$installedCheck.staleDetected -eq $false -and [bool]$liveVisual.staleRuntimeDetected -eq $true) {
  $contradictions.Add([pscustomobject]@{
    id = "CONTRADICTION::INSTALLED_CURRENT_VS_LIVE_STALE"
    severity = "high"
    proofScope = @("INSTALLED_ONLY", "LIVE_RUNTIME")
    detail = "Installed-directory evidence says current while live host evidence still reports stale runtime."
  })
}

if ([bool]$identityGraph.passed -eq $false -and $brandingReportText -match 'This `PASS` is based on actual installed-extension UI proof') {
  $contradictions.Add([pscustomobject]@{
    id = "CONTRADICTION::FULL_PASS_LANGUAGE_VS_IDENTITY_FAIL"
    severity = "high"
    proofScope = @("RECEIPT", "SOURCE_ONLY")
    detail = "Owner-facing PASS language survived while the identity graph gate still failed."
  })
}

if (
  $assetCheck -and
  $installedCheck -and
  [string]$assetCheck.extensionLogoPath -and
  [string]$installedCheck.packageIconPath -and
  [string]$assetCheck.extensionLogoPath -ne [string]$installedCheck.packageIconPath
) {
  $contradictions.Add([pscustomobject]@{
    id = "CONTRADICTION::PACKAGE_ICON_VS_ACTIVITYBAR_ICON_CONFLATED"
    severity = "medium"
    proofScope = @("SOURCE_ONLY", "INSTALLED_ONLY")
    detail = "Evidence vocabulary conflates the Activity Bar icon with the package icon."
  })
}

$proofLabels = [pscustomobject]@{
  sourceOnly = "SOURCE_ONLY"
  packageOnly = "PACKAGE_ONLY"
  installedOnly = "INSTALLED_ONLY"
  liveRuntime = "LIVE_RUNTIME"
  humanAudible = "HUMAN_AUDIBLE"
}

$status = if ($contradictions.Count -eq 0) { "PASS" } else { "FAIL" }
$contradictionItems = @($contradictions.ToArray())
$rules = @(
  "Latest live runtime evidence wins over older source/package claims.",
  "Source-only proof must be labeled SOURCE_ONLY.",
  "Package-only proof must be labeled PACKAGE_ONLY.",
  "Installed-directory proof must be labeled INSTALLED_ONLY.",
  "Live UI proof must be labeled LIVE_RUNTIME.",
  "Actual heard-audio proof must be labeled HUMAN_AUDIBLE.",
  "No PASS receipt may survive newer live FAIL evidence."
)

$result = [pscustomobject]@{
  gate = "LEEWAY_EVIDENCE_CONSISTENCY"
  generatedAt = (Get-Date).ToString("o")
  status = $status
  contradictions = $contradictionItems
  rules = $rules
  proofLabels = $proofLabels
}

New-Item -ItemType Directory -Force -Path (Split-Path -Parent $resultPath) | Out-Null
$result | ConvertTo-Json -Depth 8 | Out-File -LiteralPath $resultPath -Encoding utf8
Write-Host "Evidence consistency result written to $resultPath" -ForegroundColor Green

if ($status -eq "FAIL") { exit 1 }
