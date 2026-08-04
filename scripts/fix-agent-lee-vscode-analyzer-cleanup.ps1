Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned -Force
$ErrorActionPreference = "Stop"

$Root = "D:\Leeway-Ecosystem v2.1.4"
if (-not (Test-Path -LiteralPath $Root -PathType Container)) {
    throw "Leeway root not found: $Root"
}

Set-Location -LiteralPath $Root

$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)

$PackageJson = Join-Path $Root ".leeway-vscode\extensions\leeway-agent-lee-chat\package.json"
$Validator = Join-Path $Root "agent-lee-coding-mode\tools\validate-agent-lee-vscode-chat-full-usability.ps1"
$RestartRouter = Join-Path $Root "scripts\restart-router.ps1"

$Changed = New-Object System.Collections.Generic.List[string]
$Warnings = New-Object System.Collections.Generic.List[string]

function Backup-LeewayFile {
    param([Parameter(Mandatory=$true)][string]$Path)

    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        $script:Warnings.Add("Missing file, skipped: $Path")
        return $false
    }

    $Backup = "$Path.bak-fix-analyzer-cleanup-$script:Stamp"
    Copy-Item -LiteralPath $Path -Destination $Backup -Force
    return $true
}

function Write-Utf8NoBom {
    param(
        [Parameter(Mandatory=$true)][string]$Path,
        [Parameter(Mandatory=$true)][string]$Content
    )

    [System.IO.File]::WriteAllText($Path, $Content, $script:Utf8NoBom)
}

function Test-PowerShellParse {
    param([Parameter(Mandatory=$true)][string]$Path)

    $ParseErrors = $null
    $null = [System.Management.Automation.PSParser]::Tokenize(
        ([System.IO.File]::ReadAllText($Path)),
        [ref]$ParseErrors
    )

    if ($ParseErrors -and $ParseErrors.Count -gt 0) {
        Write-Host "Parser errors in ${Path}:" -ForegroundColor Red
        $ParseErrors | Format-List | Out-String | Write-Host
        throw "Parser check failed: $Path"
    }

    Write-Host "Parser check OK: $Path" -ForegroundColor Green
}

function Remove-SimpleVariableAssignmentLine {
    param(
        [Parameter(Mandatory=$true)][string]$Text,
        [Parameter(Mandatory=$true)][string]$Name
    )

    $EscapedName = [regex]::Escape($Name)
    $Pattern = '(?m)^[ \t]*\$' + $EscapedName + '[ \t]*=[^\r\n]*(\r?\n)?'
    return [regex]::Replace($Text, $Pattern, '')
}

function Rename-TokenEverywhere {
    param(
        [Parameter(Mandatory=$true)][string]$Text,
        [Parameter(Mandatory=$true)][string]$OldName,
        [Parameter(Mandatory=$true)][string]$NewName
    )

    $Pattern = '(?<![A-Za-z0-9_-])' + [regex]::Escape($OldName) + '(?![A-Za-z0-9_-])'
    return [regex]::Replace($Text, $Pattern, $NewName)
}

Write-Host ""
Write-Host "=== Leeway Agent Lee VS Code Analyzer Cleanup v2 ===" -ForegroundColor Cyan
Write-Host "Root: $Root"
Write-Host "Stamp: $Stamp"
Write-Host ""

# 1. Clean package.json activationEvents.
if (Backup-LeewayFile -Path $PackageJson) {
    Write-Host "Cleaning package.json activationEvents..." -ForegroundColor Yellow

    $Raw = [System.IO.File]::ReadAllText($PackageJson)
    $Json = $Raw | ConvertFrom-Json

    if ($Json.PSObject.Properties.Name -contains "activationEvents") {
        $OriginalEvents = @($Json.activationEvents)
        $KeptEvents = @()

        foreach ($Event in $OriginalEvents) {
            $EventText = [string]$Event

            if ($EventText -and -not $EventText.StartsWith("onCommand:")) {
                $KeptEvents += $EventText
            }
        }

        if ($KeptEvents.Count -gt 0) {
            $Json.activationEvents = $KeptEvents
        }
        else {
            $Json.PSObject.Properties.Remove("activationEvents")
        }

        $FixedJson = $Json | ConvertTo-Json -Depth 100
        Write-Utf8NoBom -Path $PackageJson -Content ($FixedJson + [Environment]::NewLine)
        $Changed.Add($PackageJson)
    }
    else {
        Write-Host "package.json already has no activationEvents property." -ForegroundColor DarkGray
    }

    $null = [System.IO.File]::ReadAllText($PackageJson) | ConvertFrom-Json
    Write-Host "package.json JSON validation OK" -ForegroundColor Green
}

