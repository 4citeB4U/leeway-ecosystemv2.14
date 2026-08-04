$ErrorActionPreference = "Continue"

$Root = "D:\Leeway-Ecosystem v2.1.4"
$Proof = Join-Path $Root "Archive\proofs\creation-layer-discovery"
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"

New-Item -ItemType Directory -Force -Path $Proof | Out-Null
Set-Location $Root

$ReportPath = Join-Path $Proof "LEEWAY_CREATION_LAYER_DISCOVERY_$Stamp.txt"
$JsonPath = Join-Path $Proof "LEEWAY_CREATION_LAYER_DISCOVERY_$Stamp.receipt.json"

$Terms = @(
  "creation",
  "creator",
  "generate",
  "generator",
  "artifact",
  "artifacts",
  "image",
  "images",
  "diffusion",
  "stable",
  "sdxl",
  "comfy",
  "comfyui",
  "invoke",
  "blender",
  "three",
  "3d",
  "glb",
  "gltf",
  "mesh",
  "object",
  "pdf",
  "document",
  "docx",
  "website",
  "site",
  "app-builder",
  "builder",
  "render",
  "studio",
  "canvas",
  "presentation",
  "slides"
)

function Add-Section {
  param(
    [string]$Title,
    [string]$Body
  )

  "`n==================== $Title ====================`n" | Add-Content $ReportPath -Encoding UTF8
  $Body | Add-Content $ReportPath -Encoding UTF8
}

"" | Set-Content $ReportPath -Encoding UTF8

Add-Section "DISCOVERY START" @"
Root: $Root
Created: $((Get-Date).ToString("o"))
Purpose: Find missing Leeway Creation Layer for images, websites, PDFs, 3D objects, artifacts, and Telegram-returnable links/files.
"@

Write-Host "Scanning Docker containers..." -ForegroundColor Cyan

$DockerContainers = docker ps -a --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}" | Out-String -Width 4096
Add-Section "DOCKER CONTAINERS" $DockerContainers

Write-Host "Scanning Docker images..." -ForegroundColor Cyan

$DockerImages = docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.ID}}\t{{.Size}}" | Out-String -Width 4096
Add-Section "DOCKER IMAGES" $DockerImages

Write-Host "Scanning Docker volumes..." -ForegroundColor Cyan

$DockerVolumes = docker volume ls | Out-String -Width 4096
Add-Section "DOCKER VOLUMES" $DockerVolumes

Write-Host "Scanning Docker networks..." -ForegroundColor Cyan

$DockerNetworks = docker network ls | Out-String -Width 4096
Add-Section "DOCKER NETWORKS" $DockerNetworks

Write-Host "Scanning compose services..." -ForegroundColor Cyan

$ComposeFiles = Get-ChildItem -Path $Root -Recurse -File -Include "docker-compose*.yml","docker-compose*.yaml","compose*.yml","compose*.yaml" |
  Where-Object {
    $_.FullName -notmatch "\\node_modules\\" -and
    $_.FullName -notmatch "\\.git\\" -and
    $_.FullName -notmatch "\\Archive\\recovery\\"
  }

$ComposeSummary = $ComposeFiles | Select-Object FullName | Out-String -Width 4096
Add-Section "COMPOSE FILES FOUND" $ComposeSummary

foreach ($File in $ComposeFiles) {
  $Matches = Select-String -Path $File.FullName -Pattern ($Terms -join "|") -CaseSensitive:$false
  if ($Matches) {
    Add-Section "COMPOSE MATCHES: $($File.FullName)" ($Matches | Select-Object Path, LineNumber, Line | Out-String -Width 4096)
  }
}

Write-Host "Scanning folders for creation-related names..." -ForegroundColor Cyan

$FolderMatches = Get-ChildItem -Path $Root -Recurse -Directory -ErrorAction SilentlyContinue |
  Where-Object {
    $_.FullName -notmatch "\\node_modules\\" -and
    $_.FullName -notmatch "\\.git\\" -and
    $_.FullName -notmatch "\\models\\" -and
    $_.FullName -notmatch "\\Archive\\recovery\\"
  } |
  Where-Object {
    $Name = $_.Name.ToLower()
    foreach ($Term in $Terms) {
      if ($Name -like "*$($Term.ToLower())*") { return $true }
    }
    return $false
  } |
  Select-Object FullName

Add-Section "FOLDER NAME MATCHES" ($FolderMatches | Out-String -Width 4096)

Write-Host "Scanning source/config files for creation-layer terms..." -ForegroundColor Cyan

