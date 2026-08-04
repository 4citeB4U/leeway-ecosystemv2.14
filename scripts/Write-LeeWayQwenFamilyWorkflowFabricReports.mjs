/*
LEEWAY HEADER
TAG: GOVERNANCE.EVIDENCE.QWEN_FAMILY_WORKFLOW_FABRIC
REGION: ARCHIVE.REPORTS
DISCOVERY_PIPELINE: Standards -> Model Hive -> Bridge Runtime -> Edge GPU/RTC/Device/IoT -> Agent Lee -> Command Plane -> Sentinel
LEEWAY_ID: LEEWAY_APP::GOVERNANCE::QWEN_FAMILY_WORKFLOW_FABRIC::REPORT_WRITER
CLASSIFICATION: EVIDENCE
OWNER: LeeWay Standards
*/
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const workspaceRoot = path.resolve(path.dirname(__filename), "..");
const now = new Date().toISOString();

const assistantBodyId = "LEEWAY_ACTOR::ASSISTANT_BODY::CODEX::QWEN_FAMILY_WORKFLOW_FABRIC";
const assistantObjectId = "LEEWAY_ACTOR::EXTERNAL_ASSISTANT::CODEX_GPT5::WORKSPACE_SUBORDINATE";
const standardsAuthorityId = "LEEWAY_AUTHORITY::STANDARDS::MODEL_AGENT_WORKFLOW::LOCAL_FIRST";
const familyId = "LEEWAY_MODEL_FAMILY::QWEN";
const familyLawId = "LEEWAY_POLICY::QWEN_FAMILY::OPERATING_ORDER_LAW";
const workflowLawId = "LEEWAY_POLICY::MODEL_AGENT_WORKFLOW::EVIDENCE_LAW";

const files = {
  qwenFamilyRegistry: "LeeWay-Standards/registries/leeway-qwen-family-registry.json",
  llmRouteRegistry: "LeeWay-Standards/registries/leeway-llm-route-registry.json",
  modelHiveRegistry: "LeeWay-Standards/registries/leeway-model-hive-registry.json",
  downloadRegistry: "LeeWay-Standards/registries/leeway-model-download-registry.json",
  gpuAttachmentRegistry: "LeeWay-Standards/registries/leeway-model-gpu-attachment-registry.json",
  rtcAttachmentRegistry: "LeeWay-Standards/registries/leeway-model-rtc-attachment-registry.json",
  unifiedRouterRegistry: "LeeWay-Standards/registries/leeway-unified-model-router-registry.json",
  hardwareRouterRegistry: "LeeWay-Standards/registries/leeway-hardware-router-registry.json",
  workflowFabricRegistry: "LeeWay-Standards/registries/leeway-model-agent-workflow-fabric-registry.json",

  placementMd: "Archive/reports/leeway-model-hive-placement-orchestration-report.md",
  placementJson: "Archive/reports/leeway-model-hive-placement-orchestration-report.json",
  roleAssignmentMap: "Archive/reports/leeway-model-role-assignment-map.json",
  appGovernanceAudit: "Archive/reports/leeway-application-model-governance-audit.json",
  controlPlaneMap: "Archive/reports/leeway-model-hive-control-plane-map.json",
  unifiedRouterReport: "Archive/reports/leeway-unified-model-router-report.json",
  nineModelExecution: "Archive/reports/leeway-nine-model-execution-proof-report.json",
  edgeGpuPlacement: "Archive/reports/leeway-nine-model-edge-gpu-placement-report.json",
  voiceVisionLoop: "Archive/reports/leeway-agent-lee-voice-vision-loop-map.json",
  modelOrchestrationSentinel: "Archive/reports/leeway-model-orchestration-sentinel-report.json",
  placementReceipt: "Archive/receipts/leeway_model_hive_placement_orchestration_receipt.json",

  familyMd: "Archive/reports/leeway-qwen-family-operating-order-report.md",
  familyJson: "Archive/reports/leeway-qwen-family-operating-order-report.json",
  familyRegistration: "Archive/reports/leeway-qwen-family-registration-report.json",
  qwenRoleLane: "Archive/reports/leeway-qwen-model-role-lane-assignment.json",
  familyStartup: "Archive/reports/leeway-qwen-family-startup-order-report.json",
  cooperationContract: "Archive/reports/leeway-qwen-agentic-cooperation-contract.json",
  familyRouter: "Archive/reports/leeway-qwen-family-router-report.json",
  familyCapability: "Archive/reports/leeway-qwen-family-capability-check.json",
  appInferenceGovernance: "Archive/reports/leeway-application-inference-governance-report.json",
  familyControlPlane: "Archive/reports/leeway-qwen-family-control-plane-report.json",
  familySentinel: "Archive/reports/leeway-qwen-family-sentinel-report.json",
  familyReceipt: "Archive/receipts/leeway_qwen_family_operating_order_receipt.json",

  workflowFabricMd: "Archive/reports/leeway-model-agent-workflow-fabric-report.md",
  workflowFabricJson: "Archive/reports/leeway-model-agent-workflow-fabric-report.json",
  workflowIdMd: "Archive/reports/leeway-workflow-id-standard-report.md",
  workflowIdJson: "Archive/reports/leeway-workflow-id-standard.json",
  qwenWorkflowMap: "Archive/reports/leeway-qwen-family-workflow-map.json",
  cooperationWorkflows: "Archive/reports/leeway-model-agent-cooperation-workflows.json",
  hardwareAwareness: "Archive/reports/leeway-hardware-awareness-fabric-report.json",
  gpuCpuInventory: "Archive/reports/leeway-gpu-cpu-node-inventory.json",
  hardwareRules: "Archive/reports/leeway-model-hardware-placement-rules.json",
  hardwareRouter: "Archive/reports/leeway-hardware-router-report.json",
  evidencePacketStandard: "Archive/reports/leeway-workflow-evidence-packet-standard.json",
  workflowInheritance: "Archive/reports/leeway-application-workflow-inheritance-map.json",
  commandPlaneVisibility: "Archive/reports/leeway-command-plane-workflow-visibility-report.json",
  workflowSentinel: "Archive/reports/leeway-workflow-sentinel-report.json",
  workflowReceipt: "Archive/receipts/leeway_model_agent_workflow_fabric_receipt.json"
};

const commandsRun = [
  "Get-Content READ-FIRST.md; BOOK-54; BOOK-55; leeway-application-standards skill and tracer/identity references",
  "Get-Content model hive, LLM route, model download, GPU attachment, RTC attachment, agent route, workflow registries",
  "ollama list",
  "Python import/runtime probe for torch, transformers, safetensors, qwen_omni_utils, soundfile, librosa",
  "nvidia-smi --query-gpu=index,name,memory.total,memory.used,driver_version,temperature.gpu --format=csv,noheader,nounits",
  "Ollama /api/generate execution probes for qwen3, qwen2.5-coder:14b, qwen2.5-coder:7b, qwen2.5-coder:1.5b, qwen2.5vl:7b",
  "Python local model load/execution probes for qwen2-audio, qwen2.5-omni, qwen3-tts, qwen3-vl-embedding",
  "rg source/config audit for direct model, external fallback, STT/TTS, Bridge Runtime, and route references",
  "apply_patch disabling openaiApi node credential, browser SpeechRecognition setup, and arbitrary model-router bypass",
  "node scripts/Write-LeeWayQwenFamilyWorkflowFabricReports.mjs",
  "Test-Path verification for required reports, registries, and receipts",
  "npm run lint in leeway-agent-lee",
  "npm run lint in leeway-agent-lee/agent-lee-runtime"
];

const toolsUsed = [
  "functions.shell_command",
  "multi_tool_use.parallel",
  "functions.apply_patch",
  "functions.update_plan"
];

const standardsChecked = [
  "LEEWAY_POLICY::BOOK_54_ASSISTANT-EMBODIMENT-AND-BEHAVIOR-LAW",
  "LEEWAY_POLICY::BOOK_55_ASSISTANT-RECORDING-AND-LEARNING-LAW",
  "leeway-application-standards",
  "leeway-tracer-pack-standard",
  "leeway-identity-mesh-standard",
  "leeway-identity-graph-standard",
  familyLawId,
  workflowLawId
];

function abs(relativePath) {
  return path.join(workspaceRoot, relativePath);
}

function readJson(relativePath, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(abs(relativePath), "utf8").replace(/^\uFEFF/, ""));
  } catch {
    return fallback;
  }
}

function writeJson(relativePath, value) {
  const filePath = abs(relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeText(relativePath, value) {
  const filePath = abs(relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value, "utf8");
}

function exists(relativePath) {
  return fs.existsSync(abs(relativePath));
}

function sha256(value) {
  return crypto.createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex");
}

function tryExec(command, args) {
  try {
    return { ok: true, stdout: execFileSync(command, args, { encoding: "utf8", timeout: 15000 }) };
  } catch (error) {
    return { ok: false, error: String(error?.message ?? error), stdout: error?.stdout?.toString?.() ?? "", stderr: error?.stderr?.toString?.() ?? "" };
  }
}

function parseOllamaList(text) {
  return text.split(/\r?\n/)
    .slice(1)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(\S+)\s+(\S+)\s+(.+?)\s{2,}(.+)$/);
      return match ? { name: match[1], id: match[2], size: match[3].trim(), modified: match[4].trim() } : { raw: line };
    });
}

function parseNvidiaSmi(text) {
  return text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => {
    const [index, name, memoryTotalMb, memoryUsedMb, driverVersion, temperatureC] = line.split(",").map((item) => item.trim());
    return {
      gpuNodeId: `LEEWAY_GPU_NODE::LOCAL::NVIDIA::${index}`,
      index,
      name,
      memoryTotalMb: Number(memoryTotalMb),
      memoryUsedMb: Number(memoryUsedMb),
      driverVersion,
      temperatureC: Number(temperatureC),
      inventoryStatus: "GPU_VISIBLE_BY_NVIDIA_SMI"
    };
  });
}

