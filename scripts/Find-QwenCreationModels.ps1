$ErrorActionPreference = "Continue"

$Root = "D:\Leeway-Ecosystem v2.1.4"
$Proof = Join-Path $Root "Archive\proofs\qwen-creation-model-search"
$Models = Join-Path $Root "models"
$EnvPath = Join-Path $Root ".env.local"
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"

New-Item -ItemType Directory -Force -Path $Proof, $Models | Out-Null

$ReportPath = Join-Path $Proof "QWEN_CREATION_MODEL_SEARCH_$Stamp.txt"
$ReceiptPath = Join-Path $Proof "QWEN_CREATION_MODEL_SEARCH_$Stamp.receipt.json"

# -----------------------------
# Read .env.local safely.
# Never print secret values.
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

$HfToken = ""

if ($HfTokenKey) {
  $HfToken = $EnvPairs[$HfTokenKey]
}

$Headers = @{}

if ($HfToken) {
  $Headers["Authorization"] = "Bearer $HfToken"
}

# -----------------------------
# Candidate model IDs.
# These include exact user-provided guesses plus likely variants.
# -----------------------------
$ImageCandidates = @(
  "Qwen/Qwen-Image",
  "Qwen/Qwen-Image-Edit",
  "Qwen/Qwen-Image-Edit-2511",
  "Qwen/Qwen-Image-Edit-2511-Lightning",
  "Qwen/Qwen-Image-Edit-2511-Lightning-FP8",
  "Qwen/Qwen-Image-Edit-2511-Lightning_FP8",
  "Qwen/Qwen-Image-Lightning",
  "Qwen/Qwen-Image-Lightning-FP8",
  "Qwen/Qwen-Image-FP8",
  "Qwen/Qwen-Image-Edit-FP8"
)

$ThreeDCandidates = @(
  "Qwen/Qwen-3D",
  "Qwen/Qwen3D",
  "Qwen/Qwen-3D-v2.5",
  "Qwen/Qwen-3D-v2.5-3B",
  "Qwen/Qwen-3D-2.5-3B",
  "Qwen/Qwen3D-v2.5-3B",
  "Qwen/Qwen3D-2.5-3B",
  "Qwen/Qwen-3D-3B",
  "Qwen/Qwen3D-3B"
)

# Add explicit .env.local overrides if present.
$EnvModelKeys = @(
  "AGENT_LEE_QWEN_IMAGE_MODEL_ID",
  "AGENT_LEE_QWEN_IMAGE_EDIT_MODEL_ID",
  "AGENT_LEE_IMAGE_MODEL_ID",
  "AGENT_LEE_QWEN_3D_MODEL_ID",
  "AGENT_LEE_3D_MODEL_ID"
)

$EnvModelValues = @()

foreach ($Key in $EnvModelKeys) {
  if ($EnvPairs.ContainsKey($Key) -and $EnvPairs[$Key]) {
    $EnvModelValues += [pscustomobject]@{
      key = $Key
      value = $EnvPairs[$Key]
    }
  }
}

foreach ($Item in $EnvModelValues) {
  if ($Item.key -match "3D") {
    $ThreeDCandidates += $Item.value
  }
  else {
    $ImageCandidates += $Item.value
  }
}

$ImageCandidates = $ImageCandidates | Select-Object -Unique
$ThreeDCandidates = $ThreeDCandidates | Select-Object -Unique

