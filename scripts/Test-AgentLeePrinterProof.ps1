[CmdletBinding()]
param(
  [switch]$ApprovePrint
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

. (Join-Path $PSScriptRoot "AgentLeeRuntimeCommon.ps1")

$Root = Get-LeewayWorkspaceRoot
$ReportsRoot = Join-Path $Root "Archive\reports"
$ReceiptsRoot = Join-Path $Root "Archive\receipts"
$ProofRoot = Join-Path $Root "Archive\proofs\agent-lee-printer-proof"
New-LeewayDirectory -Path $ReportsRoot | Out-Null
New-LeewayDirectory -Path $ReceiptsRoot | Out-Null
New-LeewayDirectory -Path $ProofRoot | Out-Null

$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$StartedAt = (Get-Date).ToUniversalTime().ToString("o")
$ReportPath = Join-Path $ReportsRoot "agent-lee-printer-proof-report.json"
$ReceiptDir = Join-Path $ReceiptsRoot "agent-lee-printer"
New-LeewayDirectory -Path $ReceiptDir | Out-Null
$ReceiptPath = Join-Path $ReceiptDir "agent-lee-printer-proof-$Stamp.json"
$ProofFile = Join-Path $ProofRoot "agent-lee-printer-proof-$Stamp.txt"

$printers = @()
$defaultPrinter = $null
try {
  $printers = @(Get-Printer -ErrorAction SilentlyContinue | Select-Object Name, DriverName, PortName, PrinterStatus, Type, Shared)
  $defaultPrinter = Get-CimInstance Win32_Printer -ErrorAction SilentlyContinue | Where-Object { $_.Default -eq $true } | Select-Object -First 1 Name, DriverName, PortName, PrinterStatus
} catch {}

$approvalMode = if ($ApprovePrint) { "APPROVED_BY_SCRIPT_FLAG" } else { "NO_PRINT_APPROVAL" }
$printAttempted = $false
$printJobSubmitted = $false
$printJobName = "Agent Lee Printer Proof $Stamp"
$blockers = @()
$queueStatus = $null

$proofText = @"
Agent Lee Printer Proof

Timestamp: $StartedAt
Computer: $env:COMPUTERNAME
Default printer: $($defaultPrinter.Name)
Receipt path: $ReceiptPath
VS Code is not required.
"@

Set-Content -LiteralPath $ProofFile -Value $proofText -Encoding UTF8

if ($ApprovePrint) {
  $printAttempted = $true
  try {
    if ($defaultPrinter -and (Get-Command Out-Printer -ErrorAction SilentlyContinue)) {
      Get-Content -LiteralPath $ProofFile | Out-Printer -Name $defaultPrinter.Name
      $printJobSubmitted = $true
      $queueStatus = "Print job submitted to $($defaultPrinter.Name)"
    } else {
      $blockers += "No default printer or Out-Printer command unavailable."
    }
  } catch {
    $blockers += "Print attempt failed: $($_.Exception.Message)"
  }
} else {
  $blockers += "Print approval was not provided, so no physical print was attempted."
}

$verdict = if (-not $printers -or $printers.Count -eq 0) {
  "AGENT_LEE_PRINTER_PROOF_NO_PRINTER"
} elseif ($printJobSubmitted) {
  "AGENT_LEE_PRINTER_PROOF_READY"
} else {
  "AGENT_LEE_PRINTER_PROOF_BLOCKED"
}

$report = [ordered]@{
  startedAt = $StartedAt
  printerList = $printers
  defaultPrinter = $defaultPrinter
  proofFile = $ProofFile
  printAttempted = $printAttempted
  printJobSubmitted = $printJobSubmitted
  printJobName = $printJobName
  printQueueStatus = $queueStatus
  approvalMode = $approvalMode
  blockers = @($blockers | Select-Object -Unique)
  verdict = $verdict
  receiptPath = $ReceiptPath
}

Write-LeewayJson -Path $ReportPath -Object $report | Out-Null
Write-LeewayJson -Path $ReceiptPath -Object $report | Out-Null

Write-Host "Verdict: $verdict" -ForegroundColor Cyan
Write-Host "Proof: $ProofFile" -ForegroundColor Cyan
Write-Host "Receipt: $ReceiptPath" -ForegroundColor Cyan

return $report

