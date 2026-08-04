$ErrorActionPreference = "Continue"

$Root = "D:\Leeway-Ecosystem v2.1.4"
$Proof = Join-Path $Root "Archive\proofs\agent-lee-creation-kernel"
$OutDir = Join-Path $Root "Archive\creation-kernel"
New-Item -ItemType Directory -Force -Path $Proof, $OutDir | Out-Null

$Base = "http://127.0.0.1:8098"
$Prompt = "hybrid man, dog, dragon, cinematic creature design, heroic stance, detailed fantasy concept art"
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"

$ReceiptPath = Join-Path $Proof "AGENT_LEE_CREATION_KERNEL_IMAGE_TEST_$Stamp.receipt.json"

function Try-PostJson {
  param(
    [string]$Name,
    [string]$Uri,
    [hashtable]$Payload
  )

  try {
    $Json = $Payload | ConvertTo-Json -Depth 20
    $Resp = Invoke-WebRequest -Method Post -Uri $Uri -Body $Json -ContentType "application/json" -TimeoutSec 600 -UseBasicParsing

    $ContentType = $Resp.Headers["Content-Type"]
    $Bytes = $Resp.RawContentStream

    $Result = @{
      name = $Name
      uri = $Uri
      ok = $true
      status = $Resp.StatusCode
      content_type = $ContentType
      payload = $Payload
    }

    if ($ContentType -match "image") {
      $ImagePath = Join-Path $OutDir "agent_lee_creation_kernel_test_$Stamp.png"
      [System.IO.File]::WriteAllBytes($ImagePath, $Resp.Content)
      $Result["image_path"] = $ImagePath
    }
    else {
      $Result["body_preview"] = $Resp.Content.Substring(0, [Math]::Min(3000, $Resp.Content.Length))

      try {
        $Parsed = $Resp.Content | ConvertFrom-Json
        $Result["json"] = $Parsed

        $PossiblePaths = @(
          $Parsed.path,
          $Parsed.file,
          $Parsed.output,
          $Parsed.image_path,
          $Parsed.artifact_path,
          $Parsed.result.path,
          $Parsed.result.file,
          $Parsed.result.image_path
        ) | Where-Object { $_ }

        if ($PossiblePaths.Count -gt 0) {
          $Result["possible_paths"] = $PossiblePaths
        }
      }
      catch {
      }
    }

    return $Result
  }
  catch {
    return @{
      name = $Name
      uri = $Uri
      ok = $false
      payload = $Payload
      error = $_.Exception.Message
    }
  }
}

$Health = $null
$Status = $null
$OpenApi = $null
$Warmup = $null

try {
  $Health = Invoke-RestMethod -Method Get -Uri "$Base/health" -TimeoutSec 30
}
catch {
  $Health = @{ error = $_.Exception.Message }
}

try {
  $Status = Invoke-RestMethod -Method Get -Uri "$Base/status" -TimeoutSec 30
}
catch {
  $Status = @{ error = $_.Exception.Message }
}

try {
  $OpenApi = Invoke-RestMethod -Method Get -Uri "$Base/openapi.json" -TimeoutSec 30
}
catch {
  $OpenApi = @{ error = $_.Exception.Message }
}

try {
  $Warmup = Invoke-RestMethod -Method Post -Uri "$Base/warmup" -Body "{}" -ContentType "application/json" -TimeoutSec 900
}
catch {
  $Warmup = @{ error = $_.Exception.Message }
}

$Payloads = @(
  @{
    prompt = $Prompt
  },
  @{
    prompt = $Prompt
    width = 512
    height = 512
  },
  @{
    prompt = $Prompt
    width = 512
    height = 512
    steps = 4
  },
  @{
    prompt = $Prompt
    width = 512
    height = 512
    num_inference_steps = 4
    guidance_scale = 0.0
  },
  @{
    prompt = $Prompt
    negative_prompt = "blurry, low quality, distorted"
    width = 512
    height = 512
    num_inference_steps = 4
    guidance_scale = 0.0
    seed = 42
  }
)

$Results = @()

foreach ($Payload in $Payloads) {
  $Results += Try-PostJson -Name "image_generate" -Uri "$Base/image/generate" -Payload $Payload

  $Success = $Results | Where-Object { $_.ok -eq $true } | Select-Object -First 1
  if ($Success) {
    break
  }
}

if (-not ($Results | Where-Object { $_.ok -eq $true })) {
  foreach ($Payload in $Payloads) {
    $Results += Try-PostJson -Name "generate" -Uri "$Base/generate" -Payload $Payload

    $Success = $Results | Where-Object { $_.ok -eq $true } | Select-Object -First 1
    if ($Success) {
      break
    }
  }
}

$RouteSummary = @()

if ($OpenApi.paths) {
  foreach ($Prop in $OpenApi.paths.PSObject.Properties) {
    $Methods = ($Prop.Value.PSObject.Properties.Name -join ",")
    $RouteSummary += @{
      path = $Prop.Name
      methods = $Methods
      schema = $Prop.Value
    }
  }
}

$DockerPs = docker ps -a --filter "name=agent-lee-creation-kernel" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}\t{{.Image}}" | Out-String -Width 4096
$Logs = cmd /c "docker logs --tail 180 agent-lee-creation-kernel 2>&1"

$Receipt = @{
  verdict = "AGENT_LEE_CREATION_KERNEL_IMAGE_TEST"
  base = $Base
  prompt = $Prompt
  health = $Health
  status = $Status
  warmup = $Warmup
  route_summary = $RouteSummary
  test_results = $Results
  docker_ps = $DockerPs
  logs_tail = $Logs
  created_at = (Get-Date).ToString("o")
}

$Receipt | ConvertTo-Json -Depth 50 | Set-Content -Path $ReceiptPath -Encoding UTF8

notepad $ReceiptPath

Write-Host ""
Write-Host "Creation Kernel image test complete." -ForegroundColor Green
Write-Host "Receipt: $ReceiptPath" -ForegroundColor Cyan