$ErrorActionPreference = "Stop"

$Root = "D:\Leeway-Ecosystem v2.1.4"

$ServiceRoot = Join-Path $Root "Cerebral\services\agent-lee-true-character-mesh-lane"
$Requirements = Join-Path $ServiceRoot "requirements.txt"
$ImageName = "agent-lee-true-character-mesh-lane:local"
$ContainerName = "agent-lee-true-character-mesh-lane"

$Artifacts = Join-Path $Root "Archive\agent-lee-artifacts\true-character-3d-lane"
$Models = Join-Path $Root "models"
$Proof = Join-Path $Root "Archive\proofs\true-character-3d-lane"
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"

New-Item -ItemType Directory -Force -Path $Proof | Out-Null

if (-not (Test-Path $Requirements)) {
  throw "requirements.txt not found: $Requirements"
}

$Req = Get-Content $Requirements -Raw

if ($Req -notmatch "(?m)^onnxruntime\b") {
  Add-Content -Path $Requirements -Value "onnxruntime" -Encoding UTF8
}

if ($Req -notmatch "(?m)^rembg\b") {
  Add-Content -Path $Requirements -Value "rembg" -Encoding UTF8
}

Write-Host ""
Write-Host "Rebuilding true character mesh lane with onnxruntime..." -ForegroundColor Cyan

docker build --no-cache -t $ImageName $ServiceRoot

$Existing = docker ps -a --format "{{.Names}}" | Where-Object { $_ -eq $ContainerName }
if ($Existing) {
  docker rm -f $ContainerName | Out-Null
}

docker run -d `
  --init `
  --name $ContainerName `
  --gpus all `
  --network leeway-ecosystemv214_leeway-net `
  -p "8103:8103" `
  --mount "type=bind,source=$Artifacts,target=/artifacts" `
  --mount "type=bind,source=$Models,target=/models" `
  -e "AGENT_LEE_ARTIFACT_ROOT=/artifacts" `
  -e "AGENT_LEE_TRIPOSR_ROOT=/opt/TripoSR" `
  -e "HF_HOME=/models/huggingface" `
  -e "TRANSFORMERS_CACHE=/models/huggingface" `
  -e "TORCH_HOME=/models/torch" `
  $ImageName | Out-Null

Start-Sleep -Seconds 10

Write-Host ""
Write-Host "Container state:" -ForegroundColor Cyan
docker inspect $ContainerName `
  --format "Status={{.State.Status}} ExitCode={{.State.ExitCode}} OOMKilled={{.State.OOMKilled}} Error={{.State.Error}}"

Write-Host ""
Write-Host "Verify onnxruntime inside container:" -ForegroundColor Cyan
docker exec $ContainerName python -c "import onnxruntime as ort; print('onnxruntime', ort.__version__)"

Write-Host ""
Write-Host "Status:" -ForegroundColor Cyan
$Status = Invoke-RestMethod -Method Get -Uri "http://127.0.0.1:8103/status" -TimeoutSec 60
$Status | ConvertTo-Json -Depth 100

$Receipt = @{
  verdict = "AGENT_LEE_TRUE_CHARACTER_MESH_LANE_ONNXRUNTIME_PATCHED"
  fix = "Installed onnxruntime so rembg can load inside TripoSR."
  container = $ContainerName
  image = $ImageName
  status = $Status
  created_at = (Get-Date).ToString("o")
}

$ReceiptPath = Join-Path $Proof "AGENT_LEE_TRUE_CHARACTER_MESH_LANE_ONNXRUNTIME_PATCH_$Stamp.receipt.json"
$Receipt | ConvertTo-Json -Depth 100 | Set-Content -Path $ReceiptPath -Encoding UTF8

notepad $ReceiptPath

Write-Host ""
Write-Host "Patch complete. True mesh lane is ready to retry." -ForegroundColor Green
Write-Host "Status: http://127.0.0.1:8103/status" -ForegroundColor Cyan
Write-Host "Mesh endpoint: http://127.0.0.1:8103/mesh/from-path" -ForegroundColor Cyan