$ErrorActionPreference = "Stop"

$Root = "D:\Leeway-Ecosystem v2.1.4"
$Proof = Join-Path $Root "Archive\proofs\sdxl-lightning-image-lane"
$Artifacts = Join-Path $Root "Archive\agent-lee-artifacts\sdxl-lightning-image-lane"
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"

New-Item -ItemType Directory -Force -Path $Proof | Out-Null

$ContainerName = "agent-lee-sdxl-lightning-image-lane"
$ImageName = "agent-lee-sdxl-lightning-image-lane:local"
$LockedTag = "agent-lee-sdxl-lightning-image-lane:locked-working-$Stamp"

$Status = $null
try {
  $Status = Invoke-RestMethod -Method Get -Uri "http://127.0.0.1:8099/status" -TimeoutSec 30
} catch {
  $Status = @{
    error = $_.Exception.Message
    note = "Status endpoint was not reachable during lock receipt."
  }
}

$DockerState = docker inspect $ContainerName --format "Status={{.State.Status}} ExitCode={{.State.ExitCode}} OOMKilled={{.State.OOMKilled}} Init={{.HostConfig.Init}}" 2>$null

docker tag $ImageName $LockedTag

$LatestArtifacts = Get-ChildItem $Artifacts -Directory -ErrorAction SilentlyContinue |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 10 |
  ForEach-Object {
    $files = Get-ChildItem $_.FullName -File -ErrorAction SilentlyContinue
    [PSCustomObject]@{
      job = $_.Name
      last_write_time = $_.LastWriteTime.ToString("o")
      file_count = $files.Count
      files = ($files.Name -join ", ")
      path = $_.FullName
    }
  }

$Receipt = @{
  verdict = "AGENT_LEE_SDXL_LIGHTNING_IMAGE_LANE_LOCKED_AS_CURRENT_WORKING_BASE"
  locked_image_tag = $LockedTag
  live_image = $ImageName
  container = $ContainerName
  host_port = 8099
  generator = "SDXL-Lightning LoRA ultra-low-memory CPU offload"
  current_use = "fast image generation, character concept art, artifacts, latest links"
  keep_for_now = $true
  do_not_replace_until_next_image_upgrade = $true
  known_good_character_direction = "red dragon / wolf / dog headed fantasy warrior"
  next_image_improvements_later = @(
    "character consistency profiles",
    "image edit / img2img endpoint",
    "reference image variation",
    "async Qwen2.5-VL review",
    "speed tuning at 512x640 and preview mode"
  )
  three_d_lanes_touched = $false
  docker_state = $DockerState
  status = $Status
  latest_artifacts = $LatestArtifacts
  created_at = (Get-Date).ToString("o")
}

$ReceiptPath = Join-Path $Proof "AGENT_LEE_SDXL_LIGHTNING_LOCK_$Stamp.receipt.json"
$Receipt | ConvertTo-Json -Depth 100 | Set-Content -Path $ReceiptPath -Encoding UTF8

notepad $ReceiptPath

Write-Host ""
Write-Host "Locked current SDXL-Lightning image lane." -ForegroundColor Green
Write-Host "Locked Docker tag: $LockedTag" -ForegroundColor Cyan
Write-Host "Receipt: $ReceiptPath" -ForegroundColor Cyan
Write-Host "3D lanes were not touched." -ForegroundColor Yellow