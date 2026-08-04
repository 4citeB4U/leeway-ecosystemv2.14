# ============================================================
# Start-AgentLeeAdaptiveCreationPreloaderV13_6.ps1
#
# Adaptive worker:
# - Detects creative session control.
# - Warms model before image requests.
# - Keeps one live Creation Kernel warm.
# - Never builds/restarts Docker.
# ============================================================

param(
    [string]$Root = "D:\Leeway-Ecosystem v2.1.4",
    [int]$IdleIntervalSeconds = 180,
    [int]$ActiveIntervalSeconds = 45,
    [int]$WarmupTimeoutSeconds = 900
)

$ErrorActionPreference = "Continue"

$DiscoveryDir = Join-Path $Root "agent-lee-coding-mode\discovery-layer"
$RuntimeConfigDir = Join-Path $Root "agent-lee-coding-mode\runtime-fabric"
$DesktopConfigDir = Join-Path $Root "agent-lee-coding-mode\desktop-runtime"
$ArchiveDir = Join-Path $Root "Archive"
$ProofRoot = Join-Path $ArchiveDir "proofs\agent-lee-adaptive-creation-preloader-current"
$LogDir = Join-Path $ProofRoot "logs"
$SnapshotDir = Join-Path $ProofRoot "snapshots"

foreach ($d in @($DiscoveryDir, $RuntimeConfigDir, $DesktopConfigDir, $ProofRoot, $LogDir, $SnapshotDir)) {
    New-Item -ItemType Directory -Force -Path $d | Out-Null
}

$ControlPath = Join-Path $DiscoveryDir "agent-lee-creative-session-control.json"
$StatePath = Join-Path $DiscoveryDir "agent-lee-adaptive-creation-preloader-state.json"
$RuntimeMirrorPath = Join-Path $RuntimeConfigDir "adaptive-creation-preloader-state.json"
$DesktopMirrorPath = Join-Path $DesktopConfigDir "adaptive-creation-preloader-state.json"
$JournalPath = Join-Path $LogDir "adaptive-creation-preloader-events.jsonl"
$WarmupLockPath = Join-Path $ProofRoot "warmup.lock"

function Write-JsonFile {
    param([string]$Path, $Object)

    try {
        $utf8 = New-Object System.Text.UTF8Encoding($false)
        [System.IO.File]::WriteAllText($Path, ($Object | ConvertTo-Json -Depth 80), $utf8)
        return $true
    } catch {
        return $false
    }
}

function Add-Journal {
    param($Object)
    Add-Content -Path $JournalPath -Value ($Object | ConvertTo-Json -Compress -Depth 60) -Encoding UTF8
}

function Invoke-GetSafe {
    param([string]$Uri, [int]$TimeoutSec = 20)

    try {
        return Invoke-RestMethod -Uri $Uri -TimeoutSec $TimeoutSec
    } catch {
        return [ordered]@{
            status = "BLOCKED"
            error = $_.Exception.Message
        }
    }
}

function Invoke-PostSafe {
    param([string]$Uri, [int]$TimeoutSec = 900)

    try {
        return Invoke-RestMethod -Uri $Uri -Method POST -TimeoutSec $TimeoutSec
    } catch {
        return [ordered]@{
            status = "BLOCKED"
            error = $_.Exception.Message
        }
    }
}

function Get-CreativeControl {
    if (Test-Path $ControlPath) {
        try {
            return Get-Content $ControlPath -Raw | ConvertFrom-Json
        } catch {}
    }

    return [pscustomobject]@{
        creativeSessionActive = $false
        requestedMode = "IDLE_STANDBY"
        reason = "No control file found."
    }
}

function Test-WarmupLockActive {
    if (-not (Test-Path $WarmupLockPath)) {
        return $false
    }

    try {
        $lockAge = (Get-Date) - (Get-Item $WarmupLockPath).LastWriteTime
        if ($lockAge.TotalMinutes -gt 30) {
            Remove-Item $WarmupLockPath -Force -ErrorAction SilentlyContinue
            return $false
        }
    } catch {}

    return $true
}

function Set-WarmupLock {
    Set-Content -Path $WarmupLockPath -Value (Get-Date).ToUniversalTime().ToString("o") -Encoding UTF8
}

function Clear-WarmupLock {
    Remove-Item $WarmupLockPath -Force -ErrorAction SilentlyContinue
}

