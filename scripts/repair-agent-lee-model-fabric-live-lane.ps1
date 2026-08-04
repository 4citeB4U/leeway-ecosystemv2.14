Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned -Force
$ErrorActionPreference = "Stop"

$Root = "D:\Leeway-Ecosystem v2.1.4"
Set-Location -LiteralPath $Root

$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$ReceiptDir = Join-Path $Root "Archive\receipts"
$BackupDir = Join-Path $Root "Archive\backups\agent-lee-model-fabric-live-lane-$Stamp"
$LogDir = Join-Path $Root "Archive\logs\agent-lee-model-fabric-live-lane"
New-Item -ItemType Directory -Force -Path $ReceiptDir, $BackupDir, $LogDir | Out-Null

$ReceiptPath = Join-Path $ReceiptDir "agent-lee-model-fabric-live-lane-repair-$Stamp.json"

$PolicyPath = Join-Path $Root ".leeway\agent-lee-model-policy.json"
$OverridePath = Join-Path $Root ".leeway\agent-lee-model-override.json"

$AdapterServer = Join-Path $Root ".leeway-vscode\agent-lee-vscode-adapter\server.cjs"
$RouterServer = Join-Path $Root "agent-lee-coding-mode\router\server-brainfix.mjs"
$RuntimeFabricServer = Join-Path $Root "Leeway Runtime Fabric\server\index.cjs"
$DesktopServer = Join-Path $Root "agent-lee-coding-mode\desktop-runtime\server.mjs"
$ExtensionJs = Join-Path $Root ".leeway-vscode\extensions\leeway-agent-lee-chat\extension.js"

$PatchTargets = @(
    $AdapterServer,
    $RouterServer,
    $RuntimeFabricServer,
    $DesktopServer,
    $ExtensionJs
) | Where-Object { Test-Path -LiteralPath $_ -PathType Leaf }

function Write-JsonFile {
    param(
        [Parameter(Mandatory=$true)][string]$Path,
        [Parameter(Mandatory=$true)]$Object
    )

    $Json = $Object | ConvertTo-Json -Depth 100
    $Utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, $Json + [Environment]::NewLine, $Utf8NoBom)
}

function Backup-File {
    param([Parameter(Mandatory=$true)][string]$Path)

    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        return $null
    }

    $Relative = (Resolve-Path -LiteralPath $Path).Path.Substring($Root.Length).TrimStart("\")
    $Safe = $Relative -replace "[:\\\/]", "__"
    $Backup = Join-Path $BackupDir $Safe
    Copy-Item -LiteralPath $Path -Destination $Backup -Force
    return $Backup
}

function Test-Http {
    param([string]$Name, [string]$Uri, [int]$TimeoutSec = 10)

    try {
        $R = Invoke-WebRequest -UseBasicParsing -Uri $Uri -TimeoutSec $TimeoutSec
        return [ordered]@{
            name = $Name
            ok = $true
            statusCode = $R.StatusCode
            uri = $Uri
        }
    }
    catch {
        return [ordered]@{
            name = $Name
            ok = $false
            error = $_.Exception.Message
            uri = $Uri
        }
    }
}