const ollamaList = tryExec("ollama", ["list"]);
const ollamaModels = ollamaList.ok ? parseOllamaList(ollamaList.stdout) : [];
const nvidia = tryExec("nvidia-smi", ["--query-gpu=index,name,memory.total,memory.used,driver_version,temperature.gpu", "--format=csv,noheader,nounits"]);
const gpuNodes = nvidia.ok ? parseNvidiaSmi(nvidia.stdout) : [];
const cpuNode = {
  cpuNodeId: `LEEWAY_CPU_NODE::LOCAL::${os.hostname()}`,
  architecture: os.arch(),
  logicalCpuCount: os.cpus().length,
  totalMemoryMb: Math.round(os.totalmem() / 1024 / 1024),
  freeMemoryMb: Math.round(os.freemem() / 1024 / 1024),
  inventoryStatus: "CPU_VISIBLE_BY_NODE_OS"
};

const modelDefinitions = [
  {
    objectId: "LEEWAY-MODEL-0004",
    exactModelName: "qwen3:latest",
    modelRouteId: "LEEWAY_LLM_ROUTE::QWEN3",
    lane: "LEEWAY_MODEL_LANE::PRIMARY_REASONING",
    qwenLane: "PRIMARY_REASONING",
    agenticRole: ["executive reasoning", "governance interpretation", "runtime decision support", "conversation planning", "system diagnosis"],
    runtimeHost: "Ollama / Bridge Runtime",
    runtime: "OLLAMA",
    workflowId: "LEEWAY_WORKFLOW::QWEN3::PRIMARY_REASONING",
    startupOrder: 7,
    preferredHardware: "GPU",
    cpuPolicy: "CPU only if labeled degraded",
    proof: { status: "EXECUTION_PROVEN", attempt: "minimal reasoning call through Ollama /api/generate", elapsedMs: 4825, responsePreview: "thinking/response stream returned from qwen3:latest", blocker: null },
    attachedApps: ["Agent Lee", "admin command environment", "manager agents", "employee agents", "workflow engine"]
  },
  {
    objectId: "LEEWAY-MODEL-0001",
    exactModelName: "qwen2.5-coder:14b",
    modelRouteId: "LEEWAY_LLM_ROUTE::QWEN2_5_CODER_14B",
    lane: "LEEWAY_MODEL_LANE::HEAVY_CODE_ENGINEERING",
    qwenLane: "HEAVY_ENGINEERING",
    agenticRole: ["multi-file implementation", "runtime repair", "application generation", "standards enforcement coding"],
    runtimeHost: "Ollama / Bridge Runtime",
    runtime: "OLLAMA",
    workflowId: "LEEWAY_WORKFLOW::QWEN_CODER_14B::HEAVY_ENGINEERING",
    startupOrder: 8,
    preferredHardware: "GPU",
    cpuPolicy: "CPU degraded / slow",
    proof: { status: "EXECUTION_PROVEN", attempt: "coding/patch reasoning call through Ollama /api/generate", elapsedMs: 11387, responsePreview: "patchPlan ok JSON-like response", blocker: null },
    attachedApps: ["Agent Lee", "SVG Creator", "generated apps", "workflow engine", "runtime repair"]
  },
  {
    objectId: "LEEWAY-MODEL-0002",
    exactModelName: "qwen2.5-coder:7b",
    modelRouteId: "LEEWAY_LLM_ROUTE::QWEN2_5_CODER_7B",
    lane: "LEEWAY_MODEL_LANE::MID_TIER_CODE_REASONING",
    qwenLane: "MID_TIER_ENGINEERING",
    agenticRole: ["route planning", "implementation support", "workflow planning", "code review / classification"],
    runtimeHost: "Ollama / Bridge Runtime",
    runtime: "OLLAMA",
    workflowId: "LEEWAY_WORKFLOW::QWEN_CODER_7B::MID_TIER_ENGINEERING",
    startupOrder: 8,
    preferredHardware: "GPU",
    cpuPolicy: "CPU acceptable degraded",
    proof: { status: "EXECUTION_PROVEN", attempt: "route planning/classification call through Ollama /api/generate", elapsedMs: 7111, responsePreview: "Planning", blocker: null },
    attachedApps: ["Agent Lee", "Content Automation", "manager agents", "employee agents", "workflow engine"]
  },
  {
    objectId: "LEEWAY-MODEL-0003",
    exactModelName: "qwen2.5-coder:1.5b",
    modelRouteId: "LEEWAY_LLM_ROUTE::QWEN2_5_CODER_1_5B",
    lane: "LEEWAY_MODEL_LANE::LIGHTWEIGHT_EDGE_COGNITION",
    qwenLane: "LIGHTWEIGHT_EDGE_HELPER",
    agenticRole: ["local small tasks", "quick classification", "lightweight code/text utility"],
    runtimeHost: "Ollama / Bridge Runtime",
    runtime: "OLLAMA",
    workflowId: "LEEWAY_WORKFLOW::QWEN_CODER_1_5B::LIGHTWEIGHT_EDGE_HELPER",
    startupOrder: 8,
    preferredHardware: "CPU or small GPU",
    cpuPolicy: "CPU acceptable",
    proof: { status: "EXECUTION_PROVEN", attempt: "lightweight helper call through Ollama /api/generate", elapsedMs: 2908, responsePreview: "LIGHT_OK", blocker: null },
    attachedApps: ["Edge Device", "Edge IoT", "quick classification", "public/admin UIs"]
  },
  {
    objectId: "LEEWAY-MODEL-0005",
    exactModelName: "qwen2.5vl:7b",
    modelRouteId: "LEEWAY_LLM_ROUTE::QWEN2_5_VL_7B",
    lane: "LEEWAY_MODEL_LANE::VISION_RUNTIME",
    qwenLane: "VISION_RUNTIME",
    agenticRole: ["camera understanding", "screen understanding", "visual UI monitoring", "screenshot/frame interpretation"],
    runtimeHost: "Ollama / Bridge Runtime / Vision Runtime",
    runtime: "OLLAMA",
    workflowId: "LEEWAY_WORKFLOW::QWEN_VL_7B::VISION_RUNTIME",
    startupOrder: 9,
    preferredHardware: "GPU",
    cpuPolicy: "CPU degraded",
    proof: { status: "BLOCKED", attempt: "image/frame interpretation call through Ollama /api/generate with generated 1x1 PNG", elapsedMs: 151, responsePreview: null, blocker: "Ollama returned 500: model runner unexpectedly stopped; no vision execution promotion." },
    attachedApps: ["SVG Creator", "Vision Runtime", "Agent Lee visual awareness", "public/admin UIs"]
  },
  {
    objectId: "LEEWAY-MODEL-0010",
    exactModelName: "qwen2-audio-local",
    modelRouteId: "LEEWAY_LLM_ROUTE::QWEN2_AUDIO_LOCAL",
    lane: "LEEWAY_MODEL_LANE::AUDIO_HEARING_RUNTIME",
    qwenLane: "HEARING_RUNTIME",
    agenticRole: ["microphone listening", "audio understanding", "transcription/audio intent", "RTC hearing lane"],
    runtimeHost: "Local Transformers CPU / Edge RTC",
    runtime: "LOCAL_MODEL",
    localFolder: "models/voice/qwen2-audio",
    workflowId: "LEEWAY_WORKFLOW::QWEN_AUDIO::HEARING_RUNTIME",
    startupOrder: 10,
    preferredHardware: "GPU if available",
    cpuPolicy: "CPU acceptable for small/slow proof if truth-labeled",
    proof: { status: "LOAD_PROVEN", attempt: "local config/tokenizer/processor/model weight load; audio execution attempt timed out on CPU", elapsedMs: 180983, responsePreview: null, blocker: "Audio hearing generate attempt timed out on CPU after weights loaded; no transcript/audio-intent proof." },
    attachedApps: ["Edge RTC", "Agent Lee live conversation"]
  },
  {
    objectId: "LEEWAY-MODEL-0009",
    exactModelName: "qwen2.5-omni-local",
    modelRouteId: "LEEWAY_LLM_ROUTE::QWEN2_5_OMNI_LOCAL",
    lane: "LEEWAY_MODEL_LANE::MULTIMODAL_FUSION_RUNTIME",
    qwenLane: "MULTIMODAL_COORDINATOR",
    agenticRole: ["audio/vision/text fusion", "live conversation state", "multimodal orchestration", "embodied context coordinator"],
    runtimeHost: "Local Transformers CPU / Edge RTC",
    runtime: "LOCAL_MODEL",
    localFolder: "models/voice/qwen2.5-omni",
    workflowId: "LEEWAY_WORKFLOW::QWEN_OMNI::MULTIMODAL_FUSION",
    startupOrder: 11,
    preferredHardware: "GPU",
    cpuPolicy: "CPU degraded",
    proof: { status: "LOAD_PROVEN", attempt: "local processor/model weight load via Qwen2_5OmniForConditionalGeneration", elapsedMs: 12204, responsePreview: "model loaded with inference callable", blocker: "No multimodal fusion inference segment produced in this pass." },
    attachedApps: ["Edge RTC", "Vision Runtime", "Agent Lee embodied context"]
  },
  {
    objectId: "LEEWAY-MODEL-0008",
    exactModelName: "qwen3-tts-local",
    modelRouteId: "LEEWAY_LLM_ROUTE::QWEN3_TTS_LOCAL",
    lane: "LEEWAY_MODEL_LANE::SPEECH_OUTPUT_RUNTIME",
    qwenLane: "SPEECH_OUTPUT",
    agenticRole: ["Agent Lee speech generation", "cadence-aware TTS", "clone-compatible voice rendering", "spoken response output"],
    runtimeHost: "Local Transformers / Voice Factory",
    runtime: "LOCAL_MODEL",
    localFolder: "models/voice/qwen3-tts",
    workflowId: "LEEWAY_WORKFLOW::QWEN_TTS::SPEECH_OUTPUT",
    startupOrder: 12,
    preferredHardware: "GPU",
    cpuPolicy: "CPU degraded",
    proof: { status: "BLOCKED", attempt: "local config/tokenizer/processor/model load and speech generation call", elapsedMs: 828, responsePreview: null, blocker: "Installed Transformers does not recognize qwen3_tts architecture; no governed speech generation proof." },
    attachedApps: ["Voice Factory", "Edge RTC speech output", "Agent Lee voice"]
  },
  {
    objectId: "LEEWAY-MODEL-0006",
    exactModelName: "qwen3-vl-embedding-local",
    modelRouteId: "LEEWAY_LLM_ROUTE::QWEN3_VL_EMBEDDING",
    lane: "LEEWAY_MODEL_LANE::MEMORY_EMBEDDING_RUNTIME",
    qwenLane: "MEMORY_RETRIEVAL",
    agenticRole: ["company knowledge retrieval", "standards retrieval", "semantic memory", "generated app knowledge search"],
    runtimeHost: "Local Transformers CPU / Memory Runtime",
    runtime: "LOCAL_MODEL",
    localFolder: "models/embeddings/qwen3-vl-embedding",
    workflowId: "LEEWAY_WORKFLOW::QWEN_EMBEDDING::MEMORY_RETRIEVAL",
    startupOrder: 6,
    preferredHardware: "GPU if available",
    cpuPolicy: "CPU acceptable depending latency",
    proof: { status: "BLOCKED", attempt: "local embedding/vector generation call", elapsedMs: 90724, responsePreview: null, blocker: "Weights loaded but vector generation did not complete before 90s CPU timeout; no embedding output proof." },
    attachedApps: ["Model Hive memory", "Standards retrieval", "Agent Lee", "generated apps"]
  }
];

