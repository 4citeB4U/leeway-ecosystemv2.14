$ErrorActionPreference = "Continue"

$Root = "D:\Leeway-Ecosystem v2.1.4"
$Proof = Join-Path $Root "Archive\proofs\agent-lee-full-live"
$StateDir = Join-Path $Root "Archive\agent-lee-artifacts\agent-lee-full-live"

New-Item -ItemType Directory -Force -Path $Proof | Out-Null
New-Item -ItemType Directory -Force -Path $StateDir | Out-Null

$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"

$Lanes = @(
  @{
    name = "agent-lee-sdxl-lightning-image-lane"
    role = "image_generation_sdxl_lightning"
    url = "http://127.0.0.1:8099/status"
    critical = $true
  },
  @{
    name = "agent-lee-telegram-vision-lane"
    role = "telegram_photo_to_qwen_vision"
    url = "http://127.0.0.1:8104/status"
    critical = $true
  },
  @{
    name = "agent-lee-character-cutout-lane"
    role = "character_cutout"
    url = "http://127.0.0.1:8102/status"
    critical = $false
  },
  @{
    name = "agent-lee-true-character-mesh-lane"
    role = "true_3d_mesh_triposr_cpu_fallback"
    url = "http://127.0.0.1:8103/status"
    critical = $false
  },
  @{
    name = "agent-lee-image-to-3d-pattern-lane"
    role = "deprecated_pattern_mesh_test_lane"
    url = "http://127.0.0.1:8101/status"
    critical = $false
  },
  @{
    name = "agent-lee-vision-kernel"
    role = "local_camera_vision_kernel"
    url = "http://127.0.0.1:8093/health"
    critical = $true
  },
  @{
    name = "agent-lee-voice-kernel"
    role = "voice_kernel"
    url = "http://127.0.0.1:8092/health"
    critical = $true
  },
  @{
    name = "agent-lee-ears-kernel"
    role = "ears_audio_kernel"
    url = "http://127.0.0.1:8094/health"
    critical = $true
  },
  @{
    name = "agent_lee_code_mode"
    role = "agent_lee_code_mode_runtime"
    url = "http://127.0.0.1:8080"
    critical = $true
  },
  @{
    name = "leeway_runtime_fabric"
    role = "runtime_fabric"
    url = "http://127.0.0.1:8111"
    critical = $true
  }
)

function Get-ContainerState {
  param([string]$Name)

  $exists = docker ps -a --format "{{.Names}}" | Where-Object { $_ -eq $Name }

  if (-not $exists) {
    return @{
      exists = $false
      status = "missing"
      exit_code = $null
      oom_killed = $null
      error = "container_not_found"
    }
  }

  $line = docker inspect $Name --format "Status={{.State.Status}}|ExitCode={{.State.ExitCode}}|OOMKilled={{.State.OOMKilled}}|Error={{.State.Error}}" 2>$null

  $parts = @{}
  foreach ($p in $line.Split("|")) {
    $kv = $p.Split("=", 2)
    if ($kv.Count -eq 2) {
      $parts[$kv[0]] = $kv[1]
    }
  }

  return @{
    exists = $true
    status = $parts["Status"]
    exit_code = $parts["ExitCode"]
    oom_killed = $parts["OOMKilled"]
    error = $parts["Error"]
  }
}

function Start-LaneIfNeeded {
  param([hashtable]$Lane)

  $state = Get-ContainerState -Name $Lane.name

  if (-not $state.exists) {
    return @{
      name = $Lane.name
      role = $Lane.role
      action = "missing_not_started"
      state = $state
    }
  }

  if ($state.status -ne "running") {
    Write-Host "Starting $($Lane.name)..." -ForegroundColor Cyan
    docker start $Lane.name | Out-Null
    Start-Sleep -Seconds 5
    $state = Get-ContainerState -Name $Lane.name

    return @{
      name = $Lane.name
      role = $Lane.role
      action = "started"
      state = $state
    }
  }

  return @{
    name = $Lane.name
    role = $Lane.role
    action = "already_running"
    state = $state
  }
}

function Test-LaneHttp {
  param([hashtable]$Lane)

  if (-not $Lane.url) {
    return @{
      ok = $null
      status = "no_url"
      body = $null
    }
  }

  try {
    $Response = Invoke-RestMethod -Method Get -Uri $Lane.url -TimeoutSec 20
    return @{
      ok = $true
      status = "http_ok"
      body = $Response
    }
  } catch {
    return @{
      ok = $false
      status = "http_failed"
      error = $_.Exception.Message
    }
  }
}

Write-Host ""
Write-Host "Starting Agent Lee full-live lanes..." -ForegroundColor Green

$Results = @()

foreach ($Lane in $Lanes) {
  $StartResult = Start-LaneIfNeeded -Lane $Lane
  $HttpResult = Test-LaneHttp -Lane $Lane

  $Results += @{
    name = $Lane.name
    role = $Lane.role
    critical = $Lane.critical
    start = $StartResult
    http = $HttpResult
  }
}

# GPU / memory snapshot
$GpuSnapshot = $null
try {
  $GpuSnapshot = docker run --rm --gpus all nvidia/cuda:12.4.1-devel-ubuntu22.04 nvidia-smi
} catch {
  $GpuSnapshot = "GPU snapshot failed: $($_.Exception.Message)"
}

$Policy = @{
  live_mode = "all_lanes_available"
  resource_policy = "heavy_jobs_serialized"
  heavy_job_rule = "Only one image or 3D mesh generation job should run at a time; do not shut down Telegram/vision/voice/runtime lanes."
  heavy_lanes = @(
    "agent-lee-sdxl-lightning-image-lane",
    "agent-lee-true-character-mesh-lane"
  )
  always_live_lanes = @(
    "agent-lee-telegram-shell",
    "agent-lee-telegram-vision-lane",
    "agent-lee-vision-kernel",
    "agent-lee-voice-kernel",
    "agent-lee-ears-kernel",
    "agent_lee_code_mode",
    "leeway_runtime_fabric"
  )
}

$CriticalFailures = @()
foreach ($R in $Results) {
  if ($R.critical -and (($R.start.state.status -ne "running") -or ($R.http.ok -eq $false))) {
    $CriticalFailures += $R.name
  }
}

$Receipt = @{
  verdict = if ($CriticalFailures.Count -eq 0) { "AGENT_LEE_FULL_LIVE_LANES_READY_OR_PARTIAL_READY" } else { "AGENT_LEE_FULL_LIVE_LANES_NEED_REPAIR" }
  critical_failures = $CriticalFailures
  lanes = $Results
  policy = $Policy
  gpu_snapshot = $GpuSnapshot
  created_at = (Get-Date).ToString("o")
}

$ReceiptPath = Join-Path $Proof "AGENT_LEE_FULL_LIVE_LANES_$Stamp.receipt.json"
$Receipt | ConvertTo-Json -Depth 100 | Set-Content -Path $ReceiptPath -Encoding UTF8

Write-Host ""
Write-Host "Agent Lee full-live lane check complete." -ForegroundColor Green
Write-Host "Receipt: $ReceiptPath" -ForegroundColor Cyan

$Results | ForEach-Object {
  $color = "Green"
  if ($_.start.state.status -ne "running") { $color = "Yellow" }
  if ($_.http.ok -eq $false -and $_.critical) { $color = "Red" }

  Write-Host "$($_.name) [$($_.role)] state=$($_.start.state.status) http=$($_.http.status)" -ForegroundColor $color
}

notepad $ReceiptPath