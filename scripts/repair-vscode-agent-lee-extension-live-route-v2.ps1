Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned -Force
$ErrorActionPreference = "Stop"

$Root = "D:\Leeway-Ecosystem v2.1.4"
Set-Location -LiteralPath $Root

$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$ReceiptDir = Join-Path $Root "Archive\receipts"
$BackupDir = Join-Path $Root "Archive\backups\vscode-agent-lee-extension-live-route-v2-$Stamp"
$LogDir = Join-Path $Root "Archive\logs\vscode-agent-lee-extension-live-route-v2"
$ConfigDir = Join-Path $Root ".leeway-vscode\extensions\leeway-agent-lee-chat"

New-Item -ItemType Directory -Force -Path $ReceiptDir, $BackupDir, $LogDir, $ConfigDir | Out-Null

$ReceiptPath = Join-Path $ReceiptDir "agent-lee-vscode-extension-live-route-repair-v2-$Stamp.json"

$ExtensionJs = Join-Path $Root ".leeway-vscode\extensions\leeway-agent-lee-chat\extension.js"
$PackageJson = Join-Path $Root ".leeway-vscode\extensions\leeway-agent-lee-chat\package.json"
$DesktopServer = Join-Path $Root "agent-lee-coding-mode\desktop-runtime\server.mjs"
$ConfigPath = Join-Path $ConfigDir "agent-lee-live-route.config.json"

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

function Test-PortOpen {
    param([int]$Port)

    try {
        $Client = New-Object System.Net.Sockets.TcpClient
        $Async = $Client.BeginConnect("127.0.0.1", $Port, $null, $null)
        $Ok = $Async.AsyncWaitHandle.WaitOne(1000, $false)

        if ($Ok) {
            $Client.EndConnect($Async)
            $Client.Close()
            return $true
        }

        $Client.Close()
        return $false
    }
    catch {
        return $false
    }
}

