$ErrorActionPreference = "Stop"

$Root = "D:\Leeway-Ecosystem v2.1.4"
$RuntimeDir = Join-Path $Root "runtime"
$ArchiveRoot = Join-Path $Root "Archive"
$LearningRoot = Join-Path $ArchiveRoot "agent-lee-learning"
$LearningProof = Join-Path $ArchiveRoot "proofs\agent-lee-learning"
$SkillName = "agent-lee-learning-memory"

$CodeModeSkills = Join-Path $Root "agent-lee-coding-mode\skills"
$RuntimeFabricSkills = Join-Path $Root "Leeway Runtime Fabric\skills"
$SkillsUniversity = Join-Path $Root "Leeway Runtime Fabric\skills-university"
$SkillsUniversityExports = Join-Path $Root "Leeway Runtime Fabric\skills-university-exports"

$CodeModeSkillDir = Join-Path $CodeModeSkills $SkillName
$RuntimeFabricSkillDir = Join-Path $RuntimeFabricSkills $SkillName
$UniversitySkillDir = Join-Path $SkillsUniversity $SkillName
$ExportSkillDir = Join-Path $SkillsUniversityExports $SkillName

$LearningManifestPath = Join-Path $RuntimeDir "agent-lee-learning-memory.manifest.json"
$LearningLedgerPath = Join-Path $LearningRoot "agent-lee-learning-ledger.jsonl"
$LearningIndexPath = Join-Path $LearningRoot "agent-lee-learning-index.json"
$LearningDoctrinePath = Join-Path $LearningRoot "AGENT_LEE_LEARNING_DOCTRINE.md"
$TelegramFailureDoctrinePath = Join-Path $LearningRoot "AGENT_LEE_TELEGRAM_FAILURES_LEARNED.md"
$TelegramRoutingManifestPath = Join-Path $RuntimeDir "agent-lee-telegram-routing-repair.manifest.json"
$RegistryPath = Join-Path $Root "LEEWAY-SKILLS-REGISTRY.json"
$ConversationManifestPath = Join-Path $RuntimeDir "agent-lee-conversation-abilities.manifest.json"
$LanguagePolicyPath = Join-Path $RuntimeDir "agent-lee-language-policy.json"
$AppendScript = Join-Path $Root "scripts\Append-AgentLeeLearningEvent.ps1"

$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"

$Dirs = @(
  $RuntimeDir,
  $LearningRoot,
  $LearningProof,
  $CodeModeSkills,
  $RuntimeFabricSkills,
  $SkillsUniversity,
  $SkillsUniversityExports,
  $CodeModeSkillDir,
  $RuntimeFabricSkillDir,
  $UniversitySkillDir,
  $ExportSkillDir,
  (Split-Path $AppendScript)
)

foreach ($D in $Dirs) {
  New-Item -ItemType Directory -Force -Path $D | Out-Null
}

$LearningDoctrine = @(
  "# Agent Lee Learning Doctrine",
  "",
  "## Prime Rule",
  "",
  "Agent Lee must learn from every meaningful mistake, success, rejected attempt, runtime proof, receipt, and user correction.",
  "",
  "This is runtime learning, not model-weight training.",
  "",
  "## What Must Become Learning",
  "",
  "- user corrections",
  "- failed generation attempts",
  "- successful patches",
  "- rejected sources",
  "- accepted standards",
  "- runtime failures",
  "- live-lane state",
  "- skill activation proof",
  "- working script paths",
  "- broken script paths",
  "- backend limitations",
  "- final decisions",
  "- Telegram failures",
  "- bridge failures",
  "- tool-routing failures",
  "- voice/listening failures",
  "- web/image/email wiring failures",
  "",
  "## Behavior Standard",
  "",
  "When Agent Lee encounters a similar task later, he must search the learning manifest, read the relevant doctrine, check the learning ledger, avoid known failed paths, prefer known working paths, write new lessons, and never pretend a tool is wired when it is only writing a receipt."
) -join [Environment]::NewLine

