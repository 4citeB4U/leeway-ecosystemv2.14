# Start Leeway Single-Brain Architecture
# 
# This script starts all three layers in the correct order:
# 1. Execution Broker (5200) - THE MUSCLE
# 2. Runtime Fabric (4001) - THE BRAIN
# 3. Agent Lee OS2 (5100) - THE FACE
#
# Then optionally starts the minimal supervisor

$ErrorActionPreference = "Stop"

$ROOT = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$TIMESTAMP = Get-Date -Format "yyyyMMdd-HHmmss"
$LOG_DIR = Join-Path $ROOT "logs\startup"

# Ensure log directory exists
if (-not (Test-Path $LOG_DIR)) {
    New-Item -ItemType Directory -Path $LOG_DIR -Force | Out-Null
}

$STARTUP_LOG = Join-Path $LOG_DIR "startup-$TIMESTAMP.log"

function Write-Log {
    param([string]$Message, [string]$Color = "White")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] $Message"
    Write-Host $logMessage -ForegroundColor $Color
    Add-Content -Path $STARTUP_LOG -Value $logMessage
}

function Test-ServiceHealth {
    param([string]$Url, [int]$TimeoutSec = 5)
    try {
        $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec $TimeoutSec -ErrorAction Stop
        return $response.StatusCode -eq 200
    } catch {
        return $false
    }
}

Write-Log "=" * 80 "Cyan"
Write-Log "Leeway Single-Brain Architecture Startup" "Cyan"
Write-Log "=" * 80 "Cyan"
Write-Log "Build Order:" "Yellow"
Write-Log "  1. Execution Broker (5200) - THE MUSCLE" "Yellow"
Write-Log "  2. Runtime Fabric (4001) - THE BRAIN" "Yellow"
Write-Log "  3. Agent Lee OS2 (5100) - THE FACE" "Yellow"
Write-Log "=" * 80 "Cyan"

# Step 1: Start Execution Broker
Write-Log ""
Write-Log "Step 1: Starting Execution Broker (5200)..." "Green"
Write-Log "-" * 80 "Gray"

$brokerScript = Join-Path $ROOT "Leeway Runtime Fabric\execution-broker\start-execution-broker.ps1"
if (-not (Test-Path $brokerScript)) {
    Write-Log "✗ Execution Broker script not found: $brokerScript" "Red"
    exit 1
}

Start-Process -FilePath "powershell.exe" `
    -ArgumentList "-ExecutionPolicy", "Bypass", "-File", $brokerScript `
    -NoNewWindow

Write-Log "Waiting for Execution Broker to start..." "Gray"
Start-Sleep -Seconds 5

if (Test-ServiceHealth "http://127.0.0.1:5200/health") {
    Write-Log "✓ Execution Broker is running on port 5200" "Green"
} else {
    Write-Log "✗ Execution Broker failed to start" "Red"
    Write-Log "Check logs in: Leeway Runtime Fabric\execution-broker\logs\" "Yellow"
    exit 1
}

# Step 2: Start Runtime Fabric
Write-Log ""
Write-Log "Step 2: Starting Runtime Fabric (4001)..." "Green"
Write-Log "-" * 80 "Gray"

$fabricScript = Join-Path $ROOT "Leeway Runtime Fabric\scripts\start-runtime-fabric.ps1"
if (-not (Test-Path $fabricScript)) {
    Write-Log "✗ Runtime Fabric script not found: $fabricScript" "Red"
    Write-Log "Note: You may need to create this script or start manually with:" "Yellow"
    Write-Log "  cd 'Leeway Runtime Fabric'" "Yellow"
    Write-Log "  npm run start:server" "Yellow"
    
    # Try alternative start method
    Write-Log "Attempting alternative start method..." "Yellow"
    Push-Location (Join-Path $ROOT "Leeway Runtime Fabric")
    Start-Process -FilePath "powershell.exe" `
        -ArgumentList "-Command", "npm run start:server" `
        -NoNewWindow
    Pop-Location
} else {
    Start-Process -FilePath "powershell.exe" `
        -ArgumentList "-ExecutionPolicy", "Bypass", "-File", $fabricScript `
        -NoNewWindow
}

Write-Log "Waiting for Runtime Fabric to start..." "Gray"
Start-Sleep -Seconds 10

