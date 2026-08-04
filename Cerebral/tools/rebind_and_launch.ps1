# Stop any existing Python processes
Get-Process -Name python -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Get-Process -Name pythonw -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

# Update Lively config if it exists
$LivelyInfo = 'C:\Users\Agent Lee\AppData\Local\Packages\12030rocksdanister.LivelyWallpaper_97hta09mmv6hy\LocalCache\Local\Lively Wallpaper\Library\SaveData\wptmp\nq4ixnj5.5tw\LivelyInfo.json'
if (Test-Path $LivelyInfo) {
  $info = Get-Content $LivelyInfo -Raw | ConvertFrom-Json
  $info.FileName = 'http://127.0.0.1:8765'
  $info.Type = 3
  $info.Title = 'Cerebral OS Prime'
  $info | ConvertTo-Json | Set-Content $LivelyInfo -Force
}

# Start the invisible daemon
Start-Process -FilePath 'C:\Cerebral\\.venv\\Scripts\\pythonw.exe' -ArgumentList 'C:\Cerebral\\cerebral_prime.py' -WindowStyle Hidden
Start-Sleep -Seconds 2

# Start Lively and open the browser
Start-Process 'livelywp'
Start-Sleep -Seconds 3
Start-Process 'http://127.0.0.1:8765'
