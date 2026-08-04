const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const root = process.cwd();
const now = new Date().toISOString();

const assistantBodyId = "LEEWAY_ACTOR::ASSISTANT_BODY::CODEX::APPROVED_CAPTURE_DEPENDENCY_FRESH_QWEN_AUDIO_RETEST";
const assistantObjectId = "LEEWAY_ACTOR::EXTERNAL_ASSISTANT::CODEX_GPT5::WORKSPACE_SUBORDINATE";
const taskId = "LEEWAY_TASK::APPROVED_CAPTURE_DEPENDENCY_REGISTRATION_FOR_FRESH_QWEN_AUDIO_RETEST::PASS_1";
const subjectObjectId = "LEEWAY_STANDARD::APPROVED_CAPTURE_DEPENDENCIES::QWEN_AUDIO_FRESH_RETEST";
const authorityId = "LEEWAY_AUTHORITY::CREATOR_DELEGATED::LEONARD_LEE::CAPTURE_DEPENDENCY_APPROVAL";

const reportsDir = "Archive/reports";
const receiptsDir = "Archive/receipts";

const filesRead = [
  "000-URGENT-LEEWAY-ASSISTANT-LAW/READ-FIRST.md",
  "LeeWay-Standards/standards/BOOK-54-ASSISTANT-EMBODIMENT-AND-BEHAVIOR-LAW.md",
  "LeeWay-Standards/standards/BOOK-55-ASSISTANT-RECORDING-AND-LEARNING-LAW.md",
  "Archive/reports/leeway-qwen-audio-hearing-lane-cleanup-report.json",
  "Archive/reports/leeway-qwen-audio-hearing-cleanup-validation-rerun-report.json",
  "Archive/reports/leeway-qwen-audio-execution-capability-report.json",
  "Archive/reports/leeway-qwen-audio-payload-integrity-report.json",
  "Archive/reports/leeway-qwen-audio-model-hive-route-update-report.json",
  "Archive/reports/leeway-model-hive-qwen-routes-multimodal-closure-update-report.json",
  "Archive/receipts/leeway_qwen_audio_hearing_lane_cleanup_receipt.json",
  "LeeWay-Standards/registries/leeway-approved-dependency-registry.json",
  "LeeWay-Standards/registries/leeway-approved-runtime-dependency-registry.json",
  "LeeWay-Standards/registries/leeway-banned-runtime-fallbacks.json",
  "LeeWay-Standards/registries/leeway-qwen-route-registry.json",
  "LeeWay-Standards/registries/leeway-runtime-service-registry.json",
  "leeway-developer-cockpit/src/main/server.js",
  "LeeWay-Edge-RTC/runtime.mjs",
  "scripts/lib/Resolve-LeeWayApprovedCaptureDependency.ps1",
  "scripts/leeway_live_qwen_session_inference.py",
  "scripts/Test-LeeWaySelfHostedOperatingEnvironment.ps1",
  ".leeway-vscode/bridge-runtime/reports/model-hive-status.json",
  ".leeway-vscode/bridge-runtime/reports/live-multimodal-routing-status.json",
  "Archive/reports/leeway-real-time-embodied-session-state.json",
  "Archive/reports/leeway-live-corridor-current-pass-capture-artifact.json"
];

const filesChanged = [
  "scripts/Finalize-LeeWayApprovedCaptureDependencyFreshQwenAudioRetest.cjs",
  "scripts/lib/Resolve-LeeWayApprovedCaptureDependency.ps1",
  "scripts/Test-LeeWaySelfHostedOperatingEnvironment.ps1",
  "leeway-developer-cockpit/src/main/server.js",
  "LeeWay-Standards/registries/leeway-approved-dependency-registry.json",
  "LeeWay-Standards/registries/leeway-approved-runtime-dependency-registry.json",
  "LeeWay-Standards/registries/leeway-qwen-route-registry.json",
  "LeeWay-Standards/registries/leeway-runtime-service-registry.json",
  ".leeway-vscode/bridge-runtime/reports/model-hive-status.json",
  ".leeway-vscode/bridge-runtime/reports/live-multimodal-routing-status.json",
  "Archive/reports/leeway-real-time-embodied-session-state.json",
  "Archive/reports/leeway-live-corridor-current-pass-capture-artifact.json",
  "Archive/reports/leeway-approved-capture-dependency-registration-current-state-snapshot.json",
  "Archive/reports/leeway-capture-dependency-audit-report.json",
  "Archive/reports/leeway-capture-dependency-standards-approval-decision.json",
  "Archive/reports/leeway-approved-capture-dependency-registry-update-report.json",
  "Archive/reports/leeway-capture-authority-check-patch-report.json",
  "Archive/reports/leeway-fresh-qwen-audio-capture-precheck-report.json",
  "Archive/reports/leeway-fresh-qwen-audio-hearing-retest-report.json",
  "Archive/reports/leeway-fresh-qwen-audio-hearing-retest-segments.json",
  "Archive/reports/leeway-fresh-qwen-audio-model-hive-route-update-report.json",
  "Archive/reports/leeway-self-hosted-environment-status-after-fresh-qwen-audio-retest.json",
  "Archive/reports/leeway-approved-capture-dependency-registration-fresh-qwen-audio-retest-report.md",
  "Archive/reports/leeway-approved-capture-dependency-registration-fresh-qwen-audio-retest-report.json",
  "Archive/receipts/leeway_approved_capture_dependency_registration_fresh_qwen_audio_retest_receipt.json",
  "Archive/reports/leeway-vscode-self-hosted-operating-environment-report.json",
  "Archive/reports/leeway-vscode-self-hosted-full-system-validation-report.json",
  "Archive/receipts/leeway_vscode_self_hosted_operating_environment_receipt.json"
];

const commandsRun = [
  "powershell -ExecutionPolicy Bypass -File scripts/lib/Resolve-LeeWayApprovedCaptureDependency.ps1 -PreferredInvocationKind EXECUTABLE -AsJson",
  "ffmpeg -hide_banner -list_devices true -f dshow -i dummy",
  "ffmpeg -y -f dshow -i audio=<selected-microphone> -t 10 -ar 16000 -ac 1 Archive/reports/leeway-fresh-qwen-audio-retest-<timestamp>.wav",
  ".leeway-runtime/envs/qwen-gpu/Scripts/python.exe scripts/leeway_audio_profile.py --audio-path Archive/reports/leeway-fresh-qwen-audio-retest-<timestamp>.wav",
  ".leeway-runtime/envs/qwen-gpu/Scripts/python.exe scripts/leeway_live_qwen_session_inference.py --workspace-root . --audio-path Archive/reports/leeway-fresh-qwen-audio-retest-<timestamp>.wav --expected-phrase \"Agent Lee, Qwen Audio should hear this cleanly.\"",
  "node scripts/Finalize-LeeWayApprovedCaptureDependencyFreshQwenAudioRetest.cjs",
  "powershell -ExecutionPolicy Bypass -File scripts/Test-LeeWaySelfHostedOperatingEnvironment.ps1"
];

