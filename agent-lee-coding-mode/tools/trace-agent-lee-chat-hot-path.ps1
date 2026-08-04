# LEEWAY_HEADER - DO NOT REMOVE
#
# ID: LEEWAY_APP::AGENT_LEE::CHAT_LATENCY::TRACE_AGENT_LEE_CHAT_HOT_PATH
# CLASSIFICATION: TRACE
# OWNER: LeeWay Local Runtime Stabilization
# PURPOSE: Trace the hot chat, warmup, plan, and receipt flow without touching destructive actions.

[CmdletBinding()]
param(
    [int]$PlanTargetMs = 1000,
    [int]$ChatTargetMs = 700,
    [int]$WarmupTargetMs = 1000,
    [string]$Prompt = 'Say only: Agent Lee online.',
    [string]$WarmupReason = 'trace-agent-lee-chat-hot-path'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$WorkspaceRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$ReceiptDir = Join-Path $WorkspaceRoot 'Archive\receipts'
$Stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$ReceiptPath = Join-Path $ReceiptDir "agent-lee-chat-latency-trace-$Stamp.json"

function Invoke-JsonRequest {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][string]$Uri,
        [Parameter(Mandatory = $true)][ValidateSet('GET','POST')][string]$Method,
        [object]$Body = $null,
        [int]$TimeoutSec = 30
    )

    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    try {
        $invokeArgs = @{
            Uri = $Uri
            Method = $Method
            TimeoutSec = $TimeoutSec
            UseBasicParsing = $true
            ErrorAction = 'Stop'
        }
        if ($null -ne $Body) {
            $invokeArgs.ContentType = 'application/json'
            $invokeArgs.Body = ($Body | ConvertTo-Json -Depth 32)
        }

        $response = Invoke-WebRequest @invokeArgs
        $sw.Stop()

        $json = $null
        if ($response.Content) {
            try { $json = $response.Content | ConvertFrom-Json } catch { $json = $response.Content }
        }

        return [ordered]@{
            name = $Name
            uri = $Uri
            method = $Method
            ok = $true
            statusCode = [int]$response.StatusCode
            requestMs = [int]$sw.ElapsedMilliseconds
            body = $json
            raw = $response.Content
            error = $null
        }
    } catch {
        $sw.Stop()
        $statusCode = 0
        try { $statusCode = [int]$_.Exception.Response.StatusCode.value__ } catch {}
        return [ordered]@{
            name = $Name
            uri = $Uri
            method = $Method
            ok = $false
            statusCode = $statusCode
            requestMs = [int]$sw.ElapsedMilliseconds
            body = $null
            raw = $null
            error = $_.Exception.Message
        }
    }
}

function Get-StatusText {
    param([object]$Probe)
    if ($null -eq $Probe) { return 'unknown' }
    if ($Probe.ok -and $Probe.statusCode -eq 200) { return 'online' }
    return 'offline'
}

function Resolve-MetricMs {
    param(
        [object]$Body,
        [string]$Key,
        [object]$FallbackMs
    )

    if ($null -ne $Body -and $Body.PSObject.Properties.Name -contains $Key) {
        $value = $Body.$Key
        if ($null -ne $value) {
            try { return [int]$value } catch {}
        }
    }
    return $FallbackMs
}

function Get-ObjectPropertyValue {
    param(
        [object]$Object,
        [string]$Name,
        $Fallback = $null
    )

    if ($null -eq $Object) {
        return $Fallback
    }

    if ($Object.PSObject.Properties.Name -contains $Name) {
        return $Object.$Name
    }

    return $Fallback
}

function Select-First {
    param([object[]]$Values)
    foreach ($value in $Values) {
        if ($null -ne $value -and $value -ne '') { return $value }
    }
    return $null
}

