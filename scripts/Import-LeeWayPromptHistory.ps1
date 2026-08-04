[CmdletBinding()]
param(
  [string]$PromptHistoryPath = ""
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

. (Join-Path $PSScriptRoot "AgentLeeRuntimeCommon.ps1")

$Root = Get-LeewayWorkspaceRoot
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$ReportsDir = Join-Path $Root "Archive\reports"
$ReceiptsDir = Join-Path $Root "Archive\receipts\leeway-system-completion"
New-LeewayDirectory -Path $ReportsDir | Out-Null
New-LeewayDirectory -Path $ReceiptsDir | Out-Null

if ([string]::IsNullOrWhiteSpace($PromptHistoryPath)) {
  if ($env:LEEWAY_PROMPT_HISTORY_PATH) {
    $PromptHistoryPath = $env:LEEWAY_PROMPT_HISTORY_PATH
  } else {
    $default = "C:\Users\Leona\.codex\attachments\d49b0850-8c7f-45cf-9348-6a74eac21198\pasted-text.txt"
    $PromptHistoryPath = $default
  }
}

if (-not (Test-Path -LiteralPath $PromptHistoryPath)) {
  throw "Prompt history file not found: $PromptHistoryPath"
}

$text = Get-Content -Raw -LiteralPath $PromptHistoryPath
$lines = $text -split "\r?\n"
$promptStarts = @()
for ($i = 0; $i -lt $lines.Count; $i++) {
  $line = $lines[$i].Trim()
  if ($line -match "^(RUN|ADD|ADDENDUM|RESUME|READ AND OPERATE|APPROVED:|MISSION:)\b") {
    $promptStarts += $i
  }
}
if ($promptStarts.Count -eq 0) { $promptStarts = @(0) }

$promptRecords = @()
for ($p = 0; $p -lt $promptStarts.Count; $p++) {
  $start = $promptStarts[$p]
  $end = if ($p + 1 -lt $promptStarts.Count) { $promptStarts[$p + 1] - 1 } else { $lines.Count - 1 }
  $segmentLines = @($lines[$start..$end])
  $segmentText = ($segmentLines -join "`n").Trim()
  if ([string]::IsNullOrWhiteSpace($segmentText)) { continue }
  $titleLine = ($segmentLines | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | Select-Object -First 1)
  if (-not $titleLine) { $titleLine = "UNPARSED_PROMPT_RECORD" }
  $requirementLines = @()
  foreach ($line in $segmentLines) {
    $trim = $line.Trim()
    if ($trim -match "^(\*|-|\d+\.)\s+" -or $trim -match "^(Create|Update|Run|Verify|Validate|Inspect|Read|Output|Required|No |Do not|Every |For every |If |Must |Apply )\b") {
      $requirementLines += $trim
    }
  }
  if ($requirementLines.Count -eq 0) {
    $requirementLines = @("UNPARSED_REQUIREMENT_RECORD: " + ($segmentText.Substring(0, [Math]::Min(220, $segmentText.Length))))
  }
  $requirements = @()
  $rIndex = 1
  foreach ($req in $requirementLines) {
    $category = "AM"
    if ($req -match "owner|creator|Leonard|identity") { $category = "A" }
    elseif ($req -match "biometric|face|voice enrollment") { $category = "B" }
    elseif ($req -match "audience|student|crowd") { $category = "C" }
    elseif ($req -match "room presence") { $category = "D" }
    elseif ($req -match "human tracking") { $category = "E" }
    elseif ($req -match "room vision") { $category = "F" }
    elseif ($req -match "audio|mic|listener|hearing") { $category = "G" }
    elseif ($req -match "multilingual") { $category = "H" }
    elseif ($req -match "device") { $category = "I" }
    elseif ($req -match "visual workspace|screen|OCR") { $category = "J" }
    elseif ($req -match "opt-in") { $category = "K" }
    elseif ($req -match "always-on") { $category = "L" }
    elseif ($req -match "teaching") { $category = "M" }
    elseif ($req -match "autonomous|desktop") { $category = "N" }
    elseif ($req -match "persistence") { $category = "O" }
    elseif ($req -match "voice|clone|XTTS") { $category = "P" }
    elseif ($req -match "camera|host camera") { $category = "R" }
    elseif ($req -match "Vision Kernel") { $category = "S" }
    elseif ($req -match "Qwen.*vision|camera-to-qwen") { $category = "T" }
    elseif ($req -match "printer|peripheral") { $category = "W" }
    elseif ($req -match "network") { $category = "X" }
    elseif ($req -match "bluetooth") { $category = "Y" }
    elseif ($req -match "USB") { $category = "Z" }
    elseif ($req -match "router|runtime fabric") { $category = "AE" }
    elseif ($req -match "Qwen|model") { $category = "AF" }
    elseif ($req -match "Discovery") { $category = "AG" }
    elseif ($req -match "hot-swap|lifecycle|enhancement") { $category = "AH" }
    elseif ($req -match "MCP|Codex config") { $category = "AJ" }
    elseif ($req -match "proof|gate|receipt|report") { $category = "AK" }
    $requirements += [ordered]@{
      requirementId = "P{0:D3}-R{1:D3}" -f ($p + 1), $rIndex
      promptIndex = $p + 1
      promptTitle = $titleLine.Trim()
      exactRequirementText = $req
      category = $category
      currentEvidenceFound = @()
      currentClaimedStatus = "UNASSESSED"
      requiredProofLevel = "PROOF_LEVEL_3_RUNTIME_ENDPOINT"
      actualProofLevel = "PROOF_LEVEL_MISSING"
      correctedStatus = "MISSING"
      blocker = "Coverage validation has not run yet."
      nextAction = "Run Test-LeeWayPromptHistoryCoverage.ps1."
      commandToValidate = "powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\Test-LeeWayPromptHistoryCoverage.ps1"
    }
    $rIndex++
  }
  $promptRecords += [ordered]@{
    promptIndex = $p + 1
    promptTitle = $titleLine.Trim()
    promptTextPreview = $segmentText.Substring(0, [Math]::Min(400, $segmentText.Length))
    detectedDateTime = $null
    userInstructionAroundPrompt = $segmentText
    codexResponseAroundPrompt = $null
    claimedFilesChanged = @()
    claimedReportsWritten = @()
    claimedReceiptsWritten = @()
    parseStatus = if ($titleLine -eq "UNPARSED_PROMPT_RECORD") { "UNPARSED_PROMPT_RECORD" } else { "PARSED" }
    requirementRecords = $requirements
  }
}

$allRequirements = @($promptRecords | ForEach-Object { $_.requirementRecords })
$ledger = [ordered]@{
  reportId = "leeway-ordered-prompt-history-ledger-$Stamp"
  generatedAt = (Get-Date).ToUniversalTime().ToString("o")
  workspaceRoot = $Root
  promptHistoryPath = $PromptHistoryPath
  assistantBodyRole = "CODEX_ASSISTANT_BODY"
  assistantObjectId = "LEEWAY-ASSISTANT-0002"
  authorityLevel = "GOVERNED_ASSISTANT_BODY"
  directAuthority = $false
  totalPromptRecords = $promptRecords.Count
  totalUnparsedPromptRecords = @($promptRecords | Where-Object { $_.parseStatus -eq "UNPARSED_PROMPT_RECORD" }).Count
  totalRequirementRecords = $allRequirements.Count
  promptRecords = $promptRecords
  requirementRecords = $allRequirements
  verdict = if ($promptRecords.Count -gt 0) { "PROMPT_HISTORY_IMPORTED" } else { "PROMPT_HISTORY_IMPORT_BLOCKED" }
}

$jsonPath = Join-Path $ReportsDir "leeway-ordered-prompt-history-ledger.json"
$mdPath = Join-Path $ReportsDir "leeway-ordered-prompt-history-ledger.md"
$matrixPath = Join-Path $ReportsDir "leeway-ordered-requirement-matrix.json"
$matrixMdPath = Join-Path $ReportsDir "leeway-ordered-requirement-matrix.md"
$receiptPath = Join-Path $ReceiptsDir "leeway-ordered-prompt-history-import-$Stamp.json"
$matrixReceiptPath = Join-Path $ReceiptsDir "leeway-ordered-requirement-matrix-$Stamp.json"
Write-LeewayJson -Path $jsonPath -Object $ledger | Out-Null
Write-LeewayJson -Path $matrixPath -Object $ledger | Out-Null
Write-LeewayJson -Path $receiptPath -Object $ledger | Out-Null
Write-LeewayJson -Path $matrixReceiptPath -Object $ledger | Out-Null
Set-Content -LiteralPath $mdPath -Encoding UTF8 -Value ("# LeeWay Ordered Prompt History Ledger`n`nPrompts: $($promptRecords.Count)`nRequirements: $($allRequirements.Count)`nSource: $PromptHistoryPath")
Set-Content -LiteralPath $matrixMdPath -Encoding UTF8 -Value ("# LeeWay Ordered Requirement Matrix`n`nRequirements: $($allRequirements.Count)")

Write-Host "Prompt records: $($promptRecords.Count)"
Write-Host "Requirement records: $($allRequirements.Count)"
Write-Host "Ledger: $jsonPath"
Write-Host "Receipt: $receiptPath"
exit 0

