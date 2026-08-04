# leeway-receipt-helper.ps1
# Leeway Ecosystem v2.1.4 — Receipt Writing Helper (PowerShell)
#
# Dot-source this file in other scripts:
#   . "$PSScriptRoot\leeway-receipt-helper.ps1"
#   $path = Write-LeeWayReceipt -Action "my-action" -Result @{ ok=$true; ... } -Metadata @{ agentId="agent-lee" }

$Script:LeeWayReceiptRoot = $null

function Get-LeeWayReceiptRoot {
    if ($Script:LeeWayReceiptRoot) { return $Script:LeeWayReceiptRoot }

    # Resolve path: scripts/ is one level below workspace root
    $scriptDir = Split-Path -Parent $MyInvocation.ScriptName
    if (-not $scriptDir -or -not (Test-Path $scriptDir)) {
        $scriptDir = $PSScriptRoot
    }
    $workspaceRoot = Split-Path -Parent $scriptDir
    $receiptRoot = Join-Path $workspaceRoot "Archive\receipts"

    try {
        New-Item -ItemType Directory -Force -Path $receiptRoot | Out-Null
    } catch {}

    $Script:LeeWayReceiptRoot = $receiptRoot
    return $receiptRoot
}

<#
.SYNOPSIS
    Write a standardized Leeway receipt to Archive/receipts/.

.PARAMETER Action
    Short action identifier string (e.g. 'governance-gate', 'smoke-test').

.PARAMETER Result
    Hashtable or PSCustomObject representing the action result. Must have 'ok' key.

.PARAMETER Metadata
    Optional hashtable with additional context (agentId, controlSurface, domain, etc.)

.PARAMETER StartedAt
    ISO timestamp for when the action started. Defaults to current time.

.OUTPUTS
    String path of the written receipt file. $null if write fails.
#>
function Write-LeeWayReceipt {
    param(
        [Parameter(Mandatory=$true)]
        [string]$Action,

        [Parameter(Mandatory=$false)]
        [object]$Result = @{},

        [Parameter(Mandatory=$false)]
        [hashtable]$Metadata = @{},

        [Parameter(Mandatory=$false)]
        [string]$StartedAt = ""
    )

    if (-not $StartedAt) { $StartedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ") }
    $endedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    $timestamp = (Get-Date).ToString("yyyyMMdd-HHmmss")
    $safeAction = $Action -replace '[^a-zA-Z0-9_-]', '-'
    if ($safeAction.Length -gt 80) { $safeAction = $safeAction.Substring(0, 80) }
    $filename = "${timestamp}-${safeAction}.json"

    $resultOk = $null
    if ($Result -is [hashtable]) { $resultOk = $Result['ok'] }
    elseif ($Result.PSObject.Properties['ok']) { $resultOk = $Result.ok }
    $status = if ($resultOk -eq $true) { "SUCCESS" } elseif ($resultOk -eq $false) { "FAIL" } else { "UNKNOWN" }

    $receipt = [ordered]@{
        schema      = "leeway.receipt.v1"
        receiptId   = "${timestamp}-${safeAction}"
        action      = $Action
        status      = $status
        startedAt   = $StartedAt
        endedAt     = $endedAt
        agent       = [ordered]@{
            agentId   = if ($Metadata['agentId']) { $Metadata['agentId'] } else { "agent-lee" }
            agentMode = if ($Metadata['agentMode']) { $Metadata['agentMode'] } else { "code-mode" }
            role      = if ($Metadata['role']) { $Metadata['role'] } else { "operator" }
        }
        controlSurface = if ($Metadata['controlSurface']) { $Metadata['controlSurface'] } else { "direct" }
        result      = $Result
        metadata    = $Metadata
    }

    try {
        $receiptRoot = Get-LeeWayReceiptRoot
        $filePath = Join-Path $receiptRoot $filename
        $receipt | ConvertTo-Json -Depth 20 -Compress:$false | Set-Content -Path $filePath -Encoding UTF8 -NoNewline:$false
        return $filePath
    } catch {
        Write-Error "[leeway-receipt-helper] Failed to write receipt: $($_.Exception.Message)"
        return $null
    }
}

if ($MyInvocation.MyCommand.Module) {
    Export-ModuleMember -Function Write-LeeWayReceipt -ErrorAction SilentlyContinue
}