function Classify-Bottleneck {
    param(
        [int]$Raw8080Ms,
        [int]$Adapter8787Ms,
        [int]$PlanMs,
        [int]$WarmupMs
    )

    if ($Raw8080Ms -gt $ChatTargetMs -and $Adapter8787Ms -le $ChatTargetMs) {
        return 'router-bottleneck'
    }
    if ($Adapter8787Ms -gt $ChatTargetMs -and $Raw8080Ms -le $ChatTargetMs) {
        return 'adapter-bottleneck'
    }
    if ($Adapter8787Ms -gt $ChatTargetMs -and $Raw8080Ms -gt $ChatTargetMs) {
        return 'shared-upstream-bottleneck'
    }
    if ($PlanMs -gt $PlanTargetMs) {
        return 'plan-path-bottleneck'
    }
    if ($WarmupMs -gt $WarmupTargetMs) {
        return 'warmup-path-bottleneck'
    }
    return 'healthy-hot-path'
}

function Build-PlanBody {
    return @{
        input = 'no-op receipt only'
        goal = 'no-op receipt only'
    }
}

function Build-ExecuteBody {
    param([object]$Plan)
    return @{
        approved = $true
        plan = $Plan
    }
}

$Warmup = Invoke-JsonRequest -Name 'warmup' -Uri 'http://127.0.0.1:8787/warmup' -Method POST -TimeoutSec 20 -Body @{
    reason = $WarmupReason
}

Start-Sleep -Milliseconds 350

$Cache = Invoke-JsonRequest -Name 'fabric-cache' -Uri 'http://127.0.0.1:8787/fabric/cache' -Method GET -TimeoutSec 20
$CacheBody = $Cache.body
$settleWaitMs = 0
while ($Cache.ok -and $CacheBody -and ($CacheBody.PSObject.Properties.Name -contains 'backgroundWarmer') -and $CacheBody.backgroundWarmer -and $CacheBody.backgroundWarmer.active -and $settleWaitMs -lt 10000) {
    Start-Sleep -Milliseconds 250
    $settleWaitMs += 250
    $Cache = Invoke-JsonRequest -Name 'fabric-cache' -Uri 'http://127.0.0.1:8787/fabric/cache' -Method GET -TimeoutSec 20
    $CacheBody = $Cache.body
}

$Plan = Invoke-JsonRequest -Name 'aa-plan' -Uri 'http://127.0.0.1:8787/aa/plan' -Method POST -TimeoutSec 30 -Body (Build-PlanBody)

$Execute = $null
if ($Plan.ok -and $Plan.body -and ($Plan.body.PSObject.Properties.Name -contains 'planId' -or $Plan.body.ok -eq $true)) {
    $Execute = Invoke-JsonRequest -Name 'aa-execute' -Uri 'http://127.0.0.1:8787/aa/execute' -Method POST -TimeoutSec 60 -Body (Build-ExecuteBody -Plan $Plan.body)
}

$RouterChat = Invoke-JsonRequest -Name 'router-chat' -Uri 'http://127.0.0.1:8080/v1/chat/completions' -Method POST -TimeoutSec 45 -Body @{
    model = 'agent-lee-code-mode'
    messages = @(
        @{
            role = 'user'
            content = $Prompt
        }
    )
    temperature = 0
    max_tokens = 16
    stream = $false
    trace = $true
}

$AdapterChat = Invoke-JsonRequest -Name 'adapter-chat' -Uri 'http://127.0.0.1:8787/v1/chat/completions' -Method POST -TimeoutSec 45 -Body @{
    model = 'agent-lee-code-mode'
    messages = @(
        @{
            role = 'user'
            content = $Prompt
        }
    )
    temperature = 0
    max_tokens = 16
    stream = $false
    trace = $true
}

$Metrics = Invoke-JsonRequest -Name 'metrics' -Uri 'http://127.0.0.1:8787/metrics' -Method GET -TimeoutSec 20

