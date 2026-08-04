$ErrorActionPreference = "Continue"

$Root = "D:\Leeway-Ecosystem v2.1.4"
$LogDir = Join-Path $Root "Archive\logs\runtime-startup"
$ReceiptDir = Join-Path $Root "Archive\receipts\runtime-startup"
New-Item -ItemType Directory -Force -Path $LogDir, $ReceiptDir | Out-Null

$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$Log = Join-Path $LogDir "leeway-runtime-startup-$Stamp.log"
$Receipt = Join-Path $ReceiptDir "leeway-runtime-startup-$Stamp.json"

function Write-StartupLog {
    param([string]$Message)
    $line = "[" + (Get-Date -Format "yyyy-MM-dd HH:mm:ss") + "] " + $Message
    Add-Content -LiteralPath $Log -Value $line
}

function Test-Rest {
    param([string]$Name, [string]$Url, [int]$TimeoutSec = 5)
    try {
        Invoke-RestMethod -Uri $Url -TimeoutSec $TimeoutSec | Out-Null
        Write-StartupLog "PASS: $Name"
        return $true
    }
    catch {
        Write-StartupLog "MISS: $Name"
        return $false
    }
}

function Test-Web {
    param([string]$Name, [string]$Url, [int]$TimeoutSec = 10)
    try {
        Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec $TimeoutSec | Out-Null
        Write-StartupLog "PASS: $Name"
        return $true
    }
    catch {
        Write-StartupLog "MISS: $Name"
        return $false
    }
}

function Start-ContainerSafe {
    param([string]$Name)

    try {
        $exists = docker ps -a --format "{{.Names}}" | Where-Object { $_ -eq $Name }
        if (-not $exists) {
            Write-StartupLog "SKIP: Docker container not found: $Name"
            return
        }

        $state = docker inspect $Name --format "{{.State.Status}}"
        if ($state -eq "running") {
            Write-StartupLog "ALREADY RUNNING: $Name"
            return
        }

        docker start $Name | Out-Null
        Write-StartupLog "STARTED CONTAINER: $Name"
    }
    catch {
        Write-StartupLog "WARN: Failed container start $Name : $($_.Exception.Message)"
    }
}

function Start-HiddenPowerShell {
    param(
        [string]$Name,
        [string]$WorkingDirectory,
        [string]$Command,
        [string]$HealthUrl
    )

    if (Test-Rest -Name $Name -Url $HealthUrl) {
        return
    }

    if (-not (Test-Path -LiteralPath $WorkingDirectory)) {
        Write-StartupLog "BLOCKED: Missing working directory for $Name : $WorkingDirectory"
        return
    }

    Write-StartupLog "STARTING: $Name"

    Start-Process powershell.exe `
        -WorkingDirectory $WorkingDirectory `
        -WindowStyle Hidden `
        -ArgumentList @(
            "-NoProfile",
            "-ExecutionPolicy", "Bypass",
            "-Command", $Command
        ) | Out-Null

    Start-Sleep -Seconds 8
    Test-Rest -Name $Name -Url $HealthUrl | Out-Null
}

function Start-HiddenPowerShellFile {
    param(
        [string]$Name,
        [string]$WorkingDirectory,
        [string]$ScriptPath,
        [string]$HealthUrl
    )

    if (Test-Rest -Name $Name -Url $HealthUrl) {
        return
    }

    if (-not (Test-Path -LiteralPath $ScriptPath)) {
        Write-StartupLog "BLOCKED: Missing startup script for $Name : $ScriptPath"
        return
    }

    Write-StartupLog "STARTING: $Name"

    Start-Process powershell.exe `
        -WorkingDirectory $WorkingDirectory `
        -WindowStyle Hidden `
        -ArgumentList @(
            "-NoProfile",
            "-ExecutionPolicy", "Bypass",
            "-File", $ScriptPath
        ) | Out-Null

    Start-Sleep -Seconds 8
    Test-Rest -Name $Name -Url $HealthUrl | Out-Null
}

Write-StartupLog "=================================================="
Write-StartupLog "LEEWAY RUNTIME STACK START"
Write-StartupLog "=================================================="

Write-StartupLog "Waiting briefly for Docker availability..."
for ($i = 1; $i -le 30; $i++) {
    try {
        docker ps | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-StartupLog "Docker available."
            break
        }
    }
    catch {}
    Start-Sleep -Seconds 2
}

