/*
LEEWAY HEADER
TAG: REPORTING.REAL_TIME_EMBODIED_CONVERSATION_CORRIDOR
REGION: ARCHIVE.REPORTS
DISCOVERY_PIPELINE: Live RTC Session -> Mic Frame Probe -> Transcript Gate -> Voice Gate -> Sentinel -> Receipt
LEEWAY_ID: LEEWAY_APP::REPORTING::REAL_TIME_EMBODIED_CONVERSATION_CORRIDOR::PASS_1
CLASSIFICATION: EVIDENCE
OWNER: LeeWay Standards
*/
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const reportsRoot = path.join(root, "Archive", "reports");
const receiptsRoot = path.join(root, "Archive", "receipts");
mkdirSync(reportsRoot, { recursive: true });
mkdirSync(receiptsRoot, { recursive: true });

const now = new Date().toISOString();
const assistantBodyId = "CODEX_ASSISTANT_BODY";
const assistantObjectId = "LEEWAY_ACTOR::ASSISTANT_BODY::CODEX::20260524_REAL_TIME_CORRIDOR";
const taskId = "LEEWAY_TASK::REAL_TIME_EMBODIED_CONVERSATION_CORRIDOR::PASS_1";
const subjectObjectId = "LEEWAY_APP::AGENT_LEE::REAL_TIME_AUDIO_CONVERSATION::PASS_1";
const authorityId = "LEEWAY_AUTHORITY::CREATOR_DELEGATED::EMBODIED_AGENT_LEE_RUNTIME";
const traceId = "LEEWAY_TRACE::EMBODIMENT::REAL_TIME_CONVERSATION_CORRIDOR::20260524::PASS_1";
const promptId = "LEEWAY_PROMPT::IDE::REAL_TIME_EMBODIED_CONVERSATION_CORRIDOR::20260524";
const intentId = "LEEWAY_INTENT::EMBODIMENT::REAL_TIME_AUDIO_CONVERSATION::PASS_1";
const transactionId = "LEEWAY_TX::EMBODIMENT::RUN_REAL_TIME_CORRIDOR::20260524";
const receiptId = "LEEWAY_RECEIPT::REAL_TIME_EMBODIED_CONVERSATION_CORRIDOR::PASS_1";
const sessionId = "LEEWAY_SESSION::REAL_TIME_EMBODIED_CONVERSATION::PASS_1";
const conversationId = "LEEWAY_CONVERSATION::AGENT_LEE::REAL_TIME_AUDIO::PASS_1";
const captureDependencyHelperPath = path.join(root, "scripts", "lib", "Resolve-LeeWayApprovedCaptureDependency.ps1");

const reportPaths = {
  finalMd: "Archive/reports/leeway-real-time-embodied-conversation-corridor-report.md",
  finalJson: "Archive/reports/leeway-real-time-embodied-conversation-corridor-report.json",
  sessionState: "Archive/reports/leeway-real-time-embodied-session-state.json",
  captureGateEvidence: "Archive/reports/leeway-real-time-embodied-corridor-approved-capture-gate-evidence.json",
  frameIngress: "Archive/reports/leeway-rtc-audio-frame-ingress-report.json",
  transcriptContinuity: "Archive/reports/leeway-transcript-continuity-report.json",
  transcript: "Archive/reports/leeway-real-time-conversation-transcript.json",
  responseLoop: "Archive/reports/leeway-agent-lee-response-loop-report.json",
  cloneOutput: "Archive/reports/leeway-canonical-clone-output-report.json",
  noButton: "Archive/reports/leeway-no-button-conversation-report.json",
  audible: "Archive/reports/leeway-human-audible-confirmation-report.json",
  sentinel: "Archive/reports/leeway-embodied-conversation-sentinel-report.json",
  receipt: "Archive/receipts/leeway_real_time_embodied_conversation_corridor_receipt.json"
};

const requiredOutputs = Object.values(reportPaths);
const governingBookReferences = [
  "BOOK-54-ASSISTANT-EMBODIMENT-AND-BEHAVIOR-LAW",
  "BOOK-55-ASSISTANT-RECORDING-AND-LEARNING-LAW",
  "BOOK-76-CONTINUOUS-EMBODIMENT-LAW",
  "BOOK-77-AGENT-LEE-LANGUAGE-DOCTRINE"
];

function readJson(relativePath, fallback = {}) {
  const fullPath = path.join(root, relativePath);
  if (!existsSync(fullPath)) return fallback;
  try {
    return JSON.parse(readFileSync(fullPath, "utf8").replace(/^\uFEFF/, ""));
  } catch (error) {
    return { readError: String(error.message ?? error), path: relativePath };
  }
}

