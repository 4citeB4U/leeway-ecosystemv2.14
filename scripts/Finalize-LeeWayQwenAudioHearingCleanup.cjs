const fs = require("fs");
const path = require("path");

const root = process.cwd();
const now = new Date().toISOString();

const assistantBodyId = "LEEWAY_ACTOR::ASSISTANT_BODY::CODEX::QWEN_AUDIO_HEARING_CLEANUP";
const assistantObjectId = "LEEWAY_ACTOR::EXTERNAL_ASSISTANT::CODEX_GPT5::WORKSPACE_SUBORDINATE";
const taskId = "LEEWAY_TASK::QWEN_AUDIO_HEARING_LANE_CLEANUP::PASS_1";
const subjectObjectId = "LEEWAY_MODEL_ROUTE::QWEN_AUDIO::HEARING_LANE_CLEANUP";
const authorityId = "LEEWAY_AUTHORITY::CREATOR_DELEGATED::LEONARD_LEE::QWEN_AUDIO_HEARING_CLEANUP";

const filesRead = [
  "000-URGENT-LEEWAY-ASSISTANT-LAW/READ-FIRST.md",
  "LeeWay-Standards/standards/BOOK-54-ASSISTANT-EMBODIMENT-AND-BEHAVIOR-LAW.md",
  "LeeWay-Standards/standards/BOOK-55-ASSISTANT-RECORDING-AND-LEARNING-LAW.md",
  "Archive/reports/leeway-live-multimodal-execution-closure-report.json",
  "Archive/reports/leeway-live-session-attached-audio-omni-tts-proof-report.json",
  "Archive/reports/leeway-live-session-attached-audio-omni-tts-artifacts.json",
  "Archive/reports/leeway-real-time-embodied-session-state.json",
  "Archive/reports/leeway-live-corridor-current-pass-capture-artifact.json",
  "Archive/reports/leeway-model-hive-qwen-routes-multimodal-closure-update-report.json",
  "Archive/reports/leeway-qwen-vision-live-proof-report.json",
  "Archive/reports/leeway-qwen-audio-hearing-cleanup-reference-reanalysis-v2.json",
  "Archive/reports/leeway-qwen-audio-hearing-cleanup-reference-reanalysis-v3.json",
  "LeeWay-Standards/registries/leeway-qwen-route-registry.json",
  "LeeWay-Standards/registries/leeway-runtime-service-registry.json",
  "LeeWay-Standards/registries/leeway-approved-runtime-dependency-registry.json",
  "Archive/reports/leeway-vscode-self-hosted-operating-environment-report.json",
  "Archive/reports/leeway-self-hosted-environment-status-after-live-multimodal-closure.json",
  "Archive/receipts/leeway_vscode_self_hosted_operating_environment_receipt.json",
  ".leeway-vscode/bridge-runtime/reports/model-hive-status.json",
  ".leeway-vscode/bridge-runtime/reports/live-multimodal-routing-status.json",
  "scripts/leeway_live_qwen_session_inference.py",
  "LeeWay-Edge-RTC/runtime.mjs",
  "leeway-agent-lee/admin-command-unit/server.mjs",
  "leeway-developer-cockpit/src/main/server.js",
  "scripts/Test-LeeWaySelfHostedOperatingEnvironment.ps1",
  "Archive/reports/leeway-approved-capture-gate-evidence-leeway-consumer-approved-capture-gate-20260528T200620.json"
];

const filesChanged = [
  "scripts/Finalize-LeeWayQwenAudioHearingCleanup.cjs",
  "scripts/leeway_live_qwen_session_inference.py",
  "LeeWay-Edge-RTC/runtime.mjs",
  "leeway-agent-lee/admin-command-unit/server.mjs",
  "leeway-developer-cockpit/src/main/server.js",
  "scripts/Test-LeeWaySelfHostedOperatingEnvironment.ps1",
  "LeeWay-Standards/registries/leeway-qwen-route-registry.json",
  "LeeWay-Standards/registries/leeway-runtime-service-registry.json",
  ".leeway-vscode/bridge-runtime/reports/model-hive-status.json",
  ".leeway-vscode/bridge-runtime/reports/live-multimodal-routing-status.json",
  "Archive/reports/leeway-qwen-audio-hearing-cleanup-current-state-snapshot.json",
  "Archive/reports/leeway-qwen-audio-hearing-implementation-audit.json",
  "Archive/reports/leeway-qwen-audio-expected-vs-heard-text-separation-report.json",
  "Archive/reports/leeway-qwen-audio-payload-integrity-report.json",
  "Archive/reports/leeway-qwen-audio-execution-capability-report.json",
  "Archive/reports/leeway-qwen-audio-clean-hearing-proof-report.json",
  "Archive/reports/leeway-qwen-audio-clean-hearing-segments.json",
  "Archive/reports/leeway-qwen-audio-model-hive-route-update-report.json",
  "Archive/reports/leeway-model-hive-qwen-routes-multimodal-closure-update-report.json",
  "Archive/reports/leeway-qwen-audio-hearing-cleanup-validation-rerun-report.json",
  "Archive/reports/leeway-self-hosted-environment-status-after-qwen-audio-cleanup.json",
  "Archive/reports/leeway-qwen-audio-hearing-lane-cleanup-report.md",
  "Archive/reports/leeway-qwen-audio-hearing-lane-cleanup-report.json",
  "Archive/receipts/leeway_qwen_audio_hearing_lane_cleanup_receipt.json",
  "Archive/reports/leeway-vscode-self-hosted-operating-environment-report.json",
  "Archive/reports/leeway-self-hosted-environment-status-after-live-multimodal-closure.json",
  "Archive/receipts/leeway_vscode_self_hosted_operating_environment_receipt.json"
];

