$ErrorActionPreference = "Stop"

$Root = "D:\Leeway-Ecosystem v2.1.4"
$ServiceRoot = Join-Path $Root "Cerebral\services\agent-lee-true-character-mesh-lane"
$MainPy = Join-Path $ServiceRoot "app\main.py"
$ImageName = "agent-lee-true-character-mesh-lane:local"
$ContainerName = "agent-lee-true-character-mesh-lane"
$Artifacts = Join-Path $Root "Archive\agent-lee-artifacts\true-character-3d-lane"
$Models = Join-Path $Root "models"
$Proof = Join-Path $Root "Archive\proofs\true-character-3d-lane"
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"

New-Item -ItemType Directory -Force -Path $Proof | Out-Null

if (-not (Test-Path $MainPy)) {
  throw "main.py not found: $MainPy"
}

$Text = Get-Content $MainPy -Raw

# Force TripoSR subprocess to hide CUDA so it runs CPU fallback.
if ($Text -notmatch "AGENT_LEE_FORCE_CPU_TRIPOSR") {
  $Text = $Text.Replace(
'        env=os.environ.copy(),
    )',
'        env={
            **os.environ.copy(),
            "CUDA_VISIBLE_DEVICES": "" if os.environ.get("AGENT_LEE_FORCE_CPU_TRIPOSR", "false").lower() == "true" else os.environ.get("CUDA_VISIBLE_DEVICES", ""),
        },
    )'
  )
}

# Add CPU fallback note to status if possible.
if ($Text -notmatch "force_cpu_triposr") {
  $Text = $Text.Replace(
'        "backend": "TripoSR",',
'        "backend": "TripoSR",
        "force_cpu_triposr": os.environ.get("AGENT_LEE_FORCE_CPU_TRIPOSR", "false"),'
  )
}

Set-Content -Path $MainPy -Value $Text -Encoding UTF8

docker build -t $ImageName $ServiceRoot

$Existing = docker ps -a --format "{{.Names}}" | Where-Object { $_ -eq $ContainerName }
if ($Existing) {
  docker rm -f $ContainerName | Out-Null
}

docker run -d `
  --init `
  --name $ContainerName `
  --network leeway-ecosystemv214_leeway-net `
  -p "8103:8103" `
  --mount "type=bind,source=$Artifacts,target=/artifacts" `
  --mount "type=bind,source=$Models,target=/models" `
  -e "AGENT_LEE_ARTIFACT_ROOT=/artifacts" `
  -e "AGENT_LEE_TRIPOSR_ROOT=/opt/TripoSR" `
  -e "HF_HOME=/models/huggingface" `
  -e "TRANSFORMERS_CACHE=/models/huggingface" `
  -e "TORCH_HOME=/models/torch" `
  -e "AGENT_LEE_FORCE_CPU_TRIPOSR=true" `
  $ImageName | Out-Null

Start-Sleep -Seconds 10

$Status = Invoke-RestMethod -Method Get -Uri "http://127.0.0.1:8103/status" -TimeoutSec 60

$Receipt = @{
  verdict = "AGENT_LEE_TRUE_CHARACTER_MESH_CPU_FALLBACK_PATCHED"
  reason = "RTX 5060 sm_120 is not supported by current torch 2.6.0+cu124 wheel. CPU fallback is used for proof mesh."
  status = $Status
  created_at = (Get-Date).ToString("o")
}

$ReceiptPath = Join-Path $Proof "AGENT_LEE_TRUE_CHARACTER_MESH_CPU_FALLBACK_PATCH_$Stamp.receipt.json"
$Receipt | ConvertTo-Json -Depth 100 | Set-Content -Path $ReceiptPath -Encoding UTF8

notepad $ReceiptPath

Write-Host ""
Write-Host "CPU fallback patch applied." -ForegroundColor Green
Write-Host "Status: http://127.0.0.1:8103/status" -ForegroundColor Cyan
Write-Host "Mesh endpoint: http://127.0.0.1:8103/mesh/from-path" -ForegroundColor Cyan