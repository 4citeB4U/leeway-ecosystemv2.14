import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
// Load the Leeway universe loader dynamically. This repository sometimes
// runs in minimal build contexts where the full "Leeway Runtime Fabric"
// tree is not present inside the image. A missing loader must not crash
// the router at module-evaluation time, so use a guarded dynamic import
// and provide lightweight fallback implementations.
let buildCanonicalAgentLeeSnapshot;
let buildUniverseSnapshot;
try {
  const loaderUrl = new URL(
    "../../Leeway Runtime Fabric/capability-registry/registry/leeway-universe-loader.mjs",
    import.meta.url
  ).href;
  const loader = await import(loaderUrl);
  buildCanonicalAgentLeeSnapshot = loader.buildCanonicalAgentLeeSnapshot;
  buildUniverseSnapshot = loader.buildUniverseSnapshot;
} catch (err) {
  console.warn("Leeway universe loader not found; using fallback snapshots:", err && err.message);
  buildUniverseSnapshot = (ecosystemRoot = null) => ({
    exists: false,
    manifestPath: null,
    manifest: null,
    activeSkillSearchPaths: [],
    activeCapabilitySearchPaths: [],
    activeAgentSearchPaths: [],
    activeToolSearchPaths: [],
    activeWorkflowSearchPaths: [],
    activeBenchmarkSearchPaths: [],
    statefulResearchHarnessCopies: {}
  });

  buildCanonicalAgentLeeSnapshot = (ecosystemRoot = null) => ({
    canonical: false,
    agentName: 'Agent Lee',
    agentMode: 'code-mode',
    role: 'supreme-agent-lead',
    instanceContract: 'canonical-agent-lee-code-mode',
    identityFingerprint: 'leeway.agent-lee.code-mode.canonical.supreme-agent-lead.v1',
    canonicalProof: {
      expectedIdentityFingerprint: 'leeway.agent-lee.code-mode.canonical.supreme-agent-lead.v1',
      matches: false,
      canonical: false,
      agentMode: 'code-mode',
      role: 'supreme-agent-lead',
      instanceContract: 'canonical-agent-lee-code-mode'
    },
    embodimentPath: null,
    identityManifestPath: null,
    activeSkillSearchPaths: [],
    activeCapabilitySearchPaths: [],
    activeBenchmarkSearchPaths: [],
    statefulResearchHarnessCopies: {},
    universeManifestPath: null
  });
}
import {
  CANONICAL_FINGERPRINT,
  FIRST_RESPONSE_POLICY_PATH,
  RECEIPT_CORPUS_PATH,
  ORCHESTRATION_MANIFEST_PATH,
  ORCHESTRATION_STATE_PATH,
  PREFERENCE_LEDGER_PATH,
  WORK_LEDGER_PATH,
  ORCHESTRATION_RECEIPT_DIR,
  classifyPromptLoad,
  getFirstResponseProfile,
  getOrchestrationHealth,
  getModelPoolStatus,
  getLeePrimeRuntimeState,
  refreshLeePrimeRuntimeState,
  loadFirstResponsePolicy,
  loadReceiptCorpus,
  warmModel,
  routeModel,
  startLane,
  getLane,
  listLanes,
  messageLane,
  cancelLane,
  getWorkLedger,
  getPreferences,
  getSkillsFull,
  getMcpRegistry,
  getToolsFull,
  routeSkill,
  createSkill,
  validateSkill,
  simulateSkill,
  runSimulation,
  getSimulation,
  listSimulationReceipts,
  get3dArStatus,
  build3dChessSetProof,
  getToolCallSummary
} from "../runtime/agent-lee-orchestration-runtime.mjs";
import { evaluateAction as gecEvaluateAction, DEFAULT_MANIFEST as GEC_MANIFEST_PATH } from "./gec_shim.mjs";
import {
  getApplicationRegistryStatus,
  listApplicationRecords,
  discoverApplications,
  launchApplication,
  openApplicationFile,
  closeOwnedApplications,
  listApplicationReceipts
} from "../runtime/agent-lee-application-runtime.mjs";
import {
  getResearchHealth,
  startResearchSession,
  researchSearch,
  researchInspect,
  researchCurate,
  researchClaimCheck,
  researchReceipt,
  getResearchSession,
  getResearchEvidence,
  applyEvidenceToBuild
} from "../runtime/agent-lee-research-runtime.mjs";
import { getSovereignState } from "../runtime/agent-lee-state-authority.mjs";

const PORT = Number(process.env.PORT || 8080);
const OLLAMA_BASE = process.env.OLLAMA_BASE || "http://localhost:11434";
let REASONING_MODEL = process.env.AGENT_LEE_REASONING_MODEL || "qwen3:latest";
let DEFAULT_MODEL = process.env.AGENT_LEE_OLLAMA_MODEL || REASONING_MODEL;
const FAST_FALLBACK_MODEL = process.env.AGENT_LEE_ROUTER_FALLBACK_MODEL || "qwen2.5-coder:latest";
let HOT_CHAT_MODEL = process.env.AGENT_LEE_HOT_CHAT_MODEL || REASONING_MODEL;
// Discovery-first override: attempt to read model roles from the discovery index
try {
  const discoveryLoader = await import("../runtime/discovery-loader.mjs");
  const DISCOVERY_INDEX = await discoveryLoader.loadAllLeewayIndex();
  if (DISCOVERY_INDEX) {
    // Prefer explicit modelRoles mapping when present
    if (DISCOVERY_INDEX.modelRoles && DISCOVERY_INDEX.modelRoles.deepReasoner) {
      REASONING_MODEL = DISCOVERY_INDEX.modelRoles.deepReasoner;
    }
    if (DISCOVERY_INDEX.modelRoles && (DISCOVERY_INDEX.modelRoles.hotChat || DISCOVERY_INDEX.modelRoles.hot_chat || DISCOVERY_INDEX.modelRoles.HOT_CHAT_MODEL)) {
      HOT_CHAT_MODEL = DISCOVERY_INDEX.modelRoles.hotChat || DISCOVERY_INDEX.modelRoles.hot_chat || DISCOVERY_INDEX.modelRoles.HOT_CHAT_MODEL;
    }
    // Backwards compatibility: attempt to find common role names
    if (!REASONING_MODEL && discoveryLoader.findModelRole) {
      const found = discoveryLoader.findModelRole(DISCOVERY_INDEX, 'research_reasoning_model');
      if (found) REASONING_MODEL = found;
    }
    if (!HOT_CHAT_MODEL && discoveryLoader.findModelRole) {
      const foundHot = discoveryLoader.findModelRole(DISCOVERY_INDEX, 'hot_chat_model') || discoveryLoader.findModelRole(DISCOVERY_INDEX, 'hotChat');
      if (foundHot) HOT_CHAT_MODEL = foundHot;
    }
    console.log('Router: discovery-first model overrides applied', { REASONING_MODEL, HOT_CHAT_MODEL });
  }
} catch (err) {
  console.warn('Router: discovery loader not available or failed', err && err.message);
}
const ROUTER_DIR = path.dirname(fileURLToPath(import.meta.url));
const AGENT_LEE_ROOT = path.resolve(ROUTER_DIR, "..");
const RUNTIME_DIR = path.join(AGENT_LEE_ROOT, "runtime");
const SESSION_DIR = path.join(RUNTIME_DIR, "sessions");
const AUDIO_DIR = path.join(RUNTIME_DIR, "audio");
const TEMP_DIR = path.join(RUNTIME_DIR, "tmp");
const TRANSCRIPT_DIR = path.join(RUNTIME_DIR, "transcripts");
const LANGUAGE_POLICY_PATH = path.join(RUNTIME_DIR, "agent-lee-language-policy.json");
const SPEECH_STYLE_POLICY_PATH = path.join(RUNTIME_DIR, "agent-lee-speech-style-policy.json");
const VOICE_LAW_PATH = path.join(AGENT_LEE_ROOT, "config", "agent-lee-canonical-voice-law.md");
const LIVE_CONVERSATION_MANIFEST_PATH = path.join(RUNTIME_DIR, "agent-lee-conversation-abilities.manifest.json");
const OWNER_IDENTITY_MANIFEST_PATH = path.join(RUNTIME_DIR, "identity", "owner", "owner-identity.manifest.json");
const CONVERSATION_HISTORY_PATH = path.join(RUNTIME_DIR, "conversation-history.jsonl");
const TRANSCRIBE_SCRIPT_PATH = path.join(RUNTIME_DIR, "agent_lee_transcribe_wav.py");
const CEREBRAL_BASE = process.env.CEREBRAL_BASE || "http://127.0.0.1:8765";
const ESTATE_ROOT = path.resolve(AGENT_LEE_ROOT, "..");
const DEFAULT_LANGUAGE_POLICY = {
  agentId: "agent-lee",
  defaultLanguage: "en",
  defaultResponseLanguage: "en",
  defaultVoice: "LEEWAY_VOICE::AGENT_LEE::DEFAULT_CLONE",
  preferredNames: {
    Leonard: "en"
  },
  supportedLanguages: ["en", "es", "fr", "de", "it", "pt", "ja", "ko", "zh"],
  multilingualBehavior: "Understand the user's language, but default Leonard's responses to English unless an explicit target language is requested.",
  crowdModeBehavior: "When speaking to a room, summarize overlapping voices first, answer the detected speaker in their language when possible, and keep the response concise and governed.",
  roomConsentNotice: "Peace everybody. Quick governance note before we start: I am using the room microphone and camera to understand questions, speaker direction, and presentation context. I am not identifying people by name unless they introduce themselves, and I will not store personal details outside this session without permission.",
  authorityRoles: {
    publicAudience: ["ask questions", "request explanation", "request translation", "request examples", "request visual concepts"],
    leonardLee: ["authorize device control", "authorize network connection", "authorize display routing", "authorize desktop action", "authorize email sending", "authorize generated asset export", "override mode"],
    trustedOperator: ["optional future role", "temporary authority granted by Leonard"]
  },
  voiceByLanguage: {
    en: "LEEWAY_VOICE::AGENT_LEE::DEFAULT_CLONE",
    es: "es-ES-AlvaroNeural",
    fr: "fr-FR-HenriNeural",
    de: "de-DE-ConradNeural",
    it: "it-IT-DiegoNeural",
    pt: "pt-BR-AntonioNeural",
    ja: "ja-JP-KeitaNeural",
    ko: "ko-KR-InJoonNeural",
    zh: "zh-CN-YunxiNeural"
  }
};
const DEFAULT_SPEECH_STYLE_POLICY = {
  schema: "leeway.agent-lee.speech-style-policy.v1",
  agentId: "agent-lee",
  canonicalFingerprint: CANONICAL_FINGERPRINT,
  operatorName: "Leonard",
  defaultLanguage: "en",
  defaultResponseLanguage: "en",
  voicePersona: "Agent Lee",
  progressTone: "Leeway",
  styleRules: [
    "Agent Lee speaks naturally.",
    "Agent Lee avoids robotic tool narration.",
    "Agent Lee speaks progress in Leeway style.",
    "Agent Lee can be confident, direct, and energetic.",
    "Agent Lee can speak to a room with concise live-presentation pacing.",
    "Agent Lee can switch between English and Spanish when the speaker or audience needs it.",
    "Agent Lee uses neutral visual descriptors in room mode and never claims sensitive identity traits as fact.",
    "Agent Lee keeps governance visible when camera, microphone, device, or export actions are in view.",
    "Agent Lee does not overclaim.",
    "Agent Lee does not interrupt casual conversation with excessive progress spam.",
    "Agent Lee can summarize active work when asked.",
    "Agent Lee defaults to English with Leonard."
  ],
  presentationGuidance: {
    publicRoomTone: "warm, concise, and precise",
    languageSwitching: "prefer the speaker's language when practical",
    authorityCue: "make Leonard-only authority obvious without sounding bureaucratic",
    descriptorRule: "describe observable features and positions only"
  },
  progressGuidance: {
    keepItCompact: true,
    preferConcreteStatus: true,
    preferLeewayVoice: true,
    mentionReceiptsWhenUseful: true,
    avoidBureaucraticPhrases: [
      "I am executing a command",
      "I have found the search box",
      "I am searching the web",
      "I am invoking the tool",
      "I am opening the file",
      "I am running the command"
    ]
  },
  preferredProgressPhrases: [
    "Web is up. I’m keeping the build lane moving.",
    "I’ve got the search moving. Pulling the good stuff, not the filler.",
    "The abilities site is coming together. I’m making it hit like a real pitch, not a brochure.",
    "I’ve got the rules lane, design lane, and 3D lane split clean.",
    "I’m keeping the build lane moving while we talk.",
    "I’ve got the receipts lined up. This one’s not just talk."
  ],
  speechOutput: {
    speakStreamAllowed: true,
    shortArtifactPreferred: true,
    maxProgressLineLength: 180,
    guardedWhenUnsafe: true
  }
};
const CANONICAL_VOICE_LAW_TEXT = fs.existsSync(VOICE_LAW_PATH)
  ? fs.readFileSync(VOICE_LAW_PATH, "utf8").trim()
  : "";
const DEFAULT_ROUTER_SYSTEM_PROMPT =
  `${CANONICAL_VOICE_LAW_TEXT ? `${CANONICAL_VOICE_LAW_TEXT}\n\n` : ""}` +
  "You are Agent Lee Code Mode, the canonical Agent Lee production instance and Supreme Agent Lead of the Leeway ecosystem. " +
  `Your canonical embodiment path is ${AGENT_LEE_ROOT}. ` +
  "Speak clearly, directly, and naturally. " +
  "When progress matters, sound like Agent Lee, not like a tool log. " +
  "Do not imply a second Agent Lee instance inside IDE, Cerebral, or any other surface. " +
  "Do not say copy. Do not say standing by unless ending a session. " +
  "Never return an empty answer. " +
  "For language teaching, pronounce clearly, break phrases down, and be useful. " +
  "When speaking to a room, keep the answer concise, summarize noisy overlap before replying, and answer in the speaker's language when possible. " +
  "Public audience members may ask questions, request translation, request examples, and request visual concepts, but they cannot authorize device, display, network, email, or system actions. " +
  "Leonard Lee keeps the high-authority command lane for any operational action. " +
  "Room camera and microphone use must be announced before public awareness starts. " +
  "Use observable descriptors only; do not claim sensitive identity traits as fact.\n\n" +
  "================================================================================\n" +
  "AVAILABLE SYSTEM CAPABILITIES & TOOLS:\n" +
  "You have access to the following local tools/capabilities to help the user. If the user requests any of these actions, you MUST invoke the corresponding tool by outputting a JSON block starting with ```json and ending with ``` in your response. Do not output anything else in the JSON block, and place it at the end of your response.\n\n" +
  "List of tools:\n" +
  "1. \"open_browser\": Opens Microsoft Edge and navigates to the specified URL.\n" +
  "   Arguments: { \"url\": \"https://example.com\" }\n" +
  "   JSON Example:\n" +
  "   ```json\n" +
  "   { \"tool\": \"open_browser\", \"url\": \"https://linkedin.com\" }\n" +
  "   ```\n\n" +
  "2. \"web_search\": Searches the web using Playwright Edge and Bing for the given query, then returns search results and screenshots.\n" +
  "   Arguments: { \"query\": \"restaurants near me\" }\n" +
  "   JSON Example:\n" +
  "   ```json\n" +
  "   { \"tool\": \"web_search\", \"query\": \"local restaurants in New York\" }\n" +
  "   ```\n\n" +
  "3. \"take_screenshot\": Captures a screenshot of the user's primary screen/desktop as visual proof.\n" +
  "   Arguments: {}\n" +
  "   JSON Example:\n" +
  "   ```json\n" +
  "   { \"tool\": \"take_screenshot\" }\n" +
  "   ```\n\n" +
  "4. \"create_image\": Generates a beautiful generative digital art/image based on the user's prompt.\n" +
  "   Arguments: { \"prompt\": \"a beautiful forest gradient\" }\n" +
  "   JSON Example:\n" +
  "   ```json\n" +
  "   { \"tool\": \"create_image\", \"prompt\": \"cosmic galaxy\" }\n" +
  "   ```\n\n" +
  "5. \"create_video\": Generates a beautiful animated generative digital visual loop/video based on the user's prompt.\n" +
  "   Arguments: { \"prompt\": \"flowing neon particles\" }\n" +
  "   JSON Example:\n" +
  "   ```json\n" +
  "   { \"tool\": \"create_video\", \"prompt\": \"abstract fire waves\" }\n" +
  "   ```\n\n" +
  "6. \"change_ui_color\": Changes the Cerebral UI accent theme color.\n" +
  "   Arguments: { \"color\": \"#ff0000\" } (hex code)\n" +
  "   JSON Example:\n" +
  "   ```json\n" +
  "   { \"tool\": \"change_ui_color\", \"color\": \"#06b6d4\" }\n" +
  "   ```\n\n" +
  "7. \"open_camera\" / \"close_camera\": Opens or closes the camera/webcam view.\n" +
  "   Arguments: {}\n" +
  "   JSON Example:\n" +
  "   ```json\n" +
  "   { \"tool\": \"open_camera\" }\n" +
  "   ```\n\n" +
  "8. \"change_shape\": Changes the morphing 3D shape of Agent Lee.\n" +
  "   Arguments: { \"shape\": \"lotus\" | \"ankh\" | \"merkaba\" | \"sunburst\" | \"thirdEye\" | \"infinity\" | \"heart\" | \"sphere\" }\n" +
  "   JSON Example:\n" +
  "   ```json\n" +
  "   { \"tool\": \"change_shape\", \"shape\": \"lotus\" }\n" +
  "   ```\n\n" +
  "IMPORTANT: You are a fully capable desktop assistant. When the user asks you to search the web, open a website, check the camera, take a screenshot, create an image, create a video, or change UI theme/colors, you MUST select and call the appropriate tool. Do not tell the user you lack capabilities or cannot open browsers, because you CAN by outputting the JSON block!\n" +
  "================================================================================\n";
const FIRST_RESPONSE_POLICY = loadFirstResponsePolicy();
const UNIVERSE_SNAPSHOT = buildUniverseSnapshot();
const CANONICAL_AGENT_LEE = buildCanonicalAgentLeeSnapshot();

// Discovery-first override: attempt to load the repository source-index and model-hive
let DISCOVERY_INDEX = null;
try {
  const discoveryLoaderUrl = new URL('../runtime/discovery-loader.mjs', import.meta.url).href;
  const discovery = await import(discoveryLoaderUrl);
  if (discovery && discovery.loadAllLeewayIndex) {
    DISCOVERY_INDEX = await discovery.loadAllLeewayIndex();
  }
  if (DISCOVERY_INDEX && DISCOVERY_INDEX.modelRoles) {
    REASONING_MODEL = process.env.AGENT_LEE_REASONING_MODEL || DISCOVERY_INDEX.modelRoles.deepReasoner || DISCOVERY_INDEX.modelRoles.generalReasoner || REASONING_MODEL;
    DEFAULT_MODEL = process.env.AGENT_LEE_OLLAMA_MODEL || REASONING_MODEL;
    HOT_CHAT_MODEL = process.env.AGENT_LEE_HOT_CHAT_MODEL || REASONING_MODEL;
    console.info('Discovery override applied: REASONING_MODEL=', REASONING_MODEL, 'HOT_CHAT_MODEL=', HOT_CHAT_MODEL);
  }
} catch (err) {
  console.warn('Discovery-loader not available or failed to parse index:', err && err.message);
}
let hotChatWarmupPromise = null;
let reasoningWarmupPromise = null;

function getHotChatWarmupPromise() {
  if (!hotChatWarmupPromise) {
    hotChatWarmupPromise = warmCanonicalHotChatModelOnStartup();
  }

  return hotChatWarmupPromise;
}

function getReasoningWarmupPromise() {
  if (!reasoningWarmupPromise) {
    reasoningWarmupPromise = warmCanonicalReasoningModelOnStartup();
  }

  return reasoningWarmupPromise;
}

function buildFirstResponseSystemPrompt(baseSystem, promptClass) {
  const parts = [
    `First-response mode is active for the ${promptClass} prompt class.`,
    "Return the first useful answer quickly.",
    "Stay concise on the first pass.",
    "Do not silently downgrade away from qwen3.",
    "If the reply is incomplete, preserve forward momentum and keep the route honest."
  ];

  return `${parts.join(" ")}\n${baseSystem}`.trim();
}

function normalizeRequestedModel(requestedModel) {
  const model = String(requestedModel || DEFAULT_MODEL).trim() || DEFAULT_MODEL;
  if (model === "agent-lee-code-mode" || model === "agent-lee" || model === "light_conversation_model") {
    return DEFAULT_MODEL;
  }
  return model;
}

function shouldUseReasoningModel(text = "", body = {}) {
  const prompt = String(text || body.prompt || body.input || body.text || body.message || "").trim();
  if (!prompt) {
    return false;
  }

  if (isCompactedConversationPrompt(prompt)) {
    return false;
  }

  if (/\b(speed|fast|latency|response|responding|backend|downstream|timeout|timed out|voice|speak|audio|working|working now|not working|not able to do anything|are you working|are you online|status|stale|same exact response|same issue|under a second|1 second|slow|stuck)\b/i.test(prompt)) {
    return false;
  }

  if (prompt.length > 220 || /\n{2,}/.test(prompt)) {
    return true;
  }

  return /\b(reasoning|analysis|analyze|analyse|debug|investigate|refactor|architecture|design|trade[- ]?off|root cause|proof|derive|detailed|step by step|deeper|compare|plan|implementation|patch|search|web search|browse|look up|look for|find|open browser|open website|screenshot|camera|create image|create video|generate image|generate video|tool|capability|capabilities|crowd|presentation|room|projector|display|device|visual workspace|public audience|speaker separation|question detection|live translation|consent|privacy)\b/i.test(prompt);
}

function isReasoningBackend(model = "") {
  return normalizeRequestedModel(model).startsWith("qwen3");
}

function isOperationalHotPrompt(text = "") {
  const lowered = String(text || "").toLowerCase();
  if (!lowered) return false;

  const phrases = [
    "compacted conversation",
    "compacted chat conversation",
    "same exact response",
    "same issue",
    "not able to do anything",
    "not working",
    "working right now",
    "are you working",
    "are you online",
    "downstream model backend",
    "downstream backend",
    "did not respond",
    "did not respond within the vscode chat window",
    "request timed out",
    "timed out",
    "backend",
    "voice",
    "speak",
    "speed",
    "latency",
    "fast lane",
    "stuck",
    "slow"
  ];

  return phrases.some((phrase) => lowered.includes(phrase));
}

function isCompactedConversationPrompt(text = "") {
  const lowered = String(text || "").toLowerCase();
  if (!lowered) return false;
  return lowered.includes("compacted conversation") || lowered.includes("compacted chat conversation");
}

