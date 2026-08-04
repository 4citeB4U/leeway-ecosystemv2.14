<#
Orchestrate port-fix and service restart for Cerebral

This script performs the following actions:
- Runs the port-fix sweep (tools\port_fixup.py) to update built assets
- Stops existing Python processes (python, pythonw) that may be running the daemon
- Starts backend services (CerebralDaemon.py and cerebral_mcp_server.py) using the venv Python
- Starts frontend dev servers (agent-lee-os2 and Cerebral-os) as background processes
- Launches a health-check job that polls the daemon until it is healthy

Usage (PowerShell, run as repo root or from tools):
    pwsh tools\orchestrate_restart.ps1

CAUTION: This will stop all `python` and `pythonw` processes on the machine. If you
have unrelated Python processes running you may want to adjust the stop logic.
#>

Set-StrictMode -Version Latest

$RepoRoot = Resolve-Path "$(Split-Path -Parent $MyInvocation.MyCommand.Path)\.." | Select-Object -ExpandProperty Path
Write-Output "Repo root: $RepoRoot"

# Paths
$VenvPython = Join-Path $RepoRoot '.venv\Scripts\python.exe'
$VenvPythonW = Join-Path $RepoRoot '.venv\Scripts\pythonw.exe'
$PortFix = Join-Path $RepoRoot 'tools\port_fixup.py'

if (-not (Test-Path $VenvPython)) {
    Write-Warning "Virtualenv python not found at $VenvPython. Ensure venv exists and activate manually if needed." 
}

function Run-PortFix {
    Write-Output "[PortFix] Running port_fixup.py to update built assets..."
    if ((Test-Path $PortFix) -and (Test-Path $VenvPython)) {
        & $VenvPython $PortFix
        if ($LASTEXITCODE -eq 0) { Write-Output "[PortFix] Completed." } else { Write-Warning "[PortFix] Completed with exit code $LASTEXITCODE." }
    } else {
        Write-Warning "[PortFix] Missing $PortFix or $VenvPython; skipping port fix." 
    }
}

function Stop-PythonProcesses {
    Write-Output "[DaemonAgent] Stopping python/pythonw processes (force)..."
    Try {
        Get-Process -Name python,pythonw -ErrorAction SilentlyContinue | ForEach-Object {
            try { Stop-Process -Id $_.Id -Force -ErrorAction Stop; Write-Output "[DaemonAgent] Killed process Id=$($_.Id) Name=$($_.ProcessName)" } catch { Write-Warning "Failed to kill process Id=$($_.Id): $_" }
        }
    } catch {
        Write-Warning "[DaemonAgent] Error stopping python processes: $_"
    }
}

function Start-BackendServices {
    Write-Output "[DaemonAgent] Starting backend services (daemon + mcp server)..."
    $daemon = Join-Path $RepoRoot 'CerebralDaemon.py'
    $mcp = Join-Path $RepoRoot 'cerebral_mcp_server.py'

    if ((Test-Path $VenvPythonW) -and (Test-Path $daemon)) {
        Start-Process -FilePath $VenvPythonW -ArgumentList $daemon -WorkingDirectory $RepoRoot -WindowStyle Hidden
        Write-Output "[DaemonAgent] Launched CerebralDaemon.py"
    } else {
        Write-Warning "[DaemonAgent] Unable to start CerebralDaemon.py (missing pythonw or file)"
    }

    if ((Test-Path $VenvPythonW) -and (Test-Path $mcp)) {
        Start-Process -FilePath $VenvPythonW -ArgumentList $mcp -WorkingDirectory $RepoRoot -WindowStyle Hidden
        Write-Output "[DaemonAgent] Launched cerebral_mcp_server.py"
    } else {
        Write-Warning "[DaemonAgent] Unable to start cerebral_mcp_server.py (missing pythonw or file)"
    }
}

