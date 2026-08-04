$ErrorActionPreference = "Stop"

$Root = "D:\Leeway-Ecosystem v2.1.4"
$ServiceRoot = Join-Path $Root "Cerebral\services\agent-lee-sdxl-lightning-image-lane"
$MainPy = Join-Path $ServiceRoot "app\main.py"
$ImageName = "agent-lee-sdxl-lightning-image-lane:local"
$ContainerName = "agent-lee-sdxl-lightning-image-lane"
$NetworkName = "leeway-ecosystemv214_leeway-net"
$ModelsRoot = Join-Path $Root "models"
$Artifacts = Join-Path $Root "Archive\agent-lee-artifacts\sdxl-lightning-image-lane"
$Proof = Join-Path $Root "Archive\proofs\sdxl-lightning-image-lane"
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"

New-Item -ItemType Directory -Force -Path $Proof | Out-Null

if (-not (Test-Path $MainPy)) {
  throw "main.py not found: $MainPy"
}

Write-Host ""
Write-Host "Patching Agent Lee SDXL-Lightning prompt doctrine..." -ForegroundColor Cyan

$Text = Get-Content $MainPy -Raw

$Doctrine = @'

AGENT_LEE_SDXL_LIGHTNING_PROMPT_DOCTRINE = """
I am Agent Lee. I am the Qwen3 reasoning brain for my SDXL-Lightning image lane.
I speak as I. I do not talk about Agent Lee as a separate person.

My image generator is SDXL-Lightning, not Tiny-SD.
My job is to transform the user request into a precise, literal, premium SDXL-friendly prompt.

I must preserve the user's core subject. I do not replace the request with unrelated cinematic filler.

GENERAL QUALITY ANCHORS:
masterpiece, best quality, premium concept art, ultra-detailed, sharp focus, high dynamic range, cinematic lighting, intricate textures, professional composition, dramatic atmosphere, high-end digital painting, AAA game concept art, physically plausible materials

LIGHTING RULES:
- Fantasy or creature art: dramatic rim lighting, volumetric haze, moody cinematic lighting, atmospheric depth, high contrast
- Character design: clear front-facing or three-quarter pose, readable silhouette, subject well lit, background secondary
- Avoid darkness hiding anatomy

COMPOSITION RULES:
centered full-body character, full body visible from head to feet, readable silhouette, strong shape language, professional framing, background depth, no cropping, no hidden limbs

CAMERA / STYLE RULES:
Use cinematic concept-art language, not toy/mascot language.
Use AAA fantasy character design, dark fantasy concept art, detailed armor/materials, realistic anatomy.
Do not force DSLR camera language if the request is clearly illustration/concept art.

HYBRID CREATURE RULES:
For man + dog + dragon hybrid, preserve these exact anatomy anchors:
- upright human male body standing on two legs
- muscular human male torso
- visible chest, arms, hands, legs, and feet
- real dog or wolf head, not helmet, not mask
- long canine muzzle, black dog nose, dog ears, fur, sharp eyes
- two huge bat-like or leathery dragon wings, not feather wings
- visible thick dragon tail behind legs
- dragon horns, dark scales, claws, fantasy armor
- full body visible, centered character

NEGATIVE DOCTRINE:
Always reject:
low quality, blurry, low resolution, bad anatomy, malformed body, extra limbs, missing limbs, fused limbs, cropped body, out of frame, toy, mascot, plush, chibi, childish, cartoon toy, helmeted human, human helmet, mask, bird wings, feather wings, angel wings, missing dog muzzle, missing canine head, missing tail, hidden tail, no dragon tail, no wings, multiple characters, text, watermark, logo

SDXL-LIGHTNING TECHNICAL RULES:
- SDXL-Lightning 4-step should use 4 inference steps.
- Guidance scale should stay 0.0 for this lane.
- Do not recommend Tiny-SD settings like 30-50 steps or CFG 7-9.
- First stable size should be 768x768.
- 1024x1024 can be tested only after memory is stable.

OUTPUT RULES:
Return JSON only.
No markdown.
No explanation outside JSON.
"""
'@

# Insert doctrine before DEFAULT_NEGATIVE_PROMPT or near constants.
if ($Text -notmatch "AGENT_LEE_SDXL_LIGHTNING_PROMPT_DOCTRINE") {
  if ($Text -match "DEFAULT_NEGATIVE_PROMPT") {
    $Text = $Text.Replace("DEFAULT_NEGATIVE_PROMPT", $Doctrine + "`n`nDEFAULT_NEGATIVE_PROMPT")
  }
  else {
    $Text = $Text.Replace("app = FastAPI(title=APP_NAME)", $Doctrine + "`n`napp = FastAPI(title=APP_NAME)")
  }
}

# Strengthen qwen3_plan_prompt by injecting doctrine.
$Text = $Text.Replace(
  'planner_prompt = f"""',
  'planner_prompt = f"""{AGENT_LEE_SDXL_LIGHTNING_PROMPT_DOCTRINE}

'
)