Start-ContainerSafe "leeway_runtime_fabric"
Start-ContainerSafe "leeway_ollama"
Start-ContainerSafe "agent-lee-voice-kernel"
Start-ContainerSafe "voice-kernel-enforcer"
Start-ContainerSafe "leeway-seafile-db"
Start-ContainerSafe "leeway-seafile-cache"
Start-ContainerSafe "leeway-seafile"
Start-ContainerSafe "agent_lee_code_mode"

Start-Sleep -Seconds 10

try {
    $svc = Get-Service AgentLee -ErrorAction SilentlyContinue
    if ($svc) {
        if ($svc.Status -ne "Running") {
            Start-Service AgentLee
            Start-Sleep -Seconds 5
        }
        Set-Service AgentLee -StartupType Automatic
        Write-StartupLog "AgentLee service status: $((Get-Service AgentLee).Status)"
    }
}
catch {
    Write-StartupLog "WARN: AgentLee service check failed: $($_.Exception.Message)"
}

$RouterDir = Join-Path $Root "agent-lee-coding-mode"
Start-HiddenPowerShell `
    -Name "Router" `
    -WorkingDirectory $RouterDir `
    -Command "npm start" `
    -HealthUrl "http://127.0.0.1:8080/health"

$DesktopDir = Join-Path $Root "agent-lee-coding-mode\desktop-runtime"
Start-HiddenPowerShell `
    -Name "Desktop Runtime" `
    -WorkingDirectory $DesktopDir `
    -Command "node .\server.mjs" `
    -HealthUrl "http://127.0.0.1:8091/runtime/status"

$AdapterDir = Join-Path $Root ".leeway-vscode\agent-lee-vscode-adapter"
$AdapterScript = Join-Path $AdapterDir "start-agent-lee-vscode-adapter.ps1"
Start-HiddenPowerShellFile `
    -Name "VSCode Turbo Adapter" `
    -WorkingDirectory $AdapterDir `
    -ScriptPath $AdapterScript `
    -HealthUrl "http://127.0.0.1:8787/health"

$CerebralDir = Join-Path $Root "Cerebral"
Start-HiddenPowerShell `
    -Name "Cerebral Daemon" `
    -WorkingDirectory $CerebralDir `
    -Command ". .\.venv\Scripts\Activate.ps1; python .\CerebralDaemon.py" `
    -HealthUrl "http://127.0.0.1:8765/health"

$checks = @()
$checks += [ordered]@{ name = "Runtime Fabric"; ok = (Test-Rest "Runtime Fabric" "http://127.0.0.1:4001/health") }
$checks += [ordered]@{ name = "Router"; ok = (Test-Rest "Router" "http://127.0.0.1:8080/health") }
$checks += [ordered]@{ name = "Ollama"; ok = (Test-Rest "Ollama" "http://127.0.0.1:11434/api/tags") }
$checks += [ordered]@{ name = "Voice Kernel"; ok = (Test-Rest "Voice Kernel" "http://127.0.0.1:8092/health") }
$checks += [ordered]@{ name = "Desktop Runtime"; ok = (Test-Rest "Desktop Runtime" "http://127.0.0.1:8091/runtime/status") }
$checks += [ordered]@{ name = "VSCode Turbo Adapter"; ok = (Test-Rest "VSCode Turbo Adapter" "http://127.0.0.1:8787/health") }
$checks += [ordered]@{ name = "Cerebral Daemon"; ok = (Test-Rest "Cerebral Daemon" "http://127.0.0.1:8765/health") }
$checks += [ordered]@{ name = "Seafile"; ok = (Test-Web "Seafile" "http://127.0.0.1:8082") }

$missing = @($checks | Where-Object { -not $_.ok } | ForEach-Object { $_.name })

$result = [ordered]@{
    timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    verdict = $(if ($missing.Count -eq 0) { "LEEWAY_RUNTIME_STACK_STARTED" } else { "LEEWAY_RUNTIME_STACK_PARTIAL" })
    missing = $missing
    checks = $checks
    log = $Log
}

$json = $result | ConvertTo-Json -Depth 20
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($Receipt, $json, $utf8NoBom)

Write-StartupLog "VERDICT: $($result.verdict)"
Write-StartupLog "Receipt: $Receipt"