Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned -Force
$ErrorActionPreference = "Stop"

$Root = "D:\Leeway-Ecosystem v2.1.4"
if (-not (Test-Path -LiteralPath $Root -PathType Container)) {
    throw "Leeway root not found: $Root"
}

Set-Location -LiteralPath $Root

$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$ReceiptDir = Join-Path $Root "Archive\receipts"
$LogDir = Join-Path $Root "Archive\logs\agent-lee-model-fabric"
$BackupDir = Join-Path $Root "Archive\backups\agent-lee-model-routing-$Stamp"
$OverrideDir = Join-Path $Root ".leeway"

New-Item -ItemType Directory -Force -Path $ReceiptDir, $LogDir, $BackupDir, $OverrideDir | Out-Null

$ReceiptPath = Join-Path $ReceiptDir "agent-lee-vscode-live-backend-timeout-fix-$Stamp.json"
$OverridePath = Join-Path $OverrideDir "agent-lee-model-override.json"

$CandidateModels = @(
    "qwen2.5-coder:7b",
    "deepseek-coder:latest",
    "qwen2.5-coder:14b",
    "qwen3:latest",
    "qwen3-coder:latest"
)

$PatchTargets = @(
    ".leeway-vscode\agent-lee-vscode-adapter\server.cjs",
    "agent-lee-coding-mode\router\server-brainfix.mjs",
    "Leeway Runtime Fabric\server\index.cjs",
    "agent-lee-coding-mode\desktop-runtime\server.mjs",
    ".leeway-vscode\extensions\leeway-agent-lee-chat\extension.js"
)

function Write-JsonFile {
    param(
        [Parameter(Mandatory=$true)][string]$Path,
        [Parameter(Mandatory=$true)]$Object
    )

    $json = $Object | ConvertTo-Json -Depth 30
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, $json + [Environment]::NewLine, $utf8NoBom)
}

function Test-PortOpen {
    param([int]$Port)

    try {
        $client = New-Object System.Net.Sockets.TcpClient
        $async = $client.BeginConnect("127.0.0.1", $Port, $null, $null)
        $ok = $async.AsyncWaitHandle.WaitOne(1000, $false)

        if ($ok) {
            $client.EndConnect($async)
            $client.Close()
            return $true
        }

        $client.Close()
        return $false
    }
    catch {
        return $false
    }
}

function Invoke-JsonPost {
    param(
        [Parameter(Mandatory=$true)][string]$Uri,
        [Parameter(Mandatory=$true)]$Body,
        [int]$TimeoutSec = 60
    )

    $json = $Body | ConvertTo-Json -Depth 20
    return Invoke-RestMethod -Uri $Uri -Method Post -ContentType "application/json" -Body $json -TimeoutSec $TimeoutSec
}

function Start-OllamaIfNeeded {
    if (Test-PortOpen -Port 11434) {
        Write-Host "Ollama already listening on 11434" -ForegroundColor Green
        return
    }

    Write-Host "Starting Ollama..." -ForegroundColor Yellow

    try {
        Start-Process -FilePath "ollama.exe" -ArgumentList @("serve") -WindowStyle Minimized | Out-Null
    }
    catch {
        Write-Host "Could not start ollama.exe automatically: $($_.Exception.Message)" -ForegroundColor Red
    }

    $deadline = (Get-Date).AddSeconds(45)

    while ((Get-Date) -lt $deadline) {
        if (Test-PortOpen -Port 11434) {
            Write-Host "Ollama is now online." -ForegroundColor Green
            return
        }

        Start-Sleep -Seconds 2
    }

    throw "Ollama did not come online on port 11434."
}

function Get-OllamaModels {
    try {
        $tags = Invoke-RestMethod -Uri "http://127.0.0.1:11434/api/tags" -TimeoutSec 10
        return @($tags.models | ForEach-Object { $_.name })
    }
    catch {
        throw "Unable to read Ollama model tags: $($_.Exception.Message)"
    }
}