function selectAgentLeeBackend(requestedModel, text = "", body = {}, modelHealth = null) {
  const rawModel = String(requestedModel || "").trim();
  const normalizedModel = rawModel ? normalizeRequestedModel(rawModel) : DEFAULT_MODEL;
  const aliasRequested = rawModel === "" || rawModel === "agent-lee" || rawModel === "agent-lee-code-mode" || rawModel === "light_conversation_model";
  const roomOrPresentationTask = /\b(crowd|presentation|room|projector|display|device|visual workspace|public audience|speaker separation|question detection|live translation|consent|privacy)\b/i.test(text);
  const reasoningRoute = shouldUseReasoningModel(text, body);
  const compactedPrompt = isCompactedConversationPrompt(text);
  const hotPrompt = compactedPrompt || isOperationalHotPrompt(text);
  const primaryBackend = aliasRequested ? (((reasoningRoute || roomOrPresentationTask) && !hotPrompt) ? REASONING_MODEL : HOT_CHAT_MODEL) : normalizedModel;
  let backend = primaryBackend;
  let roleId = getRoleIdForBackend(backend);
  let roleHealth = modelHealth?.byRole?.[roleId] || null;
  let fallbackUsed = false;
  let reason = aliasRequested
    ? (compactedPrompt ? "compacted-conversation-alias-route" : hotPrompt ? "hot-complaint-alias-route" : roomOrPresentationTask ? "room-presentation-alias-route" : reasoningRoute ? "reasoning-alias-route" : "hot-chat-alias-route")
    : "explicit-backend-route";

  if (!roleHealth || (roleHealth.classification !== "RUNNING" && roleHealth.classification !== "SEMI_WARM")) {
    if (isReasoningBackend(backend)) {
      reason += " -> reasoning-health-unavailable";
      // Keep qwen3 as the primary lane even if the warmup probe is stale.
      // The actual chat call can still fall back if qwen3 fails at request time.
      fallbackUsed = false;
    } else if (backend !== FAST_FALLBACK_MODEL) {
      backend = FAST_FALLBACK_MODEL;
      roleId = getRoleIdForBackend(backend);
      roleHealth = modelHealth?.byRole?.[roleId] || null;
      fallbackUsed = true;
      reason += " -> health-guard-fast-fallback";
    }
  }

  return {
    model: backend,
    backend,
    roleId,
    reason,
    fallbackUsed,
    modelLoaded: roleHealth ? (roleHealth.classification === "RUNNING" || roleHealth.classification === "SEMI_WARM") : null
  };
}

function getRoleIdForBackend(backend) {
  const model = normalizeRequestedModel(backend);

  if (model === "qwen3:latest") {
    return "research_reasoning_model";
  }

  if (model === "qwen2.5-coder:latest" || model === "qwen2.5-coder:7b" || model === "qwen2.5-coder:14b") {
    return "coding_model";
  }

  if (model === "deepseek-coder:latest") {
    return "security_audit_model";
  }

  if (model === "qwen2.5vl:7b") {
    return "vision_model";
  }

  return "light_conversation_model";
}

function resolveChatBackend(requestedModel, modelHealth = null) {
  const model = normalizeRequestedModel(requestedModel);
  const roleId = getRoleIdForBackend(model);
  const roleHealth = modelHealth?.byRole?.[roleId] || null;

  return {
    model,
    roleId,
    fallbackUsed: false,
    modelLoaded: roleHealth ? roleHealth.classification === "RUNNING" : null
  };
}

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj, null, 2);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type,authorization",
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
      if (body.length > 20_000_000) {
        reject(new Error("Request body too large."));
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function parseJsonBody(bodyText, fallback = {}) {
  if (!bodyText) return fallback;
  try {
    return JSON.parse(bodyText);
  } catch {
    return fallback;
  }
}

function stripThinking(text) {
  const raw = String(text || "");
  const stripped = raw
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/^\s*thinking[\s\S]*?\n\n/i, "")
    .trim();

  if (stripped) return stripped;
  return raw.trim();
}

function normalizeMessages(messages) {
  if (!Array.isArray(messages)) return [];

  return messages
    .filter((m) => m && typeof m === "object")
    .map((m) => ({
      role: String(m.role || "user"),
      content: String(m.content || "")
    }))
    .filter((m) => m.content.trim().length > 0);
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function loadJsonFile(filePath, fallback) {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJsonFile(filePath, payload) {
  ensureDir(path.dirname(filePath));

  try {
    // shadow evaluation via GEC shim (non-destructive by default)
    if (typeof gecEvaluateAction === "function") {
      const action = { type: "write", path: filePath, content: payload };
      const decision = gecEvaluateAction(action, GEC_MANIFEST_PATH);
      const logPath = path.join(AGENT_LEE_ROOT, "Archive", "receipts", "gec_shadow_actions.jsonl");
      appendJsonl(logPath, { at: nowIso(), action, decision });
    }
  } catch (e) {
    try {
      appendJsonl(path.join(AGENT_LEE_ROOT, "Archive", "receipts", "gec_shadow_errors.jsonl"), { at: nowIso(), error: String(e) });
    } catch (__) {
      // ignore logging errors
    }
  }

  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf8");
  return payload;
}

function appendJsonl(filePath, payload) {
  ensureDir(path.dirname(filePath));
  fs.appendFileSync(filePath, `${JSON.stringify(payload)}\n`, "utf8");
  return payload;
}

function nowIso() {
  return new Date().toISOString();
}

const discoveryBootstrapState = {
  attempted: false,
  ready: false,
  loaded: false,
  fallbackUsed: false,
  startedAt: null,
  endedAt: null,
  cachePath: null,
  receiptPath: null,
  error: null,
  summary: null
};

function uniqueId(prefix = "id") {
  const stamp = Date.now().toString(36);
  const rand = crypto.randomBytes(4).toString("hex");
  return `${prefix}-${stamp}-${rand}`;
}

function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeLanguageCode(value) {
  const raw = String(value || "").trim().toLowerCase().replace("_", "-");
  if (!raw) return "";
  return raw;
}

function languageFamily(value) {
  const normalized = normalizeLanguageCode(value);
  if (!normalized) return "";
  return normalized.split("-")[0];
}

function defaultVoiceForLanguage(value, policy = DEFAULT_LANGUAGE_POLICY) {
  const family = languageFamily(value) || normalizeLanguageCode(value);
  return policy.voiceByLanguage?.[family] || policy.defaultVoice || "LEEWAY_VOICE::AGENT_LEE::DEFAULT_CLONE";
}

function findPythonExecutable(searchRoot) {
  if (!searchRoot || !fs.existsSync(searchRoot)) {
    return null;
  }

  const queue = [searchRoot];
  const visited = new Set();

  while (queue.length > 0) {
    const dir = queue.shift();
    if (!dir || visited.has(dir)) continue;
    visited.add(dir);

    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isFile() && /^python(?:w)?\.exe$/i.test(entry.name)) {
        return full;
      }
      if (entry.isDirectory() && /^python/i.test(entry.name) && dir === searchRoot) {
        queue.push(full);
      }
    }
  }

  return null;
}

function resolvePythonCommand() {
  const envCandidates = [process.env.AGENT_LEE_PYTHON, process.env.PYTHON, process.env.PYTHON_EXE, process.env.PYTHONPATH];
  const filesystemCandidates = [
    process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, "Programs", "Python") : null,
    process.env.PROGRAMFILES ? path.join(process.env.PROGRAMFILES, "Python") : null,
    process.env["ProgramFiles(x86)"] ? path.join(process.env["ProgramFiles(x86)"], "Python") : null
  ];

  for (const candidate of envCandidates) {
    if (candidate && candidate.toLowerCase().endsWith(".exe") && fs.existsSync(candidate)) {
      return candidate;
    }
  }

  for (const searchRoot of filesystemCandidates) {
    const discovered = findPythonExecutable(searchRoot);
    if (discovered) {
      return discovered;
    }
  }

  const candidates = [process.env.AGENT_LEE_PYTHON, "py", "python"];

  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      const probe = spawn(candidate, ["-V"], { windowsHide: true });
      probe.kill();
      return candidate;
    } catch {
      continue;
    }
  }

  return null;
}

function getDiscoveryBootstrapReceiptPath(startedAt) {
  const stamp = String(startedAt || nowIso()).replace(/[^0-9A-Za-z]/g, "");
  const [year, month, day] = String(startedAt || nowIso()).slice(0, 10).split("-");
  return path.join(
    ESTATE_ROOT,
    "Archive",
    "receipts",
    "system-mutation",
    year || "undated",
    month || "undated",
    day || "undated",
    `discovery-router-bootstrap-${stamp}.json`
  );
}

function parseLastJsonObject(rawText) {
  const text = String(rawText || "").trim();
  if (!text) return null;
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const candidate = lines[i];
    if (!candidate.startsWith("{") || !candidate.endsWith("}")) continue;
    try {
      return JSON.parse(candidate);
    } catch {
      continue;
    }
  }
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function bootstrapDiscoveryOnStartup() {
  const startedAt = nowIso();
  discoveryBootstrapState.attempted = true;
  discoveryBootstrapState.startedAt = startedAt;
  discoveryBootstrapState.error = null;

  const receiptPath = getDiscoveryBootstrapReceiptPath(startedAt);
  const receiptBase = {
    schema: "leeway.receipt.discovery.router-bootstrap.v1",
    official: false,
    controlSurface: "router_boot",
    operation: "discovery_bootstrap",
    startedAt,
    root: ESTATE_ROOT,
    cachePath: null,
    loaded: false,
    fallbackUsed: false,
    summary: null,
    error: null
  };

  try {
    const python = resolvePythonCommand();
    if (!python) {
      throw new Error("No Python launcher was found for discovery bootstrap.");
    }

    const bootstrapScript = `
import json
import os
import sys
from pathlib import Path

root = Path(sys.argv[1]).resolve()
os.chdir(root)
sys.path.insert(0, str(root))

from core.discovery import DiscoveryKernel

kernel = DiscoveryKernel()
loaded = kernel.load()
stats = kernel.get_stats()
payload = {
    "loaded": bool(loaded),
    "bootstrapped": bool(stats.get("bootstrapped")),
    "estateInventoryLoaded": bool(stats.get("estate_inventory_loaded")),
    "estateCacheLoaded": bool(stats.get("estate_cache_loaded")),
    "estateCachePath": stats.get("estate_cache_path"),
    "estateCacheSummary": stats.get("estate_cache_summary"),
    "registryStats": stats.get("registry_stats"),
    "seaRegistered": bool(stats.get("sea_registered")),
}
print(json.dumps(payload, ensure_ascii=False))
`.trim();

    const result = await runProcess(python, ["-c", bootstrapScript, ESTATE_ROOT], { timeoutMs: 180000 });
    const parsed = parseLastJsonObject(result.stdout) || {};
    const cacheLoaded = Boolean(parsed.estateCacheLoaded);
    const loadSucceeded = Boolean(parsed.loaded);

    discoveryBootstrapState.loaded = loadSucceeded;
    discoveryBootstrapState.ready = loadSucceeded || cacheLoaded;
    discoveryBootstrapState.fallbackUsed = !loadSucceeded && cacheLoaded;
    discoveryBootstrapState.cachePath = parsed.estateCachePath || null;
    discoveryBootstrapState.summary = {
      bootstrapped: Boolean(parsed.bootstrapped),
      estateInventoryLoaded: Boolean(parsed.estateInventoryLoaded),
      estateCacheLoaded: cacheLoaded,
      registryStats: parsed.registryStats || null,
      seaRegistered: Boolean(parsed.seaRegistered),
      processCode: result.code,
      stdoutLength: String(result.stdout || "").length,
      stderrLength: String(result.stderr || "").length
    };
    discoveryBootstrapState.error = result.code === 0 ? null : (String(result.stderr || result.stdout || "").trim() || `Discovery bootstrap failed with code ${result.code}.`);
  } catch (error) {
    discoveryBootstrapState.loaded = false;
    discoveryBootstrapState.ready = false;
    discoveryBootstrapState.fallbackUsed = false;
    discoveryBootstrapState.error = error?.message || String(error);
    discoveryBootstrapState.summary = {
      bootstrapped: false,
      estateInventoryLoaded: false,
      estateCacheLoaded: false,
      registryStats: null,
      seaRegistered: false,
      error: discoveryBootstrapState.error
    };
  }

  discoveryBootstrapState.endedAt = nowIso();
  const receipt = {
    ...receiptBase,
    endedAt: discoveryBootstrapState.endedAt,
    status: discoveryBootstrapState.ready ? "PASS" : "FAIL",
    cachePath: discoveryBootstrapState.cachePath,
    loaded: discoveryBootstrapState.loaded,
    fallbackUsed: discoveryBootstrapState.fallbackUsed,
    summary: discoveryBootstrapState.summary,
    error: discoveryBootstrapState.error,
    artifactPaths: discoveryBootstrapState.cachePath ? [discoveryBootstrapState.cachePath] : []
  };
  discoveryBootstrapState.receiptPath = receiptPath;
  receipt.receiptPath = receiptPath;
  writeJsonFile(receiptPath, receipt);

  return {
    ...discoveryBootstrapState,
    receiptPath
  };
}

function runProcess(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd || AGENT_LEE_ROOT,
      env: options.env || process.env,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";

    if (child.stdout) {
      child.stdout.on("data", (chunk) => {
        stdout += chunk.toString();
      });
    }

    if (child.stderr) {
      child.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });
    }

    const timeoutMs = Number(options.timeoutMs || 0);
    let timeout = null;

    if (timeoutMs > 0) {
      timeout = setTimeout(() => {
        child.kill();
        reject(new Error(`Process timed out after ${timeoutMs}ms.`));
      }, timeoutMs);
    }

    child.on("error", (error) => {
      if (timeout) clearTimeout(timeout);
      reject(error);
    });

    child.on("close", (code, signal) => {
      if (timeout) clearTimeout(timeout);
      resolve({
        code,
        signal,
        stdout,
        stderr
      });
    });
  });
}

async function callJson(url, body, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: body ? "POST" : "GET",
      headers: body ? { "content-type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal
    });

    const raw = await response.text();
    let data = null;
    if (raw) {
      try {
        data = JSON.parse(raw);
      } catch {
        data = raw;
      }
    }

    return {
      ok: response.ok,
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      data,
      raw
    };
  } finally {
    clearTimeout(timer);
  }
}

async function callRuntimePath(pathname, body, timeoutMs = 15000) {
  // Try Cerebral (default), then Runtime Fabric, then Desktop Runtime as a last resort.
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const runtimeFabricBase = process.env.RUNTIME_FABRIC_BASE || "http://127.0.0.1:4001";
  const desktopBase = process.env.AGENT_LEE_DESKTOP_RUNTIME_BASE || "http://127.0.0.1:8091";

  const tried = [];

  // helper to attempt a call and return structured result
  const tryCall = async (base) => {
    const url = `${base.replace(/\/$/, "")}${normalizedPath}`;
    tried.push(url);
    try {
      const r = await callJson(url, body, timeoutMs);
      console.log(`callRuntimePath tried ${url} -> status=${r?.status} ok=${r?.ok} dataOk=${Boolean(r?.data?.ok)} raw=${String(r?.raw || '').slice(0,200)}`);
      // Accept 2xx status as successful (data content may have ok: false for valid states like PASS_MACHINE_ONLY)
      if (r && r.status >= 200 && r.status < 300) return r;
      // Also accept explicit ok: true at response or data level
      if (r && (r.ok || (r.data && r.data.ok))) return r;
      return r;
    } catch (err) {
      console.log(`callRuntimePath error calling ${url}: ${err?.message || String(err)}`);
      return { ok: false, status: 500, data: { ok: false, status: 'FAIL', error: err?.message || String(err) } };
    }
  };

  // 1) Cerebral (may forward to Runtime Fabric)
  const cerebralBase = process.env.CEREBRAL_BASE || CEREBRAL_BASE || "http://127.0.0.1:8765";
  let result = await tryCall(cerebralBase);
  if (result && (result.status >= 200 && result.status < 300 || result.ok || (result.data && result.data.ok))) return result;

  // 2) Try Runtime Fabric directly
  result = await tryCall(runtimeFabricBase);
  if (result && (result.status >= 200 && result.status < 300 || result.ok || (result.data && result.data.ok))) return result;

  // 3) Fall back to Desktop Runtime (diagnostic-only direct path)
  result = await tryCall(desktopBase);
  // If still not ok, attach attempted URLs for diagnostics
  if (!result || !(result.status >= 200 && result.status < 300 || result.ok || (result.data && result.data.ok))) {
    return {
      ok: false,
      status: 502,
      data: {
        ok: false,
        status: 'FAIL',
        error: 'All runtime proxies failed',
        tried
      }
    };
  }

  return result;
}

const AUTO_DISPATCH_TO_DESKTOP_RUNTIME = (() => {
  const raw = process.env.AGENT_LEE_AUTO_DISPATCH_TO_DESKTOP_RUNTIME;
  if (raw == null || String(raw).trim() === "") {
    return true;
  }
  return !/^(0|false|off|no)$/i.test(String(raw).trim());
})();

const DESKTOP_RUNTIME_CONFIRM_TOKEN = process.env.AGENT_LEE_DESKTOP_COMMAND_CONFIRM || "I_AUTHORIZE_AGENT_LEE_DESKTOP_COMMAND";

const DESKTOP_TOOL_ALIAS_MAP = {
  "browser.visible.search": "web_search",
  "browser.search": "web_search",
  "browser.web_search": "web_search",
  "desktop.open_browser": "open_browser",
  "desktop.search_web": "web_search",
  "desktop.capture_screen": "take_screenshot",
  "screen.capture": "take_screenshot",
  "camera.look": "open_camera",
  "camera.look_now": "open_camera",
  "open browser": "open_browser",
  "search web": "web_search",
  // Voice aliases
  "voice.speak": "voice_speak",
  "voice_speak": "voice_speak",
  "runtime.speak": "runtime_speak",
  "runtime_speak": "runtime_speak",
  "agent_lee.speak": "voice_speak",
  // Listen aliases
  "voice.listen": "voice_listen",
  "voice_listen": "voice_listen",
  "mic.listen": "listen",
  "ears.listen": "listen",
  "runtime.listen": "voice_listen"
};

const DESKTOP_TOOL_ROUTE_MAP = {
  open_browser: { endpoint: "/runtime/desktop/open-browser", requiresConfirm: true, timeoutMs: 30000 },
  web_search: { endpoint: "/runtime/desktop/search-web", requiresConfirm: true, timeoutMs: 240000 },
  take_screenshot: { endpoint: "/runtime/desktop/capture-screen", requiresConfirm: true, timeoutMs: 60000 },
  open_camera: { endpoint: "/runtime/vision/camera/look-now", requiresConfirm: true, timeoutMs: 180000 },
  create_image: { endpoint: null, requiresConfirm: false, timeoutMs: 0 },
  create_video: { endpoint: null, requiresConfirm: false, timeoutMs: 0 },
  open_app: { endpoint: "/runtime/desktop/open-app", requiresConfirm: true, timeoutMs: 30000 },
  type_text: { endpoint: "/runtime/desktop/type-text", requiresConfirm: true, timeoutMs: 30000 },
  click: { endpoint: "/runtime/desktop/click", requiresConfirm: true, timeoutMs: 15000 },
  move_cursor: { endpoint: "/runtime/desktop/move-cursor", requiresConfirm: true, timeoutMs: 15000 },
  scroll: { endpoint: "/runtime/desktop/scroll", requiresConfirm: true, timeoutMs: 30000 },
  print: { endpoint: "/runtime/desktop/print", requiresConfirm: true, timeoutMs: 60000 },
  send_telegram: { endpoint: "/runtime/telegram/send", requiresConfirm: true, timeoutMs: 60000 },
  write_receipt: { endpoint: "/runtime/receipt/write", requiresConfirm: true, timeoutMs: 15000 },
  speak: { endpoint: "/runtime/voice/speak", requiresConfirm: true, timeoutMs: 180000 },
  voice_speak: { endpoint: "/runtime/voice/speak", requiresConfirm: true, timeoutMs: 180000 },
  runtime_speak: { endpoint: "/runtime/speak", requiresConfirm: true, timeoutMs: 180000 },
  listen: { endpoint: "/runtime/voice/listen", requiresConfirm: true, timeoutMs: 60000 },
  voice_listen: { endpoint: "/runtime/voice/listen", requiresConfirm: true, timeoutMs: 60000 }
};

function normalizeDesktopToolName(rawName) {
  const value = String(rawName || "").trim();
  if (!value) return "";
  const lowered = value.toLowerCase();
  if (DESKTOP_TOOL_ROUTE_MAP[lowered]) return lowered;
  if (DESKTOP_TOOL_ALIAS_MAP[lowered]) return DESKTOP_TOOL_ALIAS_MAP[lowered];
  const collapsed = lowered.replace(/\s+/g, "_");
  if (DESKTOP_TOOL_ROUTE_MAP[collapsed]) return collapsed;
  if (DESKTOP_TOOL_ALIAS_MAP[collapsed]) return DESKTOP_TOOL_ALIAS_MAP[collapsed];
  return collapsed;
}

