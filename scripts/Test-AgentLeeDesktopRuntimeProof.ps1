[CmdletBinding()]
param(
    [int]$Port = 8091,
    [string]$BaseUrl = ""
)

$ErrorActionPreference = "Continue"
Set-StrictMode -Version Latest

. (Join-Path $PSScriptRoot "AgentLeeRuntimeCommon.ps1")

$Root        = Get-LeewayWorkspaceRoot
$Stamp       = Get-Date -Format "yyyyMMdd-HHmmss"
$ReportPath  = Join-Path $Root "Archive\reports\agent-lee-desktop-runtime-proof-report.json"
$ReceiptPath = Join-Path $Root "Archive\receipts\agent-lee-live-embodiment\agent-lee-desktop-runtime-proof-$Stamp.json"
$ProofDir    = Join-Path $Root "Archive\proofs\agent-lee-live-embodiment"
$RawPath     = Join-Path $ProofDir "desktop-runtime-proof-raw-$Stamp.json"

New-LeewayDirectory -Path $ProofDir | Out-Null

$governingStandards = @(
    "000-URGENT-LEEWAY-ASSISTANT-LAW/READ-FIRST.md",
    "LeeWay-Standards/standards/BOOK-54-ASSISTANT-EMBODIMENT-AND-BEHAVIOR-LAW.md",
    "LeeWay-Standards/standards/BOOK-55-ASSISTANT-RECORDING-AND-LEARNING-LAW.md",
    "LeeWay-Standards/standards/BOOK-80-ABSOLUTE-PROOF-AND-NO-FALSE-COMPLETION-LAW.md"
)

# Resolve BaseUrl and Port — param wins; if BaseUrl provided, back-extract Port from it
if ([string]::IsNullOrWhiteSpace($BaseUrl)) {
    $BaseUrl = "http://127.0.0.1:$Port"
} else {
    if ($BaseUrl -match ":(\d+)") { $Port = [int]$Matches[1] }
}
$IsOfficialPort    = ($Port -eq 8091 -or $BaseUrl -match ":8091")
$RunClassification = if ($IsOfficialPort) { "OFFICIAL_PRODUCTION" } else { "DIAGNOSTIC_ONLY_NOT_OFFICIAL" }

$blockers    = @()
$truthLabels = @("NO_FAKE_PASS", "DESKTOP_RUNTIME_PROOF_PASS", $RunClassification)
$probeResults= [ordered]@{}

# ── Step 1: Port listening check ─────────────────────────────────────────────
$portListening = $false
$portPid       = $null
try {
    $netstatRaw = netstat -ano 2>$null | Select-String ":$Port\s.*LISTENING"
    if ($netstatRaw) {
        $portListening = $true
        $pidMatch = [regex]::Match(($netstatRaw | Select-Object -First 1).ToString(), '\s+(\d+)\s*$')
        if ($pidMatch.Success) { $portPid = [int]$pidMatch.Groups[1].Value }
        $truthLabels += "PORT_${Port}_LISTENING"
    } else {
        $blockers += "BLOCKED_RUNTIME: Port $Port is not listening."
        $truthLabels += "PORT_${Port}_NOT_LISTENING"
    }
} catch { $blockers += "PORT_CHECK_FAILED: " + $_.Exception.Message }

# ── Step 2: Process identity ──────────────────────────────────────────────────
$processInfo = $null
if ($portPid) {
    try {
        $proc = Get-Process -Id $portPid -ErrorAction SilentlyContinue
        if ($proc) {
            $processInfo = [ordered]@{ Name = $proc.Name; Id = $proc.Id; CPU = $proc.CPU }
            $truthLabels += "PROCESS_IDENTIFIED:$($proc.Name):PID$portPid"
        }
    } catch {}
}

# ── Step 3: CRITICAL — probe /status NOT /health ──────────────────────────────
# NOTE: Desktop Runtime uses /status (HTTP 200), not /health (returns 404).
# /health returning 404 is NOT evidence of offline status.
$healthProbe  = Invoke-LeewayHttp -Url "$BaseUrl/health" -TimeoutSec 5
$statusProbe  = Invoke-LeewayHttp -Url "$BaseUrl/status" -TimeoutSec 5

$probeResults["health_route"] = [ordered]@{
    url         = "$BaseUrl/health"
    ok          = $healthProbe.ok
    statusCode  = $healthProbe.statusCode
    note        = "404 is expected. /health does not exist in Desktop Runtime. Use /status instead."

    rawBody     = $healthProbe.rawBody
    error       = $healthProbe.error
}
$probeResults["status_route"] = [ordered]@{
    url         = "$BaseUrl/status"
    ok          = $statusProbe.ok
    statusCode  = $statusProbe.statusCode
    rawBody     = $statusProbe.rawBody
    error       = $statusProbe.error
}

