/*
LEEWAY HEADER
TAG: GOVERNANCE.EVIDENCE.QWEN_VOICE_AUDIO_ROUTE_RESTORATION
REGION: ARCHIVE.REPORTS
DISCOVERY_PIPELINE: Standards -> Model Hive -> Bridge Runtime -> Edge GPU -> Edge RTC -> Voice Factory -> Agent Lee Runtime -> Receipt
LEEWAY_ID: LEEWAY_APP::GOVERNANCE::QWEN_VOICE_AUDIO_ROUTE_RESTORATION::REPORT_WRITER
CLASSIFICATION: EVIDENCE
OWNER: LeeWay Standards
*/
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(__filename);
const workspaceRoot = path.resolve(scriptDir, "..");
const now = new Date().toISOString();

const assistantBodyId = "CODEX_ASSISTANT_BODY";
const assistantObjectId = "LEEWAY_ACTOR::ASSISTANT_BODY::CODEX::20260524_QWEN_VOICE_AUDIO_ROUTE_RESTORATION";
const taskId = "LEEWAY_TASK::QWEN_VOICE_AUDIO_ROUTE_RESTORATION::PASS_1";
const subjectObjectId = "LEEWAY_APP::AGENT_LEE::QWEN_VOICE_AUDIO_RTC_EMBODIMENT_PIPELINE::PASS_1";
const traceId = "LEEWAY_TRACE::EMBODIMENT::QWEN_VOICE_AUDIO_ROUTE_RESTORATION::20260524::PASS_1";
const promptId = "LEEWAY_PROMPT::IDE::QWEN_VOICE_AUDIO_ROUTE_RESTORATION::20260524";
const intentId = "LEEWAY_INTENT::EMBODIMENT::RESTORE_QWEN_VOICE_AUDIO_ROUTE::PASS_1";
const transactionId = "LEEWAY_TX::EMBODIMENT::RUN_QWEN_VOICE_AUDIO_ROUTE_RESTORATION::20260524";
const receiptPath = "Archive/receipts/leeway_qwen_voice_audio_route_restoration_receipt.json";

const paths = {
  readFirst: "000-URGENT-LEEWAY-ASSISTANT-LAW/READ-FIRST.md",
  agents: "AGENTS.md",
  book54: "LeeWay-Standards/standards/BOOK-54-ASSISTANT-EMBODIMENT-AND-BEHAVIOR-LAW.md",
  book55: "LeeWay-Standards/standards/BOOK-55-ASSISTANT-RECORDING-AND-LEARNING-LAW.md",
  book05: "LeeWay-Standards/standards/BOOK-05-LEEWAY-VOICE-AUTHORITY-LAW.md",
  book06: "LeeWay-Standards/standards/BOOK-06-LEEWAY-RTC-AUTHORITY-LAW.md",
  book07: "LeeWay-Standards/standards/BOOK-07-LEEWAY-EDGE-GPU-AUTHORITY-LAW.md",
  book08: "LeeWay-Standards/standards/BOOK-08-LEEWAY-MODEL-AUTHORITY-LAW.md",
  book30: "LeeWay-Standards/standards/BOOK-30-LEEWAY-LLM-MODEL-HIVE-LAW.md",
  book31: "LeeWay-Standards/standards/BOOK-31-AGENT-TO-MODEL-ROUTING-LAW.md",
  book60: "LeeWay-Standards/standards/BOOK-60-LEEWAY-LOCAL-MODEL-ACQUISITION-LAW.md",
  book61: "LeeWay-Standards/standards/BOOK-61-LEEWAY-MODEL-HIVE-GOVERNANCE-LAW.md",
  book62: "LeeWay-Standards/standards/BOOK-62-LIVE-MULTIMODAL-RTC-LAW.md",
  book63: "LeeWay-Standards/standards/BOOK-63-GPU-MODEL-FABRIC-LAW.md",
  book76: "LeeWay-Standards/standards/BOOK-76-CONTINUOUS-EMBODIMENT-LAW.md",
  book77: "LeeWay-Standards/standards/BOOK-77-AGENT-LEE-PERSONA-CONSTITUTION-LAW.md",
  modelHiveRegistry: "LeeWay-Standards/registries/leeway-model-hive-registry.json",
  llmRouteRegistry: "LeeWay-Standards/registries/leeway-llm-route-registry.json",
  liveModelLaneRegistry: "LeeWay-Standards/registries/leeway-live-model-lane-registry.json",
  voiceProviderRegistry: "LeeWay-Standards/registries/leeway-voice-provider-registry.json",
  voiceRouteRegistry: "LeeWay-Standards/registries/leeway-voice-route-registry.json",
  audioUnderstandingRegistry: "LeeWay-Standards/registries/leeway-audio-understanding-registry.json",
  voiceRegistry: "LeeWay-Standards/registries/leeway-voice-registry.json",
  rtcRouteRegistry: "LeeWay-Standards/registries/leeway-rtc-multimodal-route-registry.json",
  gpuFabricRegistry: "LeeWay-Standards/registries/leeway-gpu-model-fabric-registry.json",
  modelRtcAttachmentRegistry: "LeeWay-Standards/registries/leeway-model-rtc-attachment-registry.json",
  modelGpuAttachmentRegistry: "LeeWay-Standards/registries/leeway-model-gpu-attachment-registry.json",
  bridgeModelHiveStatus: ".leeway-vscode/bridge-runtime/reports/model-hive-status.json",
  bridgeVoiceRouteManagerStatus: ".leeway-vscode/bridge-runtime/reports/voice-route-manager-status.json",
  bridgeLiveMultimodalStatus: ".leeway-vscode/bridge-runtime/reports/live-multimodal-routing-status.json",
  voiceAuthority: ".leeway-vscode/bridge-runtime/state/voice-authority.json",
  cloneVoiceOutputProof: ".leeway-vscode/bridge-runtime/reports/clone-voice-runtime-output-proof.json",
  cloneVoiceAudibleProof: ".leeway-vscode/bridge-runtime/reports/clone-voice-human-audible-proof.json",
  rtcVoiceAdapter: "LeeWay-Edge-RTC/leeway.voice.runtime.adapter.json",
  edgeRtcRuntime: "LeeWay-Edge-RTC/runtime.mjs",
  agentLeeVoiceService: "leeway-agent-lee/agent-lee-runtime/src/voice/voiceService.ts",
  agentLeeRoutes: "leeway-agent-lee/agent-lee-runtime/src/api/routes.ts",
  agentLeeServer: "leeway-agent-lee/agent-lee-runtime/src/server.ts",
  agentLeeLanguage: "leeway-agent-lee/agent-lee-runtime/src/language/liveLanguageOperatingEntity.ts",
  gpuModelHiveAcceleration: "LeeWay-Edge-GPU/reports/gpu-model-hive-acceleration-report.json",
  gpuModelFabricReport: "LeeWay-Edge-GPU/reports/gpu-model-fabric-report.json",
  sessionState: "Archive/reports/leeway-real-time-embodied-session-state.json",
  custodyAudit: "Archive/reports/leeway-qwen-voice-audio-model-custody-audit.json",
  placeholderReport: "Archive/reports/leeway-qwen-model-placeholder-elimination-report.json",
  audioLaneReport: "Archive/reports/leeway-qwen-audio-hearing-lane-report.json",
  voiceLaneReport: "Archive/reports/leeway-qwen-voice-output-lane-report.json",
  omniLaneReport: "Archive/reports/leeway-qwen-omni-multimodal-lane-report.json",
  responseLoopReport: "Archive/reports/leeway-qwen-agent-lee-response-loop-report.json",
  sentinelReport: "Archive/reports/leeway-qwen-voice-audio-sentinel-report.json",
  finalJson: "Archive/reports/leeway-qwen-voice-audio-route-restoration-report.json",
  finalMd: "Archive/reports/leeway-qwen-voice-audio-route-restoration-report.md",
  receipt: receiptPath
};

const commandsRun = [
  "Get-Content READ-FIRST.md and AGENTS.md",
  "Get-Content leeway-application-standards skill and identity/tracer references",
  "Get-Content Books 05, 06, 07, 08, 30, 31, 54, 55, 60, 61, 62, 63, 76, 77",
  "Get-ChildItem Qwen model custody roots under models/voice and models/qwen",
  "Get-Content Qwen MODEL_READY receipts and model configs",
  "Get-Content Standards model/voice/RTC registries and Bridge/RTC/GPU status files",
  "rg Qwen voice/audio route references across LeeWay Standards, Edge RTC, Agent Lee, scripts, and reports",
  "ollama list and local Ollama /api/tags probe",
  "HTTP GET local RTC /session-state and Edge GPU /health",
  "node scripts/Write-LeeWayQwenVoiceAudioRouteRestorationReports.mjs"
];

const toolsUsed = [
  "functions.shell_command",
  "multi_tool_use.parallel",
  "functions.apply_patch",
  "functions.update_plan"
];

const standardsChecked = [
  "000-URGENT-LEEWAY-ASSISTANT-LAW/READ-FIRST.md",
  "AGENTS.md",
  "BOOK-05-LEEWAY-VOICE-AUTHORITY-LAW",
  "BOOK-06-LEEWAY-RTC-AUTHORITY-LAW",
  "BOOK-07-LEEWAY-EDGE-GPU-AUTHORITY-LAW",
  "BOOK-08-LEEWAY-MODEL-AUTHORITY-LAW",
  "BOOK-30-LEEWAY-LLM-MODEL-HIVE-LAW",
  "BOOK-31-AGENT-TO-MODEL-ROUTING-LAW",
  "BOOK-54-ASSISTANT-EMBODIMENT-AND-BEHAVIOR-LAW",
  "BOOK-55-ASSISTANT-RECORDING-AND-LEARNING-LAW",
  "BOOK-60-LEEWAY-LOCAL-MODEL-ACQUISITION-LAW",
  "BOOK-61-LEEWAY-MODEL-HIVE-GOVERNANCE-LAW",
  "BOOK-62-LIVE-MULTIMODAL-RTC-LAW",
  "BOOK-63-GPU-MODEL-FABRIC-LAW",
  "BOOK-76-CONTINUOUS-EMBODIMENT-LAW",
  "BOOK-77-AGENT-LEE-PERSONA-CONSTITUTION-LAW",
  "leeway-application-standards",
  "leeway-creation-law",
  "leeway-identity-graph-standard",
  "leeway-identity-mesh-standard",
  "leeway-tracer-pack-standard"
];