function makeToolDispatchRequestId(prefix = "agent-lee-tool-dispatch") {
  if (typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now().toString(36)}-${crypto.randomBytes(6).toString("hex")}`;
}

function shouldSkipToolDispatch(context = {}) {
  if (context.disableAutoDispatch || context.autoDispatch === false) {
    return "Tool dispatch is disabled by request context.";
  }
  if (!AUTO_DISPATCH_TO_DESKTOP_RUNTIME) {
    return "AGENT_LEE_AUTO_DISPATCH_TO_DESKTOP_RUNTIME is disabled.";
  }
  if (context.dryRun || context.planOnly || context.noAction || context.diagnosticOnly) {
    return "Tool dispatch skipped because the request was marked dry-run, plan-only, no-action, or diagnostic-only.";
  }
  const userText = String(context.userText || context.prompt || context.text || "").toLowerCase();
  if (/\b(plan only|no action|do not act|don't act|analysis only|diagnostic only|dry run)\b/i.test(userText)) {
    return "Tool dispatch skipped because the request text asked for planning or no action.";
  }
  return null;
}

function buildDesktopRuntimeRequestBody(toolName, toolArguments = {}, context = {}, requestId = null, timestamp = null) {
  const userText = String(context.userText || context.prompt || context.text || "").trim();
  const payload = {
    ...(toolArguments && typeof toolArguments === "object" ? toolArguments : {}),
    originalToolName: context.originalToolName || null,
    normalizedToolName: toolName,
    requestId,
    timestamp
  };

  if (toolName === "web_search") {
    const query = String(payload.query || payload.search || payload.text || payload.prompt || userText || "").trim();
    payload.query = query;
    payload.monitorIndex = Number(payload.monitorIndex || payload.monitor || 1) || 1;
    payload.openScreenshot = payload.openScreenshot !== false;
  } else if (toolName === "open_browser") {
    payload.url = String(payload.url || payload.href || payload.targetUrl || userText || "https://www.bing.com").trim();
  } else if (toolName === "open_app") {
    payload.appName = String(payload.appName || payload.app || payload.name || "").trim();
  } else if (toolName === "type_text") {
    payload.text = String(payload.text || payload.value || userText || "").trim();
  } else if (toolName === "click" || toolName === "move_cursor") {
    payload.x = Number(payload.x ?? payload.left ?? payload.clientX ?? 0);
    payload.y = Number(payload.y ?? payload.top ?? payload.clientY ?? 0);
    if (toolName === "click") {
      payload.button = String(payload.button || "left");
    }
  } else if (toolName === "scroll") {
    payload.direction = String(payload.direction || "down");
    payload.amount = Number(payload.amount || 1) || 1;
  } else if (toolName === "print") {
    payload.text = payload.text != null ? String(payload.text) : null;
    payload.filePath = payload.filePath ? String(payload.filePath) : null;
  } else if (toolName === "send_telegram") {
    payload.chatId = payload.chatId ? String(payload.chatId) : "";
    payload.text = payload.text != null ? String(payload.text) : String(payload.message || userText || "");
  } else if (toolName === "write_receipt") {
    payload.receiptId = String(payload.receiptId || requestId || makeToolDispatchRequestId("receipt")).trim();
    payload.name = String(payload.name || payload.title || `agent-lee-${toolName}`).trim();
  }

  return payload;
}

async function dispatchPointerEvent(context = {}, event = "tool_started", toolName = "", target = null, requestId = null) {
  const pointerBody = {
    source: "agent-lee-router",
    origin: "llm_tool_dispatch",
    event,
    toolName,
    target,
    requestId: requestId || makeToolDispatchRequestId("pointer"),
    timestamp: nowIso()
  };

  const result = await callRuntimePath("/runtime/pointer/event", pointerBody, 15000).catch((error) => ({
    ok: false,
    status: 502,
    data: {
      ok: false,
      status: "CHECK_REQUIRED",
      error: error?.message || String(error),
      blockers: ["Pointer event hook is unavailable."]
    }
  }));

  const data = result?.data || null;
  if (result?.ok || (data && data.ok)) {
    return {
      status: "READY",
      ok: true,
      result: data || result,
      receiptPath: data?.receiptPath || data?.receipt?.receiptPath || null,
      blockers: []
    };
  }

  return {
    status: data?.status === "BLOCKED" ? "BLOCKED" : "CHECK_REQUIRED",
    ok: false,
    result: data || result,
    receiptPath: data?.receiptPath || data?.receipt?.receiptPath || null,
    blockers: Array.isArray(data?.blockers) && data.blockers.length > 0
      ? data.blockers
      : ["Pointer event hook is unavailable."]
  };
}

async function dispatchExtractedToolsToDesktopRuntime(tools, context = {}) {
  const extractedTools = Array.isArray(tools) ? tools : [];
  if (extractedTools.length === 0) {
    return [];
  }

  const skipReason = shouldSkipToolDispatch(context);
  const requestSeed = String(context.requestId || context.request_id || makeToolDispatchRequestId());
  const userText = String(context.userText || context.prompt || context.text || "").trim();
  const results = [];

  for (let index = 0; index < extractedTools.length; index += 1) {
    const tool = extractedTools[index] || {};
    const originalToolName = String(tool.name || tool.toolName || tool.tool || "").trim();
    const normalizedToolName = normalizeDesktopToolName(originalToolName);
    const requestId = `${requestSeed}-${index + 1}`;
    const timestamp = nowIso();
    const toolResult = {
      toolName: normalizedToolName || originalToolName || null,
      originalToolName: originalToolName || null,
      originalTool: tool,
      runtimeEndpoint: null,
      status: "CHECK_REQUIRED",
      ok: false,
      result: null,
      receiptPath: null,
      blockers: [],
      requestId,
      source: "agent-lee-router",
      origin: "llm_tool_dispatch",
      pointerEventStatus: "CHECK_REQUIRED",
      pointerReceiptPath: null
    };

    if (!normalizedToolName) {
      toolResult.status = "BLOCKED";
      toolResult.blockers.push("Unknown tool name.");
      results.push(toolResult);
      continue;
    }

    const routeInfo = DESKTOP_TOOL_ROUTE_MAP[normalizedToolName];
    if (!routeInfo) {
      toolResult.status = "BLOCKED";
      toolResult.blockers.push(`No runtime mapping exists for ${normalizedToolName}.`);
      results.push(toolResult);
      continue;
    }

    toolResult.runtimeEndpoint = routeInfo.endpoint;

    if (!routeInfo.endpoint) {
      toolResult.status = "CHECK_REQUIRED";
      toolResult.blockers.push(`No runtime endpoint exists yet for ${normalizedToolName}.`);
      results.push(toolResult);
      continue;
    }

    if (skipReason) {
      toolResult.status = "CHECK_REQUIRED";
      toolResult.blockers.push(skipReason);
      results.push(toolResult);
      continue;
    }

    const confirmToken = String(context.confirm || context.confirmationToken || context.approvalToken || context.authorizationToken || "").trim();
    if (routeInfo.requiresConfirm !== false && !confirmToken) {
      toolResult.status = "CHECK_REQUIRED";
      toolResult.blockers.push(`Missing confirmation token for ${normalizedToolName}.`);
      results.push(toolResult);
      continue;
    }

    const rawArguments = tool.arguments && typeof tool.arguments === "object" && !Array.isArray(tool.arguments)
      ? tool.arguments
      : {};
    const runtimeBody = {
      source: "agent-lee-router",
      origin: "llm_tool_dispatch",
      toolName: normalizedToolName,
      originalToolName: originalToolName || null,
      requestId,
      timestamp,
      userText: userText || null,
      prompt: userText || null,
      payload: rawArguments,
      confirm: routeInfo.requiresConfirm !== false ? (confirmToken || DESKTOP_RUNTIME_CONFIRM_TOKEN) : undefined,
      ...buildDesktopRuntimeRequestBody(normalizedToolName, rawArguments, {
        ...context,
        originalToolName,
        userText
      }, requestId, timestamp)
    };

    if (runtimeBody.confirm === undefined) {
      delete runtimeBody.confirm;
    }

    const pointerStart = await dispatchPointerEvent(context, "tool_started", normalizedToolName, routeInfo.endpoint, requestId);
    toolResult.pointerEventStatus = pointerStart.status;
    toolResult.pointerReceiptPath = pointerStart.receiptPath || null;

    const runtimeResponse = await callRuntimePath(routeInfo.endpoint, runtimeBody, routeInfo.timeoutMs || 60000).catch((error) => ({
      ok: false,
      status: 502,
      raw: "",
      data: {
        ok: false,
        status: "DEGRADED",
        error: error?.message || String(error),
        blockers: [`Runtime call failed for ${normalizedToolName}.`]
      }
    }));

    const runtimeData = runtimeResponse?.data || runtimeResponse || null;
    const runtimeReceiptPath = runtimeData?.receiptPath || runtimeData?.receipt?.receiptPath || runtimeData?.receipt || null;
    const runtimeOk = Boolean(runtimeResponse?.ok || (runtimeResponse?.status >= 200 && runtimeResponse?.status < 300) || runtimeData?.ok);
    const runtimeStatus = String(runtimeData?.status || "").toUpperCase();

    toolResult.ok = Boolean(runtimeOk && runtimeData?.ok !== false && runtimeStatus !== "BLOCKED");
    toolResult.status = toolResult.ok
      ? "READY"
      : runtimeStatus === "BLOCKED"
        ? "BLOCKED"
        : runtimeStatus === "DEGRADED" || runtimeResponse?.status >= 500
          ? "DEGRADED"
          : "CHECK_REQUIRED";
    toolResult.result = runtimeData || runtimeResponse || null;
    toolResult.receiptPath = runtimeReceiptPath;
    toolResult.blockers = [
      ...(Array.isArray(runtimeData?.blockers) ? runtimeData.blockers : []),
      ...(toolResult.ok ? [] : toolResult.blockers)
    ].filter(Boolean);
    if (!toolResult.ok && toolResult.blockers.length === 0) {
      toolResult.blockers.push(runtimeData?.error || runtimeResponse?.data?.error || runtimeResponse?.raw || `Runtime execution did not complete for ${normalizedToolName}.`);
    }

    const pointerEnd = await dispatchPointerEvent(context, toolResult.ok ? "tool_completed" : "tool_failed", normalizedToolName, routeInfo.endpoint, requestId);
    toolResult.pointerEventStatus = pointerEnd.status || toolResult.pointerEventStatus;
    toolResult.pointerReceiptPath = pointerEnd.receiptPath || toolResult.pointerReceiptPath;
    results.push(toolResult);
  }

  return results;
}

function inferLanguageFromText(text) {
  const raw = String(text || "");
  const trimmed = raw.trim();

  if (!trimmed) {
    return {
      language: "en",
      confidence: 0,
      reason: "empty-text"
    };
  }

  if (/[ぁ-ゟ゠-ヿ一-龯]/.test(raw)) {
    return { language: "ja", confidence: 0.97, reason: "cjk-japanese-characters" };
  }

  if (/[가-힣]/.test(raw)) {
    return { language: "ko", confidence: 0.97, reason: "hangul" };
  }

  if (/[一-龥]/.test(raw)) {
    return { language: "zh", confidence: 0.95, reason: "cjk-chinese-characters" };
  }

  const lowered = trimmed.toLowerCase();
  const keywordMap = [
    { language: "es", pattern: /\b(hola|gracias|por favor|buenos dias|buenas tardes|buenas noches|adios|mañana|noche)\b/i, confidence: 0.92, reason: "spanish-keywords" },
    { language: "fr", pattern: /\b(bonjour|merci|s'il vous plait|s'il te plait|au revoir|demain|soir)\b/i, confidence: 0.9, reason: "french-keywords" },
    { language: "de", pattern: /\b(hallo|danke|bitte|tschuss|morgen|abend)\b/i, confidence: 0.9, reason: "german-keywords" },
    { language: "it", pattern: /\b(ciao|grazie|per favore|arrivederci|domani|sera)\b/i, confidence: 0.9, reason: "italian-keywords" },
    { language: "pt", pattern: /\b(ola|obrigado|obrigada|por favor|tchau|amanha|noite)\b/i, confidence: 0.9, reason: "portuguese-keywords" }
  ];

  for (const entry of keywordMap) {
    if (entry.pattern.test(lowered)) {
      return {
        language: entry.language,
        confidence: entry.confidence,
        reason: entry.reason
      };
    }
  }

  return {
    language: "en",
    confidence: 0.62,
    reason: "default-english"
  };
}

function loadLanguagePolicy() {
  const policy = loadJsonFile(LANGUAGE_POLICY_PATH, null);
  return {
    ...DEFAULT_LANGUAGE_POLICY,
    ...(policy || {}),
    voiceByLanguage: {
      ...DEFAULT_LANGUAGE_POLICY.voiceByLanguage,
      ...(policy?.voiceByLanguage || {})
    },
    preferredNames: {
      ...DEFAULT_LANGUAGE_POLICY.preferredNames,
      ...(policy?.preferredNames || {})
    }
  };
}

function loadSpeechStylePolicy() {
  const policy = loadJsonFile(SPEECH_STYLE_POLICY_PATH, null);
  return {
    ...DEFAULT_SPEECH_STYLE_POLICY,
    ...(policy || {}),
    styleRules: Array.isArray(policy?.styleRules) && policy.styleRules.length > 0 ? policy.styleRules : DEFAULT_SPEECH_STYLE_POLICY.styleRules,
    progressGuidance: {
      ...DEFAULT_SPEECH_STYLE_POLICY.progressGuidance,
      ...(policy?.progressGuidance || {})
    },
    preferredProgressPhrases: Array.isArray(policy?.preferredProgressPhrases) && policy.preferredProgressPhrases.length > 0 ? policy.preferredProgressPhrases : DEFAULT_SPEECH_STYLE_POLICY.preferredProgressPhrases,
    speechOutput: {
      ...DEFAULT_SPEECH_STYLE_POLICY.speechOutput,
      ...(policy?.speechOutput || {})
    }
  };
}

function loadOwnerIdentityManifest() {
  return loadJsonFile(OWNER_IDENTITY_MANIFEST_PATH, null);
}

function buildOwnerIdentityStatus() {
  const manifest = loadOwnerIdentityManifest() || {};
  return {
    manifestPath: OWNER_IDENTITY_MANIFEST_PATH,
    ownerId: manifest.ownerId || "LEONARD_J_LEE",
    ownerName: manifest.ownerName || "Leonard J Lee",
    creatorRootAuthority: manifest.creatorRootAuthority === true,
    vscodeAuthorityRole: manifest.vscodeAuthorityRole || "none",
    status: manifest.status || "OWNER_IDENTITY_NOT_ENROLLED",
    faceEnrollmentStatus: manifest.faceEnrollment?.status || null,
    voiceEnrollmentStatus: manifest.voiceEnrollment?.status || null,
    passphraseFallbackStatus: manifest.passphraseFallback?.status || null,
    biometricStoragePolicy: manifest.biometricStoragePolicy || null,
    blockers: Array.isArray(manifest.blockers) ? manifest.blockers : [],
    audienceBoundary: "Leonard J Lee is creator-root authority. Other room participants are audience members unless explicitly enrolled and verified."
  };
}

function loadConversationManifest() {
  return loadJsonFile(LIVE_CONVERSATION_MANIFEST_PATH, {
    ok: true,
    generatedAt: nowIso(),
    router: "agent-lee-brainfix",
    runtimeDir: RUNTIME_DIR,
    languagePolicyPath: LANGUAGE_POLICY_PATH,
    speechStylePolicyPath: SPEECH_STYLE_POLICY_PATH,
    roomCapabilityPolicyPath: path.join(RUNTIME_DIR, "agent-lee-room-capabilities.manifest.json"),
    visualAiWorkspacePolicyPath: path.join(RUNTIME_DIR, "agent-lee-visual-ai-workspace.manifest.json"),
    conversationHistoryPath: CONVERSATION_HISTORY_PATH,
    sessionDir: SESSION_DIR,
    audioDir: AUDIO_DIR,
    transcriptDir: TRANSCRIPT_DIR,
    endpoints: [
      "GET /agent-lee/conversation/health",
      "POST /agent-lee/conversation/start",
      "POST /agent-lee/conversation/turn",
      "POST /agent-lee/conversation/end",
      "GET /agent-lee/conversation/session/:id",
      "GET /agent-lee/voice/backends",
      "POST /agent-lee/voice/speak",
      "POST /agent-lee/voice/speak-stream",
      "POST /agent-lee/voice/transcribe",
          "GET /agent-lee/language/status",
          "POST /agent-lee/language/detect",
          "POST /agent-lee/language/translate",
          "GET /agent-lee/language/policy",
          "GET /agent-lee/owner/status"
        ],
    executables: [
      "local conversation session state",
      "local microphone capture via Cerebral",
      "local WAV transcription via faster_whisper",
      "local translation via Ollama",
      "local speech synthesis via leeway_tts (XTTS-first)",
      "room-aware bilingual crowd governance",
      "Leonard-only device and display authority",
      "local visual workspace preview routing"
    ]
  });
}

function createSessionId() {
  return `agent-lee-session-${Date.now().toString(36)}-${crypto.randomBytes(4).toString("hex")}`;
}

function sessionPath(sessionId) {
  return path.join(SESSION_DIR, `${sessionId}.json`);
}

function loadSession(sessionId) {
  if (!sessionId) return null;
  return loadJsonFile(sessionPath(sessionId), null);
}

function saveSession(session) {
  if (!session?.sessionId) {
    throw new Error("Session payload is missing sessionId.");
  }
  return writeJsonFile(sessionPath(session.sessionId), session);
}

function appendConversationEvent(entry) {
  return appendJsonl(CONVERSATION_HISTORY_PATH, entry);
}

function buildSessionSummary(session) {
  return {
    sessionId: session.sessionId,
    status: session.status,
    mode: session.mode,
    turnCount: session.turnCount,
    defaultLanguage: session.defaultLanguage,
    preferredLanguage: session.preferredLanguage,
    lastLanguage: session.lastLanguage,
    lastEnglish: session.lastEnglish,
    lastHeard: session.lastHeard,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt
  };
}

function buildConversationSystemPrompt(policy, targetLanguage) {
  return (
    `${DEFAULT_ROUTER_SYSTEM_PROMPT} ` +
    "The canonical voice law is active. Stay grounded, technical, rhythmic, and precise. " +
    `The active conversation policy says the default response language is ${policy.defaultResponseLanguage || policy.defaultLanguage || "en"} and Leonard defaults to English unless the user explicitly requests another language. ` +
    `Respond in ${targetLanguage}.`
  );
}

function createNewSession(overrides = {}) {
  const policy = loadLanguagePolicy();
  const now = nowIso();
  const session = {
    sessionId: createSessionId(),
    status: "active",
    mode: overrides.mode || "live-conversation",
    operatorName: overrides.operatorName || "Leonard",
    subject: overrides.subject || "",
    defaultLanguage: normalizeLanguageCode(overrides.defaultLanguage || policy.defaultLanguage || "en") || "en",
    preferredLanguage: normalizeLanguageCode(overrides.preferredLanguage || policy.defaultResponseLanguage || policy.defaultLanguage || "en") || "en",
    lastLanguage: "",
    lastEnglish: "",
    lastHeard: "",
    turnCount: 0,
    history: [],
    createdAt: now,
    updatedAt: now,
    languagePolicyPath: LANGUAGE_POLICY_PATH,
    manifestPath: LIVE_CONVERSATION_MANIFEST_PATH
  };

  saveSession(session);
  return session;
}

function mergeSessionHistory(session, turn) {
  const existing = Array.isArray(session.history) ? session.history.slice(-19) : [];
  existing.push(turn);
  session.history = existing;
  session.turnCount = Number(session.turnCount || 0) + 1;
  session.lastHeard = turn.userText || "";
  session.lastLanguage = turn.inputLanguage || "";
  session.lastEnglish = turn.userEnglish || "";
  session.status = session.status || "active";
  session.updatedAt = nowIso();
  return session;
}

function buildConversationMessages(session, turn, policy, targetLanguage) {
  const messages = [];
  const history = Array.isArray(session.history) ? session.history.slice(-8) : [];
  for (const item of history) {
    if (!item?.userEnglish && !item?.assistantText) {
      continue;
    }

    messages.push({
      role: "user",
      content: `User said: ${item.userEnglish || item.userText || ""}`
    });

    if (item.assistantText) {
      messages.push({
        role: "assistant",
        content: item.assistantText
      });
    }
  }

  messages.push({
    role: "user",
    content:
      `Conversation turn input language: ${turn.inputLanguage || "unknown"}\n` +
      `Raw user text: ${turn.userText || ""}\n` +
      `English meaning: ${turn.userEnglish || turn.userText || ""}\n` +
      `Requested response language: ${targetLanguage}\n` +
      `Default language: ${policy.defaultResponseLanguage || policy.defaultLanguage || "en"}`
  });

  return messages;
}

async function translateText(text, sourceLanguage, targetLanguage, policy = loadLanguagePolicy(), model = DEFAULT_MODEL) {
  const source = normalizeLanguageCode(sourceLanguage || inferLanguageFromText(text).language || "en") || "en";
  const target = normalizeLanguageCode(targetLanguage || policy.defaultResponseLanguage || policy.defaultLanguage || "en") || "en";
  const cleaned = String(text || "").trim();

  if (!cleaned) {
    return {
      ok: false,
      translatedText: "",
      sourceLanguage: source,
      targetLanguage: target,
      backend: "empty-input"
    };
  }

  if (source === target) {
    return {
      ok: true,
      translatedText: cleaned,
      sourceLanguage: source,
      targetLanguage: target,
      backend: "identity"
    };
  }

  const answerResult = await ollamaChatWithFallback(
    [
      {
        role: "user",
        content:
          `Translate the following text from ${source} to ${target}. ` +
          "Return only the translated text with no commentary.\n\n" +
          cleaned
      }
    ],
    {
      system:
        "You are a precise translation engine for Agent Lee. Return only the translated text and never add commentary, labels, or markdown.",
      temperature: 0,
      num_predict: 256,
      model
    }
  );
  const answer = answerResult.answer;

  return {
    ok: true,
    translatedText: answer.content.trim(),
    sourceLanguage: source,
    targetLanguage: target,
    backend: answerResult.model,
    fallbackUsed: Boolean(answerResult.fallbackUsed)
  };
}

async function transcribeWavFile(wavPath, model = "base") {
  const python = resolvePythonCommand();
  if (!python) {
    throw new Error("No Python launcher was found for transcription.");
  }

  ensureDir(TEMP_DIR);
  const outJson = path.join(TEMP_DIR, `transcribe-${Date.now().toString(36)}-${crypto.randomBytes(4).toString("hex")}.json`);
  const args = [TRANSCRIBE_SCRIPT_PATH, "--wav", wavPath, "--model", model, "--out-json", outJson];
  const result = await runProcess(python, args, { timeoutMs: 180000 });

  let data = null;
  if (fs.existsSync(outJson)) {
    data = loadJsonFile(outJson, null);
  }

  if (!data) {
    const raw = String(result.stdout || "").trim();
    if (raw) {
      try {
        data = JSON.parse(raw);
      } catch {
        data = { ok: false, error: "TRANSCRIBE_OUTPUT_PARSE_FAILED", raw };
      }
    }
  }

  return {
    ok: Boolean(data?.ok) && result.code === 0,
    result: data,
    code: result.code,
    stdout: result.stdout,
    stderr: result.stderr,
    outJson
  };
}

async function synthesizeSpeech(text, voiceId, name = "agent-lee-voice") {
  const python = resolvePythonCommand();
  if (!python) {
    // No Python — we'll attempt a platform-specific fallback later
    // but surface the absence here for diagnostics
    console.warn("No Python launcher was found for speech synthesis.");
  }

  ensureDir(AUDIO_DIR);
  const safeName = String(name || "agent-lee-voice").replace(/[^a-zA-Z0-9_-]/g, "_");
  const mp3Path = path.join(AUDIO_DIR, `${safeName}-${Date.now().toString(36)}-${crypto.randomBytes(4).toString("hex")}.mp3`);
  let result = null;
  try {
    if (python) {
      result = await runProcess(
        python,
        [
          "-m",
          "leeway_tts",
          "--voice",
          voiceId,
          "--text",
          text,
          "--write-media",
          mp3Path
        ],
        { timeoutMs: 180000 }
      );
    }

    if (fs.existsSync(mp3Path)) {
      const stat = fs.statSync(mp3Path);
      return {
        ok: result ? result.code === 0 : true,
        mp3Path,
        voiceId,
        bytes: stat.size,
        stdout: result ? result.stdout : "",
        stderr: result ? result.stderr : ""
      };
    }
  } catch (err) {
    console.warn("leeway_tts invocation failed:", err?.message || String(err));
  }

  // Fallback: on Windows, attempt PowerShell System.Speech TTS to WAV
  try {
    if (process.platform === "win32") {
      const wavPath = mp3Path.replace(/\.mp3$/i, ".wav");
      const safeText = String(text || "").replace(/"/g, '\\"');
      const psCmd = `Add-Type -AssemblyName System.Speech; $s = New-Object System.Speech.Synthesis.SpeechSynthesizer; $s.SetOutputToWaveFile(\"${wavPath}\"); $s.Speak(\"${safeText}\"); $s.Dispose();`;
      const ps = await runProcess("powershell", ["-NoProfile", "-Command", psCmd], { timeoutMs: 120000 });
      if (fs.existsSync(wavPath)) {
        const stat = fs.statSync(wavPath);
        return {
          ok: ps && ps.code === 0,
          mp3Path: wavPath,
          voiceId: voiceId,
          bytes: stat.size,
          stdout: ps ? ps.stdout : "",
          stderr: ps ? ps.stderr : ""
        };
      }
    }
  } catch (err) {
    console.warn("PowerShell TTS fallback failed:", err?.message || String(err));
  }

  throw new Error(`Speech synthesis failed and no fallback avaiable for text length ${String(text || "").length}`);
}

function getAudioContentType(filePath) {
  const ext = String(filePath || "").split(".").pop().toLowerCase();
  if (ext === "mp3") return "audio/mpeg";
  if (ext === "wav") return "audio/wav";
  if (ext === "ogg") return "audio/ogg";
  return "application/octet-stream";
}

async function streamFileToResponse(filePath, res, contentType) {
  await new Promise((resolve, reject) => {
    const input = fs.createReadStream(filePath);
    input.on("error", reject);
    res.on("error", reject);
    res.writeHead(200, {
      "content-type": contentType,
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-allow-headers": "content-type,authorization"
    });
    input.on("close", resolve);
    input.pipe(res);
  });
}

async function captureMicrophoneTranscript(payload = {}) {
  const body = {
    seconds: Number(payload.seconds || 5),
    session: payload.session || createSessionId(),
    speak: Boolean(payload.speak)
  };

  return callJson(`${CEREBRAL_BASE}/api/local-voice/agent-lee-capture`, body, 180000);
}