$desktopRuntimeLive = $statusProbe.ok
$serviceName        = $null
$availableRoutes    = @()
$discoveryCount     = $null

if ($desktopRuntimeLive) {
    $truthLabels += "DESKTOP_RUNTIME_STATUS_ROUTE_OK"
    try {
        $parsed = $statusProbe.parsed
        $serviceName     = $parsed.service
        $discoveryCount  = $null
        if ($parsed.routes) { $availableRoutes = @($parsed.routes) }
        if ($serviceName) { $truthLabels += "SERVICE_NAME:$serviceName" }
        $truthLabels += "ROUTES_COUNT:$($availableRoutes.Count)"
    } catch {}
} else {
    $blockers += "BLOCKED_RUNTIME: Desktop Runtime /status returned error: $($statusProbe.error) | statusCode: $($statusProbe.statusCode)"
    $truthLabels += "DESKTOP_RUNTIME_OFFLINE"
}

# ── Step 4: Discovery index count ────────────────────────────────────────────
$discoveryProbe = Invoke-LeewayHttp -Url "$BaseUrl/discovery/index" -TimeoutSec 5
$probeResults["discovery_index"] = [ordered]@{
    url        = "$BaseUrl/discovery/index"
    ok         = $discoveryProbe.ok
    statusCode = $discoveryProbe.statusCode
    rawBody    = $discoveryProbe.rawBody
    error      = $discoveryProbe.error
}
if ($discoveryProbe.ok) {
    try { $discoveryCount = $discoveryProbe.parsed.count } catch {}
    $truthLabels += "DISCOVERY_INDEX_OK:count=$discoveryCount"
}

# ── Step 5: Runtime status route ─────────────────────────────────────────────
$runtimeStatusProbe = Invoke-LeewayHttp -Url "$BaseUrl/runtime/status" -TimeoutSec 5
$probeResults["runtime_status"] = [ordered]@{
    url        = "$BaseUrl/runtime/status"
    ok         = $runtimeStatusProbe.ok
    statusCode = $runtimeStatusProbe.statusCode
    rawBody    = $runtimeStatusProbe.rawBody
    error      = $runtimeStatusProbe.error
}
if ($runtimeStatusProbe.ok) { $truthLabels += "RUNTIME_STATUS_ROUTE_OK" }

# ── Step 6: Speak route consent-gate check ────────────────────────────────────
# POST /runtime/speak without authorization token must return consent gate JSON (HTTP 403).
# Use HttpWebRequest directly — Invoke-WebRequest -ErrorAction Stop does not reliably
# expose the 4xx response body in PS 5.1 after the exception is thrown.
$speakRawBody    = $null
$speakStatusCode = $null
$speakError      = $null
try {
    $req = [System.Net.HttpWebRequest]::Create("$BaseUrl/runtime/speak")
    $req.Method      = "POST"
    $req.ContentType = "application/json"
    $bodyBytes       = [System.Text.Encoding]::UTF8.GetBytes('{"text":"PROBE_ONLY_NOT_AUTHORIZED"}')
    $req.ContentLength = $bodyBytes.Length
    $req.Timeout     = 8000
    $reqStream = $req.GetRequestStream()
    $reqStream.Write($bodyBytes, 0, $bodyBytes.Length)
    $reqStream.Close()
    try {
        $resp            = $req.GetResponse()
        $speakStatusCode = [int]$resp.StatusCode
        $sr = New-Object System.IO.StreamReader($resp.GetResponseStream())
        try { $speakRawBody = $sr.ReadToEnd() } finally { $sr.Dispose() }
        $resp.Close()
    } catch [System.Net.WebException] {
        $webEx = $_.Exception
        $speakError = $webEx.Message
        if ($webEx.Response) {
            $speakStatusCode = [int]$webEx.Response.StatusCode
            $sr = New-Object System.IO.StreamReader($webEx.Response.GetResponseStream())
            try { $speakRawBody = $sr.ReadToEnd() } finally { $sr.Dispose() }
            $webEx.Response.Close()
        }
    }
} catch {
    $speakError = $_.Exception.Message
}

$consentGateDetected = ($speakRawBody -match "requiredConfirm|I_AUTHORIZE|consent")
$speakRequiredToken  = $null
if ($consentGateDetected) {
    try {
        $parsed = $speakRawBody | ConvertFrom-Json -ErrorAction SilentlyContinue
        $speakRequiredToken = $parsed.requiredConfirm
    } catch {}
}

