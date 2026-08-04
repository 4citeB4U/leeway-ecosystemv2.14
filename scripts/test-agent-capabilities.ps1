# test-agent-capabilities.ps1
# Programmatically verifies the 6 Agent capabilities for production readiness.
# Output is JSON-structured.

param(
    [string]$RouterUrl = "http://127.0.0.1:8080",
    [string]$DesktopUrl = "http://127.0.0.1:8091",
    [switch]$VerboseOutput
)

$ErrorActionPreference = "Stop"

$results = [ordered]@{
    spokenResponse = @{ ok = $false; details = "" }
    voicePlayback  = @{ ok = $false; details = "" }
    mouseKeyboardRouting = @{ ok = $false; details = "" }
    consentBlock   = @{ ok = $false; details = "" }
    threeTurnContinuity = @{ ok = $false; details = "" }
    safeDesktopTask = @{ ok = $false; details = "" }
}

$CONFIRM_TOKEN = "I_AUTHORIZE_AGENT_LEE_DESKTOP_COMMAND"

# Helper for HTTP POST
function Post-Json {
    param([string]$Url, [object]$Body, [int]$TimeoutSec = 30)
    $json = $Body | ConvertTo-Json -Depth 10 -Compress
    $headers = @{ "Content-Type" = "application/json" }
    try {
        $response = Invoke-RestMethod -Uri $Url -Method Post -Body $json -Headers $headers -TimeoutSec $TimeoutSec -UseBasicParsing
        return @{ ok = $true; status = 200; data = $response }
    } catch {
        $status = 500
        if ($_.Exception.Response) {
            $status = [int]$_.Exception.Response.StatusCode
        }
        return @{ ok = $false; status = $status; error = $_.Exception.Message }
    }
}

# Helper for HTTP GET
function Get-Json {
    param([string]$Url, [int]$TimeoutSec = 15)
    try {
        $response = Invoke-RestMethod -Uri $Url -Method Get -TimeoutSec $TimeoutSec -UseBasicParsing
        return @{ ok = $true; status = 200; data = $response }
    } catch {
        $status = 500
        if ($_.Exception.Response) {
            $status = [int]$_.Exception.Response.StatusCode
        }
        return @{ ok = $false; status = $status; error = $_.Exception.Message }
    }
}

# --- 1. Spoken Response & 2. Voice Playback ---
Write-Host "Checking Spoken Response..." -NoNewline

$voiceKernelUrl = "http://127.0.0.1:8092"
$ttsBody = @{
    text = "Verifying production gate spoken response capability."
    voice = "agent-lee"
    language = "en"
    speed = 1.0
}

try {
    $ttsJson = $ttsBody | ConvertTo-Json -Depth 10 -Compress
    $ttsRes = Invoke-RestMethod -Uri "$voiceKernelUrl/tts" -Method Post -ContentType "application/json" -Body $ttsJson -TimeoutSec 180 -UseBasicParsing

    if ($ttsRes.status -eq "success" -and -not [string]::IsNullOrWhiteSpace($ttsRes.audio_path)) {
        $results.spokenResponse.ok = $true
        $results.spokenResponse.details = "Spoken response synthesized successfully. Audio path: $($ttsRes.audio_path)"
        Write-Host " PASS" -ForegroundColor Green

        Write-Host "Checking Voice Playback..." -NoNewline

        try {
            $audioFile = Split-Path -Leaf ([string]$ttsRes.audio_path)

            if ([string]::IsNullOrWhiteSpace($audioFile)) {
                throw "Could not derive audio filename from audio_path: $($ttsRes.audio_path)"
            }

            $audioUrl = "$voiceKernelUrl/audio/$audioFile"
            $audioResponse = Invoke-WebRequest -Uri $audioUrl -UseBasicParsing -TimeoutSec 60

            if ($audioResponse.StatusCode -eq 200 -and $audioResponse.RawContentLength -gt 0) {
                $results.voicePlayback.ok = $true
                $results.voicePlayback.details = "Generated voice audio is retrievable from Voice Kernel. URL: $audioUrl; bytes: $($audioResponse.RawContentLength)"
                Write-Host " PASS" -ForegroundColor Green
            }
            else {
                $results.voicePlayback.details = "Generated audio endpoint returned no content. URL: $audioUrl"
                Write-Host " FAIL" -ForegroundColor Yellow
            }
        }
        catch {
            $results.voicePlayback.details = "Generated audio retrieval failed: $($_.Exception.Message)"
            Write-Host " FAIL" -ForegroundColor Yellow
        }
    }
    else {
        $results.spokenResponse.details = "TTS response did not contain success/audio_path. Raw status: $($ttsRes.status)"
        $results.voicePlayback.details = "Skipped because spoken response did not return a valid audio path."
        Write-Host " FAIL" -ForegroundColor Red
    }
}
catch {
    $results.spokenResponse.details = "Synthesis request failed: $($_.Exception.Message)"
    $results.voicePlayback.details = "Skipped because spoken response failed."
    Write-Host " FAIL" -ForegroundColor Red
}
# --- 3. Mouse & Keyboard Routing ---
Write-Host "Checking Mouse/Keyboard Routing..." -NoNewline
$mouseBody = @{ x = 100; y = 100; confirm = $CONFIRM_TOKEN; dryRun = $true }
$mouseRes = Post-Json "$DesktopUrl/mouse/move" $mouseBody