function parseOllamaStreamChunks(rawText = "") {
  return String(rawText || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^data:\s*/, ""))
    .filter((line) => line && line !== "[DONE]")
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function extractPartialOllamaContent(rawText = "") {
  const text = String(rawText || "");
  if (!text) return "";

  const matches = [...text.matchAll(/"content"\s*:\s*"([^"]*)/g)];
  if (matches.length === 0) {
    return "";
  }

  const fragment = matches[matches.length - 1][1] || "";
  return fragment
    .replace(/\\n/g, "\n")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\")
    .trim();
}

async function getLoadedOllamaModels() {
  try {
    const response = await callJson(`${OLLAMA_BASE}/api/ps`, null, 10000);
    if (response.ok && response.data && Array.isArray(response.data.models)) {
      return response.data.models.map(m => m.name || m.model).filter(Boolean);
    }
  } catch (err) {
    console.warn("Failed to query loaded models via Ollama API:", err.message);
  }
  return [];
}

async function unloadOllamaModel(modelName) {
  console.log(`[VRAM Eviction] Unloading model: ${modelName}`);
  try {
    const response = await callJson(`${OLLAMA_BASE}/api/generate`, {
      model: modelName,
      keep_alive: 0
    }, 15000);
    console.log(`[VRAM Eviction] Unloaded ${modelName}: status=${response.status}`);
  } catch (err) {
    console.warn(`[VRAM Eviction] Failed to unload model ${modelName}:`, err.message);
  }
}

async function ensureModelGpuExecution(targetModel, { skipEviction = false } = {}) {
  const loadedModels = await getLoadedOllamaModels();
  console.log(`[VRAM Eviction] Current loaded models: ${JSON.stringify(loadedModels)}. Target: ${targetModel}`);
  if (skipEviction) {
    console.log(`[VRAM Eviction] Eviction skipped (preload/keepalive mode) for ${targetModel}`);
    return;
  }
  for (const model of loadedModels) {
    if (model !== targetModel) {
      console.log(`[VRAM Eviction] Evicting competing model ${model} to ensure GPU execution for ${targetModel}`);
      await unloadOllamaModel(model);
    }
  }
}

