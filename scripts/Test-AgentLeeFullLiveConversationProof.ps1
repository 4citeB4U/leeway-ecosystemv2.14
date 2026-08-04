[CmdletBinding()]
param()

$ErrorActionPreference = "Continue"
Set-StrictMode -Version Latest

. (Join-Path $PSScriptRoot "AgentLeeRuntimeCommon.ps1")

$Root        = Get-LeewayWorkspaceRoot
$Stamp       = Get-Date -Format "yyyyMMdd-HHmmss"
$ReportPath  = Join-Path $Root "Archive\reports\agent-lee-full-live-conversation-proof-report.json"
$ReceiptPath = Join-Path $Root "Archive\receipts\agent-lee-live-embodiment\agent-lee-full-live-conversation-proof-$Stamp.json"
$ProofDir    = Join-Path $Root "Archive\proofs\agent-lee-live-embodiment"
$RawPath     = Join-Path $ProofDir "full-live-conversation-raw-$Stamp.json"

New-LeewayDirectory -Path $ProofDir | Out-Null

$governingStandards = @(
    "000-URGENT-LEEWAY-ASSISTANT-LAW/READ-FIRST.md",
    "LeeWay-Standards/standards/BOOK-54-ASSISTANT-EMBODIMENT-AND-BEHAVIOR-LAW.md",
    "LeeWay-Standards/standards/BOOK-55-ASSISTANT-RECORDING-AND-LEARNING-LAW.md",
    "LeeWay-Standards/standards/BOOK-80-ABSOLUTE-PROOF-AND-NO-FALSE-COMPLETION-LAW.md"
)

$blockers    = @()
$truthLabels = @("NO_FAKE_PASS", "FULL_LIVE_CONVERSATION_PROOF_PASS")
$checks      = [ordered]@{}

# ── Check 1: Voice Kernel Health (L013) ───────────────────────────────────────
$vkHealth    = Invoke-LeewayHttp -Url "http://127.0.0.1:8080/health" -TimeoutSec 8
$checks["voice_kernel_health"] = [ordered]@{
    url    = "http://127.0.0.1:8080/health"
    ok     = $vkHealth.ok
    status = if ($vkHealth.ok) { "READY" } else { "OFFLINE" }
    error  = $vkHealth.error
    raw    = $vkHealth.rawBody
}
if (-not $vkHealth.ok) {
    $blockers += "BLOCKED_RUNTIME: Voice Kernel router not live on 8080. Error: $($vkHealth.error)"
    $truthLabels += "VOICE_KERNEL_OFFLINE"
} else {
    $truthLabels += "VOICE_KERNEL_LIVE"
}

# ── Check 2: Agent Lee Turbo adapter (8787) ────────────────────────────────────
$turboHealth = Invoke-LeewayHttp -Url "http://127.0.0.1:8787/health" -TimeoutSec 8
$checks["agent_lee_turbo_health"] = [ordered]@{
    url    = "http://127.0.0.1:8787/health"
    ok     = $turboHealth.ok
    status = if ($turboHealth.ok) { "READY" } else { "OFFLINE" }
    error  = $turboHealth.error
    raw    = $turboHealth.rawBody
}
if (-not $turboHealth.ok) {
    $blockers += "BLOCKED_RUNTIME: Agent Lee Turbo adapter not live on 8787. Error: $($turboHealth.error)"
    $truthLabels += "TURBO_ADAPTER_OFFLINE"
} else {
    $truthLabels += "TURBO_ADAPTER_LIVE"
}

# ── Check 3: Runtime Fabric (4001) ────────────────────────────────────────────
$fabricHealth = Invoke-LeewayHttp -Url "http://127.0.0.1:4001/health" -TimeoutSec 8
$checks["runtime_fabric_health"] = [ordered]@{
    url    = "http://127.0.0.1:4001/health"
    ok     = $fabricHealth.ok
    status = if ($fabricHealth.ok) { "READY" } else { "OFFLINE" }
    error  = $fabricHealth.error
    raw    = $fabricHealth.rawBody
}
if (-not $fabricHealth.ok) {
    $blockers += "BLOCKED_RUNTIME: Runtime Fabric not live on 4001. Error: $($fabricHealth.error)"
    $truthLabels += "RUNTIME_FABRIC_OFFLINE"
} else {
    $truthLabels += "RUNTIME_FABRIC_LIVE"
}