# Replace the old planner wording if present.
$OldPlannerBlock = @'
I am Agent Lee. I am the Qwen3 brain for my SDXL-Lightning image lane.
I speak as "I". I do not talk about Agent Lee as another person.

My image generator is SDXL-Lightning 4-step, not Tiny-SD.
My job is to rewrite the user's request into a literal, visual, SDXL-friendly image prompt.
'@

$NewPlannerBlock = @'
I am Agent Lee. I am now applying my SDXL-Lightning prompt doctrine.
I will build a literal, premium, anatomy-safe, SDXL-friendly prompt.
I will preserve the user's requested subject exactly.
'@

$Text = $Text.Replace($OldPlannerBlock, $NewPlannerBlock)

# Update requested JSON schema for stronger output.
$OldJsonSchema = @'
Return JSON only:
{
  "route": "sdxl_lightning",
  "complexity": "low|medium|high",
  "final_prompt": "...",
  "negative_prompt_additions": "...",
  "quality_contract": {
    "requires_human_male_body": true,
    "requires_dog_or_wolf_head": true,
    "requires_bat_like_dragon_wings": true,
    "requires_visible_dragon_tail": true,
    "reject_toy_or_mascot_style": true,
    "reject_feather_wings": true
  }
}
'@

$NewJsonSchema = @'
Return JSON only:
{
  "route": "sdxl_lightning",
  "complexity": "low|medium|high",
  "style_class": "dark_fantasy_concept_art",
  "final_prompt": "subject + anatomy anchors + environment + lighting + composition + quality anchors",
  "negative_prompt_additions": "custom negatives for this request",
  "quality_contract": {
    "requires_human_male_body": true,
    "requires_visible_arms_hands_legs_feet": true,
    "requires_dog_or_wolf_head": true,
    "requires_long_canine_muzzle": true,
    "requires_bat_like_dragon_wings": true,
    "requires_visible_dragon_tail": true,
    "reject_toy_or_mascot_style": true,
    "reject_feather_wings": true,
    "reject_helmet_or_mask_instead_of_dog_head": true,
    "reject_cropped_or_hidden_body": true
  },
  "sdxl_lightning_settings": {
    "steps": 4,
    "guidance_scale": 0.0,
    "preferred_first_resolution": "768x768"
  }
}
'@

$Text = $Text.Replace($OldJsonSchema, $NewJsonSchema)

# Strengthen the fallback brain plan.
$Text = $Text.Replace(
  '"quality_contract": {
                "requires_human_male_body": True,
                "requires_dog_or_wolf_head": True,
                "requires_bat_like_dragon_wings": True,
                "requires_visible_dragon_tail": True,
                "reject_toy_or_mascot_style": True,
                "reject_feather_wings": True,
            },',
  '"quality_contract": {
                "requires_human_male_body": True,
                "requires_visible_arms_hands_legs_feet": True,
                "requires_dog_or_wolf_head": True,
                "requires_long_canine_muzzle": True,
                "requires_bat_like_dragon_wings": True,
                "requires_visible_dragon_tail": True,
                "reject_toy_or_mascot_style": True,
                "reject_feather_wings": True,
                "reject_helmet_or_mask_instead_of_dog_head": True,
                "reject_cropped_or_hidden_body": True,
            },
            "sdxl_lightning_settings": {
                "steps": 4,
                "guidance_scale": 0.0,
                "preferred_first_resolution": "768x768",
            },'
)

# Strengthen review prompt.
$Text = $Text.Replace(
  'You are Agent Lee''s strict visual quality gate.',
  'You are Agent Lee''s strict visual quality gate. Be severe. Do not give generous scores. A weak partial match is a failure.'
)

$Text = $Text.Replace(
  '2. clear dog or wolf head, not helmet, not mask, with canine muzzle/dog ears',
  '2. clear real dog or wolf head, not helmet, not mask, with long protruding canine muzzle, black dog nose, dog ears, fur'
)

$Text = $Text.Replace(
  '3. clear bat-like or leathery dragon wings, not feather/angel/bird wings',
  '3. clear large bat-like or leathery dragon wings, preferably red or dark red, not feather/angel/bird wings'
)

$Text = $Text.Replace(
  '"has_dog_or_wolf_head": false,',
  '"has_dog_or_wolf_head": false,
  "has_long_canine_muzzle": false,
  "is_helmet_or_mask_instead_of_dog_head": false,'
)

$Text = $Text.Replace(
  '"is_feather_wing_style": false,',
  '"is_feather_wing_style": false,
  "has_visible_arms_hands_legs_feet": false,
  "is_body_cropped_or_hidden": false,'
)

