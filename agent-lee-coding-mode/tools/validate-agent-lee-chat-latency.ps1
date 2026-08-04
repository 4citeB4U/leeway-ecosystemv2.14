# LEEWAY_HEADER - DO NOT REMOVE
#
# ID: LEEWAY_APP::AGENT_LEE::CHAT_LATENCY::VALIDATE_AGENT_LEE_CHAT_LATENCY
# CLASSIFICATION: VALIDATION
# OWNER: LeeWay Local Runtime Stabilization
# PURPOSE: Validate the hot chat, warmup, and cached fabric latency budget.

[CmdletBinding()]
param(
    [string]$BudgetPath = '',
    [string]$Prompt = 'Say only: Agent Lee online.',
    [int]$PlanTargetMs = 1000,
    [int]$ChatTargetMs = 700,
    [int]$WarmupTargetMs = 1000
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$WorkspaceRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$BudgetPath = if ([string]::IsNullOrWhiteSpace($BudgetPath)) {
    Join-Path $WorkspaceRoot 'agent-lee-coding-mode\runtime\agent-lee-latency-budget.json'
} else {
    $BudgetPath
}
$ReceiptDir = Join-Path $WorkspaceRoot 'Archive\receipts'
$Stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$ReceiptPath = Join-Path $ReceiptDir "agent-lee-chat-latency-validate-$Stamp.json"
$TraceScript = Join-Path $PSScriptRoot 'trace-agent-lee-chat-hot-path.ps1'

function Read-JsonFile {
    param([Parameter(Mandatory = $true)][string]$Path)
    if (-not (Test-Path -LiteralPath $Path)) { return $null }
    try {
        return (Get-Content -LiteralPath $Path -Raw) | ConvertFrom-Json
    } catch {
        return $null
    }
}

function Invoke-TraceScript {
    param(
        [Parameter(Mandatory = $true)][string]$ScriptPath,
        [Parameter(Mandatory = $true)][string]$Prompt,
        [int]$PlanTargetMs,
        [int]$ChatTargetMs,
        [int]$WarmupTargetMs
    )

    $raw = & powershell.exe -ExecutionPolicy Bypass -File $ScriptPath `
        -Prompt $Prompt `
        -PlanTargetMs $PlanTargetMs `
        -ChatTargetMs $ChatTargetMs `
        -WarmupTargetMs $WarmupTargetMs 2>&1 | Out-String
    $exitCode = $LASTEXITCODE

    $json = $null
    if ($raw) {
        try { $json = $raw | ConvertFrom-Json } catch {}
    }

    return [ordered]@{
        raw = $raw
        exitCode = $exitCode
        json = $json
    }
}

function Get-ListCount {
    param([object]$Value)
    if ($null -eq $Value) { return 0 }
    if ($Value -is [System.Collections.ICollection]) { return $Value.Count }
    return 1
}

$Budget = Read-JsonFile -Path $BudgetPath
$Trace = Invoke-TraceScript -ScriptPath $TraceScript -Prompt $Prompt -PlanTargetMs $PlanTargetMs -ChatTargetMs $ChatTargetMs -WarmupTargetMs $WarmupTargetMs

$TraceJson = $Trace.json
$TraceOk = $Trace.exitCode -eq 0 -and $null -ne $TraceJson

$BudgetTargets = if ($Budget) { $Budget.targets } else { $null }
$Thresholds = [ordered]@{
    raw8080Ms = if ($BudgetTargets -and $BudgetTargets.PSObject.Properties.Name -contains 'raw8080Ms') { [int]$BudgetTargets.raw8080Ms } else { $ChatTargetMs }
    adapter8787Ms = if ($BudgetTargets -and $BudgetTargets.PSObject.Properties.Name -contains 'adapter8787Ms') { [int]$BudgetTargets.adapter8787Ms } else { $ChatTargetMs }
    planMs = if ($BudgetTargets -and $BudgetTargets.PSObject.Properties.Name -contains 'planMs') { [int]$BudgetTargets.planMs } else { $PlanTargetMs }
    executeMs = if ($BudgetTargets -and $BudgetTargets.PSObject.Properties.Name -contains 'executeMs') { [int]$BudgetTargets.executeMs } else { $PlanTargetMs }
    warmupMs = if ($BudgetTargets -and $BudgetTargets.PSObject.Properties.Name -contains 'warmupMs') { [int]$BudgetTargets.warmupMs } else { $WarmupTargetMs }
    cacheRefreshMs = if ($BudgetTargets -and $BudgetTargets.PSObject.Properties.Name -contains 'cacheRefreshMs') { [int]$BudgetTargets.cacheRefreshMs } else { $WarmupTargetMs }
}

$Metrics = $null
if ($TraceJson -and $TraceJson.PSObject.Properties.Name -contains 'metricsSummary') {
    $Metrics = $TraceJson.metricsSummary
}

$TraceTargetChecks = $null
if ($TraceJson -and ($TraceJson.PSObject.Properties.Name -contains 'targetChecks')) {
    $TraceTargetChecks = $TraceJson.targetChecks
}

$TargetChecks = [ordered]@{
    raw8080UnderTarget = if ($TraceTargetChecks) { [bool]$TraceTargetChecks.raw8080UnderTarget } else { $false }
    adapter8787UnderTarget = if ($TraceTargetChecks) { [bool]$TraceTargetChecks.adapter8787UnderTarget } else { $false }
    planUnderTarget = if ($TraceTargetChecks) { [bool]$TraceTargetChecks.planUnderTarget } else { $false }
    warmupUnderTarget = if ($TraceTargetChecks) { [bool]$TraceTargetChecks.warmupUnderTarget } else { $false }
    warmupBackgroundOnly = if ($TraceTargetChecks) { [bool]$TraceTargetChecks.warmupBackgroundOnly } else { $false }
}

$CachedFabricBlockers = @()
if ($TraceJson -and ($TraceJson.PSObject.Properties.Name -contains 'cachedFabricBlockers')) {
    $CachedFabricBlockers = @($TraceJson.cachedFabricBlockers)
}

$FinalStatus = if ($TraceJson) { [string]$TraceJson.finalStatus } else { 'AGENT_LEE_TURBO_WORKFLOW_PARTIAL' }
$OverallPass = $TraceOk -and $FinalStatus -eq 'AGENT_LEE_TURBO_CHAT_LOCKED'

$Report = [ordered]@{
    schema = 'leeway.agent-lee.chat-latency-validate.v1'
    timestamp = (Get-Date).ToString('o')
    workspaceRoot = $WorkspaceRoot
    budgetPath = $BudgetPath
    budget = $Budget
    exitCode = $Trace.exitCode
    traceReceiptPath = if ($TraceJson -and $TraceJson.PSObject.Properties.Name -contains 'receiptPath') { $TraceJson.receiptPath } else { $null }
    trace = $TraceJson
    thresholds = $Thresholds
    targetChecks = $TargetChecks
    cachedFabricBlockers = $CachedFabricBlockers
    finalStatus = $FinalStatus
    pass = $OverallPass
}

New-Item -ItemType Directory -Force -Path $ReceiptDir | Out-Null
$Report | ConvertTo-Json -Depth 32 | Set-Content -LiteralPath $ReceiptPath -Encoding UTF8
$Report.receiptPath = $ReceiptPath

Write-Output ($Report | ConvertTo-Json -Depth 32)

if (-not $OverallPass) {
    exit 1
}

exit 0