if (Test-ServiceHealth "http://127.0.0.1:4001/health") {
    Write-Log "✓ Runtime Fabric is running on port 4001" "Green"
    
    # Check if Health Orchestrator is integrated
    if (Test-ServiceHealth "http://127.0.0.1:4001/health/snapshot") {
        Write-Log "✓ Health Orchestrator is integrated" "Green"
    } else {
        Write-Log "⚠ Health Orchestrator not integrated yet" "Yellow"
        Write-Log "  Apply integration patch from:" "Yellow"
        Write-Log "  Leeway Runtime Fabric\server\HEALTH-ORCHESTRATOR-INTEGRATION-PATCH.md" "Yellow"
    }
} else {
    Write-Log "✗ Runtime Fabric failed to start" "Red"
    Write-Log "Check logs in: Leeway Runtime Fabric\logs\" "Yellow"
    exit 1
}

# Step 3: Start Agent Lee OS2
Write-Log ""
Write-Log "Step 3: Starting Agent Lee OS2 (5100)..." "Green"
Write-Log "-" * 80 "Gray"

$os2Script = Join-Path $ROOT "agent-lee-os2\start-agent-lee-os2.ps1"
if (-not (Test-Path $os2Script)) {
    Write-Log "✗ Agent Lee OS2 script not found: $os2Script" "Red"
    exit 1
}

Start-Process -FilePath "powershell.exe" `
    -ArgumentList "-ExecutionPolicy", "Bypass", "-File", $os2Script `
    -NoNewWindow

Write-Log "Waiting for Agent Lee OS2 to start..." "Gray"
Start-Sleep -Seconds 5

if (Test-ServiceHealth "http://127.0.0.1:5100/health") {
    Write-Log "✓ Agent Lee OS2 is running on port 5100" "Green"
} else {
    Write-Log "✗ Agent Lee OS2 failed to start" "Red"
    Write-Log "Check logs in: agent-lee-os2\logs\" "Yellow"
    exit 1
}

# Summary
Write-Log ""
Write-Log "=" * 80 "Cyan"
Write-Log "Startup Complete!" "Green"
Write-Log "=" * 80 "Cyan"
Write-Log ""
Write-Log "Services Running:" "White"
Write-Log "  ✓ Execution Broker:  http://127.0.0.1:5200" "Green"
Write-Log "  ✓ Runtime Fabric:    http://127.0.0.1:4001" "Green"
Write-Log "  ✓ Agent Lee OS2:     http://127.0.0.1:5100" "Green"
Write-Log ""
Write-Log "Architecture:" "White"
Write-Log "  Runtime Fabric (4001) - THE BRAIN" "Cyan"
Write-Log "    ↓ monitors everything" "Gray"
Write-Log "    ↓ decides failures" "Gray"
Write-Log "    ↓ emits events" "Gray"
Write-Log "    ↓ requests actions" "Gray"
Write-Log ""
Write-Log "  Execution Broker (5200) - THE MUSCLE" "Cyan"
Write-Log "    ↓ ONLY system actor" "Gray"
Write-Log "    ↓ executes commands" "Gray"
Write-Log "    ↓ generates receipts" "Gray"
Write-Log ""
Write-Log "  Agent Lee OS2 (5100) - THE FACE" "Cyan"
Write-Log "    ↓ displays status" "Gray"
Write-Log "    ↓ provides chat" "Gray"
Write-Log "    ↓ generates voice" "Gray"
Write-Log "    ↓ ZERO execution authority" "Gray"
Write-Log ""
Write-Log "=" * 80 "Cyan"

# Ask about supervisor
Write-Log ""
$startSupervisor = Read-Host "Start minimal supervisor? (monitors Runtime Fabric only) [y/N]"
if ($startSupervisor -eq "y" -or $startSupervisor -eq "Y") {
    Write-Log ""
    Write-Log "Starting minimal supervisor..." "Yellow"
    
    $supervisorScript = Join-Path $ROOT "scripts\supervisor-runtime-fabric-only.ps1"
    if (Test-Path $supervisorScript) {
        Start-Process -FilePath "powershell.exe" `
            -ArgumentList "-ExecutionPolicy", "Bypass", "-File", $supervisorScript `
            -NoNewWindow
        
        Write-Log "✓ Supervisor started (monitors Runtime Fabric only)" "Green"
        Write-Log "  Check logs in: logs\supervisor\" "Gray"
    } else {
        Write-Log "✗ Supervisor script not found: $supervisorScript" "Red"
    }
}

Write-Log ""
Write-Log "Leeway Single-Brain Architecture is ready." "Cyan"
Write-Log "Log file: $STARTUP_LOG" "Gray"

# Made with Bob