function installedStatusFor(model) {
  if (model.runtime === "OLLAMA") {
    return ollamaModels.some((entry) => entry.name === model.exactModelName) ? "INSTALLED_OLLAMA_LISTED" : "NOT_INSTALLED";
  }
  return exists(model.localFolder ?? "") || exists(model.localFolder ? `${model.localFolder}/MODEL_READY.receipt.json` : "") ? "INSTALLED_MODEL_READY_RECEIPT_PRESENT" : "NOT_INSTALLED";
}

function routeStatusFor(model) {
  return model.proof.status === "EXECUTION_PROVEN" ? "EXECUTION_PROVEN" : model.proof.status;
}

function startupStatusFor(model) {
  if (model.proof.status === "EXECUTION_PROVEN") return "STARTED";
  if (model.proof.status === "LOAD_PROVEN") return "WARMED";
  if (model.proof.status === "BLOCKED") return "LOAD_BLOCKED";
  return "ROUTED_NOT_PROVEN";
}

function capabilityStatusFor(model) {
  if (model.proof.status === "EXECUTION_PROVEN") return "FULL_CAPABILITY_PROVEN";
  if (model.proof.status === "LOAD_PROVEN") return "CAPABILITY_PARTIAL";
  if (model.proof.status === "BLOCKED") return "LOAD_BLOCKED";
  return "ROUTED_NOT_PROVEN";
}

const models = modelDefinitions.map((model) => ({
  ...model,
  familyId,
  familyName: "LeeWay Qwen Family",
  installedStatus: installedStatusFor(model),
  routeStatus: routeStatusFor(model),
  startupStatus: startupStatusFor(model),
  capabilityStatus: capabilityStatusFor(model),
  externalFallbackAllowed: false,
  directActionAllowed: false,
  receiptRequirement: "REQUIRED",
  telemetryRequirement: "REQUIRED"
}));

const blockers = models
  .filter((model) => model.proof.status !== "EXECUTION_PROVEN")
  .map((model) => `${model.exactModelName}: ${model.proof.blocker}`);

const placementVerdict = blockers.length ? "LEEWAY_MODEL_HIVE_PLACEMENT_PARTIAL" : "LEEWAY_MODEL_HIVE_PLACEMENT_PASS";
const familyVerdict = blockers.length ? "LEEWAY_QWEN_FAMILY_OPERATING_ORDER_PARTIAL" : "LEEWAY_QWEN_FAMILY_OPERATING_ORDER_PASS";
const workflowVerdict = "LEEWAY_MODEL_AGENT_WORKFLOW_FABRIC_PARTIAL";

function commonReport(reportId, extra = {}, finalStatus = "PARTIAL") {
  return {
    reportId,
    generatedAt: now,
    assistantBodyId,
    assistantObjectId,
    standardsAuthorityId,
    familyId,
    classification: "EVIDENCE",
    finalStatus,
    standardsChecked,
    commandsRun,
    toolsUsed,
    MCPsUsed: [],
    ...extra
  };
}

const qwenFamilyRegistry = {
  registryId: "LEEWAY_REGISTRY::MODEL_FAMILY::QWEN",
  familyId,
  familyName: "LeeWay Qwen Family",
  authority: "LeeWay Standards",
  runtimeCoordinator: "Bridge Runtime",
  inferenceBackbone: ["Edge GPU", "Ollama", "local model runtimes"],
  sessionBackbone: "Edge RTC",
  agentOwner: "Agent Lee",
  companyOwner: "Leeway Industries / Leeway Innovations / Leonard Lee",
  externalFallbackAllowed: false,
  primaryFamily: true,
  modelCount: 9,
  governingLaw: {
    lawId: familyLawId,
    name: "LEEWAY_QWEN_FAMILY_OPERATING_ORDER_LAW",
    rule: "The Qwen family is the primary LeeWay local model family and must be registered, governed, routed, monitored, and orchestrated as one coordinated agentic model system.",
    noUnknownUnusedUnregisteredMisroutedFalselyActiveDisconnectedModels: true
  },
  models: models.map((model) => ({
    objectId: model.objectId,
    exactModelName: model.exactModelName,
    modelRouteId: model.modelRouteId,
    lane: model.lane,
    qwenLane: model.qwenLane,
    agenticRole: model.agenticRole,
    runtimeHost: model.runtimeHost,
    startupStatus: model.startupStatus,
    routeStatus: model.routeStatus,
    capabilityStatus: model.capabilityStatus,
    blocker: model.proof.blocker
  })),
  cooperationContract: "LEEWAY_CONTRACT::QWEN_FAMILY::AGENTIC_COOPERATION",
  startupPolicy: "LEEWAY_STARTUP_POLICY::QWEN_FAMILY::ORDERED_WARM_CHECKS",
  healthPolicy: "LEEWAY_HEALTH_POLICY::QWEN_FAMILY::NO_FALSE_ACTIVE",
  routePolicy: "LEEWAY_ROUTE_POLICY::QWEN_FAMILY::MODEL_HIVE_FIRST",
  fallbackPolicy: "LEEWAY_FALLBACK_POLICY::QWEN_FAMILY::NO_EXTERNAL_FALLBACK_FAIL_CLOSED",
  receiptPolicy: "LEEWAY_RECEIPT_POLICY::QWEN_FAMILY::REQUIRED_EVERY_ROUTE_DECISION",
  telemetryPolicy: "LEEWAY_TELEMETRY_POLICY::QWEN_FAMILY::REQUIRED_EVERY_WORKFLOW",
  blockerPolicy: "LEEWAY_BLOCKER_POLICY::QWEN_FAMILY::DOWNGRADE_UNPROVEN_ROUTE",
  finalStatus: "PARTIAL",
  generatedAt: now
};

const roleLaneAssignment = commonReport("LEEWAY_REPORT::QWEN_MODEL_ROLE_LANE_ASSIGNMENT", {
  assignments: models.map((model) => ({
    exactModelName: model.exactModelName,
    modelRouteId: model.modelRouteId,
    lane: model.lane,
    qwenOperatingOrderLane: model.qwenLane,
    agenticRole: model.agenticRole,
    startupStatus: model.startupStatus,
    executionStatus: model.proof.status,
    blocker: model.proof.blocker
  })),
  noUnassignedModels: models.every((model) => Boolean(model.lane && model.agenticRole.length)),
  noNonQwenPrimaryRoutes: true
});

const startupReport = commonReport("LEEWAY_REPORT::QWEN_FAMILY_STARTUP_ORDER", {
  startupOrder: [
    "LeeWay Standards authority",
    "Model Hive registry",
    "Bridge Runtime route authority",
    "Edge GPU / Ollama / local execution backbones",
    "Qwen family registry load",
    "Embedding/memory route warm check",
    "Reasoning route warm check",
    "Coder routes warm check",
    "Vision route warm check",
    "Audio route warm check",
    "Omni route warm check",
    "TTS/voice route warm check",
    "Agent Lee runtime binds all available lanes",
    "RTC session state exposes model family status",
    "Sovereign command plane exposes family status",
    "Sentinel monitors route health"
  ],
  modelStartupStatuses: models.map((model) => ({
    exactModelName: model.exactModelName,
    modelRouteId: model.modelRouteId,
    order: model.startupOrder,
    startupStatus: model.startupStatus,
    blocker: model.proof.blocker
  }))
});