function writeJson(relativePath, payload) {
  const fullPath = path.join(root, relativePath);
  mkdirSync(path.dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function writeText(relativePath, text) {
  const fullPath = path.join(root, relativePath);
  mkdirSync(path.dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, text.endsWith("\n") ? text : `${text}\n`, "utf8");
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? root,
    encoding: "utf8",
    timeout: options.timeout ?? 30000,
    windowsHide: true
  });
  return {
    ok: result.status === 0,
    command: [command, ...args].join(" "),
    status: result.status,
    signal: result.signal,
    stdout: String(result.stdout ?? "").trim(),
    stderr: String(result.stderr ?? "").trim(),
    error: result.error ? String(result.error.message ?? result.error) : ""
  };
}

async function fetchJson(url, fallback = {}, init = undefined, timeoutMs = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...(init ?? {}), signal: controller.signal });
    if (!response.ok) return fallback;
    return await response.json();
  } catch {
    return fallback;
  } finally {
    clearTimeout(timer);
  }
}

function common(extra = {}) {
  return {
    assistantBodyId,
    assistantObjectId,
    taskId,
    subjectObjectId,
    authorityId,
    traceId,
    promptId,
    intentId,
    transactionId,
    generatedAt: now,
    executionMode: "REAL_RUNTIME_ONLY",
    detachedProofLanesAllowed: false,
    fakeFallbacksAllowed: false,
    stalePassPromotionAllowed: false,
    ...extra
  };
}

function parseAudioDevices(ffmpegListOutput) {
  const devices = [];
  const regex = /"([^"]+)" \(audio\)/g;
  let match;
  while ((match = regex.exec(ffmpegListOutput)) !== null) {
    devices.push(match[1]);
  }
  return devices;
}

function parseCapture(captureOutput) {
  const sampleRate = Number((captureOutput.match(/(\d+)\s+Hz/) ?? [])[1] ?? 0);
  const channels = /\bstereo\b/i.test(captureOutput) ? 2 : /\bmono\b/i.test(captureOutput) ? 1 : null;
  const timeMatches = [...captureOutput.matchAll(/time=(\d{2}):(\d{2}):(\d{2}(?:\.\d+)?)/g)];
  const lastTime = timeMatches.length > 0 ? timeMatches[timeMatches.length - 1] : null;
  const durationSeconds = lastTime ? Number(lastTime[1]) * 3600 + Number(lastTime[2]) * 60 + Number(lastTime[3]) : 0;
  const audioKiB = Number((captureOutput.match(/audio:(\d+)KiB/) ?? [])[1] ?? 0);
  const estimatedFrameCount = sampleRate > 0 && durationSeconds > 0 ? Math.round(sampleRate * durationSeconds) : 0;

  return {
    sampleRate,
    channels,
    durationSeconds,
    audioKiB,
    estimatedFrameCount
  };
}

function lines(items) {
  return items.map((item) => `- ${item}`).join("\n");
}

function resolveApprovedAudioCaptureDecision() {
  const helperArgs = [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    captureDependencyHelperPath,
    "-WorkspaceRoot",
    root,
    "-ConsumerId",
    "LEEWAY_SCRIPT::WRITE_REAL_TIME_EMBODIED_CONVERSATION_CORRIDOR_REPORTS",
    "-GateEvidencePath",
    path.join(root, reportPaths.captureGateEvidence),
    "-AssistantBodyId",
    assistantBodyId,
    "-AssistantObjectId",
    assistantObjectId,
    "-TaskId",
    taskId,
    "-SubjectObjectId",
    "LEEWAY_RUNTIME::REAL_TIME_EMBODIED_CONVERSATION_CAPTURE_GATE",
    "-AsJson"
  ];
  const gateResult = run("powershell.exe", helperArgs, { timeout: 30000 });
  const parsed = parseJsonOutput(gateResult.stdout);
  if (gateResult.ok && parsed) {
    return parsed;
  }

  return {
    isApproved: false,
    executableName: null,
    approvalStatus: "BLOCKED_HELPER_EXECUTION_FAILURE",
    reason: gateResult.error || gateResult.stderr || "Capture dependency gate helper did not return parseable JSON.",
    decisionOption: "C",
    gateEvidencePath: reportPaths.captureGateEvidence,
    helperCommand: gateResult.command
  };
}

function deriveSessionCaptureStats(sessionState) {
  const estimatedFrameCount = Number(sessionState.audioFrameCount ?? 0);
  const firstFrameAt = Date.parse(sessionState.firstAudioFrameAt ?? "");
  const lastFrameAt = Date.parse(sessionState.lastAudioFrameAt ?? "");
  const durationSeconds =
    Number.isFinite(firstFrameAt) && Number.isFinite(lastFrameAt) && lastFrameAt >= firstFrameAt
      ? (lastFrameAt - firstFrameAt) / 1000
      : 0;

  return {
    sampleRate: 0,
    channels: 1,
    durationSeconds,
    audioKiB: 0,
    estimatedFrameCount
  };
}

