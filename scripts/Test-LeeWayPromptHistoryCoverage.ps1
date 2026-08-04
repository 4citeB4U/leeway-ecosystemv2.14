[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

. (Join-Path $PSScriptRoot "AgentLeeRuntimeCommon.ps1")

$Root = Get-LeewayWorkspaceRoot
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$ReportsDir = Join-Path $Root "Archive\reports"
$ReceiptsDir = Join-Path $Root "Archive\receipts\leeway-system-completion"
New-LeewayDirectory -Path $ReportsDir | Out-Null
New-LeewayDirectory -Path $ReceiptsDir | Out-Null

$matrixPath = Join-Path $ReportsDir "leeway-ordered-requirement-matrix.json"
if (-not (Test-Path -LiteralPath $matrixPath)) {
  & (Join-Path $PSScriptRoot "Import-LeeWayPromptHistory.ps1")
}
$matrix = Read-LeewayJson -Path $matrixPath -Fallback $null
if (-not $matrix) { throw "Requirement matrix missing or invalid: $matrixPath" }

$searchRoots = @(
  "Archive\reports",
  "Archive\receipts",
  "Archive\proofs",
  "scripts",
  "agent-lee-coding-mode",
  "Leeway Runtime Fabric",
  "agent-lee-voice-kernel",
  "agent-lee-vision-kernel",
  "LeeWay-Standards"
) | ForEach-Object { Join-Path $Root $_ } | Where-Object { Test-Path -LiteralPath $_ }

$requirements = @()
foreach ($req in @($matrix.requirementRecords)) {
  $keywords = @()
  foreach ($token in (($req.exactRequirementText -replace "[^A-Za-z0-9 ]", " ") -split "\s+")) {
    if ($token.Length -ge 5) { $keywords += $token }
  }
  $keywords = @($keywords | Select-Object -First 6)
  $hits = @()
  foreach ($rootPath in $searchRoots) {
    foreach ($kw in $keywords) {
      try {
        $hits += @(Select-String -Path (Join-Path $rootPath "*") -Pattern $kw -SimpleMatch -List -Recurse -ErrorAction SilentlyContinue | Select-Object -First 5 | ForEach-Object { $_.Path })
      } catch {}
    }
  }
  $hits = @($hits | Sort-Object -Unique)
  $status = if ($hits.Count -eq 0) { "MISSING" } else { "DOCUMENT_ONLY" }
  if ($hits -match "Archive\\reports|Archive\\receipts") { $status = "PARTIAL" }
  if ($hits -match "Archive\\proofs") { $status = "STATIC_VALIDATED" }
  $requirements += [ordered]@{
    requirementId = $req.requirementId
    promptIndex = $req.promptIndex
    promptTitle = $req.promptTitle
    exactRequirementText = $req.exactRequirementText
    category = $req.category
    currentEvidenceFound = $hits
    currentClaimedStatus = $req.currentClaimedStatus
    requiredProofLevel = $req.requiredProofLevel
    actualProofLevel = if ($hits.Count -eq 0) { "PROOF_LEVEL_MISSING" } else { "PROOF_LEVEL_0_DOCUMENT" }
    correctedStatus = $status
    blocker = if ($status -eq "MISSING") { "No current evidence found from prompt-history coverage scan." } else { "Evidence found but runtime proof must be checked by proof-first validation." }
    nextAction = if ($status -eq "MISSING") { "Create or locate missing implementation/contract/validator." } else { "Run proof-first validator for this requirement category." }
    commandToValidate = "powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\Invoke-LeeWayPromptHistoryProofFirstValidation.ps1"
  }
}

$groups = [ordered]@{}
foreach ($state in @("PROVEN_READY","DOCUMENT_ONLY","STATIC_VALIDATED","RUNTIME_UNPROVEN","PARTIAL","BLOCKED_APPROVAL","BLOCKED_HARDWARE","BLOCKED_PERMISSION","BLOCKED_RUNTIME","BLOCKED_MODEL","MISSING")) {
  $groups[$state] = @($requirements | Where-Object { $_.correctedStatus -eq $state }).Count
}

$verdict = if ($groups.MISSING -gt 0) {
  "PROMPT_HISTORY_MAJOR_GAPS_FOUND"
} elseif (($groups.DOCUMENT_ONLY + $groups.PARTIAL + $groups.RUNTIME_UNPROVEN) -gt 0) {
  "PROMPT_HISTORY_PARTIALLY_COVERED"
} else {
  "PROMPT_HISTORY_FULLY_COVERED"
}

$report = [ordered]@{
  reportId = "leeway-prompt-history-coverage-$Stamp"
  generatedAt = (Get-Date).ToUniversalTime().ToString("o")
  workspaceRoot = $Root
  promptHistoryPath = $matrix.promptHistoryPath
  totalPrompts = $matrix.totalPromptRecords
  totalRequirements = $requirements.Count
  summary = $groups
  requirements = $requirements
  verdict = $verdict
}

$reportPath = Join-Path $ReportsDir "leeway-prompt-history-coverage-report.json"
$mdPath = Join-Path $ReportsDir "leeway-prompt-history-coverage-report.md"
$boardPath = Join-Path $ReportsDir "leeway-prompt-history-missing-work-board.json"
$boardMdPath = Join-Path $ReportsDir "leeway-prompt-history-missing-work-board.md"
$receiptPath = Join-Path $ReceiptsDir "leeway-prompt-history-coverage-$Stamp.json"
$boardReceiptPath = Join-Path $ReceiptsDir "leeway-prompt-history-missing-work-board-$Stamp.json"
Write-LeewayJson -Path $reportPath -Object $report | Out-Null
Write-LeewayJson -Path $receiptPath -Object $report | Out-Null
Write-LeewayJson -Path $boardPath -Object $report | Out-Null
Write-LeewayJson -Path $boardReceiptPath -Object $report | Out-Null
Set-Content -LiteralPath $mdPath -Encoding UTF8 -Value ("# LeeWay Prompt History Coverage`n`nVerdict: $verdict`nRequirements: $($requirements.Count)`nMissing: $($groups.MISSING)")
Set-Content -LiteralPath $boardMdPath -Encoding UTF8 -Value ("# LeeWay Prompt History Missing Work Board`n`nMissing: $($groups.MISSING)`nDocument only: $($groups.DOCUMENT_ONLY)`nPartial: $($groups.PARTIAL)")

Write-Host "Verdict: $verdict"
Write-Host "Requirements: $($requirements.Count)"
Write-Host "Missing: $($groups.MISSING)"
Write-Host "Report: $reportPath"
Write-Host "Receipt: $receiptPath"
exit $(if ($verdict -eq "PROMPT_HISTORY_FULLY_COVERED") { 0 } else { 1 })