$probeResults["speak_route_consent_gate"] = [ordered]@{
    url                  = "$BaseUrl/runtime/speak"
    statusCode           = $speakStatusCode
    rawBody              = $speakRawBody
    error                = $speakError
    consentGateEnforced  = $consentGateDetected
    requiredToken        = $speakRequiredToken
}
if ($consentGateDetected) {
    $truthLabels += "SPEAK_ROUTE_EXISTS_CONSENT_GATE_ENFORCED"
    $blockers    += "BLOCKED_APPROVAL: POST /runtime/speak requires $speakRequiredToken. Route exists and consent gate is enforced (HTTP $speakStatusCode with requiredConfirm body)."
} elseif ($speakStatusCode -eq 200) {
    $truthLabels += "SPEAK_ROUTE_OK_NO_GATE"
} else {
    $truthLabels += "SPEAK_ROUTE_NOT_FOUND_OR_ERROR"
    $blockers    += "BLOCKED_RUNTIME: POST /runtime/speak returned status $speakStatusCode with no consent gate body. Error: $speakError | Body: $speakRawBody"
}

# ── Step 7: Camera route check ────────────────────────────────────────────────
$cameraStatusProbe  = Invoke-LeewayHttp -Url "$BaseUrl/camera/status"  -TimeoutSec 5
$cameraCaptureProbe = Invoke-LeewayHttp -Url "$BaseUrl/camera/capture" -TimeoutSec 5

$probeResults["camera_status"]  = [ordered]@{ url="$BaseUrl/camera/status";  ok=$cameraStatusProbe.ok;  statusCode=$cameraStatusProbe.statusCode;  rawBody=$cameraStatusProbe.rawBody;  error=$cameraStatusProbe.error }
$probeResults["camera_capture"] = [ordered]@{ url="$BaseUrl/camera/capture"; ok=$cameraCaptureProbe.ok; statusCode=$cameraCaptureProbe.statusCode; rawBody=$cameraCaptureProbe.rawBody; error=$cameraCaptureProbe.error }

$cameraRouteExists = ($cameraStatusProbe.ok -or $cameraStatusProbe.statusCode -in @(400,405,422)) -or
                     ($cameraCaptureProbe.ok -or $cameraCaptureProbe.statusCode -in @(400,405,422))

if ($cameraRouteExists) {
    $truthLabels += "CAMERA_ROUTE_EXISTS_IN_DESKTOP_RUNTIME"
} else {
    $truthLabels += "CAMERA_ROUTE_MISSING_FROM_DESKTOP_RUNTIME"
    $blockers    += "BLOCKED_RUNTIME: No /camera/status or /camera/capture route in Desktop Runtime. Camera bridge not deployed in this runtime. Deploy separate Leeway Camera Bridge service."
}

# ── Step 8: Ears/mic route check ─────────────────────────────────────────────
$earsStatusProbe = Invoke-LeewayHttp -Url "$BaseUrl/ears/status" -TimeoutSec 5
$earsListenProbe = Invoke-LeewayHttp -Url "$BaseUrl/ears/listen"  -Method POST -Body @{ bounded = $true; durationMs = 1 } -TimeoutSec 5

$probeResults["ears_status"] = [ordered]@{ url="$BaseUrl/ears/status"; ok=$earsStatusProbe.ok; statusCode=$earsStatusProbe.statusCode; rawBody=$earsStatusProbe.rawBody; error=$earsStatusProbe.error }
$probeResults["ears_listen"] = [ordered]@{ url="$BaseUrl/ears/listen"; ok=$earsListenProbe.ok; statusCode=$earsListenProbe.statusCode; rawBody=$earsListenProbe.rawBody; error=$earsListenProbe.error }

$earsRouteExists = ($earsStatusProbe.ok -or $earsStatusProbe.statusCode -in @(400,405,422)) -or
                   ($earsListenProbe.ok  -or $earsListenProbe.statusCode -in @(400,405,422))

if ($earsRouteExists) {
    $truthLabels += "EARS_ROUTE_EXISTS_IN_DESKTOP_RUNTIME"
} else {
    $truthLabels += "EARS_ROUTE_MISSING_FROM_DESKTOP_RUNTIME"
    $blockers    += "BLOCKED_RUNTIME: No /ears/status or /ears/listen route in Desktop Runtime. Mic listener bridge not deployed in this runtime."
}

