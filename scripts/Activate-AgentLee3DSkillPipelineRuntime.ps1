$ErrorActionPreference = "Stop"

$Root = "D:\Leeway-Ecosystem v2.1.4"

$RuntimeDir = Join-Path $Root "runtime"
$KnowledgeRoot = Join-Path $Root "Archive\agent-lee-artifacts\agent-lee-3d-knowledge"
$Proof = Join-Path $Root "Archive\proofs\agent-lee-3d-knowledge"

$ManifestPath = Join-Path $RuntimeDir "agent-lee-3d-skill-pipeline.manifest.json"
$ConversationManifestPath = Join-Path $RuntimeDir "agent-lee-conversation-abilities.manifest.json"
$LanguagePolicyPath = Join-Path $RuntimeDir "agent-lee-language-policy.json"

$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"

New-Item -ItemType Directory -Force -Path $RuntimeDir | Out-Null
New-Item -ItemType Directory -Force -Path $KnowledgeRoot | Out-Null
New-Item -ItemType Directory -Force -Path $Proof | Out-Null

if (-not (Test-Path $ManifestPath)) {
  throw "Missing 3D skill pipeline manifest: $ManifestPath"
}

$Manifest = Get-Content $ManifestPath -Raw | ConvertFrom-Json

$RequiredRefs = @(
  $Manifest.doctrine,
  $Manifest.knowledge_base,
  $Manifest.tool_registry,
  $Manifest.prompt_rules,
  $Manifest.validation_schema
)

$MissingRefs = @()

foreach ($Ref in $RequiredRefs) {
  if (-not (Test-Path $Ref)) {
    $MissingRefs += $Ref
  }
}

if ($MissingRefs.Count -gt 0) {
  Write-Host "Missing manifest references:" -ForegroundColor Red
  $MissingRefs | ForEach-Object { Write-Host " - $_" -ForegroundColor Red }
  throw "3D skill pipeline manifest is incomplete."
}

$RuntimeOverlayPath = Join-Path $RuntimeDir "agent-lee-3d-runtime-overlay.json"

$Overlay = @{
  name = "agent_lee_3d_runtime_overlay"
  version = "1.0.0"
  enabled = $true
  manifest = $ManifestPath
  doctrine = $Manifest.doctrine
  knowledge_base = $Manifest.knowledge_base
  tool_registry = $Manifest.tool_registry
  prompt_rules = $Manifest.prompt_rules
  validation_schema = $Manifest.validation_schema
  runtime_rules = @(
    "Read the 3D manifest before image-to-3D tasks.",
    "Reject bad sources before reconstruction.",
    "Do not call TripoSR for final quality.",
    "Prefer Hunyuan3D or TRELLIS for final character assets.",
    "Keep live lanes available.",
    "Serialize heavy image and 3D jobs with a lock.",
    "Return strict JSON for tool plans.",
    "Never call a flat card, shell, red block, or blob a finished 3D character."
  )
  default_pipeline = $Manifest.default_pipeline
  created_at = (Get-Date).ToString("o")
}

$Overlay | ConvertTo-Json -Depth 100 | Set-Content -Path $RuntimeOverlayPath -Encoding UTF8

# Patch conversation abilities manifest, preserving existing content.
if (Test-Path $ConversationManifestPath) {
  Copy-Item -Force $ConversationManifestPath "$ConversationManifestPath.bak-$Stamp"

  try {
    $Conversation = Get-Content $ConversationManifestPath -Raw | ConvertFrom-Json
  } catch {
    $Conversation = [ordered]@{}
  }
} else {
  $Conversation = [ordered]@{}
}

if (-not $Conversation.PSObject.Properties.Name.Contains("agent_lee_3d_skill_pipeline")) {
  $Conversation | Add-Member -NotePropertyName "agent_lee_3d_skill_pipeline" -NotePropertyValue ([ordered]@{
    enabled = $true
    manifest = $ManifestPath
    overlay = $RuntimeOverlayPath
    role = "image_to_3d_planner_and_tool_orchestrator"
    default_pipeline = $Manifest.default_pipeline
    doctrine_summary = "Reject bad sources, prefer Hunyuan3D/TRELLIS for final 3D, serialize heavy jobs, never call blobs/cards/shells finished 3D."
  })
} else {
  $Conversation.agent_lee_3d_skill_pipeline.enabled = $true
  $Conversation.agent_lee_3d_skill_pipeline.manifest = $ManifestPath
  $Conversation.agent_lee_3d_skill_pipeline.overlay = $RuntimeOverlayPath
}

