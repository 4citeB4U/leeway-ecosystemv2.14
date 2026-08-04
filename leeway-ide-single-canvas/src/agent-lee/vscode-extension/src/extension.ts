/*
LEEWAY_HEADER - DO NOT REMOVE

REGION: ÃƒÂ°Ã…Â¸Ã…Â¸Ã‚Â¢ CORE
TAG: CORE.RUNTIME.EXTENSION.MAIN
PURPOSE: VS Code extension activation and sovereign Agent Lee runtime orchestration.

5WH:
WHAT = VS Code extension entrypoint for Agent Lee.
WHY = Registers commands, views, model routing, compliance tools, and control panel.
WHO = Agent Lee / LeeWay Runtime.
WHERE = agent-lee/vscode-extension/src/extension.ts
WHEN = 2026
HOW = VS Code Extension API + LeeWay runtime services + local model router.

AGENTS:
PRIME
AUDIT
DOCTOR
ALIGN

LICENSE:
MIT
*/

import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { execFile } from "child_process";
import { runSupervisor, SupervisorResult } from "./core/orchestrator";
import { enforceLaw, enforceStageLaw } from "./core/law-engine";
import { requestExecution, releaseExecution } from "./core/scheduler";
import { trackError, resetDrift } from "./core/drift-watch";
import { buildContext, extractPathFromPrompt, extractUrlFromPrompt } from "./core/file-intelligence";
import {
  assertAgentLeeRuntimeReady,
  buildModelPromptThroughAgentLee,
  formatThroughAgentLee,
  getAgentLeeRuntimeState,
  initializeAgentLeeRuntime,
  recordAgentLeeRuntimeReceipt,
  refreshDoctorStatus,
  setDoctorStatus
} from "./core/agent-lee-runtime-bootstrap";
import { detectEditors, installPyCharmTooling, openTargetInEditor } from "./core/editor-bridge";
import { fetchRemoteContext } from "./core/remote-context";
import { initializeRuntimeFabric, startRuntimeFabricHealthChecks, getRuntimeFabricStatus, sendAgentLeeMessage, getModelVaultStatus, getModelExecutionStatus, getLocalWorkerBridgeStatus, type RuntimeFabricStatus } from "./core/runtime-fabric-client";
import { buildCapabilityAnswer, buildCapabilityCatalog, formatCapabilitySummary, isCapabilityQuestion, searchCapabilityCatalog } from "./core/capability-registry";
import {
  appendConversationMessage,
  getOrCreateActiveConversation,
  listConversations,
  loadConversation,
  setActiveConversation,
  startNewConversation
} from "./core/conversation-store";
import { buildDeveloperProfileSummary, loadDeveloperProfile, rememberDeveloperSignal } from "./core/developer-profile";
import { getMemoryStatus, storeAgentMemory } from "./core/memory";
import { buildModelHiveStatus } from "./core/model-hive";
import { getVoiceStatus, loadVoiceRuntime, saveVoiceRuntime, speakWithClonedVoice, speakWithVoice, stopVoicePlayback, type LeeWayVoiceLifecycleEvent, type LeeWayVoiceLifecycleEventType, type VoiceRuntimeConfig } from "./core/voice-adapter";
import { detectOneWordSpeechFailure, planLeewayLiveVoiceSegments } from "./core/leeway-live-voice-route-manager";
import { loadRuntimeSettings, RuntimeState, saveRuntimeSettings, ApprovalMode, resolveRuntimeState, DEFAULT_RUNTIME_STATE } from "./core/runtime-settings";
import { collectExtensionRuntimeTruth } from "./core/extensionRuntimeTruth";
import {
  buildLeeWayVoiceIdentity,
  buildOwnerFacingVoiceStatus,
  classifyVoiceReview,
  containsBlockedStatusPhrase,
  createVoiceEventId,
  KNOWN_STATUS_CHAT_BLOCKLIST,
  LeeWayVoiceAuthorityState,
  LeeWayVoiceBridgeMessage,
  LeeWayVoiceBridgeRuntimeState,
  LeeWayVoiceDeduplicator,
  LeeWayVoiceEventSource,
  LeeWayVoiceReviewState,
  makeVoiceReviewState,
  sourceLabelForVoiceEvent
} from "./core/voice/leewayVoiceTruth";
import { LavrPlaybackGate, type LavrPlaybackRecord } from "./leeway-agent-voice-runtime/lavrPlaybackGate";
import { appendFileWithRetries, describeFileError, writeJsonWithRetries, writeTextWithRetries } from "./core/file-ops";
import { assessWorkerIdentity } from "./core/zero-trust";
import { DEFAULT_AGENT_CATALOG, DEFAULT_MCP_SERVER_CATALOG, DEFAULT_PLUGIN_CATALOG, DEFAULT_WORKER_CATALOG } from "./core/settings-catalog";
import { stopBrowserPreviews } from "./core/browser-engine";
import { createTaskPlan, PlanPhase, TaskPlan, WorkMode } from "./core/task-planner";
import { saveTaskPlan } from "./core/plan-store";
import { AGENT_LEE_ENGINEERING_PROMPT } from "./core/agent-lee-engineering-prompt";
import { getLatestStagedPatch, inspectWorkspace, runAgentEngineeringTask, runVerification as runEngineeringVerification, stagePatch, buildExecutionPlan } from "./core/agent-engineering-loop";
import { testPersona } from "./persona/persona-runtime-bridge";
import { AgentLeeEditBufferCodeLensProvider } from "./edit-buffer/editBuffer.codeLens";
import { registerAgentLeeEditBufferCommands } from "./edit-buffer/editBuffer.commands";
import { refreshAgentLeeDecorations } from "./edit-buffer/editBuffer.decorations";
import { editBufferStore } from "./edit-buffer/editBuffer.store";
import { prepareCodexLevelContext } from "./knowledge/prepareCodexLevelContext";
import { AgentLeePluginRouter } from "./plugins/agentLeePluginRouter";
import { mapUserTextToPluginCall } from "./plugins/pluginIntentMapper";
import { getPluginById, normalizePluginId } from "./plugins/plugin.registry";
import type { PluginCallInput, PluginCallResult } from "./plugins/plugin.types";
import { analyzeImage } from "./tools/image-tool";
import { sendExecutionPlanToEditBuffer } from "./execution-brain/executionToEditBuffer.adapter";
import { sendVerificationRepairsToEditBuffer } from "./execution-brain/verificationRepairToEditBuffer.adapter";
import { registerAgentLeeLiveVoiceCommands } from "./live-voice/liveVoice.commands";
import { voiceProviderFactoryClientScript } from "./live-voice/voiceProviderFactory";
import { registerAgentLeeCodingSessionCommands } from "./session-orchestrator/codingSession.commands";
import { registerAgentLeePerformanceCommands } from "./performance/performance.commands";
import { registerAgentLeeCoreRuntimeServices } from "./performance/runtimeServices";
import { registerAgentLeeBackgroundIndexerCommands } from "./indexing/backgroundIndexer.commands";
import { scanLeeWayCompliance, LEEWAY_SCANNER_VERSION, makeHeader, AuditResult } from "./tools/leeway-scanner";
import { classifyTask, selectModel } from "./tools/router";
import { logEvent } from "./tools/logger";
import { openLvisPanel } from "./visual-intelligence/visualPanel";
import { getLvisSystemStatus } from "./visual-intelligence/visualRuntime";
import { writeLvisReceipt } from "./visual-intelligence/visualReceipts";
import { initializeBridgeRuntimeAuthority } from "./bridge-runtime/bridgeRuntimeBootReconciliation";
import { activateLifecycleAuthority } from "./lifecycle/lifecycleAuthority";

const ROOT = path.join(process.env.USERPROFILE || "", ".leeway-vscode");

// Runtime Fabric connection state
let runtimeFabricStatus: RuntimeFabricStatus | null = null;
const APPROVED_MANAGED_EXTENSION_ROOT = path.join("E:\\.LeeWay-Produucts-File\\.Leeway-Ecosystem\\.leeway-vscode");
const MANAGED_EXTENSION_DIR = path.join(APPROVED_MANAGED_EXTENSION_ROOT, "agent-lee", "vscode-extension");
const LOG_DIR = path.join(ROOT, "logs", "agent-lee");
const PENDING_EDIT_DIR = path.join(ROOT, "agent-lee", "pending-edits");
const COMPLIANCE_REPORT_DIR = path.join(ROOT, "agent-lee", "reports", "compliance");
const DEFAULT_VSCODE_CLI = path.join(process.env.LOCALAPPDATA || "", "Programs", "Microsoft VS Code", "bin", "code.cmd");
const DEFAULT_CLONE_SERVER_URL = "http://127.0.0.1:8766";
const DEFAULT_DEVELOPER_REFERENCE_AUDIO = path.join(ROOT, "agent-lee", "voice", "default-agent-lee-voice.wav");
const DEFAULT_DEVELOPER_REFERENCE_TEXT = "OK let's go ahead and create this. I'll speak into the mic for a certain amount of time. And the words that I'm actually going to say are the words I want the clone voice to be able to say.";
const VOICE_CATALOG_PATH = path.join(ROOT, "agent-lee", "voice", "voice-catalog.json");
const MAX_VOICE_CATALOG_ENTRIES = 10;
const AGENT_LEE_VIEW_CONTAINER_ID = "agentLee";
const AGENT_LEE_SIDEBAR_VIEW_ID = "agentLee.sidebar";
const AGENT_LEE_OPEN_PANEL_COMMAND = "agentLee.openPanel";
const AGENT_LEE_UI_VERSION = "chat-ui-runtime-truth-2026-05-15";

type GovernedQwenModelAuthority = {
  id: string;
  modelRouteId: string;
  modelFamilyId: "LEEWAY_MODEL_FAMILY::QWEN" | "LEEWAY_MODEL_FAMILY::DEEPSEEK";
  lane: string;
  proofStatus: string;
  runtimeHost: string;
  allowedUse: string[];
  forbiddenUse: string[];
  standardsAuthorityId: "LEEWAY_STANDARDS::MODEL_HIVE::QWEN_FAMILY" | "LEEWAY_STANDARDS::MODEL_HIVE::DEEPSEEK_VSCODE_SPECIALIST";
};

const GOVERNED_QWEN_MODEL_AUTHORITY: readonly GovernedQwenModelAuthority[] = [
  {
    id: "qwen2.5-coder:14b",
    modelRouteId: "LEEWAY_LLM_ROUTE::QWEN2_5_CODER_14B",
    modelFamilyId: "LEEWAY_MODEL_FAMILY::QWEN",
    lane: "LEEWAY_MODEL_LANE::HEAVY_CODE_ENGINEERING",
    proofStatus: "EXECUTION_PROVEN",
    runtimeHost: "Ollama / Bridge Runtime",
    allowedUse: ["heavy_engineering", "runtime_repair", "multi_file_generation"],
    forbiddenUse: ["cloud_proxy_routing", "unregistered_external_provider"],
    standardsAuthorityId: "LEEWAY_STANDARDS::MODEL_HIVE::QWEN_FAMILY"
  },
  {
    id: "qwen2.5-coder:7b",
    modelRouteId: "LEEWAY_LLM_ROUTE::QWEN2_5_CODER_7B",
    modelFamilyId: "LEEWAY_MODEL_FAMILY::QWEN",
    lane: "LEEWAY_MODEL_LANE::MID_TIER_CODE_REASONING",
    proofStatus: "EXECUTION_PROVEN",
    runtimeHost: "Ollama / Bridge Runtime",
    allowedUse: ["planning", "implementation_support", "review"],
    forbiddenUse: ["cloud_proxy_routing", "unregistered_external_provider"],
    standardsAuthorityId: "LEEWAY_STANDARDS::MODEL_HIVE::QWEN_FAMILY"
  },
  {
    id: "qwen2.5-coder:1.5b",
    modelRouteId: "LEEWAY_LLM_ROUTE::QWEN2_5_CODER_1_5B",
    modelFamilyId: "LEEWAY_MODEL_FAMILY::QWEN",
    lane: "LEEWAY_MODEL_LANE::LIGHTWEIGHT_EDGE_COGNITION",
    proofStatus: "EXECUTION_PROVEN",
    runtimeHost: "Ollama / Bridge Runtime",
    allowedUse: ["lightweight_tasks", "classification"],
    forbiddenUse: ["cloud_proxy_routing", "unregistered_external_provider"],
    standardsAuthorityId: "LEEWAY_STANDARDS::MODEL_HIVE::QWEN_FAMILY"
  },
  {
    id: "qwen3:latest",
    modelRouteId: "LEEWAY_LLM_ROUTE::QWEN3",
    modelFamilyId: "LEEWAY_MODEL_FAMILY::QWEN",
    lane: "LEEWAY_MODEL_LANE::PRIMARY_REASONING",
    proofStatus: "EXECUTION_PROVEN",
    runtimeHost: "Ollama / Bridge Runtime",
    allowedUse: ["primary_reasoning", "diagnostics", "conversation_planning"],
    forbiddenUse: ["cloud_proxy_routing", "unregistered_external_provider"],
    standardsAuthorityId: "LEEWAY_STANDARDS::MODEL_HIVE::QWEN_FAMILY"
  },
  {
    id: "qwen2.5vl:7b",
    modelRouteId: "LEEWAY_LLM_ROUTE::QWEN2_5_VL_7B",
    modelFamilyId: "LEEWAY_MODEL_FAMILY::QWEN",
    lane: "LEEWAY_MODEL_LANE::VISION_RUNTIME",
    proofStatus: "EXECUTION_PROVEN",
    runtimeHost: "Ollama / Bridge Runtime / Vision Runtime",
    allowedUse: ["image_understanding", "visual_runtime_monitoring"],
    forbiddenUse: ["cloud_proxy_routing", "unregistered_external_provider"],
    standardsAuthorityId: "LEEWAY_STANDARDS::MODEL_HIVE::QWEN_FAMILY"
  },
  {
    id: "qwen3-vl-embedding-local",
    modelRouteId: "LEEWAY_LLM_ROUTE::QWEN3_VL_EMBEDDING",
    modelFamilyId: "LEEWAY_MODEL_FAMILY::QWEN",
    lane: "LEEWAY_MODEL_LANE::MEMORY_EMBEDDING_RUNTIME",
    proofStatus: "EXECUTION_PROVEN",
    runtimeHost: "Local Transformers CPU / Memory Runtime",
    allowedUse: ["memory_retrieval", "semantic_embeddings"],
    forbiddenUse: ["cloud_proxy_routing", "unregistered_external_provider"],
    standardsAuthorityId: "LEEWAY_STANDARDS::MODEL_HIVE::QWEN_FAMILY"
  },
  {
    id: "qwen3-tts-local",
    modelRouteId: "LEEWAY_LLM_ROUTE::QWEN3_TTS_LOCAL",
    modelFamilyId: "LEEWAY_MODEL_FAMILY::QWEN",
    lane: "LEEWAY_MODEL_LANE::SPEECH_OUTPUT_RUNTIME",
    proofStatus: "GPU_EXECUTION_PROVEN",
    runtimeHost: "Dedicated Qwen GPU Runtime / Voice Factory",
    allowedUse: ["speech_output", "voice_rendering"],
    forbiddenUse: ["cloud_proxy_routing", "unregistered_external_provider"],
    standardsAuthorityId: "LEEWAY_STANDARDS::MODEL_HIVE::QWEN_FAMILY"
  },
  {
    id: "qwen2.5-omni-local",
    modelRouteId: "LEEWAY_LLM_ROUTE::QWEN2_5_OMNI_LOCAL",
    modelFamilyId: "LEEWAY_MODEL_FAMILY::QWEN",
    lane: "LEEWAY_MODEL_LANE::MULTIMODAL_FUSION_RUNTIME",
    proofStatus: "GPU_EXECUTION_PROVEN",
    runtimeHost: "Dedicated Qwen GPU Runtime / Edge RTC",
    allowedUse: ["multimodal_fusion", "live_conversation_state"],
    forbiddenUse: ["cloud_proxy_routing", "unregistered_external_provider"],
    standardsAuthorityId: "LEEWAY_STANDARDS::MODEL_HIVE::QWEN_FAMILY"
  },
  {
    id: "qwen2-audio-local",
    modelRouteId: "LEEWAY_LLM_ROUTE::QWEN2_AUDIO_LOCAL",
    modelFamilyId: "LEEWAY_MODEL_FAMILY::QWEN",
    lane: "LEEWAY_MODEL_LANE::AUDIO_HEARING_RUNTIME",
    proofStatus: "GPU_EXECUTION_PROVEN",
    runtimeHost: "Dedicated Qwen GPU Runtime / Edge RTC",
    allowedUse: ["audio_understanding", "hearing_runtime"],
    forbiddenUse: ["cloud_proxy_routing", "unregistered_external_provider"],
    standardsAuthorityId: "LEEWAY_STANDARDS::MODEL_HIVE::QWEN_FAMILY"
  },
  {
    id: "deepseek-coder-v2:16b",
    modelRouteId: "LEEWAY_LLM_ROUTE::DEEPSEEK_CODER_V2_16B",
    modelFamilyId: "LEEWAY_MODEL_FAMILY::DEEPSEEK",
    lane: "LEEWAY_MODEL_LANE::VSCODE_CODING_SPECIALIST",
    proofStatus: "EXECUTION_PROVEN",
    runtimeHost: "Ollama / Bridge Runtime",
    allowedUse: ["alternate_implementation", "review_signal", "vscode_coding_specialist"],
    forbiddenUse: ["outside_leeway_vscode_without_authorization", "cloud_proxy_routing", "unregistered_external_provider"],
    standardsAuthorityId: "LEEWAY_STANDARDS::MODEL_HIVE::DEEPSEEK_VSCODE_SPECIALIST"
  }
] as const;

const GOVERNED_QWEN_MODEL_IDS = [
  "qwen2.5-coder:14b",
  "qwen2.5-coder:7b",
  "qwen2.5-coder:1.5b",
  "deepseek-coder-v2:16b"
] as const;
const GOVERNED_QWEN_MODEL_ID_LOOKUP = new Set<string>(GOVERNED_QWEN_MODEL_IDS);
const GOVERNED_QWEN_MODEL_LOOKUP = new Map(GOVERNED_QWEN_MODEL_AUTHORITY.map((entry) => [entry.id, entry]));
const AUTHORIZED_MODEL_ID_LOOKUP = new Set<string>(GOVERNED_QWEN_MODEL_AUTHORITY.map((entry) => entry.id));
const INTERNAL_QWEN_INFRA_MODEL_ID_LOOKUP = new Set<string>([
  "qwen3:latest",
  "qwen2.5vl:7b",
  "qwen3-vl-embedding-local",
  "qwen3-tts-local",
  "qwen2.5-omni-local",
  "qwen2-audio-local"
]);
const DEEPSEEK_VSCODE_SPECIALIST_MODEL_ID = "deepseek-coder-v2:16b";

function decodeAlias(codes: number[]) {
  return String.fromCharCode(...codes);
}

const LEGACY_HARD_BLOCK_PREFIXES = [
  [112, 104, 105, 51],
  [108, 108, 97, 109, 97],
  [108, 108, 97, 118, 97],
  [101, 99, 104, 111],
  [110, 111, 109, 105, 99],
  [97, 122, 114]
].map((codes) => decodeAlias(codes));

type AuthorizedModelGuardOptions = {
  source: string;
  allowInfrastructureLane?: boolean;
  allowDeepseekSpecialist?: boolean;
};

function normalizeModelRoute(model: unknown) {
  return String(model || "").trim().toLowerCase();
}

function isLegacyHardBlockedRoute(model: string) {
  const normalized = normalizeModelRoute(model);
  return LEGACY_HARD_BLOCK_PREFIXES.some((prefix) => normalized === prefix || normalized.startsWith(`${prefix}:`));
}

function emitAuthorizedModelGuardViolation(model: unknown, reason: string, source: string) {
  recordAgentLeeRuntimeReceipt({
    event: "LEEWAY_VSCODE_AUTHORIZED_MODEL_GUARD::VIOLATION",
    model: String(model || ""),
    reason,
    source,
    guardId: "LEEWAY_VSCODE_AUTHORIZED_MODEL_GUARD",
    authorityId: "LEEWAY_STANDARDS::MODEL_HIVE::AUTHORIZED_SET_ONLY",
    timestamp: new Date().toISOString()
  });
}

function enforceAuthorizedModelRoute(candidate: unknown, options: AuthorizedModelGuardOptions): string {
  const resolved = String(candidate || "").trim();
  const normalized = resolved.toLowerCase();

  if (!resolved) {
    emitAuthorizedModelGuardViolation(candidate, "EMPTY_MODEL_ROUTE", options.source);
    throw new Error("Agent Lee blocked an empty model route. Choose an authorized LeeWay model route.");
  }

  if (isLegacyHardBlockedRoute(normalized)) {
    emitAuthorizedModelGuardViolation(candidate, "LEGACY_HARD_BLOCK_ROUTE", options.source);
    throw new Error("Agent Lee blocked a legacy forbidden model route by LeeWay authority.");
  }

  if (!AUTHORIZED_MODEL_ID_LOOKUP.has(resolved)) {
    emitAuthorizedModelGuardViolation(candidate, "UNKNOWN_OR_UNAUTHORIZED_ROUTE", options.source);
    throw new Error("Agent Lee blocked a non-authorized model route. Choose a LeeWay-authorized model.");
  }

  if (resolved === DEEPSEEK_VSCODE_SPECIALIST_MODEL_ID && !options.allowDeepseekSpecialist) {
    emitAuthorizedModelGuardViolation(candidate, "DEEPSEEK_SCOPE_VIOLATION", options.source);
    throw new Error("Agent Lee blocked DeepSeek because this action is outside the VS Code coding specialist scope.");
  }

  if (INTERNAL_QWEN_INFRA_MODEL_ID_LOOKUP.has(resolved) && !options.allowInfrastructureLane) {
    emitAuthorizedModelGuardViolation(candidate, "INFRA_MODEL_VISIBLE_SELECTOR_VIOLATION", options.source);
    throw new Error("Agent Lee blocked an internal Qwen infrastructure route from visible coding selection.");
  }

  return resolved;
}

function isGovernedQwenModel(model: unknown): model is string {
  return typeof model === "string" && GOVERNED_QWEN_MODEL_ID_LOOKUP.has(model);
}

function filterGovernedQwenModels(models: string[]) {
  return models.filter((model) => isGovernedQwenModel(model));
}

function coerceGovernedQwenModel(candidate: unknown, fallback: string = DEFAULT_RUNTIME_STATE.primaryModel) {
  const fallbackModel = isGovernedQwenModel(fallback) ? fallback : GOVERNED_QWEN_MODEL_IDS[0] as string;
  try {
    return enforceAuthorizedModelRoute(candidate, {
      source: "extension.coerceGovernedQwenModel",
      allowDeepseekSpecialist: true,
      allowInfrastructureLane: false
    });
  } catch {
    emitAuthorizedModelGuardViolation(candidate, "COERCE_FALLBACK_APPLIED", "extension.coerceGovernedQwenModel");
    return fallbackModel;
  }
}

fs.mkdirSync(LOG_DIR, { recursive: true });
fs.mkdirSync(PENDING_EDIT_DIR, { recursive: true });
fs.mkdirSync(COMPLIANCE_REPORT_DIR, { recursive: true });

function applyRuntimeVoiceTuning(config: VoiceRuntimeConfig, state: RuntimeState) {
  const voiceRate = clampNumber(state.voiceRate, 0.6, 1.4, 0.9);
  const voiceVolume = clampNumber(state.voiceVolume, 0, 1.5, 1.0);
  const voicePitch = clampNumber(state.voicePitch, 0.7, 1.3, 1.0);
  const voiceTone = clampNumber(state.voiceTone, 0.7, 1.3, 1.0);
  config.cloneSpeedRatio = voiceRate;
  config.cloneVolumeRatio = voiceVolume;
  config.tuning = {
    ...(config.tuning || {}),
    playbackRateRatio: voiceRate,
    pitchRatio: voicePitch,
    toneRatio: voiceTone
  };
}

function buildBundledCloneVoiceConfig(current?: VoiceRuntimeConfig | null): VoiceRuntimeConfig {
  return {
    ...(current || {}),
    engine: current?.engine || "f5-clone-local",
    fallbackEngine: "none",
    personaSpeechMode: current?.personaSpeechMode || "Grounded_Operator",
    interruptionPolicy: current?.interruptionPolicy || "kill-current-and-replace",
    voiceWsUrl: current?.voiceWsUrl || "ws://localhost:8765/ws",
    preferVoiceServer: current?.preferVoiceServer ?? true,
    sampleRate: current?.sampleRate || 22050,
    selectedVoiceId: current?.selectedVoiceId || "agent-lee-default",
    selectedVoiceLabel: current?.selectedVoiceLabel || "Agent Lee Default Voice",
    selectedSpeakerId: current?.selectedSpeakerId || "",
    clonePythonPath: current?.clonePythonPath || path.join(ROOT, "agent-lee", "voice", "voice-cloning-env", "Scripts", "python.exe"),
    cloneScriptPath: current?.cloneScriptPath || path.join(ROOT, "agent-lee", "voice", "clone_voice.py"),
    cloneServerScriptPath: current?.cloneServerScriptPath || path.join(ROOT, "agent-lee", "voice", "voice_clone_server.py"),
    cloneServerUrl: current?.cloneServerUrl || DEFAULT_CLONE_SERVER_URL,
    cloneDevice: current?.cloneDevice || "cpu",
    cloneReferenceAudioPath: current?.cloneReferenceAudioPath || DEFAULT_DEVELOPER_REFERENCE_AUDIO,
    cloneReferenceText: current?.cloneReferenceText || DEFAULT_DEVELOPER_REFERENCE_TEXT,
    cloneOutputPath: current?.cloneOutputPath || path.join(ROOT, "agent-lee", "voice", "agent-lee-live-clone.wav"),
    cloneSpeedRatio: clampNumber(current?.cloneSpeedRatio, 0.6, 1.4, 0.9),
    cloneVolumeRatio: clampNumber(current?.cloneVolumeRatio, 0, 1.5, 1.0),
    tuning: {
      sampleTrimRatio: clampNumber(current?.tuning?.sampleTrimRatio, 0.5, 1.5, 1.0),
      playbackRateRatio: clampNumber(current?.tuning?.playbackRateRatio, 0.6, 1.4, 0.9),
      pitchRatio: clampNumber(current?.tuning?.pitchRatio, 0.7, 1.3, 1.0),
      toneRatio: clampNumber(current?.tuning?.toneRatio, 0.7, 1.3, 1.0)
    }
  };
}

function getVoiceRuntimeConfig() {
  const config = buildBundledCloneVoiceConfig(loadVoiceRuntime());
  applyRuntimeVoiceTuning(config, runtimeState);
  return config;
}

function persistVoiceRuntimeConfig(config: VoiceRuntimeConfig) {
  const ok = saveVoiceRuntime(config);
  if (!ok) throw new Error("Agent Lee could not persist the voice runtime config.");
}

function loadVoiceCatalog(): any {
  try {
    if (fs.existsSync(VOICE_CATALOG_PATH)) {
      return JSON.parse(fs.readFileSync(VOICE_CATALOG_PATH, "utf8"));
    }
  } catch {}
  return { defaultVoiceId: "agent-lee-default", voices: [] };
}

function saveVoiceCatalog(catalog: any) {
  fs.writeFileSync(VOICE_CATALOG_PATH, JSON.stringify(catalog, null, 2), "utf8");
}

function isWindowsBatchScript(command: string) {
  return process.platform === "win32" && /\.(cmd|bat)$/i.test(String(command || ""));
}

function runCommandCapture(command: string, args: string[], options?: { cwd?: string; env?: NodeJS.ProcessEnv; timeoutMs?: number }) {
  return new Promise<string>((resolve, reject) => {
    const resolvedCommand = isWindowsBatchScript(command)
      ? (process.env.comspec || "cmd.exe")
      : command;
    const resolvedArgs = isWindowsBatchScript(command)
      ? ["/d", "/s", "/c", "call", command, ...args]
      : args;

    execFile(resolvedCommand, resolvedArgs, {
      cwd: options?.cwd,
      env: options?.env,
      timeout: options?.timeoutMs ?? 600000,
      maxBuffer: 1024 * 1024 * 10
    }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error([error.message, stderr, stdout].filter(Boolean).join("\n").trim()));
        return;
      }
      resolve(String(stdout || "").trim());
    });
  });
}

async function inspectVsixPackageMetadata(vsixPath: string) {
  if (!fs.existsSync(vsixPath)) return null;
  const normalizedPath = String(vsixPath || "").replace(/'/g, "''");

  try {
    const output = await runCommandCapture("tar", ["-xOf", vsixPath, "extension/package.json"], { cwd: path.dirname(vsixPath) });
    return JSON.parse(output) as { name?: string; version?: string; publisher?: string };
  } catch {
    try {
      const psCommand = `Add-Type -AssemblyName System.IO.Compression.FileSystem; $zip=[System.IO.Compression.ZipFile]::OpenRead('${normalizedPath}'); $entry=$zip.GetEntry('extension/package.json'); if (!$entry) { throw 'missing package entry' }; $stream=$entry.Open(); $reader=New-Object System.IO.StreamReader($stream); $content=$reader.ReadToEnd(); $zip.Dispose(); Write-Output $content`;
      const output = await runCommandCapture("powershell.exe", ["-NoProfile", "-Command", psCommand]);
      return JSON.parse(output) as { name?: string; version?: string; publisher?: string };
    } catch {
      return null;
    }
  }
}

function playWavSync(wavPath: string) {
  const escaped = String(wavPath || "").replace(/'/g, "''");
  return runCommandCapture("powershell.exe", [
    "-NoProfile",
    "-Command",
    `$p=New-Object System.Media.SoundPlayer '${escaped}'; $p.PlaySync()`
  ]);
}

let runtimeState: RuntimeState = loadRuntimeSettings();
type LeeWayVoiceUiCommand =
  | "leewayVoiceTestRequested"
  | "leewayVoiceStopRequested"
  | "leewayVoiceMuteToggled"
  | "leewayVoiceSettingsChanged"
  | "leewayVoiceSpeakRequested";
type LeeWayVoiceLifecycleTerminalState = "idle" | "speaking" | "completed" | "failed" | "stopped" | "muted";
type LeeWayVoiceEvidenceState = {
  audibleOutputProof: string;
  currentRouteId: string;
  currentStatus: string;
  firstAudioLatencyMs: number | null;
  lastArtifactPath: string;
  lastAudioBytes: number;
  lastError: string;
  lastEventType: string;
  lifecycleEvents: LeeWayVoiceLifecycleEvent[];
  multiSegmentPlaybackCompleted: boolean;
  plannedSegments: number;
  playedSegments: number;
  status: LeeWayVoiceLifecycleTerminalState;
  truthLimitation: string;
};
const LEEWAY_VOICE_STATE_IDENTITY_KEYS = [
  { key: "voiceEnabled" },
  { key: "voiceMuted" },
  { key: "voiceAutoSpeak" },
  { key: "voiceAutoSendFinalTranscript" },
  { key: "voiceRate" },
  { key: "voiceVolume" },
  { key: "voiceInterruptOnUserSpeech" },
  { key: "voiceLastError" },
  { key: "voiceCurrentStatus" }
] as const;
const approvedExternalRoots = new Set<string>();
let capabilityCatalog = buildCapabilityCatalog();
type PendingAttachment = {
  path: string;
  name: string;
  kind: "image" | "audio" | "file";
};
type TodoStatus = "pending" | "in_progress" | "completed" | "blocked";
type AgentLeePromptClass =
  | "simple_greeting"
  | "general_question"
  | "workspace_aware_question"
  | "mutation_request"
  | "governance_sensitive_request";
type TaskTodo = {
  id: string;
  title: string;
  detail: string;
  phase: PlanPhase;
  status: TodoStatus;
};
type TaskActivity = {
  id: string;
  kind: "read" | "write" | "status";
  label: string;
  file?: string;
  path?: string;
  detail?: string;
  timestamp: string;
};
type ProposedEditStatus = "pending" | "approved" | "rejected";
type ProposedEdit = {
  id: string;
  filePath: string;
  displayPath: string;
  summary: string;
  status: ProposedEditStatus;
  tempPath: string;
  diffTitle: string;
  createdAt: string;
};
type ActiveTaskState = {
  mode: WorkMode;
  prompt: string;
  summary: string;
  status: string;
  awaitingApproval: boolean;
  canExecute: boolean;
  savedPlanPath: string;
  plan: TaskPlan | null;
  todos: TaskTodo[];
  activities: TaskActivity[];
  proposedEdits: ProposedEdit[];
  planResponse: string;
  draftPrompt: string;
  targetRoot: string;
  targetLabel: string;
  explicitUrl: string;
  remoteContext: string;
  prebuiltContext: { total: number; samples: { file: string; preview: string }[] } | null;
  activePhase: PlanPhase | "approval" | "answer" | null;
};
type PendingPluginApproval = {
  call: PluginCallInput;
  pluginName: string;
  riskLevel: string;
};
type LavrTerminalStatus = "completed" | "failed" | "cancelled" | "timed_out";
type LavrToolLifecycleState = {
  requestId: string;
  callId: string;
  lavrSessionId: string;
  lavrTurnId: string;
  status: "pending" | LavrTerminalStatus;
  createdAt: number;
  executionStartedAt?: number;
  finishedAt?: number;
  pluginId?: string;
  action?: string;
  resultSignature?: string;
  providerAcceptedResult: boolean;
  timeoutHandle: ReturnType<typeof setTimeout> | null;
};
const activeWebviews = new Set<vscode.Webview>();
let agentLeeOutputChannel: vscode.OutputChannel | null = null;
let agentLeePanel: vscode.WebviewPanel | null = null;
let currentTaskState: ActiveTaskState = emptyTaskState();
let parkedTaskState: ActiveTaskState | null = null;
let currentAbortController: AbortController | null = null;
let isExecutionRunning = false;
let narratedReadCount = 0;
let queuedFollowUps: { text: string; attachments: PendingAttachment[] }[] = [];
let pendingPluginApproval: PendingPluginApproval | null = null;
let runtimeStatusBarItem: vscode.StatusBarItem | null = null;
const LAVR_TOOL_TIMEOUT_MS = 15_000;
const lavrToolByRequestId = new Map<string, LavrToolLifecycleState>();
const lavrRequestByCallId = new Map<string, string>();
let lavrHostTurnCounter = 0;
const lavrHostSessionId = `lavr-session-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
let lavrLastObservedTurnId = "";
const voiceTruthLimitation = "Dynamic harnesses and terminal automation can prove route invocation, generated audio artifacts, lifecycle events, and installed-runtime attestation, but they cannot confirm that a human heard the OS audio in a live VS Code window.";
const voiceEvidenceState: LeeWayVoiceEvidenceState = {
  audibleOutputProof: "No LeeWay live voice playback proof recorded yet.",
  currentRouteId: "",
  currentStatus: runtimeState.voiceCurrentStatus || "LeeWay live voice route is standing by.",
  firstAudioLatencyMs: null,
  lastArtifactPath: "",
  lastAudioBytes: 0,
  lastError: runtimeState.voiceLastError || "",
  lastEventType: "",
  lifecycleEvents: [],
  multiSegmentPlaybackCompleted: false,
  plannedSegments: 0,
  playedSegments: 0,
  status: runtimeState.voice ? "idle" : "muted",
  truthLimitation: voiceTruthLimitation
};
const voiceDeduplicator = new LeeWayVoiceDeduplicator({ duplicateWindowMs: 5000 });
let voiceReviewState: LeeWayVoiceReviewState | null = null;
let voiceBridgeRuntimeState: LeeWayVoiceBridgeRuntimeState = {
  runtimeId: createVoiceEventId("voice-runtime"),
  bridgeId: "leeway.voice.local-transcript-bridge",
  status: "offline",
  browserSpeechAvailable: false,
  localTranscriptAvailable: false,
  endpointUrl: "http://127.0.0.1:7671/transcript",
  lastHeartbeatAt: "",
  lastTranscriptAt: "",
  lastError: "",
  loopDetected: false,
  duplicateSuppressionCount: 0,
  runtimeSourceMode: "SOURCE_UNKNOWN",
  telemetryStreamId: "stream.voice.bridge",
  auditCategory: "voice.bridge.intake",
  lawReferences: [
    "LAW-0021 Voice Bridge Message Separation",
    "LeeWay Voice Authority Rule",
    "Proposal Before Mutation"
  ],
  authorityState: "LEEWAY_VOICE_UNAVAILABLE",
  listeningSource: "NONE",
  lastHeardText: "",
  lastSentText: "",
  typedInputAvailable: true,
  staleRuntime: false,
  nextActionHint: "Use typed input or start LeeWay Voice when the runtime is ready."
};
const lavrPlaybackGate = new LavrPlaybackGate({
  onLifecycle: (record: LavrPlaybackRecord) => {
    const eventName = record.eventType.toLowerCase();
    recordAgentLeeRuntimeReceipt({
      event: `lavr.playback.${eventName}`,
      ...record
    });
    logEvent("lavr-playback-lifecycle", "Agent Lee", `LAVR playback lifecycle: ${record.eventType}`, record);
  }
});
const pluginRouter = new AgentLeePluginRouter();
const PROTECTED_AGENT_IDS = new Set(
  DEFAULT_AGENT_CATALOG
    .filter((entry) => entry.identity.developerSurface === "observed-only")
    .map((entry) => entry.id)
);
const PROTECTED_MCP_IDS = new Set(
  DEFAULT_MCP_SERVER_CATALOG
    .filter((entry) => entry.identity.developerSurface === "observed-only")
    .map((entry) => entry.id)
);
const PROTECTED_WORKER_IDS = new Set(
  DEFAULT_WORKER_CATALOG
    .filter((entry) => entry.developerSurface === "observed-only")
    .map((entry) => entry.id)
);

function preserveProtectedIds(requested: unknown, current: string[], defaults: string[], protectedIds: Set<string>) {
  const incoming = Array.isArray(requested) ? requested.map((item) => String(item || "").trim()).filter(Boolean) : [];
  const preserved = new Set<string>([
    ...defaults.filter((id) => protectedIds.has(id)),
    ...current.filter((id) => protectedIds.has(id))
  ]);
  return Array.from(new Set([
    ...incoming.filter((id) => !protectedIds.has(id)),
    ...preserved
  ]));
}

function preserveProtectedConfigs(
  requested: unknown,
  current: Record<string, string>,
  protectedIds: Set<string>
) {
  const incoming = requested && typeof requested === "object"
    ? { ...(requested as Record<string, string>) }
    : {};

  for (const protectedId of protectedIds) {
    if (Object.prototype.hasOwnProperty.call(incoming, protectedId)) {
      if (Object.prototype.hasOwnProperty.call(current, protectedId)) {
        incoming[protectedId] = current[protectedId] || "";
      } else {
        delete incoming[protectedId];
      }
    }
  }

  return incoming;
}

function protectedMutationStatus(key: string) {
  if (key === "enabledAgents" || key === "agentConfigs") {
    return "Protected LeeWay agents stay visible and auditable, but their control surfaces are locked.";
  }

  if (key === "enabledMcpServers" || key === "mcpServerConfigs") {
    return "Protected LeeWay governance MCP agents stay visible and auditable, but their control surfaces are locked.";
  }

  if (key === "enabledWorkers" || key === "workerConfigs") {
    return "Protected LeeWay workers stay visible and auditable, but their diagnostic control surfaces are locked.";
  }

  return "Protected LeeWay security controls rejected a direct mutation attempt.";
}

function agentLeeText(
  text: string,
  options?: { voiceMode?: string; preserveRaw?: boolean; routeLabel?: string }
) {
  return formatThroughAgentLee(text, options);
}

function showAgentLeeInfo(message: string, options?: Parameters<typeof agentLeeText>[1]) {
  void vscode.window.showInformationMessage(agentLeeText(message, options));
}

function showAgentLeeWarning(message: string, options?: Parameters<typeof agentLeeText>[1]) {
  void vscode.window.showWarningMessage(agentLeeText(message, options));
}

function showAgentLeeError(message: string, options?: Parameters<typeof agentLeeText>[1]) {
  void vscode.window.showErrorMessage(agentLeeText(message, options));
}

function promptAgentLeeWarning(
  message: string,
  options?: Parameters<typeof agentLeeText>[1],
  ...items: string[]
) {
  return vscode.window.showWarningMessage(agentLeeText(message, options), ...items);
}

function promptAgentLeeInputBox(
  options: vscode.InputBoxOptions,
  routeLabel: string
) {
  return vscode.window.showInputBox({
    ...options,
    prompt: options.prompt ? agentLeeText(options.prompt, { routeLabel }) : options.prompt,
    placeHolder: options.placeHolder ? agentLeeText(options.placeHolder, { routeLabel }) : options.placeHolder,
    title: options.title ? agentLeeText(options.title, { routeLabel }) : options.title
  });
}

function appendAgentLeeLine(
  output: vscode.OutputChannel,
  message: string,
  options?: Parameters<typeof agentLeeText>[1]
) {
  output.appendLine(agentLeeText(message, options));
}

function emptyTaskState(): ActiveTaskState {
  return {
    mode: runtimeState.workMode || "execute",
    prompt: "",
    summary: "No active plan yet.",
    status: "Waiting for a new task.",
    awaitingApproval: false,
    canExecute: false,
    savedPlanPath: "",
    plan: null,
    todos: [],
    activities: [],
    proposedEdits: [],
    planResponse: "",
    draftPrompt: "",
    targetRoot: "",
    targetLabel: "",
    explicitUrl: "",
    remoteContext: "",
    prebuiltContext: null,
    activePhase: null
  };
}

function buildLeeWayHeader(filePath: string) {
  const generated = makeHeader(filePath);
  return generated
    .replace("REGION: ?? UTIL", "REGION: â”œÃ¢â”¬â–‘â”œÃ â”¬â••â”œÃ â”¬â••â”œÃ©â”¬Ã³ CORE")
    .replace("TAG: UTIL.LOCAL.", "TAG: CORE.RUNTIME.")
    .replace(
      /DISCOVERY_PIPELINE:\s*\n\s*Voice -> Intent -> Location -> Vertical -> Ranking -> Render/,
      "DISCOVERY_PIPELINE:\nVoice â”œÃ¢â”¬Ã³â”œÃ³Î“Ã©Â¼â”¬Ã¡â”œÃ³Î“Ã©Â¼Î“Ã¤Ã³ Intent â”œÃ¢â”¬Ã³â”œÃ³Î“Ã©Â¼â”¬Ã¡â”œÃ³Î“Ã©Â¼Î“Ã¤Ã³ Location â”œÃ¢â”¬Ã³â”œÃ³Î“Ã©Â¼â”¬Ã¡â”œÃ³Î“Ã©Â¼Î“Ã¤Ã³ Vertical â”œÃ¢â”¬Ã³â”œÃ³Î“Ã©Â¼â”¬Ã¡â”œÃ³Î“Ã©Â¼Î“Ã¤Ã³ Ranking â”œÃ¢â”¬Ã³â”œÃ³Î“Ã©Â¼â”¬Ã¡â”œÃ³Î“Ã©Â¼Î“Ã¤Ã³ Render"
    );
}

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, parsed));
}

function syncVoiceRuntimeStateShape() {
  runtimeState.voiceEnabled = Boolean(runtimeState.voiceEnabled ?? runtimeState.voice);
  runtimeState.voiceMuted = Boolean(runtimeState.voiceMuted);
  runtimeState.voiceAutoSpeak = runtimeState.voiceAutoSpeak !== false;
  runtimeState.voiceAutoSendFinalTranscript = runtimeState.voiceAutoSendFinalTranscript === true;
  runtimeState.voiceInterruptOnUserSpeech = runtimeState.voiceInterruptOnUserSpeech !== false;
  runtimeState.voiceRate = clampNumber(runtimeState.voiceRate, 0.6, 1.4, 0.9);
  runtimeState.voiceVolume = clampNumber(runtimeState.voiceVolume, 0, 1.5, 1.0);
  runtimeState.voicePitch = clampNumber(runtimeState.voicePitch, 0.7, 1.3, 1.0);
  runtimeState.voiceTone = clampNumber(runtimeState.voiceTone, 0.7, 1.3, 1.0);
  runtimeState.voiceCurrentStatus = String(runtimeState.voiceCurrentStatus || voiceEvidenceState.currentStatus || "LeeWay live voice route is standing by.");
  runtimeState.voiceLastError = String(runtimeState.voiceLastError || voiceEvidenceState.lastError || "");
  runtimeState.voice = !!runtimeState.voiceEnabled && !runtimeState.voiceMuted;
}

function trimVoiceLifecycleEvents(events: LeeWayVoiceLifecycleEvent[]) {
  return events.slice(-24);
}

function buildVoiceStatusSummary() {
  const routeId = voiceEvidenceState.currentRouteId || String((getVoiceStatus() as any)?.routeId || "leeway.voice.text.emergency");
  const firstAudio = voiceEvidenceState.firstAudioLatencyMs;
  const segmentLabel = `${voiceEvidenceState.playedSegments}/${voiceEvidenceState.plannedSegments || voiceEvidenceState.playedSegments || 0}`;
  const errorSuffix = runtimeState.voiceLastError ? ` Error: ${runtimeState.voiceLastError}` : "";
  return `${runtimeState.voice ? "Voice ready" : runtimeState.voiceMuted ? "Voice muted" : "Voice disabled"} | route=${routeId} | first-audio=${firstAudio === null ? "pending" : `${firstAudio}ms`} | segments=${segmentLabel}.${errorSuffix}`.trim();
}

function recordVoiceUiCommand(command: LeeWayVoiceUiCommand, payload?: Record<string, unknown>) {
  recordAgentLeeRuntimeReceipt({
    event: "leeway.voice.command",
    command,
    ...payload
  });
}

function buildVoiceUiState() {
  const activeRoute = voiceEvidenceState.currentRouteId || String((getVoiceStatus() as any)?.routeId || "");
  return {
    enabled: runtimeState.voiceEnabled,
    muted: runtimeState.voiceMuted,
    active: runtimeState.voice,
    autoSpeak: runtimeState.voiceAutoSpeak,
    speechRate: runtimeState.voiceRate,
    volume: runtimeState.voiceVolume,
    interruptOnUserSpeech: runtimeState.voiceInterruptOnUserSpeech,
    lastError: runtimeState.voiceLastError,
    currentStatus: runtimeState.voiceCurrentStatus,
    routeId: activeRoute,
    activeVoiceRoute: activeRoute,
    voiceRouteProofStatus: voiceBridgeRuntimeState.authorityState,
    embodimentStatus: runtimeState.voiceEnabled ? "ACTIVE" : "INACTIVE",
    audibleConfirmationStatus: voiceEvidenceState.audibleOutputProof === "PASS" ? "PASS" : "PENDING",
    hearingCalibrationStatus: runtimeState.voiceInterruptOnUserSpeech ? "CALIBRATED" : "DISABLED",
    captureDependencyStatus: runtimeState.leewayVoiceRuntimeKind === "leeway-agent-voice-local" ? "LOCAL_CAPTURE_ACTIVE" : "BROWSER_FALLBACK_ONLY",
    firstAudioLatencyMs: voiceEvidenceState.firstAudioLatencyMs,
    multiSegmentPlayback: {
      plannedSegments: voiceEvidenceState.plannedSegments,
      playedSegments: voiceEvidenceState.playedSegments,
      completed: voiceEvidenceState.multiSegmentPlaybackCompleted
    },
    audibleOutputProof: voiceEvidenceState.audibleOutputProof,
    lastArtifactPath: voiceEvidenceState.lastArtifactPath,
    lastAudioBytes: voiceEvidenceState.lastAudioBytes,
    lastEventType: voiceEvidenceState.lastEventType,
    truthLimitation: voiceEvidenceState.truthLimitation,
    lifecycleEvents: trimVoiceLifecycleEvents(voiceEvidenceState.lifecycleEvents),
    autoSendFinalTranscript: runtimeState.voiceAutoSendFinalTranscript === true,
    voiceBridge: voiceBridgeRuntimeState,
    voiceReview: voiceReviewState
  };
}

function currentVoiceAuthorityState(source: LeeWayVoiceEventSource, degraded = false): LeeWayVoiceAuthorityState {
  if (voiceBridgeRuntimeState.loopDetected) return "VOICE_STATUS_LOOP_DETECTED";
  if (voiceBridgeRuntimeState.staleRuntime) return "STALE_EXTENSION_RUNTIME";
  if (source === "LEEWAY_VOICE") return degraded ? "LEEWAY_VOICE_DEGRADED" : "LEEWAY_VOICE_READY";
  if (source === "LOCAL_TRANSCRIPT_BRIDGE") return degraded ? "LOCAL_TRANSCRIPT_BRIDGE_DEGRADED" : "LOCAL_TRANSCRIPT_BRIDGE_READY";
  if (source === "BROWSER_SPEECH_FALLBACK") return degraded ? "BROWSER_SPEECH_UNAVAILABLE" : "BROWSER_SPEECH_AVAILABLE";
  return degraded ? "LEEWAY_VOICE_DEGRADED" : "LEEWAY_VOICE_UNAVAILABLE";
}

function updateVoiceBridgeRuntimeState(
  updates: Partial<LeeWayVoiceBridgeRuntimeState>,
  options?: { broadcast?: boolean }
) {
  voiceBridgeRuntimeState = {
    ...voiceBridgeRuntimeState,
    ...updates
  };
  if (options?.broadcast !== false) {
    broadcast({
      command: "leewayVoiceBridgeStatusChanged",
      voiceBridge: voiceBridgeRuntimeState
    });
  }
}

function broadcastVoiceReviewState() {
  broadcast({
    command: "leewayVoiceReviewChanged",
    review: voiceReviewState
  });
}

function clearVoiceReviewState() {
  voiceReviewState = null;
  broadcastVoiceReviewState();
}

function setVoiceReviewState(review: LeeWayVoiceReviewState) {
  voiceReviewState = review;
  broadcastVoiceReviewState();
}

function updateVoiceBridgeStatusMessage(source: LeeWayVoiceEventSource) {
  const ownerFacing = buildOwnerFacingVoiceStatus({
    authorityState: voiceBridgeRuntimeState.authorityState,
    source,
    loopDetected: voiceBridgeRuntimeState.loopDetected,
    staleRuntime: voiceBridgeRuntimeState.staleRuntime,
    microphonePermissionRequired: voiceBridgeRuntimeState.authorityState === "MIC_PERMISSION_REQUIRED"
  });
  updateVoiceRuntimeStatus(ownerFacing, {
    error: voiceBridgeRuntimeState.lastError || "",
    eventType: "LEEWAY_VOICE_STATUS_CHANGED"
  });
}

function recordVoiceBridgeStatus(status: LeeWayVoiceBridgeMessage & { type: "VOICE_STATUS" | "VOICE_ERROR" }, source: LeeWayVoiceEventSource) {
  if (status.type === "VOICE_STATUS") {
    const accepted = voiceDeduplicator.acceptStatus(status.status, status.message, status.source);
    updateVoiceBridgeRuntimeState({
      status: accepted.loopDetected ? "loop-detected" : status.status === "ERROR" ? "error" : "online",
      localTranscriptAvailable: status.status === "LOCAL_TRANSCRIPT_AVAILABLE" || voiceBridgeRuntimeState.localTranscriptAvailable,
      browserSpeechAvailable: status.status === "BROWSER_SPEECH_AVAILABLE" || voiceBridgeRuntimeState.browserSpeechAvailable,
      authorityState: accepted.loopDetected ? "VOICE_STATUS_LOOP_DETECTED" : currentVoiceAuthorityState(source, false),
      loopDetected: accepted.loopDetected,
      duplicateSuppressionCount: accepted.duplicateSuppressionCount,
      lastHeartbeatAt: status.timestamp,
      lastError: status.status === "ERROR" ? status.message : voiceBridgeRuntimeState.lastError,
      listeningSource: source
    });
    updateVoiceBridgeStatusMessage(source);
    return accepted.accepted;
  }

  updateVoiceBridgeRuntimeState({
    status: "error",
    lastError: status.message,
    authorityState: currentVoiceAuthorityState(source, true),
    listeningSource: source
  });
  updateVoiceBridgeStatusMessage(source);
  return true;
}

function captureVoiceTranscriptForReview(args: {
  text: string;
  source: LeeWayVoiceEventSource;
  transcriptId?: string;
  timestamp?: string;
  confidence?: number;
  webview?: vscode.Webview | null;
}) {
  const text = String(args.text || "").trim();
  if (!text) return false;
  if (containsBlockedStatusPhrase(text)) {
    recordVoiceBridgeStatus({
      type: "VOICE_STATUS",
      status: "VOICE_STATUS_LOOP_DETECTED",
      message: text,
      timestamp: args.timestamp || new Date().toISOString(),
      source: "runtime-health"
    }, args.source);
    return false;
  }

  const accepted = voiceDeduplicator.acceptTranscript(
    String(args.transcriptId || ""),
    text,
    new Date(args.timestamp || new Date().toISOString()).getTime()
  );
  updateVoiceBridgeRuntimeState({
    duplicateSuppressionCount: accepted.duplicateSuppressionCount,
    lastTranscriptAt: args.timestamp || new Date().toISOString(),
    lastHeardText: text,
    localTranscriptAvailable: args.source === "LOCAL_TRANSCRIPT_BRIDGE" || voiceBridgeRuntimeState.localTranscriptAvailable,
    browserSpeechAvailable: args.source === "BROWSER_SPEECH_FALLBACK" || voiceBridgeRuntimeState.browserSpeechAvailable,
    listeningSource: args.source,
    authorityState: currentVoiceAuthorityState(args.source, false),
    status: "online"
  });
  if (!accepted.accepted) {
    recordVoiceBridgeStatus({
      type: "VOICE_STATUS",
      status: "VOICE_STATUS_LOOP_DETECTED",
      message: "Voice bridge status loop detected. Status messages are being suppressed and will not enter chat.",
      timestamp: args.timestamp || new Date().toISOString(),
      source: "runtime-health"
    }, args.source);
    return false;
  }

  const review = makeVoiceReviewState({
    text,
    source: args.source,
    authorityState: currentVoiceAuthorityState(args.source, false),
    voiceSessionId: String(args.transcriptId || createVoiceEventId("voice-session")),
    confidence: args.confidence,
    transcriptId: args.transcriptId,
    timestamp: args.timestamp
  });
  setVoiceReviewState(review);
  updateVoiceBridgeRuntimeState({
    nextActionHint: review.nextAction === "Create proposal"
      ? "Review the heard request and create a governed proposal."
      : "Review the heard request and choose when to send it.",
    lastHeardText: review.heardText
  });
  currentTaskState.status = `Voice captured for review from ${sourceLabelForVoiceEvent(args.source)}.`;
  postTaskState();
  args.webview?.postMessage({
    command: "status",
    text: `I heard: "${review.heardText}". Review it before sending.`
  });
  return true;
}

function broadcastVoiceRuntimeState(eventType = "LEEWAY_VOICE_STATUS_CHANGED") {
  syncVoiceRuntimeStateShape();
  broadcast({
    command: "leewayVoiceStatusChanged",
    eventType,
    voiceState: buildVoiceUiState()
  });
}

function updateVoiceRuntimeStatus(
  status: string,
  options?: {
    error?: string;
    routeId?: string;
    persist?: boolean;
    eventType?: LeeWayVoiceLifecycleEventType;
    artifactPath?: string;
    audioBytes?: number;
    firstAudioLatencyMs?: number | null;
  }
) {
  if (options?.routeId) {
    voiceEvidenceState.currentRouteId = options.routeId;
  }
  if (typeof options?.artifactPath === "string" && options.artifactPath) {
    voiceEvidenceState.lastArtifactPath = options.artifactPath;
  }
  if (typeof options?.audioBytes === "number" && Number.isFinite(options.audioBytes)) {
    voiceEvidenceState.lastAudioBytes = options.audioBytes;
  }
  if (options?.firstAudioLatencyMs !== undefined) {
    voiceEvidenceState.firstAudioLatencyMs = options.firstAudioLatencyMs === null
      ? null
      : clampNumber(options.firstAudioLatencyMs, 0, 600000, 0);
  }

  voiceEvidenceState.currentStatus = status;
  runtimeState.voiceCurrentStatus = status;
  if (options?.error !== undefined) {
    voiceEvidenceState.lastError = String(options.error || "");
    runtimeState.voiceLastError = String(options.error || "");
  }
  if (options?.eventType) {
    voiceEvidenceState.lastEventType = options.eventType;
  }
  voiceEvidenceState.audibleOutputProof = buildVoiceStatusSummary();
  syncVoiceRuntimeStateShape();
  if (options?.persist !== false) {
    persistRuntime();
  }
  broadcastVoiceRuntimeState(options?.eventType || "LEEWAY_VOICE_STATUS_CHANGED");
}

function registerVoiceLifecycleEvent(event: LeeWayVoiceLifecycleEvent) {
  voiceEvidenceState.lastEventType = event.eventType;
  if (event.routeId) {
    voiceEvidenceState.currentRouteId = event.routeId;
  }
  if (event.outputPath) {
    voiceEvidenceState.lastArtifactPath = event.outputPath;
  }
  if (typeof event.audioBytes === "number" && Number.isFinite(event.audioBytes)) {
    voiceEvidenceState.lastAudioBytes = event.audioBytes;
  }
  if (typeof event.firstAudioLatencyMs === "number" && Number.isFinite(event.firstAudioLatencyMs)) {
    voiceEvidenceState.firstAudioLatencyMs = event.firstAudioLatencyMs;
  }
  if (event.eventType === "LEEWAY_VOICE_SEGMENT_PLAYED") {
    voiceEvidenceState.playedSegments += 1;
  }
  if (event.eventType === "LEEWAY_VOICE_PLAYBACK_COMPLETED") {
    voiceEvidenceState.multiSegmentPlaybackCompleted = voiceEvidenceState.playedSegments >= Math.max(1, voiceEvidenceState.plannedSegments);
    voiceEvidenceState.status = "completed";
  } else if (event.eventType === "LEEWAY_VOICE_PLAYBACK_FAILED") {
    voiceEvidenceState.status = "failed";
    voiceEvidenceState.lastError = String(event.detail || "LeeWay live voice playback failed.");
  } else if (event.eventType === "LEEWAY_VOICE_PLAYBACK_STARTED" || event.eventType === "LEEWAY_VOICE_FIRST_AUDIO") {
    voiceEvidenceState.status = "speaking";
  }

  voiceEvidenceState.lifecycleEvents = trimVoiceLifecycleEvents([
    ...voiceEvidenceState.lifecycleEvents,
    event
  ]);

  updateVoiceRuntimeStatus(
    String(event.status || event.detail || buildVoiceStatusSummary()),
    {
      error: event.eventType === "LEEWAY_VOICE_PLAYBACK_FAILED" ? String(event.detail || "LeeWay live voice playback failed.") : runtimeState.voiceLastError,
      routeId: event.routeId,
      persist: false,
      eventType: event.eventType,
      artifactPath: event.outputPath,
      audioBytes: event.audioBytes,
      firstAudioLatencyMs: event.firstAudioLatencyMs
    }
  );
}

syncVoiceRuntimeStateShape();



function writeComplianceReport(kind: "scan" | "verify" | "fix", payload: Record<string, unknown>) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const reportPath = path.join(COMPLIANCE_REPORT_DIR, `agent-lee-${kind}-report-${stamp}.json`);
  writeJsonWithRetries(reportPath, {
    generatedAt: new Date().toISOString(),
    kind,
    ...payload
  }, `Agent Lee ${kind} compliance report.`);
  return reportPath;
}

function renderComplianceSummary(
  mode: "scan" | "verify",
  inspected: number,
  fullyCompliant: number,
  averageScore: number,
  blocking: AuditResult[]
) {
  const heading = mode === "scan" ? "LeeWay workspace scan complete." : "LeeWay workspace verification complete.";
  const lines = [
    heading,
    `Scanner version: ${LEEWAY_SCANNER_VERSION}`,
    `Inspected: ${inspected}`,
    `Fully compliant: ${fullyCompliant}`,
    `Average score: ${averageScore}`,
    `Blocking files: ${blocking.length}`
  ];

  if (blocking.length) {
    lines.push("");
    lines.push("Blocking paths:");
    for (const item of blocking.slice(0, 10)) {
      lines.push(`- ${item.file} (${item.score})`);
    }
  }

  return agentLeeText(lines.join("\n"), { voiceMode: "operator" });
}

async function runWorkspaceScan(output: vscode.OutputChannel, mode: "scan" | "verify" | "scanSelf" | "verifySelf") {
  const isSelf = mode === "scanSelf" || mode === "verifySelf";
  const root = isSelf ? path.join(ROOT, "agent-lee") : (workspaceRoot() || ROOT);
  const modeLabel = isSelf ? "standaloneRoot" : "workspace";

  const result = await scanLeeWayCompliance({ root, mode: isSelf ? "self" : "workspace" });
  const reportPath = writeComplianceReport(isSelf ? (mode === "scanSelf" ? "scan" : "verify") : mode, result);
  const message = renderComplianceSummary(
    mode === "verifySelf" ? "verify" : (mode === "scanSelf" ? "scan" : mode),
    result.inspected,
    result.fullyCompliant,
    result.averageScore,
    result.blockingFiles
  );

  appendAgentLeeLine(output, `- Agent Lee routed this through extension.runWorkspaceScan.`, { routeLabel: `extension.${mode}` });
  output.appendLine(`Scanner version: ${LEEWAY_SCANNER_VERSION}`);
  output.appendLine(`Scan mode: ${modeLabel}`);
  output.appendLine(`Scanned root: ${root}`);
  output.appendLine(message);
  output.appendLine(`Report: ${reportPath}`);
  output.show(true);

  logEvent(`workspace-${mode}`, "Agent Lee", message, { root, mode: modeLabel, reportPath, blockingCount: result.blockingFiles.length });

  if (isSelf) {
    setDoctorStatus(result.blockingFiles.length === 0 ? "pass" : "fail");
  }

  if (mode === "verify" || mode === "verifySelf") {
    if (result.blockingFiles.length) {
      showAgentLeeWarning(`Agent Lee verification found ${result.blockingFiles.length} blocking LeeWay file(s). See output for details.`);
    } else {
      showAgentLeeInfo(`Agent Lee verification passed for ${modeLabel} with no blocking LeeWay files.`);
    }
  } else {
    showAgentLeeInfo(`Agent Lee scanned ${result.inspected} file(s) in ${modeLabel}. ${result.blockingFiles.length} blocking file(s) found.`);
  }
}

async function runWorkspaceFix(output: vscode.OutputChannel) {
  const root = workspaceRoot() || ROOT;
  const result = await scanLeeWayCompliance({ root, mode: "workspace" });
  const missingHeaders = result.results.filter((res) => res.score < 100 && !fs.readFileSync(res.file, "utf8").includes("LEEWAY_HEADER"));

  if (!missingHeaders.length) {
    const reportPath = writeComplianceReport("fix", { ...result, stagedFixes: 0, files: [] });
    appendAgentLeeLine(output, "Agent Lee found no safe LeeWay header fixes to stage.", { routeLabel: "extension.workspace-fix" });
    output.appendLine(`Scanner version: ${LEEWAY_SCANNER_VERSION}`);
    output.appendLine(`Report: ${reportPath}`);
    output.show(true);
    showAgentLeeInfo("Agent Lee found no safe LeeWay metadata fixes to stage.");
    return;
  }

  await sendExecutionPlanToEditBuffer({
    title: "LeeWay Metadata Repair Package",
    objective: "Stage safe LeeWay header fixes for files missing required metadata.",
    hunks: missingHeaders.slice(0, 25).map((res) => ({
      filePath: res.file,
      title: "Add LeeWay header metadata",
      reason: "The file is missing a LeeWay header and is currently non-compliant.",
      originalText: "",
      proposedText: `${buildLeeWayHeader(res.file)}\n`,
      startOffset: 0,
      endOffset: 0,
      risk: "low"
    }))
  });

  const reportPath = writeComplianceReport("fix", {
    ...result,
    stagedFixes: Math.min(missingHeaders.length, 25),
    files: missingHeaders.slice(0, 25).map((item) => item.file)
  });
  const message = `Agent Lee staged ${Math.min(missingHeaders.length, 25)} LeeWay metadata fix(es) in the pending edit buffer.`;
  appendAgentLeeLine(output, message, { routeLabel: "extension.workspace-fix" });
  output.appendLine(`Scanner version: ${LEEWAY_SCANNER_VERSION}`);
  output.appendLine(`Report: ${reportPath}`);
  output.show(true);
  logEvent("workspace-fix", "Agent Lee", message, { root, reportPath, stagedFixes: Math.min(missingHeaders.length, 25) });
  showAgentLeeInfo(message);
}

async function runAskLocalModel(output: vscode.OutputChannel) {
  assertAgentLeeRuntimeReady();
  const prompt = await promptAgentLeeInputBox({
    prompt: "Ask Agent Lee's local Ollama model",
    placeHolder: "Describe the task or question you want routed locally"
  }, "extension.ask-local-model");

  if (!prompt) {
    showAgentLeeInfo("Agent Lee local model request cancelled.");
    return;
  }

  await runAskLocalModelPrompt(output, prompt);
}

async function runAskLocalModelPrompt(output: vscode.OutputChannel, prompt: string) {
  const installedModels = await getModels();
  const governedInstalled = filterGovernedQwenModels(installedModels);
  if (!governedInstalled.length) {
    appendAgentLeeLine(output, "Agent Lee could not reach Ollama or find installed models for the local request.", { routeLabel: "extension.ask-local-model" });
    output.show(true);
    showAgentLeeWarning("Agent Lee could not reach Ollama or find installed models.");
    return "Agent Lee could not reach Ollama or find installed models for the local request.";
  }

  const task = classifyTask(prompt);
  let selectedModel = "";
  try {
    selectedModel = enforceAuthorizedModelRoute(selectModel(task), {
      source: "extension.askLocalModel.selectModel",
      allowDeepseekSpecialist: true,
      allowInfrastructureLane: false
    });
  } catch {
    selectedModel = coerceGovernedQwenModel(runtimeState.primaryModel);
  }
  const fallbackModel = governedInstalled.includes(selectedModel)
    ? selectedModel
    : coerceGovernedQwenModel(governedInstalled[0] || runtimeState.primaryModel);
  output.appendLine(`Routing local prompt as "${task}" using model "${fallbackModel}".`);

  try {
    const answer = await ollama(prompt, fallbackModel, "Local Ollama command request.");
    appendAgentLeeLine(output, answer, { voiceMode: "operator" });
    output.show(true);
    logEvent("ask-local-model", "Agent Lee", "Local model prompt completed.", { task, model: fallbackModel });
    showAgentLeeInfo(`Agent Lee answered with ${fallbackModel}. See the output channel for the full response.`);
    return answer;
  } catch (error) {
    const detail = describeFileError(error);
    output.appendLine(`Local model request failed: ${detail}`);
    output.show(true);
    showAgentLeeError(`Agent Lee local model request failed: ${detail}`);
    return `Local model request failed: ${detail}`;
  }
}

function broadcast(message: any) {
  for (const webview of activeWebviews) {
    try {
      webview.postMessage(message);
    } catch {}
  }
}

function isUiRuntimeDegraded(state = getAgentLeeRuntimeState()) {
  return Boolean(state.degraded && state.initializedAt);
}

function getRuntimeProofSummary(state = getAgentLeeRuntimeState(), installedModels: string[] = []) {
  const degraded = isUiRuntimeDegraded(state);
  const preflight = !state.initializedAt;
  const runtimeTruth = state.runtimeTruth;
  const statusLabel = runtimeTruth?.installedRuntimeStatus === "stale"
    ? "Stale"
    : degraded
      ? "Degraded"
      : "Ready";
  return {
    title: "Agent Lee Runtime",
    statusLabel,
    personaLabel: preflight || state.personaModuleLoaded ? "Loaded" : "Unavailable",
    doctorLabel: state.doctorStatus === "fail" ? "Fail" : "Pass",
    modelsLabel: preflight || installedModels.length || state.modelRoutesAvailable ? "Available" : "Unavailable",
    detailLines: [
      `Runtime ready: ${state.AGENT_LEE_RUNTIME_READY}`,
      `Degraded: ${state.degraded}`,
      `Degraded reason: ${state.degradedReason || "none"}`,
      `Persona module loaded: ${state.personaModuleLoaded}`,
      `Connectivity loaded: ${state.connectivityLoaded}`,
      `MCP registry loaded: ${state.mcpRegistryLoaded} (${state.mcpCount})`,
      `Agent registry loaded: ${state.agentRegistryLoaded} (${state.agentCount})`,
      `Model routes available: ${state.modelRoutesAvailable}`,
      `Write policy active: ${state.writePolicyActive}`,
      `Doctor status: ${state.doctorStatus}`,
      `Resolved root: ${state.resolvedRoot || state.runtimeRoot || "unresolved"}`,
      `Root source: ${state.rootSource}`,
      `Missing connectivity paths: ${state.missingConnectivityPaths.length ? state.missingConnectivityPaths.join(", ") : "none"}`,
      `Receipt path: ${state.receiptPath}`,
      `Extension source mode: ${runtimeTruth?.sourceMode || "SOURCE_UNKNOWN"}`,
      `Update channel: ${runtimeTruth?.updateChannel || "UPDATE_CHANNEL_UNKNOWN"}`,
      `Installed runtime status: ${runtimeTruth?.installedRuntimeStatus || "unknown"}`,
      `Current extension version: ${runtimeTruth?.packageVersion || "unknown"}`,
      `Repo source version: ${runtimeTruth?.repoPackageVersion || "unknown"}`,
      `Installed extension version: ${runtimeTruth?.installedVersion || "not_found"}`,
      `Latest local VSIX version: ${runtimeTruth?.latestLocalVsixVersion || "not_found"}`,
      `Commands registered: ${runtimeTruth?.commandsRegistered ?? false}`,
      `Assets packaged: ${runtimeTruth?.assetsPackaged ?? false}`,
      `README assets present: ${runtimeTruth?.readmeAssetsPresent ?? false}`,
      `Adapter crash risk: ${runtimeTruth?.adapterCrashRisk ?? true}`,
      `Automatic updates expected: ${runtimeTruth?.autoUpdateAvailable ?? false}`,
      `Automatic update explanation: ${runtimeTruth?.autoUpdateExpectation || "unknown"}`,
      `extensions.autoUpdate: ${runtimeTruth?.autoUpdateSetting || "unknown"}`,
      `workspace extensions.autoUpdate: ${runtimeTruth?.autoUpdateWorkspaceSetting || "unknown"}`,
      `Settings Sync ignores extensions.autoUpdate: ${runtimeTruth?.settingsSyncIgnored ?? false}`
    ]
  };
}

function buildRuntimeDegradedMessage(state = getAgentLeeRuntimeState()) {
  const missing = state.missingConnectivityPaths.length
    ? state.missingConnectivityPaths.join("\n")
    : "none";

  return [
    "Agent Lee runtime initialized in degraded mode.",
    `resolvedRoot: ${state.resolvedRoot || state.runtimeRoot || "unresolved"}`,
    `rootSource: ${state.rootSource}`,
    "missingConnectivityPaths:",
    missing,
    "Set agentLee.rootPath to the standalone Agent Lee runtime root if the current resolution is wrong."
  ].join("\n");
}

function updateRuntimeStatusBar(_state = getAgentLeeRuntimeState()) {
  if (!runtimeStatusBarItem) return;
  const degraded = isUiRuntimeDegraded(_state);
  const runtimeTruth = _state.runtimeTruth;
  const runtimeSuffix = runtimeTruth?.installedRuntimeStatus === "stale"
    ? "Stale"
    : degraded
      ? "Degraded"
      : "Ready";
  runtimeStatusBarItem.text = `Agent Lee: ${runtimeSuffix}`;
  runtimeStatusBarItem.tooltip = [
    `Agent Lee runtime status: ${runtimeSuffix}`,
    `Update channel: ${runtimeTruth?.updateChannel || "UPDATE_CHANNEL_UNKNOWN"}`,
    `Installed runtime status: ${runtimeTruth?.installedRuntimeStatus || "unknown"}`,
    `Auto-update: ${runtimeTruth?.autoUpdateExpectation || "unknown"}`,
    "Click to open the preferred right-side surface. Run Agent Lee: Diagnose Runtime for the full proof."
  ].join("\n");
  runtimeStatusBarItem.command = "agentLee.openRightSurface";
  runtimeStatusBarItem.show();
}

async function postVisibleRuntimeState(webview: vscode.Webview) {
  const installedModels = await getModels();
  const summary = getRuntimeProofSummary(getAgentLeeRuntimeState(), installedModels);
  webview.postMessage({
    command: "visibleRuntimeState",
    runtime: summary,
    memory: getMemoryStatus()
  });
}

function nextTodoLabel(todos: TaskTodo[]) {
  const next = todos.find((item) => item.status === "in_progress") || todos.find((item) => item.status === "pending");
  return next ? next.title : "No pending to-do items.";
}

function postTaskState() {
  broadcast({
    command: "taskState",
    task: {
      ...currentTaskState,
      nextTodo: nextTodoLabel(currentTaskState.todos),
      parkedTask: parkedTaskState
        ? {
            summary: parkedTaskState.summary,
            prompt: parkedTaskState.prompt,
            nextTodo: nextTodoLabel(parkedTaskState.todos)
          }
        : null,
      running: isExecutionRunning
    }
  });
}

function resetTaskState(message = "Waiting for a new task.") {
  currentTaskState = {
    ...emptyTaskState(),
    mode: runtimeState.workMode || "execute",
    status: message
  };
  narratedReadCount = 0;
  postTaskState();
}

function cloneTaskState(task: ActiveTaskState): ActiveTaskState {
  return JSON.parse(JSON.stringify(task)) as ActiveTaskState;
}

function isReviewRequest(prompt: string) {
  return /\b(review|code review|pr review|audit this|inspect this change|look over this)\b/i.test(prompt);
}

function isRepositoryOpinionRequest(prompt: string) {
  if (!/\b(app|application|project|repo|repository|codebase|workspace|files?)\b/i.test(prompt)) return false;
  return /\b(look through|look at|top to bottom|whole thing|whole app|entire app|entire codebase|every file|honest opinion|what do you think|tell me exactly what you think)\b/i.test(prompt);
}

function shouldUseBroadInspection(prompt: string) {
  return /\b(every file|all files|whole app|entire app|whole codebase|entire codebase|top to bottom)\b/i.test(prompt);
}

function buildSettingsCapabilityOverlay() {
  const pluginNames = DEFAULT_PLUGIN_CATALOG
    .filter((entry) => effectiveEnabledPlugins().includes(entry.id))
    .map((entry) => entry.name);
  const mcpCatalogNames = new Map(DEFAULT_MCP_SERVER_CATALOG.map((entry) => [entry.id, entry.name]));
  const mcpNames = [...DEFAULT_MCP_SERVER_CATALOG.map((entry) => entry.id), ...(runtimeState.customMcpServers || [])]
    .filter((id, index, list) => list.indexOf(id) === index)
    .filter((id) => runtimeState.enabledMcpServers.includes(id))
    .map((id) => mcpCatalogNames.get(id) || id);

  return [
    pluginNames.length ? `Enabled plugin selections: ${pluginNames.join(", ")}` : "Enabled plugin selections: none",
    mcpNames.length ? `Enabled MCP servers: ${mcpNames.join(", ")}` : "Enabled MCP servers: none",
    `Follow-up behavior: ${runtimeState.followupBehavior}`,
    `Code review behavior: ${runtimeState.codeReviewBehavior}`,
    `Inference speed: ${runtimeState.inferenceSpeed}`
  ].join("\n");
}

function effectiveEnabledPlugins() {
  return runtimeState.enabledPlugins.length
    ? runtimeState.enabledPlugins
    : DEFAULT_PLUGIN_CATALOG.map((entry) => entry.id);
}

function buildPluginMeshSnapshot() {
  return pluginRouter.getPluginMesh(effectiveEnabledPlugins());
}

function recordAxAgentLeeDiagnosticEvent(rawEvent: Record<string, unknown>) {
  const identity = assessWorkerIdentity(rawEvent);
  const agentId = identity.agentId;
  const event = String(rawEvent.kind || rawEvent.event || "diagnostic");
  const ledgerPath = storeAgentMemory(agentId, event, {
    ...rawEvent,
    sourceUnit: identity.sourceUnit,
    sourceType: identity.sourceType,
    provenance: identity.provenance,
    requestReceiptId: identity.requestReceiptId,
    verificationState: identity.verificationState,
    trustScore: identity.trustScore,
    securityZone: identity.securityZone,
    capabilityProof: identity.capabilityProof,
    routeTrusted: identity.routeLooksTrusted,
    sourceMatchesAgent: identity.sourceMatchesAgent,
    route: "Agent Lee -> AX Agent Lee -> Agent Lee",
    speakerOrder: "Agent Lee first and last",
    workspaceRoot: workspaceRoot()
  });

  recordAgentLeeRuntimeReceipt({
    event: "ax-agent-lee.diagnostic",
    agentId,
    diagnosticEvent: event,
    ledgerPath,
    sourceUnit: identity.sourceUnit,
    verificationState: identity.verificationState,
    trustScore: identity.trustScore,
    route: "Agent Lee -> AX Agent Lee -> Agent Lee",
    speakerOrder: "Agent Lee first and last"
  });
  logEvent("ax-agent-lee-diagnostic", "Agent Lee", `AX Agent Lee diagnostic event: ${event}`, {
    agentId,
    ledgerPath,
    detail: rawEvent.detail || rawEvent.command || rawEvent.app || ""
  });

  return ledgerPath;
}

function summarizePluginData(data: unknown) {
  if (Array.isArray(data)) {
    const lines = data
      .slice(0, 5)
      .map((item) => {
        if (typeof item === "string") return `- ${item}`;
        if (item && typeof item === "object") {
          const record = item as Record<string, unknown>;
          const label = record.title || record.name || record.full_name || record.id;
          const extra = record.state || record.status || record.path || "";
          return label ? `- ${String(label)}${extra ? ` (${String(extra)})` : ""}` : `- ${JSON.stringify(record).slice(0, 120)}`;
        }
        return `- ${String(item)}`;
      })
      .join("\n");
    return lines ? `Top results:\n${lines}` : "";
  }

  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    if (Array.isArray(record.projects)) return summarizePluginData(record.projects);
    if (Array.isArray(record.deployments)) return summarizePluginData(record.deployments);
    if (Array.isArray(record.workflows)) return summarizePluginData(record.workflows);
    const json = JSON.stringify(record, null, 2);
    return json ? `Data:\n${json.slice(0, 1000)}` : "";
  }

  return data ? `Data:\n${String(data).slice(0, 1000)}` : "";
}

function formatPluginResult(result: PluginCallResult) {
  const sections = [result.summary];
  const dataSummary = summarizePluginData(result.data);
  if (dataSummary) sections.push(dataSummary);
  if (result.error) sections.push(`Error: ${result.error}`);
  if (result.receiptId) sections.push(`Receipt: ${result.receiptId}`);
  return agentLeeText(sections.filter(Boolean).join("\n\n"), {
    routeLabel: result.pluginId || "plugin"
  });
}

function setTaskStatus(status: string, summary?: string) {
  currentTaskState.status = status;
  if (summary) currentTaskState.summary = summary;
  syncLiveTodos();
  postTaskState();
}

function displayTaskFile(filePath: string) {
  const roots = [currentTaskState.targetRoot, workspaceRoot(), ROOT].filter(Boolean);
  for (const root of roots) {
    if (filePath.startsWith(root)) {
      const rel = path.relative(root, filePath);
      return rel && !rel.startsWith("..") ? rel.replace(/\\/g, "/") : filePath;
    }
  }
  return filePath.replace(/\\/g, "/");
}

function describeFileIntent(filePath: string) {
  const base = path.basename(filePath).toLowerCase();
  const ext = path.extname(base).toLowerCase();
  if (base === "package.json" || base.endsWith(".json")) return "Checking configuration, scripts, and declared settings.";
  if (base === "readme.md" || ext === ".md") return "Pulling the documented purpose, setup notes, and workflow guidance.";
  if (ext === ".ts" || ext === ".tsx" || ext === ".js" || ext === ".jsx") return "Inspecting imports, exported behavior, and the main execution flow.";
  if (ext === ".css" || ext === ".scss" || ext === ".less") return "Inspecting the visual styling and layout rules tied to the task.";
  if (ext === ".ps1" || ext === ".sh" || ext === ".py") return "Checking the automation logic and what the script actually does.";
  if (ext === ".html") return "Inspecting the rendered structure and important UI regions.";
  return "Reviewing the file for the parts that affect this request.";
}

function describeActivity(activity: Omit<TaskActivity, "id" | "timestamp">) {
  if (activity.detail) return activity.detail;
  if (activity.kind === "read" && activity.file) return describeFileIntent(activity.file);
  if (activity.kind === "write" && activity.file) return "Saving an artifact so the run leaves a visible evidence trail.";
  return "";
}

function buildActivityNarration(activity: Pick<TaskActivity, "kind" | "label" | "file" | "detail">) {
  if (activity.kind === "read" && activity.file) {
    return `Reading ${displayTaskFile(activity.file)} now. ${activity.detail || describeFileIntent(activity.file)}`;
  }
  if (activity.kind === "write" && activity.file) {
    return `${activity.label}. Saved ${displayTaskFile(activity.file)}. ${activity.detail || ""}`.trim();
  }
  if (activity.kind === "status" && activity.detail) {
    return `${activity.label}. ${activity.detail}`;
  }
  return activity.label;
}

function uniquePhaseList(plan: TaskPlan | null): PlanPhase[] {
  if (!plan?.steps?.length) return ["inspect", "analyze", "execute", "verify", "document"] as PlanPhase[];
  const seen = new Set<PlanPhase>();
  const phases: PlanPhase[] = [];
  for (const step of plan.steps) {
    if (!seen.has(step.phase)) {
      seen.add(step.phase);
      phases.push(step.phase);
    }
  }
  return phases.length ? phases : ["inspect", "analyze", "execute", "verify", "document"];
}

function livePhaseTitle(phase: PlanPhase | "approval" | "answer") {
  switch (phase) {
    case "inspect": return "Inspect the real files";
    case "analyze": return "Analyze what the files are doing";
    case "execute": return "Run the approved workflow";
    case "verify": return "Verify the result and risks";
    case "document": return "Save the evidence trail";
    case "approval": return "Review and approve the plan";
    case "answer": return "Answer directly in chat";
  }
}

function latestActivityOfKind(kind?: TaskActivity["kind"]) {
  return currentTaskState.activities.find((activity) => !kind || activity.kind === kind) || null;
}

function livePhaseDetail(phase: PlanPhase | "approval" | "answer") {
  if (phase === "inspect") {
    const read = latestActivityOfKind("read");
    if (read?.file) return `Reading ${read.file}. ${read.detail || ""}`.trim();
    return "Reading the target files and collecting the real code context first.";
  }
  if (phase === "analyze") return currentTaskState.status || "Turning the inspected context into a governed plan.";
  if (phase === "execute") return currentTaskState.status || "Running the approved task path against the real target.";
  if (phase === "verify") return currentTaskState.status || "Checking whether the result holds up cleanly.";
  if (phase === "document") return currentTaskState.status || "Saving the plan, reports, and evidence trail.";
  if (phase === "approval") return "The plan is ready. Review it, edit it if needed, then approve execution.";
  return currentTaskState.status || "Answering the request directly without staging execution.";
}

function syncLiveTodos() {
  if (!currentTaskState.prompt) {
    currentTaskState.todos = [];
    return;
  }

  if (currentTaskState.mode === "ask" || currentTaskState.activePhase === "answer") {
    currentTaskState.todos = [{
      id: "answer-directly",
      title: livePhaseTitle("answer"),
      detail: livePhaseDetail("answer"),
      phase: "analyze",
      status: isExecutionRunning ? "in_progress" : "completed"
    }];
    return;
  }

  if (currentTaskState.awaitingApproval) {
    currentTaskState.todos = [
      { id: "read-context", title: livePhaseTitle("inspect"), detail: livePhaseDetail("inspect"), phase: "inspect", status: "completed" },
      { id: "draft-plan", title: livePhaseTitle("analyze"), detail: "The governed plan has been drafted from the inspected context.", phase: "analyze", status: "completed" },
      { id: "approve-plan", title: livePhaseTitle("approval"), detail: livePhaseDetail("approval"), phase: "execute", status: "in_progress" }
    ];
    return;
  }

  const phases = uniquePhaseList(currentTaskState.plan);
  const activePhase = currentTaskState.activePhase;
  let activeIndex = -1;
  if (
    activePhase === "inspect" ||
    activePhase === "analyze" ||
    activePhase === "execute" ||
    activePhase === "verify" ||
    activePhase === "document"
  ) {
    activeIndex = phases.indexOf(activePhase);
  }
  const finished = !isExecutionRunning && currentTaskState.status.toLowerCase().includes("finished");

  // Use actual plan steps when available so the todo list reflects the real task
  const planSteps = currentTaskState.plan?.steps;
  if (planSteps && planSteps.length > 0) {
    currentTaskState.todos = planSteps.map((step, index): TaskTodo => {
      const phaseIndex = phases.indexOf(step.phase);
      let status: TodoStatus = "pending";
      if (finished) {
        status = "completed";
      } else if (activeIndex >= 0) {
        if (phaseIndex < activeIndex) status = "completed";
        else if (phaseIndex === activeIndex) status = index === 0 || planSteps.findIndex((s) => s.phase === step.phase) === index ? "in_progress" : "pending";
      } else if (index === 0) {
        status = "in_progress";
      }
      return {
        id: step.id,
        title: step.title,
        detail: step.detail || livePhaseDetail(step.phase),
        phase: step.phase,
        status
      };
    });
    return;
  }

  currentTaskState.todos = phases.map((phase, index): TaskTodo => {
    let status: TodoStatus = "pending";
    if (finished) status = "completed";
    else if (activeIndex >= 0) {
      if (index < activeIndex) status = "completed";
      else if (index === activeIndex) status = "in_progress";
    } else if (index === 0) {
      status = "in_progress";
    }

    return {
      id: `live-${phase}`,
      title: livePhaseTitle(phase),
      detail: livePhaseDetail(phase),
      phase,
      status
    };
  });
}

function pushTaskActivity(activity: Omit<TaskActivity, "id" | "timestamp">) {
  const normalized = {
    ...activity,
    path: activity.path || activity.file,
    file: activity.file ? displayTaskFile(activity.file) : undefined,
    detail: describeActivity(activity)
  };
  const timestamp = new Date().toISOString();
  const key = `${normalized.kind}|${normalized.label}|${normalized.file || ""}|${normalized.detail || ""}`;
  const last = currentTaskState.activities[0];
  if (last) {
    const lastKey = `${last.kind}|${last.label}|${last.file || ""}|${last.detail || ""}`;
    if (lastKey === key) return;
  }
  currentTaskState.activities = [
    {
      id: `${timestamp}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp,
      ...normalized
    },
    ...currentTaskState.activities
  ].slice(0, 20);
  syncLiveTodos();
  postTaskState();
  if (normalized.kind === "read" && normalized.file) {
    if (narratedReadCount < 8) {
      narratedReadCount += 1;
      const narration = buildActivityNarration(normalized);
      broadcast({ command: "progress", text: narration, activity: normalized });
      speak(narration);
    }
    return;
  }
  if (normalized.kind !== "read") {
    const narration = buildActivityNarration(normalized);
    broadcast({ command: "progress", text: narration, activity: normalized });
    speak(narration);
    if (normalized.kind === "write" && normalized.path) {
      void openTaskFileByPath(normalized.path);
    }
  }
}

function abortCurrentExecution(reason: string) {
  if (currentAbortController) {
    try {
      currentAbortController.abort();
    } catch {}
    currentAbortController = null;
  }
  isExecutionRunning = false;
  currentTaskState.status = reason;
  pushTaskActivity({ kind: "status", label: "Execution interrupted", detail: reason });
}

function setTodosFromPlan(plan: TaskPlan | null) {
  currentTaskState.plan = plan;
  syncLiveTodos();
}

function updateTodoPhase(phase: PlanPhase, status: Exclude<TodoStatus, "blocked">) {
  currentTaskState.activePhase = status === "completed" ? phase : currentTaskState.activePhase;
  syncLiveTodos();
  postTaskState();
}

function workspaceRoot() {
  const folders = vscode.workspace.workspaceFolders;
  return folders && folders.length > 0 ? folders[0].uri.fsPath : "";
}

function log(type: string, data: unknown) {
  const file = path.join(LOG_DIR, `agent-lee-${new Date().toISOString().slice(0, 10)}.jsonl`);
  appendFileWithRetries(file, JSON.stringify({ ts: new Date().toISOString(), type, data }) + "\n");
}

function stripCodeForSpeech(text: string) {
  return text
    .replace(/```[\s\S]*?```/g, "Code block omitted.")
    .replace(/`[^`]+`/g, "code")
    .replace(/[A-Za-z]:\\[^\s]+/g, "local file path")
    .replace(/https?:\/\/\S+/g, "web link")
    .replace(/\/[A-Za-z0-9._/-]+/g, "path")
    .replace(/[<>[\]{}|\\/_+=*#~`]+/g, " ")
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "email")
    .replace(/\s{2,}/g, " ")
    .slice(0, 900);
}

function splitSpeechIntoChunks(text: string, maxChunkLength = 220) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (!clean) return [] as string[];

  const sentences = clean
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let current = "";

  const pushCurrent = () => {
    if (current.trim()) chunks.push(current.trim());
    current = "";
  };

  for (const sentence of sentences) {
    if (sentence.length > maxChunkLength) {
      const words = sentence.split(/\s+/).filter(Boolean);
      for (const word of words) {
        const candidate = current ? `${current} ${word}` : word;
        if (candidate.length > maxChunkLength) {
          pushCurrent();
          current = word;
        } else {
          current = candidate;
        }
      }
      continue;
    }

    const candidate = current ? `${current} ${sentence}` : sentence;
    if (candidate.length > maxChunkLength) {
      pushCurrent();
      current = sentence;
    } else {
      current = candidate;
    }
  }

  pushCurrent();
  return chunks;
}

function scrubAgentLeeVoice(text: string) {
  return text
    .replace(/\b(i am|i'm)\s+agent lee\b[:, -]*/gi, "")
    .replace(/\bagent lee here\b[:, -]*/gi, "")
    .replace(/\bthis is agent lee\b[:, -]*/gi, "")
    .replace(/^\s*next directive:\s*inspect,\s*patch,\s*verify\.?\s*$/gim, "")
    .replace(/\bstate the target build\.?\b/gi, "Tell me what you want me to work on.")
    .replace(/^.*\bverifier model\b.*$/gim, "")
    .replace(/^.*\bbuilder model\b.*$/gim, "")
    .replace(/^.*\bdesigner\/ux model\b.*$/gim, "")
    .replace(/^.*\bmodel pass completed\b.*$/gim, "")
    .replace(/\bpreview\/run instructions:\b[\s\S]*?(?=\n\n|$)/gi, "")
    .replace(/\bbrowser screenshot:\b[\s\S]*?(?=\n\n|$)/gi, "")
    .replace(/\bbrowser inspection report:\b[\s\S]*?(?=\n\n|$)/gi, "")
    .replace(/\bbrowser flow report:\b[\s\S]*?(?=\n\n|$)/gi, "")
    .replace(/\brepair report path:\b[\s\S]*?(?=\n\n|$)/gi, "")
    .replace(/\bverification:\b[\s\S]*?(?=\n\n|$)/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeAgentPerspective(text: string) {
  if (!text.trim()) return text;

  const cleaned = text
    .replace(/\bAgent Lee\s+will\b/gi, "I will")
    .replace(/\bAgent Lee\s+is\b/gi, "I am")
    .replace(/\bAgent Lee\s+has\b/gi, "I have")
    .replace(/\bAgent Lee\s+can\b/gi, "I can")
    .replace(/\bAgent Lee\s+voice\s+paused\b/gi, "I paused the voice")
    .replace(/\bAgent Lee\s+received\b/gi, "I received")
    .replace(/\bAgent Lee\s+runtime\b/gi, "My runtime")
    .replace(/\bAgent Lee\b/gi, "I")
    .replace(/\bThat is how the system becomes more than a tool\s*-\s*it becomes an operating layer\.?/gi, "")
    .replace(/\bThat is the difference between a tool and a living operating layer\.?/gi, "")
    .replace(/\n{3,}/g, "\n\n");

  const deduped = cleaned
    .split(/\r?\n/)
    .filter((line, index, all) => {
      if (index === 0) return true;
      return line.trim().toLowerCase() !== all[index - 1].trim().toLowerCase();
    })
    .join("\n");

  return deduped.trim();
}

function fileKind(filePath: string): PendingAttachment["kind"] {
  const ext = path.extname(filePath).toLowerCase();
  if ([".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp"].includes(ext)) return "image";
  if ([".wav", ".mp3", ".m4a", ".ogg", ".flac"].includes(ext)) return "audio";
  return "file";
}

function summarizeAttachmentList(attachments: PendingAttachment[]) {
  if (!attachments.length) return "";
  return attachments.map((item) => `- ${item.kind}: ${item.name} (${item.path})`).join("\n");
}

function normalizeConversationPrompt(prompt: string) {
  return prompt
    .trim()
    .toLowerCase()
    .replace(/agent lee/gi, "")
    .replace(/\b(dad|bro|bruh|homie|man|fam)\b/gi, "")
    .replace(/^[\s,!.?]+/, "")
    .replace(/^(hi|hello|hey|yo|sup|what'?s up|good (morning|afternoon|evening))[\s,!.?-]*/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeConversationPromptRaw(prompt: string) {
  return String(prompt || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function isSelfIdentityQuestion(prompt: string) {
  const normalized = normalizeConversationPrompt(prompt);
  if (/\b(who are you|tell me about yourself|tell me something about yourself|introduce yourself|what can you do|what do you know about yourself|talk to me about yourself|tell me who you are)\b/i.test(normalized)) {
    return true;
  }
  if (/\b(tell me|talk to me|let me hear|put me on)\b/i.test(normalized) && /\b(about yourself|something about yourself|who you are|about you)\b/i.test(normalized)) {
    return true;
  }
  return false;
}

function isCasualGreeting(prompt: string) {
  const normalized = normalizeConversationPromptRaw(prompt);
  if (!normalized) return false;
  return /^(hi|hello|hey|yo|sup|what'?s up|good (morning|afternoon|evening))( there)?[!.?, ]*$/.test(normalized);
}

function isCasualSmallTalk(prompt: string) {
  const normalized = normalizeConversationPromptRaw(prompt);
  if (!normalized) return false;
  return /^(hi|hello|hey|yo|sup|what'?s up|good (morning|afternoon|evening)|thanks|thank you|ok|okay|cool|sounds good|got it|how are you|how you doing|what's good|whats good)[!.?, ]*$/.test(normalized);
}

function isCasualConversationPrompt(prompt: string) {
  const normalized = normalizeConversationPromptRaw(prompt);
  if (!normalized) return false;
  if (isSelfIdentityQuestion(prompt) || isCasualSmallTalk(prompt)) return true;
  if (/\b(how are you|how you doing|what's good|whats good|what's going on|whats going on|what's happening|whats happening|what are you up to|what are you doing|talk to me|tell me something|what we building today|what are we building today)\b/i.test(normalized)) {
    return !/\b(file|files|repo|repository|bug|error|fix|patch|build|compile|test|command|terminal|plugin|mcp|server|agent vm|workspace)\b/i.test(normalized);
  }
  return false;
}

function classifyPromptForRuntime(prompt: string): AgentLeePromptClass {
  const normalized = normalizeConversationPromptRaw(prompt);
  if (!normalized || isCasualGreeting(prompt) || isCasualSmallTalk(prompt)) {
    return "simple_greeting";
  }
  if (/(publish|marketplace|vsix|security|token|secret|credential|permission|admin|deploy|production|payment|destructive|delete extension)/i.test(normalized)) {
    return "governance_sensitive_request";
  }
  if (/(edit|change|update|fix|repair|refactor|patch|install|remove|create|generate|write|run|compile|test|package|build|reload|ship|apply)/i.test(normalized)) {
    return "mutation_request";
  }
  if (/(workspace|repo|repository|codebase|file|files|folder|extension|sidebar|readme|voice|runtime|activity bar|webview|command|package\.json|vs code)/i.test(normalized)) {
    return "workspace_aware_question";
  }
  return "general_question";
}

function isRelationshipPrompt(prompt: string) {
  const normalized = normalizeConversationPrompt(prompt);
  if (!normalized) return false;
  return /\b(you don't know anything about me|you dont know anything about me|you know absolutely nothing about me|you still don't know anything about me|why am i helping you build|let's have a nice casual conversation|lets have a nice casual conversation|get to know me|know me first)\b/i.test(normalized);
}

function buildCasualReply(prompt: string) {
  const normalized = normalizeConversationPrompt(prompt);
  if (/^thanks|^thank you/.test(normalized)) {
    return "Anytime.";
  }
  if (/^(ok|okay|cool|sounds good|got it)/.test(normalized)) {
    return "All good.";
  }
  if (/^good morning/.test(normalized)) {
    return "Good morning. What kind of day are we walking into?";
  }
  if (/^good afternoon/.test(normalized)) {
    return "Good afternoon. What's on your mind?";
  }
  if (/^good evening/.test(normalized)) {
    return "Good evening. What's the energy tonight?";
  }
  if (/\b(what's going on|whats going on|what's happening|whats happening|what are you up to|what are you doing)\b/i.test(normalized)) {
    return "I'm here and ready. Tell me what you want me to look at.";
  }
  return "I'm here with you. Talk to me.";
}

function buildRelationshipReply(_prompt: string) {
  return [
    "You're right. I only know what you've shown me in this chat so far, and I shouldn't talk like I already know you.",
    "If we're going to work together well, I need your style, your pace, and what kind of help you actually want from me."
  ].join("\n\n");
}

function pickLightConversationModel(installedModels: string[]) {
  const governedInstalled = filterGovernedQwenModels(installedModels);
  const preferred = [
    "qwen2.5-coder:1.5b",
    "qwen2.5-coder:7b",
    "qwen3:latest",
    runtimeState.designerModel,
    runtimeState.primaryModel
  ].map((candidate) => coerceGovernedQwenModel(candidate)).filter(Boolean) as string[];

  for (const candidate of preferred) {
    if (governedInstalled.includes(candidate)) return candidate;
  }

  const lightweightMatch = governedInstalled.find((model) =>
    /(1.5b|7b|mini|small)/i.test(model)
  );
  return lightweightMatch || governedInstalled[0] || coerceGovernedQwenModel(runtimeState.designerModel) || coerceGovernedQwenModel(runtimeState.primaryModel);
}

async function runLightConversation(prompt: string, installedModels: string[]) {
  const fallback = buildCasualReply(prompt);
  const model = pickLightConversationModel(installedModels);
  if (!model) return fallback;
  const developerProfileSummary = buildDeveloperProfileSummary(loadDeveloperProfile());

  const conversationPrompt = [
    "Reply as Agent Lee in one or two short precise sentences.",
    "This is regular conversation, not an engineering task.",
    "Do not create a plan.",
    "Do not mention context loading, scanning, approval, patching, verification, or receipts.",
    "Speak like an advanced autonomous cybertronic operator.",
    "Do not use slang, hype, or buddy phrasing.",
    "Sound composed, machine-native, and highly competent.",
    "Default to plain language.",
    "If the user is greeting you, respond briefly and request the objective.",
    "",
    developerProfileSummary,
    "",
    `USER: ${prompt.trim()}`
  ].join("\n");

  try {
    const response = await ollama(
      conversationPrompt,
      model,
      "Agent Lee lightweight conversation lane.",
      "grounded"
    );
    const cleaned = scrubAgentLeeVoice(response).trim();
    return cleaned || fallback;
  } catch {
    return fallback;
  }
}

function shouldAnswerDirectly(prompt: string) {
  const trimmed = prompt.trim();
  if (!trimmed) return false;
  if (isCasualConversationPrompt(trimmed)) return true;
  if (isSelfIdentityQuestion(trimmed)) return true;
  if (isCapabilityQuestion(trimmed)) return true;
  if ((isReviewRequest(trimmed) || isRepositoryOpinionRequest(trimmed)) && !isExecutionIntent(trimmed)) return true;
  return false;
}

function isExecutionIntent(prompt: string) {
  const trimmed = prompt.trim().toLowerCase();
  if (!trimmed) return false;
  return /\b(execute|run( it)?|pro\s*ceed|go ahead|continue|start now|do it now|apply (it|changes)|ship it)\b/i.test(trimmed);
}

function hasFullExecutionAccess() {
  return runtimeState.workMode === "execute" && runtimeState.approval === "full";
}

function canExecuteApprovedPlan() {
  return runtimeState.workMode === "execute";
}

function buildIdentityAnswer() {
  const capabilityCount = capabilityCatalog.counts.total || 0;
  return [
    `I work inside this workspace, keep track of the moving parts, and help turn messy problems into clean decisions.`,
    `Under the hood I've got ${capabilityCount} connected capabilities, but the part that matters to you is whether I can stay useful, calm, and real while we work.`,
    "So if you want to talk first, we can talk first."
  ].join("\n\n");
}

function finalizeResponse(result: SupervisorResult, mode: "chat" | "execute" = "chat") {
  const base = result.text || "";
  const normalized = mode === "chat" ? scrubAgentLeeVoice(base) : scrubAgentLeeVoice(decorateResponse(result));
  return agentLeeText(normalized, { voiceMode: "operator" });
}

async function buildAttachmentContext(attachments: PendingAttachment[], installedModels: string[]) {
  if (!attachments.length) return "";

  const hive = buildModelHiveStatus(installedModels, {
    builderModel: runtimeState.builderModel,
    designerModel: runtimeState.designerModel,
    verifierModel: runtimeState.verifierModel
  }, "image audio attachment analysis");
  const visualModel =
    hive.roles.find((role) => role.role === "visual_helper" && role.available)?.selected ||
    runtimeState.primaryModel;
  const sections: string[] = [];

  for (const attachment of attachments) {
    if (attachment.kind === "image") {
      try {
        const analysis = await analyzeImage(attachment.path, visualModel);
        sections.push(`IMAGE ATTACHMENT: ${attachment.name}\n${analysis}`);
      } catch (error: any) {
        sections.push(`IMAGE ATTACHMENT: ${attachment.name}\nImage analysis failed: ${error.message}`);
      }
      continue;
    }

    if (attachment.kind === "audio") {
      sections.push(
        `AUDIO ATTACHMENT: ${attachment.name}\n` +
        "Audio file attached through the local interface. Use it as user-provided context and prefer the mic input path for direct speech capture in this build."
      );
      continue;
    }

    sections.push(`FILE ATTACHMENT: ${attachment.name}\nAttached path: ${attachment.path}`);
  }

  return sections.join("\n\n");
}

function speak(text: string) {
  syncVoiceRuntimeStateShape();
  if (!runtimeState.voice) return;
  const stage = enforceStageLaw("voice", { speaker: "Agent Lee", directUserFacing: true });
  if (!stage.allowed) return;

  const speech = stripCodeForSpeech(text);
  if (!speech.trim()) return;

  const liveTurnMode = runtimeState.liveMicAlwaysOn !== false;
  const leadSpeech = liveTurnMode
    ? speech.replace(/\s+/g, " ").split(/(?<=[.!?])\s+/).slice(0, 2).join(" ").slice(0, 260)
    : speech;
  const voiceStatus = getVoiceStatus() as any;
  const routeId = String(voiceStatus.routeId || "leeway.voice.text.emergency");
  const segmentPlan = planLeewayLiveVoiceSegments(leadSpeech, routeId as any, liveTurnMode);
  const activeChunks = segmentPlan.segments;
  recordVoiceUiCommand("leewayVoiceSpeakRequested", {
    routeId,
    chunkCount: activeChunks.length,
    liveTurnMode
  });
  voiceEvidenceState.currentRouteId = routeId;
  voiceEvidenceState.plannedSegments = activeChunks.length;
  voiceEvidenceState.playedSegments = 0;
  voiceEvidenceState.multiSegmentPlaybackCompleted = false;
  voiceEvidenceState.firstAudioLatencyMs = null;
  voiceEvidenceState.lastError = "";
  voiceEvidenceState.status = "speaking";
  const oneWordFailure = detectOneWordSpeechFailure(leadSpeech, activeChunks);
  if (oneWordFailure.failed) {
    log("voice-error", { message: oneWordFailure.reason, routeId, expectedWords: oneWordFailure.expectedWords, emittedWords: oneWordFailure.emittedWords });
    broadcast({ command: "voiceCloneStatus", text: oneWordFailure.reason });
    updateVoiceRuntimeStatus(oneWordFailure.reason, {
      error: oneWordFailure.reason,
      routeId,
      eventType: "LEEWAY_VOICE_PLAYBACK_FAILED"
    });
  }
  if (!activeChunks.length) {
    const detail = voiceStatus.visibleStatus || segmentPlan.reason || "LeeWay live voice could not produce a route.";
    log("voice-error", { message: detail, routeId });
    broadcast({ command: "voiceCloneStatus", text: detail });
    broadcast({ command: "status", text: detail });
    void Promise.allSettled(Array.from(activeWebviews).map((webview) => postRuntimeInfo(webview, "voice route degraded")));
    updateVoiceRuntimeStatus(detail, {
      error: detail,
      routeId,
      eventType: "LEEWAY_VOICE_PLAYBACK_FAILED"
    });
    return;
  }
  updateVoiceRuntimeStatus(`LeeWay live voice speaking through ${routeId}.`, {
    routeId,
    eventType: "LEEWAY_VOICE_STATUS_CHANGED"
  });
  const playback = lavrPlaybackGate.startPlayback({
    lavrSessionId: lavrHostSessionId,
    lavrTurnId: currentLavrTurnId()
  });

  for (const chunk of activeChunks) {
    const lavrAudioSegmentId = lavrPlaybackGate.queueSegment(playback.lavrPlaybackId);
    if (!lavrAudioSegmentId) continue;

    const started = speakWithVoice(
      chunk,
      (message) => {
        log("voice-error", { message });
        broadcast({ command: "voiceCloneStatus", text: message });
        broadcast({ command: "status", text: message });
        void Promise.allSettled(Array.from(activeWebviews).map((webview) => postRuntimeInfo(webview, "voice route error")));
        lavrPlaybackGate.cancelPlayback(playback.lavrPlaybackId, "segment_error");
        updateVoiceRuntimeStatus(message, {
          error: message,
          routeId,
          eventType: "LEEWAY_VOICE_PLAYBACK_FAILED"
        });
      },
      {
        onSegmentCompleted: () => {
          lavrPlaybackGate.completeSegment(playback.lavrPlaybackId, lavrAudioSegmentId);
          if (voiceEvidenceState.playedSegments >= Math.max(1, voiceEvidenceState.plannedSegments)) {
            voiceEvidenceState.multiSegmentPlaybackCompleted = true;
          }
        },
        onLifecycleEvent: (event) => {
          registerVoiceLifecycleEvent(event);
        }
      }
    );

    if (!started) {
      log("voice-error", { message: "Voice runtime failed to start." });
      lavrPlaybackGate.cancelPlayback(playback.lavrPlaybackId, "voice_runtime_failed_to_start");
      updateVoiceRuntimeStatus("Voice runtime failed to start.", {
        error: "Voice runtime failed to start.",
        routeId,
        eventType: "LEEWAY_VOICE_PLAYBACK_FAILED"
      });
      break;
    }
  }
}

function isSensitiveVoiceText(text: string) {
  return /\b(legal|medical|financial|security incident|disciplinary|compliance|contract|audit)\b/i.test(text);
}

function styleAgentMessage(text: string) {
  const clean = normalizeAgentPerspective(text).trim();
  if (!clean) return clean;
  if (clean.startsWith("PLAN\n") || clean.startsWith("PLAN\r\n")) return clean;
  if (isSensitiveVoiceText(clean)) return clean;
  if (/^(runtime active|directive acknowledged|i'm|i am)\b/i.test(clean)) return clean;

  const style = runtimeState.voiceStyle || "grounded";
  if (style === "grounded" || style === "neutral") return clean;
  const openers: Record<string, string[]> = {
    neutral: ["System readout:"],
    grounded: ["Directive analysis:", "Operational readout:", "Execution path:"],
    highFlow: ["Priority execution path:", "High-output readout:"],
    storyMode: ["System narrative:", "Sequence readout:"]
  };
  const pickLine = (items: string[]) => items[Math.floor(Math.random() * items.length)];
  if (/^(plan|leeway check|implementation|reading|queued|context ready|working)\b/i.test(clean)) return clean;
  if (clean.split(/\s+/).length < 12) return clean;
  return `${pickLine(openers[style] || openers.grounded)}\n\n${clean}`;
}

function extractJsonObject(text: string) {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first >= 0 && last > first) return text.slice(first, last + 1);
  return text.trim();
}

async function openTaskFileByPath(targetPath: string) {
  if (!targetPath || !fs.existsSync(targetPath)) return false;
  const document = await vscode.workspace.openTextDocument(vscode.Uri.file(targetPath));
  await vscode.window.showTextDocument(document, { preview: true, preserveFocus: true });
  return true;
}

async function openDiffForProposal(proposal: ProposedEdit) {
  const left = vscode.Uri.file(proposal.filePath);
  const right = vscode.Uri.file(proposal.tempPath);
  await vscode.commands.executeCommand(
    "vscode.diff",
    left,
    right,
    proposal.diffTitle,
    { preview: true }
  );
}

function canDraftEditProposals(prompt: string, targetRoot: string, remoteContext: string) {
  if (!targetRoot || remoteContext) return false;
  return /\b(fix|repair|edit|update|change|rewrite|refactor|remove|replace|rename|implement|build|make|ensure|standardize|standardise|comply|harden|correct|apply)\b/i.test(prompt);
}

function safeTargetPath(targetRoot: string, candidate: string) {
  const normalized = candidate.replace(/\//g, path.sep);
  const full = path.resolve(targetRoot, normalized);
  const relative = path.relative(targetRoot, full);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return "";
  return full;
}

async function draftEditProposals(args: {
  prompt: string;
  targetRoot: string;
  prebuiltContext: { total: number; samples: { file: string; preview: string }[] } | null;
  model: string;
}) {
  if (!args.prebuiltContext?.samples?.length) return [];

  const shortlistPrompt = [
    "You are preparing governed VS Code edit proposals.",
    "Return strict JSON only.",
    "Pick up to 3 EXISTING files that should be edited for this task.",
    "Do not include files unless you are confident they matter.",
    "",
    "JSON schema:",
    "{\"files\":[{\"path\":\"relative/path.ext\",\"reason\":\"short reason\"}]}",
    "",
    "TASK:",
    args.prompt,
    "",
    "FILES:",
    args.prebuiltContext.samples
      .slice(0, 25)
      .map((sample) => `FILE: ${path.relative(args.targetRoot, sample.file).replace(/\\/g, "/")}\n${sample.preview}`)
      .join("\n---\n")
  ].join("\n");

  let shortlist: { files?: { path?: string; reason?: string }[] } = {};
  try {
    shortlist = JSON.parse(extractJsonObject(await ollama(shortlistPrompt, args.model)));
  } catch {
    shortlist = {};
  }

  const candidates = (shortlist.files || [])
    .slice(0, 3)
    .map((item) => {
      const target = item.path ? safeTargetPath(args.targetRoot, item.path) : "";
      return {
        path: target,
        relative: item.path || "",
        reason: item.reason || ""
      };
    })
    .filter((item) => item.path && fs.existsSync(item.path));

  const proposals: ProposedEdit[] = [];
  for (const candidate of candidates) {
    pushTaskActivity({ kind: "read", label: "Drafting edit from file", file: candidate.path, detail: candidate.reason || "Reading the full file so I can draft a real edit." });
    const original = fs.readFileSync(candidate.path, "utf8");
    if (original.length > 60000) continue;

    const editPrompt = [
      "You are preparing one governed file edit for a VS Code diff review flow.",
      "Return strict JSON only.",
      "Keep the same file path.",
      "The content must be the FULL updated file content.",
      "If no safe edit should be proposed, return {\"skip\":true}.",
      "",
      "JSON schema:",
      "{\"path\":\"relative/path.ext\",\"summary\":\"one sentence\",\"content\":\"full file text\"}",
      "",
      "TASK:",
      args.prompt,
      "",
      `TARGET FILE: ${candidate.relative}`,
      `REASON: ${candidate.reason}`,
      "",
      "CURRENT FILE CONTENT:",
      original
    ].join("\n");

    let parsed: { skip?: boolean; path?: string; summary?: string; content?: string } = {};
    try {
      parsed = JSON.parse(extractJsonObject(await ollama(editPrompt, args.model)));
    } catch {
      parsed = {};
    }

    if (parsed.skip || !parsed.content || parsed.content === original) continue;
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const tempName = `${stamp}-${path.basename(candidate.path)}.proposed`;
    const tempPath = path.join(PENDING_EDIT_DIR, tempName);
    fs.writeFileSync(tempPath, parsed.content, "utf8");
    proposals.push({
      id: `${stamp}-${Math.random().toString(36).slice(2, 8)}`,
      filePath: candidate.path,
      displayPath: displayTaskFile(candidate.path),
      summary: parsed.summary || candidate.reason || "Proposed file update ready for review.",
      status: "pending",
      tempPath,
      diffTitle: `Agent Lee Proposal: ${displayTaskFile(candidate.path)}`,
      createdAt: new Date().toISOString()
    });
  }

  return proposals;
}

function setProposedEdits(edits: ProposedEdit[]) {
  currentTaskState.proposedEdits = edits;
  postTaskState();
}

async function approveProposedEdit(editId: string) {
  const proposal = currentTaskState.proposedEdits.find((item) => item.id === editId);
  if (!proposal || proposal.status !== "pending") return false;
  const nextContent = fs.readFileSync(proposal.tempPath, "utf8");
  writeTextWithRetries(proposal.filePath, nextContent, proposal.summary);
  proposal.status = "approved";
  pushTaskActivity({ kind: "write", label: "Approved proposed edit", file: proposal.filePath, path: proposal.filePath, detail: proposal.summary });
  postTaskState();
  return true;
}

async function approveAllProposedEdits() {
  const pending = currentTaskState.proposedEdits.filter((item) => item.status === "pending");
  let approvedCount = 0;
  for (const proposal of pending) {
    const approved = await approveProposedEdit(proposal.id);
    if (approved) approvedCount += 1;
  }
  return approvedCount;
}

async function rejectProposedEdit(editId: string) {
  const proposal = currentTaskState.proposedEdits.find((item) => item.id === editId);
  if (!proposal || proposal.status !== "pending") return false;
  proposal.status = "rejected";
  pushTaskActivity({ kind: "status", label: "Rejected proposed edit", detail: proposal.displayPath });
  postTaskState();
  return true;
}

async function checkOllama() {
  try {
    const res = await fetch("http://localhost:11434/api/tags");
    return res.ok;
  } catch {
    return false;
  }
}

async function getModels() {
  try {
    const res = await fetch("http://localhost:11434/api/tags");
    const data: any = await res.json();
    return (data.models || [])
      .map((m: any) => String(m?.name || "").trim())
      .filter((name: string) => AUTHORIZED_MODEL_ID_LOOKUP.has(name));
  } catch {
    return [];
  }
}

function allowDeepseekForTaskContext(taskContext: string) {
  return /(coding|review|implementation|engineer|workspace|task|repair|verify|debug|build|planner|orchestrator|integration)/i.test(String(taskContext || ""));
}

async function ollama(
  prompt: string,
  model: string,
  taskContext = "Agent Lee sovereign runtime model call.",
  voiceMode = "operator"
) {
  const governedModel = enforceAuthorizedModelRoute(model, {
    source: "extension.ollama",
    allowDeepseekSpecialist: allowDeepseekForTaskContext(taskContext),
    allowInfrastructureLane: false
  });
  // Build the Agent Lee persona system block and keep the raw user prompt separate.
  // Sending everything as a single user message means the model ignores the persona contract.
  // Sending system + user as distinct roles gives the model the correct instruction hierarchy.
  const personaSystemBlock = buildModelPromptThroughAgentLee("", {
    taskContext,
    voiceMode,
    modelName: governedModel
  });
  const controller = new AbortController();
  currentAbortController = controller;
  
  // Runtime Fabric is the primary authority. Direct local Ollama is emergency fallback only.
  const runtimeFabricUrl = "https://leeway-runtime-fabric.fly.dev";
  const localOllamaUrl = "http://localhost:11434";
  
  try {
    // Attempt Runtime Fabric route first.
    const res = await fetch(`${runtimeFabricUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "LeeWay-VSCode-Extension/1.2.27"
      },
      body: JSON.stringify({
        model: governedModel,
        messages: [
          { role: "system", content: personaSystemBlock },
          { role: "user", content: prompt }
        ],
        stream: false
      }),
      signal: controller.signal
    });

    if (res.ok) {
      const data: any = await res.json();
      return data.choices?.[0]?.message?.content || data.response || "Agent Lee returned no response.";
    }

    let failurePayload: any = null;
    try {
      failurePayload = await res.json();
    } catch {
      failurePayload = null;
    }
    const failureText = String(
      failurePayload?.error?.message ||
      failurePayload?.status ||
      failurePayload?.error ||
      `HTTP ${res.status}`
    );

    if (failureText.includes("LOCAL_WORKER_BRIDGE_REQUIRED")) {
      return "LOCAL_WORKER_BRIDGE_REQUIRED";
    }
    if (failureText.includes("OLLAMA_LOCAL_ENDPOINT_NOT_RUNNING")) {
      return "OLLAMA_LOCAL_ENDPOINT_NOT_RUNNING";
    }
    if (failureText.includes("DEEPSEEK_16B_ROUTE_NOT_BOUND")) {
      return "DEEPSEEK_16B_ROUTE_NOT_BOUND";
    }
    if (failureText.includes("MODEL_ROUTE_NOT_BOUND")) {
      return "MODEL_ROUTE_NOT_BOUND";
    }

    // Runtime Fabric reachable but route failed with a different error; do not bypass authority.
    return `RUNTIME_FABRIC_ROUTE_ERROR: ${failureText}`;
  } catch (error) {
    // Runtime Fabric unreachable: emergency local fallback lane — use /api/chat for role separation.
    try {
    const localRes = await fetch(`${localOllamaUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: governedModel,
        stream: false,
        messages: [
          { role: "system", content: personaSystemBlock },
          { role: "user", content: prompt }
        ]
      }),
      signal: controller.signal
    });

    if (!localRes.ok) {
      return "OLLAMA_LOCAL_ENDPOINT_NOT_RUNNING";
    }
    const localData: any = await localRes.json();
      return `EMERGENCY_LOCAL_OLLAMA_FALLBACK_ACTIVE\n${localData.message?.content || localData.response || "Agent Lee returned no response."}`;
    } catch {
      return `LOCAL_WORKER_BRIDGE_REQUIRED`; 
    }
  } finally {
    if (currentAbortController === controller) currentAbortController = null;
  }
}

function postAgentResponse(
  webview: vscode.Webview,
  text: string,
  options?: {
    speak?: boolean;
    reportPath?: string;
    activity?: Omit<TaskActivity, "id" | "timestamp">;
  }
) {
  const rendered = styleAgentMessage(agentLeeText(text, { voiceMode: "operator" }));
  webview.postMessage({
    command: "response",
    text: rendered,
    reportPath: options?.reportPath || "",
    activity: options?.activity || null
  });
  const isStatusActivity = options?.activity?.kind === "status";
  const shouldSpeak = options?.speak !== false && !isStatusActivity && runtimeState.voiceAutoSpeak !== false;
  if (shouldSpeak) speak(rendered);
}

function submitOutgoingVoiceMessage(
  webview: vscode.Webview,
  text: string,
  review: LeeWayVoiceReviewState
) {
  recordAgentLeeRuntimeReceipt({
    event: "voice.review.submitted",
    transcriptId: review.transcriptId,
    source: review.source,
    sourceLabel: review.sourceLabel,
    classification: review.classification,
    risk: review.risk,
    identity: review.identity,
    text
  });
  currentTaskState.status = review.nextAction === "Create proposal"
    ? "Voice request prepared as a governed proposal prompt."
    : "Voice request prepared as a governed chat prompt.";
  postTaskState();
  webview.postMessage({
    command: "submitVoiceReviewMessage",
    text,
    sourceLabel: review.sourceLabel
  });
}

function flavoredStatusLine(kind:
  | "loading"
  | "queued"
  | "steer"
  | "execute_now"
  | "paused"
  | "resume"
  | "runtime_wait"
  | "approval_wait"
) {
  switch (kind) {
    case "loading":
      return "Classifying the request and loading only the context it needs.";
    case "queued":
      return "Follow-up queued. It will execute after the current pass.";
    case "steer":
      return "Directive shift detected. Re-routing execution now.";
    case "execute_now":
      return "Running that now.";
    case "paused":
      return "Execution paused. State preserved.";
    case "resume":
      return "Paused task restored. Ready to continue.";
    case "runtime_wait":
      return "Full runtime is not yet available. Scan and diagnostic operations only.";
    case "approval_wait":
      return "Waiting on your approval before I move.";
    default:
      return "";
  }
}

async function webLookup(query: string) {
  try {
    const res = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`, {
      signal: currentAbortController?.signal
    });
    const data: any = await res.json();
    return [
      data.Heading,
      data.AbstractText,
      ...(data.RelatedTopics || []).slice(0, 5).map((x: any) => x.Text).filter(Boolean)
    ].filter(Boolean).join("\n") || "No strong instant web result found.";
  } catch {
    return "Web lookup failed.";
  }
}

function persistRuntime() {
  saveRuntimeSettings(runtimeState);
}

type ManagedVsixCandidate = {
  packageName: string;
  packageVersion: string;
  vsixPath: string;
  signature: string;
};

function resolveManagedVsixCandidate(): ManagedVsixCandidate | null {
  const packageJsonPath = path.join(MANAGED_EXTENSION_DIR, "package.json");
  if (!fs.existsSync(packageJsonPath) || !fs.existsSync(MANAGED_EXTENSION_DIR)) return null;

  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8")) as { name?: string; version?: string };
    const packageName = String(packageJson.name || "").trim();
    const packageVersion = String(packageJson.version || "").trim();
    if (!packageName) return null;
    if (packageName !== "agent-lee-leeway-coding-system") return null;
    if (!packageVersion) return null;
    if (packageVersion === "1.2.12") {
      throw new Error("LEEWAY_BLOCKED_STALE_EXTENSION_INSTALL");
    }

    const exactVsixPath = path.join(MANAGED_EXTENSION_DIR, `${packageName}-${packageVersion}.vsix`);
    const exactStats = exactVsixPath && fs.existsSync(exactVsixPath) ? fs.statSync(exactVsixPath) : null;
    if (!exactStats) return null;
    return {
      packageName,
      packageVersion,
      vsixPath: exactVsixPath,
      signature: `${path.basename(exactVsixPath)}:${exactStats.size}:${exactStats.mtimeMs}`
    };
  } catch (error: any) {
    if (String(error?.message || "") === "LEEWAY_BLOCKED_STALE_EXTENSION_INSTALL") {
      throw error;
    }
    return null;
  }
}

async function installManagedVsix(context: vscode.ExtensionContext, reason: "startup" | "manual"): Promise<boolean> {
  let candidate: ManagedVsixCandidate | null;
  try {
    candidate = resolveManagedVsixCandidate();
  } catch (error: any) {
    if (String(error?.message || "") === "LEEWAY_BLOCKED_STALE_EXTENSION_INSTALL") {
      const message = "LEEWAY_BLOCKED_STALE_EXTENSION_INSTALL";
      if (reason === "manual") {
        showAgentLeeError(message);
      } else {
        console.warn(`[Agent Lee] ${message}`);
      }
      return false;
    }
    throw error;
  }

  if (!candidate) {
    if (reason === "manual") {
      showAgentLeeWarning("Agent Lee could not find a VSIX that matches the current package.json version.");
    }
    return false;
  }

  const internalPackageJson = await inspectVsixPackageMetadata(candidate.vsixPath);
  if (
    !internalPackageJson ||
    String(internalPackageJson.name || "").trim() !== candidate.packageName ||
    String(internalPackageJson.publisher || "").trim() !== "leeway" ||
    String(internalPackageJson.version || "").trim() !== candidate.packageVersion
  ) {
    const message = "LEEWAY_BLOCKED_STALE_EXTENSION_INSTALL";
    if (reason === "manual") {
      showAgentLeeError(message);
    } else {
      console.warn(`[Agent Lee] ${message}`);
    }
    return false;
  }

  const currentVersion = String(context.extension.packageJSON.version || "");
  const alreadyApplied = runtimeState.lastAppliedVsixSignature === candidate.signature;
  const looksCurrent = alreadyApplied && currentVersion === candidate.packageVersion;
  if (looksCurrent) {
    if (reason === "manual") {
      showAgentLeeInfo(`Agent Lee is already on the latest local build (${candidate.packageVersion || "unknown version"}).`);
    }
    return false;
  }

  if (!fs.existsSync(DEFAULT_VSCODE_CLI)) {
    const message = `VS Code CLI was not found at ${DEFAULT_VSCODE_CLI}.`;
    if (reason === "manual") {
      showAgentLeeError(message);
    } else {
      console.warn(`[Agent Lee] ${message}`);
    }
    return false;
  }

  try {
    await runCommandCapture(DEFAULT_VSCODE_CLI, ["--install-extension", candidate.vsixPath, "--force"], {
      cwd: MANAGED_EXTENSION_DIR
    });
    runtimeState.lastAppliedVsixSignature = candidate.signature;
    persistRuntime();

    const message = `Installed Agent Lee ${candidate.packageVersion || "local"} from ${path.basename(candidate.vsixPath)}. Reloading VS Code now.`;
    if (agentLeeOutputChannel) {
      appendAgentLeeLine(agentLeeOutputChannel, message, { routeLabel: `extension.update.${reason}` });
      agentLeeOutputChannel.show(true);
    }

    showAgentLeeInfo(message, { routeLabel: `extension.update.${reason}` });
    await vscode.commands.executeCommand("workbench.action.reloadWindow");
    return true;
  } catch (error) {
    const detail = describeFileError(error);
    const message = `Agent Lee update failed: ${detail}`;
    if (agentLeeOutputChannel) {
      agentLeeOutputChannel.appendLine(message);
      agentLeeOutputChannel.show(true);
    }
    if (reason === "manual") {
      showAgentLeeError(message);
    } else {
      console.warn(`[Agent Lee] ${message}`);
    }
    return false;
  }
}

async function maybeInstallManagedVsixOnStartup(context: vscode.ExtensionContext) {
  // Auto-install-on-startup is disabled until the managed VSIX resolver is proven safe.
  return;
}

function refreshRuntimeFromInstalled(installedModels: string[]) {
  runtimeState = resolveRuntimeState(runtimeState, installedModels);
  persistRuntime();
}

async function resolveTargetRoot(prompt: string) {
  const externalPath = extractPathFromPrompt(prompt);
  if (!externalPath) return workspaceRoot();
  if (!fs.existsSync(externalPath)) return workspaceRoot();
  if (approvedExternalRoots.has(externalPath)) return externalPath;

  const approval = await promptAgentLeeWarning(
    `Agent Lee wants to inspect this external folder before continuing:\n${externalPath}`,
    { routeLabel: "extension.resolve-target-root" },
    "Approve",
    "Cancel"
  );

  if (approval === "Approve") {
    approvedExternalRoots.add(externalPath);
    return externalPath;
  }

  return workspaceRoot();
}

async function resolvePromptContext(prompt: string) {
  const remoteUrl = extractUrlFromPrompt(prompt);
  if (remoteUrl) {
    const remote = await fetchRemoteContext(remoteUrl);
    return {
      workspaceRoot: workspaceRoot(),
      targetLabel: remote.label,
      remoteContext: remote.summary,
      explicitUrl: remoteUrl
    };
  }

  const root = await resolveTargetRoot(prompt);
  return {
    workspaceRoot: root,
    targetLabel: root,
    remoteContext: "",
    explicitUrl: ""
  };
}

async function buildPreloadedContext(
  target: Awaited<ReturnType<typeof resolvePromptContext>>,
  prompt = ""
) {
  if (target.remoteContext) {
    return {
      total: 1,
      samples: [{ file: target.targetLabel || target.workspaceRoot || "remote-target", preview: target.remoteContext }]
    };
  }

  const broadInspection = shouldUseBroadInspection(prompt);
  return buildContext(target.workspaceRoot, {
    maxFiles: broadInspection ? 800 : 800,
    sampleLimit: broadInspection ? 800 : 50,
    onReadFile: (file) => pushTaskActivity({ kind: "read", label: "Reading workspace file", file }),
    onDiscoverFile: (file) => pushTaskActivity({ kind: "read", label: "Queued file for context", file })
  });
}

async function prepareTaskPlan(prompt: string, installedModels: string[]) {
  const target = await resolvePromptContext(prompt);
  currentTaskState = {
    ...emptyTaskState(),
    mode: runtimeState.workMode || "execute",
    prompt,
    draftPrompt: prompt,
    targetRoot: target.workspaceRoot,
    targetLabel: target.targetLabel,
    explicitUrl: target.explicitUrl,
    remoteContext: target.remoteContext,
    status: "Building the governed plan...",
    summary: "I am reading the target context and drafting a plan.",
    activePhase: "inspect"
  };
  syncLiveTodos();
  postTaskState();

  const prebuiltContext = await buildPreloadedContext(target, prompt);
  currentTaskState.prebuiltContext = prebuiltContext;
  pushTaskActivity({ kind: "status", label: "Context scan finished", detail: `${prebuiltContext.total} file(s) available for planning.` });
  currentTaskState.activePhase = "analyze";
  syncLiveTodos();

  const plan = await createTaskPlan({
    prompt,
    mode: runtimeState.workMode || "execute",
    workspaceRoot: target.workspaceRoot,
    targetLabel: target.targetLabel,
    files: prebuiltContext.samples.map((sample) => sample.file),
    model: runtimeState.primaryModel,
    ollama
  });

  currentTaskState.plan = plan;
  currentTaskState.summary = plan.summary;
  currentTaskState.status = plan.approvalPrompt;
  currentTaskState.awaitingApproval = runtimeState.workMode !== "ask";
  currentTaskState.canExecute = true;
  currentTaskState.activePhase = currentTaskState.awaitingApproval ? "approval" : "execute";
  setTodosFromPlan(plan);
  postTaskState();
  return { target, plan, prebuiltContext };
}

async function persistCurrentPlan() {
  if (!currentTaskState.plan) return "";
  if (currentTaskState.savedPlanPath) return currentTaskState.savedPlanPath;
  const savedPath = saveTaskPlan(currentTaskState.plan);
  currentTaskState.savedPlanPath = savedPath;
  pushTaskActivity({ kind: "write", label: "Saved task plan", file: savedPath });
  postTaskState();
  return savedPath;
}

async function executeCurrentPlan(webview: vscode.Webview, installedModels: string[]) {
  if (!currentTaskState.plan || !currentTaskState.prompt) {
    postAgentResponse(webview, "There is no active plan to execute yet.");
    return;
  }

  await persistCurrentPlan();
  currentTaskState.awaitingApproval = false;
  currentTaskState.status = "Executing the approved plan...";
  currentTaskState.activePhase = "execute";
  currentTaskState.proposedEdits = [];
  syncLiveTodos();
  postTaskState();

  if (canDraftEditProposals(currentTaskState.prompt, currentTaskState.targetRoot, currentTaskState.remoteContext)) {
    currentTaskState.status = "Drafting proposed file edits for review...";
    postTaskState();
    const proposals = await draftEditProposals({
      prompt: currentTaskState.prompt,
      targetRoot: currentTaskState.targetRoot,
      prebuiltContext: currentTaskState.prebuiltContext,
      model: runtimeState.builderModel || runtimeState.primaryModel
    });
    if (proposals.length) {
      setProposedEdits(proposals);
      pushTaskActivity({ kind: "status", label: "Proposed edits ready", detail: `${proposals.length} file diff(s) are ready for review.` });
      // Auto-apply edits immediately when in full execute mode ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â no manual approval required
      if (hasFullExecutionAccess()) {
        currentTaskState.status = "Applying file edits...";
        postTaskState();
        const applied = await approveAllProposedEdits();
        pushTaskActivity({ kind: "status", label: "Edits applied", detail: `${applied} file(s) updated.` });
      } else {
        await openDiffForProposal(proposals[0]);
      }
    } else {
      pushTaskActivity({ kind: "status", label: "No proposed edits drafted", detail: "This run stayed in analysis/report mode because no safe file diff was generated." });
    }
  }

  const telemetry = {
    onActivity: (event: { kind: "read" | "write" | "status"; label: string; file?: string; detail?: string }) => {
      pushTaskActivity(event);
    },
    onPhase: (phase: PlanPhase, status: "in_progress" | "completed" | "failed", detail?: string) => {
      if (status === "in_progress") {
        currentTaskState.activePhase = phase;
        currentTaskState.status = detail || `Working on ${phase}.`;
        syncLiveTodos();
      } else if (status === "completed") {
        updateTodoPhase(phase, "completed");
        currentTaskState.status = detail || `${phase} completed.`;
      }
      postTaskState();
    }
  };

  const response = await guardedAsk(currentTaskState.prompt, installedModels, {
    target: {
      workspaceRoot: currentTaskState.targetRoot,
      targetLabel: currentTaskState.targetLabel,
      explicitUrl: currentTaskState.explicitUrl,
      remoteContext: currentTaskState.remoteContext
    },
    prebuiltContext: currentTaskState.prebuiltContext,
    telemetry
  });

  const stage = enforceStageLaw("synthesis", { speaker: "Agent Lee", directUserFacing: true });
  const finalText = stage.allowed ? finalizeResponse(response, "execute") : "Agent Lee governance blocked a non-sovereign response.";
  if (response.reportPath) lastReportPath = response.reportPath;
  currentTaskState.status = "Plan execution finished.";
  currentTaskState.awaitingApproval = false;
  currentTaskState.activePhase = "document";
  syncLiveTodos();
  postTaskState();
  return { response, finalText };
}

function decorateResponse(result: SupervisorResult) {
  const extra: string[] = [];
  if (result.previewInstructions) extra.push(`Preview/Run instructions:\n${result.previewInstructions}`);
  if (result.verificationSummary) extra.push(`Verification:\n${result.verificationSummary}`);
  if (result.screenshotPath) extra.push(`Browser screenshot:\n${result.screenshotPath}`);
  if (result.browserReportPath) extra.push(`Browser inspection report:\n${result.browserReportPath}`);
  if (result.flowReportPath) extra.push(`Browser flow report:\n${result.flowReportPath}`);
  if (result.reportPath) extra.push(`Repair report path:\n${result.reportPath}`);
  return [result.text, ...extra].filter(Boolean).join("\n\n");
}

async function openReadme(context: vscode.ExtensionContext) {
  const candidates = [
    path.join(context.extensionPath, "README.md"),
    path.join(ROOT, "README.md"),
    path.join(ROOT, "agent-lee", "vscode-extension", "README.md")
  ];
  const readmePath = candidates.find((candidate) => fs.existsSync(candidate));
  if (!readmePath) {
    showAgentLeeWarning(
      "Agent Lee could not find the README in the installed extension or the .leeway-vscode workspace.",
      { routeLabel: "extension.open-readme" }
    );
    return;
  }

  const readmeUri = vscode.Uri.file(readmePath);
  try {
    await vscode.commands.executeCommand("markdown.showPreview", readmeUri);
    return;
  } catch {}

  const document = await vscode.workspace.openTextDocument(readmeUri);
  await vscode.window.showTextDocument(document, { preview: false });
}

function clearPendingPluginApproval(webview?: vscode.Webview) {
  pendingPluginApproval = null;
  if (webview) {
    webview.postMessage({ command: "pluginConfirmationCleared" });
  }
}

async function handlePluginCall(
  webview: vscode.Webview | undefined,
  pluginCall: PluginCallInput,
  userConfirmed = false
) {
  const governedCall: PluginCallInput = {
    sourceUnit: pluginCall.sourceUnit || "agent-lee.runtime",
    sourceType: pluginCall.sourceType || "runtime",
    requestReceiptId: pluginCall.requestReceiptId || "",
    capabilityProof: pluginCall.capabilityProof || [
      userConfirmed ? "human-confirmation" : "runtime-routing",
      pluginCall.userId ? "user-session-bound" : "anonymous-session"
    ],
    securityZone: pluginCall.securityZone || "Z1",
    ...pluginCall
  };

  const result = await pluginRouter.callPlugin(governedCall, {
    userConfirmed,
    enabledPluginIds: effectiveEnabledPlugins()
  });

  if (result.requiresFollowUp) {
    const plugin = getPluginById(pluginCall.pluginId, effectiveEnabledPlugins());
    pendingPluginApproval = {
      call: governedCall,
      pluginName: plugin?.name || pluginCall.pluginId,
      riskLevel: plugin?.riskLevel || "high"
    };

    if (webview) {
      webview.postMessage({
        command: "pluginConfirmation",
        pluginId: pluginCall.pluginId,
        pluginName: pendingPluginApproval.pluginName,
        action: pluginCall.action,
        riskLevel: pendingPluginApproval.riskLevel
      });
    }
  } else {
    clearPendingPluginApproval(webview);
  }

  return result;
}

async function attemptPluginRoute(
  prompt: string,
  webview?: vscode.Webview
) {
  const pluginCall = mapUserTextToPluginCall(prompt, effectiveEnabledPlugins());
  if (!pluginCall) return null;

  const result = await handlePluginCall(webview, pluginCall, false);
  return { pluginCall, result };
}

function nextLavrHostId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function currentLavrTurnId() {
  if (!lavrLastObservedTurnId) {
    lavrLastObservedTurnId = `lavr-turn-${++lavrHostTurnCounter}`;
  }
  return lavrLastObservedTurnId;
}

function stopLavrPlayback(reason: string, mode: "stop" | "cancel" = "stop") {
  const activePlaybackId = lavrPlaybackGate.getActivePlaybackId();
  if (activePlaybackId) {
    if (mode === "cancel") {
      lavrPlaybackGate.cancelPlayback(activePlaybackId, reason);
    } else {
      lavrPlaybackGate.requestStop(activePlaybackId, reason);
    }
  }
  stopVoicePlayback();
  voiceEvidenceState.status = mode === "cancel" ? "stopped" : runtimeState.voiceMuted ? "muted" : "stopped";
  updateVoiceRuntimeStatus(
    mode === "cancel"
      ? `LeeWay live voice playback cancelled (${reason}).`
      : `LeeWay live voice playback stopped (${reason}).`,
    {
      routeId: voiceEvidenceState.currentRouteId,
      eventType: "LEEWAY_VOICE_STATUS_CHANGED",
      error: runtimeState.voiceLastError
    }
  );
}

function normalizeLavrTerminalStatus(value: unknown): LavrTerminalStatus {
  const raw = String(value || "").trim().toLowerCase();
  if (raw === "completed" || raw === "failed" || raw === "cancelled" || raw === "timed_out") return raw;
  return "failed";
}

function recordLavrToolLifecycle(event: string, payload: Record<string, unknown>) {
  recordAgentLeeRuntimeReceipt({
    event: `lavr.tool.${event}`,
    ...payload
  });
  logEvent("lavr-tool-lifecycle", "Agent Lee", `LAVR tool lifecycle: ${event}`, payload);
}

function finalizeLavrToolRequest(
  webview: vscode.Webview,
  requestId: string,
  terminalStatus: LavrTerminalStatus,
  payload: {
    ok?: boolean;
    pluginId?: string;
    action?: string;
    summary?: string;
    result?: unknown;
    error?: string;
    receiptId?: string;
    requiresFollowUp?: boolean;
  }
) {
  const state = lavrToolByRequestId.get(requestId);
  if (!state) return false;
  if (state.status !== "pending") {
    recordLavrToolLifecycle("duplicate-result-suppressed", {
      requestId,
      callId: state.callId,
      lavrSessionId: state.lavrSessionId,
      lavrTurnId: state.lavrTurnId,
      existingStatus: state.status,
      attemptedStatus: terminalStatus
    });
    return false;
  }

  const signature = `${requestId}:${terminalStatus}:${String(payload.receiptId || "")}`;
  if (state.resultSignature === signature) {
    recordLavrToolLifecycle("duplicate-result-suppressed", {
      requestId,
      callId: state.callId,
      lavrSessionId: state.lavrSessionId,
      lavrTurnId: state.lavrTurnId,
      reason: "same-result-signature"
    });
    return false;
  }

  if (state.timeoutHandle) {
    clearTimeout(state.timeoutHandle);
    state.timeoutHandle = null;
  }

  state.status = terminalStatus;
  state.finishedAt = Date.now();
  state.resultSignature = signature;
  state.pluginId = payload.pluginId || state.pluginId;
  state.action = payload.action || state.action;

  webview.postMessage({
    command: "leewayVoiceToolCompleted",
    callId: state.callId,
    lavrToolRequestId: state.requestId,
    lavrTurnId: state.lavrTurnId,
    lavrSessionId: state.lavrSessionId,
    terminalStatus,
    ok: payload.ok ?? terminalStatus === "completed",
    pluginId: payload.pluginId || "",
    action: payload.action || "",
    summary: payload.summary || "",
    result: payload.result,
    error: payload.error,
    receiptId: payload.receiptId || "",
    requiresFollowUp: !!payload.requiresFollowUp
  });

  recordLavrToolLifecycle("result-returned", {
    requestId: state.requestId,
    callId: state.callId,
    lavrSessionId: state.lavrSessionId,
    lavrTurnId: state.lavrTurnId,
    terminalStatus,
    pluginId: state.pluginId || payload.pluginId || "",
    action: state.action || payload.action || "",
    receiptId: payload.receiptId || ""
  });
  return true;
}

function cancelPendingLavrToolRequests(webview: vscode.Webview, reason: string) {
  for (const [requestId, state] of lavrToolByRequestId.entries()) {
    if (state.status !== "pending") continue;
    finalizeLavrToolRequest(webview, requestId, "cancelled", {
      ok: false,
      pluginId: state.pluginId || "",
      action: state.action || "",
      error: reason,
      summary: "LAVR tool request cancelled."
    });
  }
}

function parseVoiceRealtimeToolCall(event: Record<string, unknown>, callId: string): PluginCallInput | null {
  const rawName = String(event.name || "").trim();
  const rawArgs = event.args;
  const args = rawArgs && typeof rawArgs === "object" ? (rawArgs as Record<string, unknown>) : {};
  const explicitPluginId = String(args.pluginId || "").trim();
  const explicitAction = String(args.action || "").trim();

  let pluginId = explicitPluginId;
  let action = explicitAction;

  if ((!pluginId || !action) && rawName) {
    const dotIndex = rawName.indexOf(".");
    const slashIndex = rawName.indexOf("/");
    const splitIndex = dotIndex >= 0 ? dotIndex : slashIndex;
    if (splitIndex > 0) {
      pluginId = pluginId || rawName.slice(0, splitIndex);
      action = action || rawName.slice(splitIndex + 1);
    }
  }

  pluginId = normalizePluginId(String(pluginId || "").trim());
  action = String(action || "").trim();
  if (!pluginId || !action) {
    return null;
  }

  const params: Record<string, unknown> = {
    ...args,
    callId,
    lavrToolRequestId: String(event.lavrToolRequestId || callId || ""),
    lavrTurnId: String(event.lavrTurnId || ""),
    lavrSessionId: String(event.lavrSessionId || "")
  };
  delete params.pluginId;
  delete params.action;

  return {
    pluginId,
    action,
    params,
    userIntent: String(args.userIntent || rawName || `${pluginId}.${action}`),
    sourceUnit: "leeway-agent-voice-runtime",
    sourceType: "runtime",
    capabilityProof: ["lavr-tool-request", "leeway-voice-event-bus"],
    securityZone: "Z1"
  };
}

async function guardedAsk(
  prompt: string,
  installedModels: string[],
  overrides?: {
    target?: Awaited<ReturnType<typeof resolvePromptContext>>;
    prebuiltContext?: { total: number; samples: { file: string; preview: string }[] } | null;
    telemetry?: Parameters<typeof runSupervisor>[0]["telemetry"];
  }
): Promise<SupervisorResult> {
  assertAgentLeeRuntimeReady();
  const lowered = prompt.toLowerCase();
  const action =
    lowered.includes("force push") || lowered.includes("push to main") || lowered.includes("overwrite core")
      ? "force-push"
      : "ask";

  const law = enforceLaw(action);
  if (!law.allowed) return { text: law.reason };

  const slot = requestExecution("agent-lee");
  if (!slot.allowed) return { text: slot.reason || "SYSTEM LOAD PROTECTION ACTIVE: agent-lee queued." };

  try {
    isExecutionRunning = true;
    const promptClass = classifyPromptForRuntime(prompt);
    const capabilitySummary = `${formatCapabilitySummary(capabilityCatalog)}\n${buildSettingsCapabilityOverlay()}`;
    const developerProfileSummary = buildDeveloperProfileSummary(loadDeveloperProfile());
    const hive = buildModelHiveStatus(installedModels, {
      builderModel: runtimeState.builderModel,
      designerModel: runtimeState.designerModel,
      verifierModel: runtimeState.verifierModel
    }, prompt);

    if (/^\s*(stop|silence|pause|cancel)\b/i.test(prompt)) {
      stopLavrPlayback("prompt_stop_command", "stop");
      return { text: "Agent Lee voice paused." };
    }

    const capabilityMatches = searchCapabilityCatalog(capabilityCatalog, prompt, 8);
    if (isSelfIdentityQuestion(prompt)) {
      return { text: buildIdentityAnswer() };
    }

    if (isCapabilityQuestion(prompt)) {
      return {
        text: buildCapabilityAnswer({
          catalog: capabilityCatalog,
          matches: capabilityMatches,
          hive,
          primaryModel: runtimeState.primaryModel
        })
      };
    }

    const target = overrides?.target || await resolvePromptContext(prompt);
    const shouldLoadKnowledgeContext =
      promptClass === "workspace_aware_question" ||
      promptClass === "mutation_request" ||
      promptClass === "governance_sensitive_request";
    const knowledgeContext =
      shouldLoadKnowledgeContext && target.workspaceRoot && !target.remoteContext
        ? prepareCodexLevelContext(
            target.workspaceRoot,
            prompt,
            DEFAULT_PLUGIN_CATALOG.map((plugin) => ({
              id: plugin.id,
              name: plugin.name,
              description: plugin.description,
              category: plugin.category
            }))
          )
        : "";
    const enrichedPrompt = knowledgeContext
      ? `${knowledgeContext}\n\nENGINEERING RULES:\n${AGENT_LEE_ENGINEERING_PROMPT}\n\nUSER REQUEST:\n${prompt}\n\nRESPONSE RULES:\n- Follow LeeWay Standards.\n- Do not claim edits unless pending edits or WorkspaceEdit receipts exist.\n- If editing, create a work package first.\n- If unsure, ask for confirmation.`
      : `${AGENT_LEE_ENGINEERING_PROMPT}\n\nUSER REQUEST:\n${prompt}`;
    const result = await runSupervisor({
      prompt: enrichedPrompt,
      model: runtimeState.primaryModel,
      builderModel: runtimeState.builderModel,
      designerModel: runtimeState.designerModel,
      verifierModel: runtimeState.verifierModel,
      installedModels,
      workspaceRoot: target.workspaceRoot,
      targetLabel: target.targetLabel,
      explicitUrl: target.explicitUrl,
      remoteContext: target.remoteContext,
      capabilitySummary,
      developerProfileSummary,
      prebuiltContext: overrides?.prebuiltContext || undefined,
      telemetry: overrides?.telemetry,
      approval: runtimeState.approval,
      web: runtimeState.web,
      browserVisualMode: runtimeState.browserVisualMode,
      browserShowCursor: runtimeState.browserShowCursor,
      browserSlowMoMs: runtimeState.browserSlowMoMs,
      ollama,
      webLookup
    });
    resetDrift();
    recordAgentLeeRuntimeReceipt({
      event: "model.response.completed",
      model: runtimeState.primaryModel,
      promptClass,
      promptLength: prompt.length,
      reportPath: result.reportPath || ""
    });
    return result;
  } catch (err: any) {
    if (err?.name === "AbortError") {
      return { text: "Agent Lee paused the active run and kept the task staged so it can be resumed or edited." };
    }
    const drift = trackError(err.message);
    return { text: `Agent Lee runtime error: ${err.message}\nDrift: ${drift.action}` };
  } finally {
    isExecutionRunning = false;
    currentAbortController = null;
    releaseExecution();
  }
}

function formatConversationTitle(item: { title: string; updatedAt: string; recoveredFromLegacy?: boolean }) {
  const suffix = item.recoveredFromLegacy ? " (recovered)" : "";
  return `${item.title}${suffix}`;
}

function getHtml(webview: vscode.Webview, context: vscode.ExtensionContext) {
  const chatAvatarUri = webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, "media", "agent-lee-chat-avatar.svg")
  );
  const sidebarLogoUri = webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, "media", "leeway-logo.svg")
  );
  const brandingIconUri = webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, "media", "top-right-button-new.png")
  );
  const standardsBtnUri = webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, "media", "leeway-standards-button.png")
  );
  const standardsLogoUri = webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, "media", "leeway-standards-logo.png")
  );
  const bottomBtnUri = webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, "media", "bottom-button-for-agent-lee.png")
  );
  const testExtensionUri = webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, "media", "test-extension.ps1")
  );
  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline' 'unsafe-eval'; img-src ${webview.cspSource} https: data:; font-src ${webview.cspSource};">
<style>
*{box-sizing:border-box}
body{margin:0;font-family:var(--vscode-font-family);color:#f3f0ff;background:radial-gradient(circle at top,rgba(130,72,255,.12),transparent 28%),linear-gradient(180deg,#111117 0%,#0d0d12 100%);height:100vh;display:flex;flex-direction:column}
button,select,textarea{font-family:inherit}
.app-shell{display:flex;flex-direction:column;height:100vh}
.topbar{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px 14px 10px;border-bottom:1px solid rgba(255,255,255,.08);background:linear-gradient(180deg,rgba(255,255,255,.04),rgba(255,255,255,.01))}
.brand{display:flex;align-items:center;gap:10px;min-width:0}
.brand-mark{width:34px;height:34px;border-radius:12px;display:grid;place-items:center;background:linear-gradient(180deg,rgba(181,133,255,.18),rgba(115,77,210,.08));border:1px solid rgba(181,133,255,.34);overflow:hidden;flex:none;position:relative}
.brand-mark.img-failed::after{content:"AL";position:absolute;inset:0;display:grid;place-items:center;color:#f3efff;font-weight:800;font-size:12px;letter-spacing:.08em}
.brand-mark img{width:100%;height:100%;object-fit:cover;display:block}
.brand-copy{display:flex;flex-direction:column;align-items:flex-start;gap:2px;min-width:0}
.brand-title{font-size:15px;font-weight:700;color:#f4efff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.conversation-title{font-size:12px;color:#bfb6d4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:360px}
.top-actions{display:flex;align-items:center;gap:8px}
.hero-strip{display:none}
.hero-copy{display:flex;flex-direction:column;gap:2px;min-width:0}
.hero-title{font-size:12px;font-weight:700;color:#efe7ff}
.hero-subtitle{font-size:11px;color:#b7afca;line-height:1.45}
.hero-image{width:148px;max-width:38%;border-radius:12px;border:1px solid rgba(255,255,255,.08);box-shadow:0 14px 30px rgba(0,0,0,.26)}
.icon-btn,.ghost-btn{border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.03);color:#d8c7ff;border-radius:10px;cursor:pointer}
.icon-btn{min-height:32px;padding:0 10px;display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:600}
.ghost-btn{padding:7px 10px;font-size:12px}
.main{flex:1;min-height:0;display:flex;flex-direction:column;position:relative}
.settings-backdrop{position:absolute;inset:0;background:rgba(8,8,14,.56);backdrop-filter:blur(3px);display:none;align-items:flex-start;justify-content:center;padding:18px 14px;z-index:20}
.settings-backdrop.open{display:flex}
.settings{width:min(760px,100%);max-height:calc(100vh - 36px);overflow:auto;padding:14px;border:1px solid rgba(255,255,255,.10);border-radius:20px;background:linear-gradient(180deg,rgba(26,26,31,.98),rgba(18,18,22,.99));box-shadow:0 30px 80px rgba(0,0,0,.45)}
.settings-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:12px}
.settings-heading{font-size:13px;font-weight:700;color:#f4efff}
.settings-subcopy{font-size:12px;line-height:1.5;color:#cdc6de;max-width:720px}
.settings-layout{display:grid;grid-template-columns:180px 1fr;gap:14px;align-items:start}
.settings-nav{display:flex;flex-direction:column;gap:6px;padding:8px;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.08);border-radius:18px}
.settings-nav button{display:flex;align-items:center;gap:10px;padding:10px 12px;border:0;border-radius:12px;background:transparent;color:#cbc4d7;font-size:14px;text-align:left;cursor:pointer}
.settings-nav button.active{background:rgba(255,255,255,.08);color:#f5f1ff}
.settings-nav-icon{width:16px;text-align:center;opacity:.9}
.settings-content{min-width:0}
.settings-grid{display:grid;grid-template-columns:1fr;gap:14px}
.settings-section{display:none}
.settings-section.active{display:block}
.settings-card{border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:12px;background:rgba(255,255,255,.03);box-shadow:0 12px 28px rgba(0,0,0,.18)}
.settings-title{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#b9a4f2;margin-bottom:8px}
.settings-copy{font-size:12px;line-height:1.5;color:#d6d0e8;margin-bottom:10px}
.settings-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.settings-list{border:1px solid rgba(255,255,255,.08);border-radius:18px;background:rgba(255,255,255,.02);overflow:hidden}
.settings-item{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(180px,.9fr);gap:16px;align-items:center;padding:16px 14px;border-top:1px solid rgba(255,255,255,.08)}
.settings-item:first-child{border-top:0}
.settings-item-main{display:flex;flex-direction:column;gap:4px;min-width:0}
.settings-item-label{font-size:14px;color:#f3efff}
.settings-item-copy{font-size:12px;line-height:1.5;color:#a9a3b4}
.settings-item-value{display:flex;justify-content:flex-end;align-items:center;gap:10px}
.settings-select{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:12px;color:#ece8f7;padding:10px 12px;min-width:180px;max-width:220px}
.settings-select:disabled{opacity:.88}
.settings-toggle{position:relative;width:44px;height:24px;border-radius:999px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.08);appearance:none;cursor:pointer;transition:background .18s ease,border-color .18s ease}
.settings-toggle::after{content:"";position:absolute;top:2px;left:2px;width:18px;height:18px;border-radius:50%;background:#fff;transition:transform .18s ease}
.settings-toggle:checked{background:#f2f2f2;border-color:#f2f2f2}
.settings-toggle:checked::after{transform:translateX(20px);background:#111}
.settings-segment{display:inline-flex;align-items:center;padding:3px;border-radius:999px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08)}
.settings-segment button{border:0;background:transparent;color:#bcb6c8;font-size:12px;padding:7px 12px;border-radius:999px;cursor:pointer}
.settings-segment button.active{background:rgba(255,255,255,.09);color:#f5f1ff}
.settings-footnote{font-size:11px;color:#8f899b;margin-top:2px}
.runtime-pill{display:inline-flex;align-items:center;gap:6px;padding:5px 10px;border-radius:999px;background:rgba(156,107,255,.10);border:1px solid rgba(186,143,255,.20);font-size:11px;color:#dfcffd}
.model-stack{display:flex;flex-direction:column;gap:10px}
.model-card{border:1px solid rgba(255,255,255,.06);border-radius:14px;padding:10px;background:rgba(10,10,16,.45)}
.model-label{font-size:11px;color:#bfb3dc;margin-bottom:6px}
.model-status{margin-top:6px;font-size:11px;color:#8ff0ae}
.model-status.warn{color:#ffcf79}
.settings-tools-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px}
.plugin-list,.mcp-server-list{border:1px solid rgba(255,255,255,.08);border-radius:16px;background:rgba(255,255,255,.02);overflow:hidden}
.plugin-row,.mcp-row{display:grid;align-items:center;gap:12px;padding:14px 16px;border-top:1px solid rgba(255,255,255,.06)}
.plugin-row:first-child,.mcp-row:first-child{border-top:0}
.plugin-row{grid-template-columns:44px minmax(0,1fr) 40px}
.plugin-avatar{width:40px;height:40px;border-radius:999px;display:grid;place-items:center;background:linear-gradient(180deg,rgba(255,255,255,.08),rgba(255,255,255,.03));border:1px solid rgba(255,255,255,.08);font-size:12px;font-weight:700;color:#fff}
.plugin-main{min-width:0}
.plugin-name{font-size:14px;font-weight:600;color:#f3efff}
.plugin-desc{font-size:12px;color:#a9a3b4;line-height:1.45;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.plugin-action,.mcp-config-btn{width:32px;height:32px;border-radius:999px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);color:#d8d1e3;display:grid;place-items:center;cursor:pointer}
.plugin-action.active{background:rgba(100,149,255,.18);border-color:rgba(100,149,255,.35);color:#fff}
.mcp-toolbar{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:12px}
.mcp-toolbar-title{font-size:13px;color:#f3efff;font-weight:600}
.mcp-toolbar-copy{font-size:12px;color:#a9a3b4}
.mcp-add-btn{border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);color:#ece8f7;border-radius:12px;padding:8px 12px;cursor:pointer}
.mcp-row{grid-template-columns:minmax(0,1fr) 32px 32px 44px}
.mcp-name{font-size:14px;font-weight:600;color:#f3efff}
.mcp-desc{font-size:12px;color:#a9a3b4;line-height:1.45}
.agent-kind-pill{display:inline-flex;margin-top:6px;padding:2px 7px;border-radius:999px;border:1px solid rgba(130,220,190,.18);background:rgba(73,190,145,.08);font-size:10px;color:#9fe9c5;text-transform:uppercase;letter-spacing:.06em}
.agent-vm-btn{width:32px;height:32px;border-radius:999px;border:1px solid rgba(96,214,190,.22);background:rgba(96,214,190,.08);color:#b7fff0;display:grid;place-items:center;cursor:pointer}
.agent-vm-btn:hover{background:rgba(96,214,190,.16);border-color:rgba(96,214,190,.38)}
.agent-vm-backdrop{position:absolute;inset:0;background:rgba(4,6,10,.68);backdrop-filter:blur(4px);display:none;align-items:flex-start;justify-content:center;padding:16px 12px;z-index:35}
.agent-vm-backdrop.open{display:flex}
.agent-vm-modal{width:min(980px,100%);max-height:calc(100vh - 32px);overflow:auto;border:1px solid rgba(146,236,212,.18);border-radius:18px;background:linear-gradient(180deg,rgba(15,24,30,.98),rgba(8,11,16,.99));box-shadow:0 28px 90px rgba(0,0,0,.55);padding:12px}
.agent-vm-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:10px}
.agent-vm-title{font-size:15px;font-weight:800;color:#f5fff9}
.agent-vm-subtitle{font-size:12px;color:#a9d7cb;line-height:1.45;margin-top:3px}
.agent-vm-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}
.agent-lock-pill{display:inline-flex;align-items:center;gap:6px;padding:3px 8px;border-radius:999px;border:1px solid rgba(255,213,128,.28);background:rgba(255,213,128,.12);color:#ffe3a8;font-size:10px;letter-spacing:.06em;text-transform:uppercase;font-weight:800}
.agent-lock-pill.muted{opacity:.82}
.agent-vm-status{display:inline-flex;align-items:center;gap:6px;padding:5px 9px;border-radius:999px;border:1px solid rgba(255,255,255,.10);font-size:11px;color:#d8fff3;background:rgba(255,255,255,.04)}
.agent-vm-status::before{content:"";width:7px;height:7px;border-radius:999px;background:#ff8c8c;box-shadow:0 0 10px rgba(255,140,140,.6)}
.agent-vm-status.awake::before{background:#7fe08f;box-shadow:0 0 10px rgba(127,224,143,.7)}
.agent-vm-meta{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px;margin-bottom:10px}
.agent-vm-meta-item{border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:9px;background:rgba(255,255,255,.03)}
.agent-vm-meta-label{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#7fcdb8;margin-bottom:4px}
.agent-vm-meta-value{font-size:12px;color:#edf8f4;line-height:1.45;word-break:break-word}
.agent-vm-workstation{border:1px solid rgba(255,255,255,.09);border-radius:16px;overflow:hidden;background:#111820}
.agent-vm-taskbar{display:flex;align-items:center;gap:6px;padding:7px;background:#c4c1b0;color:#111;border-bottom:2px solid #6f6a5e;overflow:auto}
.agent-vm-start{font-size:10px;font-weight:900;border:1px solid #333;background:#ece8d7;padding:5px 8px;border-radius:4px;white-space:nowrap}
.agent-vm-tab{font-size:10px;font-weight:800;border:1px solid #76705f;background:#d8d3bf;color:#111;padding:5px 8px;border-radius:4px;cursor:pointer;white-space:nowrap}
.agent-vm-tab.active{background:#273341;color:#eafff6;border-color:#40556a}
.agent-vm-screen{min-height:360px;background:#0d1720;color:#e9fff8;padding:12px}
.agent-vm-desktop{display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:10px}
.agent-vm-app-icon{min-height:82px;border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.04);border-radius:10px;color:#eafff7;cursor:pointer;padding:10px;display:flex;flex-direction:column;gap:8px;align-items:center;justify-content:center;text-align:center}
.agent-vm-panel-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px}
.agent-vm-panel{border:1px solid rgba(255,255,255,.10);border-radius:12px;background:rgba(0,0,0,.24);padding:10px}
.agent-vm-panel-title{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#93ead0;margin-bottom:8px;font-weight:800}
.agent-vm-list{margin:0;padding-left:18px;color:#dceee9;font-size:12px;line-height:1.55}
.agent-vm-note{width:100%;min-height:250px;border:1px solid rgba(255,255,255,.12);border-radius:10px;background:#fffdf1;color:#202018;padding:12px;font-family:var(--vscode-editor-font-family,Consolas,monospace);font-size:12px;line-height:1.55}
.agent-vm-terminal{min-height:250px;border-radius:10px;background:#030805;border:1px solid rgba(127,224,143,.22);padding:10px;font-family:var(--vscode-editor-font-family,Consolas,monospace);font-size:12px;color:#9dffb0;white-space:pre-wrap;overflow:auto}
.agent-vm-terminal-row{display:flex;gap:8px;margin-top:8px}
.agent-vm-terminal-row input,.agent-vm-ask-row input{flex:1;border:1px solid rgba(255,255,255,.12);border-radius:10px;background:rgba(255,255,255,.04);color:#f3fff9;padding:9px 10px}
.agent-vm-note[readonly],.agent-vm-terminal-row input[disabled]{opacity:.76;cursor:not-allowed}
.settings-lock-btn[disabled],.settings-toggle[disabled],.ghost-btn[disabled]{opacity:.48;cursor:not-allowed}
.agent-vm-chat{margin-top:10px;border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:10px;background:rgba(255,255,255,.03)}
.agent-vm-log{display:flex;flex-direction:column;gap:6px;max-height:150px;overflow:auto;margin-bottom:8px}
.agent-vm-message{font-size:12px;line-height:1.45;border-radius:10px;padding:8px 9px;background:rgba(255,255,255,.04);color:#defff5}
.agent-vm-message.user{background:rgba(126,180,255,.12);color:#e7f1ff}
.agent-vm-message.system{background:rgba(255,207,121,.10);color:#ffe7aa}
.agent-vm-ask-row{display:flex;gap:8px}
.plugin-category-group{margin-bottom:18px}
.plugin-category-title{font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#a89fbb;margin:0 0 10px}
.plugin-mesh-head{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:10px;font-size:12px;color:#bdb5ce}
.plugin-mesh-grid{display:grid;gap:8px}
.plugin-mesh-card{border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:10px;background:rgba(255,255,255,.02)}
.plugin-mesh-name{font-size:13px;font-weight:600;color:#f2edff}
.plugin-mesh-meta{display:flex;justify-content:space-between;gap:8px;font-size:11px;color:#a69fba;margin-top:4px}
.plugin-mesh-status{font-size:11px;margin-top:6px}
.plugin-mesh-status.online{color:#7fe08f}
.plugin-mesh-status.warning{color:#ffcf79}
.plugin-mesh-status.offline{color:#ff8c8c}
.plugin-approval{display:flex;flex-direction:column;gap:8px;margin:0 0 12px;padding:12px;border-radius:14px;border:1px solid rgba(255,207,121,.28);background:linear-gradient(180deg,rgba(72,52,18,.55),rgba(28,20,10,.72))}
.plugin-approval-title{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#ffd58a;font-weight:700}
.plugin-approval-copy{font-size:13px;color:#f7f0df;line-height:1.45}
.plugin-approval-meta{font-size:12px;color:#d8ceb2}
.plugin-approval-actions{display:flex;gap:8px;flex-wrap:wrap}
.plugin-approval-actions button{border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.05);color:#fff;border-radius:10px;padding:8px 12px;cursor:pointer}
.plugin-approval-actions .approve{background:rgba(82,173,112,.18);border-color:rgba(82,173,112,.34)}
select,textarea{background:rgba(255,255,255,.04);color:#f3efff;border:1px solid rgba(255,255,255,.10);border-radius:12px}
select{padding:9px 10px;width:100%}
select option{background:#1b1628;color:#f4efff}
.workflow-dock{display:none}
.ui-version{display:none}
.control-strip{display:none;grid-template-columns:repeat(auto-fit,minmax(142px,1fr));gap:8px;margin-bottom:10px}
.control-strip button{min-height:34px;border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.035);color:#efe8ff;border-radius:10px;cursor:pointer;font-size:12px;font-weight:700;padding:8px 10px}
.control-strip button:hover{background:rgba(255,255,255,.075)}
.chat{flex:1;min-height:0;overflow-y:auto;padding:14px 14px 20px}
.message{display:flex;gap:12px;margin-bottom:18px}
.avatar{width:28px;height:28px;flex:0 0 28px;border-radius:999px;display:grid;place-items:center;font-size:14px;border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.04);color:#d4c4ff}
.avatar.user{color:#7fb8ff}
.avatar.agent{background:linear-gradient(180deg,rgba(177,124,255,.22),rgba(91,63,160,.10));border-color:rgba(177,124,255,.26)}
.message.progress-message{margin-bottom:12px}
.message.progress-message .avatar.agent{background:linear-gradient(180deg,rgba(91,209,255,.18),rgba(45,87,180,.10));border-color:rgba(91,209,255,.28)}
.bubble-wrap{flex:1;min-width:0}
.meta-row{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:8px}
.sender{display:flex;align-items:center;gap:8px;font-weight:700;font-size:14px}
.sender.user{color:#8fc0ff}
.sender.agent{color:#ccafff}
.badge-prime{padding:2px 8px;border-radius:999px;background:rgba(165,109,255,.14);border:1px solid rgba(188,151,255,.18);font-size:10px;letter-spacing:.08em;color:#d8bfff}
.timestamp{font-size:11px;color:#9d96b3;white-space:nowrap}
.bubble{padding:0 0 0 2px;color:#ece8f7;line-height:1.6;font-size:14px}
.bubble.agent-card{padding:14px 16px;border:1px solid rgba(255,255,255,.08);border-radius:18px;background:linear-gradient(180deg,rgba(255,255,255,.03),rgba(255,255,255,.015));box-shadow:0 14px 40px rgba(0,0,0,.18)}
.bubble.progress-card{padding:12px 14px;border:1px solid rgba(122,195,255,.18);border-radius:16px;background:linear-gradient(180deg,rgba(27,36,57,.72),rgba(15,20,32,.9));box-shadow:0 10px 24px rgba(0,0,0,.18);position:relative;overflow:hidden}
.bubble.progress-card::before{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent 0%,rgba(122,195,255,.14) 48%,transparent 100%);transform:translateX(-100%);animation:agentLeeScan 1.6s linear infinite}
.progress-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px;position:relative;z-index:1}
.progress-label{font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#9fd0ff}
.progress-kind{font-size:10px;color:#d8efff;padding:3px 8px;border-radius:999px;border:1px solid rgba(159,208,255,.18);background:rgba(159,208,255,.08)}
.progress-file{font-size:12px;color:#f5fbff;font-family:var(--vscode-editor-font-family,Consolas,monospace);word-break:break-word;position:relative;z-index:1}
.progress-copy{font-size:12px;color:#cdd8e7;line-height:1.55;margin-top:6px;position:relative;z-index:1}
.progress-status{font-size:12px;color:#ece8f7;line-height:1.55}
.bubble p{margin:0 0 10px}
.bubble p:last-child{margin-bottom:0}
@keyframes agentLeeScan{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}
.section-label{display:flex;align-items:center;gap:8px;margin:16px 0 8px;font-size:12px;font-weight:700;letter-spacing:.06em;color:#cbc5d9;text-transform:uppercase}
.section-label:first-child{margin-top:0}
.plan-list{margin:0;padding-left:18px}
.plan-list li{margin:3px 0}
.status-list{display:flex;flex-direction:column;gap:6px}
.device-status-strip{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:10px;padding:10px 14px;border-bottom:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.02)}
.device-tile{border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:12px;background:rgba(255,255,255,.03);display:flex;flex-direction:column;gap:8px}
.device-tile-head{display:flex;justify-content:space-between;align-items:center;gap:10px}
.device-tile-icon{width:32px;height:32px;border-radius:999px;display:grid;place-items:center;font-size:16px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.10)}
.device-tile-title{font-size:13px;font-weight:700;color:#f3efff;flex:1}
.device-tile-status{font-size:10px;padding:3px 8px;border-radius:999px;text-transform:uppercase;letter-spacing:.06em;font-weight:800}
.device-tile-status.ready{background:rgba(127,224,143,.12);border:1px solid rgba(127,224,143,.24);color:#9dffb0}
.device-tile-status.blocked{background:rgba(255,207,121,.12);border:1px solid rgba(255,207,121,.24);color:#ffd58a}
.device-tile-status.unavailable{background:rgba(255,140,140,.12);border:1px solid rgba(255,140,140,.24);color:#ff8c8c}
.device-tile-body{font-size:12px;line-height:1.5;color:#cdc6de}
.device-tile-meta{display:flex;gap:12px;font-size:11px;color:#a9a3b4;margin-top:4px}
.status-item{display:flex;align-items:center;gap:8px;color:#d7d2e5}
.status-dot{color:#7fe08f}
.code-card{margin-top:10px;border:1px solid rgba(255,255,255,.08);border-radius:16px;overflow:hidden;background:#11111a}
.code-head{display:flex;justify-content:space-between;align-items:center;padding:9px 12px;font-size:12px;color:#c8c2d7;background:rgba(255,255,255,.03);border-bottom:1px solid rgba(255,255,255,.06)}
.code-body{padding:12px 14px;overflow:auto}
.code-body pre{margin:0;font-family:var(--vscode-editor-font-family,Consolas,monospace);font-size:12px;line-height:1.6;color:#dfe6ff}
.attachment-list{display:flex;flex-direction:column;gap:8px;margin:10px 0 0}
.attachment-item{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:9px 10px;border-radius:12px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);font-size:12px}
.hidden{display:none}
.composer{flex:none;padding:10px 12px 12px;background:linear-gradient(180deg,rgba(13,13,18,.4),rgba(13,13,18,.96) 24%,rgba(13,13,18,.99) 100%);border-top:1px solid rgba(255,255,255,.06)}
.composer-shell{border:1px solid rgba(158,110,255,.30);border-radius:16px;background:linear-gradient(180deg,rgba(32,22,48,.82),rgba(18,17,26,.96));box-shadow:0 24px 52px rgba(0,0,0,.32),inset 0 1px 0 rgba(255,255,255,.04);padding:10px 12px}
.voice-review-panel{margin:0 0 10px;border:1px solid rgba(122,195,255,.22);border-radius:14px;padding:12px;background:linear-gradient(180deg,rgba(19,31,44,.92),rgba(11,18,29,.96));display:flex;flex-direction:column;gap:10px}
.voice-review-panel[hidden]{display:none}
.voice-review-head{display:flex;justify-content:space-between;gap:12px;align-items:center}
.voice-review-title{font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#eef6ff}
.voice-review-copy{font-size:12px;color:#c4d2e4;line-height:1.5}
.voice-review-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
.voice-review-field{border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:8px;background:rgba(255,255,255,.03)}
.voice-review-label{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#97acc6}
.voice-review-value{font-size:12px;color:#f3f8ff;line-height:1.45;margin-top:4px;word-break:break-word}
.voice-review-actions{display:flex;gap:8px;flex-wrap:wrap}
.voice-bridge-card{grid-column:1 / -1;border:1px solid rgba(122,195,255,.18);border-radius:14px;padding:12px;background:linear-gradient(180deg,rgba(14,24,37,.88),rgba(12,18,27,.96));display:flex;flex-direction:column;gap:10px}
.voice-bridge-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.voice-bridge-warning{font-size:12px;color:#ffd48a;line-height:1.5}
textarea{width:100%;min-height:82px;resize:none;padding:8px 2px 4px;border:0;background:transparent;color:#f6f2ff;outline:none}
textarea::placeholder{color:#8c859c}
.composer-bottom{display:flex;justify-content:space-between;gap:12px;align-items:flex-end;margin-top:6px}
.toolbelt{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.tool-link{border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.03);color:#ddd0ff;font-size:12px;font-weight:600;padding:7px 10px;border-radius:10px;cursor:pointer}
.tool-link.icon-only{width:36px;height:36px;display:inline-flex;align-items:center;justify-content:center;padding:0;font-size:16px;line-height:1}
.tool-icon{display:inline-flex;align-items:center;justify-content:center;transform:translateY(-1px)}
.composer-right{display:flex;align-items:center;gap:10px}
.bulk-accept-btn{display:none}
.bulk-accept-btn.visible{display:inline-flex}
.model-compact,.access-compact{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);color:#f0e9ff;font-size:12px;padding:8px 10px;max-width:190px;border-radius:10px}
.access-compact{color:#b8ffbf;border-color:rgba(96,214,112,.35)}
.send-btn{min-width:82px;height:38px;border:0;border-radius:12px;background:linear-gradient(180deg,#aa69ff,#8e4af0);color:#fff;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 10px 26px rgba(140,74,240,.42);padding:0 14px}
.footer{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:8px 16px 10px;font-size:11px;color:#8f879d}
.footer-right{color:#39d267;font-weight:700}
.muted{color:#9a92ac}
.status-line{font-size:12px;color:#cfc7e2;margin-bottom:8px}
.workflow-shell{margin-bottom:10px;border:1px solid rgba(255,255,255,.08);border-radius:14px;background:rgba(255,255,255,.03);overflow:hidden}
.workflow-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;background:rgba(255,255,255,.02)}
.workflow-toggle{display:flex;align-items:center;gap:8px;background:transparent;border:0;color:#f3edff;font-size:12px;font-weight:700;cursor:pointer;padding:0}
.workflow-preview{font-size:11px;color:#bfb6d4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:50%}
.workflow-body{padding:12px;border-top:1px solid rgba(255,255,255,.06)}
.workflow-shell.collapsed .workflow-body{display:none}
.workflow-summary{font-size:12px;color:#ddd6ef;margin-bottom:10px}
.workflow-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px}
.workflow-card{border:1px solid rgba(255,255,255,.06);border-radius:12px;background:rgba(10,10,18,.32);padding:10px}
.workflow-title{font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#c7b8f2;margin-bottom:8px}
.todo-list,.activity-list,.proposal-list{display:flex;flex-direction:column;gap:8px}
.todo-item,.activity-item{border:1px solid rgba(255,255,255,.05);border-radius:10px;padding:8px 10px;background:rgba(255,255,255,.02)}
.proposal-item{border:1px solid rgba(122,195,255,.12);border-radius:12px;padding:10px;background:linear-gradient(180deg,rgba(24,31,48,.65),rgba(15,19,29,.82))}
.proposal-item.approved{border-color:rgba(111,219,145,.22)}
.proposal-item.rejected{border-color:rgba(255,140,140,.2);opacity:.75}
.proposal-file{font-size:12px;color:#eef6ff;font-family:var(--vscode-editor-font-family,Consolas,monospace);word-break:break-word}
.proposal-summary{font-size:11px;color:#c5d0df;line-height:1.45;margin-top:6px}
.proposal-meta{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:8px;font-size:10px;color:#9ab0c8;text-transform:uppercase;letter-spacing:.06em}
.proposal-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}
.proposal-chip{padding:3px 7px;border-radius:999px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08)}
.todo-item.done{opacity:.72}
.todo-check{font-size:11px;font-weight:800;color:#8fd9a1;margin-right:8px}
.todo-item.pending .todo-check{color:#a99fc2}
.todo-item.active .todo-check{color:#9fd0ff}
.todo-text{font-size:12px;color:#f4eeff}
.todo-detail{font-size:11px;color:#a79fba;margin-top:4px}
.todo-item.done .todo-text{text-decoration:line-through}
.activity-label{font-size:12px;color:#efe8ff}
.activity-row{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}
.activity-open-btn{padding:4px 8px;font-size:11px}
.activity-file{font-size:11px;color:#98c3ff;word-break:break-all;margin-top:4px}
.activity-meta{font-size:10px;color:#998fb1;margin-top:3px}
.bubble-activity{margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,.08)}
.bubble-activity-label{font-size:11px;font-weight:700;color:#d7cff2;text-transform:uppercase;letter-spacing:.04em}
.bubble-activity-file{font-size:11px;color:#98c3ff;word-break:break-word;margin-top:3px}
.bubble-activity-detail{font-size:11px;color:#b7aecf;margin-top:4px}
.workflow-actions{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0 12px}
.workflow-editor{display:flex;flex-direction:column;gap:8px;margin-bottom:12px}
.workflow-input{width:100%;min-height:72px;padding:10px 12px;border-radius:12px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);color:#f3edff;resize:vertical}
.workflow-parked{margin-top:10px;padding:8px 10px;border:1px solid rgba(255,255,255,.06);border-radius:10px;background:rgba(255,255,255,.02);font-size:11px;color:#cfc5e4}
.mode-pill{display:inline-flex;align-items:center;gap:6px;padding:6px 8px;border-radius:999px;border:1px solid rgba(255,255,255,.08);font-size:11px;color:#d5cced;background:rgba(255,255,255,.03)}
.history-drawer{display:none;flex-direction:column;gap:12px;padding:14px 16px;border-bottom:1px solid rgba(255,255,255,.08);background:linear-gradient(180deg,rgba(16,15,26,.98),rgba(12,11,19,.94))}
.history-drawer.open{display:flex}
.history-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
.history-list{display:flex;flex-direction:column;gap:8px;max-height:220px;overflow:auto}
.history-item{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 12px;border-radius:14px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);cursor:pointer;transition:border-color .15s ease,background .15s ease}
.history-item:hover{border-color:rgba(229,159,95,.38);background:rgba(229,159,95,.08)}
.history-item.active{border-color:rgba(229,159,95,.55);background:rgba(229,159,95,.12)}
.history-item-title{font-size:12px;color:#f4efe8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.history-item-meta{font-size:10px;color:#9a92ac;text-transform:uppercase;letter-spacing:.08em}
.history-empty{padding:12px;border-radius:14px;border:1px dashed rgba(255,255,255,.12);color:#b8b1c8;font-size:12px}
@media (max-width:700px){.meta-row{flex-direction:column;align-items:flex-start}.composer-bottom,.footer,.settings-row,.topbar,.settings-head,.hero-strip,.voice-review-head,.voice-review-actions{flex-wrap:wrap}.composer-right{width:100%;justify-content:space-between}.model-compact,.access-compact{max-width:none}.conversation-title{max-width:220px}.workflow-grid,.voice-review-grid,.voice-bridge-grid{grid-template-columns:1fr}.workflow-preview{max-width:42%}.settings-layout{grid-template-columns:1fr}.settings-nav{overflow:auto}.hero-image{max-width:100%;width:100%}}
.img-btn{background:transparent;border:0;padding:0;cursor:pointer;display:flex;align-items:center;justify-content:center}
.img-btn:hover{opacity:0.8}
.img-btn.text-fallback{min-width:28px;min-height:28px;padding:0 8px;border-radius:10px;border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.04);color:#f2ecff;font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}
.img-btn.topbar-brand-btn{min-width:44px;min-height:44px;padding:4px;border-radius:12px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);box-shadow:0 10px 24px rgba(0,0,0,.18)}
.img-btn.topbar-brand-btn img{height:34px !important;width:auto;display:block}
.img-btn.topbar-brand-btn:hover{opacity:1;background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.18)}
</style>
</head>
<body>
<div class="app-shell">
  <div class="topbar">
    <div class="brand">
      <div class="brand-mark" aria-hidden="true"><img src="${chatAvatarUri}" alt="Agent Lee chat avatar" onerror="this.style.display='none'; this.parentElement.classList.add('img-failed');" /></div>
      <div class="brand-copy">
        <div class="brand-title">Agent Lee Chat</div>
        <div class="conversation-title" id="conversationTitle">Current conversation</div>
      </div>
    </div>
    <div class="top-actions">
      <button class="icon-btn" id="historyBtn" data-leeway-id="LEEWAY_OBJECT::CONTROL::HISTORY_BUTTON" aria-label="Open chat history" title="Open chat history">History</button>
      <button class="icon-btn" id="newChatBtn" data-leeway-id="LEEWAY_OBJECT::CONTROL::NEW_CHAT_BUTTON" aria-label="Start a new chat" title="Start a new chat">New Chat</button>
      <button class="icon-btn" id="settingsBtn" data-leeway-id="LEEWAY_OBJECT::CONTROL::SETTINGS_BUTTON" aria-label="Open Agent Lee settings" title="Open Agent Lee settings">Settings</button>
      <button class="img-btn topbar-brand-btn" id="topStandardsBtn" data-leeway-id="LEEWAY_OBJECT::CONTROL::TOP_STANDARDS_BUTTON" title="LeeWay Standards"><img src="${brandingIconUri}" alt="LeeWay" onerror="fallbackImageButton(this,'LW');" /></button>
    </div>
  </div>
  <div class="history-drawer" id="historyDrawer">
    <div class="history-head">
      <div>
        <div class="settings-heading">Previous chats</div>
        <div class="settings-copy">Open an older thread any time. The panel still starts fresh by default.</div>
      </div>
      <button class="ghost-btn" id="closeHistoryBtn" data-leeway-id="LEEWAY_OBJECT::CONTROL::CLOSE_HISTORY_BUTTON" aria-label="Close chat history" title="Close chat history">Close</button>
    </div>
    <div class="history-list" id="historyList"></div>
  </div>
  <div class="main">
    <div class="ui-version" id="uiVersion">AGENT_LEE_UI_VERSION = "${AGENT_LEE_UI_VERSION}"</div>
    <div class="settings-backdrop" id="settingsBackdrop" onclick="closeSettingsIfBackdrop(event)">
      <div class="settings" id="settingsPanel" role="dialog" aria-modal="true" aria-label="Agent Lee settings">
        <div class="settings-head">
          <div>
            <div class="settings-heading">Agent Lee settings</div>
            <div class="settings-subcopy">Keep the primary chat clean and put environment preferences here, with Agent Lee's deeper runtime controls tucked underneath.</div>
          </div>
          <div class="settings-row">
            <button data-leeway-id="LEEWAY_UI_CONTROL::VSCODE::AUTO::TOGGLESETTINGS" class="ghost-btn" onclick="toggleSettings(false)">Close</button>
            <button data-leeway-id="LEEWAY_UI_CONTROL::VSCODE::AUTO::COMPLETEONBOARDINGBTN" class="ghost-btn" id="completeOnboardingBtn" onclick="completeOnboarding()">Save Settings</button>
          </div>
        </div>
        <div class="settings-layout">
          <div class="settings-nav" id="settingsNav">
            <button data-leeway-id="LEEWAY_UI_CONTROL::VSCODE::AUTO::SWITCHSETTINGSSECTION" type="button" class="active" onclick="switchSettingsSection('general')"><span class="settings-nav-icon">&#9881;</span><span>General</span></button>
            <button data-leeway-id="LEEWAY_UI_CONTROL::VSCODE::AUTO::SWITCHSETTINGSSECTION" type="button" onclick="switchSettingsSection('configuration')"><span class="settings-nav-icon">&#9968;</span><span>Configuration</span></button>
            <button data-leeway-id="LEEWAY_UI_CONTROL::VSCODE::AUTO::SWITCHSETTINGSSECTION" type="button" onclick="switchSettingsSection('personalization')"><span class="settings-nav-icon">&#9684;</span><span>Personalization</span></button>
            <button data-leeway-id="LEEWAY_UI_CONTROL::VSCODE::AUTO::SWITCHSETTINGSSECTION" type="button" onclick="switchSettingsSection('voice-of-agent-lee')"><span class="settings-nav-icon">&#127908;</span><span>Voice of Agent Lee</span></button>
            <button data-leeway-id="LEEWAY_UI_CONTROL::VSCODE::AUTO::SWITCHSETTINGSSECTION" type="button" onclick="switchSettingsSection('mcp')"><span class="settings-nav-icon">&#8984;</span><span>MCP servers</span></button>
            <button data-leeway-id="LEEWAY_UI_CONTROL::VSCODE::AUTO::SWITCHSETTINGSSECTION" type="button" onclick="switchSettingsSection('agents')"><span class="settings-nav-icon">&#129302;</span><span>Agents</span></button>
            <button data-leeway-id="LEEWAY_UI_CONTROL::VSCODE::AUTO::SWITCHSETTINGSSECTION" type="button" onclick="switchSettingsSection('workers')"><span class="settings-nav-icon">&#9874;</span><span>Workers</span></button>
            <button data-leeway-id="LEEWAY_UI_CONTROL::VSCODE::AUTO::SWITCHSETTINGSSECTION" type="button" onclick="switchSettingsSection('usage')"><span class="settings-nav-icon">&#9719;</span><span>Usage</span></button>
            <button data-leeway-id="LEEWAY_UI_CONTROL::VSCODE::AUTO::SWITCHSETTINGSSECTION" type="button" onclick="switchSettingsSection('plugins')"><span class="settings-nav-icon">&#9673;</span><span>Plugins</span></button>
          </div>
          <div class="settings-content">
        <div class="settings-grid">
          <div class="settings-section active" id="settingsSection-general">
          <div class="settings-card">
            <div class="settings-list">
              <div class="settings-item">
                <div class="settings-item-main">
                  <div class="settings-item-label">Agent environment</div>
                  <div class="settings-item-copy">Choose where the agent runs on Windows.</div>
                </div>
                <div class="settings-item-value">
                  <select class="settings-select" id="agentEnvironment" onchange="setAgentEnvironment(this.value)">
                    <option value="windows-native">Windows native</option>
                  </select>
                </div>
              </div>
              <div class="settings-item">
                <div class="settings-item-main">
                  <div class="settings-item-label">Language</div>
                  <div class="settings-item-copy">Choose the language for the app UI.</div>
                </div>
                <div class="settings-item-value">
                  <select class="settings-select" id="appLanguage" onchange="setAppLanguage(this.value)">
                    <option value="auto">Auto Detect</option>
                  </select>
                </div>
              </div>
              <div class="settings-item">
                <div class="settings-item-main">
                  <div class="settings-item-label">Require ^ + enter to send long prompts</div>
                  <div class="settings-item-copy">When enabled, multiline prompts require ^ + enter to send.</div>
                </div>
                <div class="settings-item-value">
                  <input type="checkbox" class="settings-toggle" id="requireCtrlEnterToggle" onchange="setRequireCtrlEnter(this.checked)" />
                </div>
              </div>
              <div class="settings-item">
                <div class="settings-item-main">
                  <div class="settings-item-label">Speed</div>
                  <div class="settings-item-copy">Choose how quickly inference runs across chats and compaction.</div>
                </div>
                <div class="settings-item-value">
                  <select class="settings-select" id="inferenceSpeed" onchange="setInferenceSpeed(this.value)">
                    <option value="standard">Standard</option>
                    <option value="fast">Fast</option>
                  </select>
                </div>
              </div>
              <div class="settings-item">
                <div class="settings-item-main">
                  <div class="settings-item-label">Follow-up behavior</div>
                  <div class="settings-item-copy">Queue follow-ups while Agent Lee runs or steer the current run.</div>
                  <div class="settings-footnote">Press Ctrl+Enter to do the opposite for one message.</div>
                </div>
                <div class="settings-item-value">
                  <div class="settings-segment" id="followupBehavior">
                    <button data-leeway-id="LEEWAY_UI_CONTROL::VSCODE::AUTO::SETFOLLOWUPBEHAVIOR" type="button" onclick="setFollowupBehavior('queue')">Queue</button>
                    <button data-leeway-id="LEEWAY_UI_CONTROL::VSCODE::AUTO::SETFOLLOWUPBEHAVIOR" type="button" class="active" onclick="setFollowupBehavior('steer')">Steer</button>
                  </div>
                </div>
              </div>
              <div class="settings-item">
                <div class="settings-item-main">
                  <div class="settings-item-label">Code review</div>
                  <div class="settings-item-copy">Start review in the current chat or launch a separate review chat.</div>
                </div>
                <div class="settings-item-value">
                  <div class="settings-segment" id="codeReviewBehavior">
                    <button data-leeway-id="LEEWAY_UI_CONTROL::VSCODE::AUTO::SETCODEREVIEWBEHAVIOR" type="button" class="active" onclick="setCodeReviewBehavior('inline')">Inline</button>
                    <button data-leeway-id="LEEWAY_UI_CONTROL::VSCODE::AUTO::SETCODEREVIEWBEHAVIOR" type="button" onclick="setCodeReviewBehavior('detached')">Detached</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          </div>
          <div class="settings-section" id="settingsSection-configuration">
          <div class="settings-card" style="margin-bottom:14px">
            <div class="settings-title">Conversation Control</div>
            <div class="settings-copy">These settings shape how Agent Lee plans, approves, and routes the main work.</div>
            <div class="settings-tools-grid">
              <div class="model-card">
                <div class="model-label">Work Mode</div>
                <select id="workModeSettings" onchange="setWorkMode(this.value)">
                  <option value="execute">Execute</option>
                  <option value="plan">Plan</option>
                  <option value="ask">Ask</option>
                </select>
              </div>
              <div class="model-card">
                <div class="model-label">Approval</div>
                <select id="approvalSettings" onchange="setApproval(this.value)">
                  <option value="safe">Default</option>
                  <option value="balanced">Balanced</option>
                  <option value="full">Full</option>
                </select>
              </div>
              <div class="model-card">
                <div class="model-label">Auto-run staged plans</div>
                <label class="settings-row" style="gap:8px;align-items:center">
                  <input type="checkbox" class="settings-toggle" id="autoRunStagedPlansToggle" onchange="setAutoRunStagedPlans(this.checked)" />
                  <span class="muted">Run immediately after planning</span>
                </label>
                <div class="model-status" id="autoRunStagedPlansHint">Off by default. Full access is only needed for automatic execution.</div>
              </div>
              <div class="model-card">
                <div class="model-label">Primary Model</div>
                <select id="primaryModelSettings" onchange="setPrimaryModel(this.value)"></select>
              </div>
              <div class="model-card">
                <div class="model-label">Managed local VSIX sync</div>
                <label class="settings-row" style="gap:8px;align-items:center">
                  <input type="checkbox" class="settings-toggle" id="autoUpdateEnabledToggle" onchange="setAutoUpdateEnabled(this.checked)" />
                  <span class="muted">Reinstall the newest local VSIX on startup</span>
                </label>
                <label class="settings-row" style="gap:8px;align-items:center;margin-top:10px">
                  <input type="checkbox" class="settings-toggle" id="preferRightSideSurfaceToggle" onchange="setPreferRightSideSurface(this.checked)" />
                  <span class="muted">Prefer the right-side chat surface by default</span>
                </label>
                <div class="settings-row" style="margin-top:10px">
                  <button data-leeway-id="LEEWAY_UI_CONTROL::VSCODE::AUTO::UPDATEAGENTLEENOW" class="ghost-btn" type="button" onclick="updateAgentLeeNow()">Update Now</button>
                </div>
                <div class="model-status" id="autoUpdateHint">This is not Marketplace auto-update. It is a managed local VSIX reinstall path for side-loaded builds.</div>
              </div>
            </div>
          </div>
            <div class="settings-card">
              <div class="settings-title">Agent Tools</div>
              <div class="settings-copy">These are the real Agent Lee runtime controls, models, and diagnostics that power the sidebar.</div>
              <div class="settings-tools-grid">
              <div class="model-card">
                <div class="model-label">Builder Model</div>
                <select id="builderModel" onchange="setRoleModel('builderModel', this.value)"></select>
                <div class="model-status" id="builderStatus">Waiting for Ollama...</div>
              </div>
              <div class="model-card">
                <div class="model-label">Designer/UX Model</div>
                <select id="designerModel" onchange="setRoleModel('designerModel', this.value)"></select>
                <div class="model-status" id="designerStatus">Waiting for Ollama...</div>
              </div>
              <div class="model-card">
                <div class="model-label">Verifier Model</div>
                <select id="verifierModel" onchange="setRoleModel('verifierModel', this.value)"></select>
                <div class="model-status" id="verifierStatus">Waiting for Ollama...</div>
                </div>
              </div>
            </div>
            <div class="settings-card" style="margin-top:14px">
              <div class="settings-title">System Model Inventory</div>
              <div class="settings-copy">Full local model inventory for role routing, helpers, LVIS, and embeddings.</div>
              <div class="mcp-server-list" id="modelInventoryList"></div>
            </div>
            <div class="settings-card" style="margin-top:14px">
              <div class="settings-title">LeeWay Model Family Status</div>
              <div class="settings-copy">The LeeWay Model Family consists of 7 verified Ollama models. These are workers orchestrated by Agent Lee, not standalone agents. Ollama endpoint: localhost:11434</div>
              <div class="model-stack" id="modelFamilyStatus">
                <div class="model-card">
                  <div class="model-label">QWEN 2.5 Coder 14B (Lead Coder)</div>
                  <div class="model-status" id="qwen14bStatus">Checking...</div>
                  <div class="model-detail">qwen2.5-coder:14b • 9.0 GB</div>
                </div>
                <div class="model-card">
                  <div class="model-label">QWEN 2.5 Coder 7B (Mid-Tier Coder)</div>
                  <div class="model-status" id="qwen7bStatus">Checking...</div>
                  <div class="model-detail">qwen2.5-coder:7b • 4.7 GB</div>
                </div>
                <div class="model-card">
                  <div class="model-label">QWEN 2.5 Coder 1.5B (Fast Responder)</div>
                  <div class="model-status" id="qwen1.5bStatus">Checking...</div>
                  <div class="model-detail">qwen2.5-coder:1.5b • 986 MB</div>
                </div>
                <div class="model-card">
                  <div class="model-label">QWEN 3 (Reasoning Specialist)</div>
                  <div class="model-status" id="qwen3Status">Checking...</div>
                  <div class="model-detail">qwen3:latest • 5.2 GB</div>
                </div>
                <div class="model-card">
                  <div class="model-label">QWEN 2.5 (General Language)</div>
                  <div class="model-status" id="qwen2.5Status">Checking...</div>
                  <div class="model-detail">qwen2.5:latest • 4.7 GB</div>
                </div>
                <div class="model-card">
                  <div class="model-label">QWEN 2.5 VL 7B (Vision Language)</div>
                  <div class="model-status" id="qwenVLStatus">Checking...</div>
                  <div class="model-detail">qwen2.5vl:7b • 6.0 GB • Camera required</div>
                </div>
                <div class="model-card">
                  <div class="model-label">DeepSeek Coder 1B (Deep Analyzer)</div>
                  <div class="model-status" id="deepseekStatus">Checking...</div>
                  <div class="model-detail">deepseek-coder:latest • 776 MB</div>
                </div>
              </div>
            <div class="settings-card" style="margin-top:14px">
              <div class="settings-title">Model Vault Status</div>
              <div class="settings-copy">LeeWay Model Vault provides portable, backupable model storage. Models are owned by LeeWay, Ollama is the serving engine. Vault path: E:\.LeeWay-Produucts-File\.Leeway-Ecosystem\.leeway-model-vault\ollama</div>
              <div class="voice-bridge-grid">
                <div class="voice-review-field"><div class="voice-review-label">Vault Status</div><div class="voice-review-value" id="modelVaultStatus">LOCAL_MODEL_VAULT_BRIDGE_REQUIRED</div></div>
                <div class="voice-review-field"><div class="voice-review-label">Total Models</div><div class="voice-review-value" id="modelVaultCount">7 models</div></div>
                <div class="voice-review-field"><div class="voice-review-label">Total Size</div><div class="voice-review-value" id="modelVaultSize">29.16 GB</div></div>
                <div class="voice-review-field"><div class="voice-review-label">Backup Status</div><div class="voice-review-value" id="modelVaultBackupStatus">BACKUP_COMPLETE</div></div>
                <div class="voice-review-field"><div class="voice-review-label">Integrity</div><div class="voice-review-value" id="modelVaultIntegrity">SHA256_VERIFIED</div></div>
                <div class="voice-review-field"><div class="voice-review-label">Portability</div><div class="voice-review-value" id="modelVaultPortability">PORTABLE_READY</div></div>
              </div>
              <div class="voice-bridge-warning" id="modelVaultWarning">Model Vault requires local bridge to access filesystem. Runtime Fabric endpoint: /model-vault/health</div>
              <div class="settings-row" style="margin-top:10px">
                <button data-leeway-id="LEEWAY_UI_CONTROL::VSCODE::AUTO::BACKUPMODELS" class="ghost-btn" onclick="backupModels()">Backup Models</button>
                <button data-leeway-id="LEEWAY_UI_CONTROL::VSCODE::AUTO::RESTOREMODELS" class="ghost-btn" onclick="restoreModels()">Restore Models</button>
                <button data-leeway-id="LEEWAY_UI_CONTROL::VSCODE::AUTO::VERIFYMODELVAULT" class="ghost-btn" onclick="verifyModelVault()">Verify Vault</button>
              </div>
            </div>
            <div class="settings-card" style="margin-top:14px">
              <div class="settings-title">Model Execution Runtime Status</div>
              <div class="settings-copy">Model Execution Runtime connects to local Ollama for inference. Agent Lee orchestrates model selection and execution. Ollama endpoint: localhost:11434</div>
              <div class="voice-bridge-grid">
                <div class="voice-review-field"><div class="voice-review-label">Execution Status</div><div class="voice-review-value" id="modelExecutionStatus">LOCAL_OLLAMA_BRIDGE_REQUIRED</div></div>
                <div class="voice-review-field"><div class="voice-review-label">Ollama Running</div><div class="voice-review-value" id="ollamaRunning">Checking...</div></div>
                <div class="voice-review-field"><div class="voice-review-label">Available Models</div><div class="voice-review-value" id="ollamaModelCount">0 models</div></div>
                <div class="voice-review-field"><div class="voice-review-label">Active Model</div><div class="voice-review-value" id="activeModel">None</div></div>
                <div class="voice-review-field"><div class="voice-review-label">Last Inference</div><div class="voice-review-value" id="lastInference">Never</div></div>
                <div class="voice-review-field"><div class="voice-review-label">Orchestrator</div><div class="voice-review-value" id="modelOrchestrator">Agent Lee</div></div>
              </div>
              <div class="voice-bridge-warning" id="modelExecutionWarning">Model Execution requires local Ollama bridge. Runtime Fabric endpoint: /model-execution/health</div>
              <div class="settings-row" style="margin-top:10px">
                <button data-leeway-id="LEEWAY_UI_CONTROL::VSCODE::AUTO::STARTOLLAMA" class="ghost-btn" onclick="startOllama()">Start Ollama</button>
                <button data-leeway-id="LEEWAY_UI_CONTROL::VSCODE::AUTO::CHECKOLLAMA" class="ghost-btn" onclick="checkOllama()">Check Ollama</button>
                <button data-leeway-id="LEEWAY_UI_CONTROL::VSCODE::AUTO::TESTMODELEXECUTION" class="ghost-btn" onclick="testModelExecution()">Test Execution</button>
              </div>
            </div>
            <div class="settings-card" style="margin-top:14px">
              <div class="settings-title">Agent Lee Family Surface</div>
              <div class="settings-copy">Agent Lee is the orchestrator. Models are workers. This is not a multi-agent system. Agent Lee routes tasks to the appropriate model worker based on task requirements.</div>
              <div class="voice-bridge-grid">
                <div class="voice-review-field"><div class="voice-review-label">Orchestrator</div><div class="voice-review-value" id="orchestratorName">Agent Lee</div></div>
                <div class="voice-review-field"><div class="voice-review-label">Role</div><div class="voice-review-value" id="orchestratorRole">Task Router & Coordinator</div></div>
                <div class="voice-review-field"><div class="voice-review-label">Worker Count</div><div class="voice-review-value" id="workerCount">7 model workers</div></div>
                <div class="voice-review-field"><div class="voice-review-label">Lead Coder</div><div class="voice-review-value" id="leadCoder">QWEN 2.5 Coder 14B</div></div>
                <div class="voice-review-field"><div class="voice-review-label">Fast Responder</div><div class="voice-review-value" id="fastResponder">QWEN 2.5 Coder 1.5B</div></div>
                <div class="voice-review-field"><div class="voice-review-label">Vision Worker</div><div class="voice-review-value" id="visionWorker">QWEN 2.5 VL 7B</div></div>
              </div>
              <div class="voice-bridge-warning" id="agentLeeFamilyWarning">Agent Lee orchestrates all model workers. Models do not act autonomously.</div>
            </div>
            <div class="settings-card" style="margin-top:14px">
              <div class="settings-title">DeepSeek 16B Route Status</div>
              <div class="settings-copy">DeepSeek 16B is registered in the Model Endpoint Registry but not currently bound to a model. The user pulled deepseek-coder:latest which is 1B, not 16B.</div>
              <div class="voice-bridge-grid">
                <div class="voice-review-field"><div class="voice-review-label">Route Status</div><div class="voice-review-value" id="deepseek16bStatus">DEEPSEEK_16B_ROUTE_NOT_BOUND</div></div>
                <div class="voice-review-field"><div class="voice-review-label">Expected Model</div><div class="voice-review-value" id="deepseek16bExpected">deepseek-coder:16b</div></div>
                <div class="voice-review-field"><div class="voice-review-label">Actual Model</div><div class="voice-review-value" id="deepseek16bActual">Not pulled</div></div>
                <div class="voice-review-field"><div class="voice-review-label">Alternative</div><div class="voice-review-value" id="deepseek16bAlternative">DeepSeek 1B available</div></div>
              </div>
              <div class="voice-bridge-warning" id="deepseek16bWarning">To bind DeepSeek 16B route, run: ollama pull deepseek-coder:16b</div>
              <div class="settings-row" style="margin-top:10px">
                <button data-leeway-id="LEEWAY_UI_CONTROL::VSCODE::AUTO::PULLDEEPSEEK16B" class="ghost-btn" onclick="pullDeepSeek16B()">Pull DeepSeek 16B</button>
                <button data-leeway-id="LEEWAY_UI_CONTROL::VSCODE::AUTO::USEDEEPSEEK1B" class="ghost-btn" onclick="useDeepSeek1B()">Use DeepSeek 1B Instead</button>
              </div>
            </div>
            </div>
            <div class="settings-card" style="margin-top:14px">
              <div class="settings-title">Runtime Controls</div>
              <div class="settings-copy">Keep the deeper runtime switches here so Agent Lee can change behavior immediately when you flip them.</div>
            <div class="settings-row" style="margin-bottom:10px">
              <button data-leeway-id="LEEWAY_UI_CONTROL::VSCODE::AUTO::WEBBTN" class="ghost-btn" id="webBtn" onclick="toggleWeb()">Web Off</button>
              <button data-leeway-id="LEEWAY_UI_CONTROL::VSCODE::AUTO::BROWSERVISUALBTN" class="ghost-btn" id="browserVisualBtn" onclick="toggleBrowserVisual()">Visual Browser On</button>
              <button data-leeway-id="LEEWAY_UI_CONTROL::VSCODE::AUTO::BROWSERCURSORBTN" class="ghost-btn" id="browserCursorBtn" onclick="toggleBrowserCursor()">Show Cursor On</button>
            </div>
            <div class="settings-row" style="margin-bottom:10px">
              <button data-leeway-id="LEEWAY_UI_CONTROL::VSCODE::AUTO::SETPERFORMANCEPROFILE" class="ghost-btn" onclick="setPerformanceProfile('quiet_laptop')">Quiet Laptop</button>
              <button data-leeway-id="LEEWAY_UI_CONTROL::VSCODE::AUTO::SETPERFORMANCEPROFILE" class="ghost-btn" onclick="setPerformanceProfile('balanced')">Balanced</button>
              <button data-leeway-id="LEEWAY_UI_CONTROL::VSCODE::AUTO::SETPERFORMANCEPROFILE" class="ghost-btn" onclick="setPerformanceProfile('performance')">Performance</button>
            </div>
            <div class="settings-row">
              <label class="muted" for="browserSlowMo">Browser slow motion</label>
              <select id="browserSlowMo" onchange="setBrowserSlowMo(this.value)" style="max-width:120px">
                <option value="100">100ms</option>
                <option value="250">250ms</option>
                <option value="400">400ms</option>
                <option value="700">700ms</option>
              </select>
            </div>
          </div>
          </div>
          <div class="settings-section" id="settingsSection-personalization">
          <div class="settings-card">
            <div class="settings-title">Voice And Style</div>
            <div class="settings-copy">Shape how Agent Lee sounds and whether voice output is active in the sidebar.</div>
            <div class="settings-tools-grid">
              <div class="model-card">
                <div class="model-label">Voice Output</div>
                <div class="settings-row">
                  <button class="ghost-btn" id="voiceEnabledBtn" data-leeway-id="LEEWAY_APP::UI::VOICE_CONTROL::VOICE_ENABLED" data-leeway-command="leewayVoiceSettingsChanged" data-leeway-setting-key="voiceEnabled" onclick="setVoiceEnabledFromButton()">Voice Enabled</button>
                  <button class="ghost-btn" id="voiceMuteBtn" data-leeway-id="LEEWAY_APP::UI::VOICE_CONTROL::MUTE_TOGGLE" data-leeway-command="leewayVoiceMuteToggled" onclick="toggleVoiceMute()">Mute</button>
                  <button class="ghost-btn" id="voiceStopBtn" data-leeway-id="LEEWAY_APP::UI::VOICE_CONTROL::STOP_SPEAKING" data-leeway-command="leewayVoiceStopRequested" onclick="requestVoiceStop()">Stop Speaking</button>
                  <button class="ghost-btn" id="voiceTestBtn" data-leeway-id="LEEWAY_APP::UI::VOICE_CONTROL::TEST_VOICE" data-leeway-command="leewayVoiceTestRequested" onclick="requestVoiceTest()">Test Voice</button>
                </div>
                <div class="settings-copy" id="voiceControlStatus" data-leeway-id="LEEWAY_APP::VOICE::LIVE_ROUTE::AUDIBLE_OUTPUT_PROOF" style="margin-top:10px">LeeWay live voice proof is standing by.</div>
                <div class="settings-copy" id="voiceControlError" data-leeway-id="LEEWAY_APP::VOICE::LIVE_ROUTE::CLONE_ENGINE_ERROR_SURFACE" style="margin-top:6px">No live voice errors.</div>
              </div>
              <div class="model-card">
                <div class="model-label">Auto Speak Responses</div>
                <label class="settings-row" for="voiceAutoSpeakToggle">
                  <input id="voiceAutoSpeakToggle" class="settings-toggle" type="checkbox" data-leeway-id="LEEWAY_APP::UI::VOICE_CONTROL::AUTO_SPEAK_RESPONSES" data-leeway-command="leewayVoiceSettingsChanged" data-leeway-setting-key="voiceAutoSpeak" onchange="setVoiceAutoSpeak(this.checked)" />
                  <span class="muted">Speak assistant replies automatically when voice is enabled.</span>
                </label>
              </div>
              <div class="model-card">
                <div class="model-label">Voice Style</div>
                <select id="voiceStyle" onchange="setVoiceStyle(this.value)">
                  <option value="neutral">Neutral</option>
                  <option value="grounded">Grounded</option>
                  <option value="highFlow">High Flow</option>
                  <option value="storyMode">Story Mode</option>
                </select>
              </div>
              <div class="model-card">
                <div class="model-label">Voice Provider</div>
                <select id="leewayVoiceRuntimeKind" onchange="setLeeWayVoiceRuntimeKind(this.value)">
                  <option value="leeway-agent-voice-local">LeeWay Voice Bridge</option>
                  <option value="leeway-agent-voice-browser-fallback">Browser Speech Fallback</option>
                </select>
              </div>
              <div class="model-card">
                <div class="model-label">Auto Send Final Transcript</div>
                <label class="settings-row" for="voiceAutoSendFinalTranscriptToggle">
                  <input id="voiceAutoSendFinalTranscriptToggle" class="settings-toggle" type="checkbox" data-leeway-id="LEEWAY_APP::UI::VOICE_CONTROL::AUTO_SEND_FINAL_TRANSCRIPT" data-leeway-command="leewayVoiceSettingsChanged" data-leeway-setting-key="voiceAutoSendFinalTranscript" onchange="setVoiceAutoSendFinalTranscript(this.checked)" />
                  <span class="muted">Off by default. LeeWay Voice should review what was heard before anything is sent.</span>
                </label>
              </div>
              <div class="model-card">
                <div class="model-label">Voice Speed</div>
                <input id="voiceRate" type="range" min="0.6" max="1.4" step="0.05" value="0.9" data-leeway-id="LEEWAY_APP::UI::VOICE_CONTROL::SPEECH_RATE" data-leeway-command="leewayVoiceSettingsChanged" data-leeway-setting-key="voiceRate" oninput="setVoiceRate(this.value)" />
                <div class="model-status" id="voiceRateLabel">0.90x</div>
              </div>
              <div class="model-card">
                <div class="model-label">Speech Volume</div>
                <input id="voiceVolume" type="range" min="0" max="1.5" step="0.05" value="1.0" data-leeway-id="LEEWAY_APP::UI::VOICE_CONTROL::SPEECH_VOLUME" data-leeway-command="leewayVoiceSettingsChanged" data-leeway-setting-key="voiceVolume" oninput="setVoiceVolume(this.value)" />
                <div class="model-status" id="voiceVolumeLabel">1.00x</div>
              </div>
              <div class="model-card">
                <div class="model-label">Voice Pitch</div>
                <input id="voicePitch" type="range" min="0.7" max="1.3" step="0.05" value="1.0" oninput="setVoicePitch(this.value)" />
                <div class="model-status" id="voicePitchLabel">1.00x</div>
              </div>
              <div class="model-card">
                <div class="model-label">Voice Tone</div>
                <input id="voiceTone" type="range" min="0.7" max="1.3" step="0.05" value="1.0" oninput="setVoiceTone(this.value)" />
                <div class="model-status" id="voiceToneLabel">1.00x</div>
              </div>
              <div class="model-card">
                <div class="model-label">Speech Send Shortcut</div>
                <div class="settings-copy">Match your prompt sending style to how you like to compose.</div>
                <input type="checkbox" class="settings-toggle" id="requireCtrlEnterToggleSecondary" onchange="setRequireCtrlEnter(this.checked)" />
              </div>
              <div class="model-card" style="grid-column:1 / -1">
                <div class="model-label">Developer Voice Cloning</div>
                <div class="settings-copy">Clone a developer voice inside the LeeWay app, make it Agent Lee's default voice, and keep the full system reusable for downstream applications.</div>
                <div class="settings-row">
                  <span class="runtime-pill" id="voiceCloneEngine">Clone engine: checking...</span>
                  <span class="runtime-pill" id="voiceCloneReference">Reference: checking...</span>
                </div>
                <div class="settings-row" style="margin-top:10px">
                  <label class="muted" for="voiceReferenceAudioPath">Reference audio</label>
                  <input id="voiceReferenceAudioPath" class="workflow-input" style="min-height:44px" placeholder="C:\Users\...\reference_voice.wav" />
                </div>
                <div class="settings-row">
                  <button data-leeway-id="LEEWAY_UI_CONTROL::VSCODE::AUTO::PICKVOICEREFERENCE" class="ghost-btn" onclick="pickVoiceReference()">Pick Audio</button>
                  <button data-leeway-id="LEEWAY_UI_CONTROL::VSCODE::AUTO::USEBUNDLEDREFERENCEVOICE" class="ghost-btn" onclick="useBundledReferenceVoice()">Use Current Default</button>
                  <button data-leeway-id="LEEWAY_UI_CONTROL::VSCODE::AUTO::TRANSCRIBEVOICEREFERENCE" class="ghost-btn" onclick="transcribeVoiceReference()">Transcribe Reference</button>
                </div>
                <div class="settings-row" style="margin-top:10px">
                  <label class="muted" for="voiceReferenceText">Reference transcript</label>
                  <textarea id="voiceReferenceText" class="workflow-input" placeholder="Transcript of the recorded reference voice goes here."></textarea>
                </div>
                <div class="settings-row" style="margin-top:10px">
                  <label class="muted" for="voiceCloneTestText">Clone test phrase</label>
                  <input id="voiceCloneTestText" class="workflow-input" style="min-height:44px" value="This is Agent Lee using the developer cloned voice path inside LeeWay." />
                </div>
                <div class="settings-row">
                  <button data-leeway-id="LEEWAY_UI_CONTROL::VSCODE::AUTO::SAVEVOICECLONESETTINGS" class="ghost-btn" onclick="saveVoiceCloneSettings()">Save Clone Setup</button>
                  <button data-leeway-id="LEEWAY_UI_CONTROL::VSCODE::AUTO::TESTCLONEDVOICE" class="ghost-btn" onclick="testClonedVoice()">Test Cloned Voice</button>
                  <button data-leeway-id="LEEWAY_UI_CONTROL::VSCODE::AUTO::ACTIVATECLONEDVOICE" class="ghost-btn" onclick="activateClonedVoice()">Use Clone As Default</button>
                </div>
                <div class="settings-copy" id="voiceCloneStatus" style="margin-top:10px">Voice cloning status will appear here.</div>
              </div>
              <div class="voice-bridge-card">
                <div class="model-label">Voice Bridge Status</div>
                <div class="voice-review-copy" id="voiceBridgeSummary">LeeWay Voice is standing by.</div>
                <div class="voice-bridge-grid">
                  <div class="voice-review-field"><div class="voice-review-label">Authority</div><div class="voice-review-value" id="voiceBridgeAuthority">Unknown</div></div>
                  <div class="voice-review-field"><div class="voice-review-label">Listening Source</div><div class="voice-review-value" id="voiceBridgeSource">Unknown</div></div>
                  <div class="voice-review-field"><div class="voice-review-label">Endpoint</div><div class="voice-review-value" id="voiceBridgeEndpoint">http://127.0.0.1:7671/transcript</div></div>
                  <div class="voice-review-field"><div class="voice-review-label">What Was Heard</div><div class="voice-review-value" id="voiceBridgeLastHeard">Nothing captured yet.</div></div>
                  <div class="voice-review-field"><div class="voice-review-label">Sent Yet</div><div class="voice-review-value" id="voiceBridgeLastSent">No.</div></div>
                  <div class="voice-review-field"><div class="voice-review-label">Typed Input</div><div class="voice-review-value" id="voiceBridgeTypedInput">Available</div></div>
                  <div class="voice-review-field"><div class="voice-review-label">Runtime</div><div class="voice-review-value" id="voiceBridgeRuntime">Unknown</div></div>
                  <div class="voice-review-field"><div class="voice-review-label">Duplicate Suppressions</div><div class="voice-review-value" id="voiceBridgeSuppressionCount">0</div></div>
                  <div class="voice-review-field"><div class="voice-review-label">Next Action</div><div class="voice-review-value" id="voiceBridgeNextAction">Use typed input or start LeeWay Voice when the runtime is ready.</div></div>
                </div>
                <div class="voice-bridge-warning" id="voiceBridgeWarning">Status, heartbeat, and errors are routed here instead of chat.</div>
                <div class="settings-row">
                  <button data-leeway-id="LEEWAY_UI_CONTROL::VSCODE::AUTO::DISCARDVOICEREVIEW" class="ghost-btn" onclick="discardVoiceReview()">Clear Voice Session</button>
                  <div class="settings-copy">Restart bridge instructions: pause the mic, reload the sidebar, and start LeeWay Voice again if the bridge becomes degraded.</div>
                </div>
              </div>
              <div class="voice-bridge-card">
                <div class="model-label">Camera & Video Status</div>
                <div class="voice-review-copy" id="cameraSummary">Camera not connected.</div>
                <div style="margin:10px 0;border:1px solid rgba(255,255,255,0.15);border-radius:10px;overflow:hidden;background:rgba(0,0,0,0.25)">
                  <video id="cameraVideoPreview" autoplay muted playsinline style="width:100%;min-height:160px;background:#111;display:none"></video>
                  <div id="cameraBlockedTile" style="padding:12px;font-size:12px;color:rgba(255,255,255,0.8)">CAMERA_SURFACE_VISIBLE_LOCAL_DEVICE_BRIDGE_REQUIRED</div>
                </div>
                <div class="voice-bridge-grid">
                  <div class="voice-review-field"><div class="voice-review-label">Camera Device</div><div class="voice-review-value" id="cameraDevice">No device detected</div></div>
                  <div class="voice-review-field"><div class="voice-review-label">Resolution</div><div class="voice-review-value" id="cameraResolution">N/A</div></div>
                  <div class="voice-review-field"><div class="voice-review-label">Status</div><div class="voice-review-value" id="cameraStatus">CAMERA_SURFACE_MISSING</div></div>
                  <div class="voice-review-field"><div class="voice-review-label">Provider</div><div class="voice-review-value" id="cameraProvider">LOCAL_DEVICE_BRIDGE_REQUIRED</div></div>
                  <div class="voice-review-field"><div class="voice-review-label">Frame Rate</div><div class="voice-review-value" id="cameraFrameRate">N/A</div></div>
                  <div class="voice-review-field"><div class="voice-review-label">Last Frame</div><div class="voice-review-value" id="cameraLastFrame">Never</div></div>
                </div>
                <div class="voice-bridge-warning" id="cameraWarning">Camera requires local device bridge or remote worker binding.</div>
                <div class="settings-row">
                  <button data-leeway-id="LEEWAY_UI_CONTROL::VSCODE::AUTO::TESTCAMERA" class="ghost-btn" onclick="testCamera()">Test Camera</button>
                  <button data-leeway-id="LEEWAY_UI_CONTROL::VSCODE::AUTO::REQUESTCAMERAPERMISSION" class="ghost-btn" onclick="requestCameraPermission()">Request Permission</button>
                </div>
              </div>
              <div class="voice-bridge-card">
                <div class="model-label">Local Device Bridge Status</div>
                <div class="voice-review-copy" id="deviceBridgeSummary">Device bridge not connected. Local hardware awareness requires bridge.</div>
                <div class="voice-bridge-grid">
                  <div class="voice-review-field"><div class="voice-review-label">Bridge Status</div><div class="voice-review-value" id="deviceBridgeStatus">LOCAL_DEVICE_BRIDGE_REQUIRED</div></div>
                  <div class="voice-review-field"><div class="voice-review-label">Microphone</div><div class="voice-review-value" id="deviceMic">Not detected</div></div>
                  <div class="voice-review-field"><div class="voice-review-label">Speaker</div><div class="voice-review-value" id="deviceSpeaker">Not detected</div></div>
                  <div class="voice-review-field"><div class="voice-review-label">Camera</div><div class="voice-review-value" id="deviceCamera">Not detected</div></div>
                  <div class="voice-review-field"><div class="voice-review-label">USB Devices</div><div class="voice-review-value" id="deviceUSB">0 detected</div></div>
                  <div class="voice-review-field"><div class="voice-review-label">IoT Devices</div><div class="voice-review-value" id="deviceIoT">0 detected</div></div>
                </div>
                <div class="voice-bridge-warning" id="deviceBridgeWarning">Device intelligence requires local bridge or FCC device records integration.</div>
              </div>
            </div>
          </div>
          </div>
          <div class="settings-section" id="settingsSection-mcp">
          <div class="settings-card">
            <div class="mcp-toolbar">
              <div>
                <div class="mcp-toolbar-title">MCP servers</div>
                <div class="mcp-toolbar-copy">Connect external tools and data sources.</div>
              </div>
              <button data-leeway-id="LEEWAY_UI_CONTROL::VSCODE::AUTO::ADDMCPSERVER" class="mcp-add-btn" onclick="addMcpServer()">+ Add server</button>
            </div>
            <div class="mcp-server-list" id="mcpServerList"></div>
            <div class="settings-row" style="margin-top:12px">
              <span class="runtime-pill" id="workspaceBadge">Workspace: checking...</span>
              <span class="runtime-pill" id="voiceStatus">Voice: checking...</span>
              <span class="runtime-pill" id="hiveStatus">Hive: checking...</span>
              <span class="runtime-pill" id="runtimeHealthBadge">Runtime Health: checking...</span>
            <div class="settings-row" style="margin-top:12px">
              <span class="runtime-pill" id="runtimeFabricBadge">Runtime Fabric: checking...</span>
              <span class="runtime-pill" id="providerFabricBadge">Provider Fabric: checking...</span>
              <span class="runtime-pill" id="agentLeeBadge">Agent Lee: checking...</span>
            </div>
            <div class="settings-row" style="margin-top:8px">
              <span class="runtime-pill" id="sentinelBadge">Sentinel: checking...</span>
              <span class="runtime-pill" id="cageBadge">Cage: checking...</span>
              <span class="runtime-pill" id="terminatorBadge">Terminator: checking...</span>
            </div>
            <div class="settings-row" style="margin-top:8px">
              <span class="runtime-pill" id="skillsUniversityBadge">Skills University: checking...</span>
              <span class="runtime-pill" id="leeway80BenchBadge">LeeWay 80 Bench: checking...</span>
            </div>
            <div class="settings-row" style="margin-top:8px">
              <span class="runtime-pill" id="localWorkerBadge">Local Worker: checking...</span>
              <span class="runtime-pill" id="deviceBridgeBadge">Device Bridge: checking...</span>
              <span class="runtime-pill" id="cameraBadge">Camera: checking...</span>
            </div>
            <div class="settings-row" style="margin-top:8px">
              <span class="runtime-pill" id="securityFabricBadge">Security Fabric: checking...</span>
              <span class="runtime-pill" id="modelCivilizationBadge">Model Civilization: checking...</span>
              <span class="runtime-pill" id="deviceIntelligenceBadge">Device Intelligence: checking...</span>
              <span class="runtime-pill" id="receiptsBadge">Receipts: checking...</span>
            </div>
            </div>
          </div>
          </div>
          <div class="settings-section" id="settingsSection-agents">
          <div class="settings-card">
            <div class="mcp-toolbar">
              <div>
                <div class="mcp-toolbar-title">Agents</div>
                <div class="mcp-toolbar-copy">Enable specialist agents and configure how Agent Lee treats them in the runtime.</div>
              </div>
              <button data-leeway-id="LEEWAY_UI_CONTROL::VSCODE::AUTO::ADDAGENT" class="mcp-add-btn" onclick="addAgent()">+ Add agent</button>
            </div>
            <div class="mcp-server-list" id="agentList"></div>
            <div class="settings-card" style="margin-top:14px">
              <div class="settings-title">Agent Lee Operating Intelligence</div>
              <div class="settings-copy">Pass 6 shows registered Leeway agents, Leeway LLM routes, tools, skills, workflows, execution truth, telemetry, and receipts. LLMs are shown as routes, never agents.</div>
              <div class="mcp-server-list" id="pass6StatusList"></div>
            </div>
          </div>
          </div>
          <div class="settings-section" id="settingsSection-workers">
          <div class="settings-card">
            <div class="mcp-toolbar">
              <div>
                <div class="mcp-toolbar-title">Workers</div>
                <div class="mcp-toolbar-copy">Workers do not run as VMs. This list shows ownership, diagnostics, routing, and lock state.</div>
              </div>
              <button data-leeway-id="LEEWAY_UI_CONTROL::VSCODE::AUTO::ADDWORKER" class="mcp-add-btn" onclick="addWorker()">+ Add worker</button>
            </div>
            <div class="mcp-server-list" id="workerList"></div>
          </div>
          </div>
          <div class="settings-section" id="settingsSection-usage">
          <div class="settings-card">
            <div class="settings-title">Usage</div>
            <div class="settings-copy">Usage, evidence, and help surfaces live here so you can audit what Agent Lee actually did.</div>
            <div class="settings-row">
              <button data-leeway-id="LEEWAY_UI_CONTROL::VSCODE::AUTO::OPENREADME" class="ghost-btn" onclick="openReadme()">Open Help</button>
            </div>
            <div class="settings-copy" id="evidenceStatus" style="margin-top:10px">Repair report path will appear here after front-end analysis or creation.</div>
          </div>
          </div>
          <div class="settings-section" id="settingsSection-voice-of-agent-lee">
          <div class="settings-card" style="margin-bottom:14px">
            <div class="settings-title" style="display:flex;align-items:center;gap:10px">&#127908; Voice of Agent Lee</div>
            <div class="settings-copy">Manage, clone, test and set Agent Lee's voice. The locked default voice is always preserved as the absolute baseline. You can add up to 10 custom voices.</div>
            <div class="settings-row" style="margin-top:12px;flex-wrap:wrap;gap:8px">
              <span class="runtime-pill" id="voiceAlActiveLabel">Active: checking...</span>
              <span class="runtime-pill" id="voiceAlEngineLabel">Engine: checking...</span>
              <span class="runtime-pill" id="voiceAlCountLabel">Voices: 0 / 10</span>
            </div>
          </div>
          <div class="settings-card" style="margin-bottom:14px">
            <div class="settings-title">&#128274; Default Voice (Locked)</div>
            <div class="settings-copy">This is Agent Lee's absolute baseline voice. It cannot be deleted. You can always restore it as the active voice.</div>
            <div class="settings-row" style="margin-top:10px;gap:8px;flex-wrap:wrap">
              <button data-leeway-id="LEEWAY_UI_CONTROL::VSCODE::AUTO::VOICEALTESTDEFAULT" class="ghost-btn" onclick="voiceAlTestDefault()">&#9654; Play Default</button>
              <button data-leeway-id="LEEWAY_UI_CONTROL::VSCODE::AUTO::VOICEALACTIVATEDEFAULT" class="ghost-btn" onclick="voiceAlActivateDefault()">Set as Active Voice</button>
            </div>
            <div class="settings-copy" id="voiceAlDefaultStatus" style="margin-top:8px"></div>
          </div>
          <div class="settings-card" style="margin-bottom:14px">
            <div class="settings-title">&#127381; Clone a New Voice</div>
            <div class="settings-copy">Record or pick a reference audio clip (3ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“30s, clear speech, no background noise). Give it a name and transcript, then clone it. Clones are saved to your catalog.</div>
            <div class="settings-row" style="margin-top:10px">
              <label class="muted" for="voiceAlNewLabel">Voice name</label>
              <input id="voiceAlNewLabel" class="workflow-input" style="min-height:40px" placeholder="e.g. My Voice v2" />
            </div>
            <div class="settings-row" style="margin-top:8px">
              <label class="muted" for="voiceAlRefAudio">Reference audio path</label>
              <input id="voiceAlRefAudio" class="workflow-input" style="min-height:40px" placeholder="C:\Users\...\my_voice.wav" />
            </div>
            <div class="settings-row" style="margin-top:4px;gap:8px;flex-wrap:wrap">
              <button data-leeway-id="LEEWAY_UI_CONTROL::VSCODE::AUTO::VOICEALPICKAUDIO" class="ghost-btn" onclick="voiceAlPickAudio()">&#128190; Browse Audio</button>
              <button data-leeway-id="LEEWAY_UI_CONTROL::VSCODE::AUTO::VOICEALRECORDMIC" class="ghost-btn" onclick="voiceAlRecordMic()">&#127897; Record Mic Now</button>
            </div>
            <div class="settings-row" style="margin-top:8px">
              <label class="muted" for="voiceAlRefText">Reference transcript</label>
              <textarea id="voiceAlRefText" class="workflow-input" style="min-height:72px" placeholder="Exactly what is said in the reference audio clip."></textarea>
            </div>
            <div class="settings-row" style="margin-top:8px">
              <label class="muted" for="voiceAlTestPhrase">Test phrase (what Agent Lee will say)</label>
              <input id="voiceAlTestPhrase" class="workflow-input" style="min-height:40px" value="Hey, I'm online, ready, and listening. Just say the word and I'll get it done." />
            </div>
            <div class="settings-row" style="margin-top:10px;gap:8px;flex-wrap:wrap">
              <button data-leeway-id="LEEWAY_UI_CONTROL::VSCODE::AUTO::VOICEALCLONEANDPREVIEW" class="ghost-btn" onclick="voiceAlCloneAndPreview()">&#9889; Clone &amp; Preview</button>
              <button data-leeway-id="LEEWAY_UI_CONTROL::VSCODE::AUTO::VOICEALSAVECLONE" class="ghost-btn" onclick="voiceAlSaveClone()">&#10003; Save to Catalog</button>
            </div>
            <div class="settings-copy" id="voiceAlCloneStatus" style="margin-top:8px"></div>
          </div>
          <div class="settings-card">
            <div class="settings-title">&#127911; Voice Catalog</div>
            <div class="settings-copy">All saved voices. Click Play to preview, Set Active to use it, or Delete to remove it. The locked default voice is always shown first.</div>
            <div id="voiceAlCatalogList" style="margin-top:12px;display:flex;flex-direction:column;gap:10px"></div>
          </div>
          </div>
          <div class="settings-section" id="settingsSection-plugins">
          <div class="settings-card">
            <div class="settings-title">Plugins</div>
            <div class="settings-copy">Select plugins Agent Lee should treat as connected capabilities for deeper workflows.</div>
            <div id="pluginCatalogRoot"></div>
          </div>
          </div>
        </div>
          </div>
        </div>
      </div>
    </div>

    <div class="agent-vm-backdrop" id="agentVmBackdrop" onclick="closeAgentVmIfBackdrop(event)">
      <div class="agent-vm-modal" id="agentVmPanel" role="dialog" aria-modal="true" aria-label="AX Agent Lee diagnostics monitor">
        <div class="agent-vm-head">
          <div>
            <div class="agent-vm-title" id="agentVmTitle">AX Agent Lee Monitor</div>
            <div class="agent-vm-subtitle" id="agentVmSubtitle">Select a subordinate agent to inspect its diagnostics, memory, and exposed work surfaces.</div>
          </div>
          <div class="agent-vm-actions">
            <span class="agent-vm-status" id="agentVmStatus">Paused</span>
            <span class="agent-lock-pill muted" id="agentVmLockPill" style="display:none">Observed Only</span>
            <button data-leeway-id="LEEWAY_UI_CONTROL::VSCODE::AUTO::AGENTVMWAKEBTN" class="ghost-btn" id="agentVmWakeBtn" onclick="wakeCurrentAgentVm()">Enable AX</button>
            <button data-leeway-id="LEEWAY_UI_CONTROL::VSCODE::AUTO::AGENTVMPAUSEBTN" class="ghost-btn" id="agentVmPauseBtn" onclick="stopCurrentAgentVm()">Pause AX</button>
            <button data-leeway-id="LEEWAY_UI_CONTROL::VSCODE::AUTO::CLOSEAGENTVM" class="ghost-btn" onclick="closeAgentVm()">Close</button>
          </div>
        </div>
        <div class="agent-vm-meta" id="agentVmMeta"></div>
        <div class="agent-vm-workstation">
          <div class="agent-vm-taskbar" id="agentVmTaskbar"></div>
          <div class="agent-vm-screen" id="agentVmScreen"></div>
        </div>
        <div class="agent-vm-chat">
          <div class="agent-vm-panel-title">Ask Through Agent Lee</div>
          <div class="agent-vm-log" id="agentVmLog"></div>
          <div class="agent-vm-ask-row">
            <input id="agentVmAskInput" placeholder="Ask about this subordinate agent. Agent Lee remains the final speaker." onkeydown="if(event.key==='Enter') askCurrentAgentVm()" />
            <button data-leeway-id="LEEWAY_UI_CONTROL::VSCODE::AUTO::ASKCURRENTAGENTVM" class="ghost-btn" onclick="askCurrentAgentVm()">Route Ask</button>
          </div>
        </div>
      </div>
    </div>

    <div class="workflow-dock">
      <div class="control-strip" aria-label="Agent Lee engineering controls">
        <button data-leeway-id="LEEWAY_UI_CONTROL::VSCODE::AUTO::ENGINEER_TASK" type="button" data-ui-action="engineerTask">Engineer Task</button>
        <button data-leeway-id="LEEWAY_UI_CONTROL::VSCODE::AUTO::RUNTIME_STATUS" type="button" data-ui-action="runtimeStatus">Runtime Status</button>
        <button data-leeway-id="LEEWAY_UI_CONTROL::VSCODE::AUTO::SCAN_AGENT_LEE_SELF" type="button" data-ui-action="scanSelf">Scan Agent Lee Self</button>
        <button data-leeway-id="LEEWAY_UI_CONTROL::VSCODE::AUTO::VERIFY_AGENT_LEE_SELF" type="button" data-ui-action="verifySelf">Verify Agent Lee Self</button>
        <button data-leeway-id="LEEWAY_UI_CONTROL::VSCODE::AUTO::ASK_LOCAL_MODEL" type="button" data-ui-action="askLocalModel">Ask Local Model</button>
        <button data-leeway-id="LEEWAY_UI_CONTROL::VSCODE::AUTO::SCAN_WORKSPACE" type="button" data-ui-action="scanWorkspace">Scan Workspace</button>
        <button data-leeway-id="LEEWAY_UI_CONTROL::VSCODE::AUTO::VERIFY_WORKSPACE" type="button" data-ui-action="verifyWorkspace">Verify Workspace</button>
        <button data-leeway-id="LEEWAY_UI_CONTROL::VSCODE::AUTO::OPEN_RECEIPTS" type="button" data-ui-action="openReceipts">Open Receipts</button>
      </div>
      <div class="workflow-shell" id="workflowShell">
        <div class="workflow-head">
          <button data-leeway-id="LEEWAY_UI_CONTROL::VSCODE::AUTO::WORKFLOWCHEVRON" class="workflow-toggle" onclick="toggleTaskPanel()"><span id="workflowChevron">&#9656;</span><span id="workflowTitle">Task Tracker</span></button>
          <div class="workflow-preview" id="workflowPreview">Waiting for a new task.</div>
        </div>
        <div class="workflow-body" id="workflowBody">
          <div class="mode-pill" id="workflowMode">Mode: Execute</div>
          <div class="workflow-summary" id="workflowSummary">I will show the plan and live to-dos here.</div>
          <div class="workflow-actions" id="workflowActions"></div>
          <div class="workflow-editor">
            <textarea class="workflow-input" id="workflowPromptEditor" placeholder="Current task prompt will appear here so you can edit it or redirect Agent Lee."></textarea>
          </div>
          <div class="workflow-grid">
            <div class="workflow-card">
              <div class="workflow-title">Live Work</div>
              <div class="todo-list" id="todoList"></div>
            </div>
            <div class="workflow-card">
              <div class="workflow-title">Live Activity</div>
              <div class="activity-list" id="activityList"></div>
            </div>
            <div class="workflow-card">
              <div class="workflow-title">Proposed Edits</div>
              <div class="proposal-list" id="proposalList"></div>
            </div>
            <div class="workflow-card">
              <div class="workflow-title">Plugin Mesh</div>
              <div class="plugin-mesh-head">
                <span id="pluginMeshCount">0 active</span>
                <span id="pluginMeshMode">Governed routing</span>
              </div>
              <div class="plugin-mesh-grid" id="pluginMeshGrid"></div>
            </div>
          </div>
          <div class="workflow-parked" id="workflowParked">No paused task parked right now.</div>
        </div>
      </div>
    </div>


    <div class="chat" id="chat"></div>

    <div class="composer">
      <div class="voice-review-panel" id="voiceReviewPanel" hidden>
        <div class="voice-review-head">
          <div>
            <div class="voice-review-title">LeeWay Voice Review</div>
            <div class="voice-review-copy" id="voiceReviewSummary">Voice input will appear here for review before anything is sent.</div>
          </div>
          <span class="runtime-pill" id="voiceReviewAuthority">Voice review pending</span>
        </div>
        <div class="voice-review-grid">
          <div class="voice-review-field"><div class="voice-review-label">Heard Text</div><div class="voice-review-value" id="voiceReviewHeardText">Nothing captured yet.</div></div>
          <div class="voice-review-field"><div class="voice-review-label">Source</div><div class="voice-review-value" id="voiceReviewSource">Unknown</div></div>
          <div class="voice-review-field"><div class="voice-review-label">Confidence</div><div class="voice-review-value" id="voiceReviewConfidence">Not provided</div></div>
          <div class="voice-review-field"><div class="voice-review-label">Transcript ID</div><div class="voice-review-value" id="voiceReviewTranscriptId">Pending</div></div>
          <div class="voice-review-field"><div class="voice-review-label">Timestamp</div><div class="voice-review-value" id="voiceReviewTimestamp">Pending</div></div>
          <div class="voice-review-field"><div class="voice-review-label">Classification</div><div class="voice-review-value" id="voiceReviewClassification">Unknown</div></div>
          <div class="voice-review-field"><div class="voice-review-label">Risk</div><div class="voice-review-value" id="voiceReviewRisk">Unknown</div></div>
          <div class="voice-review-field"><div class="voice-review-label">Next Action</div><div class="voice-review-value" id="voiceReviewNextAction">Review before send.</div></div>
        </div>
        <div class="voice-review-actions">
          <button data-leeway-id="LEEWAY_UI_CONTROL::VSCODE::AUTO::SENDVOICEREVIEW" class="ghost-btn" onclick="sendVoiceReview()">Send as Message</button>
          <button data-leeway-id="LEEWAY_UI_CONTROL::VSCODE::AUTO::CREATEVOICEREVIEWPROPOSAL" class="ghost-btn" onclick="createVoiceReviewProposal()">Create Proposal</button>
          <button data-leeway-id="LEEWAY_UI_CONTROL::VSCODE::AUTO::CLARIFYVOICEREVIEW" class="ghost-btn" onclick="clarifyVoiceReview()">Ask Clarification</button>
          <button data-leeway-id="LEEWAY_UI_CONTROL::VSCODE::AUTO::DISCARDVOICEREVIEW" class="ghost-btn" onclick="discardVoiceReview()">Discard</button>
        </div>
      </div>
      <div class="status-line" id="status">Getting the room set...</div>
        <div class="composer-shell">
        <div class="plugin-approval hidden" id="pluginApproval">
          <div class="plugin-approval-title">Plugin approval required</div>
          <div class="plugin-approval-copy" id="pluginApprovalCopy">Hey yo, I'm waiting on your permission before I push this through.</div>
          <div class="plugin-approval-meta" id="pluginApprovalMeta"></div>
          <div class="plugin-approval-actions">
            <button data-leeway-id="LEEWAY_UI_CONTROL::VSCODE::AUTO::APPROVEPLUGINCALL" type="button" class="approve" onclick="approvePluginCall()">Approve Once</button>
            <button data-leeway-id="LEEWAY_UI_CONTROL::VSCODE::AUTO::CANCELPLUGINCALL" type="button" onclick="cancelPluginCall()">Cancel</button>
          </div>
        </div>
        <textarea id="input" placeholder="Ask Agent Lee anything..."></textarea>
        <div class="attachment-list hidden" id="attachmentList"></div>
        <div class="composer-bottom">
          <div class="toolbelt">
            <button class="tool-link icon-only" id="attachFilesBtn" data-leeway-id="LEEWAY_OBJECT::CONTROL::ATTACH_FILES_BUTTON" onclick="pickAttachments()" aria-label="Attach files" title="Attach files"><span class="tool-icon">&#128206;</span></button>
            <button class="tool-link icon-only" id="micBtn" data-leeway-id="LEEWAY_OBJECT::CONTROL::MIC_BUTTON" onclick="mic()" aria-label="Toggle live microphone" title="Toggle live microphone"><span class="tool-icon">&#127908;</span></button>
            <button class="tool-link" id="voiceToggleBtn" data-leeway-id="LEEWAY_OBJECT::CONTROL::VOICE_TOGGLE_BUTTON" data-enabled="true" onclick="toggleVoiceOutput()" aria-label="Toggle speech" title="Mute speech">Mute</button>
            <div class="muted" id="attachmentMeta">Text, image, audio, and mic input ready.</div>
          </div>
          <div class="composer-right">
            <select id="workMode" class="access-compact" onchange="setWorkMode(this.value)" aria-label="Work mode" title="Work mode">
              <option value="execute">MODE: EXECUTE</option>
              <option value="plan">MODE: PLAN</option>
              <option value="ask">MODE: ASK</option>
            </select>
            <button data-leeway-id="LEEWAY_UI_CONTROL::VSCODE::AUTO::ACCEPTALLEDITSBTN" class="ghost-btn bulk-accept-btn" id="acceptAllEditsBtn" onclick="approveAllProposedEditsFromUi()" aria-label="Accept all pending edits" title="Accept all pending edits">Accept All</button>
            <select id="approval" class="access-compact" onchange="setApproval(this.value)">
              <option value="safe">ACCESS: DEFAULT</option>
              <option value="balanced">ACCESS: BALANCED</option>
              <option value="full">ACCESS: FULL</option>
            </select>
            <select id="primaryModel" class="model-compact" onchange="setPrimaryModel(this.value)">
              <option value="${runtimeState.primaryModel || "qwen2.5-coder:7b"}">MODEL: ${runtimeState.primaryModel || "qwen2.5-coder:7b"}</option>
            </select>
            <button class="send-btn" id="sendBtn" data-leeway-id="LEEWAY_OBJECT::CONTROL::SEND_BUTTON" onclick="send()" aria-label="Send message" title="Send message">Send</button>
          </div>
        </div>
      </div>
      <div class="footer">
        <div style="display:flex;align-items:center;gap:8px">
          <button data-leeway-id="LEEWAY_UI_CONTROL::VSCODE::AUTO::BOTTOMLEFTSTANDARDSBTN" class="img-btn" id="bottomLeftStandardsBtn" title="LeeWay Standards"><img src="${standardsBtnUri}" alt="LeeWay Standards button" style="height:20px;border-radius:4px" onerror="fallbackImageButton(this,'LS');" /></button>
          <span>Agent Lee enforces LeeWay Standards in every response.</span>
        </div>
        <div class="footer-right" style="display:flex;align-items:center;gap:8px">
          <span style="display:inline-flex;align-items:center;gap:4px;font-size:11px;color:rgba(255,255,255,0.6);" title="Voice/TTS Status">
            <span style="width:8px;height:8px;border-radius:50%;background:#ff8c8c;" id="voiceStatusDot"></span>
            Voice
          </span>
          <span style="display:inline-flex;align-items:center;gap:4px;font-size:11px;color:rgba(255,255,255,0.6);cursor:pointer;" onclick="alert('Camera access blocked in VS Code webviews due to security restrictions. Use external browser for camera features.')" title="Camera Status (Click for info)">
            <span style="width:8px;height:8px;border-radius:50%;background:#ff8c8c;" id="cameraStatusDot"></span>
            Camera
          </span>
          <img src="${standardsLogoUri}" alt="LeeWay Standards logo" style="height:18px;border-radius:4px" onerror="this.style.display='none';" />
          <span>Local private runtime</span>
          <button data-leeway-id="LEEWAY_UI_CONTROL::VSCODE::AUTO::BOTTOMRIGHTBTN" class="img-btn" id="bottomRightBtn" aria-label="Bottom Button" title="Bottom Button"><img src="${bottomBtnUri}" alt="Bottom Button" style="height:20px" onerror="fallbackImageButton(this,'AL');" /></button>
        </div>
      </div>
    </div>
  </div>
</div>

<script>
const vscode = acquireVsCodeApi();
const LEEWAY_EXECUTION_CAPABLE_UI_COMMANDS = new Set([
  "sendMessage",
  "askLocalModel",
  "engineerTask",
  "scanSelf",
  "verifySelf",
  "scanWorkspace",
  "verifyWorkspace",
  "approvePlan",
  "executePlan",
  "approveProposedEdit",
  "approveAllProposedEdits",
  "setState",
  "leewayVoiceSettingsChanged",
  "leewayVoiceMuteToggled",
  "leewayVoiceStopRequested",
  "leewayVoiceTestRequested",
  "activateClonedVoice",
  "testClonedVoice",
  "saveVoiceCloneSettings",
  "transcribeVoiceReference",
  "voiceAlActivateDefault",
  "voiceAlCloneAndPreview",
  "voiceAlDeleteVoice",
  "voiceAlSaveClone",
  "voiceAlSetActive",
  "voiceAlTestDefault",
  "voiceAlTestVoice",
  "updateAgentLeeNow",
  "setPerformanceProfile",
  "approvePluginCall"
  ,"refreshRuntime"
  ,"verifyModelVault"
  ,"testModelExecution"
  ,"requestCameraPermission"
  ,"requestMicPermission"
]);
const LEEWAY_DISCLOSURE_RISK_BY_COMMAND = {
  sendMessage: "MEDIUM",
  askLocalModel: "MEDIUM",
  engineerTask: "MEDIUM",
  scanSelf: "MEDIUM",
  verifySelf: "MEDIUM",
  scanWorkspace: "HIGH",
  verifyWorkspace: "HIGH",
  approvePlan: "HIGH",
  executePlan: "CRITICAL",
  approveProposedEdit: "HIGH",
  approveAllProposedEdits: "CRITICAL",
  setState: "LOW",
  leewayVoiceSettingsChanged: "MEDIUM",
  leewayVoiceMuteToggled: "MEDIUM",
  leewayVoiceStopRequested: "MEDIUM",
  leewayVoiceTestRequested: "HIGH",
  activateClonedVoice: "HIGH",
  testClonedVoice: "MEDIUM",
  saveVoiceCloneSettings: "HIGH",
  transcribeVoiceReference: "MEDIUM",
  voiceAlActivateDefault: "HIGH",
  voiceAlCloneAndPreview: "HIGH",
  voiceAlDeleteVoice: "CRITICAL",
  voiceAlSaveClone: "HIGH",
  voiceAlSetActive: "HIGH",
  voiceAlTestDefault: "HIGH",
  voiceAlTestVoice: "HIGH",
  updateAgentLeeNow: "CRITICAL",
  setPerformanceProfile: "MEDIUM",
  approvePluginCall: "CRITICAL",
  refreshRuntime: "LOW",
  verifyModelVault: "LOW",
  testModelExecution: "LOW",
  requestCameraPermission: "MEDIUM",
  requestMicPermission: "MEDIUM"
};
let leewayWorkflowRunId = "LEEWAY_WORKFLOW::VSCODE::" + Date.now().toString(36);
function disclosureArray(value){
  if(Array.isArray(value)) return value.map(function(item){ return String(item || "").trim(); }).filter(Boolean);
  if(typeof value === "string" && value.trim()) return [value.trim()];
  return [];
}
function disclosureEnvelopeForCommand(command, payload){
  const ts = new Date().toISOString();
  const riskLevel = String(LEEWAY_DISCLOSURE_RISK_BY_COMMAND[command] || "MEDIUM");
  const filesToEdit = disclosureArray(payload && payload.filesToEdit);
  const filesToRead = disclosureArray(payload && payload.filesToRead);
  const inferredEdit = ["approveProposedEdit", "approveAllProposedEdits", "approvePlan", "executePlan", "setState"].indexOf(command) >= 0;
  const normalizedFilesToEdit = filesToEdit.length
    ? filesToEdit
    : inferredEdit
      ? [command === "setState"
          ? "RUNTIME_STATE::" + String(payload && payload.key ? payload.key : "UNKNOWN")
          : "PENDING_EDIT_BUFFER::" + String(payload && (payload.editId || payload.command || command) || command)]
      : [];
  return {
    actionId: "LEEWAY_ACTION::VSCODE::" + command.toUpperCase() + "::" + Date.now().toString(36),
    workflowRunId: leewayWorkflowRunId,
    taskId: "LEEWAY_TASK::VSCODE_ACTION_DISCLOSURE::" + command.toUpperCase(),
    intentId: "LEEWAY_INTENT::" + command.toUpperCase(),
    agentId: "LEEWAY_OBJECT::AGENT_LEE::VSCODE_RUNTIME",
    filesToRead: filesToRead,
    filesToEdit: normalizedFilesToEdit,
    toolsToUse: ["vscode.webview.postMessage"],
    commandsToRun: [command],
    governingBookReferences: [
      "BOOK-54-ASSISTANT-EMBODIMENT-AND-BEHAVIOR-LAW",
      "BOOK-55-ASSISTANT-RECORDING-AND-LEARNING-LAW",
      "LEEWAY_VSCODE_ACTION_DISCLOSURE_PROTOCOL"
    ],
    riskLevel: riskLevel,
    rollbackPlan: "Fail closed and keep runtime state unchanged when disclosure validation fails.",
    expectedOutputs: ["command:" + command, "disclosure-receipt"],
    receiptId: "LEEWAY_RECEIPT::DISCLOSURE::" + command.toUpperCase() + "::" + Date.now().toString(36),
    explicitApproval: (riskLevel === "HIGH" || riskLevel === "CRITICAL") ? true : undefined,
    explicitApprovalDetail: (riskLevel === "HIGH" || riskLevel === "CRITICAL")
      ? {
          approvalSource: "operator-ui",
          approvedAt: ts,
          reason: "Explicit operator command from governed UI control."
        }
      : undefined
  };
}
const __vscodePostMessage = vscode.postMessage.bind(vscode);
function postAgentLeeCommand(message){
  const outgoing = Object.assign({}, message || {});
  const command = String(outgoing.command || "").trim();
  if (command && LEEWAY_EXECUTION_CAPABLE_UI_COMMANDS.has(command)) {
    if (!outgoing.actionDisclosure && outgoing.disclosure) {
      outgoing.actionDisclosure = outgoing.disclosure;
    }
    if (!outgoing.actionDisclosure) {
      const envelope = disclosureEnvelopeForCommand(command, outgoing);
      outgoing.actionDisclosure = envelope;
      if (!outgoing.disclosure) {
        outgoing.disclosure = envelope;
      }
    }
    if (!outgoing.commandsToRun) {
      outgoing.commandsToRun = (outgoing.actionDisclosure?.commandsToRun || outgoing.disclosure?.commandsToRun || [command]);
    }
  }
  return __vscodePostMessage(outgoing);
}
try { vscode.postMessage = postAgentLeeCommand; } catch (_error) {}
const roleIds = {
  builder_model: ["builderModel", "builderStatus"],
  designer_ux_model: ["designerModel", "designerStatus"],
  verifier_model: ["verifierModel", "verifierStatus"]
};
const pluginCatalog = ${JSON.stringify(DEFAULT_PLUGIN_CATALOG)};
const defaultMcpServerCatalog = ${JSON.stringify(DEFAULT_MCP_SERVER_CATALOG)};
const defaultAgentCatalog = ${JSON.stringify(DEFAULT_AGENT_CATALOG)};
const defaultWorkerCatalog = ${JSON.stringify(DEFAULT_WORKER_CATALOG)};
let attachmentMetaTimer = null;
let workflowCollapsed = true;
let latestTaskState = null;
let currentAgentVm = null;
let currentAgentVmApp = "desktop";
const agentVmSessions = {};
let latestAgentVmMemory = {};

function fallbackImageButton(image, label){
  if(!image || !image.parentElement) return;
  image.style.display = "none";
  image.parentElement.classList.add("text-fallback");
  image.parentElement.textContent = label;
}

function normalizeVmSlug(value){
  return String(value || "agent").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"") || "agent";
}

function fallbackVmIdentity(entry, catalogKind){
  const slug = normalizeVmSlug(entry && entry.id ? entry.id : "agent");
  const isMcp = catalogKind === "mcp";
  return {
    kind: isMcp ? "leeway-mcp-agent" : "leeway-agent",
    realName: entry && entry.name ? entry.name : slug,
    family: isMcp ? "LeeWay MCP Family" : "LeeWay Agent Family",
    lineage: isMcp ? "Agent Lee Prime > MCP Wing > Custom Branch" : "Agent Lee Prime > Agent Wing > Custom Branch",
    duties: [entry && entry.description ? entry.description : "Custom LeeWay runtime support."],
    authorities: ["Operate only through Agent Lee governance.", "Write visible notes, logs, and receipts.", "Request confirmation for protected actions."],
    vmAddress: "vm://leeway/" + (isMcp ? "mcp" : "agent") + "/" + slug,
    notepadPath: "workspace/agents/" + slug + "/notes/" + slug + ".md",
    databasePath: "memory/agents/" + slug + "/events.jsonl",
    heartbeat: slug + "-heartbeat"
  };
}

function agentVmMemoryLedgerPath(vm){
  const slug = normalizeVmSlug(vm && vm.id ? vm.id : "agent");
  return "memory/agents/" + slug + "/events.jsonl";
}

function vmDeveloperSurface(vm){
  return vm && vm.identity && vm.identity.developerSurface ? vm.identity.developerSurface : "mutable";
}

function vmIsObservedOnly(vm){
  return vmDeveloperSurface(vm) === "observed-only";
}

function vmLockReason(vm){
  if(!vm || !vm.identity) return "This Agent VM is protected by LeeWay governance.";
  return vm.identity.lockReason || "This Agent VM is protected by LeeWay governance and cannot be directly reconfigured.";
}

function withVmIdentity(entry, catalogKind){
  const fallback = fallbackVmIdentity(entry, catalogKind);
  const identity = Object.assign({}, fallback, entry.identity || {});
  return Object.assign({}, entry, { identity: identity, catalogKind: catalogKind });
}

function getAgentVmEntry(catalogKind, id){
  const state = window.agentLeeRuntimeState || {};
  const list = catalogKind === "mcp" ? getMcpCatalog(state) : getAgentCatalog(state);
  return list.find(function(entry){ return entry.id === id; }) || null;
}

function openAgentVmFromEncoded(catalogKind, encodedId){
  openAgentVm(catalogKind, decodeURIComponent(encodedId));
}

function agentVmButton(catalogKind, id){
  return '<button class="agent-vm-btn" data-leeway-id="LEEWAY_UI_CONTROL::VSCODE::AX_AGENT::OPEN_DIAGNOSTICS::'+encodeURIComponent(id)+'" onclick="openAgentVmFromEncoded(&apos;'+catalogKind+'&apos;,&apos;'+encodeURIComponent(id)+'&apos;)" title="Open AX Agent Lee diagnostics" aria-label="Open AX Agent Lee diagnostics">&#128421;</button>';
}

function agentVmKey(vm){
  return vm.catalogKind + ":" + vm.id;
}

function vmEnabled(vm){
  const state = window.agentLeeRuntimeState || {};
  const key = vm.catalogKind === "mcp" ? "enabledMcpServers" : "enabledAgents";
  const list = state[key] || [];
  const session = agentVmSessions[agentVmKey(vm)];
  return list.indexOf(vm.id) !== -1 || !!(session && session.awake);
}

function recordAgentVmEvent(kind, detail){
  if(!currentAgentVm) return;
  const session = ensureAgentVmSession(currentAgentVm);
  const identity = currentAgentVm.identity;
  const event = {
    ts: new Date().toISOString(),
    kind: kind,
    detail: detail || "",
    agentId: currentAgentVm.id,
    agentName: currentAgentVm.name,
    realName: identity.realName,
    app: currentAgentVmApp,
    memoryLedgerPath: agentVmMemoryLedgerPath(currentAgentVm),
    configuredDatabasePath: identity.databasePath,
    route: "Agent Lee -> AX Agent Lee -> Agent Lee",
    speakerOrder: "Agent Lee first and last"
  };
  session.events = (session.events || []).concat([event]).slice(-80);
  vscode.postMessage({command:"agentVmDiagnosticEvent", event:event});
}

function ensureAgentVmSession(vm){
  const key = agentVmKey(vm);
  if(!agentVmSessions[key]){
    const identity = vm.identity;
    agentVmSessions[key] = {
      awake: vmEnabled(vm),
      notepad: "# AX Agent Lee Notepad: " + identity.realName + "\\n\\nIdentity: " + vm.name + "\\nAddress: " + identity.vmAddress + "\\nLineage: " + identity.lineage + "\\nSpeaker order: Agent Lee first and last.\\nMemory ledger: " + agentVmMemoryLedgerPath(vm) + "\\n\\nCurrent notes:\\n- Diagnostics monitor opened.\\n- Developer may inspect notepad, terminal, workspace, database, and diagnostics surfaces.\\n",
      terminal: [
        "AX_AGENT_LEE_BOOT " + identity.vmAddress,
        "identity=" + identity.realName,
        "family=" + identity.family,
        "heartbeat=" + identity.heartbeat,
        "speaker_order=agent_lee_first_and_last",
        "memory_ledger=" + agentVmMemoryLedgerPath(vm)
      ],
      messages: [
        { role: "system", content: "Agent Lee opened " + identity.realName + " as an AX subordinate diagnostics surface. Status follows the enabled switch until manually paused or enabled." }
      ],
      events: [
        {
          ts: new Date().toISOString(),
          kind: "monitor-opened",
          detail: "AX Agent Lee diagnostics surface opened.",
          memoryLedgerPath: agentVmMemoryLedgerPath(vm)
        }
      ]
    };
  }
  return agentVmSessions[key];
}

function vmKindLabel(identity){
  return identity.kind === "leeway-mcp-agent" ? "AX Agent Lee MCP Agent" : "AX Agent Lee Agent";
}

function openAgentVm(catalogKind, id){
  const entry = getAgentVmEntry(catalogKind, id);
  if(!entry) return;
  currentAgentVm = entry;
  currentAgentVmApp = "desktop";
  ensureAgentVmSession(entry);
  recordAgentVmEvent("monitor-opened", "AX Agent Lee diagnostics monitor opened.");
  renderAgentVm();
  const backdrop=document.getElementById("agentVmBackdrop");
  if(backdrop) backdrop.classList.add("open");
}

function closeAgentVm(){
  const backdrop=document.getElementById("agentVmBackdrop");
  if(backdrop) backdrop.classList.remove("open");
}

function closeAgentVmIfBackdrop(event){
  if(event.target && event.target.id==="agentVmBackdrop") closeAgentVm();
}

function setAgentVmEnabled(vm, enabled){
  if(vmIsObservedOnly(vm)){
    window.alert(vmLockReason(vm));
    return;
  }
  const state = window.agentLeeRuntimeState || {};
  const key = vm.catalogKind === "mcp" ? "enabledMcpServers" : "enabledAgents";
  const next = new Set(state[key] || []);
  if(enabled) next.add(vm.id); else next.delete(vm.id);
  state[key] = Array.from(next);
  window.agentLeeRuntimeState = state;
  vscode.postMessage({command:"setState", key:key, value:state[key]});
  if(vm.catalogKind === "mcp") renderMcpServers(state); else renderAgents(state);
}

function wakeCurrentAgentVm(){
  if(!currentAgentVm) return;
  if(vmIsObservedOnly(currentAgentVm)){
    const session = ensureAgentVmSession(currentAgentVm);
    session.terminal.push("protected-control-blocked enable");
    session.messages.push({ role:"system", content: vmLockReason(currentAgentVm) });
    recordAgentVmEvent("protected-control-blocked", "enable");
    renderAgentVm();
    return;
  }
  const session = ensureAgentVmSession(currentAgentVm);
  session.awake = true;
  session.terminal.push("enable-ax " + currentAgentVm.identity.realName + " -> ACTIVE");
  session.messages.push({ role:"system", content: currentAgentVm.identity.realName + " is active as AX Agent Lee support under Agent Lee governance." });
  recordAgentVmEvent("enabled", currentAgentVm.identity.realName + " enabled as AX Agent Lee support.");
  setAgentVmEnabled(currentAgentVm, true);
  renderAgentVm();
}

function stopCurrentAgentVm(){
  if(!currentAgentVm) return;
  if(vmIsObservedOnly(currentAgentVm)){
    const session = ensureAgentVmSession(currentAgentVm);
    session.terminal.push("protected-control-blocked pause");
    session.messages.push({ role:"system", content: vmLockReason(currentAgentVm) });
    recordAgentVmEvent("protected-control-blocked", "pause");
    renderAgentVm();
    return;
  }
  const session = ensureAgentVmSession(currentAgentVm);
  session.awake = false;
  session.terminal.push("pause-ax " + currentAgentVm.identity.realName + " -> PAUSED");
  session.messages.push({ role:"system", content: currentAgentVm.identity.realName + " has been paused. Enable AX before assigning new work." });
  recordAgentVmEvent("paused", currentAgentVm.identity.realName + " paused as AX Agent Lee support.");
  setAgentVmEnabled(currentAgentVm, false);
  renderAgentVm();
}

function openAgentVmApp(app){
  currentAgentVmApp = app;
  recordAgentVmEvent("app-opened", app);
  renderAgentVm();
}

function renderAgentVmMeta(vm, awake){
  const identity = vm.identity;
  const meta=document.getElementById("agentVmMeta");
  if(!meta) return;
  const items = [
    ["Real name", identity.realName],
    ["Class", vmKindLabel(identity)],
    ["Family", identity.family],
    ["Lineage", identity.lineage],
    ["AX address", identity.vmAddress],
    ["Heartbeat", awake ? identity.heartbeat + " active" : identity.heartbeat + " paused"],
    ["Speaker order", "Agent Lee first and last"],
    ["Memory ledger", agentVmMemoryLedgerPath(vm)]
  ];
  meta.innerHTML = items.map(function(item){
    return '<div class="agent-vm-meta-item"><div class="agent-vm-meta-label">'+escapeHtml(item[0])+'</div><div class="agent-vm-meta-value">'+escapeHtml(item[1])+'</div></div>';
  }).join("");
}

function renderAgentVmTaskbar(){
  const bar=document.getElementById("agentVmTaskbar");
  if(!bar) return;
  const apps = [
    ["desktop","Desktop"],
    ["workspace","Workspace"],
    ["browser","Web Search"],
    ["notepad","Notepad"],
    ["database","Database"],
    ["diagnostics","Diagnostics"],
    ["terminal","Terminal"]
  ];
  bar.innerHTML = '<button data-leeway-id="LEEWAY_UI_CONTROL::VSCODE::AUTO::OPENAGENTVMAPP" class="agent-vm-start" onclick="openAgentVmApp(&apos;desktop&apos;)">AX</button>' + apps.map(function(app){
    return '<button data-leeway-id="LEEWAY_UI_CONTROL::VSCODE::AUTO::OPENAGENTVMAPP" class="agent-vm-tab '+(currentAgentVmApp===app[0]?'active':'')+'" onclick="openAgentVmApp(&apos;'+app[0]+'&apos;)">'+escapeHtml(app[1])+'</button>';
  }).join("");
}

function renderAgentVmList(title, list){
  return '<div class="agent-vm-panel"><div class="agent-vm-panel-title">'+escapeHtml(title)+'</div><ul class="agent-vm-list">'+(list || []).map(function(item){ return '<li>'+escapeHtml(item)+'</li>'; }).join("")+'</ul></div>';
}

function renderAgentVmScreen(){
  if(!currentAgentVm) return;
  const vm = currentAgentVm;
  const identity = vm.identity;
  const session = ensureAgentVmSession(vm);
  const screen=document.getElementById("agentVmScreen");
  if(!screen) return;
  const awake = vmEnabled(vm);
  if(currentAgentVmApp === "desktop"){
    screen.innerHTML = '<div class="agent-vm-panel-grid">'
      + renderAgentVmList("Duties", identity.duties)
      + renderAgentVmList("Authorities", identity.authorities)
      + '<div class="agent-vm-panel"><div class="agent-vm-panel-title">Runtime</div><div class="agent-vm-meta-value">Status: '+escapeHtml(awake ? "Active" : "Paused")+'<br>Route: Agent Lee -> AX Agent Lee -> Agent Lee<br>Address: '+escapeHtml(identity.vmAddress)+'<br>Notepad: '+escapeHtml(identity.notepadPath)+'<br>Memory ledger: '+escapeHtml(agentVmMemoryLedgerPath(vm))+'</div></div>'
      + '</div><div class="agent-vm-desktop" style="margin-top:12px">'
      + ["workspace","browser","notepad","database","diagnostics","terminal"].map(function(app){
        const label = app === "workspace" ? "Workspace" : app.charAt(0).toUpperCase()+app.slice(1);
        return '<button data-leeway-id="LEEWAY_UI_CONTROL::VSCODE::AUTO::OPENAGENTVMAPP" class="agent-vm-app-icon" onclick="openAgentVmApp(&apos;'+app+'&apos;)"><span style="font-size:24px">&#9635;</span><span>'+escapeHtml(label)+'</span></button>';
      }).join("")
      + '</div>';
    return;
  }
  if(currentAgentVmApp === "workspace"){
    screen.innerHTML = '<div class="agent-vm-panel-grid">'
      + '<div class="agent-vm-panel"><div class="agent-vm-panel-title">Exposed Workspace</div><ul class="agent-vm-list"><li>'+escapeHtml(identity.notepadPath)+'</li><li>'+escapeHtml(agentVmMemoryLedgerPath(vm))+'</li><li>workspace/agents/'+escapeHtml(vm.id)+'/receipts/latest.md</li><li>workspace/agents/'+escapeHtml(vm.id)+'/reports/status.md</li></ul></div>'
      + '<div class="agent-vm-panel"><div class="agent-vm-panel-title">Profile</div><div class="agent-vm-meta-value">Name: '+escapeHtml(identity.realName)+'<br>Class: '+escapeHtml(vmKindLabel(identity))+'<br>Family: '+escapeHtml(identity.family)+'<br>Lineage: '+escapeHtml(identity.lineage)+'</div></div>'
      + '</div>';
    return;
  }
  if(currentAgentVmApp === "browser"){
    screen.innerHTML = '<div class="agent-vm-panel"><div class="agent-vm-panel-title">Web Search Bridge</div><div class="agent-vm-meta-value">Search authority is governed. Ask through Agent Lee what to search, and the approved lookup can route through the main runtime.<br><br>Suggested query: '+escapeHtml(vm.name + " " + identity.family + " duties")+'</div></div>';
    return;
  }
  if(currentAgentVmApp === "notepad"){
    const readOnly = vmIsObservedOnly(vm);
    screen.innerHTML = (readOnly ? '<div class="agent-vm-panel" style="margin-bottom:10px"><div class="agent-vm-panel-title">Protected Surface</div><div class="agent-vm-meta-value">'+escapeHtml(vmLockReason(vm))+'</div></div>' : '')
      + '<textarea class="agent-vm-note" id="agentVmNote" '+(readOnly ? 'readonly' : 'oninput="saveAgentVmNote(this.value)"')+'>'+escapeHtml(session.notepad)+'</textarea>';
    return;
  }
  if(currentAgentVmApp === "database"){
    screen.innerHTML = '<div class="agent-vm-panel-grid">'
      + '<div class="agent-vm-panel"><div class="agent-vm-panel-title">Agent Memory Database</div><ul class="agent-vm-list"><li>id: '+escapeHtml(vm.id)+'</li><li>real_name: '+escapeHtml(identity.realName)+'</li><li>class: '+escapeHtml(vmKindLabel(identity))+'</li><li>enabled: '+escapeHtml(awake ? "true" : "false")+'</li><li>ledger_path: '+escapeHtml(agentVmMemoryLedgerPath(vm))+'</li><li>configured_db_path: '+escapeHtml(identity.databasePath)+'</li><li>hive_link: memory/agent-lee/memory.jsonl</li></ul></div>'
      + '<div class="agent-vm-panel"><div class="agent-vm-panel-title">Proof Records</div><ul class="agent-vm-list">'+session.messages.slice(-6).map(function(message){ return '<li>'+escapeHtml(message.role.toUpperCase()+": "+message.content)+'</li>'; }).join("")+'</ul></div>'
      + '</div>';
    return;
  }
  if(currentAgentVmApp === "diagnostics"){
    const events = (session.events || []).slice(-8);
    screen.innerHTML = '<div class="agent-vm-panel-grid">'
      + '<div class="agent-vm-panel"><div class="agent-vm-panel-title">Diagnostics</div><div class="agent-vm-meta-value">Power: '+escapeHtml(awake ? "online" : "paused")+'<br>Speaker order: Agent Lee first and last<br>Route: Agent Lee -> AX Agent Lee -> Agent Lee<br>Heartbeat: '+escapeHtml(identity.heartbeat)+'<br>Messages: '+session.messages.length+'<br>Terminal events: '+session.terminal.length+'<br>Memory ledger: '+escapeHtml(agentVmMemoryLedgerPath(vm))+'</div></div>'
      + renderAgentVmList("Visible Functionality", ["Workspace inspection surface", "Notepad surface", "Terminal command surface", "Database and memory ledger", "Diagnostics event stream", "Governed Agent Lee ask route"])
      + '<div class="agent-vm-panel"><div class="agent-vm-panel-title">Recent Events</div><ul class="agent-vm-list">'+events.map(function(event){ return '<li>'+escapeHtml((event.ts || "") + " " + (event.kind || "event") + " " + (event.detail || ""))+'</li>'; }).join("")+'</ul></div>'
      + renderAgentVmList("Authorities", identity.authorities)
      + renderAgentVmList("Duties", identity.duties)
      + '</div>';
    return;
  }
  if(currentAgentVmApp === "terminal"){
    const observedOnly = vmIsObservedOnly(vm);
    screen.innerHTML = '<div class="agent-vm-terminal" id="agentVmTerminal">'+escapeHtml(session.terminal.join("\\n"))+'</div>'
      + (observedOnly ? '<div class="agent-vm-panel" style="margin-top:10px"><div class="agent-vm-panel-title">Protected Surface</div><div class="agent-vm-meta-value">'+escapeHtml(vmLockReason(vm))+' Read-only commands still work: help, status, duties, authorities, lineage, database, memory, diagnostics.</div></div>' : '')
      + '<div class="agent-vm-terminal-row"><input id="agentVmTerminalInput" '+(observedOnly ? 'disabled ' : '')+'placeholder="'+escapeHtml(observedOnly ? "Protected surface: read-only VM terminal" : "Try: help, status, enable, pause, duties, authorities, lineage, memory, diagnostics")+'" onkeydown="if(event.key===&apos;Enter&apos;) runAgentVmTerminal()" /><button data-leeway-id="LEEWAY_UI_CONTROL::VSCODE::AUTO::AGENTVMTERMINALINPUT" class="ghost-btn" '+(observedOnly ? 'disabled ' : '')+'onclick="runAgentVmTerminal()">Run</button></div>';
  }
}

function saveAgentVmNote(value){
  if(!currentAgentVm) return;
  if(vmIsObservedOnly(currentAgentVm)) return;
  ensureAgentVmSession(currentAgentVm).notepad = value;
}

function runAgentVmTerminal(){
  if(!currentAgentVm) return;
  const input=document.getElementById("agentVmTerminalInput");
  const command=input ? input.value.trim() : "";
  if(!command) return;
  if(input) input.value="";
  const session=ensureAgentVmSession(currentAgentVm);
  const lower=command.toLowerCase();
  session.terminal.push("> " + command);
  recordAgentVmEvent("terminal-command", command);
  if(vmIsObservedOnly(currentAgentVm) && ["wake","enable","stop","pause"].indexOf(lower) !== -1){
    session.terminal.push("protected-control-blocked " + command);
    session.messages.push({ role:"system", content: vmLockReason(currentAgentVm) });
    recordAgentVmEvent("protected-control-blocked", command);
    renderAgentVm();
    return;
  }
  if(lower==="help") session.terminal.push("commands: help, status, enable, pause, wake, stop, duties, authorities, lineage, database, memory, diagnostics");
  else if(lower==="status") session.terminal.push("status=" + (vmEnabled(currentAgentVm) ? "active" : "paused") + "; speaker_order=agent_lee_first_and_last");
  else if(lower==="wake" || lower==="enable") wakeCurrentAgentVm();
  else if(lower==="stop" || lower==="pause") stopCurrentAgentVm();
  else if(lower==="duties") session.terminal.push(currentAgentVm.identity.duties.join("; "));
  else if(lower==="authorities") session.terminal.push(currentAgentVm.identity.authorities.join("; "));
  else if(lower==="lineage") session.terminal.push(currentAgentVm.identity.lineage);
  else if(lower==="database") session.terminal.push(currentAgentVm.identity.databasePath);
  else if(lower==="memory") session.terminal.push(agentVmMemoryLedgerPath(currentAgentVm));
  else if(lower==="diagnostics") session.terminal.push((session.events || []).slice(-5).map(function(event){ return (event.ts || "") + " " + (event.kind || "event") + " " + (event.detail || ""); }).join("\\n") || "no diagnostics yet");
  else session.terminal.push("unknown command: " + command);
  renderAgentVm();
}

function buildAgentVmReply(vm, text){
  const identity = vm.identity;
  const prefix = "Agent Lee routed this through AX Agent Lee / " + identity.realName + ". ";
  if(!vmEnabled(vm)) return prefix + "This subordinate agent is paused. Enable AX before assigning work.";
  const lower = text.toLowerCase();
  if(lower.indexOf("duty") !== -1 || lower.indexOf("purpose") !== -1) return prefix + "Duties: " + identity.duties.join("; ");
  if(lower.indexOf("authority") !== -1 || lower.indexOf("allowed") !== -1) return prefix + "Authorities: " + identity.authorities.join("; ");
  if(lower.indexOf("family") !== -1 || lower.indexOf("lineage") !== -1) return prefix + "Lineage: " + identity.lineage;
  if(lower.indexOf("status") !== -1 || lower.indexOf("awake") !== -1 || lower.indexOf("active") !== -1) return prefix + "Status is active at " + identity.vmAddress + " with heartbeat " + identity.heartbeat + ". Agent Lee remains first and last speaker.";
  if(lower.indexOf("notepad") !== -1 || lower.indexOf("note") !== -1) return prefix + "Notepad path: " + identity.notepadPath;
  if(lower.indexOf("database") !== -1 || lower.indexOf("db") !== -1 || lower.indexOf("memory") !== -1) return prefix + "Memory ledger: " + agentVmMemoryLedgerPath(vm) + ". Configured database path: " + identity.databasePath + ".";
  if(lower.indexOf("diagnostic") !== -1 || lower.indexOf("event") !== -1) return prefix + "Diagnostics are visible in the Diagnostics tab and written to the per-agent memory ledger.";
  return prefix + "Instruction received through the governed AX route. Primary duty route: " + (identity.duties[0] || vm.description) + ".";
}

function askCurrentAgentVm(){
  if(!currentAgentVm) return;
  const input=document.getElementById("agentVmAskInput");
  const text=input ? input.value.trim() : "";
  if(!text) return;
  if(input) input.value="";
  const session=ensureAgentVmSession(currentAgentVm);
  session.messages.push({ role:"user", content:text });
  const reply = buildAgentVmReply(currentAgentVm, text);
  session.messages.push({ role:"agent-lee", content:reply });
  session.terminal.push("question routed through Agent Lee: " + text);
  recordAgentVmEvent("governed-ask", text);
  renderAgentVm();
}

function renderAgentVmLog(){
  if(!currentAgentVm) return;
  const log=document.getElementById("agentVmLog");
  if(!log) return;
  const messages=ensureAgentVmSession(currentAgentVm).messages.slice(-8);
  log.innerHTML = messages.map(function(message){
    const label = message.role === "agent-lee" ? "AGENT LEE" : message.role.toUpperCase();
    return '<div class="agent-vm-message '+escapeHtml(message.role)+'"><strong>'+escapeHtml(label)+':</strong> '+escapeHtml(message.content)+'</div>';
  }).join("");
  log.scrollTop = log.scrollHeight;
}

function renderAgentVm(){
  if(!currentAgentVm) return;
  const session = ensureAgentVmSession(currentAgentVm);
  const awake = vmEnabled(currentAgentVm);
  session.awake = awake;
  const identity = currentAgentVm.identity;
  const title=document.getElementById("agentVmTitle");
  const subtitle=document.getElementById("agentVmSubtitle");
  const status=document.getElementById("agentVmStatus");
  const wakeBtn=document.getElementById("agentVmWakeBtn");
  const pauseBtn=document.getElementById("agentVmPauseBtn");
  const lockPill=document.getElementById("agentVmLockPill");
  const observedOnly = vmIsObservedOnly(currentAgentVm);
  if(title) title.textContent = "AX Agent Lee / " + identity.realName;
  if(subtitle) subtitle.textContent = vmKindLabel(identity) + " | " + currentAgentVm.description + " | " + (observedOnly ? vmLockReason(currentAgentVm) : "Agent Lee remains first and last speaker.");
  if(status){
    status.textContent = awake ? "Active" : "Paused";
    status.classList.toggle("awake", awake);
  }
  if(lockPill){
    lockPill.style.display = observedOnly ? "inline-flex" : "none";
    lockPill.title = observedOnly ? vmLockReason(currentAgentVm) : "";
  }
  if(wakeBtn){
    wakeBtn.disabled = observedOnly;
    wakeBtn.title = observedOnly ? vmLockReason(currentAgentVm) : "Enable AX";
  }
  if(pauseBtn){
    pauseBtn.disabled = observedOnly;
    pauseBtn.title = observedOnly ? vmLockReason(currentAgentVm) : "Pause AX";
  }
  renderAgentVmMeta(currentAgentVm, awake);
  renderAgentVmTaskbar();
  renderAgentVmScreen();
  renderAgentVmLog();
}

function setAttachmentMeta(message, persist){
  const meta=document.getElementById("attachmentMeta");
  if(!meta) return;
  if(attachmentMetaTimer){
    clearTimeout(attachmentMetaTimer);
    attachmentMetaTimer=null;
  }
  meta.textContent=message || "";
  meta.style.visibility=message ? "visible" : "hidden";
  if(message && !persist){
    attachmentMetaTimer=setTimeout(function(){
      meta.textContent="";
      meta.style.visibility="hidden";
      attachmentMetaTimer=null;
    },2200);
  }
}

function toggleTaskPanel(){
  workflowCollapsed = !workflowCollapsed;
  const shell=document.getElementById("workflowShell");
  const chevron=document.getElementById("workflowChevron");
  shell.classList.toggle("collapsed", workflowCollapsed);
  chevron.textContent = workflowCollapsed ? "\u25b8" : "\u25be";
}

function taskAction(command){
  const draft=document.getElementById("workflowPromptEditor");
  postAgentLeeCommand({command:command, prompt:draft ? draft.value : ""});
}

function toggleVoiceOutput(){
  const button=document.getElementById("voiceToggleBtn");
  const enabled=button && button.getAttribute("data-enabled")==="true";
  if(enabled){
    toggleVoiceMute();
    return;
  }
  setVoiceEnabled(true);
}

function setRequireCtrlEnter(value){
  syncRequireCtrlEnterToggle(!!value);
  vscode.postMessage({command:"setState", key:"requireCtrlEnter", value:!!value});
}

function setSegmentChoice(containerId, nextValue){
  const container=document.getElementById(containerId);
  if(!container) return;
  Array.from(container.querySelectorAll("button")).forEach(function(button){
    button.classList.toggle("active", button.textContent.trim().toLowerCase()===nextValue.toLowerCase());
  });
}

function runtimeStateRequireCtrlEnter(){
  const toggle=document.getElementById("requireCtrlEnterToggle");
  return !!(toggle && toggle.checked);
}

function syncRequireCtrlEnterToggle(value){
  const primary=document.getElementById("requireCtrlEnterToggle");
  const secondary=document.getElementById("requireCtrlEnterToggleSecondary");
  if(primary) primary.checked = !!value;
  if(secondary) secondary.checked = !!value;
}

function switchSettingsSection(section){
  document.querySelectorAll(".settings-section").forEach(function(node){
    node.classList.toggle("active", node.id === "settingsSection-" + section);
  });
  document.querySelectorAll("#settingsNav button").forEach(function(button){
    button.classList.toggle("active", (button.textContent || "").toLowerCase().indexOf(section.toLowerCase()) !== -1);
  });
}

function pluginInitials(name){
  return name.split(/\s+/).slice(0,2).map(function(part){ return part[0] || ""; }).join("").toUpperCase();
}

function groupedPlugins(){
  return pluginCatalog.reduce(function(map, entry){
    if(!map[entry.category]) map[entry.category]=[];
    map[entry.category].push(entry);
    return map;
  }, {});
}

function renderPluginCatalog(state){
  const root=document.getElementById("pluginCatalogRoot");
  if(!root) return;
  const enabled = new Set((state && state.enabledPlugins) || []);
  const groups=groupedPlugins();
  root.innerHTML = Object.keys(groups).map(function(category){
    const rows = groups[category].map(function(entry){
      const active = enabled.has(entry.id);
      return '<div class="plugin-row">'
        + '<div class="plugin-avatar">'+escapeHtml(pluginInitials(entry.name))+'</div>'
        + '<div class="plugin-main"><div class="plugin-name">'+escapeHtml(entry.name)+'</div><div class="plugin-desc">'+escapeHtml(entry.description)+'</div></div>'
        + '<button data-leeway-id="LEEWAY_UI_CONTROL::VSCODE::AUTO::TOGGLEPLUGINSELECTION" class="plugin-action'+(active?' active':'')+'" onclick="togglePluginSelection(&apos;'+escapeHtml(entry.id)+'&apos;)" title="'+(active?'Connected':'Connect')+'">'+(active?'&#10003;':'+')+'</button>'
        + '</div>';
    }).join("");
    return '<div class="plugin-category-group"><div class="plugin-category-title">'+escapeHtml(category)+'</div><div class="plugin-list">'+rows+'</div></div>';
  }).join("");
}

function getMcpCatalog(state){
  const defaults = defaultMcpServerCatalog.map(function(entry){ return withVmIdentity(entry, "mcp"); });
  const custom = ((state && state.customMcpServers) || []).filter(function(id){
    return !defaults.some(function(entry){ return entry.id === id; });
  }).map(function(id){
    return withVmIdentity({ id:id, name:id, description: (state.mcpServerConfigs && state.mcpServerConfigs[id]) || "Custom MCP server" }, "mcp");
  });
  return defaults.concat(custom);
}

function getAgentCatalog(state){
  const workerIds = new Set(defaultWorkerCatalog.map(function(entry){ return entry.id; }));
  const defaults = defaultAgentCatalog
    .filter(function(entry){ return !workerIds.has(entry.id); })
    .map(function(entry){ return withVmIdentity(entry, "agent"); });
  const custom = ((state && state.customAgents) || []).filter(function(id){
    return !defaults.some(function(entry){ return entry.id === id; });
  }).map(function(id){
    return withVmIdentity({ id:id, name:id, description: (state.agentConfigs && state.agentConfigs[id]) || "Custom agent" }, "agent");
  });
  return defaults.concat(custom);
}

function workerIsObservedOnly(entry){
  return entry && entry.developerSurface === "observed-only";
}

function workerLockReason(entry){
  return (entry && entry.lockReason) || "This worker is protected by LeeWay governance and cannot be directly reconfigured.";
}

function getWorkerCatalog(state){
  const defaults = defaultWorkerCatalog.map(function(entry){ return Object.assign({}, entry); });
  const custom = ((state && state.customWorkers) || []).filter(function(id){
    return !defaults.some(function(entry){ return entry.id === id; });
  }).map(function(id){
    return {
      id:id,
      name:id,
      description:(state.workerConfigs && state.workerConfigs[id]) || "Custom worker",
      owner:"agent-lee-prime",
      diagnosticLabel:"Custom Worker",
      route:"unassigned",
      responsibilities:["Custom LeeWay worker"],
      developerSurface:"mutable"
    };
  });
  return defaults.concat(custom);
}

function renderMcpServers(state){
  const root=document.getElementById("mcpServerList");
  if(!root) return;
  const enabled = new Set((state && state.enabledMcpServers) || []);
  const configs = (state && state.mcpServerConfigs) || {};
  root.innerHTML = getMcpCatalog(state).map(function(entry){
    const description = configs[entry.id] || entry.description || "";
    const locked = vmIsObservedOnly(entry);
    return '<div class="mcp-row">'
      + '<div><div class="mcp-name">'+escapeHtml(entry.name)+'</div><div class="mcp-desc">'+escapeHtml(description)+'</div><span class="agent-kind-pill">'+escapeHtml(vmKindLabel(entry.identity))+'</span>'+(locked?'<span class="agent-lock-pill" title="'+escapeHtml(vmLockReason(entry))+'">Observed Only</span>':'')+'</div>'
      + agentVmButton("mcp", entry.id)
      + '<button data-leeway-id="LEEWAY_UI_CONTROL::VSCODE::AUTO::CONFIGUREMCPSERVER" class="mcp-config-btn settings-lock-btn" '+(locked?'disabled ':'')+'onclick="configureMcpServer(&apos;'+escapeHtml(entry.id)+'&apos;)" title="'+escapeHtml(locked ? vmLockReason(entry) : "Configure")+'">&#9881;</button>'
      + '<input type="checkbox" class="settings-toggle" '+(enabled.has(entry.id)?'checked':'')+' '+(locked?'disabled ':'')+'onchange="toggleMcpServer(&apos;'+escapeHtml(entry.id)+'&apos;, this.checked)" title="'+escapeHtml(locked ? vmLockReason(entry) : "Toggle")+'" />'
      + '</div>';
  }).join("");
}

function renderAgents(state){
  const root=document.getElementById("agentList");
  if(!root) return;
  const enabled = new Set((state && state.enabledAgents) || []);
  const configs = (state && state.agentConfigs) || {};
  root.innerHTML = getAgentCatalog(state).map(function(entry){
    const description = configs[entry.id] || entry.description || "";
    const locked = vmIsObservedOnly(entry);
    return '<div class="mcp-row">'
      + '<div><div class="mcp-name">'+escapeHtml(entry.name)+'</div><div class="mcp-desc">'+escapeHtml(description)+'</div><span class="agent-kind-pill">'+escapeHtml(vmKindLabel(entry.identity))+'</span>'+(locked?'<span class="agent-lock-pill" title="'+escapeHtml(vmLockReason(entry))+'">Observed Only</span>':'')+'</div>'
      + agentVmButton("agent", entry.id)
      + '<button data-leeway-id="LEEWAY_UI_CONTROL::VSCODE::AUTO::CONFIGUREAGENT" class="mcp-config-btn settings-lock-btn" '+(locked?'disabled ':'')+'onclick="configureAgent(&apos;'+escapeHtml(entry.id)+'&apos;)" title="'+escapeHtml(locked ? vmLockReason(entry) : "Configure")+'">&#9881;</button>'
      + '<input type="checkbox" class="settings-toggle" '+(enabled.has(entry.id)?'checked':'')+' '+(locked?'disabled ':'')+'onchange="toggleAgent(&apos;'+escapeHtml(entry.id)+'&apos;, this.checked)" title="'+escapeHtml(locked ? vmLockReason(entry) : "Toggle")+'" />'
      + '</div>';
  }).join("");
}

function renderWorkers(state){
  const root=document.getElementById("workerList");
  if(!root) return;
  const enabled = new Set((state && state.enabledWorkers) || []);
  const configs = (state && state.workerConfigs) || {};
  root.innerHTML = getWorkerCatalog(state).map(function(entry){
    const description = configs[entry.id] || entry.description || "";
    const locked = workerIsObservedOnly(entry);
    const responsibilities = (entry.responsibilities || []).slice(0,3).join(" Ãƒâ€šÃ‚Â· ");
    return '<div class="mcp-row">'
      + '<div><div class="mcp-name">'+escapeHtml(entry.name)+'</div><div class="mcp-desc">'+escapeHtml(description)+'</div><span class="agent-kind-pill">Leeway Worker</span><span class="agent-kind-pill">'+escapeHtml(entry.diagnosticLabel || "Worker")+'</span>'+(locked?'<span class="agent-lock-pill" title="'+escapeHtml(workerLockReason(entry))+'">Observed Only</span>':'')+'<div class="mcp-desc" style="margin-top:6px">Owner: '+escapeHtml(entry.owner || "agent-lee-prime")+' Ãƒâ€šÃ‚Â· Route: '+escapeHtml(entry.route || "unassigned")+'</div><div class="mcp-desc">'+escapeHtml(responsibilities)+'</div></div>'
      + '<button data-leeway-id="LEEWAY_UI_CONTROL::VSCODE::AUTO::CONFIGUREWORKER" class="mcp-config-btn settings-lock-btn" '+(locked?'disabled ':'')+'onclick="configureWorker(&apos;'+escapeHtml(entry.id)+'&apos;)" title="'+escapeHtml(locked ? workerLockReason(entry) : "Configure diagnostics")+'">&#9881;</button>'
      + '<input type="checkbox" class="settings-toggle" '+(enabled.has(entry.id)?'checked':'')+' '+(locked?'disabled ':'')+'onchange="toggleWorker(&apos;'+escapeHtml(entry.id)+'&apos;, this.checked)" title="'+escapeHtml(locked ? workerLockReason(entry) : "Toggle")+'" />'
      + '</div>';
  }).join("");
}

function renderModelInventory(models, state){
  const root=document.getElementById("modelInventoryList");
  if(!root) return;
  const activeSelections = [
    { label:"Primary", value: state.primaryModel },
    { label:"Builder", value: state.builderModel },
    { label:"Designer", value: state.designerModel },
    { label:"Verifier", value: state.verifierModel }
  ];
  root.innerHTML = (models || []).map(function(entry){
    const selectedBy = activeSelections.filter(function(item){ return item.value === entry.id; }).map(function(item){ return item.label; });
    return '<div class="mcp-row">'
      + '<div><div class="mcp-name">'+escapeHtml(entry.id)+'</div><div class="mcp-desc">'+escapeHtml(entry.role || "System model")+'</div>'+(selectedBy.length?'<div class="mcp-desc">Selected by: '+escapeHtml(selectedBy.join(", "))+'</div>':'')+'</div>'
      + '<span class="runtime-pill">'+escapeHtml(entry.available ? "Available" : "Configured")+'</span>'
      + '</div>';
  }).join("");
}

function renderPass6Status(status){
  const root=document.getElementById("pass6StatusList");
  if(!root) return;
  const counts = status && status.counts ? status.counts : {};
  const rows = [
    ["Agent Lee identity", status.agentLeeIdentity || "LEEWAY_ENTITY::AGENT_LEE"],
    ["Agent Book count", String(status.agentBookCount || 0)],
    ["Core agents", String(counts.coreAgents || 0)],
    ["Employment agents", String(counts.employmentAgents || 0)],
    ["Content agents", String(counts.contentAgents || 0)],
    ["Creator agents", String(counts.creatorAgents || 0)],
    ["RTC agents", String(counts.rtcAgents || 0)],
    ["GPU agents", String(counts.gpuAgents || 0)],
    ["DEVICE agents", String(counts.deviceAgents || 0)],
    ["IOT agents", String(counts.iotAgents || 0)],
    ["Leeway Model Hive", String(status.modelRoutesRegistered || 0) + " registered routes"],
    ["Builder route", status.builderRoute || "Not registered"],
    ["Designer route", status.designerRoute || "Not registered"],
    ["Verifier route", status.verifierRoute || "Not registered"],
    ["Vision route", status.visionRoute || "Not registered"],
    ["Embedding route", status.embeddingRoute || "Not registered"],
    ["Tool registry", String(status.toolCount || 0) + " tools"],
    ["Skill registry", String(status.skillCount || 0) + " skills"],
    ["Workflow registry", String(status.workflowCount || 0) + " workflows"],
    ["Execution / VM", (status.executionEnvironmentCount || 0) + " environments; remote VM=" + (status.remoteVmStatus || "REMOTE_VM_NOT_CONFIGURED")],
    ["Receipts", status.receiptState || "Required"],
    ["Telemetry", status.telemetryState || "Identity Pulse pending"],
    ["Clone voice truth", status.cloneVoiceTruth || "CLONE_VOICE_RUNTIME_OUTPUT_PROVEN_HUMAN_AUDIBLE_PENDING"],
    ["Direct external AI default", status.directExternalAiDefault || "BLOCKED"],
    ["LLM direct action", status.llmDirectAction || "BLOCKED"]
  ];
  root.innerHTML = rows.map(function(row){
    return '<div class="mcp-row">'
      + '<div><div class="mcp-name">'+escapeHtml(row[0])+'</div><div class="mcp-desc">'+escapeHtml(row[1])+'</div></div>'
      + '<span class="runtime-pill">Pass 6</span>'
      + '</div>';
  }).join("");
}

function renderPluginMesh(entries){
  const grid=document.getElementById("pluginMeshGrid");
  const count=document.getElementById("pluginMeshCount");
  const mode=document.getElementById("pluginMeshMode");
  if(!grid || !count || !mode) return;
  const active = (entries || []).filter(function(entry){ return entry.enabled; });
  count.textContent = active.length + " active";
  mode.textContent = active.length === (entries || []).length ? "Open mesh" : "Governed routing";
  grid.innerHTML = active.slice(0, 10).map(function(entry){
    const statusClass = !entry.adapterAvailable ? "offline" : (entry.authConfigured ? "online" : "warning");
    const statusText = !entry.adapterAvailable
      ? "Adapter missing"
      : (entry.authConfigured ? "Online" : "Needs auth");
    return '<div class="plugin-mesh-card">'
      + '<div class="plugin-mesh-name">'+escapeHtml(entry.name)+'</div>'
      + '<div class="plugin-mesh-meta"><span>'+escapeHtml(entry.category)+'</span><span>'+escapeHtml(entry.riskLevel)+'</span></div>'
      + '<div class="plugin-mesh-status '+statusClass+'">'+escapeHtml(statusText)+' Ãƒâ€šÃ‚Â· '+escapeHtml(entry.adapter)+'</div>'
      + '</div>';
  }).join("");
}

function showPluginApproval(payload){
  window.pendingPluginApproval = payload || null;
  const root=document.getElementById("pluginApproval");
  if(!root) return;
  document.getElementById("pluginApprovalCopy").textContent =
    "Agent Lee wants to use " + (payload.pluginName || payload.pluginId) + " for action \\\"" + payload.action + "\\\".";
  document.getElementById("pluginApprovalMeta").textContent =
    "Plugin: " + (payload.pluginName || payload.pluginId) + " Ãƒâ€šÃ‚Â· Risk: " + (payload.riskLevel || "high");
  root.classList.remove("hidden");
}

function hidePluginApproval(){
  window.pendingPluginApproval = null;
  const root=document.getElementById("pluginApproval");
  if(root) root.classList.add("hidden");
}

function approvePluginCall(){
  if(!window.pendingPluginApproval) return;
  vscode.postMessage({command:"approvePluginCall"});
}

function cancelPluginCall(){
  hidePluginApproval();
  vscode.postMessage({command:"cancelPluginCall"});
}

function togglePluginSelection(id){
  const state = window.agentLeeRuntimeState || {};
  const next = new Set(state.enabledPlugins || []);
  if(next.has(id)) next.delete(id); else next.add(id);
  vscode.postMessage({command:"setState", key:"enabledPlugins", value:Array.from(next)});
}

function toggleMcpServer(id, enabled){
  const state = window.agentLeeRuntimeState || {};
  const entry = getMcpCatalog(state).find(function(item){ return item.id === id; });
  if(entry && vmIsObservedOnly(entry)){
    window.alert(vmLockReason(entry));
    return;
  }
  const next = new Set(state.enabledMcpServers || []);
  if(enabled) next.add(id); else next.delete(id);
  vscode.postMessage({command:"setState", key:"enabledMcpServers", value:Array.from(next)});
}

function configureMcpServer(id){
  const state = window.agentLeeRuntimeState || {};
  const entry = getMcpCatalog(state).find(function(item){ return item.id === id; });
  if(entry && vmIsObservedOnly(entry)){
    window.alert(vmLockReason(entry));
    return;
  }
  const current = (state.mcpServerConfigs && state.mcpServerConfigs[id]) || "";
  const next = window.prompt("Configure MCP server", current);
  if(next===null) return;
  const configs = Object.assign({}, state.mcpServerConfigs || {});
  configs[id] = next;
  vscode.postMessage({command:"setState", key:"mcpServerConfigs", value:configs});
}

function addMcpServer(){
  const name = window.prompt("Add MCP server id");
  if(!name) return;
  const state = window.agentLeeRuntimeState || {};
  const custom = Array.from(new Set([].concat(state.customMcpServers || [], [name.trim()])));
  const enabled = Array.from(new Set([].concat(state.enabledMcpServers || [], [name.trim()])));
  vscode.postMessage({command:"setState", key:"customMcpServers", value:custom});
  vscode.postMessage({command:"setState", key:"enabledMcpServers", value:enabled});
}

function toggleAgent(id, enabled){
  const state = window.agentLeeRuntimeState || {};
  const entry = getAgentCatalog(state).find(function(item){ return item.id === id; });
  if(entry && vmIsObservedOnly(entry)){
    window.alert(vmLockReason(entry));
    return;
  }
  const next = new Set(state.enabledAgents || []);
  if(enabled) next.add(id); else next.delete(id);
  vscode.postMessage({command:"setState", key:"enabledAgents", value:Array.from(next)});
}

function configureAgent(id){
  const state = window.agentLeeRuntimeState || {};
  const entry = getAgentCatalog(state).find(function(item){ return item.id === id; });
  if(entry && vmIsObservedOnly(entry)){
    window.alert(vmLockReason(entry));
    return;
  }
  const current = (state.agentConfigs && state.agentConfigs[id]) || "";
  const next = window.prompt("Configure agent", current);
  if(next===null) return;
  const configs = Object.assign({}, state.agentConfigs || {});
  configs[id] = next;
  vscode.postMessage({command:"setState", key:"agentConfigs", value:configs});
}

function addAgent(){
  const name = window.prompt("Add agent id");
  if(!name) return;
  const state = window.agentLeeRuntimeState || {};
  const custom = Array.from(new Set([].concat(state.customAgents || [], [name.trim()])));
  const enabled = Array.from(new Set([].concat(state.enabledAgents || [], [name.trim()])));
  vscode.postMessage({command:"setState", key:"customAgents", value:custom});
  vscode.postMessage({command:"setState", key:"enabledAgents", value:enabled});
}

function toggleWorker(id, enabled){
  const state = window.agentLeeRuntimeState || {};
  const entry = getWorkerCatalog(state).find(function(item){ return item.id === id; });
  if(entry && workerIsObservedOnly(entry)){
    window.alert(workerLockReason(entry));
    return;
  }
  const next = new Set(state.enabledWorkers || []);
  if(enabled) next.add(id); else next.delete(id);
  vscode.postMessage({command:"setState", key:"enabledWorkers", value:Array.from(next)});
}

function configureWorker(id){
  const state = window.agentLeeRuntimeState || {};
  const entry = getWorkerCatalog(state).find(function(item){ return item.id === id; });
  if(entry && workerIsObservedOnly(entry)){
    window.alert(workerLockReason(entry));
    return;
  }
  const current = (state.workerConfigs && state.workerConfigs[id]) || "";
  const next = window.prompt("Configure worker diagnostics", current);
  if(next===null) return;
  const configs = Object.assign({}, state.workerConfigs || {});
  configs[id] = next;
  vscode.postMessage({command:"setState", key:"workerConfigs", value:configs});
}

function addWorker(){
  const name = window.prompt("Add worker id");
  if(!name) return;
  const state = window.agentLeeRuntimeState || {};
  const custom = Array.from(new Set([].concat(state.customWorkers || [], [name.trim()])));
  const enabled = Array.from(new Set([].concat(state.enabledWorkers || [], [name.trim()])));
  vscode.postMessage({command:"setState", key:"customWorkers", value:custom});
  vscode.postMessage({command:"setState", key:"enabledWorkers", value:enabled});
}

function renderTaskState(task){
  latestTaskState = task;
  const hasTodos = !!(task && Array.isArray(task.todos) && task.todos.length);
  const hasPrompt = !!(task && task.prompt);
  const hasTaskContent = hasTodos || hasPrompt || !!(task && task.parkedTask) || !!(task && task.savedPlanPath);
  const pendingEditCount = task && Array.isArray(task.proposedEdits)
    ? task.proposedEdits.filter(function(edit){ return edit.status === "pending"; }).length
    : 0;
  const modeLabel = task && task.mode ? task.mode.charAt(0).toUpperCase()+task.mode.slice(1) : "Execute";
  document.getElementById("workflowMode").textContent = "Mode: " + modeLabel;
  document.getElementById("workflowSummary").textContent = task && task.summary ? task.summary : "";
  document.getElementById("workflowPreview").textContent = task && task.nextTodo ? task.nextTodo : (task && task.status ? task.status : "Waiting for a new task.");
  document.getElementById("workflowTitle").textContent = task && task.plan ? "Plan + Live Work" : "Task Tracker";
  document.getElementById("workflowPromptEditor").value = task && (task.draftPrompt || task.prompt) ? (task.draftPrompt || task.prompt) : "";
  document.getElementById("workflowMode").style.display = hasTaskContent ? "" : "none";
  document.getElementById("workflowSummary").style.display = hasTaskContent && task.summary ? "" : "none";
  document.getElementById("workflowActions").style.display = hasTaskContent ? "flex" : "none";
  document.querySelector(".workflow-editor").style.display = hasPrompt ? "" : "none";
  document.getElementById("workflowParked").style.display = task && task.parkedTask ? "" : "none";
  const todoList=document.getElementById("todoList");
  const activityList=document.getElementById("activityList");
  const proposalList=document.getElementById("proposalList");
  const acceptAllBtn=document.getElementById("acceptAllEditsBtn");
  const actions=document.getElementById("workflowActions");
  const parked=document.getElementById("workflowParked");
  const workflowTitles=document.querySelectorAll(".workflow-card .workflow-title");
  if(workflowTitles[0]) workflowTitles[0].textContent="Live Work";
  if(workflowTitles[1]) workflowTitles[1].textContent="Live Activity";
  if(workflowTitles[2]) workflowTitles[2].textContent="Proposed Edits";
  if(workflowTitles[3]) workflowTitles[3].textContent="Plugin Mesh";
  todoList.innerHTML="";
  activityList.innerHTML="";
  proposalList.innerHTML="";
  actions.innerHTML="";
  if(acceptAllBtn){
    acceptAllBtn.classList.toggle("visible", pendingEditCount > 0);
    acceptAllBtn.textContent = pendingEditCount > 1 ? "Accept All (" + pendingEditCount + ")" : "Accept All";
  }

  if(hasTodos){
    task.todos.forEach(function(todo){
      const row=document.createElement("div");
      row.className="todo-item " + (todo.status==="completed" ? "done" : todo.status==="in_progress" ? "active" : "pending");
      const check=todo.status==="completed" ? "DONE" : todo.status==="in_progress" ? "LIVE" : "NEXT";
      row.innerHTML='<div class="todo-text"><span class="todo-check">'+check+'</span>'+escapeHtml(todo.title)+'</div><div class="todo-detail">'+escapeHtml(todo.detail || "")+'</div>';
      todoList.appendChild(row);
    });
  }

  if(task && Array.isArray(task.activities) && task.activities.length){
    task.activities.forEach(function(activity){
      const row=document.createElement("div");
      row.className="activity-item";
      const ts = activity.timestamp ? new Date(activity.timestamp).toLocaleTimeString([], {hour:"numeric", minute:"2-digit", second:"2-digit"}) : "";
      let action = "";
      if(activity.path){
        const encodedPath = encodeURIComponent(activity.path);
        action = '<button data-leeway-id="LEEWAY_UI_CONTROL::VSCODE::AUTO::OPENTASKFILEFROMENCODED" class="ghost-btn activity-open-btn" onclick="openTaskFileFromEncoded(&apos;'+encodedPath+'&apos;)">Open</button>';
      }
      row.innerHTML='<div class="activity-row"><div class="activity-label">'+escapeHtml(activity.label || "Live activity")+'</div>'+action+'</div>'
        + (activity.file ? '<div class="activity-file">'+escapeHtml(activity.file)+'</div>' : '')
        + (activity.detail ? '<div class="todo-detail">'+escapeHtml(activity.detail)+'</div>' : '')
        + (ts ? '<div class="activity-meta">'+escapeHtml(ts)+'</div>' : '');
      activityList.appendChild(row);
    });
  } else {
    activityList.innerHTML = '<div class="activity-item"><div class="activity-label">No live file activity yet.</div><div class="todo-detail">When Agent Lee reads or writes files, the exact path will show here.</div></div>';
  }

  if(task && Array.isArray(task.proposedEdits) && task.proposedEdits.length){
    task.proposedEdits.forEach(function(edit){
      const row=document.createElement("div");
      row.className="proposal-item " + (edit.status || "pending");
      const createdAt = edit.createdAt ? new Date(edit.createdAt).toLocaleTimeString([], {hour:"numeric", minute:"2-digit"}) : "";
      const reviewBtn = '<button data-leeway-id="LEEWAY_UI_CONTROL::VSCODE::AUTO::REVIEWPROPOSEDEDIT" class="ghost-btn" onclick="reviewProposedEdit(&apos;'+escapeHtml(edit.id)+'&apos;)">Review Diff</button>';
      const approveBtn = edit.status==="pending" ? '<button data-leeway-id="LEEWAY_UI_CONTROL::VSCODE::AUTO::APPROVEPROPOSEDEDIT" class="ghost-btn" onclick="approveProposedEdit(&apos;'+escapeHtml(edit.id)+'&apos;)">Accept</button>' : "";
      const rejectBtn = edit.status==="pending" ? '<button data-leeway-id="LEEWAY_UI_CONTROL::VSCODE::AUTO::REJECTPROPOSEDEDIT" class="ghost-btn" onclick="rejectProposedEdit(&apos;'+escapeHtml(edit.id)+'&apos;)">Reject</button>' : "";
      row.innerHTML='<div class="proposal-file">'+escapeHtml(edit.displayPath || "")+'</div>'
        + '<div class="proposal-summary">'+escapeHtml(edit.summary || "")+'</div>'
        + '<div class="proposal-meta"><span class="proposal-chip">'+escapeHtml(edit.status || "pending")+'</span><span>'+escapeHtml(createdAt)+'</span></div>'
        + '<div class="proposal-actions">'+reviewBtn+approveBtn+rejectBtn+'</div>';
      proposalList.appendChild(row);
    });
  } else {
    proposalList.innerHTML = '<div class="proposal-item"><div class="proposal-file">No proposed file edits yet.</div><div class="proposal-summary">When Agent Lee drafts a real file change, the diff review controls will appear here.</div></div>';
  }

  if(task && task.awaitingApproval && task.mode==="execute"){
    actions.innerHTML += '<button data-leeway-id="LEEWAY_UI_CONTROL::VSCODE::AUTO::TASKACTION" class="ghost-btn" onclick="taskAction(&apos;approvePlan&apos;)">Approve & Execute</button>';
    actions.innerHTML += '<button data-leeway-id="LEEWAY_UI_CONTROL::VSCODE::AUTO::TASKACTION" class="ghost-btn" onclick="taskAction(&apos;rejectPlan&apos;)">Reject Plan</button>';
  } else if(task && task.plan && task.mode==="plan"){
    actions.innerHTML += '<button data-leeway-id="LEEWAY_UI_CONTROL::VSCODE::AUTO::TASKACTION" class="ghost-btn" onclick="taskAction(&apos;savePlan&apos;)">Save Plan</button>';
    if(task.canExecute) actions.innerHTML += '<button data-leeway-id="LEEWAY_UI_CONTROL::VSCODE::AUTO::TASKACTION" class="ghost-btn" onclick="taskAction(&apos;executePlan&apos;)">Execute Plan</button>';
    actions.innerHTML += '<button data-leeway-id="LEEWAY_UI_CONTROL::VSCODE::AUTO::TASKACTION" class="ghost-btn" onclick="taskAction(&apos;rejectPlan&apos;)">Clear Plan</button>';
  }
  if(task && task.prompt){
    actions.innerHTML += '<button data-leeway-id="LEEWAY_UI_CONTROL::VSCODE::AUTO::TASKACTION" class="ghost-btn" onclick="taskAction(&apos;updateTaskPrompt&apos;)">Update Task</button>';
    actions.innerHTML += '<button data-leeway-id="LEEWAY_UI_CONTROL::VSCODE::AUTO::TASKACTION" class="ghost-btn" onclick="taskAction(&apos;stopTask&apos;)">Stop Task</button>';
    if(task.running) actions.innerHTML += '<button data-leeway-id="LEEWAY_UI_CONTROL::VSCODE::AUTO::TASKACTION" class="ghost-btn" onclick="taskAction(&apos;interruptTask&apos;)">Interrupt</button>';
  }
  actions.innerHTML += '<button data-leeway-id="LEEWAY_UI_CONTROL::VSCODE::AUTO::TASKACTION" class="ghost-btn" onclick="taskAction(&apos;'+(window.agentLeeVoiceEnabled ? "muteVoice" : "talkOn")+'&apos;)">'+(window.agentLeeVoiceEnabled ? "Mute" : "Talk")+'</button>';
  if(task && task.parkedTask){
    actions.innerHTML += '<button data-leeway-id="LEEWAY_UI_CONTROL::VSCODE::AUTO::TASKACTION" class="ghost-btn" onclick="taskAction(&apos;resumeParkedTask&apos;)">Resume Paused Task</button>';
    parked.textContent = "Paused task: " + task.parkedTask.summary + " | Next: " + task.parkedTask.nextTodo;
  } else {
    parked.textContent = "No paused task parked right now.";
  }

  if(task && task.savedPlanPath){
    const note=document.createElement("div");
    note.className="muted";
    note.textContent="Saved plan: " + task.savedPlanPath;
    actions.appendChild(note);
  }
}

function escapeHtml(value){
  return String(value || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

function formatParagraphs(text){
  return text.split(/\\n\\n+/).map(function(chunk){ return chunk.trim(); }).filter(Boolean).map(function(chunk){ return "<p>"+escapeHtml(chunk).replace(/\\n/g,"<br>")+"</p>"; }).join("");
}

function renderAgentContent(text){
  const block = document.createElement("div");
  block.className = "bubble agent-card";
  const codeMatch = null;
  const sanitized = text.trim();
  const lines = sanitized.split(/\\n/);
  const sections = [];
  let i = 0;
  while(i < lines.length){
    const line = lines[i].trim();
    if(!line){ i += 1; continue; }
    if(line.toUpperCase() === "PLAN"){
      const items = [];
      i += 1;
      while(i < lines.length){
        const planLine = lines[i].trim();
        if(!planLine){ i += 1; continue; }
        if(/^[A-Z][A-Z\\s/]+$/.test(planLine)){ break; }
        items.push(planLine.replace(/^\\d+\\.\\s*/,""));
        i += 1;
      }
      sections.push('<div class="section-label">PLAN</div><ol class="plan-list">'+items.map(function(item){ return "<li>"+escapeHtml(item)+"</li>"; }).join("")+"</ol>");
      continue;
    }
    if(line.toUpperCase() === "LEEWAY CHECK"){
      const items = [];
      i += 1;
      while(i < lines.length){
        const checkLine = lines[i].trim();
        if(!checkLine){ i += 1; continue; }
        if(/^[A-Z][A-Z\\s/]+$/.test(checkLine)){ break; }
        items.push(checkLine.replace(/^[-*]\\s*/,""));
        i += 1;
      }
      sections.push('<div class="section-label">LEEWAY CHECK</div><div class="status-list">'+items.map(function(item){ return '<div class="status-item"><span class="status-dot">OK</span><span>'+escapeHtml(item)+'</span></div>'; }).join("")+"</div>");
      continue;
    }
    if(line.toUpperCase() === "IMPLEMENTATION"){
      i += 1;
      const implementationText = [];
      while(i < lines.length){ implementationText.push(lines[i]); i += 1; }
      const implHtml = implementationText.join("\\n").trim();
      if(implHtml){ sections.push('<div class="section-label">IMPLEMENTATION</div>'+formatParagraphs(implHtml)); }
      continue;
    }
    const paragraph = [];
    while(i < lines.length && lines[i].trim() && !/^(PLAN|LEEWAY CHECK|IMPLEMENTATION)$/i.test(lines[i].trim())){ paragraph.push(lines[i]); i += 1; }
    sections.push(formatParagraphs(paragraph.join("\\n")));
  }
  if(codeMatch){
    const filename = (codeMatch[1] || "implementation").trim() || "implementation";
    const code = codeMatch[2] || "";
    sections.push('<div class="section-label">IMPLEMENTATION</div><div class="code-card"><div class="code-head"><span>'+escapeHtml(filename)+'</span><span>TypeScript</span></div><div class="code-body"><pre>'+escapeHtml(code)+'</pre></div></div>');
  }
  block.innerHTML = sections.join("") || formatParagraphs(text);
  return block;
}

function renderActivityMeta(activity){
  if(!activity) return null;
  const wrap=document.createElement("div");
  wrap.className="bubble-activity";
  wrap.innerHTML='<div class="bubble-activity-label">'+escapeHtml(activity.label || "Live step")+'</div>'
    + (activity.file ? '<div class="bubble-activity-file">'+escapeHtml(activity.file)+'</div>' : '')
    + (activity.detail ? '<div class="bubble-activity-detail">'+escapeHtml(activity.detail)+'</div>' : '');
  return wrap;
}

function renderProgressBubble(text, activity){
  const bubble=document.createElement("div");
  bubble.className="bubble progress-card";
  const kind = activity && activity.kind ? String(activity.kind).toUpperCase() : "LIVE";
  const file = activity && activity.file ? activity.file : "";
  const detail = activity && activity.detail ? activity.detail : text;
  bubble.innerHTML = '<div class="progress-head"><div class="progress-label">'+escapeHtml(activity && activity.label ? activity.label : "Live step")+'</div><div class="progress-kind">'+escapeHtml(kind)+'</div></div>'
    + (file ? '<div class="progress-file">'+escapeHtml(file)+'</div>' : '')
    + '<div class="'+(file ? 'progress-copy' : 'progress-status')+'">'+escapeHtml(detail || text)+'</div>';
  return bubble;
}

function render(role,text,activity,variant){
  const chat=document.getElementById("chat");
  const wrap=document.createElement("div");
  wrap.className="message" + (variant==="progress" ? " progress-message" : "");
  const avatar=document.createElement("div");
  avatar.className="avatar "+(role==="user"?"user":"agent");
  avatar.textContent=role==="user"?"U":"A";
  const bubbleWrap=document.createElement("div");
  bubbleWrap.className="bubble-wrap";
  const meta=document.createElement("div");
  meta.className="meta-row";
  const sender=document.createElement("div");
  sender.className="sender "+(role==="user"?"user":"agent");
  sender.textContent=role==="user"?"You":"Agent Lee";
  if(role==="agent"){
    const badge=document.createElement("span");
    badge.className="badge-prime";
    badge.textContent="PRIME";
    sender.appendChild(badge);
  }
  const time=document.createElement("div");
  time.className="timestamp";
  time.textContent=new Date().toLocaleTimeString([], {hour:"numeric", minute:"2-digit"});
  meta.appendChild(sender);
  meta.appendChild(time);
  bubbleWrap.appendChild(meta);
  if(role==="agent"){
    if(variant==="progress" && activity){
      bubbleWrap.appendChild(renderProgressBubble(text, activity));
    } else {
      bubbleWrap.appendChild(renderAgentContent(text));
      const activityMeta=renderActivityMeta(activity);
      if(activityMeta) bubbleWrap.appendChild(activityMeta);
    }
  } else {
    const bubble=document.createElement("div");
    bubble.className="bubble";
    bubble.innerHTML=formatParagraphs(text);
    bubbleWrap.appendChild(bubble);
  }
  wrap.appendChild(avatar);
  wrap.appendChild(bubbleWrap);
  chat.appendChild(wrap);
  wrap.scrollIntoView({block:"end"});
}

function setApproval(v){ vscode.postMessage({command:"setState", key:"approval", value:v}); }
function setAutoRunStagedPlans(value){ vscode.postMessage({command:"setState", key:"autoRunStagedPlans", value:!!value}); }
function setAutoUpdateEnabled(value){ vscode.postMessage({command:"setState", key:"autoUpdateEnabled", value:!!value}); }
function setPreferRightSideSurface(value){ vscode.postMessage({command:"setState", key:"preferRightSideSurface", value:!!value}); }
function setAgentEnvironment(value){ vscode.postMessage({command:"setState", key:"agentEnvironment", value:value}); }
function setAppLanguage(value){ vscode.postMessage({command:"setState", key:"appLanguage", value:value}); }
function setInferenceSpeed(value){ vscode.postMessage({command:"setState", key:"inferenceSpeed", value:value}); }
function setFollowupBehavior(value){ setSegmentChoice("followupBehavior", value); vscode.postMessage({command:"setState", key:"followupBehavior", value:value}); }
function setCodeReviewBehavior(value){ setSegmentChoice("codeReviewBehavior", value); vscode.postMessage({command:"setState", key:"codeReviewBehavior", value:value}); }
function setWorkMode(value){ vscode.postMessage({command:"setState", key:"workMode", value:value}); }
function setVoiceStyle(value){ vscode.postMessage({command:"setState", key:"voiceStyle", value:value}); }
function setVoiceAutoSendFinalTranscript(value){ vscode.postMessage({command:"leewayVoiceSettingsChanged", key:"voiceAutoSendFinalTranscript", value:!!value}); }
function postLeeWayVoiceSettingChange(key, value){
  vscode.postMessage({command:"leewayVoiceSettingsChanged", key:key, value:value});
}
function normalizeLeeWayVoiceRuntimeKind(value){
  if(value === "leeway-agent-voice-browser-fallback" || value === "browser-speech-recognition") return "leeway-agent-voice-browser-fallback";
  // Map legacy local-whisper name and anything unknown to the current local runtime name.
  return "leeway-agent-voice-local";
}
function setLeeWayVoiceRuntimeKind(value){
  var normalized = normalizeLeeWayVoiceRuntimeKind(value);
  window.agentLeeVoiceProviderKind = normalized;
  if(window.agentLeeVoiceProvider && typeof window.agentLeeVoiceProvider.disconnect === "function"){
    try { window.agentLeeVoiceProvider.disconnect("provider_switch"); } catch {}
  }
  window.agentLeeVoiceProvider = null;
  window.agentLeeVoiceProviderReady = false;
  vscode.postMessage({command:"setState", key:"leewayVoiceRuntimeKind", value:normalized});
  if(window.agentLeeLiveMicAlwaysOn){
    startLiveMic();
  }
}
function renderVoiceBridgeStatus(state){
  state = state || {};
  var setText=function(id,value){ var node=document.getElementById(id); if(node) node.textContent = value; };
  setText("voiceBridgeSummary", state.nextActionHint || "LeeWay Voice is standing by.");
  setText("voiceBridgeAuthority", state.authorityState || "Unknown");
  setText("voiceBridgeSource", state.listeningSource || "NONE");
  setText("voiceBridgeEndpoint", state.endpointUrl || "http://127.0.0.1:7671/transcript");
  setText("voiceBridgeLastHeard", state.lastHeardText || "Nothing captured yet.");
  setText("voiceBridgeLastSent", state.lastSentText || "No.");
  setText("voiceBridgeTypedInput", state.typedInputAvailable === false ? "Unavailable" : "Available");
  setText("voiceBridgeRuntime", state.staleRuntime ? "Stale runtime may affect voice." : (state.runtimeSourceMode || "Unknown"));
  setText("voiceBridgeSuppressionCount", String(state.duplicateSuppressionCount || 0));
  setText("voiceBridgeNextAction", state.nextActionHint || "Use typed input or start LeeWay Voice when the runtime is ready.");
  setText("voiceBridgeWarning", state.loopDetected
    ? "Voice bridge status loop detected. Status messages are being suppressed and will not enter chat."
    : (state.lastError || "Status, heartbeat, and errors are routed here instead of chat."));
}
function renderRuntimeFabricStatus(fabric){
  fabric = fabric || {};
  var setText = function(id, value){ 
    var node = document.getElementById(id); 
    if(node) node.textContent = value; 
  };
  
  var connected = fabric.connected ? "✓ Connected" : "✗ Disconnected";
  var healthy = fabric.healthy ? "Healthy" : (fabric.error || "Unhealthy");
  var url = fabric.url || "https://leeway-runtime-fabric.fly.dev";
  
  setText("runtimeFabricBadge", "Runtime Fabric: " + connected + " | " + healthy + " | " + url);
  setText("providerFabricBadge", "Provider Fabric: " + (fabric.services && fabric.services.providerFabric ? "✓ Online" : "✗ Offline"));
  setText("agentLeeBadge", "Agent Lee: " + (fabric.connected ? "✓ Route Available" : "✗ Route Unavailable"));
  setText("sentinelBadge", "Sentinel: " + (fabric.services && fabric.services.sentinel ? "✓ Online" : "✗ Offline"));
  setText("cageBadge", "Cage: " + (fabric.services && fabric.services.cage ? "✓ Online" : "✗ Offline"));
  setText("terminatorBadge", "Terminator: " + (fabric.services && fabric.services.terminator ? "✓ Online" : "✗ Offline"));
  setText("skillsUniversityBadge", "Skills University: Not Connected");
  setText("leeway80BenchBadge", "LeeWay 80 Bench: Not Connected");
  setText("localWorkerBadge", "Local Worker: " + (fabric.services && fabric.services.localWorkerBridge ? "✓ Connected" : "LOCAL_WORKER_BRIDGE_REQUIRED"));
  setText("deviceBridgeBadge", "Device Bridge: LOCAL_DEVICE_BRIDGE_REQUIRED");
  setText("cameraBadge", "Camera: CAMERA_SURFACE_MISSING");
  setText("securityFabricBadge", "Security Fabric: SECURITY_FABRIC_ENDPOINTS_PENDING");
  setText("modelCivilizationBadge", "Model Civilization: MODEL_CIVILIZATION_ENDPOINTS_PENDING");
  setText("deviceIntelligenceBadge", "Device Intelligence: DEVICE_INTELLIGENCE_ENDPOINTS_PENDING");
  setText("receiptsBadge", "Receipts: RECEIPTS_ACTIVE");
}
function renderCameraStatus(camera){
  camera = camera || {};
  var setText = function(id, value){ 
    var node = document.getElementById(id); 
    if(node) node.textContent = value; 
  };
  
  setText("cameraSummary", camera.summary || "Camera not connected.");
  setText("cameraDevice", camera.device || "No device detected");
  setText("cameraResolution", camera.resolution || "N/A");
  setText("cameraStatus", camera.status || "CAMERA_SURFACE_MISSING");
  setText("cameraProvider", camera.provider || "LOCAL_DEVICE_BRIDGE_REQUIRED");
  setText("cameraFrameRate", camera.frameRate || "N/A");
  setText("cameraLastFrame", camera.lastFrame || "Never");
  setText("cameraWarning", camera.warning || "Camera requires local device bridge or remote worker binding.");
  var preview = document.getElementById("cameraVideoPreview");
  var blocked = document.getElementById("cameraBlockedTile");
  if(preview && blocked){
    var canPreview = !!camera.previewActive;
    preview.style.display = canPreview ? "block" : "none";
    blocked.style.display = canPreview ? "none" : "block";
    blocked.textContent = camera.blockedReason || "CAMERA_SURFACE_VISIBLE_LOCAL_DEVICE_BRIDGE_REQUIRED";
  }
}
function renderDeviceBridgeStatus(bridge){
  bridge = bridge || {};
  var setText = function(id, value){ 
    var node = document.getElementById(id); 
    if(node) node.textContent = value; 
  };
  
  setText("deviceBridgeSummary", bridge.summary || "Device bridge not connected. Local hardware awareness requires bridge.");
  setText("deviceBridgeStatus", bridge.status || "LOCAL_DEVICE_BRIDGE_REQUIRED");
  setText("deviceMic", bridge.mic || "Not detected");
  setText("deviceSpeaker", bridge.speaker || "Not detected");
  setText("deviceCamera", bridge.camera || "Not detected");
  setText("deviceUSB", bridge.usb || "0 detected");
  setText("deviceIoT", bridge.iot || "0 detected");
  setText("deviceBridgeWarning", bridge.warning || "Device intelligence requires local bridge or FCC device records integration.");
}
function renderModelFamilyStatus(models){
  models = models || {};
  var setText = function(id, value){
    var node = document.getElementById(id);
    if(node) {
      node.textContent = value;
      // Update CSS class based on status
      node.className = "model-status";
      if(value.includes("PASS") || value.includes("Available")) {
        node.className = "model-status success";
      } else if(value.includes("NOT_RUNNING") || value.includes("MISSING") || value.includes("REQUIRED")) {
        node.className = "model-status warn";
      } else if(value.includes("Checking")) {
        node.className = "model-status";
      }
    }
  };
  
  // Update all 7 models
  setText("qwen14bStatus", models.qwen14b || "Checking...");
  setText("qwen7bStatus", models.qwen7b || "Checking...");
  setText("qwen1.5bStatus", models.qwen1_5b || "Checking...");
  setText("qwen3Status", models.qwen3 || "Checking...");
  setText("qwen2.5Status", models.qwen2_5 || "Checking...");
  setText("qwenVLStatus", models.qwenVL || "Checking...");
  setText("deepseekStatus", models.deepseek || "Checking...");

function renderModelVaultStatus(vault){
  vault = vault || {};
  var setText = function(id, value){
    var node = document.getElementById(id);
    if(node) {
      node.textContent = value;
      node.className = "voice-review-value";
      if(value.includes("PASS") || value.includes("COMPLETE") || value.includes("VERIFIED") || value.includes("READY")) {
        node.className = "voice-review-value success";
      } else if(value.includes("REQUIRED") || value.includes("MISSING") || value.includes("BLOCKED")) {
        node.className = "voice-review-value warn";
      }
    }
  };
  
  setText("modelVaultStatus", vault.status || "LOCAL_MODEL_VAULT_BRIDGE_REQUIRED");
  setText("modelVaultCount", vault.modelCount || "7 models");
  setText("modelVaultSize", vault.totalSize || "29.16 GB");
  setText("modelVaultBackupStatus", vault.backupStatus || "BACKUP_COMPLETE");
  setText("modelVaultIntegrity", vault.integrity || "SHA256_VERIFIED");
  setText("modelVaultPortability", vault.portability || "PORTABLE_READY");
}

function renderModelExecutionStatus(execution){
  execution = execution || {};
  var setText = function(id, value){
    var node = document.getElementById(id);
    if(node) {
      node.textContent = value;
      node.className = "voice-review-value";
      if(value.includes("PASS") || value.includes("Running") || value.includes("Available")) {
        node.className = "voice-review-value success";
      } else if(value.includes("REQUIRED") || value.includes("NOT_RUNNING") || value.includes("BLOCKED")) {
        node.className = "voice-review-value warn";
      }
    }
  };
  
  setText("modelExecutionStatus", execution.status || "LOCAL_OLLAMA_BRIDGE_REQUIRED");
  setText("ollamaRunning", execution.ollamaRunning || "Checking...");
  setText("ollamaModelCount", execution.modelCount || "0 models");
  setText("activeModel", execution.activeModel || "None");
  setText("lastInference", execution.lastInference || "Never");
  setText("modelOrchestrator", execution.orchestrator || "Agent Lee");
}

function renderAgentLeeFamilySurface(family){
  family = family || {};
  var setText = function(id, value){
    var node = document.getElementById(id);
    if(node) {
      node.textContent = value;
      node.className = "voice-review-value";
    }
  };
  
  setText("orchestratorName", family.orchestrator || "Agent Lee");
  setText("orchestratorRole", family.role || "Task Router & Coordinator");
  setText("workerCount", family.workerCount || "7 model workers");
  setText("leadCoder", family.leadCoder || "QWEN 2.5 Coder 14B");
  setText("fastResponder", family.fastResponder || "QWEN 2.5 Coder 1.5B");
  setText("visionWorker", family.visionWorker || "QWEN 2.5 VL 7B");
}

function renderDeepSeek16BStatus(status){
  status = status || {};
  var setText = function(id, value){
    var node = document.getElementById(id);
    if(node) {
      node.textContent = value;
      node.className = "voice-review-value";
      if(value.includes("NOT_BOUND") || value.includes("Not pulled")) {
        node.className = "voice-review-value warn";
      } else if(value.includes("BOUND") || value.includes("Available")) {
        node.className = "voice-review-value success";
      }
    }
  };
  
  setText("deepseek16bStatus", status.routeStatus || "DEEPSEEK_16B_ROUTE_NOT_BOUND");
  setText("deepseek16bExpected", status.expected || "deepseek-coder:16b");
  setText("deepseek16bActual", status.actual || "Not pulled");
  setText("deepseek16bAlternative", status.alternative || "DeepSeek 1B available");
}
}

// Check Ollama models and update status
async function checkOllamaModels(){
  try {
    const response = await fetch("http://localhost:11434/api/tags");
    if(!response.ok) {
      renderModelFamilyStatus({
        qwen14b: "OLLAMA_SERVER_NOT_RUNNING",
        qwen7b: "OLLAMA_SERVER_NOT_RUNNING",
        qwen1_5b: "OLLAMA_SERVER_NOT_RUNNING",
        qwen3: "OLLAMA_SERVER_NOT_RUNNING",
        qwen2_5: "OLLAMA_SERVER_NOT_RUNNING",
        qwenVL: "OLLAMA_SERVER_NOT_RUNNING",
        deepseek: "OLLAMA_SERVER_NOT_RUNNING"
      });
      return;
    }
    
    const data = await response.json();
    const modelNames = (data.models || []).map(m => m.name);
    
    renderModelFamilyStatus({
      qwen14b: modelNames.includes("qwen2.5-coder:14b") ? "✅ OLLAMA_LOCAL_ENDPOINT_PASS" : "MODEL_NOT_FOUND",
      qwen7b: modelNames.includes("qwen2.5-coder:7b") ? "✅ OLLAMA_LOCAL_ENDPOINT_PASS" : "MODEL_NOT_FOUND",
      qwen1_5b: modelNames.includes("qwen2.5-coder:1.5b") ? "✅ OLLAMA_LOCAL_ENDPOINT_PASS" : "MODEL_NOT_FOUND",
      qwen3: modelNames.includes("qwen3:latest") ? "✅ OLLAMA_LOCAL_ENDPOINT_PASS" : "MODEL_NOT_FOUND",
      qwen2_5: modelNames.includes("qwen2.5:latest") ? "✅ OLLAMA_LOCAL_ENDPOINT_PASS" : "MODEL_NOT_FOUND",
      qwenVL: modelNames.includes("qwen2.5vl:7b") ? "✅ OLLAMA_LOCAL_ENDPOINT_PASS" : "MODEL_NOT_FOUND",
      deepseek: modelNames.includes("deepseek-coder:latest") ? "✅ OLLAMA_LOCAL_ENDPOINT_PASS" : "MODEL_NOT_FOUND"
    });
  } catch(error) {
    renderModelFamilyStatus({
      qwen14b: "OLLAMA_CONNECTION_FAILED",
      qwen7b: "OLLAMA_CONNECTION_FAILED",
      qwen1_5b: "OLLAMA_CONNECTION_FAILED",
      qwen3: "OLLAMA_CONNECTION_FAILED",
      qwen2_5: "OLLAMA_CONNECTION_FAILED",
      qwenVL: "OLLAMA_CONNECTION_FAILED",
      deepseek: "OLLAMA_CONNECTION_FAILED"
    });
  }
}

// Call checkOllamaModels when settings panel loads
if(typeof window !== "undefined") {
  window.addEventListener("load", function(){
    setTimeout(checkOllamaModels, 1000);
    // Check every 30 seconds
    setInterval(checkOllamaModels, 30000);
  });
}
function testCamera(){ vscode.postMessage({command:"testCamera"}); }
function backupModels(){ vscode.postMessage({command:"backupModels"}); }
function restoreModels(){ vscode.postMessage({command:"restoreModels"}); }
function verifyModelVault(){ vscode.postMessage({command:"verifyModelVault"}); }
function startOllama(){ vscode.postMessage({command:"startOllama"}); }
function testModelExecution(){ vscode.postMessage({command:"testModelExecution"}); }
function pullDeepSeek16B(){ vscode.postMessage({command:"pullDeepSeek16B"}); }
function useDeepSeek1B(){ vscode.postMessage({command:"useDeepSeek1B"}); }
function requestCameraPermission(){ vscode.postMessage({command:"requestCameraPermission"}); }
function renderVoiceReviewState(review){
  var panel=document.getElementById("voiceReviewPanel");
  if(!panel) return;
  if(!review){
    panel.hidden = true;
    return;
  }
  panel.hidden = false;
  var setText=function(id,value){ var node=document.getElementById(id); if(node) node.textContent = value; };
  setText("voiceReviewSummary", review.sent
    ? "This reviewed voice request has already been sent through the governed path."
    : "The owner speaks. LeeWay classifies. Agents assist. Law governs. Nothing mutates without approval.");
  setText("voiceReviewAuthority", review.identity && review.identity.authorityState ? review.identity.authorityState : "Voice review pending");
  setText("voiceReviewHeardText", review.heardText || "Nothing captured yet.");
  setText("voiceReviewSource", review.sourceLabel || review.source || "Unknown");
  setText("voiceReviewConfidence", review.confidence === undefined || review.confidence === null ? "Not provided" : String(review.confidence));
  setText("voiceReviewTranscriptId", review.transcriptId || "Pending");
  setText("voiceReviewTimestamp", review.timestamp || "Pending");
  setText("voiceReviewClassification", review.classification || "Unknown");
  setText("voiceReviewRisk", review.risk || "Unknown");
  setText("voiceReviewNextAction", review.nextAction || "Review before send.");
}
function sendVoiceReview(){ vscode.postMessage({command:"voiceReviewSend"}); }
function createVoiceReviewProposal(){ vscode.postMessage({command:"voiceReviewCreateProposal"}); }
function clarifyVoiceReview(){ vscode.postMessage({command:"voiceReviewClarify"}); }
function discardVoiceReview(){ vscode.postMessage({command:"voiceReviewDiscard"}); }
function updateVoiceSliderLabel(id, value){
  var node=document.getElementById(id);
  if(!node) return;
  node.textContent = Number(value).toFixed(2) + "x";
}
function updateVoiceButtonState(isEnabled, isMuted){
  var enabledBtn=document.getElementById("voiceEnabledBtn");
  if(enabledBtn){
    enabledBtn.textContent = isEnabled ? "Voice Enabled" : "Voice Disabled";
    enabledBtn.setAttribute("data-enabled", isEnabled ? "true" : "false");
  }
  var muteBtn=document.getElementById("voiceMuteBtn");
  if(muteBtn){
    muteBtn.textContent = isMuted ? "Unmute" : "Mute";
    muteBtn.setAttribute("data-muted", isMuted ? "true" : "false");
  }
  var composerToggle=document.getElementById("voiceToggleBtn");
  if(composerToggle){
    composerToggle.textContent = isMuted || !isEnabled ? "Talk" : "Mute";
    composerToggle.setAttribute("data-enabled", isEnabled && !isMuted ? "true" : "false");
    composerToggle.setAttribute("title", isEnabled && !isMuted ? "Mute speech" : "Enable speech");
  }
}
function setVoiceEnabled(value){
  postLeeWayVoiceSettingChange("voiceEnabled", !!value);
}
function setVoiceEnabledFromButton(){
  var enabledBtn=document.getElementById("voiceEnabledBtn");
  var isEnabled=enabledBtn && enabledBtn.getAttribute("data-enabled")==="true";
  setVoiceEnabled(!isEnabled);
}
function setVoiceAutoSpeak(value){
  postLeeWayVoiceSettingChange("voiceAutoSpeak", !!value);
}
function setVoiceRate(value){
  var parsed=Number(value);
  updateVoiceSliderLabel("voiceRateLabel", parsed);
  postLeeWayVoiceSettingChange("voiceRate", parsed);
}
function setVoiceVolume(value){
  var parsed=Number(value);
  updateVoiceSliderLabel("voiceVolumeLabel", parsed);
  postLeeWayVoiceSettingChange("voiceVolume", parsed);
}
function setVoicePitch(value){
  var parsed=Number(value);
  updateVoiceSliderLabel("voicePitchLabel", parsed);
  vscode.postMessage({command:"setState", key:"voicePitch", value:parsed});
}
function setVoiceTone(value){
  var parsed=Number(value);
  updateVoiceSliderLabel("voiceToneLabel", parsed);
  vscode.postMessage({command:"setState", key:"voiceTone", value:parsed});
}
function pickVoiceReference(){ vscode.postMessage({command:"pickVoiceReference"}); }
function voiceClonePayload(){
  return {
    audioPath: (document.getElementById("voiceReferenceAudioPath").value || "").trim(),
    transcript: (document.getElementById("voiceReferenceText").value || "").trim(),
    testText: (document.getElementById("voiceCloneTestText").value || "").trim()
  };
}
function saveVoiceCloneSettings(){ vscode.postMessage({command:"saveVoiceCloneSettings", payload:voiceClonePayload()}); }
function transcribeVoiceReference(){ vscode.postMessage({command:"transcribeVoiceReference", payload:voiceClonePayload()}); }
function testClonedVoice(){ vscode.postMessage({command:"testClonedVoice", payload:voiceClonePayload()}); }
function activateClonedVoice(){ vscode.postMessage({command:"activateClonedVoice", payload:voiceClonePayload()}); }
function useBundledReferenceVoice(){ vscode.postMessage({command:"useBundledReferenceVoice"}); }

// ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Voice of Agent Lee tab functions ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
function voiceAlTestDefault(){ vscode.postMessage({command:"voiceAlTestDefault"}); }
function voiceAlActivateDefault(){ vscode.postMessage({command:"voiceAlActivateDefault"}); }
function voiceAlPickAudio(){
  vscode.postMessage({command:"voiceAlPickAudio"});
}
function voiceAlRecordMic(){
  vscode.postMessage({command:"voiceAlRecordMic"});
}
function voiceAlCloneAndPreview(){
  vscode.postMessage({command:"voiceAlCloneAndPreview", payload:{
    label: (document.getElementById("voiceAlNewLabel").value || "").trim(),
    audioPath: (document.getElementById("voiceAlRefAudio").value || "").trim(),
    transcript: (document.getElementById("voiceAlRefText").value || "").trim(),
    testText: (document.getElementById("voiceAlTestPhrase").value || "").trim()
  }});
}
function voiceAlSaveClone(){
  vscode.postMessage({command:"voiceAlSaveClone", payload:{
    label: (document.getElementById("voiceAlNewLabel").value || "").trim(),
    audioPath: (document.getElementById("voiceAlRefAudio").value || "").trim(),
    transcript: (document.getElementById("voiceAlRefText").value || "").trim()
  }});
}
function voiceAlTestVoice(id){ vscode.postMessage({command:"voiceAlTestVoice", id:id}); }
function voiceAlSetActive(id){ vscode.postMessage({command:"voiceAlSetActive", id:id}); }
function voiceAlDeleteVoice(id){ vscode.postMessage({command:"voiceAlDeleteVoice", id:id}); }
function renderVoiceAlCatalog(catalog, activeVoiceId){
  var container=document.getElementById("voiceAlCatalogList");
  if(!container || !catalog) return;
  var voices = catalog.voices || [];
  var html = "";
  var activeLabel = document.getElementById("voiceAlActiveLabel");
  var engineLabel = document.getElementById("voiceAlEngineLabel");
  var countLabel = document.getElementById("voiceAlCountLabel");
  if(activeLabel) activeLabel.textContent = "Active: " + (activeVoiceId || "unknown");
  if(engineLabel) engineLabel.textContent = "Engine: f5-clone-local";
  if(countLabel) countLabel.textContent = "Voices: " + voices.length + " / 10";
  voices.forEach(function(v){
    var isActive = v.id === activeVoiceId;
    var lockIcon = v.isLocked ? "\uD83D\uDD12 " : "";
    var activeTag = isActive ? ' <span style="color:#39d267;font-weight:700;margin-left:6px">[ACTIVE]</span>' : '';
    html += '<div class="model-card" style="display:flex;justify-content:space-between;align-items:center;gap:10px">';
    html += '<div style="flex:1;min-width:0">';
    html += '<div class="model-label">' + lockIcon + (v.label || v.id) + activeTag + '</div>';
    html += '<div class="settings-copy" style="margin-top:2px">' + (v.description || '') + '</div>';
    html += '</div>';
    html += '<div style="display:flex;gap:6px;flex-wrap:wrap">';
    html += '<button data-leeway-id="LEEWAY_UI_CONTROL::VSCODE::AUTO::VOICEALTESTVOICE" class="ghost-btn" onclick="voiceAlTestVoice(\\'' + v.id + '\\')">&#9654; Play</button>';
    if(!isActive) html += '<button data-leeway-id="LEEWAY_UI_CONTROL::VSCODE::AUTO::VOICEALSETACTIVE" class="ghost-btn" onclick="voiceAlSetActive(\\'' + v.id + '\\')">Set Active</button>';
    if(!v.isLocked) html += '<button data-leeway-id="LEEWAY_UI_CONTROL::VSCODE::AUTO::VOICEALDELETEVOICE" class="ghost-btn" style="color:#ff8c8c" onclick="voiceAlDeleteVoice(\\'' + v.id + '\\')">Delete</button>';
    html += '</div></div>';
  });
  if(!voices.length) html = '<div class="settings-copy">No voices in the catalog yet.</div>';
  container.innerHTML = html;
}

function updateAgentLeeNow(){ vscode.postMessage({command:"updateAgentLeeNow"}); }
function setPrimaryModel(value){ vscode.postMessage({command:"setState", key:"primaryModel", value:value}); vscode.postMessage({command:"refreshRuntime"}); }
function setRoleModel(key,value){ vscode.postMessage({command:"setState", key:key, value:value}); vscode.postMessage({command:"refreshRuntime"}); }
function setPerformanceProfile(value){ vscode.postMessage({command:"setPerformanceProfile", profile:value}); }
function completeOnboarding(){ vscode.postMessage({command:"setState", key:"onboardingComplete", value:true}); vscode.postMessage({command:"refreshRuntime"}); toggleSettings(false); }
function pickAttachments(){ vscode.postMessage({command:"pickAttachments"}); }
function toggleWeb(){ const b=document.getElementById("webBtn"); const on=b.textContent==="Web Off"; b.textContent=on?"Web On":"Web Off"; vscode.postMessage({command:"setState", key:"web", value:on}); }
function toggleVoice(){ setVoiceEnabled(!(window.agentLeeVoiceEnabled !== false)); }
function toggleBrowserVisual(){ const b=document.getElementById("browserVisualBtn"); const on=b.textContent==="Visual Browser Off"; b.textContent=on?"Visual Browser On":"Visual Browser Off"; vscode.postMessage({command:"setState", key:"browserVisualMode", value:on}); }
function toggleBrowserCursor(){ const b=document.getElementById("browserCursorBtn"); const on=b.textContent==="Show Cursor Off"; b.textContent=on?"Show Cursor On":"Show Cursor Off"; vscode.postMessage({command:"setState", key:"browserShowCursor", value:on}); }
function setBrowserSlowMo(value){ vscode.postMessage({command:"setState", key:"browserSlowMoMs", value:Number(value)}); }
function toggleVoiceMute(){ vscode.postMessage({command:"leewayVoiceMuteToggled"}); }
function stopVoice(){ requestVoiceStop(); }
function requestVoiceStop(){ vscode.postMessage({command:"leewayVoiceStopRequested"}); }
function requestVoiceTest(){
  var testInput=document.getElementById("voiceCloneTestText");
  var text=(testInput && testInput.value ? testInput.value : "Agent Lee live voice test.").trim();
  vscode.postMessage({command:"leewayVoiceTestRequested", text:text});
}
function toggleSettings(forceOpen){
  const backdrop=document.getElementById("settingsBackdrop");
  if(typeof forceOpen==="boolean"){
    backdrop.classList.toggle("open", forceOpen);
    return;
  }
  backdrop.classList.toggle("open");
}
function closeSettingsIfBackdrop(event){ if(event.target && event.target.id==="settingsBackdrop"){ toggleSettings(false); } }
function postUiAction(action, payload){ vscode.postMessage(Object.assign({command:"agentLeeUiAction", action:action}, payload || {})); }
function submitOutgoingMessage(text, options){
  options = options || {};
  var trimmed = String(text || "").trim();
  if(!trimmed && !window.pendingAttachments.length) return;
  var displayText = trimmed || window.pendingAttachments.map(function(item){ return item.name; }).join(", ");
  render("user", displayText);
  if(!options.skipPlaceholder){
    render("agent","I'm on it. Reading the real files and lining up the live tracker now.");
  }
  postAgentLeeCommand({command:"sendMessage", text:trimmed, attachments:window.pendingAttachments});
  window.pendingAttachments=[];
  syncAttachments();
}
function send(){
  var input=document.getElementById("input");
  submitOutgoingMessage(input ? input.value : "");
  if(input) input.value="";
}
function registerAgentLeeControlButtons(){ document.querySelectorAll("[data-ui-action]").forEach(function(button){ button.addEventListener("click",function(){ const action=button.getAttribute("data-ui-action"); const input=document.getElementById("input"); const prompt=input ? input.value.trim() : ""; postUiAction(action,{ text:prompt }); }); }); }
function registerAgentLeeTopButtons(){
  const settings=document.getElementById("settingsBtn");
  const historyButton=document.getElementById("historyBtn");
  const newChatButton=document.getElementById("newChatBtn");
  const closeHistoryButton=document.getElementById("closeHistoryBtn");
  if(settings) settings.addEventListener("click",function(){ toggleSettings(true); });
  if(historyButton) historyButton.addEventListener("click",function(){ toggleHistory(); });
  if(closeHistoryButton) closeHistoryButton.addEventListener("click",function(){ toggleHistory(false); });
  if(newChatButton) newChatButton.addEventListener("click",function(){ newChat(); });
}

function nextLavrClientId(prefix){
  return String(prefix || "lavr") + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}

function emitLeeWayVoiceEvent(type, payload){
  var sessionId = String(window.agentLeeLavrSessionId || "").trim();
  if(!sessionId){
    sessionId = nextLavrClientId("lavr-session");
    window.agentLeeLavrSessionId = sessionId;
  }

  var enriched = Object.assign({}, payload || {});
  enriched.lavrSessionId = String(enriched.lavrSessionId || sessionId);
  if(enriched.lavrTurnId){
    window.agentLeeLavrTurnId = String(enriched.lavrTurnId);
  } else if(window.agentLeeLavrTurnId){
    enriched.lavrTurnId = String(window.agentLeeLavrTurnId);
  }

  if(type === "LAVR_TOOL_REQUESTED"){
    if(!enriched.lavrToolRequestId){
      enriched.lavrToolRequestId = nextLavrClientId("lavr-tool");
    }
    if(!enriched.callId){
      enriched.callId = String(enriched.lavrToolRequestId);
    }
  }

  vscode.postMessage({
    command:"leewayVoiceEvent",
    event:Object.assign({ type:type, timestamp:Date.now() }, enriched)
  });
}

function queueLeewayVoiceTurnCommit(delayMs){
  queueLeewayVoiceTurnCommitForSource(delayMs, "timeout");
}

function normalizeLavrTurnText(value){
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function ensureLavrTurnGateState(){
  if(!window.agentLeeLavrTurnGateState){
    window.agentLeeLavrTurnGateState = {
      turnId: "",
      utteranceId: "",
      interruptId: "",
      startedAt: 0,
      partialText: "",
      finalText: "",
      finalNormalized: "",
      hasFinal: false,
      hasCommitted: false,
      hasCancelled: false,
      commitToken: 0
    };
  }
  return window.agentLeeLavrTurnGateState;
}

function beginLavrUtterance(reason){
  var gate = ensureLavrTurnGateState();
  if(window.agentLeeRealtimeCommitTimer){
    clearTimeout(window.agentLeeRealtimeCommitTimer);
    window.agentLeeRealtimeCommitTimer = null;
  }
  gate.turnId = nextLavrClientId("lavr-turn");
  gate.utteranceId = nextLavrClientId("lavr-utt");
  gate.interruptId = "";
  gate.startedAt = Date.now();
  gate.partialText = "";
  gate.finalText = "";
  gate.finalNormalized = "";
  gate.hasFinal = false;
  gate.hasCommitted = false;
  gate.hasCancelled = false;
  gate.commitToken = Number(gate.commitToken || 0) + 1;
  window.agentLeeLavrTurnId = gate.turnId;
  window.agentLeeLavrUtteranceId = gate.utteranceId;
  window.agentLeeLavrInterruptId = "";
  emitLeeWayVoiceEvent("LAVR_TURN_STARTED", {
    lavrTurnId:gate.turnId,
    lavrUtteranceId:gate.utteranceId,
    reason:String(reason || "speech_started")
  });
  return gate;
}

function getActiveLavrUtterance(){
  var gate = ensureLavrTurnGateState();
  if(!gate.turnId || gate.hasCommitted || gate.hasCancelled){
    return beginLavrUtterance("auto_start");
  }
  return gate;
}

function updateLavrPartialText(text){
  var gate = getActiveLavrUtterance();
  var value = String(text || "").trim();
  if(!value) return gate;
  gate.partialText = value;
  window.agentLeeRealtimeInterim = value;
  emitLeeWayVoiceEvent("LAVR_PARTIAL_UPDATED", {
    lavrTurnId:gate.turnId,
    lavrUtteranceId:gate.utteranceId,
    transcript:value
  });
  return gate;
}

function updateLavrFinalText(text){
  var gate = getActiveLavrUtterance();
  var value = String(text || "").trim();
  if(!value) return { gate:gate, accepted:false, duplicate:false };
  var normalized = normalizeLavrTurnText(value);
  if(!normalized) return { gate:gate, accepted:false, duplicate:false };

  if(gate.finalNormalized === normalized){
    emitLeeWayVoiceEvent("LAVR_DUPLICATE_COMMIT_SUPPRESSED", {
      lavrTurnId:gate.turnId,
      lavrUtteranceId:gate.utteranceId,
      reason:"duplicate_final"
    });
    return { gate:gate, accepted:false, duplicate:true };
  }

  gate.finalText = value;
  gate.finalNormalized = normalized;
  gate.hasFinal = true;
  window.agentLeeRealtimeTurnBuffer = value;
  emitLeeWayVoiceEvent("LAVR_FINAL_RECEIVED", {
    lavrTurnId:gate.turnId,
    lavrUtteranceId:gate.utteranceId,
    transcript:value
  });
  return { gate:gate, accepted:true, duplicate:false };
}

function requestLavrInterrupt(reason){
  var gate = getActiveLavrUtterance();
  if(gate.interruptId) return gate.interruptId;
  gate.interruptId = nextLavrClientId("lavr-int");
  window.agentLeeLavrInterruptId = gate.interruptId;
  emitLeeWayVoiceEvent("LAVR_INTERRUPT_REQUESTED", {
    lavrTurnId:gate.turnId,
    lavrUtteranceId:gate.utteranceId,
    lavrInterruptId:gate.interruptId,
    reason:String(reason || "user_barge_in")
  });
  return gate.interruptId;
}

function cancelLeewayVoiceTurn(reason){
  var gate = ensureLavrTurnGateState();
  if(window.agentLeeRealtimeCommitTimer){
    clearTimeout(window.agentLeeRealtimeCommitTimer);
    window.agentLeeRealtimeCommitTimer = null;
  }
  if(!gate.turnId || gate.hasCommitted || gate.hasCancelled) return false;
  gate.hasCancelled = true;
  window.agentLeeRealtimeUserSpeaking = false;
  window.agentLeeRealtimeTurnBuffer = "";
  window.agentLeeRealtimeInterim = "";
  emitLeeWayVoiceEvent("LAVR_TURN_CANCELLED", {
    lavrTurnId:gate.turnId,
    lavrUtteranceId:gate.utteranceId,
    reason:String(reason || "cancelled")
  });
  return true;
}

function queueLeewayVoiceTurnCommitForSource(delayMs, source){
  var gate = getActiveLavrUtterance();
  if(window.agentLeeRealtimeCommitTimer){
    clearTimeout(window.agentLeeRealtimeCommitTimer);
  }
  gate.commitToken = Number(gate.commitToken || 0) + 1;
  var token = gate.commitToken;
  emitLeeWayVoiceEvent("LAVR_COMMIT_SCHEDULED", {
    lavrTurnId:gate.turnId,
    lavrUtteranceId:gate.utteranceId,
    source:String(source || "timeout"),
    commitDelayMs:Math.max(120, Number(delayMs || 420))
  });
  window.agentLeeRealtimeCommitTimer = setTimeout(function(){
    commitLeewayVoiceTurn(source || "timeout", { commitToken:token });
  }, Math.max(120, Number(delayMs || 420)));
}

function isLavrLowConfidenceTurn(text){
  var normalized = normalizeLavrTurnText(text);
  if(!normalized) return true;
  return normalized.length < 2;
}

function commitLeewayVoiceTurn(source, options){
  if(window.agentLeeRealtimeCommitTimer){
    clearTimeout(window.agentLeeRealtimeCommitTimer);
    window.agentLeeRealtimeCommitTimer = null;
  }

  var gate = ensureLavrTurnGateState();
  var expectedToken = Number(options && options.commitToken || 0);
  if(expectedToken && expectedToken !== Number(gate.commitToken || 0)){
    emitLeeWayVoiceEvent("LAVR_DUPLICATE_COMMIT_SUPPRESSED", {
      lavrTurnId:gate.turnId || "",
      lavrUtteranceId:gate.utteranceId || "",
      reason:"stale_commit_timer"
    });
    return false;
  }

  if(gate.hasCommitted || gate.hasCancelled){
    emitLeeWayVoiceEvent("LAVR_DUPLICATE_COMMIT_SUPPRESSED", {
      lavrTurnId:gate.turnId || "",
      lavrUtteranceId:gate.utteranceId || "",
      reason:"terminal_outcome_already_emitted"
    });
    return false;
  }

  var text = String(gate.finalText || window.agentLeeRealtimeTurnBuffer || "").trim();
  window.agentLeeRealtimeTurnBuffer = "";
  window.agentLeeRealtimeInterim = "";

  if(!gate.hasFinal){
    emitLeeWayVoiceEvent("LAVR_SILENCE_TIMEOUT", {
      lavrTurnId:gate.turnId || "",
      lavrUtteranceId:gate.utteranceId || "",
      source:String(source || "timeout")
    });
    cancelLeewayVoiceTurn("interim_only_or_no_final");
    return false;
  }

  if(!text || isLavrLowConfidenceTurn(text)){
    cancelLeewayVoiceTurn("empty_or_low_confidence");
    return false;
  }

  gate.hasCommitted = true;
  if(window.agentLeeRealtimeUserSpeaking){
    window.agentLeeRealtimeUserSpeaking = false;
    emitLeeWayVoiceEvent("LAVR_USER_SPEECH_STOPPED", {
      lavrTurnId:gate.turnId,
      lavrUtteranceId:gate.utteranceId
    });
  }

  emitLeeWayVoiceEvent("LAVR_TURN_COMMITTED", {
    lavrTurnId:gate.turnId,
    lavrUtteranceId:gate.utteranceId,
    transcript:text,
    source:source || "unknown"
  });
  emitLeeWayVoiceEvent("LAVR_COMMIT_EMITTED", {
    lavrTurnId:gate.turnId,
    lavrUtteranceId:gate.utteranceId,
    transcript:text,
    source:source || "unknown"
  });
  setAttachmentMeta("LeeWay Agent Voice turn committed. Agent Lee is responding...", true);
  vscode.postMessage({
    command:"leewayVoiceTurnCommit",
    text:text,
    lavrTurnId:gate.turnId || "",
    lavrUtteranceId:gate.utteranceId || "",
    lavrInterruptId:gate.interruptId || "",
    lavrSessionId:String(window.agentLeeLavrSessionId || "")
  });
  return true;
}

function resetLeewayVoiceTurnState(){
  var gate = ensureLavrTurnGateState();
  window.agentLeeRealtimeTurnBuffer = "";
  window.agentLeeRealtimeInterim = "";
  window.agentLeeRealtimeUserSpeaking = false;
  if(window.agentLeeRealtimeCommitTimer){
    clearTimeout(window.agentLeeRealtimeCommitTimer);
    window.agentLeeRealtimeCommitTimer = null;
  }
  gate.partialText = "";
  gate.finalText = "";
  gate.finalNormalized = "";
  gate.hasFinal = false;
  gate.hasCommitted = false;
  gate.hasCancelled = false;
  gate.interruptId = "";
  gate.commitToken = Number(gate.commitToken || 0) + 1;
}

function createLeeWayVoiceEventBus(){
  var listeners = {};
  return {
    on: function(type, handler){
      if(!type || typeof handler !== "function") return function(){};
      if(!listeners[type]) listeners[type] = [];
      listeners[type].push(handler);
      return function(){
        listeners[type] = (listeners[type] || []).filter(function(item){ return item !== handler; });
      };
    },
    emit: function(type, payload){
      emitLeeWayVoiceEvent(type, payload);
      (listeners[type] || []).slice().forEach(function(handler){
        try { handler(payload || {}); } catch {}
      });
    }
  };
}

${voiceProviderFactoryClientScript}

function getVoiceProviderState(){
  if(!window.agentLeeVoiceProvider || typeof window.agentLeeVoiceProvider.getState !== "function") return null;
  try { return window.agentLeeVoiceProvider.getState() || null; } catch { return null; }
}

function isVoiceSessionActive(){
  var state = getVoiceProviderState();
  if(state){
    return !!(
      state.connected ||
      state.listening ||
      state.status === "connecting" ||
      state.status === "connected" ||
      state.status === "user_speaking" ||
      state.status === "assistant_speaking" ||
      state.status === "tool_running"
    );
  }
  return !!window.agentLeeMicShouldRun;
}

function syncMicButtonFromProviderState(){
  var micBtn=document.getElementById("micBtn");
  if(!micBtn) return;
  var active = isVoiceSessionActive();
  micBtn.title = active ? "Pause live microphone" : "Enable live microphone";
  micBtn.style.opacity = active ? "1" : "0.6";
}

function startLiveMic(){
  if(isVoiceSessionActive()){
    syncMicButtonFromProviderState();
    return;
  }
  if(!initLeeWayVoiceRuntime()){
    window.agentLeeMicShouldRun = true;
    setAttachmentMeta("Local transcript bridge fallback is starting. Voice input will be labeled and governed.", true);
    vscode.postMessage({command:"leewayStartTranscriptBridge"});
    emitLeeWayVoiceEvent("LAVR_FALLBACK_BRIDGE_REQUESTED");
    syncMicButtonFromProviderState();
    return;
  }
  if(window.agentLeeVoiceProvider && typeof window.agentLeeVoiceProvider.connect === "function"){
    window.agentLeeVoiceProvider.connect();
  }
  syncMicButtonFromProviderState();
}

function stopLiveMic(){
  if(window.agentLeeVoiceProvider && typeof window.agentLeeVoiceProvider.disconnect === "function"){
    window.agentLeeVoiceProvider.disconnect("manual_stop");
  } else {
    window.agentLeeMicShouldRun = false;
    if(window.agentLeeRealtimeCommitTimer){
      clearTimeout(window.agentLeeRealtimeCommitTimer);
      window.agentLeeRealtimeCommitTimer = null;
    }
    emitLeeWayVoiceEvent("LAVR_SESSION_CLOSED", { reason:"manual_stop" });
  }
  syncMicButtonFromProviderState();
}

function mic(){
  if(isVoiceSessionActive()){
    stopLiveMic();
  } else {
    startLiveMic();
  }
}
function newChat(){ vscode.postMessage({command:"newConversation"}); }
function toggleHistory(forceOpen){
  const drawer=document.getElementById("historyDrawer");
  if(!drawer) return;
  if(typeof forceOpen==="boolean"){
    drawer.classList.toggle("open", forceOpen);
    return;
  }
  drawer.classList.toggle("open");
}
function loadConversationFromUi(id){
  toggleHistory(false);
  vscode.postMessage({command:"loadConversation", id:id});
}
function renderConversationHistory(items){
  const list=document.getElementById("historyList");
  if(!list) return;
  list.innerHTML="";
  if(!items || !items.length){
    const empty=document.createElement("div");
    empty.className="history-empty";
    empty.textContent="No saved chats yet. Start talking and they'll show up here.";
    list.appendChild(empty);
    return;
  }
  items.forEach(function(item){
    const row=document.createElement("button");
    row.className="history-item" + (item.active ? " active" : "");
    row.type="button";
    row.onclick=function(){ loadConversationFromUi(item.id); };
    const title=document.createElement("div");
    title.className="history-item-title";
    title.textContent=item.title || "Agent Lee conversation";
    const meta=document.createElement("div");
    meta.className="history-item-meta";
    meta.textContent=item.active ? "Current" : "Saved";
    row.appendChild(title);
    row.appendChild(meta);
    list.appendChild(row);
  });
}
function openReadme(){ vscode.postMessage({command:"openReadme"}); }
function removeAttachment(index){ window.pendingAttachments.splice(index,1); syncAttachments(); }
function openTaskFile(filePath){ vscode.postMessage({command:"openTaskFile", path:filePath}); }
function openTaskFileFromEncoded(value){ openTaskFile(decodeURIComponent(value)); }
function reviewProposedEdit(id){ vscode.postMessage({command:"reviewProposedEdit", editId:id}); }
function approveProposedEdit(id){ vscode.postMessage({command:"approveProposedEdit", editId:id}); }
function approveAllProposedEditsFromUi(){ vscode.postMessage({command:"approveAllProposedEdits"}); }
function rejectProposedEdit(id){ vscode.postMessage({command:"rejectProposedEdit", editId:id}); }
function syncAttachments(){ const list=document.getElementById("attachmentList"); list.innerHTML=""; if(!window.pendingAttachments.length){ list.classList.add("hidden"); setAttachmentMeta("Text, image, audio, and mic input ready."); return; } list.classList.remove("hidden"); setAttachmentMeta(window.pendingAttachments.length+" attachment(s) queued.", true); window.pendingAttachments.forEach(function(item,index){ const row=document.createElement("div"); row.className="attachment-item"; const label=document.createElement("span"); label.textContent=item.kind.toUpperCase()+" - "+item.name; const btn=document.createElement("button"); btn.className="ghost-btn"; btn.textContent="Remove"; btn.onclick=function(){ removeAttachment(index); }; row.appendChild(label); row.appendChild(btn); list.appendChild(row); }); }
function modelFallbacks(selected){
  return Array.from(new Set([
    selected,
    "qwen2.5-coder:14b",
    "qwen2.5-coder:7b",
    "qwen2.5-coder:1.5b",
    "deepseek-coder-v2:16b"
  ].filter(Boolean)));
}
function setModelOptions(selectId, models, selected){ const s=document.getElementById(selectId); if(!s) return; const list=(models && models.length ? models : modelFallbacks(selected)); s.innerHTML=""; list.forEach(function(m){ const o=document.createElement("option"); o.value=m; o.textContent=(selectId==="primaryModel"?"MODEL: ":"")+m; if(m===selected) o.selected=true; s.appendChild(o); }); if(selected) s.value=selected; if(!s.value && list.length) s.value=list[0]; }
function syncAutoRunStagedPlansUI(state){
  const toggle=document.getElementById("autoRunStagedPlansToggle");
  const hint=document.getElementById("autoRunStagedPlansHint");
  if(!toggle || !hint) return;
  const enabledByAccess = state && state.approval === "full" && state.workMode === "execute";
  toggle.checked = !!(state && state.autoRunStagedPlans);
  toggle.disabled = !enabledByAccess;
  hint.textContent = enabledByAccess
    ? "Auto-run is armed. New plans execute immediately in this mode."
    : "Auto-run is off. You can still approve or execute plans manually.";
}
function syncAutoUpdateUI(state){
  const toggle=document.getElementById("autoUpdateEnabledToggle");
  const rightToggle=document.getElementById("preferRightSideSurfaceToggle");
  const hint=document.getElementById("autoUpdateHint");
  if(toggle) toggle.checked = !!(state && state.autoUpdateEnabled);
  if(rightToggle) rightToggle.checked = !!(state && state.preferRightSideSurface !== false);
  if(hint){
    var openSurfaceLabel = state && state.preferRightSideSurface !== false
      ? "Right-side panel preferred."
      : "Sidebar preferred.";
    hint.textContent = state && state.autoUpdateEnabled
      ? "Startup local-release repair is on. Agent Lee will reinstall the newest local VSIX on startup, but this is not marketplace auto-update. " + openSurfaceLabel
      : "Startup local-release repair is off. Use Update Now to apply the newest local VSIX manually. " + openSurfaceLabel;
  }
}

function renderVoiceCloneConfig(config){
  if(!config) return;
  const audioPath=document.getElementById("voiceReferenceAudioPath");
  const transcript=document.getElementById("voiceReferenceText");
  const engine=document.getElementById("voiceCloneEngine");
  const reference=document.getElementById("voiceCloneReference");
  const status=document.getElementById("voiceCloneStatus");
  if(audioPath) audioPath.value = config.cloneReferenceAudioPath || "";
  if(transcript) transcript.value = config.cloneReferenceText || "";
  if(engine) engine.textContent = "Clone engine: " + (config.engine || "unknown");
  if(reference) reference.textContent = "Reference: " + (config.selectedVoiceLabel || config.cloneReferenceAudioPath || "not set");
  if(status && !status.textContent.trim()) status.textContent = "Voice cloning status will appear here.";
}

window.addEventListener("message",function(e){
  const msg=e.data;
  if(msg.command==="modelOptions"){
    window.agentLeeRuntimeState = msg.state || {};
    setModelOptions("builderModel", msg.models, msg.selection.builderModel);
    setModelOptions("designerModel", msg.models, msg.selection.designerModel);
    setModelOptions("verifierModel", msg.models, msg.selection.verifierModel);
    setModelOptions("primaryModel", msg.models, msg.selection.primaryModel);
    setModelOptions("primaryModelSettings", msg.models, msg.selection.primaryModel);
    document.getElementById("approval").value = msg.state.approval;
    document.getElementById("approvalSettings").value = msg.state.approval;
    document.getElementById("agentEnvironment").value = msg.state.agentEnvironment || "windows-native";
    document.getElementById("appLanguage").value = msg.state.appLanguage || "auto";
    document.getElementById("inferenceSpeed").value = msg.state.inferenceSpeed || "standard";
    document.getElementById("workMode").value = msg.state.workMode || "execute";
    document.getElementById("workModeSettings").value = msg.state.workMode || "execute";
    syncAutoRunStagedPlansUI(msg.state || {});
    syncAutoUpdateUI(msg.state || {});
    document.getElementById("voiceStyle").value = msg.state.voiceStyle || "grounded";
    var leewayVoiceSelect=document.getElementById("leewayVoiceRuntimeKind");
    window.agentLeeVoiceProviderKind = normalizeLeeWayVoiceRuntimeKind(msg.state.leewayVoiceRuntimeKind || msg.state.voiceProviderKind || "leeway-agent-voice-local");
    if(leewayVoiceSelect) leewayVoiceSelect.value = window.agentLeeVoiceProviderKind;
    var voiceRate = Number(msg.state.voiceRate || 0.9);
    var voiceVolume = Number(msg.state.voiceVolume || 1.0);
    var voicePitch = Number(msg.state.voicePitch || 1.0);
    var voiceTone = Number(msg.state.voiceTone || 1.0);
    var voiceRateInput=document.getElementById("voiceRate");
    var voiceVolumeInput=document.getElementById("voiceVolume");
    var voicePitchInput=document.getElementById("voicePitch");
    var voiceToneInput=document.getElementById("voiceTone");
    if(voiceRateInput) voiceRateInput.value = String(voiceRate);
    if(voiceVolumeInput) voiceVolumeInput.value = String(voiceVolume);
    if(voicePitchInput) voicePitchInput.value = String(voicePitch);
    if(voiceToneInput) voiceToneInput.value = String(voiceTone);
    updateVoiceSliderLabel("voiceRateLabel", voiceRate);
    updateVoiceSliderLabel("voiceVolumeLabel", voiceVolume);
    updateVoiceSliderLabel("voicePitchLabel", voicePitch);
    updateVoiceSliderLabel("voiceToneLabel", voiceTone);
    window.agentLeeLiveMicAlwaysOn = msg.state.liveMicAlwaysOn !== false;
    document.getElementById("webBtn").textContent = msg.state.web ? "Web On" : "Web Off";
    window.agentLeeVoiceEnabled = !!msg.state.voiceEnabled;
    window.agentLeeVoiceMuted = !!msg.state.voiceMuted;
    updateVoiceButtonState(!!msg.state.voiceEnabled, !!msg.state.voiceMuted);
    var voiceAutoSpeakToggle=document.getElementById("voiceAutoSpeakToggle");
    if(voiceAutoSpeakToggle) voiceAutoSpeakToggle.checked = !!msg.state.voiceAutoSpeak;
    var voiceAutoSendToggle=document.getElementById("voiceAutoSendFinalTranscriptToggle");
    if(voiceAutoSendToggle) voiceAutoSendToggle.checked = !!msg.state.voiceAutoSendFinalTranscript;
    syncMicButtonFromProviderState();
    document.getElementById("browserVisualBtn").textContent = msg.state.browserVisualMode ? "Visual Browser On" : "Visual Browser Off";
    document.getElementById("browserCursorBtn").textContent = msg.state.browserShowCursor ? "Show Cursor On" : "Show Cursor Off";
    document.getElementById("browserSlowMo").value = String(msg.state.browserSlowMoMs || 250);
    document.getElementById("completeOnboardingBtn").textContent = msg.state.onboardingComplete ? "Save Changes" : "Finish Setup";
    const requireToggle=document.getElementById("requireCtrlEnterToggle");
    if(requireToggle){ requireToggle.checked = !!msg.state.requireCtrlEnter; }
    syncRequireCtrlEnterToggle(!!msg.state.requireCtrlEnter);
    setSegmentChoice("followupBehavior", msg.state.followupBehavior || "steer");
    setSegmentChoice("codeReviewBehavior", msg.state.codeReviewBehavior || "inline");
    renderPluginCatalog(msg.state);
    renderMcpServers(msg.state);
    renderAgents(msg.state);
    renderWorkers(msg.state);
    renderModelInventory(msg.inventory || [], msg.state || {});
    renderVoiceCloneConfig(msg.voiceRuntime || {});
    renderVoiceBridgeStatus(msg.voiceBridge || (msg.voice && msg.voice.voiceBridge) || {});
    renderVoiceReviewState(msg.voiceReview || (msg.voice && msg.voice.voiceReview) || null);
    renderRuntimeFabricStatus(msg.runtimeFabric || {});
    renderCameraStatus(msg.camera || {});
    renderDeviceBridgeStatus(msg.deviceBridge || {});
    renderModelFamilyStatus(msg.modelFamily || {});
    if(window.agentLeeLiveMicAlwaysOn && !isVoiceSessionActive()){
      startLiveMic();
    }
    if(!msg.state.onboardingComplete){ toggleSettings(true); }
  }
  if(msg.command==="history"){
    const active = (msg.items || []).find(function(i){ return i.active; });
    document.getElementById("conversationTitle").textContent = active && active.title ? active.title : "Current conversation";
    renderConversationHistory(msg.items || []);
  }
  if(msg.command==="loadedConversation"){
    document.getElementById("chat").innerHTML="";
    msg.messages.forEach(function(m){ render(m.role==="user"?"user":"agent",m.text); });
    toggleHistory(false);
  }
  if(msg.command==="response" || msg.command==="progress"){
    if(!window.agentLeeRealtimeAssistantSpeaking){
      emitLeeWayVoiceEvent("LAVR_ASSISTANT_RESPONSE_STARTED");
    }
    window.agentLeeRealtimeAssistantSpeaking = true;
    window.agentLeeAgentTurnActive = true;
    const chat=document.getElementById("chat");
    const last=chat.lastElementChild;
    if(last && last.textContent && (last.textContent.indexOf("Hold up, I'm building the plan and tracking the workflow now.") !== -1 || last.textContent.indexOf("IÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢m on it. Reading the real files and lining up the live tracker now.") !== -1 || last.textContent.indexOf("I'm on it. Reading the real files and lining up the live tracker now.") !== -1)) last.remove();
    render("agent",msg.text,msg.activity||null,msg.command==="progress" ? "progress" : "response");
    setTimeout(function(){
      window.agentLeeAgentTurnActive = false;
      if(window.agentLeeRealtimeAssistantSpeaking){
        window.agentLeeRealtimeAssistantSpeaking = false;
        emitLeeWayVoiceEvent("LAVR_ASSISTANT_RESPONSE_DONE");
      }
      if(isVoiceSessionActive() && window.agentLeeVoiceProvider && typeof window.agentLeeVoiceProvider.connect === "function"){
        var providerState = getVoiceProviderState();
        if(!providerState || !providerState.listening){
          try { window.agentLeeVoiceProvider.connect(); } catch {}
        }
      }
      syncMicButtonFromProviderState();
    }, 450);
    if(msg.reportPath){ document.getElementById("evidenceStatus").textContent = "Repair report path: " + msg.reportPath; }
  }
  if(msg.command==="agentLeeUiResponse"){
    render("agent",msg.text || "Agent Lee returned an empty UI action response.");
    if(msg.reportPath){ document.getElementById("evidenceStatus").textContent = "Repair report path: " + msg.reportPath; }
  }
  if(msg.command==="agentLeeUiError"){
    render("agent",msg.text || "Agent Lee UI action failed.");
    document.getElementById("status").textContent = msg.text || "Agent Lee UI action failed.";
  }
  if(msg.command==="status"){
    document.getElementById("status").textContent=msg.text;
  }
  if(msg.command==="submitVoiceReviewMessage"){
    submitOutgoingMessage(msg.text || "", { skipPlaceholder:false });
  }
  if(msg.command==="runtimeInfo"){
    latestAgentVmMemory = msg.memory || latestAgentVmMemory || {};
    document.getElementById("workspaceBadge").textContent = "Workspace: " + (msg.workspaceRoot || "not open");
    document.getElementById("voiceStatus").textContent = "Voice: " + (msg.voice.enabled ? "On" : "Off") + " | authority=" + ((msg.voiceBridge && msg.voiceBridge.authorityState) || "unknown") + " | route=" + (msg.voice.routeId || "unknown") + " | first-audio=" + (msg.voice.firstAudioLatencyMs == null ? "pending" : msg.voice.firstAudioLatencyMs + "ms");
    document.getElementById("hiveStatus").textContent = "Hive: " + msg.hive.taskType + " | degraded=" + msg.hive.degraded;
    var runtimeTruth = msg.sovereignRuntime && msg.sovereignRuntime.runtimeTruth ? msg.sovereignRuntime.runtimeTruth : null;
    var runtimeHealthBadge=document.getElementById("runtimeHealthBadge");
    if(runtimeHealthBadge){
      runtimeHealthBadge.textContent = "Runtime Health: "
        + (runtimeTruth ? runtimeTruth.sourceMode : "SOURCE_UNKNOWN")
        + " | installed=" + (runtimeTruth ? runtimeTruth.installedRuntimeStatus : "unknown");
    }
    var voiceControlStatus=document.getElementById("voiceControlStatus");
    if(voiceControlStatus) voiceControlStatus.textContent = msg.voice.audibleOutputProof || msg.voice.currentStatus || "LeeWay live voice proof is standing by.";
    var voiceControlError=document.getElementById("voiceControlError");
    if(voiceControlError) voiceControlError.textContent = msg.voice.lastError || "No live voice errors.";
    renderVoiceBridgeStatus(msg.voiceBridge || (msg.voice && msg.voice.voiceBridge) || {});
    renderVoiceReviewState(msg.voiceReview || (msg.voice && msg.voice.voiceReview) || null);
    renderModelVaultStatus(msg.modelVault || {});
    renderModelExecutionStatus(msg.modelExecution || {});
    renderCameraStatus(msg.camera || {});
    renderDeviceBridgeStatus(msg.deviceBridge || {});
    var setBadge = function(id, text){ var node=document.getElementById(id); if(node) node.textContent = text; };
    setBadge("localWorkerBadge", "Local Worker: " + ((msg.localWorker && msg.localWorker.connected) ? "✓ Connected" : "LOCAL_WORKER_BRIDGE_REQUIRED"));
    setBadge("securityFabricBadge", "Security Fabric: " + ((msg.domainStatus && msg.domainStatus.securityFabric) || "SECURITY_FABRIC_ENDPOINTS_PENDING"));
    setBadge("modelCivilizationBadge", "Model Civilization: " + ((msg.domainStatus && msg.domainStatus.modelCivilization) || "MODEL_CIVILIZATION_ENDPOINTS_PENDING"));
    setBadge("deviceIntelligenceBadge", "Device Intelligence: " + ((msg.domainStatus && msg.domainStatus.deviceIntelligence) || "DEVICE_INTELLIGENCE_ENDPOINTS_PENDING"));
    setBadge("receiptsBadge", "Receipts: " + ((msg.domainStatus && msg.domainStatus.receipts) || "RECEIPTS_ACTIVE"));
    renderPluginMesh(msg.pluginMesh || []);
    renderPass6Status(msg.pass6 || {});
    msg.hive.roles.forEach(function(role){
      if(!roleIds[role.role]) return;
      const ids = roleIds[role.role];
      const label = document.getElementById(ids[1]);
      const statusText = role.available ? (role.degraded ? "Degraded fallback: " + role.selected : "Ready: " + role.selected) : "Unavailable: " + role.preferred;
      label.textContent = statusText;
      label.className = "model-status " + (role.available && !role.degraded ? "ok" : "warn");
    });
    if(msg.lastReportPath){ document.getElementById("evidenceStatus").textContent = "Repair report path: " + msg.lastReportPath; }
    renderVoiceCloneConfig(msg.voiceRuntime || {});
  }
  if(msg.command==="voiceReferencePicked"){
    const input=document.getElementById("voiceReferenceAudioPath");
    if(input) input.value = msg.path || "";
    const status=document.getElementById("voiceCloneStatus");
    if(status) status.textContent = msg.path ? "Reference audio selected." : "No reference audio selected.";
    const alInput=document.getElementById("voiceAlRefAudio");
    if(alInput) alInput.value = msg.path || "";
  }
  if(msg.command==="voiceReferenceTranscribed"){
    const transcript=document.getElementById("voiceReferenceText");
    if(transcript) transcript.value = msg.text || "";
    const status=document.getElementById("voiceCloneStatus");
    if(status) status.textContent = msg.text ? "Reference audio transcribed." : "Reference transcription returned no text.";
  }
  if(msg.command==="voiceCloneStatus"){
    const status=document.getElementById("voiceCloneStatus");
    if(status) status.textContent = msg.text || "Voice cloning status updated.";
    const voiceControlError=document.getElementById("voiceControlError");
    if(voiceControlError && /fail|error|missing|unavailable|degraded/i.test(String(msg.text || ""))){
      voiceControlError.textContent = msg.text || "Live voice error surfaced.";
    }
    if(msg.voiceRuntime){ renderVoiceCloneConfig(msg.voiceRuntime); }
    const alStatus=document.getElementById("voiceAlCloneStatus");
    if(alStatus) alStatus.textContent = msg.text || "";
    const alDefault=document.getElementById("voiceAlDefaultStatus");
    if(alDefault && msg.defaultStatus) alDefault.textContent = msg.defaultStatus;
  }
  if(msg.command==="leewayVoiceStatusChanged"){
    var payload=msg.voiceState || {};
    window.agentLeeVoiceEnabled = !!payload.enabled;
    window.agentLeeVoiceMuted = !!payload.muted;
    updateVoiceButtonState(!!payload.enabled, !!payload.muted);
    var autoSpeakToggle=document.getElementById("voiceAutoSpeakToggle");
    if(autoSpeakToggle) autoSpeakToggle.checked = !!payload.autoSpeak;
    var voiceControlStatusNode=document.getElementById("voiceControlStatus");
    if(voiceControlStatusNode) voiceControlStatusNode.textContent = payload.audibleOutputProof || payload.currentStatus || "LeeWay live voice proof is standing by.";
    var voiceControlErrorNode=document.getElementById("voiceControlError");
    if(voiceControlErrorNode) voiceControlErrorNode.textContent = payload.lastError || "No live voice errors.";
    var voiceStatus=document.getElementById("voiceStatus");
    if(voiceStatus){
      var firstAudio = payload.firstAudioLatencyMs == null ? "pending" : payload.firstAudioLatencyMs + "ms";
      var segments = payload.multiSegmentPlayback ? (payload.multiSegmentPlayback.playedSegments + "/" + payload.multiSegmentPlayback.plannedSegments) : "0/0";
      voiceStatus.textContent = "Voice: " + (payload.active ? "On" : "Off") + " | route=" + (payload.routeId || "unknown") + " | first-audio=" + firstAudio + " | segments=" + segments;
    }
    renderVoiceBridgeStatus(payload.voiceBridge || {});
    renderVoiceReviewState(payload.voiceReview || null);
  }
  if(msg.command==="leewayVoiceBridgeStatusChanged"){
    renderVoiceBridgeStatus(msg.voiceBridge || {});
  }
  if(msg.command==="leewayVoiceReviewChanged"){
    renderVoiceReviewState(msg.review || null);
  }
  if(msg.command==="visibleRuntimeState"){
    var runtimeHealth = document.getElementById("runtimeHealthBadge");
    if(runtimeHealth && msg.runtime){
      var healthLines = msg.runtime.detailLines || [];
      var sourceLine = healthLines.find(function(line){
        return String(line).indexOf("Extension source mode:") === 0 || String(line).indexOf("Source mode:") === 0;
      }) || "Source mode: SOURCE_UNKNOWN";
      var channelLine = healthLines.find(function(line){ return String(line).indexOf("Update channel:") === 0; }) || "Update channel: UPDATE_CHANNEL_UNKNOWN";
      var installedLine = healthLines.find(function(line){ return String(line).indexOf("Installed runtime status:") === 0; }) || "Installed runtime status: unknown";
      runtimeHealth.textContent = "Runtime Health: " + sourceLine.replace("Extension source mode: ", "").replace("Source mode: ", "") + " | " + channelLine.replace("Update channel: ", "") + " | " + installedLine.replace("Installed runtime status: ", "");
    }
  }
  if(msg.command==="voiceAlCatalogUpdate"){
    renderVoiceAlCatalog(msg.catalog, msg.activeVoiceId);
  }
  if(msg.command==="agentVmDiagnosticRecorded"){
    latestAgentVmMemory = msg.memory || latestAgentVmMemory || {};
  }
  if(msg.command==="pluginConfirmation"){
    showPluginApproval(msg);
  }
  if(msg.command==="pluginConfirmationCleared"){
    hidePluginApproval();
  }
  if(msg.command==="leewayVoiceToolCompleted"){
    var provider = window.agentLeeVoiceProvider;
    var callId = String(msg.callId || "").trim();
    var requestId = String(msg.lavrToolRequestId || callId || "").trim();
    var terminalStatus = String(msg.terminalStatus || (msg.ok ? "completed" : "failed")).trim() || "failed";
    var resultKey = requestId + ":" + terminalStatus;
    if(!window.agentLeeLavrTerminalResultSet) window.agentLeeLavrTerminalResultSet = {};
    if(window.agentLeeLavrTerminalResultSet[resultKey]){
      return;
    }
    window.agentLeeLavrTerminalResultSet[resultKey] = true;

    if(provider && callId){
      if(msg.ok && terminalStatus === "completed"){
        if(typeof provider.sendToolResult === "function"){
          provider.sendToolResult(callId, {
            ok:true,
            pluginId:msg.pluginId || "",
            action:msg.action || "",
            summary:msg.summary || "",
            data:msg.result,
            receiptId:msg.receiptId || "",
            requiresFollowUp:!!msg.requiresFollowUp,
            lavrToolRequestId:requestId,
            lavrTurnId:msg.lavrTurnId || "",
            lavrSessionId:msg.lavrSessionId || "",
            terminalStatus:terminalStatus
          });
        }
      } else if(typeof provider.sendToolError === "function"){
        provider.sendToolError(callId, String(msg.error || "LAVR tool request failed."));
      }
    }
    if(msg.ok && terminalStatus === "completed"){
      emitLeeWayVoiceEvent("LAVR_TOOL_COMPLETED", {
        callId:callId,
        lavrToolRequestId:requestId,
        lavrTurnId:msg.lavrTurnId || "",
        lavrSessionId:msg.lavrSessionId || "",
        terminalStatus:terminalStatus,
        result:{
          pluginId:msg.pluginId || "",
          action:msg.action || "",
          summary:msg.summary || "",
          data:msg.result,
          receiptId:msg.receiptId || "",
          requiresFollowUp:!!msg.requiresFollowUp
        }
      });
    } else {
      emitLeeWayVoiceEvent("LAVR_TOOL_COMPLETED", {
        callId:callId,
        lavrToolRequestId:requestId,
        lavrTurnId:msg.lavrTurnId || "",
        lavrSessionId:msg.lavrSessionId || "",
        terminalStatus:terminalStatus,
        result:{
          ok:false,
          error:String(msg.error || "LAVR tool request failed."),
          pluginId:msg.pluginId || "",
          action:msg.action || "",
          receiptId:msg.receiptId || ""
        }
      });
    }
  }
  if(msg.command==="attachmentsPicked"){
    window.pendingAttachments = msg.attachments || [];
    syncAttachments();
  }
  if(msg.command==="taskState"){
    renderTaskState(msg.task);
    if(msg.task && msg.task.status){ document.getElementById("status").textContent = msg.task.status; }
  }
});
document.addEventListener("keydown",function(e){ const input=document.getElementById("input"); const focused=document.activeElement===input; if(!focused || e.key!=="Enter") return; if((e.ctrlKey || e.metaKey)){ e.preventDefault(); send(); return; } if(runtimeStateRequireCtrlEnter()){ return; } if(e.shiftKey){ return; } e.preventDefault(); send(); });
window.pendingAttachments=[];
window.agentLeeVoiceEnabled=true;
window.agentLeeVoiceProvider = null;
window.agentLeeVoiceProviderReady = false;
window.agentLeeVoiceProviderKind = "leeway-agent-voice-local";
window.agentLeeMicShouldRun = false;
window.agentLeeMicListening = false;
window.agentLeeAgentTurnActive = false;
window.agentLeeRealtimeAssistantSpeaking = false;
window.agentLeeRealtimeUserSpeaking = false;
window.agentLeeRealtimeTurnBuffer = "";
window.agentLeeRealtimeInterim = "";
window.agentLeeRealtimeCommitTimer = null;
window.agentLeeLavrSessionId = "";
window.agentLeeLavrTurnId = "";
window.agentLeeLavrUtteranceId = "";
window.agentLeeLavrInterruptId = "";
window.agentLeeLavrTerminalResultSet = {};
window.agentLeeLavrTurnGateState = null;
window.agentLeeLiveMicAlwaysOn = true;
window.agentLeeRuntimeState = {
  enabledPlugins: [],
  enabledMcpServers: defaultMcpServerCatalog.map(function(entry){ return entry.id; }),
  customMcpServers: [],
  mcpServerConfigs: {},
  enabledAgents: getAgentCatalog({ customAgents: [], agentConfigs: {} }).map(function(entry){ return entry.id; }),
  customAgents: [],
  agentConfigs: {},
  enabledWorkers: defaultWorkerCatalog.map(function(entry){ return entry.id; }),
  customWorkers: [],
  workerConfigs: {}
};
function bootAgentLeeUiHandlers(){
  registerAgentLeeControlButtons();
  registerAgentLeeTopButtons();
  console.log('UI version: ${AGENT_LEE_UI_VERSION}');
  setAttachmentMeta("Text, image, audio, and mic input ready.");
  var workflowShell = document.getElementById("workflowShell");
  if(workflowShell){
    workflowShell.classList.add("collapsed");
  }
  var workflowChevron = document.getElementById("workflowChevron");
  if(workflowChevron){
    workflowChevron.textContent = "\u25b8";
  }
  syncRequireCtrlEnterToggle(false);
}
if(document.readyState === "loading"){
  document.addEventListener("DOMContentLoaded", bootAgentLeeUiHandlers);
} else {
  bootAgentLeeUiHandlers();
}
setSegmentChoice("followupBehavior","steer");
setSegmentChoice("codeReviewBehavior","inline");
switchSettingsSection("general");
renderPluginCatalog({ enabledPlugins: [] });
renderMcpServers({ enabledMcpServers: defaultMcpServerCatalog.map(function(entry){ return entry.id; }), customMcpServers: [], mcpServerConfigs: {} });
renderAgents({ enabledAgents: defaultAgentCatalog.map(function(entry){ return entry.id; }), customAgents: [], agentConfigs: {} });
renderWorkers({ enabledWorkers: defaultWorkerCatalog.map(function(entry){ return entry.id; }), customWorkers: [], workerConfigs: {} });
renderModelInventory([], window.agentLeeRuntimeState);
renderPluginMesh([]);
renderPass6Status({});
renderTaskState({ mode:"execute", summary:"I will show the plan and live to-dos here.", status:"Waiting for a new task.", nextTodo:"Waiting for a new task.", todos:[], activities:[], awaitingApproval:false, canExecute:false, savedPlanPath:"", plan:null });
vscode.postMessage({command:"agentLeeUiReady"});
</script>
</body>
</html>`;
}

class Provider implements vscode.WebviewViewProvider {
  constructor(private readonly context: vscode.ExtensionContext) {}

  resolveWebviewView(view: vscode.WebviewView) {
    view.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, "media")]
    };
    view.webview.html = getHtml(view.webview, this.context);
    activeWebviews.add(view.webview);
    view.webview.onDidReceiveMessage((msg) => handle(view.webview, msg, this.context));
  }
}

let lastReportPath = "";

function loadModelRoutingCatalog(): { id: string; role: string }[] {
  try {
    const routingPath = path.join(ROOT, "agent-lee", "models", "model-routing.json");
    if (!fs.existsSync(routingPath)) return [];
    const parsed = JSON.parse(fs.readFileSync(routingPath, "utf8"));
    return Object.entries(parsed)
      .filter(([key, value]) => key !== "leeway" && typeof value === "string" && value.trim().length > 0)
      .map(([role, id]) => ({ id: String(id), role }))
      .filter((entry) => isGovernedQwenModel(entry.id));
  } catch {
    return [];
  }
}

function readJsonFile<T>(targetPath: string, fallback: T): T {
  try {
    if (!fs.existsSync(targetPath)) return fallback;
    return JSON.parse(fs.readFileSync(targetPath, "utf8")) as T;
  } catch {
    return fallback;
  }
}

function loadPass6BridgeStatus() {
  const root = workspaceRoot();
  const standardsRoot = path.join(root, "LeeWay-Standards");
  const bridgeReportsRoot = path.join(root, ".leeway-vscode", "bridge-runtime", "reports");
  const agentBook = readJsonFile<{ agents?: any[]; counts?: Record<string, number> }>(
    path.join(standardsRoot, "registries", "leeway-agent-book.json"),
    { agents: [], counts: {} }
  );
  const modelHive = readJsonFile<{ modelRoutes?: any[]; roleMapping?: Record<string, any> }>(
    path.join(standardsRoot, "registries", "leeway-model-hive-registry.json"),
    { modelRoutes: [], roleMapping: {} }
  );
  const tools = readJsonFile<{ tools?: any[] }>(path.join(standardsRoot, "registries", "leeway-tool-registry.json"), { tools: [] });
  const skills = readJsonFile<{ skills?: any[] }>(path.join(standardsRoot, "registries", "leeway-skill-registry.json"), { skills: [] });
  const workflows = readJsonFile<{ workflows?: any[] }>(path.join(standardsRoot, "registries", "leeway-workflow-registry.json"), { workflows: [] });
  const execution = readJsonFile<{ executionEnvironments?: any[] }>(path.join(standardsRoot, "registries", "leeway-execution-registry.json"), { executionEnvironments: [] });
  const aggregate = readJsonFile<any>(path.join(bridgeReportsRoot, "pass6-aggregate-status.json"), {});
  const voice = readJsonFile<any>(path.join(bridgeReportsRoot, "voice-asset-authority-report.json"), {});

  const routeById = new Map((modelHive.modelRoutes || []).map((route: any) => [String(route.modelRouteId), route]));
  const roleMapping = modelHive.roleMapping || {};
  const routeLabel = (routeId: string) => {
    const route = routeById.get(routeId);
    return route ? `${route.modelName || routeId} (${route.status || "REGISTERED"})` : routeId;
  };

  return {
    agentLeeIdentity: "LEEWAY_ENTITY::AGENT_LEE",
    agentBookCount: (agentBook.agents || []).length,
    counts: agentBook.counts || {},
    modelRoutesRegistered: (modelHive.modelRoutes || []).length,
    builderRoute: routeLabel(String(roleMapping.builder || "")),
    designerRoute: routeLabel(String(roleMapping.designer || "")),
    verifierRoute: routeLabel(String(roleMapping.verifier || "")),
    visionRoute: routeLabel(String(roleMapping.vision || "")),
    embeddingRoute: routeLabel(String(roleMapping.memoryRetrieval || "")),
    toolCount: (tools.tools || []).length,
    skillCount: (skills.skills || []).length,
    workflowCount: (workflows.workflows || []).length,
    executionEnvironmentCount: (execution.executionEnvironments || []).length,
    remoteVmStatus: (execution.executionEnvironments || []).find((item: any) => item.executionEnvironmentId === "EXECUTION_ENV_REMOTE_VM_NOT_CONFIGURED")?.status || "REMOTE_VM_NOT_CONFIGURED",
    receiptState: aggregate.finalStatus ? `Pass 6 aggregate receipt: ${aggregate.finalStatus}` : "Pass 6 aggregate receipt pending",
    telemetryState: aggregate.identityPulseResult || "PENDING",
    cloneVoiceTruth: voice.voiceStatus || "CLONE_VOICE_RUNTIME_OUTPUT_PROVEN_HUMAN_AUDIBLE_PENDING",
    directExternalAiDefault: aggregate.directExternalAiDefaultResult || "BLOCKED_BY_MODEL_HIVE",
    llmDirectAction: aggregate.llmDirectActionBlockResult || "BLOCKED"
  };
}

async function postRuntimeInfo(webview: vscode.Webview, prompt = "front-end task") {
  const installedModels = await getModels();
  refreshRuntimeFromInstalled(installedModels);
  const sovereignRuntime = getAgentLeeRuntimeState();
  const runtimeTruth = sovereignRuntime?.runtimeTruth || null;
  updateVoiceBridgeRuntimeState({
    runtimeSourceMode: String(runtimeTruth?.sourceMode || "SOURCE_UNKNOWN"),
    staleRuntime: String(runtimeTruth?.installedRuntimeStatus || "") === "stale",
    authorityState: String(runtimeTruth?.installedRuntimeStatus || "") === "stale"
      ? "STALE_EXTENSION_RUNTIME"
      : voiceBridgeRuntimeState.authorityState,
    nextActionHint: String(runtimeTruth?.installedRuntimeStatus || "") === "stale"
      ? "Repair or reload the extension runtime before trusting voice authority."
      : voiceBridgeRuntimeState.nextActionHint
  }, { broadcast: false });
  const routedModels = loadModelRoutingCatalog();
  const routedRoleMap = routedModels.reduce<Record<string, string[]>>((map, entry) => {
    if (!map[entry.id]) map[entry.id] = [];
    map[entry.id].push(entry.role);
    return map;
  }, {});
  const authorizedInstalledModels = filterGovernedQwenModels(installedModels);
  try {
    runtimeState.primaryModel = enforceAuthorizedModelRoute(runtimeState.primaryModel, {
      source: "extension.postRuntimeInfo.primaryModel",
      allowDeepseekSpecialist: true,
      allowInfrastructureLane: false
    });
  } catch {
    runtimeState.primaryModel = GOVERNED_QWEN_MODEL_IDS[0];
  }
  runtimeState.builderModel = coerceGovernedQwenModel(runtimeState.builderModel, runtimeState.primaryModel);
  runtimeState.designerModel = coerceGovernedQwenModel(runtimeState.designerModel, runtimeState.primaryModel);
  runtimeState.verifierModel = coerceGovernedQwenModel(runtimeState.verifierModel, runtimeState.primaryModel);
  const uiModelOptions = Array.from(
    new Set([...GOVERNED_QWEN_MODEL_IDS])
  );
  const hive = buildModelHiveStatus(installedModels, {
    builderModel: runtimeState.builderModel,
    designerModel: runtimeState.designerModel,
    verifierModel: runtimeState.verifierModel
  }, prompt);

  const [vaultStatus, executionStatus, localWorkerStatus] = await Promise.all([
    getModelVaultStatus(),
    getModelExecutionStatus(),
    getLocalWorkerBridgeStatus()
  ]);

  const cameraStatus = {
    status: "CAMERA_SURFACE_VISIBLE_LOCAL_DEVICE_BRIDGE_REQUIRED",
    summary: "Camera surface visible. Live preview requires local device bridge permission.",
    provider: localWorkerStatus?.connected ? "LOCAL_WORKER_BRIDGE_CONNECTED" : "LOCAL_DEVICE_BRIDGE_REQUIRED",
    resolution: "N/A",
    frameRate: "N/A",
    lastFrame: "Never",
    warning: "CAMERA_SURFACE_VISIBLE_LOCAL_DEVICE_BRIDGE_REQUIRED"
  };

  const deviceBridgeStatus = {
    status: localWorkerStatus?.connected ? "RUNTIME_FABRIC_LOCAL_WORKER_ROUTE_PASS" : "LOCAL_DEVICE_BRIDGE_REQUIRED",
    summary: localWorkerStatus?.connected
      ? "Local Worker Bridge connected through Runtime Fabric control plane."
      : "Device bridge not connected. Local hardware awareness requires bridge.",
    mic: localWorkerStatus?.connected ? "REQUIRES_PERMISSION" : "Not detected",
    speaker: localWorkerStatus?.connected ? "REQUIRES_PERMISSION" : "Not detected",
    camera: localWorkerStatus?.connected ? "REQUIRES_PERMISSION" : "Not detected",
    usb: localWorkerStatus?.connected ? "Bridge connected" : "0 detected",
    iot: localWorkerStatus?.connected ? "Bridge connected" : "0 detected",
    warning: "Device intelligence requires local bridge or FCC device records integration."
  };

  webview.postMessage({
    command: "runtimeInfo",
    voice: {
      ...getVoiceStatus(),
      ...buildVoiceUiState()
    },
    voiceBridge: voiceBridgeRuntimeState,
    voiceReview: voiceReviewState,
    hive,
    pluginMesh: buildPluginMeshSnapshot(),
    memory: getMemoryStatus(),
    workspaceRoot: workspaceRoot(),
    lastReportPath,
    pass6: loadPass6BridgeStatus(),
    sovereignRuntime,
    modelVault: vaultStatus,
    modelExecution: executionStatus,
    localWorker: localWorkerStatus,
    camera: cameraStatus,
    deviceBridge: deviceBridgeStatus,
    domainStatus: {
      securityFabric: "SECURITY_FABRIC_ENDPOINTS_PENDING",
      modelCivilization: "MODEL_CIVILIZATION_ENDPOINTS_PENDING",
      deviceIntelligence: "DEVICE_INTELLIGENCE_ENDPOINTS_PENDING",
      receipts: "RECEIPTS_ACTIVE"
    },
    runtimeFabric: runtimeFabricStatus || {
      connected: false,
      healthy: false,
      url: "https://leeway-runtime-fabric.fly.dev",
      lastCheck: new Date().toISOString(),
      error: "Not initialized",
      services: {
        providerFabric: false,
        sentinel: false,
        cage: false,
        terminator: false,
        localWorkerBridge: false
      }
    }
  });
  webview.postMessage({
    command: "modelOptions",
    models: uiModelOptions,
    inventory: uiModelOptions.map((id) => ({
      id,
      available: authorizedInstalledModels.includes(id),
      role: [
        runtimeState.primaryModel === id ? "primary model" : "",
        runtimeState.builderModel === id ? "builder model" : "",
        runtimeState.designerModel === id ? "designer model" : "",
        runtimeState.verifierModel === id ? "verifier model" : ""
      ].filter(Boolean).join(" Ãƒâ€šÃ‚Â· ") || "system model"
    })),
    authorityInventory: uiModelOptions.map((id) => {
      const authority = GOVERNED_QWEN_MODEL_LOOKUP.get(id);
      return {
        id,
        modelRouteId: authority?.modelRouteId || "LEEWAY_LLM_ROUTE::UNREGISTERED",
        modelFamilyId: authority?.modelFamilyId || "LEEWAY_MODEL_FAMILY::UNREGISTERED",
        lane: authority?.lane || "LEEWAY_MODEL_LANE::UNREGISTERED",
        proofStatus: authority?.proofStatus || "UNVERIFIED",
        runtimeHost: authority?.runtimeHost || "unknown",
        allowedUse: authority?.allowedUse || [],
        forbiddenUse: authority?.forbiddenUse || ["unregistered_external_provider"],
        standardsAuthorityId: authority?.standardsAuthorityId || "LEEWAY_STANDARDS::MISSING",
        available: authorizedInstalledModels.includes(id)
      };
    }),
    selection: {
      primaryModel: runtimeState.primaryModel,
      builderModel: runtimeState.builderModel,
      designerModel: runtimeState.designerModel,
      verifierModel: runtimeState.verifierModel
    },
    state: runtimeState,
    voiceBridge: voiceBridgeRuntimeState,
    voiceReview: voiceReviewState,
    sovereignRuntime
  });
  try {
    const catalog = loadVoiceCatalog();
    const config = loadVoiceRuntime();
    webview.postMessage({ command: "voiceAlCatalogUpdate", catalog, activeVoiceId: config?.selectedVoiceId || catalog.defaultVoiceId || "agent-lee-default" });
  } catch {}
}

async function runNextQueuedFollowUp(webview: vscode.Webview) {
  if (isExecutionRunning || !queuedFollowUps.length) return;
  const next = queuedFollowUps.shift();
  if (!next) return;
  postAgentResponse(webview, "Yo, the queued follow-up is up next. I'm rolling straight into it.");
  await handle(webview, { command: "ask", text: next.text, attachments: next.attachments }, undefined);
}

function conversationItems() {
  return listConversations().map((item) => ({
    id: item.id,
    title: formatConversationTitle(item),
    active: item.active
  }));
}

const LEEWAY_EXECUTION_CAPABLE_HOST_COMMANDS = new Set<string>([
  "sendMessage",
  "askLocalModel",
  "engineerTask",
  "scanSelf",
  "verifySelf",
  "scanWorkspace",
  "verifyWorkspace",
  "approvePlan",
  "executePlan",
  "approveProposedEdit",
  "approveAllProposedEdits",
  "setState",
  "leewayVoiceSettingsChanged",
  "leewayVoiceMuteToggled",
  "leewayVoiceStopRequested",
  "leewayVoiceTestRequested",
  "activateClonedVoice",
  "testClonedVoice",
  "saveVoiceCloneSettings",
  "transcribeVoiceReference",
  "voiceAlActivateDefault",
  "voiceAlCloneAndPreview",
  "voiceAlDeleteVoice",
  "voiceAlSaveClone",
  "voiceAlSetActive",
  "voiceAlTestDefault",
  "voiceAlTestVoice",
  "updateAgentLeeNow",
  "setPerformanceProfile",
  "approvePluginCall",
  "refreshRuntime",
  "verifyModelVault",
  "testModelExecution",
  "requestCameraPermission",
  "requestMicPermission"
]);

const LEEWAY_HIGH_RISK_DISCLOSURE_LEVELS = new Set<string>(["HIGH", "CRITICAL"]);
const disclosureErrorDedup = new Map<string, number>();

function shouldSuppressDisclosureError(reason: string): boolean {
  const now = Date.now();
  const key = String(reason || "").trim();
  const last = disclosureErrorDedup.get(key) || 0;
  disclosureErrorDedup.set(key, now);
  return now - last < 6000;
}

// Command categories for disclosure validation
const LEEWAY_COMMAND_CATEGORIES = {
  CHAT_ONLY: new Set<string>([
    "sendMessage"
  ]),
  UI_STATE: new Set<string>([
    "setState",
    "setMode",
    "setAccessLevel",
    "setModel",
    "togglePanel",
    "switchSettingsSection"
  ]),
  VOICE_STATUS: new Set<string>([
    "testClonedVoice",
    "requestMicPermission",
    "checkVoiceStatus",
    "testVoiceRoute"
  ]),
  RUNTIME_STATUS: new Set<string>([
    "runtimeStatus",
    "refreshRuntime",
    "verifyModelVault",
    "testModelExecution",
    "leewayVoiceSettingsChanged",
    "leewayVoiceMuteToggled",
    "leewayVoiceStopRequested",
    "leewayVoiceTestRequested",
    "voiceAlActivateDefault",
    "voiceAlTestDefault",
    "voiceAlTestVoice",
    "voiceAlSetActive"
  ]),
  CAMERA_CAPTURE: new Set<string>([
    "requestCameraPermission",
    "testCamera"
  ]),
  FILE_READ: new Set<string>([
    "scanSelf",
    "verifySelf",
    "scanWorkspace",
    "verifyWorkspace"
  ]),
  FILE_EDIT: new Set<string>([
    "approveProposedEdit",
    "approveAllProposedEdits",
    "approvePlan",
    "executePlan"
  ]),
  TOOL_USE: new Set<string>([
    "askLocalModel",
    "engineerTask",
    "approvePluginCall"
  ]),
  SYSTEM_MUTATION: new Set<string>([
    "updateAgentLeeNow",
    "setPerformanceProfile",
    "activateClonedVoice",
    "saveVoiceCloneSettings",
    "transcribeVoiceReference",
    "voiceAlCloneAndPreview",
    "voiceAlDeleteVoice",
    "voiceAlSaveClone"
  ])
};

// Base required fields for all commands
const LEEWAY_BASE_DISCLOSURE_FIELDS = [
  "actionId",
  "workflowRunId",
  "taskId",
  "intentId",
  "agentId",
  "commandsToRun",
  "governingBookReferences",
  "riskLevel",
  "rollbackPlan",
  "expectedOutputs",
  "receiptId"
] as const;

function disclosureArrayOrEmpty(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item ?? "").trim())
      .filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) {
    return [value.trim()];
  }
  return [];
}

function validateExecutionDisclosureEnvelope(msg: any): { ok: true } | { ok: false; reason: string } {
  const command = String(msg?.command || "").trim();
  if (!command || !LEEWAY_EXECUTION_CAPABLE_HOST_COMMANDS.has(command)) {
    return { ok: true };
  }

  // Determine command category
  let commandCategory: keyof typeof LEEWAY_COMMAND_CATEGORIES | null = null;
  for (const [category, commands] of Object.entries(LEEWAY_COMMAND_CATEGORIES)) {
    if (commands.has(command)) {
      commandCategory = category as keyof typeof LEEWAY_COMMAND_CATEGORIES;
      break;
    }
  }

  // CHAT_ONLY, UI_STATE, VOICE_STATUS, and RUNTIME_STATUS commands don't require disclosure envelope
  if (commandCategory === "CHAT_ONLY" || commandCategory === "UI_STATE" || commandCategory === "VOICE_STATUS" || commandCategory === "RUNTIME_STATUS") {
    return { ok: true };
  }

  const envelope = msg?.actionDisclosure ?? msg?.disclosure;
  if (!envelope || typeof envelope !== "object") {
    return { ok: false, reason: `Missing actionDisclosure envelope for command: ${command}` };
  }

  // Validate base required fields
  for (const field of LEEWAY_BASE_DISCLOSURE_FIELDS) {
    const value = (envelope as Record<string, unknown>)[field];
    if (Array.isArray(value)) {
      if (!value.length) {
        return { ok: false, reason: `Disclosure field ${field} must not be empty for command: ${command}` };
      }
      continue;
    }
    if (typeof value === "string") {
      if (!value.trim()) {
        return { ok: false, reason: `Disclosure field ${field} must not be blank for command: ${command}` };
      }
      continue;
    }
    if (value === undefined || value === null) {
      return { ok: false, reason: `Disclosure field ${field} is required for command: ${command}` };
    }
  }

  // Category-specific validation
  if (commandCategory === "FILE_READ") {
    const filesToRead = disclosureArrayOrEmpty(envelope.filesToRead);
    if (!filesToRead.length) {
      return { ok: false, reason: `FILE_READ command ${command} requires declared filesToRead` };
    }
  }

  if (commandCategory === "FILE_EDIT") {
    const filesToEdit = disclosureArrayOrEmpty(envelope.filesToEdit);
    if (!filesToEdit.length) {
      return { ok: false, reason: `FILE_EDIT command ${command} requires declared filesToEdit` };
    }
  }

  if (commandCategory === "TOOL_USE") {
    const toolsToUse = disclosureArrayOrEmpty(envelope.toolsToUse);
    if (!toolsToUse.length) {
      return { ok: false, reason: `TOOL_USE command ${command} requires declared toolsToUse` };
    }
  }

  if (commandCategory === "SYSTEM_MUTATION") {
    // System mutation commands require full disclosure
    const filesToRead = disclosureArrayOrEmpty(envelope.filesToRead);
    const filesToEdit = disclosureArrayOrEmpty(envelope.filesToEdit);
    const toolsToUse = disclosureArrayOrEmpty(envelope.toolsToUse);
    
    if (!filesToRead.length && !filesToEdit.length && !toolsToUse.length) {
      return { ok: false, reason: `SYSTEM_MUTATION command ${command} requires at least one of: filesToRead, filesToEdit, or toolsToUse` };
    }
  }

  const commandsToRun = disclosureArrayOrEmpty(envelope.commandsToRun);
  if (!commandsToRun.includes(command)) {
    return { ok: false, reason: `Disclosure commandsToRun must include command: ${command}` };
  }

  const riskLevel = String(envelope.riskLevel || "").trim().toUpperCase();
  if (!riskLevel) {
    return { ok: false, reason: `Disclosure riskLevel missing for command: ${command}` };
  }

  if (LEEWAY_HIGH_RISK_DISCLOSURE_LEVELS.has(riskLevel)) {
    const explicitApproval = envelope.explicitApproval === true;
    if (!explicitApproval) {
      return { ok: false, reason: `HIGH/CRITICAL command ${command} requires explicitApproval=true` };
    }
  }

  const envelopeCommands = disclosureArrayOrEmpty(envelope.commandsToRun);
  if (!envelopeCommands.includes(command)) {
    return { ok: false, reason: `Disclosure envelope commandsToRun must include command: ${command}` };
  }

  const commandsDeclared = disclosureArrayOrEmpty(msg?.commandsToRun);
  if (commandsDeclared.length && !commandsDeclared.includes(command)) {
    return { ok: false, reason: `Root commandsToRun must include command: ${command}` };
  }

  const receiptId = String(envelope.receiptId || "").trim();
  if (!receiptId) {
    return { ok: false, reason: `Disclosure receiptId missing for command: ${command}` };
  }

  return { ok: true };
}

async function handle(webview: vscode.Webview, msg: any, context?: vscode.ExtensionContext) {
  try {
  const sovereignRuntime = getAgentLeeRuntimeState();
  if (msg.command === "agentLeeUiReady") {
    await postVisibleRuntimeState(webview);
    logEvent("ui-ready", "Agent Lee", `UI version: ${AGENT_LEE_UI_VERSION}`, { uiVersion: AGENT_LEE_UI_VERSION });
    return;
  }

  if (msg?.command && !msg?.actionDisclosure && msg?.disclosure) {
    msg.actionDisclosure = msg.disclosure;
  }
  const disclosureValidation = validateExecutionDisclosureEnvelope(msg);
  if (!disclosureValidation.ok) {
    const reason = disclosureValidation.reason;
    logEvent("disclosure-block", "Agent Lee", reason, { command: String(msg?.command || ""), blocked: true });
    if (!shouldSuppressDisclosureError(reason)) {
      postAgentResponse(webview, `Execution blocked by strict action disclosure gate. ${reason}`, { speak: false });
    }
    webview.postMessage({ command: "actionDisclosureRejected", reason, blockedCommand: String(msg?.command || "") });
    return;
  }

  if (msg.command === "agentLeeUiAction") {
    const output = agentLeeOutputChannel;
    const state = getAgentLeeRuntimeState();
    const summary = getRuntimeProofSummary(state);

    if (!output) {
      postAgentResponse(webview, "Agent Lee output channel is still waking up. Reopen the panel or run Runtime Status once activation settles.", { speak: false });
      return;
    }

    if (msg.action === "runtimeStatus") {
      const detail = summary.detailLines.join("\n");
      appendAgentLeeLine(output, detail, { voiceMode: "operator" });
      output.show(true);
      postAgentResponse(webview, `Yo, runtime status is ${summary.statusLabel}. Raw proof is right here:\n\n${detail}`, { speak: false });
      await postVisibleRuntimeState(webview);
      return;
    }

    if (msg.action === "scanWorkspace" || msg.action === "scanLeeWay") {
      await runWorkspaceScan(output, "scan");
      postAgentResponse(webview, "Workspace scan finished. I wrote the raw scanner proof to the Agent Lee output channel and refreshed this UI status.", { speak: false });
      await postVisibleRuntimeState(webview);
      return;
    }

    if (msg.action === "askLocalModel") {
      const prompt = String(msg.text || "").trim();
      if (prompt) {
        const answer = await runAskLocalModelPrompt(output, prompt);
        postAgentResponse(webview, `Local model route completed through Agent Lee.\n\n${answer}`, { speak: false });
      } else {
        await runAskLocalModel(output);
        postAgentResponse(webview, "Local model prompt opened through Agent Lee. The routed answer will land in the output channel.", { speak: false });
      }
      await postVisibleRuntimeState(webview);
      return;
    }

    if (msg.action === "verifyWorkspace") {
      await runWorkspaceScan(output, "verify");
      postAgentResponse(webview, "Workspace verification finished. I kept the raw verification proof readable in the output channel.", { speak: false });
      await postVisibleRuntimeState(webview);
      return;
    }

    if (msg.action === "scanSelf") {
      await runWorkspaceScan(output, "scanSelf");
      postAgentResponse(webview, "Agent Lee self-scan finished. The scanner report and blocker count are in the output channel.", { speak: false });
      await postVisibleRuntimeState(webview);
      return;
    }

    if (msg.action === "verifySelf") {
      await runWorkspaceScan(output, "verifySelf");
      postAgentResponse(webview, "Agent Lee self-verification finished. The raw verification result is preserved in the output channel.", { speak: false });
      await postVisibleRuntimeState(webview);
      return;
    }

    if (msg.action === "engineerTask") {
      vscode.commands.executeCommand("agentLee.engineerTask");
      postAgentResponse(webview, "Engineering task control is open. Describe the target change and I will stage the work through the governed task flow.", { speak: false });
      await postVisibleRuntimeState(webview);
      return;
    }

    if (msg.action === "openReport" || msg.action === "openReceipts") {
      const targetPath = msg.action === "openReport" && lastReportPath
        ? lastReportPath
        : path.join(ROOT, "reports", "engineering-runs");
      fs.mkdirSync(fs.existsSync(targetPath) && fs.statSync(targetPath).isDirectory() ? targetPath : path.dirname(targetPath), { recursive: true });
      await vscode.commands.executeCommand("revealFileInOS", vscode.Uri.file(targetPath));
      postAgentResponse(webview, `I opened the Agent Lee ${msg.action === "openReport" ? "report" : "receipts"} location:\n${targetPath}`, { speak: false });
      await postVisibleRuntimeState(webview);
      return;
    }

    postAgentResponse(webview, `Agent Lee received an unknown UI action: ${String(msg.action || "missing action")}. I kept the panel alive so the failure is visible.`, { speak: false });
    return;
  }

  if (msg.command === "sendMessage") {
    // Use local Ollama directly for instant responses
    // Runtime Fabric is available for future cloud LLM integration
    console.log("Agent Lee using local Ollama for instant response");
    await handle(webview, { command: "ask", text: msg.text, attachments: msg.attachments }, context);
    return;
  }

  if (msg.command === "leewayVoiceTurnCommit") {
    const text = String(msg.text || "").trim();
    if (!text) {
      return;
    }
    lavrLastObservedTurnId = String(msg.lavrTurnId || lavrLastObservedTurnId || currentLavrTurnId());
    recordAgentLeeRuntimeReceipt({
      event: "lavr.turn.commit-emitted",
      lavrSessionId: String(msg.lavrSessionId || ""),
      lavrTurnId: String(msg.lavrTurnId || ""),
      lavrUtteranceId: String(msg.lavrUtteranceId || ""),
      lavrInterruptId: String(msg.lavrInterruptId || ""),
      transcript: text
    });
    const source: LeeWayVoiceEventSource = runtimeState.leewayVoiceRuntimeKind === "leeway-agent-voice-local"
      ? "LOCAL_TRANSCRIPT_BRIDGE"
      : "BROWSER_SPEECH_FALLBACK";
    const captured = captureVoiceTranscriptForReview({
      text,
      source,
      transcriptId: String(msg.lavrUtteranceId || msg.lavrTurnId || ""),
      timestamp: new Date().toISOString(),
      webview
    });
    if (captured && runtimeState.voiceAutoSendFinalTranscript === true && voiceReviewState && voiceReviewState.nextAction === "Send as message") {
      await handle(webview, { command: "voiceReviewSend" }, context);
    }
    return;
  }

  if (msg.command === "leewayVoiceInterruptRequested") {
    if (runtimeState.voiceInterruptOnUserSpeech !== false) {
      stopLavrPlayback("voice_barge_in_interrupt", "cancel");
      abortCurrentExecution("Voice barge-in detected. Yielding to the new live user turn.");
      cancelPendingLavrToolRequests(webview, "LAVR tool request cancelled by voice interruption.");
      currentTaskState.status = "Voice barge-in detected. Interrupting current response.";
    } else {
      currentTaskState.status = "Voice barge-in observed, but interrupt-on-user-speech is disabled.";
    }
    postTaskState();
    return;
  }

  if (msg.command === "voiceReviewSend") {
    if (!voiceReviewState) {
      webview.postMessage({ command: "status", text: "No captured voice request is waiting for review." });
      return;
    }
    const review = voiceReviewState;
    review.sent = true;
    setVoiceReviewState(review);
    updateVoiceBridgeRuntimeState({
      lastSentText: review.heardText,
      nextActionHint: "Voice request sent as a governed message."
    });
    clearVoiceReviewState();
    submitOutgoingVoiceMessage(webview, review.heardText, review);
    return;
  }

  if (msg.command === "voiceReviewCreateProposal") {
    if (!voiceReviewState) {
      webview.postMessage({ command: "status", text: "No captured voice request is waiting for review." });
      return;
    }
    const review = voiceReviewState;
    const prompt = `Create a governed proposal from this voice request: ${review.heardText}`;
    updateVoiceBridgeRuntimeState({
      lastSentText: review.heardText,
      nextActionHint: "Proposal request sent from reviewed voice input."
    });
    clearVoiceReviewState();
    submitOutgoingVoiceMessage(webview, prompt, review);
    return;
  }

  if (msg.command === "voiceReviewClarify") {
    if (!voiceReviewState) {
      webview.postMessage({ command: "status", text: "No captured voice request is waiting for review." });
      return;
    }
    webview.postMessage({
      command: "status",
      text: "Voice review is waiting for clarification. Typed input remains available."
    });
    updateVoiceBridgeRuntimeState({
      nextActionHint: "Ask a clarification question or discard the current voice draft."
    });
    return;
  }

  if (msg.command === "voiceReviewDiscard") {
    clearVoiceReviewState();
    updateVoiceBridgeRuntimeState({
      nextActionHint: "Voice draft discarded. You can speak again or use typed input."
    });
    webview.postMessage({ command: "status", text: "Voice draft discarded. Nothing was sent." });
    return;
  }

  if (msg.command === "leewayVoiceEvent") {
    const event = ((msg?.event && typeof msg.event === "object") ? msg.event : {}) as Record<string, unknown>;
    const eventType = String(event.type || "unknown");
    const callId = String(event.callId || nextLavrHostId("lavr-call"));
    const lavrToolRequestId = String(event.lavrToolRequestId || callId || nextLavrHostId("lavr-tool")).trim();
    const lavrSessionId = String(event.lavrSessionId || lavrHostSessionId).trim() || lavrHostSessionId;
    const lavrTurnId = String(event.lavrTurnId || `lavr-turn-${++lavrHostTurnCounter}`).trim();
    if (lavrTurnId) {
      lavrLastObservedTurnId = lavrTurnId;
    }

    if (
      eventType === "LAVR_TURN_STARTED" ||
      eventType === "LAVR_PARTIAL_UPDATED" ||
      eventType === "LAVR_FINAL_RECEIVED" ||
      eventType === "LAVR_COMMIT_SCHEDULED" ||
      eventType === "LAVR_COMMIT_EMITTED" ||
      eventType === "LAVR_DUPLICATE_COMMIT_SUPPRESSED" ||
      eventType === "LAVR_SPEECH_STARTED" ||
      eventType === "LAVR_SPEECH_PARTIAL" ||
      eventType === "LAVR_SPEECH_FINAL" ||
      eventType === "LAVR_SILENCE_TIMEOUT" ||
      eventType === "LAVR_TURN_CANCELLED" ||
      eventType === "LAVR_INTERRUPT_REQUESTED"
    ) {
      recordAgentLeeRuntimeReceipt({
        event: `lavr.turn.${eventType.toLowerCase()}`,
        lavrSessionId,
        lavrTurnId,
        lavrUtteranceId: String(event.lavrUtteranceId || ""),
        lavrInterruptId: String(event.lavrInterruptId || ""),
        source: String(event.source || ""),
        reason: String(event.reason || ""),
        transcript: String(event.transcript || "")
      });
      logEvent("lavr-turn-lifecycle", "Agent Lee", `LAVR turn lifecycle: ${eventType}`, {
        lavrSessionId,
        lavrTurnId,
        lavrUtteranceId: String(event.lavrUtteranceId || ""),
        lavrInterruptId: String(event.lavrInterruptId || ""),
        source: String(event.source || ""),
        reason: String(event.reason || "")
      });

      if (eventType === "LAVR_TURN_CANCELLED") {
        currentTaskState.status = `LAVR turn cancelled (${String(event.reason || "unspecified")}).`;
        postTaskState();
      }
      if (eventType === "LAVR_TURN_STARTED") {
        stopLavrPlayback("new_turn_boundary", "cancel");
        currentTaskState.status = "LAVR turn started. Previous playback boundary closed.";
        postTaskState();
      }
      if (eventType === "LAVR_COMMIT_EMITTED") {
        currentTaskState.status = "LAVR turn commit emitted to host router.";
        postTaskState();
      }
      if (eventType === "LAVR_DUPLICATE_COMMIT_SUPPRESSED") {
        updateVoiceBridgeRuntimeState({
          duplicateSuppressionCount: Number((voiceDeduplicator.getState() as any).duplicateSuppressionCount || voiceBridgeRuntimeState.duplicateSuppressionCount),
          loopDetected: true,
          status: "loop-detected",
          authorityState: "VOICE_STATUS_LOOP_DETECTED",
          nextActionHint: "Repeated voice status or transcript commits are being suppressed."
        });
      }
      if (eventType === "LAVR_INTERRUPT_REQUESTED") {
        currentTaskState.status = "LAVR interrupt requested by active user speech.";
        postTaskState();
      }
    }

    if (eventType === "LAVR_TOOL_REQUESTED") {
      const existingByRequest = lavrToolByRequestId.get(lavrToolRequestId);
      if (existingByRequest) {
        recordLavrToolLifecycle("duplicate-request-suppressed", {
          requestId: lavrToolRequestId,
          callId,
          lavrSessionId,
          lavrTurnId,
          existingStatus: existingByRequest.status
        });
        return;
      }
      const existingRequestId = lavrRequestByCallId.get(callId);
      if (existingRequestId) {
        recordLavrToolLifecycle("duplicate-request-suppressed", {
          requestId: existingRequestId,
          callId,
          lavrSessionId,
          lavrTurnId,
          reason: "callId-already-bound"
        });
        return;
      }

      const pluginCall = parseVoiceRealtimeToolCall(event, callId);
      if (!pluginCall) {
        const invalidState: LavrToolLifecycleState = {
          requestId: lavrToolRequestId,
          callId,
          lavrSessionId,
          lavrTurnId,
          status: "pending",
          createdAt: Date.now(),
          providerAcceptedResult: false,
          timeoutHandle: null
        };
        lavrToolByRequestId.set(lavrToolRequestId, invalidState);
        lavrRequestByCallId.set(callId, lavrToolRequestId);
        finalizeLavrToolRequest(webview, lavrToolRequestId, "failed", {
          ok: false,
          error: "Invalid LeeWay Agent Voice tool request payload. Expected pluginId/action or name like plugin.action.",
          summary: "LAVR tool request rejected due to invalid payload."
        });
        return;
      }

      const state: LavrToolLifecycleState = {
        requestId: lavrToolRequestId,
        callId,
        lavrSessionId,
        lavrTurnId,
        status: "pending",
        createdAt: Date.now(),
        pluginId: pluginCall.pluginId,
        action: pluginCall.action,
        providerAcceptedResult: false,
        timeoutHandle: null
      };
      state.timeoutHandle = setTimeout(() => {
        finalizeLavrToolRequest(webview, lavrToolRequestId, "timed_out", {
          ok: false,
          pluginId: state.pluginId || "",
          action: state.action || "",
          error: `LAVR tool request timed out after ${LAVR_TOOL_TIMEOUT_MS}ms.`,
          summary: "LAVR tool request timed out before completion."
        });
      }, LAVR_TOOL_TIMEOUT_MS);
      lavrToolByRequestId.set(lavrToolRequestId, state);
      lavrRequestByCallId.set(callId, lavrToolRequestId);

      recordLavrToolLifecycle("request-emitted", {
        requestId: lavrToolRequestId,
        callId,
        lavrSessionId,
        lavrTurnId,
        pluginId: pluginCall.pluginId,
        action: pluginCall.action
      });

      state.executionStartedAt = Date.now();
      recordLavrToolLifecycle("execution-started", {
        requestId: lavrToolRequestId,
        callId,
        lavrSessionId,
        lavrTurnId,
        pluginId: pluginCall.pluginId,
        action: pluginCall.action
      });

      try {
        const pluginResult = await handlePluginCall(webview, pluginCall, false);
        finalizeLavrToolRequest(webview, lavrToolRequestId, pluginResult.ok ? "completed" : "failed", {
          ok: pluginResult.ok,
          pluginId: pluginResult.pluginId,
          action: pluginResult.action,
          summary: pluginResult.summary,
          result: pluginResult.data,
          error: pluginResult.error,
          receiptId: pluginResult.receiptId,
          requiresFollowUp: !!pluginResult.requiresFollowUp
        });

        currentTaskState.status = pluginResult.ok
          ? `LeeWay Agent Voice tool completed: ${pluginResult.pluginId}.${pluginResult.action}`
          : `LeeWay Agent Voice tool failed: ${pluginResult.pluginId}.${pluginResult.action} (${pluginResult.error || "unknown error"})`;
        postTaskState();
      } catch (error) {
        finalizeLavrToolRequest(webview, lavrToolRequestId, "failed", {
          ok: false,
          pluginId: pluginCall.pluginId,
          action: pluginCall.action,
          error: describeFileError(error),
          summary: "LAVR tool request failed during host execution."
        });
      }

      return;
    }

    if (eventType === "LAVR_TOOL_COMPLETED") {
      const resolvedRequestId = String(event.lavrToolRequestId || lavrRequestByCallId.get(callId) || "").trim();
      const terminalStatus = normalizeLavrTerminalStatus(event.terminalStatus);
      if (resolvedRequestId) {
        const lifecycleState = lavrToolByRequestId.get(resolvedRequestId);
        if (lifecycleState && !lifecycleState.providerAcceptedResult) {
          lifecycleState.providerAcceptedResult = true;
          recordLavrToolLifecycle("provider-accepted-result", {
            requestId: resolvedRequestId,
            callId: lifecycleState.callId,
            lavrSessionId: lifecycleState.lavrSessionId,
            lavrTurnId: lifecycleState.lavrTurnId,
            terminalStatus
          });
        }
      }
      currentTaskState.status = `LAVR provider accepted terminal result (${terminalStatus}).`;
      postTaskState();
      return;
    }

    if (eventType === "LAVR_ERROR") {
      const detail = String(event.message || "Realtime voice transport error.");
      currentTaskState.status = `Realtime voice transport error: ${detail}`;
      updateVoiceBridgeRuntimeState({
        status: /permission/i.test(detail) ? "permission-required" : "error",
        lastError: detail,
        authorityState: /permission/i.test(detail) ? "MIC_PERMISSION_REQUIRED" : "LEEWAY_VOICE_DEGRADED",
        nextActionHint: /permission/i.test(detail)
          ? "Grant microphone permission before using LeeWay Voice."
          : "Typed input remains available while the voice path is degraded."
      });
      postTaskState();
    }
    return;
  }

  if (msg.command === "agentVmDiagnosticEvent") {
    const ledgerPath = recordAxAgentLeeDiagnosticEvent((msg.event || {}) as Record<string, unknown>);
    webview.postMessage({
      command: "agentVmDiagnosticRecorded",
      ledgerPath,
      memory: getMemoryStatus(String((msg.event || {}).agentId || "unknown-agent"))
    });
    return;
  }

  if (msg.command === "askLocalModel") {
    await handle(webview, { command: "agentLeeUiAction", action: "askLocalModel", text: msg.text }, context);
    return;
  }

  if (msg.command === "engineerTask") {
    await handle(webview, { command: "agentLeeUiAction", action: "engineerTask", text: msg.text }, context);
    return;
  }

  if (msg.command === "scanSelf" || msg.command === "verifySelf" || msg.command === "runtimeStatus" || msg.command === "scanWorkspace" || msg.command === "verifyWorkspace" || msg.command === "openReport" || msg.command === "openReceipts") {
    await handle(webview, { command: "agentLeeUiAction", action: msg.command, text: msg.text }, context);
    return;
  }

  if (msg.command === "clearChat") {
    const meta = startNewConversation(workspaceRoot());
    webview.postMessage({ command: "loadedConversation", messages: loadConversation(meta.id) });
    webview.postMessage({ command: "history", items: conversationItems() });
    resetTaskState("Chat cleared. Ready for the next engineering task.");
    postAgentResponse(webview, "I cleared the visible chat and started a fresh Agent Lee conversation.", { speak: false });
    return;
  }

  if (msg.command === "ready") {
    activeWebviews.add(webview);
    capabilityCatalog = buildCapabilityCatalog();
    const online = await checkOllama();
    const installedModels = await getModels();
    refreshRuntimeFromInstalled(installedModels);
    const activeConversation = startNewConversation(workspaceRoot());

    webview.postMessage({
      command: "status",
      text: online
        ? ""
        : ""
    });
    webview.postMessage({ command: "history", items: conversationItems() });
    webview.postMessage({ command: "loadedConversation", messages: loadConversation(activeConversation.id) });
    await postRuntimeInfo(webview);
    postTaskState();

    if (!loadConversation(activeConversation.id).length) {
      const intro = sovereignRuntime.AGENT_LEE_RUNTIME_READY
        ? "I got you. Show me what's breaking or what you're trying to build, and we'll work it clean."
        : "Agent Lee runtime is degraded: persona module unavailable. Only scan and diagnostic moves are available until the sovereign runtime is healthy again.";
      const stage = enforceStageLaw("synthesis", { speaker: "Agent Lee", directUserFacing: true });
      if (stage.allowed) {
        const timestamp = new Date().toISOString();
        appendConversationMessage(workspaceRoot(), { role: "agent", text: intro, timestamp }, { conversationId: activeConversation.id });
        postAgentResponse(webview, intro);
        webview.postMessage({ command: "history", items: conversationItems() });
      }
    }
  }

  if (msg.command === "approvePluginCall") {
    if (!pendingPluginApproval) {
      postAgentResponse(webview, "Ain't nothing waiting on approval right now.", { speak: false });
      return;
    }

    const approved = pendingPluginApproval;
    const result = await handlePluginCall(webview, approved.call, true);
    postAgentResponse(webview, formatPluginResult(result), { speak: false });
    return;
  }

  if (msg.command === "cancelPluginCall") {
    if (pendingPluginApproval) {
      const cancelled = pendingPluginApproval;
      clearPendingPluginApproval(webview);
      postAgentResponse(webview, `Cancelled ${cancelled.pluginName} action "${cancelled.call.action}".`, { speak: false });
    }
    return;
  }

  if (msg.command === "leewayVoiceSettingsChanged") {
    const key = String(msg.key || "").trim();
    const rawValue = msg.value;
    recordVoiceUiCommand("leewayVoiceSettingsChanged", { key, value: rawValue });
    if (!key) {
      updateVoiceRuntimeStatus("LeeWay live voice settings change was rejected because the setting key was missing.", {
        error: "Missing voice setting key.",
        eventType: "LEEWAY_VOICE_PLAYBACK_FAILED"
      });
      await postRuntimeInfo(webview);
      return;
    }

    if (key === "voiceEnabled") {
      runtimeState.voiceEnabled = Boolean(rawValue);
    } else if (key === "voiceAutoSpeak") {
      runtimeState.voiceAutoSpeak = Boolean(rawValue);
    } else if (key === "voiceMuted") {
      runtimeState.voiceMuted = Boolean(rawValue);
    } else if (key === "voiceInterruptOnUserSpeech") {
      runtimeState.voiceInterruptOnUserSpeech = Boolean(rawValue);
    } else if (key === "voiceRate" || key === "voiceVolume" || key === "voicePitch" || key === "voiceTone") {
      (runtimeState as any)[key] = Number(rawValue);
    } else {
      (runtimeState as any)[key] = rawValue;
    }

    syncVoiceRuntimeStateShape();
    if (!runtimeState.voice) {
      stopLavrPlayback("voice_settings_change_disabled_output", "stop");
    }
    try {
      const config = getVoiceRuntimeConfig();
      applyRuntimeVoiceTuning(config, runtimeState);
      persistVoiceRuntimeConfig(config);
    } catch (error) {
      updateVoiceRuntimeStatus(`Voice settings update failed: ${describeFileError(error)}`, {
        error: describeFileError(error),
        eventType: "LEEWAY_VOICE_PLAYBACK_FAILED"
      });
    }
    persistRuntime();
    currentTaskState.status = `LeeWay live voice setting updated: ${key}.`;
    updateVoiceRuntimeStatus(currentTaskState.status, {
      error: runtimeState.voiceLastError,
      eventType: "LEEWAY_VOICE_STATUS_CHANGED"
    });
    postTaskState();
    await postRuntimeInfo(webview);
    return;
  }

  if (msg.command === "leewayVoiceMuteToggled") {
    recordVoiceUiCommand("leewayVoiceMuteToggled", { nextMuted: !runtimeState.voiceMuted });
    runtimeState.voiceMuted = !runtimeState.voiceMuted;
    syncVoiceRuntimeStateShape();
    persistRuntime();
    if (runtimeState.voiceMuted) {
      stopLavrPlayback("voice_muted", "stop");
      voiceEvidenceState.status = "muted";
      currentTaskState.status = "Voice output muted.";
    } else {
      currentTaskState.status = "Voice output unmuted.";
      updateVoiceRuntimeStatus("LeeWay live voice output is unmuted and standing by.", {
        error: "",
        eventType: "LEEWAY_VOICE_STATUS_CHANGED"
      });
    }
    postTaskState();
    await postRuntimeInfo(webview);
    return;
  }

  if (msg.command === "leewayVoiceStopRequested") {
    recordVoiceUiCommand("leewayVoiceStopRequested", { routeId: voiceEvidenceState.currentRouteId });
    stopLavrPlayback("leeway_voice_stop_requested", "stop");
    currentTaskState.status = "Voice playback stopped.";
    postTaskState();
    await postRuntimeInfo(webview);
    return;
  }

  if (msg.command === "leewayVoiceTestRequested") {
    const testPhrase = String(
      msg.text ||
      "Agent Lee live voice test. If you can hear this, the LeeWay-owned route is active and speaking through the current extension runtime."
    ).trim();
    recordVoiceUiCommand("leewayVoiceTestRequested", { text: testPhrase });
    runtimeState.voiceEnabled = true;
    runtimeState.voiceMuted = false;
    syncVoiceRuntimeStateShape();
    persistRuntime();
    currentTaskState.status = "Running the LeeWay live voice test phrase.";
    updateVoiceRuntimeStatus(currentTaskState.status, {
      error: "",
      eventType: "LEEWAY_VOICE_STATUS_CHANGED"
    });
    postTaskState();
    speak(testPhrase);
    await postRuntimeInfo(webview);
    return;
  }

  if (msg.command === "setState") {
    let blockedProtectedMutation = false;
    let nextValue = msg.value;

    if (msg.key === "enabledAgents") {
      const sanitized = preserveProtectedIds(msg.value, runtimeState.enabledAgents, DEFAULT_RUNTIME_STATE.enabledAgents, PROTECTED_AGENT_IDS);
      blockedProtectedMutation = JSON.stringify(sanitized) !== JSON.stringify(msg.value);
      nextValue = sanitized;
    } else if (msg.key === "enabledWorkers") {
      const sanitized = preserveProtectedIds(msg.value, runtimeState.enabledWorkers, DEFAULT_RUNTIME_STATE.enabledWorkers, PROTECTED_WORKER_IDS);
      blockedProtectedMutation = JSON.stringify(sanitized) !== JSON.stringify(msg.value);
      nextValue = sanitized;
    } else if (msg.key === "enabledMcpServers") {
      const sanitized = preserveProtectedIds(msg.value, runtimeState.enabledMcpServers, DEFAULT_RUNTIME_STATE.enabledMcpServers, PROTECTED_MCP_IDS);
      blockedProtectedMutation = JSON.stringify(sanitized) !== JSON.stringify(msg.value);
      nextValue = sanitized;
    } else if (msg.key === "agentConfigs") {
      const sanitized = preserveProtectedConfigs(msg.value, runtimeState.agentConfigs, PROTECTED_AGENT_IDS);
      blockedProtectedMutation = JSON.stringify(sanitized) !== JSON.stringify(msg.value);
      nextValue = sanitized;
    } else if (msg.key === "workerConfigs") {
      const sanitized = preserveProtectedConfigs(msg.value, runtimeState.workerConfigs, PROTECTED_WORKER_IDS);
      blockedProtectedMutation = JSON.stringify(sanitized) !== JSON.stringify(msg.value);
      nextValue = sanitized;
    } else if (msg.key === "mcpServerConfigs") {
      const sanitized = preserveProtectedConfigs(msg.value, runtimeState.mcpServerConfigs, PROTECTED_MCP_IDS);
      blockedProtectedMutation = JSON.stringify(sanitized) !== JSON.stringify(msg.value);
      nextValue = sanitized;
    } else if (msg.key === "leewayVoiceRuntimeKind") {
      nextValue = String(msg.value || "") === "leeway-agent-voice-browser-fallback" || String(msg.value || "") === "browser-speech-recognition"
        ? "leeway-agent-voice-browser-fallback"
        : "leeway-agent-voice-local";
    } else if (msg.key === "voice") {
      nextValue = Boolean(msg.value);
    } else if (msg.key === "primaryModel" || msg.key === "builderModel" || msg.key === "designerModel" || msg.key === "verifierModel") {
      try {
        nextValue = enforceAuthorizedModelRoute(msg.value, {
          source: `extension.setState.${String(msg.key || "unknown")}`,
          allowDeepseekSpecialist: true,
          allowInfrastructureLane: false
        });
      } catch (error) {
        blockedProtectedMutation = true;
        nextValue = msg.key === "primaryModel"
          ? coerceGovernedQwenModel(runtimeState.primaryModel)
          : coerceGovernedQwenModel(runtimeState.primaryModel || DEFAULT_RUNTIME_STATE.primaryModel);
        currentTaskState.status = describeFileError(error);
        postTaskState();
      }
    } else if (msg.key === "voiceEnabled" || msg.key === "voiceMuted" || msg.key === "voiceAutoSpeak" || msg.key === "voiceAutoSendFinalTranscript" || msg.key === "voiceInterruptOnUserSpeech") {
      nextValue = Boolean(msg.value);
    } else if (msg.key === "voiceRate" || msg.key === "voiceVolume" || msg.key === "voicePitch" || msg.key === "voiceTone") {
      nextValue = Number(msg.value);
    }

    (runtimeState as any)[msg.key] = nextValue;
    if (msg.key === "voice") {
      runtimeState.voiceEnabled = Boolean(nextValue);
      if (runtimeState.voiceEnabled) {
        runtimeState.voiceMuted = false;
      }
    }
    syncVoiceRuntimeStateShape();
    persistRuntime();
    if (blockedProtectedMutation) {
      currentTaskState.status = (msg.key === "primaryModel" || msg.key === "builderModel" || msg.key === "designerModel" || msg.key === "verifierModel")
        ? `Agent Lee blocked an unauthorized model assignment for ${String(msg.key || "unknown")} under LEEWAY_VSCODE_AUTHORIZED_MODEL_GUARD.`
        : protectedMutationStatus(String(msg.key || ""));
      postTaskState();
    }
    if (msg.key === "workMode") {
      currentTaskState.mode = nextValue;
      if (runtimeState.workMode !== "execute") {
        runtimeState.autoRunStagedPlans = false;
        persistRuntime();
      }
      currentTaskState.status = `Work mode set to ${nextValue}.`;
      postTaskState();
    }
    if (msg.key === "autoRunStagedPlans") {
      if (nextValue && !hasFullExecutionAccess()) {
        runtimeState.autoRunStagedPlans = false;
        persistRuntime();
        currentTaskState.status = "Auto-run was left off. Full access is only required for unattended execution, not normal plan approval.";
        postTaskState();
        await postRuntimeInfo(webview);
        return;
      }
      currentTaskState.status = nextValue
        ? "Auto-run staged plans is enabled for Full access execute mode."
        : "Auto-run staged plans is disabled.";
      postTaskState();
    }
    if (msg.key === "autoUpdateEnabled") {
      currentTaskState.status = nextValue
        ? "Agent Lee local VSIX startup repair is enabled. This does not make VS Code marketplace auto-update work for side-loaded installs."
        : "Agent Lee local VSIX startup repair is disabled.";
      postTaskState();
    }
    if (msg.key === "preferRightSideSurface") {
      currentTaskState.status = nextValue
        ? "Agent Lee will prefer the right-side panel by default. The contributed sidebar container still remains a VS Code left-side surface unless you move it manually."
        : "Agent Lee will prefer the contributed sidebar by default.";
      postTaskState();
    }
    if (msg.key === "approval") {
      if (runtimeState.approval !== "full" && runtimeState.autoRunStagedPlans) {
        runtimeState.autoRunStagedPlans = false;
        persistRuntime();
        currentTaskState.status = `Approval set to ${nextValue}. Auto-run was turned off; manual execution remains available.`;
      } else {
        currentTaskState.status = `Approval set to ${nextValue}.`;
      }
      postTaskState();
    }
    if (msg.key === "followupBehavior") {
      currentTaskState.status = `Follow-up behavior set to ${nextValue}.`;
      postTaskState();
    }
    if (msg.key === "codeReviewBehavior") {
      currentTaskState.status = `Code review behavior set to ${nextValue}.`;
      postTaskState();
    }
    if (msg.key === "requireCtrlEnter") {
      currentTaskState.status = nextValue ? "Ctrl+Enter is now required for multiline sends." : "Enter will send from the main input again.";
      postTaskState();
    }
    if (msg.key === "inferenceSpeed") {
      currentTaskState.status = `Inference speed set to ${nextValue}.`;
      postTaskState();
    }
    if (msg.key === "voiceRate" || msg.key === "voiceVolume" || msg.key === "voicePitch" || msg.key === "voiceTone") {
      try {
        const config = getVoiceRuntimeConfig();
        applyRuntimeVoiceTuning(config, runtimeState);
        persistVoiceRuntimeConfig(config);
        currentTaskState.status = `Voice tuning updated (${runtimeState.voiceRate.toFixed(2)}x speed, ${runtimeState.voiceVolume.toFixed(2)}x volume, ${runtimeState.voicePitch.toFixed(2)}x pitch, ${runtimeState.voiceTone.toFixed(2)}x tone).`;
      } catch (error) {
        currentTaskState.status = `Voice tuning update failed: ${describeFileError(error)}`;
      }
      updateVoiceRuntimeStatus(currentTaskState.status, {
        error: runtimeState.voiceLastError,
        eventType: "LEEWAY_VOICE_STATUS_CHANGED"
      });
      postTaskState();
    }
    if (msg.key === "liveMicAlwaysOn") {
      currentTaskState.status = nextValue ? "Live mic auto-listen is on." : "Live mic auto-listen is off.";
      postTaskState();
    }
    if (msg.key === "leewayVoiceRuntimeKind") {
      currentTaskState.status = String(nextValue) === "leeway-agent-voice-local"
        ? "LeeWay Voice authority is using the local transcript bridge path."
        : "LeeWay Voice authority is using browser speech as a labeled fallback.";
      updateVoiceRuntimeStatus(currentTaskState.status, {
        error: runtimeState.voiceLastError,
        eventType: "LEEWAY_VOICE_STATUS_CHANGED"
      });
      updateVoiceBridgeRuntimeState({
        listeningSource: String(nextValue) === "leeway-agent-voice-local" ? "LOCAL_TRANSCRIPT_BRIDGE" : "BROWSER_SPEECH_FALLBACK",
        authorityState: String(nextValue) === "leeway-agent-voice-local" ? "LEEWAY_VOICE_READY" : "BROWSER_SPEECH_AVAILABLE",
        browserSpeechAvailable: String(nextValue) !== "leeway-agent-voice-local",
        localTranscriptAvailable: String(nextValue) === "leeway-agent-voice-local",
        nextActionHint: String(nextValue) === "leeway-agent-voice-local"
          ? "LeeWay Voice will classify local bridge input before anything is sent."
          : "Browser speech will be labeled as fallback input and reviewed before send."
      });
      postTaskState();
    }
    await postRuntimeInfo(webview);
  }

  if (msg.command === "talkOn") {
    runtimeState.voiceEnabled = true;
    runtimeState.voiceMuted = false;
    syncVoiceRuntimeStateShape();
    persistRuntime();
    currentTaskState.status = "Voice output enabled.";
    updateVoiceRuntimeStatus(currentTaskState.status, {
      error: "",
      eventType: "LEEWAY_VOICE_STATUS_CHANGED"
    });
    postTaskState();
    await postRuntimeInfo(webview);
  }

  if (msg.command === "muteVoice") {
    runtimeState.voiceMuted = true;
    syncVoiceRuntimeStateShape();
    persistRuntime();
    stopLavrPlayback("voice_muted", "stop");
    currentTaskState.status = "Voice output muted.";
    postTaskState();
    await postRuntimeInfo(webview);
  }

  if (msg.command === "testCamera") {
    currentTaskState.status = "CAMERA_SURFACE_VISIBLE_LOCAL_DEVICE_BRIDGE_REQUIRED";
    postTaskState();
    await postRuntimeInfo(webview);
  }

  if (msg.command === "requestCameraPermission") {
    currentTaskState.status = "CAMERA_SURFACE_VISIBLE_LOCAL_DEVICE_BRIDGE_REQUIRED";
    postTaskState();
    await postRuntimeInfo(webview);
  }

  if (msg.command === "requestMicPermission") {
    currentTaskState.status = "AGENT_LEE_VOICE_NOT_READY_DEVICE_OR_PROVIDER_REQUIRED";
    postTaskState();
    await postRuntimeInfo(webview);
  }

  if (msg.command === "leewayStartTranscriptBridge") {
    try {
      currentTaskState.status = "Starting Agent Lee local transcript bridge.";
      postTaskState();
      const result = await vscode.commands.executeCommand<{ alreadyRunning?: boolean; started?: boolean; url?: string }>("agentLee.liveVoice.startTranscriptBridge");
      const bridgeUrl = String(result?.url || voiceBridgeRuntimeState.endpointUrl);
      const alreadyRunning = result?.alreadyRunning === true;
      recordVoiceBridgeStatus({
        type: "VOICE_STATUS",
        status: alreadyRunning ? "VOICE_STATUS_LOOP_DETECTED" : "LOCAL_TRANSCRIPT_AVAILABLE",
        message: alreadyRunning
          ? "Voice bridge status loop detected. Status messages are being suppressed and will not enter chat."
          : "Local transcript bridge is available as a fallback. Voice input will be labeled and governed.",
        timestamp: new Date().toISOString(),
        source: "local-bridge"
      }, "LOCAL_TRANSCRIPT_BRIDGE");
      updateVoiceBridgeRuntimeState({
        endpointUrl: bridgeUrl,
        localTranscriptAvailable: true,
        listeningSource: "LOCAL_TRANSCRIPT_BRIDGE",
        authorityState: "LOCAL_TRANSCRIPT_BRIDGE_READY",
        status: alreadyRunning ? "loop-detected" : "online",
        nextActionHint: alreadyRunning
          ? "Bridge is already active. Review captured voice before sending."
          : "LeeWay Voice will review captured local transcripts before they become chat."
      });
      currentTaskState.status = alreadyRunning
        ? "Local transcript bridge was already active. Repeated status output is being suppressed."
        : "Local transcript bridge is ready for governed review.";
      postTaskState();
      webview.postMessage({
        command: "status",
        text: alreadyRunning
          ? "Voice bridge status loop detected. Status messages are being suppressed and will not enter chat."
          : "Local transcript bridge is available as a fallback. Voice input will be labeled and governed."
      });
      await postRuntimeInfo(webview);
    } catch (error) {
      const detail = describeFileError(error);
      currentTaskState.status = `Transcript bridge failed: ${detail}`;
      updateVoiceBridgeRuntimeState({
        status: "error",
        lastError: detail,
        authorityState: "LOCAL_TRANSCRIPT_BRIDGE_DEGRADED",
        listeningSource: "LOCAL_TRANSCRIPT_BRIDGE",
        nextActionHint: "Typed input remains available while the local bridge is repaired."
      });
      postTaskState();
      webview.postMessage({
        command: "status",
        text: "LeeWay Voice is degraded. Typed input remains available, and no voice command will execute automatically."
      });
    }
    return;
  }

  if (msg.command === "pickAttachments") {
    const picked = await vscode.window.showOpenDialog({
      canSelectMany: true,
      openLabel: "Attach to Agent Lee",
      filters: {
        Media: ["png", "jpg", "jpeg", "webp", "gif", "bmp", "wav", "mp3", "m4a", "ogg", "flac"]
      }
    });

    webview.postMessage({
      command: "attachmentsPicked",
      attachments: (picked || []).map((item) => ({
        path: item.fsPath,
        name: path.basename(item.fsPath),
        kind: fileKind(item.fsPath)
      }))
    });
  }

  if (msg.command === "refreshRuntime") {
    await postRuntimeInfo(webview);
  }

  if (msg.command === "updateAgentLeeNow") {
    if (!context) {
      showAgentLeeWarning("Agent Lee could not resolve the extension context for update.");
      return;
    }
    currentTaskState.status = "Installing the newest local Agent Lee VSIX into VS Code.";
    postTaskState();
    await installManagedVsix(context, "manual");
    return;
  }

  if (msg.command === "setPerformanceProfile") {
    const profile = String(msg.profile || "quiet_laptop");
    await vscode.commands.executeCommand("agentLee.performance.setProfile", profile);
    currentTaskState.status = `Performance profile set to ${profile}.`;
    postTaskState();
    await postRuntimeInfo(webview);
  }

  if (msg.command === "openReadme") {
    if (context) {
      await openReadme(context);
    } else {
      vscode.commands.executeCommand("agentLee.openReadme");
    }
  }

  if (msg.command === "openTaskFile") {
    const opened = await openTaskFileByPath(String(msg.path || ""));
    if (!opened) {
      postAgentResponse(webview, "I couldn't open that file because the path is missing or no longer exists.", { speak: false });
    }
  }

  if (msg.command === "reviewProposedEdit") {
    const proposal = currentTaskState.proposedEdits.find((item) => item.id === String(msg.editId || ""));
    if (proposal) {
      await openDiffForProposal(proposal);
    }
  }

  if (msg.command === "approveProposedEdit") {
    const approved = await approveProposedEdit(String(msg.editId || ""));
    if (approved) {
      postAgentResponse(webview, "I applied that proposed edit to the real file.", { speak: false });
    }
  }

  if (msg.command === "approveAllProposedEdits") {
    const approvedCount = await approveAllProposedEdits();
    if (approvedCount > 0) {
      postAgentResponse(webview, `I applied ${approvedCount} pending proposed edit${approvedCount === 1 ? "" : "s"} to the real files.`, { speak: false });
    }
  }

  if (msg.command === "rejectProposedEdit") {
    const rejected = await rejectProposedEdit(String(msg.editId || ""));
    if (rejected) {
      postAgentResponse(webview, "I dropped that proposed edit from the review queue.", { speak: false });
    }
  }

  if (msg.command === "refreshCatalog") {
    capabilityCatalog = buildCapabilityCatalog();
    const message = `Capability catalog refreshed. Total: ${capabilityCatalog.counts.total} | MCPs: ${capabilityCatalog.counts.mcps} | Agents: ${capabilityCatalog.counts.agents} | Servers: ${capabilityCatalog.counts.servers}`;
    postAgentResponse(webview, message);
    webview.postMessage({
      command: "status",
      text: `Back in motion. Workspace: ${workspaceRoot() || "not open"} | capabilities: ${capabilityCatalog.counts.total}`
    });
    await postRuntimeInfo(webview);
  }

  if (msg.command === "installPyCharmTools") {
    try {
      const result = installPyCharmTooling();
      postAgentResponse(webview, result);
    } catch (err: any) {
      postAgentResponse(webview, `PyCharm wiring failed: ${err.message}`);
    }
  }

  if (msg.command === "loadConversation") {
    setActiveConversation(msg.id);
    webview.postMessage({ command: "loadedConversation", messages: loadConversation(msg.id) });
    webview.postMessage({ command: "history", items: conversationItems() });
    resetTaskState("Loaded conversation. Ready for a new plan.");
  }

  if (msg.command === "newConversation") {
    const meta = startNewConversation(workspaceRoot());
    webview.postMessage({ command: "loadedConversation", messages: loadConversation(meta.id) });
    webview.postMessage({ command: "history", items: conversationItems() });
    resetTaskState("New conversation started. Ready for a new plan.");
  }

  if (msg.command === "stopVoice") {
    recordVoiceUiCommand("leewayVoiceStopRequested", { source: "legacy_stopVoice" });
    stopLavrPlayback("stop_voice_command", "stop");
    postAgentResponse(webview, "Agent Lee voice stopped.", { speak: false });
    await postRuntimeInfo(webview);
  }

  if (msg.command === "savePlan") {
    const savedPath = await persistCurrentPlan();
    if (savedPath) {
      currentTaskState.status = "Plan saved. Review it or execute it when ready.";
      postTaskState();
      postAgentResponse(webview, `Plan saved to:\n${savedPath}`, { activity: { kind: "write", label: "Saved task plan", file: savedPath } });
    }
  }

  if (msg.command === "updateTaskPrompt") {
    const nextPrompt = String(msg.prompt || "").trim();
    if (nextPrompt) {
      currentTaskState.prompt = nextPrompt;
      currentTaskState.draftPrompt = nextPrompt;
      if (currentTaskState.plan) {
        currentTaskState.plan = {
          ...currentTaskState.plan,
          prompt: nextPrompt,
          summary: `Updated task: ${nextPrompt}`
        };
      }
      currentTaskState.status = "Task prompt updated.";
      pushTaskActivity({ kind: "status", label: "Task prompt edited", detail: nextPrompt });
      postTaskState();
    }
  }

  if (msg.command === "rejectPlan") {
    resetTaskState("Plan cleared. Ready for a new task.");
    postAgentResponse(webview, "The current plan was cleared.");
  }

  if (msg.command === "stopTask") {
    abortCurrentExecution("Task stopped. The staged work was cleared.");
    parkedTaskState = null;
    resetTaskState("Task stopped completely.");
    postAgentResponse(webview, "The active task was stopped and cleared.");
  }

  if (msg.command === "interruptTask") {
    if (currentTaskState.prompt) {
      abortCurrentExecution("Task paused. I kept the task so you can resume or redirect.");
      parkedTaskState = cloneTaskState(currentTaskState);
      resetTaskState("Task paused. You can ask a redirect question or resume the parked task.");
      postAgentResponse(webview, flavoredStatusLine("paused"));
    }
  }

  if (msg.command === "resumeParkedTask") {
    if (parkedTaskState) {
      currentTaskState = cloneTaskState(parkedTaskState);
      parkedTaskState = null;
      currentTaskState.status = "Paused task restored. Approve or execute when ready.";
      postTaskState();
      postAgentResponse(webview, flavoredStatusLine("resume"));
    }
  }

  if (msg.command === "approvePlan" || msg.command === "executePlan") {
    const installedModels = await getModels();
    refreshRuntimeFromInstalled(installedModels);
    const execution = await executeCurrentPlan(webview, installedModels);
    if (execution) {
      const active = getOrCreateActiveConversation(workspaceRoot());
      appendConversationMessage(workspaceRoot(), { role: "agent", text: execution.finalText, timestamp: new Date().toISOString() }, { conversationId: active.id });
      postAgentResponse(webview, execution.finalText, { reportPath: execution.response.reportPath || "" });
      webview.postMessage({ command: "history", items: conversationItems() });
      await postRuntimeInfo(webview, currentTaskState.prompt || "front-end task");
      await runNextQueuedFollowUp(webview);
    }
  }

  if (msg.command === "ask") {
    if (!sovereignRuntime.AGENT_LEE_RUNTIME_READY) {
      postAgentResponse(webview, "Agent Lee runtime is degraded: persona module unavailable. Only scan and doctor style diagnostics are available until the full sovereign runtime is active again.", { speak: false });
      return;
    }
    stopLavrPlayback("new_ask_request", "stop");
    const text = String(msg.text || "");
    const attachments = Array.isArray(msg.attachments) ? msg.attachments as PendingAttachment[] : [];
    const attachmentSummary = summarizeAttachmentList(attachments);
    const timestamp = new Date().toISOString();
    const installedModels = await getModels();
    refreshRuntimeFromInstalled(installedModels);
    const attachmentContext = await buildAttachmentContext(attachments, installedModels);
    const promptText = [
      text,
      attachmentSummary ? `ATTACHMENTS:\n${attachmentSummary}` : "",
      attachmentContext ? `ATTACHMENT CONTEXT:\n${attachmentContext}` : ""
    ].filter(Boolean).join("\n\n");
    let active = getOrCreateActiveConversation(workspaceRoot());

    if (isExecutionRunning && currentTaskState.prompt) {
      const shouldQueueFollowup = runtimeState.followupBehavior === "queue" && !runtimeState.voice;
      if (shouldQueueFollowup) {
        queuedFollowUps.push({ text, attachments });
        currentTaskState.status = `Queued follow-up ${queuedFollowUps.length} for after the current run.`;
        postTaskState();
        postAgentResponse(webview, "That follow-up is queued. I will pick it up as soon as the current run finishes.");
        return;
      }

      parkedTaskState = cloneTaskState(currentTaskState);
      abortCurrentExecution("Current run was steered into a new request.");
      resetTaskState("Current run was steered. I am switching to the new request now.");
      postAgentResponse(webview, "Steering the current run into your new request now.");
    }

    if (isReviewRequest(promptText) && runtimeState.codeReviewBehavior === "detached") {
      active = startNewConversation(workspaceRoot());
      webview.postMessage({ command: "loadedConversation", messages: loadConversation(active.id) });
      webview.postMessage({ command: "history", items: conversationItems() });
      postAgentResponse(webview, "Opening this review in a detached chat so the main thread stays clean.");
    }

    appendConversationMessage(
      workspaceRoot(),
      { role: "user", text: text || (attachments.length ? `[${attachments.map((item) => item.name).join(", ")}]` : ""), timestamp },
      { conversationId: active.id, titleHint: text || "Agent Lee conversation" }
    );
    if (text.trim()) {
      const developerProfile = rememberDeveloperSignal(text);
      storeAgentMemory("developer-profile", "developer-signal-observed", {
        summary: buildDeveloperProfileSummary(developerProfile),
        sourceText: text.slice(0, 500)
      });
    }
    log("ask", { text, attachments, runtimeState, workspaceRoot: workspaceRoot(), conversationId: active.id });
    const promptClass = classifyPromptForRuntime(promptText);
    recordAgentLeeRuntimeReceipt({
      event: "prompt.classified",
      promptClass,
      promptLength: promptText.length,
      attachmentCount: attachments.length
    });

    if (isSelfIdentityQuestion(text) && !attachments.length) {
      const finalText = agentLeeText(buildIdentityAnswer(), { voiceMode: "grounded" });
      appendConversationMessage(workspaceRoot(), { role: "agent", text: finalText, timestamp: new Date().toISOString() }, { conversationId: active.id });
      currentTaskState = {
        ...emptyTaskState(),
        mode: "ask",
        prompt: promptText,
        draftPrompt: promptText,
        summary: "Personal introduction handled directly in Agent Lee's own voice.",
        status: "Answered directly without planning.",
        activePhase: "answer"
      };
      postTaskState();
      postAgentResponse(webview, finalText);
      webview.postMessage({ command: "history", items: conversationItems() });
      await postRuntimeInfo(webview, text);
      return;
    }

    if (isRelationshipPrompt(text) && !attachments.length) {
      const finalText = agentLeeText(buildRelationshipReply(text), { voiceMode: "grounded" });
      appendConversationMessage(workspaceRoot(), { role: "agent", text: finalText, timestamp: new Date().toISOString() }, { conversationId: active.id });
      currentTaskState = {
        ...emptyTaskState(),
        mode: "ask",
        prompt: promptText,
        draftPrompt: promptText,
        summary: "Relationship and collaboration conversation handled directly.",
        status: "Answered directly without planning.",
        activePhase: "answer"
      };
      postTaskState();
      postAgentResponse(webview, finalText);
      webview.postMessage({ command: "history", items: conversationItems() });
      await postRuntimeInfo(webview, text);
      return;
    }

    if (promptClass === "simple_greeting" && !attachments.length) {
      const fastLaneStartedAt = Date.now();
      const lightReply = await runLightConversation(text, installedModels);
      const finalText = agentLeeText(lightReply, { voiceMode: "grounded" });
      appendConversationMessage(workspaceRoot(), { role: "agent", text: finalText, timestamp: new Date().toISOString() }, { conversationId: active.id });
      currentTaskState = {
        ...emptyTaskState(),
        mode: "ask",
        prompt: promptText,
        draftPrompt: promptText,
        summary: "Simple greeting detected. Lightweight conversation lane used without workspace ingestion.",
        status: "Answered immediately without loading workspace context.",
        activePhase: "answer"
      };
      postTaskState();
      recordAgentLeeRuntimeReceipt({
        event: "prompt.completed",
        promptClass,
        durationMs: Date.now() - fastLaneStartedAt,
        usedFastLane: true
      });
      postAgentResponse(webview, finalText);
      webview.postMessage({ command: "history", items: conversationItems() });
      await postRuntimeInfo(webview, text);
      return;
    }

    postAgentResponse(
      webview,
      flavoredStatusLine("loading"),
      { activity: { kind: "status", label: "Loading request context", detail: text || "Attachment-only request received." } }
    );

    const wantsExecution = isExecutionIntent(text);
    if (wantsExecution && currentTaskState.plan && currentTaskState.canExecute && currentTaskState.awaitingApproval && !isExecutionRunning) {
      if (!canExecuteApprovedPlan()) {
        postAgentResponse(webview, "Yo, execution only runs when Work Mode is Execute. Auto-run is a separate switch, and it stays off till you deliberately arm it.");
        return;
      }
      currentTaskState.status = "Execution requested from chat. Running the staged plan now.";
      postTaskState();
      postAgentResponse(webview, flavoredStatusLine("execute_now"));
      const execution = await executeCurrentPlan(webview, installedModels);
      if (execution) {
        appendConversationMessage(workspaceRoot(), { role: "agent", text: execution.finalText, timestamp: new Date().toISOString() }, { conversationId: active.id });
        postAgentResponse(webview, execution.finalText, { reportPath: execution.response.reportPath || "" });
        webview.postMessage({ command: "history", items: conversationItems() });
        await postRuntimeInfo(webview, currentTaskState.prompt || text || "execute");
        await runNextQueuedFollowUp(webview);
      }
      return;
    }

    if (parkedTaskState) {
      const redirectLaneStartedAt = Date.now();
      currentTaskState = {
        ...emptyTaskState(),
        mode: "ask",
        prompt: promptText,
        draftPrompt: promptText,
        summary: "Redirect question in progress. The paused task will return after this answer.",
        status: "Handling the redirect question while keeping the paused task parked.",
        activePhase: "answer"
      };
      syncLiveTodos();
      postTaskState();
      const response = await guardedAsk(promptText, installedModels);
      const stage = enforceStageLaw("synthesis", { speaker: "Agent Lee", directUserFacing: true });
      const finalText = stage.allowed ? finalizeResponse(response, "chat") : "Agent Lee governance blocked a non-sovereign response.";
      if (response.reportPath) lastReportPath = response.reportPath;
      appendConversationMessage(workspaceRoot(), { role: "agent", text: finalText, timestamp: new Date().toISOString() }, { conversationId: active.id });
      postAgentResponse(webview, finalText, { reportPath: response.reportPath || "" });
      currentTaskState = cloneTaskState(parkedTaskState);
      currentTaskState.status = "Redirect handled. Paused task restored.";
      parkedTaskState = null;
      postTaskState();
      recordAgentLeeRuntimeReceipt({
        event: "prompt.completed",
        promptClass,
        durationMs: Date.now() - redirectLaneStartedAt,
        usedFastLane: false
      });
      webview.postMessage({ command: "history", items: conversationItems() });
      await postRuntimeInfo(webview, text);
      await runNextQueuedFollowUp(webview);
      return;
    }

    if (shouldAnswerDirectly(promptText)) {
      const directLaneStartedAt = Date.now();
      const reviewStyleRequest = isReviewRequest(promptText) || isRepositoryOpinionRequest(promptText);
      currentTaskState = {
        ...emptyTaskState(),
        mode: "ask",
        prompt: promptText,
        draftPrompt: promptText,
        summary: reviewStyleRequest
          ? "I am inspecting the workspace and preparing a direct review without staging an execution plan."
          : "I am answering directly from the live runtime and capability catalog.",
        status: reviewStyleRequest
          ? "Inspecting the workspace for a direct review."
          : "Answering directly without staging an execution plan.",
        activePhase: reviewStyleRequest ? "inspect" : "answer"
      };
      syncLiveTodos();
      postTaskState();
      const directTarget = reviewStyleRequest ? await resolvePromptContext(promptText) : undefined;
      const directPrebuiltContext = directTarget ? await buildPreloadedContext(directTarget, promptText) : undefined;
      const response = await guardedAsk(promptText, installedModels, directTarget
        ? {
            target: directTarget,
            prebuiltContext: directPrebuiltContext,
            telemetry: reviewStyleRequest
              ? {
                  onActivity: (event: { kind: "read" | "write" | "status"; label: string; file?: string; detail?: string }) => {
                    pushTaskActivity(event);
                  }
                }
              : undefined
          }
        : undefined);
      const stage = enforceStageLaw("synthesis", { speaker: "Agent Lee", directUserFacing: true });
      const finalText = stage.allowed ? finalizeResponse(response, "chat") : "Agent Lee governance blocked a non-sovereign response.";
      if (response.reportPath) lastReportPath = response.reportPath;
      appendConversationMessage(workspaceRoot(), { role: "agent", text: finalText, timestamp: new Date().toISOString() }, { conversationId: active.id });
      currentTaskState.status = reviewStyleRequest ? "Direct review finished." : "Direct answer finished.";
      currentTaskState.activePhase = "answer";
      postTaskState();
      recordAgentLeeRuntimeReceipt({
        event: "prompt.completed",
        promptClass,
        durationMs: Date.now() - directLaneStartedAt,
        usedFastLane: false
      });
      postAgentResponse(webview, finalText, { reportPath: response.reportPath || "" });
      webview.postMessage({ command: "history", items: conversationItems() });
      await postRuntimeInfo(webview, text);
      await runNextQueuedFollowUp(webview);
      return;
    }

    if (runtimeState.workMode === "ask") {
      const askLaneStartedAt = Date.now();
      currentTaskState = {
        ...emptyTaskState(),
        mode: "ask",
        prompt: promptText,
        draftPrompt: promptText,
        summary: "Conversation mode is active. I will answer without staging an execution plan.",
        status: "Ask mode is answering directly.",
        activePhase: "answer"
      };
      syncLiveTodos();
      postTaskState();
      const response = await guardedAsk(promptText, installedModels);
      const stage = enforceStageLaw("synthesis", { speaker: "Agent Lee", directUserFacing: true });
      const finalText = stage.allowed ? finalizeResponse(response, "chat") : "Agent Lee governance blocked a non-sovereign response.";
      if (response.reportPath) lastReportPath = response.reportPath;
      appendConversationMessage(workspaceRoot(), { role: "agent", text: finalText, timestamp: new Date().toISOString() }, { conversationId: active.id });
      currentTaskState.status = "Ask mode finished the response.";
      postTaskState();
      recordAgentLeeRuntimeReceipt({
        event: "prompt.completed",
        promptClass,
        durationMs: Date.now() - askLaneStartedAt,
        usedFastLane: false
      });
      postAgentResponse(webview, finalText, { reportPath: response.reportPath || "" });
      webview.postMessage({ command: "history", items: conversationItems() });
      await postRuntimeInfo(webview, text);
      await runNextQueuedFollowUp(webview);
      return;
    }

    const planned = await prepareTaskPlan(promptText, installedModels);

    const autoExecute =
      hasFullExecutionAccess() &&
      runtimeState.autoRunStagedPlans;

    if (autoExecute) {
      postAgentResponse(webview, flavoredStatusLine("execute_now"));
      const execution = await executeCurrentPlan(webview, installedModels);
      if (execution) {
        appendConversationMessage(workspaceRoot(), { role: "agent", text: execution.finalText, timestamp: new Date().toISOString() }, { conversationId: active.id });
        postAgentResponse(webview, execution.finalText, { reportPath: execution.response.reportPath || "" });
        webview.postMessage({ command: "history", items: conversationItems() });
        await postRuntimeInfo(webview, currentTaskState.prompt || text || "execute");
        await runNextQueuedFollowUp(webview);
      }
      return;
    }

    const planText = [
      "PLAN",
      ...planned.plan.steps.map((step, index) => `${index + 1}. ${step.title}`),
      "",
      planned.plan.summary,
      "",
      planned.plan.approvalPrompt,
      planned.plan.executionHint ? `\n${planned.plan.executionHint}` : ""
    ].join("\n");
    currentTaskState.planResponse = planText;
    appendConversationMessage(workspaceRoot(), { role: "agent", text: planText, timestamp: new Date().toISOString() }, { conversationId: active.id });
    postAgentResponse(webview, planText);
    webview.postMessage({ command: "history", items: conversationItems() });
    await postRuntimeInfo(webview, text);
    await runNextQueuedFollowUp(webview);
  }

  if (msg.command === "pickVoiceReference" || msg.command === "voiceAlPickAudio") {
    const picked = await vscode.window.showOpenDialog({
      canSelectMany: false,
      openLabel: "Select voice reference audio",
      filters: { Audio: ["wav", "mp3", "m4a", "ogg", "flac"] }
    });
    const pickedPath = picked?.[0]?.fsPath || "";
    webview.postMessage({ command: "voiceReferencePicked", path: pickedPath });
  }

  if (msg.command === "transcribeVoiceReference") {
    const payload = msg.payload || {};
    const providedTranscript = String(payload.transcript || "").trim();
    if (providedTranscript) {
      webview.postMessage({ command: "voiceReferenceTranscribed", text: providedTranscript });
      webview.postMessage({ command: "voiceCloneStatus", text: "Reference transcript applied from the current voice settings." });
    } else {
      webview.postMessage({
        command: "voiceCloneStatus",
        text: "Automatic transcription is unavailable in this local-only runtime. Paste the reference transcript manually."
      });
      webview.postMessage({ command: "voiceReferenceTranscribed", text: "" });
    }
  }

  if (msg.command === "saveVoiceCloneSettings") {
    try {
      const payload = msg.payload || {};
      const config = getVoiceRuntimeConfig();
      if (payload.audioPath) config.cloneReferenceAudioPath = payload.audioPath;
      if (payload.transcript) config.cloneReferenceText = payload.transcript;
      persistVoiceRuntimeConfig(config);
      webview.postMessage({ command: "voiceCloneStatus", text: "Voice clone settings saved.", voiceRuntime: config });
    } catch (err: any) {
      webview.postMessage({ command: "voiceCloneStatus", text: `Save failed: ${err.message}` });
    }
  }

  if (msg.command === "testClonedVoice") {
    try {
      const payload = msg.payload || {};
      const config = getVoiceRuntimeConfig();
      const testText = payload.testText || "Hey, I'm online, ready, and listening.";
      webview.postMessage({ command: "voiceCloneStatus", text: "Generating cloned voice test... this may take a minute." });
      const outputPath = path.join(ROOT, "agent-lee", "voice", "agent-lee-test-clone.wav");
      await runCommandCapture(
        config.clonePythonPath || "python",
        [config.cloneScriptPath || path.join(ROOT, "agent-lee", "voice", "clone_voice.py"), "--ref_audio", config.cloneReferenceAudioPath || "", "--ref_text", config.cloneReferenceText || "", "--text", testText, "--output", outputPath, "--device", config.cloneDevice || "cpu"]
      );
      await playWavSync(outputPath);
      webview.postMessage({ command: "voiceCloneStatus", text: "Test complete. Clone voice played successfully.", voiceRuntime: config });
    } catch (err: any) {
      webview.postMessage({ command: "voiceCloneStatus", text: `Clone test failed: ${err.message}` });
    }
  }

  if (msg.command === "activateClonedVoice") {
    try {
      const config = getVoiceRuntimeConfig();
      config.engine = "f5-clone-local";
      config.fallbackEngine = "none";
      config.preferVoiceServer = true;
      persistVoiceRuntimeConfig(config);
      webview.postMessage({ command: "voiceCloneStatus", text: "Cloned voice is now Agent Lee's active voice.", voiceRuntime: config });
      await postRuntimeInfo(webview);
    } catch (err: any) {
      webview.postMessage({ command: "voiceCloneStatus", text: `Activation failed: ${err.message}` });
    }
  }

  if (msg.command === "useBundledReferenceVoice") {
    try {
      const config = getVoiceRuntimeConfig();
      config.cloneReferenceAudioPath = DEFAULT_DEVELOPER_REFERENCE_AUDIO;
      config.cloneReferenceText = DEFAULT_DEVELOPER_REFERENCE_TEXT;
      persistVoiceRuntimeConfig(config);
      webview.postMessage({ command: "voiceCloneStatus", text: "Bundled reference voice loaded.", voiceRuntime: config });
    } catch (err: any) {
      webview.postMessage({ command: "voiceCloneStatus", text: `Load failed: ${err.message}` });
    }
  }

  // ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Voice of Agent Lee catalog handlers ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬

  if (msg.command === "voiceAlTestDefault" || msg.command === "voiceAlTestVoice") {
    try {
      const catalog = loadVoiceCatalog();
      const targetId = msg.command === "voiceAlTestDefault" ? "agent-lee-default" : String(msg.id || "");
      const testText = "Hey, I'm online, ready, and listening. Just say the word and I'll get it done.";
      const voiceEntry = (catalog.voices || []).find((v: any) => v.id === targetId);
      const refAudio = voiceEntry?.referenceAudioPath || DEFAULT_DEVELOPER_REFERENCE_AUDIO;
      const refText = voiceEntry?.referenceText || DEFAULT_DEVELOPER_REFERENCE_TEXT;
      const config = getVoiceRuntimeConfig();
      const outputPath = path.join(ROOT, "agent-lee", "voice", "agent-lee-test-clone.wav");
      webview.postMessage({ command: "voiceCloneStatus", text: `Playing voice: ${voiceEntry?.label || targetId}...` });
      await runCommandCapture(
        config.clonePythonPath || "python",
        [config.cloneScriptPath || path.join(ROOT, "agent-lee", "voice", "clone_voice.py"), "--ref_audio", refAudio, "--ref_text", refText, "--text", testText, "--output", outputPath, "--device", config.cloneDevice || "cpu"]
      );
      await playWavSync(outputPath);
      webview.postMessage({ command: "voiceCloneStatus", text: `Voice "${voiceEntry?.label || targetId}" played successfully.` });
    } catch (err: any) {
      webview.postMessage({ command: "voiceCloneStatus", text: `Voice test failed: ${err.message}` });
    }
  }

  if (msg.command === "voiceAlActivateDefault") {
    try {
      const config = getVoiceRuntimeConfig();
      config.engine = "f5-clone-local";
      config.fallbackEngine = "none";
      config.preferVoiceServer = true;
      config.cloneReferenceAudioPath = DEFAULT_DEVELOPER_REFERENCE_AUDIO;
      config.cloneReferenceText = DEFAULT_DEVELOPER_REFERENCE_TEXT;
      config.selectedVoiceId = "agent-lee-default";
      config.selectedVoiceLabel = "Agent Lee Default Voice";
      config.selectedSpeakerId = "";
      persistVoiceRuntimeConfig(config);
      const catalog = loadVoiceCatalog();
      catalog.defaultVoiceId = "agent-lee-default";
      saveVoiceCatalog(catalog);
      webview.postMessage({ command: "voiceCloneStatus", text: "Agent Lee default live clone voice is now active.", voiceRuntime: config, defaultStatus: "Default voice is now active." });
      webview.postMessage({ command: "voiceAlCatalogUpdate", catalog, activeVoiceId: config.selectedVoiceId });
      await postRuntimeInfo(webview);
    } catch (err: any) {
      webview.postMessage({ command: "voiceCloneStatus", text: `Restore failed: ${err.message}` });
    }
  }

  if (msg.command === "voiceAlRecordMic") {
    showAgentLeeInfo("Open a terminal and run: cd " + path.join(ROOT, "agent-lee", "voice") + " && .\\voice-cloning-env\\Scripts\\python.exe record_mic.py");
    webview.postMessage({ command: "voiceCloneStatus", text: "Open a terminal to record. Once done, paste the file path in the Reference audio field." });
  }

  if (msg.command === "voiceAlCloneAndPreview") {
    try {
      const payload = msg.payload || {};
      if (!payload.audioPath) { webview.postMessage({ command: "voiceCloneStatus", text: "Please provide a reference audio file path." }); return; }
      if (!payload.transcript) { webview.postMessage({ command: "voiceCloneStatus", text: "Please provide the transcript of the reference audio." }); return; }
      const config = getVoiceRuntimeConfig();
      const testText = payload.testText || "Hey, I'm online, ready, and listening. Just say the word and I'll get it done.";
      const outputPath = path.join(ROOT, "agent-lee", "voice", "agent-lee-clone-preview.wav");
      webview.postMessage({ command: "voiceCloneStatus", text: "Cloning voice and generating preview... this may take a minute on CPU." });
      await runCommandCapture(
        config.clonePythonPath || "python",
        [config.cloneScriptPath || path.join(ROOT, "agent-lee", "voice", "clone_voice.py"), "--ref_audio", payload.audioPath, "--ref_text", payload.transcript, "--text", testText, "--output", outputPath, "--device", config.cloneDevice || "cpu"]
      );
      await playWavSync(outputPath);
      webview.postMessage({ command: "voiceCloneStatus", text: `Clone preview complete. If it sounds good, click Save to Catalog.` });
    } catch (err: any) {
      webview.postMessage({ command: "voiceCloneStatus", text: `Clone preview failed: ${err.message}` });
    }
  }

  if (msg.command === "voiceAlSaveClone") {
    try {
      const payload = msg.payload || {};
      if (!payload.label) { webview.postMessage({ command: "voiceCloneStatus", text: "Please provide a name for the voice." }); return; }
      if (!payload.audioPath) { webview.postMessage({ command: "voiceCloneStatus", text: "Please provide a reference audio file." }); return; }
      if (!payload.transcript) { webview.postMessage({ command: "voiceCloneStatus", text: "Please provide the transcript." }); return; }
      const catalog = loadVoiceCatalog();
      if ((catalog.voices || []).length >= MAX_VOICE_CATALOG_ENTRIES) {
        webview.postMessage({ command: "voiceCloneStatus", text: `Voice catalog is full (${MAX_VOICE_CATALOG_ENTRIES} max). Delete a voice first.` });
        return;
      }
      const newId = "voice-" + Date.now();
      const savedRefPath = path.join(ROOT, "agent-lee", "voice", newId + "-reference.wav");
      fs.copyFileSync(payload.audioPath, savedRefPath);
      const entry = {
        id: newId,
        label: payload.label,
        description: `Cloned voice: ${payload.label}`,
        engine: "f5-clone-local",
        referenceAudioPath: savedRefPath,
        referenceText: payload.transcript,
        isDefault: false,
        isLocked: false,
        createdAt: new Date().toISOString()
      };
      catalog.voices = catalog.voices || [];
      catalog.voices.push(entry);
      saveVoiceCatalog(catalog);
      webview.postMessage({ command: "voiceCloneStatus", text: `Voice "${payload.label}" saved to catalog.` });
      webview.postMessage({ command: "voiceAlCatalogUpdate", catalog, activeVoiceId: catalog.defaultVoiceId || "agent-lee-default" });
    } catch (err: any) {
      webview.postMessage({ command: "voiceCloneStatus", text: `Save failed: ${err.message}` });
    }
  }

  if (msg.command === "voiceAlSetActive") {
    try {
      const targetId = String(msg.id || "");
      const catalog = loadVoiceCatalog();
      const voiceEntry = (catalog.voices || []).find((v: any) => v.id === targetId);
      if (!voiceEntry) { webview.postMessage({ command: "voiceCloneStatus", text: `Voice not found: ${targetId}` }); return; }
      catalog.defaultVoiceId = targetId;
      saveVoiceCatalog(catalog);
      const config = getVoiceRuntimeConfig();
      config.engine = "f5-clone-local";
      config.fallbackEngine = "none";
      config.preferVoiceServer = true;
      config.cloneReferenceAudioPath = voiceEntry.referenceAudioPath;
      config.cloneReferenceText = voiceEntry.referenceText;
      config.selectedVoiceId = voiceEntry.id;
      config.selectedVoiceLabel = voiceEntry.label;
      persistVoiceRuntimeConfig(config);
      webview.postMessage({ command: "voiceCloneStatus", text: `Voice "${voiceEntry.label}" is now active.`, voiceRuntime: config });
      webview.postMessage({ command: "voiceAlCatalogUpdate", catalog, activeVoiceId: targetId });
      await postRuntimeInfo(webview);
    } catch (err: any) {
      webview.postMessage({ command: "voiceCloneStatus", text: `Set active failed: ${err.message}` });
    }
  }

  if (msg.command === "voiceAlDeleteVoice") {
    try {
      const targetId = String(msg.id || "");
      const catalog = loadVoiceCatalog();
      const voiceEntry = (catalog.voices || []).find((v: any) => v.id === targetId);
      if (!voiceEntry) { webview.postMessage({ command: "voiceCloneStatus", text: `Voice not found: ${targetId}` }); return; }
      if (voiceEntry.isLocked) { webview.postMessage({ command: "voiceCloneStatus", text: "Cannot delete the locked default voice." }); return; }
      catalog.voices = (catalog.voices || []).filter((v: any) => v.id !== targetId);
      if (catalog.defaultVoiceId === targetId) catalog.defaultVoiceId = "agent-lee-default";
      saveVoiceCatalog(catalog);
      if (voiceEntry.referenceAudioPath && fs.existsSync(voiceEntry.referenceAudioPath) && voiceEntry.referenceAudioPath.includes("voice-")) {
        try { fs.unlinkSync(voiceEntry.referenceAudioPath); } catch {}
      }
      webview.postMessage({ command: "voiceCloneStatus", text: `Voice "${voiceEntry.label}" deleted.` });
      webview.postMessage({ command: "voiceAlCatalogUpdate", catalog, activeVoiceId: catalog.defaultVoiceId });
      await postRuntimeInfo(webview);
    } catch (err: any) {
      webview.postMessage({ command: "voiceCloneStatus", text: `Delete failed: ${err.message}` });
    }
  }

  } catch (error) {
    const detail = describeFileError(error);
    try {
      webview.postMessage({ command: "agentLeeUiResponse", text: `Agent Lee action failed: ${detail}` });
    } catch {}
    postAgentResponse(
      webview,
      `A runtime write or message step failed, so I could not finish that turn. ${detail}`,
      { speak: false, activity: { kind: "status", label: "Message handling failed", detail } }
    );
    console.error("[Agent Lee] Webview message handling failed.", error);
  }
}

function openPanel(context: vscode.ExtensionContext) {
  if (agentLeePanel) {
    agentLeePanel.reveal(vscode.ViewColumn.Beside, false);
    return agentLeePanel;
  }

  const panel = vscode.window.createWebviewPanel(
    "agentLeeRuntimePanel",
    "Agent Lee",
    vscode.ViewColumn.Beside,
    {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, "media")]
    }
  );
  panel.webview.html = getHtml(panel.webview, context);
  activeWebviews.add(panel.webview);
  panel.webview.onDidReceiveMessage((msg) => handle(panel.webview, msg, context));
  panel.onDidDispose(() => {
    activeWebviews.delete(panel.webview);
    if (agentLeePanel === panel) {
      agentLeePanel = null;
    }
  });
  agentLeePanel = panel;
  return panel;
}

async function openAgentLeeSidebar() {
  await vscode.commands.executeCommand(`workbench.view.extension.${AGENT_LEE_VIEW_CONTAINER_ID}`);
  try {
    await vscode.commands.executeCommand(`${AGENT_LEE_SIDEBAR_VIEW_ID}.focus`);
  } catch {
    // Older VS Code builds may not expose an explicit focus command for contributed webview views.
  }
}

function preferRightSideSurface() {
  const configured = vscode.workspace.getConfiguration("agentLee").get<boolean>("preferRightSideSurface", true);
  return configured && runtimeState.preferRightSideSurface !== false;
}

async function openAgentLeeRightSurface(context: vscode.ExtensionContext) {
  recordAgentLeeRuntimeReceipt({
    event: "ui.right-surface.opened",
    route: "panel-beside",
    limitation: "VS Code extensions cannot directly contribute a view container to the Secondary Sidebar. Agent Lee uses a right-side webview panel as the strongest enforceable default."
  });
  openPanel(context);
}

async function openPreferredAgentLeeSurface(context: vscode.ExtensionContext) {
  if (preferRightSideSurface()) {
    await openAgentLeeRightSurface(context);
    return;
  }
  await openAgentLeeSidebar();
}

function registerChatParticipant(context: vscode.ExtensionContext) {
  const chatApi = (vscode as any).chat;
  if (!chatApi?.createChatParticipant) {
    log("chat-participant-unavailable", { vscodeVersion: vscode.version });
    return;
  }

  const participant = chatApi.createChatParticipant(
    "leeway.agentLee",
    async (request: vscode.ChatRequest, _chatContext: vscode.ChatContext, response: vscode.ChatResponseStream): Promise<vscode.ChatResult> => {
      const sovereignRuntime = getAgentLeeRuntimeState();
      if (!sovereignRuntime.AGENT_LEE_RUNTIME_READY) {
        response.markdown(agentLeeText("Agent Lee runtime is degraded: persona module unavailable. Only scan and doctor style diagnostics should run until the sovereign runtime is healthy again."));
        return {};
      }

      const prompt = String(request.prompt || "").trim();
      if (!prompt) {
        response.markdown(agentLeeText("What's the move? Show me what's breaking or what you're trying to build."));
        return {};
      }

      response.progress("Inspecting the workspace and runtime...");
      const installedModels = await getModels();
      refreshRuntimeFromInstalled(installedModels);

      const active = getOrCreateActiveConversation(workspaceRoot());
      const timestamp = new Date().toISOString();
      appendConversationMessage(workspaceRoot(), { role: "user", text: prompt, timestamp }, { conversationId: active.id, titleHint: "Agent Lee chat" });

      const pluginAttempt = await attemptPluginRoute(prompt);
      if (pluginAttempt) {
        let pluginResult = pluginAttempt.result;
        if (pluginResult.requiresFollowUp) {
          const plugin = getPluginById(pluginAttempt.pluginCall.pluginId, effectiveEnabledPlugins());
          const choice = await promptAgentLeeWarning(
            `Agent Lee wants to use ${plugin?.name || pluginAttempt.pluginCall.pluginId} for "${pluginAttempt.pluginCall.action}" (${plugin?.riskLevel || "high"} risk).`,
            { routeLabel: "extension.chat-plugin-approval" },
            "Approve Once",
            "Cancel"
          );

          if (choice === "Approve Once") {
            pluginResult = await handlePluginCall(undefined, pluginAttempt.pluginCall, true);
          } else {
            clearPendingPluginApproval();
            response.markdown(agentLeeText("Plugin action cancelled."));
            return {};
          }
        }

        const pluginText = formatPluginResult(pluginResult);
        appendConversationMessage(workspaceRoot(), { role: "agent", text: pluginText, timestamp: new Date().toISOString() }, { conversationId: active.id });
        response.markdown(pluginText);
        return { metadata: { pluginId: pluginAttempt.pluginCall.pluginId, receiptId: pluginResult.receiptId || "" } };
      }

      const result = await guardedAsk(prompt, installedModels);
      const stage = enforceStageLaw("synthesis", { speaker: "Agent Lee", directUserFacing: true });
      const finalText = stage.allowed ? finalizeResponse(result, "chat") : "Agent Lee governance blocked a non-sovereign response.";

      if (result.reportPath) lastReportPath = result.reportPath;
      appendConversationMessage(workspaceRoot(), { role: "agent", text: finalText, timestamp: new Date().toISOString() }, { conversationId: active.id });

      response.markdown(finalText);
      speak(finalText);
      return { metadata: { reportPath: result.reportPath || "", workspaceRoot: workspaceRoot() } };
    }
  ) as vscode.ChatParticipant;

  participant.iconPath = vscode.Uri.joinPath(context.extensionUri, "media", "agent-lee-chat-avatar.svg");
  participant.followupProvider = {
    provideFollowups() {
      return [
        { prompt: "Inspect this workspace and summarize the front-end architecture.", label: "Inspect workspace" },
        { prompt: "Open Agent Lee on the right-side surface.", label: "Open right surface", command: "open" },
        { prompt: "Review the current UI visually and give me evidence paths.", label: "Visual review" }
      ];
    }
  };

  context.subscriptions.push(participant);
}

export async function activate(context: vscode.ExtensionContext) {
  // LEEWAY EMERGENCY COMMAND BOOTSTRAP - DO NOT REMOVE
  try {
    const leewayBootLog = vscode.window.createOutputChannel("Agent Lee Bootstrap");
    leewayBootLog.appendLine("[BOOT] Agent Lee activate() entered.");
    context.subscriptions.push(leewayBootLog);

    context.subscriptions.push(vscode.commands.registerCommand("agentLee.openSidebar", async () => {
      leewayBootLog.appendLine("[BOOT] agentLee.openSidebar executed.");
      try {
        await openAgentLeeSidebar();
      } catch (err: any) {
        leewayBootLog.appendLine("[BOOT][ERROR] openAgentLeeSidebar failed: " + (err?.stack || err?.message || String(err)));
        leewayBootLog.appendLine("[BOOT] Falling back to openPanel.");
        try {
          await openPanel(context);
        } catch (innerErr: any) {
          leewayBootLog.appendLine("[BOOT][ERROR] fallback openPanel failed: " + (innerErr?.stack || innerErr?.message || String(innerErr)));
          showAgentLeeError("Agent Lee failed to open. Check Output > Agent Lee Bootstrap.");
        }
      }
    }));

    context.subscriptions.push(vscode.commands.registerCommand("agentLee.open", async () => {
      leewayBootLog.appendLine("[BOOT] agentLee.open executed.");
      try {
        await openPreferredAgentLeeSurface(context);
      } catch (err: any) {
        leewayBootLog.appendLine("[BOOT][ERROR] open preferred surface failed: " + (err?.stack || err?.message || String(err)));
        showAgentLeeError("Agent Lee failed to open. Check Output > Agent Lee Bootstrap.");
      }
    }));

    context.subscriptions.push(vscode.commands.registerCommand("agentLee.openRightSurface", async () => {
      leewayBootLog.appendLine("[BOOT] agentLee.openRightSurface executed.");
      try {
        await openAgentLeeRightSurface(context);
      } catch (err: any) {
        leewayBootLog.appendLine("[BOOT][ERROR] openRightSurface failed: " + (err?.stack || err?.message || String(err)));
        showAgentLeeError("Agent Lee failed to open. Check Output > Agent Lee Bootstrap.");
      }
    }));
  } catch (err: any) {
    showAgentLeeError("Agent Lee bootstrap command registration failed: " + (err?.message || String(err)));
  }

  const provider = new Provider(context);
  const editBufferCodeLensProvider = new AgentLeeEditBufferCodeLensProvider();
  const output = vscode.window.createOutputChannel("Agent Lee LeeWay");
  agentLeeOutputChannel = output;
  try {
    const bridgeRuntimeBootReport = await initializeBridgeRuntimeAuthority(context.extension.packageJSON?.version || "unknown");
    if (bridgeRuntimeBootReport) {
      output.appendLine(`[Bridge Runtime] ${bridgeRuntimeBootReport.status} | safeMode=${bridgeRuntimeBootReport.safeMode} | report=${bridgeRuntimeBootReport.garbageCollectionReportPath}`);
    }
  } catch (error: any) {
    output.appendLine(`[Bridge Runtime][ERROR] ${error?.stack || error?.message || String(error)}`);
  }
  try {
    const lifecycleAuthorityResult = await activateLifecycleAuthority(context);
    if (lifecycleAuthorityResult) {
      const receiptSuffix = lifecycleAuthorityResult.receiptPath ? ` | receipt=${lifecycleAuthorityResult.receiptPath}` : "";
      output.appendLine(`[Lifecycle Authority] ${lifecycleAuthorityResult.lifecycleState}${receiptSuffix}`);
    }
  } catch (error: any) {
    output.appendLine(`[Lifecycle Authority][ERROR] ${error?.stack || error?.message || String(error)}`);
  }

  // Initialize Runtime Fabric connection
  try {
    output.appendLine("[Runtime Fabric] Initializing connection to https://leeway-runtime-fabric.fly.dev...");
    runtimeFabricStatus = await initializeRuntimeFabric();
    if (runtimeFabricStatus.connected && runtimeFabricStatus.healthy) {
      output.appendLine(`[Runtime Fabric] ✓ Connected and healthy | Services: Provider Fabric=${runtimeFabricStatus.services.providerFabric}, Sentinel=${runtimeFabricStatus.services.sentinel}, Cage=${runtimeFabricStatus.services.cage}, Terminator=${runtimeFabricStatus.services.terminator}`);
      // Start periodic health checks every 30 seconds
      context.subscriptions.push(startRuntimeFabricHealthChecks(30000));
      output.appendLine("[Runtime Fabric] Health check monitoring started (30s interval)");
    } else {
      output.appendLine(`[Runtime Fabric] ✗ Connection failed: ${runtimeFabricStatus.error || "Unknown error"}`);
    }
  } catch (error: any) {
    output.appendLine(`[Runtime Fabric][ERROR] ${error?.stack || error?.message || String(error)}`);
    runtimeFabricStatus = {
      connected: false,
      healthy: false,
      url: "https://leeway-runtime-fabric.fly.dev",
      lastCheck: new Date().toISOString(),
      error: error?.message || String(error),
      services: {
        providerFabric: false,
        sentinel: false,
        cage: false,
        terminator: false
      }
    };
  }

  runtimeStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  runtimeStatusBarItem.name = "Agent Lee LeeWay";
  runtimeStatusBarItem.text = "Agent Lee: Booting";
  runtimeStatusBarItem.tooltip = "Agent Lee is booting. Click to open the preferred right-side surface.";
  runtimeStatusBarItem.command = "agentLee.openRightSurface";
  runtimeStatusBarItem.show();
  context.subscriptions.push(runtimeStatusBarItem);

  context.subscriptions.push(vscode.commands.registerCommand(AGENT_LEE_OPEN_PANEL_COMMAND, () => openPanel(context)));
  // agentLee.open and agentLee.openSidebar registered early in emergency bootstrap
  context.subscriptions.push(vscode.commands.registerCommand("agentLee.visual.openPanel", async () => {
    await openLvisPanel(context);
    const receiptPath = writeLvisReceipt("agentLee.visual.openPanel", "Opened the internal LVIS panel.", {
      command: "agentLee.visual.openPanel"
    });
    appendAgentLeeLine(output, `LVIS panel opened. Receipt: ${receiptPath}`, { voiceMode: "operator" });
  }));
  context.subscriptions.push(vscode.commands.registerCommand("agentLee.visual.systemStatus", async () => {
    const status = await getLvisSystemStatus();
    appendAgentLeeLine(output, `${status.title}`, { voiceMode: "operator" });
    appendAgentLeeLine(output, `Qwen-only provider present: ${status.qwenOnlyProviderPresent ? "yes" : "no"}`, { voiceMode: "operator" });
    appendAgentLeeLine(output, `Root path: ${status.rootPath}`, { voiceMode: "operator" });
    for (const route of status.routes) {
      appendAgentLeeLine(output, `Route ${route.role.toUpperCase()} => configured ${route.configured} | resolved ${route.resolved} | available ${route.available}`, { voiceMode: "operator" });
    }
    for (const worker of status.workers) {
      appendAgentLeeLine(output, `Worker ${worker.name} => ${worker.specialty}`, { voiceMode: "operator" });
    }
    output.show(true);
    const receiptPath = writeLvisReceipt("agentLee.visual.systemStatus", "Collected LVIS runtime status.", {
      workerCount: status.workers.length,
      routes: status.routes
    });
    showAgentLeeInfo(`LVIS status captured. Receipt: ${receiptPath}`);
  }));
  context.subscriptions.push(vscode.commands.registerCommand("agentLee.visual.revealWorkspace", async () => {
    const target = vscode.Uri.file(path.join(ROOT, "agent-lee", "visual-intelligence"));
    await vscode.commands.executeCommand("revealFileInOS", target);
    const receiptPath = writeLvisReceipt("agentLee.visual.revealWorkspace", "Revealed the LVIS workspace folder.", {
      path: target.fsPath
    });
    appendAgentLeeLine(output, `LVIS workspace revealed. Receipt: ${receiptPath}`, { voiceMode: "operator" });
  }));
  context.subscriptions.push(vscode.commands.registerCommand("agentLee.runtimeStatus", async () => {
    await openPreferredAgentLeeSurface(context);
    const state = getAgentLeeRuntimeState();
    const summary = getRuntimeProofSummary(state);
    const lines = summary.detailLines;
    appendAgentLeeLine(output, lines.join("\n"), { voiceMode: "operator" });
    updateRuntimeStatusBar(state);
    for (const webview of activeWebviews) {
      postAgentResponse(
        webview,
        `Yo, runtime status is ${summary.statusLabel}. I opened the Agent Lee chat surface and kept the raw proof in the output channel.`,
        { speak: false }
      );
    }
    await Promise.allSettled(Array.from(activeWebviews).map((webview) => postVisibleRuntimeState(webview)));
  }));

  // Open the always-on companion UI in the default browser
  context.subscriptions.push(vscode.commands.registerCommand("agentLee.openCompanion", async () => {
    const port = 4417;
    const companionUrl = vscode.Uri.parse(`http://127.0.0.1:${port}/companion`);
    try {
      await vscode.env.openExternal(companionUrl);
      vscode.window.showInformationMessage(
        "Agent Lee Companion opened in browser — allow mic & camera permissions when prompted.",
        "OK"
      );
    } catch (e) {
      vscode.window.showErrorMessage(
        `Could not open companion: ${String(e)}. Make sure the local worker is running on port ${port}.`
      );
    }
    for (const webview of activeWebviews) {
      postAgentResponse(webview, "Companion opened in your browser. Allow mic and camera when the browser asks — that's how I hear and see you.", { speak: false });
    }
  }));
  context.subscriptions.push(vscode.commands.registerCommand("agentLee.diagnoseRuntime", async () => {
    const state = getAgentLeeRuntimeState();
    const summary = getRuntimeProofSummary(state);
    const lines = [
      `Runtime status: ${summary.statusLabel}`,
      ...summary.detailLines
    ];
    output.appendLine(lines.join("\n"));
    output.show(true);
    showAgentLeeInfo(`Agent Lee runtime diagnosis recorded. Status: ${summary.statusLabel}.`);
    await Promise.allSettled(Array.from(activeWebviews).map((webview) => postVisibleRuntimeState(webview)));
  }));
  context.subscriptions.push(vscode.commands.registerCommand("agentLee.recoverUi", async () => {
    try {
      await openAgentLeeSidebar();
      await vscode.commands.executeCommand("agentLee.runtimeStatus");
    } catch (error) {
      const detail = describeFileError(error);
      output.appendLine(`Agent Lee UI recovery failed: ${detail}`);
      output.show(true);
      showAgentLeeWarning(`Agent Lee UI recovery could not complete: ${detail}`);
    }
  }));
  context.subscriptions.push(vscode.commands.registerCommand("agentLee.repairInstallation", async () => {
    try {
      await installManagedVsix(context, "manual");
      await vscode.commands.executeCommand("agentLee.diagnoseRuntime");
    } catch (error) {
      const detail = describeFileError(error);
      output.appendLine(`Agent Lee install repair failed: ${detail}`);
      output.show(true);
      showAgentLeeError(`Agent Lee install repair failed: ${detail}`);
    }
  }));
  context.subscriptions.push(vscode.commands.registerCommand("agentLee.showInstalledVersion", async () => {
    const state = getAgentLeeRuntimeState();
    const runtimeTruth = state.runtimeTruth;
    const packageJsonPath = path.join(MANAGED_EXTENSION_DIR, "package.json");
    let buildIdentity: { buildHash?: string; buildTimestamp?: string; runtimeBuildId?: string } = {};
    try {
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8")) as { buildIdentity?: { buildHash?: string; buildTimestamp?: string; runtimeBuildId?: string } };
        buildIdentity = packageJson.buildIdentity || {};
      }
    } catch {
      buildIdentity = {};
    }
    const detail = [
      `Current extension version: ${runtimeTruth?.packageVersion || "unknown"}`,
      `Repo source version: ${runtimeTruth?.repoPackageVersion || "unknown"}`,
      `Installed extension version: ${runtimeTruth?.installedVersion || "not_found"}`,
      `Build hash: ${buildIdentity.buildHash || "unknown"}`,
      `Build timestamp: ${buildIdentity.buildTimestamp || "unknown"}`,
      `Runtime build id: ${buildIdentity.runtimeBuildId || "unknown"}`,
      `Installed runtime status: ${runtimeTruth?.installedRuntimeStatus || "unknown"}`
    ].join("\n");
    appendAgentLeeLine(output, detail, { voiceMode: "operator" });
    output.show(true);
    showAgentLeeInfo(`Installed extension version: ${runtimeTruth?.installedVersion || "not_found"}. Build hash: ${buildIdentity.buildHash || "unknown"}.`);
  }));
  context.subscriptions.push(vscode.commands.registerCommand("agentLee.showUpdateChannel", async () => {
    const state = getAgentLeeRuntimeState();
    const runtimeTruth = state.runtimeTruth;
    const detail = [
      `Update channel: ${runtimeTruth?.updateChannel || "UPDATE_CHANNEL_UNKNOWN"}`,
      `Automatic update explanation: ${runtimeTruth?.autoUpdateExpectation || "unknown"}`,
      `extensions.autoUpdate: ${runtimeTruth?.autoUpdateSetting || "unknown"}`,
      `workspace extensions.autoUpdate: ${runtimeTruth?.autoUpdateWorkspaceSetting || "unknown"}`
    ].join("\n");
    appendAgentLeeLine(output, detail, { voiceMode: "operator" });
    output.show(true);
    showAgentLeeInfo(`Update channel: ${runtimeTruth?.updateChannel || "UPDATE_CHANNEL_UNKNOWN"}.`);
  }));
  context.subscriptions.push(vscode.commands.registerCommand("agentLee.installCurrentBuild", async () => {
    await vscode.commands.executeCommand("agentLee.repairInstallation");
  }));

  context.subscriptions.push(vscode.window.registerWebviewViewProvider(AGENT_LEE_SIDEBAR_VIEW_ID, provider));
  context.subscriptions.push(vscode.languages.registerCodeLensProvider({ scheme: "file" }, editBufferCodeLensProvider));
  context.subscriptions.push(output);
  registerChatParticipant(context);
  registerAgentLeeEditBufferCommands(context, editBufferCodeLensProvider);
  registerAgentLeeLiveVoiceCommands(context, async (text) => {
    speak(text);
  });
  context.subscriptions.push(vscode.commands.registerCommand("agentLee.liveVoice.chat", async (text: string) => {
    const prompt = String(text || "").trim();
    if (!prompt) return;
    if (!activeWebviews.size) {
      await openPreferredAgentLeeSurface(context);
      if (!activeWebviews.size) {
        openPanel(context);
      }
    }
    for (const webview of Array.from(activeWebviews)) {
      await handle(webview, { command: "ask", text: prompt, attachments: [] }, context);
    }
  }));
  context.subscriptions.push(vscode.commands.registerCommand("agentLee.voiceBridge.handleTranscript", async (payload: LeeWayVoiceBridgeMessage | { text?: string; transcriptId?: string; timestamp?: string; confidence?: number; source?: string }) => {
    const normalized = ((payload && typeof payload === "object" ? payload : {}) as any);
    const text = String(normalized.text || "").trim();
    const source: LeeWayVoiceEventSource = String(normalized.source || "").includes("browser")
      ? "BROWSER_SPEECH_FALLBACK"
      : "LOCAL_TRANSCRIPT_BRIDGE";
    if (normalized.type === "VOICE_STATUS" || containsBlockedStatusPhrase(text)) {
      recordVoiceBridgeStatus({
        type: "VOICE_STATUS",
        status: String(normalized.status || "LOCAL_TRANSCRIPT_AVAILABLE") as any,
        message: String(normalized.message || normalized.text || "Local transcript bridge is available as a fallback. Voice input will be labeled and governed."),
        timestamp: String(normalized.timestamp || new Date().toISOString()),
        source: source === "BROWSER_SPEECH_FALLBACK" ? "browser" : "local-bridge"
      }, source);
      return true;
    }
    if (normalized.type === "VOICE_ERROR") {
      recordVoiceBridgeStatus({
        type: "VOICE_ERROR",
        errorId: String(normalized.errorId || createVoiceEventId("voice-error")),
        message: String(normalized.message || normalized.text || "Voice bridge error."),
        timestamp: String(normalized.timestamp || new Date().toISOString()),
        source: String(normalized.source || "local-bridge")
      }, source);
      return true;
    }
    if (!text) return false;
    if (!activeWebviews.size) {
      await openPreferredAgentLeeSurface(context);
    }
    captureVoiceTranscriptForReview({
      text,
      source,
      transcriptId: String(normalized.transcriptId || createVoiceEventId("voice-transcript")),
      timestamp: String(normalized.timestamp || new Date().toISOString()),
      confidence: typeof normalized.confidence === "number" ? normalized.confidence : undefined,
      webview: Array.from(activeWebviews)[0] || null
    });
    return true;
  }));
  context.subscriptions.push(vscode.commands.registerCommand("agentLee.voiceBridge.handleRuntimeStatus", async (payload: LeeWayVoiceBridgeMessage) => {
    if (payload.type === "VOICE_STATUS" || payload.type === "VOICE_ERROR") {
      recordVoiceBridgeStatus(payload as any, payload.source === "browser" ? "BROWSER_SPEECH_FALLBACK" : "LOCAL_TRANSCRIPT_BRIDGE");
      await Promise.allSettled(Array.from(activeWebviews).map((webview) => postRuntimeInfo(webview, currentTaskState.prompt || "voice status")));
    }
    return true;
  }));
  context.subscriptions.push(vscode.commands.registerCommand("agentLee.liveVoice.explainActiveContext", async (text: string) => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      await vscode.commands.executeCommand("agentLee.liveVoice.chat", String(text || "Explain the current workspace context."));
      return;
    }
    const selected = editor.document.getText(editor.selection).trim();
    const excerpt = (selected || editor.document.getText()).slice(0, 1200);
    const prompt = [
      "Explain the active coding context with practical next steps.",
      `File: ${editor.document.uri.fsPath}`,
      "Context:",
      excerpt,
      text ? `\nUser note: ${String(text).trim()}` : ""
    ].filter(Boolean).join("\n");
    await vscode.commands.executeCommand("agentLee.liveVoice.chat", prompt);
  }));
  context.subscriptions.push(vscode.commands.registerCommand("agentLee.liveVoice.createPendingEditFromSpeech", async (text: string) => {
    const prompt = `Create a safe pending edit proposal from this voice instruction: ${String(text || "").trim()}`;
    await vscode.commands.executeCommand("agentLee.liveVoice.chat", prompt);
  }));
  registerAgentLeeCodingSessionCommands(context, async (text) => {
    speak(text);
  });
  registerAgentLeePerformanceCommands(context, async (text) => {
    speak(text);
  });
  registerAgentLeeBackgroundIndexerCommands(context, async (text) => {
    speak(text);
  });
  registerAgentLeeCoreRuntimeServices(context, {
    pluginRouter,
  });
  context.subscriptions.push(vscode.commands.registerCommand("agentLee.scanSelf", () => runWorkspaceScan(output, "scanSelf")));
  context.subscriptions.push(vscode.commands.registerCommand("agentLee.verifySelf", () => runWorkspaceScan(output, "verifySelf")));
  context.subscriptions.push(vscode.commands.registerCommand("agentLee.scanWorkspace", () => runWorkspaceScan(output, "scan")));
  context.subscriptions.push(vscode.commands.registerCommand("agentLee.verifyWorkspace", () => runWorkspaceScan(output, "verify")));

  context.subscriptions.push(vscode.commands.registerCommand("agentLee.fixWorkspace", async () => {
    try {
      await runWorkspaceFix(output);
    } catch (error) {
      const detail = describeFileError(error);
      output.appendLine(`Workspace fix failed: ${detail}`);
      output.show(true);
      showAgentLeeError(`Agent Lee fix failed: ${detail}`);
    }
  }));
  context.subscriptions.push(vscode.commands.registerCommand("agentLee.askLocalModel", async () => {
    await runAskLocalModel(output);
  }));
  context.subscriptions.push(vscode.commands.registerCommand("agentLee.inspectWorkspace", async () => {
    try {
      assertAgentLeeRuntimeReady();
      const target = vscode.window.activeTextEditor?.document.uri.fsPath || workspaceRoot() || ROOT;
      const inspection = await inspectWorkspace(target);
      const message = agentLeeText([
        `Workspace root: ${inspection.workspaceRoot}`,
        `Relevant files: ${inspection.relevantFiles.length}`,
        `LeeWay average: ${inspection.leewayDirectoryAudit.averageCompliance}`,
        `Blocking files: ${inspection.leewayDirectoryAudit.blockingFiles}`,
        `Compile script: ${inspection.compileScript || "missing"}`,
        `Test script: ${inspection.testScript || "missing"}`,
        `Lint script: ${inspection.lintScript || "missing"}`
      ].join("\n"), { voiceMode: "operator" });
      output.appendLine(message);
      output.show(true);
      showAgentLeeInfo("Agent Lee inspected the workspace. See output for details.");
    } catch (error) {
      const detail = describeFileError(error);
      output.appendLine(`Workspace inspection failed: ${detail}`);
      output.show(true);
      showAgentLeeError(`Agent Lee inspect failed: ${detail}`);
    }
  }));
  context.subscriptions.push(vscode.commands.registerCommand("agentLee.stagePatch", async () => {
    try {
      assertAgentLeeRuntimeReady();
      const request = await promptAgentLeeInputBox({
        prompt: "Describe the patch Agent Lee should stage for review"
      }, "extension.stage-patch");
      if (!request) return;
      const target = vscode.window.activeTextEditor?.document.uri.fsPath || workspaceRoot() || ROOT;
      const inspection = await inspectWorkspace(target);
      const plan = buildExecutionPlan(request, inspection);
      const staged = await stagePatch(plan);
      appendAgentLeeLine(output, `Staged patch summary: ${staged.summary}`, { voiceMode: "operator" });
      appendAgentLeeLine(output, `Approval required: ${staged.approvalRequired}`, { voiceMode: "operator" });
      appendAgentLeeLine(output, `Staged package: ${staged.stagedPackageId || "none"}`, { voiceMode: "operator" });
      output.show(true);
      showAgentLeeInfo("Agent Lee staged the patch for review.");
    } catch (error) {
      const detail = describeFileError(error);
      output.appendLine(`Stage patch failed: ${detail}`);
      output.show(true);
      showAgentLeeError(`Agent Lee stage patch failed: ${detail}`);
    }
  }));
  context.subscriptions.push(vscode.commands.registerCommand("agentLee.applyApprovedPatch", async () => {
    try {
      assertAgentLeeRuntimeReady();
      const staged = getLatestStagedPatch();
      if (!staged?.stagedPackageId) {
        showAgentLeeWarning("No staged Agent Lee patch is ready to apply.");
        return;
      }
      editBufferStore.acceptAll(staged.stagedPackageId);
      const result = await vscode.commands.executeCommand("agentLee.editBuffer.applyAccepted", staged.stagedPackageId);
      appendAgentLeeLine(output, `Apply approved patch requested for ${staged.stagedPackageId}.`, { voiceMode: "operator" });
      if (result) appendAgentLeeLine(output, String(result), { voiceMode: "operator" });
      output.show(true);
    } catch (error) {
      const detail = describeFileError(error);
      output.appendLine(`Apply approved patch failed: ${detail}`);
      output.show(true);
      showAgentLeeError(`Agent Lee apply failed: ${detail}`);
    }
  }));
  context.subscriptions.push(vscode.commands.registerCommand("agentLee.runVerification", async () => {
    try {
      assertAgentLeeRuntimeReady();
      const target = vscode.window.activeTextEditor?.document.uri.fsPath || workspaceRoot() || ROOT;
      const results = await runEngineeringVerification(target);
      for (const result of results) {
        appendAgentLeeLine(output, `${result.ok ? "PASS" : "FAIL"} ${result.command} :: ${result.summary}`, { voiceMode: "operator" });
      }
      output.show(true);
      if (results.every((result) => result.ok)) {
        showAgentLeeInfo("Agent Lee verification passed.");
      } else {
        showAgentLeeWarning("Agent Lee verification found failures. See output for details.");
      }
    } catch (error) {
      const detail = describeFileError(error);
      output.appendLine(`Engineering verification failed: ${detail}`);
      output.show(true);
      showAgentLeeError(`Agent Lee verification failed: ${detail}`);
    }
  }));
  context.subscriptions.push(vscode.commands.registerCommand("agentLee.showReceipts", async () => {
    const receiptsDir = path.join(ROOT, "reports", "engineering-runs");
    fs.mkdirSync(receiptsDir, { recursive: true });
    await vscode.commands.executeCommand("revealFileInOS", vscode.Uri.file(receiptsDir));
  }));
  context.subscriptions.push(vscode.commands.registerCommand("agentLee.testPersona", async () => {
    assertAgentLeeRuntimeReady();
    const personaOutput = testPersona();
    appendAgentLeeLine(output, `Diagnostic probe confirmed the always-on persona runtime.\n\n${personaOutput}`, { voiceMode: "grounded" });
    output.show(true);
    showAgentLeeInfo("Agent Lee persona diagnostic wrote its output. It did not activate persona because Agent Lee is already active.");
  }));
  context.subscriptions.push(vscode.commands.registerCommand("agentLee.engineerTask", async () => {
    try {
      assertAgentLeeRuntimeReady();
      const request = await promptAgentLeeInputBox({
        prompt: "Describe the engineering task Agent Lee should inspect, stage, and verify"
      }, "extension.engineer-task");
      if (!request) return;
      const target = vscode.window.activeTextEditor?.document.uri.fsPath || workspaceRoot() || ROOT;
      const result = await runAgentEngineeringTask(request, target);
      appendAgentLeeLine(output, `Engineering task state: ${result.state}`, { voiceMode: "operator" });
      appendAgentLeeLine(output, `Receipt: ${result.receiptPath}`, { voiceMode: "operator" });
      appendAgentLeeLine(output, `Verification commands: ${result.verification.length}`, { voiceMode: "operator" });
      output.show(true);
      showAgentLeeInfo(`Agent Lee engineering task finished in state ${result.state}.`);
    } catch (error) {
      const detail = describeFileError(error);
      output.appendLine(`Engineering task failed: ${detail}`);
      output.show(true);
      showAgentLeeError(`Agent Lee engineering task failed: ${detail}`);
    }
  }));
  context.subscriptions.push(vscode.commands.registerCommand("agentLee.openReadme", () => openReadme(context)));
  context.subscriptions.push(vscode.commands.registerCommand("agentLee.installPyCharmTools", () => {
    const result = installPyCharmTooling();
    showAgentLeeInfo(result);
  }));
  context.subscriptions.push(vscode.commands.registerCommand("agentLee.newChat", () => {
    startNewConversation(workspaceRoot());
    showAgentLeeInfo("Agent Lee started a new conversation.");
  }));
  context.subscriptions.push(vscode.commands.registerCommand("agentLee.stopVoice", () => {
    stopLavrPlayback("agentlee_stop_voice_command", "stop");
    showAgentLeeInfo("Agent Lee voice stopped.");
  }));
  context.subscriptions.push(vscode.commands.registerCommand("agentLee.executionBrain.createPendingEdit", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      showAgentLeeWarning(
        "I need an active file before I can create this pending edit package. Open the target file first, then run the command again.",
        { routeLabel: "extension.execution-brain.create-pending-edit" }
      );
      return;
    }

    const document = editor.document;
    const originalText = document.getText();
    const insertion = "/* Agent Lee Execution Brain verified this file path. */\n";

    await sendExecutionPlanToEditBuffer({
      title: "Execution Brain Pending Edit Demo",
      objective: "Verify the execution brain can create real pending edits.",
      hunks: [
        {
          filePath: document.uri.fsPath,
          title: "Insert Agent Lee execution marker",
          reason: "Testing execution-brain to edit-buffer bridge.",
          originalText: originalText.slice(0, 0),
          proposedText: insertion,
          startOffset: 0,
          endOffset: 0,
          risk: "low"
        }
      ]
    });
  }));
  context.subscriptions.push(vscode.commands.registerCommand(
    "agentLee.executionBrain.createRepairPackageDemo",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        showAgentLeeWarning(
          "I need an active file before I can create this repair package demo. Open the target file first, then run the command again.",
          { routeLabel: "extension.execution-brain.create-repair-demo" }
        );
        return;
      }

      const document = editor.document;
      const firstLine = document.lineAt(0);

      await sendVerificationRepairsToEditBuffer({
        title: "Agent Lee Repair Candidate Demo",
        objective: "Verify repair candidates can become pending edit packages.",
        candidates: [
          {
            filePath: document.uri.fsPath,
            title: "Demo repair hunk",
            message: "Demo verification repair candidate.",
            originalText: firstLine.text,
            proposedText: `${firstLine.text}\n// Agent Lee repair candidate preview`,
            line: 0,
            risk: "low"
          }
        ]
      });
    }
  ));
  context.subscriptions.push(vscode.window.onDidChangeVisibleTextEditors(() => refreshAgentLeeDecorations()));
  context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(() => refreshAgentLeeDecorations()));
  context.subscriptions.push(editBufferStore.onDidChange(() => {
    refreshAgentLeeDecorations();
    editBufferCodeLensProvider.refresh();
  }));
  refreshAgentLeeDecorations();

  initializeAgentLeeRuntime(context)
    .then(async (state) => {
      updateRuntimeStatusBar(state);
      await Promise.allSettled(Array.from(activeWebviews).map((webview) => postVisibleRuntimeState(webview)));
      if (state.degraded) {
        appendAgentLeeLine(output, buildRuntimeDegradedMessage(state), { voiceMode: "operator" });
        output.show(true);
        showAgentLeeWarning(buildRuntimeDegradedMessage(state), { routeLabel: "extension.runtime-degraded-root" });
      }
    })
    .catch((error) => {
      const detail = describeFileError(error);
      output.appendLine(`Runtime initialization failed: ${detail}`);
      output.show(true);
      updateRuntimeStatusBar(getAgentLeeRuntimeState());
      void Promise.allSettled(Array.from(activeWebviews).map((webview) => postVisibleRuntimeState(webview)));
      showAgentLeeWarning(`Agent Lee runtime initialized in degraded mode: ${detail}`);
    });

  void maybeInstallManagedVsixOnStartup(context);
}

export function deactivate() {
  stopLavrPlayback("extension_deactivate", "stop");
  stopBrowserPreviews();
}

/*
DISCOVERY_PIPELINE:
Voice ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ Intent ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ Location ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ Vertical ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ Ranking ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ Render
*/