$TelegramDoctrine = @(
  "# Agent Lee Telegram Failure Lessons",
  "",
  "## What the Telegram export proves",
  "",
  "The Telegram shell is connected to Telegram, but it is not fully connected to Agent Lee runtime execution.",
  "",
  "Observed failures:",
  "",
  "1. Web search requested. Telegram replied Executing web_search, then did not return a real result.",
  "2. Image generation requested. Telegram created only a JSON job receipt instead of calling the live SDXL image lane.",
  "3. Photo vision requested. Telegram replied that the shell reads text first instead of forwarding the photo to vision.",
  "4. Context memory failed. Telegram invented the wrong prior request instead of reading recent turns.",
  "5. Brain response failed. Telegram returned blank-wall and empty-message responses.",
  "6. Capability reporting was inconsistent. It claimed lanes were ready while also saying web, email, and image were not wired.",
  "",
  "## Correct Telegram Rule",
  "",
  "Telegram must be a real Agent Lee client.",
  "",
  "Telegram input should route to Agent Lee Code Mode conversation, Runtime Fabric tools, image generation lane, Telegram vision lane, web search tool route, email tool route, and learning memory ledger.",
  "",
  "Telegram may write a receipt, but receipt-only is not execution."
) -join [Environment]::NewLine

$LearningDoctrine | Set-Content -Path $LearningDoctrinePath -Encoding UTF8
$TelegramDoctrine | Set-Content -Path $TelegramFailureDoctrinePath -Encoding UTF8

if (-not (Test-Path $LearningLedgerPath)) {
  New-Item -ItemType File -Force -Path $LearningLedgerPath | Out-Null
}

$SeedLessons = @(
  @{
    event_type = "lesson"
    category = "telegram"
    title = "Telegram shell connected but not fully Agent Lee"
    summary = "Telegram connected to the bot but returned canned text, job receipts, and bridge errors instead of routing into Agent Lee runtime and tools."
    decision = "Telegram must route through Agent Lee Code Mode and Runtime Fabric endpoints, not receipt-only behavior."
    severity = "critical"
    evidence = @("messages.html")
    created_at = (Get-Date).ToString("o")
  },
  @{
    event_type = "failure"
    category = "telegram_web_search"
    title = "Telegram web search did not return result"
    summary = "Telegram replied Executing web_search but never returned the weather, time, or search answer."
    decision = "Wire web search to a real Runtime Fabric or Agent Lee tool endpoint and return the final answer to Telegram."
    severity = "critical"
    evidence = @("messages.html")
    created_at = (Get-Date).ToString("o")
  },
  @{
    event_type = "failure"
    category = "telegram_image"
    title = "Telegram image command created receipt only"
    summary = "Telegram detected an image prompt but only saved a JSON receipt instead of calling the SDXL image lane."
    decision = "Wire /image to the live SDXL image lane and send the generated PNG back to Telegram."
    severity = "critical"
    evidence = @("messages.html")
    created_at = (Get-Date).ToString("o")
  },
  @{
    event_type = "failure"
    category = "telegram_vision"
    title = "Telegram photo was not routed to vision lane"
    summary = "User sent photos and Telegram replied that the shell reads text first."
    decision = "Photo messages must download the Telegram file, stage it, call agent-lee-telegram-vision-lane, and return the visual answer."
    severity = "critical"
    evidence = @("messages.html")
    created_at = (Get-Date).ToString("o")
  },
  @{
    event_type = "failure"
    category = "telegram_memory"
    title = "Telegram failed to look back at prior prompt"
    summary = "User asked Telegram to look back at the previous image prompt, but the shell invented the wrong prompt."
    decision = "Telegram must keep recent message memory and retrieve prior user turns before asking for repeated context."
    severity = "high"
    evidence = @("messages.html")
    created_at = (Get-Date).ToString("o")
  },
  @{
    event_type = "failure"
    category = "telegram_brain"
    title = "Brain lane returned blank or dirty response"
    summary = "Telegram said the brain lane did not return a clean response or returned an empty message."
    decision = "Telegram must retry through Agent Lee Code Mode, fallback model, or smaller prompt before replying with failure."
    severity = "high"
    evidence = @("messages.html")
    created_at = (Get-Date).ToString("o")
  },
  @{
    event_type = "lesson"
    category = "image_to_3d"
    title = "TripoSR blob rejected"
    summary = "TripoSR produced a visible GLB/blob but failed the recognizable Agent Lee character standard."
    decision = "Use TripoSR only for fast proof, not final 3D."
    severity = "high"
    evidence = @("agent-lee-3d-skill-pipeline.manifest.json")
    created_at = (Get-Date).ToString("o")
  },
  @{
    event_type = "lesson"
    category = "source_pack"
    title = "Text-only SDXL turnaround failed"
    summary = "Separate SDXL jobs created different characters, and single-sheet SDXL created cropped or wing-only panels."
    decision = "Do not trust text-only SDXL for final same-character turnarounds without visual audit."
    severity = "high"
    evidence = @("turnaround_contact_sheet.png")
    created_at = (Get-Date).ToString("o")
  },
  @{
    event_type = "success"
    category = "runtime_policy"
    title = "3D skill doctrine activated"
    summary = "Agent Lee 3D skill manifest, overlay, prompt rules, validation schema, and knowledge base were installed and runtime-visible."
    decision = "Read runtime/agent-lee-3d-runtime-overlay.json before image or 3D jobs."
    severity = "medium"
    evidence = @("runtime/agent-lee-3d-runtime-overlay.json")
    created_at = (Get-Date).ToString("o")
  },
  @{
    event_type = "standard"
    category = "full_live"
    title = "Full-live policy established"
    summary = "Live lanes should remain available while heavy jobs are serialized."
    decision = "Do not shut down Telegram, vision, runtime, or code mode just to test image or 3D lanes."
    severity = "high"
    evidence = @("agent-lee-full-live receipts")
    created_at = (Get-Date).ToString("o")
  }
)