$CacheBody = $Cache.body
$Fabric = $null
$FabricSummary = $null
if ($CacheBody) {
    $Fabric = Get-ObjectPropertyValue -Object $CacheBody -Name 'fabric'
    if ($null -eq $Fabric) {
        $CacheSection = Get-ObjectPropertyValue -Object $CacheBody -Name 'cache'
        if ($CacheSection) {
            $FabricSummary = Get-ObjectPropertyValue -Object $CacheSection -Name 'fabricSummary'
            $Fabric = Get-ObjectPropertyValue -Object $CacheSection -Name 'fabric'
        }
    }
    if ($null -eq $Fabric) {
        $FullSection = Get-ObjectPropertyValue -Object $CacheBody -Name 'full'
        if ($FullSection) {
            $Fabric = Get-ObjectPropertyValue -Object $FullSection -Name 'fabric'
        }
    }
}

$CerebralProbe = $null
$DesktopProbe = $null
if ($Fabric) {
    try { $CerebralProbe = $Fabric.cerebral } catch {}
    try { $DesktopProbe = $Fabric.desktopRuntime } catch {}
}

$CerebralOnline = Get-StatusText -Probe $CerebralProbe
$DesktopOnline = Get-StatusText -Probe $DesktopProbe
if ($FabricSummary) {
    if ($CerebralOnline -eq 'unknown') {
        $CerebralSummary = Get-ObjectPropertyValue -Object $FabricSummary -Name 'cerebral'
        $CerebralOnline = if ([bool](Get-ObjectPropertyValue -Object $CerebralSummary -Name 'ok' -Fallback $false)) { 'online' } else { 'offline' }
    }
    if ($DesktopOnline -eq 'unknown') {
        $DesktopSummary = Get-ObjectPropertyValue -Object $FabricSummary -Name 'desktopRuntime'
        $DesktopOnline = if ([bool](Get-ObjectPropertyValue -Object $DesktopSummary -Name 'ok' -Fallback $false)) { 'online' } else { 'offline' }
    }
}

$WarmupAccepted = $Warmup.ok -and $Warmup.statusCode -eq 200
$WarmupBackgroundOnly = $false
if ($CacheBody -and ($CacheBody.PSObject.Properties.Name -contains 'backgroundWarmer') -and $CacheBody.backgroundWarmer) {
    $WarmupBackgroundOnly = (-not [bool]$CacheBody.backgroundWarmer.active)
}

$PlanMs = Resolve-MetricMs -Body $Plan.body -Key 'planMs' -FallbackMs $Plan.requestMs
if ($Metrics.ok -and $Metrics.body) {
    $PlanMs = Select-First @(
        (Resolve-MetricMs -Body $Metrics.body -Key 'lastPlanMs' -FallbackMs $PlanMs),
        $PlanMs
    )
}

$ExecuteMs = $null
if ($Execute) {
    $ExecuteMs = Resolve-MetricMs -Body $Execute.body -Key 'executeMs' -FallbackMs $Execute.requestMs
    if ($Metrics.ok -and $Metrics.body) {
        $ExecuteMs = Select-First @(
            (Resolve-MetricMs -Body $Metrics.body -Key 'lastExecuteMs' -FallbackMs $ExecuteMs),
            $ExecuteMs
        )
    }
}

$RouterRouterBody = Get-ObjectPropertyValue -Object $RouterChat.body -Name 'agentLeeRouter'
$RouterTraceBody = Get-ObjectPropertyValue -Object $RouterChat.body -Name 'agentLeeTrace'
$AdapterTurboBody = Get-ObjectPropertyValue -Object $AdapterChat.body -Name 'agentLeeTurbo'
$RouterTotalMs = Resolve-MetricMs -Body $RouterRouterBody -Key 'totalMs' -FallbackMs $RouterChat.requestMs
$RouterFirstByteMs = Resolve-MetricMs -Body $RouterRouterBody -Key 'firstByteMs' -FallbackMs $RouterChat.requestMs
$AdapterTotalMs = Resolve-MetricMs -Body $AdapterTurboBody -Key 'totalMs' -FallbackMs $AdapterChat.requestMs
$AdapterFirstByteMs = Resolve-MetricMs -Body $AdapterTurboBody -Key 'firstByteMs' -FallbackMs $AdapterChat.requestMs
$AdapterDownstreamMs = Resolve-MetricMs -Body $AdapterTurboBody -Key 'raw8080Ms' -FallbackMs $AdapterChat.requestMs
$CacheRefreshMs = $null
if ($Metrics.ok -and $Metrics.body) {
    $CacheRefreshMs = Select-First @(
        (Resolve-MetricMs -Body $Metrics.body -Key 'cacheRefreshMs' -FallbackMs $null),
        $null
    )
}

