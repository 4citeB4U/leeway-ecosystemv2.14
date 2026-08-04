$ErrorActionPreference = "Continue"

$Root = "D:\Leeway-Ecosystem v2.1.4"
$Proof = Join-Path $Root "Archive\proofs\qwen-creation-model-download"
$ModelsRoot = Join-Path $Root "models\creation"
$EnvPath = Join-Path $Root ".env.local"
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"

New-Item -ItemType Directory -Force -Path $Proof, $ModelsRoot | Out-Null

Write-Host ""
Write-Host "Downloading Agent Lee Qwen creation models - corrected downloader..." -ForegroundColor Cyan

# Remove deprecated Hugging Face transfer env if it exists.
# It was causing the prior run to fail before downloading files.
Remove-Item Env:HF_HUB_ENABLE_HF_TRANSFER -ErrorAction SilentlyContinue
$env:HF_XET_HIGH_PERFORMANCE = "1"
$env:HF_HUB_DISABLE_SYMLINKS_WARNING = "1"
$env:PYTHONWARNINGS = "ignore::FutureWarning"

# Read .env.local safely.
$EnvPairs = @{}

if (Test-Path $EnvPath) {
  Get-Content $EnvPath | ForEach-Object {
    $Line = $_.Trim()
    if ($Line -eq "") { return }
    if ($Line.StartsWith("#")) { return }
    if ($Line -notmatch "=") { return }

    $Parts = $Line.Split("=", 2)
    $Key = $Parts[0].Trim()
    $Value = $Parts[1].Trim().Trim('"').Trim("'")

    if ($Key) {
      $EnvPairs[$Key] = $Value
    }
  }
}

$HfTokenKeys = @(
  "HF_TOKEN",
  "HUGGINGFACE_TOKEN",
  "HUGGING_FACE_HUB_TOKEN",
  "HF_HUB_TOKEN"
)

$HfTokenKey = $HfTokenKeys |
  Where-Object { $EnvPairs.ContainsKey($_) -and $EnvPairs[$_] } |
  Select-Object -First 1

$HfToken = ""

if ($HfTokenKey) {
  $HfToken = $EnvPairs[$HfTokenKey]
  $env:HF_TOKEN = $HfToken
  $env:HUGGINGFACE_TOKEN = $HfToken
  $env:HUGGING_FACE_HUB_TOKEN = $HfToken
  $env:HF_HUB_TOKEN = $HfToken
  Write-Host "Using Hugging Face token key: $HfTokenKey" -ForegroundColor Green
}
else {
  Write-Host "No Hugging Face token found. Public downloads may still work, but token is preferred." -ForegroundColor Yellow
}

# We download both base and lightning/FP8 lanes.
# Lightning repos can be adapters/LoRAs, so the base repos are needed too.
$Models = @(
  @{
    role = "base_text_to_image"
    repo = "Qwen/Qwen-Image"
    local = "Qwen--Qwen-Image"
  },
  @{
    role = "lightning_text_to_image"
    repo = "lightx2v/Qwen-Image-Lightning"
    local = "lightx2v--Qwen-Image-Lightning"
  },
  @{
    role = "base_image_edit_2511"
    repo = "Qwen/Qwen-Image-Edit-2511"
    local = "Qwen--Qwen-Image-Edit-2511"
  },
  @{
    role = "lightning_image_edit_2511"
    repo = "lightx2v/Qwen-Image-Edit-2511-Lightning"
    local = "lightx2v--Qwen-Image-Edit-2511-Lightning"
  },
  @{
    role = "fp8_image_edit_2511"
    repo = "reb82/qwen-image-edit-2511-lightning-fp8"
    local = "reb82--qwen-image-edit-2511-lightning-fp8"
  }
)

$Results = @()