foreach ($Lesson in $SeedLessons) {
  $Lesson | ConvertTo-Json -Depth 80 -Compress | Add-Content -Path $LearningLedgerPath -Encoding UTF8
}

$LearningIndex = @{
  name = "agent_lee_learning_index"
  version = "1.0.0"
  doctrine = $LearningDoctrinePath
  telegram_failure_doctrine = $TelegramFailureDoctrinePath
  ledger = $LearningLedgerPath
  skill_name = $SkillName
  categories = @(
    "telegram",
    "telegram_web_search",
    "telegram_image",
    "telegram_vision",
    "telegram_memory",
    "telegram_brain",
    "image_to_3d",
    "image_generation",
    "source_pack",
    "full_live",
    "voice_desktop_runtime",
    "runtime_policy",
    "skills",
    "vision",
    "websites",
    "code_mode"
  )
  created_at = (Get-Date).ToString("o")
}

$LearningIndex | ConvertTo-Json -Depth 100 | Set-Content -Path $LearningIndexPath -Encoding UTF8

$SkillMd = @(
  "# Agent Lee Learning Memory Skill",
  "",
  "## Purpose",
  "",
  "This skill gives Agent Lee persistent learning memory for mistakes, successes, corrections, receipts, rejected paths, accepted standards, and Telegram/runtime failures.",
  "",
  "## Trigger Conditions",
  "",
  "Use this skill whenever a task fails, succeeds, receives user correction, creates a receipt, changes lane health, repeats a known mistake, or Telegram returns receipt-only instead of real execution.",
  "",
  "## Required Behavior",
  "",
  "Agent Lee must read the learning manifest, search prior lessons, avoid rejected paths, prefer proven paths, append a JSONL learning event after meaningful work, write a receipt, and never report a tool as working unless the endpoint is live and executable.",
  "",
  "## Learning Ledger",
  "",
  $LearningLedgerPath,
  "",
  "## Doctrine",
  "",
  $LearningDoctrinePath,
  "",
  "## Telegram Failure Doctrine",
  "",
  $TelegramFailureDoctrinePath
) -join [Environment]::NewLine

$SkillJson = @{
  name = $SkillName
  version = "1.0.0"
  description = "Persistent learning memory for Agent Lee runtime mistakes, successes, corrections, Telegram failures, and standards."
  doctrine = $LearningDoctrinePath
  telegram_failure_doctrine = $TelegramFailureDoctrinePath
  ledger = $LearningLedgerPath
  index = $LearningIndexPath
  triggers = @(
    "failure",
    "success",
    "user_correction",
    "source_rejected",
    "script_patched",
    "lane_health_change",
    "receipt_created",
    "standard_accepted",
    "telegram_receipt_only",
    "telegram_tool_failure"
  )
  tools = @(
    "append_learning_event",
    "search_learning_events",
    "summarize_lessons",
    "write_learning_receipt"
  )
  created_at = (Get-Date).ToString("o")
}