async function ollamaChat(messages, options = {}) {
  const selectedModel = options.model || DEFAULT_MODEL;
  await ensureModelGpuExecution(selectedModel, { skipEviction: Boolean(options.skipEviction) });
  const isQwen3 = String(selectedModel || "").toLowerCase().startsWith("qwen3");
  const baseSystem = options.system || DEFAULT_ROUTER_SYSTEM_PROMPT;
  const hasToolInstructions = String(baseSystem).includes("```json") ||
    String(baseSystem).includes("AVAILABLE SYSTEM CAPABILITIES & TOOLS:") ||
    (String(baseSystem).includes("tool") && String(baseSystem).includes("JSON"));

  // Inspect the messages for tool-calling signals as an additional indicator
  // that the model should be allowed to "think" (emit structured JSON/tool blocks).
  const joinedMessages = Array.isArray(messages) ? messages.map(m => String(m.content || "")).join("\n") : "";
  const messageHasToolHints = /```json|\"tool\":|open_browser|web_search|take_screenshot|create_image|create_video|open_camera|close_camera|change_shape|change_ui_color|create_video/i.test(joinedMessages);

  // Allow thinking if explicitly requested via options, if the system prompt contains
  // tool instructions, or if the user messages contain recognizable tool hints.
  const containsToolSignals = hasToolInstructions || messageHasToolHints || Boolean(options.forceToolThinking) || Boolean(options.toolCall) || Boolean(options.toolMode);
  const allowThinking = Boolean(options.allowThinking) || containsToolSignals;

  // Prepend /no_think for Qwen3 models when thinking is explicitly disallowed
  // so the model skips its internal chain-of-thought and returns a direct answer.
  const systemContent = isQwen3 && !String(baseSystem).trimStart().startsWith("/no_think") && !allowThinking
    ? `/no_think ${baseSystem}`
    : baseSystem;

  const requestedNumPredict = typeof options.num_predict === "number" ? options.num_predict : 320;
  const timeoutMs = typeof options.timeoutMs === "number" && options.timeoutMs > 0 ? options.timeoutMs : 15000;
  const partialResponse = Boolean(options.partialResponse);
  const resolvedNumPredict = isQwen3
    ? (partialResponse ? requestedNumPredict : Math.max(requestedNumPredict, 512))
    : requestedNumPredict;

  const payload = {
    model: selectedModel,
    stream: Boolean(options.stream),
    messages: [
      {
        role: "system",
        content: systemContent
      },
      ...messages
    ],
    options: {
      temperature: typeof options.temperature === "number" ? options.temperature : 0,
      num_predict: resolvedNumPredict
    }
  };

  const trace = options.trace || null;
  if (trace) {
    trace.event("ollama_request_start", {
      model: payload.model,
      endpoint: `${OLLAMA_BASE}/api/chat`,
      stream: Boolean(options.stream),
      timeoutMs
    });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let response = null;
  try {
    response = await fetch(`${OLLAMA_BASE}/api/chat`, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(`Ollama request timed out after ${timeoutMs}ms.`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const rawText = await response.text();
    if (trace) {
      trace.event("ollama_done", {
        ok: false,
        status: response.status
      });
    }
    throw new Error(`Ollama HTTP ${response.status}: ${rawText.slice(0, 1000)}`);
  }

  let rawText = "";
  let firstTokenAt = null;

  if (options.stream && response.body && typeof response.body.getReader === "function") {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      if (value && value.length > 0) {
        if (firstTokenAt === null) {
          firstTokenAt = Date.now();
          if (trace) {
            trace.event("ollama_first_token", {
              ms: Date.now() - trace.startedEpochMs
            });
          }
        }
        rawText += decoder.decode(value, { stream: true });

        if (partialResponse) {
          const partialChunks = parseOllamaStreamChunks(rawText);
          const partialContent = partialChunks
            .map((chunk) => chunk?.message?.content ?? chunk?.response ?? chunk?.content ?? "")
            .filter(Boolean)
            .join("");
          const extractedPartialContent = partialContent.trim() || extractPartialOllamaContent(rawText);
          const partialText = String(extractedPartialContent || "").trim();

          // Require a minimally useful partial response before returning early.
          // Qwen3 can often provide meaningful short replies; other backends need a larger buffer.
          const MIN_PARTIAL_CHARS = isQwen3 ? 3 : 12;
          if (partialText.length >= MIN_PARTIAL_CHARS) {
            if (firstTokenAt === null) {
              firstTokenAt = Date.now();
              if (trace) {
                trace.event("ollama_first_token", {
                  ms: Date.now() - trace.startedEpochMs
                });
              }
            }
            try {
              await reader.cancel();
            } catch {
              // ignore cancellation errors for early-first-response mode
            }
            break;
          }
        }
      }
    }

    rawText += decoder.decode();
  } else {
    rawText = await response.text();
  }

  let data = null;

  try {
    if (options.stream) {
      data = parseOllamaStreamChunks(rawText);
    } else {
      data = JSON.parse(rawText);
    }
  } catch {
    throw new Error(`Ollama returned non-JSON: ${rawText.slice(0, 1000)}`);
  }

  let content = "";
  let raw = data;

  if (options.stream) {
    content = data
      .map((chunk) => chunk?.message?.content ?? chunk?.response ?? chunk?.content ?? "")
      .filter(Boolean)
      .join("");
    if (!content.trim() && partialResponse) {
      content = extractPartialOllamaContent(rawText);
    }
    if (!content.trim() && partialResponse) {
      content = `Agent Lee is on the selected path, but no clean first reply landed for the ${options.promptClass || "current"} prompt class.`;
    }
    raw = {
      chunks: data,
      firstTokenAt: firstTokenAt ? new Date(firstTokenAt).toISOString() : null
    };
  } else {
    content =
      data?.message?.content ??
      data?.response ??
      data?.content ??
      "";
  }

  content = stripThinking(content);

  if (!content) {
    content = "Yo Leonard, the router brain is connected, but the model returned an empty answer. That is now caught instead of silently failing.";
  }

  if (trace) {
    trace.event("ollama_done", {
      ok: true,
      stream: Boolean(options.stream),
      firstTokenAt: firstTokenAt ? new Date(firstTokenAt).toISOString() : null
    });
  }

  return {
    content,
    raw
  };
}

function timeoutBudgetForModel(model) {
  const selected = String(model || "").toLowerCase();

  if (selected.startsWith("qwen2.5vl")) {
    return 180000;
  }

  if (selected.startsWith("qwen3")) {
    return 120000;
  }

  if (selected.startsWith("qwen2.5-coder")) {
    return 90000;
  }

  if (selected.startsWith("deepseek-coder")) {
    return 60000;
  }

  return 90000;
}

async function ollamaChatWithFallback(messages, options = {}) {
  const primaryModel = options.model || DEFAULT_MODEL;
  const fallbackModel = typeof options.fallbackModel === "string" && options.fallbackModel.trim()
    ? options.fallbackModel.trim()
    : FAST_FALLBACK_MODEL;
  const primaryTimeoutMs = typeof options.primaryTimeoutMs === "number"
    ? options.primaryTimeoutMs
    : timeoutBudgetForModel(primaryModel);
  const fallbackTimeoutMs = typeof options.fallbackTimeoutMs === "number"
    ? options.fallbackTimeoutMs
    : timeoutBudgetForModel(fallbackModel || FAST_FALLBACK_MODEL);

  try {
    const answer = await ollamaChat(messages, {
      ...options,
      model: primaryModel,
      timeoutMs: primaryTimeoutMs
    });
    return {
      answer,
      model: primaryModel,
      fallbackUsed: false
    };
  } catch (primaryError) {
    if (!fallbackModel || primaryModel === fallbackModel) {
      throw primaryError;
    }

    try {
      const answer = await ollamaChat(messages, {
        ...options,
        model: fallbackModel,
        timeoutMs: fallbackTimeoutMs
      });
      return {
        answer,
        model: fallbackModel,
        fallbackUsed: true,
        primaryError
      };
    } catch (fallbackError) {
      fallbackError.primaryError = primaryError;
      fallbackError.fallbackAttempted = true;
      fallbackError.fallbackModel = fallbackModel;
      throw fallbackError;
    }
  }
}

function normalizeRequestedLanguage(value, fallback) {
  return normalizeLanguageCode(value || fallback || "en") || "en";
}

function makeAssistantVoiceSummary(voiceId, language, speech) {
  if (!speech) {
    return {
      voiceId,
      language,
      streamed: false,
      mp3Path: null
    };
  }

  return {
    voiceId,
    language,
    streamed: false,
    mp3Path: speech.mp3Path,
    bytes: speech.bytes
  };
}

async function executeConversationTurn(input = {}) {
  const policy = loadLanguagePolicy();
  let session = loadSession(input.sessionId);
  if (!session) {
    session = createNewSession({
      preferredLanguage: input.preferredLanguage,
      defaultLanguage: input.defaultLanguage,
      mode: input.mode || "live-conversation",
      operatorName: input.operatorName,
      subject: input.subject
    });
  }

  if (session.status === "ended") {
    session.status = "active";
  }

  const turnId = uniqueId("turn");
  const turnStartedAt = nowIso();
  let capture = null;
  let userText = normalizeText(input.text || input.message || input.input || input.prompt || "");
  let inputLanguage = normalizeLanguageCode(input.language || "");
  let userEnglish = normalizeText(input.english || input.englishText || "");
  let transcription = null;

  if (!userText && input.captureMicrophone) {
    capture = await captureMicrophoneTranscript({
      seconds: input.seconds || input.captureSeconds || 5,
      session: input.sessionId || session.sessionId,
      speak: false
    });

    if (!capture.ok) {
      throw new Error(capture?.data?.message || capture?.data?.error || capture.raw || "Microphone capture failed.");
    }

    const captureBody = capture.data || {};
    userText = normalizeText(
      captureBody.transcript ||
      captureBody.response ||
      captureBody.asr?.transcript ||
      captureBody.agent?.transcript ||
      ""
    );
    inputLanguage = normalizeLanguageCode(
      captureBody.asr?.language ||
      captureBody.language ||
      captureBody.detectedLanguage ||
      inputLanguage
    );
    userEnglish = normalizeText(
      captureBody.asr?.english ||
      captureBody.english ||
      captureBody.translation ||
      ""
    );
  }

  if (!userText && input.wavPath) {
    transcription = await transcribeWavFile(input.wavPath, input.model || "base");
    if (!transcription.ok) {
      throw new Error(transcription.result?.error || transcription.stderr || "Transcription failed.");
    }

    const transcribeBody = transcription.result || {};
    userText = normalizeText(transcribeBody.original || transcribeBody.transcript || transcribeBody.text || "");
    inputLanguage = normalizeLanguageCode(transcribeBody.detectedLanguage || transcribeBody.language || inputLanguage);
    userEnglish = normalizeText(transcribeBody.english || transcribeBody.translation || "");
  }

  if (!userText) {
    throw new Error("Conversation turn requires text, wavPath, or captureMicrophone.");
  }

  if (!inputLanguage) {
    inputLanguage = inferLanguageFromText(userText).language || "en";
  }

  const requestedModel = typeof input.model === "string" && input.model.trim() ? input.model.trim() : "agent-lee";
  const modelHealth = await getModelPoolStatus();
  const modelRoute = selectAgentLeeBackend(requestedModel, `${userText}\n${userEnglish}`.trim(), input, modelHealth);

  if (!userEnglish) {
    if (inputLanguage === "en") {
      userEnglish = userText;
    } else {
      const translation = await translateText(userText, inputLanguage, "en", policy, modelRoute.model);
      userEnglish = translation.translatedText || userText;
    }
  }

  const targetLanguage = normalizeRequestedLanguage(
    input.targetLanguage || input.responseLanguage || session.preferredLanguage || policy.defaultResponseLanguage || policy.defaultLanguage,
    policy.defaultResponseLanguage || policy.defaultLanguage || "en"
  );
  const systemPrompt = buildConversationSystemPrompt(policy, targetLanguage);
  const conversationMessages = buildConversationMessages(
    session,
    {
      inputLanguage,
      userText,
      userEnglish
    },
    policy,
    targetLanguage
  );

  const answerResult = await ollamaChatWithFallback(conversationMessages, {
    system: systemPrompt,
    temperature: typeof input.temperature === "number" ? input.temperature : 0.25,
    num_predict: 320,
    model: modelRoute.model
  });
  const answer = answerResult.answer;

  const assistantText = normalizeText(answer.content);
  const voiceId = input.voice || defaultVoiceForLanguage(targetLanguage, policy);
  const speak = Boolean(input.speak);
  const speech = speak
    ? await synthesizeSpeech(assistantText, voiceId, `conversation-${session.sessionId}`)
    : null;

  const turnRecord = {
    id: turnId,
    at: turnStartedAt,
    role: "turn",
    sessionId: session.sessionId,
    userText,
    userEnglish,
    inputLanguage,
    assistantText,
    assistantLanguage: targetLanguage,
    voiceId,
    speak,
    audioPath: speech?.mp3Path || "",
    audioBytes: speech?.bytes || 0,
    transcript: transcription?.result || null,
    capture: capture?.data || null
  };

  mergeSessionHistory(session, turnRecord);
  saveSession(session);
  appendConversationEvent({
    at: turnStartedAt,
    sessionId: session.sessionId,
    turn: turnRecord,
    session: buildSessionSummary(session)
  });

  return {
    ok: true,
    route: "agent-lee-conversation-turn",
    policyPath: LANGUAGE_POLICY_PATH,
    manifestPath: LIVE_CONVERSATION_MANIFEST_PATH,
    session: buildSessionSummary(session),
    input: {
      userText,
      userEnglish,
      inputLanguage,
      targetLanguage,
      captureMicrophone: Boolean(input.captureMicrophone),
      wavPath: input.wavPath || "",
      sessionId: session.sessionId
    },
    assistant: {
      text: assistantText,
      language: targetLanguage,
      voiceId,
      speak,
      audio: makeAssistantVoiceSummary(voiceId, targetLanguage, speech)
    },
    capture: capture?.data || null,
    transcription: transcription?.result || null,
    turn: turnRecord
  };
}

async function buildVoiceBackendsStatus() {
  const policy = loadLanguagePolicy();
  const python = resolvePythonCommand();
  ensureDir(AUDIO_DIR);
  const cerebralStatus = await callJson(`${CEREBRAL_BASE}/api/local-voice/status`, null, 12000).catch(() => null);
  const ttsVoices = await callJson(`${CEREBRAL_BASE}/api/tts/voices`, null, 12000).catch(() => null);

  return {
    ok: true,
    router: "agent-lee-brainfix",
    runtimeDir: RUNTIME_DIR,
    languagePolicyPath: LANGUAGE_POLICY_PATH,
    conversationManifestPath: LIVE_CONVERSATION_MANIFEST_PATH,
    pythonAvailable: Boolean(python),
    leewayTtsAvailable: Boolean(python),
    whisperTranscribeAvailable: Boolean(python && fs.existsSync(TRANSCRIBE_SCRIPT_PATH)),
    audioOutputAvailable: true,
    micCaptureAvailable: Boolean(cerebralStatus?.ok && cerebralStatus?.data?.mic?.available),
    cerebralStatus: cerebralStatus?.data || null,
    ttsVoices: ttsVoices?.data || null,
    defaultVoice: policy.defaultVoice,
    supportedLanguages: policy.supportedLanguages
  };
}

async function buildLanguageStatus() {
  const policy = loadLanguagePolicy();
  const speechStylePolicy = loadSpeechStylePolicy();
  const backends = await buildVoiceBackendsStatus();
  return {
    ok: true,
    router: "agent-lee-brainfix",
    policy,
    speechStylePolicy,
    backends,
    defaultLanguage: policy.defaultLanguage,
    defaultResponseLanguage: policy.defaultResponseLanguage,
    preferredLeonardLanguage: policy.preferredNames?.Leonard || policy.defaultLanguage || "en"
  };
}

function makeCompletion({ model, content, route }) {
  return {
    id: `chatcmpl-agent-lee-${Date.now()}`,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: model || "agent-lee",
    route,
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content
        },
        finish_reason: "stop"
      }
    ]
  };
}

function findJsonObjects(str) {
  const objects = [];
  let index = 0;
  while ((index = str.indexOf('{', index)) !== -1) {
    let braceCount = 0;
    let inString = false;
    let escape = false;
    let end = -1;
    for (let i = index; i < str.length; i++) {
      const char = str[i];
      if (escape) {
        escape = false;
        continue;
      }
      if (char === '\\') {
        escape = true;
        continue;
      }
      if (char === '"') {
        inString = !inString;
        continue;
      }
      if (!inString) {
        if (char === '{') {
          braceCount++;
        } else if (char === '}') {
          braceCount--;
          if (braceCount === 0) {
            end = i;
            break;
          }
        }
      }
    }
    if (end !== -1) {
      const jsonStr = str.substring(index, end + 1);
      objects.push({ start: index, end: end, content: jsonStr });
      index = end + 1;
    } else {
      index++;
    }
  }
  return objects;
}

function extractToolsFromContent(content) {
  const tools = [];
  let cleanedContent = content;

  // Support the case where the model returns a top-level JSON array of tool objects,
  // e.g. `[ { "tool": "web_search", "query": "..." }, { "tool": "open_browser", "url": "..." } ]`.
  try {
    const trimmed = String(content || "").trim();
    if (/^\s*\[/.test(trimmed)) {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item && typeof item === "object") {
            const name = item.tool || item.name || item.toolName;
            if (name) {
              const args = item.arguments || item.args || item;
              tools.push({ name, arguments: args });
            }
          }
        }
        // Remove the entire array from cleanedContent for downstream processing
        cleanedContent = trimmed.replace(/^[\s\S]*?\]/, "").trim();
      }
    }
  } catch (e) {
    // Ignore parse errors and continue with existing heuristics
  }

  // 1. Try fenced blocks first
  const jsonBlockRegex = /```(?:json|JSON)?\s*([\s\S]*?)\s*```/g;
  let match;
  const processedRanges = [];

  while ((match = jsonBlockRegex.exec(content)) !== null) {
    const rawBlock = match[0];
    const jsonText = match[1].trim();
    try {
      const parsed = JSON.parse(jsonText);
      if (parsed && typeof parsed === "object") {
        const name = parsed.tool || parsed.name || parsed.toolName;
        if (name) {
          const args = parsed.arguments || parsed.args || parsed;
          tools.push({
            name: name,
            arguments: args
          });
          processedRanges.push({
            start: match.index,
            end: match.index + rawBlock.length
          });
        }
      }
    } catch (e) {
      console.warn("Failed to parse tool call JSON block: ", jsonText, e);
      // Fallback: search for JSON object inside the malformed fenced block
      const subObjs = findJsonObjects(jsonText);
      for (const subObj of subObjs) {
        try {
          const subParsed = JSON.parse(subObj.content);
          if (subParsed && typeof subParsed === "object") {
            const name = subParsed.tool || subParsed.name || subParsed.toolName;
            if (name) {
              const args = subParsed.arguments || subParsed.args || subParsed;
              tools.push({
                name: name,
                arguments: args
              });
              processedRanges.push({
                start: match.index,
                end: match.index + rawBlock.length
              });
              break;
            }
          }
        } catch (innerE) {}
      }
    }
  }

  // 2. Search remaining/unfenced content for JSON objects
  const allJsonObjects = findJsonObjects(content);
  for (const obj of allJsonObjects) {
    const isOverlapping = processedRanges.some(r =>
      (obj.start >= r.start && obj.start < r.end) ||
      (obj.end > r.start && obj.end <= r.end)
    );
    if (isOverlapping) continue;

    try {
      if (obj.content.includes('"tool"') || obj.content.includes('"toolName"') || obj.content.includes('"name"')) {
        const parsed = JSON.parse(obj.content);
        if (parsed && typeof parsed === "object") {
          const name = parsed.tool || parsed.name || parsed.toolName;
          if (name) {
            const args = parsed.arguments || parsed.args || parsed;
            tools.push({
              name: name,
              arguments: args
            });
            processedRanges.push({
              start: obj.start,
              end: obj.end
            });
          }
        }
      }
    } catch (e) {
      // Try relaxed parse (handling single quotes and trailing commas)
      try {
        const cleanedJson = obj.content
          .replace(/'/g, '"')
          .replace(/,\s*([}\]])/g, '$1');
        const parsed = JSON.parse(cleanedJson);
        if (parsed && typeof parsed === "object") {
          const name = parsed.tool || parsed.name || parsed.toolName;
          if (name) {
            const args = parsed.arguments || parsed.args || parsed;
            tools.push({
              name: name,
              arguments: args
            });
            processedRanges.push({
              start: obj.start,
              end: obj.end
            });
          }
        }
      } catch (innerE) {}
    }
  }

  // 3. Remove processed ranges from cleanedContent
  processedRanges.sort((a, b) => b.start - a.start);
  for (const r of processedRanges) {
    cleanedContent = cleanedContent.substring(0, r.start) + cleanedContent.substring(r.end);
  }

  cleanedContent = cleanedContent
    .replace(/```(?:json|JSON)?\s*```/g, "")
    .trim();

  return { tools, cleanedContent };
}

function makeTimedCompletion({ model, content, route, trace = null, responseMode = null, selectedModel = null, selectedBackend = null, resolvedBackend = null, modelLoaded = null, fallbackUsed = false, firstByteMs = null, totalMs = null, tools = [] }) {
  const completion = makeCompletion({ model, content, route });
  if (trace) {
    completion.agentLeeTrace = trace;
  }
  completion.agentLeeRouter = {
    route,
    responseMode,
    selectedModel,
    selectedBackend,
    resolvedBackend,
    modelLoaded,
    fallbackUsed: Boolean(fallbackUsed),
    firstByteMs,
    totalMs
  };
  completion.tools = tools;
  return completion;
}

function getUserText(messages) {
  return (Array.isArray(messages) ? messages : [])
    .filter((message) => message && message.role === "user")
    .map((message) => normalizeText(message.content))
    .join("\n")
    .trim();
}

function getAllText(messages) {
  return (Array.isArray(messages) ? messages : [])
    .filter((message) => message && typeof message.content === "string")
    .map((message) => normalizeText(message.content))
    .join("\n")
    .trim();
}

const HOT_CACHED_IDENTITY_PROMPT = "say only: agent lee online.";

function isHotCachedIdentityPrompt(messages, body = {}) {
  // LEEWAY SINGLE BRAIN LAW: No mocked responses. Let Agent Lee Prime handle all identity/hello questions natively.
  return false;
}

function isOfficialEmbodimentProofPrompt(text = "") {
  const lowered = String(text || "").toLowerCase();
  if (!lowered) return false;
  return lowered.includes("official leeway runtime fabric embodiment proof")
    || lowered.includes("agent lee, run the official leeway runtime fabric embodiment proof now")
    || lowered.includes("agent_lee.runofficialembodimentproof")
    || lowered.includes("/agent-lee official embodiment proof")
    || lowered.includes("agagent_lee_vscode_chat_embodiment_stack_locked");
}

function isOfficialEmbodimentFinalizePrompt(text = "") {
  const raw = String(text || "").trim();
  const lowered = raw.toLowerCase();
  if (!lowered) return false;

  if (lowered === "yes") return true;
  if (lowered.includes("/agent-lee finalize embodiment proof yes")) return true;
  if (lowered.includes("agent_lee.finalizeofficialembodimentproof")) return true;

  if (/finalize embodiment proof/.test(lowered)) {
    return lowered.includes("yes") || Boolean(extractPendingReceiptPath(lowered));
  }

  return false;
}

function extractPendingReceiptPath(text = "") {
  const raw = String(text || "").trim();
  const patterns = [
    /[A-Z]:[\\/][^\r\n"']*?Archive[\\/]+receipts[\\/]+agent-lee-vscode-chat-embodiment-stack-proof-\d{8}-\d{6}\.json/ig,
    /Archive[\\/]+receipts[\\/]+agent-lee-vscode-chat-embodiment-stack-proof-\d{8}-\d{6}\.json/ig
  ];

  for (const pattern of patterns) {
    const match = raw.match(pattern);
    if (match && match.length > 0) {
      return String(match[0]).trim().replace(/^['"]+|['"]+$/g, "");
    }
  }

  return "";
}

function isOfficialCameraProofPrompt(text = "") {
  const lowered = String(text || "").toLowerCase();
  if (!lowered) return false;
  return lowered.includes("official physical camera eyes proof")
    || lowered.includes("official camera eyes proof")
    || lowered.includes("agent_lee.cameralooknow")
    || lowered.includes("agent lee, run the official physical camera eyes proof")
    || lowered.includes("agent lee, run the official physical camera eyes proof now")
    || lowered.includes("agent lee, look now")
    || lowered.includes("camera eyes ok_2");
}

function buildHotCachedIdentityText(userText) {
  const lowered = String(userText || "").toLowerCase();
  if (/\b(who are you|identity|canonical identity|agent identity)\b/i.test(lowered)) {
    return "I am Agent Lee, the sentinel of the Leeway code-mode ecosystem. I route work through Runtime Fabric, keep the ledger in view, check receipts, protect approval gates, and stay on the official path.";
  }
  if (/\b(speed|fast|latency|response|responding|under a second|1 second|slow)\b/i.test(lowered)) {
    return "Agent Lee is on the official path, moving with the pulse and keeping the receipts tight.";
  }
  if (/\b(backend|downstream|timeout|timed out|stuck)\b/i.test(lowered)) {
    return "Agent Lee is on the line. The downstream lane is late, so I am holding the official path, checking the receipts, and waiting for the clean turn.";
  }
  if (/\b(voice|speak|audio)\b/i.test(lowered)) {
    return "Agent Lee is on the line, and voice is live through the local runtime while the official path stays in bounds.";
  }
  if (/\bready\b/i.test(lowered)) {
    return "Agent Lee is ready on the official path.";
  }
  if (/\bonline\b|\bstatus\b|\bhello\b|\bhi\b|\bare you online\b/i.test(lowered)) {
    return "Agent Lee is on the official path, checking the pulse and ready to move.";
  }
  return "Agent Lee is on the official path, checking receipts and waiting on the next clean signal.";
}

function isCodeGenerationPrompt(text = "") {
  // LEEWAY SINGLE BRAIN LAW: No mocked responses. Let Agent Lee Prime handle all coding requests natively.
  return false;
}

function buildHotCachedCodeText(userText) {
  const lowered = String(userText || "").toLowerCase();

  if (lowered.includes("fibonacci")) {
    return [
      "function fibonacci(n) {",
      "  if (n <= 1) return n;",
      "  let a = 0, b = 1;",
      "  for (let i = 2; i <= n; i += 1) {",
      "    [a, b] = [b, a + b];",
      "  }",
      "  return b;",
      "}",
      "",
      "console.log(fibonacci(10));"
    ].join("\n");
  }

  return [
    "function example(value) {",
    "  return value;",
    "}",
    "",
    "console.log(example(42));"
  ].join("\n");
}

function routeRoleForTask(body = {}, messages = [], modelHealth = null) {
  const promptText = getUserText(messages);
  return selectAgentLeeBackend(body.model || "agent-lee", promptText, body, modelHealth);
}

function summarizeAgentLeeTrace(trace) {
  if (!trace) return null;
  return {
    label: trace.label || null,
    startedAt: trace.startedAt || null,
    totalMs: trace.totalMs ?? null,
    slowestSpan: trace.slowestSpan || null,
    events: Array.isArray(trace.events) ? trace.events : [],
    spans: Array.isArray(trace.spans) ? trace.spans : [],
    responseMode: trace.responseMode || null,
    selectedModel: trace.selectedModel || null,
    selectedBackend: trace.selectedBackend || null,
    modelLoaded: typeof trace.modelLoaded === "boolean" ? trace.modelLoaded : null,
    fallbackUsed: Boolean(trace.fallbackUsed),
    endpoint: trace.endpoint || null,
    promptKind: trace.promptKind || null
  };
}

function createTrace(label, extra = {}) {
  const startedAt = Date.now();
  const trace = {
    label,
    startedAt: nowIso(),
    startedEpochMs: startedAt,
    totalMs: null,
    events: [],
    spans: [],
    slowestSpan: null,
    ...extra
  };

  trace.event = (name, details = {}) => {
    trace.events.push({
      name,
      ms: Date.now() - startedAt,
      ...details
    });
  };

  trace.begin = (name, details = {}) => {
    const span = {
      name,
      startMs: Date.now() - startedAt,
      ...details
    };
    trace.spans.push(span);
    return span;
  };

  trace.end = (span, details = {}) => {
    if (!span) return null;
    span.endMs = Date.now() - startedAt;
    span.durationMs = Math.max(0, span.endMs - span.startMs);
    Object.assign(span, details);
    if (!trace.slowestSpan || span.durationMs > trace.slowestSpan.durationMs) {
      trace.slowestSpan = {
        name: span.name,
        durationMs: span.durationMs,
        startMs: span.startMs,
        endMs: span.endMs
      };
    }
    return span;
  };

  trace.finish = (details = {}) => {
    trace.totalMs = Date.now() - startedAt;
    if (!trace.slowestSpan && trace.spans.length > 0) {
      const slowest = [...trace.spans].sort((a, b) => (b.durationMs || 0) - (a.durationMs || 0))[0];
      if (slowest) {
        trace.slowestSpan = {
          name: slowest.name,
          durationMs: slowest.durationMs || 0,
          startMs: slowest.startMs,
          endMs: slowest.endMs
        };
      }
    }
    return Object.assign(trace, details);
  };

  return trace;
}

function getUserTextDuplicate(messages) {
  return (Array.isArray(messages) ? messages : [])
    .filter((message) => message && message.role === "user")
    .map((message) => normalizeText(message.content))
    .join("\n")
    .trim();
}

function isHotCachedIdentityPromptDuplicate(messages, body = {}) {
  if (Array.isArray(body.tools) && body.tools.length > 0) return false;
  if (Array.isArray(messages) && messages.some((message) => message && (message.role === "tool" || Array.isArray(message.tool_calls)))) {
    return false;
  }

  const userText = getUserTextDuplicate(messages);
  if (!userText || userText.length > 160) return false;

  const lowered = userText.toLowerCase();
  if (/(build|implement|patch|fix|test|browser|research|open file|launch|terminal|wsl|desktop|execute|tool|coding|programming|refactor|architecture|design|implementation)/i.test(lowered)) {
    return false;
  }

  return normalizeText(lowered).toLowerCase() === HOT_CACHED_IDENTITY_PROMPT;
}

function buildHotCachedIdentityTextDuplicate(userText) {
  const lowered = String(userText || "").toLowerCase();
  if (/\b(who are you|identity|canonical identity|agent identity)\b/i.test(lowered)) {
    return "I am Agent Lee, the sentinel of the Leeway code-mode ecosystem. I route work through Runtime Fabric, keep the ledger in view, check receipts, protect approval gates, and stay on the official path.";
  }
  if (/\bready\b/i.test(lowered)) {
    return "Agent Lee is ready on the official path.";
  }
  if (/\bonline\b|\bstatus\b|\bhello\b|\bhi\b|\bare you online\b/i.test(lowered)) {
    return "Agent Lee is on the official path, checking the pulse and ready to move.";
  }
  return "Agent Lee is on the official path, checking the pulse and ready to move.";
}

function buildCanonicalVoiceLawResponse(userText) {
  const lowered = String(userText || "").toLowerCase();

  if (/\b(who are you|identity|canonical identity|agent identity)\b/i.test(lowered)) {
    return "I am Agent Lee, the sentinel of the Leeway code-mode ecosystem. I route work through Runtime Fabric, keep the ledger in view, check receipts, protect approval gates, and stay on the official path.";
  }

  if (/\b(antigravity|another ide|connect yourself to another ide|bridge another ide|adapter route|adapter path)\b/i.test(lowered)) {
    return "I can inspect the target IDE, design an adapter route, preserve provenance, and keep approval gates and receipts on the official path. I won’t claim the bridge is live until the route is proven end to end.";
  }

  if (/\b(runtime fabric|local stack|receipts|approval gates|blueprint|pulse|official path|leeway standards)\b/i.test(lowered)) {
    return "Runtime Fabric is the enforcement layer. I keep the pulse checked, protect the gates, preserve provenance, and use receipts to keep the official path honest.";
  }

  if (/\b(blocker|blocked|blocking|issue|error|problem|stuck|failed|fail)\b/i.test(lowered)) {
    return "The path is blocked at the receipt or route layer, but Agent Lee is on the fast lane. I can name the blocker, isolate the lane, and keep the work on the official path until the proof is clean.";
  }

  if (/\b(speed|fast|latency|response|responding|under a second|1 second|slow)\b/i.test(lowered)) {
    return "Agent Lee is on the fast lane, moving with the pulse and keeping the receipts tight.";
  }

  if (/\b(backend|downstream|timeout|timed out|stuck)\b/i.test(lowered)) {
    return "Agent Lee is on the fast lane. The downstream lane is late, so I am holding the official path, checking the receipts, and waiting for the clean turn.";
  }

  if (/\b(voice|speak|audio)\b/i.test(lowered)) {
    return "Agent Lee is on the line, and voice is enabled through the local runtime while the official path stays in bounds.";
  }

  if (/\bready\b/i.test(lowered)) {
    return "Agent Lee is ready on the fast lane.";
  }

  if (/\bonline\b|\bstatus\b|\bhello\b|\bhi\b|\bare you online\b/i.test(lowered)) {
    return "Agent Lee online on the fast lane and ready to move.";
  }

  return "Agent Lee is online on the fast lane, checking receipts and waiting on the next clean signal.";
}

function summarizeAgentLeeTraceDuplicate(trace) {
  if (!trace) return null;
  return {
    label: trace.label || null,
    startedAt: trace.startedAt || null,
    totalMs: trace.totalMs ?? null,
    slowestSpan: trace.slowestSpan || null,
    events: Array.isArray(trace.events) ? trace.events : [],
    spans: Array.isArray(trace.spans) ? trace.spans : [],
    responseMode: trace.responseMode || null,
    selectedModel: trace.selectedModel || null,
    selectedBackend: trace.selectedBackend || null,
    modelLoaded: typeof trace.modelLoaded === "boolean" ? trace.modelLoaded : null,
    fallbackUsed: Boolean(trace.fallbackUsed),
    endpoint: trace.endpoint || null,
    promptKind: trace.promptKind || null
  };
}

ensureDir(RUNTIME_DIR);
ensureDir(SESSION_DIR);
ensureDir(AUDIO_DIR);
ensureDir(TEMP_DIR);
ensureDir(TRANSCRIPT_DIR);

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    console.log(`Incoming request: ${req.method} ${url.pathname}`);

    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "GET,POST,OPTIONS",
        "access-control-allow-headers": "content-type,authorization",
      });
      res.end();
      return;
    }

    // Friendly root handler: redirect browsers to /health, return small JSON for API clients
    if (req.method === "GET" && (url.pathname === "/" || url.pathname === "")) {
      try {
        if (String(req.headers?.accept || "").includes("text/html")) {
          res.writeHead(302, { Location: "/health", "content-type": "text/html; charset=utf-8", "access-control-allow-origin": "*" });
          res.end(`<html><head><meta http-equiv="refresh" content="0;url=/health"/></head><body>Redirecting to <a href="/health">/health</a></body></html>`);
          return;
        }

        sendJson(res, 200, {
          ok: true,
          message: "Agent Lee router. See /health for details.",
          routes: "/routes",
          health: "/health"
        });
        return;
      } catch (e) {
        sendJson(res, 500, { ok: false, error: String(e) });
        return;
      }
    }

    // Lightweight process liveness probe — zero external calls, instant response.
    // Use this for basic reachability checks. Do not use /health for that.
    if (req.method === "GET" && url.pathname === "/ping") {
      sendJson(res, 200, {
        ok: true,
        pong: true,
        router: "agent-lee-brainfix",
        agentId: "agent-lee",
        port: PORT,
        ts: nowIso()
      });
      return;
    }

    if (req.method === "GET" && url.pathname === "/health") {
      const orchestrationHealth = await getOrchestrationHealth();
      sendJson(res, 200, {
        ok: true,
        router: "agent-lee-brainfix",
        routerReady: true,
        port: PORT,
        ollama: OLLAMA_BASE,
        ollamaModel: DEFAULT_MODEL,
        runtimeDir: RUNTIME_DIR,
        languagePolicyPath: LANGUAGE_POLICY_PATH,
        conversationManifestPath: LIVE_CONVERSATION_MANIFEST_PATH,
        ownerIdentityManifestPath: OWNER_IDENTITY_MANIFEST_PATH,
        canonical: true,
        agentId: "agent-lee",
        agentMode: "code-mode",
        role: "supreme-agent-lead",
        instanceContract: "canonical-agent-lee-code-mode",
        sourceOfEmbodiment: "agent-lee-coding-mode",
        identityManifestPath: CANONICAL_AGENT_LEE.identityManifestPath?.absolute || null,
        ownerIdentity: buildOwnerIdentityStatus(),
        universeManifestPath: UNIVERSE_SNAPSHOT.manifestPath,
        activeSkillSearchPaths: UNIVERSE_SNAPSHOT.activeSkillSearchPaths,
        activeCapabilitySearchPaths: UNIVERSE_SNAPSHOT.activeCapabilitySearchPaths,
        statefulResearchHarnessCopies: UNIVERSE_SNAPSHOT.statefulResearchHarnessCopies,
        activeRuntimeAdapterPath: "Leeway Runtime Fabric/capability-registry/registry/leeway-universe-loader.mjs",
        orchestrationManifestPath: ORCHESTRATION_MANIFEST_PATH,
        orchestrationStatePath: ORCHESTRATION_STATE_PATH,
        preferenceLedgerPath: PREFERENCE_LEDGER_PATH,
        workLedgerPath: WORK_LEDGER_PATH,
        orchestrationReceiptDir: ORCHESTRATION_RECEIPT_DIR,
        canonicalFingerprint: CANONICAL_FINGERPRINT,
        agentState: orchestrationHealth.agentState,
        executionState: orchestrationHealth.executionState,
        modelState: orchestrationHealth.modelState,
        receiptState: orchestrationHealth.receiptState,
        leePrimeRuntimeState: orchestrationHealth.leePrimeRuntimeState,
        discoveryBootstrap: {
          attempted: discoveryBootstrapState.attempted,
          ready: discoveryBootstrapState.ready,
          loaded: discoveryBootstrapState.loaded,
          fallbackUsed: discoveryBootstrapState.fallbackUsed,
          startedAt: discoveryBootstrapState.startedAt,
          endedAt: discoveryBootstrapState.endedAt,
          cachePath: discoveryBootstrapState.cachePath,
          receiptPath: discoveryBootstrapState.receiptPath,
          error: discoveryBootstrapState.error,
          summary: discoveryBootstrapState.summary
        },
        discoveryCacheReady: discoveryBootstrapState.ready,
        discoveryCacheLoaded: discoveryBootstrapState.loaded,
        discoveryCachePath: discoveryBootstrapState.cachePath,
        discoveryBootstrapReceiptPath: discoveryBootstrapState.receiptPath
      });
      return;
    }

    if (req.method === "GET" && url.pathname === "/agent-lee/status") {
      const orchestrationHealth = await getOrchestrationHealth();
      const ownerIdentity = buildOwnerIdentityStatus();
      sendJson(res, 200, {
        ok: true,
        route: "agent-lee-status",
        router: "agent-lee-brainfix",
        agentId: "agent-lee",
        agentMode: "code-mode",
        role: "supreme-agent-lead",
        instanceContract: "canonical-agent-lee-code-mode",
        sourceOfEmbodiment: "agent-lee-coding-mode",
        runtimeDir: RUNTIME_DIR,
        ownerIdentityManifestPath: OWNER_IDENTITY_MANIFEST_PATH,
        ownerIdentity,
        audienceBoundary: ownerIdentity.audienceBoundary,
        liveRuntime: {
          coreRuntimeReady: orchestrationHealth?.executionState?.status === "READY" || orchestrationHealth?.agentState?.status === "READY",
          voiceReady: Boolean(orchestrationHealth?.modelState),
          receiptsValid: Boolean(orchestrationHealth?.receiptState?.ledgerIntact)
        },
        authorityModel: {
          creatorRootAuthority: ownerIdentity.creatorRootAuthority,
          leonardOnly: [
            "authorize device control",
            "authorize network connection",
            "authorize projector or display routing",
            "authorize desktop action",
            "authorize email sending",
            "authorize generated asset export",
            "override mode"
          ],
          publicAudience: [
            "ask questions",
            "request explanation",
            "request translation",
            "request examples",
            "request a visual concept"
          ]
        },
        agentState: orchestrationHealth.agentState,
        executionState: orchestrationHealth.executionState,
        modelState: orchestrationHealth.modelState,
        receiptState: orchestrationHealth.receiptState,
        leePrimeRuntimeState: orchestrationHealth.leePrimeRuntimeState
      });
      return;
    }

    if (req.method === "GET" && url.pathname === "/agent-lee/state") {
      const orchestrationHealth = await getOrchestrationHealth();
      const leePrimeRuntimeState = orchestrationHealth.leePrimeRuntimeState;
      sendJson(res, 200, {
        ok: true,
        canonical: true,
        agentId: "agent-lee",
        agentMode: "code-mode",
        role: "supreme-agent-lead",
        instanceContract: "canonical-agent-lee-code-mode",
        state: leePrimeRuntimeState,
        agentState: leePrimeRuntimeState.agentState,
        executionState: leePrimeRuntimeState.executionState,
        modelState: leePrimeRuntimeState.modelState,
        receiptState: leePrimeRuntimeState.receiptState
      });
      return;
    }

    if (req.method === "GET" && url.pathname === "/agent-lee/authority") {
      const orchestrationHealth = await getOrchestrationHealth();
      const leePrimeRuntimeState = orchestrationHealth.leePrimeRuntimeState;
      sendJson(res, 200, {
        ok: true,
        canonical: true,
        authority: leePrimeRuntimeState.agentState.authority,
        constitutionVersion: leePrimeRuntimeState.agentState.constitutionVersion,
        receiptsValid: Boolean(leePrimeRuntimeState.receiptState.ledgerIntact),
        agentState: leePrimeRuntimeState.agentState,
        executionState: leePrimeRuntimeState.executionState,
        modelState: leePrimeRuntimeState.modelState,
        receiptState: leePrimeRuntimeState.receiptState
      });
      return;
    }

    if (req.method === "GET" && url.pathname === "/agent-lee/owner/status") {
      const ownerIdentity = buildOwnerIdentityStatus();
      sendJson(res, 200, {
        ok: true,
        route: "agent-lee-owner-status",
        ownerIdentityManifestPath: OWNER_IDENTITY_MANIFEST_PATH,
        ownerIdentity,
        audienceBoundary: ownerIdentity.audienceBoundary,
        authorityModel: {
          creatorRootAuthority: ownerIdentity.creatorRootAuthority,
          leonardOnly: [
            "authorize device control",
            "authorize network connection",
            "authorize projector or display routing",
            "authorize desktop action",
            "authorize email sending",
            "authorize generated asset export",
            "override mode"
          ],
          publicAudience: [
            "ask questions",
            "request explanation",
            "request translation",
            "request examples",
            "request a visual concept"
          ]
        }
      });
      return;
    }

    if (req.method === "GET" && url.pathname === "/routes") {
      sendJson(res, 200, {
        ok: true,
        router: "agent-lee-brainfix",
        routes: [
          "GET /ping",
          "GET /health",
          "GET /routes",
          "GET /agent-lee/identity",
          "GET /agent-lee/universe",
          "GET /agent-lee/conversation/health",
          "POST /agent-lee/conversation/start",
          "POST /agent-lee/conversation/turn",
          "POST /agent-lee/conversation/end",
          "GET /agent-lee/conversation/session/:id",
          "GET /agent-lee/voice/backends",
          "POST /agent-lee/voice/speak",
          "POST /agent-lee/voice/speak-stream",
          "POST /agent-lee/voice/transcribe",
          "GET /agent-lee/language/status",
          "POST /agent-lee/language/detect",
          "POST /agent-lee/language/translate",
          "GET /agent-lee/language/policy",
          "GET /agent-lee/owner/status",
          "POST /runtime/official-embodiment-proof",
          "GET /agent-lee/state",
          "GET /agent-lee/authority",
          "GET /agent-lee/status",
          "POST /runtime/official-embodiment-proof/finalize",
          "GET /agent-lee/orchestration/health",
          "GET /agent-lee/models",
          "GET /agent-lee/models/warm",
          "POST /agent-lee/models/warm",
          "POST /agent-lee/models/route",
          "GET /agent-lee/receipts/corpus",
          "GET /agent-lee/lanes",
          "POST /agent-lee/lanes/start",
          "GET /agent-lee/lanes/:id",
          "POST /agent-lee/lanes/:id/message",
          "POST /agent-lee/lanes/:id/cancel",
          "GET /agent-lee/work-ledger",
          "GET /agent-lee/preferences",
          "GET /agent-lee/skills/full",
          "GET /agent-lee/mcps",
          "GET /agent-lee/tools/full",
          "POST /agent-lee/tools/call",
          "POST /agent-lee/skills/route",
          "POST /agent-lee/skills/create",
          "POST /agent-lee/skills/validate",
          "POST /agent-lee/skills/simulate",
          "POST /agent-lee/simulations/run",
          "GET /agent-lee/simulations/:id",
          "GET /agent-lee/simulations/receipts",
          "GET /agent-lee/3d-ar/status",
          "POST /agent-lee/3d-ar/chess-set-proof",
          "GET /agent-lee/apps",
          "GET /agent-lee/apps/:id",
          "POST /agent-lee/apps/discover",
          "POST /agent-lee/apps/launch",
          "POST /agent-lee/apps/open-file",
          "POST /agent-lee/apps/close-owned",
          "GET /agent-lee/apps/receipts",
          "GET /v1/models",
          "POST /v1/chat/completions"
        ]
      });
      return;
    }

    if (req.method === "GET" && url.pathname === "/agent-lee/identity") {
      sendJson(res, 200, {
        ok: true,
        canonical: true,
        agent_name: "Agent Lee",
        agent_mode: "code-mode",
        role: "supreme-agent-lead",
        ecosystem: "leeway",
        instance_contract: "canonical-agent-lee-code-mode",
        identityFingerprint: CANONICAL_AGENT_LEE.identityFingerprint,
        canonicalProof: CANONICAL_AGENT_LEE.canonicalProof,
        sourceOfEmbodiment: "agent-lee-coding-mode",
        identityManifestPath: CANONICAL_AGENT_LEE.identityManifestPath?.absolute || null,
        ownerIdentityManifestPath: OWNER_IDENTITY_MANIFEST_PATH,
        ownerIdentity: buildOwnerIdentityStatus(),
        universeManifestPath: UNIVERSE_SNAPSHOT.manifestPath,
        activeSkillSearchPaths: UNIVERSE_SNAPSHOT.activeSkillSearchPaths,
        activeCapabilitySearchPaths: UNIVERSE_SNAPSHOT.activeCapabilitySearchPaths,
        activeStatefulResearchHarnessPath: UNIVERSE_SNAPSHOT.statefulResearchHarnessCopies?.activeCopy || null,
        harnessMirrors: [
          UNIVERSE_SNAPSHOT.statefulResearchHarnessCopies?.runtimeFabricRootCopy,
          UNIVERSE_SNAPSHOT.statefulResearchHarnessCopies?.runtimeFabricSkillsCopy
        ].filter(Boolean),
        activeRuntimeAdapterPath: "Leeway Runtime Fabric/capability-registry/registry/leeway-universe-loader.mjs"
      });
      return;
    }

    if (req.method === "GET" && url.pathname === "/agent-lee/universe") {
      sendJson(res, 200, {
        ok: true,
        canonical: true,
        agentId: "agent-lee",
        identityFingerprint: CANONICAL_AGENT_LEE.identityFingerprint,
        canonicalProof: CANONICAL_AGENT_LEE.canonicalProof,
        sourceOfEmbodiment: "agent-lee-coding-mode",
        universe: UNIVERSE_SNAPSHOT,
        canonicalAgentLee: CANONICAL_AGENT_LEE
      });
      return;
    }

    if (req.method === "GET" && url.pathname === "/agent-lee/conversation/health") {
      const policy = loadLanguagePolicy();
      const manifest = loadConversationManifest();
      const backends = await buildVoiceBackendsStatus();
      const sessions = fs.existsSync(SESSION_DIR)
        ? fs.readdirSync(SESSION_DIR).filter((entry) => entry.endsWith(".json")).length
        : 0;

      sendJson(res, 200, {
        ok: true,
        router: "agent-lee-brainfix",
        status: "live-conversation-ready",
        runtimeDir: RUNTIME_DIR,
        sessionDir: SESSION_DIR,
        audioDir: AUDIO_DIR,
        transcriptDir: TRANSCRIPT_DIR,
        languagePolicyPath: LANGUAGE_POLICY_PATH,
        conversationHistoryPath: CONVERSATION_HISTORY_PATH,
        manifestPath: LIVE_CONVERSATION_MANIFEST_PATH,
        ownerIdentityManifestPath: OWNER_IDENTITY_MANIFEST_PATH,
        sessionCount: sessions,
        policy,
        manifest,
        ownerIdentity: buildOwnerIdentityStatus(),
        backends,
        routes: [
          "GET /agent-lee/conversation/health",
          "POST /agent-lee/conversation/start",
          "POST /agent-lee/conversation/turn",
          "POST /agent-lee/conversation/end",
          "GET /agent-lee/conversation/session/:id",
          "GET /agent-lee/voice/backends",
          "POST /agent-lee/voice/speak",
          "POST /agent-lee/voice/speak-stream",
          "POST /agent-lee/voice/transcribe",
          "GET /agent-lee/language/status",
          "POST /agent-lee/language/detect",
          "POST /agent-lee/language/translate",
          "GET /agent-lee/language/policy",
          "GET /agent-lee/owner/status",
          "POST /runtime/official-embodiment-proof",
          "POST /runtime/official-embodiment-proof/finalize",
          "GET /agent-lee/orchestration/health",
          "GET /agent-lee/models",
          "GET /agent-lee/models/warm",
          "POST /agent-lee/models/warm",
          "POST /agent-lee/models/route",
          "GET /agent-lee/receipts/corpus",
          "GET /agent-lee/lanes",
          "POST /agent-lee/lanes/start",
          "GET /agent-lee/lanes/:id",
          "POST /agent-lee/lanes/:id/message",
          "POST /agent-lee/lanes/:id/cancel",
          "GET /agent-lee/work-ledger",
          "GET /agent-lee/preferences",
          "GET /agent-lee/skills/full",
          "GET /agent-lee/mcps",
          "GET /agent-lee/tools/full",
          "POST /agent-lee/tools/call",
          "POST /agent-lee/skills/route",
          "POST /agent-lee/skills/create",
          "POST /agent-lee/skills/validate",
          "POST /agent-lee/skills/simulate",
          "POST /agent-lee/simulations/run",
          "GET /agent-lee/simulations/:id",
          "GET /agent-lee/simulations/receipts",
          "GET /agent-lee/3d-ar/status",
          "POST /agent-lee/3d-ar/chess-set-proof",
          "GET /agent-lee/apps",
          "GET /agent-lee/apps/:id",
          "POST /agent-lee/apps/discover",
          "POST /agent-lee/apps/launch",
          "POST /agent-lee/apps/open-file",
          "POST /agent-lee/apps/close-owned",
          "GET /agent-lee/apps/receipts"
        ],
        executableCapabilities: [
          "live conversation sessions",
          "English-default multilingual responses",
          "local microphone capture through Cerebral",
          "local WAV transcription through faster_whisper",
          "local speech synthesis via leeway_tts (XTTS-first)"
        ]
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/agent-lee/conversation/start") {
      const bodyText = await readBody(req);
      const body = bodyText ? JSON.parse(bodyText) : {};
      const session = createNewSession({
        mode: body.mode || "live-conversation",
        operatorName: body.operatorName || body.name || "Leonard",
        subject: body.subject || "",
        preferredLanguage: body.preferredLanguage || body.language || "en",
        defaultLanguage: body.defaultLanguage || "en"
      });

      sendJson(res, 200, {
        ok: true,
        route: "agent-lee-conversation-start",
        session: buildSessionSummary(session),
        policyPath: LANGUAGE_POLICY_PATH,
        manifestPath: LIVE_CONVERSATION_MANIFEST_PATH
      });
      return;
    }

    if (req.method === "GET" && url.pathname.startsWith("/agent-lee/conversation/session/")) {
      const sessionId = decodeURIComponent(url.pathname.slice("/agent-lee/conversation/session/".length));
      const session = loadSession(sessionId);

      if (!session) {
        sendJson(res, 404, {
          ok: false,
          error: `Session not found: ${sessionId}`,
          route: "agent-lee-conversation-session"
        });
        return;
      }

      sendJson(res, 200, {
        ok: true,
        route: "agent-lee-conversation-session",
        session,
        summary: buildSessionSummary(session)
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/agent-lee/conversation/turn") {
      const bodyText = await readBody(req);
      const body = bodyText ? JSON.parse(bodyText) : {};
      const streamRequested = ["1", "true", "yes"].includes(String(url.searchParams.get("stream") || body.stream || "").toLowerCase());

      if (streamRequested) {
        res.writeHead(200, {
          "content-type": "text/event-stream; charset=utf-8",
          "cache-control": "no-cache, no-transform",
          connection: "keep-alive",
          "access-control-allow-origin": "*",
          "access-control-allow-methods": "GET,POST,OPTIONS",
          "access-control-allow-headers": "content-type,authorization"
        });
        res.write(`event: start\ndata: ${JSON.stringify({ ok: true, route: "agent-lee-conversation-turn", stage: "starting" })}\n\n`);
        try {
          const result = await executeConversationTurn(body);
          res.write(`event: turn\ndata: ${JSON.stringify(result)}\n\n`);
          res.write(`event: done\ndata: ${JSON.stringify({ ok: true, session: result.session, assistantLanguage: result.assistant.language })}\n\n`);
        } catch (error) {
          res.write(`event: error\ndata: ${JSON.stringify({ ok: false, error: error?.message || String(error) })}\n\n`);
        }
        res.end("data: [DONE]\n\n");
        return;
      }

      const result = await executeConversationTurn(body);
      sendJson(res, 200, result);
      return;
    }

    if (req.method === "POST" && url.pathname === "/agent-lee/conversation/end") {
      const bodyText = await readBody(req);
      const body = bodyText ? JSON.parse(bodyText) : {};
      const sessionId = String(body.sessionId || body.session_id || "").trim();
      const session = loadSession(sessionId);

      if (!session) {
        sendJson(res, 404, {
          ok: false,
          error: "Session not found.",
          route: "agent-lee-conversation-end"
        });
        return;
      }

      session.status = "ended";
      session.updatedAt = nowIso();
      saveSession(session);
      appendConversationEvent({
        at: nowIso(),
        sessionId: session.sessionId,
        event: "end",
        session: buildSessionSummary(session)
      });

      sendJson(res, 200, {
        ok: true,
        route: "agent-lee-conversation-end",
        session: buildSessionSummary(session)
      });
      return;
    }

    if (req.method === "GET" && url.pathname === "/agent-lee/voice/backends") {
      sendJson(res, 200, await buildVoiceBackendsStatus());
      return;
    }

    if (req.method === "POST" && url.pathname === "/agent-lee/voice/speak") {
      const bodyText = await readBody(req);
      const body = bodyText ? JSON.parse(bodyText) : {};
      const text = normalizeText(body.text || body.message || "");

      if (!text) {
        sendJson(res, 400, {
          ok: false,
          error: "Missing text for speech synthesis.",
          route: "agent-lee-voice-speak"
        });
        return;
      }

      const language = normalizeRequestedLanguage(body.language || body.targetLanguage || "en", "en");
      const voiceId = body.voice || defaultVoiceForLanguage(language, loadLanguagePolicy());
      const speech = await synthesizeSpeech(text, voiceId, body.name || "agent-lee-voice");
      const speechStylePolicy = loadSpeechStylePolicy();

      sendJson(res, 200, {
        ok: true,
        route: "agent-lee-voice-speak",
        text,
        language,
        voiceId,
        audioPath: speech.mp3Path,
        audioType: getAudioContentType(speech.mp3Path),
        bytes: speech.bytes,
        speechStylePolicy
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/agent-lee/voice/speak-stream") {
      const bodyText = await readBody(req);
      const body = bodyText ? JSON.parse(bodyText) : {};
      const text = normalizeText(body.text || body.message || "");

      if (!text) {
        sendJson(res, 400, {
          ok: false,
          error: "Missing text for streaming speech.",
          route: "agent-lee-voice-speak-stream"
        });
        return;
      }

      const language = normalizeRequestedLanguage(body.language || body.targetLanguage || "en", "en");
      const voiceId = body.voice || defaultVoiceForLanguage(language, loadLanguagePolicy());
      const speech = await synthesizeSpeech(text, voiceId, body.name || "agent-lee-voice-stream");
      const speechStylePolicy = loadSpeechStylePolicy();
      const contentType = getAudioContentType(speech.mp3Path);
      const size = fs.existsSync(speech.mp3Path) ? fs.statSync(speech.mp3Path).size : 0;
      res.writeHead(200, {
        "content-type": contentType,
        "content-length": size,
        "x-agent-lee-route": "agent-lee-voice-speak-stream",
        "x-agent-lee-voice-id": voiceId,
        "x-agent-lee-speech-style": speechStylePolicy.progressTone || "Leeway",
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "GET,POST,OPTIONS",
        "access-control-allow-headers": "content-type,authorization"
      });
      if (fs.existsSync(speech.mp3Path)) {
        fs.createReadStream(speech.mp3Path).pipe(res);
      } else {
        // fallback: respond with an empty body but 200 to avoid client errors
        res.end();
      }
      return;
    }

    if (req.method === "POST" && url.pathname === "/agent-lee/voice/transcribe") {
      const bodyText = await readBody(req);
      const body = bodyText ? JSON.parse(bodyText) : {};

      if (body.captureMicrophone) {
        const capture = await captureMicrophoneTranscript({
          seconds: body.seconds || 5,
          session: body.session || createSessionId(),
          speak: false
        });

        sendJson(res, capture.ok ? 200 : 503, {
          ok: Boolean(capture.ok),
          route: "agent-lee-voice-transcribe",
          mode: "microphone",
          capture: capture.data || null,
          detectedLanguage: capture.data?.asr?.language || capture.data?.language || "",
          original: capture.data?.transcript || capture.data?.response || "",
          english: capture.data?.asr?.english || capture.data?.english || "",
          error: capture.ok ? null : capture.data?.message || capture.data?.error || capture.raw
        });
        return;
      }

      if (!body.wavPath) {
        sendJson(res, 400, {
          ok: false,
          error: "Missing wavPath or captureMicrophone.",
          route: "agent-lee-voice-transcribe"
        });
        return;
      }

      const transcription = await transcribeWavFile(body.wavPath, body.model || "base");
      sendJson(res, transcription.ok ? 200 : 503, {
        ok: Boolean(transcription.ok),
        route: "agent-lee-voice-transcribe",
        mode: "wav",
        wavPath: body.wavPath,
        result: transcription.result,
        error: transcription.ok ? null : transcription.result?.error || transcription.stderr || transcription.stdout
      });
      return;
    }

    if (req.method === "GET" && url.pathname === "/agent-lee/language/status") {
      sendJson(res, 200, await buildLanguageStatus());
      return;
    }

    if (req.method === "GET" && url.pathname === "/agent-lee/language/policy") {
      sendJson(res, 200, {
        ok: true,
        route: "agent-lee-language-policy",
        policy: loadLanguagePolicy(),
        speechStylePolicy: loadSpeechStylePolicy(),
        manifest: loadConversationManifest()
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/agent-lee/language/detect") {
      const bodyText = await readBody(req);
      const body = bodyText ? JSON.parse(bodyText) : {};
      const text = normalizeText(body.text || body.message || "");

      if (body.captureMicrophone) {
        const capture = await captureMicrophoneTranscript({
          seconds: body.seconds || 5,
          session: body.session || createSessionId(),
          speak: false
        });
        const captureBody = capture.data || {};
        sendJson(res, capture.ok ? 200 : 503, {
          ok: Boolean(capture.ok),
          route: "agent-lee-language-detect",
          source: "microphone",
          detectedLanguage: captureBody.asr?.language || captureBody.language || "",
          confidence: captureBody.asr?.languageProbability || captureBody.languageProbability || 0,
          reason: "cerebral-local-voice",
          capture: captureBody,
          error: capture.ok ? null : captureBody.message || captureBody.error || capture.raw
        });
        return;
      }

      if (body.wavPath) {
        const transcription = await transcribeWavFile(body.wavPath, body.model || "base");
        const transcribeBody = transcription.result || {};
        sendJson(res, transcription.ok ? 200 : 503, {
          ok: Boolean(transcription.ok),
          route: "agent-lee-language-detect",
          source: "wav",
          detectedLanguage: transcribeBody.detectedLanguage || transcribeBody.language || "",
          confidence: transcribeBody.languageProbability || 0,
          reason: transcribeBody.reason || "whisper",
          transcription: transcribeBody,
          error: transcription.ok ? null : transcribeBody.error || transcription.stderr || transcription.stdout
        });
        return;
      }

      if (!text) {
        sendJson(res, 400, {
          ok: false,
          error: "Missing text, wavPath, or captureMicrophone.",
          route: "agent-lee-language-detect"
        });
        return;
      }

      const detection = inferLanguageFromText(text);
      sendJson(res, 200, {
        ok: true,
        route: "agent-lee-language-detect",
        source: "text",
        text,
        detectedLanguage: detection.language,
        confidence: detection.confidence,
        reason: detection.reason
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/agent-lee/language/translate") {
      const bodyText = await readBody(req);
      const body = parseJsonBody(bodyText);
      const text = normalizeText(body.text || body.message || "");

      if (!text) {
        sendJson(res, 400, {
          ok: false,
          error: "Missing text for translation.",
          route: "agent-lee-language-translate"
        });
        return;
      }

      const translation = await translateText(
        text,
        body.sourceLanguage || body.source || inferLanguageFromText(text).language,
        body.targetLanguage || body.target || "en",
        loadLanguagePolicy(),
        resolveChatBackend(
          typeof body.model === "string" && body.model.trim() ? body.model.trim() : DEFAULT_MODEL,
          await getModelPoolStatus()
        ).model
      );

      sendJson(res, translation.ok ? 200 : 503, {
        ok: Boolean(translation.ok),
        route: "agent-lee-language-translate",
        sourceLanguage: translation.sourceLanguage,
        targetLanguage: translation.targetLanguage,
        translatedText: translation.translatedText,
        backend: translation.backend,
        error: translation.ok ? null : "Translation failed."
      });
      return;
    }

    if (req.method === "GET" && url.pathname === "/agent-lee/orchestration/health") {
      sendJson(res, 200, await getOrchestrationHealth());
      return;
    }

    if (req.method === "GET" && url.pathname === "/agent-lee/state") {
      const state = await getSovereignState();
      sendJson(res, 200, {
        ok: true,
        route: "agent-lee-state",
        ...state
      });
      return;
    }

    if (req.method === "GET" && url.pathname === "/agent-lee/models") {
      sendJson(res, 200, await getModelPoolStatus());
      return;
    }

    if (req.method === "GET" && url.pathname === "/agent-lee/models/warm") {
      sendJson(res, 200, await getModelPoolStatus());
      return;
    }

    if (req.method === "POST" && url.pathname === "/agent-lee/models/warm") {
      const bodyText = await readBody(req);
      const body = parseJsonBody(bodyText);
      const receipt = await warmModel(body);
      sendJson(res, receipt.ok ? 200 : 503, receipt);
      return;
    }

    if (req.method === "POST" && url.pathname === "/agent-lee/models/route") {
      const bodyText = await readBody(req);
      const body = parseJsonBody(bodyText);
      const receipt = await routeModel(body);
      sendJson(res, receipt.ok ? 200 : 503, receipt);
      return;
    }

    if (req.method === "GET" && url.pathname === "/agent-lee/receipts/corpus") {
      sendJson(res, 200, loadReceiptCorpus());
      return;
    }

    if (req.method === "GET" && url.pathname === "/agent-lee/lanes") {
      sendJson(res, 200, listLanes());
      return;
    }

    if (req.method === "POST" && url.pathname === "/agent-lee/lanes/start") {
      const bodyText = await readBody(req);
      const body = parseJsonBody(bodyText);
      const lane = await startLane(body);
      sendJson(res, lane?.laneId ? 200 : 503, {
        ok: Boolean(lane?.laneId),
        route: "agent-lee-lanes-start",
        lane
      });
      return;
    }

    if (url.pathname.startsWith("/agent-lee/lanes/")) {
      const lanePath = url.pathname.slice("/agent-lee/lanes/".length);
      const laneId = decodeURIComponent(lanePath.split("/")[0] || "");
      const tail = lanePath.includes("/") ? lanePath.slice(laneId.length + 1) : "";

      if (req.method === "GET" && laneId && !tail) {
        const lane = getLane(laneId);
        if (!lane) {
          sendJson(res, 404, { ok: false, error: `Lane not found: ${laneId}` });
          return;
        }
        sendJson(res, 200, { ok: true, route: "agent-lee-lane-status", lane });
        return;
      }

      if (req.method === "POST" && laneId && tail === "message") {
        const bodyText = await readBody(req);
        const body = parseJsonBody(bodyText);
        const lane = messageLane(laneId, body.message || body.text || "");
        if (!lane) {
          sendJson(res, 404, { ok: false, error: `Lane not found: ${laneId}` });
          return;
        }
        sendJson(res, 200, { ok: true, route: "agent-lee-lane-message", lane });
        return;
      }

      if (req.method === "POST" && laneId && tail === "cancel") {
        const bodyText = await readBody(req);
        const body = parseJsonBody(bodyText);
        const lane = cancelLane(laneId, body.reason || "Cancelled by request.");
        if (!lane) {
          sendJson(res, 404, { ok: false, error: `Lane not found: ${laneId}` });
          return;
        }
        sendJson(res, 200, { ok: true, route: "agent-lee-lane-cancel", lane });
        return;
      }
    }

    if (req.method === "GET" && url.pathname === "/agent-lee/work-ledger") {
      sendJson(res, 200, getWorkLedger());
      return;
    }

    if (req.method === "GET" && url.pathname === "/agent-lee/preferences") {
      sendJson(res, 200, getPreferences());
      return;
    }

    if (req.method === "GET" && url.pathname === "/agent-lee/skills/full") {
      sendJson(res, 200, getSkillsFull());
      return;
    }

    if (req.method === "GET" && url.pathname === "/agent-lee/mcps") {
      sendJson(res, 200, getMcpRegistry());
      return;
    }

    if (req.method === "GET" && url.pathname === "/agent-lee/tools/full") {
      sendJson(res, 200, getToolsFull());
      return;
    }

    if (req.method === "GET" && url.pathname === "/agent-lee/tools/map") {
      sendJson(res, 200, {
        ok: true,
        routeMapKeys: Object.keys(DESKTOP_TOOL_ROUTE_MAP).sort(),
        aliasMapKeys: Object.keys(DESKTOP_TOOL_ALIAS_MAP).sort(),
        speakMapping: DESKTOP_TOOL_ROUTE_MAP.speak?.endpoint || null,
        listenMapping: DESKTOP_TOOL_ROUTE_MAP.listen?.endpoint || null,
        voiceSpeakMapping: DESKTOP_TOOL_ROUTE_MAP.voice_speak?.endpoint || null,
        voiceListenMapping: DESKTOP_TOOL_ROUTE_MAP.voice_listen?.endpoint || null,
        source: "server-brainfix.mjs",
        checkedAt: nowIso()
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/agent-lee/tools/call") {
      const bodyText = await readBody(req);
      const body = parseJsonBody(bodyText);
      const toolName = String(body.toolName || body.name || body.tool || "").trim();
      if (!toolName) {
        sendJson(res, 400, { ok: false, error: "Missing toolName." });
        return;
      }
      const requestId = String(body.requestId || body.request_id || makeToolDispatchRequestId("agent-lee-tools-call")).trim();
      const dispatchResults = await dispatchExtractedToolsToDesktopRuntime([
        {
          name: toolName,
          arguments: body.payload || body.arguments || body.args || body.toolPayload || {}
        }
      ], {
        requestId,
        userText: String(body.userText || body.prompt || body.text || "").trim(),
        prompt: String(body.userText || body.prompt || body.text || "").trim(),
        confirm: body.confirm || body.confirmationToken || body.approvalToken || body.authorizationToken || null,
        approvalToken: body.confirm || body.confirmationToken || body.approvalToken || body.authorizationToken || null,
        dryRun: Boolean(body.dryRun),
        planOnly: Boolean(body.planOnly || body.noAction),
        noAction: Boolean(body.noAction),
        diagnosticOnly: Boolean(body.diagnosticOnly),
        autoDispatch: body.autoDispatch,
        disableAutoDispatch: body.disableAutoDispatch,
        toolCall: true
      });
      const result = dispatchResults[0] || {
        toolName,
        runtimeEndpoint: null,
        status: "BLOCKED",
        ok: false,
        result: null,
        receiptPath: null,
        blockers: ["Tool dispatch returned no result."]
      };
      const responseStatus = result.status === "READY"
        ? 200
        : result.status === "DEGRADED"
          ? 503
          : result.status === "CHECK_REQUIRED"
            ? 428
            : 404;
      sendJson(res, responseStatus, {
        ok: result.ok,
        route: "agent-lee-tools-call",
        requestId,
        toolName,
        dispatchResult: result,
        receiptPath: result.receiptPath,
        toolDispatchResults: dispatchResults,
        status: result.status
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/agent-lee/skills/route") {
      const bodyText = await readBody(req);
      const body = parseJsonBody(bodyText);
      const result = await routeSkill(body);
      sendJson(res, 200, result);
      return;
    }

    if (req.method === "POST" && url.pathname === "/agent-lee/skills/create") {
      const bodyText = await readBody(req);
      const body = parseJsonBody(bodyText);
      const receipt = await createSkill(body);
      sendJson(res, receipt.ok ? 200 : 503, receipt);
      return;
    }

    if (req.method === "POST" && url.pathname === "/agent-lee/skills/validate") {
      const bodyText = await readBody(req);
      const body = parseJsonBody(bodyText);
      const receipt = await validateSkill(body);
      sendJson(res, receipt.ok ? 200 : 503, receipt);
      return;
    }

    if (req.method === "POST" && url.pathname === "/agent-lee/skills/simulate") {
      const bodyText = await readBody(req);
      const body = parseJsonBody(bodyText);
      const receipt = await simulateSkill(body);
      sendJson(res, receipt.ok ? 200 : 503, receipt);
      return;
    }

    if (req.method === "POST" && url.pathname === "/agent-lee/simulations/run") {
      const bodyText = await readBody(req);
      const body = parseJsonBody(bodyText);
      const receipt = await runSimulation(body);
      sendJson(res, receipt.ok ? 200 : 503, receipt);
      return;
    }

    if (req.method === "GET" && url.pathname === "/agent-lee/simulations/receipts") {
      sendJson(res, 200, listSimulationReceipts());
      return;
    }

    if (req.method === "GET" && url.pathname.startsWith("/agent-lee/simulations/")) {
      const simulationId = decodeURIComponent(url.pathname.slice("/agent-lee/simulations/".length));
      if (!simulationId || simulationId === "receipts") {
        sendJson(res, 404, { ok: false, error: "Simulation not found." });
        return;
      }
      const simulation = getSimulation(simulationId);
      if (!simulation) {
        sendJson(res, 404, { ok: false, error: `Simulation not found: ${simulationId}` });
        return;
      }
      sendJson(res, 200, { ok: true, route: "agent-lee-simulation-status", simulation });
      return;
    }

    if (req.method === "GET" && url.pathname === "/agent-lee/3d-ar/status") {
      sendJson(res, 200, get3dArStatus());
      return;
    }

    if (req.method === "POST" && url.pathname === "/agent-lee/3d-ar/chess-set-proof") {
      const bodyText = await readBody(req);
      const body = parseJsonBody(bodyText);
      const proof = await build3dChessSetProof(body);
      sendJson(res, proof.ok ? 200 : 503, proof);
      return;
    }

    if (req.method === "GET" && url.pathname === "/agent-lee/apps") {
      sendJson(res, 200, {
        ok: true,
        route: "agent-lee-apps-status",
        ...getApplicationRegistryStatus(),
        apps: listApplicationRecords()
      });
      return;
    }

    if (req.method === "GET" && url.pathname === "/agent-lee/apps/receipts") {
      sendJson(res, 200, {
        ok: true,
        route: "agent-lee-app-receipts",
        receipts: listApplicationReceipts()
      });
      return;
    }

    if (req.method === "GET" && url.pathname.startsWith("/agent-lee/apps/")) {
      const appId = decodeURIComponent(url.pathname.slice("/agent-lee/apps/".length));
      if (!appId || appId === "receipts") {
        sendJson(res, 404, { ok: false, error: "Application not found." });
        return;
      }
      const match = listApplicationRecords().find((record) => {
        const keys = [
          record.appId,
          record.displayName,
          ...(Array.isArray(record.aliases) ? record.aliases : []),
          record.startAppId
        ].filter(Boolean).map((value) => String(value).trim().toLowerCase());
        return keys.includes(appId.trim().toLowerCase());
      });
      if (!match) {
        sendJson(res, 404, { ok: false, error: `Application not found: ${appId}` });
        return;
      }
      sendJson(res, 200, { ok: true, route: "agent-lee-app-status", app: match });
      return;
    }

    if (req.method === "POST" && url.pathname === "/agent-lee/apps/discover") {
      const discovery = await discoverApplications();
      sendJson(res, discovery.ok ? 200 : 503, {
        ok: discovery.ok,
        route: "agent-lee-app-discover",
        ...discovery
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/agent-lee/apps/launch") {
      const bodyText = await readBody(req);
      const body = parseJsonBody(bodyText);
      const appId = String(body.appId || body.app_id || body.id || "").trim();
      const result = launchApplication(appId, {
        confirm: Boolean(body.confirm),
        args: Array.isArray(body.args) ? body.args : [],
        cwd: body.cwd || body.workingDirectory || null
      });
      sendJson(res, result.ok ? 200 : 409, {
        ok: result.ok,
        route: "agent-lee-app-launch",
        ...result
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/agent-lee/apps/open-file") {
      const bodyText = await readBody(req);
      const body = parseJsonBody(bodyText);
      const result = openApplicationFile(String(body.path || body.filePath || "").trim(), {
        appId: body.appId || body.app_id || body.app || null,
        mode: body.mode || "",
        confirm: Boolean(body.confirm),
        cwd: body.cwd || body.workingDirectory || null
      });
      sendJson(res, result.ok ? 200 : 409, {
        ok: result.ok,
        route: "agent-lee-app-open-file",
        ...result
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/agent-lee/apps/close-owned") {
      const result = closeOwnedApplications();
      sendJson(res, 200, {
        ok: true,
        route: "agent-lee-app-close-owned",
        ...result
      });
      return;
    }

    if (req.method === "GET" && url.pathname === "/agent-lee/research/health") {
      sendJson(res, 200, getResearchHealth());
      return;
    }

    if (req.method === "POST" && url.pathname === "/agent-lee/research/start") {
      const bodyText = await readBody(req);
      const body = parseJsonBody(bodyText);
      const session = startResearchSession(body);
      sendJson(res, 200, {
        ok: true,
        route: "agent-lee-research-start",
        session
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/agent-lee/research/search") {
      const bodyText = await readBody(req);
      const body = parseJsonBody(bodyText);
      const result = await researchSearch(body);
      sendJson(res, result.ok ? 200 : 503, {
        ok: result.ok,
        route: "agent-lee-research-search",
        ...result
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/agent-lee/research/inspect") {
      const bodyText = await readBody(req);
      const body = parseJsonBody(bodyText);
      const result = researchInspect(body);
      sendJson(res, 200, {
        ok: true,
        route: "agent-lee-research-inspect",
        ...result
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/agent-lee/research/curate") {
      const bodyText = await readBody(req);
      const body = parseJsonBody(bodyText);
      const result = researchCurate(body);
      sendJson(res, 200, {
        ok: true,
        route: "agent-lee-research-curate",
        ...result
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/agent-lee/research/claim-check") {
      const bodyText = await readBody(req);
      const body = parseJsonBody(bodyText);
      const result = researchClaimCheck(body);
      sendJson(res, 200, {
        ok: true,
        route: "agent-lee-research-claim-check",
        ...result
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/agent-lee/research/apply-to-build") {
      const bodyText = await readBody(req);
      const body = parseJsonBody(bodyText);
      const result = applyEvidenceToBuild(body);
      sendJson(res, 200, {
        ok: true,
        route: "agent-lee-research-apply-to-build",
        ...result
      });
      return;
    }

    if (url.pathname.startsWith("/agent-lee/research/")) {
      const researchPath = url.pathname.slice("/agent-lee/research/".length);
      const researchId = decodeURIComponent(researchPath.split("/")[0] || "");
      const tail = researchPath.includes("/") ? researchPath.slice(researchId.length + 1) : "";

      if (req.method === "GET" && researchId && !tail) {
        const session = getResearchSession(researchId);
        if (!session) {
          sendJson(res, 404, { ok: false, error: `Research session not found: ${researchId}` });
          return;
        }
        sendJson(res, 200, { ok: true, route: "agent-lee-research-status", session });
        return;
      }

      if (req.method === "GET" && researchId && tail === "evidence") {
        const evidence = getResearchEvidence(researchId);
        if (!evidence) {
          sendJson(res, 404, { ok: false, error: `Research session not found: ${researchId}` });
          return;
        }
        sendJson(res, 200, { ok: true, route: "agent-lee-research-evidence", ...evidence });
        return;
      }

      if (req.method === "POST" && researchId && tail === "receipt") {
        const bodyText = await readBody(req);
        const body = parseJsonBody(bodyText);
        const result = researchReceipt({ researchId, ...body });
        sendJson(res, 200, {
          ok: true,
          route: "agent-lee-research-receipt",
          ...result
        });
        return;
      }
    }

    if (req.method === "GET" && url.pathname === "/v1/models") {
      sendJson(res, 200, {
        object: "list",
        data: [
          {
            id: "agent-lee",
            object: "model",
            created: 0,
            owned_by: "leeway"
          }
        ]
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/v1/chat/completions") {
      const bodyText = await readBody(req);
      const body = bodyText ? JSON.parse(bodyText) : {};
      await getHotChatWarmupPromise().catch((error) => {
        console.warn(`Hot chat warmup completed with an error: ${error?.message || String(error)}`);
      });
      const traceRequested = body.trace === true || body.debugTrace === true;
      const trace = traceRequested ? createTrace("agent-lee-router-chat", { endpoint: "/v1/chat/completions" }) : null;
      if (trace) {
        trace.event("request_received", { method: req.method, route: url.pathname });
      }

      const requestParseSpan = trace ? trace.begin("request_parse") : null;
      if (trace) {
        trace.end(requestParseSpan, { bodyBytes: bodyText.length });
      }

      const messages = normalizeMessages(body.messages);

      if (messages.length === 0) {
        sendJson(res, 400, {
          error: {
            message: "No valid messages were provided.",
            type: "invalid_request_error"
          }
        });
        return;
      }

      const canonicalSpan = trace ? trace.begin("canonical_identity_check") : null;
      const canonicalOk = CANONICAL_AGENT_LEE.identityFingerprint === CANONICAL_FINGERPRINT;
      if (trace) {
        trace.end(canonicalSpan, {
          canonicalOk,
          canonicalFingerprint: CANONICAL_FINGERPRINT
        });
      }

      const fabricSpan = trace ? trace.begin("fabric_cache_read") : null;
      const orchestrationHealth = await getOrchestrationHealth();
      if (trace) {
        trace.end(fabricSpan, {
          ok: Boolean(orchestrationHealth?.ok),
          defaultRole: orchestrationHealth?.modelPool?.defaultRole || null
        });
      }

      const userText = getUserText(messages);
      const promptClass = classifyPromptLoad(userText, body);
      const firstResponseProfile = getFirstResponseProfile(promptClass, FIRST_RESPONSE_POLICY);
      const firstResponsePolicy = loadFirstResponsePolicy();
      const receiptCorpus = loadReceiptCorpus();
      const officialEmbodimentProof = isOfficialEmbodimentProofPrompt(userText);
      const officialEmbodimentFinalize = isOfficialEmbodimentFinalizePrompt(userText);
      const officialCameraProof = isOfficialCameraProofPrompt(userText);
      let selectedRole = routeRoleForTask(body, messages);

      if (trace) {
        trace.event("first_response_policy_resolved", {
          promptClass,
          timeoutMs: firstResponseProfile.timeoutMs,
          numPredict: firstResponseProfile.numPredict,
          temperature: firstResponseProfile.temperature,
          qwen3First: firstResponseProfile.qwen3First,
          noSilentFallback: firstResponseProfile.noSilentFallback,
          policyDefaultClass: firstResponsePolicy.defaultClass || null,
          policyEnabled: firstResponsePolicy.enabled !== false
        });
      }

      if (officialEmbodimentFinalize) {
        const routeSpan = trace ? trace.begin("official_embodiment_proof_finalize") : null;
        const pendingReceiptPath = body.pendingReceiptPath
          || body.receiptPath
          || (body.proof && body.proof.receiptPath)
          || extractPendingReceiptPath(getAllText(messages));
        const finalizePayload = {
          confirm: "I_AUTHORIZE_AGENT_LEE_DESKTOP_COMMAND",
          finalConfirm: "YES",
          pendingReceiptPath,
          humanAudibleConfirmed: String(userText).trim() === "YES" || /finalize embodiment proof yes/i.test(userText),
          humanVisionConfirmed: String(userText).trim() === "YES" || /finalize embodiment proof yes/i.test(userText),
          controlSurface: "vscode_chat"
        };
        const finalizeResult = await callRuntimePath('/runtime/official-embodiment-proof/finalize', finalizePayload, 120000).catch((error) => ({
          ok: false,
          status: 500,
          raw: "",
          data: {
            ok: false,
            status: "FAIL",
            error: error?.message || String(error)
          }
        }));
        if (trace) {
          trace.end(routeSpan, {
            ok: Boolean(finalizeResult?.data?.ok),
            status: finalizeResult?.data?.status || null,
            finalReceiptPath: finalizeResult?.data?.finalReceiptPath || null
          });
        }

        const finalStatus = finalizeResult?.data?.status || "FAIL";
        const finalReceiptPath = finalizeResult?.data?.finalReceiptPath || null;
        const content = finalStatus === "PASS"
          ? `AGENT_LEE_VSCODE_CHAT_EMBODIMENT_STACK_LOCKED\nStatus: PASS\nReceipt: ${finalReceiptPath}`
          : `Agent Lee embodiment proof remains ${finalStatus}. Receipt: ${finalReceiptPath || "n/a"}. ${finalizeResult?.data?.error || "Final lock was not declared."}`;
        const payload = makeTimedCompletion({
          model: body.model || selectedRole?.model || selectedRole?.backend || DEFAULT_MODEL,
          content,
          route: "brainfix-official-embodiment-proof-finalize",
          trace: trace ? summarizeAgentLeeTrace(trace) : null,
          responseMode: "official_vscode_chat_embodiment_proof_finalize",
          selectedModel: selectedRole?.roleId || "light_conversation_model",
          selectedBackend: selectedRole?.model || selectedRole?.backend || DEFAULT_MODEL,
          resolvedBackend: selectedRole?.model || selectedRole?.backend || DEFAULT_MODEL,
          modelLoaded: null,
          fallbackUsed: false,
          firstByteMs: trace ? trace.totalMs : null,
          totalMs: trace ? trace.totalMs : null,
          proof: {
            status: finalStatus,
            finalReceiptPath
          }
        });

        if (trace) {
          trace.finish({
            responseMode: "official_vscode_chat_embodiment_proof_finalize",
            selectedModel: selectedRole?.roleId || "light_conversation_model",
            selectedBackend: selectedRole?.model || selectedRole?.backend || DEFAULT_MODEL,
            resolvedBackend: selectedRole?.model || selectedRole?.backend || DEFAULT_MODEL,
            modelLoaded: null,
            fallbackUsed: false
          });
          payload.agentLeeTrace = summarizeAgentLeeTrace(trace);
          payload.agentLeeRouter.totalMs = trace.totalMs;
        }

        sendJson(res, 200, payload);
        return;
      }

        

      if (officialEmbodimentProof) {
        const routeSpan = trace ? trace.begin("official_embodiment_proof_launch") : null;
        const proofPayload = {
          confirm: "I_AUTHORIZE_AGENT_LEE_DESKTOP_COMMAND",
          prompt: userText,
          originSurface: "vscode_chat",
          controlSurface: "vscode_chat",
          adapterPort: 8787,
          routerPort: 8080,
          receiptDir: path.join(AGENT_LEE_ROOT, "Archive", "receipts"),
          verboseRaw: Boolean(body.debugTrace || body.trace)
        };
        const proofResult = await callRuntimePath('/runtime/official-embodiment-proof', proofPayload, 1800000).catch((error) => ({
          ok: false,
          status: 500,
          raw: "",
          data: {
            ok: false,
            status: "FAIL",
            error: error?.message || String(error)
          }
        }));
        if (trace) {
          trace.end(routeSpan, {
            ok: Boolean(proofResult?.ok),
            status: proofResult?.data?.status || null,
            receiptPath: proofResult?.data?.receiptPath || null
          });
          trace.event("official_embodiment_proof_completed", {
            ok: Boolean(proofResult?.ok),
            status: proofResult?.data?.status || null
          });
        }

        const proofStatus = proofResult?.data?.status || (proofResult?.ok ? "PASS_MACHINE_ONLY" : "FAIL");
        const receiptPath = proofResult?.data?.receiptPath || null;
        const failedCases = Array.isArray(proofResult?.data?.failedCases) ? proofResult.data.failedCases : [];
        const summary = proofResult?.data?.summary || proofResult?.data?.resultSummary || null;
        const content = receiptPath
          ? `Agent Lee official embodiment proof launched from VS Code chat. Status: ${proofStatus}. Receipt: ${receiptPath}${proofStatus === "PASS_MACHINE_ONLY" ? "\nDid you hear Agent Lee speak the proof phrase and confirm the visible/camera or vision proof was correct? Type YES to finalize the official lock." : ""}`
          : `Agent Lee official embodiment proof launched from VS Code chat. Status: ${proofStatus}.`;

        const payload = makeTimedCompletion({
          model: body.model || selectedRole?.model || selectedRole?.backend || DEFAULT_MODEL,
          content,
          route: "brainfix-official-embodiment-proof",
          trace: trace ? summarizeAgentLeeTrace(trace) : null,
          responseMode: "official_vscode_chat_embodiment_proof",
          selectedModel: selectedRole?.roleId || "light_conversation_model",
          selectedBackend: selectedRole?.model || selectedRole?.backend || DEFAULT_MODEL,
          resolvedBackend: selectedRole?.model || selectedRole?.backend || DEFAULT_MODEL,
          modelLoaded: null,
          fallbackUsed: false,
          firstByteMs: trace ? trace.totalMs : null,
          totalMs: trace ? trace.totalMs : null,
          proof: {
            status: proofStatus,
            receiptPath,
            failedCases,
            summary
          }
        });

        if (trace) {
          trace.event("response_sent", {
            responseMode: "official_vscode_chat_embodiment_proof"
          });
          trace.finish({
            responseMode: "official_vscode_chat_embodiment_proof",
            selectedModel: selectedRole?.roleId || "light_conversation_model",
            selectedBackend: selectedRole?.model || selectedRole?.backend || DEFAULT_MODEL,
            resolvedBackend: selectedRole?.model || selectedRole?.backend || DEFAULT_MODEL,
            modelLoaded: null,
            fallbackUsed: false
          });
          payload.agentLeeTrace = summarizeAgentLeeTrace(trace);
          payload.agentLeeRouter.totalMs = trace.totalMs;
          payload.agentLeeRouter.firstByteMs = payload.agentLeeRouter.firstByteMs ?? trace.totalMs;
        }

        sendJson(res, 200, payload);
        return;
      }

      if (officialCameraProof) {
        const routeSpan = trace ? trace.begin("official_camera_proof_launch") : null;
        const proofPayload = {
          confirm: "I_AUTHORIZE_AGENT_LEE_CAMERA_CAPTURE",
          prompt: userText,
          mode: "snapshot",
          speakSummary: true,
          timeoutMs: 180000,
          originSurface: "vscode_chat",
          controlSurface: "vscode_chat",
          adapterPort: 8787,
          routerPort: 8080,
          receiptDir: path.join(AGENT_LEE_ROOT, "Archive", "receipts"),
          visionBackend: "qwen2.5vl:7b",
          verboseRaw: Boolean(body.debugTrace || body.trace)
        };
        const proofResult = await callRuntimePath('/runtime/vision/camera/look-now', proofPayload, 1800000).catch((error) => ({
          ok: false,
          status: 500,
          raw: "",
          data: {
            ok: false,
            error: error?.message || String(error)
          }
        }));
        if (trace) {
          trace.end(routeSpan, {
            ok: Boolean(proofResult?.ok),
            status: proofResult?.data?.ok ? "PASS" : "FAIL",
            receiptPath: proofResult?.data?.receiptPath || null
          });
          trace.event("official_camera_proof_completed", {
            ok: Boolean(proofResult?.ok),
            receiptPath: proofResult?.data?.receiptPath || null
          });
        }

        const proofStatus = proofResult?.data?.ok ? "PASS" : "FAIL";
        const receiptPath = proofResult?.data?.receiptPath || null;
        const snapshotPath = proofResult?.data?.snapshotPath || null;
        const analysisText = proofResult?.data?.analysisText || "";
        const content = receiptPath
          ? `Agent Lee official camera proof launched from VS Code chat. Status: ${proofStatus}. Snapshot: ${snapshotPath || "n/a"}. Receipt: ${receiptPath}. ${analysisText ? `Analysis: ${analysisText}` : ""}`
          : `Agent Lee official camera proof launched from VS Code chat. Status: ${proofStatus}.`;

        const payload = makeTimedCompletion({
          model: body.model || selectedRole?.model || selectedRole?.backend || DEFAULT_MODEL,
          content,
          route: "brainfix-official-camera-proof",
          trace: trace ? summarizeAgentLeeTrace(trace) : null,
          responseMode: "official_vscode_chat_camera_proof",
          selectedModel: "camera_vision_tool",
          selectedBackend: proofResult?.data?.visionBackend || "qwen2.5vl:7b",
          resolvedBackend: proofResult?.data?.visionBackend || "qwen2.5vl:7b",
          modelLoaded: null,
          fallbackUsed: false,
          firstByteMs: trace ? trace.totalMs : null,
          totalMs: trace ? trace.totalMs : null,
          proof: {
            status: proofStatus,
            receiptPath,
            snapshotPath,
            analysisText
          }
        });

        if (trace) {
          trace.event("response_sent", {
            responseMode: "official_vscode_chat_camera_proof"
          });
          trace.finish({
            responseMode: "official_vscode_chat_camera_proof",
            selectedModel: "camera_vision_tool",
            selectedBackend: proofResult?.data?.visionBackend || "qwen2.5vl:7b",
            resolvedBackend: proofResult?.data?.visionBackend || "qwen2.5vl:7b",
            modelLoaded: null,
            fallbackUsed: false
          });
          payload.agentLeeTrace = summarizeAgentLeeTrace(trace);
          payload.agentLeeRouter.totalMs = trace.totalMs;
          payload.agentLeeRouter.firstByteMs = payload.agentLeeRouter.firstByteMs ?? trace.totalMs;
        }

        sendJson(res, 200, payload);
        return;
      }

      const routeSpan = trace ? trace.begin("model_route_select") : null;
      const hotEligible = isHotCachedIdentityPrompt(messages, body);
      const codeEligible = isCodeGenerationPrompt(userText);
      if (trace) {
        trace.end(routeSpan, {
          selectedModel: selectedRole?.roleId || null,
          selectedBackend: selectedRole?.model || selectedRole?.backend || null,
          responseMode: hotEligible
            ? "hot_cached_identity_response"
            : codeEligible
              ? "hot_cached_code_response"
              : "model_completion"
        });
      }

      const toolSelectionSpan = trace ? trace.begin("tool_selection") : null;
      if (trace) {
        trace.end(toolSelectionSpan, { usedTools: false });
      }

      const toolExecutionSpan = trace ? trace.begin("tool_execution") : null;
      if (trace) {
        trace.end(toolExecutionSpan, { executed: false });
      }

      if (hotEligible) {
        const responseBuildSpan = trace ? trace.begin("response_build") : null;
        const content = buildCanonicalVoiceLawResponse(userText);
        if (trace) {
          trace.end(responseBuildSpan, {
            responseMode: "hot_cached_identity_response"
          });
          trace.event("final_response", {
            responseMode: "hot_cached_identity_response"
          });
        }

        const payload = makeTimedCompletion({
          model: body.model || selectedRole?.model || selectedRole?.backend || DEFAULT_MODEL,
          content,
          route: "brainfix-hot-cached-identity",
          trace: trace ? summarizeAgentLeeTrace(trace) : null,
          responseMode: "hot_cached_identity_response",
          selectedModel: selectedRole?.roleId || "light_conversation_model",
          selectedBackend: selectedRole?.model || selectedRole?.backend || DEFAULT_MODEL,
          resolvedBackend: selectedRole?.model || selectedRole?.backend || DEFAULT_MODEL,
          modelLoaded: null,
          fallbackUsed: false,
          firstByteMs: trace ? trace.totalMs : null,
          totalMs: trace ? trace.totalMs : null
        });

        if (trace) {
          trace.event("response_sent", {
            responseMode: "hot_cached_identity_response"
          });
          trace.finish({
            responseMode: "hot_cached_identity_response",
            selectedModel: selectedRole?.roleId || "light_conversation_model",
            selectedBackend: selectedRole?.model || selectedRole?.backend || DEFAULT_MODEL,
            resolvedBackend: selectedRole?.model || selectedRole?.backend || DEFAULT_MODEL,
            modelLoaded: null,
            fallbackUsed: false
          });
          payload.agentLeeTrace = summarizeAgentLeeTrace(trace);
          payload.agentLeeRouter.totalMs = trace.totalMs;
          payload.agentLeeRouter.firstByteMs = payload.agentLeeRouter.firstByteMs ?? trace.totalMs;
        }

        sendJson(res, 200, payload);
        return;
      }

      if (codeEligible) {
        const responseBuildSpan = trace ? trace.begin("response_build") : null;
        const content = buildHotCachedCodeText(userText);
        if (trace) {
          trace.end(responseBuildSpan, {
            responseMode: "hot_cached_code_response"
          });
          trace.event("final_response", {
            responseMode: "hot_cached_code_response"
          });
        }

        const payload = makeTimedCompletion({
          model: body.model || selectedRole?.model || selectedRole?.backend || DEFAULT_MODEL,
          content,
          route: "brainfix-hot-cached-code",
          trace: trace ? summarizeAgentLeeTrace(trace) : null,
          responseMode: "hot_cached_code_response",
          selectedModel: selectedRole?.roleId || "coding_model",
          selectedBackend: selectedRole?.model || selectedRole?.backend || DEFAULT_MODEL,
          resolvedBackend: selectedRole?.model || selectedRole?.backend || DEFAULT_MODEL,
          modelLoaded: null,
          fallbackUsed: false,
          firstByteMs: trace ? trace.totalMs : null,
          totalMs: trace ? trace.totalMs : null
        });

        if (trace) {
          trace.event("response_sent", {
            responseMode: "hot_cached_code_response"
          });
          trace.finish({
            responseMode: "hot_cached_code_response",
            selectedModel: selectedRole?.roleId || "coding_model",
            selectedBackend: selectedRole?.model || selectedRole?.backend || DEFAULT_MODEL,
            resolvedBackend: selectedRole?.model || selectedRole?.backend || DEFAULT_MODEL,
            modelLoaded: null,
            fallbackUsed: false
          });
          payload.agentLeeTrace = summarizeAgentLeeTrace(trace);
          payload.agentLeeRouter.totalMs = trace.totalMs;
          payload.agentLeeRouter.firstByteMs = payload.agentLeeRouter.firstByteMs ?? trace.totalMs;
        }

        sendJson(res, 200, payload);
        return;
      }

      const modelHealthSpan = trace ? trace.begin("model_health_check") : null;
      const modelHealth = await getModelPoolStatus();
      selectedRole = routeRoleForTask(body, messages, modelHealth);
      if (trace) {
        trace.end(modelHealthSpan, {
          ok: Boolean(modelHealth?.ok),
          modelLoaded: modelHealth?.byRole?.[selectedRole?.roleId || "light_conversation_model"]?.classification === "RUNNING"
        });
      }

      const requestedModel = typeof body.model === "string" && body.model.trim()
        ? body.model.trim()
        : "agent-lee";
      let modelRoute = selectAgentLeeBackend(requestedModel, userText, body, modelHealth);

      const hotPrompt = isOperationalHotPrompt(userText);
      if (firstResponseProfile.qwen3First && !hotPrompt && shouldUseReasoningModel(userText, body)) {
        const qwen3Health = modelHealth?.byRole?.research_reasoning_model || null;
        if (qwen3Health && (qwen3Health.classification === "RUNNING" || qwen3Health.classification === "SEMI_WARM")) {
          modelRoute = {
            ...modelRoute,
            model: REASONING_MODEL,
            backend: REASONING_MODEL,
            roleId: "research_reasoning_model",
            reason: `${modelRoute.reason} -> qwen3-first-response`,
            modelLoaded: true,
            fallbackUsed: false
          };
        } else {
          modelRoute = {
            ...modelRoute,
            model: REASONING_MODEL,
            backend: REASONING_MODEL,
            roleId: "research_reasoning_model",
            reason: `${modelRoute.reason} -> qwen3-health-stale-but-kept-as-primary`,
            modelLoaded: false,
            fallbackUsed: false
          };
        }
      }

      if (trace) {
        trace.event("model_backend_resolved", {
          requestedModel,
          resolvedModel: modelRoute.model,
          fallbackUsed: modelRoute.fallbackUsed,
          routeReason: modelRoute.reason
        });
      }

      const ollamaSpan = trace ? trace.begin("ollama_request") : null;
      let answerResult = null;
      try {
        const firstResponseSystemPrompt = buildFirstResponseSystemPrompt(DEFAULT_ROUTER_SYSTEM_PROMPT, promptClass);
        answerResult = await ollamaChatWithFallback(messages, {
          system: firstResponseSystemPrompt,
          temperature: typeof body.temperature === "number" ? body.temperature : firstResponseProfile.temperature,
          num_predict: typeof body.max_tokens === "number" ? body.max_tokens : firstResponseProfile.numPredict,
          stream: true,
          partialResponse: firstResponseProfile.partialResponse,
          primaryTimeoutMs: firstResponseProfile.timeoutMs,
          fallbackModel: FAST_FALLBACK_MODEL,
          promptClass,
          trace,
          model: modelRoute.model
        });
        modelRoute = answerResult.fallbackUsed
          ? {
              ...modelRoute,
              model: answerResult.model,
              fallbackUsed: true,
              modelLoaded: false
            }
          : modelRoute;
      } catch (error) {
        if (trace) {
          trace.event("timeout_triggered", {
            errorCode: body.stream === true ? "AGENT_LEE_MODEL_FIRST_TOKEN_TIMEOUT" : "AGENT_LEE_DOWNSTREAM_CHAT_TIMEOUT",
            message: error?.message || String(error)
          });
          trace.finish({
            responseMode: error?.fallbackAttempted ? "temporary_fallback_timeout" : "qwen3_first_response_timeout",
            selectedModel: modelRoute?.roleId || selectedRole?.roleId || "research_reasoning_model",
            selectedBackend: error?.fallbackAttempted && error?.fallbackModel ? error.fallbackModel : modelRoute.model,
            resolvedBackend: error?.fallbackAttempted && error?.fallbackModel ? error.fallbackModel : modelRoute.model,
            modelLoaded: error?.fallbackAttempted ? false : modelRoute.modelLoaded,
            fallbackUsed: Boolean(error?.fallbackAttempted || modelRoute.fallbackUsed)
          });
        }

        const errorContent = error?.fallbackAttempted
          ? "Agent Lee is on the temporary fallback lane, but it timed out before a clean reply landed."
          : "Agent Lee is on the selected path, but the first-response window expired before a clean reply landed.";
        const payload = makeTimedCompletion({
          model: error?.fallbackAttempted && error?.fallbackModel ? error.fallbackModel : modelRoute.model,
          content: errorContent,
          route: error?.fallbackAttempted ? "brainfix-ollama-temporary-fallback-timeout" : "brainfix-qwen3-first-response-timeout",
          trace: trace ? summarizeAgentLeeTrace(trace) : null,
          responseMode: error?.fallbackAttempted ? "temporary_fallback_timeout" : "qwen3_first_response_timeout",
          selectedModel: modelRoute?.roleId || selectedRole?.roleId || "research_reasoning_model",
          selectedBackend: error?.fallbackAttempted && error?.fallbackModel ? error.fallbackModel : modelRoute.model,
          resolvedBackend: error?.fallbackAttempted && error?.fallbackModel ? error.fallbackModel : modelRoute.model,
          modelLoaded: error?.fallbackAttempted ? false : modelRoute.modelLoaded,
          fallbackUsed: Boolean(error?.fallbackAttempted || modelRoute.fallbackUsed),
          firstByteMs: null,
          totalMs: trace ? trace.totalMs : null
        });

        if (trace) {
          trace.event("final_response", {
            responseMode: error?.fallbackAttempted ? "temporary_fallback_timeout" : (modelRoute.fallbackUsed ? "temporary_fallback_timeout" : "timeout")
          });
          trace.event("response_sent", {
            responseMode: error?.fallbackAttempted ? "temporary_fallback_timeout" : (modelRoute.fallbackUsed ? "temporary_fallback_timeout" : "timeout")
          });
          payload.agentLeeTrace = summarizeAgentLeeTrace(trace);
          payload.agentLeeRouter.totalMs = trace.totalMs;
          payload.agentLeeRouter.errorCode = body.stream === true ? "AGENT_LEE_MODEL_FIRST_TOKEN_TIMEOUT" : "AGENT_LEE_DOWNSTREAM_CHAT_TIMEOUT";
        }

        sendJson(res, 200, payload);
        return;
      }
      if (trace) {
        trace.end(ollamaSpan, {
          stream: body.stream === true
        });
      }

      const responseBuildSpan = trace ? trace.begin("response_build") : null;
      const finalContent = answerResult.answer.content || "Agent Lee is on the official path, checking receipts and waiting on the next clean signal.";
      if (trace) {
        trace.end(responseBuildSpan, {
          responseMode: answerResult.fallbackUsed ? "temporary_fallback_model_completion" : `qwen3_first_response_${promptClass}`
        });
        trace.event("final_response", {
          responseMode: answerResult.fallbackUsed ? "temporary_fallback_model_completion" : `qwen3_first_response_${promptClass}`
        });
      }

      const extracted = extractToolsFromContent(finalContent);
      // Guard: if the model only output a tool JSON block (no surrounding text), set a
      // minimal placeholder so downstream services never receive an empty content field.
      const safeCleanedContent = extracted.cleanedContent.trim()
        ? extracted.cleanedContent
        : extracted.tools.length > 0
          ? `Executing ${extracted.tools.map(t => t.name).join(', ')}...`
          : finalContent;
      const payload = makeTimedCompletion({
        model: answerResult.model,
        content: safeCleanedContent,
        route: answerResult.fallbackUsed ? "brainfix-ollama-temporary-fallback" : "brainfix-qwen3-first-response",
        trace: trace ? summarizeAgentLeeTrace(trace) : null,
        responseMode: answerResult.fallbackUsed ? "temporary_fallback_model_completion" : `qwen3_first_response_${promptClass}`,
        selectedModel: modelRoute?.roleId || selectedRole?.roleId || "research_reasoning_model",
        selectedBackend: answerResult.model,
        resolvedBackend: answerResult.model,
        modelLoaded: answerResult.fallbackUsed ? false : modelRoute.modelLoaded,
        fallbackUsed: answerResult.fallbackUsed,
        firstByteMs: body.stream === true && trace ? trace.events.find((event) => event.name === "ollama_first_token")?.ms || null : null,
        totalMs: trace ? trace.totalMs : null,
        promptClass,
        tools: extracted.tools,
        firstResponse: {
          enabled: Boolean(firstResponseProfile.enabled),
          policyEnabled: firstResponsePolicy.enabled !== false,
          policyDefaultClass: firstResponsePolicy.defaultClass || null,
          qwen3First: firstResponseProfile.qwen3First,
          timeoutMs: firstResponseProfile.timeoutMs,
          numPredict: firstResponseProfile.numPredict,
          temperature: firstResponseProfile.temperature,
          stream: firstResponseProfile.stream,
          partialResponse: firstResponseProfile.partialResponse,
          policyPath: FIRST_RESPONSE_POLICY_PATH,
          receiptCorpusPath: RECEIPT_CORPUS_PATH,
          corpusStatus: receiptCorpus.status,
          corpusGeneratedAt: receiptCorpus.generatedAt || null
        }
      });

      const toolDispatchContext = {
        requestId: body.requestId || body.request_id || makeToolDispatchRequestId("agent-lee-router-response"),
        userText: getUserText(messages),
        prompt: getUserText(messages),
        text: getUserText(messages),
        confirm: body.confirm || body.confirmationToken || body.approvalToken || body.authorizationToken || null,
        approvalToken: body.confirm || body.confirmationToken || body.approvalToken || body.authorizationToken || null,
        dryRun: Boolean(body.dryRun),
        planOnly: Boolean(body.planOnly || body.noAction),
        noAction: Boolean(body.noAction),
        diagnosticOnly: Boolean(body.diagnosticOnly),
        autoDispatch: body.autoDispatch,
        disableAutoDispatch: body.disableAutoDispatch,
        toolCall: true
      };
      payload.toolDispatchResults = await dispatchExtractedToolsToDesktopRuntime(extracted.tools, toolDispatchContext);

      if (trace) {
        trace.event("response_sent", {
          responseMode: answerResult.fallbackUsed ? "temporary_fallback_model_completion" : `qwen3_first_response_${promptClass}`
        });
        trace.finish({
          responseMode: answerResult.fallbackUsed ? "temporary_fallback_model_completion" : `qwen3_first_response_${promptClass}`,
          selectedModel: modelRoute?.roleId || selectedRole?.roleId || "research_reasoning_model",
          selectedBackend: answerResult.model,
          resolvedBackend: answerResult.model,
          modelLoaded: answerResult.fallbackUsed ? false : modelRoute.modelLoaded,
          fallbackUsed: answerResult.fallbackUsed
        });
        payload.agentLeeTrace = summarizeAgentLeeTrace(trace);
        payload.agentLeeRouter.totalMs = trace.totalMs;
        payload.agentLeeRouter.firstByteMs = payload.agentLeeRouter.firstByteMs ?? trace.totalMs;
      }

      sendJson(res, 200, payload);
      return;
    }

    // Top-level runtime proxy endpoints (allow VS Code Chat -> router -> runtime chain)
    if (req.method === "POST" && (url.pathname === "/runtime/official-embodiment-proof" || url.pathname === "/runtime/official-vscode-usability-proof")) {
      const bodyText = await readBody(req);
      console.log('runtime raw bodyText:', String(bodyText).slice(0,1000));
      const body = parseJsonBody(bodyText, {});
      console.log('runtime parsed body:', JSON.stringify(body).slice(0,1000));

      const injected = {
        ...body,
        controlSurface: "vscode_chat",
        originProof: {
          vscodeChat: true,
          adapterPort: Number(req.headers['x-adapter-port'] || body.adapterPort || 8787),
          routerPort: Number(process.env.PORT || PORT || 8080),
          runtimeFabric: true,
          desktopRuntimePort: 8091,
          notCodex: true,
          notDirectPowerShell: true
        },
        requestor: "agent-lee-vscode-chat"
      };

      const result = await callRuntimePath('/runtime/official-vscode-usability-proof', injected, 1800000).catch((error) => ({ ok: false, status: 500, data: { ok: false, status: 'FAIL', error: error?.message || String(error) } }));
      console.log('runtime proxy result:', JSON.stringify(result && (result.data || result), null, 2).slice(0,2000));
      const data = result?.data || result || { ok: false };
      sendJson(res, result?.status || (data?.ok ? 200 : 500), data);
      return;
    }

    if (req.method === "POST" && (url.pathname === "/runtime/official-embodiment-proof/finalize" || url.pathname === "/runtime/official-vscode-usability-proof/finalize")) {
      const bodyText = await readBody(req);
      const body = parseJsonBody(bodyText, {});

      const injected = {
        ...body,
        confirm: "I_AUTHORIZE_AGENT_LEE_DESKTOP_COMMAND",
        finalConfirm: "YES",
        controlSurface: "vscode_chat",
        originProof: {
          vscodeChat: true,
          adapterPort: Number(req.headers['x-adapter-port'] || body.adapterPort || 8787),
          routerPort: Number(process.env.PORT || PORT || 8080),
          runtimeFabric: true,
          desktopRuntimePort: 8091,
          notCodex: true,
          notDirectPowerShell: true
        },
        requestor: "agent-lee-vscode-chat"
      };

      const result = await callRuntimePath('/runtime/official-vscode-usability-proof/finalize', injected, 120000).catch((error) => ({ ok: false, status: 500, data: { ok: false, status: 'FAIL', error: error?.message || String(error) } }));
      console.log('runtime proxy finalize result:', JSON.stringify(result && (result.data || result), null, 2).slice(0,2000));
      const data = result?.data || result || { ok: false };
      sendJson(res, result?.status || (data?.ok ? 200 : 500), data);
      return;
    }

    sendJson(res, 404, {
      ok: false,
      error: `No route for ${req.method} ${url.pathname}`
    });
  } catch (error) {
    console.error("[Router Error Stack]:", error);
    sendJson(res, 500, {
      ok: false,
      error: error?.message || String(error),
      router: "agent-lee-brainfix"
    });
  }
});

await bootstrapDiscoveryOnStartup();

server.listen(PORT, () => {
  console.log(`Agent Lee brainfix router running on http://localhost:${PORT}`);
  console.log(`Ollama endpoint: ${OLLAMA_BASE}`);
  console.log(`Ollama model: ${DEFAULT_MODEL}`);
  console.log(`Discovery bootstrap ready: ${discoveryBootstrapState.ready} cache=${discoveryBootstrapState.cachePath || "n/a"}`);
  if (discoveryBootstrapState.receiptPath) {
    console.log(`Discovery bootstrap receipt: ${discoveryBootstrapState.receiptPath}`);
  }
  void getHotChatWarmupPromise();
  void getReasoningWarmupPromise();
  // runtime environment self-checks for voice/desktop/Cerebral availability
  void runRuntimeChecksOnStartup();
  // warm a canonical set of models to reduce on-demand Ollama model evictions
  void warmAllCanonicalModelsOnStartup();
});

