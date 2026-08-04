Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned -Force
$ErrorActionPreference = "Stop"

$Root = "D:\Leeway-Ecosystem v2.1.4"
Set-Location -LiteralPath $Root

$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$ReceiptDir = Join-Path $Root "Archive\receipts"
$BackupDir = Join-Path $Root "Archive\backups\vscode-agent-lee-live-path-$Stamp"
New-Item -ItemType Directory -Force -Path $ReceiptDir, $BackupDir | Out-Null

$ReceiptPath = Join-Path $ReceiptDir "agent-lee-vscode-live-path-verification-$Stamp.json"

$ExtensionJs = Join-Path $Root ".leeway-vscode\extensions\leeway-agent-lee-chat\extension.js"
$PackageJson = Join-Path $Root ".leeway-vscode\extensions\leeway-agent-lee-chat\package.json"
$AdapterServer = Join-Path $Root ".leeway-vscode\agent-lee-vscode-adapter\server.cjs"

function Write-JsonFile {
    param(
        [Parameter(Mandatory=$true)][string]$Path,
        [Parameter(Mandatory=$true)]$Object
    )

    $Json = $Object | ConvertTo-Json -Depth 80
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
    param(
        [string]$Name,
        [string]$Uri
    )

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

function Invoke-JsonPost {
    param(
        [string]$Uri,
        $Body,
        [int]$TimeoutSec = 240
    )

    return Invoke-RestMethod `
        -Uri $Uri `
        -Method Post `
        -ContentType "application/json" `
        -Body ($Body | ConvertTo-Json -Depth 40) `
        -TimeoutSec $TimeoutSec
}

function Test-AdapterHello {
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
            origin = "powershell-vscode-live-path-verification"
            workspaceRoot = $Root
            vscodeExtension = "leeway-agent-lee-chat"
            selectedModel = "qwen3:latest"
            adapterPort = 8787
            routerPort = 8080
            runtimeFabricPort = 4001
        }
    }

    $Started = Get-Date

    try {
        $Response = Invoke-JsonPost `
            -Uri "http://127.0.0.1:8787/v1/chat/completions" `
            -Body $Body `
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

function Patch-Extension {
    $Result = [ordered]@{
        path = $ExtensionJs
        exists = Test-Path -LiteralPath $ExtensionJs -PathType Leaf
        changed = $false
        backup = $null
        notes = @()
    }

    if (-not $Result.exists) {
        $Result.notes += "extension.js not found"
        return $Result
    }

    $Text = [System.IO.File]::ReadAllText($ExtensionJs)
    $Original = $Text
    $Result.backup = Backup-File -Path $ExtensionJs

    # Force adapter-first route in extension-side code.
    $Text = $Text.Replace("http://127.0.0.1:8080/v1/chat/completions", "http://127.0.0.1:8787/v1/chat/completions")
    $Text = $Text.Replace("http://localhost:8080/v1/chat/completions", "http://127.0.0.1:8787/v1/chat/completions")
    $Text = $Text.Replace("http://127.0.0.1:8080/agent-lee/chat", "http://127.0.0.1:8787/agent-lee/chat")
    $Text = $Text.Replace("http://localhost:8080/agent-lee/chat", "http://127.0.0.1:8787/agent-lee/chat")

    # Raise common VS Code-side timeout constants.
    $Text = [regex]::Replace($Text, "(?i)(timeoutMs\s*[:=]\s*)30000", '${1}240000')
    $Text = [regex]::Replace($Text, "(?i)(timeoutMs\s*[:=]\s*)45000", '${1}240000')
    $Text = [regex]::Replace($Text, "(?i)(timeoutMs\s*[:=]\s*)60000", '${1}240000')
    $Text = [regex]::Replace($Text, "(?i)(requestTimeoutMs\s*[:=]\s*)30000", '${1}240000')
    $Text = [regex]::Replace($Text, "(?i)(requestTimeoutMs\s*[:=]\s*)45000", '${1}240000')
    $Text = [regex]::Replace($Text, "(?i)(requestTimeoutMs\s*[:=]\s*)60000", '${1}240000')
    $Text = [regex]::Replace($Text, "(?i)(CHAT_TIMEOUT_MS\s*[:=]\s*)30000", '${1}240000')
    $Text = [regex]::Replace($Text, "(?i)(CHAT_TIMEOUT_MS\s*[:=]\s*)45000", '${1}240000')
    $Text = [regex]::Replace($Text, "(?i)(CHAT_TIMEOUT_MS\s*[:=]\s*)60000", '${1}240000')

    if ($Text -ne $Original) {
        $Utf8NoBom = New-Object System.Text.UTF8Encoding($false)
        [System.IO.File]::WriteAllText($ExtensionJs, $Text, $Utf8NoBom)
        $Result.changed = $true
    }

    $Result.usesAdapter8787 = $Text.Contains("127.0.0.1:8787")
    $Result.usesDirectRouter8080Chat = ($Text.Contains("127.0.0.1:8080/v1/chat/completions") -or $Text.Contains("localhost:8080/v1/chat/completions"))
    return $Result
}

function Bump-Package {
    $Result = [ordered]@{
        path = $PackageJson
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

        # Keep onCommand activationEvents removed; VS Code contributes.commands handles them.
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
Write-Host "=== Verify and Force VS Code Agent Lee Live Path ===" -ForegroundColor Cyan

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
$AdapterHello = Test-AdapterHello

if ($AdapterHello.ok) {
    Write-Host "Adapter qwen3 hello PASS in $($AdapterHello.elapsedSec)s" -ForegroundColor Green
}
else {
    Write-Host "Adapter qwen3 hello FAIL: $($AdapterHello.error)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Patching extension route/timeout and bumping version..." -ForegroundColor Cyan
$ExtensionPatch = Patch-Extension
$PackagePatch = Bump-Package

Write-Host "extension uses adapter 8787: $($ExtensionPatch.usesAdapter8787)"
Write-Host "extension direct router chat remains: $($ExtensionPatch.usesDirectRouter8080Chat)"
Write-Host "package version: $($PackagePatch.oldVersion) -> $($PackagePatch.newVersion)"

$Receipt = [ordered]@{
    checkedAt = (Get-Date).ToString("o")
    root = $Root
    health = $Health
    adapterHello = $AdapterHello
    extensionPatch = $ExtensionPatch
    packagePatch = $PackagePatch
    conclusion = $(if ($AdapterHello.ok -and $ExtensionPatch.usesAdapter8787 -and -not $ExtensionPatch.usesDirectRouter8080Chat) {
        "Backend and adapter are healthy. Extension is adapter-first. Reload VS Code extension host."
    } elseif ($AdapterHello.ok) {
        "Backend and adapter are healthy, but extension still needs route audit."
    } else {
        "Backend adapter path is not healthy; do not test VS Code yet."
    })
    requiredNextActions = @(
        "In VS Code: Ctrl+Shift+P",
        "Run: Developer: Restart Extension Host",
        "Run: Developer: Reload Window",
        "Open Agent Lee Turbo",
        "Type: hello"
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
