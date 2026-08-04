[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

. (Join-Path $PSScriptRoot "AgentLeeRuntimeCommon.ps1")

$Root = Get-LeewayWorkspaceRoot
$required = @(
  "LeeWay-Standards/standards/BOOK-80-ABSOLUTE-PROOF-AND-NO-FALSE-COMPLETION-LAW.md",
  "agent-lee-coding-mode/contracts/leeway-proof-first-readiness-contract.md",
  "agent-lee-coding-mode/contracts/leeway-no-pass-without-proof-contract.md",
  "agent-lee-coding-mode/contracts/leeway-absolute-proof-law.md",
  "agent-lee-coding-mode/contracts/leeway-no-false-completion-law.md",
  "agent-lee-coding-mode/contracts/leeway-proof-or-blocker-contract.md"
)
$missing = @($required | Where-Object { -not (Test-Path -LiteralPath (Join-Path $Root $_)) })
$badContent = @()
foreach ($file in $required | Where-Object { Test-Path -LiteralPath (Join-Path $Root $_) }) {
  $text = Get-Content -Raw -LiteralPath (Join-Path $Root $file)
  if ($text -notmatch "PASS" -or $text -notmatch "proof") { $badContent += $file }
}
$verdict = if ($missing.Count -eq 0 -and $badContent.Count -eq 0) { "NO_PASS_WITHOUT_PROOF_LAW_READY" } else { "NO_PASS_WITHOUT_PROOF_LAW_BLOCKED" }
$report = [ordered]@{
  reportId = "leeway-no-pass-without-proof-law"
  generatedAt = (Get-Date).ToUniversalTime().ToString("o")
  workspaceRoot = $Root
  missingFiles = $missing
  badContent = $badContent
  verdict = $verdict
}
Write-LeewayJson -Path (Join-Path $Root "Archive\reports\leeway-no-false-completion-law-report.json") -Object $report | Out-Null
Write-LeewayJson -Path (Join-Path $Root "Archive\receipts\leeway-system-completion\leeway-no-false-completion-law-$(Get-Date -Format 'yyyyMMdd-HHmmss').json") -Object $report | Out-Null
Write-Host "Verdict: $verdict"
exit $(if ($verdict -eq "NO_PASS_WITHOUT_PROOF_LAW_READY") { 0 } else { 1 })

