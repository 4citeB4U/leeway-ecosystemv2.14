[CmdletBinding()]
param(
    [int]$StartupTimeoutSec = 180
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Continue"

$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$ReceiptDir = Join-Path $Root "..\Archive\receipts"
New-Item -ItemType Directory -Force -Path $ReceiptDir | Out-Null

function Write-Receipt {
    param([object]$Payload)
    $path = Join-Path $ReceiptDir "agent-lee-startup-stack-$Stamp.json"
    try { $Payload | ConvertTo-Json -Depth 64 | Set-Content -Path $path -Encoding UTF8 } catch {}
    return $path
}

function Test-PortListen { 
    param([int]$Port) 
    try {
        return [bool](Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
    } catch {
        return $false
    }
}

function Wait-PortListen {
    param([int]$Port, [int]$TimeoutSec = 30)
    $deadline = (Get-Date).AddSeconds($TimeoutSec)
    while ((Get-Date) -lt $deadline) {
        if (Test-PortListen -Port $Port) { return $true }
        Start-Sleep -Milliseconds 500
    }
    return $false
}

# Initialize result structure
$result = [ordered]@{
    stamp = $Stamp
    ok = $false
    status = "INITIALIZING"
    error = $null
    startupTimedOut = $false
    startExitCode = $null
    services = @()
    adapterHealth = $null
    routerIdentity = $null
    tinyChat = $null
    survival = $null
}

try {
    # Kill stale owners on key ports
    $Ports = @(8787, 8080, 8091, 4001, 4000, 11434, 3000, 8765)
    $stopped = @()
    foreach ($p in $Ports) {
        try {
            $conns = Get-NetTCPConnection -LocalPort $p -ErrorAction SilentlyContinue
            foreach ($c in $conns) {
                try {
                    $procId = $c.OwningProcess
                    $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
                    if ($proc) {
                        $stopped += [ordered]@{ port = $p; pid = $procId; process = $proc.ProcessName }
                        Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
                    }
                } catch {}
            }
        } catch {}
    }

    # Start the stack with bounded timeout (2 minute hard limit)
    $launcher = Join-Path $Root "..\Start-AgentLee-Now.ps1"
    $startResult = @{ ok = $false; timedOut = $false; exitCode = $null; error = $null }
    $logOut = Join-Path $Root "..\Archive\logs\agent-lee-turbo-workflow\startup-launcher-$Stamp.stdout.log"
    $logErr = Join-Path $Root "..\Archive\logs\agent-lee-turbo-workflow\startup-launcher-$Stamp.stderr.log"
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $logOut) | Out-Null

    if (Test-Path -Path $launcher -PathType Leaf) {
        $startProc = Start-Process -FilePath "powershell.exe" `
            -ArgumentList @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "`"$launcher`"") `
            -RedirectStandardOutput $logOut `
            -RedirectStandardError $logErr `
            -PassThru

        $startExited = $startProc.WaitForExit(120000)  # 2 minute hard timeout
        $result.startExitCode = if ($startExited) { $startProc.ExitCode } else { $null }
        if (-not $startExited) {
            try { Stop-Process -Id $startProc.Id -Force -ErrorAction SilentlyContinue } catch {}
            $result.startupTimedOut = $true
            $result.error = "Startup launcher did not complete within 120 seconds."
        } else {
            $startResult.exitCode = $startProc.ExitCode
            $startResult.ok = ($startProc.ExitCode -eq 0)
        }
    } else {
        $startResult.error = "Launcher not found: $launcher"
    }
    $result.startResult = $startResult

    # Wait for required ports with hard deadline
    $deadline = (Get-Date).AddSeconds($StartupTimeoutSec)
    $required = @(8787, 8080)
    $portsReady = $false
    while ((Get-Date) -lt $deadline) {
        $allUp = $true
        foreach ($rp in $required) {
            if (-not (Test-PortListen -Port $rp)) { $allUp = $false }
        }
        if ($allUp) { $portsReady = $true; break }
        Start-Sleep -Milliseconds 500
    }
    
    if (-not $portsReady) {
        $result.error = "Required ports did not become available within $StartupTimeoutSec seconds."
    }

    # Collect service port status
    $checkPorts = @(8787, 8080, 8091, 4001, 4000, 8765, 11434, 3000)
    foreach ($p in $checkPorts) {
        try {
            $conn = Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
            if ($conn) {
                $procId = $conn.OwningProcess
                $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
                $cmd = ""
                try { $cmd = (Get-CimInstance Win32_Process -Filter "ProcessId=$procId").CommandLine } catch {}
                $result.services += [ordered]@{ port = $p; listening = $true; pid = $procId; process = $proc.ProcessName; commandLine = $cmd }
            } else {
                $result.services += [ordered]@{ port = $p; listening = $false; pid = $null; process = $null; commandLine = $null }
            }
        } catch {
            $result.services += [ordered]@{ port = $p; listening = $false; pid = $null; process = $null; commandLine = $null; error = $_.Exception.Message }
        }
    }

    # Check router identity (8080) with bounded timeout
    $routerProbe = @{ ok = $false; ms = 0 }
    try {
        $sw = [System.Diagnostics.Stopwatch]::StartNew()
        $resp = Invoke-WebRequest -Uri "http://127.0.0.1:8080/agent-lee/identity" -TimeoutSec 8 -UseBasicParsing -ErrorAction Stop
        $sw.Stop()
        $json = $null
        try { $json = $resp.Content | ConvertFrom-Json } catch {}
        $routerProbe = @{ ok = ($resp.StatusCode -eq 200); ms = [int]$sw.ElapsedMilliseconds; status = $resp.StatusCode; body = $json }
        $result.routerIdentity = $routerProbe
    } catch {
        $result.routerIdentity = @{ ok = $false; ms = 0; error = $_.Exception.Message }
    }

    # Check adapter health (8787) with bounded timeout
    $adapterProbe = @{ ok = $false; ms = 0 }
    try {
        $sw = [System.Diagnostics.Stopwatch]::StartNew()
        $resp = Invoke-WebRequest -Uri "http://127.0.0.1:8787/health" -TimeoutSec 8 -UseBasicParsing -ErrorAction Stop
        $sw.Stop()
        $json = $null
        try { $json = $resp.Content | ConvertFrom-Json } catch {}
        $adapterProbe = @{ ok = ($resp.StatusCode -eq 200); ms = [int]$sw.ElapsedMilliseconds; status = $resp.StatusCode; body = $json }
        $result.adapterHealth = $adapterProbe
    } catch {
        $result.adapterHealth = @{ ok = $false; ms = 0; error = $_.Exception.Message }
    }

    # Send tiny chat to adapter with bounded timeout
    $chatProbe = @{ ok = $false; ms = 0 }
    try {
        $sw = [System.Diagnostics.Stopwatch]::StartNew()
        $uri = "http://127.0.0.1:8787/v1/chat/completions"
        $body = @{
            model = "agent-lee-code-mode"
            stream = $false
            max_tokens = 16
            messages = @(@{ role = "user"; content = "Say only: ready." })
        } | ConvertTo-Json -Depth 20
        $resp = Invoke-WebRequest -Uri $uri -Method POST -Body $body -ContentType "application/json" -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop
        $sw.Stop()
        $json = $null
        try { $json = $resp.Content | ConvertFrom-Json } catch {}
        $chatProbe = @{ ok = ($resp.StatusCode -eq 200); ms = [int]$sw.ElapsedMilliseconds; status = $resp.StatusCode; body = $json }
        $result.tinyChat = $chatProbe
    } catch {
        $result.tinyChat = @{ ok = $false; ms = 0; error = $_.Exception.Message }
    }

    # Check survival: verify ports still alive after chat
    $result.survival = @{ adapter8787 = (Test-PortListen -Port 8787); router8080 = (Test-PortListen -Port 8080) }

    # Determine overall status
    $required8787 = $result.services | Where-Object { $_.port -eq 8787 -and $_.listening -eq $true }
    $required8080 = $result.services | Where-Object { $_.port -eq 8080 -and $_.listening -eq $true }
    $adapterHealthOk = $result.adapterHealth -and $result.adapterHealth.ok -eq $true
    $routerHealthOk = $result.routerIdentity -and $result.routerIdentity.ok -eq $true
    $chatOk = $result.tinyChat -and $result.tinyChat.ok -eq $true
    $survivalOk = $result.survival -and $result.survival.adapter8787 -and $result.survival.router8080

    $result.ok = ($required8787 -and $required8080 -and $adapterHealthOk -and $routerHealthOk -and $chatOk -and $survivalOk -and (-not $result.startupTimedOut))
    $result.status = if ($result.ok) { "READY" } elseif ($result.startupTimedOut) { "TIMEOUT" } elseif ($result.error) { "ERROR" } else { "DEGRADED" }

} catch {
    $result.status = "EXCEPTION"
    $result.error = $_.Exception.Message
    $result.ok = $false
} finally {
    $receipt = Write-Receipt -Payload $result
    Write-Host "Startup validation receipt: $receipt"
    if ($result.ok) {
        Write-Host "[OK] All checks passed. Adapter 8787 and Router 8080 operational." -ForegroundColor Green
        exit 0
    }
    Write-Host "[FAIL] Validation failed: $($result.status) - $($result.error)" -ForegroundColor Red
    exit 1
}