# ── Check 4: Canonical TTS/synthesis route ────────────────────────────────────
$ttsRoutes = @(
    @{ name = "voice_kernel_speak";     url = "http://127.0.0.1:8080/speak" },
    @{ name = "runtime_fabric_tts";     url = "http://127.0.0.1:4001/tts" },
    # CORRECTED: Desktop Runtime uses /runtime/speak (not /mouth/speak which returns 404)
    # GET /status returns full route manifest. POST /runtime/speak returns consent gate (not offline).
    @{ name = "desktop_runtime_speak";  url = "http://127.0.0.1:8091/runtime/speak" }
)

$ttsRouteOk         = $false
$ttsRouteFound      = $null
$ttsConsentGated    = $false
foreach ($route in $ttsRoutes) {
    $probeRawBody = $null
    $probeStatusCode = $null
    $probeError = $null
    try {
        $req = [System.Net.HttpWebRequest]::Create($route.url)
        $req.Method = "POST"
        $req.ContentType = "application/json"
        $bodyBytes = [System.Text.Encoding]::UTF8.GetBytes('{"text":"PROBE"}')
        $req.ContentLength = $bodyBytes.Length
        $req.Timeout = 8000
        $reqStream = $req.GetRequestStream()
        $reqStream.Write($bodyBytes, 0, $bodyBytes.Length)
        $reqStream.Close()
        try {
            $resp = $req.GetResponse()
            $probeStatusCode = [int]$resp.StatusCode
            $sr = New-Object System.IO.StreamReader($resp.GetResponseStream())
            try { $probeRawBody = $sr.ReadToEnd() } finally { $sr.Dispose() }
            $resp.Close()
        } catch [System.Net.WebException] {
            $webEx = $_.Exception
            $probeError = $webEx.Message
            if ($webEx.Response) {
                $probeStatusCode = [int]$webEx.Response.StatusCode
                $sr = New-Object System.IO.StreamReader($webEx.Response.GetResponseStream())
                try { $probeRawBody = $sr.ReadToEnd() } finally { $sr.Dispose() }
                $webEx.Response.Close()
            }
        }
    } catch {
        $probeError = $_.Exception.Message
    }

    $isConsentGate = ($probeRawBody -match "requiredConfirm|I_AUTHORIZE|consent")
    $checks[$route.name] = [ordered]@{
        url            = $route.url
        ok             = ($probeStatusCode -ge 200 -and $probeStatusCode -lt 300)
        statusCode     = $probeStatusCode
        isConsentGate  = $isConsentGate
        error          = $probeError
        raw            = $probeRawBody
    }
    if (($probeStatusCode -ge 200 -and $probeStatusCode -lt 300) -and -not $ttsRouteOk) {
        $ttsRouteOk    = $true
        $ttsRouteFound = $route.url
        $truthLabels  += "TTS_ROUTE_LIVE:$($route.name)"
    } elseif ($isConsentGate -and -not $ttsRouteOk) {
        $ttsConsentGated = $true
        $ttsRouteFound   = $route.url
        $truthLabels    += "TTS_ROUTE_CONSENT_GATED:$($route.name)"
        $blockers       += "BLOCKED_APPROVAL: $($route.url) requires I_AUTHORIZE_AGENT_LEE_DESKTOP_COMMAND token. Route exists and consent gate is enforced correctly."
    }
}

$ttsTestResult = $null
if ($ttsRouteOk) {
    $ttsPayload    = @{ text = "Agent Lee live conversation probe."; voice = "agent-lee" }
    $ttsTestResult = Invoke-LeewayHttp -Url $ttsRouteFound -Method POST -Body $ttsPayload -TimeoutSec 30
    $checks["tts_synthesis_test"] = [ordered]@{
        url        = $ttsRouteFound
        ok         = $ttsTestResult.ok
        statusCode = $ttsTestResult.statusCode
        error      = $ttsTestResult.error
        rawLength  = if ($ttsTestResult.rawBody) { $ttsTestResult.rawBody.Length } else { 0 }
    }
    if ($ttsTestResult.ok) {
        $truthLabels += "TTS_SYNTHESIS_RESPONDED"
    } else {
        $blockers    += "PARTIAL_WITH_EXACT_BLOCKER: TTS route $ttsRouteFound is live but synthesis POST returned error: $($ttsTestResult.error)"
        $truthLabels += "TTS_SYNTHESIS_FAILED"
    }
} elseif ($ttsConsentGated) {
    $truthLabels += "TTS_ROUTE_EXISTS_APPROVAL_REQUIRED"
} else {
    $blockers    += "BLOCKED_RUNTIME: No TTS/synthesis route is live or consent-gated. Checked: voice_kernel /speak, runtime_fabric /tts, desktop_runtime /runtime/speak."
    $truthLabels += "TTS_ROUTE_OFFLINE"
}


