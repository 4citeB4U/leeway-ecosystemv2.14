$ErrorActionPreference = "Continue"

$Root = "D:\Leeway-Ecosystem v2.1.4"
$Proof = Join-Path $Root "Archive\proofs\qwen-creation-model-probe"
$EnvPath = Join-Path $Root ".env.local"
$VenvPython = Join-Path $Root "Cerebral\.venv\Scripts\python.exe"
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"

New-Item -ItemType Directory -Force -Path $Proof | Out-Null

$JsonOut = Join-Path $Proof "QWEN_CREATION_MODEL_SIZE_PROBE_HFAPI_SAFE_$Stamp.raw.json"
$PyOut = Join-Path $Proof "QWEN_CREATION_MODEL_SIZE_PROBE_HFAPI_SAFE_$Stamp.pyout.txt"
$ReportPath = Join-Path $Proof "QWEN_CREATION_MODEL_SIZE_PROBE_HFAPI_SAFE_$Stamp.txt"
$ReceiptPath = Join-Path $Proof "QWEN_CREATION_MODEL_SIZE_PROBE_HFAPI_SAFE_$Stamp.receipt.json"
$ConfigPath = Join-Path $Proof "QWEN_CREATION_MODEL_SIZE_PROBE_HFAPI_SAFE_$Stamp.config.json"
$TempPy = Join-Path $Proof "probe_qwen_sizes_hfapi_safe_$Stamp.py"

Write-Host ""
Write-Host "Agent Lee Qwen Creation Model Size Probe - HF API safe version" -ForegroundColor Cyan

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
  Write-Host "Using Hugging Face token key: $HfTokenKey" -ForegroundColor Green
}
else {
  Write-Host "No Hugging Face token found." -ForegroundColor Yellow
}

$PythonExe = "python"

if (Test-Path $VenvPython) {
  $PythonExe = $VenvPython
}

Write-Host "Python: $PythonExe" -ForegroundColor Cyan

$Repos = @(
  "reb82/qwen-image-edit-2511-lightning-fp8",
  "unsloth/Qwen-Image-Edit-2511-GGUF",
  "Phil2Sat/Qwen-Image-Edit-Rapid-AIO-GGUF",
  "lightx2v/Qwen-Image-Lightning",
  "lightx2v/Qwen-Image-Edit-2511-Lightning",
  "Qwen/Qwen-Image",
  "Qwen/Qwen-Image-Edit-2511"
)

$Config = @{
  repos = $Repos
  json_out = $JsonOut
  token_present = [bool]$HfToken
}

$Config | ConvertTo-Json -Depth 20 | Set-Content -Path $ConfigPath -Encoding UTF8

if ($HfToken) {
  $env:HF_TOKEN = $HfToken
  $env:HUGGINGFACE_TOKEN = $HfToken
  $env:HUGGING_FACE_HUB_TOKEN = $HfToken
  $env:HF_HUB_TOKEN = $HfToken
}

Remove-Item Env:HF_HUB_ENABLE_HF_TRANSFER -ErrorAction SilentlyContinue
$env:HF_HUB_DISABLE_SYMLINKS_WARNING = "1"
$env:PYTHONWARNINGS = "ignore"

$Python = @'
import json
import os
import sys
import traceback
from pathlib import Path

config_path = sys.argv[1]

with open(config_path, "r", encoding="utf-8") as f:
    cfg = json.load(f)

repos = cfg["repos"]
out_path = cfg["json_out"]

results = []

try:
    import huggingface_hub
    from huggingface_hub import HfApi
    hub_version = getattr(huggingface_hub, "__version__", "unknown")
except Exception as e:
    payload = {
        "fatal": True,
        "stage": "import_huggingface_hub",
        "error": str(e),
        "traceback": traceback.format_exc(),
        "results": []
    }
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)
    print("FAILED_IMPORT_HUGGINGFACE_HUB")
    sys.exit(2)

token = (
    os.environ.get("HF_TOKEN")
    or os.environ.get("HUGGINGFACE_TOKEN")
    or os.environ.get("HUGGING_FACE_HUB_TOKEN")
    or os.environ.get("HF_HUB_TOKEN")
)

api = HfApi(token=token)

for repo in repos:
    item = {
        "repo": repo,
        "ok": False,
        "id": None,
        "pipeline_tag": None,
        "library_name": None,
        "downloads": None,
        "likes": None,
        "total_size_bytes": 0,
        "total_size_gb": 0,
        "file_count": 0,
        "largest_files": [],
        "safetensors_files": [],
        "gguf_files": [],
        "json_files": [],
        "error": None,
        "traceback": None
    }

    try:
        info = api.model_info(repo_id=repo, files_metadata=True)

        item["ok"] = True
        item["id"] = getattr(info, "id", None)
        item["pipeline_tag"] = getattr(info, "pipeline_tag", None)
        item["library_name"] = getattr(info, "library_name", None)
        item["downloads"] = getattr(info, "downloads", None)
        item["likes"] = getattr(info, "likes", None)

        files = []
        for s in getattr(info, "siblings", []) or []:
            name = getattr(s, "rfilename", None)
            size = getattr(s, "size", None) or 0

            if name:
                files.append({
                    "name": name,
                    "size": int(size),
                    "size_mb": round(int(size) / 1024 / 1024, 2),
                    "size_gb": round(int(size) / 1024 / 1024 / 1024, 3)
                })

        files_sorted = sorted(files, key=lambda x: x["size"], reverse=True)

        item["file_count"] = len(files)
        item["total_size_bytes"] = sum(f["size"] for f in files)
        item["total_size_gb"] = round(item["total_size_bytes"] / 1024 / 1024 / 1024, 3)
        item["largest_files"] = files_sorted[:25]
        item["safetensors_files"] = [f for f in files_sorted if f["name"].lower().endswith(".safetensors")]
        item["gguf_files"] = [f for f in files_sorted if f["name"].lower().endswith(".gguf")]
        item["json_files"] = [f for f in files_sorted if f["name"].lower().endswith(".json")]
    except Exception as e:
        item["error"] = str(e)
        item["traceback"] = traceback.format_exc()

    results.append(item)