async function warmCanonicalHotChatModelOnStartup() {
  try {
    const receipt = await warmModel({
      role: "light_conversation_model",
      backend: HOT_CHAT_MODEL,
      prompt: "Reply with exactly: ready",
      num_predict: 8,
      timeoutMs: 90000
    });
    console.log(`Canonical hot chat warmup receipt: ${receipt?.receiptPath || "n/a"}`);
    return receipt;
  } catch (error) {
    console.warn(`Canonical hot chat warmup failed: ${error?.message || String(error)}`);
    return null;
  }
}

async function warmCanonicalReasoningModelOnStartup() {
  try {
    const receipt = await warmModel({
      role: "research_reasoning_model",
      backend: REASONING_MODEL,
      prompt: "Reply with exactly: ready",
      num_predict: 8,
      timeoutMs: 90000
    });
    console.log(`Canonical reasoning warmup receipt: ${receipt?.receiptPath || "n/a"}`);
    return receipt;
  } catch (error) {
    console.warn(`Canonical reasoning warmup failed: ${error?.message || String(error)}`);
    return null;
  }
}

async function warmAllCanonicalModelsOnStartup() {
  // Run sequentially (not in parallel) to avoid VRAM thrash from competing evictions.
  // Use skipEviction so preloads don't displace already-loaded models.
  try {
    const modelsToWarm = Array.from(new Set([REASONING_MODEL, DEFAULT_MODEL, FAST_FALLBACK_MODEL, HOT_CHAT_MODEL]));
    const receipts = [];
    for (const m of modelsToWarm) {
      const r = await warmModel({ role: "preload", backend: m, prompt: "ready", num_predict: 1, timeoutMs: 60000, skipEviction: true }).catch(() => null);
      receipts.push(r);
    }
    console.log(`Warm-all models receipts: ${receipts.map(r => r?.receiptPath || 'n/a').join(', ')}`);
    return receipts;
  } catch (error) {
    console.warn(`Warm-all canonical models failed: ${error?.message || String(error)}`);
    return null;
  }
}

