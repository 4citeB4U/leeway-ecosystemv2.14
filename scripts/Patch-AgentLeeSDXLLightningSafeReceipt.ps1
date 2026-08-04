$ErrorActionPreference = "Stop"

$Root = "D:\Leeway-Ecosystem v2.1.4"
$ServiceRoot = Join-Path $Root "Cerebral\services\agent-lee-sdxl-lightning-image-lane"
$MainPy = Join-Path $ServiceRoot "app\main.py"
$ImageName = "agent-lee-sdxl-lightning-image-lane:local"
$ContainerName = "agent-lee-sdxl-lightning-image-lane"
$ModelsRoot = Join-Path $Root "models"
$Artifacts = Join-Path $Root "Archive\agent-lee-artifacts\sdxl-lightning-image-lane"

if (-not (Test-Path $MainPy)) {
  throw "main.py not found: $MainPy"
}

$Text = Get-Content $MainPy -Raw

# Add shutil import.
if ($Text -notmatch "(?m)^import shutil$") {
  $Text = $Text.Replace("import re`n", "import re`nimport shutil`n")
}

# Replace the candidate save area with immediate safe final/receipt writing.
$Old = @'
        generation = generate_one(
            prompt=final_prompt,
            negative_prompt=negative_prompt,
            out_path=out_path,
            width=width,
            height=height,
            seed=seed,
        )

        prompt_used = generation.get("prompt_used", final_prompt)

        if req.use_qwen_review:
            review = qwen25vl_review(req.prompt, prompt_used, out_path)
            score = candidate_score(review)
            quality_pass = review_passes(review)
        else:
            review = {
                "score": 0,
                "matches_request": None,
                "verdict": "REVIEW_DISABLED",
            }
            score = 0
            quality_pass = None
'@

$New = @'
        generation = generate_one(
            prompt=final_prompt,
            negative_prompt=negative_prompt,
            out_path=out_path,
            width=width,
            height=height,
            seed=seed,
        )

        # Safe write immediately after generation, before Qwen review.
        # This prevents losing the final image if review or memory fails.
        safe_final_path = job_dir / "image.png"
        shutil.copyfile(out_path, safe_final_path)

        early_receipt = {
            "ok": True,
            "verdict": "IMAGE_GENERATED_REVIEW_PENDING",
            "job_id": job_id,
            "app": APP_NAME,
            "version": "2.1.1-sdxl-lightning-safe-receipt",
            "active_live_model": ACTIVE_MODEL,
            "image_generator": "ByteDance/SDXL-Lightning 4-step LoRA",
            "original_prompt": req.prompt,
            "planned_prompt": final_prompt,
            "candidate_path": str(out_path),
            "image_path": str(safe_final_path),
            "image_url": f"/artifacts/{job_id}/image.png",
            "candidate_url": f"/artifacts/{job_id}/candidate_{index}.png",
            "generation": generation,
            "review_status": "pending",
            "three_d_lanes_touched": False,
            "created_at": now_iso(),
        }

        (job_dir / "receipt.json").write_text(json.dumps(early_receipt, indent=2), encoding="utf-8")

        prompt_used = generation.get("prompt_used", final_prompt)

        if req.use_qwen_review:
            review = qwen25vl_review(req.prompt, prompt_used, out_path)
            score = candidate_score(review)
            quality_pass = review_passes(review)
        else:
            review = {
                "score": 0,
                "matches_request": None,
                "verdict": "REVIEW_DISABLED",
            }
            score = 0
            quality_pass = None
'@

if ($Text -notmatch "IMAGE_GENERATED_REVIEW_PENDING") {
  $Text = $Text.Replace($Old, $New)
}

$Text = $Text.Replace('"version": "2.1.0-sdxl-lightning-corrected"', '"version": "2.1.1-sdxl-lightning-safe-receipt"')

Set-Content -Path $MainPy -Value $Text -Encoding UTF8

docker build -t $ImageName $ServiceRoot

docker rm -f $ContainerName

docker run -d `
  --init `
  --name $ContainerName `
  --gpus all `
  --network leeway-ecosystemv214_leeway-net `
  -p "8099:8095" `
  --mount "type=bind,source=$ModelsRoot,target=/models" `
  --mount "type=bind,source=$Artifacts,target=/artifacts" `
  -e "AGENT_LEE_IMAGE_MODEL=ByteDance/SDXL-Lightning-LoRA-UltraLowMemory" `
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
  $ImageName

Start-Sleep -Seconds 8

Invoke-RestMethod -Method Get -Uri "http://127.0.0.1:8099/status" -TimeoutSec 30 |
  ConvertTo-Json -Depth 80