payload = {
    "fatal": False,
    "huggingface_hub_version": hub_version,
    "token_present": bool(token),
    "results": results
}

Path(out_path).parent.mkdir(parents=True, exist_ok=True)

with open(out_path, "w", encoding="utf-8") as f:
    json.dump(payload, f, indent=2)

print("WROTE_JSON=" + out_path)
'@

$Python | Set-Content -Path $TempPy -Encoding UTF8

$Output = cmd /c "`"$PythonExe`" -W ignore `"$TempPy`" `"$ConfigPath`" 2>&1"
$ExitCode = $LASTEXITCODE
$OutputText = $Output | Out-String -Width 4096
$OutputText | Set-Content -Path $PyOut -Encoding UTF8

$Payload = $null
$Results = $null

if (Test-Path $JsonOut) {
  try {
    $Payload = Get-Content $JsonOut -Raw | ConvertFrom-Json -Depth 100
    $Results = $Payload.results
  }
  catch {
    $Payload = $null
    $Results = $null
  }
}

$Recommendation = @()

if ($Payload -and $Payload.fatal) {
  $Recommendation += "Fatal Python probe failure: $($Payload.stage) - $($Payload.error)"
}
elseif ($Results) {
  $Sorted = @($Results | Where-Object { $_.ok -eq $true } | Sort-Object total_size_bytes)

  if ($Sorted.Count -gt 0) {
    $Recommendation += "Smallest confirmed repos:"

    foreach ($R in ($Sorted | Select-Object -First 7)) {
      $Recommendation += "$($R.repo) = $($R.total_size_gb) GB, files=$($R.file_count), pipeline=$($R.pipeline_tag), library=$($R.library_name), downloads=$($R.downloads), likes=$($R.likes)"
    }

    $Fp8 = $Sorted | Where-Object { $_.repo -match "fp8" } | Select-Object -First 1
    if ($Fp8) {
      $Recommendation += "Preferred FP8 candidate: $($Fp8.repo) = $($Fp8.total_size_gb) GB"
    }

    $Gguf = $Sorted | Where-Object { $_.repo -match "GGUF" } | Select-Object -First 1
    if ($Gguf) {
      $Recommendation += "Preferred GGUF candidate: $($Gguf.repo) = $($Gguf.total_size_gb) GB"
    }

    $Recommendation += "Do not download Qwen/Qwen-Image first unless the chosen lightweight lane explicitly requires it."
  }
  else {
    $Errors = @($Results | Where-Object { $_.ok -ne $true } | Select-Object repo, error)
    $Recommendation += "No repo metadata resolved. Review errors in receipt."
  }
}
else {
  $Recommendation += "No JSON payload parsed. Review python_output."
}

$SizeSummary = ""

if ($Results) {
  $SizeSummary = $Results |
    Select-Object repo, ok, total_size_gb, file_count, pipeline_tag, library_name, downloads, likes, error |
    Format-Table -AutoSize |
    Out-String -Width 4096
}

$Report = @"
QWEN CREATION MODEL SIZE PROBE - HF API SAFE
Created: $((Get-Date).ToString("o"))

Python: $PythonExe
Python exit code: $ExitCode

HF token key detected: $HfTokenKey
HF token present: $([bool]$HfToken)

Python output path:
$PyOut

Raw JSON:
$JsonOut

==================== PYTHON OUTPUT ====================
$OutputText

==================== SIZE SUMMARY ====================
$SizeSummary

==================== RECOMMENDATION ====================
$($Recommendation -join "`n")
"@

$Report | Set-Content -Path $ReportPath -Encoding UTF8

$Receipt = @{
  verdict = "QWEN_CREATION_MODEL_SIZE_PROBE_HFAPI_SAFE_COMPLETE"
  python = $PythonExe
  python_exit_code = $ExitCode
  hf_token_key_detected = $HfTokenKey
  hf_token_present = [bool]$HfToken
  payload = $Payload
  results = $Results
  recommendation = $Recommendation
  raw_json = $JsonOut
  python_output = $PyOut
  report = $ReportPath
  created_at = (Get-Date).ToString("o")
}

$Receipt | ConvertTo-Json -Depth 100 | Set-Content -Path $ReceiptPath -Encoding UTF8

notepad $ReportPath
notepad $ReceiptPath

Write-Host ""
Write-Host "HF API safe model size probe complete." -ForegroundColor Green
Write-Host "Report: $ReportPath" -ForegroundColor Cyan
Write-Host "Receipt: $ReceiptPath" -ForegroundColor Cyan