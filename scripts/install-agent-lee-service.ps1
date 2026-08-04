# Install Agent Lee Windows Service
# Requires Administrator privileges

$Root = "D:\Leeway-Ecosystem v2.1.4"
$ServiceScript = Join-Path $Root "agent-lee-coding-mode\runtime\agent-lee-service.py"

Write-Host ""
Write-Host "====================================="
Write-Host " Agent Lee Service Installation"
Write-Host "====================================="
Write-Host ""

# Check if running as administrator
$IsAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $IsAdmin) {
    Write-Host "[ERROR] This script requires Administrator privileges"
    Write-Host ""
    Write-Host "Please run PowerShell as Administrator and try again:"
    Write-Host "  Right-click PowerShell -> Run as Administrator"
    Write-Host ""
    exit 1
}

Write-Host "[OK] Running with Administrator privileges"
Write-Host ""

# Check if pywin32 is installed
Write-Host "[->] Checking pywin32 installation..."

try {
    $PyWin32Check = python -c "import win32serviceutil; print('installed')" 2>&1
    
    if ($PyWin32Check -match "installed") {
        Write-Host "[OK] pywin32 is installed"
    }
    else {
        Write-Host "[->] Installing pywin32..."
        python -m pip install pywin32
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "[ERROR] Failed to install pywin32"
            exit 1
        }
        
        Write-Host "[OK] pywin32 installed successfully"
    }
}
catch {
    Write-Host "[ERROR] Python or pip not available"
    Write-Host "    $($_.Exception.Message)"
    exit 1
}

Write-Host ""

# Check if service script exists
if (-not (Test-Path $ServiceScript)) {
    Write-Host "[ERROR] Service script not found:"
    Write-Host "    $ServiceScript"
    exit 1
}

Write-Host "[OK] Service script found"
Write-Host ""

# Check if service already exists
$ExistingService = Get-Service -Name "AgentLee" -ErrorAction SilentlyContinue

if ($ExistingService) {
    Write-Host "[->] Service already exists, removing..."
    
    # Stop service if running
    if ($ExistingService.Status -eq "Running") {
        Write-Host "[->] Stopping existing service..."
        Stop-Service -Name "AgentLee" -Force
        Start-Sleep -Seconds 2
    }
    
    # Remove service
    python $ServiceScript remove
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Failed to remove existing service"
        exit 1
    }
    
    Write-Host "[OK] Existing service removed"
    Start-Sleep -Seconds 2
}

# Install service
Write-Host "[->] Installing Agent Lee service..."

python $ServiceScript install

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Service installation failed"
    exit 1
}

Write-Host "[OK] Service installed successfully"
Write-Host ""

# Configure service to auto-start
Write-Host "[->] Configuring service for automatic startup..."

Set-Service -Name "AgentLee" -StartupType Automatic

Write-Host "[OK] Service configured for automatic startup"
Write-Host ""

# Start service
Write-Host "[->] Starting Agent Lee service..."

Start-Service -Name "AgentLee"

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to start service"
    exit 1
}

Start-Sleep -Seconds 2

# Verify service is running
$Service = Get-Service -Name "AgentLee"

if ($Service.Status -eq "Running") {
    Write-Host "[OK] Service is running"
    Write-Host ""
    Write-Host "====================================="
    Write-Host " Installation Complete"
    Write-Host "====================================="
    Write-Host ""
    Write-Host "Service Name:    AgentLee"
    Write-Host "Display Name:    Agent Lee Autonomous Runtime"
    Write-Host "Status:          $($Service.Status)"
    Write-Host "Startup Type:    Automatic"
    Write-Host ""
    Write-Host "Service logs:    Archive\receipts\service-logs\"
    Write-Host ""
}
else {
    Write-Host "[ERROR] Service installed but not running"
    Write-Host "    Status: $($Service.Status)"
    exit 1
}

# Made with Bob
