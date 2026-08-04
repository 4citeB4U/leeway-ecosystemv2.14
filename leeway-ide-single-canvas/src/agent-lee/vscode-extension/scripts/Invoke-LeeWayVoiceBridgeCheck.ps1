<#
LEEWAY_HEADER - DO NOT REMOVE
REGION: CORE
TAG: CORE.SCRIPTS.VOICE_BRIDGE_CHECK
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
PURPOSE: Verifies LeeWay Voice truth, doctrine, review flow, dedupe, and truthful fallback routing.
#>

[CmdletBinding()]
param()

$extensionRoot = Split-Path -Parent $PSScriptRoot
$repoRoot = Split-Path -Parent $extensionRoot
$timestamp = (Get-Date).ToString("o")
$evidenceDir = Join-Path $extensionRoot "test-evidence"
$outputPath = Join-Path $evidenceDir "leeway-voice-bridge-check-result.json"

New-Item -ItemType Directory -Force -Path $evidenceDir | Out-Null

$files = @{
  doctrine = Join-Path $repoRoot "voice\leeway-voice-brand-doctrine.md"
  law = Join-Path $repoRoot "governance\law\law-0021-voice-bridge-message-separation.md"
  extension = Join-Path $extensionRoot "src\extension.ts"
  truth = Join-Path $extensionRoot "src\core\voice\leewayVoiceTruth.ts"
  runtime = Join-Path $extensionRoot "src\core\runtime-settings.ts"
  bridge = Join-Path $extensionRoot "src\live-voice\liveTranscriptBridge.ts"
}

$checkedFiles = $files.Values
$existing = $checkedFiles | Where-Object { Test-Path $_ }
$extensionText = if (Test-Path $files.extension) { Get-Content $files.extension -Raw } else { "" }
$truthText = if (Test-Path $files.truth) { Get-Content $files.truth -Raw } else { "" }
$runtimeText = if (Test-Path $files.runtime) { Get-Content $files.runtime -Raw } else { "" }
$bridgeText = if (Test-Path $files.bridge) { Get-Content $files.bridge -Raw } else { "" }
$doctrineText = if (Test-Path $files.doctrine) { Get-Content $files.doctrine -Raw } else { "" }
$combinedVoiceText = @($extensionText, $truthText, $bridgeText, $runtimeText) -join "`n"

$brandDoctrinePresent = Test-Path $files.doctrine
$ownerFacingLanguagePass =
  $combinedVoiceText.Contains("LeeWay Voice is ready. You can speak, review what was heard, and choose when to send.") -and
  $combinedVoiceText.Contains("Local transcript bridge is available as a fallback. Voice input will be labeled and governed.") -and
  $combinedVoiceText.Contains("Browser speech is available. This is a fallback input path, not full LeeWay Voice authority.") -and
  $combinedVoiceText.Contains("Voice bridge status loop detected. Status messages are being suppressed and will not enter chat.")
$voiceIdentityPass =
  $truthText.Contains("export type LeeWayVoiceIdentity =") -and
  $truthText.Contains("voiceEventId") -and
  $truthText.Contains("workflow.voice.command-intake") -and
  $truthText.Contains("stream.voice.bridge")
$voiceReviewPanelPass =
  $extensionText.Contains('id="voiceReviewPanel"') -and
  $extensionText.Contains("sendVoiceReview()") -and
  $extensionText.Contains("createVoiceReviewProposal()") -and
  $extensionText.Contains("clarifyVoiceReview()")
$truthfulFallbackLanguagePass =
  $truthText.Contains("LOCAL_TRANSCRIPT_BRIDGE_READY") -and
  $truthText.Contains("BROWSER_SPEECH_AVAILABLE") -and
  $truthText.Contains("STALE_EXTENSION_RUNTIME")
$statusClassificationPass =
  $truthText.Contains('type: "VOICE_STATUS"') -and
  $bridgeText.Contains("containsBlockedStatusPhrase") -and
  $bridgeText.Contains('classifiedAs: "VOICE_STATUS"')
$transcriptClassificationPass =
  $truthText.Contains('type: "VOICE_TRANSCRIPT"') -and
  $bridgeText.Contains('classifiedAs: "VOICE_TRANSCRIPT"')