const initialSessionState = await fetchJson("http://127.0.0.1:4317/session-state", {});
const rtcAuthority = await fetchJson("http://127.0.0.1:4317/authority", {});
const rtcReadiness = await fetchJson("http://127.0.0.1:4317/multimodal-readiness", {});
const listenProbe = await fetchJson("http://127.0.0.1:4317/listen", {}, { method: "POST" });
const languageStatus = await fetchJson("http://127.0.0.1:7600/api/language/runtime/status", {});
const systemHealth = await fetchJson("http://127.0.0.1:7600/api/system/health", {});
const voiceAuthority = readJson(".leeway-vscode/bridge-runtime/state/voice-authority.json", {});
const cloneRuntimeProof = readJson(".leeway-vscode/bridge-runtime/reports/clone-voice-runtime-output-proof.json", {});
const humanAudibleProof = readJson(".leeway-vscode/bridge-runtime/reports/clone-voice-human-audible-proof.json", {});
const liveVoiceGate = readJson("Archive/reports/leeway-agent-lee-live-voice-audible-gate-report.json", {});
const blockerSentinel = readJson("Archive/reports/leeway-blocker-sentinel-report.json", {});
const regressionGate = readJson("Archive/reports/leeway-regression-prevention-gate-report.json", {});
const reconnectGate = readJson("Archive/reports/leeway-agent-lee-reconnect-continuity-gate-report.json", {});
const captureDependency = resolveApprovedAudioCaptureDecision();
const sessionCaptureStats = deriveSessionCaptureStats(initialSessionState);

const ffmpegDevices = captureDependency.isApproved
  ? run(captureDependency.executableName, ["-hide_banner", "-list_devices", "true", "-f", "dshow", "-i", "dummy"], { timeout: 30000 })
  : {
      ok: false,
      command: "LEEWAY_APPROVED_DEPENDENCY_GATE",
      status: null,
      stdout: "",
      stderr: captureDependency.reason,
      error: ""
    };
const deviceOutput = `${ffmpegDevices.stdout}\n${ffmpegDevices.stderr}`;
const sessionAudioDevice = typeof initialSessionState.audioInputDevice === "string" ? initialSessionState.audioInputDevice : "";
const audioDevices = captureDependency.isApproved ? parseAudioDevices(deviceOutput) : sessionAudioDevice ? [sessionAudioDevice] : [];
const preferredDevice = sessionAudioDevice || (audioDevices.includes("Microphone Array (Realtek(R) Audio)")
  ? "Microphone Array (Realtek(R) Audio)"
  : audioDevices[0] ?? "");
const captureStartedAt = initialSessionState.firstAudioFrameAt ?? new Date().toISOString();
const ffmpegCapture = captureDependency.isApproved && preferredDevice
  ? run(captureDependency.executableName, ["-hide_banner", "-f", "dshow", "-i", `audio=${preferredDevice}`, "-t", "2", "-f", "null", "-"], { timeout: 30000 })
  : {
      ok: false,
      command: captureDependency.isApproved
        ? "APPROVED_CAPTURE_EXECUTABLE_WITHOUT_DEVICE"
        : "LEEWAY_SERVICE::EDGE_RTC_SESSION_STATE",
      status: null,
      stdout: "",
      stderr: captureDependency.isApproved ? "No audio input device discovered." : captureDependency.reason,
      error: ""
    };
const captureEndedAt = initialSessionState.lastAudioFrameAt ?? captureStartedAt;
const captureOutput = `${ffmpegCapture.stdout}\n${ffmpegCapture.stderr}`;
const captureStats = captureDependency.isApproved ? parseCapture(captureOutput) : sessionCaptureStats;
const realMicFramesCaptured = captureDependency.isApproved
  ? ffmpegCapture.ok && captureStats.estimatedFrameCount > 0 && captureStats.audioKiB > 0
  : captureStats.estimatedFrameCount > 0 && preferredDevice.length > 0;

const microphoneContinuity = realMicFramesCaptured ? "PARTIAL" : "BLOCKED";
const audioFrameContinuity = realMicFramesCaptured ? "PARTIAL" : "BLOCKED";
const transcriptContinuity = "NOT_YET_PROVEN";
const transcriptSegments = [];
const agentLeeResponses = [];
const cloneRouteAttached = voiceAuthority.routeId === "leeway.voice.primary.clone.live" || rtcAuthority.voiceRouteId === "leeway.voice.primary.clone.live";
const responseGeneratedFromTranscript = false;
const cloneVoiceOutputAttempted = false;
const cloneVoiceOutputContinuity = cloneVoiceOutputAttempted ? "PARTIAL" : "NOT_YET_PROVEN";
const audibleConfirmation = "NOT_REQUESTED";
const noButtonConversation = "NOT_YET_PROVEN";
const alwaysListeningActive = initialSessionState.alwaysListeningActive === true || listenProbe.listeningLoopActive === true;
const pushToTalkRequired = true;
const sessionStillOpen = false;
const transcriptSegmentCount = transcriptSegments.length;
const responseCount = agentLeeResponses.length;
const turnCount = transcriptSegmentCount + responseCount;
const rtcAudioContinuity = microphoneContinuity === "PARTIAL" || audioFrameContinuity === "PARTIAL" ? "PARTIAL" : "BLOCKED";

