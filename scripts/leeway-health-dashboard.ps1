# leeway-health-dashboard.ps1
# Leeway Ecosystem v2.1.4 — Live Health Dashboard
#
# Usage: .\leeway-health-dashboard.ps1
# Prints a formatted table of all Leeway services with live status.

$ErrorActionPreference = "Continue"

$StartedAt = Get-Date

Write-Host ""
Write-Host " ██╗     ███████╗███████╗██╗    ██╗ █████╗ ██╗   ██╗" -ForegroundColor Cyan
Write-Host " ██║     ██╔════╝██╔════╝██║    ██║██╔══██╗╚██╗ ██╔╝" -ForegroundColor Cyan
Write-Host " ██║     █████╗  █████╗  ██║ █╗ ██║███████║ ╚████╔╝ " -ForegroundColor Cyan
Write-Host " ██║     ██╔══╝  ██╔══╝  ██║███╗██║██╔══██║  ╚██╔╝  " -ForegroundColor Cyan
Write-Host " ███████╗███████╗███████╗╚███╔███╔╝██║  ██║   ██║   " -ForegroundColor Cyan
Write-Host " ╚══════╝╚══════╝╚══════╝ ╚══╝╚══╝ ╚═╝  ╚═╝   ╚═╝   " -ForegroundColor Cyan
Write-Host ""
Write-Host " Health Dashboard — Leeway Ecosystem v2.1.4" -ForegroundColor White
Write-Host " $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
Write-Host ""

function Get-ServiceStatus {
    param([string]$Name, [string]$Url, [string]$Label, [int]$Timeout = 5)
    $started = Get-Date
    try {
        $r = Invoke-WebRequest -Uri $Url -TimeoutSec $Timeout -UseBasicParsing -ErrorAction Stop
        $ms = [int]((Get-Date) - $started).TotalMilliseconds
        $content = $null
        try { $content = $r.Content | ConvertFrom-Json } catch {}
        $info = ""
        if ($content) {
            if ($content.status) { $info = $content.status }
            elseif ($content.ok) { $info = "ok:true" }
            if ($content.models) { $info = "$($content.models.Count) models" }
        }
        return [ordered]@{
            Name   = $Label
            Port   = ($Url -replace '.*:(\d+).*','$1')
            Status = "✅ LIVE"
            Ping   = "${ms}ms"
            Info   = $info
        }
    } catch {
        $ms = [int]((Get-Date) - $started).TotalMilliseconds
        return [ordered]@{
            Name   = $Label
            Port   = ($Url -replace '.*:(\d+).*','$1')
            Status = "❌ DEAD"
            Ping   = "${ms}ms"
            Info   = ($_.Exception.Message -replace '\r?\n','')[-0..[System.Math]::Min(60, ($_.Exception.Message.Length-1))] -join ""
        }
    }
}

# Probe all services
Write-Host " Probing services..." -ForegroundColor Gray

$services = @(
    Get-ServiceStatus "runtimeFabric"  "http://127.0.0.1:4001/health"        "Runtime Fabric"
    Get-ServiceStatus "router"         "http://127.0.0.1:8081/health"        "Router"
    Get-ServiceStatus "voiceKernel"   "http://127.0.0.1:8092/health"        "Voice Kernel"
    Get-ServiceStatus "ollama"         "http://127.0.0.1:11434/api/tags"     "Ollama"
    Get-ServiceStatus "desktopRuntime" "http://127.0.0.1:8091/status"        "Desktop Runtime" -Timeout 3
    Get-ServiceStatus "vscodeTurbo"   "http://127.0.0.1:8787/health"        "VSCode Turbo"    -Timeout 3
    Get-ServiceStatus "cerebral"      "http://127.0.0.1:8765/health"        "Cerebral Daemon" -Timeout 3
    Get-ServiceStatus "seafile"       "http://127.0.0.1:8082/"              "Seafile"         -Timeout 4
    Get-ServiceStatus "leewayIDE"     "http://127.0.0.1:3000/"              "Leeway IDE"      -Timeout 3
)