foreach ($Model in $Models) {
  $TargetDir = Join-Path $ModelsRoot $Model.local
  New-Item -ItemType Directory -Force -Path $TargetDir | Out-Null

  Write-Host ""
  Write-Host "Downloading $($Model.repo)" -ForegroundColor Cyan
  Write-Host "Target: $TargetDir" -ForegroundColor DarkCyan

  $TempPy = Join-Path $Proof "download_$($Model.local)_$Stamp.py"
  $OutputPath = Join-Path $Proof "download_$($Model.local)_$Stamp.output.txt"

  $Python = @"
import os, json, sys, warnings
warnings.filterwarnings("ignore", category=FutureWarning)

from huggingface_hub import snapshot_download

repo_id = r'''$($Model.repo)'''
local_dir = r'''$TargetDir'''
token = (
    os.environ.get("HF_TOKEN")
    or os.environ.get("HUGGINGFACE_TOKEN")
    or os.environ.get("HUGGING_FACE_HUB_TOKEN")
    or os.environ.get("HF_HUB_TOKEN")
)

result = {
    "repo_id": repo_id,
    "local_dir": local_dir,
    "ok": False,
    "snapshot_path": None,
    "error": None
}

try:
    path = snapshot_download(
        repo_id=repo_id,
        local_dir=local_dir,
        token=token,
        resume_download=True
    )
    result["ok"] = True
    result["snapshot_path"] = path
except Exception as e:
    result["error"] = str(e)

print(json.dumps(result, indent=2))

if not result["ok"]:
    sys.exit(2)
"@

  $Python | Set-Content -Path $TempPy -Encoding UTF8

  $Output = cmd /c "python -W ignore::FutureWarning `"$TempPy`" 2>&1"
  $ExitCode = $LASTEXITCODE

  $Output | Out-String -Width 4096 | Set-Content -Path $OutputPath -Encoding UTF8

  $FileCount = @(Get-ChildItem -Recurse -File $TargetDir -ErrorAction SilentlyContinue).Count
  $SizeBytes = ((Get-ChildItem -Recurse -File $TargetDir -ErrorAction SilentlyContinue | Measure-Object Length -Sum).Sum)

  $Parsed = $null
  try {
    $Parsed = ($Output | Out-String) | ConvertFrom-Json -Depth 30
  }
  catch {
    $Parsed = $null
  }

  $Ok = ($ExitCode -eq 0 -and $FileCount -gt 0)

  $Results += [pscustomobject]@{
    role = $Model.role
    repo = $Model.repo
    local_dir = $TargetDir
    ok = $Ok
    exit_code = $ExitCode
    file_count = $FileCount
    size_bytes = $SizeBytes
    parsed = $Parsed
    output_path = $OutputPath
    output_preview = (($Output | Out-String -Width 4096).Substring(0, [Math]::Min(3000, ($Output | Out-String -Width 4096).Length)))
  }

  if ($Ok) {
    Write-Host "Downloaded: $($Model.repo) | files: $FileCount | bytes: $SizeBytes" -ForegroundColor Green
  }
  else {
    Write-Host "Download did not complete: $($Model.repo) | exit: $ExitCode | files: $FileCount" -ForegroundColor Yellow
    Write-Host "Output saved: $OutputPath" -ForegroundColor Yellow
  }
}

$LocalInventory = @(Get-ChildItem -Path $ModelsRoot -Recurse -File -ErrorAction SilentlyContinue |
  Select-Object FullName, Length, LastWriteTime)

$TopFiles = @($LocalInventory | Sort-Object Length -Descending | Select-Object -First 40)

$Receipt = @{
  verdict = "AGENT_LEE_QWEN_CREATION_MODELS_DOWNLOAD_CORRECTED_ATTEMPTED"
  models_root = $ModelsRoot
  selected_models = $Models
  download_results = $Results
  local_inventory_count = @($LocalInventory).Count
  local_inventory_top_files = $TopFiles
  hf_token_key_detected = $HfTokenKey
  hf_token_present = [bool]$HfToken
  note = "Token value intentionally omitted. Deprecated HF_HUB_ENABLE_HF_TRANSFER was removed for this run."
  created_at = (Get-Date).ToString("o")
}

$ReceiptPath = Join-Path $Proof "AGENT_LEE_QWEN_CREATION_MODELS_DOWNLOAD_CORRECTED_$Stamp.receipt.json"
$Receipt | ConvertTo-Json -Depth 80 | Set-Content -Path $ReceiptPath -Encoding UTF8

notepad $ReceiptPath

Write-Host ""
Write-Host "Corrected Qwen creation model download attempt complete." -ForegroundColor Green
Write-Host "Receipt: $ReceiptPath" -ForegroundColor Cyan