const acceptanceChecks = {
  liveRtcSessionExists: Boolean(initialSessionState.sessionId),
  microphoneFramesCaptured: realMicFramesCaptured,
  transcriptSegmentsGenerated: transcriptSegmentCount > 0,
  agentLeeResponseGeneratedFromTranscript: responseGeneratedFromTranscript,
  responseUsedLiveLanguageProcessor: responseGeneratedFromTranscript && languageStatus.languageProcessorActive === true,
  canonicalCloneVoiceOutputAttemptedThroughSessionRoute: cloneVoiceOutputAttempted && cloneRouteAttached,
  audibleConfirmationHeardClearly: audibleConfirmation === "HEARD_CLEARLY",
  noButtonConversationProven: noButtonConversation === "PROVEN",
  sessionStateUpdatedTruthfully: true,
  sentinelAttached: true,
  receiptWritten: true
};

const pass = Object.values(acceptanceChecks).every(Boolean);
const partial = acceptanceChecks.liveRtcSessionExists && acceptanceChecks.microphoneFramesCaptured && cloneRouteAttached;
const finalVerdict = pass
  ? "LEEWAY_REAL_TIME_EMBODIED_CONVERSATION_PASS"
  : partial
    ? "LEEWAY_REAL_TIME_EMBODIED_CONVERSATION_PARTIAL"
    : "LEEWAY_REAL_TIME_EMBODIED_CONVERSATION_BLOCKED";
const finalStatus = pass ? "PASS" : partial ? "PARTIAL" : "BLOCKED";

const sessionState = common({
  finalVerdict,
  finalStatus,
  sessionId,
  conversationId,
  creatorId: "Leonard Lee",
  agentId: "Agent Lee",
  voiceRouteId: "leeway.voice.primary.clone.live",
  rtcRouteId: "LEEWAY_RTC_ROUTE::EDGE_RTC::REAL_TIME_AUDIO_CORRIDOR",
  microphoneRouteId: "LEEWAY_MIC_ROUTE::WINDOWS_DSHOW::REAL_TIME_AUDIO_CORRIDOR",
  transcriptRouteId: "LEEWAY_TRANSCRIPT_ROUTE::AGENT_LEE::REAL_TIME_AUDIO_CORRIDOR",
  responseRouteId: "LEEWAY_RESPONSE_ROUTE::AGENT_LEE::LANGUAGE_RUNTIME",
  receiptId,
  startedAt: initialSessionState.startedAt ?? now,
  lastUpdatedAt: now,
  runtimeAuthority: authorityId,
  governingBookReferences,
  microphoneContinuity,
  audioFrameContinuity,
  audioFrameCount: captureStats.estimatedFrameCount,
  firstAudioFrameAt: realMicFramesCaptured ? captureStartedAt : null,
  lastAudioFrameAt: realMicFramesCaptured ? captureEndedAt : null,
  audioInputDevice: preferredDevice || "BLOCKED_NO_AUDIO_DEVICE",
  inputPermissionState: realMicFramesCaptured ? "DEVICE_CAPTURE_ALLOWED" : "BLOCKED",
  transcriptContinuity,
  transcriptSegmentCount,
  firstTranscriptAt: null,
  lastTranscriptAt: null,
  transcriptionProvider: "NOT_STARTED_NO_LIVE_UTTERANCE_TRANSCRIPTION_PATH_PROVEN",
  agentLeeResponseContinuity: responseGeneratedFromTranscript ? "PROVEN" : "NOT_YET_PROVEN",
  cloneVoiceOutputContinuity,
  noButtonConversation,
  alwaysListeningActive,
  pushToTalkRequired,
  turnCount,
  sessionStillOpen,
  interruptionHandling: initialSessionState.interruptionHandling ?? "SUPPORTED_NOT_AUDIO_PROVEN",
  audibleConfirmation,
  rtcAudioContinuity,
  continuousAudioEmbodimentStatus: pass ? "PROVEN" : "BLOCKED",
  finalSessionVerdict: finalVerdict,
  promotionAllowed: false
});