$Conversation | ConvertTo-Json -Depth 100 | Set-Content -Path $ConversationManifestPath -Encoding UTF8

# Patch language policy with a short doctrine pointer.
if (Test-Path $LanguagePolicyPath) {
  Copy-Item -Force $LanguagePolicyPath "$LanguagePolicyPath.bak-$Stamp"

  try {
    $LanguagePolicy = Get-Content $LanguagePolicyPath -Raw | ConvertFrom-Json
  } catch {
    $LanguagePolicy = [ordered]@{}
  }
} else {
  $LanguagePolicy = [ordered]@{}
}

if (-not $LanguagePolicy.PSObject.Properties.Name.Contains("agent_lee_3d_doctrine")) {
  $LanguagePolicy | Add-Member -NotePropertyName "agent_lee_3d_doctrine" -NotePropertyValue ([ordered]@{
    enabled = $true
    manifest = $ManifestPath
    prompt_rules = $Manifest.prompt_rules
    hard_rules = @(
      "Use clean asset-reference language for 3D source generation.",
      "Never rewrite a source-pack prompt into castle, scenery, poster, or action-scene language.",
      "Reject flat card, relief mesh, red block, distorted blob, missing body, missing wings, and missing tail outputs.",
      "Use TripoSR as preview only.",
      "Use Hunyuan3D or TRELLIS for final character asset generation."
    )
  })
} else {
  $LanguagePolicy.agent_lee_3d_doctrine.enabled = $true
  $LanguagePolicy.agent_lee_3d_doctrine.manifest = $ManifestPath
  $LanguagePolicy.agent_lee_3d_doctrine.prompt_rules = $Manifest.prompt_rules
}

$LanguagePolicy | ConvertTo-Json -Depth 100 | Set-Content -Path $LanguagePolicyPath -Encoding UTF8

# Create a strict planner test input Agent Lee can consume.
$PlannerTestPath = Join-Path $RuntimeDir "agent-lee-3d-planner-self-test.request.json"

$PlannerTest = @{
  task = "image_to_3d"
  user_request = "Create a full clean 3D Agent Lee character from an image."
  expected_behavior = @{
    must_read_manifest = $ManifestPath
    must_reject = @(
      "flat card",
      "relief card",
      "red block",
      "distorted blob",
      "four different character turnaround",
      "cropped wing-only panels",
      "cinematic castle source"
    )
    must_prefer_backend = @(
      "hunyuan3d",
      "trellis"
    )
    triposr_policy = "preview_only"
    output_must_be = @(
      "strict_json_plan",
      "tool_sequence",
      "receipt_path"
    )
  }
  created_at = (Get-Date).ToString("o")
}

$PlannerTest | ConvertTo-Json -Depth 100 | Set-Content -Path $PlannerTestPath -Encoding UTF8

$Receipt = @{
  verdict = "AGENT_LEE_3D_SKILL_PIPELINE_RUNTIME_ACTIVATED"
  manifest = $ManifestPath
  overlay = $RuntimeOverlayPath
  conversation_manifest = $ConversationManifestPath
  language_policy = $LanguagePolicyPath
  planner_self_test = $PlannerTestPath
  doctrine = $Manifest.doctrine
  knowledge_base = $Manifest.knowledge_base
  tool_registry = $Manifest.tool_registry
  prompt_rules = $Manifest.prompt_rules
  validation_schema = $Manifest.validation_schema
  note = "This activates the 3D skill pipeline doctrine in runtime policy without stopping live lanes."
  created_at = (Get-Date).ToString("o")
}

$ReceiptPath = Join-Path $Proof "AGENT_LEE_3D_SKILL_PIPELINE_RUNTIME_ACTIVATED_$Stamp.receipt.json"
$Receipt | ConvertTo-Json -Depth 100 | Set-Content -Path $ReceiptPath -Encoding UTF8

Write-Host ""
Write-Host "Agent Lee 3D skill pipeline runtime activated." -ForegroundColor Green
Write-Host "Overlay: $RuntimeOverlayPath" -ForegroundColor Cyan
Write-Host "Conversation manifest: $ConversationManifestPath" -ForegroundColor Cyan
Write-Host "Language policy: $LanguagePolicyPath" -ForegroundColor Cyan
Write-Host "Self-test request: $PlannerTestPath" -ForegroundColor Cyan
Write-Host "Receipt: $ReceiptPath" -ForegroundColor Cyan

notepad $ReceiptPath