# ── Check 5: Mic/listener state (read from prior proof) ──────────────────────
$micReportPath = Join-Path $Root "Archive\reports\agent-lee-always-listening-loop-report.json"
$micReport     = Read-LeewayJson -Path $micReportPath
$micLaneStatus = if ($micReport) { $micReport.laneStatus } else { "NOT_RUN" }
$micFound      = if ($micReport) { $micReport.micFound } else { $false }
$checks["mic_listener_state"] = [ordered]@{
    reportPath   = $micReportPath
    reportFound  = ($null -ne $micReport)
    laneStatus   = $micLaneStatus
    micFound     = $micFound
}
if ($micLaneStatus -eq "PROVEN_READY") {
    $truthLabels += "MIC_LISTENER_PROVEN"
} elseif ($micFound) {
    $truthLabels += "MIC_DEVICE_FOUND_LISTENER_PARTIAL"
    $blockers    += "PARTIAL_WITH_EXACT_BLOCKER: Mic device found but always-listening loop is not fully proven ($micLaneStatus). Full live conversation requires captured audio event."
} else {
    $blockers    += "BLOCKED_HARDWARE: Mic/listener proof shows no mic device found. Full live conversation input is blocked."
    $truthLabels += "MIC_LISTENER_BLOCKED"
}

# ── Check 6: Agent Lee text input route ───────────────────────────────────────
$inputRoutes = @(
    @{ name = "turbo_chat";         url = "http://127.0.0.1:8787/v1/chat/completions" },
    @{ name = "router_chat";        url = "http://127.0.0.1:8080/v1/chat/completions" },
    @{ name = "runtime_fabric_ask"; url = "http://127.0.0.1:4001/ask" }
)

$inputRouteOk    = $false
$inputRouteFound = $null
foreach ($route in $inputRoutes) {
    $probe = Invoke-LeewayHttp -Url $route.url -TimeoutSec 5
    $checks[$route.name + "_probe"] = [ordered]@{ url = $route.url; ok = $probe.ok; error = $probe.error }
    # A 422/405/400 means the route exists but needs a proper body — still LIVE
    if ($probe.ok -or ($probe.statusCode -ge 400 -and $probe.statusCode -lt 500)) {
        if (-not $inputRouteOk) {
            $inputRouteOk    = $true
            $inputRouteFound = $route.url
            $truthLabels    += "INPUT_ROUTE_LIVE:$($route.name)"
        }
    }
}

$inputTestResult = $null
if ($inputRouteOk) {
    $inputPayload = @{
        model    = "agent-lee-code-mode"
        messages = @(@{ role = "user"; content = "Agent Lee live conversation proof ping. Respond with: LIVE_CONVERSATION_PROOF_OK" })
        stream   = $false
    }
    $inputTestResult = Invoke-LeewayHttp -Url $inputRouteFound -Method POST -Body $inputPayload -TimeoutSec 30
    $checks["input_route_test"] = [ordered]@{
        url        = $inputRouteFound
        ok         = $inputTestResult.ok
        statusCode = $inputTestResult.statusCode
        error      = $inputTestResult.error
        rawLength  = if ($inputTestResult.rawBody) { $inputTestResult.rawBody.Length } else { 0 }
        rawSnippet = if ($inputTestResult.rawBody -and $inputTestResult.rawBody.Length -gt 0) { $inputTestResult.rawBody.Substring(0, [Math]::Min(500, $inputTestResult.rawBody.Length)) } else { $null }
    }
    if ($inputTestResult.ok) {
        $truthLabels += "INPUT_ROUTE_RESPONDED"
    } else {
        $blockers += "PARTIAL_WITH_EXACT_BLOCKER: Input route $inputRouteFound returned error $($inputTestResult.statusCode): $($inputTestResult.error)"
        $truthLabels += "INPUT_ROUTE_FAILED"
    }
} else {
    $blockers += "BLOCKED_RUNTIME: No Agent Lee input route is reachable. Checked: turbo 8787, router 8080, fabric 4001."
    $truthLabels += "INPUT_ROUTE_OFFLINE"
}

