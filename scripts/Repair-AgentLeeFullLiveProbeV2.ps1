$ErrorActionPreference = "Continue"

$Root = "D:\Leeway-Ecosystem v2.1.4"
$Proof = Join-Path $Root "Archive\proofs\agent-lee-full-live"
New-Item -ItemType Directory -Force -Path $Proof | Out-Null

$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"

$Checks = @(
  @{
    name = "agent-lee-sdxl-lightning-image-lane"
    urls = @(
      "http://127.0.0.1:8099/status",
      "http://127.0.0.1:8099/health",
      "http://127.0.0.1:8099/latest/receipt.json",
      "http://127.0.0.1:8099/latest/candidate_1.png"
    )
  },
  @{
    name = "agent-lee-telegram-vision-lane"
    urls = @(
      "http://127.0.0.1:8104/status",
      "http://127.0.0.1:8104/health"
    )
  },
  @{
    name = "agent-lee-vision-kernel"
    urls = @(
      "http://127.0.0.1:8093/health",
      "http://127.0.0.1:8093/status"
    )
  },
  @{
    name = "agent-lee-voice-kernel"
    urls = @(
      "http://127.0.0.1:8092/health",
      "http://127.0.0.1:8092/status",
      "http://127.0.0.1:8092/"
    )
  },
  @{
    name = "agent-lee-ears-kernel"
    urls = @(
      "http://127.0.0.1:8094/health",
      "http://127.0.0.1:8094/status"
    )
  },
  @{
    name = "agent-lee-true-character-mesh-lane"
    urls = @(
      "http://127.0.0.1:8103/status",
      "http://127.0.0.1:8103/health"
    )
  },
  @{
    name = "agent_lee_code_mode"
    urls = @(
      "http://127.0.0.1:8080/health",
      "http://127.0.0.1:8080/routes",
      "http://127.0.0.1:8080/"
    )
  },
  @{
    name = "leeway_runtime_fabric"
    urls = @(
      "http://127.0.0.1:8111/health",
      "http://127.0.0.1:8111/status",
      "http://127.0.0.1:4001/health",
      "http://127.0.0.1:4001/status",
      "http://127.0.0.1:4001/"
    )
  }
)

function Get-State {
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

function Probe-Url {
  param([string]$Url)

  try {
    $r = Invoke-WebRequest -Method Get -Uri $Url -TimeoutSec 25
    return @{
      ok = $true
      url = $Url
      status_code = [int]$r.StatusCode
      content_type = $r.Headers["Content-Type"]
      length = if ($r.RawContentLength) { $r.RawContentLength } else { $r.Content.Length }
      sample = if ($r.Content) { $r.Content.ToString().Substring(0, [Math]::Min(500, $r.Content.ToString().Length)) } else { "" }
    }
  } catch {
    return @{
      ok = $false
      url = $Url
      error = $_.Exception.Message
    }
  }
}

$Results = @()

foreach ($C in $Checks) {
  $state = Get-State -Name $C.name

  if ($state.exists -and $state.status -ne "running") {
    Write-Host "Starting $($C.name)..." -ForegroundColor Cyan
    docker start $C.name | Out-Null
    Start-Sleep -Seconds 6
    $state = Get-State -Name $C.name
  }

  $urlResults = @()

  foreach ($u in $C.urls) {
    $urlResults += Probe-Url -Url $u
  }

  $Results += @{
    name = $C.name
    state = $state
    probes = $urlResults
    any_http_ok = [bool]($urlResults | Where-Object { $_.ok -eq $true } | Select-Object -First 1)
  }
}

$Gpu = $null
try {
  $Gpu = docker run --rm --gpus all nvidia/cuda:12.4.1-devel-ubuntu22.04 nvidia-smi
} catch {
  $Gpu = "GPU probe failed: $($_.Exception.Message)"
}

$Receipt = @{
  verdict = "AGENT_LEE_FULL_LIVE_PROBE_V2"
  rule = "Do not stop live lanes. Heavy image and 3D jobs must be serialized with a lock."
  results = $Results
  gpu = $Gpu
  created_at = (Get-Date).ToString("o")
}

$ReceiptPath = Join-Path $Proof "AGENT_LEE_FULL_LIVE_PROBE_V2_$Stamp.receipt.json"
$Receipt | ConvertTo-Json -Depth 100 | Set-Content -Path $ReceiptPath -Encoding UTF8

Write-Host ""
Write-Host "Full-live probe complete." -ForegroundColor Green
Write-Host "Receipt: $ReceiptPath" -ForegroundColor Cyan

foreach ($R in $Results) {
  $color = if ($R.any_http_ok) { "Green" } else { "Red" }
  Write-Host "$($R.name) state=$($R.state.status) any_http_ok=$($R.any_http_ok)" -ForegroundColor $color
}

notepad $ReceiptPath