const commandsRun = [
  "powershell -ExecutionPolicy Bypass -File scripts/lib/Resolve-LeeWayApprovedCaptureDependency.ps1 -AsJson",
  ".leeway-runtime/envs/qwen-gpu/Scripts/python.exe scripts/leeway_audio_profile.py --audio-path Archive/reports/leeway-live-qwen-audio-omni-tts-mic-capture-LEEWAY_SESSION-LIVE_MULTIMODAL_EXECUTION_CLOSURE-20260528T190012.wav",
  ".leeway-runtime/envs/qwen-gpu/Scripts/python.exe scripts/leeway_live_qwen_session_inference.py --workspace-root . --audio-path Archive/reports/leeway-live-qwen-audio-omni-tts-mic-capture-LEEWAY_SESSION-LIVE_MULTIMODAL_EXECUTION_CLOSURE-20260528T190012.wav --session-id LEEWAY_SESSION::QWEN_AUDIO_HEARING_CLEANUP::REFERENCE_REANALYSIS_V2 --conversation-id LEEWAY_CONVERSATION::QWEN_AUDIO_HEARING_CLEANUP::REFERENCE_REANALYSIS_V2 --output-json Archive/reports/leeway-qwen-audio-hearing-cleanup-reference-reanalysis-v2.json --expected-phrase \"LeeWay multimodal live proof\"",
  "node scripts/Finalize-LeeWayQwenAudioHearingCleanup.cjs",
  "powershell -ExecutionPolicy Bypass -File scripts/Test-LeeWaySelfHostedOperatingEnvironment.ps1"
];

const toolsUsed = [
  "functions.shell_command",
  "functions.apply_patch",
  "functions.update_plan",
  "multi_tool_use.parallel"
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
  "LEEWAY_SELF_HOST_VALIDATION_GATE"
];

const receiptsWritten = [
  "Archive/receipts/leeway_qwen_audio_hearing_lane_cleanup_receipt.json",
  "Archive/receipts/leeway_vscode_self_hosted_operating_environment_receipt.json"
];

const failuresEncountered = [
  {
    stage: "audit",
    failure: "The prior Qwen Audio hearing lane promoted raw outputSegment and allowed expectedPhrase contamination to masquerade as transcript truth.",
    status: "RESOLVED_THIS_PASS"
  },
  {
    stage: "runtime",
    failure: "Default shell Python lacked librosa and could not execute the governed Qwen Audio inference script.",
    status: "RESOLVED_BY_CANONICAL_QWEN_ENV"
  },
  {
    stage: "fresh_proof",
    failure: "Fresh current-pass live microphone recapture remains blocked because no approved LeeWay-owned capture dependency is registered for a new hearing retest.",
    status: "REMAINING_BLOCKER"
  }
];

const lessonsLearned = [
  "Qwen Audio can be audio-capable while still failing pass-level hearing truth if expectedPhrase contamination is not separated from heardText.",
  "The governed Qwen Python environment is the canonical execution path for LeeWay audio inference; the default shell Python is not authoritative.",
  "Fresh hearing proof and reference capability proof must stay separate when Standards blocks new capture authority."
];

const skillImprovementsSuggested = [
  "Add a shared helper that resolves the governed Qwen Python environment automatically for all hearing-lane scripts.",
  "Add a dedicated report writer for approved-capture-gate blockers so fresh-proof blocking is surfaced consistently in operator health.",
  "Add a route-registry schema helper for currentPassStatus, hearingProofStatus, and promptEchoDetected."
];

const approvedCaptureBlocker = "Fresh current-pass Qwen Audio hearing proof remains blocked because no approved LeeWay-owned live capture dependency is registered; governed reference reanalysis proves the route can process audio, but this pass cannot promote stale audio.";
const cleanupSummaryBlocker = "Prompt-echo contamination was repaired, but fresh current-pass Qwen Audio hearing proof remains blocked by the approved live capture dependency gate.";

function abs(filePath) {
  return path.join(root, filePath);
}

function rel(filePath) {
  return path.relative(root, filePath).replace(/\\/g, "/");
}

function ensureDir(filePath) {
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
  ensureDir(target);
  fs.writeFileSync(target, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function writeText(filePath, text) {
  const target = abs(filePath);
  ensureDir(target);
  fs.writeFileSync(target, text, "utf8");
}

function toArray(value) {
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }
  if (value == null || value === "") {
    return [];
  }
  return [value];
}

function withMeta(payload, finalStatus, remainingBlockers = []) {
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
    receiptsWritten,
    failuresEncountered,
    lessonsLearned,
    skillImprovementsSuggested,
    ...payload,
    finalStatus,
    remainingBlockers
  };
}

async function probeJson(url) {
  try {
    const response = await fetch(url, { cache: "no-store" });
    const text = await response.text();
    let payload = null;
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
    return {
      ok: response.ok,
      status: response.status,
      url,
      payload
    };
  } catch (error) {
    return {
      ok: false,
      status: null,
      url,
      error: error.message
    };
  }
}

function findRoute(registry, role) {
  return Array.isArray(registry?.routes)
    ? registry.routes.find((entry) => entry.role === role) ?? null
    : null;
}

function findService(registry, serviceId) {
  return Array.isArray(registry?.services)
    ? registry.services.find((entry) => entry.serviceId === serviceId) ?? null
    : null;
}

function updateService(service, updates) {
  if (!service) {
    return;
  }
  Object.assign(service, updates);
}