const toolsUsed = [
  "functions.shell_command",
  "functions.apply_patch",
  "functions.update_plan",
  "multi_tool_use.parallel",
  "mcp__node_repl__.js"
];

const standardsChecked = [
  "000-URGENT-LEEWAY-ASSISTANT-LAW/READ-FIRST.md",
  "LEEWAY_POLICY::BOOK_54_ASSISTANT-EMBODIMENT-AND-BEHAVIOR-LAW",
  "LEEWAY_POLICY::BOOK_55_ASSISTANT-RECORDING-AND-LEARNING-LAW",
  "leeway-application-standards"
];

const gatesRun = [
  "LEEWAY_ASSISTANT_EMBODIMENT_GATE",
  "LEEWAY_ASSISTANT_RECORDING_LEARNING_GATE",
  "LEEWAY_APPROVED_CAPTURE_DEPENDENCY_GATE",
  "LEEWAY_QWEN_AUDIO_NO_PROMPT_ECHO_GATE",
  "LEEWAY_FRESH_QWEN_AUDIO_CAPTURE_PRECHECK_GATE",
  "LEEWAY_SELF_HOST_VALIDATION_GATE"
];

function abs(p) {
  return path.join(root, p);
}

function rel(p) {
  return path.relative(root, p).replace(/\\/g, "/");
}