function Test-OllamaModel {
    param([Parameter(Mandatory=$true)][string]$Model)

    $body = @{
        model = $Model
        prompt = "Reply with exactly: OK"
        stream = $false
        options = @{
            num_predict = 8
            temperature = 0
        }
    }

    $started = Get-Date

    try {
        $response = Invoke-JsonPost -Uri "http://127.0.0.1:11434/api/generate" -Body $body -TimeoutSec 45
        $elapsed = [math]::Round(((Get-Date) - $started).TotalSeconds, 2)
        $text = [string]$response.response

        return [ordered]@{
            model = $Model
            ok = $true
            elapsedSec = $elapsed
            response = $text
        }
    }
    catch {
        $elapsed = [math]::Round(((Get-Date) - $started).TotalSeconds, 2)

        return [ordered]@{
            model = $Model
            ok = $false
            elapsedSec = $elapsed
            error = $_.Exception.Message
        }
    }
}

function Stop-LeewayPortProcess {
    param([int]$Port)

    try {
        $connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
        foreach ($connection in $connections) {
            $pid = $connection.OwningProcess
            if ($pid -and $pid -ne $PID) {
                $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
                if ($proc) {
                    Write-Host "Stopping process on port ${Port}: $($proc.ProcessName) pid=$pid" -ForegroundColor Yellow
                    Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
                }
            }
        }
    }
    catch {
        Write-Host "Could not stop port ${Port}: $($_.Exception.Message)" -ForegroundColor DarkYellow
    }
}

function Patch-ModelDefaults {
    param([Parameter(Mandatory=$true)][string]$SelectedModel)

    $changed = New-Object System.Collections.Generic.List[string]

    foreach ($relative in $PatchTargets) {
        $path = Join-Path $Root $relative

        if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
            continue
        }

        $text = [System.IO.File]::ReadAllText($path)
        $new = $text

        # Replace the slow timeout-prone defaults only. Backups are created first.
        $new = $new.Replace("qwen3-coder:latest", $SelectedModel)
        $new = $new.Replace("qwen3:latest", $SelectedModel)

        # Increase common short timeout constants when they are plainly visible.
        $new = [regex]::Replace($new, "(?i)(timeoutMs\s*[:=]\s*)30000", '${1}120000')
        $new = [regex]::Replace($new, "(?i)(timeoutMs\s*[:=]\s*)45000", '${1}120000')
        $new = [regex]::Replace($new, "(?i)(requestTimeoutMs\s*[:=]\s*)30000", '${1}120000')
        $new = [regex]::Replace($new, "(?i)(requestTimeoutMs\s*[:=]\s*)45000", '${1}120000')

        if ($new -ne $text) {
            $backup = Join-Path $BackupDir ($relative -replace "[:\\\/]", "__")
            Copy-Item -LiteralPath $path -Destination $backup -Force

            $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
            [System.IO.File]::WriteAllText($path, $new, $utf8NoBom)

            $changed.Add($path)
        }
    }

    return @($changed)
}

function Start-NodeService {
    param(
        [Parameter(Mandatory=$true)][string]$Name,
        [Parameter(Mandatory=$true)][int]$Port,
        [Parameter(Mandatory=$true)][string]$ScriptPath
    )

    if (Test-PortOpen -Port $Port) {
        Write-Host "$Name already online on $Port" -ForegroundColor Green
        return
    }

    if (-not (Test-Path -LiteralPath $ScriptPath -PathType Leaf)) {
        Write-Host "Missing $Name script: $ScriptPath" -ForegroundColor Red
        return
    }

    $out = Join-Path $LogDir "$Name-$Stamp.out.log"
    $err = Join-Path $LogDir "$Name-$Stamp.err.log"

    Write-Host "Starting $Name on $Port..." -ForegroundColor Yellow

    Start-Process `
        -FilePath "node.exe" `
        -ArgumentList @($ScriptPath) `
        -WorkingDirectory (Split-Path -Parent $ScriptPath) `
        -WindowStyle Minimized `
        -RedirectStandardOutput $out `
        -RedirectStandardError $err | Out-Null
}