function Invoke-OllamaGenerate {
    param(
        [string]$Model,
        [string]$Prompt,
        [int]$TimeoutSec,
        [int]$NumPredict = 64,
        [string]$KeepAlive = "8h"
    )

    $Body = @{
        model = $Model
        prompt = $Prompt
        stream = $false
        keep_alive = $KeepAlive
        options = @{
            temperature = 0
            num_predict = $NumPredict
            num_ctx = 4096
        }
    }

    $Started = Get-Date

    try {
        $R = Invoke-RestMethod `
            -Uri "http://127.0.0.1:11434/api/generate" `
            -Method Post `
            -ContentType "application/json" `
            -Body ($Body | ConvertTo-Json -Depth 30) `
            -TimeoutSec $TimeoutSec

        return [ordered]@{
            model = $Model
            ok = $true
            elapsedSec = [math]::Round(((Get-Date) - $Started).TotalSeconds, 2)
            response = [string]$R.response
            loadDuration = $R.load_duration
            totalDuration = $R.total_duration
            evalCount = $R.eval_count
            evalDuration = $R.eval_duration
        }
    }
    catch {
        return [ordered]@{
            model = $Model
            ok = $false
            elapsedSec = [math]::Round(((Get-Date) - $Started).TotalSeconds, 2)
            error = $_.Exception.Message
        }
    }
}

function Invoke-AdapterChat {
    param(
        [string]$Prompt,
        [string]$Model = "qwen3:latest",
        [int]$TimeoutSec = 240,
        [int]$MaxTokens = 160
    )

    $Body = @{
        model = $Model
        messages = @(
            @{
                role = "user"
                content = $Prompt
            }
        )
        temperature = 0
        max_tokens = $MaxTokens
        provenance = @{
            origin = "powershell-model-fabric-live-lane-repair"
            workspaceRoot = $Root
            selectedModel = $Model
            adapterPort = 8787
            routerPort = 8080
            runtimeFabricPort = 4001
            desktopRuntimePort = 8091
        }
    }

    $Started = Get-Date

    try {
        $R = Invoke-RestMethod `
            -Uri "http://127.0.0.1:8787/v1/chat/completions" `
            -Method Post `
            -ContentType "application/json" `
            -Body ($Body | ConvertTo-Json -Depth 40) `
            -TimeoutSec $TimeoutSec

        return [ordered]@{
            model = $Model
            ok = $true
            elapsedSec = [math]::Round(((Get-Date) - $Started).TotalSeconds, 2)
            response = $R
        }
    }
    catch {
        return [ordered]@{
            model = $Model
            ok = $false
            elapsedSec = [math]::Round(((Get-Date) - $Started).TotalSeconds, 2)
            error = $_.Exception.Message
        }
    }
}

function Patch-Timeouts {
    $Results = @()

    foreach ($Path in $PatchTargets) {
        $Original = [System.IO.File]::ReadAllText($Path)
        $Text = $Original
        $Backup = $null

        $Text = [regex]::Replace($Text, "(?i)(timeoutMs\s*[:=]\s*)30000", '${1}240000')
        $Text = [regex]::Replace($Text, "(?i)(timeoutMs\s*[:=]\s*)45000", '${1}240000')
        $Text = [regex]::Replace($Text, "(?i)(timeoutMs\s*[:=]\s*)60000", '${1}240000')
        $Text = [regex]::Replace($Text, "(?i)(timeoutMs\s*[:=]\s*)120000", '${1}240000')

        $Text = [regex]::Replace($Text, "(?i)(requestTimeoutMs\s*[:=]\s*)30000", '${1}240000')
        $Text = [regex]::Replace($Text, "(?i)(requestTimeoutMs\s*[:=]\s*)45000", '${1}240000')
        $Text = [regex]::Replace($Text, "(?i)(requestTimeoutMs\s*[:=]\s*)60000", '${1}240000')
        $Text = [regex]::Replace($Text, "(?i)(requestTimeoutMs\s*[:=]\s*)120000", '${1}240000')

        $Text = [regex]::Replace($Text, "(?i)(CHAT_TIMEOUT_MS\s*[:=]\s*)30000", '${1}240000')
        $Text = [regex]::Replace($Text, "(?i)(CHAT_TIMEOUT_MS\s*[:=]\s*)45000", '${1}240000')
        $Text = [regex]::Replace($Text, "(?i)(CHAT_TIMEOUT_MS\s*[:=]\s*)60000", '${1}240000')
        $Text = [regex]::Replace($Text, "(?i)(CHAT_TIMEOUT_MS\s*[:=]\s*)120000", '${1}240000')

        $Text = [regex]::Replace($Text, "(?i)(setTimeout\s*\([^,]+,\s*)30000(\s*\))", '${1}240000${2}')
        $Text = [regex]::Replace($Text, "(?i)(setTimeout\s*\([^,]+,\s*)45000(\s*\))", '${1}240000${2}')
        $Text = [regex]::Replace($Text, "(?i)(setTimeout\s*\([^,]+,\s*)60000(\s*\))", '${1}240000${2}')
        $Text = [regex]::Replace($Text, "(?i)(setTimeout\s*\([^,]+,\s*)120000(\s*\))", '${1}240000${2}')

        if ($Text -ne $Original) {
            $Backup = Backup-File -Path $Path
            $Utf8NoBom = New-Object System.Text.UTF8Encoding($false)
            [System.IO.File]::WriteAllText($Path, $Text, $Utf8NoBom)
        }

        $Results += [ordered]@{
            path = $Path
            changed = ($Text -ne $Original)
            backup = $Backup
        }
    }

    return $Results
}

Write-Host ""
Write-Host "=== Agent Lee Model Fabric Live Lane Repair ===" -ForegroundColor Cyan

