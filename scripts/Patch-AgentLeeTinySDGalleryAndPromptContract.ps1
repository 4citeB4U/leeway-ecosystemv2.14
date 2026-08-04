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

# Add shutil import for copyfile.
if ($Text -notmatch "import shutil") {
  $Text = $Text.Replace("import uuid", "import uuid`nimport shutil")
}

# Replace hard subject contract with Tiny-SD-friendly subject language.
$PatternContract = 'def build_hard_subject_contract\(user_prompt: str\) -> str:\s+if request_mentions_specific_hybrid\(user_prompt\):\s+return \((?s).*?\)\s+return ""'

$NewContract = @'
def build_hard_subject_contract(user_prompt: str) -> str:
    if request_mentions_specific_hybrid(user_prompt):
        return (
            "single character only, full-body front-facing fantasy character design sheet, "
            "anthropomorphic dog-headed human male warrior, standing upright like a man, "
            "human male body with clear torso, chest, waist, two arms, two hands, two legs, and two feet, "
            "head is unmistakably canine: long dog muzzle, black dog nose, dog ears, wolfhound or German shepherd facial identity, "
            "large bat-like dragon wings spread wide from the back, not feather angel wings, "
            "visible dragon tail behind the legs, dragon horns, dragon scales on shoulders and forearms, clawed gauntlets, "
            "plain light gray background, bright rim lighting, full body visible from head to feet, not cropped, "
            "readable silhouette, symmetrical standing pose, concept art character turnaround style"
        )

    return ""
'@

$Text = [regex]::Replace($Text, $PatternContract, $NewContract)

# Make the Qwen prompt engineer preserve Tiny-SD-friendly phrasing.
$Text = $Text.Replace(
'Return only one compact image prompt. No explanation. Do not remove any required anatomy. Keep full-body humanoid male body, dog head, dragon wings, scales, horns, claws, and tail explicit.',
'Return only one compact image prompt. No explanation. Do not remove any required anatomy. Keep these exact visual anchors explicit: anthropomorphic dog-headed human male warrior, long canine muzzle, dog ears, human torso, arms, hands, legs, feet, bat-like dragon wings, visible dragon tail, dragon scales, horns, clawed gauntlets, front-facing full-body character sheet.'
)

# Replace deterministic retry prompt with clearer Tiny-SD-friendly retry.
$PatternRetryPrompt = 'def build_deterministic_retry_prompt\(original_prompt: str, previous_prompt: str\) -> str:\s+hard_contract = build_hard_subject_contract\(original_prompt\)(?s).*?return \(\s+previous_prompt\s+\+ ", clearer subject, full body visible, readable anatomy, bright lighting, centered composition, sharp silhouette"\s+\)'

$NewRetryPrompt = @'
def build_deterministic_retry_prompt(original_prompt: str, previous_prompt: str) -> str:
    hard_contract = build_hard_subject_contract(original_prompt)

    if hard_contract:
        return (
            hard_contract
            + ", make it look like a clear anthropomorphic dog-headed man, not a helmeted human, "
            + "dog muzzle must protrude clearly from the face, dog ears visible, "
            + "dragon wings must be bat-like leather wings, wide and visible on both sides, not bird feathers, "
            + "dragon tail must be visible behind the legs, "
            + "arms and hands must be visible and separated from the wings, "
            + "front view, standing pose, light background, full body not cropped"
        )

    return (
        previous_prompt
        + ", clearer subject, full body visible, readable anatomy, bright lighting, centered composition, sharp silhouette"
    )
'@

$Text = [regex]::Replace($Text, $PatternRetryPrompt, $NewRetryPrompt)

# Use copyfile instead of replace so candidate images remain available.
$Text = $Text.Replace("best_path.replace(final_path)", "shutil.copyfile(best_path, final_path)")
$Text = $Text.Replace("retry_path.replace(final_path)", "shutil.copyfile(retry_path, final_path)")

# Add candidate URLs to receipt if not already present.
$ReceiptMarker = '"image_path": str(final_path),'
if ($Text -notmatch '"candidate_urls"') {
  $Text = $Text.Replace(
    $ReceiptMarker,
    '"candidate_urls": [f"/artifacts/{job_id}/" + Path(c["path"]).name for c in candidates],' + "`n" + '        "image_path": str(final_path),'
  )
}

# Add a generic artifact file route so candidate_2.png etc. no longer 404.
if ($Text -notmatch 'def get_artifact_file\(job_id: str, filename: str\):') {
$GenericRoute = @'

@app.get("/artifacts/{job_id}/{filename}")
def get_artifact_file(job_id: str, filename: str):
    safe_name = Path(filename).name

    if safe_name != filename:
        return JSONResponse(status_code=400, content={"ok": False, "error": "INVALID_FILENAME"})

    allowed = safe_name.endswith(".png") or safe_name.endswith(".json")

    if not allowed:
        return JSONResponse(status_code=400, content={"ok": False, "error": "UNSUPPORTED_FILE_TYPE"})

    path = ARTIFACT_ROOT / job_id / safe_name

    if not path.exists():
        return JSONResponse(status_code=404, content={"ok": False, "error": "ARTIFACT_NOT_FOUND", "filename": safe_name})

    if safe_name.endswith(".png"):
        return FileResponse(path, media_type="image/png", filename=safe_name)

    return FileResponse(path, media_type="application/json", filename=safe_name)
'@

  $Text = $Text + "`n" + $GenericRoute + "`n"
}

Set-Content -Path $MainPy -Value $Text -Encoding UTF8

Write-Host "Patched Tiny-SD prompt contract, candidate preservation, and artifact gallery routes." -ForegroundColor Green

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
  verdict = "AGENT_LEE_TINY_SD_GALLERY_AND_PROMPT_CONTRACT_PATCHED"
  patch = "Candidate images are now served over HTTP. Selected candidate is copied instead of moved. Prompt contract now uses Tiny-SD-friendly dog-headed humanoid and bat-like dragon wing anchors."
  status = $Status
  created_at = (Get-Date).ToString("o")
}

$ReceiptPath = Join-Path $Proof "AGENT_LEE_TINY_SD_GALLERY_PROMPT_PATCH_$Stamp.receipt.json"
$Receipt | ConvertTo-Json -Depth 40 | Set-Content -Path $ReceiptPath -Encoding UTF8

notepad $ReceiptPath

Write-Host ""
Write-Host "Patched and restarted Tiny-SD gallery/prompt lane." -ForegroundColor Green
Write-Host "Receipt: $ReceiptPath" -ForegroundColor Cyan