$SearchFiles = Get-ChildItem -Path $Root -Recurse -File -Include "*.ps1","*.py","*.js","*.mjs","*.ts","*.tsx","*.jsx","*.json","*.md","*.yml","*.yaml",".env*","Dockerfile" -ErrorAction SilentlyContinue |
  Where-Object {
    $_.FullName -notmatch "\\node_modules\\" -and
    $_.FullName -notmatch "\\.git\\" -and
    $_.FullName -notmatch "\\models\\" -and
    $_.FullName -notmatch "\\Archive\\recovery\\" -and
    $_.Length -lt 5MB
  }

$SourceMatches = foreach ($File in $SearchFiles) {
  Select-String -Path $File.FullName -Pattern ($Terms -join "|") -CaseSensitive:$false -ErrorAction SilentlyContinue |
    Select-Object Path, LineNumber, Line
}

Add-Section "SOURCE MATCHES" ($SourceMatches | Out-String -Width 4096)

Write-Host "Inspecting containers for Leeway labels and creation-related env..." -ForegroundColor Cyan

$InspectDir = Join-Path $Proof "docker-inspect-$Stamp"
New-Item -ItemType Directory -Force -Path $InspectDir | Out-Null

$ContainerNames = docker ps -a --format "{{.Names}}"

foreach ($Name in $ContainerNames) {
  $Out = Join-Path $InspectDir "$Name.inspect.json"
  docker inspect $Name | Set-Content $Out -Encoding UTF8

  $InspectText = Get-Content $Out -Raw
  foreach ($Term in $Terms) {
    if ($InspectText -match [regex]::Escape($Term)) {
      Add-Section "CONTAINER INSPECT MATCH: $Name / $Term" (($InspectText -split "`n" | Select-String -Pattern $Term -CaseSensitive:$false | Select-Object -First 40 | Out-String -Width 4096))
      break
    }
  }
}

Write-Host "Checking likely creation ports..." -ForegroundColor Cyan

$PortsToCheck = @(
  3000, 3001, 5000, 5001, 5173, 7000, 7001, 7860, 7861, 8000, 8088, 8090, 8092, 8095, 8096, 8100, 8188, 8200, 8300, 8400, 8501, 8600, 8700, 8800, 9000, 9090
)

$PortResults = @()

foreach ($Port in $PortsToCheck) {
  $Uri = "http://127.0.0.1:$Port"
  try {
    $Resp = Invoke-WebRequest -Uri $Uri -UseBasicParsing -TimeoutSec 3
    $PortResults += [pscustomobject]@{
      port = $Port
      ok = $true
      status = $Resp.StatusCode
      title = (($Resp.Content | Select-String -Pattern "<title>(.*?)</title>" -AllMatches).Matches.Value -join ", ")
    }
  }
  catch {
    $PortResults += [pscustomobject]@{
      port = $Port
      ok = $false
      error = $_.Exception.Message
    }
  }
}

Add-Section "LOCAL PORT CHECKS" ($PortResults | Format-Table -AutoSize | Out-String -Width 4096)

$Candidates = @()

$Candidates += docker ps -a --format "{{.Names}}|{{.Image}}|{{.Status}}" | Where-Object {
  $_ -match "creation|creator|studio|artifact|image|diffusion|comfy|blender|three|pdf|document|builder|presentation|canvas|render"
}

$Candidates += docker images --format "{{.Repository}}:{{.Tag}}|{{.ID}}|{{.Size}}" | Where-Object {
  $_ -match "creation|creator|studio|artifact|image|diffusion|comfy|blender|three|pdf|document|builder|presentation|canvas|render"
}

$CandidateFolders = $FolderMatches.FullName | Where-Object {
  $_ -match "creation|creator|studio|artifact|image|diffusion|comfy|blender|three|pdf|document|builder|presentation|canvas|render"
}

$Receipt = @{
  verdict = "LEEWAY_CREATION_LAYER_DISCOVERY_COMPLETE"
  root = $Root
  report = $ReportPath
  docker_inspect_dir = $InspectDir
  candidate_docker_items = $Candidates
  candidate_folders = $CandidateFolders
  compose_files_count = @($ComposeFiles).Count
  source_matches_count = @($SourceMatches).Count
  created_at = (Get-Date).ToString("o")
}

$Receipt | ConvertTo-Json -Depth 20 | Set-Content $JsonPath -Encoding UTF8

notepad $ReportPath
notepad $JsonPath

Write-Host ""
Write-Host "Creation Layer discovery complete." -ForegroundColor Green
Write-Host "Report: $ReportPath" -ForegroundColor Cyan
Write-Host "Receipt: $JsonPath" -ForegroundColor Cyan