param(
  [string]$PackageDir
)

$ErrorActionPreference = "Stop"

if (-not $PackageDir) {
  throw "Provide -PackageDir pointing to an extracted Leeway sovereign package folder."
}

$ImagesDir = Join-Path $PackageDir "images"
if (-not (Test-Path $ImagesDir)) {
  throw "Missing images directory: $ImagesDir"
}

Get-ChildItem $ImagesDir -Filter "*.tar" | ForEach-Object {
  Write-Host "Loading image $($_.FullName)" -ForegroundColor Cyan
  docker load -i $_.FullName
  if ($LASTEXITCODE -ne 0) { throw "docker load failed for $($_.FullName)" }
}

$Network = "leeway-ecosystemv214_leeway-net"
docker network inspect $Network *> $null
if ($LASTEXITCODE -ne 0) {
  docker network create $Network | Out-Null
}

Write-Host ""
Write-Host "Images loaded. Network ensured: $Network" -ForegroundColor Green
Write-Host "Next: run the target machine start script for the selected profile." -ForegroundColor Cyan
