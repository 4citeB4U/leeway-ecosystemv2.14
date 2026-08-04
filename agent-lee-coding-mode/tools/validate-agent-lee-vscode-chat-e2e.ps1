# LEEWAY_HEADER - DO NOT REMOVE
#
# ID: LEEWAY_APP::AGENT_LEE::VSCODE_CHAT_E2E::VALIDATE_AGENT_LEE_VSCODE_CHAT_E2E
# CLASSIFICATION: VALIDATION
# OWNER: LeeWay Local Runtime Stabilization
# PURPOSE: Prove VS Code Chat entry plus receipt-backed project proofs for the abilities site and 3D chess lane.

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

function Invoke-Script {
  param([Parameter(Mandatory = $true)][string]$Path)
  & powershell.exe -ExecutionPolicy Bypass -File $Path
  return $LASTEXITCODE
}

function Get-LatestReceiptPath {
  param(
    [Parameter(Mandatory = $true)][string]$ReceiptDir,
    [Parameter(Mandatory = $true)][string]$Prefix
  )

  $latest = Get-ChildItem -LiteralPath $ReceiptDir -File |
    Where-Object { $_.Name -like "$Prefix*" } |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

  if ($null -eq $latest) { return $null }
  return $latest.FullName
}

$WorkspaceRoot = Resolve-WorkspaceRoot
$ReceiptDir = Join-Path $WorkspaceRoot 'Archive\receipts'
New-Item -ItemType Directory -Force -Path $ReceiptDir | Out-Null

$Scripts = @(
  [ordered]@{
    Name = 'validate-agent-lee-vscode-chat-research-e2e'
    Path = Join-Path $WorkspaceRoot 'agent-lee-coding-mode\tools\validate-agent-lee-vscode-chat-research-e2e.ps1'
    Prefix = 'agent-lee-vscode-chat-research-e2e-'
  },
  [ordered]@{
    Name = 'validate-agent-lee-speech-style'
    Path = Join-Path $WorkspaceRoot 'agent-lee-coding-mode\tools\validate-agent-lee-speech-style.ps1'
    Prefix = 'agent-lee-speech-style-'
  },
  [ordered]@{
    Name = 'validate-agent-lee-agent-site-proof'
    Path = Join-Path $WorkspaceRoot 'agent-lee-coding-mode\tools\validate-agent-lee-agent-site-proof.ps1'
    Prefix = 'agent-lee-agent-site-proof-'
  },
  [ordered]@{
    Name = 'validate-agent-lee-3d-chess-proof'
    Path = Join-Path $WorkspaceRoot 'agent-lee-coding-mode\tools\validate-agent-lee-3d-chess-proof.ps1'
    Prefix = 'agent-lee-3d-chess-proof-'
  }
)

$Results = @()
$AllOk = $true

Write-Host "`n=== Agent Lee VS Code Chat E2E ===" -ForegroundColor Magenta
Write-Host "Workspace root: $WorkspaceRoot" -ForegroundColor DarkGray

foreach ($script in $Scripts) {
  if (-not (Test-Path -LiteralPath $script.Path)) {
    Write-Host "  [FAIL] Missing $($script.Name): $($script.Path)" -ForegroundColor Red
    $Results += [ordered]@{
      name = $script.Name
      path = $script.Path
      status = 'MISSING'
      exitCode = 1
      receiptPath = $null
    }
    $AllOk = $false
    continue
  }

  Write-Host "  Running $($script.Name)" -ForegroundColor Cyan
  $exitCode = Invoke-Script -Path $script.Path
  $receiptPath = Get-LatestReceiptPath -ReceiptDir $ReceiptDir -Prefix $script.Prefix
  $passed = ($exitCode -eq 0) -and (-not [string]::IsNullOrWhiteSpace($receiptPath))

  if ($passed) {
    Write-Host "  [OK] $($script.Name) passed" -ForegroundColor Green
  } else {
    Write-Host "  [FAIL] $($script.Name) failed with exit code $exitCode" -ForegroundColor Red
    $AllOk = $false
  }

  $Results += [ordered]@{
    name = $script.Name
    path = $script.Path
    status = $(if ($passed) { 'PASS' } else { 'FAIL' })
    exitCode = $exitCode
    receiptPath = $receiptPath
  }
}

$ResearchReceiptPath = ($Results | Where-Object { $_.name -eq 'validate-agent-lee-vscode-chat-research-e2e' } | Select-Object -First 1).receiptPath
$SpeechReceiptPath = ($Results | Where-Object { $_.name -eq 'validate-agent-lee-speech-style' } | Select-Object -First 1).receiptPath
$SiteReceiptPath = ($Results | Where-Object { $_.name -eq 'validate-agent-lee-agent-site-proof' } | Select-Object -First 1).receiptPath
$ChessReceiptPath = ($Results | Where-Object { $_.name -eq 'validate-agent-lee-3d-chess-proof' } | Select-Object -First 1).receiptPath