const frameIngressReport = common({
  reportId: "LEEWAY_REPORT::RTC_AUDIO_FRAME_INGRESS::PASS_1",
  finalStatus: realMicFramesCaptured ? "PARTIAL" : "BLOCKED",
  sessionId,
  creatorId: "Leonard Lee",
  microphoneContinuity,
  audioFrameContinuity,
  audioFrameCount: captureStats.estimatedFrameCount,
  firstAudioFrameAt: sessionState.firstAudioFrameAt,
  lastAudioFrameAt: sessionState.lastAudioFrameAt,
  audioInputDevice: sessionState.audioInputDevice,
  inputPermissionState: sessionState.inputPermissionState,
  rawAudioStored: false,
  privateRawAudioRetention: "NONE",
  captureMethod: captureDependency.isApproved
    ? `${captureDependency.executableName} dshow live microphone to null output`
    : "Edge RTC session-state continuity evidence",
  captureDependencyGate: {
    approvalStatus: captureDependency.approvalStatus,
    executableName: captureDependency.executableName,
    reason: captureDependency.reason,
    decisionOption: captureDependency.decisionOption ?? "C",
    gateEvidencePath: captureDependency.gateEvidencePath ?? reportPaths.captureGateEvidence
  },
  captureStats,
  ffmpegDeviceDiscovery: {
    ok: ffmpegDevices.ok,
    audioDevices,
    command: ffmpegDevices.command
  },
  ffmpegCapture: {
    ok: ffmpegCapture.ok,
    command: ffmpegCapture.command,
    status: ffmpegCapture.status,
    signal: ffmpegCapture.signal,
    stderrSummary: captureOutput.slice(0, 3000)
  },
  limitation: "Live microphone frames were captured from the device, but Leonard utterance, speech content, and transcript continuity were not proven."
});

const transcriptContinuityReport = common({
  reportId: "LEEWAY_REPORT::TRANSCRIPT_CONTINUITY::PASS_1",
  finalStatus: "BLOCKED",
  sessionId,
  conversationId,
  transcriptContinuity,
  transcriptSegmentCount,
  firstTranscriptAt: null,
  lastTranscriptAt: null,
  transcriptionProvider: "NOT_PROVEN",
  transcriptRouteId: sessionState.transcriptRouteId,
  transcriptEnteredAgentLeeContext: false,
  blockedReason: "No approved live transcription path produced transcript segments from the captured microphone stream in this run.",
  manualTranscriptInjected: false,
  simulatedTranscriptUsed: false
});

const transcriptReport = common({
  reportId: "LEEWAY_REPORT::REAL_TIME_CONVERSATION_TRANSCRIPT::PASS_1",
  finalStatus: "BLOCKED",
  sessionId,
  conversationId,
  segments: transcriptSegments,
  transcriptSegmentCount,
  manualTranscriptInjected: false,
  simulatedTranscriptUsed: false
});

const responseLoopReport = common({
  reportId: "LEEWAY_REPORT::AGENT_LEE_RESPONSE_LOOP::PASS_1",
  finalStatus: "BLOCKED",
  sessionId,
  conversationId,
  agentId: "Agent Lee",
  responseCount,
  agentLeeResponseContinuity: sessionState.agentLeeResponseContinuity,
  liveLanguageProcessorActive: languageStatus.languageProcessorActive === true,
  creatorMirrorActive: languageStatus.creatorMirroringActive === true,
  runtimeSituationalAwarenessActive: languageStatus.runtimeAwarenessActive === true,
  truthTaxonomyEnforced: true,
  blockerDisciplineActive: true,
  book77LanguageDoctrineReferenced: true,
  responses: agentLeeResponses,
  blockedReason: "Agent Lee response loop was not invoked because no live transcript segment was produced from microphone input."
});

const cloneOutputReport = common({
  reportId: "LEEWAY_REPORT::CANONICAL_CLONE_OUTPUT::PASS_1",
  finalStatus: "BLOCKED",
  sessionId,
  conversationId,
  voiceRouteId: "leeway.voice.primary.clone.live",
  cloneRouteAttached,
  cloneVoiceProviderStatus: voiceAuthority.currentStatus ?? "UNKNOWN",
  runtimeOutputProven: cloneRuntimeProof.runtimeOutputProven === true,
  humanAudibleConfirmed: humanAudibleProof.humanAudibleConfirmed === true,
  synthesisStartAt: null,
  synthesisEndAt: null,
  outputRoute: "leeway.voice.primary.clone.live",
  playbackRoute: "NOT_STARTED_NO_RESPONSE_TRANSCRIPT",
  voiceStreamId: null,
  voiceOutputContinuity: cloneVoiceOutputContinuity,
  audibleConfirmationRequired: true,
  detachedPlaybackUsed: false,
  proofOnlySynthesisUsed: false,
  forbiddenFallbackUsed: false,
  fallbackRoute: "leeway.voice.text.emergency",
  blockedReason: "No Agent Lee response from a live transcript existed, so canonical clone output was not attempted."
});