function Wait-Port {
    param(
        [string]$Name,
        [int]$Port,
        [int]$TimeoutSec = 45
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSec)

    while ((Get-Date) -lt $deadline) {
        if (Test-PortOpen -Port $Port) {
            Write-Host "$Name online on $Port" -ForegroundColor Green
            return $true
        }

        Start-Sleep -Seconds 2
    }

    Write-Host "$Name still offline on $Port" -ForegroundColor Red
    return $false
}

Write-Host ""
Write-Host "=== Agent Lee VS Code Live Backend Timeout Fix ===" -ForegroundColor Cyan
Write-Host "Root: $Root"
Write-Host "Stamp: $Stamp"
Write-Host ""

Start-OllamaIfNeeded

$InstalledModels = Get-OllamaModels
Write-Host "Installed Ollama models:" -ForegroundColor Cyan
$InstalledModels | ForEach-Object { Write-Host "- $_" }

$AvailableCandidates = @($CandidateModels | Where-Object { $InstalledModels -contains $_ })

if ($AvailableCandidates.Count -eq 0) {
    throw "None of the expected coding models are installed. Installed models: $($InstalledModels -join ', ')"
}

Write-Host ""
Write-Host "Testing/warming candidate models..." -ForegroundColor Cyan

$WarmResults = @()

foreach ($model in $AvailableCandidates) {
    Write-Host "Warmup test: $model" -ForegroundColor Yellow
    $result = Test-OllamaModel -Model $model
    $WarmResults += $result

    if ($result.ok) {
        Write-Host "PASS $model in $($result.elapsedSec)s" -ForegroundColor Green
    }
    else {
        Write-Host "FAIL $model in $($result.elapsedSec)s :: $($result.error)" -ForegroundColor Red
    }
}

$Selected = $WarmResults |
    Where-Object { $_.ok -eq $true } |
    Sort-Object elapsedSec |
    Select-Object -First 1

if (-not $Selected) {
    $receipt = [ordered]@{
        status = "FAIL_NO_WARM_MODEL"
        checkedAt = (Get-Date).ToString("o")
        installedModels = $InstalledModels
        warmResults = $WarmResults
    }

    Write-JsonFile -Path $ReceiptPath -Object $receipt
    throw "No candidate model responded successfully. Receipt: $ReceiptPath"
}

$SelectedModel = [string]$Selected.model

Write-Host ""
Write-Host "Selected live VS Code backend model: $SelectedModel" -ForegroundColor Green

$Override = [ordered]@{
    selectedModel = $SelectedModel
    selectedAt = (Get-Date).ToString("o")
    reason = "VS Code live chat backend timeout fix; selected fastest warmed local coding/reasoning lane."
    installedModels = $InstalledModels
    warmResults = $WarmResults
    routePolicy = @{
        preferWarmModel = $true
        avoidColdQwen3Timeout = $true
        noRawTimeoutToUser = $true
    }
}

Write-JsonFile -Path $OverridePath -Object $Override
Write-Host "Wrote model override: $OverridePath" -ForegroundColor Green

$ChangedFiles = Patch-ModelDefaults -SelectedModel $SelectedModel

Write-Host ""
Write-Host "Patched files:" -ForegroundColor Cyan
if ($ChangedFiles.Count -gt 0) {
    $ChangedFiles | ForEach-Object { Write-Host "- $_" -ForegroundColor Green }
}
else {
    Write-Host "- No direct qwen3 defaults found to patch." -ForegroundColor DarkYellow
}

Write-Host ""
Write-Host "Restarting Agent Lee route services..." -ForegroundColor Cyan

