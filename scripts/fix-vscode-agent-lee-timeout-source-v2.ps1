Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned -Force
$ErrorActionPreference = "Stop"

$Root = "D:\Leeway-Ecosystem v2.1.4"
if (-not (Test-Path -LiteralPath $Root -PathType Container)) {
    throw "Leeway root not found: $Root"
}

Set-Location -LiteralPath $Root

$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$ReceiptDir = Join-Path $Root "Archive\receipts"
$BackupDir = Join-Path $Root "Archive\backups\vscode-agent-lee-timeout-source-v2-$Stamp"
$LogDir = Join-Path $Root "Archive\logs\vscode-agent-lee-timeout-source-v2"

New-Item -ItemType Directory -Force -Path $ReceiptDir, $BackupDir, $LogDir | Out-Null

$ReceiptPath = Join-Path $ReceiptDir "agent-lee-vscode-timeout-source-fix-v2-$Stamp.json"

$AdapterUrl = "http://127.0.0.1:8787"
$RouterUrl = "http://127.0.0.1:8080"
$RuntimeFabricUrl = "http://127.0.0.1:4001"
$DesktopRuntimeUrl = "http://127.0.0.1:8091"

$TimeoutNeedles = @(
    "Agent Lee is online, but the downstream model backend did not respond within the VS Code chat window",
    "Backend note: request timed out",
    "downstream model backend did not respond",
    "request timed out",
    "model backend"
)

$SearchRoots = @(
    ".leeway-vscode",
    "agent-lee-coding-mode\router",
    "Leeway Runtime Fabric\server",
    "agent-lee-coding-mode\desktop-runtime"
)

$FileExtensions = @("*.js", "*.cjs", "*.mjs", "*.ts", "*.json", "*.ps1")

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

    $Resolved = Resolve-Path -LiteralPath $Path
    $Relative = $Resolved.Path.Substring($Root.Length).TrimStart("\")
    $SafeName = $Relative -replace "[:\\\/]", "__"
    $BackupPath = Join-Path $BackupDir $SafeName

    Copy-Item -LiteralPath $Path -Destination $BackupPath -Force
    return $BackupPath
}