$CacheAgeMs = $null
if ($Metrics.ok -and $Metrics.body) {
    $CacheAgeMs = Select-First @(
        (Resolve-MetricMs -Body $Metrics.body -Key 'cacheAgeMs' -FallbackMs $null),
        $null
    )
}

$TargetChecks = [ordered]@{
    raw8080UnderTarget = $RouterTotalMs -le $ChatTargetMs
    adapter8787UnderTarget = $AdapterTotalMs -le $ChatTargetMs
    planUnderTarget = $PlanMs -le $PlanTargetMs
    warmupUnderTarget = ($Warmup.requestMs -le $WarmupTargetMs)
    warmupBackgroundOnly = $WarmupBackgroundOnly
}

$Blockers = @()
foreach ($entry in @(
    [ordered]@{ name = 'cerebral'; probe = $CerebralProbe; online = $CerebralOnline },
    [ordered]@{ name = 'desktopRuntime'; probe = $DesktopProbe; online = $DesktopOnline }
)) {
    if ($entry.online -ne 'online') {
        $Blockers += [ordered]@{
            node = $entry.name
            status = $entry.online
            statusCode = if ($entry.probe) { $entry.probe.statusCode } else { 0 }
            detail = if ($entry.probe -and $entry.probe.error) { $entry.probe.error } else { 'cached fabric blocker' }
        }
    }
}

if (-not $WarmupBackgroundOnly) {
    $Blockers += [ordered]@{
        node = 'warmup'
        status = 'active'
        detail = 'Background warmer stayed active in the cache snapshot.'
    }
}

$BottleneckClassification = Classify-Bottleneck -Raw8080Ms $RouterTotalMs -Adapter8787Ms $AdapterTotalMs -PlanMs $PlanMs -WarmupMs $Warmup.requestMs

$Recommendations = @()
if ($BottleneckClassification -eq 'router-bottleneck') {
    $Recommendations += 'Focus on the 8080 router hot path and model route selection.'
}
if ($BottleneckClassification -eq 'adapter-bottleneck') {
    $Recommendations += 'Trim adapter-side caching, metadata, or downstream forwarding overhead.'
}
if ($Blockers.Count -gt 0) {
    $Recommendations += 'Keep offline fabric entries cached and do not fake online state.'
}
if ($Recommendations.Count -eq 0) {
    $Recommendations += 'Hot path is within target and ready for the next gate.'
}

