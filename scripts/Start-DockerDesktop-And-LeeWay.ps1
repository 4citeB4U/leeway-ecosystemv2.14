$ErrorActionPreference = "Continue"

$Root = "D:\Leeway-Ecosystem v2.1.4"
$LogDir = Join-Path $Root "Archive\logs\runtime-startup"
$ReceiptDir = Join-Path $Root "Archive\receipts\runtime-startup"
New-Item -ItemType Directory -Force -Path $LogDir, $ReceiptDir | Out-Null

$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$Log = Join-Path $LogDir "docker-leeway-boot-$Stamp.log"
$Receipt = Join-Path $ReceiptDir "docker-leeway-boot-$Stamp.json"

function Log {
    param([string]$Message)
    $line = "[" + (Get-Date -Format "yyyy-MM-dd HH:mm:ss") + "] " + $Message
    Add-Content -LiteralPath $Log -Value $line
}

function Test-DockerReady {
    try {
        docker ps | Out-Null
        return ($LASTEXITCODE -eq 0)
    }
    catch {
        return $false
    }
}

function Start-DockerDesktop {
    $paths = @(
        "$env:ProgramFiles\Docker\Docker\Docker Desktop.exe",
        "$env:LOCALAPPDATA\Docker\Docker Desktop.exe"
    )

    foreach ($p in $paths) {
        if (Test-Path -LiteralPath $p) {
            Log "Starting Docker Desktop: $p"
            Start-Process -FilePath $p -WindowStyle Minimized
            return $true
        }
    }

    Log "WARN: Docker Desktop executable not found."
    return $false
}

Log "=================================================="
Log "DOCKER + LEEWAY BOOT START"
Log "=================================================="

try {
    $svc = Get-Service com.docker.service -ErrorAction SilentlyContinue
    if ($svc) {
        Set-Service com.docker.service -StartupType Automatic
        if ($svc.Status -ne "Running") {
            Start-Service com.docker.service
            Log "Started com.docker.service"
        } else {
            Log "com.docker.service already running"
        }
    } else {
        Log "WARN: com.docker.service not found"
    }
}
catch {
    Log "WARN: Docker service setup failed: $($_.Exception.Message)"
}

if (-not (Test-DockerReady)) {
    Start-DockerDesktop | Out-Null
}

$dockerReady = $false
for ($i = 1; $i -le 90; $i++) {
    if (Test-DockerReady) {
        $dockerReady = $true
        Log "Docker is ready after $i checks."
        break
    }

    if ($i -eq 15 -or $i -eq 30 -or $i -eq 60) {
        Start-DockerDesktop | Out-Null
    }

    Start-Sleep -Seconds 2
}

if (-not $dockerReady) {
    Log "FAIL: Docker did not become ready."
    $result = [ordered]@{
        timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        verdict = "DOCKER_NOT_READY"
        log = $Log
    }
    $json = $result | ConvertTo-Json -Depth 10
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Receipt, $json, $utf8NoBom)
    exit 1
}

$containers = @(
    "leeway_runtime_fabric",
    "leeway_ollama",
    "agent-lee-voice-kernel",
    "voice-kernel-enforcer",
    "leeway-seafile-db",
    "leeway-seafile-cache",
    "leeway-seafile",
    "agent_lee_code_mode"
)

foreach ($c in $containers) {
    try {
        $exists = docker ps -a --format "{{.Names}}" | Where-Object { $_ -eq $c }
        if (-not $exists) {
            Log "SKIP: Missing container $c"
            continue
        }

        $state = docker inspect $c --format "{{.State.Status}}"
        if ($state -ne "running") {
            docker start $c | Out-Null
            Log "STARTED: $c"
        } else {
            Log "ALREADY RUNNING: $c"
        }
    }
    catch {
        Log "WARN: Failed container check/start $c : $($_.Exception.Message)"
    }
}

Start-Sleep -Seconds 10

try {
    Start-ScheduledTask -TaskName "AgentLeeRuntime"
    Log "Triggered AgentLeeRuntime"
}
catch {
    Log "WARN: Could not trigger AgentLeeRuntime: $($_.Exception.Message)"
}

Start-Sleep -Seconds 30

$checks = @(
    @{Name="Runtime Fabric"; Url="http://127.0.0.1:4001/health"; Web=$false},
    @{Name="Router"; Url="http://127.0.0.1:8080/health"; Web=$false},
    @{Name="Ollama"; Url="http://127.0.0.1:11434/api/tags"; Web=$false},
    @{Name="Voice Kernel"; Url="http://127.0.0.1:8092/health"; Web=$false},
    @{Name="Desktop Runtime"; Url="http://127.0.0.1:8091/runtime/status"; Web=$false},
    @{Name="VSCode Turbo Adapter"; Url="http://127.0.0.1:8787/health"; Web=$false},
    @{Name="Cerebral Daemon"; Url="http://127.0.0.1:8765/health"; Web=$false},
    @{Name="Seafile"; Url="http://127.0.0.1:8082"; Web=$true}
)

$missing = @()

foreach ($c in $checks) {
    try {
        if ($c.Web) {
            Invoke-WebRequest -Uri $c.Url -UseBasicParsing -TimeoutSec 10 | Out-Null
        } else {
            Invoke-RestMethod -Uri $c.Url -TimeoutSec 5 | Out-Null
        }
        Log "PASS: $($c.Name)"
    }
    catch {
        Log "MISS: $($c.Name)"
        $missing += $c.Name
    }
}

$result = [ordered]@{
    timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    verdict = $(if ($missing.Count -eq 0) { "DOCKER_AND_LEEWAY_BOOT_READY" } else { "DOCKER_AND_LEEWAY_BOOT_PARTIAL" })
    missing = $missing
    log = $Log
}

$json = $result | ConvertTo-Json -Depth 20
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($Receipt, $json, $utf8NoBom)

Log "VERDICT: $($result.verdict)"
Log "Receipt: $Receipt"