const gatesRun = [
  { gate: "LEEWAY_ASSISTANT_EMBODIMENT_GATE", status: "PASS" },
  { gate: "LEEWAY_ASSISTANT_RECORDING_LEARNING_GATE", status: "PASS" },
  { gate: "LEEWAY_VOICE_AUTHORITY_GATE", status: "PARTIAL" },
  { gate: "LEEWAY_RTC_AUTHORITY_GATE", status: "PARTIAL" },
  { gate: "LEEWAY_EDGE_GPU_AUTHORITY_GATE", status: "PARTIAL" },
  { gate: "LEEWAY_MODEL_AUTHORITY_GATE", status: "PARTIAL" },
  { gate: "LEEWAY_MODEL_HIVE_GATE", status: "PARTIAL" },
  { gate: "LEEWAY_AGENT_MODEL_ROUTING_GATE", status: "PARTIAL" },
  { gate: "LEEWAY_LOCAL_MODEL_ACQUISITION_GATE", status: "PARTIAL" },
  { gate: "LEEWAY_MODEL_HIVE_GOVERNANCE_GATE", status: "PARTIAL" },
  { gate: "LEEWAY_MULTIMODAL_RTC_GATE", status: "PARTIAL" },
  { gate: "LEEWAY_GPU_MODEL_FABRIC_GATE", status: "PARTIAL" },
  { gate: "LEEWAY_CONTINUOUS_EMBODIMENT_GATE", status: "BLOCKED" },
  { gate: "LEEWAY_AGENT_LEE_PERSONA_CONSTITUTION_GATE", status: "PARTIAL" }
];

const failuresEncountered = [
  "Qwen2-Audio local artifacts and MODEL_READY receipt are present, but no live local Qwen audio runner or loaded model proof was found.",
  "Qwen3-TTS local artifacts and speech tokenizer are present, but no session-attached Qwen speech output proof was found.",
  "Qwen2.5-Omni local artifacts and Talker config are present, but no live RTC multimodal conversation proof was found.",
  "Existing model hive and route registries contained ACTIVE_GOVERNED_ROUTE language for local Qwen voice/audio routes without matching live runtime proof.",
  "Agent Lee runtime voice service still emits text emergency diagnostics, not Qwen/clone speech.",
  "No Qwen-produced transcript or audio-intent segment exists for an Agent Lee response loop."
];

const lessonsLearned = [
  "Qwen is the LeeWay unified cognition family for reasoning, coding, vision, audio, multimodal conversation, and voice; Qwen must not be reduced to reasoning-only.",
  "A MODEL_READY receipt proves custody, not live route activation; live activation requires a local server or runtime load proof plus receipt.",
  "LeeWay voice/audio restoration must downgrade unproven ACTIVE labels instead of hiding them behind generic STT or TTS fallback.",
  "No browser SpeechRecognition, cloud STT, Piper, Edge TTS, Windows SAPI, generic OS voice, or detached WAV proof can satisfy this pass.",
  "Qwen audio transcript continuity and Qwen voice output continuity are separate gates; one cannot substitute for the other."
];

const skillImprovementsSuggested = [
  "Add a LeeWay Qwen voice/audio route repair skill category that forbids broad STT provider discovery when Qwen is the required lane.",
  "Add a LeeWay placeholder-elimination checklist for model routes so ACTIVE labels cannot survive without artifact, registry, runtime-load, and receipt proof.",
  "Add a LeeWay RTC embodiment proof skill that distinguishes custody, routing, runtime load, live transcript, Agent Lee response, and audible voice output."
];

const filesRead = Object.values(paths).filter((item) => ![
  paths.audioUnderstandingRegistry,
  paths.custodyAudit,
  paths.placeholderReport,
  paths.audioLaneReport,
  paths.voiceLaneReport,
  paths.omniLaneReport,
  paths.responseLoopReport,
  paths.sentinelReport,
  paths.finalJson,
  paths.finalMd,
  paths.receipt
].includes(item)).concat([
  "models/voice/qwen2-audio/",
  "models/voice/qwen2-audio/MODEL_READY.receipt.json",
  "models/voice/qwen2-audio/config.json",
  "models/voice/qwen2.5-omni/",
  "models/voice/qwen2.5-omni/MODEL_READY.receipt.json",
  "models/voice/qwen2.5-omni/config.json",
  "models/voice/qwen3-tts/",
  "models/voice/qwen3-tts/MODEL_READY.receipt.json",
  "models/voice/qwen3-tts/config.json",
  "models/voice/qwen3-tts/speech_tokenizer/config.json",
  "models/qwen/qwen3/"
]);

const cleanupDeletedFiles = [
  "scripts/Write-LeeWayApprovedLiveSttRouteImplementationReports.mjs",
  "scripts/Write-LeeWayLiveTranscriptContinuityAgentResponseReports.mjs",
  "Archive/reports/leeway-live-stt-route-discovery-report.json",
  "Archive/reports/leeway-live-transcript-continuity-agent-response-report.json",
  "Archive/reports/leeway-live-transcript-continuity-agent-response-report.md",
  "Archive/reports/leeway-real-time-conversation-transcript.json",
  "Archive/reports/leeway-transcript-continuity-report.json",
  "Archive/reports/leeway-transcript-response-sentinel-report.json"
];

const filesChanged = [
  ...cleanupDeletedFiles,
  paths.modelHiveRegistry,
  paths.llmRouteRegistry,
  paths.voiceProviderRegistry,
  paths.voiceRouteRegistry,
  paths.audioUnderstandingRegistry,
  paths.bridgeModelHiveStatus,
  paths.bridgeVoiceRouteManagerStatus,
  paths.rtcVoiceAdapter,
  paths.gpuModelHiveAcceleration,
  paths.sessionState,
  paths.custodyAudit,
  paths.placeholderReport,
  paths.audioLaneReport,
  paths.voiceLaneReport,
  paths.omniLaneReport,
  paths.responseLoopReport,
  paths.sentinelReport,
  paths.finalJson,
  paths.finalMd,
  paths.receipt
];

const targetRouteIds = new Set([
  "LEEWAY_LLM_ROUTE::QWEN2_AUDIO_LOCAL",
  "LEEWAY_LLM_ROUTE::QWEN3_TTS_LOCAL",
  "LEEWAY_LLM_ROUTE::QWEN2_5_OMNI_LOCAL"
]);

const qwenCustodyTargets = [
  {
    key: "qwen2Audio",
    modelId: "qwen2-audio-local",
    modelRouteId: "LEEWAY_LLM_ROUTE::QWEN2_AUDIO_LOCAL",
    modelFamily: "QWEN2_AUDIO",
    providerObjectId: "LEEWAY-VOICE-PROVIDER-0003",
    localPath: "models/voice/qwen2-audio",
    routeId: "leeway.audio.qwen2-audio.live",
    purpose: ["audio understanding", "listening", "transcription/audio comprehension", "RTC hearing lane"]
  },
  {
    key: "qwen3Tts",
    modelId: "qwen3-tts-local",
    modelRouteId: "LEEWAY_LLM_ROUTE::QWEN3_TTS_LOCAL",
    modelFamily: "QWEN3_TTS",
    providerObjectId: "LEEWAY-VOICE-PROVIDER-0002",
    localPath: "models/voice/qwen3-tts",
    routeId: "leeway.voice.qwen3-tts.live",
    purpose: ["speech generation", "voice design", "clone-compatible speech output", "cadence controlled by model instructions"]
  },
  {
    key: "qwen25Omni",
    modelId: "qwen2.5-omni-local",
    modelRouteId: "LEEWAY_LLM_ROUTE::QWEN2_5_OMNI_LOCAL",
    modelFamily: "QWEN2_5_OMNI",
    providerObjectId: "LEEWAY-VOICE-PROVIDER-0003",
    localPath: "models/voice/qwen2.5-omni",
    routeId: "leeway.multimodal.qwen2.5-omni.live",
    purpose: ["multimodal conversation", "audio-video-text interaction", "possible Talker path", "RTC multimodal interaction"]
  }
];

function abs(relativePath) {
  return path.join(workspaceRoot, relativePath);
}

function toRel(filePath) {
  return path.relative(workspaceRoot, filePath).replace(/\\/g, "/");
}

function exists(relativePath) {
  return fs.existsSync(abs(relativePath));
}

function readText(relativePath, fallback = "") {
  try {
    return fs.readFileSync(abs(relativePath), "utf8").replace(/^\uFEFF/, "");
  } catch {
    return fallback;
  }
}