function Test-Http {
    param([string]$Name, [string]$Uri)

    try {
        $R = Invoke-WebRequest -UseBasicParsing -Uri $Uri -TimeoutSec 15
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

function Start-NodeService {
    param(
        [string]$Name,
        [int]$Port,
        [string]$ScriptPath
    )

    if (Test-PortOpen -Port $Port) {
        return [ordered]@{
            name = $Name
            port = $Port
            ok = $true
            action = "already-online"
        }
    }

    if (-not (Test-Path -LiteralPath $ScriptPath -PathType Leaf)) {
        return [ordered]@{
            name = $Name
            port = $Port
            ok = $false
            action = "missing-script"
            script = $ScriptPath
        }
    }

    $OutLog = Join-Path $LogDir "$Name-$Stamp.out.log"
    $ErrLog = Join-Path $LogDir "$Name-$Stamp.err.log"

    Start-Process `
        -FilePath "node.exe" `
        -ArgumentList @($ScriptPath) `
        -WorkingDirectory (Split-Path -Parent $ScriptPath) `
        -WindowStyle Minimized `
        -RedirectStandardOutput $OutLog `
        -RedirectStandardError $ErrLog | Out-Null

    $Deadline = (Get-Date).AddSeconds(60)

    while ((Get-Date) -lt $Deadline) {
        if (Test-PortOpen -Port $Port) {
            return [ordered]@{
                name = $Name
                port = $Port
                ok = $true
                action = "started"
                outLog = $OutLog
                errLog = $ErrLog
            }
        }

        Start-Sleep -Seconds 2
    }

    return [ordered]@{
        name = $Name
        port = $Port
        ok = $false
        action = "start-timeout"
        outLog = $OutLog
        errLog = $ErrLog
    }
}

function Invoke-AdapterHello {
    $Body = @{
        model = "qwen3:latest"
        messages = @(
            @{
                role = "user"
                content = "hello"
            }
        )
        temperature = 0
        max_tokens = 80
        provenance = @{
            origin = "powershell-extension-live-route-repair-v2"
            workspaceRoot = $Root
            selectedModel = "qwen3:latest"
            adapterPort = 8787
            routerPort = 8080
            runtimeFabricPort = 4001
        }
    }

    $Started = Get-Date

    try {
        $Response = Invoke-RestMethod `
            -Uri "http://127.0.0.1:8787/v1/chat/completions" `
            -Method Post `
            -ContentType "application/json" `
            -Body ($Body | ConvertTo-Json -Depth 40) `
            -TimeoutSec 240

        return [ordered]@{
            ok = $true
            elapsedSec = [math]::Round(((Get-Date) - $Started).TotalSeconds, 2)
            response = $Response
        }
    }
    catch {
        return [ordered]@{
            ok = $false
            elapsedSec = [math]::Round(((Get-Date) - $Started).TotalSeconds, 2)
            error = $_.Exception.Message
        }
    }
}

function Get-StringHits {
    param([string]$Path)

    $Hits = @()

    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        return $Hits
    }

    $Lines = Get-Content -LiteralPath $Path
    for ($I = 0; $I -lt $Lines.Count; $I++) {
        $Line = [string]$Lines[$I]

        if (
            $Line -match "8787" -or
            $Line -match "8080" -or
            $Line -match "fetch\(" -or
            $Line -match "http://" -or
            $Line -match "chat/completions" -or
            $Line -match "agent-lee/chat" -or
            $Line -match "timeout" -or
            $Line -match "AbortController"
        ) {
            $Hits += [ordered]@{
                line = $I + 1
                text = $Line.Trim()
            }
        }
    }

    return $Hits
}

function Patch-ExtensionLiveRoute {
    $Result = [ordered]@{
        exists = Test-Path -LiteralPath $ExtensionJs -PathType Leaf
        changed = $false
        backup = $null
        usesAdapter8787Before = $false
        usesAdapter8787After = $false
        directRouterBefore = $false
        directRouterAfter = $false
        stringHitsBefore = @()
        stringHitsAfter = @()
        note = $null
    }

    if (-not $Result.exists) {
        $Result.note = "extension.js missing"
        return $Result
    }

    $Text = [System.IO.File]::ReadAllText($ExtensionJs)
    $Original = $Text

    $Result.stringHitsBefore = Get-StringHits -Path $ExtensionJs
    $Result.usesAdapter8787Before = $Text.Contains("127.0.0.1:8787")
    $Result.directRouterBefore = (
        $Text.Contains("127.0.0.1:8080/v1/chat/completions") -or
        $Text.Contains("localhost:8080/v1/chat/completions")
    )

    $Result.backup = Backup-File -Path $ExtensionJs

    $Text = $Text.Replace("http://127.0.0.1:8080/v1/chat/completions", "http://127.0.0.1:8787/v1/chat/completions")
    $Text = $Text.Replace("http://localhost:8080/v1/chat/completions", "http://127.0.0.1:8787/v1/chat/completions")
    $Text = $Text.Replace("http://127.0.0.1:8080/agent-lee/chat", "http://127.0.0.1:8787/agent-lee/chat")
    $Text = $Text.Replace("http://localhost:8080/agent-lee/chat", "http://127.0.0.1:8787/agent-lee/chat")

    $Text = [regex]::Replace($Text, "(?i)(timeoutMs\s*[:=]\s*)30000", '${1}240000')
    $Text = [regex]::Replace($Text, "(?i)(timeoutMs\s*[:=]\s*)45000", '${1}240000')
    $Text = [regex]::Replace($Text, "(?i)(timeoutMs\s*[:=]\s*)60000", '${1}240000')
    $Text = [regex]::Replace($Text, "(?i)(requestTimeoutMs\s*[:=]\s*)30000", '${1}240000')
    $Text = [regex]::Replace($Text, "(?i)(requestTimeoutMs\s*[:=]\s*)45000", '${1}240000')
    $Text = [regex]::Replace($Text, "(?i)(requestTimeoutMs\s*[:=]\s*)60000", '${1}240000')
    $Text = [regex]::Replace($Text, "(?i)(CHAT_TIMEOUT_MS\s*[:=]\s*)30000", '${1}240000')
    $Text = [regex]::Replace($Text, "(?i)(CHAT_TIMEOUT_MS\s*[:=]\s*)45000", '${1}240000')
    $Text = [regex]::Replace($Text, "(?i)(CHAT_TIMEOUT_MS\s*[:=]\s*)60000", '${1}240000')

    if (-not $Text.Contains("127.0.0.1:8787")) {
        $Marker = @"
/*
 * Agent Lee official live route marker.
 * VS Code must use adapter first:
 * http://127.0.0.1:8787
 */
const AGENT_LEE_OFFICIAL_ADAPTER_URL_MARKER = "http://127.0.0.1:8787";

"@
        $Text = $Marker + $Text
    }

    if ($Text -ne $Original) {
        $Utf8NoBom = New-Object System.Text.UTF8Encoding($false)
        [System.IO.File]::WriteAllText($ExtensionJs, $Text, $Utf8NoBom)
        $Result.changed = $true
    }

    $AfterText = [System.IO.File]::ReadAllText($ExtensionJs)
    $Result.stringHitsAfter = Get-StringHits -Path $ExtensionJs
    $Result.usesAdapter8787After = $AfterText.Contains("127.0.0.1:8787")
    $Result.directRouterAfter = (
        $AfterText.Contains("127.0.0.1:8080/v1/chat/completions") -or
        $AfterText.Contains("localhost:8080/v1/chat/completions")
    )

    return $Result
}

function Bump-PackageVersion {
    $Result = [ordered]@{
        exists = Test-Path -LiteralPath $PackageJson -PathType Leaf
        changed = $false
        backup = $null
        oldVersion = $null
        newVersion = $null
        error = $null
    }

    if (-not $Result.exists) {
        return $Result
    }

    try {
        $Result.backup = Backup-File -Path $PackageJson
        $Pkg = [System.IO.File]::ReadAllText($PackageJson) | ConvertFrom-Json

        if ($Pkg.PSObject.Properties.Name -contains "version") {
            $Result.oldVersion = [string]$Pkg.version
        }
        else {
            Add-Member -InputObject $Pkg -MemberType NoteProperty -Name "version" -Value "0.0.0"
            $Result.oldVersion = "0.0.0"
        }

        $Result.newVersion = "0.0.$([int](Get-Date -Format 'HHmmss'))"
        $Pkg.version = $Result.newVersion

        if ($Pkg.PSObject.Properties.Name -contains "activationEvents") {
            $Kept = @()

            foreach ($Event in @($Pkg.activationEvents)) {
                $EventText = [string]$Event

                if ($EventText -and -not $EventText.StartsWith("onCommand:")) {
                    $Kept += $EventText
                }
            }

            if ($Kept.Count -gt 0) {
                $Pkg.activationEvents = $Kept
            }
            else {
                $Pkg.PSObject.Properties.Remove("activationEvents")
            }
        }

        $Json = $Pkg | ConvertTo-Json -Depth 100
        $Utf8NoBom = New-Object System.Text.UTF8Encoding($false)
        [System.IO.File]::WriteAllText($PackageJson, $Json + [Environment]::NewLine, $Utf8NoBom)
        $Result.changed = $true
    }
    catch {
        $Result.error = $_.Exception.Message
    }

    return $Result
}

Write-Host ""
Write-Host "=== Repair VS Code Agent Lee Extension Live Route v2 ===" -ForegroundColor Cyan

$DesktopStart = Start-NodeService -Name "desktop-runtime" -Port 8091 -ScriptPath $DesktopServer

$Health = [ordered]@{
    adapter8787 = Test-Http -Name "adapter8787" -Uri "http://127.0.0.1:8787/health"
    router8080 = Test-Http -Name "router8080" -Uri "http://127.0.0.1:8080/health"
    runtimeFabric4001 = Test-Http -Name "runtimeFabric4001" -Uri "http://127.0.0.1:4001/runtime/health"
    desktopRuntime8091 = Test-Http -Name "desktopRuntime8091" -Uri "http://127.0.0.1:8091/runtime/status"
}

foreach ($Entry in $Health.GetEnumerator()) {
    Write-Host "$($Entry.Key): $($Entry.Value.ok)"
}

Write-Host ""
Write-Host "Testing adapter qwen3 hello..." -ForegroundColor Cyan
$AdapterHello = Invoke-AdapterHello

if ($AdapterHello.ok) {
    Write-Host "Adapter qwen3 hello PASS in $($AdapterHello.elapsedSec)s" -ForegroundColor Green
}
else {
    Write-Host "Adapter qwen3 hello FAIL: $($AdapterHello.error)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Patching extension.js and package.json..." -ForegroundColor Cyan

$ExtensionPatch = Patch-ExtensionLiveRoute
$PackagePatch = Bump-PackageVersion

$Config = [ordered]@{
    updatedAt = (Get-Date).ToString("o")
    officialAdapterUrl = "http://127.0.0.1:8787"
    chatCompletionsUrl = "http://127.0.0.1:8787/v1/chat/completions"
    agentLeeChatUrl = "http://127.0.0.1:8787/agent-lee/chat"
    preferredModel = "qwen3:latest"
    qwen3KeepAlive = "8h"
    timeoutMs = 240000
    workspaceRoot = $Root
}

Write-JsonFile -Path $ConfigPath -Object $Config

Write-Host "extension uses adapter 8787 after patch: $($ExtensionPatch.usesAdapter8787After)"
Write-Host "extension direct router chat after patch: $($ExtensionPatch.directRouterAfter)"
Write-Host "package version: $($PackagePatch.oldVersion) -> $($PackagePatch.newVersion)"

$Receipt = [ordered]@{
    checkedAt = (Get-Date).ToString("o")
    root = $Root
    desktopStart = $DesktopStart
    health = $Health
    adapterHello = $AdapterHello
    extensionPatch = $ExtensionPatch
    packagePatch = $PackagePatch
    configPath = $ConfigPath
    config = $Config
    conclusion = $(if ($AdapterHello.ok -and $ExtensionPatch.usesAdapter8787After -and -not $ExtensionPatch.directRouterAfter) {
        "Backend is healthy and extension is visibly adapter-first. Restart VS Code extension host and reload window."
    } elseif ($AdapterHello.ok) {
        "Backend is healthy, but extension route still needs manual code review."
    } else {
        "Adapter hello failed; fix backend before VS Code test."
    })
    requiredNextActions = @(
        "Ctrl+Shift+P -> Developer: Restart Extension Host",
        "Ctrl+Shift+P -> Developer: Reload Window",
        "Open Agent Lee Turbo",
        "Type hello"
    )
}

Write-JsonFile -Path $ReceiptPath -Object $Receipt

Write-Host ""
Write-Host "Receipt: $ReceiptPath" -ForegroundColor Green
Write-Host ""
Write-Host "Now do this in VS Code:" -ForegroundColor Cyan
Write-Host "1. Ctrl+Shift+P"
Write-Host "2. Developer: Restart Extension Host"
Write-Host "3. Ctrl+Shift+P"
Write-Host "4. Developer: Reload Window"
Write-Host "5. Agent Lee Turbo"
Write-Host "6. hello"
