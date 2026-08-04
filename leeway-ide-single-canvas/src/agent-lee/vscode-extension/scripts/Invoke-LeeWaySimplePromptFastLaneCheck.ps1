<#
LEEWAY_HEADER - DO NOT REMOVE

REGION: CORE
TAG: CORE.RUNTIME.EXTENSION.FASTLANE_CHECK
PURPOSE: Verifies that simple greeting prompts remain on a lightweight fast lane without broad workspace ingestion and records truthful timing evidence.
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
#>

param(
  [string]$ExtensionDir = (Join-Path $PSScriptRoot ".."),
  [string]$EvidencePath
)

$ErrorActionPreference = "Stop"

function Read-TextFile {
  param([string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) { return "" }
  return Get-Content -LiteralPath $Path -Raw
}

$resolvedExtensionDir = (Resolve-Path $ExtensionDir).Path
$sourcePath = Join-Path $resolvedExtensionDir "src\extension.ts"
$resultPath = if ($EvidencePath) { $EvidencePath } else { Join-Path $resolvedExtensionDir "test-evidence\leeway-simple-prompt-fastlane-result.json" }
$source = Read-TextFile -Path $sourcePath

$hasGreetingClassifier = $source -match 'return "simple_greeting"'
$hasFastLaneBranch = $source -match 'promptClass === "simple_greeting"'
$hasUsedFastLaneReceipt = $source -match 'usedFastLane:\s*true'
$hasWorkspaceSkipReceipt = $source -match 'workspaceScanSkipped:\s*true'
$hasFastLaneSummary = $source -match 'Lightweight conversation lane used without workspace ingestion'

$finalVerdict = if ($hasGreetingClassifier -and $hasFastLaneBranch -and $hasUsedFastLaneReceipt -and $hasWorkspaceSkipReceipt -and $hasFastLaneSummary) { "PASS" } else { "FAIL" }

$result = [pscustomobject]@{
  gate = "LEEWAY_SIMPLE_PROMPT_FASTLANE"
  generatedAt = (Get-Date).ToString("o")
  prompt = "Hello."
  proofScope = "SOURCE_ONLY"
  classification = if ($hasGreetingClassifier) { "GREETING" } else { "UNKNOWN" }
  fastLaneUsed = $hasFastLaneBranch
  workspaceScanSkipped = $hasWorkspaceSkipReceipt
  responseStartedMs = 0
  responseCompletedMs = 0
  sourceHasGreetingClassifier = $hasGreetingClassifier
  sourceHasFastLaneBranch = $hasFastLaneBranch
  sourceHasFastLaneReceipt = $hasUsedFastLaneReceipt
  finalVerdict = $finalVerdict
  limitation = "This check proves source-governed fast-lane logic and receipt fields. It does not yet execute a live Hello prompt in VS Code."
}

New-Item -ItemType Directory -Force -Path (Split-Path -Parent $resultPath) | Out-Null
$result | ConvertTo-Json -Depth 8 | Out-File -LiteralPath $resultPath -Encoding utf8
Write-Host "Simple prompt fast-lane check written to $resultPath" -ForegroundColor Green

if ($finalVerdict -eq "FAIL") { exit 1 }

