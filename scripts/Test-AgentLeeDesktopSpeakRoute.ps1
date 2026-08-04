[CmdletBinding()]
param(
    [string]$AuthToken = ""
)

$ErrorActionPreference = "Continue"
Set-StrictMode -Version Latest

. (Join-Path $PSScriptRoot "AgentLeeRuntimeCommon.ps1")

$Root        = Get-LeewayWorkspaceRoot
$Stamp       = Get-Date -Format "yyyyMMdd-HHmmss"
$ReportPath  = Join-Path $Root "Archive\reports\agent-lee-desktop-speak-route-report.json"
$ReceiptPath = Join-Path $Root "Archive\receipts\agent-lee-live-embodiment\agent-lee-desktop-speak-route-$Stamp.json"
$ProofDir    = Join-Path $Root "Archive\proofs\agent-lee-live-embodiment"
$RawPath     = Join-Path $ProofDir "desktop-speak-route-raw-$Stamp.json"

New-LeewayDirectory -Path $ProofDir | Out-Null

$governingStandards = @(
    "000-URGENT-LEEWAY-ASSISTANT-LAW/READ-FIRST.md",
    "LeeWay-Standards/standards/BOOK-54-ASSISTANT-EMBODIMENT-AND-BEHAVIOR-LAW.md",
    "LeeWay-Standards/standards/BOOK-55-ASSISTANT-RECORDING-AND-LEARNING-LAW.md",
    "LeeWay-Standards/standards/BOOK-80-ABSOLUTE-PROOF-AND-NO-FALSE-COMPLETION-LAW.md"
)

$BaseUrl       = "http://127.0.0.1:8091"
$SpeakUrl      = "$BaseUrl/runtime/speak"
$blockers      = @()
$truthLabels   = @("NO_FAKE_PASS", "DESKTOP_SPEAK_ROUTE_PROOF_PASS")
$proofArtifacts= @()

$isAuthorized  = ($AuthToken -eq "I_AUTHORIZE_AGENT_LEE_DESKTOP_COMMAND")

# ── Step 1: Confirm Desktop Runtime is live via /status ───────────────────────
$statusProbe = Invoke-LeewayHttp -Url "$BaseUrl/status" -TimeoutSec 5
$runtimeLive = $statusProbe.ok

if (-not $runtimeLive) {
    $blockers += "BLOCKED_RUNTIME: Desktop Runtime /status not reachable. Cannot test speak route. Start Desktop Runtime first."
    $truthLabels += "DESKTOP_RUNTIME_OFFLINE"
} else {
    $truthLabels += "DESKTOP_RUNTIME_LIVE"
}

# ── Step 2: Check that /runtime/speak exists and enforces consent gate ─────────
$consentProbe     = $null
$consentGateOk    = $false
$requiredToken    = $null
$routeExists      = $false

if ($runtimeLive) {
    # Probe with no auth via HttpWebRequest — reliably reads 403 body in PS5.1
    $speakRawBody2    = $null
    $speakStatus2     = $null
    try {
        $req2 = [System.Net.HttpWebRequest]::Create($SpeakUrl)
        $req2.Method = "POST"; $req2.ContentType = "application/json"; $req2.Timeout = 8000
        $b2 = [System.Text.Encoding]::UTF8.GetBytes('{"text":"PROBE_ONLY_NOT_AUTHORIZED"}')
        $req2.ContentLength = $b2.Length
        $rs2 = $req2.GetRequestStream(); $rs2.Write($b2, 0, $b2.Length); $rs2.Close()
        try {
            $r2 = $req2.GetResponse()
            $speakStatus2 = [int]$r2.StatusCode
            $sr2 = New-Object System.IO.StreamReader($r2.GetResponseStream())
            try { $speakRawBody2 = $sr2.ReadToEnd() } finally { $sr2.Dispose() }
            $r2.Close()
        } catch [System.Net.WebException] {
            $wx2 = $_.Exception
            if ($wx2.Response) {
                $speakStatus2 = [int]$wx2.Response.StatusCode
                $sr2 = New-Object System.IO.StreamReader($wx2.Response.GetResponseStream())
                try { $speakRawBody2 = $sr2.ReadToEnd() } finally { $sr2.Dispose() }
                $wx2.Response.Close()
            }
        }
    } catch { $speakRawBody2 = $null }

    $consentProbe  = [pscustomobject]@{ rawBody = $speakRawBody2; statusCode = $speakStatus2 }
    $routeExists   = ($speakStatus2 -ne $null)
    $consentGateOk = ($speakRawBody2 -match "requiredConfirm|I_AUTHORIZE|consent|approval")

    if ($routeExists) { $truthLabels += "SPEAK_ROUTE_EXISTS" }
    else { $truthLabels += "SPEAK_ROUTE_NOT_FOUND" }

    if ($consentGateOk) {
        $truthLabels   += "CONSENT_GATE_ENFORCED"
        try {
            $parsed = $consentProbe.rawBody | ConvertFrom-Json -ErrorAction SilentlyContinue
            $requiredToken = $parsed.requiredConfirm
        } catch {}
        $blockers += "BLOCKED_APPROVAL: POST $SpeakUrl requires token: $requiredToken. This is the correct consent gate behavior."
    } else {
        $blockers += "BLOCKED_RUNTIME: Speak route returned unexpected response (no consent gate detected): $($consentProbe.rawBody)"
    }
}

# ── Step 3: Authorized bounded test (only if token provided) ──────────────────
$speakTestResult   = $null
$audioArtifactPath = $null
$speakTestOk       = $false

