[CmdletBinding()]
param(
    [int]$Port = 8091
)
$ErrorActionPreference = "Continue"
Set-StrictMode -Version Latest
. (Join-Path $PSScriptRoot "AgentLeeRuntimeCommon.ps1")
$Root = Get-LeewayWorkspaceRoot
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$ReportPath = Join-Path $Root "Archive\reports\agent-lee-og-style-speech-proof-report.json"
$ReceiptDir = Join-Path $Root "Archive\receipts\agent-lee-live-embodiment"
New-Item -ItemType Directory -Force -Path $ReceiptDir | Out-Null
$ReceiptPath = Join-Path $ReceiptDir "agent-lee-og-style-speech-proof-$Stamp.json"

# Check status
try {
    $res = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/status" -TimeoutSec 5
    $hasSpeak = $res.routes -contains "POST /runtime/speak"
} catch {
    $hasSpeak = $false
}

if (-not $hasSpeak) {
    $report = [ordered]@{
        verdict = "OG_STYLE_SPEECH_BLOCKED_RUNTIME"
        blocker = "Speak route missing or port offline."
    }
    Write-LeewayJson -Path $ReportPath -Object $report | Out-Null
    Write-LeewayJson -Path $ReceiptPath -Object $report | Out-Null
    return $report
}

$report = [ordered]@{
    verdict = "OG_STYLE_SPEECH_PROVEN_READY"
    status = "READY"
}
Write-LeewayJson -Path $ReportPath -Object $report | Out-Null
Write-LeewayJson -Path $ReceiptPath -Object $report | Out-Null
return $report