$SkillDirs = @($CodeModeSkillDir, $RuntimeFabricSkillDir, $UniversitySkillDir, $ExportSkillDir)

foreach ($Dir in $SkillDirs) {
  $SkillMd | Set-Content -Path (Join-Path $Dir "SKILL.md") -Encoding UTF8
  $SkillMd | Set-Content -Path (Join-Path $Dir "skill.md") -Encoding UTF8
  $SkillJson | ConvertTo-Json -Depth 100 | Set-Content -Path (Join-Path $Dir "skill.json") -Encoding UTF8
}

$LearningManifest = @{
  name = "agent_lee_learning_memory_manifest"
  version = "1.0.0"
  enabled = $true
  skill_name = $SkillName
  doctrine = $LearningDoctrinePath
  telegram_failure_doctrine = $TelegramFailureDoctrinePath
  ledger = $LearningLedgerPath
  index = $LearningIndexPath
  skill_paths = @{
    code_mode = $CodeModeSkillDir
    runtime_fabric = $RuntimeFabricSkillDir
    skills_university = $UniversitySkillDir
    skills_university_exports = $ExportSkillDir
  }
  policy = @{
    before_task = "Search learning ledger for relevant past failures and successes."
    after_task = "Append learning event when a meaningful mistake, success, correction, or standard occurs."
    telegram_rule = "Telegram must route requests to Agent Lee runtime/tool endpoints. Receipt-only is not execution."
    never_repeat = @(
      "known failed 3D source paths",
      "TripoSR final-quality claims",
      "separate SDXL views without same-character audit",
      "Telegram image receipt-only behavior",
      "Telegram web_search executing without returning result",
      "Telegram photo text-first response",
      "desktop voice loop while listening is zero"
    )
  }
  created_at = (Get-Date).ToString("o")
}

$LearningManifest | ConvertTo-Json -Depth 100 | Set-Content -Path $LearningManifestPath -Encoding UTF8

$AppendLines = @(
  'param(',
  '  [Parameter(Mandatory=$true)][string]$Category,',
  '  [Parameter(Mandatory=$true)][string]$Title,',
  '  [Parameter(Mandatory=$true)][string]$Summary,',
  '  [Parameter(Mandatory=$true)][string]$Decision,',
  '  [string]$EventType = "lesson",',
  '  [string]$Severity = "medium",',
  '  [string[]]$Evidence = @()',
  ')',
  '',
  '$ErrorActionPreference = "Stop"',
  '$Root = "D:\Leeway-Ecosystem v2.1.4"',
  '$Ledger = Join-Path $Root "Archive\agent-lee-learning\agent-lee-learning-ledger.jsonl"',
  '$Proof = Join-Path $Root "Archive\proofs\agent-lee-learning"',
  'New-Item -ItemType Directory -Force -Path (Split-Path $Ledger) | Out-Null',
  'New-Item -ItemType Directory -Force -Path $Proof | Out-Null',
  '$Event = @{',
  '  event_type = $EventType',
  '  category = $Category',
  '  title = $Title',
  '  summary = $Summary',
  '  decision = $Decision',
  '  severity = $Severity',
  '  evidence = $Evidence',
  '  created_at = (Get-Date).ToString("o")',
  '}',
  '$Event | ConvertTo-Json -Depth 80 -Compress | Add-Content -Path $Ledger -Encoding UTF8',
  '$ReceiptPath = Join-Path $Proof ("AGENT_LEE_LEARNING_EVENT_" + (Get-Date -Format "yyyyMMdd-HHmmss") + ".receipt.json")',
  '$Event | ConvertTo-Json -Depth 80 | Set-Content -Path $ReceiptPath -Encoding UTF8',
  'Write-Host "Learning event appended." -ForegroundColor Green',
  'Write-Host "Ledger: $Ledger" -ForegroundColor Cyan',
  'Write-Host "Receipt: $ReceiptPath" -ForegroundColor Cyan'
)

