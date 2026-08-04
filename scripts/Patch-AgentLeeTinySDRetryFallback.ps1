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

$InsertAfter = @'
def build_negative_prompt(user_negative: str, original_prompt: str) -> str:
    extra = ""

    if request_mentions_specific_hybrid(original_prompt):
        extra = (
            ", quadruped only, animal only, dragon only, dog only, no human body, "
            "monster mound, giant beast crouching, unclear anatomy, hidden legs, hidden arms, "
            "faceless creature, body obscured by shadows, only head visible, non-humanoid"
        )

    combined = (user_negative or DEFAULT_NEGATIVE_PROMPT) + extra
    return combined
'@

$NewFunction = @'
def build_deterministic_retry_prompt(original_prompt: str, previous_prompt: str) -> str:
    hard_contract = build_hard_subject_contract(original_prompt)

    if hard_contract:
        return (
            hard_contract
            + ", make the character clearly humanoid from head to toe, standing upright in a front-facing character design sheet pose, "
            + "dog head must be unmistakable with long canine muzzle and dog ears, "
            + "dragon wings must be wide and visible on both sides, dragon tail must be visible behind legs, "
            + "human torso, arms, hands, legs, and feet must be clearly separated and readable, "
            + "bright rim lighting, plain contrasting background, full body not cropped, no vague monster shape"
        )

    return (
        previous_prompt
        + ", clearer subject, full body visible, readable anatomy, bright lighting, centered composition, sharp silhouette"
    )
'@

if ($Text -notlike "*def build_deterministic_retry_prompt(original_prompt: str, previous_prompt: str) -> str:*") {
  if ($Text -notlike "*def build_negative_prompt(user_negative: str, original_prompt: str) -> str:*") {
    throw "build_negative_prompt function not found."
  }

  $Text = $Text.Replace($InsertAfter, $InsertAfter + "`n`n" + $NewFunction)
}

$OldRetryBlock = @'
    if req.retry_if_weak and req.use_qwen_review and ENABLE_QWEN_REVIEW and best_score < 9.5:
        retry_prompt = parse_retry_prompt(best_review)

        if retry_prompt:
            retry_path = job_dir / "candidate_retry.png"

            retry_result = generate_png(
                prompt=retry_prompt,
                negative_prompt=negative_prompt,
                width=req.width,
                height=req.height,
                steps=max(req.steps, 12),
                guidance_scale=max(req.guidance_scale, 8.0),
                seed=None,
                out_path=retry_path,
            )

            retry_review = call_ollama_image_review(original_prompt, retry_prompt, retry_path)
            retry_review_score = parse_review_score(retry_review)
            retry_strict_score = score_candidate(retry_review)

            retry_candidate = {
                "index": "retry",
                "path": str(retry_path),
                "prompt": retry_prompt,
                "review": retry_review,
                "review_score": retry_review_score,
                "strict_score": retry_strict_score,
                "generation": retry_result,
            }

            candidates.append(retry_candidate)

            if retry_strict_score >= best_score:
                final_prompt = retry_prompt
                retry_path.replace(final_path)
                retry_result["path"] = str(final_path)
                best = retry_candidate
                used_retry = True
'@

$NewRetryBlock = @'
    if req.retry_if_weak and req.use_qwen_review and ENABLE_QWEN_REVIEW and best_score < 9.5:
        retry_prompt = parse_retry_prompt(best_review)

        if not retry_prompt:
            retry_prompt = build_deterministic_retry_prompt(original_prompt, final_prompt)

        retry_path = job_dir / "candidate_retry.png"

        retry_result = generate_png(
            prompt=retry_prompt,
            negative_prompt=negative_prompt,
            width=req.width,
            height=req.height,
            steps=max(req.steps, 18),
            guidance_scale=max(req.guidance_scale, 9.0),
            seed=None,
            out_path=retry_path,
        )

        retry_review = call_ollama_image_review(original_prompt, retry_prompt, retry_path)
        retry_review_score = parse_review_score(retry_review)
        retry_strict_score = score_candidate(retry_review)

        retry_candidate = {
            "index": "retry",
            "path": str(retry_path),
            "prompt": retry_prompt,
            "review": retry_review,
            "review_score": retry_review_score,
            "strict_score": retry_strict_score,
            "generation": retry_result,
        }

        candidates.append(retry_candidate)

        if retry_strict_score >= best_score:
            final_prompt = retry_prompt
            retry_path.replace(final_path)
            retry_result["path"] = str(final_path)
            best = retry_candidate
            used_retry = True
'@

if ($Text -notlike "*if req.retry_if_weak and req.use_qwen_review and ENABLE_QWEN_REVIEW and best_score < 9.5:*") {
  throw "Retry block not found."
}

$Text = $Text.Replace($OldRetryBlock, $NewRetryBlock)

Set-Content -Path $MainPy -Value $Text -Encoding UTF8

Write-Host "Patched deterministic retry fallback." -ForegroundColor Green

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
  verdict = "AGENT_LEE_TINY_SD_RETRY_FALLBACK_PATCHED"
  patch = "When Qwen gives no retry_prompt but strict_score is below 9.5, Agent Lee now creates a deterministic hard-anatomy retry prompt."
  status = $Status
  created_at = (Get-Date).ToString("o")
}

$ReceiptPath = Join-Path $Proof "AGENT_LEE_TINY_SD_RETRY_FALLBACK_PATCH_$Stamp.receipt.json"
$Receipt | ConvertTo-Json -Depth 40 | Set-Content -Path $ReceiptPath -Encoding UTF8

notepad $ReceiptPath

Write-Host ""
Write-Host "Patched and restarted Tiny-SD retry fallback lane." -ForegroundColor Green
Write-Host "Receipt: $ReceiptPath" -ForegroundColor Cyan