# 2. Clean validator analyzer warnings.
if (Backup-LeewayFile -Path $Validator) {
    Write-Host "Cleaning validator analyzer warnings..." -ForegroundColor Yellow

    $Text = [System.IO.File]::ReadAllText($Validator)

    $RenameMap = [ordered]@{
        "Normalize-Text"          = "ConvertTo-NormalizedText"
        "Extract-ResponseContent" = "Get-ResponseContent"
        "Extract-ResponseMode"    = "Get-ResponseMode"
        "Extract-SelectedBackend" = "Get-SelectedBackend"
        "Extract-FallbackUsed"    = "Get-FallbackUsed"
        "Extract-TimeoutValue"    = "Get-TimeoutValue"
        "Has-StaleTimeoutText"    = "Test-StaleTimeoutText"
        "To-DataUri"              = "ConvertTo-DataUri"
    }

    foreach ($OldName in $RenameMap.Keys) {
        $Text = Rename-TokenEverywhere -Text $Text -OldName $OldName -NewName $RenameMap[$OldName]
    }

    $UnusedNames = @(
        "RouterUrl",
        "AdapterUrl",
        "VoiceStatusUrl",
        "OllamaUrl",
        "CodingBackend",
        "hands2Pattern"
    )

    foreach ($Name in $UnusedNames) {
        $Text = Remove-SimpleVariableAssignmentLine -Text $Text -Name $Name
    }

    $Text = [regex]::Replace(
        $Text,
        "\(\s*(\$\w+(?:\.\w+)*)\s+-eq\s+\$null\s*\)",
        '($null -eq $1)'
    )

    $Text = [regex]::Replace(
        $Text,
        "\(\s*(\$\w+(?:\.\w+)*)\s+-ne\s+\$null\s*\)",
        '($null -ne $1)'
    )

    Write-Utf8NoBom -Path $Validator -Content $Text
    $Changed.Add($Validator)

    Test-PowerShellParse -Path $Validator
}

# 3. Clean restart-router.ps1 null comparisons.
if (Test-Path -LiteralPath $RestartRouter -PathType Leaf) {
    if (Backup-LeewayFile -Path $RestartRouter) {
        Write-Host "Cleaning restart-router.ps1 null comparisons..." -ForegroundColor Yellow

        $Text = [System.IO.File]::ReadAllText($RestartRouter)

        $Text = [regex]::Replace(
            $Text,
            "\(\s*(\$\w+(?:\.\w+)*)\s+-eq\s+\$null\s*\)",
            '($null -eq $1)'
        )

        $Text = [regex]::Replace(
            $Text,
            "\(\s*(\$\w+(?:\.\w+)*)\s+-ne\s+\$null\s*\)",
            '($null -ne $1)'
        )

        Write-Utf8NoBom -Path $RestartRouter -Content $Text
        $Changed.Add($RestartRouter)

        Test-PowerShellParse -Path $RestartRouter
    }
}
else {
    $Warnings.Add("restart-router.ps1 not found, skipped: $RestartRouter")
}

# 4. Optional PSScriptAnalyzer check.
Write-Host ""
Write-Host "Checking for PSScriptAnalyzer..." -ForegroundColor Cyan

$Analyzer = Get-Module -ListAvailable -Name PSScriptAnalyzer | Select-Object -First 1

if ($null -ne $Analyzer) {
    Import-Module PSScriptAnalyzer -ErrorAction Stop

    $AnalyzerTargets = @()

    if (Test-Path -LiteralPath $Validator -PathType Leaf) {
        $AnalyzerTargets += $Validator
    }

    if (Test-Path -LiteralPath $RestartRouter -PathType Leaf) {
        $AnalyzerTargets += $RestartRouter
    }

    foreach ($Target in $AnalyzerTargets) {
        Write-Host "Running PSScriptAnalyzer: $Target" -ForegroundColor Cyan
        $Findings = Invoke-ScriptAnalyzer -Path $Target -Severity Warning,Error

        if ($Findings) {
            Write-Host ""
            Write-Host "Remaining analyzer findings for ${Target}:" -ForegroundColor Yellow
            $Findings | Format-Table RuleName, Severity, Line, Column, Message -AutoSize
        }
        else {
            Write-Host "PSScriptAnalyzer clean: $Target" -ForegroundColor Green
        }
    }
}
else {
    Write-Host "PSScriptAnalyzer not installed; parser checks completed instead." -ForegroundColor DarkYellow
}

Write-Host ""
Write-Host "=== Cleanup Complete ===" -ForegroundColor Green

if ($Changed.Count -gt 0) {
    Write-Host "Changed files:" -ForegroundColor Green
    $Changed | Sort-Object -Unique | ForEach-Object { Write-Host "- $_" }
}
else {
    Write-Host "No files changed." -ForegroundColor Yellow
}

if ($Warnings.Count -gt 0) {
    Write-Host ""
    Write-Host "Warnings:" -ForegroundColor Yellow
    $Warnings | ForEach-Object { Write-Host "- $_" -ForegroundColor Yellow }
}

Write-Host ""
Write-Host "Next command:" -ForegroundColor Cyan
Write-Host 'powershell.exe -ExecutionPolicy Bypass -File "scripts\test-agent-lee-vscode-stack.ps1"'
Write-Host ""