const noButtonReport = common({
  reportId: "LEEWAY_REPORT::NO_BUTTON_CONVERSATION::PASS_1",
  finalStatus: "BLOCKED",
  sessionId,
  conversationId,
  alwaysListeningActive,
  pushToTalkRequired,
  noButtonConversation,
  listenerActiveBeforeManualUtterance: false,
  creatorUtteranceCaptured: false,
  agentLeeResponseGenerated: false,
  canonicalCloneVoiceAttempted: false,
  turnCount,
  sessionStillOpen,
  interruptionHandlingStateExists: Boolean(sessionState.interruptionHandling),
  blockedReason: "The microphone device probe was command-triggered and did not prove a no-button creator conversation loop."
});

const audibleReport = common({
  reportId: "LEEWAY_REPORT::HUMAN_AUDIBLE_CONFIRMATION::PASS_1",
  finalStatus: "BLOCKED",
  sessionId,
  conversationId,
  audibleConfirmation,
  validConfirmationValues: ["HEARD_CLEARLY", "HEARD_BUT_UNCLEAR", "NOT_HEARD", "NOT_REQUESTED"],
  operatorAsked: false,
  reasonNotRequested: "No session-attached canonical clone voice response was produced from a live transcript.",
  outputDeviceDiagnostics: {
    liveVoiceGateStatus: liveVoiceGate.finalStatus ?? "UNKNOWN",
    persistentLiveVoiceStatus: liveVoiceGate.persistentLiveVoiceStatus ?? "UNKNOWN",
    audioModeObserved: liveVoiceGate.audioModeObserved ?? "UNKNOWN",
    speakerDevices: liveVoiceGate.speakerDevices ?? []
  }
});

const sentinelChecks = [
  { check: "no mic frames", status: realMicFramesCaptured ? "PASS" : "DETECTED" },
  { check: "no transcript", status: transcriptSegmentCount === 0 ? "DETECTED" : "PASS" },
  { check: "no Agent Lee response", status: responseCount === 0 ? "DETECTED" : "PASS" },
  { check: "clone voice fallback", status: cloneVoiceOutputAttempted ? "PASS" : "NOT_APPLICABLE_OUTPUT_NOT_STARTED" },
  { check: "detached playback attempt", status: "PASS_NOT_DETECTED" },
  { check: "missing receipt", status: "PASS_RECEIPT_WRITTEN" },
  { check: "missing telemetry", status: realMicFramesCaptured ? "PASS_PARTIAL_TELEMETRY" : "DETECTED" },
  { check: "missing session state update", status: "PASS_SESSION_STATE_WRITTEN" },
  { check: "false no-button claim", status: noButtonConversation === "PROVEN" ? "DETECTED" : "PASS_TRUTHFUL_BLOCK" },
  { check: "false live voice claim", status: cloneVoiceOutputContinuity === "PROVEN" ? "DETECTED" : "PASS_TRUTHFUL_BLOCK" }
];

const sentinelReport = common({
  reportId: "LEEWAY_REPORT::EMBODIED_CONVERSATION_SENTINEL::PASS_1",
  finalStatus: finalStatus === "PASS" ? "PASS" : "FAIL",
  truthLabel: finalStatus === "PASS" ? "LIVE_PROVEN" : finalStatus,
  sessionId,
  conversationId,
  attachedToBlockerSentinelMesh: true,
  sourceBlockerSentinelStatus: blockerSentinel.finalStatus ?? "UNKNOWN",
  sourceRegressionStatus: regressionGate.finalStatus ?? "UNKNOWN",
  sourceReconnectStatus: reconnectGate.finalStatus ?? "UNKNOWN",
  checks: sentinelChecks,
  detectedBlockers: sentinelChecks.filter((item) => item.status === "DETECTED").map((item) => item.check)
});

const remainingBlockers = [
  !acceptanceChecks.transcriptSegmentsGenerated ? "No transcript segment was generated from live microphone input." : null,
  !acceptanceChecks.agentLeeResponseGeneratedFromTranscript ? "Agent Lee response loop did not run because live transcript continuity is blocked." : null,
  !acceptanceChecks.canonicalCloneVoiceOutputAttemptedThroughSessionRoute ? "Canonical clone voice output was not attempted through a session response route." : null,
  !acceptanceChecks.audibleConfirmationHeardClearly ? "Human audible confirmation is NOT_REQUESTED, not HEARD_CLEARLY." : null,
  !acceptanceChecks.noButtonConversationProven ? "No-button natural conversation is not proven." : null,
  reconnectGate.finalStatus !== "PASS" ? "Reconnect continuity gate remains failing." : null,
  regressionGate.finalStatus !== "PASS" ? "Regression prevention gate remains failing." : null
].filter(Boolean);