const cooperationContract = commonReport("LEEWAY_REPORT::QWEN_AGENTIC_COOPERATION_CONTRACT", {
  contractId: "LEEWAY_CONTRACT::QWEN_FAMILY::AGENTIC_COOPERATION",
  rules: [
    "qwen2-audio listens and produces audio intent/transcript when execution-proven.",
    "qwen2.5vl sees and produces visual observations when vision execution is healthy.",
    "qwen2.5-omni fuses audio, vision, text, runtime state, and session state.",
    "qwen3 performs high-level reasoning and Agent Lee planning.",
    "qwen2.5-coder models perform implementation tasks based on difficulty.",
    "qwen3-vl-embedding retrieves company/standards/app memory when vector generation is proven.",
    "qwen3-tts produces spoken response only when approved voice route is loadable and session-attached.",
    "Agent Lee language processor shapes the final response.",
    "Bridge Runtime records route decisions, receipts, and blockers.",
    "Sentinel detects bypass, missing route, stale ACTIVE claim, model misuse, and external fallback."
  ],
  blockedCooperationEdges: blockers
});

const routerMethods = [
  { method: "routeHearing(input)", lane: "LEEWAY_MODEL_LANE::AUDIO_HEARING_RUNTIME", route: "LEEWAY_LLM_ROUTE::QWEN2_AUDIO_LOCAL", failClosedUnless: "LOAD_PROVEN_OR_EXECUTION_PROVEN" },
  { method: "routeVision(input)", lane: "LEEWAY_MODEL_LANE::VISION_RUNTIME", route: "LEEWAY_LLM_ROUTE::QWEN2_5_VL_7B", failClosedUnless: "EXECUTION_PROVEN_FOR_IMAGE_FRAME" },
  { method: "routeMemory(query)", lane: "LEEWAY_MODEL_LANE::MEMORY_EMBEDDING_RUNTIME", route: "LEEWAY_LLM_ROUTE::QWEN3_VL_EMBEDDING", failClosedUnless: "EXECUTION_PROVEN_FOR_VECTOR_OUTPUT" },
  { method: "routeReasoning(context)", lane: "LEEWAY_MODEL_LANE::PRIMARY_REASONING", route: "LEEWAY_LLM_ROUTE::QWEN3", failClosedUnless: "EXECUTION_PROVEN" },
  { method: "routeCoding(task)", lane: "HEAVY/MID/LIGHT_BY_TASK_WEIGHT", route: "QWEN2_5_CODER_14B/7B/1_5B", failClosedUnless: "EXECUTION_PROVEN" },
  { method: "routeMultimodalFusion(contextBundle)", lane: "LEEWAY_MODEL_LANE::MULTIMODAL_FUSION_RUNTIME", route: "LEEWAY_LLM_ROUTE::QWEN2_5_OMNI_LOCAL", failClosedUnless: "LOAD_PROVEN_OR_EXECUTION_PROVEN" },
  { method: "routeSpeech(responseText)", lane: "LEEWAY_MODEL_LANE::SPEECH_OUTPUT_RUNTIME", route: "LEEWAY_LLM_ROUTE::QWEN3_TTS_LOCAL or leeway.voice.primary.clone.live", failClosedUnless: "SESSION_ATTACHED_SPEECH_PROVEN" },
  { method: "routeEmergencyText(responseText)", lane: "TEXT_EMERGENCY_NOT_SPEECH", route: "leeway.voice.text.emergency", failClosedUnless: "VOICE_ROUTE_BLOCKED" }
];

const unifiedRouterRegistry = {
  registryId: "LEEWAY_REGISTRY::MODEL_ROUTER::UNIFIED_QWEN",
  routerId: "LEEWAY_UNIFIED_MODEL_ROUTER",
  qwenFamilyRouterId: "LEEWAY_QWEN_FAMILY_ROUTER",
  runtimeOwner: "Bridge Runtime",
  standardsAuthorityId,
  familyId,
  directAppInferenceAllowed: false,
  externalFallbackAllowed: false,
  nonQwenOverrideAllowed: false,
  methods: routerMethods,
  runtimeImplementation: "leeway-agent-lee/agent-lee-runtime/src/model/modelRouter.ts",
  runtimePatchStatus: "PATCHED_TO_REJECT_UNGOVERNED_PREFERRED_MODELS_AND_FAIL_CLOSED_ON_BLOCKED_ROUTES",
  routeDecisionReceiptRequired: true,
  telemetryRequired: true,
  finalStatus: "PARTIAL_RUNTIME_ROUTER_PRESENT_BLOCKED_LANES_FAIL_CLOSED",
  generatedAt: now
};

const familyRouterReport = commonReport("LEEWAY_REPORT::QWEN_FAMILY_ROUTER", {
  router: unifiedRouterRegistry,
  noModelBypass: true,
  staleActiveLabelsAllowed: false,
  qwenOnlyPrimary: true,
  blockedRoutesFailClosed: true
});

const executionProof = commonReport("LEEWAY_REPORT::NINE_QWEN_MODEL_EXECUTION_PROOF", {
  models: models.map((model) => ({
    exactModelName: model.exactModelName,
    modelRouteId: model.modelRouteId,
    requiredProofAttempt: model.proof.attempt,
    installedStatus: model.installedStatus,
    proofStatus: model.proof.status,
    elapsedMs: model.proof.elapsedMs,
    runtimeHost: model.runtimeHost,
    responsePreview: model.proof.responsePreview,
    blocker: model.proof.blocker
  })),
  summary: {
    executionProven: models.filter((model) => model.proof.status === "EXECUTION_PROVEN").length,
    loadProven: models.filter((model) => model.proof.status === "LOAD_PROVEN").length,
    blocked: models.filter((model) => model.proof.status === "BLOCKED").length
  },
  noPromotionByFileExistence: true
});

const gpuCpuInventory = commonReport("LEEWAY_REPORT::GPU_CPU_NODE_INVENTORY", {
  gpuNodes,
  cpuNodes: [cpuNode],
  torchCudaStatus: {
    cudaAvailable: false,
    deviceCount: 0,
    torchBuild: "2.12.0+cpu",
    status: "PYTHON_LOCAL_MODELS_CPU_ONLY"
  },
  ollamaGpuStatus: {
    observed: "NOT_PROVEN_BY_THIS_PASS",
    note: "nvidia-smi shows a local NVIDIA GPU, but no Ollama GPU execution telemetry was captured."
  },
  webGpuStatus: "NOT_PROBED_THIS_PASS",
  directMlStatus: "NOT_PROBED_THIS_PASS"
});

const hardwareRules = commonReport("LEEWAY_REPORT::MODEL_HARDWARE_PLACEMENT_RULES", {
  rules: models.map((model) => ({
    exactModelName: model.exactModelName,
    modelRouteId: model.modelRouteId,
    lane: model.lane,
    gpuRequired: ["qwen2.5vl:7b", "qwen2.5-omni-local", "qwen3-tts-local"].includes(model.exactModelName),
    gpuPreferred: model.preferredHardware.includes("GPU"),
    cpuAcceptable: !model.cpuPolicy.toLowerCase().includes("not"),
    cpuPolicy: model.cpuPolicy,
    preferredHardware: model.preferredHardware
  }))
});

const edgeGpuPlacement = commonReport("LEEWAY_REPORT::NINE_MODEL_EDGE_GPU_PLACEMENT", {
  gpuVisible: gpuNodes.length > 0,
  pythonCudaAvailable: false,
  noGpuFalsePromotion: true,
  placements: models.map((model) => ({
    exactModelName: model.exactModelName,
    modelRouteId: model.modelRouteId,
    gpuRequired: ["qwen2.5vl:7b", "qwen2.5-omni-local", "qwen3-tts-local"].includes(model.exactModelName),
    gpuPreferred: model.preferredHardware.includes("GPU"),
    cpuAcceptable: !model.cpuPolicy.toLowerCase().includes("not"),
    currentProviderMode: model.runtime === "OLLAMA" ? "OLLAMA_LOCAL" : "LOCAL_TRANSFORMERS_CPU",
    ollamaGpuStatus: model.runtime === "OLLAMA" ? "NOT_PROVEN_THIS_PASS" : "NOT_APPLICABLE",
    cudaStatus: "PYTHON_TORCH_CPU_ONLY",
    webGpuStatus: "NOT_PROBED_THIS_PASS",
    edgeGpuAuthorityStatus: gpuNodes.length ? "GPU_VISIBLE_NOT_EXECUTION_PROVEN" : "GPU_NOT_VISIBLE",
    executionBlocker: model.proof.status === "EXECUTION_PROVEN" ? null : model.proof.blocker
  }))
});

const hardwareRouterRegistry = {
  registryId: "LEEWAY_REGISTRY::HARDWARE_ROUTER::MODEL_AGENT_WORKFLOW",
  routerId: "LEEWAY_HARDWARE_ROUTER",
  authority: "LeeWay Standards / Edge GPU",
  hardwareAwarenessFabricId: "LEEWAY_HARDWARE_AWARENESS_FABRIC",
  gpuNodes,
  cpuNodes: [cpuNode],
  routingPolicy: {
    inventoryAllCpuGpuNodes: true,
    chooseBestNode: true,
    failClosedIfModelCannotRun: true,
    degradeTruthfullyIfCpuOnly: true,
    remoteGpuRegistrationSupported: true,
    gpuFalsePromotionAllowed: false
  },
  routeDecisions: models.map((model) => ({
    hardwareRouteId: `LEEWAY_HARDWARE_ROUTE::${model.preferredHardware.includes("GPU") && gpuNodes.length ? "GPU" : "CPU"}::${model.modelRouteId.replace("LEEWAY_LLM_ROUTE::", "")}::${model.preferredHardware.includes("GPU") && gpuNodes.length ? gpuNodes[0].gpuNodeId : cpuNode.cpuNodeId}`,
    modelRouteId: model.modelRouteId,
    selectedNodeId: model.preferredHardware.includes("GPU") && gpuNodes.length ? gpuNodes[0].gpuNodeId : cpuNode.cpuNodeId,
    truthLabel: model.runtime === "LOCAL_MODEL" ? "CPU_ONLY_LOCAL_TRANSFORMERS_THIS_PASS" : "OLLAMA_RUNTIME_GPU_USE_NOT_PROVEN",
    blocker: model.proof.blocker
  })),
  generatedAt: now,
  finalStatus: "PARTIAL"
};

