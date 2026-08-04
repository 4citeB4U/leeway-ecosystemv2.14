# Agent Lee OS2 Startup Script
# Port: 5100
# Authority: ZERO - READ-ONLY DISPLAY

$ErrorActionPreference = "Stop"

$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
$LOG_DIR = Join-Path $SCRIPT_DIR "logs"
$TIMESTAMP = Get-Date -Format "yyyyMMdd-HHmmss"

# Ensure log directory exists
if (-not (Test-Path $LOG_DIR)) {
    New-Item -ItemType Directory -Path $LOG_DIR -Force | Out-Null
}

$STDOUT_LOG = Join-Path $LOG_DIR "agent-lee-os2-$TIMESTAMP.stdout.log"
$STDERR_LOG = Join-Path $LOG_DIR "agent-lee-os2-$TIMESTAMP.stderr.log"

Write-Host "[Agent Lee OS2] Starting Agent Lee OS2..." -ForegroundColor Cyan
Write-Host "[Agent Lee OS2] Port: 5100" -ForegroundColor Cyan
Write-Host "[Agent Lee OS2] Authority: ZERO - READ-ONLY DISPLAY" -ForegroundColor Yellow
Write-Host "[Agent Lee OS2] Logs: $LOG_DIR" -ForegroundColor Gray

# Check if port 5100 is already in use
$portCheck = Get-NetTCPConnection -LocalPort 5100 -ErrorAction SilentlyContinue
if ($portCheck) {
    Write-Host "[Agent Lee OS2] Port 5100 already in use. Stopping existing process..." -ForegroundColor Yellow
    $processId = $portCheck.OwningProcess
    Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}

# Check Python installation
$pythonCmd = Get-Command python -ErrorAction SilentlyContinue
if (-not $pythonCmd) {
    Write-Host "[Agent Lee OS2] ✗ Python not found. Please install Python 3.11+" -ForegroundColor Red
    exit 1
}

$pythonVersion = & python --version 2>&1
Write-Host "[Agent Lee OS2] Python: $pythonVersion" -ForegroundColor Gray

# Check if virtual environment exists
$venvPath = Join-Path $SCRIPT_DIR ".venv"
if (-not (Test-Path $venvPath)) {
    Write-Host "[Agent Lee OS2] Creating virtual environment..." -ForegroundColor Yellow
    python -m venv $venvPath
}

# Activate virtual environment
$activateScript = Join-Path $venvPath "Scripts\Activate.ps1"
if (Test-Path $activateScript) {
    & $activateScript
} else {
    Write-Host "[Agent Lee OS2] ✗ Failed to find activation script" -ForegroundColor Red
    exit 1
}

# Install/upgrade dependencies
Write-Host "[Agent Lee OS2] Installing dependencies..." -ForegroundColor Yellow
pip install -q -r requirements.txt

# Start the server
Write-Host "[Agent Lee OS2] Launching server..." -ForegroundColor Green

Push-Location $SCRIPT_DIR

$process = Start-Process -FilePath "python" `
    -ArgumentList "server.py" `
    -RedirectStandardOutput $STDOUT_LOG `
    -RedirectStandardError $STDERR_LOG `
    -NoNewWindow `
    -PassThru

Pop-Location

# Wait for startup
Start-Sleep -Seconds 3

# Verify it's running
try {
    $response = Invoke-WebRequest -Uri "http://127.0.0.1:5100/health" -UseBasicParsing -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Host "[Agent Lee OS2] ✓ Running on http://127.0.0.1:5100" -ForegroundColor Green
        Write-Host "[Agent Lee OS2] ✓ Process ID: $($process.Id)" -ForegroundColor Green
        Write-Host "[Agent Lee OS2] ✓ Authority: ZERO - READ-ONLY DISPLAY" -ForegroundColor Green
        Write-Host "[Agent Lee OS2] ✓ Polling Runtime Fabric: http://127.0.0.1:4001" -ForegroundColor Green
    }
} catch {
    Write-Host "[Agent Lee OS2] ✗ Failed to start or health check failed" -ForegroundColor Red
    Write-Host "[Agent Lee OS2] Check logs: $STDERR_LOG" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Agent Lee OS2 is ready." -ForegroundColor Cyan
Write-Host "This is a READ-ONLY display surface with ZERO execution authority." -ForegroundColor Yellow
Write-Host "All system operations route through Execution Broker (5200)." -ForegroundColor Yellow

# Made with Bob
