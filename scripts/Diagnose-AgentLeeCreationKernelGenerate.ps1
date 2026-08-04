$ErrorActionPreference = "Continue"

$Root = "D:\Leeway-Ecosystem v2.1.4"
$Proof = Join-Path $Root "Archive\proofs\agent-lee-creation-kernel"
$Artifacts = Join-Path $Root "Archive\creation-kernel"
New-Item -ItemType Directory -Force -Path $Proof, $Artifacts | Out-Null

$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$ReceiptPath = Join-Path $Proof "AGENT_LEE_CREATION_KERNEL_GENERATE_DIAGNOSTIC_$Stamp.receipt.json"

$PayloadObject = @{
  prompt = "hybrid man, dog, dragon, fantasy concept art"
  width = 512
  height = 512
  num_inference_steps = 4
  guidance_scale = 0.0
  seed = 42
}

$PayloadJson = $PayloadObject | ConvertTo-Json -Depth 10

$ResponseInfo = $null
$ResponseBodyText = $null
$JsonParsed = $null
$PossiblePaths = @()
$PossibleImagePathFound = $null

try {
  $ResponseInfo = Invoke-WebRequest `
    -Method Post `
    -Uri "http://127.0.0.1:8098/image/generate" `
    -Body $PayloadJson `
    -ContentType "application/json" `
    -TimeoutSec 600 `
    -UseBasicParsing

  $ResponseBodyText = $ResponseInfo.Content

  try {
    $JsonParsed = $ResponseBodyText | ConvertFrom-Json -Depth 50
  }
  catch {
    $JsonParsed = $null
  }
}
catch {
  $ResponseInfo = @{
    error = $_.Exception.Message
  }
}

# Look for image-like files in host artifact directory
$ArtifactFiles = @()
if (Test-Path $Artifacts) {
  $ArtifactFiles = Get-ChildItem -Recurse -File $Artifacts | Select-Object FullName, Length, LastWriteTime
}

# Try to discover possible returned file paths
if ($JsonParsed) {
  $Candidates = @(
    $JsonParsed.path,
    $JsonParsed.file,
    $JsonParsed.output,
    $JsonParsed.image_path,
    $JsonParsed.artifact_path,
    $JsonParsed.result.path,
    $JsonParsed.result.file,
    $JsonParsed.result.output,
    $JsonParsed.result.image_path,
    $JsonParsed.result.artifact_path
  ) | Where-Object { $_ }

  foreach ($Candidate in $Candidates) {
    $PossiblePaths += $Candidate
  }
}

# Try to map container paths to host paths
foreach ($P in $PossiblePaths) {
  if ($P -like "/creation-output/*") {
    $Relative = $P.Substring("/creation-output/".Length)
    $HostCandidate = Join-Path $Artifacts $Relative
    if (Test-Path $HostCandidate) {
      $PossibleImagePathFound = $HostCandidate
      break
    }
  }
}

$DockerLogs = cmd /c "docker logs --tail 200 agent-lee-creation-kernel 2>&1"
$Status = $null
try {
  $Status = Invoke-RestMethod -Method Get -Uri "http://127.0.0.1:8098/status" -TimeoutSec 30
}
catch {
  $Status = @{ error = $_.Exception.Message }
}

$Receipt = @{
  verdict = "AGENT_LEE_CREATION_KERNEL_GENERATE_DIAGNOSTIC"
  created_at = (Get-Date).ToString("o")
  payload = $PayloadObject
  status_after_call = $Status
  response_status_code = if ($ResponseInfo.StatusCode) { $ResponseInfo.StatusCode } else { $null }
  response_content_type = if ($ResponseInfo.Headers) { $ResponseInfo.Headers["Content-Type"] } else { $null }
  response_headers = if ($ResponseInfo.Headers) { $ResponseInfo.Headers } else { $null }
  response_body_preview = if ($ResponseBodyText) { $ResponseBodyText.Substring(0, [Math]::Min(5000, $ResponseBodyText.Length)) } else { $null }
  parsed_json = $JsonParsed
  possible_paths = $PossiblePaths
  possible_host_image_path = $PossibleImagePathFound
  artifact_files = $ArtifactFiles
  docker_logs_tail = $DockerLogs
}

$Receipt | ConvertTo-Json -Depth 50 | Set-Content -Path $ReceiptPath -Encoding UTF8

notepad $ReceiptPath

Write-Host ""
Write-Host "Creation Kernel generate diagnostic complete." -ForegroundColor Green
Write-Host "Receipt: $ReceiptPath" -ForegroundColor Cyan