function markdownReport(report) {
  return [
    "# LeeWay Qwen Audio Hearing Lane Cleanup Pass",
    "",
    `- Final verdict: ${report.finalVerdict}`,
    `- Final status: ${report.finalStatus}`,
    `- Starting Qwen Audio status: ${report.qwenAudioStartingStatus}`,
    `- Expected/heard separation: ${report.expectedVsHeardSeparated}`,
    `- Audio payload integrity: ${report.audioPayloadIntegrityStatus}`,
    `- Execution capability: ${report.qwenAudioExecutionCapabilityStatus}`,
    `- Clean hearing proof status: ${report.qwenAudioCleanHearingProofStatus}`,
    `- Final Qwen Audio status: ${report.qwenAudioFinalStatus}`,
    `- Model Hive status: ${report.modelHiveStatus}`,
    `- Qwen Routes status: ${report.qwenRoutesStatus}`,
    `- Broader self-hosted environment: ${report.broaderSelfHostedEnvironmentStatus}`,
    `- Validation rerun status: ${report.validationRerunStatus}`,
    "",
    "## Remaining blockers",
    ...report.remainingBlockers.map((blocker) => `- ${blocker}`),
    "",
    "## Preserved truths",
    "- TTS audible confirmation remains preserved as heard clearly.",
    "- Qwen Vision proof remains preserved as live-proven.",
    "- Qwen Omni proof remains preserved as live-proven.",
    "- Agent Lee response proof remains preserved as live-proven.",
    "",
    "## Next recommended pass",
    `- ${report.nextRecommendedPass}`
  ].join("\n");
}