$Health = [ordered]@{
    adapter8787 = Test-Http -Name "adapter8787" -Uri "http://127.0.0.1:8787/health"
    router8080 = Test-Http -Name "router8080" -Uri "http://127.0.0.1:8080/health"
    runtimeFabric4001 = Test-Http -Name "runtimeFabric4001" -Uri "http://127.0.0.1:4001/runtime/health"
    desktopRuntime8091Status = Test-Http -Name "desktopRuntime8091Status" -Uri "http://127.0.0.1:8091/runtime/status"
    desktopRuntime8091Health = Test-Http -Name "desktopRuntime8091Health" -Uri "http://127.0.0.1:8091/health"
    ollama11434 = Test-Http -Name "ollama11434" -Uri "http://127.0.0.1:11434/api/tags"
}

foreach ($Entry in $Health.GetEnumerator()) {
    Write-Host "$($Entry.Key): $($Entry.Value.ok)"
}

Write-Host ""
Write-Host "Warming Qwen3..." -ForegroundColor Cyan
$Qwen3Warm = Invoke-OllamaGenerate `
    -Model "qwen3:latest" `
    -Prompt "Reply with exactly: OK" `
    -TimeoutSec 240 `
    -NumPredict 8

if ($Qwen3Warm.ok) {
    Write-Host "Qwen3 warm PASS in $($Qwen3Warm.elapsedSec)s" -ForegroundColor Green
}
else {
    Write-Host "Qwen3 warm FAIL: $($Qwen3Warm.error)" -ForegroundColor Red
}

