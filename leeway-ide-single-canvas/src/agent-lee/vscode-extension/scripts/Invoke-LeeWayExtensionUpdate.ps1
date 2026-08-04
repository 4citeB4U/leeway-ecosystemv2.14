<#
LEEWAY_HEADER - DO NOT REMOVE
REGION: 🟢 CORE
TAG: CORE.RUNTIME.EXTENSION.UPDATE
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
PURPOSE: Clean install/update of local Agent Lee extension - removes stale versions and installs fresh VSIX.
#>

param(
  [string]$ExtensionDir = (Join-Path $PSScriptRoot ".."),
  [string]$VsixVersion = "1.2.9",
  [switch]$Force
)

$ErrorActionPreference = "Stop"

Write-Host "====== Agent Lee Extension Update Script ======" -ForegroundColor Cyan
Write-Host "Target version: $VsixVersion" -ForegroundColor Yellow

# Resolve paths
$resolvedExtensionDir = (Resolve-Path $ExtensionDir).Path
$vsixPath = Join-Path $resolvedExtensionDir "agent-lee-leeway-coding-system-$VsixVersion.vsix"
$vscodeExtPath = Join-Path $env:USERPROFILE ".vscode\extensions"
$agentLeeExtFolder = "leeway.agent-lee-leeway-coding-system-$VsixVersion"
$targetInstallPath = Join-Path $vscodeExtPath $agentLeeExtFolder

if (-not (Test-Path $vsixPath)) {
  Write-Host "ERROR: VSIX file not found at $vsixPath" -ForegroundColor Red
  Write-Host "Available VSIX files:" -ForegroundColor Yellow
  Get-ChildItem -Path $resolvedExtensionDir -Name "agent-lee-*.vsix" | ForEach-Object { Write-Host "  $_" }
  exit 1
}

# Step 1: Kill all running VS Code processes to release file locks
Write-Host "`n[1/5] Stopping VS Code and extension host processes..." -ForegroundColor Cyan
Get-Process | Where-Object { $_.ProcessName -match "^(Code|node)$" } | ForEach-Object {
  Write-Host "  Stopping $($_.ProcessName) (PID: $($_.Id))"
  Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
}
Start-Sleep -Seconds 2

# Step 2: Remove ALL old versions of Agent Lee extension
Write-Host "`n[2/5] Removing old Agent Lee extension versions..." -ForegroundColor Cyan
Get-ChildItem -Path $vscodeExtPath -Filter "leeway.agent-lee*" -Directory | ForEach-Object {
  Write-Host "  Removing $_"
  Remove-Item -LiteralPath $_.FullName -Recurse -Force -ErrorAction Stop
}

# Step 3: Extract VSIX to the target location
Write-Host "`n[3/5] Installing new version from VSIX..." -ForegroundColor Cyan
$tempExtractPath = Join-Path ([System.IO.Path]::GetTempPath()) ("leeway-install-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Force -Path $tempExtractPath | Out-Null
Write-Host "  Extracting VSIX to temp location..."
Expand-Archive -LiteralPath $vsixPath -DestinationPath $tempExtractPath -Force

# Copy the 'extension' subfolder from VSIX to final location
$sourcePath = Join-Path $tempExtractPath "extension"
Write-Host "  Moving extension to $agentLeeExtFolder..."
Move-Item -LiteralPath $sourcePath -Destination $targetInstallPath -Force -ErrorAction Stop

# Clean up temp
Remove-Item -LiteralPath $tempExtractPath -Recurse -Force -ErrorAction SilentlyContinue

# Step 4: Verify installation
Write-Host "`n[4/5] Verifying installation..." -ForegroundColor Cyan
$installedPackageJson = Join-Path $targetInstallPath "package.json"
if (Test-Path $installedPackageJson) {
  $pkg = Get-Content $installedPackageJson | ConvertFrom-Json
  Write-Host "  ✓ Installation folder exists" -ForegroundColor Green
  Write-Host "  ✓ Package name: $($pkg.name)" -ForegroundColor Green
  Write-Host "  ✓ Version: $($pkg.version)" -ForegroundColor Green
  
  $requiredAssets = @(
    "out/extension.js",
    "package.json",
    "README.md",
    "media/agent-lee-activitybar-icon.svg",
    "build/runtime-build-info.json"
  )
  
  $allPresent = $true
  foreach ($asset in $requiredAssets) {
    $assetPath = Join-Path $targetInstallPath $asset
    if (Test-Path $assetPath) {
      Write-Host "  ✓ $asset" -ForegroundColor Green
    }
    else {
      Write-Host "  ✗ $asset (MISSING)" -ForegroundColor Red
      $allPresent = $false
    }
  }
  
  if (-not $allPresent) {
    Write-Host "`nWARNING: Some assets are missing. The extension may not work properly." -ForegroundColor Yellow
  }
}
else {
  Write-Host "  ✗ Installation failed - package.json not found" -ForegroundColor Red
  exit 1
}

# Step 5: Report completion
Write-Host "`n[5/5] Installation complete!" -ForegroundColor Green
Write-Host "`n=== NEXT STEPS ===" -ForegroundColor Cyan
Write-Host "1. Launch VS Code (extension will activate automatically)"
Write-Host "2. You should see the Agent Lee icon in the Activity Bar (left sidebar)"
Write-Host "3. Check the status bar (bottom right) for 'Agent Lee: Ready'"
Write-Host "`nIf you don't see the icon or status, try:" -ForegroundColor Yellow
Write-Host "  - Reload window (Cmd/Ctrl+R)"
Write-Host "  - Disable and re-enable the extension in Extensions view"
Write-Host "  - Check Extension Output for errors (View > Output > select 'Agent Lee')"

# Optional: Launch VS Code if requested
Write-Host "`nStarting VS Code..." -ForegroundColor Cyan
Start-Process "code" -NoNewWindow