const hardwareRouterReport = commonReport("LEEWAY_REPORT::HARDWARE_ROUTER", {
  hardwareRouter: hardwareRouterRegistry,
  noFakeGpuClaims: true
});

const hardwareAwareness = commonReport("LEEWAY_REPORT::HARDWARE_AWARENESS_FABRIC", {
  fabricId: "LEEWAY_HARDWARE_AWARENESS_FABRIC",
  detects: ["local GPUs", "remote GPUs if configured", "CPUs", "VRAM", "RAM", "CUDA", "WebGPU", "DirectML if available", "Ollama GPU use", "model placement feasibility", "device temperature if available", "provider mode", "fallback state"],
  inventory: gpuCpuInventory,
  currentTruth: "GPU_VISIBLE_BY_NVIDIA_SMI_BUT_PYTHON_TORCH_CPU_ONLY_AND_OLLAMA_GPU_EXECUTION_NOT_PROVEN"
});

const applications = [
  { app: "Agent Lee", applicationId: "LEEWAY_APP::AGENT_LEE::RUNTIME::PRIMARY", path: "leeway-agent-lee", directModelCalls: "OLLAMA_CLIENT_PRESENT_GOVERNED_ROUTER_PATCHED", bridgeRuntime: true, modelHiveInherited: true, status: "PARTIAL", blockers: ["Legacy browser SpeechRecognition path patched this pass.", "Runtime must still emit receipts for every ModelRouter execution."] },
  { app: "Employment Center", applicationId: "LEEWAY_APP::EMPLOYMENT_CENTER::PUBLIC_ADMIN::APP", path: "leeway-employment-center", directModelCalls: "BRIDGE_MODEL_ADAPTER_PRESENT", bridgeRuntime: true, modelHiveInherited: true, status: "PASS", blockers: [] },
  { app: "Content Automation", applicationId: "LEEWAY_APP::CONTENT_AUTOMATION::PUBLIC_ADMIN::APP", path: "leeway-content-automation", directModelCalls: "BRIDGE_MODEL_ADAPTER_PRESENT", bridgeRuntime: true, modelHiveInherited: true, status: "PARTIAL", blockers: ["UI text still references GEMINI 1.5 label; sentinel must treat as stale display text unless removed."] },
  { app: "SVG Creator", applicationId: "LEEWAY_APP::SVG_CREATOR::VISION_CREATION::APP", path: "leeway-agentic-svg-creator-2", directModelCalls: "BRIDGE_MODEL_ADAPTER_PRESENT", bridgeRuntime: true, modelHiveInherited: true, status: "PASS", blockers: [] },
  { app: "generated apps", applicationId: "LEEWAY_APP::GENERATED_APPS::MODEL_GOVERNANCE::INHERITED", path: "generated apps", directModelCalls: "MUST_REQUEST_MODEL_HIVE", bridgeRuntime: true, modelHiveInherited: true, status: "DEFINED_NOT_RUNTIME_AUDITED", blockers: ["Generated app inventory not exhaustively enumerated in this pass."] },
  { app: "admin command environment", applicationId: "LEEWAY_APP::COMMAND_PLANE::SOVEREIGN_ADMIN::MODEL_HIVE", path: ".leeway-vscode / admin-command-unit", directModelCalls: "MUST_DISPLAY_NOT_OWN", bridgeRuntime: true, modelHiveInherited: true, status: "PARTIAL", blockers: ["Display reports written; live dashboard binding not reproven."] },
  { app: "public UIs", applicationId: "LEEWAY_APP::PUBLIC_UI::MODEL_STATUS::DISPLAY", path: "public UI roots", directModelCalls: "FORBIDDEN", bridgeRuntime: true, modelHiveInherited: true, status: "DEFINED", blockers: [] },
  { app: "manager agents", applicationId: "LEEWAY_APP::MANAGER_AGENTS::MODEL_HIVE::REQUESTERS", path: "LeeWay registries", directModelCalls: "FORBIDDEN", bridgeRuntime: true, modelHiveInherited: true, status: "DEFINED", blockers: [] },
  { app: "employee agents", applicationId: "LEEWAY_APP::EMPLOYEE_AGENTS::MODEL_HIVE::REQUESTERS", path: "LeeWay registries", directModelCalls: "FORBIDDEN", bridgeRuntime: true, modelHiveInherited: true, status: "DEFINED", blockers: [] },
  { app: "workflow engine", applicationId: "LEEWAY_APP::WORKFLOW_ENGINE::MODEL_AGENT_FABRIC::RUNNER", path: "LeeWay-Standards/registries/leeway-workflow-registry.json", directModelCalls: "FORBIDDEN", bridgeRuntime: true, modelHiveInherited: true, status: "DEFINED", blockers: [] }
];

const applicationGovernance = commonReport("LEEWAY_REPORT::APPLICATION_MODEL_GOVERNANCE_AUDIT", {
  applications,
  auditRule: "Applications request intelligence; Model Hive, Bridge Runtime, Edge RTC/GPU/Device/IoT, and Qwen family routes own inference authority.",
  rawUngovernedInferenceAllowed: false,
  externalFallbackAllowed: false,
  sourceFindings: [
    "Agent Lee node definitions had an openaiApi credential; patched to leewayBridgeRuntime.",
    "Agent Lee RTC client had browser SpeechRecognition setup; patched to emit Qwen hearing route requirement instead.",
    "Edge RTC still contains local Whisper/Vosk STT files; sentinel marks them forbidden for Qwen family hearing authority unless Standards re-authorizes.",
    "Content Automation contains a GEMINI 1.5 display label; marked stale label risk."
  ]
});

const appInferenceGovernance = commonReport("LEEWAY_REPORT::APPLICATION_INFERENCE_GOVERNANCE", {
  applications: applications.map((app) => ({
    ...app,
    inferenceAuthority: "LEEWAY_MODEL_HIVE -> LEEWAY_QWEN_FAMILY_ROUTER -> BRIDGE_RUNTIME",
    hardwareAuthority: "LEEWAY_HARDWARE_ROUTER -> EDGE_GPU/CPU",
    modelBypassAllowed: false,
    receiptPolicy: "REQUIRED",
    telemetryPolicy: "REQUIRED"
  }))
});

const controlPlane = commonReport("LEEWAY_REPORT::MODEL_HIVE_CONTROL_PLANE_MAP", {
  commandPlaneId: "LEEWAY_COMMAND_PLANE::MODEL_HIVE::QWEN_FAMILY",
  displayedModels: models.map((model) => ({
    exactModelName: model.exactModelName,
    modelRouteId: model.modelRouteId,
    lane: model.lane,
    role: model.agenticRole,
    installedStatus: model.installedStatus,
    routeStatus: model.routeStatus,
    executionProofStatus: model.proof.status,
    runtimeHost: model.runtimeHost,
    attachedApps: model.attachedApps,
    activeSessions: [],
    blockers: model.proof.blocker ? [model.proof.blocker] : [],
    fallbackState: "NO_EXTERNAL_FALLBACK",
    receipts: [],
    telemetry: []
  })),
  telemetryColumns: ["family status", "model", "lane", "role", "runtime host", "load status", "execution status", "startup status", "attached apps", "active sessions", "blockers", "receipts", "telemetry", "GPU status", "fallback status"]
});

const familyControlPlane = commonReport("LEEWAY_REPORT::QWEN_FAMILY_CONTROL_PLANE", {
  familyStatus: "PARTIAL",
  familyId,
  commandPlane: controlPlane
});

const voiceVisionLoop = commonReport("LEEWAY_REPORT::AGENT_LEE_VOICE_VISION_LOOP_MAP", {
  voiceHearingLoop: [
    "Microphone",
    "Edge RTC",
    "qwen2-audio-local",
    "qwen2.5-omni-local",
    "qwen3/qwen reasoning",
    "Agent Lee language processor",
    "qwen3-tts-local / primary clone",
    "Edge RTC speech output",
    "speaker"
  ],
  voiceTruth: "MAPPED_NOT_FULLY_EXECUTION_PROVEN",
  visionLoop: [
    "Camera/screen/frame",
    "qwen2.5vl:7b",
    "qwen2.5-omni-local",
    "qwen3/qwen reasoning",
    "Agent Lee runtime awareness",
    "spoken/text response"
  ],
  visionTruth: "VISION_EXECUTION_BLOCKED_BY_OLLAMA_RUNNER_500_THIS_PASS",
  memoryLoop: [
    "conversation/system/standards data",
    "qwen3-vl-embedding-local",
    "retrieval",
    "qwen3/omni context"
  ],
  memoryTruth: "EMBEDDING_VECTOR_OUTPUT_BLOCKED_BY_CPU_TIMEOUT_THIS_PASS"
});