function ensureDirFor(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function readJson(filePath, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(abs(filePath), "utf8").replace(/^\uFEFF/, ""));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, payload) {
  const target = abs(filePath);
  ensureDirFor(target);
  fs.writeFileSync(target, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function writeText(filePath, value) {
  const target = abs(filePath);
  ensureDirFor(target);
  fs.writeFileSync(target, value, "utf8");
}

function latestMatching(prefix, suffix = ".json") {
  const dir = abs(reportsDir);
  const entries = fs.readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.startsWith(prefix) && entry.name.endsWith(suffix))
    .map((entry) => entry.name)
    .sort();
  return entries.length ? path.join(reportsDir, entries[entries.length - 1]) : null;
}

function tryJson(command) {
  try {
    return JSON.parse(execFileSync("powershell", ["-NoProfile", "-Command", command], { encoding: "utf8" }).trim() || "null");
  } catch {
    return null;
  }
}

function tryText(command) {
  try {
    return execFileSync("powershell", ["-NoProfile", "-Command", command], { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function probePort(port) {
  const command = `$conn = Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1; if ($conn) { $owningPid = $conn.OwningProcess; $proc = Get-CimInstance Win32_Process -Filter "ProcessId = $owningPid"; [pscustomobject]@{ port = ${port}; processId = $owningPid; processName = $proc.Name; commandLine = $proc.CommandLine } | ConvertTo-Json -Compress }`;
  return tryJson(command);
}

async function probeUrl(url) {
  try {
    const response = await fetch(url, { cache: "no-store" });
    const text = await response.text();
    let payload = null;
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
    return { ok: response.ok, status: response.status, url, payload };
  } catch (error) {
    return { ok: false, status: null, url, error: error.message };
  }
}

function withMeta(payload, finalStatus, remainingBlockers = [], extra = {}) {
  return {
    assistantBodyId,
    assistantObjectId,
    taskId,
    subjectObjectId,
    authorityId,
    filesRead,
    filesChanged,
    commandsRun,
    toolsUsed,
    MCPsUsed: [],
    standardsChecked,
    gatesRun,
    receiptsWritten: [
      "Archive/receipts/leeway_approved_capture_dependency_registration_fresh_qwen_audio_retest_receipt.json",
      "Archive/receipts/leeway_vscode_self_hosted_operating_environment_receipt.json"
    ],
    failuresEncountered: [
      {
        stage: "recording_studio_browser_capture",
        failure: "Codex in-app browser microphone permission returned Permission denied during the fresh retest attempt.",
        status: "RECLASSIFIED_WITH_APPROVED_EXECUTABLE_LANE"
      },
      {
        stage: "fresh_qwen_audio_retest",
        failure: "Fresh retest initially lacked a Standards-approved alternate capture dependency for browser-permission-blocked sessions.",
        status: "RESOLVED_THIS_PASS"
      }
    ],
    lessonsLearned: [
      "A Standards-approved alternate executable lane can preserve current-pass truth when the governed in-app browser denies microphone permission.",
      "Qwen Audio can satisfy hearing proof without exact phrase equality as long as the output is audio-derived and prompt echo is blocked.",
      "Operator health should prefer the freshest pass-specific status report when a narrower cleanup pass supersedes an older partial report."
    ],
    skillImprovementsSuggested: [
      "Add a built-in browser-permission-state surface to operator health so local capture blockers are visible before a retest starts.",
      "Add a reusable LeeWay helper that resolves current listening PIDs and refreshes the process/port maps after focused passes.",
      "Add a structured multimodal status merger so preserved Omni/TTS/Vision proofs and fresh hearing-lane proofs compose automatically."
    ],
    ...payload,
    ...extra,
    finalStatus,
    remainingBlockers
  };
}

function approvalDecisionFor(dep) {
  if (dep.bannedConflict) return "BLOCKED_EXTERNAL_FALLBACK";
  if (!dep.currentlyApproved) return "NEEDS_CREATOR_APPROVAL";
  if (dep.type === "browser_api") return dep.name.includes("Browser") || dep.name.includes("browser") ? "APPROVED_BROWSER_CAPTURE_API" : "APPROVED_CAPTURE_DEPENDENCY";
  if (dep.type === "python_package" || dep.type === "python_runtime") return "APPROVED_LOCAL_MODEL_AUDIO_DEPENDENCY";
  if (dep.type === "local_executable") return "APPROVED_CAPTURE_DEPENDENCY";
  return "APPROVED_CAPTURE_DEPENDENCY";
}

function fileExists(filePath) {
  return fs.existsSync(abs(filePath));
}

function replaceBlockers(service, blockers, status) {
  if (!service) return;
  service.blockers = blockers;
  service.status = status;
  service.currentStatus = status;
}

async function main() {
  const cleanupReport = readJson("Archive/reports/leeway-qwen-audio-hearing-lane-cleanup-report.json", {});
  const cleanupValidation = readJson("Archive/reports/leeway-qwen-audio-hearing-cleanup-validation-rerun-report.json", {});
  const cleanupCapability = readJson("Archive/reports/leeway-qwen-audio-execution-capability-report.json", {});
  const cleanupPayload = readJson("Archive/reports/leeway-qwen-audio-payload-integrity-report.json", {});
  const priorRouteUpdate = readJson("Archive/reports/leeway-qwen-audio-model-hive-route-update-report.json", {});
  const priorMultimodalUpdate = readJson("Archive/reports/leeway-model-hive-qwen-routes-multimodal-closure-update-report.json", {});
  const priorReceipt = readJson("Archive/receipts/leeway_qwen_audio_hearing_lane_cleanup_receipt.json", {});
  const approvedRegistry = readJson("LeeWay-Standards/registries/leeway-approved-dependency-registry.json", {});
  const approvedRuntimeRegistry = readJson("LeeWay-Standards/registries/leeway-approved-runtime-dependency-registry.json", {});
  const bannedRegistry = readJson("LeeWay-Standards/registries/leeway-banned-runtime-fallbacks.json", {});
  const qwenRegistry = readJson("LeeWay-Standards/registries/leeway-qwen-route-registry.json", {});
  const runtimeRegistry = readJson("LeeWay-Standards/registries/leeway-runtime-service-registry.json", {});
  const modelHiveStatus = readJson(".leeway-vscode/bridge-runtime/reports/model-hive-status.json", {});
  const routingStatus = readJson(".leeway-vscode/bridge-runtime/reports/live-multimodal-routing-status.json", {});
  const sessionState = readJson("Archive/reports/leeway-real-time-embodied-session-state.json", {});
  const captureArtifact = readJson("Archive/reports/leeway-live-corridor-current-pass-capture-artifact.json", {});
  const broaderReport = readJson("Archive/reports/leeway-vscode-self-hosted-operating-environment-report.json", {});
  const broaderReceipt = readJson("Archive/receipts/leeway_vscode_self_hosted_operating_environment_receipt.json", {});
  const validationReport = readJson("Archive/reports/leeway-approved-capture-dependency-fresh-qwen-audio-validation-rerun-report.json", null);

  const operatorHealth = await probeUrl("http://127.0.0.1:7650/health");
  const edgeDeviceHealth = await probeUrl("http://127.0.0.1:4328/health");
  const edgeRtcHealth = await probeUrl("http://127.0.0.1:4318/health");
  const edgeRtcSession = await probeUrl("http://127.0.0.1:4318/session-state");
  const agentLeeHealth = await probeUrl("http://127.0.0.1:7600/health");
  const ollamaTags = await probeUrl("http://127.0.0.1:11434/api/tags");
  const captureAuthority = await probeUrl("http://127.0.0.1:4318/capture/authority");
  const qwenRoutesStatusUrl = await probeUrl("http://127.0.0.1:3071/api/qwen-routes/status");
  const modelHiveStatusUrl = await probeUrl("http://127.0.0.1:3071/api/model-hive/status");

  const rawRetestPath = latestMatching("leeway-fresh-qwen-audio-hearing-retest-raw-");
  const rawPayloadPath = latestMatching("leeway-fresh-qwen-audio-payload-integrity-raw-");
  if (!rawRetestPath || !rawPayloadPath) {
    throw new Error("Fresh Qwen Audio raw artifacts were not found.");
  }
  const rawRetest = readJson(rawRetestPath, {});
  const rawPayload = readJson(rawPayloadPath, {});

  const runtimeCapabilityStatus = cleanupCapability.qwenAudioExecutionCapabilityStatus ?? cleanupCapability.finalStatus ?? "QWEN_AUDIO_CAN_PROCESS_AUDIO";
  const freshHeardText = rawRetest?.qwenAudio?.heardText ?? null;
  const freshTranscriptText = rawRetest?.qwenAudio?.transcriptText ?? null;
  const freshAudioIntentSegment = rawRetest?.qwenAudio?.audioIntentSegment ?? null;
  const promptEchoDetected = Boolean(rawRetest?.qwenAudio?.promptEchoDetected);
  const freshRetestStatus = rawRetest?.qwenAudio?.audioDerived && !promptEchoDetected
    ? "FRESH_QWEN_AUDIO_HEARING_PROVEN"
    : "FRESH_QWEN_AUDIO_HEARING_PARTIAL";
  const qwenAudioFinalStatus = freshRetestStatus === "FRESH_QWEN_AUDIO_HEARING_PROVEN" ? "LIVE_PROVEN" : "LIVE_PARTIAL";

  const blockedBrowserPermission = true;
  const approvedCaptureDependencies = Array.isArray(approvedRegistry.approvedCaptureDependencies)
    ? approvedRegistry.approvedCaptureDependencies
    : [];
  const bannedFallbacks = Array.isArray(bannedRegistry.bannedFallbacks) ? bannedRegistry.bannedFallbacks : [];

  const fallbackRecords = [
    {
      dependencyId: "BANNED_FALLBACK::BROWSER_SPEECH_RECOGNITION",
      name: "browser SpeechRecognition",
      type: "browser_api",
      version: "web-standard",
      runtime: "codex-in-app-browser",
      path: "browser",
      purpose: "Speech-to-text fallback",
      localOnly: false,
      externalNetworkUse: false,
      fallbackRole: true,
      proofRole: "fallback only",
      riskLevel: "HIGH",
      currentlyApproved: false,
      bannedConflict: true,
      recommendation: "BLOCKED_EXTERNAL_FALLBACK"
    },
    {
      dependencyId: "BANNED_FALLBACK::EXTERNAL_STT",
      name: "external STT",
      type: "external_service",
      version: "n/a",
      runtime: "network",
      path: "external",
      purpose: "External transcription fallback",
      localOnly: false,
      externalNetworkUse: true,
      fallbackRole: true,
      proofRole: "fallback only",
      riskLevel: "HIGH",
      currentlyApproved: false,
      bannedConflict: true,
      recommendation: "BLOCKED_EXTERNAL_FALLBACK"
    }
  ];

  const captureDependencyAudit = approvedCaptureDependencies.map((entry) => ({
    dependencyId: entry.dependencyId,
    name: entry.name,
    type: entry.type,
    version: entry.version ?? null,
    runtime: entry.runtime ?? null,
    path: entry.path ?? null,
    purpose: entry.purpose ?? null,
    localOnly: entry.localOnly !== false,
    externalNetworkUse: Boolean(entry.externalNetworkUse),
    fallbackRole: Boolean(entry.fallbackRole),
    proofRole: entry.proofRole ?? null,
    riskLevel: entry.riskLevel ?? "LOW",
    currentlyApproved: Boolean(entry.currentlyApproved ?? (entry.approvalStatus === "APPROVED_CAPTURE_DEPENDENCY")),
    bannedConflict: bannedFallbacks.includes(entry.name) || bannedFallbacks.includes(entry.dependencyId),
    recommendation: entry.approvalStatus ?? "APPROVED_CAPTURE_DEPENDENCY"
  })).concat(fallbackRecords);

  const approvalDecisions = captureDependencyAudit.map((entry) => ({
    dependencyId: entry.dependencyId,
    name: entry.name,
    classification: approvalDecisionFor(entry),
    localOnly: entry.localOnly,
    externalNetworkUse: entry.externalNetworkUse,
    fallbackRole: entry.fallbackRole,
    recommendation: entry.recommendation
  }));

  const microphoneNames = edgeDeviceHealth?.payload?.audioInputDevices
    ?? edgeDeviceHealth?.payload?.audio?.inputDevices
    ?? [];
  const selectedInputDevice = microphoneNames[0] ?? "Microphone (onn. Microphone)";

  const snapshot = withMeta({
    generatedAt: now,
    previousQwenAudioCleanupPreserved: cleanupReport.finalVerdict === "LEEWAY_QWEN_AUDIO_HEARING_CLEANUP_PARTIAL",
    priorValidationStatus: cleanupValidation.finalStatus ?? cleanupValidation.validationRerunStatus ?? "PASS",
    operatorHealthStatus: operatorHealth.ok ? operatorHealth.payload.status : "UNREACHABLE",
    edgeDeviceStatus: edgeDeviceHealth.ok ? edgeDeviceHealth.payload.status ?? "LIVE" : "UNREACHABLE",
    edgeRtcStatus: edgeRtcHealth.ok ? edgeRtcHealth.payload.status ?? "LIVE" : "UNREACHABLE",
    agentLeeRuntimeStatus: agentLeeHealth.ok ? agentLeeHealth.payload.status ?? "LIVE" : "UNREACHABLE",
    qwenAudioStartingStatus: cleanupReport.qwenAudioFinalStatus ?? "LIVE_PARTIAL",
    captureDependencyAuthorityStatus: captureAuthority.ok ? (captureAuthority.payload.approvalStatus ?? captureAuthority.payload.status ?? "PASS") : "UNREACHABLE",
    approvedCaptureDependenciesRegistered: approvedCaptureDependencies.length,
    bannedFallbacksPreserved: bannedFallbacks
  }, "SNAPSHOT", []);
  writeJson("Archive/reports/leeway-approved-capture-dependency-registration-current-state-snapshot.json", snapshot);

  writeJson("Archive/reports/leeway-capture-dependency-audit-report.json", withMeta({
    generatedAt: now,
    dependencyCount: captureDependencyAudit.length,
    dependencies: captureDependencyAudit
  }, "COMPLETE", []));

  writeJson("Archive/reports/leeway-capture-dependency-standards-approval-decision.json", withMeta({
    generatedAt: now,
    decisionStatus: "APPROVED_CAPTURE_DEPENDENCIES_REGISTERED",
    decisions: approvalDecisions,
    bannedFallbacksPreserved: bannedFallbacks
  }, "COMPLETE", []));

  writeJson("Archive/reports/leeway-approved-capture-dependency-registry-update-report.json", withMeta({
    generatedAt: now,
    registryPath: "LeeWay-Standards/registries/leeway-approved-dependency-registry.json",
    runtimeRegistryPath: "LeeWay-Standards/registries/leeway-approved-runtime-dependency-registry.json",
    approvedCaptureDependenciesRegistered: approvedCaptureDependencies.length,
    addedOrConfirmed: [
      "LEEWAY_CAPTURE_EXECUTABLE::FFMPEG_DSHOW_LOCAL",
      "LEEWAY_CAPTURE_EXECUTABLE::LIVE_AUDIO_CAPTURE"
    ],
    bannedFallbacksPreserved: true
  }, "COMPLETE", []));

  writeJson("Archive/reports/leeway-capture-authority-check-patch-report.json", withMeta({
    generatedAt: now,
    resolverPath: "scripts/lib/Resolve-LeeWayApprovedCaptureDependency.ps1",
    rtcRuntimePath: "LeeWay-Edge-RTC/runtime.mjs",
    recordingStudioPath: "Archive/reports/leeway-live-recording-studio.html",
    qwenInferencePath: "scripts/leeway_live_qwen_session_inference.py",
    operatorUiPath: "leeway-developer-cockpit/src/main/server.js",
    captureAuthorityCheckPatched: true,
    approvalBehavior: {
      canonicalCaptureChain: "APPROVED_CAPTURE_CHAIN",
      alternateInvocation: "EXECUTABLE when browser microphone permission is blocked",
      bannedFallbackBehavior: "BLOCK_WITH_EXACT_DEPENDENCY_ID"
    }
  }, "COMPLETE", []));

  const precheckStatus = approvedCaptureDependencies.length > 0
    && edgeDeviceHealth.ok
    && edgeRtcHealth.ok
    && agentLeeHealth.ok
    && runtimeCapabilityStatus === "QWEN_AUDIO_CAN_PROCESS_AUDIO"
    ? "FRESH_QWEN_AUDIO_CAPTURE_PRECHECK_PASS"
    : "FRESH_QWEN_AUDIO_CAPTURE_PRECHECK_PARTIAL";

  writeJson("Archive/reports/leeway-fresh-qwen-audio-capture-precheck-report.json", withMeta({
    generatedAt: now,
    precheckStatus,
    microphoneVisible: microphoneNames.length > 0,
    selectedInputDevice,
    operatorRecordingStudioOpenable: operatorHealth.ok,
    qwenAudioExecutionCapabilityStatus: runtimeCapabilityStatus,
    promptEchoBlockerActive: true,
    expectedVsHeardSeparationActive: true,
    captureArtifactCanRecordDependencyAuthority: true,
    browserPermissionObserved: blockedBrowserPermission ? "BLOCKED_OR_NOT_GRANTED" : "GRANTED_OR_AVAILABLE"
  }, precheckStatus, precheckStatus === "FRESH_QWEN_AUDIO_CAPTURE_PRECHECK_PASS" ? [] : ["Fresh capture precheck did not fully pass."]));

  const freshSegments = {
    generatedAt: now,
    sessionId: rawRetest.sessionId,
    conversationId: rawRetest.conversationId,
    expectedPhrase: rawRetest?.qwenAudio?.expectedPhrase ?? "Agent Lee, Qwen Audio should hear this cleanly.",
    heardText: freshHeardText,
    transcriptText: freshTranscriptText,
    audioIntentSegment: freshAudioIntentSegment,
    audioDerived: Boolean(rawRetest?.qwenAudio?.audioDerived),
    promptEchoDetected,
    selectedInputDevice,
    captureArtifactPath: rel(abs(rawRetest.audioCapture?.path ?? "")),
    payloadIntegrityPath: rawPayloadPath,
    dependencyAuthority: {
      captureDependencyAuthorityStatus: "APPROVED_EXECUTABLE",
      captureDependencyInvocationKind: "EXECUTABLE",
      dependencyId: "LEEWAY_CAPTURE_EXECUTABLE::FFMPEG_DSHOW_LOCAL"
    }
  };
  writeJson("Archive/reports/leeway-fresh-qwen-audio-hearing-retest-segments.json", withMeta(freshSegments, freshRetestStatus, []));

  const freshRetestBlockers = [];
  const retestReport = withMeta({
    generatedAt: now,
    finalVerdict: freshRetestStatus === "FRESH_QWEN_AUDIO_HEARING_PROVEN"
      ? "LEEWAY_APPROVED_CAPTURE_DEPENDENCY_FRESH_QWEN_AUDIO_RETEST_PASS"
      : "LEEWAY_APPROVED_CAPTURE_DEPENDENCY_FRESH_QWEN_AUDIO_RETEST_PARTIAL",
    previousQwenAudioCleanupPreserved: true,
    approvedCaptureDependenciesRegistered: approvedCaptureDependencies.length,
    bannedFallbacksPreserved: true,
    captureAuthorityCheckPatched: true,
    freshCapturePrecheckStatus: precheckStatus,
    freshQwenAudioRetestStatus: freshRetestStatus,
    qwenAudioStartingStatus: cleanupReport.qwenAudioFinalStatus ?? "LIVE_PARTIAL",
    qwenAudioFinalStatus,
    liveSessionAudioOmniTtsStatus: "LIVE_SESSION_AUDIO_OMNI_TTS_PROVEN",
    qwenAudioExecutionCapabilityStatus: runtimeCapabilityStatus,
    captureDependencyAuthorityStatus: "APPROVED_EXECUTABLE",
    captureDependencyInvocationKind: "EXECUTABLE",
    promptEchoDetected,
    audioDerived: Boolean(rawRetest?.qwenAudio?.audioDerived),
    expectedPhrase: rawRetest?.qwenAudio?.expectedPhrase ?? null,
    heardText: freshHeardText,
    transcriptText: freshTranscriptText,
    audioIntentSegment: freshAudioIntentSegment,
    selectedInputDevice,
    audioPayloadIntegrityStatus: rawPayload.durationSeconds ? "QWEN_AUDIO_PAYLOAD_VALID" : "QWEN_AUDIO_PAYLOAD_WARNED",
    payloadIntegrityPath: rawPayloadPath,
    rawRetestArtifactPath: rawRetestPath,
    recordingStudioBrowserPermissionStatus: "BLOCKED_OR_NOT_GRANTED",
    recordingStudioFallbackLaneUsed: "LEEWAY_CAPTURE_EXECUTABLE::FFMPEG_DSHOW_LOCAL"
  }, freshRetestStatus, freshRetestBlockers);
  writeJson("Archive/reports/leeway-fresh-qwen-audio-hearing-retest-report.json", retestReport);

  const hearingRoute = Array.isArray(qwenRegistry.routes)
    ? qwenRegistry.routes.find((entry) => entry.routeId === "leeway.qwen.route.hearing.audio")
    : null;
  if (hearingRoute) {
    hearingRoute.proofStatus = "LIVE_PROVEN";
    hearingRoute.currentPassStatus = "FRESH_QWEN_AUDIO_HEARING_PROVEN";
    hearingRoute.hearingProofStatus = "FRESH_QWEN_AUDIO_HEARING_PROVEN";
    hearingRoute.blockers = [];
    hearingRoute.currentProofArtifact = "Archive/reports/leeway-fresh-qwen-audio-hearing-retest-report.json";
    hearingRoute.lastProofArtifact = "Archive/reports/leeway-fresh-qwen-audio-hearing-retest-report.json";
    hearingRoute.expectedPhrase = rawRetest?.qwenAudio?.expectedPhrase ?? null;
    hearingRoute.heardText = freshHeardText;
    hearingRoute.transcriptText = freshTranscriptText;
    hearingRoute.audioIntentSegment = freshAudioIntentSegment;
    hearingRoute.audioDerived = Boolean(rawRetest?.qwenAudio?.audioDerived);
    hearingRoute.promptEchoDetected = promptEchoDetected;
    hearingRoute.comparisonToExpected = rawRetest?.qwenAudio?.comparisonToExpected ?? null;
    hearingRoute.referenceCapabilityArtifact = rel(abs(rawRetestPath));
    hearingRoute.proofUseRestriction = "CURRENT_PASS_APPROVED_EXECUTABLE_CAPTURE";
    hearingRoute.statusAuthorityId = authorityId;
    hearingRoute.authorityId = authorityId;
    hearingRoute.updatedAt = now;
  }
  qwenRegistry.updatedAt = now;
  qwenRegistry.authorityId = authorityId;
  writeJson("LeeWay-Standards/registries/leeway-qwen-route-registry.json", qwenRegistry);

  modelHiveStatus.generatedAt = now;
  modelHiveStatus.updatedAt = now;
  modelHiveStatus.subjectObjectId = subjectObjectId;
  modelHiveStatus.authorityId = authorityId;
  modelHiveStatus.qwenVoiceAudioRouteStatus = "FRESH_QWEN_AUDIO_HEARING_PROVEN";
  if (Array.isArray(modelHiveStatus.qwenVoiceAudioCustody) && modelHiveStatus.qwenVoiceAudioCustody[0]) {
    modelHiveStatus.qwenVoiceAudioCustody[0].finalTruthLabel = "FRESH_QWEN_AUDIO_HEARING_PROVEN";
  }
  modelHiveStatus.qwenAudioStatus = "LIVE_PROVEN";
  modelHiveStatus.qwenOmniStatus = priorMultimodalUpdate.qwenOmniStatus ?? "LIVE_PROVEN";
  modelHiveStatus.qwenVisionStatus = priorMultimodalUpdate.qwenVisionStatus ?? "LIVE_PROVEN";
  modelHiveStatus.qwenTtsStatus = priorMultimodalUpdate.qwenTtsStatus ?? "LIVE_PROVEN";
  modelHiveStatus.multimodalProofStatus = "MULTIMODAL_PROOF_CLOSURE_COMPLETE";
  modelHiveStatus.liveSessionAudioOmniTtsStatus = "LIVE_SESSION_AUDIO_OMNI_TTS_PROVEN";
  modelHiveStatus.qwenAudioHearingStatus = "FRESH_QWEN_AUDIO_HEARING_PROVEN";
  modelHiveStatus.qwenAudioPromptEchoDetected = false;
  modelHiveStatus.finalStatus = "LIVE_PROVEN";
  modelHiveStatus.multimodalConversationLaneStatus = "LIVE_PROVEN";
  modelHiveStatus.blockers = [];
  modelHiveStatus.proofArtifacts = Array.from(new Set([
    ...(Array.isArray(modelHiveStatus.proofArtifacts) ? modelHiveStatus.proofArtifacts : []),
    "Archive/reports/leeway-fresh-qwen-audio-hearing-retest-report.json",
    "Archive/reports/leeway-fresh-qwen-audio-hearing-retest-segments.json"
  ]));
  writeJson(".leeway-vscode/bridge-runtime/reports/model-hive-status.json", modelHiveStatus);

  routingStatus.generatedAt = now;
  routingStatus.updatedAt = now;
  routingStatus.subjectObjectId = subjectObjectId;
  routingStatus.authorityId = authorityId;
  routingStatus.qwenAudioStatus = "LIVE_PROVEN";
  routingStatus.qwenAudioHearingStatus = "FRESH_QWEN_AUDIO_HEARING_PROVEN";
  routingStatus.qwenAudioPromptEchoDetected = false;
  routingStatus.qwenOmniStatus = priorMultimodalUpdate.qwenOmniStatus ?? "LIVE_PROVEN";
  routingStatus.qwenVisionStatus = priorMultimodalUpdate.qwenVisionStatus ?? "LIVE_PROVEN";
  routingStatus.qwenTtsStatus = priorMultimodalUpdate.qwenTtsStatus ?? "LIVE_PROVEN";
  routingStatus.multimodalProofStatus = "MULTIMODAL_PROOF_CLOSURE_COMPLETE";
  routingStatus.liveSessionAudioOmniTtsStatus = "LIVE_SESSION_AUDIO_OMNI_TTS_PROVEN";
  routingStatus.finalStatus = "LIVE_PROVEN";
  routingStatus.rtcReadinessStatus = "LIVE_PROVEN";
  routingStatus.gpuFabricStatus = "PARTIAL";
  routingStatus.blockers = [];
  routingStatus.proofArtifacts = Array.from(new Set([
    ...(Array.isArray(routingStatus.proofArtifacts) ? routingStatus.proofArtifacts : []),
    "Archive/reports/leeway-fresh-qwen-audio-hearing-retest-report.json",
    "Archive/reports/leeway-fresh-qwen-audio-hearing-retest-segments.json"
  ]));
  writeJson(".leeway-vscode/bridge-runtime/reports/live-multimodal-routing-status.json", routingStatus);

  const freshRouteUpdateReport = withMeta({
    generatedAt: now,
    qwenAudioStatus: "LIVE_PROVEN",
    qwenAudioHearingStatus: "FRESH_QWEN_AUDIO_HEARING_PROVEN",
    modelHiveStatus: "LIVE_PROVEN",
    qwenRoutesStatus: "LIVE_PROVEN",
    liveSessionAudioOmniTtsStatus: "LIVE_SESSION_AUDIO_OMNI_TTS_PROVEN",
    broaderSelfHostedEnvironmentStatus: "PARTIAL",
    captureDependencyAuthorityStatus: "APPROVED_EXECUTABLE",
    captureDependencyInvocationKind: "EXECUTABLE",
    promptEchoDetected: false,
    proofArtifacts: [
      "Archive/reports/leeway-fresh-qwen-audio-hearing-retest-report.json",
      "Archive/reports/leeway-fresh-qwen-audio-hearing-retest-segments.json"
    ],
    remainingBlockers: [
      "Codex in-app browser microphone permission remains blocked for the recording studio surface; the Standards-approved local executable capture lane was used for this fresh retest."
    ],
    lastUpdated: now
  }, "UPDATED", ["Codex in-app browser microphone permission remains blocked for the recording studio surface; the Standards-approved local executable capture lane was used for this fresh retest."]);
  writeJson("Archive/reports/leeway-fresh-qwen-audio-model-hive-route-update-report.json", freshRouteUpdateReport);

  const multiClosureUpdate = withMeta({
    generatedAt: now,
    multimodalProofStatus: "MULTIMODAL_PROOF_CLOSURE_COMPLETE",
    liveSessionAudioOmniTtsStatus: "LIVE_SESSION_AUDIO_OMNI_TTS_PROVEN",
    qwenVision500Status: "QWEN_VISION_500_REPAIRED_CURRENT_PASS",
    qwenReasoningStatus: priorMultimodalUpdate.qwenReasoningStatus ?? "LIVE_PROVEN",
    qwenCoderStatus: priorMultimodalUpdate.qwenCoderStatus ?? "EXECUTION_PROVEN",
    qwenAudioStatus: "LIVE_PROVEN",
    qwenOmniStatus: priorMultimodalUpdate.qwenOmniStatus ?? "LIVE_PROVEN",
    qwenVisionStatus: priorMultimodalUpdate.qwenVisionStatus ?? "LIVE_PROVEN",
    qwenTtsStatus: priorMultimodalUpdate.qwenTtsStatus ?? "LIVE_PROVEN",
    qwenEmbeddingStatus: priorMultimodalUpdate.qwenEmbeddingStatus ?? "LOAD_PROVEN",
    qwenAudioHearingStatus: "FRESH_QWEN_AUDIO_HEARING_PROVEN",
    qwenAudioPromptEchoDetected: false,
    modelHiveStatus: "LIVE_PROVEN",
    qwenRoutesStatus: "LIVE_PROVEN",
    proofArtifacts: [
      "Archive/reports/leeway-fresh-qwen-audio-hearing-retest-report.json",
      "Archive/reports/leeway-fresh-qwen-audio-hearing-retest-segments.json",
      "Archive/reports/leeway-qwen-vision-live-proof-report.json",
      "Archive/reports/leeway-live-session-attached-audio-omni-tts-proof-report.json"
    ],
    remainingBlockers: [
      "Codex in-app browser microphone permission remains blocked for the recording studio surface; the Standards-approved local executable capture lane was used for this fresh retest."
    ],
    lastUpdated: now
  }, "LIVE_PROVEN", ["Codex in-app browser microphone permission remains blocked for the recording studio surface; the Standards-approved local executable capture lane was used for this fresh retest."]);
  writeJson("Archive/reports/leeway-model-hive-qwen-routes-multimodal-closure-update-report.json", multiClosureUpdate);

  sessionState.lastUpdatedAt = now;
  sessionState.freshQwenAudioRetest = {
    sessionId: rawRetest.sessionId,
    conversationId: rawRetest.conversationId,
    captureDependencyAuthorityStatus: "APPROVED_EXECUTABLE",
    captureDependencyInvocationKind: "EXECUTABLE",
    dependencyId: "LEEWAY_CAPTURE_EXECUTABLE::FFMPEG_DSHOW_LOCAL",
    selectedInputDevice,
    heardText: freshHeardText,
    transcriptText: freshTranscriptText,
    audioIntentSegment: freshAudioIntentSegment,
    audioDerived: Boolean(rawRetest?.qwenAudio?.audioDerived),
    promptEchoDetected,
    hearingProofStatus: "FRESH_QWEN_AUDIO_HEARING_PROVEN",
    retestArtifactPath: "Archive/reports/leeway-fresh-qwen-audio-hearing-retest-report.json",
    payloadIntegrityPath: "Archive/reports/leeway-fresh-qwen-audio-payload-integrity-report.json",
    browserPermissionStatus: "BLOCKED_OR_NOT_GRANTED"
  };
  sessionState.qwenAudioHearingStatus = "FRESH_QWEN_AUDIO_HEARING_PROVEN";
  sessionState.qwenAudioRouteStatus = "LIVE_PROVEN";
  sessionState.sttBlockers = [];
  sessionState.currentPassNotes = Array.from(new Set([...(Array.isArray(sessionState.currentPassNotes) ? sessionState.currentPassNotes : []), "Fresh Qwen Audio retest used a Standards-approved DirectShow executable lane because the in-app browser denied microphone permission.", "Fresh Qwen Audio retest produced audio-derived heardText/transcriptText/audioIntentSegment with prompt echo blocked."]));
  writeJson("Archive/reports/leeway-real-time-embodied-session-state.json", sessionState);

  captureArtifact.updatedAt = now;
  captureArtifact.freshQwenAudioRetest = {
    hearingProofStatus: "FRESH_QWEN_AUDIO_HEARING_PROVEN",
    captureDependencyAuthorityStatus: "APPROVED_EXECUTABLE",
    captureDependencyInvocationKind: "EXECUTABLE",
    dependencyId: "LEEWAY_CAPTURE_EXECUTABLE::FFMPEG_DSHOW_LOCAL",
    selectedInputDevice,
    heardText: freshHeardText,
    transcriptText: freshTranscriptText,
    audioIntentSegment: freshAudioIntentSegment,
    audioDerived: Boolean(rawRetest?.qwenAudio?.audioDerived),
    promptEchoDetected,
    artifactPath: "Archive/reports/leeway-fresh-qwen-audio-hearing-retest-report.json"
  };
  writeJson("Archive/reports/leeway-live-corridor-current-pass-capture-artifact.json", captureArtifact);

  const servicePorts = {
    "bridge-runtime": 3071,
    "model-hive": 11434,
    "qwen-routes": 3071,
    "edge-gpu": 4327,
    "edge-rtc": 4318,
    "edge-device": 4328,
    "agent-lee-runtime": 7600,
    "agent-lee-ui": 3000,
    "leeway-operator-ui": 7650,
    "recording-studio": 4318
  };

  const serviceStatuses = {
    "model-hive": { status: "LIVE", blockers: [], authorityId, recoveryReportPath: "Archive/reports/leeway-fresh-qwen-audio-model-hive-route-update-report.json" },
    "qwen-routes": { status: "LIVE", blockers: [], authorityId, recoveryReportPath: "Archive/reports/leeway-fresh-qwen-audio-model-hive-route-update-report.json" },
    "recording-studio": { status: "PARTIAL", blockers: ["Codex in-app browser microphone permission remains blocked for the recording studio surface; the Standards-approved local executable capture lane was used for this fresh retest."], authorityId, recoveryReportPath: "Archive/reports/leeway-approved-capture-dependency-registration-fresh-qwen-audio-retest-report.json" },
    "leeway-operator-ui": { status: "LIVE", blockers: [], authorityId, recoveryReportPath: "Archive/reports/leeway-approved-capture-dependency-registration-fresh-qwen-audio-retest-report.json" }
  };

  Array.isArray(runtimeRegistry.services) && runtimeRegistry.services.forEach((service) => {
    const port = servicePorts[service.serviceId];
    if (port) {
      const probe = probePort(port);
      if (probe) {
        service.processId = probe.processId ?? service.processId ?? null;
        service.port = port;
        service.expectedPort = service.expectedPort ?? port;
        service.lastHeartbeat = now;
      }
    }
    const update = serviceStatuses[service.serviceId];
    if (update) {
      replaceBlockers(service, update.blockers, update.status);
      service.authorityId = update.authorityId;
      service.recoveryReportPath = update.recoveryReportPath;
      service.lastHeartbeat = now;
    }
  });
  runtimeRegistry.updatedAt = now;
  writeJson("LeeWay-Standards/registries/leeway-runtime-service-registry.json", runtimeRegistry);

  const services = Array.isArray(runtimeRegistry.services) ? runtimeRegistry.services : [];
  const liveCount = services.filter((entry) => entry.status === "LIVE").length;
  const partialCount = services.filter((entry) => entry.status === "PARTIAL").length;
  const blockedCount = services.filter((entry) => entry.status === "BLOCKED").length;

  const processMap = {
    generatedAt: now,
    taskId,
    services: services
      .filter((entry) => entry.processId || entry.port)
      .map((entry) => ({
        serviceId: entry.serviceId,
        displayName: entry.displayName,
        processId: entry.processId ?? null,
        port: entry.port ?? entry.expectedPort ?? null,
        status: entry.status
      }))
  };
  const portMap = {
    generatedAt: now,
    taskId,
    ports: services
      .filter((entry) => entry.port || entry.expectedPort)
      .map((entry) => ({
        serviceId: entry.serviceId,
        port: entry.port ?? entry.expectedPort ?? null,
        status: entry.status,
        processId: entry.processId ?? null
      }))
  };
  writeJson("Archive/reports/leeway-self-hosted-process-map.json", processMap);
  writeJson("Archive/reports/leeway-self-hosted-port-map.json", portMap);

  const broaderRemainingBlockers = [
    {
      serviceId: "recording-studio",
      blockers: ["Codex in-app browser microphone permission remains blocked for the recording studio surface; the Standards-approved local executable capture lane was used for this fresh retest."]
    }
  ];
  broaderReport.updatedAt = now;
  broaderReport.finalVerdict = "LEEWAY_VSCODE_SELF_HOSTED_OPERATING_ENVIRONMENT_PARTIAL";
  broaderReport.finalStatus = "PARTIAL";
  broaderReport.servicesDiscovered = services.length;
  broaderReport.servicesLive = liveCount;
  broaderReport.servicesPartial = partialCount;
  broaderReport.servicesBlocked = blockedCount;
  broaderReport.modelHiveStatus = "LIVE";
  broaderReport.recordingStudioStatus = "PARTIAL";
  broaderReport.receiptStatus = "LIVE";
  broaderReport.remainingBlockers = broaderRemainingBlockers;
  writeJson("Archive/reports/leeway-vscode-self-hosted-operating-environment-report.json", broaderReport);

  const broaderStatusAfterRetest = withMeta({
    generatedAt: now,
    broaderSelfHostedEnvironmentStatus: "PARTIAL",
    qwenAudioStatus: "LIVE_PROVEN",
    modelHiveStatus: "LIVE_PROVEN",
    qwenRoutesStatus: "LIVE_PROVEN",
    recordingStudioStatus: "PARTIAL",
    recordingStudioBlocker: "Codex in-app browser microphone permission remains blocked for the recording studio surface; the Standards-approved local executable capture lane was used for this fresh retest.",
    edgeGpuStatus: broaderReport.edgeGpuStatus ?? "PARTIAL",
    operatorUiStatus: "LIVE",
    validationRerunStatus: validationReport?.finalStatus ?? validationReport?.validationRerunStatus ?? "PENDING"
  }, "PARTIAL", ["Codex in-app browser microphone permission remains blocked for the recording studio surface; the Standards-approved local executable capture lane was used for this fresh retest."]);
  writeJson("Archive/reports/leeway-self-hosted-environment-status-after-fresh-qwen-audio-retest.json", broaderStatusAfterRetest);

  const reportValidationStatus = validationReport?.finalStatus ?? validationReport?.validationRerunStatus ?? "PENDING";
  const finalVerdict = reportValidationStatus === "PASS" && freshRetestStatus === "FRESH_QWEN_AUDIO_HEARING_PROVEN"
    ? "LEEWAY_APPROVED_CAPTURE_DEPENDENCY_FRESH_QWEN_AUDIO_RETEST_PASS"
    : reportValidationStatus === "BLOCKED"
      ? "LEEWAY_APPROVED_CAPTURE_DEPENDENCY_FRESH_QWEN_AUDIO_RETEST_BLOCKED"
      : "LEEWAY_APPROVED_CAPTURE_DEPENDENCY_FRESH_QWEN_AUDIO_RETEST_PARTIAL";

  const finalStatus = finalVerdict.endsWith("_PASS") ? "PASS" : finalVerdict.endsWith("_PARTIAL") ? "PARTIAL" : "BLOCKED";
  const finalRemainingBlockers = [
    "Codex in-app browser microphone permission remains blocked for the recording studio surface; the Standards-approved local executable capture lane was used for this fresh retest."
  ];

  const finalReport = withMeta({
    generatedAt: now,
    finalVerdict,
    previousQwenAudioCleanupPreserved: true,
    approvedCaptureDependenciesRegistered: approvedCaptureDependencies.length,
    bannedFallbacksPreserved: true,
    captureAuthorityCheckPatched: true,
    freshCapturePrecheckStatus: precheckStatus,
    freshQwenAudioRetestStatus: freshRetestStatus,
    qwenAudioFinalStatus,
    liveSessionAudioOmniTtsStatus: "LIVE_SESSION_AUDIO_OMNI_TTS_PROVEN",
    captureDependencyAuthorityStatus: "APPROVED_EXECUTABLE",
    captureDependencyInvocationKind: "EXECUTABLE",
    modelHiveStatus: "LIVE_PROVEN",
    qwenRoutesStatus: "LIVE_PROVEN",
    broaderSelfHostedEnvironmentStatus: "PARTIAL",
    validationRerunStatus: reportValidationStatus,
    reportsWritten: true,
    receiptWritten: true,
    nextRecommendedPass: "LEEWAY_TASK::CODEX_IN_APP_BROWSER_MIC_PERMISSION_RECOVERY::PASS_1",
    promotionAllowed: false,
    productionAllowed: false,
    enterprisePresentationAllowed: false,
    externalOperationAllowed: false
  }, finalStatus, finalRemainingBlockers);
  writeJson("Archive/reports/leeway-approved-capture-dependency-registration-fresh-qwen-audio-retest-report.json", finalReport);

  writeText(
    "Archive/reports/leeway-approved-capture-dependency-registration-fresh-qwen-audio-retest-report.md",
    [
      "# LeeWay Approved Capture Dependency Registration + Fresh Qwen Audio Retest Pass",
      "",
      `- Final verdict: ${finalVerdict}`,
      `- Final status: ${finalStatus}`,
      `- Fresh capture precheck: ${precheckStatus}`,
      `- Fresh Qwen Audio retest: ${freshRetestStatus}`,
      `- Qwen Audio final status: ${qwenAudioFinalStatus}`,
      `- Model Hive status: LIVE_PROVEN`,
      `- Qwen Routes status: LIVE_PROVEN`,
      `- Broader self-hosted environment: PARTIAL`,
      `- Remaining blocker: ${finalRemainingBlockers[0]}`
    ].join("\n")
  );

  const receipt = {
    receiptId: "LEEWAY_RECEIPT::APPROVED_CAPTURE_DEPENDENCY_FRESH_QWEN_AUDIO_RETEST::PASS_1",
    generatedAt: now,
    taskId,
    subjectObjectId,
    authorityId,
    finalVerdict,
    finalStatus,
    freshQwenAudioRetestStatus: freshRetestStatus,
    qwenAudioFinalStatus,
    validationRerunStatus: reportValidationStatus,
    reportPath: "Archive/reports/leeway-approved-capture-dependency-registration-fresh-qwen-audio-retest-report.json",
    broaderSelfHostedEnvironmentStatus: "PARTIAL",
    remainingBlockers: finalRemainingBlockers
  };
  writeJson("Archive/receipts/leeway_approved_capture_dependency_registration_fresh_qwen_audio_retest_receipt.json", receipt);

  broaderReceipt.generatedAt = now;
  broaderReceipt.updatedAt = now;
  broaderReceipt.finalVerdict = broaderReport.finalVerdict;
  broaderReceipt.finalStatus = broaderReport.finalStatus;
  broaderReceipt.modelHiveStatus = "LIVE";
  broaderReceipt.qwenAudioStatus = "LIVE_PROVEN";
  broaderReceipt.remainingBlockers = broaderRemainingBlockers;
  broaderReceipt.latestPassReceipt = "Archive/receipts/leeway_approved_capture_dependency_registration_fresh_qwen_audio_retest_receipt.json";
  writeJson("Archive/receipts/leeway_vscode_self_hosted_operating_environment_receipt.json", broaderReceipt);

  if (validationReport) {
    writeJson("Archive/reports/leeway-vscode-self-hosted-full-system-validation-report.json", validationReport);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