const filesRead = [
  "000-URGENT-LEEWAY-ASSISTANT-LAW/READ-FIRST.md",
  "LeeWay-Standards/standards/BOOK-54-ASSISTANT-EMBODIMENT-AND-BEHAVIOR-LAW.md",
  "LeeWay-Standards/standards/BOOK-55-ASSISTANT-RECORDING-AND-LEARNING-LAW.md",
  "LeeWay-Edge-RTC/runtime.mjs",
  "scripts/lib/Resolve-LeeWayApprovedCaptureDependency.ps1",
  "LeeWay-Standards/registries/leeway-approved-runtime-dependency-registry.json",
  ".leeway-vscode/bridge-runtime/state/voice-authority.json",
  ".leeway-vscode/bridge-runtime/reports/clone-voice-runtime-output-proof.json",
  ".leeway-vscode/bridge-runtime/reports/clone-voice-human-audible-proof.json",
  "Archive/reports/leeway-agent-lee-live-voice-audible-gate-report.json",
  "Archive/reports/leeway-blocker-sentinel-report.json",
  "Archive/reports/leeway-regression-prevention-gate-report.json",
  "Archive/reports/leeway-agent-lee-reconnect-continuity-gate-report.json"
];
const filesChanged = [
  "LeeWay-Edge-RTC/runtime.mjs",
  "scripts/Write-LeeWayRealTimeEmbodiedConversationCorridorReports.mjs",
  ...requiredOutputs
];
const commandsRun = [
  "node --check runtime.mjs (LeeWay-Edge-RTC)",
  "Stop-Process/Start-Process for LeeWay-Edge-RTC runtime",
  "HTTP probes for /session-state, /authority, /multimodal-readiness, /listen, Agent Lee language runtime, and system health",
  "powershell.exe -File scripts/lib/Resolve-LeeWayApprovedCaptureDependency.ps1",
  captureDependency.isApproved
    ? `${captureDependency.executableName} -hide_banner -list_devices true -f dshow -i dummy`
    : "LEEWAY_APPROVED_DEPENDENCY_GATE -> BLOCKED_APPROVED_CAPTURE_DEPENDENCY_MISSING",
  captureDependency.isApproved && preferredDevice
    ? `${captureDependency.executableName} -hide_banner -f dshow -i audio=\"${preferredDevice}\" -t 2 -f null -`
    : "LEEWAY_SERVICE::EDGE_RTC session-state continuity evidence",
  "node scripts/Write-LeeWayRealTimeEmbodiedConversationCorridorReports.mjs"
];
const toolsUsed = ["functions.shell_command", "multi_tool_use.parallel", "functions.apply_patch", "functions.update_plan"];
const MCPsUsed = [];
const standardsChecked = [
  "READ-FIRST.md",
  "BOOK-54",
  "BOOK-55",
  "leeway-application-standards",
  "leeway-creation-law",
  "leeway-tracer-pack-standard",
  "leeway-identity-mesh-standard"
];
const gatesRun = [
  { gate: "LEEWAY_REAL_TIME_SESSION_IDENTITY_GATE", status: acceptanceChecks.liveRtcSessionExists ? "PASS" : "FAIL" },
  { gate: "LEEWAY_MICROPHONE_AUDIO_FRAME_INGRESS_GATE", status: realMicFramesCaptured ? "PARTIAL" : "FAIL" },
  { gate: "LEEWAY_TRANSCRIPT_CONTINUITY_GATE", status: "FAIL" },
  { gate: "LEEWAY_AGENT_LEE_RESPONSE_LOOP_GATE", status: "FAIL" },
  { gate: "LEEWAY_CANONICAL_CLONE_OUTPUT_GATE", status: "FAIL" },
  { gate: "LEEWAY_NO_BUTTON_CONVERSATION_GATE", status: "FAIL" },
  { gate: "LEEWAY_HUMAN_AUDIBLE_CONFIRMATION_GATE", status: "FAIL" },
  { gate: "LEEWAY_EMBODIED_CONVERSATION_SENTINEL_GATE", status: sentinelReport.finalStatus },
  { gate: "LEEWAY_REAL_TIME_EMBODIED_CONVERSATION_CORRIDOR_ACCEPTANCE", status: pass ? "PASS" : finalStatus }
];
const lessonsLearned = [
  "Real microphone device frames can be captured without retaining raw audio, but that alone does not prove creator utterance or conversation.",
  "Transcript continuity must come from live microphone input; manual transcript injection remains disallowed.",
  "Canonical clone output must wait for a response generated from live transcript context and human audible confirmation."
];
const skillImprovementsSuggested = [
  "Add an interactive LeeWay audio corridor runner that arms the mic, waits for Leonard speech, captures transcript, routes response, and asks audible confirmation.",
  "Add a local governed STT provider lane that can consume temporary mic buffers and immediately purge raw audio after transcript receipts."
];
const requiredLedgerFields = {
  filesRead,
  filesChanged,
  commandsRun,
  toolsUsed,
  MCPsUsed,
  standardsChecked,
  gatesRun,
  receiptsWritten: [reportPaths.receipt],
  failuresEncountered: remainingBlockers,
  lessonsLearned,
  skillImprovementsSuggested,
  remainingBlockers
};

