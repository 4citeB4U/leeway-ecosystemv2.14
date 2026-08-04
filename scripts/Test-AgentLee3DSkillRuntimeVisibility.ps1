$ErrorActionPreference = "Stop"

$Root = "D:\Leeway-Ecosystem v2.1.4"

$RuntimeDir = Join-Path $Root "runtime"
$Proof = Join-Path $Root "Archive\proofs\agent-lee-3d-knowledge"

$ManifestPath = Join-Path $RuntimeDir "agent-lee-3d-skill-pipeline.manifest.json"
$OverlayPath = Join-Path $RuntimeDir "agent-lee-3d-runtime-overlay.json"
$SelfTestPath = Join-Path $RuntimeDir "agent-lee-3d-planner-self-test.request.json"
$ConversationManifestPath = Join-Path $RuntimeDir "agent-lee-conversation-abilities.manifest.json"
$LanguagePolicyPath = Join-Path $RuntimeDir "agent-lee-language-policy.json"

$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"

New-Item -ItemType Directory -Force -Path $Proof | Out-Null

$Required = @(
  $ManifestPath,
  $OverlayPath,
  $SelfTestPath,
  $ConversationManifestPath,
  $LanguagePolicyPath
)

$Missing = @()

foreach ($Path in $Required) {
  if (-not (Test-Path $Path)) {
    $Missing += $Path
  }
}

if ($Missing.Count -gt 0) {
  Write-Host "Missing runtime files:" -ForegroundColor Red
  $Missing | ForEach-Object { Write-Host " - $_" -ForegroundColor Red }
  throw "Runtime visibility proof failed because required files are missing."
}

$Manifest = Get-Content $ManifestPath -Raw | ConvertFrom-Json
$Overlay = Get-Content $OverlayPath -Raw | ConvertFrom-Json
$SelfTest = Get-Content $SelfTestPath -Raw | ConvertFrom-Json
$ConversationManifest = Get-Content $ConversationManifestPath -Raw | ConvertFrom-Json
$LanguagePolicy = Get-Content $LanguagePolicyPath -Raw | ConvertFrom-Json

$AgentHealth = $null
$AgentRoutes = $null
$RuntimeFabricHealth = $null

try {
  $AgentHealth = Invoke-RestMethod -Method Get -Uri "http://127.0.0.1:8080/health" -TimeoutSec 30
} catch {
  $AgentHealth = @{
    ok = $false
    error = $_.Exception.Message
  }
}

try {
  $AgentRoutes = Invoke-RestMethod -Method Get -Uri "http://127.0.0.1:8080/routes" -TimeoutSec 30
} catch {
  $AgentRoutes = @{
    ok = $false
    error = $_.Exception.Message
  }
}

try {
  $RuntimeFabricHealth = Invoke-RestMethod -Method Get -Uri "http://127.0.0.1:4001/health" -TimeoutSec 30
} catch {
  $RuntimeFabricHealth = @{
    ok = $false
    error = $_.Exception.Message
  }
}

$Checks = @{
  manifest_exists = (Test-Path $ManifestPath)
  overlay_exists = (Test-Path $OverlayPath)
  self_test_exists = (Test-Path $SelfTestPath)
  conversation_manifest_has_3d_pipeline = ($ConversationManifest.PSObject.Properties.Name -contains "agent_lee_3d_skill_pipeline")
  language_policy_has_3d_doctrine = ($LanguagePolicy.PSObject.Properties.Name -contains "agent_lee_3d_doctrine")
  overlay_enabled = $Overlay.enabled
  manifest_name = $Manifest.name
  planner_self_test_task = $SelfTest.task
}

$Receipt = @{
  verdict = if (
    $Checks.manifest_exists -and
    $Checks.overlay_exists -and
    $Checks.self_test_exists -and
    $Checks.conversation_manifest_has_3d_pipeline -and
    $Checks.language_policy_has_3d_doctrine -and
    $Checks.overlay_enabled
  ) {
    "AGENT_LEE_3D_SKILL_RUNTIME_VISIBLE"
  } else {
    "AGENT_LEE_3D_SKILL_RUNTIME_VISIBILITY_INCOMPLETE"
  }
  checks = $Checks
  manifest = $ManifestPath
  overlay = $OverlayPath
  self_test = $SelfTestPath
  conversation_manifest = $ConversationManifestPath
  language_policy = $LanguagePolicyPath
  agent_health = $AgentHealth
  agent_routes = $AgentRoutes
  runtime_fabric_health = $RuntimeFabricHealth
  next_step = "Patch Agent Lee route/tool planner to actively load the overlay before image or 3D jobs."
  created_at = (Get-Date).ToString("o")
}

$ReceiptPath = Join-Path $Proof "AGENT_LEE_3D_SKILL_RUNTIME_VISIBLE_$Stamp.receipt.json"
$Receipt | ConvertTo-Json -Depth 100 | Set-Content -Path $ReceiptPath -Encoding UTF8

Write-Host ""
Write-Host "Agent Lee 3D skill runtime visibility proof complete." -ForegroundColor Green
Write-Host "Verdict: $($Receipt.verdict)" -ForegroundColor Cyan
Write-Host "Receipt: $ReceiptPath" -ForegroundColor Cyan

notepad $ReceiptPath