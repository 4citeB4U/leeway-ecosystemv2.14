[CmdletBinding()]
param(
    [int]$Port = 8091
)
$ErrorActionPreference = "Continue"
Set-StrictMode -Version Latest
. (Join-Path $PSScriptRoot "AgentLeeRuntimeCommon.ps1")
$Root = Get-LeewayWorkspaceRoot
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$ReportPath = Join-Path $Root "Archive\reports\agent-lee-crown-zone-image-to-3d-print-demo-report.json"
$ReceiptDir = Join-Path $Root "Archive\receipts\leeway-system-completion"
New-Item -ItemType Directory -Force -Path $ReceiptDir | Out-Null
$ReceiptPath = Join-Path $ReceiptDir "agent-lee-crown-zone-image-to-3d-print-demo-$Stamp.json"

# Check if port 8091 has updated routes
try {
    $res = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/status" -TimeoutSec 5
    $hasCamera = $res.routes -contains "GET /camera/status"
} catch {
    $hasCamera = $false
}

if (-not $hasCamera) {
    $report = [ordered]@{
        verdict = "AGENT_LEE_CROWN_ZONE_IMAGE_TO_3D_PRINT_DEMO_BLOCKED_ADMIN_REQUIRED"
        blocker = "Desktop Runtime on port $Port is running the old binary. Elevated service restart required."
    }
    Write-LeewayJson -Path $ReportPath -Object $report | Out-Null
    Write-LeewayJson -Path $ReceiptPath -Object $report | Out-Null
    return $report
}

$report = [ordered]@{
    verdict = "AGENT_LEE_CROWN_ZONE_IMAGE_TO_3D_PRINT_DEMO_BLOCKED_APPROVAL"
    blocker = "Requires active user consent tokens for actual hardware actions."
}
Write-LeewayJson -Path $ReportPath -Object $report | Out-Null
Write-LeewayJson -Path $ReceiptPath -Object $report | Out-Null
return $report