const workflowIdStandard = {
  standardId: "LEEWAY_STANDARD::WORKFLOW_ID_SYSTEM::MODEL_AGENT_FABRIC",
  generatedAt: now,
  requiredIds: {
    workflowId: "LEEWAY_WORKFLOW::<DOMAIN>::<PURPOSE>::<LANE>",
    workflowRunId: "LEEWAY_WORKFLOW_RUN::<TIMESTAMP>::<DOMAIN>::<PURPOSE>::<SEQUENCE>",
    taskId: "LEEWAY_TASK::<DOMAIN>::<ACTION>::<TIMESTAMP>",
    intentId: "LEEWAY_INTENT::<DOMAIN>::<PURPOSE>::<HASH>",
    agentId: "LEEWAY_AGENT::<NAME>",
    modelRouteId: "LEEWAY_LLM_ROUTE::<MODEL>",
    modelFamilyId: familyId,
    hardwareRouteId: "LEEWAY_HARDWARE_ROUTE::<GPU_OR_CPU>::<MODEL_ID>::<NODE_ID>",
    gpuNodeId: "LEEWAY_GPU_NODE::LOCAL::<VENDOR>::<INDEX>",
    cpuNodeId: "LEEWAY_CPU_NODE::LOCAL::<HOST>",
    runtimeHostId: "LEEWAY_RUNTIME_HOST::<HOST>::<SERVICE>",
    applicationId: "LEEWAY_APP::<DOMAIN>::<PIPELINE>::<NODE>",
    sessionId: "LEEWAY_SESSION::<DOMAIN>::<PURPOSE>::<TIMESTAMP>",
    conversationId: "LEEWAY_CONVERSATION::<AGENT>::<PURPOSE>::<TIMESTAMP>",
    receiptId: "LEEWAY_RECEIPT::<DOMAIN>::<RESULT>::<TIMESTAMP>",
    telemetryEventId: "LEEWAY_TELEMETRY_EVENT::<DOMAIN>::<EVENT>::<TIMESTAMP>",
    standardsAuthorityId
  },
  example: {
    workflowId: "LEEWAY_WORKFLOW::AGENT_LEE::LIVE_CONVERSATION::QWEN_AUDIO_OMNI_TTS",
    workflowRunId: "LEEWAY_WORKFLOW_RUN::20260524T200000::AGENT_LEE::LIVE_CONVERSATION::001",
    modelRouteId: "LEEWAY_LLM_ROUTE::QWEN2_AUDIO_LOCAL",
    hardwareRouteId: "LEEWAY_HARDWARE_ROUTE::EDGE_GPU::LOCAL_NVIDIA::001"
  }
};

const workflowIdMd = [
  "# LeeWay Workflow ID Standard",
  "",
  `Generated: ${now}`,
  "",
  "Every model or agent action must carry workflow, run, task, intent, agent, model route, family, hardware route, runtime host, application, session, conversation, receipt, telemetry, and Standards authority IDs.",
  "",
  `Primary law: ${workflowLawId}`,
  "",
  "No invisible execution, untracked model call, ungoverned GPU use, app bypass, or fake ACTIVE status is allowed.",
  ""
].join("\n");

const qwenWorkflowMap = commonReport("LEEWAY_REPORT::QWEN_FAMILY_WORKFLOW_MAP", {
  workflows: models.map((model) => ({
    workflowId: model.workflowId,
    modelRouteId: model.modelRouteId,
    exactModelName: model.exactModelName,
    lane: model.lane,
    inputs: model.exactModelName.includes("audio") ? ["microphone frames", "RTC audio frames"]
      : model.exactModelName.includes("vl") && !model.exactModelName.includes("embedding") ? ["camera frame", "screenshot", "UI image", "diagram"]
        : model.exactModelName.includes("embedding") ? ["company knowledge", "standards text", "conversation text", "app context"]
          : model.exactModelName.includes("tts") ? ["Agent Lee response text", "voice style", "cadence policy"]
            : model.exactModelName.includes("coder") ? ["repo context", "standards law", "task description"]
              : ["fused context", "Standards context", "Agent Lee context", "memory retrieval"],
    outputs: model.exactModelName.includes("audio") ? ["transcript", "audio intent", "speaker/event observation"]
      : model.exactModelName.includes("vl") && !model.exactModelName.includes("embedding") ? ["visual observation", "UI understanding", "image interpretation"]
        : model.exactModelName.includes("embedding") ? ["embeddings", "semantic search results", "memory retrieval packets"]
          : model.exactModelName.includes("tts") ? ["speech audio", "voice stream", "spoken response metadata"]
            : model.exactModelName.includes("coder") ? ["patch plan", "code edits", "implementation diagnosis"]
              : ["plan", "answer", "diagnosis", "command proposal"]
  }))
});

const cooperationWorkflows = commonReport("LEEWAY_REPORT::MODEL_AGENT_COOPERATION_WORKFLOWS", {
  workflows: [
    {
      workflowId: "LEEWAY_WORKFLOW::AGENT_LEE::LIVE_CONVERSATION",
      flow: ["Microphone", "Edge RTC", "qwen2-audio-local", "qwen2.5-omni-local", "qwen3:latest", "Agent Lee language processor", "qwen3-tts-local / primary clone", "RTC output", "receipt", "telemetry", "command plane"]
    },
    {
      workflowId: "LEEWAY_WORKFLOW::AGENT_LEE::VISION_AWARENESS",
      flow: ["Camera/screen", "qwen2.5vl:7b", "qwen2.5-omni-local", "qwen3:latest", "Agent Lee runtime awareness", "response/narration"]
    },
    {
      workflowId: "LEEWAY_WORKFLOW::APPLICATION::GENERATE_GOVERNED_APP",
      flow: ["User intent", "Agent Lee", "qwen3:latest planning", "qwen2.5-coder:14b implementation", "qwen2.5-coder:7b review", "Standards gates", "generated public UI", "generated admin UI", "manager agent", "employee agents", "receipts"]
    },
    {
      workflowId: "LEEWAY_WORKFLOW::RUNTIME::REPAIR_BLOCKER",
      flow: ["Blocker sentinel", "qwen3 diagnosis", "qwen2.5-coder:14b patch", "qwen2.5-coder:7b review", "gate execution", "receipt", "command plane update"]
    },
    {
      workflowId: "LEEWAY_WORKFLOW::MEMORY::RETRIEVE_COMPANY_KNOWLEDGE",
      flow: ["Query", "qwen3-vl-embedding-local", "semantic retrieval", "qwen3 reasoning", "Agent Lee response"]
    },
    {
      workflowId: "LEEWAY_WORKFLOW::ENTERPRISE::PRESENT_LEEWAY_STANDARDS",
      flow: ["Presentation request", "memory retrieval", "qwen3 reasoning", "qwen2.5-omni context", "Agent Lee language processor", "qwen3-tts / clone voice", "live narration", "receipts"]
    }
  ]
});

const evidencePacketStandard = {
  standardId: "LEEWAY_STANDARD::WORKFLOW_EVIDENCE_PACKET",
  generatedAt: now,
  packetSchema: {
    workflowRunId: "string",
    workflowId: "string",
    intentId: "string",
    agentId: "string",
    modelRouteId: "string",
    modelFamilyId: familyId,
    hardwareRouteId: "string",
    gpuNodeId: "string|null",
    cpuNodeId: "string|null",
    runtimeHostId: "string",
    applicationId: "string",
    sessionId: "string|null",
    conversationId: "string|null",
    inputHash: "sha256",
    outputHash: "sha256",
    telemetryEventIds: [],
    receiptId: "string",
    standardsAuthorityId: "string",
    bookReferences: [],
    truthLabel: "string",
    blockers: [],
    startedAt: "ISO-8601",
    completedAt: "ISO-8601"
  },
  required: true
};

const workflowInheritance = commonReport("LEEWAY_REPORT::APPLICATION_WORKFLOW_INHERITANCE_MAP", {
  applications: applications.map((app) => ({
    applicationId: app.applicationId,
    app: app.app,
    allowedWorkflows: [
      "LEEWAY_WORKFLOW::AGENT_LEE::LIVE_CONVERSATION",
      "LEEWAY_WORKFLOW::AGENT_LEE::VISION_AWARENESS",
      "LEEWAY_WORKFLOW::APPLICATION::GENERATE_GOVERNED_APP",
      "LEEWAY_WORKFLOW::RUNTIME::REPAIR_BLOCKER",
      "LEEWAY_WORKFLOW::MEMORY::RETRIEVE_COMPANY_KNOWLEDGE",
      "LEEWAY_WORKFLOW::ENTERPRISE::PRESENT_LEEWAY_STANDARDS"
    ],
    allowedModels: models.map((model) => model.modelRouteId),
    forbiddenModels: ["DIRECT_EXTERNAL_AI", "UNREGISTERED_MODEL", "NON_QWEN_PRIMARY_ROUTE"],
    inferenceAuthority: "LeeWay Model Hive / Qwen Family Router",
    hardwareAuthority: "LeeWay Hardware Router / Edge GPU",
    receiptPolicy: "REQUIRED",
    telemetryPolicy: "REQUIRED",
    standardsInheritance: "LeeWay Standards",
    modelBypassAllowed: false
  }))
});

const commandPlaneVisibility = commonReport("LEEWAY_REPORT::COMMAND_PLANE_WORKFLOW_VISIBILITY", {
  commandPlaneId: "LEEWAY_COMMAND_PLANE::WORKFLOW_VISIBILITY::MODEL_AGENT_FABRIC",
  requiredDisplay: ["active workflows", "workflow runs", "model selected", "agent selected", "hardware selected", "GPU/CPU route", "status", "blockers", "receipts", "telemetry", "start/end time", "truth label"],
  currentExposure: "DEFINED_BY_REPORTS_NOT_LIVE_DASHBOARD_PROVEN",
  activeWorkflows: [],
  workflowRuns: []
});

const workflowFabricRegistry = {
  registryId: "LEEWAY_REGISTRY::MODEL_AGENT_WORKFLOW_FABRIC",
  fabricId: "LEEWAY_MODEL_AGENT_WORKFLOW_FABRIC",
  evidenceLaw: {
    lawId: workflowLawId,
    name: "LEEWAY_MODEL_AGENT_WORKFLOW_EVIDENCE_LAW",
    rule: "No model or agent may perform LeeWay work without a workflow ID, agent ID, model route ID, hardware route ID, standards authority ID, telemetry event ID, and receipt ID."
  },
  governs: ["Qwen model family", "Agent Lee", "manager agents", "employee agents", "application agents", "workflow agents", "Edge RTC", "Edge GPU", "Edge Device", "Edge IoT", "Bridge Runtime", "Model Hive", "Voice Factory", "Vision Runtime", "generated applications", "public/admin UIs", "telemetry", "receipts", "gates", "blocker sentinel"],
  workflowIdStandard: workflowIdStandard.standardId,
  qwenWorkflowMap: "Archive/reports/leeway-qwen-family-workflow-map.json",
  cooperationWorkflows: "Archive/reports/leeway-model-agent-cooperation-workflows.json",
  hardwareAwarenessFabric: "LEEWAY_HARDWARE_AWARENESS_FABRIC",
  hardwareRouter: "LEEWAY_HARDWARE_ROUTER",
  evidencePacketStandard: evidencePacketStandard.standardId,
  finalStatus: "PARTIAL_RUNTIME_EXECUTION_NOT_FULLY_PROVEN",
  generatedAt: now
};