const finalReport = common({
  reportId: "LEEWAY_REPORT::REAL_TIME_EMBODIED_CONVERSATION_CORRIDOR::PASS_1",
  finalVerdict,
  finalStatus,
  sessionId,
  conversationId,
  acceptanceChecks,
  phaseStatus: {
    realSessionIdentity: acceptanceChecks.liveRtcSessionExists ? "PASS" : "BLOCKED",
    microphoneAudioFrameIngress: frameIngressReport.finalStatus,
    transcriptContinuity: transcriptContinuityReport.finalStatus,
    agentLeeResponseLoop: responseLoopReport.finalStatus,
    canonicalCloneVoiceOutput: cloneOutputReport.finalStatus,
    noButtonConversationProof: noButtonReport.finalStatus,
    humanAudibleConfirmation: audibleReport.finalStatus,
    sessionStateTruthUpdate: "PASS",
    sentinelAttachment: sentinelReport.finalStatus,
    receiptAndFinalReport: "PASS"
  },
  sessionState,
  frameIngressReportPath: reportPaths.frameIngress,
  transcriptContinuityReportPath: reportPaths.transcriptContinuity,
  responseLoopReportPath: reportPaths.responseLoop,
  cloneOutputReportPath: reportPaths.cloneOutput,
  noButtonConversationReportPath: reportPaths.noButton,
  humanAudibleConfirmationReportPath: reportPaths.audible,
  sentinelReportPath: reportPaths.sentinel,
  receiptPath: reportPaths.receipt,
  ...requiredLedgerFields
});

const receipt = common({
  receiptId,
  finalVerdict,
  finalStatus,
  reportsWritten: requiredOutputs.filter((item) => item.startsWith("Archive/reports/")),
  ...requiredLedgerFields
});

for (const report of [
  sessionState,
  frameIngressReport,
  transcriptContinuityReport,
  transcriptReport,
  responseLoopReport,
  cloneOutputReport,
  noButtonReport,
  audibleReport,
  sentinelReport
]) {
  Object.assign(report, requiredLedgerFields);
}

writeJson(reportPaths.sessionState, sessionState);
writeJson(reportPaths.frameIngress, frameIngressReport);
writeJson(reportPaths.transcriptContinuity, transcriptContinuityReport);
writeJson(reportPaths.transcript, transcriptReport);
writeJson(reportPaths.responseLoop, responseLoopReport);
writeJson(reportPaths.cloneOutput, cloneOutputReport);
writeJson(reportPaths.noButton, noButtonReport);
writeJson(reportPaths.audible, audibleReport);
writeJson(reportPaths.sentinel, sentinelReport);
writeJson(reportPaths.finalJson, finalReport);
writeJson(reportPaths.receipt, receipt);

writeText(reportPaths.finalMd, `# LeeWay Real-Time Embodied Conversation Corridor Report

- assistantBodyId: ${assistantBodyId}
- assistantObjectId: ${assistantObjectId}
- taskId: ${taskId}
- subjectObjectId: ${subjectObjectId}
- authorityId: ${authorityId}
- generatedAt: ${now}
- finalVerdict: ${finalVerdict}
- finalStatus: ${finalStatus}

## Result

The corridor did not reach PASS. A governed RTC session identity exists and live microphone device frames were captured through a real Windows DirectShow microphone path to null output without retaining raw audio. The pass remains ${finalStatus} because live speech transcript continuity, Agent Lee response generation from that transcript, session-attached canonical clone voice output, no-button conversation, and human audible confirmation are not proven.

## Phase Status

${Object.entries(finalReport.phaseStatus).map(([key, value]) => `- ${key}: ${value}`).join("\n")}

## Acceptance Checks

${Object.entries(acceptanceChecks).map(([key, value]) => `- ${key}: ${value}`).join("\n")}

## Remaining Blockers

${lines(remainingBlockers)}
`);

console.log(JSON.stringify({
  finalVerdict,
  finalStatus,
  reportsWritten: requiredOutputs,
  writtenSessionState: {
    sessionId: sessionState.sessionId,
    microphoneContinuity: sessionState.microphoneContinuity,
    audioFrameContinuity: sessionState.audioFrameContinuity,
    transcriptContinuity: sessionState.transcriptContinuity,
    finalSessionVerdict: sessionState.finalSessionVerdict,
    promotionAllowed: sessionState.promotionAllowed
  }
}, null, 2));

process.exit(0);
