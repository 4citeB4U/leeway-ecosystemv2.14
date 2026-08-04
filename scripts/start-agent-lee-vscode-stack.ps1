param()

function Test-PortOpen($port) {
    try { $c = Test-NetConnection -ComputerName 127.0.0.1 -Port $port -WarningAction SilentlyContinue; return $c.TcpTestSucceeded } catch { return $false }
}

Write-Host "Starting Agent Lee VS Code stack (checks ports and launches start scripts)"

if (Test-PortOpen 8787) { Write-Host "adapter (8787) already listening" } else { Write-Host "adapter (8787) not listening" }
if (Test-PortOpen 8080) { Write-Host "router (8080) already listening" } else { Write-Host "router (8080) not listening" }
if (Test-PortOpen 4001) { Write-Host "runtime fabric (4001) already listening" } else { Write-Host "runtime fabric (4001) not listening" }
if (Test-PortOpen 8091) { Write-Host "desktop runtime (8091) already listening" } else { Write-Host "desktop runtime (8091) not listening" }

# Start adapter if not running
if (-not (Test-PortOpen 8787)) {
    $adapterStart = Join-Path $PSScriptRoot '..\.leeway-vscode\agent-lee-vscode-adapter\start-agent-lee-vscode-adapter.ps1'
    if (Test-Path $adapterStart) {
        Write-Host "Starting adapter via $adapterStart"
        Start-Process -FilePath powershell -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$adapterStart`""
    } else { Write-Host "Adapter start script not found: $adapterStart" }
}

# Try to start core stack (router/runtime) using repository start script
if (-not (Test-PortOpen 8080 -and Test-PortOpen 4001)) {
    $coreStart = Join-Path $PSScriptRoot '..\start-leeway-local-agent-stack.ps1'
    if (Test-Path $coreStart) {
        Write-Host "Starting core stack via $coreStart"
        Start-Process -FilePath powershell -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$coreStart`""
    } else { Write-Host "Core start script not found: $coreStart" }
}

Write-Host "Start script completed. Run the health check script to verify components."