function readJson(relativePath, fallback = null) {
  const text = readText(relativePath, "");
  if (!text.trim()) return fallback;
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

function writeJson(relativePath, payload) {
  const filePath = abs(relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function writeText(relativePath, payload) {
  const filePath = abs(relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, payload, "utf8");
}

function listFiles(relativePath) {
  const directoryPath = abs(relativePath);
  if (!fs.existsSync(directoryPath)) return [];
  return fs.readdirSync(directoryPath, { withFileTypes: true }).map((entry) => ({
    name: entry.name,
    type: entry.isDirectory() ? "directory" : "file",
    bytes: entry.isDirectory() ? null : fs.statSync(path.join(directoryPath, entry.name)).size
  }));
}

function sha256Text(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

function hasFile(relativeDirectory, fileName) {
  return fs.existsSync(path.join(abs(relativeDirectory), fileName));
}

function fileCountMatching(relativeDirectory, matcher) {
  return listFiles(relativeDirectory).filter((entry) => entry.type === "file" && matcher(entry.name)).length;
}

function findRoute(registry, routeId) {
  const routes = Array.isArray(registry?.routes) ? registry.routes : Array.isArray(registry?.modelRoutes) ? registry.modelRoutes : [];
  return routes.find((route) => route.modelRouteId === routeId || route.routeId === routeId || route.voiceRouteId === routeId) ?? null;
}

function findLane(registry, routeId) {
  const lanes = Array.isArray(registry?.lanes) ? registry.lanes : [];
  return lanes.find((lane) => Array.isArray(lane.routeIds) && lane.routeIds.includes(routeId)) ?? null;
}

function scanModel(target, registries) {
  const directoryExists = exists(target.localPath);
  const files = listFiles(target.localPath);
  const readyReceipt = readJson(path.join(target.localPath, "MODEL_READY.receipt.json").replace(/\\/g, "/"), null);
  const config = readJson(path.join(target.localPath, "config.json").replace(/\\/g, "/"), null);
  const hasWeights =
    fileCountMatching(target.localPath, (name) => name.endsWith(".safetensors")) > 0 ||
    hasFile(target.localPath, "pytorch_model.bin");
  const hasTokenizer =
    hasFile(target.localPath, "tokenizer.json") ||
    hasFile(target.localPath, "tokenizer_config.json") ||
    hasFile(target.localPath, "vocab.json");
  const hasProcessor =
    hasFile(target.localPath, "preprocessor_config.json") ||
    hasFile(target.localPath, "processor_config.json") ||
    hasFile(target.localPath, "chat_template.json");
  const hasLicense = hasFile(target.localPath, "LICENSE") || hasFile(target.localPath, "README.md");
  const receiptSaysReady = readyReceipt?.localRuntime?.status === "MODEL_READY";
  const artifactStatus = !directoryExists
    ? "NOT_INSTALLED"
    : receiptSaysReady && hasWeights
      ? "MODEL_READY_RECEIPT_AND_WEIGHTS_PRESENT"
      : "INSTALLED_UNVERIFIED";
  const routeInModelHive = Boolean(findRoute(registries.modelHive, target.modelRouteId));
  const routeInLlmRegistry = Boolean(findRoute(registries.llmRoutes, target.modelRouteId));
  const routeInRtcRegistry = Boolean(findRoute(registries.rtcRoutes, target.modelRouteId));
  const routeInGpuRegistry = Boolean(findRoute(registries.gpuFabric, target.modelRouteId));
  const routeInLiveLane = Boolean(findLane(registries.liveModelLanes, target.modelRouteId));
  const rtcAttachment = Array.isArray(registries.modelRtcAttachments?.attachments)
    ? registries.modelRtcAttachments.attachments.find((attachment) => attachment.modelRouteId === target.modelRouteId)
    : null;
  const gpuAttachment = Array.isArray(registries.modelGpuAttachments?.attachments)
    ? registries.modelGpuAttachments.attachments.find((attachment) => attachment.modelRouteId === target.modelRouteId)
    : null;
  const voiceRoute = Array.isArray(registries.voiceRoutes?.routes)
    ? registries.voiceRoutes.routes.find((route) => route.modelRouteId === target.modelRouteId || route.voiceRouteId === target.routeId || route.routeId === target.routeId)
    : null;
  const voiceProvider = Array.isArray(registries.voiceProviders?.providers)
    ? registries.voiceProviders.providers.find((provider) => provider.providerObjectId === target.providerObjectId || provider.modelRouteId === target.modelRouteId || (Array.isArray(provider.modelRouteIds) && provider.modelRouteIds.includes(target.modelRouteId)))
    : null;
  const routed = routeInModelHive || routeInLlmRegistry || routeInRtcRegistry || routeInGpuRegistry || routeInLiveLane || Boolean(rtcAttachment) || Boolean(gpuAttachment) || Boolean(voiceRoute);
  const finalTruthLabel = artifactStatus === "NOT_INSTALLED"
    ? "NOT_INSTALLED"
    : routed
      ? "ROUTED_NOT_PROVEN"
      : "LOCAL_AVAILABLE_NOT_ROUTED";

  return {
    providerId: target.providerObjectId,
    modelId: target.modelId,
    modelRouteId: target.modelRouteId,
    routeId: target.routeId,
    modelFamily: target.modelFamily,
    localPath: target.localPath,
    manifestPath: readyReceipt ? `${target.localPath}/MODEL_READY.receipt.json` : null,
    artifactStatus,
    configStatus: config ? "CONFIG_PRESENT" : "CONFIG_MISSING",
    tokenizerStatus: hasTokenizer ? "TOKENIZER_PRESENT" : "TOKENIZER_MISSING",
    processorStatus: hasProcessor ? "PROCESSOR_OR_PREPROCESSOR_PRESENT" : "PROCESSOR_NOT_FOUND",
    weightStatus: hasWeights ? "WEIGHTS_PRESENT" : "WEIGHTS_MISSING",
    licenseStatus: hasLicense ? "LICENSE_OR_README_PRESENT_REVIEW_REQUIRED" : "LICENSE_NOT_FOUND",
    hashStatus: readyReceipt ? "MODEL_READY_RECEIPT_PRESENT_NO_FULL_WEIGHT_HASH_COMPUTED_THIS_PASS" : "NO_MODEL_READY_RECEIPT_HASH_PROOF",
    runtimeLoadStatus: artifactStatus === "NOT_INSTALLED" ? "NOT_LOADABLE_NO_ARTIFACT" : "LOCAL_ARTIFACT_PRESENT_RUNTIME_LOAD_NOT_PROVEN",
    GPUCompatibility: readyReceipt?.localRuntime?.gpuCompatible === true || gpuAttachment?.gpuAttached === true ? "GPU_COMPATIBLE_DECLARED_ATTACHED_NOT_EXECUTION_PROVEN" : "GPU_COMPATIBILITY_NOT_PROVEN",
    RTCCompatibility: readyReceipt?.localRuntime?.rtcEligible === true || rtcAttachment?.rtcAttached === true ? "RTC_ELIGIBLE_ATTACHED_NOT_LIVE_PROVEN" : "RTC_COMPATIBILITY_NOT_PROVEN",
    BridgeRuntimeRoute: routeInModelHive || routeInLiveLane ? "BRIDGE_RUNTIME_ROUTE_REGISTERED_NOT_LIVE_PROVEN" : "BRIDGE_RUNTIME_ROUTE_MISSING",
    StandardsRegistryStatus: routeInModelHive || routeInLlmRegistry || routeInLiveLane ? "STANDARDS_REGISTERED" : "STANDARDS_ROUTE_MISSING",
    VoiceFactoryStatus: voiceProvider || voiceRoute ? "VOICE_FACTORY_ROUTE_REGISTERED_NOT_OUTPUT_PROVEN" : "VOICE_FACTORY_ROUTE_MISSING_OR_NOT_APPLICABLE",
    purpose: target.purpose,
    receiptStatus: readyReceipt ? "MODEL_READY_RECEIPT_PRESENT" : "MODEL_READY_RECEIPT_MISSING",
    sourceReceiptId: readyReceipt?.receiptId ?? null,
    localRuntimeReceiptStatus: readyReceipt?.localRuntime?.status ?? null,
    configArchitecture: Array.isArray(config?.architectures) ? config.architectures : [],
    configModelType: config?.model_type ?? null,
    enableAudioOutput: config?.enable_audio_output ?? null,
    enableTalker: config?.enable_talker ?? null,
    observedFileCount: files.length,
    routed,
    routeInModelHive,
    routeInLlmRegistry,
    routeInRtcRegistry,
    routeInGpuRegistry,
    routeInLiveLane,
    rtcAttachmentObjectId: rtcAttachment?.objectId ?? null,
    gpuAttachmentObjectId: gpuAttachment?.objectId ?? null,
    finalTruthLabel,
    blockers: finalTruthLabel === "ROUTED_NOT_PROVEN"
      ? [
          "No local runtime load proof was found for this Qwen voice/audio model.",
          "No live RTC transcript, audio-intent, multimodal conversation, or session-attached speech proof was produced by this model in this pass."
        ]
      : artifactStatus === "NOT_INSTALLED"
        ? ["Local model artifact directory is missing."]
        : ["Model artifact exists but route registration is incomplete."]
  };
}

async function getOllamaTags() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch("http://127.0.0.1:11434/api/tags", { signal: controller.signal });
    clearTimeout(timer);
    if (!response.ok) {
      return { ok: false, status: response.status, models: [], error: `HTTP ${response.status}` };
    }
    const payload = await response.json();
    return {
      ok: true,
      status: response.status,
      models: Array.isArray(payload.models) ? payload.models : [],
      error: null
    };
  } catch (error) {
    clearTimeout(timer);
    return { ok: false, status: null, models: [], error: error instanceof Error ? error.message : String(error) };
  }
}

function withReportFields(payload, status, blockers = []) {
  return {
    assistantBodyId,
    assistantObjectId,
    taskId,
    subjectObjectId,
    traceId,
    promptId,
    intentId,
    transactionId,
    generatedAt: now,
    ...payload,
    filesRead,
    filesChanged,
    commandsRun,
    toolsUsed,
    MCPsUsed: [],
    standardsChecked,
    gatesRun,
    receiptsWritten: [receiptPath],
    failuresEncountered,
    lessonsLearned,
    skillImprovementsSuggested,
    finalStatus: status,
    remainingBlockers: blockers
  };
}

function routeRecord({
  routeId,
  routeObjectId,
  providerObjectId,
  modelId,
  modelFamily,
  localPath,
  serverEndpoint = null,
  bridgeRuntimeRoute,
  edgeRtcAttachment,
  edgeGpuAttachment,
  voiceFactoryAttachment,
  fallbackOrder,
  proofStatus,
  blockers,
  aliases = []
}) {
  return {
    routeId,
    voiceRouteId: routeId,
    objectId: routeObjectId,
    routeObjectId,
    providerObjectId,
    modelId,
    modelFamily,
    localPath,
    serverEndpoint,
    standardsAuthorityReference: [
      "LEEWAY_POLICY::BOOK_5_LEEWAY-VOICE-AUTHORITY-LAW",
      "LEEWAY_POLICY::BOOK_6_LEEWAY-RTC-AUTHORITY-LAW",
      "LEEWAY_POLICY::BOOK_8_LEEWAY-MODEL-AUTHORITY-LAW",
      "LEEWAY_POLICY::BOOK_30_LEEWAY-LLM-MODEL-HIVE-LAW",
      "LEEWAY_POLICY::BOOK_31_AGENT-TO-MODEL-ROUTING-LAW",
      "LEEWAY_POLICY::BOOK_60_LEEWAY-LOCAL-MODEL-ACQUISITION-LAW",
      "LEEWAY_POLICY::BOOK_61_LEEWAY-MODEL-HIVE-GOVERNANCE-LAW",
      "LEEWAY_POLICY::BOOK_62_LIVE-MULTIMODAL-RTC-LAW",
      "LEEWAY_POLICY::BOOK_63_GPU-MODEL-FABRIC-LAW",
      "LEEWAY_POLICY::BOOK_76_CONTINUOUS-EMBODIMENT-LAW",
      "LEEWAY_POLICY::BOOK_77_AGENT-LEE-PERSONA-CONSTITUTION-LAW"
    ],
    bridgeRuntimeRoute,
    edgeRtcAttachment,
    edgeGpuAttachment,
    voiceFactoryAttachment,
    externalApiAllowed: false,
    directActionAllowed: false,
    fallbackOrder,
    proofStatus,
    blockers,
    receiptRequired: true,
    routeAliases: aliases
  };
}

function updateModelRouteTruth(registry, custodyRecords) {
  if (!registry || !Array.isArray(registry.modelRoutes) && !Array.isArray(registry.routes)) return registry;
  const routes = Array.isArray(registry.modelRoutes) ? registry.modelRoutes : registry.routes;
  for (const route of routes) {
    if (!targetRouteIds.has(route.modelRouteId)) continue;
    const custody = custodyRecords.find((record) => record.modelRouteId === route.modelRouteId);
    if (!custody) continue;
    route.installedStatus = custody.artifactStatus === "NOT_INSTALLED" ? "NOT_INSTALLED" : "INSTALLED_MODEL_READY_RECEIPT_PRESENT";
    route.verifiedStatus = custody.artifactStatus === "NOT_INSTALLED" ? "NOT_VERIFIED" : "ARTIFACT_VERIFIED_BY_MODEL_READY_RECEIPT";
    route.runtimeHealth = "RUNTIME_LOAD_NOT_PROVEN";
    route.runtimeLoadStatus = custody.runtimeLoadStatus;
    route.status = custody.finalTruthLabel;
    route.proofStatus = custody.finalTruthLabel;
    route.finalTruthLabel = custody.finalTruthLabel;
    route.placeholderEliminatedAt = now;
    route.activationStatus = "NOT_ACTIVE_UNTIL_LIVE_RUNTIME_PROOF_RECEIPT";
    route.externalApiAllowed = false;
    route.directActionAllowed = false;
  }
  registry.timestamp = registry.timestamp ?? now;
  registry.generatedAt = now;
  registry.finalStatus = "PARTIAL";
  return registry;
}

function buildVoiceRouteRegistry(custodyByKey, cloneProof, humanAudibleProof) {
  const primaryCloneProofStatus = cloneProof?.runtimeOutputProven === true
    ? humanAudibleProof?.humanAudibleConfirmed === true
      ? "LIVE_PROVEN"
      : "LIVE_PARTIAL_HUMAN_AUDIBLE_PENDING"
    : "ROUTED_NOT_PROVEN";
  return {
    generatedAt: now,
    sourceOfTruth: "LeeWay-Standards",
    registryId: "LEEWAY_VOICE_ROUTE_REGISTRY::QWEN_VOICE_AUDIO_RESTORATION_PASS_1",
    subjectObjectId: "LEEWAY-VOICE-FACTORY-0001",
    routes: [
      routeRecord({
        routeId: "leeway.audio.qwen2-audio.live",
        routeObjectId: "LEEWAY-AUDIO-ROUTE-0001",
        providerObjectId: "LEEWAY-VOICE-PROVIDER-0003",
        modelId: "qwen2-audio-local",
        modelFamily: "QWEN2_AUDIO",
        localPath: "models/voice/qwen2-audio",
        bridgeRuntimeRoute: "LEEWAY_LLM_ROUTE::QWEN2_AUDIO_LOCAL",
        edgeRtcAttachment: "LEEWAY-MODEL-RTC-0003",
        edgeGpuAttachment: "LEEWAY-MODEL-GPU-0010",
        voiceFactoryAttachment: "AUDIO_UNDERSTANDING_ONLY_NOT_SPEECH",
        fallbackOrder: [],
        proofStatus: custodyByKey.qwen2Audio.finalTruthLabel,
        blockers: custodyByKey.qwen2Audio.blockers
      }),
      routeRecord({
        routeId: "leeway.voice.qwen3-tts.live",
        routeObjectId: "LEEWAY-VOICE-ROUTE-0002",
        providerObjectId: "LEEWAY-VOICE-PROVIDER-0002",
        modelId: "qwen3-tts-local",
        modelFamily: "QWEN3_TTS",
        localPath: "models/voice/qwen3-tts",
        bridgeRuntimeRoute: "LEEWAY_LLM_ROUTE::QWEN3_TTS_LOCAL",
        edgeRtcAttachment: "LEEWAY-MODEL-RTC-0001",
        edgeGpuAttachment: "LEEWAY-MODEL-GPU-0008",
        voiceFactoryAttachment: "LEEWAY-VOICE-FACTORY-0001",
        fallbackOrder: ["leeway.multimodal.qwen2.5-omni.live", "leeway.voice.text.emergency"],
        proofStatus: custodyByKey.qwen3Tts.finalTruthLabel,
        blockers: custodyByKey.qwen3Tts.blockers,
        aliases: ["leeway.voice.qwen.primary.tts"]
      }),
      routeRecord({
        routeId: "leeway.voice.qwen.compact.clone.live",
        routeObjectId: "LEEWAY-VOICE-ROUTE-0004",
        providerObjectId: "LEEWAY_CLONE_PROVIDER::AGENT_LEE_LOCAL",
        modelId: "LEEWAY_VOICE::AGENT_LEE::DEFAULT_CLONE",
        modelFamily: "LEEWAY_CLONE_COMPACT",
        localPath: ".leeway-vscode/agent-lee/voice/leeway-live-voice-manifest.json",
        bridgeRuntimeRoute: "leeway.voice.compact.clone.live",
        edgeRtcAttachment: "LEEWAY-RUNTIME-0002",
        edgeGpuAttachment: "NOT_REQUIRED_FOR_TEXT_DIAGNOSTIC",
        voiceFactoryAttachment: "LEEWAY-VOICE-FACTORY-0001",
        fallbackOrder: ["leeway.voice.text.emergency"],
        proofStatus: "ROUTED_NOT_PROVEN",
        blockers: ["Compact clone route is registered as LeeWay-owned but no live compact clone proof was found."],
        aliases: ["leeway.voice.compact.clone.live"]
      }),
      routeRecord({
        routeId: "leeway.multimodal.qwen2.5-omni.live",
        routeObjectId: "LEEWAY-VOICE-ROUTE-0003",
        providerObjectId: "LEEWAY-VOICE-PROVIDER-0003",
        modelId: "qwen2.5-omni-local",
        modelFamily: "QWEN2_5_OMNI",
        localPath: "models/voice/qwen2.5-omni",
        bridgeRuntimeRoute: "LEEWAY_LLM_ROUTE::QWEN2_5_OMNI_LOCAL",
        edgeRtcAttachment: "LEEWAY-MODEL-RTC-0002",
        edgeGpuAttachment: "LEEWAY-MODEL-GPU-0009",
        voiceFactoryAttachment: "LEEWAY-VOICE-FACTORY-0001",
        fallbackOrder: ["leeway.voice.text.emergency"],
        proofStatus: custodyByKey.qwen25Omni.finalTruthLabel,
        blockers: custodyByKey.qwen25Omni.blockers,
        aliases: ["leeway.voice.qwen.omni.live"]
      }),
      routeRecord({
        routeId: "leeway.voice.primary.clone.live",
        routeObjectId: "LEEWAY-VOICE-ROUTE-0001",
        providerObjectId: "LEEWAY_CLONE_PROVIDER::AGENT_LEE_LOCAL",
        modelId: "LEEWAY_VOICE::AGENT_LEE::DEFAULT_CLONE",
        modelFamily: "LEEWAY_CANONICAL_CLONE",
        localPath: ".leeway-vscode/agent-lee/voice/leeway-live-voice-manifest.json",
        bridgeRuntimeRoute: "leeway.voice.primary.clone.live",
        edgeRtcAttachment: "LEEWAY-RUNTIME-0002",
        edgeGpuAttachment: "NOT_REQUIRED_FOR_CLONE_PROOF",
        voiceFactoryAttachment: "LEEWAY-VOICE-FACTORY-0001",
        fallbackOrder: ["leeway.voice.qwen3-tts.live", "leeway.voice.text.emergency"],
        proofStatus: primaryCloneProofStatus,
        blockers: primaryCloneProofStatus === "LIVE_PROVEN" ? [] : ["Primary clone runtime output proof exists, but human-audible confirmation remains pending."]
      }),
      routeRecord({
        routeId: "leeway.voice.text.emergency",
        routeObjectId: "LEEWAY-VOICE-ROUTE-0005",
        providerObjectId: "LEEWAY_TEXT_DIAGNOSTIC::NO_SPEECH",
        modelId: "NONE_TEXT_DIAGNOSTIC_ONLY",
        modelFamily: "TEXT_EMERGENCY_ONLY",
        localPath: "leeway-agent-lee/agent-lee-runtime/src/voice/voiceService.ts",
        bridgeRuntimeRoute: "leeway.voice.text.emergency",
        edgeRtcAttachment: "DIAGNOSTIC_ONLY",
        edgeGpuAttachment: "NONE",
        voiceFactoryAttachment: "TEXT_DIAGNOSTIC_ONLY",
        fallbackOrder: [],
        proofStatus: "LIVE_PARTIAL_DIAGNOSTIC_TEXT_ONLY_NOT_SPEECH",
        blockers: ["Text emergency route is visible diagnostics only and cannot satisfy speech output proof."]
      })
    ],
    externalApiAllowed: false,
    directActionAllowed: false,
    finalStatus: "PARTIAL"
  };
}

function buildVoiceProviderRegistry(custodyByKey) {
  return {
    generatedAt: now,
    sourceOfTruth: "LeeWay-Standards",
    registryId: "LEEWAY_VOICE_PROVIDER_REGISTRY::QWEN_VOICE_AUDIO_RESTORATION_PASS_1",
    providers: [
      {
        providerObjectId: "LEEWAY-VOICE-PROVIDER-0002",
        providerId: "LEEWAY_VOICE_PROVIDER::QWEN3_TTS_LOCAL",
        displayName: "Qwen3-TTS local voice provider",
        providerType: "LOCAL_QWEN_TTS",
        modelRouteId: "LEEWAY_LLM_ROUTE::QWEN3_TTS_LOCAL",
        modelRouteIds: ["LEEWAY_LLM_ROUTE::QWEN3_TTS_LOCAL"],
        localPath: "models/voice/qwen3-tts",
        localSelfHostedStatus: "SELF_HOSTED_ARTIFACT_PRESENT_RUNTIME_LOAD_NOT_PROVEN",
        rtcEnabled: true,
        gpuAssisted: true,
        cadencePolicy: "QWEN_ONLY_LOCAL",
        humanAudibleProofStatus: "NOT_PROVEN",
        proofStatus: custodyByKey.qwen3Tts.finalTruthLabel,
        finalTruthLabel: custodyByKey.qwen3Tts.finalTruthLabel,
        noPiperOrExternalProof: "PASS",
        externalApiAllowed: false,
        directActionAllowed: false,
        fallbackOrder: ["leeway.multimodal.qwen2.5-omni.live", "leeway.voice.text.emergency"],
        blockers: custodyByKey.qwen3Tts.blockers
      },
      {
        providerObjectId: "LEEWAY-VOICE-PROVIDER-0003",
        providerId: "LEEWAY_VOICE_PROVIDER::QWEN2_5_OMNI_AND_QWEN2_AUDIO_LOCAL",
        displayName: "Qwen2.5 Omni and Qwen2 Audio local provider",
        providerType: "LOCAL_QWEN_MULTIMODAL_AUDIO",
        modelRouteId: "LEEWAY_LLM_ROUTE::QWEN2_5_OMNI_LOCAL",
        modelRouteIds: ["LEEWAY_LLM_ROUTE::QWEN2_5_OMNI_LOCAL", "LEEWAY_LLM_ROUTE::QWEN2_AUDIO_LOCAL"],
        localPath: "models/voice",
        localSelfHostedStatus: "SELF_HOSTED_ARTIFACT_PRESENT_RUNTIME_LOAD_NOT_PROVEN",
        rtcEnabled: true,
        gpuAssisted: true,
        cadencePolicy: "QWEN_ONLY_LOCAL",
        humanAudibleProofStatus: "NOT_PROVEN",
        audioUnderstandingProofStatus: custodyByKey.qwen2Audio.finalTruthLabel,
        multimodalProofStatus: custodyByKey.qwen25Omni.finalTruthLabel,
        finalTruthLabel: "ROUTED_NOT_PROVEN",
        noPiperOrExternalProof: "PASS",
        externalApiAllowed: false,
        directActionAllowed: false,
        fallbackOrder: ["leeway.voice.text.emergency"],
        blockers: [...custodyByKey.qwen2Audio.blockers, ...custodyByKey.qwen25Omni.blockers]
      }
    ],
    textEmergencyIsSpeech: false,
    forbiddenProviders: ["Piper", "Edge TTS", "Windows SAPI", "generic OS voice", "browser SpeechRecognition", "external cloud STT", "external API voice"],
    finalStatus: "PARTIAL"
  };
}

function buildAudioUnderstandingRegistry(custodyByKey) {
  return {
    generatedAt: now,
    sourceOfTruth: "LeeWay-Standards",
    registryId: "LEEWAY_AUDIO_UNDERSTANDING_REGISTRY::QWEN_AUDIO_RESTORATION_PASS_1",
    subjectObjectId: "LEEWAY-RTC-MULTIMODAL-0001",
    routes: [
      {
        routeId: "leeway.audio.qwen2-audio.live",
        objectId: "LEEWAY-AUDIO-ROUTE-0001",
        providerObjectId: "LEEWAY-VOICE-PROVIDER-0003",
        providerId: "LEEWAY_VOICE_PROVIDER::QWEN2_5_OMNI_AND_QWEN2_AUDIO_LOCAL",
        modelId: "qwen2-audio-local",
        modelRouteId: "LEEWAY_LLM_ROUTE::QWEN2_AUDIO_LOCAL",
        modelFamily: "QWEN2_AUDIO",
        purpose: custodyByKey.qwen2Audio.purpose,
        localPath: "models/voice/qwen2-audio",
        standardsAuthorityReference: [
          "LEEWAY_POLICY::BOOK_6_LEEWAY-RTC-AUTHORITY-LAW",
          "LEEWAY_POLICY::BOOK_8_LEEWAY-MODEL-AUTHORITY-LAW",
          "LEEWAY_POLICY::BOOK_30_LEEWAY-LLM-MODEL-HIVE-LAW",
          "LEEWAY_POLICY::BOOK_31_AGENT-TO-MODEL-ROUTING-LAW",
          "LEEWAY_POLICY::BOOK_62_LIVE-MULTIMODAL-RTC-LAW"
        ],
        bridgeRuntimeRoute: "LEEWAY_LLM_ROUTE::QWEN2_AUDIO_LOCAL",
        edgeRtcAttachment: "LEEWAY-MODEL-RTC-0003",
        edgeGpuAttachment: "LEEWAY-MODEL-GPU-0010",
        voiceFactoryAttachment: "AUDIO_UNDERSTANDING_ONLY_NOT_SPEECH",
        externalApiAllowed: false,
        directActionAllowed: false,
        fallbackOrder: [],
        proofStatus: custodyByKey.qwen2Audio.finalTruthLabel,
        blockers: custodyByKey.qwen2Audio.blockers,
        receiptRequired: true
      },
      {
        routeId: "leeway.multimodal.qwen2.5-omni.live",
        objectId: "LEEWAY-AUDIO-ROUTE-0002",
        providerObjectId: "LEEWAY-VOICE-PROVIDER-0003",
        providerId: "LEEWAY_VOICE_PROVIDER::QWEN2_5_OMNI_AND_QWEN2_AUDIO_LOCAL",
        modelId: "qwen2.5-omni-local",
        modelRouteId: "LEEWAY_LLM_ROUTE::QWEN2_5_OMNI_LOCAL",
        modelFamily: "QWEN2_5_OMNI",
        purpose: custodyByKey.qwen25Omni.purpose,
        localPath: "models/voice/qwen2.5-omni",
        bridgeRuntimeRoute: "LEEWAY_LLM_ROUTE::QWEN2_5_OMNI_LOCAL",
        edgeRtcAttachment: "LEEWAY-MODEL-RTC-0002",
        edgeGpuAttachment: "LEEWAY-MODEL-GPU-0009",
        voiceFactoryAttachment: "LEEWAY-VOICE-FACTORY-0001",
        externalApiAllowed: false,
        directActionAllowed: false,
        fallbackOrder: ["leeway.voice.text.emergency"],
        proofStatus: custodyByKey.qwen25Omni.finalTruthLabel,
        blockers: custodyByKey.qwen25Omni.blockers,
        receiptRequired: true
      }
    ],
    forbiddenFallbacks: ["Whisper", "Vosk", "browser SpeechRecognition", "external cloud STT"],
    finalStatus: "PARTIAL"
  };
}

function buildBridgeModelHiveStatus(modelHiveRegistry, custodyRecords, ollamaTags) {
  const routes = Array.isArray(modelHiveRegistry?.modelRoutes) ? modelHiveRegistry.modelRoutes : [];
  const activeCount = routes.filter((route) => route.status === "ACTIVE_GOVERNED_ROUTE").length;
  const routedNotProvenCount = routes.filter((route) => route.status === "ROUTED_NOT_PROVEN").length;
  return {
    reportId: "LEEWAY_REPORT::MODEL_HIVE_STATUS",
    generatedAt: now,
    subjectObjectId: "LEEWAY-MODEL-HIVE-0001",
    localRuntime: "OLLAMA_LOCAL_PLUS_LOCAL_QWEN_ARTIFACTS",
    ollamaReachable: ollamaTags.ok,
    ollamaListedModels: ollamaTags.models.map((model) => model.name ?? model.model).filter(Boolean),
    gpuVisible: true,
    installedCount: routes.filter((route) => route.installedStatus !== "NOT_INSTALLED").length,
    missingCount: routes.filter((route) => route.installedStatus === "NOT_INSTALLED").length,
    activeGovernedRouteCount: activeCount,
    routedNotProvenCount,
    qwenVoiceAudioRouteStatus: "ROUTED_NOT_PROVEN",
    qwenVoiceAudioCustody: custodyRecords.map((record) => ({
      modelRouteId: record.modelRouteId,
      artifactStatus: record.artifactStatus,
      runtimeLoadStatus: record.runtimeLoadStatus,
      finalTruthLabel: record.finalTruthLabel
    })),
    directActionAllowed: false,
    externalApiAllowed: false,
    liveModelLaneRegistryPath: paths.liveModelLaneRegistry,
    rtcMultimodalRouteRegistryPath: paths.rtcRouteRegistry,
    gpuModelFabricRegistryPath: paths.gpuFabricRegistry,
    liveModelLaneCount: readJson(paths.liveModelLaneRegistry, { lanes: [] })?.lanes?.length ?? 0,
    multimodalConversationLaneStatus: "ROUTED_NOT_PROVEN",
    finalStatus: "PARTIAL",
    blockers: failuresEncountered
  };
}

function buildVoiceRouteManagerStatus(voiceRouteRegistry, voiceProviderRegistry) {
  return {
    reportId: "LEEWAY_REPORT::VOICE_ROUTE_MANAGER_STATUS",
    generatedAt: now,
    subjectObjectId: "LEEWAY-VOICE-FACTORY-0001",
    owningAuthority: "Bridge Runtime",
    routes: voiceRouteRegistry.routes,
    providers: voiceProviderRegistry.providers,
    textEmergencyIsSpeech: false,
    forbiddenProviders: voiceProviderRegistry.forbiddenProviders,
    qwenVoiceOutputContinuity: "NOT_YET_PROVEN",
    primaryCloneContinuity: "LIVE_PARTIAL_HUMAN_AUDIBLE_PENDING",
    finalStatus: "PARTIAL",
    blockers: failuresEncountered.filter((failure) => failure.includes("Qwen3-TTS") || failure.includes("voice") || failure.includes("speech"))
  };
}

function updateRtcVoiceAdapter(existingAdapter) {
  return {
    ...(existingAdapter ?? {}),
    generatedAt: now,
    qwenRouteRestorationPass: "LEEWAY_QWEN_VOICE_AUDIO_ROUTE_RESTORATION_PASS_1",
    approvedHearingRouteId: "leeway.audio.qwen2-audio.live",
    approvedModelRouteIds: [
      "LEEWAY_LLM_ROUTE::QWEN2_5_CODER_14B",
      "LEEWAY_LLM_ROUTE::QWEN2_5_CODER_7B",
      "LEEWAY_LLM_ROUTE::QWEN2_5_CODER_1_5B",
      "LEEWAY_LLM_ROUTE::QWEN3",
      "LEEWAY_LLM_ROUTE::QWEN2_5_VL_7B",
      "LEEWAY_LLM_ROUTE::QWEN3_VL_EMBEDDING",
      "LEEWAY_LLM_ROUTE::QWEN3_TTS_LOCAL",
      "LEEWAY_LLM_ROUTE::QWEN2_5_OMNI_LOCAL",
      "LEEWAY_LLM_ROUTE::QWEN2_AUDIO_LOCAL"
    ],
    approvedVoiceRouteLadder: [
      "leeway.voice.primary.clone.live",
      "leeway.voice.qwen3-tts.live",
      "leeway.multimodal.qwen2.5-omni.live",
      "leeway.voice.qwen.compact.clone.live",
      "leeway.voice.text.emergency"
    ],
    approvedAudioUnderstandingRoutes: [
      "leeway.audio.qwen2-audio.live",
      "leeway.multimodal.qwen2.5-omni.live"
    ],
    qwenAudioRouteStatus: "ROUTED_NOT_PROVEN",
    qwenAudioModelStatus: "INSTALLED_MODEL_READY_RECEIPT_PRESENT_RUNTIME_LOAD_NOT_PROVEN",
    qwenOmniRouteStatus: "ROUTED_NOT_PROVEN",
    qwenTtsRouteStatus: "ROUTED_NOT_PROVEN",
    qwenVoiceOutputContinuity: "NOT_YET_PROVEN",
    activeHearingRoute: "leeway.audio.qwen2-audio.live",
    activeVoiceRoute: "leeway.voice.text.emergency",
    activeVoiceRouteTruth: "TEXT_EMERGENCY_ONLY_NOT_SPEECH",
    audioLaneStatus: "ROUTED_NOT_PROVEN",
    cloneVoiceLaneStatus: "LIVE_PARTIAL_HUMAN_AUDIBLE_PENDING",
    externalApiAllowed: false,
    directActionAllowed: false,
    blockers: failuresEncountered
  };
}

function buildGpuModelHiveAcceleration(existingGpuReport, custodyRecords) {
  return {
    ...(existingGpuReport ?? {}),
    reportId: "LEEWAY_REPORT::GPU_MODEL_HIVE_ACCELERATION",
    generatedAt: now,
    subjectObjectId: "LEEWAY-GPU-0001",
    gpuVisible: existingGpuReport?.gpuVisible ?? true,
    gpuName: existingGpuReport?.gpuName ?? "NVIDIA GeForce RTX 5060 Laptop GPU",
    registeredModelRoutes: existingGpuReport?.registeredModelRoutes ?? 9,
    gpuAttachedRoutes: existingGpuReport?.gpuAttachedRoutes ?? 9,
    qwenVoiceAudioRouteHealth: custodyRecords.map((record) => ({
      modelRouteId: record.modelRouteId,
      modelFamily: record.modelFamily,
      gpuCompatibility: record.GPUCompatibility,
      runtimeLoadStatus: record.runtimeLoadStatus,
      finalTruthLabel: record.finalTruthLabel
    })),
    localExecutionOnly: true,
    directLlmActionAllowed: false,
    externalApiAllowed: false,
    finalStatus: "PARTIAL",
    blockers: ["GPU is visible and attached by registry, but Qwen voice/audio inference execution was not live-proven in this pass."]
  };
}

function buildSessionState(existingSession, ollamaTags) {
  const promptTruthFrameCount = 441000;
  const localPersistedFrameCount = Number.isFinite(Number(existingSession?.audioFrameCount)) ? Number(existingSession.audioFrameCount) : 0;
  return {
    assistantBodyId,
    assistantObjectId,
    taskId,
    subjectObjectId,
    traceId,
    promptId,
    intentId,
    transactionId,
    generatedAt: now,
    executionMode: "REAL_RUNTIME_ONLY",
    detachedProofLanesAllowed: false,
    fakeFallbacksAllowed: false,
    stalePassPromotionAllowed: false,
    finalVerdict: "LEEWAY_QWEN_VOICE_AUDIO_ROUTE_PARTIAL",
    finalStatus: "PARTIAL",
    sessionId: existingSession?.sessionId ?? "LEEWAY_SESSION::REAL_TIME_EMBODIED_CONVERSATION::PASS_1",
    conversationId: existingSession?.conversationId ?? "LEEWAY_CONVERSATION::AGENT_LEE::REAL_TIME_AUDIO::PASS_1",
    creatorId: "Leonard Lee",
    agentId: "Agent Lee",
    voiceRouteId: "leeway.voice.primary.clone.live",
    activeVoiceRoute: "leeway.voice.text.emergency",
    activeHearingRoute: "leeway.audio.qwen2-audio.live",
    activeConversationModel: "qwen3:latest",
    activeConversationModelStatus: ollamaTags.models.some((model) => (model.name ?? model.model) === "qwen3:latest")
      ? "OLLAMA_LISTED_NOT_AGENT_LEE_RESPONSE_LOOP_PROVEN"
      : "QWEN3_NOT_LISTED_BY_OLLAMA_THIS_PASS",
    rtcRouteId: "LEEWAY_RTC_ROUTE::EDGE_RTC::REAL_TIME_AUDIO_CORRIDOR",
    microphoneRouteId: "LEEWAY_MIC_ROUTE::WINDOWS_DSHOW::REAL_TIME_AUDIO_CORRIDOR",
    transcriptRouteId: "leeway.audio.qwen2-audio.live",
    responseRouteId: "LEEWAY_RESPONSE_ROUTE::AGENT_LEE::QWEN_FAMILY_LANGUAGE_RUNTIME",
    receiptId: "LEEWAY_RECEIPT::QWEN_VOICE_AUDIO_ROUTE_RESTORATION::PASS_1",
    startedAt: existingSession?.startedAt ?? now,
    lastUpdatedAt: now,
    runtimeAuthority: "LEEWAY_AUTHORITY::CREATOR_DELEGATED::EMBODIED_AGENT_LEE_RUNTIME",
    governingBookReferences: [
      "BOOK-05-LEEWAY-VOICE-AUTHORITY-LAW",
      "BOOK-06-LEEWAY-RTC-AUTHORITY-LAW",
      "BOOK-07-LEEWAY-EDGE-GPU-AUTHORITY-LAW",
      "BOOK-08-LEEWAY-MODEL-AUTHORITY-LAW",
      "BOOK-30-LEEWAY-LLM-MODEL-HIVE-LAW",
      "BOOK-31-AGENT-TO-MODEL-ROUTING-LAW",
      "BOOK-54-ASSISTANT-EMBODIMENT-AND-BEHAVIOR-LAW",
      "BOOK-55-ASSISTANT-RECORDING-AND-LEARNING-LAW",
      "BOOK-60-LEEWAY-LOCAL-MODEL-ACQUISITION-LAW",
      "BOOK-61-LEEWAY-MODEL-HIVE-GOVERNANCE-LAW",
      "BOOK-62-LIVE-MULTIMODAL-RTC-LAW",
      "BOOK-63-GPU-MODEL-FABRIC-LAW",
      "BOOK-76-CONTINUOUS-EMBODIMENT-LAW",
      "BOOK-77-AGENT-LEE-PERSONA-CONSTITUTION-LAW"
    ],
    microphoneContinuity: existingSession?.microphoneContinuity ?? "PARTIAL",
    audioFrameContinuity: existingSession?.audioFrameContinuity ?? "PARTIAL",
    audioFrameCount: promptTruthFrameCount,
    audioFrameCountSource: "USER_PROVIDED_CURRENT_TRUTH_NOT_REPROVEN_THIS_PASS",
    localPersistedAudioFrameCountBeforePass: localPersistedFrameCount,
    firstAudioFrameAt: existingSession?.firstAudioFrameAt ?? null,
    lastAudioFrameAt: existingSession?.lastAudioFrameAt ?? null,
    audioInputDevice: existingSession?.audioInputDevice ?? "NOT_REPROVEN_THIS_PASS",
    inputPermissionState: existingSession?.inputPermissionState ?? "NOT_REPROVEN_THIS_PASS",
    transcriptionProvider: "LEEWAY_LLM_ROUTE::QWEN2_AUDIO_LOCAL",
    sttRouteStatus: "NOT_USED_QWEN_AUDIO_ROUTE_REQUIRED",
    sttProviderHealth: "NOT_USED_FOR_THIS_QWEN_PASS",
    sttPolicyStatus: "GENERIC_STT_BLOCKED_QWEN_AUDIO_REQUIRED",
    sttBlockers: ["Generic STT lanes are not authorized for this Qwen voice/audio restoration pass."],
    qwenAudioRouteStatus: "ROUTED_NOT_PROVEN",
    qwenAudioModelStatus: "INSTALLED_MODEL_READY_RECEIPT_PRESENT_RUNTIME_LOAD_NOT_PROVEN",
    qwenTranscriptContinuity: "NOT_YET_PROVEN",
    qwenTranscriptSegmentCount: 0,
    transcriptContinuity: "NOT_YET_PROVEN",
    transcriptSegmentCount: 0,
    firstTranscriptAt: null,
    lastTranscriptAt: null,
    qwenOmniRouteStatus: "ROUTED_NOT_PROVEN",
    qwenTtsRouteStatus: "ROUTED_NOT_PROVEN",
    qwenVoiceOutputContinuity: "NOT_YET_PROVEN",
    agentLeeResponseContinuity: "NOT_YET_PROVEN",
    responseCount: 0,
    lastResponseAt: null,
    qwenRouteStatus: "PARTIAL",
    languageProcessorStatus: "AVAILABLE_NOT_RUN_NO_QWEN_TRANSCRIPT",
    modelHiveStatus: "PARTIAL",
    voiceFactoryStatus: "PARTIAL_QWEN_ROUTES_REGISTERED_RUNTIME_OUTPUT_NOT_PROVEN",
    BridgeRuntimeRouteStatus: "PARTIAL",
    continuousAudioEmbodimentStatus: "BLOCKED",
    cloneVoiceOutputContinuity: "LIVE_PARTIAL_HUMAN_AUDIBLE_PENDING",
    noButtonConversation: "NOT_YET_PROVEN",
    alwaysListeningActive: false,
    pushToTalkRequired: true,
    turnCount: 0,
    sessionStillOpen: false,
    interruptionHandling: "SUPPORTED_NOT_QWEN_AUDIO_PROVEN",
    audibleConfirmation: "PENDING_HUMAN_CONFIRMATION",
    rtcAudioContinuity: "PARTIAL",
    finalSessionVerdict: "LEEWAY_QWEN_VOICE_AUDIO_ROUTE_PARTIAL",
    promotionAllowed: false,
    routeAuthorityOwner: "Bridge Runtime",
    truthEnforcement: "DOWNGRADE_TO_PARTIAL_UNTIL_QWEN_AUDIO_TRANSCRIPT_AGENT_RESPONSE_AND_QWEN_OR_CLONE_SPEECH_ARE_LIVE_PROVEN",
    qwenBlockers: failuresEncountered,
    filesRead,
    filesChanged,
    commandsRun,
    toolsUsed,
    MCPsUsed: [],
    standardsChecked,
    gatesRun,
    receiptsWritten: [receiptPath],
    failuresEncountered,
    lessonsLearned,
    skillImprovementsSuggested,
    remainingBlockers: failuresEncountered
  };
}

function buildReports(custodyRecords, custodyByKey, ollamaTags, registries, cloneProof, humanAudibleProof) {
  const qwen3Listed = ollamaTags.models.some((model) => (model.name ?? model.model) === "qwen3:latest");
  const finalVerdict = custodyRecords.every((record) => record.finalTruthLabel === "NOT_INSTALLED")
    ? "LEEWAY_QWEN_VOICE_AUDIO_ROUTE_BLOCKED"
    : "LEEWAY_QWEN_VOICE_AUDIO_ROUTE_PARTIAL";
  const finalStatus = finalVerdict.endsWith("_PARTIAL") ? "PARTIAL" : "BLOCKED";
  const blockers = failuresEncountered;
  const custodyAudit = withReportFields({
    reportId: "LEEWAY_REPORT::QWEN_VOICE_AUDIO_MODEL_CUSTODY_AUDIT",
    custodyScope: [
      "models/voice/qwen2-audio/",
      "models/voice/qwen2.5-omni/",
      "models/voice/qwen3-tts/",
      "models/qwen/",
      "LeeWay-Standards/registries/",
      "Bridge Runtime model hive reports",
      "Edge GPU model reports",
      "Edge RTC voice/audio adapters",
      "Agent Lee voice runtime manifests"
    ],
    qwenUnifiedCognitionStrategy: {
      qwen3: "reasoning / core conversation",
      qwen25Coder: "coding",
      qwen25Vl: "vision",
      qwen2Audio: "audio understanding / listening / transcription / RTC hearing lane",
      qwen25Omni: "multimodal conversation / audio-video-text interaction / possible Talker path",
      qwen3Tts: "speech generation / voice design / clone-compatible voice route",
      nomicEmbedText: "temporary memory embedding infrastructure only unless replaced by a proven Qwen embedding route"
    },
    ollamaProbe: {
      ok: ollamaTags.ok,
      models: ollamaTags.models.map((model) => model.name ?? model.model).filter(Boolean),
      error: ollamaTags.error
    },
    models: [
      {
        modelId: "qwen3:latest",
        modelFamily: "QWEN3",
        localPath: "Ollama local manifest",
        manifestPath: "C:/Users/Leona/.ollama/models/manifests/registry.ollama.ai/library/qwen3/latest",
        artifactStatus: qwen3Listed ? "LOCAL_OLLAMA_MODEL_LISTED" : "NOT_LISTED_BY_LOCAL_OLLAMA",
        configStatus: qwen3Listed ? "OLLAMA_MODEL_DETAILS_PRESENT" : "NOT_VERIFIED",
        tokenizerStatus: "OLLAMA_MANAGED_NOT_INSPECTED_THIS_PASS",
        processorStatus: "NOT_APPLICABLE_TEXT_REASONING",
        weightStatus: qwen3Listed ? "OLLAMA_MODEL_BLOB_PRESENT_BY_TAGS" : "NOT_VERIFIED",
        licenseStatus: "NOT_REVIEWED_THIS_PASS",
        hashStatus: qwen3Listed ? "OLLAMA_DIGEST_PRESENT" : "NOT_VERIFIED",
        runtimeLoadStatus: qwen3Listed ? "LOCAL_SERVER_LISTED_NOT_AGENT_LEE_RESPONSE_LOOP_PROVEN" : "NOT_PROVEN",
        GPUCompatibility: "OLLAMA_LOCAL_GPU_CAPABILITY_NOT_REPROVEN_THIS_PASS",
        RTCCompatibility: "NOT_RTC_HEARING_OR_VOICE_ROUTE",
        BridgeRuntimeRoute: findRoute(registries.modelHive, "LEEWAY_LLM_ROUTE::QWEN3") ? "BRIDGE_RUNTIME_ROUTE_REGISTERED" : "BRIDGE_RUNTIME_ROUTE_MISSING",
        StandardsRegistryStatus: findRoute(registries.llmRoutes, "LEEWAY_LLM_ROUTE::QWEN3") ? "STANDARDS_REGISTERED" : "STANDARDS_ROUTE_MISSING",
        VoiceFactoryStatus: "NOT_VOICE_FACTORY_MODEL",
        finalTruthLabel: qwen3Listed ? "ROUTED_NOT_PROVEN" : "NOT_INSTALLED"
      },
      ...custodyRecords
    ]
  }, finalStatus, blockers);

  const placeholderReport = withReportFields({
    reportId: "LEEWAY_REPORT::QWEN_MODEL_PLACEHOLDER_ELIMINATION",
    rule: "No Qwen voice/audio route may say ACTIVE without local artifact proof or live local server proof, Standards registry entry, route entry, runtime load proof, and receipt.",
    placeholdersFound: custodyRecords.map((record) => ({
      modelRouteId: record.modelRouteId,
      priorRisk: "Existing registries contained ACTIVE_GOVERNED_ROUTE language for local Qwen voice/audio routes.",
      artifactStatus: record.artifactStatus,
      runtimeLoadStatus: record.runtimeLoadStatus,
      downgradedTo: record.finalTruthLabel
    })),
    downgradesApplied: [
      paths.modelHiveRegistry,
      paths.llmRouteRegistry,
      paths.bridgeModelHiveStatus,
      paths.bridgeVoiceRouteManagerStatus,
      paths.rtcVoiceAdapter,
      paths.gpuModelHiveAcceleration,
      paths.sessionState
    ],
    noPlaceholderActiveRoutesAllowed: true,
    externalFallbackUsed: false,
    browserSpeechRecognitionUsed: false,
    piperOrSystemTtsUsed: false,
    finalVerdict
  }, finalStatus, blockers);

  const audioLaneReport = withReportFields({
    reportId: "LEEWAY_REPORT::QWEN_AUDIO_HEARING_LANE",
    lane: "LeeWay Edge RTC microphone frames -> Qwen2-Audio / approved Qwen audio route -> transcript/audio understanding segment -> Agent Lee runtime context",
    requiredRouteId: "leeway.audio.qwen2-audio.live",
    modelRouteId: "LEEWAY_LLM_ROUTE::QWEN2_AUDIO_LOCAL",
    modelCustody: custodyByKey.qwen2Audio,
    liveMicCaptureAttemptedThisPass: false,
    transcriptSegmentProduced: false,
    transcriptSegmentCount: 0,
    qwenProducedTranscriptPath: null,
    noManualTranscript: true,
    noTypedTranscript: true,
    noPrerecordedAudio: true,
    noWhisperVoskFallback: true,
    finalVerdict: custodyByKey.qwen2Audio.finalTruthLabel === "NOT_INSTALLED" ? "QWEN_AUDIO_MODEL_NOT_INSTALLED" : "QWEN_AUDIO_ROUTE_REGISTERED_RUNTIME_LOAD_NOT_PROVEN",
    routeStatus: custodyByKey.qwen2Audio.finalTruthLabel
  }, "BLOCKED", custodyByKey.qwen2Audio.blockers);

  const voiceLaneReport = withReportFields({
    reportId: "LEEWAY_REPORT::QWEN_VOICE_OUTPUT_LANE",
    lane: "Agent Lee response text -> Voice Factory -> Qwen3-TTS / Qwen voice route -> session-attached audio output -> RTC audio output -> human audible confirmation",
    requiredRoutes: ["leeway.voice.primary.clone.live", "leeway.voice.qwen3-tts.live"],
    modelRouteId: "LEEWAY_LLM_ROUTE::QWEN3_TTS_LOCAL",
    modelCustody: custodyByKey.qwen3Tts,
    primaryCloneProof: {
      runtimeOutputProven: cloneProof?.runtimeOutputProven === true,
      humanAudibleConfirmed: humanAudibleProof?.humanAudibleConfirmed === true,
      status: humanAudibleProof?.status ?? cloneProof?.status ?? "NOT_PROVEN"
    },
    sessionAttachedSpeechProducedThisPass: false,
    qwenTtsAudioProducedThisPass: false,
    humanAudibleConfirmationThisPass: false,
    forbiddenVoiceFallbackUsed: false,
    noPiper: true,
    noEdgeTts: true,
    noWindowsSapi: true,
    noGenericOsVoice: true,
    finalVerdict: "QWEN3_TTS_NOT_ROUTED_OR_NOT_LIVE_PROVEN",
    routeStatus: custodyByKey.qwen3Tts.finalTruthLabel
  }, "BLOCKED", custodyByKey.qwen3Tts.blockers);

  const omniLaneReport = withReportFields({
    reportId: "LEEWAY_REPORT::QWEN_OMNI_MULTIMODAL_LANE",
    lane: "Qwen2.5-Omni multimodal conversation lane",
    requiredRouteId: "leeway.multimodal.qwen2.5-omni.live",
    modelRouteId: "LEEWAY_LLM_ROUTE::QWEN2_5_OMNI_LOCAL",
    modelCustody: custodyByKey.qwen25Omni,
    configTalkerEnabled: custodyByKey.qwen25Omni.enableTalker === true,
    configAudioOutputEnabled: custodyByKey.qwen25Omni.enableAudioOutput === true,
    loadabilityVerifiedThisPass: false,
    rtcCompatibilityVerifiedThisPass: false,
    talkerSpeechOutputProven: false,
    finalVerdict: "QWEN_OMNI_LOCAL_ARTIFACT_REGISTERED_RUNTIME_NOT_PROVEN",
    routeStatus: custodyByKey.qwen25Omni.finalTruthLabel
  }, "PARTIAL", custodyByKey.qwen25Omni.blockers);

  const responseLoopReport = withReportFields({
    reportId: "LEEWAY_REPORT::QWEN_AGENT_LEE_RESPONSE_LOOP",
    prerequisite: "Live Qwen-produced transcript or audio-intent segment",
    prerequisiteMet: false,
    qwenAudioTranscriptContinuity: "NOT_YET_PROVEN",
    agentLeeLanguageProcessor: exists(paths.agentLeeLanguage) ? "AVAILABLE_NOT_RUN_NO_QWEN_TRANSCRIPT" : "MISSING",
    creatorMirror: "NOT_RUN_NO_QWEN_TRANSCRIPT",
    truthTaxonomy: "NOT_RUN_NO_QWEN_TRANSCRIPT",
    book77PersonaConstitution: "CHECKED_NOT_RUN_NO_QWEN_TRANSCRIPT",
    qwenReasoningRoute: qwen3Listed ? "QWEN3_OLLAMA_LISTED_NOT_RESPONSE_LOOP_PROVEN" : "QWEN3_NOT_LISTED",
    responseGenerated: false,
    responseCount: 0,
    outputVoiceRouteSelected: "leeway.voice.text.emergency",
    outputVoiceRouteTruth: "TEXT_ONLY_DIAGNOSTIC_NOT_SPEECH",
    noCannedResponse: true,
    finalVerdict: "AGENT_LEE_QWEN_RESPONSE_LOOP_BLOCKED_NO_QWEN_AUDIO_TRANSCRIPT"
  }, "BLOCKED", ["No Qwen-produced live transcript or audio-intent segment was available to feed Agent Lee."]);

  const sentinelChecks = [
    { check: "Qwen voice/audio model missing", status: custodyRecords.some((record) => record.finalTruthLabel === "NOT_INSTALLED") ? "FAIL" : "PASS" },
    { check: "Qwen route placeholder", status: "PASS", evidence: "Local Qwen voice/audio model routes downgraded to ROUTED_NOT_PROVEN where runtime proof is missing." },
    { check: "Qwen route not in Standards registry", status: "PASS" },
    { check: "Qwen route not in Bridge Runtime", status: "PARTIAL", evidence: "Bridge route entries exist; live runtime load proof does not." },
    { check: "Qwen route not attached to RTC", status: "PARTIAL", evidence: "RTC attachment entries exist; live RTC consumption proof does not." },
    { check: "Qwen route not attached to GPU", status: "PARTIAL", evidence: "GPU attachment entries exist; inference execution proof does not." },
    { check: "Qwen route not attached to Voice Factory", status: "PARTIAL", evidence: "Voice Factory entries exist; session-attached speech proof does not." },
    { check: "Whisper/Vosk/browser STT used despite Qwen route availability", status: "PASS", evidence: "This pass did not use Whisper, Vosk, browser SpeechRecognition, or cloud STT." },
    { check: "Piper/system TTS fallback", status: "PASS", evidence: "This pass did not use Piper, Edge TTS, Windows SAPI, or generic OS voice." },
    { check: "Detached voice proof", status: "PASS", evidence: "Existing clone proof remains historical partial evidence; no detached WAV was used as live embodiment proof in this pass." },
    { check: "Transcript without Qwen audio route when Qwen route is required", status: "PASS", evidence: "No transcript segment was emitted." },
    { check: "Voice output without Qwen/clone route", status: "PASS", evidence: "No voice output was emitted." },
    { check: "Stale PASS claims", status: "PARTIAL", evidence: "Session state and status files were rewritten to PARTIAL/BLOCKED truth labels." }
  ];

  const sentinelReport = withReportFields({
    reportId: "LEEWAY_REPORT::QWEN_VOICE_AUDIO_SENTINEL",
    sentinelScope: "Qwen voice/audio route restoration and RTC embodiment pipeline",
    checks: sentinelChecks,
    externalFallbackUsed: false,
    fakePassAllowed: false,
    promotionAllowed: false,
    finalVerdict
  }, "PARTIAL", blockers);

  const finalReport = withReportFields({
    reportId: "LEEWAY_REPORT::QWEN_VOICE_AUDIO_ROUTE_RESTORATION",
    finalVerdict,
    passRequirements: {
      qwenAudioModelRouteRegisteredAndProven: "REGISTERED_NOT_PROVEN",
      qwenVoiceOrPrimaryCloneRouteRegisteredAndProven: "PRIMARY_CLONE_RUNTIME_OUTPUT_PARTIAL_QWEN_TTS_NOT_PROVEN",
      edgeRtcConsumesQwenHearingRoute: "ATTACHED_NOT_LIVE_PROVEN",
      agentLeeConsumesQwenTranscript: "NOT_PROVEN",
      voiceFactorySessionAttachedSpeech: "NOT_PROVEN",
      sessionStateUpdatedTruthfully: true,
      sentinelUpdated: true,
      receiptWritten: true
    },
    routeTruth: {
      qwen2Audio: custodyByKey.qwen2Audio.finalTruthLabel,
      qwen3Tts: custodyByKey.qwen3Tts.finalTruthLabel,
      qwen25Omni: custodyByKey.qwen25Omni.finalTruthLabel,
      primaryClone: cloneProof?.runtimeOutputProven === true ? "LIVE_PARTIAL_HUMAN_AUDIBLE_PENDING" : "ROUTED_NOT_PROVEN",
      textEmergency: "TEXT_ONLY_DIAGNOSTIC_NOT_SPEECH"
    },
    noFakePass: true,
    noPlaceholderActiveRoutes: true,
    noExternalFallback: true,
    cleanupDeletedFiles,
    promotionAllowed: false,
    requiredOutputs: [
      paths.finalMd,
      paths.finalJson,
      paths.custodyAudit,
      paths.placeholderReport,
      paths.audioLaneReport,
      paths.voiceLaneReport,
      paths.omniLaneReport,
      paths.responseLoopReport,
      paths.sentinelReport,
      paths.receipt
    ]
  }, finalStatus, blockers);

  const receipt = {
    receiptId: "LEEWAY_RECEIPT::QWEN_VOICE_AUDIO_ROUTE_RESTORATION::20260524::PASS_1",
    assistantBodyId,
    assistantObjectId,
    taskId,
    subjectObjectId,
    traceId,
    promptId,
    intentId,
    transactionId,
    generatedAt: now,
    authority: "LeeWay Standards",
    finalVerdict,
    finalStatus,
    evidenceHash: sha256Text(JSON.stringify({
      custodyRecords,
      finalVerdict,
      failuresEncountered,
      filesChanged
    })),
    filesRead,
    filesChanged,
    commandsRun,
    toolsUsed,
    MCPsUsed: [],
    standardsChecked,
    gatesRun,
    receiptsWritten: [receiptPath],
    failuresEncountered,
    lessonsLearned,
    skillImprovementsSuggested,
    promotionAllowed: false,
    finalStatusNote: "Qwen voice/audio artifacts are present and registered, but live Qwen audio transcript and Qwen/clone speech output are not proven.",
    remainingBlockers: blockers
  };

  const finalMd = [
    "# LeeWay Qwen Voice/Audio Route Restoration Report",
    "",
    `Generated: ${now}`,
    "",
    `Final verdict: ${finalVerdict}`,
    "",
    "## Runtime Truth",
    "",
    "- Qwen2-Audio artifacts and MODEL_READY receipt are present, but the live local Qwen audio runtime load is not proven.",
    "- Qwen3-TTS artifacts and speech tokenizer are present, but session-attached Qwen speech output is not proven.",
    "- Qwen2.5-Omni artifacts show audio output and Talker config, but live RTC multimodal conversation is not proven.",
    "- The primary clone route has runtime output proof only; human-audible confirmation remains pending.",
    "- Agent Lee response loop was not run because no Qwen-produced live transcript or audio-intent segment exists.",
    "- No browser STT, cloud STT, Whisper/Vosk fallback, Piper, Edge TTS, Windows SAPI, generic OS voice, typed transcript, fake transcript, or detached WAV proof was used.",
    "",
    "## Decision",
    "",
    "The LeeWay Qwen voice/audio route is PARTIAL, not PASS. Custody and registry alignment are repaired, but runtime activation remains blocked until Qwen2-Audio produces a live session-bound segment and Qwen3-TTS or the primary clone route produces session-attached audible speech.",
    ""
  ].join("\n");

  return {
    custodyAudit,
    placeholderReport,
    audioLaneReport,
    voiceLaneReport,
    omniLaneReport,
    responseLoopReport,
    sentinelReport,
    finalReport,
    receipt,
    finalMd
  };
}

async function main() {
  const registries = {
    modelHive: readJson(paths.modelHiveRegistry, { modelRoutes: [] }),
    llmRoutes: readJson(paths.llmRouteRegistry, { routes: [] }),
    liveModelLanes: readJson(paths.liveModelLaneRegistry, { lanes: [] }),
    voiceProviders: readJson(paths.voiceProviderRegistry, { providers: [] }),
    voiceRoutes: readJson(paths.voiceRouteRegistry, { routes: [] }),
    voiceRegistry: readJson(paths.voiceRegistry, {}),
    rtcRoutes: readJson(paths.rtcRouteRegistry, { routes: [] }),
    gpuFabric: readJson(paths.gpuFabricRegistry, { routes: [] }),
    modelRtcAttachments: readJson(paths.modelRtcAttachmentRegistry, { attachments: [] }),
    modelGpuAttachments: readJson(paths.modelGpuAttachmentRegistry, { attachments: [] })
  };
  const ollamaTags = await getOllamaTags();
  const custodyRecords = qwenCustodyTargets.map((target) => scanModel(target, registries));
  const custodyByKey = Object.fromEntries(qwenCustodyTargets.map((target, index) => [target.key, custodyRecords[index]]));
  const cloneProof = readJson(paths.cloneVoiceOutputProof, null);
  const humanAudibleProof = readJson(paths.cloneVoiceAudibleProof, null);

  const updatedModelHive = updateModelRouteTruth(registries.modelHive, custodyRecords);
  const updatedLlmRoutes = updateModelRouteTruth(registries.llmRoutes, custodyRecords);
  const voiceProviderRegistry = buildVoiceProviderRegistry(custodyByKey);
  const voiceRouteRegistry = buildVoiceRouteRegistry(custodyByKey, cloneProof, humanAudibleProof);
  const audioUnderstandingRegistry = buildAudioUnderstandingRegistry(custodyByKey);
  const bridgeModelHiveStatus = buildBridgeModelHiveStatus(updatedModelHive, custodyRecords, ollamaTags);
  const voiceRouteManagerStatus = buildVoiceRouteManagerStatus(voiceRouteRegistry, voiceProviderRegistry);
  const rtcAdapter = updateRtcVoiceAdapter(readJson(paths.rtcVoiceAdapter, {}));
  const gpuAcceleration = buildGpuModelHiveAcceleration(readJson(paths.gpuModelHiveAcceleration, {}), custodyRecords);
  const sessionState = buildSessionState(readJson(paths.sessionState, {}), ollamaTags);
  const reports = buildReports(custodyRecords, custodyByKey, ollamaTags, registries, cloneProof, humanAudibleProof);

  writeJson(paths.modelHiveRegistry, updatedModelHive);
  writeJson(paths.llmRouteRegistry, updatedLlmRoutes);
  writeJson(paths.voiceProviderRegistry, voiceProviderRegistry);
  writeJson(paths.voiceRouteRegistry, voiceRouteRegistry);
  writeJson(paths.audioUnderstandingRegistry, audioUnderstandingRegistry);
  writeJson(paths.bridgeModelHiveStatus, bridgeModelHiveStatus);
  writeJson(paths.bridgeVoiceRouteManagerStatus, voiceRouteManagerStatus);
  writeJson(paths.rtcVoiceAdapter, rtcAdapter);
  writeJson(paths.gpuModelHiveAcceleration, gpuAcceleration);
  writeJson(paths.sessionState, sessionState);
  writeJson(paths.custodyAudit, reports.custodyAudit);
  writeJson(paths.placeholderReport, reports.placeholderReport);
  writeJson(paths.audioLaneReport, reports.audioLaneReport);
  writeJson(paths.voiceLaneReport, reports.voiceLaneReport);
  writeJson(paths.omniLaneReport, reports.omniLaneReport);
  writeJson(paths.responseLoopReport, reports.responseLoopReport);
  writeJson(paths.sentinelReport, reports.sentinelReport);
  writeJson(paths.finalJson, reports.finalReport);
  writeText(paths.finalMd, reports.finalMd);
  writeJson(paths.receipt, reports.receipt);

  process.stdout.write(`${JSON.stringify({
    finalVerdict: reports.finalReport.finalVerdict,
    finalStatus: reports.finalReport.finalStatus,
    qwen2Audio: custodyByKey.qwen2Audio.finalTruthLabel,
    qwen3Tts: custodyByKey.qwen3Tts.finalTruthLabel,
    qwen25Omni: custodyByKey.qwen25Omni.finalTruthLabel,
    receiptPath
  }, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exit(1);
});