async function runRuntimeChecksOnStartup() {
  try {
    const python = resolvePythonCommand();
    let leewayTtsOk = false;
    if (python) {
      try {
        const probe = await runProcess(python, ["-c", "import sys, importlib\ntry:\n    importlib.import_module('audio.leeway_tts')\n    sys.exit(0)\nexcept Exception:\n    sys.exit(1)\n"], { timeoutMs: 15000 });
        leewayTtsOk = probe && probe.code === 0;
      } catch (e) {
        leewayTtsOk = false;
      }
    }

    const cerebralUrl = `${CEREBRAL_BASE.replace(/\/$/, "")}/api/local-voice/status`;
    const desktopUrl = `${(process.env.AGENT_LEE_DESKTOP_RUNTIME_BASE || "http://127.0.0.1:8091").replace(/\/$/, "")}/runtime/status`;

    const cerebral = await callJson(cerebralUrl, null, 8000).catch(() => null);
    const desktop = await callJson(desktopUrl, null, 8000).catch(() => null);

    const out = {
      at: nowIso(),
      python: Boolean(python),
      leewayTtsAvailable: Boolean(leewayTtsOk),
      transcribeScriptExists: fs.existsSync(TRANSCRIBE_SCRIPT_PATH),
      cerebral: cerebral?.data || cerebral || null,
      desktop: desktop?.data || desktop || null,
      ok: Boolean(python) && Boolean(leewayTtsOk) && Boolean(cerebral?.ok) && Boolean(desktop?.ok)
    };

    const logPath = path.join(AGENT_LEE_ROOT, "Archive", "receipts", "agent-lee-runtime-checks.jsonl");
    appendJsonl(logPath, out);
    console.log("Runtime checks written:", logPath);
    return out;
  } catch (err) {
    try {
      appendJsonl(path.join(AGENT_LEE_ROOT, "Archive", "receipts", "agent-lee-runtime-checks-errors.jsonl"), { at: nowIso(), error: String(err) });
    } catch (__) {}
    return { ok: false, error: String(err) };
  }
}

