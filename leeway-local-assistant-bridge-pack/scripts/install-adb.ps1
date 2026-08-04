$ErrorActionPreference='Stop'

$url='https://dl.google.com/android/repository/platform-tools-latest-windows.zip'
$out=Join-Path $env:TEMP 'platform-tools-latest-windows.zip'

Write-Host "Downloading platform-tools..."
Invoke-WebRequest -Uri $url -OutFile $out -UseBasicParsing

Write-Host "Extracting to C:\Android..."
if (-Not (Test-Path 'C:\Android')) { New-Item -ItemType Directory -Path 'C:\Android' | Out-Null }
Expand-Archive -Path $out -DestinationPath 'C:\Android' -Force

$ppt='C:\Android\platform-tools'
if (-Not (Test-Path $ppt)) { Throw 'platform-tools not found after extract' }

# Add to session PATH
$env:Path = $ppt + ';' + $env:Path

Write-Host 'Platform-tools installed to' $ppt
Write-Host 'Checking adb version...'
& "$ppt\adb.exe" version
Write-Host 'Listing connected devices...'
& "$ppt\adb.exe" devices -l