function Test-HuggingFaceModel {
  param([string]$ModelId)

  $Encoded = [uri]::EscapeDataString($ModelId)
  $Url = "https://huggingface.co/api/models/$Encoded"

  try {
    $Resp = Invoke-RestMethod -Method Get -Uri $Url -Headers $Headers -TimeoutSec 45

    return [pscustomobject]@{
      model_id = $ModelId
      available = $true
      source = "huggingface"
      private_or_gated_possible = $false
      id = $Resp.id
      author = $Resp.author
      sha = $Resp.sha
      downloads = $Resp.downloads
      likes = $Resp.likes
      pipeline_tag = $Resp.pipeline_tag
      library_name = $Resp.library_name
      tags = ($Resp.tags -join ", ")
      siblings = (($Resp.siblings | Select-Object -ExpandProperty rfilename -ErrorAction SilentlyContinue) -join ", ")
      error = $null
    }
  }
  catch {
    $Message = $_.Exception.Message
    $StatusCode = $null

    try {
      $StatusCode = [int]$_.Exception.Response.StatusCode
    }
    catch {}

    return [pscustomobject]@{
      model_id = $ModelId
      available = $false
      source = "huggingface"
      status_code = $StatusCode
      private_or_gated_possible = ($StatusCode -eq 401 -or $StatusCode -eq 403)
      error = $Message
    }
  }
}

function Search-HuggingFaceModels {
  param([string]$Search)

  $Url = "https://huggingface.co/api/models?search=$([uri]::EscapeDataString($Search))&limit=25"

  try {
    $Resp = Invoke-RestMethod -Method Get -Uri $Url -Headers $Headers -TimeoutSec 45

    return @($Resp | ForEach-Object {
      [pscustomobject]@{
        id = $_.id
        author = $_.author
        downloads = $_.downloads
        likes = $_.likes
        pipeline_tag = $_.pipeline_tag
        library_name = $_.library_name
        tags = ($_.tags -join ", ")
      }
    })
  }
  catch {
    return @([pscustomobject]@{
      search = $Search
      error = $_.Exception.Message
    })
  }
}

Write-Host "Checking exact Hugging Face candidate IDs..." -ForegroundColor Cyan

$HfImageExact = @()
foreach ($Model in $ImageCandidates) {
  $HfImageExact += Test-HuggingFaceModel -ModelId $Model
}

$Hf3dExact = @()
foreach ($Model in $ThreeDCandidates) {
  $Hf3dExact += Test-HuggingFaceModel -ModelId $Model
}

Write-Host "Searching Hugging Face broadly..." -ForegroundColor Cyan

$HfSearchQueries = @(
  "Qwen-Image",
  "Qwen Image Edit",
  "Qwen-Image-Edit",
  "Qwen Lightning FP8",
  "Qwen Image Lightning",
  "Qwen 3D",
  "Qwen3D",
  "Qwen-3D"
)

$HfSearchResults = @{}

foreach ($Query in $HfSearchQueries) {
  $HfSearchResults[$Query] = Search-HuggingFaceModels -Search $Query
}

Write-Host "Checking local model folders..." -ForegroundColor Cyan

$LocalMatches = @()

$LocalTerms = @(
  "Qwen-Image",
  "Qwen_Image",
  "QwenImage",
  "Image-Edit",
  "Lightning",
  "FP8",
  "Qwen-3D",
  "Qwen3D",
  "3D",
  "3B"
)

if (Test-Path $Models) {
  $LocalMatches = Get-ChildItem -Path $Models -Recurse -Directory -ErrorAction SilentlyContinue |
    Where-Object {
      $Full = $_.FullName
      foreach ($Term in $LocalTerms) {
        if ($Full -match [regex]::Escape($Term)) { return $true }
      }
      return $false
    } |
    Select-Object FullName, Name, LastWriteTime
}

Write-Host "Checking Ollama local tags..." -ForegroundColor Cyan

$OllamaTags = $null
try {
  $OllamaTags = Invoke-RestMethod -Method Get -Uri "http://127.0.0.1:11434/api/tags" -TimeoutSec 30
}
catch {
  $OllamaTags = @{ error = $_.Exception.Message }
}

$OllamaQwenTags = @()
try {
  $OllamaQwenTags = @($OllamaTags.models | Where-Object {
    $_.name -match "qwen|image|3d"
  })
}
catch {}

Write-Host "Searching Ollama public library using web endpoint text..." -ForegroundColor Cyan

$OllamaLibrarySearches = @{}

$OllamaQueries = @(
  "qwen-image",
  "qwen image",
  "qwen3d",
  "qwen-3d",
  "qwen 3d"
)

