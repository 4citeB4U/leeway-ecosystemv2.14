$ErrorActionPreference = "Stop"

$Root = "D:\Leeway-Ecosystem v2.1.4"
$ServiceRoot = Join-Path $Root "Cerebral\services\agent-lee-tiny-sd-image-lane"
$MainPy = Join-Path $ServiceRoot "app\main.py"
$ImageName = "agent-lee-tiny-sd-image-lane:local"
$ContainerName = "agent-lee-tiny-sd-image-lane"
$NetworkName = "leeway-ecosystemv214_leeway-net"
$ModelsRoot = Join-Path $Root "models"
$Artifacts = Join-Path $Root "Archive\agent-lee-artifacts\tiny-sd-image-lane"
$Proof = Join-Path $Root "Archive\proofs\tiny-sd-image-lane"
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"

if (-not (Test-Path $MainPy)) {
  throw "main.py not found: $MainPy"
}

New-Item -ItemType Directory -Force -Path $Proof | Out-Null

$Text = Get-Content $MainPy -Raw

$OldDetector = @'
def request_mentions_specific_hybrid(prompt: str) -> bool:
    p = prompt.lower()
    return ("hybrid" in p and "man" in p and "dog" in p and "dragon" in p)
'@

$NewDetector = @'
def request_mentions_specific_hybrid(prompt: str) -> bool:
    p = prompt.lower()

    has_human = any(x in p for x in [
        "man", "male", "human", "humanoid", "warrior", "body", "torso", "arms", "legs", "feet"
    ])

    has_dog = any(x in p for x in [
        "dog", "canine", "muzzle", "dog head", "dog face", "ears"
    ])

    has_dragon = any(x in p for x in [
        "dragon", "wings", "dragon wings", "scales", "horns", "claws", "tail"
    ])

    wants_full_body = any(x in p for x in [
        "full-body", "full body", "upright", "standing", "visible torso", "arms", "legs", "feet"
    ])

    return has_human and has_dog and has_dragon and wants_full_body
'@

if ($Text -notlike "*def request_mentions_specific_hybrid(prompt: str) -> bool:*") {
  throw "Detector function not found in main.py"
}

$Text = $Text.Replace($OldDetector, $NewDetector)

$OldPrompt = @'
def build_hard_subject_contract(user_prompt: str) -> str:
    if request_mentions_specific_hybrid(user_prompt):
        return (
            "ONE clear full-body humanoid male warrior standing upright in heroic pose, "
            "human male torso with visible chest, shoulders, arms, hands, waist, legs, and feet, "
            "a distinct dog head with canine muzzle, dog ears, and expressive eyes, "
            "large dragon wings spread from his back, dragon horns, dragon scales on shoulders and arms, "
            "dragon tail visible behind him, claws, fantasy armor details, "
            "clear readable silhouette, centered character, full body visible from head to feet, "
            "cinematic fantasy concept art, dramatic lighting, detailed anatomy, sharp focus"
        )

    return ""
'@

$NewPrompt = @'
def build_hard_subject_contract(user_prompt: str) -> str:
    if request_mentions_specific_hybrid(user_prompt):
        return (
            "single character only, full-body upright humanoid male warrior, standing like a man, "
            "clear human anatomy: visible head position, neck, shoulders, chest, torso, waist, two arms, two hands, two legs, two feet, "
            "distinct dog head replacing the human head: canine muzzle, dog nose, dog ears, visible dog facial identity, "
            "dragon traits attached to the humanoid body: two large dragon wings spread from the back, dragon horns, dragon scales on shoulders and arms, clawed hands, visible dragon tail, "
            "centered full-body character from head to feet, front-facing or three-quarter view, readable silhouette, bright enough to see anatomy, "
            "NOT a quadruped, NOT a crouching beast, NOT a vague monster, NOT an animal-only dragon, NOT a dark shapeless creature, "
            "cinematic fantasy concept art, detailed character design sheet, sharp focus"
        )

    return ""
'@

if ($Text -notlike "*def build_hard_subject_contract(user_prompt: str) -> str:*") {
  throw "Hard subject contract function not found in main.py"
}

$Text = $Text.Replace($OldPrompt, $NewPrompt)

# Make Qwen refinement preserve the contract instead of summarizing it away.
$Text = $Text.Replace(
'Return only one compact image prompt. No explanation.',
'Return only one compact image prompt. No explanation. Do not remove any required anatomy. Keep full-body humanoid male body, dog head, dragon wings, scales, horns, claws, and tail explicit.'
)

# Make retry trigger more aggressive.
$Text = $Text.Replace(
'if req.retry_if_weak and req.use_qwen_review and ENABLE_QWEN_REVIEW and best_score < 8.0:',
'if req.retry_if_weak and req.use_qwen_review and ENABLE_QWEN_REVIEW and best_score < 9.5:'
)

Set-Content -Path $MainPy -Value $Text -Encoding UTF8

Write-Host "Patched anatomy detector and contract." -ForegroundColor Green

docker build -t $ImageName $ServiceRoot

$Existing = docker ps -a --format "{{.Names}}" | Where-Object { $_ -eq $ContainerName }
if ($Existing) {
  docker rm -f $ContainerName | Out-Null
}

docker run -d `
  --name $ContainerName `
  --gpus all `
  --network $NetworkName `
  -p "8098:8094" `
  --mount "type=bind,source=$ModelsRoot,target=/models" `
  --mount "type=bind,source=$Artifacts,target=/artifacts" `
  -e "AGENT_LEE_IMAGE_MODEL=segmind/tiny-sd" `
  -e "AGENT_LEE_ARTIFACT_ROOT=/artifacts" `
  -e "HF_HOME=/models/huggingface" `
  -e "TRANSFORMERS_CACHE=/models/huggingface" `
  -e "DIFFUSERS_CACHE=/models/huggingface" `
  -e "OLLAMA_BASE_URL=http://leeway_ollama:11434" `
  -e "AGENT_LEE_QWEN_VL_MODEL=qwen2.5vl:7b" `
  -e "AGENT_LEE_ENABLE_QWEN_REFINE=1" `
  -e "AGENT_LEE_ENABLE_QWEN_REVIEW=1" `
  $ImageName | Out-Null

Start-Sleep -Seconds 5

$Status = Invoke-RestMethod -Method Get -Uri "http://127.0.0.1:8098/status" -TimeoutSec 30

$Receipt = @{
  verdict = "AGENT_LEE_TINY_SD_ANATOMY_CONTRACT_PATCHED"
  patch = "Detector now catches humanoid male warrior + dog head/canine + dragon wings/scales/tail prompts. Retry threshold raised to 9.5."
  status = $Status
  created_at = (Get-Date).ToString("o")
}

$ReceiptPath = Join-Path $Proof "AGENT_LEE_TINY_SD_ANATOMY_CONTRACT_PATCH_$Stamp.receipt.json"
$Receipt | ConvertTo-Json -Depth 40 | Set-Content -Path $ReceiptPath -Encoding UTF8

notepad $ReceiptPath

Write-Host ""
Write-Host "Patched and restarted Tiny-SD anatomy lane." -ForegroundColor Green
Write-Host "Receipt: $ReceiptPath" -ForegroundColor Cyan