# Strengthen review_passes function checks.
$Text = $Text.Replace(
  '"has_dog_or_wolf_head",
        "has_bat_like_dragon_wings",',
  '"has_dog_or_wolf_head",
        "has_long_canine_muzzle",
        "has_visible_arms_hands_legs_feet",
        "has_bat_like_dragon_wings",'
)

if ($Text -notmatch 'is_helmet_or_mask_instead_of_dog_head') {
  Write-Host "Warning: helmet/mask review field insertion may not have landed. Continuing." -ForegroundColor Yellow
}

# Add extra rejection checks if not already in review_passes.
if ($Text -notmatch 'review.get\("is_helmet_or_mask_instead_of_dog_head"\) is True') {
  $Text = $Text.Replace(
    'if review.get("is_feather_wing_style") is True:
        return False',
    'if review.get("is_feather_wing_style") is True:
        return False

    if review.get("is_helmet_or_mask_instead_of_dog_head") is True:
        return False

    if review.get("is_body_cropped_or_hidden") is True:
        return False'
  )
}

# Add prompt doctrine metadata to receipt.
if ($Text -notmatch '"prompt_doctrine": "agent_lee_sdxl_lightning_master_prompt_doctrine_v1"') {
  $Text = $Text.Replace(
    '"version": "2.0.0-sdxl-lightning",',
    '"version": "2.0.0-sdxl-lightning",
        "prompt_doctrine": "agent_lee_sdxl_lightning_master_prompt_doctrine_v1",'
  )
}

Set-Content -Path $MainPy -Value $Text -Encoding UTF8

Write-Host "Rebuilding SDXL-Lightning lane with prompt doctrine..." -ForegroundColor Cyan
docker build -t $ImageName $ServiceRoot

$Existing = docker ps -a --format "{{.Names}}" | Where-Object { $_ -eq $ContainerName }

if ($Existing) {
  docker rm -f $ContainerName | Out-Null
}

docker run -d `
  --name $ContainerName `
  --gpus all `
  --network $NetworkName `
  -p "8099:8095" `
  --mount "type=bind,source=$ModelsRoot,target=/models" `
  --mount "type=bind,source=$Artifacts,target=/artifacts" `
  -e "AGENT_LEE_IMAGE_MODEL=ByteDance/SDXL-Lightning-LoRA" `
  -e "AGENT_LEE_SDXL_BASE_MODEL=stabilityai/stable-diffusion-xl-base-1.0" `
  -e "AGENT_LEE_LIGHTNING_REPO=ByteDance/SDXL-Lightning" `
  -e "AGENT_LEE_LIGHTNING_LORA=sdxl_lightning_4step_lora.safetensors" `
  -e "AGENT_LEE_LIGHTNING_STEPS=4" `
  -e "AGENT_LEE_ARTIFACT_ROOT=/artifacts" `
  -e "HF_HOME=/models/huggingface" `
  -e "HF_HUB_CACHE=/models/huggingface/hub" `
  -e "TRANSFORMERS_CACHE=/models/huggingface" `
  -e "DIFFUSERS_CACHE=/models/huggingface" `
  -e "OLLAMA_BASE_URL=http://leeway_ollama:11434" `
  -e "AGENT_LEE_QWEN_BRAIN_MODEL=qwen3:latest" `
  -e "AGENT_LEE_QWEN_VISION_MODEL=qwen2.5vl:7b" `
  $ImageName | Out-Null

Start-Sleep -Seconds 8

$Status = Invoke-RestMethod -Method Get -Uri "http://127.0.0.1:8099/status" -TimeoutSec 30

$Receipt = @{
  verdict = "AGENT_LEE_SDXL_LIGHTNING_PROMPT_DOCTRINE_PATCHED"
  no_image_generation_performed = $true
  prompt_doctrine = "agent_lee_sdxl_lightning_master_prompt_doctrine_v1"
  note = "Converted Tiny-SD prompt-engineering knowledge into SDXL-Lightning-specific Qwen3 planner doctrine. Did not use Tiny-SD settings like CFG 7-9 or 30-50 steps."
  technical_settings = @{
    model = "SDXL-Lightning"
    steps = 4
    guidance_scale = 0.0
    first_stable_resolution = "768x768"
  }
  three_d_lanes_touched = $false
  status = $Status
  created_at = (Get-Date).ToString("o")
}

$ReceiptPath = Join-Path $Proof "AGENT_LEE_SDXL_LIGHTNING_PROMPT_DOCTRINE_PATCH_$Stamp.receipt.json"
$Receipt | ConvertTo-Json -Depth 80 | Set-Content -Path $ReceiptPath -Encoding UTF8

notepad $ReceiptPath

Write-Host ""
Write-Host "Patched SDXL-Lightning prompt doctrine." -ForegroundColor Green
Write-Host "No image generation was performed." -ForegroundColor Yellow
Write-Host "3D lanes were not touched." -ForegroundColor Yellow
Write-Host "Receipt: $ReceiptPath" -ForegroundColor Cyan