foreach ($Q in $OllamaQueries) {
  try {
    $Url = "https://ollama.com/search?q=$([uri]::EscapeDataString($Q))"
    $Resp = Invoke-WebRequest -Method Get -Uri $Url -TimeoutSec 45 -UseBasicParsing
    $OllamaLibrarySearches[$Q] = $Resp.Content.Substring(0, [Math]::Min(5000, $Resp.Content.Length))
  }
  catch {
    $OllamaLibrarySearches[$Q] = "error: $($_.Exception.Message)"
  }
}

$AvailableImage = $HfImageExact | Where-Object { $_.available -eq $true } | Select-Object -First 1
$Available3d = $Hf3dExact | Where-Object { $_.available -eq $true } | Select-Object -First 1

$Recommendation = @()

if ($AvailableImage) {
  $Recommendation += "Image model exact candidate found on Hugging Face: $($AvailableImage.model_id)"
}
else {
  $Recommendation += "No exact image candidate confirmed on Hugging Face. Use broad Hugging Face search results to select the real repo ID."
}

if ($Available3d) {
  $Recommendation += "3D model exact candidate found on Hugging Face: $($Available3d.model_id)"
}
else {
  $Recommendation += "No exact 3D candidate confirmed on Hugging Face. Use broad search results or ModelScope/manual source to select the real repo ID."
}

$Report = @"
QWEN CREATION MODEL SEARCH
Created: $((Get-Date).ToString("o"))

HF token key detected: $HfTokenKey
HF token present: $([bool]$HfToken)

==================== ENV MODEL OVERRIDES ====================
$($EnvModelValues | Format-Table -AutoSize | Out-String -Width 4096)

==================== EXACT HF IMAGE CANDIDATES ====================
$($HfImageExact | Format-Table -AutoSize | Out-String -Width 4096)

==================== EXACT HF 3D CANDIDATES ====================
$($Hf3dExact | Format-Table -AutoSize | Out-String -Width 4096)

==================== BROAD HF SEARCH RESULTS ====================
$(
  foreach ($Key in $HfSearchResults.Keys) {
    "---- $Key ----"
    $HfSearchResults[$Key] | Format-Table -AutoSize | Out-String -Width 4096
  }
)

==================== LOCAL MODEL FOLDER MATCHES ====================
$($LocalMatches | Format-Table -AutoSize | Out-String -Width 4096)

==================== OLLAMA LOCAL QWEN / IMAGE / 3D TAGS ====================
$($OllamaQwenTags | Format-Table -AutoSize | Out-String -Width 4096)

==================== OLLAMA LIBRARY SEARCH RAW PREVIEWS ====================
$(
  foreach ($Key in $OllamaLibrarySearches.Keys) {
    "---- $Key ----"
    $OllamaLibrarySearches[$Key]
  }
)

==================== RECOMMENDATION ====================
$($Recommendation -join "`n")
"@

$Report | Set-Content -Path $ReportPath -Encoding UTF8

$Receipt = @{
  verdict = "QWEN_CREATION_MODEL_SEARCH_COMPLETE"
  hf_token_key_detected = $HfTokenKey
  hf_token_present = [bool]$HfToken

  exact_hf_image_candidates = $HfImageExact
  exact_hf_3d_candidates = $Hf3dExact
  broad_hf_search_results = $HfSearchResults

  local_model_matches = $LocalMatches
  ollama_local_tags = $OllamaQwenTags
  ollama_library_searches_present = $OllamaLibrarySearches.Keys

  available_image_candidate = $AvailableImage
  available_3d_candidate = $Available3d

  recommendation = $Recommendation

  report = $ReportPath
  created_at = (Get-Date).ToString("o")
}

$Receipt | ConvertTo-Json -Depth 80 | Set-Content -Path $ReceiptPath -Encoding UTF8

notepad $ReportPath
notepad $ReceiptPath

Write-Host ""
Write-Host "Qwen creation model search complete." -ForegroundColor Green
Write-Host "Report: $ReportPath" -ForegroundColor Cyan
Write-Host "Receipt: $ReceiptPath" -ForegroundColor Cyan