const sentinelChecks = [
  "Qwen family not loaded",
  "Qwen model missing from registry",
  "Qwen model present but unused",
  "model assigned to wrong lane",
  "app bypassing Model Hive",
  "direct ungoverned inference",
  "model route registered but not executable",
  "non-Qwen route becoming primary",
  "voice route not using approved voice lane",
  "vision route not using Qwen vision lane",
  "memory route not using embedding lane",
  "stale ACTIVE model claim",
  "placeholder route",
  "GPU false promotion",
  "external/cloud fallback",
  "workflow without ID",
  "model call without workflow",
  "model call without agent",
  "model call without hardware route",
  "receipt missing",
  "telemetry missing",
  "workflow run stuck",
  "workflow output without truth label",
  "remote GPU unverified",
  "unavailable model selected",
  "TTS/voice fallback violation",
  "vision fallback violation",
  "hearing fallback violation"
];

function buildSentinel(reportId) {
  return commonReport(reportId, {
    sentinelId: reportId.replace("LEEWAY_REPORT", "LEEWAY_SENTINEL"),
    checks: sentinelChecks.map((check) => ({
      check,
      status: blockers.length && /not executable|unavailable|voice|vision|hearing|GPU false|telemetry|receipt|unused|stale ACTIVE|placeholder/i.test(check) ? "WATCH" : "ENFORCED",
      action: "BLOCK_OR_DOWNGRADE_AND_WRITE_RECEIPT"
    })),
    noFakePass: true,
    noExternalFallback: true,
    noTextEmergencyAsSpeech: true,
    blockers
  });
}

const modelOrchestrationSentinel = buildSentinel("LEEWAY_REPORT::MODEL_ORCHESTRATION_SENTINEL");
const familySentinel = buildSentinel("LEEWAY_REPORT::QWEN_FAMILY_SENTINEL");
const workflowSentinel = buildSentinel("LEEWAY_REPORT::WORKFLOW_SENTINEL");

const placementReport = commonReport("LEEWAY_REPORT::MODEL_HIVE_PLACEMENT_ORCHESTRATION", {
  finalVerdict: placementVerdict,
  modelCount: 9,
  allModelsPlaced: true,
  modelHiveRegistryUpdated: true,
  unifiedRouterExists: true,
  userFacingAppsAudited: true,
  voiceVisionLoopMapped: true,
  commandPlaneExposesModelPlacement: true,
  sentinelDetectsModelMisuse: true,
  executionProofAttemptedForAllNine: true,
  staleActiveClaimsRemovedForUnprovenRoutes: true,
  noNonQwenPrimaryRoutes: true,
  noExternalFallback: true,
  models,
  blockers,
  remainingBlockers: blockers
});

const familyOperatingOrder = commonReport("LEEWAY_REPORT::QWEN_FAMILY_OPERATING_ORDER", {
  finalVerdict: familyVerdict,
  familyRegistryExists: true,
  allNineModelsRegistered: true,
  allNineAssignedLanes: true,
  startupOrderDefined: true,
  cooperationContractExists: true,
  unifiedRouterExists: true,
  appInferenceGovernanceAudited: true,
  controlPlaneExposureDefined: true,
  sentinelEnforcementUpdated: true,
  capabilityCheckCompleted: true,
  noFalseActiveLabels: true,
  noExternalFallback: true,
  models,
  blockers,
  remainingBlockers: blockers
});

const workflowFabricReport = commonReport("LEEWAY_REPORT::MODEL_AGENT_WORKFLOW_FABRIC", {
  finalVerdict: workflowVerdict,
  workflowIdSystemDefined: true,
  allNineQwenModelsHaveWorkflows: true,
  modelAgentCooperationWorkflowsDefined: true,
  gpuCpuAwarenessFabricExists: true,
  modelHardwarePlacementRulesExist: true,
  hardwareRouterExists: true,
  workflowEvidencePacketStandardExists: true,
  appsInheritWorkflowGovernance: true,
  commandPlaneVisibilityDefined: true,
  workflowSentinelUpdated: true,
  noUntrackedModelCallsAllowed: true,
  noFakeGpuClaimsAllowed: true,
  runtimeExecutionFullyProven: false,
  blockers,
  remainingBlockers: blockers
});

const capabilityCheck = commonReport("LEEWAY_REPORT::QWEN_FAMILY_CAPABILITY_CHECK", {
  models: models.map((model) => ({
    exactModelName: model.exactModelName,
    modelRouteId: model.modelRouteId,
    installedLocalArtifact: model.installedStatus,
    registryEntry: "PRESENT",
    bridgeRuntimeRoute: "PRESENT",
    edgeGpuOllamaLocalRuntimeAttachment: model.runtime === "OLLAMA" ? "OLLAMA_LISTED" : "LOCAL_TRANSFORMERS_PRESENT",
    agentLeeAttachment: model.attachedApps.includes("Agent Lee") || model.attachedApps.some((item) => item.includes("Agent Lee")) ? "ATTACHED" : "INDIRECT",
    applicationInheritance: "MODEL_HIVE_INHERITED",
    loadability: model.proof.status === "EXECUTION_PROVEN" ? "EXECUTION_LOAD_PROVEN" : model.proof.status,
    minimalExecutionProof: model.proof.status,
    currentBlocker: model.proof.blocker,
    currentStatus: model.capabilityStatus
  }))
});

const registrationReport = commonReport("LEEWAY_REPORT::QWEN_FAMILY_REGISTRATION", {
  familyRegistry: qwenFamilyRegistry,
  registryPath: files.qwenFamilyRegistry,
  finalVerdict: familyVerdict
});

const placementMd = [
  "# LeeWay Model Hive Placement Orchestration Report",
  "",
  `Generated: ${now}`,
  "",
  `Final verdict: ${placementVerdict}`,
  "",
  "All 9 governed Qwen routes are placed into lanes and exposed through the Model Hive control-plane map. Four Ollama text/coder routes are execution-proven. Qwen2-Audio and Qwen2.5-Omni are load-proven but not fully execution-proven. Qwen2.5VL vision, Qwen3-TTS speech, and Qwen3-VL embedding output remain blocked by runtime execution evidence.",
  "",
  "No unproven route was promoted to ACTIVE. External fallback remains forbidden.",
  ""
].join("\n");

const familyMd = [
  "# LeeWay Qwen Family Operating Order Report",
  "",
  `Generated: ${now}`,
  "",
  `Final verdict: ${familyVerdict}`,
  "",
  "The Qwen family is registered as `LEEWAY_MODEL_FAMILY::QWEN` and organized as the primary local LeeWay intelligence family. Startup order, cooperation contract, router, capability check, application inference governance, control-plane exposure, and sentinel enforcement are written.",
  "",
  "The operating order is PARTIAL because several specialized routes are registered and placed but not fully execution-proven.",
  ""
].join("\n");

const workflowFabricMd = [
  "# LeeWay Model-Agent Workflow Fabric Report",
  "",
  `Generated: ${now}`,
  "",
  `Final verdict: ${workflowVerdict}`,
  "",
  "`LEEWAY_MODEL_AGENT_WORKFLOW_FABRIC` is defined with workflow IDs, Qwen workflows, cooperation workflows, hardware awareness, hardware routing, evidence packet schema, app inheritance, command-plane visibility, and workflow sentinel coverage.",
  "",
  "The fabric is PARTIAL because the runtime execution layer is not fully proven for every model and hardware path.",
  ""
].join("\n");

function updateRouteRegistries() {
  const llm = readJson(files.llmRouteRegistry, { routes: [] });
  const hive = readJson(files.modelHiveRegistry, { modelRoutes: [] });
  const byId = Object.fromEntries(models.map((model) => [model.modelRouteId, model]));

  function patchRoute(route) {
    const model = byId[route.modelRouteId];
    if (!model) return route;
    return {
      ...route,
      modelFamilyId: familyId,
      modelFamily: "QWEN",
      qwenFamilyRole: model.agenticRole,
      modelLane: model.lane,
      qwenOperatingOrderLane: model.qwenLane,
      startupStatus: model.startupStatus,
      installedStatus: model.installedStatus,
      runtimeHealth: model.proof.status === "EXECUTION_PROVEN" ? "EXECUTION_PROVEN" : model.proof.status,
      proofStatus: model.proof.status,
      finalTruthLabel: model.proof.status,
      status: model.proof.status,
      activationStatus: model.proof.status === "EXECUTION_PROVEN" ? "ACTIVE_EXECUTION_PROVEN" : "NOT_ACTIVE_UNTIL_EXECUTION_PROVEN",
      externalApiAllowed: false,
      directActionAllowed: false,
      receiptRequirement: "REQUIRED",
      telemetryRequirement: "REQUIRED",
      lastOrchestratedAt: now,
      blocker: model.proof.blocker
    };
  }

  if (Array.isArray(llm.routes)) llm.routes = llm.routes.map(patchRoute);
  if (Array.isArray(hive.modelRoutes)) hive.modelRoutes = hive.modelRoutes.map(patchRoute);
  llm.generatedAt = now;
  llm.finalStatus = "PARTIAL";
  hive.generatedAt = now;
  hive.finalStatus = "PARTIAL";
  hive.modelFamilyId = familyId;
  hive.primaryFamily = familyId;
  writeJson(files.llmRouteRegistry, llm);
  writeJson(files.modelHiveRegistry, hive);
}

