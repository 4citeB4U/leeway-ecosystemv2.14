param(
    [string]$VsixPath = "agent-lee-leeway-coding-system-1.2.18.vsix"
)

Add-Type -AssemblyName System.IO.Compression.FileSystem

$fullPath = Join-Path (Split-Path $PSScriptRoot -Parent) $VsixPath
$zip = [System.IO.Compression.ZipFile]::OpenRead($fullPath)

try {
    $packageEntry = $zip.Entries | Where-Object { $_.FullName -eq 'extension/package.json' }
    
    if ($packageEntry) {
        $stream = $packageEntry.Open()
        $reader = New-Object System.IO.StreamReader($stream)
        $content = $reader.ReadToEnd()
        $reader.Close()
        $stream.Close()
        
        $json = $content | ConvertFrom-Json
        
        Write-Host "=== VSIX Package Metadata ===" -ForegroundColor Cyan
        Write-Host "Publisher: $($json.publisher)" -ForegroundColor Green
        Write-Host "Name: $($json.name)" -ForegroundColor Green
        Write-Host "Version: $($json.version)" -ForegroundColor Green
        Write-Host "DisplayName: $($json.displayName)" -ForegroundColor Green
        Write-Host ""
        Write-Host "Build Identity:" -ForegroundColor Yellow
        Write-Host "  BuildHash: $($json.buildIdentity.buildHash)" -ForegroundColor White
        Write-Host "  BuildTimestamp: $($json.buildIdentity.buildTimestamp)" -ForegroundColor White
        Write-Host "  RuntimeBuildId: $($json.buildIdentity.runtimeBuildId)" -ForegroundColor White
        Write-Host ""
        Write-Host "Main Entry: $($json.main)" -ForegroundColor Magenta
        
        # Check if out/extension.js exists in VSIX
        $extensionJs = $zip.Entries | Where-Object { $_.FullName -eq 'extension/out/extension.js' }
        if ($extensionJs) {
            Write-Host "Compiled extension.js: PRESENT (Size: $($extensionJs.Length) bytes)" -ForegroundColor Green
        } else {
            Write-Host "Compiled extension.js: MISSING" -ForegroundColor Red
        }
        
    } else {
        Write-Host "ERROR: Could not find extension/package.json in VSIX" -ForegroundColor Red
    }
} finally {
    $zip.Dispose()
}

# Made with Bob