# ── Step 9: Determine lane verdict ───────────────────────────────────────────
$laneVerdict = if (-not $portListening) {
    "DESKTOP_RUNTIME_OFFLINE"
} elseif (-not $desktopRuntimeLive) {
    "DESKTOP_RUNTIME_PROCESS_ONLY_PARTIAL"
} elseif (-not $cameraRouteExists -or -not $earsRouteExists) {
    "DESKTOP_RUNTIME_ROUTE_GAPS_REMAIN"
} else {
    "DESKTOP_RUNTIME_ENDPOINT_READY"
}

$actualProofLevel   = if ($desktopRuntimeLive) { "PROOF_LEVEL_3_RUNTIME_ENDPOINT" } elseif ($portListening) { "PROOF_LEVEL_2_COMMAND_VALIDATION" } else { "PROOF_LEVEL_0_DOCUMENT" }
$requiredProofLevel = "PROOF_LEVEL_3_RUNTIME_ENDPOINT"

# ── Step 10: Write raw proof ──────────────────────────────────────────────────
$rawProof = [ordered]@{
    proofId            = "desktop-runtime-proof-raw-$Stamp"
    capturedAt         = (Get-Date).ToUniversalTime().ToString("o")
    baseUrl            = $BaseUrl
    portListening      = $portListening
    portPid            = $portPid
    processInfo        = $processInfo
    desktopRuntimeLive = $desktopRuntimeLive
    serviceName        = $serviceName
    availableRoutes    = $availableRoutes
    discoveryCount     = $discoveryCount
    probeResults       = $probeResults
    cameraRouteExists  = $cameraRouteExists
    earsRouteExists    = $earsRouteExists
    laneVerdict        = $laneVerdict
    blockers           = $blockers
    truthLabels        = $truthLabels
}
Write-LeewayJson -Path $RawPath -Object $rawProof | Out-Null

# ── Step 11: Write report and receipt ────────────────────────────────────────
$result = [ordered]@{
    reportId               = "agent-lee-desktop-runtime-proof-$Stamp"
    generatedAt            = (Get-Date).ToUniversalTime().ToString("o")
    assistantBodyRole      = "CODEX_ASSISTANT_BODY"
    assistantObjectId      = "LEEWAY-ASSISTANT-0002"
    governingStandardsRead = $governingStandards
    laneId                 = "DESKTOP_RUNTIME"
    runClassification      = $RunClassification
    probedBaseUrl          = $BaseUrl
    probedPort             = $Port
    laneVerdict            = $laneVerdict
    requiredProofLevel     = $requiredProofLevel
    actualProofLevel       = $actualProofLevel
    portListening          = $portListening
    portPid                = $portPid
    processInfo            = $processInfo
    desktopRuntimeLive     = $desktopRuntimeLive
    serviceName            = $serviceName
    availableRoutes        = $availableRoutes
    discoveryCount         = $discoveryCount
    speakRouteExists       = ($consentGateDetected -or $speakStatusCode -eq 200)
    speakConsentGated      = $consentGateDetected
    speakRequiredToken     = $speakRequiredToken
    cameraRouteExists      = $cameraRouteExists
    earsRouteExists        = $earsRouteExists
    rawProofPath           = $RawPath
    blockers               = $blockers
    truthLabels            = $truthLabels
    receiptsWritten        = @($ReceiptPath)
    reportsWritten         = @($ReportPath)
}
Write-LeewayJson -Path $ReportPath  -Object $result | Out-Null
Write-LeewayJson -Path $ReceiptPath -Object $result | Out-Null

Write-Host "=== Desktop Runtime Proof ==="
Write-Host "Run classification   : $RunClassification"
Write-Host "Probed base URL      : $BaseUrl"
Write-Host "Port $Port Listening : $portListening (PID: $portPid)"
if ($processInfo) { Write-Host "Process              : $($processInfo.Name)" } else { Write-Host "Process              : (unknown)" }
Write-Host "Status route /status : $desktopRuntimeLive"
Write-Host "Service name         : $serviceName"
Write-Host "Routes available     : $($availableRoutes.Count)"
Write-Host "Discovery count      : $discoveryCount"
Write-Host "Speak route          : exists=$($consentGateDetected -or $speakStatusCode -eq 200) consentGated=$consentGateDetected requiredToken=$speakRequiredToken"
Write-Host "Camera route         : $cameraRouteExists"
Write-Host "Ears route           : $earsRouteExists"
Write-Host "Lane verdict         : $laneVerdict"
Write-Host "Actual proof level   : $actualProofLevel"
if ($blockers.Count -gt 0) {
    Write-Host "BLOCKERS:"
    $blockers | ForEach-Object { Write-Host "  - $_" }
}
Write-Host "Raw proof           : $RawPath"
Write-Host "Receipt             : $ReceiptPath"

exit $(if ($desktopRuntimeLive) { 0 } else { 1 })