while ($true) {
    $cycleStamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $now = (Get-Date).ToUniversalTime().ToString("o")

    $control = Get-CreativeControl

    $creativeActive = $false
    $requestedMode = "IDLE_STANDBY"

    try {
        $creativeActive = [bool]$control.creativeSessionActive
        $requestedMode = [string]$control.requestedMode
    } catch {}

    $health = Invoke-GetSafe "http://127.0.0.1:8094/health" 20
    $statusBefore = Invoke-GetSafe "http://127.0.0.1:8094/status" 20

    $serviceReady = ($health.status -eq "READY" -or $health.kernel -eq "agent-lee-creation-kernel")

    $pipeLoaded = $false
    try {
        $pipeLoaded = [bool]$statusBefore.pipe_loaded
    } catch {}

    $action = "NO_ACTION"
    $warmup = $null
    $lockActive = Test-WarmupLockActive

    $shouldWarm = $false

    if ($serviceReady -and -not $pipeLoaded) {
        if ($creativeActive) {
            $shouldWarm = $true
            $action = "CREATIVE_SESSION_PREWARM"
        } elseif ($requestedMode -eq "HOT_CREATION_MODE") {
            $shouldWarm = $true
            $action = "HOT_MODE_PREWARM"
        } elseif ($requestedMode -eq "PRELOAD_NEXT_IMAGE") {
            $shouldWarm = $true
            $action = "PREDICTIVE_PREWARM"
        } else {
            $action = "STANDBY_NO_WARM"
        }
    } elseif ($serviceReady -and $pipeLoaded) {
        if ($creativeActive -or $requestedMode -eq "HOT_CREATION_MODE") {
            $action = "ALREADY_WARM_ACTIVE"
        } else {
            $action = "ALREADY_WARM_IDLE"
        }
    } else {
        $action = "SERVICE_NOT_READY"
    }

    if ($shouldWarm -and -not $lockActive) {
        Set-WarmupLock
        try {
            $warmup = Invoke-PostSafe "http://127.0.0.1:8094/warmup" $WarmupTimeoutSeconds
        } finally {
            Clear-WarmupLock
        }
    } elseif ($shouldWarm -and $lockActive) {
        $action = "WARMUP_ALREADY_IN_PROGRESS"
    }

    $statusAfter = Invoke-GetSafe "http://127.0.0.1:8094/status" 20

    $afterLoaded = $false
    try {
        $afterLoaded = [bool]$statusAfter.pipe_loaded
    } catch {}

    $truth = if ($serviceReady -and $afterLoaded) {
        "CREATION_MODEL_HOT_READY"
    } elseif ($serviceReady -and -not $afterLoaded) {
        "CREATION_SERVICE_READY_MODEL_STANDBY"
    } else {
        "CREATION_CHECK_REQUIRED"
    }

    $state = [ordered]@{
        schema = "agent-lee-adaptive-creation-preloader-state-v13-6"
        updatedAt = $now
        authority = "Discovery Layer"
        baseUrl = "http://127.0.0.1:8094"
        mode = "ADAPTIVE_PRELOAD_AND_KEEP_WARM"
        requestedMode = $requestedMode
        creativeSessionActive = $creativeActive
        action = $action
        serviceReady = $serviceReady
        pipeLoadedBefore = $pipeLoaded
        pipeLoadedAfter = $afterLoaded
        health = $health
        statusBefore = $statusBefore
        warmup = $warmup
        statusAfter = $statusAfter
        currentTruth = $truth
        speedTruth = "Under-one-second cold load is not guaranteed on CPU. Near-instant readiness comes from prewarming before the request."
        packageTruth = "Metadata, tags, receipts, and documents should start immediately while image rendering runs."
        guardrails = @(
            "No Docker build.",
            "No Docker restart.",
            "No duplicate Creation Kernel.",
            "No second SDXL pipeline.",
            "No fake instant-generation claim.",
            "3D remains source-patched and build-held."
        )
    }

    Write-JsonFile $StatePath $state | Out-Null
    Write-JsonFile $RuntimeMirrorPath $state | Out-Null
    Write-JsonFile $DesktopMirrorPath $state | Out-Null

    $snapshotPath = Join-Path $SnapshotDir "adaptive-preloader-$cycleStamp.json"
    Write-JsonFile $snapshotPath $state | Out-Null

    Add-Journal $state

    Write-Host ("[{0}] Adaptive preloader: {1} | mode={2} | before={3} | after={4}" -f (Get-Date -Format "HH:mm:ss"), $action, $requestedMode, $statusBefore.status, $statusAfter.status) -ForegroundColor Green

    if ($creativeActive -or $requestedMode -eq "HOT_CREATION_MODE" -or $requestedMode -eq "PRELOAD_NEXT_IMAGE") {
        Start-Sleep -Seconds $ActiveIntervalSeconds
    } else {
        Start-Sleep -Seconds $IdleIntervalSeconds
    }
}