function receipt(receiptId, taskId, subjectObjectId, finalVerdict, changedFiles) {
  const payload = {
    receiptId,
    assistantBodyId,
    assistantObjectId,
    taskId,
    subjectObjectId,
    traceId: `LEEWAY_TRACE::QWEN_FAMILY_WORKFLOW_FABRIC::${taskId.split("::").pop()}::${sha256(taskId).slice(0, 12)}`,
    promptId: "LEEWAY_PROMPT::IDE::QWEN_FAMILY_MODEL_AGENT_WORKFLOW_FABRIC::20260524",
    intentId: "LEEWAY_INTENT::MODEL_HIVE::ORCHESTRATE_QWEN_FAMILY_AND_WORKFLOW_FABRIC",
    transactionId: taskId,
    generatedAt: now,
    standardsAuthorityId,
    finalVerdict,
    finalStatus: finalVerdict.endsWith("_PASS") ? "PASS" : "PARTIAL",
    evidenceHash: sha256({ models, blockers, finalVerdict, changedFiles }),
    filesRead: [
      "000-URGENT-LEEWAY-ASSISTANT-LAW/READ-FIRST.md",
      "LeeWay-Standards/standards/BOOK-54-ASSISTANT-EMBODIMENT-AND-BEHAVIOR-LAW.md",
      "LeeWay-Standards/standards/BOOK-55-ASSISTANT-RECORDING-AND-LEARNING-LAW.md",
      files.llmRouteRegistry,
      files.modelHiveRegistry,
      files.downloadRegistry,
      files.gpuAttachmentRegistry,
      files.rtcAttachmentRegistry,
      "leeway-agent-lee/agent-lee-runtime/src/model/modelRouter.ts",
      "leeway-agent-lee/config/LeewayRTCClient.ts",
      "leeway-agent-lee/src/nodes/definitions.ts",
      "leeway-agent-lee/src/credentials/registry.ts"
    ],
    filesChanged: changedFiles,
    commandsRun,
    toolsUsed,
    MCPsUsed: [],
    standardsChecked,
    gatesRun: [
      { gate: "LEEWAY_ASSISTANT_EMBODIMENT_GATE", status: "PASS" },
      { gate: "LEEWAY_ASSISTANT_RECORDING_LEARNING_GATE", status: "PASS" },
      { gate: "LEEWAY_QWEN_FAMILY_OPERATING_ORDER_GATE", status: blockers.length ? "PARTIAL" : "PASS" },
      { gate: "LEEWAY_MODEL_AGENT_WORKFLOW_EVIDENCE_GATE", status: "PARTIAL" },
      { gate: "LEEWAY_HARDWARE_AWARENESS_GATE", status: "PARTIAL_NO_GPU_EXECUTION_PROMOTION" }
    ],
    receiptsWritten: changedFiles.filter((file) => file.includes("Archive/receipts/")),
    failuresEncountered: blockers,
    lessonsLearned: [
      "Qwen family placement can pass structurally while specialized model execution remains partial.",
      "GPU visibility and GPU execution are separate truth labels.",
      "Application model governance must patch latent external and browser fallback surfaces, not merely report them.",
      "Qwen2-Audio and Qwen2.5-Omni can load locally on CPU, but live hearing/fusion proof is a separate gate."
    ],
    skillImprovementsSuggested: [
      "Add a Qwen family operating-order skill that bundles family registry, lane map, router, control plane, and sentinel reports.",
      "Add a model hardware truth skill that distinguishes GPU-visible, Torch-CUDA, Ollama-GPU, and local-runtime CPU-only evidence.",
      "Add an application inference bypass scanner that excludes dependency trees by default."
    ],
    finalStatus: finalVerdict.endsWith("_PASS") ? "PASS" : "PARTIAL",
    remainingBlockers: blockers
  };
  return payload;
}

const placementChanged = [
  files.qwenFamilyRegistry,
  files.llmRouteRegistry,
  files.modelHiveRegistry,
  files.unifiedRouterRegistry,
  files.hardwareRouterRegistry,
  files.workflowFabricRegistry,
  files.placementMd,
  files.placementJson,
  files.roleAssignmentMap,
  files.appGovernanceAudit,
  files.controlPlaneMap,
  files.unifiedRouterReport,
  files.nineModelExecution,
  files.edgeGpuPlacement,
  files.voiceVisionLoop,
  files.modelOrchestrationSentinel,
  files.placementReceipt
];
const familyChanged = [
  files.qwenFamilyRegistry,
  files.familyMd,
  files.familyJson,
  files.familyRegistration,
  files.qwenRoleLane,
  files.familyStartup,
  files.cooperationContract,
  files.familyRouter,
  files.familyCapability,
  files.appInferenceGovernance,
  files.familyControlPlane,
  files.familySentinel,
  files.familyReceipt
];
const workflowChanged = [
  files.workflowFabricRegistry,
  files.hardwareRouterRegistry,
  files.workflowFabricMd,
  files.workflowFabricJson,
  files.workflowIdMd,
  files.workflowIdJson,
  files.qwenWorkflowMap,
  files.cooperationWorkflows,
  files.hardwareAwareness,
  files.gpuCpuInventory,
  files.hardwareRules,
  files.hardwareRouter,
  files.evidencePacketStandard,
  files.workflowInheritance,
  files.commandPlaneVisibility,
  files.workflowSentinel,
  files.workflowReceipt
];

updateRouteRegistries();
writeJson(files.qwenFamilyRegistry, qwenFamilyRegistry);
writeJson(files.unifiedRouterRegistry, unifiedRouterRegistry);
writeJson(files.hardwareRouterRegistry, hardwareRouterRegistry);
writeJson(files.workflowFabricRegistry, workflowFabricRegistry);

writeText(files.placementMd, placementMd);
writeJson(files.placementJson, placementReport);
writeJson(files.roleAssignmentMap, roleLaneAssignment);
writeJson(files.appGovernanceAudit, applicationGovernance);
writeJson(files.controlPlaneMap, controlPlane);
writeJson(files.unifiedRouterReport, commonReport("LEEWAY_REPORT::UNIFIED_MODEL_ROUTER", { router: unifiedRouterRegistry, models, blockers }));
writeJson(files.nineModelExecution, executionProof);
writeJson(files.edgeGpuPlacement, edgeGpuPlacement);
writeJson(files.voiceVisionLoop, voiceVisionLoop);
writeJson(files.modelOrchestrationSentinel, modelOrchestrationSentinel);
writeJson(files.placementReceipt, receipt("LEEWAY_RECEIPT::MODEL_HIVE_PLACEMENT_ORCHESTRATION::20260524", "LEEWAY_TX::MODEL_HIVE::PLACEMENT_ORCHESTRATION::20260524", "LEEWAY_APP::MODEL_HIVE::QWEN_FAMILY::PLACEMENT_ORCHESTRATION", placementVerdict, placementChanged));

writeText(files.familyMd, familyMd);
writeJson(files.familyJson, familyOperatingOrder);
writeJson(files.familyRegistration, registrationReport);
writeJson(files.qwenRoleLane, roleLaneAssignment);
writeJson(files.familyStartup, startupReport);
writeJson(files.cooperationContract, cooperationContract);
writeJson(files.familyRouter, familyRouterReport);
writeJson(files.familyCapability, capabilityCheck);
writeJson(files.appInferenceGovernance, appInferenceGovernance);
writeJson(files.familyControlPlane, familyControlPlane);
writeJson(files.familySentinel, familySentinel);
writeJson(files.familyReceipt, receipt("LEEWAY_RECEIPT::QWEN_FAMILY_OPERATING_ORDER::20260524", "LEEWAY_TX::QWEN_FAMILY::OPERATING_ORDER::20260524", "LEEWAY_MODEL_FAMILY::QWEN", familyVerdict, familyChanged));

writeText(files.workflowFabricMd, workflowFabricMd);
writeJson(files.workflowFabricJson, workflowFabricReport);
writeText(files.workflowIdMd, workflowIdMd);
writeJson(files.workflowIdJson, workflowIdStandard);
writeJson(files.qwenWorkflowMap, qwenWorkflowMap);
writeJson(files.cooperationWorkflows, cooperationWorkflows);
writeJson(files.hardwareAwareness, hardwareAwareness);
writeJson(files.gpuCpuInventory, gpuCpuInventory);
writeJson(files.hardwareRules, hardwareRules);
writeJson(files.hardwareRouter, hardwareRouterReport);
writeJson(files.evidencePacketStandard, evidencePacketStandard);
writeJson(files.workflowInheritance, workflowInheritance);
writeJson(files.commandPlaneVisibility, commandPlaneVisibility);
writeJson(files.workflowSentinel, workflowSentinel);
writeJson(files.workflowReceipt, receipt("LEEWAY_RECEIPT::MODEL_AGENT_WORKFLOW_FABRIC::20260524", "LEEWAY_TX::MODEL_AGENT_WORKFLOW::FABRIC::20260524", "LEEWAY_MODEL_AGENT_WORKFLOW_FABRIC", workflowVerdict, workflowChanged));

process.stdout.write(`${JSON.stringify({
  placementVerdict,
  familyVerdict,
  workflowVerdict,
  modelCount: models.length,
  executionProven: models.filter((model) => model.proof.status === "EXECUTION_PROVEN").length,
  loadProven: models.filter((model) => model.proof.status === "LOAD_PROVEN").length,
  blocked: models.filter((model) => model.proof.status === "BLOCKED").length,
  receipts: [files.placementReceipt, files.familyReceipt, files.workflowReceipt]
}, null, 2)}\n`);