$ResearchReceipt = Read-JsonFile -Path $ResearchReceiptPath
$SpeechReceipt = Read-JsonFile -Path $SpeechReceiptPath
$SiteReceipt = Read-JsonFile -Path $SiteReceiptPath
$ChessReceipt = Read-JsonFile -Path $ChessReceiptPath

if (-not $ResearchReceipt -or $ResearchReceipt.entrySurface -ne 'vscode-chat') {
  Write-Host '  [FAIL] Research receipt is missing vscode-chat entrySurface.' -ForegroundColor Red
  $AllOk = $false
}

if (-not $ResearchReceipt -or [string]::IsNullOrWhiteSpace([string]$ResearchReceipt.adapterEndpoint) -or $ResearchReceipt.adapterEndpoint -ne 'http://127.0.0.1:8787/v1/chat/completions') {
  Write-Host '  [FAIL] Research receipt is missing the VS Code Chat adapter endpoint.' -ForegroundColor Red
  $AllOk = $false
}

if (-not $ResearchReceipt -or ($ResearchReceipt.candidateEvidenceCount -lt 1 -or $ResearchReceipt.curatedEvidenceCount -lt 1 -or $ResearchReceipt.rejectedEvidenceCount -lt 1 -or $ResearchReceipt.claimCheckCount -lt 1)) {
  Write-Host '  [FAIL] Research receipt does not show the full candidate/curated/rejected/claim-check chain.' -ForegroundColor Red
  $AllOk = $false
}

if (-not $SiteReceipt -or [string]::IsNullOrWhiteSpace([string]$SiteReceipt.researchLedgerPath) -or -not (Test-Path -LiteralPath $SiteReceipt.researchLedgerPath)) {
  Write-Host '  [FAIL] Agent site proof did not produce a usable research ledger path.' -ForegroundColor Red
  $AllOk = $false
}

if (-not $ChessReceipt -or [string]::IsNullOrWhiteSpace([string]$ChessReceipt.researchLedgerPath) -or -not (Test-Path -LiteralPath $ChessReceipt.researchLedgerPath)) {
  Write-Host '  [FAIL] 3D chess proof did not produce a usable research ledger path.' -ForegroundColor Red
  $AllOk = $false
}

if (-not $SpeechReceipt -or -not $SpeechReceipt.checks.streamHeaderOk) {
  Write-Host '  [FAIL] Speech style proof did not confirm the live speech header.' -ForegroundColor Red
  $AllOk = $false
}

$Report = [ordered]@{
  status = $(if ($AllOk) { 'PASS' } else { 'FAIL' })
  workspaceRoot = $WorkspaceRoot
  scripts = $Results
  receipts = [ordered]@{
    research = $ResearchReceiptPath
    speech = $SpeechReceiptPath
    site = $SiteReceiptPath
    chess = $ChessReceiptPath
  }
  proof = [ordered]@{
    research = $ResearchReceipt
    speech = $SpeechReceipt
    site = $SiteReceipt
    chess = $ChessReceipt
  }
  checks = [ordered]@{
    researchEntrySurface = $ResearchReceipt.entrySurface
    researchAdapterEndpoint = $ResearchReceipt.adapterEndpoint
    researchCandidateEvidence = $ResearchReceipt.candidateEvidenceCount
    researchCuratedEvidence = $ResearchReceipt.curatedEvidenceCount
    researchRejectedEvidence = $ResearchReceipt.rejectedEvidenceCount
    researchClaimChecks = $ResearchReceipt.claimCheckCount
    siteLedger = $SiteReceipt.researchLedgerPath
    chessLedger = $ChessReceipt.researchLedgerPath
    speechHeader = $SpeechReceipt.checks.streamHeaderOk
  }
}

$ReceiptPath = Join-Path $ReceiptDir "agent-lee-vscode-chat-e2e-$((Get-Date).ToString('yyyyMMdd-HHmmss')).json"
$Report | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $ReceiptPath -Encoding UTF8

Write-Host "Receipt: $ReceiptPath" -ForegroundColor DarkGray
Write-Host ($Report | ConvertTo-Json -Depth 6)

if ($AllOk) {
  Write-Host 'Agent Lee VS Code Chat E2E passed.' -ForegroundColor Green
  exit 0
}

Write-Host 'Agent Lee VS Code Chat E2E failed.' -ForegroundColor Red
exit 1