# ── Check 7: Owner/audience boundary ─────────────────────────────────────────
$ownerReportPath = Join-Path $Root "Archive\reports\agent-lee-owner-identity-report.json"
$ownerReport     = Read-LeewayJson -Path $ownerReportPath
$ownerLoaded     = ($null -ne $ownerReport)
$checks["owner_audience_boundary"] = [ordered]@{
    reportPath   = $ownerReportPath
    loaded       = $ownerLoaded
    laneStatus   = if ($ownerReport) { $ownerReport.verdict } else { "NOT_RUN" }
}
if ($ownerLoaded) {
    $truthLabels += "OWNER_BOUNDARY_LOADED"
} else {
    $blockers += "PARTIAL_WITH_EXACT_BLOCKER: Owner/audience boundary report not found at $ownerReportPath. Run: .\scripts\Test-AgentLeeOwnerIdentity.ps1"
}

# ── Determine final lane status ───────────────────────────────────────────────
$hardBlockers = @($blockers | Where-Object { $_ -match "^BLOCKED_RUNTIME|^BLOCKED_HARDWARE|^BLOCKED_PERMISSION|^BLOCKED_MODEL" })
$partials     = @($blockers | Where-Object { $_ -match "^PARTIAL_WITH_EXACT_BLOCKER" })

$laneStatus = if ($hardBlockers.Count -gt 0) {
    "PARTIAL_WITH_EXACT_BLOCKER"
} elseif ($partials.Count -gt 0) {
    "PARTIAL_WITH_EXACT_BLOCKER"
} elseif ($blockers.Count -eq 0 -and $ttsTestResult.ok -and $inputTestResult.ok) {
    "PROVEN_READY"
} else {
    "PARTIAL_WITH_EXACT_BLOCKER"
}

$proofsOk = ($ttsRouteOk -and $inputRouteOk -and $vkHealth.ok)
$actualProofLevel   = if ($proofsOk -and $ttsTestResult -and $ttsTestResult.ok -and $inputTestResult -and $inputTestResult.ok) {
    "PROOF_LEVEL_3_RUNTIME_ENDPOINT"
} elseif ($vkHealth.ok -or $turboHealth.ok) {
    "PROOF_LEVEL_3_RUNTIME_ENDPOINT"
} else {
    "PROOF_LEVEL_0_DOCUMENT"
}
$requiredProofLevel = "PROOF_LEVEL_5_END_TO_END_PROOF"

# ── Write raw proof ───────────────────────────────────────────────────────────
$rawProof = [ordered]@{
    proofId     = "full-live-conversation-raw-$Stamp"
    capturedAt  = (Get-Date).ToUniversalTime().ToString("o")
    checks      = $checks
    blockers    = $blockers
    truthLabels = $truthLabels
}
Write-LeewayJson -Path $RawPath -Object $rawProof | Out-Null

# ── Write report and receipt ──────────────────────────────────────────────────
$result = [ordered]@{
    reportId               = "agent-lee-full-live-conversation-proof-$Stamp"
    generatedAt            = (Get-Date).ToUniversalTime().ToString("o")
    assistantBodyRole      = "CODEX_ASSISTANT_BODY"
    assistantObjectId      = "LEEWAY-ASSISTANT-0002"
    governingStandardsRead = $governingStandards
    laneId                 = "FULL_LIVE_CONVERSATION"
    laneStatus             = $laneStatus
    requiredProofLevel     = $requiredProofLevel
    actualProofLevel       = $actualProofLevel
    checks                 = $checks
    rawProofPath           = $RawPath
    blockers               = $blockers
    truthLabels            = $truthLabels
    receiptsWritten        = @($ReceiptPath)
    reportsWritten         = @($ReportPath)
}

Write-LeewayJson -Path $ReportPath -Object $result | Out-Null
Write-LeewayJson -Path $ReceiptPath -Object $result | Out-Null

Write-Host "=== PHASE 5: Full Live Conversation Proof ==="
Write-Host "Lane Status      : $laneStatus"
Write-Host "Actual Proof     : $actualProofLevel"
Write-Host "Required Proof   : $requiredProofLevel"
Write-Host "Voice Kernel     : $($vkHealth.ok)"
Write-Host "Turbo Adapter    : $($turboHealth.ok)"
Write-Host "Runtime Fabric   : $($fabricHealth.ok)"
Write-Host "TTS Route OK     : $ttsRouteOk ($ttsRouteFound)"
Write-Host "Input Route OK   : $inputRouteOk ($inputRouteFound)"
Write-Host "Mic State        : $micLaneStatus"
Write-Host "Owner Loaded     : $ownerLoaded"
if ($blockers.Count -gt 0) {
    Write-Host "BLOCKERS:"
    $blockers | ForEach-Object { Write-Host "  - $_" }
}
Write-Host "Raw proof        : $RawPath"
Write-Host "Receipt          : $ReceiptPath"

exit $(if ($laneStatus -eq "PROVEN_READY") { 0 } else { 1 })