$Qwen3Hot = $null
if ($Qwen3Warm.ok) {
    $Qwen3Hot = Invoke-OllamaGenerate `
        -Model "qwen3:latest" `
        -Prompt "Reply with exactly: OK" `
        -TimeoutSec 60 `
        -NumPredict 8

    if ($Qwen3Hot.ok) {
        Write-Host "Qwen3 hot PASS in $($Qwen3Hot.elapsedSec)s" -ForegroundColor Green
    }
    else {
        Write-Host "Qwen3 hot FAIL: $($Qwen3Hot.error)" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Testing assist lanes..." -ForegroundColor Cyan
$DeepSeek = Invoke-OllamaGenerate `
    -Model "deepseek-coder:latest" `
    -Prompt "Reply with exactly: OK" `
    -TimeoutSec 90 `
    -NumPredict 8

$QwenCoder = Invoke-OllamaGenerate `
    -Model "qwen2.5-coder:7b" `
    -Prompt "Reply with exactly: OK" `
    -TimeoutSec 90 `
    -NumPredict 8

Write-Host "deepseek-coder: $($DeepSeek.ok) in $($DeepSeek.elapsedSec)s"
Write-Host "qwen2.5-coder: $($QwenCoder.ok) in $($QwenCoder.elapsedSec)s"

Write-Host ""
Write-Host "Patching timeout budgets to 240000ms where safely detectable..." -ForegroundColor Cyan
$TimeoutPatches = Patch-Timeouts

$SelectedLiveModel = if ($Qwen3Hot -and $Qwen3Hot.ok -and $Qwen3Hot.elapsedSec -lt 20) {
    "qwen3:latest"
} elseif ($Qwen3Warm.ok) {
    "qwen3:latest"
} elseif ($DeepSeek.ok) {
    "deepseek-coder:latest"
} elseif ($QwenCoder.ok) {
    "qwen2.5-coder:7b"
} else {
    "qwen3:latest"
}

$Policy = [ordered]@{
    updatedAt = (Get-Date).ToString("o")
    policy = "agent-lee-model-fabric-live-lane"
    primaryModel = "qwen3:latest"
    selectedLiveChatModel = $SelectedLiveModel
    assistModels = @(
        "deepseek-coder:latest",
        "qwen2.5-coder:7b",
        "qwen2.5vl:7b"
    )
    qwen3 = @{
        keepAlive = "8h"
        coldStartTimeoutSec = 240
        hotPathTimeoutSec = 60
        maxFullConversationTimeoutSec = 240
        status = $(if ($Qwen3Warm.ok) { "available" } else { "unhealthy" })
    }
    fallback = @{
        allowTemporaryFallbackForFullConversation = $true
        reason = "Use only when qwen3 misses timeout or full conversation is too large for live VS Code window."
        preferredFallbackOrder = @(
            "deepseek-coder:latest",
            "qwen2.5-coder:7b"
        )
    }
    vscode = @{
        adapterUrl = "http://127.0.0.1:8787"
        timeoutMs = 240000
        preserveFullConversation = $true
        noDiagnosticDumpToUser = $true
    }
}

Write-JsonFile -Path $PolicyPath -Object $Policy
Write-JsonFile -Path $OverridePath -Object $Policy

Write-Host "Policy written: $PolicyPath"
Write-Host "Selected live chat model: $SelectedLiveModel" -ForegroundColor Cyan

Write-Host ""
Write-Host "Testing adapter hello through selected live model..." -ForegroundColor Cyan
$AdapterHello = Invoke-AdapterChat `
    -Prompt "hello" `
    -Model $SelectedLiveModel `
    -TimeoutSec 240 `
    -MaxTokens 80

if ($AdapterHello.ok) {
    Write-Host "Adapter hello PASS using $SelectedLiveModel in $($AdapterHello.elapsedSec)s" -ForegroundColor Green
}
else {
    Write-Host "Adapter hello FAIL using $SelectedLiveModel`: $($AdapterHello.error)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Testing adapter with a heavier VS Code-style prompt..." -ForegroundColor Cyan
$HeavyPrompt = @"
You are Agent Lee on the official Leeway path. Explain who you are, what the Runtime Fabric does, why receipts matter, and what you do when a downstream model lane times out. Keep it concise, preserve the Leeway voice, and do not dump diagnostics.
"@

$AdapterHeavy = Invoke-AdapterChat `
    -Prompt $HeavyPrompt `
    -Model $SelectedLiveModel `
    -TimeoutSec 240 `
    -MaxTokens 220

if ($AdapterHeavy.ok) {
    Write-Host "Adapter heavy prompt PASS using $SelectedLiveModel in $($AdapterHeavy.elapsedSec)s" -ForegroundColor Green
}
else {
    Write-Host "Adapter heavy prompt FAIL using $SelectedLiveModel`: $($AdapterHeavy.error)" -ForegroundColor Red
}

$Status = if (
    $Health.adapter8787.ok -and
    $Health.router8080.ok -and
    $Health.runtimeFabric4001.ok -and
    $Health.ollama11434.ok -and
    $Qwen3Warm.ok -and
    $AdapterHello.ok -and
    $AdapterHeavy.ok
) {
    "PASS_MODEL_FABRIC_READY_FOR_VSCODE_RETRY"
} elseif (
    $Health.adapter8787.ok -and
    $Health.router8080.ok -and
    $Health.runtimeFabric4001.ok -and
    $Health.ollama11434.ok -and
    $AdapterHello.ok
) {
    "PARTIAL_PASS_SIMPLE_CHAT_READY_HEAVY_PROMPT_BLOCKED"
} else {
    "FAIL_MODEL_FABRIC_STILL_BLOCKED"
}

$Receipt = [ordered]@{
    status = $Status
    checkedAt = (Get-Date).ToString("o")
    root = $Root
    health = $Health
    qwen3Warm = $Qwen3Warm
    qwen3Hot = $Qwen3Hot
    deepseek = $DeepSeek
    qwenCoder = $QwenCoder
    selectedLiveModel = $SelectedLiveModel
    policyPath = $PolicyPath
    overridePath = $OverridePath
    timeoutPatches = $TimeoutPatches
    adapterHello = $AdapterHello
    adapterHeavyPrompt = $AdapterHeavy
    nextActions = @(
        "Restart Agent Lee adapter if policy changes are not picked up automatically.",
        "In VS Code: Developer: Restart Extension Host.",
        "In VS Code: Developer: Reload Window.",
        "Open Agent Lee Turbo.",
        "Type: hello.",
        "Then ask: Who are you and what is your route?"
    )
}

Write-JsonFile -Path $ReceiptPath -Object $Receipt

Write-Host ""
Write-Host "Status: $Status" -ForegroundColor Cyan
Write-Host "Receipt: $ReceiptPath" -ForegroundColor Green

if ($Status -eq "PASS_MODEL_FABRIC_READY_FOR_VSCODE_RETRY") {
    Write-Host ""
    Write-Host "Next:" -ForegroundColor Green
    Write-Host "1. Restart Agent Lee adapter if needed."
    Write-Host "2. In VS Code: Developer: Restart Extension Host."
    Write-Host "3. In VS Code: Developer: Reload Window."
    Write-Host "4. Agent Lee Turbo -> hello."
}
else {
    Write-Host ""
    Write-Host "Still blocked. Open the receipt and inspect qwen3Warm / adapterHeavyPrompt." -ForegroundColor Yellow
}