Write-Host ""
Write-Host "  Service               Port   Status     Ping    Info" -ForegroundColor White
Write-Host "  ─────────────────────────────────────────────────────────────────" -ForegroundColor Gray

foreach ($svc in $services) {
    $statusColor = if ($svc.Status -match "LIVE") { "Green" } else { "Red" }
    $namePad  = $svc.Name.PadRight(22)
    $portPad  = $svc.Port.PadRight(7)
    $statusPad = $svc.Status.PadRight(11)
    $pingPad  = $svc.Ping.PadRight(8)
    $info     = if ($svc.Info.Length -gt 40) { $svc.Info.Substring(0,40) + "..." } else { $svc.Info }
    Write-Host "  $namePad $portPad " -NoNewline
    Write-Host "$statusPad" -NoNewline -ForegroundColor $statusColor
    Write-Host " $pingPad $info"
}

Write-Host ""
Write-Host "  ─────────────────────────────────────────────────────────────────" -ForegroundColor Gray

# Windows Service
Write-Host ""
Write-Host " Windows Service:" -ForegroundColor White
try {
    $svc = Get-Service -Name "AgentLee" -ErrorAction Stop
    $svcColor = if ($svc.Status -eq "Running") { "Green" } else { "Yellow" }
    Write-Host "   AgentLee — $($svc.DisplayName)" -NoNewline
    Write-Host " [$($svc.Status), StartType: $($svc.StartType)]" -ForegroundColor $svcColor
} catch {
    Write-Host "   AgentLee — NOT FOUND" -ForegroundColor Red
}

# Docker Containers
Write-Host ""
Write-Host " Docker Containers:" -ForegroundColor White
try {
    $dockerOut = & docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>&1
    if ($LASTEXITCODE -eq 0) {
        $lines = $dockerOut -split '\r?\n' | Where-Object { $_ -match 'leeway|agent-lee|voice|NAME' }
        foreach ($line in $lines) {
            Write-Host "   $line" -ForegroundColor $(if($line -match "Up"){"Green"}elseif($line -match "NAME"){"White"}else{"Yellow"})
        }
    } else {
        Write-Host "   Docker not available or no containers running" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   Docker check failed: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Ollama Models
Write-Host ""
Write-Host " Ollama Models:" -ForegroundColor White
try {
    $r = Invoke-WebRequest -Uri "http://127.0.0.1:11434/api/tags" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    $models = ($r.Content | ConvertFrom-Json).models
    foreach ($m in $models) {
        $sizeGB = [math]::Round($m.size / 1GB, 1)
        Write-Host "   $($m.name.PadRight(30)) ${sizeGB}GB" -ForegroundColor Green
    }
} catch {
    Write-Host "   Ollama not reachable" -ForegroundColor Red
}

# Summary
Write-Host ""
Write-Host "  ─────────────────────────────────────────────────────────────────" -ForegroundColor Gray
$live = ($services | Where-Object { $_.Status -match "LIVE" }).Count
$dead = ($services | Where-Object { $_.Status -match "DEAD" }).Count
$color = if ($live -ge 5) { "Green" } elseif ($live -ge 3) { "Yellow" } else { "Red" }
$elapsed = [int]((Get-Date) - $StartedAt).TotalSeconds
Write-Host ""
Write-Host "  Summary: $live/$($services.Count) services healthy | $dead down | checked in ${elapsed}s" -ForegroundColor $color
Write-Host ""
if ($dead -gt 0) {
    Write-Host "  To start Desktop Runtime: agent-lee-coding-mode\desktop-runtime\start-desktop-runtime.ps1" -ForegroundColor Gray
    Write-Host "  To start AgentLee service: Start-Service AgentLee" -ForegroundColor Gray
    Write-Host "  Production readiness gate: scripts\Invoke-LeeWayProductionReadinessGate.ps1" -ForegroundColor Gray
    Write-Host ""
}
