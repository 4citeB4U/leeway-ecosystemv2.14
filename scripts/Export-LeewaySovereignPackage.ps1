param(
  [string]$Root = "D:\Leeway-Ecosystem v2.1.4",
  [string]$OutDir = ""
)

$ErrorActionPreference = "Stop"

if (-not $OutDir) {
  $OutDir = Join-Path $Root ("dist\leeway-sovereign-package-" + (Get-Date -Format "yyyyMMdd-HHmmss"))
}

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $OutDir "images") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $OutDir "runtime") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $OutDir "scripts") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $OutDir "Services") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $OutDir "proofs") | Out-Null

$Images = @(
  "leeway_api_gateway:local",
  "leeway_context_gateway:local",
  "leeway_research_lane:local",
  "leeway_seafile_storage_gateway:local",
  "agent-lee-telegram-shell:latest",
  "agent-lee-qwen-voice:cuda",
  "agent-lee-sdxl-lightning-image-lane:local",
  "agent-lee-image-to-3d-pattern-lane:local",
  "leeway-ecosystemv214-runtime-fabric",
  "leeway-ecosystemv214-agent-lee"
)

$Saved = @()
foreach ($Image in $Images) {
  docker image inspect $Image *> $null
  if ($LASTEXITCODE -eq 0) {
    $Safe = $Image.Replace("/", "_").Replace(":", "__")
    $Tar = Join-Path $OutDir "images\$Safe.tar"
    Write-Host "Saving $Image -> $Tar" -ForegroundColor Cyan
    docker save -o $Tar $Image
    if ($LASTEXITCODE -ne 0) { throw "docker save failed for $Image" }
    $Saved += @{
      image = $Image
      tar = "images\$Safe.tar"
      bytes = (Get-Item $Tar).Length
      sha256 = (Get-FileHash $Tar -Algorithm SHA256).Hash
    }
  }
}

Copy-Item -Force -Recurse (Join-Path $Root "runtime\*.json") (Join-Path $OutDir "runtime") -ErrorAction SilentlyContinue
Copy-Item -Force -Recurse (Join-Path $Root "Services\leeway_api_gateway") (Join-Path $OutDir "Services") -ErrorAction SilentlyContinue
Copy-Item -Force -Recurse (Join-Path $Root "Services\leeway_context_gateway") (Join-Path $OutDir "Services") -ErrorAction SilentlyContinue
Copy-Item -Force -Recurse (Join-Path $Root "Services\leeway_research_lane") (Join-Path $OutDir "Services") -ErrorAction SilentlyContinue
Copy-Item -Force -Recurse (Join-Path $Root "Services\leeway_seafile_storage_gateway") (Join-Path $OutDir "Services") -ErrorAction SilentlyContinue
Copy-Item -Force -Recurse (Join-Path $Root "scripts\*.ps1") (Join-Path $OutDir "scripts") -ErrorAction SilentlyContinue
Copy-Item -Force -Recurse (Join-Path $Root "Archive\proofs\enterprise-readiness") (Join-Path $OutDir "proofs") -ErrorAction SilentlyContinue
Copy-Item -Force -Recurse (Join-Path $Root "Archive\proofs\sovereign-runtime") (Join-Path $OutDir "proofs") -ErrorAction SilentlyContinue

$Manifest = @{
  verdict = "LEEWAY_SOVEREIGN_PACKAGE_EXPORTED"
  root = $Root
  out_dir = $OutDir
  saved_images = $Saved
  exported_at = (Get-Date).ToString("o")
  warning = "Before commercial distribution, scrub secrets/customer data, confirm model/license rights, and run clean-machine import proof."
}

$ManifestPath = Join-Path $OutDir "LEEWAY_SOVEREIGN_PACKAGE_MANIFEST.json"
$Manifest | ConvertTo-Json -Depth 100 | Set-Content -Path $ManifestPath -Encoding UTF8

$Parent = Split-Path $OutDir -Parent
$Leaf = Split-Path $OutDir -Leaf
$TarOut = "$OutDir.tar"

if (Get-Command tar.exe -ErrorAction SilentlyContinue) {
  Write-Host "Creating large-file-safe tar package: $TarOut" -ForegroundColor Cyan
  tar.exe -cf $TarOut -C $Parent $Leaf
  if ($LASTEXITCODE -ne 0) { throw "tar package creation failed." }

  $Hash = Get-FileHash $TarOut -Algorithm SHA256
  @{
    package_tar = $TarOut
    sha256 = $Hash.Hash
    bytes = (Get-Item $TarOut).Length
    created_at = (Get-Date).ToString("o")
  } | ConvertTo-Json -Depth 20 | Set-Content -Path "$TarOut.sha256.json" -Encoding UTF8
} else {
  Write-Host "tar.exe not found. Package folder was created, but tar archive was skipped." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Leeway sovereign package exported:" -ForegroundColor Green
Write-Host $OutDir -ForegroundColor Cyan
if (Test-Path $TarOut) { Write-Host $TarOut -ForegroundColor Cyan }