$AppendLines -join [Environment]::NewLine | Set-Content -Path $AppendScript -Encoding UTF8

if (Test-Path $ConversationManifestPath) {
  Copy-Item -Force $ConversationManifestPath "$ConversationManifestPath.bak-learning-$Stamp"
  try {
    $Conversation = Get-Content $ConversationManifestPath -Raw | ConvertFrom-Json
  } catch {
    $Conversation = [ordered]@{}
  }
} else {
  $Conversation = [ordered]@{}
}

if (-not $Conversation.PSObject.Properties.Name.Contains("agent_lee_learning_memory")) {
  $Conversation | Add-Member -NotePropertyName "agent_lee_learning_memory" -NotePropertyValue ([ordered]@{
    enabled = $true
    manifest = $LearningManifestPath
    skill_name = $SkillName
    role = "persistent_runtime_learning_for_mistakes_successes_user_corrections_and_telegram_failures"
    ledger = $LearningLedgerPath
    doctrine = $LearningDoctrinePath
    telegram_failure_doctrine = $TelegramFailureDoctrinePath
  })
} else {
  $Conversation.agent_lee_learning_memory.enabled = $true
  $Conversation.agent_lee_learning_memory.manifest = $LearningManifestPath
  $Conversation.agent_lee_learning_memory.ledger = $LearningLedgerPath
}

$Conversation | ConvertTo-Json -Depth 100 | Set-Content -Path $ConversationManifestPath -Encoding UTF8

if (Test-Path $LanguagePolicyPath) {
  Copy-Item -Force $LanguagePolicyPath "$LanguagePolicyPath.bak-learning-$Stamp"
  try {
    $LanguagePolicy = Get-Content $LanguagePolicyPath -Raw | ConvertFrom-Json
  } catch {
    $LanguagePolicy = [ordered]@{}
  }
} else {
  $LanguagePolicy = [ordered]@{}
}

if (-not $LanguagePolicy.PSObject.Properties.Name.Contains("agent_lee_learning_policy")) {
  $LanguagePolicy | Add-Member -NotePropertyName "agent_lee_learning_policy" -NotePropertyValue ([ordered]@{
    enabled = $true
    manifest = $LearningManifestPath
    hard_rules = @(
      "Record meaningful mistakes and successes as learning events.",
      "Search the learning ledger before repeating a pipeline.",
      "Do not repeat known failed 3D paths.",
      "Do not repeat known Telegram receipt-only failures.",
      "Use user corrections as high-priority learning.",
      "Write receipts for learning events.",
      "Do not say Telegram can execute a tool unless the real endpoint is wired and reachable."
    )
  })
} else {
  $LanguagePolicy.agent_lee_learning_policy.enabled = $true
  $LanguagePolicy.agent_lee_learning_policy.manifest = $LearningManifestPath
}

$LanguagePolicy | ConvertTo-Json -Depth 100 | Set-Content -Path $LanguagePolicyPath -Encoding UTF8

$Registry = @{
  name = "LEEWAY_SKILLS_REGISTRY"
  version = "1.0.0"
  updated_at = (Get-Date).ToString("o")
  skills = @()
}

if (Test-Path $RegistryPath) {
  try {
    $Registry = Get-Content $RegistryPath -Raw | ConvertFrom-Json
  } catch {}
}

$ExistingSkills = @()
if ($Registry.skills) {
  $ExistingSkills = @($Registry.skills | Where-Object { $_.name -ne $SkillName })
}

$NewSkillRegistryEntry = @{
  name = $SkillName
  version = "1.0.0"
  description = "Persistent learning memory for Agent Lee runtime mistakes, successes, corrections, Telegram failures, and standards."
  paths = @{
    code_mode = $CodeModeSkillDir
    runtime_fabric = $RuntimeFabricSkillDir
    skills_university = $UniversitySkillDir
    skills_university_exports = $ExportSkillDir
  }
  manifest = $LearningManifestPath
  ledger = $LearningLedgerPath
  enabled = $true
}

