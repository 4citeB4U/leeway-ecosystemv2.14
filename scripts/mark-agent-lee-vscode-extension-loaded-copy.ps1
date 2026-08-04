Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned -Force
$ErrorActionPreference = "Stop"

$Root = "D:\Leeway-Ecosystem v2.1.4"
Set-Location -LiteralPath $Root

$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$ReceiptDir = Join-Path $Root "Archive\receipts"
$BackupDir = Join-Path $Root "Archive\backups\agent-lee-vscode-loaded-copy-marker-$Stamp"
New-Item -ItemType Directory -Force -Path $ReceiptDir, $BackupDir | Out-Null

$ReceiptPath = Join-Path $ReceiptDir "agent-lee-vscode-loaded-copy-marker-$Stamp.json"

$ExtRoot = Join-Path $Root ".leeway-vscode\extensions\leeway-agent-lee-chat"
$PackageJson = Join-Path $ExtRoot "package.json"
$ExtensionJs = Join-Path $ExtRoot "extension.js"

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

    $Relative = (Resolve-Path -LiteralPath $Path).Path.Substring($Root.Length).TrimStart("\")
    $Safe = $Relative -replace "[:\\\/]", "__"
    $Backup = Join-Path $BackupDir $Safe
    Copy-Item -LiteralPath $Path -Destination $Backup -Force
    return $Backup
}

if (-not (Test-Path -LiteralPath $PackageJson -PathType Leaf)) {
    throw "package.json not found: $PackageJson"
}

if (-not (Test-Path -LiteralPath $ExtensionJs -PathType Leaf)) {
    throw "extension.js not found: $ExtensionJs"
}

$Marker = "AGENT_LEE_LOADED_COPY_MARKER_$Stamp"

$PkgBackup = Backup-File -Path $PackageJson
$ExtBackup = Backup-File -Path $ExtensionJs

$Pkg = [System.IO.File]::ReadAllText($PackageJson) | ConvertFrom-Json

$OldVersion = if ($Pkg.PSObject.Properties.Name -contains "version") { [string]$Pkg.version } else { "0.0.0" }
$NewVersion = "0.0.$([int](Get-Date -Format 'HHmmss'))"

if ($Pkg.PSObject.Properties.Name -contains "version") {
    $Pkg.version = $NewVersion
}
else {
    Add-Member -InputObject $Pkg -MemberType NoteProperty -Name "version" -Value $NewVersion
}

$Json = $Pkg | ConvertTo-Json -Depth 100
$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($PackageJson, $Json + [Environment]::NewLine, $Utf8NoBom)

$ExtText = [System.IO.File]::ReadAllText($ExtensionJs)

$MarkerBlock = @"

// $Marker
const AGENT_LEE_LOADED_COPY_MARKER = "$Marker";

"@

if (-not $ExtText.Contains("AGENT_LEE_LOADED_COPY_MARKER")) {
    $ExtText = $MarkerBlock + $ExtText
}
else {
    $ExtText = [regex]::Replace(
        $ExtText,
        'const\s+AGENT_LEE_LOADED_COPY_MARKER\s*=\s*"[^"]*"\s*;',
        ('const AGENT_LEE_LOADED_COPY_MARKER = "' + $Marker + '";')
    )
}

[System.IO.File]::WriteAllText($ExtensionJs, $ExtText, $Utf8NoBom)

$Receipt = [ordered]@{
    status = "MARKER_WRITTEN"
    checkedAt = (Get-Date).ToString("o")
    root = $Root
    extensionRoot = $ExtRoot
    packageJson = $PackageJson
    extensionJs = $ExtensionJs
    marker = $Marker
    oldVersion = $OldVersion
    newVersion = $NewVersion
    backups = @{
        packageJson = $PkgBackup
        extensionJs = $ExtBackup
    }
    nextActions = @(
        "In VS Code: Ctrl+Shift+P -> Developer: Restart Extension Host",
        "Then: Ctrl+Shift+P -> Developer: Reload Window",
        "Then open extension host logs / DevTools and search for marker",
        "If marker is not visible, VS Code is loading a different extension copy"
    )
}

Write-JsonFile -Path $ReceiptPath -Object $Receipt

Write-Host ""
Write-Host "Marker written: $Marker" -ForegroundColor Green
Write-Host "Package version: $OldVersion -> $NewVersion"
Write-Host "Receipt: $ReceiptPath"
Write-Host ""
Write-Host "Now in VS Code:"
Write-Host "1. Ctrl+Shift+P -> Developer: Restart Extension Host"
Write-Host "2. Ctrl+Shift+P -> Developer: Reload Window"
Write-Host "3. Open Agent Lee Turbo"
Write-Host "4. Type: hello"
Write-Host ""
Write-Host "If hello still fails, search VS Code logs/devtools for:"
Write-Host $Marker