function Start-Frontends {
    Write-Output "[FrontendAgent] Starting frontend dev servers (agent-lee-os2 and Cerebral-os)..."
    $agentDir = Join-Path $RepoRoot 'agent-lee-os2'
    $cerebralOsDir = Join-Path $RepoRoot 'Cerebral-os'

    if (Test-Path $agentDir) {
        Start-Process -FilePath 'npm' -ArgumentList 'run','dev' -WorkingDirectory $agentDir -NoNewWindow -WindowStyle Hidden
        Write-Output "[FrontendAgent] Launched agent-lee-os2 dev server (npm run dev)"
    } else { Write-Warning "[FrontendAgent] Missing $agentDir" }

    if (Test-Path $cerebralOsDir) {
        Start-Process -FilePath 'npm' -ArgumentList 'run','dev' -WorkingDirectory $cerebralOsDir -NoNewWindow -WindowStyle Hidden
        Write-Output "[FrontendAgent] Launched Cerebral-os dev server (npm run dev)"
    } else { Write-Warning "[FrontendAgent] Missing $cerebralOsDir" }
}

function Start-HealthCheck {
    param(
        [string]$Url = 'http://127.0.0.1:8765/health',
        [int]$Retries = 15,
        [int]$DelaySec = 2
    )
    Write-Output "[HealthCheck] Polling $Url up to $Retries times..."
    for ($i=0; $i -lt $Retries; $i++) {
        try {
            $r = Invoke-RestMethod -Uri $Url -Method Get -TimeoutSec 2 -ErrorAction Stop
            Write-Output "[HealthCheck] OK: $($r | ConvertTo-Json -Depth 1)"
            return $true
        } catch {
            Write-Output "[HealthCheck] Attempt $($i+1) failed; retrying in $DelaySec sec..."
            Start-Sleep -Seconds $DelaySec
        }
    }
    Write-Warning "[HealthCheck] Daemon did not respond after $Retries attempts."
    return $false
}

# --- Main ---
Write-Output "Orchestration: running port-fix, restarting services, launching frontends..."

# 1) Run port fix synchronously
Run-PortFix

# 2) Launch DaemonAgent as a background job: stop processes then start services
Start-Job -Name DaemonAgent -ScriptBlock {
    param($RepoRoot, $VenvPython, $VenvPythonW)
    Set-Location $RepoRoot
    # stop and start
    Get-Process -Name python,pythonw -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue }
    Start-Process -FilePath $VenvPythonW -ArgumentList (Join-Path $RepoRoot 'CerebralDaemon.py') -WorkingDirectory $RepoRoot -WindowStyle Hidden
    Start-Process -FilePath $VenvPythonW -ArgumentList (Join-Path $RepoRoot 'cerebral_mcp_server.py') -WorkingDirectory $RepoRoot -WindowStyle Hidden
    Write-Output "[DaemonAgent-job] Started backend processes"
} -ArgumentList $RepoRoot, $VenvPython, $VenvPythonW | Out-Null

# 3) Launch FrontendAgent as a background job
Start-Job -Name FrontendAgent -ScriptBlock {
    param($RepoRoot)
    Set-Location $RepoRoot
    if (Test-Path (Join-Path $RepoRoot 'agent-lee-os2')) {
        Start-Process -FilePath 'npm' -ArgumentList 'run','dev' -WorkingDirectory (Join-Path $RepoRoot 'agent-lee-os2') -WindowStyle Hidden
    }
    if (Test-Path (Join-Path $RepoRoot 'Cerebral-os')) {
        Start-Process -FilePath 'npm' -ArgumentList 'run','dev' -WorkingDirectory (Join-Path $RepoRoot 'Cerebral-os') -WindowStyle Hidden
    }
    Write-Output "[FrontendAgent-job] Launched frontends (if available)"
} -ArgumentList $RepoRoot | Out-Null

# 4) Start a short health-check job (runs in foreground here)
Start-Job -Name HealthCheck -ScriptBlock { param($u) & { Start-Sleep -Seconds 1 } } -ArgumentList 'dummy' | Out-Null
Write-Output "Waiting for backend to come up..."
Start-Sleep -Seconds 2
Start-HealthCheck -Url 'http://127.0.0.1:8765/health' -Retries 20 -DelaySec 2

Write-Output "Orchestration complete. Use Get-Job to inspect background jobs or Get-Process to view running processes."
