$ErrorActionPreference = "Continue"

$Root = "D:\Leeway-Ecosystem v2.1.4"
$Proof = Join-Path $Root "Archive\proofs\qwen-creation-model-probe"
$EnvPath = Join-Path $Root ".env.local"
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"

New-Item -ItemType Directory -Force -Path $Proof | Out-Null

$ReportPath = Join-Path $Proof "QWEN_CREATION_MODEL_SIZE_PROBE_REST_$Stamp.txt"
$ReceiptPath = Join-Path $Proof "QWEN_CREATION_MODEL_SIZE_PROBE_REST_$Stamp.receipt.json"

Write-Host ""
Write-Host "Agent Lee Qwen Creation Model Size Probe - REST corrected" -ForegroundColor Cyan

# -----------------------------
# Read .env.local safely.
# Do not print token values.
# -----------------------------
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

$Headers = @{}

if ($HfTokenKey) {
  $Headers["Authorization"] = "Bearer $($EnvPairs[$HfTokenKey])"
  Write-Host "Using Hugging Face token key: $HfTokenKey" -ForegroundColor Green
}
else {
  Write-Host "No Hugging Face token found. Public API may still work." -ForegroundColor Yellow
}

# -----------------------------
# Candidate repos found by earlier scan.
# Do not download anything here.
# This only probes metadata and file sizes.
# -----------------------------
$Repos = @(
  "reb82/qwen-image-edit-2511-lightning-fp8",
  "unsloth/Qwen-Image-Edit-2511-GGUF",
  "Phil2Sat/Qwen-Image-Edit-Rapid-AIO-GGUF",
  "lightx2v/Qwen-Image-Lightning",
  "lightx2v/Qwen-Image-Edit-2511-Lightning",
  "Qwen/Qwen-Image",
  "Qwen/Qwen-Image-Edit-2511"
)

$Results = @()

foreach ($Repo in $Repos) {
  Write-Host "Probing $Repo..." -ForegroundColor Cyan

  # Important:
  # Do NOT encode the slash as %2F.
  # Hugging Face model API expects /api/models/owner/repo.
  $Url = "https://huggingface.co/api/models/$Repo?blobs=true"

  try {
    $Info = Invoke-RestMethod `
      -Method Get `
      -Uri $Url `
      -Headers $Headers `
      -TimeoutSec 90

    $Files = @()

    foreach ($S in $Info.siblings) {
      $Name = $S.rfilename
      $Size = 0

      if ($S.size) {
        try {
          $Size = [int64]$S.size
        }
        catch {
          $Size = 0
        }
      }

      $Files += [pscustomobject]@{
        name = $Name
        size = $Size
        size_mb = [math]::Round($Size / 1MB, 2)
        size_gb = [math]::Round($Size / 1GB, 3)
      }
    }

    $Total = ($Files | Measure-Object size -Sum).Sum
    if (-not $Total) { $Total = 0 }

    $Largest = @($Files | Sort-Object size -Descending | Select-Object -First 25)
    $SafeTensors = @($Files | Where-Object { $_.name -match "\.safetensors$" } | Sort-Object size -Descending)
    $GGUF = @($Files | Where-Object { $_.name -match "\.gguf$" } | Sort-Object size -Descending)
    $JSON = @($Files | Where-Object { $_.name -match "\.json$" } | Sort-Object name)

    $Results += [pscustomobject]@{
      repo = $Repo
      ok = $true
      id = $Info.id
      pipeline_tag = $Info.pipeline_tag
      library_name = $Info.library_name
      downloads = $Info.downloads
      likes = $Info.likes
      total_size_bytes = $Total
      total_size_gb = [math]::Round($Total / 1GB, 3)
      file_count = @($Files).Count
      largest_files = $Largest
      safetensors_files = $SafeTensors
      gguf_files = $GGUF
      json_files = $JSON
      error = $null
    }
  }
  catch {
    $StatusCode = $null

    try {
      $StatusCode = [int]$_.Exception.Response.StatusCode
    }
    catch {
      $StatusCode = $null
    }

    $Results += [pscustomobject]@{
      repo = $Repo
      ok = $false
      status_code = $StatusCode
      error = $_.Exception.Message
    }
  }
}

$Sorted = @($Results | Where-Object { $_.ok -eq $true } | Sort-Object total_size_bytes)

$Recommendation = @()

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

  $Lightning = $Sorted | Where-Object { $_.repo -match "Lightning" } | Select-Object -First 1
  if ($Lightning) {
    $Recommendation += "Preferred Lightning candidate: $($Lightning.repo) = $($Lightning.total_size_gb) GB"
  }

  $Recommendation += "Do not download Qwen/Qwen-Image first unless the selected lightweight lane explicitly requires the base model."
}
else {
  $Recommendation += "No repo sizes resolved. Check Hugging Face API access, token, network, or repo availability."
}

$SizeSummary = $Results |
  Select-Object repo, ok, status_code, total_size_gb, file_count, pipeline_tag, library_name, downloads, likes, error |
  Format-Table -AutoSize |
  Out-String -Width 4096

$LargestFilesText = foreach ($R in $Results) {
  "---- $($R.repo) ----"
  if ($R.ok) {
    $R.largest_files |
      Select-Object name, size_gb, size_mb, size |
      Format-Table -AutoSize |
      Out-String -Width 4096
  }
  else {
    "ERROR: $($R.error)"
  }
}

$Report = @"
QWEN CREATION MODEL SIZE PROBE - REST CORRECTED
Created: $((Get-Date).ToString("o"))

HF token key detected: $HfTokenKey
HF token present: $([bool]$HfTokenKey)

==================== SIZE SUMMARY ====================
$SizeSummary

==================== LARGEST FILES PER REPO ====================
$($LargestFilesText -join "`n")

==================== RECOMMENDATION ====================
$($Recommendation -join "`n")
"@

$Report | Set-Content -Path $ReportPath -Encoding UTF8

$Receipt = @{
  verdict = "QWEN_CREATION_MODEL_SIZE_PROBE_REST_CORRECTED_COMPLETE"
  hf_token_key_detected = $HfTokenKey
  hf_token_present = [bool]$HfTokenKey
  results = $Results
  recommendation = $Recommendation
  report = $ReportPath
  created_at = (Get-Date).ToString("o")
}

$Receipt | ConvertTo-Json -Depth 100 | Set-Content -Path $ReceiptPath -Encoding UTF8

notepad $ReportPath
notepad $ReceiptPath

Write-Host ""
Write-Host "REST model size probe corrected complete." -ForegroundColor Green
Write-Host "Report: $ReportPath" -ForegroundColor Cyan
Write-Host "Receipt: $ReceiptPath" -ForegroundColor Cyan
Write-Host ""
Write-Host "Copy back the RECOMMENDATION section from the report or the recommendation array from the receipt." -ForegroundColor Cyan