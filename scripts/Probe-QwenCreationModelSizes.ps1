$ErrorActionPreference = "Continue"

$Root = "D:\Leeway-Ecosystem v2.1.4"
$Proof = Join-Path $Root "Archive\proofs\qwen-creation-model-probe"
$EnvPath = Join-Path $Root ".env.local"
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"

New-Item -ItemType Directory -Force -Path $Proof | Out-Null

$ReportPath = Join-Path $Proof "QWEN_CREATION_MODEL_SIZE_PROBE_$Stamp.txt"
$ReceiptPath = Join-Path $Proof "QWEN_CREATION_MODEL_SIZE_PROBE_$Stamp.receipt.json"

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
}

Remove-Item Env:HF_HUB_ENABLE_HF_TRANSFER -ErrorAction SilentlyContinue
$env:HF_XET_HIGH_PERFORMANCE = "1"
$env:HF_HUB_DISABLE_SYMLINKS_WARNING = "1"
$env:PYTHONWARNINGS = "ignore::FutureWarning"

$Repos = @(
  "reb82/qwen-image-edit-2511-lightning-fp8",
  "lightx2v/Qwen-Image-Lightning",
  "lightx2v/Qwen-Image-Edit-2511-Lightning",
  "unsloth/Qwen-Image-Edit-2511-GGUF",
  "Phil2Sat/Qwen-Image-Edit-Rapid-AIO-GGUF",
  "Qwen/Qwen-Image",
  "Qwen/Qwen-Image-Edit-2511"
)

$TempPy = Join-Path $Proof "probe_qwen_sizes_$Stamp.py"

$RepoListPython = ($Repos | ForEach-Object { '"' + $_ + '"' }) -join ","

$Python = @"
import os, json, warnings
warnings.filterwarnings("ignore", category=FutureWarning)

from huggingface_hub import HfApi

repos = [$RepoListPython]
token = (
    os.environ.get("HF_TOKEN")
    or os.environ.get("HUGGINGFACE_TOKEN")
    or os.environ.get("HUGGING_FACE_HUB_TOKEN")
    or os.environ.get("HF_HUB_TOKEN")
)

api = HfApi(token=token)
results = []

for repo in repos:
    item = {
        "repo": repo,
        "ok": False,
        "total_size_bytes": 0,
        "total_size_gb": 0,
        "file_count": 0,
        "largest_files": [],
        "safetensors_files": [],
        "gguf_files": [],
        "json_files": [],
        "error": None
    }

    try:
        info = api.model_info(repo, files_metadata=True)
        files = []

        for s in info.siblings:
            name = getattr(s, "rfilename", None)
            size = getattr(s, "size", None) or 0

            if name:
                files.append({"name": name, "size": size})

        item["ok"] = True
        item["file_count"] = len(files)
        item["total_size_bytes"] = sum(f["size"] for f in files)
        item["total_size_gb"] = round(item["total_size_bytes"] / 1024 / 1024 / 1024, 3)
        item["largest_files"] = sorted(files, key=lambda x: x["size"], reverse=True)[:25]
        item["safetensors_files"] = [f for f in files if f["name"].lower().endswith(".safetensors")][:50]
        item["gguf_files"] = [f for f in files if f["name"].lower().endswith(".gguf")][:50]
        item["json_files"] = [f for f in files if f["name"].lower().endswith(".json")][:50]
    except Exception as e:
        item["error"] = str(e)

    results.append(item)

print(json.dumps(results, indent=2))
"@

$Python | Set-Content -Path $TempPy -Encoding UTF8

$Output = cmd /c "python -W ignore::FutureWarning `"$TempPy`" 2>&1"
$OutputText = $Output | Out-String -Width 4096

$Parsed = $null

try {
  $Parsed = $OutputText | ConvertFrom-Json -Depth 80
}
catch {
  $Parsed = $null
}

$Recommendation = @()

if ($Parsed) {
  $Sorted = @($Parsed | Where-Object { $_.ok -eq $true } | Sort-Object total_size_bytes)

  $Recommendation += "Smallest available repos first:"
  foreach ($Repo in ($Sorted | Select-Object -First 5)) {
    $Recommendation += "$($Repo.repo) = $($Repo.total_size_gb) GB, files=$($Repo.file_count)"
  }

  $Fp8 = $Sorted | Where-Object { $_.repo -match "fp8" } | Select-Object -First 1
  if ($Fp8) {
    $Recommendation += "FP8 candidate found: $($Fp8.repo) = $($Fp8.total_size_gb) GB"
  }
}

$Report = @"
QWEN CREATION MODEL SIZE PROBE
Created: $((Get-Date).ToString("o"))

HF token key detected: $HfTokenKey
HF token present: $([bool]$HfToken)

==================== RAW PROBE OUTPUT ====================
$OutputText

==================== RECOMMENDATION ====================
$($Recommendation -join "`n")
"@

$Report | Set-Content -Path $ReportPath -Encoding UTF8

$Receipt = @{
  verdict = "QWEN_CREATION_MODEL_SIZE_PROBE_COMPLETE"
  hf_token_key_detected = $HfTokenKey
  hf_token_present = [bool]$HfToken
  repos = $Repos
  parsed = $Parsed
  recommendation = $Recommendation
  report = $ReportPath
  created_at = (Get-Date).ToString("o")
}

$Receipt | ConvertTo-Json -Depth 100 | Set-Content -Path $ReceiptPath -Encoding UTF8

notepad $ReportPath
notepad $ReceiptPath

Write-Host ""
Write-Host "Qwen creation model size probe complete." -ForegroundColor Green
Write-Host "Report: $ReportPath" -ForegroundColor Cyan
Write-Host "Receipt: $ReceiptPath" -ForegroundColor Cyan