$paths = @(
  "$env:LOCALAPPDATA\Programs\Lively\lively.exe",
  "$env:ProgramFiles\Lively\Lively.exe",
  "${env:ProgramFiles(x86)}\Lively\Lively.exe",
  "C:\Users\Agent Lee\AppData\Local\Packages\12030rocksdanister.LivelyWallpaper_97hta09mmv6hy\LocalCache\Local\Lively Wallpaper\Lively.exe",
  "C:\Program Files\Lively Wallpaper\livelywp.exe",
  "C:\Program Files\Lively Wallpaper\lively.exe"
)
$found = $false
foreach ($p in $paths) {
  if (Test-Path $p) {
    Start-Process -FilePath $p
    Write-Host 'Started:' $p
    $found = $true
    break
  }
}
if (-not $found) { Write-Host 'No Lively executable found in common paths' }