$kbBody = @{ text = "verify"; confirm = $CONFIRM_TOKEN; dryRun = $true }
$kbRes = Post-Json "$DesktopUrl/keyboard/type" $kbBody

if ($mouseRes.ok -and $mouseRes.data.ok -and $kbRes.ok -and $kbRes.data.ok) {
    $results.mouseKeyboardRouting.ok = $true
    $results.mouseKeyboardRouting.details = "Mouse move and keyboard type routed successfully with dryRun."
    Write-Host " PASS" -ForegroundColor Green
} else {
    $results.mouseKeyboardRouting.details = "Mouse routing: $($mouseRes.ok) ($($mouseRes.error)). Keyboard routing: $($kbRes.ok) ($($kbRes.error))"
    Write-Host " FAIL" -ForegroundColor Red
}

# --- 4. Consent Block ---
Write-Host "Checking Consent Block..." -NoNewline
$consentBody = @{ x = 100; y = 100; confirm = "INVALID_TOKEN"; dryRun = $true }
$consentRes = Post-Json "$DesktopUrl/mouse/move" $consentBody
if ($consentRes.status -eq 403) {
    $results.consentBlock.ok = $true
    $results.consentBlock.details = "Consent block successfully rejected unauthorized request with HTTP 403."
    Write-Host " PASS" -ForegroundColor Green
} else {
    $results.consentBlock.details = "Expected HTTP 403, got status $($consentRes.status). Error: $($consentRes.error)"
    Write-Host " FAIL" -ForegroundColor Red
}

# --- 5. 3-Turn Continuity ---
Write-Host "Checking 3-Turn Continuity..." -NoNewline
$startRes = Post-Json "$RouterUrl/agent-lee/conversation/start" @{ mode = "live-conversation"; name = "GateTester" }
if ($startRes.ok -and $startRes.data.ok) {
    $sessionId = $startRes.data.session.sessionId
    $turn1 = Post-Json "$RouterUrl/agent-lee/conversation/turn" @{ sessionId = $sessionId; text = "Turn 1" } -TimeoutSec 180
    $turn2 = Post-Json "$RouterUrl/agent-lee/conversation/turn" @{ sessionId = $sessionId; text = "Turn 2" } -TimeoutSec 180
    $turn3 = Post-Json "$RouterUrl/agent-lee/conversation/turn" @{ sessionId = $sessionId; text = "Turn 3" } -TimeoutSec 180
    
    if ($turn1.ok -and $turn2.ok -and $turn3.ok) {
        # Fetch session state to verify turn count
        $sessionRes = Get-Json "$RouterUrl/agent-lee/conversation/session/$sessionId"
        if ($sessionRes.ok -and $sessionRes.data.ok) {
            # Session uses 'turnCount' (int) and 'history' (array), not 'turns'
            $session = $sessionRes.data.session
            $turnCount = if ($session.turnCount -gt 0) { $session.turnCount } `
                         elseif ($session.history) { @($session.history).Count } `
                         else { 0 }
            if ($turnCount -ge 3) {
                $results.threeTurnContinuity.ok = $true
                $results.threeTurnContinuity.details = "Verified 3-turn continuity. Session $sessionId contains $turnCount turns."
                Write-Host " PASS" -ForegroundColor Green
            } else {
                $results.threeTurnContinuity.details = "Session turn count is $turnCount, expected at least 3."
                Write-Host " FAIL (Turn count: $turnCount)" -ForegroundColor Red
            }
        } else {
            $results.threeTurnContinuity.details = "Failed to load session details: $($sessionRes.error)"
            Write-Host " FAIL (Session load failed)" -ForegroundColor Red
        }
    } else {
        $results.threeTurnContinuity.details = "Turn execution failed. T1: $($turn1.ok), T2: $($turn2.ok), T3: $($turn3.ok)"
        Write-Host " FAIL (Turn execution failed)" -ForegroundColor Red
    }
} else {
    $results.threeTurnContinuity.details = "Failed to start conversation session: $($startRes.error)"
    Write-Host " FAIL (Start session failed)" -ForegroundColor Red
}

# --- 6. Safe Desktop Task ---
Write-Host "Checking Safe Desktop Task..." -NoNewline
$winListBody = @{ confirm = $CONFIRM_TOKEN }
$winListRes = Post-Json "$DesktopUrl/window/list" $winListBody
if ($winListRes.ok -and $winListRes.data.ok) {
    $results.safeDesktopTask.ok = $true
    $results.safeDesktopTask.details = "Successfully listed open windows. Received $($winListRes.data.result.Count) windows."
    Write-Host " PASS" -ForegroundColor Green
} else {
    $results.safeDesktopTask.details = "Safe desktop task failed: $($winListRes.error)"
    Write-Host " FAIL" -ForegroundColor Red
}

return $results