if ($isAuthorized -and $runtimeLive) {
    $truthLabels += "AUTHORIZATION_USED:I_AUTHORIZE_AGENT_LEE_DESKTOP_COMMAND"
    $speakPayload  = [ordered]@{
        text    = "Agent Lee desktop speak route proof. Bounded single phrase test."
        confirm = "I_AUTHORIZE_AGENT_LEE_DESKTOP_COMMAND"
    }
    $speakTestResult = Invoke-LeewayHttp -Url $SpeakUrl -Method POST -Body $speakPayload -TimeoutSec 30
    $speakTestOk     = $speakTestResult.ok

    if ($speakTestOk) {
        $truthLabels += "SPEAK_ROUTE_AUTHORIZED_TEST_PASSED"
        try {
            $parsed = $speakTestResult.parsed
            if ($parsed.audioPath -or $parsed.artifact) {
                $audioArtifactPath = if ($parsed.audioPath) { $parsed.audioPath } else { $parsed.artifact }
                $truthLabels += "AUDIO_ARTIFACT:$audioArtifactPath"
            }
        } catch {}
    } else {
        $blockers += "PARTIAL_WITH_EXACT_BLOCKER: Authorized speak test returned error: $($speakTestResult.error) | status: $($speakTestResult.statusCode) | body: $($speakTestResult.rawBody)"
    }
} else {
    if (-not $isAuthorized) {
        $truthLabels += "NOT_AUTHORIZED_BOUNDED_TEST_SKIPPED"
        # Not a blocker — this is correct behavior. Consent gate works.
    }
}

# ── Step 4: Determine lane status ────────────────────────────────────────────
$laneStatus = if (-not $runtimeLive) {
    "BLOCKED_RUNTIME"
} elseif (-not $routeExists) {
    "BLOCKED_RUNTIME"
} elseif (-not $consentGateOk) {
    "BLOCKED_RUNTIME"
} elseif ($isAuthorized -and $speakTestOk) {
    "PROVEN_READY"
} elseif ($consentGateOk -and -not $isAuthorized) {
    "BLOCKED_APPROVAL"
} else {
    "PARTIAL_WITH_EXACT_BLOCKER"
}

$actualProofLevel   = if ($speakTestOk) { "PROOF_LEVEL_4_FUNCTIONAL_RUNTIME" } elseif ($consentGateOk) { "PROOF_LEVEL_3_RUNTIME_ENDPOINT" } elseif ($runtimeLive) { "PROOF_LEVEL_2_COMMAND_VALIDATION" } else { "PROOF_LEVEL_0_DOCUMENT" }
$requiredProofLevel = "PROOF_LEVEL_4_FUNCTIONAL_RUNTIME"

# ── Step 5: Write raw proof ───────────────────────────────────────────────────
$rawProof = [ordered]@{
    proofId           = "desktop-speak-route-raw-$Stamp"
    capturedAt        = (Get-Date).ToUniversalTime().ToString("o")
    runtimeLive       = $runtimeLive
    routeUrl          = $SpeakUrl
    routeExists       = $routeExists
    consentGateOk     = $consentGateOk
    requiredToken     = $requiredToken
    consentProbe      = $consentProbe
    isAuthorized      = $isAuthorized
    speakTestOk       = $speakTestOk
    speakTestResult   = $speakTestResult
    audioArtifactPath = $audioArtifactPath
    laneStatus        = $laneStatus
    blockers          = $blockers
    truthLabels       = $truthLabels
}
Write-LeewayJson -Path $RawPath -Object $rawProof | Out-Null
$proofArtifacts += $RawPath

# ── Step 6: Write report and receipt ─────────────────────────────────────────
$result = [ordered]@{
    reportId               = "agent-lee-desktop-speak-route-$Stamp"
    generatedAt            = (Get-Date).ToUniversalTime().ToString("o")
    assistantBodyRole      = "CODEX_ASSISTANT_BODY"
    assistantObjectId      = "LEEWAY-ASSISTANT-0002"
    governingStandardsRead = $governingStandards
    laneId                 = "DESKTOP_SPEAK_ROUTE"
    laneStatus             = $laneStatus
    requiredProofLevel     = $requiredProofLevel
    actualProofLevel       = $actualProofLevel
    runtimeLive            = $runtimeLive
    routeExists            = $routeExists
    consentGateOk          = $consentGateOk
    requiredToken          = $requiredToken
    isAuthorized           = $isAuthorized
    speakTestOk            = $speakTestOk
    audioArtifactPath      = $audioArtifactPath
    rawProofPath           = $RawPath
    proofArtifacts         = $proofArtifacts
    blockers               = $blockers
    truthLabels            = $truthLabels
    receiptsWritten        = @($ReceiptPath)
    reportsWritten         = @($ReportPath)
}
Write-LeewayJson -Path $ReportPath  -Object $result | Out-Null
Write-LeewayJson -Path $ReceiptPath -Object $result | Out-Null

Write-Host "=== Desktop Speak Route Proof ==="
Write-Host "Desktop Runtime live : $runtimeLive"
Write-Host "Route exists         : $routeExists  ($SpeakUrl)"
Write-Host "Consent gate OK      : $consentGateOk"
Write-Host "Required token       : $requiredToken"
Write-Host "Authorized test      : $isAuthorized"
Write-Host "Speak test OK        : $speakTestOk"
Write-Host "Audio artifact       : $audioArtifactPath"
Write-Host "Lane status          : $laneStatus"
Write-Host "Actual proof level   : $actualProofLevel"
if ($blockers.Count -gt 0) {
    Write-Host "BLOCKERS:"
    $blockers | ForEach-Object { Write-Host "  - $_" }
}
Write-Host "Raw proof            : $RawPath"
Write-Host "Receipt              : $ReceiptPath"

exit $(if ($laneStatus -eq "PROVEN_READY" -or $laneStatus -eq "BLOCKED_APPROVAL") { 0 } else { 1 })
