# start-desktop-runtime.ps1
# Leeway Ecosystem v2.1.4 — Desktop Runtime Startup Script
#
# Usage: .\start-desktop-runtime.ps1
# Starts the Agent Lee Desktop Runtime on port 8091.

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$WorkspaceRoot = Split-Path -Parent (Split-Path -Parent $ScriptDir)
$ReceiptsRoot = Join-Path $WorkspaceRoot "Archive\receipts"

$StartedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
$Timestamp = (Get-Date).ToString("yyyyMMdd-HHmmss")

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host " Agent Lee Desktop Runtime Startup" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host " Working dir: $ScriptDir"
Write-Host " Port: 8091"
Write-Host " Start time: $StartedAt"
Write-Host ""

# Verify server.mjs exists
$serverFile = Join-Path $ScriptDir "server.mjs"
if (-not (Test-Path $serverFile)) {
    Write-Host "ERROR: server.mjs not found at $serverFile" -ForegroundColor Red
    exit 1
}

# Verify node is available
try {
    $nodeVersion = & node --version 2>&1
    Write-Host " Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: node.exe not found in PATH. Install Node.js first." -ForegroundColor Red
    exit 1
}

# Check if something is already on 8091
$portInUse = $false
try {
    $conn = (Get-NetTCPConnection -LocalPort 8091 -ErrorAction SilentlyContinue)
    if ($conn) {
        Write-Host " WARNING: Port 8091 already in use by PID $($conn[0].OwningProcess)" -ForegroundColor Yellow
        $portInUse = $true
    }
} catch {}

if ($portInUse) {
    Write-Host " Stopping existing process on 8091..." -ForegroundColor Yellow
    try {
        $conn = Get-NetTCPConnection -LocalPort 8091 -ErrorAction SilentlyContinue
        if ($conn) { Stop-Process -Id $conn[0].OwningProcess -Force -ErrorAction SilentlyContinue }
        Start-Sleep -Seconds 1
    } catch {}
}

# Set environment variables
$env:AGENT_LEE_DESKTOP_RUNTIME_PORT = "8091"
$env:NODE_ENV = "development"
$env:AGENT_LEE_SPEAKER_PROFILE = "default-local-speakers"
$env:AGENT_LEE_SPEAKER_VOLUME = "0.95"

Write-Host ""
Write-Host " Starting: node server.mjs" -ForegroundColor Green
Write-Host " Press Ctrl+C to stop." -ForegroundColor Gray
Write-Host ""

# Write startup receipt
try {
    New-Item -ItemType Directory -Force -Path $ReceiptsRoot | Out-Null
    $receipt = [ordered]@{
        schema       = "leeway.receipt.v1"
        action       = "desktop-runtime-start"
        status       = "STARTED"
        startedAt    = $StartedAt
        endedAt      = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        agent        = [ordered]@{ agentId = "agent-lee"; agentMode = "code-mode" }
        controlSurface = "direct-powershell"
        result       = [ordered]@{
            ok        = $true
            port      = 8091
            scriptDir = $ScriptDir
            nodeVersion = $nodeVersion
        }
        metadata     = [ordered]@{
            note = "DIAGNOSTIC_ONLY_NOT_OFFICIAL: started via PowerShell, not VS Code Chat -> 8787 -> 8081"
        }
    }
    $receiptPath = Join-Path $ReceiptsRoot "desktop-runtime-start-$Timestamp.json"
    $receipt | ConvertTo-Json -Depth 10 | Set-Content -Path $receiptPath -Encoding UTF8
    Write-Host " Receipt: $receiptPath" -ForegroundColor Gray
} catch {
    Write-Warning "Could not write startup receipt: $($_.Exception.Message)"
}

# Launch node — this is blocking (foreground)
Set-Location $ScriptDir
& node server.mjs