$Result = [ordered]@{
    schema = 'leeway.agent-lee.chat-latency-trace.v1'
    timestamp = (Get-Date).ToString('o')
    workspaceRoot = $WorkspaceRoot
    canonicalFingerprint = 'leeway.agent-lee.code-mode.canonical.supreme-agent-lead.v1'
    prompt = $Prompt
    servicesOnline = [ordered]@{
        cerebral = $CerebralOnline
        desktopRuntime = $DesktopOnline
    }
    warmup = $Warmup
    fabricCache = $Cache
    aaPlan = $Plan
    aaExecute = $Execute
    routerChat8080 = [ordered]@{
        requestMs = $RouterChat.requestMs
        totalMs = $RouterTotalMs
        firstByteMs = $RouterFirstByteMs
        selectedModel = Get-ObjectPropertyValue -Object (Get-ObjectPropertyValue -Object $RouterChat.body -Name 'agentLeeRouter') -Name 'selectedModel'
        selectedBackend = Get-ObjectPropertyValue -Object (Get-ObjectPropertyValue -Object $RouterChat.body -Name 'agentLeeRouter') -Name 'selectedBackend'
        responseMode = Get-ObjectPropertyValue -Object (Get-ObjectPropertyValue -Object $RouterChat.body -Name 'agentLeeRouter') -Name 'responseMode'
        slowestSpan = Get-ObjectPropertyValue -Object (Get-ObjectPropertyValue -Object $RouterChat.body -Name 'agentLeeTrace') -Name 'slowestSpan'
        pass = ($RouterChat.ok -and $RouterTotalMs -le $ChatTargetMs)
    }
    adapterChat8787 = [ordered]@{
        requestMs = $AdapterChat.requestMs
        totalMs = $AdapterTotalMs
        firstByteMs = $AdapterFirstByteMs
        downstream8080Ms = $AdapterDownstreamMs
        selectedModel = Get-ObjectPropertyValue -Object (Get-ObjectPropertyValue -Object $AdapterChat.body -Name 'agentLeeTurbo') -Name 'selectedModel'
        selectedBackend = Get-ObjectPropertyValue -Object (Get-ObjectPropertyValue -Object $AdapterChat.body -Name 'agentLeeTurbo') -Name 'selectedBackend'
        responseMode = Get-ObjectPropertyValue -Object (Get-ObjectPropertyValue -Object $AdapterChat.body -Name 'agentLeeTurbo') -Name 'responseMode'
        slowestSpan = Get-ObjectPropertyValue -Object (Get-ObjectPropertyValue -Object (Get-ObjectPropertyValue -Object $AdapterChat.body -Name 'agentLeeTurbo') -Name 'trace') -Name 'slowestSpan'
        timeout = [bool](Get-ObjectPropertyValue -Object (Get-ObjectPropertyValue -Object $AdapterChat.body -Name 'agentLeeTurbo') -Name 'timeout')
        pass = ($AdapterChat.ok -and $AdapterTotalMs -le $ChatTargetMs)
    }
    metrics = $Metrics
    metricsSummary = [ordered]@{
        raw8080Ms = if ($Metrics.ok -and $Metrics.body) { $Metrics.body.raw8080Ms } else { $null }
        adapter8787Ms = if ($Metrics.ok -and $Metrics.body) { $Metrics.body.adapter8787Ms } else { $null }
        lastPlanMs = if ($Metrics.ok -and $Metrics.body) { $Metrics.body.lastPlanMs } else { $null }
        lastExecuteMs = if ($Metrics.ok -and $Metrics.body) { $Metrics.body.lastExecuteMs } else { $null }
        lastWarmupMs = if ($Metrics.ok -and $Metrics.body) { $Metrics.body.lastWarmupMs } else { $null }
        cacheRefreshMs = if ($Metrics.ok -and $Metrics.body) { $Metrics.body.cacheRefreshMs } else { $null }
        cacheAgeMs = if ($Metrics.ok -and $Metrics.body) { $Metrics.body.cacheAgeMs } else { $null }
    }
    cachedFabricBlockers = $Blockers
    targetChecks = $TargetChecks
    bottleneckClassification = $BottleneckClassification
    recommendations = $Recommendations
    finalStatus = $(if (($TargetChecks.raw8080UnderTarget -and $TargetChecks.adapter8787UnderTarget -and $TargetChecks.planUnderTarget -and $TargetChecks.warmupUnderTarget -and $TargetChecks.warmupBackgroundOnly)) { 'AGENT_LEE_TURBO_CHAT_LOCKED' } else { 'AGENT_LEE_TURBO_WORKFLOW_PARTIAL' })
}

New-Item -ItemType Directory -Force -Path $ReceiptDir | Out-Null
$Result | ConvertTo-Json -Depth 32 | Set-Content -LiteralPath $ReceiptPath -Encoding UTF8
$Result.receiptPath = $ReceiptPath

Write-Output ($Result | ConvertTo-Json -Depth 32)

if ($Result.finalStatus -ne 'AGENT_LEE_TURBO_CHAT_LOCKED') {
    exit 1
}

exit 0