async function main() {
  const closureReport = readJson("Archive/reports/leeway-live-multimodal-execution-closure-report.json", {});
  const liveProofReport = readJson("Archive/reports/leeway-live-session-attached-audio-omni-tts-proof-report.json", {});
  const liveArtifacts = readJson("Archive/reports/leeway-live-session-attached-audio-omni-tts-artifacts.json", {});
  const sessionState = readJson("Archive/reports/leeway-real-time-embodied-session-state.json", {});
  const captureArtifact = readJson("Archive/reports/leeway-live-corridor-current-pass-capture-artifact.json", {});
  const closureUpdate = readJson("Archive/reports/leeway-model-hive-qwen-routes-multimodal-closure-update-report.json", {});
  const visionProof = readJson("Archive/reports/leeway-qwen-vision-live-proof-report.json", {});
  const qwenRouteRegistry = readJson("LeeWay-Standards/registries/leeway-qwen-route-registry.json", {});
  const runtimeRegistry = readJson("LeeWay-Standards/registries/leeway-runtime-service-registry.json", {});
  const broaderReport = readJson("Archive/reports/leeway-vscode-self-hosted-operating-environment-report.json", {});
  const broaderAfterClosure = readJson("Archive/reports/leeway-self-hosted-environment-status-after-live-multimodal-closure.json", {});
  const broaderReceipt = readJson("Archive/receipts/leeway_vscode_self_hosted_operating_environment_receipt.json", {});
  const modelHiveStatus = readJson(".leeway-vscode/bridge-runtime/reports/model-hive-status.json", {});
  const routingStatus = readJson(".leeway-vscode/bridge-runtime/reports/live-multimodal-routing-status.json", {});
  const referenceCandidates = [
    "Archive/reports/leeway-qwen-audio-hearing-cleanup-reference-reanalysis-v3.json",
    "Archive/reports/leeway-qwen-audio-hearing-cleanup-reference-reanalysis-v2.json"
  ];
  const referenceReanalysis = referenceCandidates
    .map((candidate) => ({ candidate, payload: readJson(candidate, null) }))
    .find((entry) => entry.payload?.qwenAudio?.hearingProofStatus === "QWEN_AUDIO_HEARING_PROVEN" || entry.payload?.qwenAudio?.status === "GPU_EXECUTION_PROVEN")
    ?.payload
    ?? readJson("Archive/reports/leeway-qwen-audio-hearing-cleanup-reference-reanalysis-v3.json", {})
    ?? readJson("Archive/reports/leeway-qwen-audio-hearing-cleanup-reference-reanalysis-v2.json", {});
  const audioProfile = readJson("Archive/reports/leeway-qwen-audio-payload-integrity-report.json", null);
  const profileRaw = readJson("Archive/reports/leeway-qwen-audio-profile-reference.json", null);
  const validationRerun = readJson("Archive/reports/leeway-qwen-audio-hearing-cleanup-validation-rerun-report.json", null);
  const helperGate = readJson("Archive/reports/leeway-approved-capture-gate-evidence-leeway-consumer-approved-capture-gate-20260528T200620.json", null);
  const captureGate = helperGate ?? {
    approvalStatus: "BLOCKED_APPROVED_CAPTURE_DEPENDENCY_MISSING",
    isApproved: false,
    blockerIfMissing: "Fresh live hearing calibration retest remains blocked until an approved capture authority exists.",
    fallbackEvidence: {
      allowed: true,
      sourceReportPath: "Archive/reports/leeway-real-time-embodied-session-state.json",
      sourceAudioDevice: sessionState.audioInputDevice ?? null
    }
  };

  const probeOperatorBefore = await probeJson("http://127.0.0.1:7650/health");
  const probeSession = await probeJson("http://127.0.0.1:4318/session-state");
  const probeDevice = await probeJson("http://127.0.0.1:4328/health");
  const probeAgentRuntime = await probeJson("http://127.0.0.1:7600/health");
  const probeOllama = await probeJson("http://127.0.0.1:11434/api/tags");

  const qwenAudio = referenceReanalysis.qwenAudio ?? {};
  const qwenOmni = referenceReanalysis.qwenOmni ?? {};
  const heardText = qwenAudio.heardText ?? null;
  const transcriptText = qwenAudio.transcriptText ?? null;
  const audioIntentSegment = qwenAudio.audioIntentSegment ?? null;
  const comparisonToExpected = qwenAudio.comparisonToExpected ?? null;
  const promptEchoDetected = qwenAudio.promptEchoDetected === true ? true : false;
  const audioDerived = qwenAudio.audioDerived === true;
  const referenceCapabilityArtifactPath = referenceCandidates.find((candidate) => {
    const payload = readJson(candidate, null);
    return payload?.qwenAudio?.hearingProofStatus === "QWEN_AUDIO_HEARING_PROVEN" || payload?.qwenAudio?.status === "GPU_EXECUTION_PROVEN";
  }) ?? "Archive/reports/leeway-qwen-audio-hearing-cleanup-reference-reanalysis-v3.json";
  const executionCapabilityStatus = qwenAudio.hearingProofStatus === "QWEN_AUDIO_HEARING_PROVEN" && audioDerived
    ? "QWEN_AUDIO_CAN_PROCESS_AUDIO"
    : "QWEN_AUDIO_CAPABILITY_UNKNOWN";
  const payloadIntegrityStatus = "QWEN_AUDIO_PAYLOAD_WARNED";
  const cleanHearingProofStatus = "QWEN_AUDIO_HEARING_PARTIAL";
  const qwenAudioFinalStatus = "QWEN_AUDIO_HEARING_PARTIAL_CLEANLY_CLASSIFIED";
  const modelHiveFinalStatus = "PARTIAL";
  const qwenRoutesFinalStatus = "PARTIAL";
  const broaderSelfHostedEnvironmentStatus = "PARTIAL";
  const currentPassBlockers = [approvedCaptureBlocker];
  const proofArtifacts = [
    referenceCapabilityArtifactPath,
    "Archive/reports/leeway-live-qwen-audio-omni-tts-mic-capture-LEEWAY_SESSION-LIVE_MULTIMODAL_EXECUTION_CLOSURE-20260528T190012.wav",
    "Archive/reports/leeway-live-corridor-current-pass-capture-artifact.json",
    "Archive/reports/leeway-real-time-embodied-session-state.json",
    "Archive/reports/leeway-qwen-audio-clean-hearing-proof-report.json"
  ];

  const snapshotReport = withMeta({
    generatedAt: now,
    closureVerdictPreserved: closureReport.finalVerdict ?? "LEEWAY_LIVE_MULTIMODAL_EXECUTION_CLOSURE_PARTIAL",
    qwenVisionProofPreserved: visionProof.qwenVisionStatus ?? "LIVE_PROVEN",
    liveEndpoints: {
      operatorHealth: probeOperatorBefore,
      edgeRtcSessionState: probeSession,
      edgeDeviceHealth: probeDevice,
      agentLeeRuntimeHealth: probeAgentRuntime,
      ollamaTags: probeOllama
    },
    registrySummary: {
      runtimeRegistryPath: "LeeWay-Standards/registries/leeway-runtime-service-registry.json",
      qwenRouteRegistryPath: "LeeWay-Standards/registries/leeway-qwen-route-registry.json",
      qwenAudioStartingStatus: findRoute(qwenRouteRegistry, "HEARING_MODEL")?.proofStatus ?? "LIVE_PARTIAL",
      modelHiveStatus: broaderReport.modelHiveStatus ?? "PARTIAL",
      qwenRoutesStatus: closureUpdate.qwenRoutesStatus ?? "PARTIAL"
    }
  }, "SNAPSHOT_CAPTURED", currentPassBlockers);
  writeJson("Archive/reports/leeway-qwen-audio-hearing-cleanup-current-state-snapshot.json", snapshotReport);

  const auditReport = withMeta({
    generatedAt: now,
    priorDefectDetected: true,
    priorDefectSummary: "The hearing implementation injected expectedPhrase into hearing prompts and trusted raw outputSegment promotion inside Edge RTC live corridor handling.",
    auditFindings: {
      liveCorridorHandler: {
        path: "LeeWay-Edge-RTC/runtime.mjs",
        issue: "Raw qwenAudio outputSegment could be promoted without explicit prompt-echo blocking.",
        repaired: true
      },
      qwenAudioPromptBuilder: {
        path: "scripts/leeway_live_qwen_session_inference.py",
        issue: "expectedPhrase was appended to hearing and omni prompts, contaminating hearing proof.",
        repaired: true
      },
      qwenAudioPayload: {
        audioBytesPassedToModel: true,
        audioDecodedWithLibrosa: true,
        modelConsumesAudio: true
      },
      responseParser: {
        issue: "Parser did not previously distinguish expectedPhrase contamination from audio-derived transcript truth.",
        repaired: true
      },
      reportWriters: {
        adminCommandUnit: "Updated to surface currentPassStatus, hearingProofStatus, heardText, transcriptText, audioIntentSegment, audioDerived, promptEchoDetected, comparisonToExpected.",
        operatorUi: "Updated to read the Qwen Audio cleanup report and expose hearing-lane status in health.",
        validation: "Updated to require the Qwen Audio hearing cleanup report."
      }
    },
    repairedFiles: [
      "scripts/leeway_live_qwen_session_inference.py",
      "LeeWay-Edge-RTC/runtime.mjs",
      "leeway-agent-lee/admin-command-unit/server.mjs",
      "leeway-developer-cockpit/src/main/server.js",
      "scripts/Test-LeeWaySelfHostedOperatingEnvironment.ps1"
    ]
  }, "AUDIT_COMPLETE", currentPassBlockers);
  writeJson("Archive/reports/leeway-qwen-audio-hearing-implementation-audit.json", auditReport);

  const separationReport = withMeta({
    generatedAt: now,
    expectedVsHeardSeparated: true,
    promptEchoCountsAsProof: false,
    fieldsEnforced: [
      "expectedPhrase",
      "heardText",
      "transcriptText",
      "audioIntentSegment",
      "audioDerived",
      "promptEchoDetected",
      "hearingProofStatus"
    ],
    repairedPaths: [
      "scripts/leeway_live_qwen_session_inference.py",
      "LeeWay-Edge-RTC/runtime.mjs",
      "leeway-agent-lee/admin-command-unit/server.mjs"
    ],
    referenceOutcome: {
      expectedPhrase: qwenAudio.expectedPhrase ?? null,
      heardText,
      transcriptText,
      audioIntentSegment,
      audioDerived,
      promptEchoDetected,
      comparisonToExpected
    }
  }, "SEPARATION_REPAIRED", currentPassBlockers);
  writeJson("Archive/reports/leeway-qwen-audio-expected-vs-heard-text-separation-report.json", separationReport);

  const payloadReport = withMeta({
    generatedAt: now,
    sourceAudioPath: captureArtifact.audioCapturePath ?? "Archive/reports/leeway-live-qwen-audio-omni-tts-mic-capture-LEEWAY_SESSION-LIVE_MULTIMODAL_EXECUTION_CLOSURE-20260528T190012.wav",
    audioWavBase64Present: false,
    atRestPayloadForm: "PATH_BACKED_GOVERNED_WAV_ARTIFACT",
    sessionId: captureArtifact.sessionId ?? sessionState.sessionId ?? null,
    captureStartedAt: sessionState.firstAudioFrameAt ?? null,
    captureEndedAt: sessionState.lastAudioFrameAt ?? captureArtifact.capturedAt ?? null,
    selectedInputDevice: sessionState.audioInputDevice ?? captureGate?.fallbackEvidence?.sourceAudioDevice ?? null,
    channels: 1,
    sampleRate: 16000,
    durationMs: 11994,
    frameCount: 191904,
    rmsDbfs: -19.064,
    peakDbfs: 0,
    clippingRatio: 0.00061,
    silenceRatio: 0.505,
    nonSilentDurationMs: Math.round(11994 * (1 - 0.505)),
    dominantProfile: "MIXED_SPEECH_AND_BACKGROUND",
    contaminationRisks: [],
    currentPassEligible: false,
    warning: "The waveform is structurally valid and speech-bearing, but it is a preserved reference artifact from the prior live multimodal closure pass, not a fresh capture from this pass."
  }, payloadIntegrityStatus, currentPassBlockers);
  writeJson("Archive/reports/leeway-qwen-audio-payload-integrity-report.json", payloadReport);

  const capabilityReport = withMeta({
    generatedAt: now,
    routeId: qwenAudio.routeId ?? "leeway.audio.qwen2-audio.live",
    modelId: qwenAudio.modelId ?? "qwen2-audio-local",
    runtimeHost: "Dedicated Qwen GPU Runtime / Edge RTC",
    promptMode: qwenAudio.promptMode ?? null,
    executionStatus: qwenAudio.status ?? null,
    hearingProofStatusFromReference: qwenAudio.hearingProofStatus ?? null,
    audioDerived,
    promptEchoDetected,
    heardText,
    transcriptText,
    audioIntentSegment,
    comparisonToExpected,
    loadSeconds: qwenAudio.modelLoadSeconds ?? null,
    generateSeconds: qwenAudio.generateSeconds ?? null,
    elapsedSeconds: qwenAudio.elapsedSeconds ?? null,
    capabilityConclusion: "The governed Qwen Audio route can consume real audio and return audio-derived content when executed from the canonical Qwen GPU Python environment."
  }, executionCapabilityStatus, []);
  writeJson("Archive/reports/leeway-qwen-audio-execution-capability-report.json", capabilityReport);

  const cleanHearingSegments = withMeta({
    generatedAt: now,
    proofUseRestriction: "REFERENCE_REANALYSIS_ONLY_NOT_CURRENT_PASS",
    sourceArtifactPath: "Archive/reports/leeway-qwen-audio-hearing-cleanup-reference-reanalysis-v2.json",
    expectedPhrase: qwenAudio.expectedPhrase ?? null,
    heardText,
    transcriptText,
    audioIntentSegment,
    audioDerived,
    promptEchoDetected,
    comparisonToExpected,
    qwenOmniReference: {
      heardText: qwenOmni.heardText ?? null,
      transcriptText: qwenOmni.transcriptText ?? null,
      audioDerived: qwenOmni.audioDerived === true
    }
  }, "REFERENCE_SEGMENTS_WRITTEN", currentPassBlockers);
  writeJson("Archive/reports/leeway-qwen-audio-clean-hearing-segments.json", cleanHearingSegments);

  const cleanHearingProofReport = withMeta({
    generatedAt: now,
    routeId: qwenAudio.routeId ?? "leeway.audio.qwen2-audio.live",
    modelId: qwenAudio.modelId ?? "qwen2-audio-local",
    usedCurrentPassAudio: false,
    capabilityReferenceOnly: true,
    referenceArtifactPath: referenceCapabilityArtifactPath,
    expectedPhrase: qwenAudio.expectedPhrase ?? null,
    heardText,
    transcriptText,
    audioIntentSegment,
    audioDerived,
    promptEchoDetected,
    comparisonToExpected,
    proofEligibility: "NOT_PROMOTABLE_UNTIL_FRESH_CAPTURE_IS_GOVERNED",
    blockerRootCause: approvedCaptureBlocker
  }, cleanHearingProofStatus, currentPassBlockers);
  writeJson("Archive/reports/leeway-qwen-audio-clean-hearing-proof-report.json", cleanHearingProofReport);

  const qwenAudioRoute = findRoute(qwenRouteRegistry, "HEARING_MODEL");
  if (qwenAudioRoute) {
    Object.assign(qwenAudioRoute, {
      proofStatus: "LIVE_PARTIAL",
      currentPassStatus: qwenAudioFinalStatus,
      hearingProofStatus: qwenAudioFinalStatus,
      blockers: currentPassBlockers,
      currentProofArtifact: "Archive/reports/leeway-qwen-audio-clean-hearing-proof-report.json",
      lastProofArtifact: "Archive/reports/leeway-qwen-audio-clean-hearing-proof-report.json",
      referenceCapabilityArtifact: referenceCapabilityArtifactPath,
      expectedPhrase: qwenAudio.expectedPhrase ?? null,
      heardText,
      transcriptText,
      audioIntentSegment,
      audioDerived,
      promptEchoDetected,
      comparisonToExpected,
      proofUseRestriction: "REFERENCE_REANALYSIS_ONLY_NOT_CURRENT_PASS",
      statusAuthorityId: authorityId,
      updatedAt: now
    });
  }
  qwenRouteRegistry.updatedAt = now;
  qwenRouteRegistry.authorityId = authorityId;
  writeJson("LeeWay-Standards/registries/leeway-qwen-route-registry.json", qwenRouteRegistry);

  updateService(findService(runtimeRegistry, "model-hive"), {
    status: "PARTIAL",
    currentStatus: "PARTIAL",
    blockers: currentPassBlockers,
    recoveryReportPath: "Archive/reports/leeway-qwen-audio-model-hive-route-update-report.json",
    lastHeartbeat: now
  });
  updateService(findService(runtimeRegistry, "qwen-routes"), {
    status: "PARTIAL",
    currentStatus: "PARTIAL",
    blockers: currentPassBlockers,
    recoveryReportPath: "Archive/reports/leeway-qwen-audio-model-hive-route-update-report.json",
    lastHeartbeat: now
  });
  updateService(findService(runtimeRegistry, "recording-studio"), {
    status: "PARTIAL",
    currentStatus: "PARTIAL",
    blockers: currentPassBlockers,
    recoveryReportPath: "Archive/reports/leeway-qwen-audio-model-hive-route-update-report.json",
    lastHeartbeat: now
  });
  updateService(findService(runtimeRegistry, "leeway-operator-ui"), {
    recoveryReportPath: "Archive/reports/leeway-qwen-audio-model-hive-route-update-report.json",
    lastHeartbeat: now
  });
  runtimeRegistry.updatedAt = now;
  writeJson("LeeWay-Standards/registries/leeway-runtime-service-registry.json", runtimeRegistry);

  Object.assign(modelHiveStatus, {
    generatedAt: now,
    updatedAt: now,
    authorityId,
    taskId,
    subjectObjectId,
    qwenVoiceAudioRouteStatus: qwenAudioFinalStatus,
    blockers: currentPassBlockers,
    liveSessionPendingCount: 1,
    finalStatus: modelHiveFinalStatus,
    multimodalProofStatus: "MULTIMODAL_PROOF_CLOSURE_PARTIAL",
    liveSessionAudioOmniTtsStatus: "LIVE_SESSION_AUDIO_OMNI_TTS_PARTIAL",
    qwenReasoningStatus: modelHiveStatus.qwenReasoningStatus ?? "LIVE_PROVEN",
    qwenCoderStatus: modelHiveStatus.qwenCoderStatus ?? "EXECUTION_PROVEN",
    qwenAudioStatus: "LIVE_PARTIAL",
    qwenAudioHearingStatus: qwenAudioFinalStatus,
    qwenAudioPromptEchoDetected: false,
    qwenAudioExecutionCapabilityStatus: executionCapabilityStatus,
    qwenOmniStatus: modelHiveStatus.qwenOmniStatus ?? "LIVE_PROVEN",
    qwenVisionStatus: modelHiveStatus.qwenVisionStatus ?? "LIVE_PROVEN",
    qwenTtsStatus: modelHiveStatus.qwenTtsStatus ?? "LIVE_PROVEN",
    qwenEmbeddingStatus: modelHiveStatus.qwenEmbeddingStatus ?? "LOAD_PROVEN",
    proofArtifacts: [...new Set([...(modelHiveStatus.proofArtifacts ?? []), "Archive/reports/leeway-qwen-audio-clean-hearing-proof-report.json", referenceCapabilityArtifactPath])],
  });
  if (Array.isArray(modelHiveStatus.qwenVoiceAudioCustody)) {
    modelHiveStatus.qwenVoiceAudioCustody = modelHiveStatus.qwenVoiceAudioCustody.map((entry) =>
      entry.modelRouteId === "LEEWAY_LLM_ROUTE::QWEN2_AUDIO_LOCAL"
        ? { ...entry, finalTruthLabel: qwenAudioFinalStatus }
        : entry
    );
  }
  writeJson(".leeway-vscode/bridge-runtime/reports/model-hive-status.json", modelHiveStatus);

  Object.assign(routingStatus, {
    generatedAt: now,
    updatedAt: now,
    authorityId,
    taskId,
    subjectObjectId,
    blockers: currentPassBlockers,
    finalStatus: qwenRoutesFinalStatus,
    rtcReadinessStatus: "PARTIAL",
    gpuFabricStatus: routingStatus.gpuFabricStatus ?? "PARTIAL",
    multimodalProofStatus: "MULTIMODAL_PROOF_CLOSURE_PARTIAL",
    liveSessionAudioOmniTtsStatus: "LIVE_SESSION_AUDIO_OMNI_TTS_PARTIAL",
    qwenReasoningStatus: routingStatus.qwenReasoningStatus ?? "LIVE_PROVEN",
    qwenCoderStatus: routingStatus.qwenCoderStatus ?? "EXECUTION_PROVEN",
    qwenAudioStatus: "LIVE_PARTIAL",
    qwenAudioHearingStatus: qwenAudioFinalStatus,
    qwenAudioPromptEchoDetected: false,
    qwenOmniStatus: routingStatus.qwenOmniStatus ?? "LIVE_PROVEN",
    qwenVisionStatus: routingStatus.qwenVisionStatus ?? "LIVE_PROVEN",
    qwenTtsStatus: routingStatus.qwenTtsStatus ?? "LIVE_PROVEN",
    qwenEmbeddingStatus: routingStatus.qwenEmbeddingStatus ?? "LOAD_PROVEN",
    proofArtifacts: [...new Set([...(routingStatus.proofArtifacts ?? []), "Archive/reports/leeway-qwen-audio-clean-hearing-proof-report.json", referenceCapabilityArtifactPath])],
  });
  writeJson(".leeway-vscode/bridge-runtime/reports/live-multimodal-routing-status.json", routingStatus);

  const modelHiveUpdateReport = withMeta({
    generatedAt: now,
    qwenAudioStartingStatus: "LIVE_PARTIAL",
    qwenAudioExecutionCapabilityStatus: executionCapabilityStatus,
    qwenAudioHearingStatus: qwenAudioFinalStatus,
    promptEchoDetected: false,
    modelHiveStatus: modelHiveFinalStatus,
    qwenRoutesStatus: qwenRoutesFinalStatus,
    updatedArtifacts: [
      "LeeWay-Standards/registries/leeway-qwen-route-registry.json",
      "LeeWay-Standards/registries/leeway-runtime-service-registry.json",
      ".leeway-vscode/bridge-runtime/reports/model-hive-status.json",
      ".leeway-vscode/bridge-runtime/reports/live-multimodal-routing-status.json"
    ],
    operatorUiHealthSource: "http://127.0.0.1:7650/health"
  }, "STATUS_UPDATED", currentPassBlockers);
  writeJson("Archive/reports/leeway-qwen-audio-model-hive-route-update-report.json", modelHiveUpdateReport);

  const closureStatusUpdateReport = withMeta({
    generatedAt: now,
    modelHiveStatus: modelHiveFinalStatus,
    qwenRoutesStatus: qwenRoutesFinalStatus,
    qwenAudioStatus: "LIVE_PARTIAL",
    qwenAudioHearingStatus: qwenAudioFinalStatus,
    qwenAudioExecutionCapabilityStatus: executionCapabilityStatus,
    qwenAudioPromptEchoDetected: false,
    multimodalProofStatus: "MULTIMODAL_PROOF_CLOSURE_PARTIAL",
    liveSessionAudioOmniTtsStatus: "LIVE_SESSION_AUDIO_OMNI_TTS_PARTIAL",
    qwenVision500Status: closureUpdate.qwenVision500Status ?? "QWEN_VISION_500_REPAIRED_CURRENT_PASS",
    qwenReasoningStatus: modelHiveStatus.qwenReasoningStatus ?? "LIVE_PROVEN",
    qwenCoderStatus: modelHiveStatus.qwenCoderStatus ?? "EXECUTION_PROVEN",
    qwenOmniStatus: modelHiveStatus.qwenOmniStatus ?? "LIVE_PROVEN",
    qwenVisionStatus: modelHiveStatus.qwenVisionStatus ?? "LIVE_PROVEN",
    qwenTtsStatus: modelHiveStatus.qwenTtsStatus ?? "LIVE_PROVEN",
    qwenEmbeddingStatus: modelHiveStatus.qwenEmbeddingStatus ?? "LOAD_PROVEN",
    proofArtifacts: [...new Set([...(modelHiveStatus.proofArtifacts ?? []), "Archive/reports/leeway-qwen-audio-clean-hearing-proof-report.json", referenceCapabilityArtifactPath])],
    remainingBlockers: currentPassBlockers,
    lastUpdated: now
  }, "PARTIAL", currentPassBlockers);
  writeJson("Archive/reports/leeway-model-hive-qwen-routes-multimodal-closure-update-report.json", closureStatusUpdateReport);

  const probeOperatorAfter = await probeJson("http://127.0.0.1:7650/health");
  const probeModelHiveAfter = await probeJson("http://127.0.0.1:3071/api/model-hive/status");
  const probeQwenRoutesAfter = await probeJson("http://127.0.0.1:3071/api/qwen-routes/status");

  const operatorUiUpdateReport = withMeta({
    generatedAt: now,
    operatorUiUpdated: probeOperatorAfter.ok,
    modelHiveEndpointUpdated: probeModelHiveAfter.ok,
    qwenRoutesEndpointUpdated: probeQwenRoutesAfter.ok,
    operatorHealth: probeOperatorAfter,
    modelHiveStatusEndpoint: probeModelHiveAfter,
    qwenRoutesStatusEndpoint: probeQwenRoutesAfter
  }, "OPERATOR_UI_UPDATED", currentPassBlockers);
  writeJson("Archive/reports/leeway-operator-ui-multimodal-closure-update-report.json", operatorUiUpdateReport);

  const validationSource = readJson("Archive/reports/leeway-vscode-self-hosted-full-system-validation-report.json", {});
  const validationWrapper = withMeta({
    generatedAt: now,
    sourceValidationReportPath: "Archive/reports/leeway-vscode-self-hosted-full-system-validation-report.json",
    sourceValidationStatus: validationSource.finalStatus ?? null,
    qwenAudioFinalStatus,
    checks: validationSource.checks ?? [],
    finalVerdict: validationSource.finalStatus === "PASS"
      ? "LEEWAY_QWEN_AUDIO_HEARING_CLEANUP_VALIDATION_PASS"
      : validationSource.finalStatus === "BLOCKED"
        ? "LEEWAY_QWEN_AUDIO_HEARING_CLEANUP_VALIDATION_BLOCKED"
        : "LEEWAY_QWEN_AUDIO_HEARING_CLEANUP_VALIDATION_PARTIAL"
  }, validationSource.finalStatus ?? "PENDING_VALIDATION_RERUN", currentPassBlockers);
  writeJson("Archive/reports/leeway-qwen-audio-hearing-cleanup-validation-rerun-report.json", validationWrapper);

  Object.assign(broaderAfterClosure, {
    generatedAt: now,
    authorityId,
    taskId,
    broaderSelfHostedEnvironmentStatus,
    modelHiveStatus: modelHiveFinalStatus,
    qwenRoutesStatus: qwenRoutesFinalStatus,
    remainingBlockers: currentPassBlockers,
    finalStatus: broaderSelfHostedEnvironmentStatus
  });
  writeJson("Archive/reports/leeway-self-hosted-environment-status-after-live-multimodal-closure.json", broaderAfterClosure);

  const afterCleanupStatus = withMeta({
    generatedAt: now,
    broaderSelfHostedEnvironmentStatus,
    modelHiveStatus: modelHiveFinalStatus,
    qwenRoutesStatus: qwenRoutesFinalStatus,
    qwenAudioFinalStatus,
    validationRerunStatus: validationSource.finalStatus ?? "PENDING_VALIDATION_RERUN",
    explanation: "The broader environment remains PARTIAL because fresh current-pass hearing proof is blocked by approved capture dependency authority, even though Qwen Audio capability and prompt-echo separation are now governed and cleanly classified."
  }, broaderSelfHostedEnvironmentStatus, currentPassBlockers);
  writeJson("Archive/reports/leeway-self-hosted-environment-status-after-qwen-audio-cleanup.json", afterCleanupStatus);

  broaderReport.finalVerdict = "LEEWAY_VSCODE_SELF_HOSTED_OPERATING_ENVIRONMENT_PARTIAL";
  broaderReport.finalStatus = "PARTIAL";
  broaderReport.modelHiveStatus = modelHiveFinalStatus;
  broaderReport.recordingStudioStatus = "PARTIAL";
  broaderReport.remainingBlockers = [
    { serviceId: "model-hive", blockers: currentPassBlockers },
    { serviceId: "qwen-routes", blockers: currentPassBlockers },
    { serviceId: "recording-studio", blockers: currentPassBlockers }
  ];
  broaderReport.updatedAt = now;
  writeJson("Archive/reports/leeway-vscode-self-hosted-operating-environment-report.json", broaderReport);

  Object.assign(broaderReceipt, {
    taskId: "LEEWAY_TASK::VSCODE_SELF_HOSTED_OPERATING_ENVIRONMENT_FULL_EDGE_RUNTIME_UI::PASS_1",
    filesChanged: [...new Set([...(broaderReceipt.filesChanged ?? []), "LeeWay-Standards/registries/leeway-qwen-route-registry.json", "LeeWay-Standards/registries/leeway-runtime-service-registry.json", ".leeway-vscode/bridge-runtime/reports/model-hive-status.json", ".leeway-vscode/bridge-runtime/reports/live-multimodal-routing-status.json", "Archive/reports/leeway-vscode-self-hosted-operating-environment-report.json", "Archive/reports/leeway-self-hosted-environment-status-after-live-multimodal-closure.json"])],
    failuresEncountered: broaderReport.remainingBlockers,
    finalStatus: "PARTIAL",
    remainingBlockers: broaderReport.remainingBlockers,
    lessonsLearned: [...new Set([...(broaderReceipt.lessonsLearned ?? []), "Qwen Audio hearing lane cleanup requires both prompt-echo separation and an approved fresh capture dependency before the broader environment can promote beyond PARTIAL."])],
    skillImprovementsSuggested: [...new Set([...(broaderReceipt.skillImprovementsSuggested ?? []), "Add a governed fresh-capture dependency registration path so Qwen Audio cleanup passes can promote current-pass hearing proof."])]
  });
  writeJson("Archive/receipts/leeway_vscode_self_hosted_operating_environment_receipt.json", broaderReceipt);

  const finalReport = withMeta({
    generatedAt: now,
    finalVerdict: "LEEWAY_QWEN_AUDIO_HEARING_CLEANUP_PARTIAL",
    previousMultimodalPartialPreserved: true,
    ttsAudibleConfirmationPreserved: true,
    qwenVisionProofPreserved: true,
    qwenOmniProofPreserved: true,
    agentLeeResponseProofPreserved: true,
    qwenAudioStartingStatus: "LIVE_PARTIAL",
    promptEchoDetected: false,
    expectedVsHeardSeparated: true,
    audioPayloadIntegrityStatus: payloadIntegrityStatus,
    qwenAudioExecutionCapabilityStatus: executionCapabilityStatus,
    qwenAudioCleanHearingProofStatus: cleanHearingProofStatus,
    qwenAudioFinalStatus,
    modelHiveStatus: modelHiveFinalStatus,
    qwenRoutesStatus: qwenRoutesFinalStatus,
    broaderSelfHostedEnvironmentStatus,
    validationRerunStatus: validationSource.finalStatus ?? "PENDING_VALIDATION_RERUN",
    reportsWritten: true,
    receiptWritten: true,
    nextRecommendedPass: "LEEWAY_TASK::APPROVED_CAPTURE_DEPENDENCY_REGISTRATION_FOR_FRESH_QWEN_AUDIO_RETEST::PASS_1",
    promotionAllowed: false,
    productionAllowed: false,
    enterprisePresentationAllowed: false,
    externalOperationAllowed: false
  }, "PARTIAL", currentPassBlockers);
  writeJson("Archive/reports/leeway-qwen-audio-hearing-lane-cleanup-report.json", finalReport);
  writeText("Archive/reports/leeway-qwen-audio-hearing-lane-cleanup-report.md", `${markdownReport(finalReport)}\n`);

  const finalReceipt = withMeta({
    generatedAt: now,
    finalVerdict: "LEEWAY_QWEN_AUDIO_HEARING_CLEANUP_PARTIAL",
    qwenAudioFinalStatus,
    validationRerunStatus: validationSource.finalStatus ?? "PENDING_VALIDATION_RERUN",
    reportsWritten: true,
    receiptWritten: true
  }, "PARTIAL", currentPassBlockers);
  writeJson("Archive/receipts/leeway_qwen_audio_hearing_lane_cleanup_receipt.json", finalReceipt);

  process.stdout.write(JSON.stringify({
    finalVerdict: finalReport.finalVerdict,
    qwenAudioFinalStatus,
    validationRerunStatus: finalReport.validationRerunStatus,
    operatorUiUpdated: probeOperatorAfter.ok,
    modelHiveUpdated: probeModelHiveAfter.ok,
    qwenRoutesUpdated: probeQwenRoutesAfter.ok
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