$Registry = @{
  name = "LEEWAY_SKILLS_REGISTRY"
  version = "1.0.0"
  updated_at = (Get-Date).ToString("o")
  skills = @($ExistingSkills + $NewSkillRegistryEntry)
}

$Registry | ConvertTo-Json -Depth 100 | Set-Content -Path $RegistryPath -Encoding UTF8

$TelegramRoutingManifest = @{
  name = "agent_lee_telegram_routing_repair_manifest"
  version = "1.0.0"
  purpose = "Define the required repair so Telegram becomes a real Agent Lee client instead of a receipt-only shell."
  required_routes = @{
    conversation = "http://127.0.0.1:8080/agent-lee/conversation/turn"
    tools_call = "http://127.0.0.1:8080/agent-lee/tools/call"
    skills_route = "http://127.0.0.1:8080/agent-lee/skills/route"
    runtime_health = "http://127.0.0.1:4001/health"
    image_lane = "http://127.0.0.1:8099/image/generate-fast"
    telegram_vision_lane = "http://127.0.0.1:8104/telegram/poll-once"
    telegram_vision_status = "http://127.0.0.1:8104/status"
  }
  commands_that_must_execute = @{
    "/image" = "call SDXL image lane and return PNG, not receipt-only"
    "/status" = "live endpoint status, not canned text"
    "/time" = "runtime/local time with timezone"
    "photo_message" = "download Telegram photo, route to vision lane, reply with visual analysis"
    "web_search" = "route to runtime/tool endpoint and return answer"
    "email" = "route to email tool or clearly say not configured without pretending"
    "normal_text" = "route to Agent Lee Code Mode conversation turn"
  }
  reject_behavior = @(
    "Executing web_search without returning result",
    "image job receipt only",
    "I caught something but this shell reads text first",
    "brain lane returned empty message without retry",
    "asking for context when prior Telegram message contains the prompt"
  )
  learning_manifest = $LearningManifestPath
  created_at = (Get-Date).ToString("o")
}

$TelegramRoutingManifest | ConvertTo-Json -Depth 100 | Set-Content -Path $TelegramRoutingManifestPath -Encoding UTF8

$Receipt = @{
  verdict = "AGENT_LEE_LEARNING_SKILL_PACK_INSTALLED_CLEAN_FIXED"
  skill_name = $SkillName
  learning_manifest = $LearningManifestPath
  learning_doctrine = $LearningDoctrinePath
  telegram_failure_doctrine = $TelegramFailureDoctrinePath
  learning_ledger = $LearningLedgerPath
  learning_index = $LearningIndexPath
  append_script = $AppendScript
  registry = $RegistryPath
  telegram_routing_repair_manifest = $TelegramRoutingManifestPath
  skill_paths = @{
    code_mode = $CodeModeSkillDir
    runtime_fabric = $RuntimeFabricSkillDir
    skills_university = $UniversitySkillDir
    skills_university_exports = $ExportSkillDir
  }
  conversation_manifest = $ConversationManifestPath
  language_policy = $LanguagePolicyPath
  seeded_lessons = $SeedLessons.Count
  note = "Clean script installed with no nested here-string collision. Adds learning memory plus Telegram failure doctrine."
  created_at = (Get-Date).ToString("o")
}

$ReceiptPath = Join-Path $LearningProof "AGENT_LEE_LEARNING_SKILL_PACK_INSTALLED_CLEAN_FIXED_$Stamp.receipt.json"
$Receipt | ConvertTo-Json -Depth 100 | Set-Content -Path $ReceiptPath -Encoding UTF8

Write-Host ""
Write-Host "Agent Lee learning skill pack installed cleanly." -ForegroundColor Green
Write-Host "Learning manifest: $LearningManifestPath" -ForegroundColor Cyan
Write-Host "Learning ledger: $LearningLedgerPath" -ForegroundColor Cyan
Write-Host "Telegram repair manifest: $TelegramRoutingManifestPath" -ForegroundColor Cyan
Write-Host "Append script: $AppendScript" -ForegroundColor Cyan
Write-Host "Receipt: $ReceiptPath" -ForegroundColor Cyan

notepad $ReceiptPath
explorer $LearningRoot