Stop-LeewayPortProcess -Port 8787
Stop-LeewayPortProcess -Port 8080
Stop-LeewayPortProcess -Port 4001
Stop-LeewayPortProcess -Port 8091

Start-Sleep -Seconds 3

$AdapterScript = Join-Path $Root ".leeway-vscode\agent-lee-vscode-adapter\server.cjs"
$RouterScript = Join-Path $Root "agent-lee-coding-mode\router\server-brainfix.mjs"
$RuntimeFabricScript = Join-Path $Root "Leeway Runtime Fabric\server\index.cjs"
$DesktopRuntimeScript = Join-Path $Root "agent-lee-coding-mode\desktop-runtime\server.mjs"

Start-NodeService -Name "adapter" -Port 8787 -ScriptPath $AdapterScript
Start-NodeService -Name "router" -Port 8080 -ScriptPath $RouterScript
Start-NodeService -Name "runtime-fabric" -Port 4001 -ScriptPath $RuntimeFabricScript
Start-NodeService -Name "desktop-runtime" -Port 8091 -ScriptPath $DesktopRuntimeScript

$Ports = [ordered]@{
    adapter8787 = Wait-Port -Name "adapter" -Port 8787
    router8080 = Wait-Port -Name "router" -Port 8080
    runtimeFabric4001 = Wait-Port -Name "runtime-fabric" -Port 4001
    desktopRuntime8091 = Wait-Port -Name "desktop-runtime" -Port 8091
}

Write-Host ""
Write-Host "Running direct adapter chat probe..." -ForegroundColor Cyan

$AdapterProbe = [ordered]@{
    ok = $false
}

try {
    $probeBody = @{
        model = $SelectedModel
        messages = @(
            @{
                role = "user"
                content = "hello"
            }
        )
        temperature = 0
        max_tokens = 80
        provenance = @{
            origin = "powershell-diagnostic-live-backend-fix"
            workspaceRoot = $Root
            selectedModel = $SelectedModel
        }
    }

    $started = Get-Date
    $probe = Invoke-JsonPost -Uri "http://127.0.0.1:8787/v1/chat/completions" -Body $probeBody -TimeoutSec 120
    $elapsed = [math]::Round(((Get-Date) - $started).TotalSeconds, 2)

    $AdapterProbe = [ordered]@{
        ok = $true
        elapsedSec = $elapsed
        selectedModel = $SelectedModel
        raw = $probe
    }

    Write-Host "Adapter chat probe returned in ${elapsed}s" -ForegroundColor Green
}
catch {
    $AdapterProbe = [ordered]@{
        ok = $false
        selectedModel = $SelectedModel
        error = $_.Exception.Message
    }

    Write-Host "Adapter chat probe failed: $($_.Exception.Message)" -ForegroundColor Red
}

$Receipt = [ordered]@{
    status = $(if ($AdapterProbe.ok) { "PASS_BACKEND_WARMED_ADAPTER_RESPONDED" } else { "FAIL_ADAPTER_STILL_TIMED_OUT" })
    checkedAt = (Get-Date).ToString("o")
    root = $Root
    selectedModel = $SelectedModel
    installedModels = $InstalledModels
    warmResults = $WarmResults
    overridePath = $OverridePath
    changedFiles = $ChangedFiles
    ports = $Ports
    adapterProbe = $AdapterProbe
    logs = $LogDir
    backupDir = $BackupDir
    nextStep = "Reload VS Code window, then type hello in Agent Lee Turbo. If timeout remains, inspect adapter/router logs in Archive\\logs\\agent-lee-model-fabric."
}

Write-JsonFile -Path $ReceiptPath -Object $Receipt

Write-Host ""
Write-Host "=== Backend Timeout Fix Complete ===" -ForegroundColor Green
Write-Host "Receipt: $ReceiptPath"
Write-Host "Selected model: $SelectedModel"
Write-Host "Reload VS Code, then test Agent Lee Turbo with: hello"
Write-Host ""