function Test-Http {
    param(
        [Parameter(Mandatory=$true)][string]$Name,
        [Parameter(Mandatory=$true)][string]$Uri
    )

    try {
        $Response = Invoke-WebRequest -UseBasicParsing -Uri $Uri -TimeoutSec 15
        return [ordered]@{
            name = $Name
            ok = $true
            statusCode = $Response.StatusCode
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
        [Parameter(Mandatory=$true)][string]$Uri,
        [Parameter(Mandatory=$true)]$Body,
        [int]$TimeoutSec = 240
    )

    $JsonBody = $Body | ConvertTo-Json -Depth 40

    return Invoke-RestMethod `
        -Uri $Uri `
        -Method Post `
        -ContentType "application/json" `
        -Body $JsonBody `
        -TimeoutSec $TimeoutSec
}

function Invoke-AdapterQwen3Hello {
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
            origin = "powershell-timeout-source-fix-v2"
            workspaceRoot = $Root
            selectedModel = "qwen3:latest"
            adapterPort = 8787
            routerPort = 8080
            runtimeFabricPort = 4001
        }
    }

    $Started = Get-Date

    try {
        $Response = Invoke-JsonPost `
            -Uri "$AdapterUrl/v1/chat/completions" `
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

function Get-SearchFiles {
    $Files = New-Object System.Collections.Generic.List[string]

    foreach ($SearchRoot in $SearchRoots) {
        $FullRoot = Join-Path $Root $SearchRoot

        if (-not (Test-Path -LiteralPath $FullRoot -PathType Container)) {
            continue
        }

        foreach ($Ext in $FileExtensions) {
            Get-ChildItem -LiteralPath $FullRoot -Recurse -File -Filter $Ext -ErrorAction SilentlyContinue |
                Where-Object {
                    $_.FullName -notmatch "\\node_modules\\" -and
                    $_.FullName -notmatch "\\Archive\\" -and
                    $_.FullName -notmatch "\.bak" -and
                    $_.FullName -notmatch "\\dist\\"
                } |
                ForEach-Object {
                    $Files.Add($_.FullName)
                }
        }
    }

    return @($Files | Sort-Object -Unique)
}

function Find-TimeoutSourceFiles {
    param([string[]]$Files)

    $Matches = New-Object System.Collections.Generic.List[object]

    foreach ($File in $Files) {
        try {
            $Text = [System.IO.File]::ReadAllText($File)
            $HitNeedles = @()

            foreach ($Needle in $TimeoutNeedles) {
                if ($Text.Contains($Needle)) {
                    $HitNeedles += $Needle
                }
            }

            if ($HitNeedles.Count -gt 0) {
                $Matches.Add([ordered]@{
                    path = $File
                    needles = $HitNeedles
                })
            }
        }
        catch {
        }
    }

    return @($Matches)
}

function Patch-FileText {
    param(
        [Parameter(Mandatory=$true)][string]$Path,
        [Parameter(Mandatory=$true)][string]$Text
    )

    $Patched = $Text

    # Raise likely timeout constants for Qwen3 cold start.
    $Patched = [regex]::Replace($Patched, "(?i)(timeoutMs\s*[:=]\s*)30000", '${1}240000')
    $Patched = [regex]::Replace($Patched, "(?i)(timeoutMs\s*[:=]\s*)45000", '${1}240000')
    $Patched = [regex]::Replace($Patched, "(?i)(timeoutMs\s*[:=]\s*)60000", '${1}240000')
    $Patched = [regex]::Replace($Patched, "(?i)(requestTimeoutMs\s*[:=]\s*)30000", '${1}240000')
    $Patched = [regex]::Replace($Patched, "(?i)(requestTimeoutMs\s*[:=]\s*)45000", '${1}240000')
    $Patched = [regex]::Replace($Patched, "(?i)(requestTimeoutMs\s*[:=]\s*)60000", '${1}240000')
    $Patched = [regex]::Replace($Patched, "(?i)(CHAT_TIMEOUT_MS\s*[:=]\s*)30000", '${1}240000')
    $Patched = [regex]::Replace($Patched, "(?i)(CHAT_TIMEOUT_MS\s*[:=]\s*)45000", '${1}240000')
    $Patched = [regex]::Replace($Patched, "(?i)(CHAT_TIMEOUT_MS\s*[:=]\s*)60000", '${1}240000')

    # Common AbortController timeout patterns.
    $Patched = [regex]::Replace($Patched, "(?i)(setTimeout\s*\([^,]+,\s*)30000(\s*\))", '${1}240000${2}')
    $Patched = [regex]::Replace($Patched, "(?i)(setTimeout\s*\([^,]+,\s*)45000(\s*\))", '${1}240000${2}')
    $Patched = [regex]::Replace($Patched, "(?i)(setTimeout\s*\([^,]+,\s*)60000(\s*\))", '${1}240000${2}')

    # Extension must prefer adapter path over direct router path.
    if ($Path -match "\\.leeway-vscode\\extensions\\leeway-agent-lee-chat\\") {
        $Patched = $Patched.Replace("http://127.0.0.1:8080/v1/chat/completions", "http://127.0.0.1:8787/v1/chat/completions")
        $Patched = $Patched.Replace("http://localhost:8080/v1/chat/completions", "http://127.0.0.1:8787/v1/chat/completions")
        $Patched = $Patched.Replace("http://127.0.0.1:8080/agent-lee/chat", "http://127.0.0.1:8787/agent-lee/chat")
        $Patched = $Patched.Replace("http://localhost:8080/agent-lee/chat", "http://127.0.0.1:8787/agent-lee/chat")
    }

    return $Patched
}

function Bump-ExtensionVersion {
    $PackageJson = Join-Path $Root ".leeway-vscode\extensions\leeway-agent-lee-chat\package.json"

    if (-not (Test-Path -LiteralPath $PackageJson -PathType Leaf)) {
        return [ordered]@{
            ok = $false
            error = "package.json not found"
            path = $PackageJson
        }
    }

    try {
        $Backup = Backup-File -Path $PackageJson
        $Package = [System.IO.File]::ReadAllText($PackageJson) | ConvertFrom-Json

        $OldVersion = $null
        $NewVersion = "0.0.$([int](Get-Date -Format 'HHmmss'))"

        if ($Package.PSObject.Properties.Name -contains "version") {
            $OldVersion = [string]$Package.version
            $Package.version = $NewVersion
        }
        else {
            Add-Member -InputObject $Package -MemberType NoteProperty -Name "version" -Value $NewVersion
        }

        $Json = $Package | ConvertTo-Json -Depth 100
        $Utf8NoBom = New-Object System.Text.UTF8Encoding($false)
        [System.IO.File]::WriteAllText($PackageJson, $Json + [Environment]::NewLine, $Utf8NoBom)

        return [ordered]@{
            ok = $true
            path = $PackageJson
            backup = $Backup
            oldVersion = $OldVersion
            newVersion = $NewVersion
        }
    }
    catch {
        return [ordered]@{
            ok = $false
            path = $PackageJson
            error = $_.Exception.Message
        }
    }
}

Write-Host ""
Write-Host "=== Agent Lee VS Code Timeout Source Fix v2 ===" -ForegroundColor Cyan
Write-Host "Root: $Root"
Write-Host "Stamp: $Stamp"
Write-Host ""

$Health = [ordered]@{
    adapter = Test-Http -Name "adapter" -Uri "$AdapterUrl/health"
    router = Test-Http -Name "router" -Uri "$RouterUrl/health"
    runtimeFabric = Test-Http -Name "runtimeFabric" -Uri "$RuntimeFabricUrl/runtime/health"
    desktopRuntime = Test-Http -Name "desktopRuntime" -Uri "$DesktopRuntimeUrl/runtime/status"
}

Write-Host "Health:" -ForegroundColor Cyan
foreach ($Entry in $Health.GetEnumerator()) {
    Write-Host "$($Entry.Key): $($Entry.Value.ok)"
}

Write-Host ""
Write-Host "Testing proven adapter qwen3 path..." -ForegroundColor Cyan
$AdapterProbe = Invoke-AdapterQwen3Hello

if ($AdapterProbe.ok) {
    Write-Host "Adapter qwen3 hello PASS in $($AdapterProbe.elapsedSec)s" -ForegroundColor Green
}
else {
    Write-Host "Adapter qwen3 hello FAIL: $($AdapterProbe.error)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Scanning source files for stale timeout message..." -ForegroundColor Cyan

$AllFiles = Get-SearchFiles
$TimeoutSourceMatches = Find-TimeoutSourceFiles -Files $AllFiles

Write-Host "Timeout source matches found: $($TimeoutSourceMatches.Count)" -ForegroundColor Yellow
foreach ($Match in $TimeoutSourceMatches) {
    Write-Host "- $($Match.path)" -ForegroundColor Yellow
}

$PatchedFiles = New-Object System.Collections.Generic.List[object]

foreach ($Match in $TimeoutSourceMatches) {
    $Path = [string]$Match.path

    try {
        $Original = [System.IO.File]::ReadAllText($Path)
        $Backup = Backup-File -Path $Path
        $Patched = Patch-FileText -Path $Path -Text $Original

        if ($Patched -ne $Original) {
            $Utf8NoBom = New-Object System.Text.UTF8Encoding($false)
            [System.IO.File]::WriteAllText($Path, $Patched, $Utf8NoBom)

            $PatchedFiles.Add([ordered]@{
                path = $Path
                backup = $Backup
                changed = $true
            })

            Write-Host "Patched: $Path" -ForegroundColor Green
        }
        else {
            $PatchedFiles.Add([ordered]@{
                path = $Path
                backup = $Backup
                changed = $false
            })

            Write-Host "Matched but no safe patch applied: $Path" -ForegroundColor DarkYellow
        }
    }
    catch {
        $PatchedFiles.Add([ordered]@{
            path = $Path
            changed = $false
            error = $_.Exception.Message
        })
    }
}

$PackageVersionPatch = Bump-ExtensionVersion

if ($PackageVersionPatch.ok) {
    Write-Host "Bumped extension version: $($PackageVersionPatch.oldVersion) -> $($PackageVersionPatch.newVersion)" -ForegroundColor Green
}
else {
    Write-Host "Package version bump warning: $($PackageVersionPatch.error)" -ForegroundColor DarkYellow
}

$Receipt = [ordered]@{
    checkedAt = (Get-Date).ToString("o")
    root = $Root
    health = $Health
    adapterProbe = $AdapterProbe
    timeoutSourceMatches = $TimeoutSourceMatches
    patchedFiles = $PatchedFiles
    packageVersionPatch = $PackageVersionPatch
    conclusion = $(if ($AdapterProbe.ok -and $TimeoutSourceMatches.Count -gt 0) {
        "Adapter/Qwen3 path is healthy. Timeout source files were found. Reload VS Code extension host after patch."
    } elseif ($AdapterProbe.ok) {
        "Adapter/Qwen3 path is healthy. Timeout text not found in source files; VS Code may be using stale extension host or another extension install path."
    } else {
        "Adapter/Qwen3 path is not healthy. Fix backend before VS Code test."
    })
    requiredNextActions = @(
        "Ctrl+Shift+P -> Developer: Reload Window",
        "If still stale: Ctrl+Shift+P -> Developer: Restart Extension Host",
        "Open Agent Lee Turbo",
        "Type hello"
    )
}

Write-JsonFile -Path $ReceiptPath -Object $Receipt

Write-Host ""
Write-Host "=== Fix Complete ===" -ForegroundColor Green
Write-Host "Receipt: $ReceiptPath"
Write-Host ""
Write-Host "Required VS Code actions:"
Write-Host "1. Ctrl+Shift+P"
Write-Host "2. Developer: Reload Window"
Write-Host "3. Agent Lee Turbo"
Write-Host "4. hello"
Write-Host ""