$dedupePass =
  $truthText.Contains("class LeeWayVoiceDeduplicator") -and
  $truthText.Contains("duplicateWindowMs") -and
  $truthText.Contains("processedTranscriptIds")
$readinessStringBlockedFromChat =
  -not $combinedVoiceText.Contains("Agent Lee local transcript bridge is live. Browser speech recognition can run when available; this endpoint is the local fallback at http://127.0.0.1:7671/transcript.") -and
  $truthText.Contains("KNOWN_STATUS_CHAT_BLOCKLIST")
$loopDetectionPass =
  $truthText.Contains("VOICE_STATUS_LOOP_DETECTED") -and
  $combinedVoiceText.Contains("loopDetected") -and
  $combinedVoiceText.Contains("duplicateSuppressionCount")
$runtimeHealthExposurePass =
  $extensionText.Contains('id="voiceBridgeAuthority"') -and
  $extensionText.Contains('id="voiceBridgeRuntime"') -and
  $extensionText.Contains("renderVoiceBridgeStatus")
$autoSendGoverned =
  $runtimeText.Contains("voiceAutoSendFinalTranscript: false") -and
  $extensionText.Contains("voiceAutoSendFinalTranscript") -and
  $extensionText.Contains('id="voiceAutoSendFinalTranscriptToggle"')
$mutatingVoiceGovernancePass =
  $truthText.Contains("Create proposal") -and
  $extensionText.Contains("Create a governed proposal from this voice request:") -and
  $doctrineText.Contains("mutating actions require proposal and approval")
$trustQuestionCoveragePass =
  $extensionText.Contains('id="voiceBridgeAuthority"') -and
  $extensionText.Contains('id="voiceBridgeSource"') -and
  $extensionText.Contains('id="voiceBridgeLastHeard"') -and
  $extensionText.Contains('id="voiceBridgeLastSent"') -and
  $extensionText.Contains('id="voiceBridgeTypedInput"') -and
  $extensionText.Contains('id="voiceBridgeNextAction"')

$allPass = @(
  $brandDoctrinePresent,
  $ownerFacingLanguagePass,
  $voiceIdentityPass,
  $voiceReviewPanelPass,
  $truthfulFallbackLanguagePass,
  $statusClassificationPass,
  $transcriptClassificationPass,
  $dedupePass,
  $readinessStringBlockedFromChat,
  $loopDetectionPass,
  $runtimeHealthExposurePass,
  $autoSendGoverned,
  $mutatingVoiceGovernancePass,
  $trustQuestionCoveragePass
) -notcontains $false

$result = [ordered]@{
  timestamp = $timestamp
  checkedFiles = $existing
  bridgeEndpoint = "http://127.0.0.1:7671/transcript"
  brandDoctrinePresent = $brandDoctrinePresent
  ownerFacingLanguagePass = $ownerFacingLanguagePass
  voiceIdentityPass = $voiceIdentityPass
  voiceReviewPanelPass = $voiceReviewPanelPass
  truthfulFallbackLanguagePass = $truthfulFallbackLanguagePass
  statusClassificationPass = $statusClassificationPass
  transcriptClassificationPass = $transcriptClassificationPass
  dedupePass = $dedupePass
  readinessStringBlockedFromChat = $readinessStringBlockedFromChat
  loopDetectionPass = $loopDetectionPass
  runtimeHealthExposurePass = $runtimeHealthExposurePass
  autoSendGoverned = $autoSendGoverned
  mutatingVoiceGovernancePass = $mutatingVoiceGovernancePass
  trustQuestionCoveragePass = $trustQuestionCoveragePass
  finalVerdict = if ($allPass) { "PASS" } else { "FAIL" }
  caveats = @(
    "This script verifies source truth and UI/report wiring. It does not prove a live human-audible VS Code session.",
    "Live runtime remains separate from source verification and must still be validated in VS Code."
  )
}

$result | ConvertTo-Json -Depth 8 | Set-Content -Path $outputPath -Encoding UTF8
$result | ConvertTo-Json -Depth 8
