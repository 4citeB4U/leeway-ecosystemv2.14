import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  getResearchHealth,
  getResearchManifest,
  getResearchEvidence,
  getResearchSession,
  getResearchQualityCriteria,
  startResearchSession,
  researchSearch,
  researchInspect,
  researchCurate,
  researchClaimCheck,
  researchReceipt,
  applyEvidenceToBuild
} from "./agent-lee-research-runtime.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const AGENT_LEE_ROOT = path.resolve(__dirname, "..");
const WORKSPACE_ROOT = path.resolve(AGENT_LEE_ROOT, "..");
const LEEWAY_ROOT = path.join(WORKSPACE_ROOT, "Leeway Runtime Fabric");
const ARCHIVE_ROOT = path.join(WORKSPACE_ROOT, "Archive");

export const ORCHESTRATION_MANIFEST_PATH = path.join(__dirname, "agent-lee-orchestration.manifest.json");
export const ORCHESTRATION_STATE_PATH = path.join(__dirname, "agent-lee-orchestration-state.json");
export const PREFERENCE_LEDGER_PATH = path.join(__dirname, "agent-lee-preference-ledger.json");
export const WORK_LEDGER_DIR = path.join(ARCHIVE_ROOT, "agent-lee-work-ledger");
export const WORK_LEDGER_PATH = path.join(WORK_LEDGER_DIR, "work-ledger.jsonl");
export const ORCHESTRATION_RECEIPT_DIR = path.join(ARCHIVE_ROOT, "receipts", "agent-lee-orchestration");
export const SIMULATION_DIR = path.join(__dirname, "simulations");
export const THREE_D_AR_DIR = path.join(__dirname, "3d-ar");
export const CHESS_PROOF_DIR = path.join(THREE_D_AR_DIR, "chess-set-proof");
export const SKILL_SANDBOX_DIR = path.join(AGENT_LEE_ROOT, "skills-sandbox");
export const SKILL_SANDBOX_ROOT = path.join(SKILL_SANDBOX_DIR, "agent-lee-skill-self-test");
export const SKILL_SANDBOX_REGISTRY_PATH = path.join(SKILL_SANDBOX_DIR, "registry.json");
const ROUTER_PORT = 8080;
const ADAPTER_PORT = 8787;
const RUNTIME_FABRIC_PORT = 4001;
const LEE_PRIME_RUNTIME_STATE_SCHEMA = "leeway.agent-lee.runtime-state.v1";
const LEE_PRIME_RUNTIME_STATE_CONSTITUTION = "lee-prime-runtime-state.v1";

export const CANONICAL_FINGERPRINT = "leeway.agent-lee.code-mode.canonical.supreme-agent-lead.v1";

const CANONICAL_SKILL_REGISTRY_PATH = path.join(
  LEEWAY_ROOT,
  "standards",
  "skills-university",
  "registries",
  "leeway-skills-university-registry.json"
);
const CANONICAL_TOOL_REGISTRY_PATH = path.join(
  LEEWAY_ROOT,
  "standards",
  "skills-university",
  "registries",
  "leeway-tool-registry.json"
);
const CANONICAL_MCP_REGISTRY_PATH = path.join(
  LEEWAY_ROOT,
  "standards",
  "skills-university",
  "registries",
  "leeway-mcp-registry.json"
);
const CANONICAL_BROWSER_REGISTRY_PATH = path.join(
  LEEWAY_ROOT,
  "standards",
  "skills-university",
  "registries",
  "leeway-browser-runtime-registry.json"
);
const CANONICAL_SIMULATION_REGISTRY_PATH = path.join(
  LEEWAY_ROOT,
  "standards",
  "skills-university",
  "registries",
  "leeway-simulation-registry.json"
);
const MODEL_ENDPOINT_REGISTRY_PATH = path.join(
  LEEWAY_ROOT,
  "model-execution-runtime",
  "model-endpoint.registry.json"
);
const DESKTOP_RUNTIME_URL = "http://127.0.0.1:8091";
const OLLAMA_BASE = process.env.OLLAMA_BASE || "http://127.0.0.1:11434";
const OLLAMA_COMMAND = process.env.OLLAMA_COMMAND || "ollama";
export const FIRST_RESPONSE_POLICY_PATH = path.join(__dirname, "agent-lee-first-response-policy.json");
export const RECEIPT_CORPUS_PATH = path.join(ARCHIVE_ROOT, "receipts", "agent-lee-receipt-corpus.json");

const DEFAULT_FIRST_RESPONSE_POLICY = {
  schema: "leeway.agent-lee.first-response-policy.v1",
  canonicalFingerprint: CANONICAL_FINGERPRINT,
  enabled: true,
  defaultClass: "medium",
  qwen3First: true,
  noSilentFallback: true,
  classes: {
    light: {
      maxPromptChars: 240,
      maxPromptLines: 2,
      timeoutMs: 15000,
      numPredict: 64,
      temperature: 0.18,
      stream: true,
      partialResponse: true
    },
    medium: {
      maxPromptChars: 900,
      maxPromptLines: 6,
      timeoutMs: 18000,
      numPredict: 96,
      temperature: 0.16,
      stream: true,
      partialResponse: true
    },
    heavy: {
      maxPromptChars: 999999,
      maxPromptLines: 999999,
      timeoutMs: 24000,
      numPredict: 128,
      temperature: 0.12,
      stream: true,
      partialResponse: true
    }
  },
  notes: [
    "Use qwen3 first for the reasoning lane.",
    "Return the first useful response quickly instead of waiting for a long completion.",
    "Keep the policy portable across VS Code, CLI, desktop runtime, and server fabric."
  ]
};

const DEFAULT_RECEIPT_CORPUS = {
  schema: "leeway.agent-lee.receipt-corpus.v1",
  canonicalFingerprint: CANONICAL_FINGERPRINT,
  generatedAt: null,
  status: "PARTIAL",
  scope: "Normalized failure and recovery corpus for Agent Lee runtime reuse.",
  sourceReceipts: [
    "Archive/receipts/agent-lee-downstream-model-check-20260615-010005.json",
    "Archive/receipts/agent-lee-prompt-class-and-cli-log-check-20260615-010146.json",
    "Archive/receipts/agent-lee-vscode-reload-live-proof-20260615-001832.json",
    "Archive/receipts/agent-lee-model-health-reconciliation-20260615-013741.json",
    "Archive/receipts/agent-lee-startup-route-proof-20260615-012750.json",
    "Archive/receipts/agent-lee-orchestration/model-warm-mqeu7mmr-a743c499.receipt.json"
  ],
  classificationLegend: [
    { code: "routing_drift", meaning: "Observed backend or role selection drifted away from the canonical target." },
    { code: "health_mismatch", meaning: "Live model state and health snapshots disagreed." },
    { code: "reload_race", meaning: "Reload, restart, or cold-start timing exposed a race condition." },
    { code: "timeout_latency", meaning: "The request exceeded the current useful response window." },
    { code: "stale_surface", meaning: "A stale extension, package, or duplicate runtime surface won control." },
    { code: "log_gap", meaning: "The expected downstream response log was missing or incomplete." }
  ],
  incidents: [
    {
      incidentId: "routing-drift-qwen2-5-coder",
      category: "routing_drift",
      severity: "high",
      status: "fixed",
      symptom: "Reasoning requests resolved to qwen2.5-coder:7b instead of qwen3:latest.",
      evidence: [
        "Archive/receipts/agent-lee-downstream-model-check-20260615-010005.json"
      ],
      canonicalSignal: "qwen3:latest",
      reusableGuard: "Do not silently downgrade reasoning aliases into the coder lane."
    },
    {
      incidentId: "health-snapshot-mismatch-qwen3",
      category: "health_mismatch",
      severity: "medium",
      status: "fixed",
      symptom: "Router health reported qwen3 as not RUNNING even when Ollama had it loaded.",
      evidence: [
        "Archive/receipts/agent-lee-model-health-reconciliation-20260615-013741.json"
      ],
      canonicalSignal: "process-present => RUNNING",
      reusableGuard: "Read the live Ollama process list before downgrading a healthy backend."
    },
    {
      incidentId: "reload-first-response-race",
      category: "reload_race",
      severity: "high",
      status: "open",
      symptom: "The first post-reload request could stall long enough to miss the user-facing response window.",
      evidence: [
        "Archive/receipts/agent-lee-vscode-reload-live-proof-20260615-001832.json",
        "Archive/receipts/agent-lee-startup-route-proof-20260615-012750.json"
      ],
      canonicalSignal: "qwen3-first-response",
      reusableGuard: "Warm qwen3 on startup and use the first-response policy before full completion."
    },
    {
      incidentId: "timeout-latency-qwen3-completion",
      category: "timeout_latency",
      severity: "medium",
      status: "open",
      symptom: "A full reasoning completion could take roughly 45 seconds even when the backend was correct.",
      evidence: [
        "Archive/receipts/agent-lee-startup-route-proof-20260615-012750.json",
        "Archive/receipts/agent-lee-model-health-reconciliation-20260615-013741.json"
      ],
      canonicalSignal: "first response under 10s",
      reusableGuard: "Return the first useful response quickly and record the long tail separately."
    },
    {
      incidentId: "cli-downstream-log-gap",
      category: "log_gap",
      severity: "low",
      status: "open",
      symptom: "CLI chat launches did not surface a separate downstream response log in the expected output folders.",
      evidence: [
        "Archive/receipts/agent-lee-prompt-class-and-cli-log-check-20260615-010146.json"
      ],
      canonicalSignal: "corpus-backed traceability",
      reusableGuard: "Normalize the downstream response trace into the receipt corpus."
    },
    {
      incidentId: "stale-surface-packaged-vs-repo-copy",
      category: "stale_surface",
      severity: "medium",
      status: "open",
      symptom: "Startup evidence showed packaged extension surfaces winning over the repo-local participant copy in some reload paths.",
      evidence: [
        "Archive/receipts/agent-lee-vscode-loaded-copy-marker-20260614-2246*.json",
        "Archive/receipts/agent-lee-vscode-live-path-verification-20260614-*.json"
      ],
      canonicalSignal: "canonical source of embodiment",
      reusableGuard: "Keep the canonical path explicit and avoid duplicate runtime winners."
    }
  ]
};

const MODEL_ROLE_DEFINITIONS = [
  {
    roleId: "light_conversation_model",
    label: "Light Conversation",
    backend: "qwen2.5-coder:7b",
    lane: "conversation",
    purpose: "Fast chat, short responses, ordinary conversation on the hot lane",
    taskKeywords: ["conversation", "chat", "talk", "speak", "translate", "language"]
  },
  {
    roleId: "monetization_narration_model",
    label: "Monetization Narration",
    backend: "qwen3:latest",
    lane: "conversation",
    purpose: "Proof-backed presentation copy, monetization narration, and operator-facing pitch framing",
    taskKeywords: ["monetization", "narration", "pitch", "presentation", "pricing", "offer", "sell", "sales", "demo", "positioning", "revenue"]
  },
  {
    roleId: "coding_model",
    label: "Coding",
    backend: "qwen2.5-coder:7b",
    lane: "coding",
    purpose: "Medium/heavy code planning and implementation",
    taskKeywords: ["code", "coding", "implement", "build", "refactor", "debug", "patch", "test"]
  },
  {
    roleId: "creative_3d_ar_model",
    label: "Creative 3D / AR",
    backend: "qwen3:latest",
    lane: "creative",
    purpose: "3D/AR orchestration, asset planning, scene synthesis, toolchain coordination",
    taskKeywords: ["3d", "ar", "asset", "scene", "mesh", "material", "gltf", "glb", "webxr", "chess"]
  },
  {
    roleId: "research_reasoning_model",
    label: "Research Reasoning",
    backend: "qwen3:latest",
    lane: "research",
    purpose: "Browser research planning, evidence synthesis, and long-horizon reasoning",
    taskKeywords: ["research", "browser", "search", "evidence", "citation", "source", "investigate"]
  },
  {
    roleId: "vision_model",
    label: "Vision",
    backend: "qwen2.5vl:7b",
    lane: "vision",
    purpose: "Image understanding and visual analysis only when the backend is validated",
    taskKeywords: ["vision", "image", "screenshot", "photo", "diagram", "visual"]
  },
  {
    roleId: "security_audit_model",
    label: "Defensive Security",
    backend: "deepseek-coder:latest",
    lane: "validation",
    purpose: "Defensive analysis, validation, and standards enforcement",
    taskKeywords: ["security", "audit", "validation", "standards", "defensive"]
  }
];

const DEFAULT_PREFERENCES = {
  agentId: "agent-lee",
  agentLeePreferenceLearningEnabled: true,
  agentLeeLiveMicRecordingEnabled: false,
  updatedAt: null,
  notes: "Local inspectable preference ledger. Never record secrets. Never override explicit current instructions.",
  preferences: [
    { key: "primaryLanguage", value: "English", source: "user_request", confidence: "explicit" },
    { key: "preferredUIStyle", value: "live, modular, node-based, N8N-like, not VS Code clone", source: "user_request", confidence: "explicit" },
    { key: "preferredAppBehavior", value: "live-editable, movable pieces, interactive canvas", source: "user_request", confidence: "explicit" },
    { key: "preferredDesign", value: "2D and 3D together", source: "user_request", confidence: "explicit" },
    { key: "preferredOutput", value: "working live apps, not static mockups", source: "user_request", confidence: "explicit" },
    { key: "preferredOptimization", value: "runs on Raspberry Pi, phones, small devices", source: "user_request", confidence: "explicit" },
    { key: "preferredBehavior", value: "speaks progress while working unless in casual conversation", source: "user_request", confidence: "explicit" },
    { key: "creativeThemes", value: ["dragons", "knights", "ninjas", "samurai", "kung fu", "modern military", "fantasy chess sets"], source: "user_request", confidence: "explicit" },
    { key: "runtimeFabricGoal", value: "improves and augments device capabilities when connected", source: "user_request", confidence: "explicit" }
  ]
};

const DEFAULT_MANIFEST = {
  canonicalFingerprint: CANONICAL_FINGERPRINT,
  agentId: "agent-lee",
  agentMode: "code-mode",
  owner: "agent-lee-prime",
  classification: "PRODUCTION_RUNTIME",
  version: "1.0.0",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  sourceOfTruth: "agent-lee-coding-mode/router/server-brainfix.mjs",
  modelPool: {
    defaultRole: "light_conversation_model",
    roles: MODEL_ROLE_DEFINITIONS.map((role) => ({
      roleId: role.roleId,
      label: role.label,
      backend: role.backend,
      lane: role.lane,
      purpose: role.purpose,
      canonicalAttached: true,
      routePolicy: "local-first",
      statusPolicy: "honest-status-reporting"
    })),
    statusClassifications: ["WARM", "SEMI_WARM", "COLD", "RUNNING", "MISSING", "BROKEN"]
  },
  lanes: [
    {
      laneId: "conversation",
      laneKind: "conversation",
      status: "ACTIVE",
      maxConcurrent: 1,
      purpose: "Always responsive live conversation lane"
    },
    {
      laneId: "coding",
      laneKind: "coding",
      status: "ACTIVE",
      maxConcurrent: 4,
      purpose: "Medium/heavy coding lane"
    },
    {
      laneId: "research",
      laneKind: "research",
      status: "ACTIVE",
      maxConcurrent: 1,
      purpose: "Browser research lane"
    },
    {
      laneId: "creative",
      laneKind: "creative",
      status: "ACTIVE",
      maxConcurrent: 1,
      purpose: "3D/AR asset lane"
    },
    {
      laneId: "simulation",
      laneKind: "simulation",
      status: "ACTIVE",
      maxConcurrent: 2,
      purpose: "Simulation and validation lane"
    },
    {
      laneId: "skill-builder",
      laneKind: "skill-builder",
      status: "ACTIVE",
      maxConcurrent: 1,
      purpose: "Skill creation and validation lane"
    }
  ],
  registrySources: {
    skillRegistry: CANONICAL_SKILL_REGISTRY_PATH,
    toolRegistry: CANONICAL_TOOL_REGISTRY_PATH,
    mcpRegistry: CANONICAL_MCP_REGISTRY_PATH,
    browserRegistry: CANONICAL_BROWSER_REGISTRY_PATH,
    simulationRegistry: CANONICAL_SIMULATION_REGISTRY_PATH,
    modelEndpointRegistry: MODEL_ENDPOINT_REGISTRY_PATH
  },
  receiptPaths: {
    workLedger: WORK_LEDGER_PATH,
    orchestrationReceipts: ORCHESTRATION_RECEIPT_DIR,
    simulationReceipts: path.join(SIMULATION_DIR, "receipts")
  },
  concurrencyLimits: {
    totalLanes: 8,
    conversation: 1,
    coding: 4,
    research: 1,
    creative: 1,
    simulation: 2,
    "skill-builder": 1
  },
  queuePolicy: {
    overflowBehavior: "QUEUED_WITH_RECEIPT",
    maxQueueDepth: 12,
    noSilentFallback: true,
    overloadReceiptsRequired: true
  },
  languagePolicy: {
    defaultLanguage: "en",
    defaultResponseLanguage: "en",
    supportedLanguages: ["en", "es", "fr", "de", "it", "pt", "ja", "ko", "zh"]
  },
  preferenceLedgerPath: PREFERENCE_LEDGER_PATH,
  conversationRecordingPolicy: {
    recordTextSummariesIfEnabled: true,
    agentLeePreferenceLearningEnabled: true,
    agentLeeLiveMicRecordingEnabled: false,
    neverRecordSecretAudio: true,
    inspectableLocalOnly: true
  },
  taskRecordingPolicy: {
    recordTaskStart: true,
    recordLaneAssignment: true,
    recordModelSelection: true,
    recordToolSelection: true,
    recordValidationEvents: true,
    recordFinalReceipt: true
  },
  skillCreationPolicy: {
    sandboxFirst: true,
    sandboxRoot: SKILL_SANDBOX_ROOT,
    canonicalRegistryMutation: "approval_required",
    defaultSandboxSkillId: "agent-lee-skill-self-test"
  },
  physicalActionGuardPolicy: {
    simulationFirst: true,
    realDeviceActionsRequireExplicitConfirm: true,
    approvedDesktopRuntime: DESKTOP_RUNTIME_URL,
    directPhysicalActionsDefault: "blocked"
  }
};

const INTERNAL_TOOL_DEFINITIONS = [
  {
    name: "leeway_orchestration_status",
    source: "agent-lee-coding-mode/router/server-brainfix.mjs",
    schema: { type: "object", properties: {}, additionalProperties: false },
    status: "ACTIVE",
    testCommand: "GET /agent-lee/orchestration/health",
    owningLane: "conversation",
    canonicalAttached: true
  },
  {
    name: "leeway_model_pool_status",
    source: "agent-lee-coding-mode/router/server-brainfix.mjs",
    schema: { type: "object", properties: { role: { type: "string" } }, additionalProperties: true },
    status: "ACTIVE",
    testCommand: "GET /agent-lee/models",
    owningLane: "simulation",
    canonicalAttached: true
  },
  {
    name: "leeway_model_route",
    source: "agent-lee-coding-mode/router/server-brainfix.mjs",
    schema: { type: "object", properties: { taskType: { type: "string" }, prompt: { type: "string" } }, additionalProperties: true },
    status: "ACTIVE",
    testCommand: "POST /agent-lee/models/route",
    owningLane: "simulation",
    canonicalAttached: true
  },
  {
    name: "leeway_lane_start",
    source: "agent-lee-coding-mode/router/server-brainfix.mjs",
    schema: { type: "object", properties: { kind: { type: "string" } }, additionalProperties: true },
    status: "ACTIVE",
    testCommand: "POST /agent-lee/lanes/start",
    owningLane: "simulation",
    canonicalAttached: true
  },
  {
    name: "leeway_lane_status",
    source: "agent-lee-coding-mode/router/server-brainfix.mjs",
    schema: { type: "object", properties: { laneId: { type: "string" } }, additionalProperties: false },
    status: "ACTIVE",
    testCommand: "GET /agent-lee/lanes/:id",
    owningLane: "simulation",
    canonicalAttached: true
  },
  {
    name: "leeway_lane_message",
    source: "agent-lee-coding-mode/router/server-brainfix.mjs",
    schema: { type: "object", properties: { laneId: { type: "string" }, message: { type: "string" } }, additionalProperties: true },
    status: "ACTIVE",
    testCommand: "POST /agent-lee/lanes/:id/message",
    owningLane: "conversation",
    canonicalAttached: true
  },
  {
    name: "leeway_work_ledger",
    source: "Archive/agent-lee-work-ledger/work-ledger.jsonl",
    schema: { type: "object", properties: {}, additionalProperties: true },
    status: "ACTIVE",
    testCommand: "GET /agent-lee/work-ledger",
    owningLane: "simulation",
    canonicalAttached: true
  },
  {
    name: "leeway_preference_ledger",
    source: "agent-lee-coding-mode/runtime/agent-lee-preference-ledger.json",
    schema: { type: "object", properties: {}, additionalProperties: true },
    status: "ACTIVE",
    testCommand: "GET /agent-lee/preferences",
    owningLane: "conversation",
    canonicalAttached: true
  },
  {
    name: "leeway_stateful_research_harness_status",
    source: "agent-lee-coding-mode/runtime/agent-lee-research-harness.manifest.json",
    schema: { type: "object", properties: {}, additionalProperties: true },
    status: "ACTIVE",
    testCommand: "GET /agent-lee/research/health",
    owningLane: "research",
    canonicalAttached: true
  },
  {
    name: "leeway_research_start",
    source: "agent-lee-coding-mode/runtime/agent-lee-research-runtime.mjs",
    schema: { type: "object", properties: { objective: { type: "string" }, query: { type: "string" } }, additionalProperties: true },
    status: "ACTIVE",
    testCommand: "POST /agent-lee/research/start",
    owningLane: "research",
    canonicalAttached: true
  },
  {
    name: "leeway_research_search",
    source: "agent-lee-coding-mode/runtime/agent-lee-research-runtime.mjs",
    schema: { type: "object", properties: { researchId: { type: "string" }, query: { type: "string" } }, additionalProperties: true },
    status: "ACTIVE",
    testCommand: "POST /agent-lee/research/search",
    owningLane: "research",
    canonicalAttached: true
  },
  {
    name: "leeway_research_inspect",
    source: "agent-lee-coding-mode/runtime/agent-lee-research-runtime.mjs",
    schema: { type: "object", properties: { researchId: { type: "string" }, url: { type: "string" } }, additionalProperties: true },
    status: "ACTIVE",
    testCommand: "POST /agent-lee/research/inspect",
    owningLane: "research",
    canonicalAttached: true
  },
  {
    name: "leeway_research_curate",
    source: "agent-lee-coding-mode/runtime/agent-lee-research-runtime.mjs",
    schema: { type: "object", properties: { researchId: { type: "string" }, evidenceId: { type: "string" } }, additionalProperties: true },
    status: "ACTIVE",
    testCommand: "POST /agent-lee/research/curate",
    owningLane: "research",
    canonicalAttached: true
  },
  {
    name: "leeway_research_claim_check",
    source: "agent-lee-coding-mode/runtime/agent-lee-research-runtime.mjs",
    schema: { type: "object", properties: { researchId: { type: "string" }, claim: { type: "string" } }, additionalProperties: true },
    status: "ACTIVE",
    testCommand: "POST /agent-lee/research/claim-check",
    owningLane: "research",
    canonicalAttached: true
  },
  {
    name: "leeway_research_receipt",
    source: "agent-lee-coding-mode/runtime/agent-lee-research-runtime.mjs",
    schema: { type: "object", properties: { researchId: { type: "string" } }, additionalProperties: true },
    status: "ACTIVE",
    testCommand: "POST /agent-lee/research/:id/receipt",
    owningLane: "research",
    canonicalAttached: true
  },
  {
    name: "leeway_research_quality_sources",
    source: "agent-lee-coding-mode/runtime/agent-lee-research-runtime.mjs",
    schema: { type: "object", properties: {}, additionalProperties: false },
    status: "ACTIVE",
    testCommand: "GET /agent-lee/research/health",
    owningLane: "research",
    canonicalAttached: true
  },
  {
    name: "leeway_research_apply_to_build",
    source: "agent-lee-coding-mode/runtime/agent-lee-research-runtime.mjs",
    schema: { type: "object", properties: { researchId: { type: "string" }, buildTarget: { type: "string" } }, additionalProperties: true },
    status: "ACTIVE",
    testCommand: "POST /agent-lee/research/apply-to-build",
    owningLane: "research",
    canonicalAttached: true
  },
  {
    name: "leeway_skill_registry_full",
    source: CANONICAL_SKILL_REGISTRY_PATH,
    schema: { type: "object", properties: {}, additionalProperties: true },
    status: "ACTIVE",
    testCommand: "GET /agent-lee/skills/full",
    owningLane: "skill-builder",
    canonicalAttached: true
  },
  {
    name: "leeway_mcp_registry",
    source: CANONICAL_MCP_REGISTRY_PATH,
    schema: { type: "object", properties: {}, additionalProperties: true },
    status: "ACTIVE",
    testCommand: "GET /agent-lee/mcps",
    owningLane: "skill-builder",
    canonicalAttached: true
  },
  {
    name: "leeway_skill_create",
    source: "agent-lee-coding-mode/skills-sandbox/agent-lee-skill-self-test",
    schema: { type: "object", properties: { skillId: { type: "string" } }, additionalProperties: true },
    status: "ACTIVE",
    testCommand: "POST /agent-lee/skills/create",
    owningLane: "skill-builder",
    canonicalAttached: true
  },
  {
    name: "leeway_skill_validate",
    source: "agent-lee-coding-mode/skills-sandbox/agent-lee-skill-self-test",
    schema: { type: "object", properties: { skillId: { type: "string" } }, additionalProperties: true },
    status: "ACTIVE",
    testCommand: "POST /agent-lee/skills/validate",
    owningLane: "skill-builder",
    canonicalAttached: true
  },
  {
    name: "leeway_simulation_run",
    source: "agent-lee-coding-mode/runtime/simulations",
    schema: { type: "object", properties: { scenario: { type: "string" } }, additionalProperties: true },
    status: "ACTIVE",
    testCommand: "POST /agent-lee/simulations/run",
    owningLane: "simulation",
    canonicalAttached: true
  },
  {
    name: "leeway_3d_asset_pipeline_status",
    source: CHESS_PROOF_DIR,
    schema: { type: "object", properties: {}, additionalProperties: false },
    status: "ACTIVE",
    testCommand: "GET /agent-lee/3d-ar/status",
    owningLane: "creative",
    canonicalAttached: true
  },
  {
    name: "leeway_3d_chess_set_proof",
    source: CHESS_PROOF_DIR,
    schema: { type: "object", properties: { scenario: { type: "string" } }, additionalProperties: true },
    status: "ACTIVE",
    testCommand: "POST /agent-lee/3d-ar/chess-set-proof",
    owningLane: "creative",
    canonicalAttached: true
  }
];

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function nowIso() {
  return new Date().toISOString();
}

async function probeHttpHealth(url, timeoutMs = 3000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

function uniqueId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${crypto.randomBytes(4).toString("hex")}`;
}

function readJsonFile(filePath, fallback) {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJsonFile(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), "utf8");
  return value;
}

function appendJsonlFile(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.appendFileSync(filePath, `${JSON.stringify(value)}\n`, "utf8");
  return value;
}

function stableClone(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => stableClone(entry));
  }

  if (!value || typeof value !== "object" || value instanceof Date) {
    return value;
  }

  return Object.keys(value).sort().reduce((acc, key) => {
    acc[key] = stableClone(value[key]);
    return acc;
  }, {});
}

function hashJson(value) {
  return crypto.createHash("sha256").update(JSON.stringify(stableClone(value))).digest("hex");
}

function buildExecutionStateSummary({ routerOnline = null, adapterOnline = null, orchestrationOnline = true } = {}) {
  const routerKnown = routerOnline !== null && routerOnline !== undefined;
  const adapterKnown = adapterOnline !== null && adapterOnline !== undefined;
  const routerState = routerOnline === false ? "FAILED" : "HEALTHY";
  const adapterState = adapterOnline === false ? "FAILED" : (adapterKnown ? "HEALTHY" : "UNKNOWN");
  const orchestrationState = orchestrationOnline === false ? "FAILED" : "HEALTHY";
  let status = "HEALTHY";

  if (routerState === "FAILED" || orchestrationState === "FAILED") {
    status = "FAILED";
  } else if (adapterState === "FAILED" || !routerKnown) {
    status = "DEGRADED";
  }

  return {
    status,
    routerState,
    adapterState,
    orchestrationState,
    routerOnline: routerKnown ? Boolean(routerOnline) : null,
    adapterOnline: adapterKnown ? Boolean(adapterOnline) : null,
    orchestrationOnline: Boolean(orchestrationOnline),
    routerPort: ROUTER_PORT,
    adapterPort: ADAPTER_PORT,
    runtimeFabricPort: RUNTIME_FABRIC_PORT
  };
}

function buildModelStateSummary(modelPool = null, state = null) {
  const sourceState = state || loadState();
  const warmState = sourceState.warmState || {};
  const warmedModels = Object.entries(warmState)
    .filter(([, entry]) => entry && (entry.lastProbeOk || entry.lastWarmAt || entry.lastReceiptPath))
    .map(([backend]) => backend)
    .sort();
  const healthyWarmModels = Object.entries(warmState)
    .filter(([, entry]) => entry && entry.lastProbeOk)
    .map(([backend]) => backend)
    .sort();
  const roleStatuses = Array.isArray(modelPool?.roles) ? modelPool.roles : [];
  const loadedBackends = Array.isArray(modelPool?.loadedBackends) && modelPool.loadedBackends.length > 0
    ? [...modelPool.loadedBackends]
    : warmedModels;
  const healthyRoles = roleStatuses.filter((role) => role.classification === "RUNNING");
  const degradedRoles = roleStatuses.filter((role) => role.classification && role.classification !== "RUNNING");
  const activeModel = healthyRoles[0]?.backend || healthyWarmModels[0] || loadedBackends[0] || roleStatuses[0]?.backend || null;
  let status = "HEALTHY";

  if (!modelPool || modelPool.ok !== true) {
    status = healthyWarmModels.length > 0 ? "HEALTHY" : (warmedModels.length > 0 ? "DEGRADED" : "DEGRADED");
  } else if (healthyRoles.length === 0) {
    status = "FAILED";
  } else if (degradedRoles.length > 0) {
    status = "DEGRADED";
  }

  return {
    status,
    activeModel,
    warmedModels,
    loadedBackends,
    healthyRoles: healthyRoles.map((role) => role.roleId),
    degradedRoles: degradedRoles.map((role) => role.roleId),
    backendCount: typeof modelPool?.backendCount === "number" ? modelPool.backendCount : warmedModels.length,
    classificationCounts: modelPool?.classificationCounts || {},
    source: modelPool?.ok === true ? "live_model_pool" : "warm_state_fallback"
  };
}

function buildReceiptStateSummary(state = null) {
  const sourceState = state || loadState();
  const ledger = Array.isArray(sourceState.leePrimeRuntimeStateLedger) ? sourceState.leePrimeRuntimeStateLedger : [];
  let previousHash = null;
  let ledgerIntact = true;

  for (const entry of ledger) {
    const expectedHash = hashJson(entry.state || {});
    if (!entry || entry.stateHash !== expectedHash || entry.previousStateHash !== previousHash) {
      ledgerIntact = false;
      break;
    }
    previousHash = entry.stateHash;
  }

  const lastReceiptPath = sourceState.lastReceiptPath || null;
  const lastReceiptExists = lastReceiptPath ? fs.existsSync(lastReceiptPath) : true;
  const status = ledgerIntact && lastReceiptExists ? "HEALTHY" : ledger.length > 0 ? "DEGRADED" : "HEALTHY";
  const lastEntry = ledger[ledger.length - 1] || null;

  return {
    status,
    ledgerIntact,
    chainLength: ledger.length,
    lastReceiptPath,
    lastReceiptExists,
    lastStateReceiptPath: lastEntry?.receiptPath || null,
    lastStateHash: lastEntry?.stateHash || null,
    lastRecordedAt: lastEntry?.recordedAt || null
  };
}

function buildAgentStateSummary({ executionState, modelState, receiptState }) {
  let status = "HEALTHY";

  if (executionState?.status === "FAILED") {
    status = "OFFLINE";
  } else if (executionState?.status === "DEGRADED") {
    status = "CONSTRAINED";
  }

  return {
    status,
    authority: "Agent Lee Prime",
    constitutionVersion: LEE_PRIME_RUNTIME_STATE_CONSTITUTION,
    sovereign: true,
    modelStateObserved: modelState?.status || "UNKNOWN",
    receiptStateObserved: receiptState?.status || "UNKNOWN",
    executionStateObserved: executionState?.status || "UNKNOWN",
    reason: status === "HEALTHY"
      ? "Agent state is isolated from model and receipt health and remains available."
      : "Agent state is constrained by execution health."
  };
}

function buildLeePrimeRuntimeState({ state = null, modelPool = null, routerOnline = true, adapterOnline = null, orchestrationOnline = true, reason = "runtime_snapshot" } = {}) {
  const sourceState = state || loadState();
  const executionState = buildExecutionStateSummary({ routerOnline, adapterOnline, orchestrationOnline });
  const modelState = buildModelStateSummary(modelPool, sourceState);
  const receiptState = buildReceiptStateSummary(sourceState);
  const agentState = buildAgentStateSummary({ executionState, modelState, receiptState });
  const snapshot = {
    schema: LEE_PRIME_RUNTIME_STATE_SCHEMA,
    canonicalFingerprint: CANONICAL_FINGERPRINT,
    version: 1,
    recordedAt: nowIso(),
    reason,
    sourceOfTruth: "agent-lee-coding-mode/runtime/agent-lee-orchestration-runtime.mjs",
    agentState,
    executionState,
    modelState,
    receiptState
  };
  snapshot.stateHash = hashJson({
    schema: snapshot.schema,
    canonicalFingerprint: snapshot.canonicalFingerprint,
    version: snapshot.version,
    agentState: snapshot.agentState,
    executionState: snapshot.executionState,
    modelState: snapshot.modelState,
    receiptState: snapshot.receiptState
  });
  return snapshot;
}

function recordLeePrimeRuntimeState(input = {}) {
  const state = input.state || loadState();
  const snapshot = buildLeePrimeRuntimeState({
    ...input,
    state,
    reason: input.reason || "runtime_snapshot"
  });
  const ledger = Array.isArray(state.leePrimeRuntimeStateLedger) ? state.leePrimeRuntimeStateLedger : [];
  const lastEntry = ledger[ledger.length - 1] || null;

  if (lastEntry?.stateHash === snapshot.stateHash && state.leePrimeRuntimeState?.stateHash === snapshot.stateHash) {
    const freshState = loadState();
    freshState.leePrimeRuntimeState = snapshot;
    saveState(freshState);
    snapshot.ledgerSequence = lastEntry.sequence || ledger.length;
    snapshot.previousStateHash = lastEntry.previousStateHash || null;
    snapshot.receiptPath = lastEntry.receiptPath || null;
    return snapshot;
  }

  const receipt = writeReceipt("lee-prime-runtime-state", {
    ok: true,
    route: "constitutional-runtime-state",
    reason: snapshot.reason,
    stateHash: snapshot.stateHash,
    previousStateHash: lastEntry?.stateHash || null,
    agentState: snapshot.agentState,
    executionState: snapshot.executionState,
    modelState: snapshot.modelState,
    receiptState: snapshot.receiptState
  });

  const freshState = loadState();
  const entry = {
    sequence: ledger.length + 1,
    recordedAt: snapshot.recordedAt,
    stateHash: snapshot.stateHash,
    previousStateHash: lastEntry?.stateHash || null,
    reason: snapshot.reason,
    receiptPath: receipt.receiptPath,
    state: snapshot
  };

  freshState.leePrimeRuntimeState = snapshot;
  freshState.leePrimeRuntimeStateLedger = [...ledger, entry];
  freshState.lastReceiptPath = receipt.receiptPath;
  saveState(freshState);

  snapshot.ledgerSequence = entry.sequence;
  snapshot.previousStateHash = entry.previousStateHash;
  snapshot.receiptPath = receipt.receiptPath;
  return snapshot;
}

export async function refreshLeePrimeRuntimeState(input = {}) {
  const modelPool = input.modelPool || await getModelPoolStatus();
  return recordLeePrimeRuntimeState({
    ...input,
    modelPool
  });
}

export function getLeePrimeRuntimeState(state = null) {
  const sourceState = state || loadState();
  return sourceState.leePrimeRuntimeState || buildLeePrimeRuntimeState({ state: sourceState, reason: "stored_snapshot" });
}

function loadState() {
  const fallback = {
    version: 1,
    canonicalFingerprint: CANONICAL_FINGERPRINT,
    updatedAt: nowIso(),
    warmState: {},
    lanes: {},
    simulations: {},
    lastReceiptPath: null,
    leePrimeRuntimeState: null,
    leePrimeRuntimeStateLedger: []
  };
  return readJsonFile(ORCHESTRATION_STATE_PATH, fallback);
}

function saveState(state) {
  const payload = {
    ...state,
    canonicalFingerprint: CANONICAL_FINGERPRINT,
    updatedAt: nowIso()
  };
  return writeJsonFile(ORCHESTRATION_STATE_PATH, payload);
}

function loadManifest() {
  const existing = readJsonFile(ORCHESTRATION_MANIFEST_PATH, null);
  if (existing) {
    return existing;
  }
  const seeded = {
    ...DEFAULT_MANIFEST,
    createdAt: nowIso(),
    updatedAt: nowIso()
  };
  writeJsonFile(ORCHESTRATION_MANIFEST_PATH, seeded);
  return seeded;
}

function loadPreferences() {
  const existing = readJsonFile(PREFERENCE_LEDGER_PATH, null);
  if (existing) {
    return existing;
  }
  const seeded = {
    ...DEFAULT_PREFERENCES,
    updatedAt: nowIso()
  };
  writeJsonFile(PREFERENCE_LEDGER_PATH, seeded);
  return seeded;
}

function savePreferences(preferences) {
  const payload = {
    ...preferences,
    updatedAt: nowIso()
  };
  return writeJsonFile(PREFERENCE_LEDGER_PATH, payload);
}

function loadWorkLedger() {
  if (!fs.existsSync(WORK_LEDGER_PATH)) {
    return [];
  }

  const raw = fs.readFileSync(WORK_LEDGER_PATH, "utf8");
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return { ok: false, malformed: line };
      }
    });
}

function recordWorkLedger(entry) {
  const payload = {
    id: uniqueId("work"),
    at: nowIso(),
    canonicalFingerprint: CANONICAL_FINGERPRINT,
    ...entry
  };
  appendJsonlFile(WORK_LEDGER_PATH, payload);
  return payload;
}

const LANE_CORRECTION_LEDGER_PATH = path.join(path.dirname(ORCHESTRATION_STATE_PATH), "lane-integrity-correction-ledger.jsonl");

function appendCorrectionLedger(entry) {
  const payload = {
    id: uniqueId("correction"),
    at: nowIso(),
    canonicalFingerprint: CANONICAL_FINGERPRINT,
    ...entry
  };
  ensureDir(path.dirname(LANE_CORRECTION_LEDGER_PATH));
  appendJsonlFile(LANE_CORRECTION_LEDGER_PATH, payload);
  return payload;
}

function writeReceipt(action, payload, suffix = "receipt") {
  ensureDir(ORCHESTRATION_RECEIPT_DIR);
  const receiptId = payload?.receiptId || uniqueId(action);
  const fileName = `${receiptId}.${suffix}.json`;
  const receiptPath = path.join(ORCHESTRATION_RECEIPT_DIR, fileName);
  const receipt = {
    receiptId,
    action,
    canonicalFingerprint: CANONICAL_FINGERPRINT,
    at: nowIso(),
    ...payload,
    receiptPath
  };
  writeJsonFile(receiptPath, receipt);

  const state = loadState();
  state.lastReceiptPath = receiptPath;
  saveState(state);

  return receipt;
}

function compactFilePath(filePath) {
  return path.relative(WORKSPACE_ROOT, filePath).replace(/\\/g, "/");
}

function readOrNull(filePath) {
  return readJsonFile(filePath, null);
}

async function fetchJson(url, options = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: options.method || "GET",
      headers: options.body ? { "content-type": "application/json" } : undefined,
      body: options.body ? JSON.stringify(options.body) : undefined,
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
      data,
      raw
    };
  } finally {
    clearTimeout(timer);
  }
}

async function probeOllamaTags() {
  try {
    const result = await fetchJson(`${OLLAMA_BASE}/api/tags`, {}, 15000);
    const models = Array.isArray(result.data?.models) ? result.data.models : [];
    return {
      ok: Boolean(result.ok),
      models,
      names: models.map((entry) => String(entry?.name || entry?.model || entry?.display_name || "").trim()).filter(Boolean),
      raw: result.data
    };
  } catch (error) {
    return {
      ok: false,
      models: [],
      names: [],
      error: error?.message || String(error)
    };
  }
}

function parseOllamaPs(stdout = "") {
  const lines = String(stdout || "")
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean);

  if (lines.length <= 1) {
    return [];
  }

  return lines.slice(1).map((line) => String(line).trim().split(/\s+/)[0]).filter(Boolean);
}

function probeOllamaProcesses() {
  try {
    const result = spawnSync(OLLAMA_COMMAND, ["ps"], {
      encoding: "utf8",
      windowsHide: true,
      timeout: 15000
    });

    const stdout = String(result.stdout || "");
    const stderr = String(result.stderr || "");
    const names = parseOllamaPs(stdout);
    return {
      ok: result.status === 0 && !result.error,
      names,
      raw: stdout,
      stderr: stderr || null,
      error: result.error?.message || null
    };
  } catch (error) {
    return {
      ok: false,
      names: [],
      raw: "",
      stderr: null,
      error: error?.message || String(error)
    };
  }
}

export function loadFirstResponsePolicy() {
  const existing = readJsonFile(FIRST_RESPONSE_POLICY_PATH, null);
  return existing || DEFAULT_FIRST_RESPONSE_POLICY;
}

export function classifyPromptLoad(promptText = "", body = {}) {
  const prompt = String(
    promptText ||
      body.prompt ||
      body.input ||
      body.text ||
      body.message ||
      body.messages?.map?.((entry) => String(entry?.content || "")).join("\n") ||
      ""
  ).trim();

  if (!prompt) {
    return "light";
  }

  const lowered = prompt.toLowerCase();
  const lineCount = prompt.split(/\r?\n/).length;
  const chars = prompt.length;

  if (/^(compacted conversation|compacted chat conversation)\b/i.test(prompt) || lowered.includes("compacted conversation")) {
    return "light";
  }

  const heavySignals = [
    "architecture",
    "analysis",
    "analyze",
    "analyse",
    "debug",
    "investigate",
    "refactor",
    "tradeoff",
    "trade-off",
    "root cause",
    "proof",
    "derive",
    "detailed",
    "step by step",
    "deeper",
    "compare",
    "plan",
    "implementation",
    "patch",
    "timeout",
    "latency"
  ];
  const codeSignals = [
    "return only code",
    "example call",
    "function named",
    "write a javascript",
    "javascript function",
    "write a typescript",
    "typescript function",
    "write a python",
    "python function",
    "```"
  ];
  if (codeSignals.some((signal) => lowered.includes(signal))) {
    return "heavy";
  }
  if (chars > 900 || lineCount > 6 || heavySignals.some((signal) => lowered.includes(signal))) {
    return "heavy";
  }

  if (chars > 240 || lineCount > 2) {
    return "medium";
  }

  return "light";
}

export function getFirstResponseProfile(promptClass = "medium", policy = loadFirstResponsePolicy()) {
  const normalizedClass = ["light", "medium", "heavy"].includes(String(promptClass || "").trim().toLowerCase())
    ? String(promptClass).trim().toLowerCase()
    : String(policy?.defaultClass || "medium").trim().toLowerCase();
  const classPolicy = policy?.classes?.[normalizedClass] || policy?.classes?.medium || DEFAULT_FIRST_RESPONSE_POLICY.classes.medium;

  return {
    promptClass: normalizedClass,
    enabled: Boolean(policy?.enabled !== false),
    qwen3First: Boolean(policy?.qwen3First !== false),
    noSilentFallback: Boolean(policy?.noSilentFallback !== false),
    maxPromptChars: Number(classPolicy.maxPromptChars || 0),
    maxPromptLines: Number(classPolicy.maxPromptLines || 0),
    timeoutMs: Number(classPolicy.timeoutMs || 9000),
    numPredict: Number(classPolicy.numPredict || 96),
    temperature: typeof classPolicy.temperature === "number" ? classPolicy.temperature : 0.2,
    stream: classPolicy.stream !== false,
    partialResponse: classPolicy.partialResponse !== false
  };
}

export function loadReceiptCorpus() {
  const existing = readJsonFile(RECEIPT_CORPUS_PATH, null);
  if (existing) {
    return existing;
  }

  const seeded = {
    ...DEFAULT_RECEIPT_CORPUS,
    generatedAt: nowIso()
  };
  writeJsonFile(RECEIPT_CORPUS_PATH, seeded);
  return seeded;
}

async function probeOllamaModel(modelName, prompt, extra = {}) {
  const payload = {
    model: modelName,
    stream: false,
    messages: [
      {
        role: "system",
        content: extra.system || "You are Agent Lee's model pool probe. Return one short line."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    options: {
      temperature: typeof extra.temperature === "number" ? extra.temperature : 0,
      num_predict: typeof extra.num_predict === "number" ? extra.num_predict : 64
    }
  };

  return fetchJson(`${OLLAMA_BASE}/api/chat`, { method: "POST", body: payload }, extra.timeoutMs || 180000);
}

function taskStringFromInput(input) {
  if (!input) return "";
  return String(
    input.taskType ||
      input.task ||
      input.kind ||
      input.intent ||
      input.prompt ||
      input.text ||
      input.query ||
      input.scenario ||
      ""
  ).trim();
}

function routeRoleForTask(input) {
  const task = taskStringFromInput(input).toLowerCase();
  if (/(vision|image|screenshot|photo|diagram)/i.test(task)) {
    return MODEL_ROLE_DEFINITIONS.find((role) => role.roleId === "vision_model");
  }
  if (/(monetization|narration|pitch|presentation|pricing|offer|sell|sales|demo|positioning|revenue)/i.test(task)) {
    return MODEL_ROLE_DEFINITIONS.find((role) => role.roleId === "monetization_narration_model");
  }
  if (/\b3d\b|\bar\b|\bglb\b|\bgltf\b|\bmesh\b|\bscene\b|\bmaterial\b|\bwebxr\b|\basset\b|\bchess\b/i.test(task)) {
    return MODEL_ROLE_DEFINITIONS.find((role) => role.roleId === "creative_3d_ar_model");
  }
  if (/(research|browser|search|citation|source|evidence|investigate)/i.test(task)) {
    return MODEL_ROLE_DEFINITIONS.find((role) => role.roleId === "research_reasoning_model");
  }
  if (/(security|audit|validate|validation|standards|defensive)/i.test(task)) {
    return MODEL_ROLE_DEFINITIONS.find((role) => role.roleId === "security_audit_model");
  }
  if (/(code|coding|implement|build|refactor|debug|patch|test|program)/i.test(task)) {
    return MODEL_ROLE_DEFINITIONS.find((role) => role.roleId === "coding_model");
  }
  return MODEL_ROLE_DEFINITIONS.find((role) => role.roleId === "light_conversation_model");
}

function buildModelStatus(role, warmState, tags, processes) {
  const backendName = role.backend;
  const processPresent = processes.names.includes(backendName);
  const backendPresent = tags.names.includes(backendName) || processPresent;
  const warmInfo = warmState[backendName] || {};
  const now = Date.now();
  const lastProbeAt = warmInfo.lastProbeAt ? Date.parse(warmInfo.lastProbeAt) : 0;
  const lastWarmAt = warmInfo.lastWarmAt ? Date.parse(warmInfo.lastWarmAt) : 0;
  const lastActivityAt = Math.max(lastProbeAt || 0, lastWarmAt || 0);
  const ageMs = lastActivityAt ? now - lastActivityAt : null;

  let status = "MISSING";
  if (warmInfo.lastProbeOk === false) {
    status = "BROKEN";
  } else if (processPresent) {
    status = "RUNNING";
  } else if (!backendPresent) {
    status = "COLD";
  } else if (warmInfo.lastProbeOk && ageMs !== null && ageMs < 5 * 60 * 1000) {
    status = "RUNNING";
  } else if (warmInfo.lastWarmAt) {
    status = ageMs !== null && ageMs < 30 * 60 * 1000 ? "WARM" : "SEMI_WARM";
  } else {
    status = "SEMI_WARM";
  }

  return {
    roleId: role.roleId,
    label: role.label,
    backend: backendName,
    lane: role.lane,
    purpose: role.purpose,
    backendPresent,
    processPresent,
    classification: status,
    canonicalAttached: true,
    lastProbeAt: warmInfo.lastProbeAt || null,
    lastWarmAt: warmInfo.lastWarmAt || null,
    lastProbeOk: typeof warmInfo.lastProbeOk === "boolean" ? warmInfo.lastProbeOk : null,
    lastReceiptPath: warmInfo.lastReceiptPath || null
  };
}

export async function getModelPoolStatus() {
  const state = loadState();
  const [tags, processes] = await Promise.all([
    probeOllamaTags(),
    Promise.resolve(probeOllamaProcesses())
  ]);
  const backends = MODEL_ROLE_DEFINITIONS.map((role) => buildModelStatus(role, state.warmState || {}, tags, processes));
  const selected = {};
  for (const role of backends) {
    selected[role.roleId] = role;
  }

  return {
    ok: true,
    canonicalFingerprint: CANONICAL_FINGERPRINT,
    ollamaBase: OLLAMA_BASE,
    ollamaCommand: OLLAMA_COMMAND,
    firstResponsePolicyPath: compactFilePath(FIRST_RESPONSE_POLICY_PATH),
    receiptCorpusPath: compactFilePath(RECEIPT_CORPUS_PATH),
    tagsAvailable: tags.ok,
    processesAvailable: processes.ok,
    backendCount: tags.names.length,
    backends: tags.names,
    loadedBackends: processes.names,
    roles: backends,
    byRole: selected,
    classificationCounts: backends.reduce((acc, entry) => {
      acc[entry.classification] = (acc[entry.classification] || 0) + 1;
      return acc;
    }, {})
  };
}

export async function warmModel(input = {}) {
  const role = typeof input.role === "string" && input.role.trim()
    ? MODEL_ROLE_DEFINITIONS.find((entry) => entry.roleId === input.role.trim()) || routeRoleForTask(input)
    : routeRoleForTask(input);
  const backend = typeof input.backend === "string" && input.backend.trim() ? input.backend.trim() : role?.backend;
  const prompt = String(input.prompt || input.text || input.task || input.kind || "Warm the model.").trim();

  if (!backend) {
    const receipt = writeReceipt("model-warm", {
      ok: false,
      roleId: role?.roleId || null,
      backend: null,
      status: "BROKEN",
      error: "No backend available for warm request."
    });
    recordWorkLedger({
      action: "model-warm",
      result: "BROKEN",
      roleId: role?.roleId || null,
      backend: null,
      receiptPath: receipt.receiptPath
    });
    return receipt;
  }

  const probe = await probeOllamaModel(backend, prompt, input);
  const state = loadState();
  state.warmState[backend] = {
    lastWarmAt: nowIso(),
    lastProbeAt: nowIso(),
    lastProbeOk: Boolean(probe.ok),
    lastReceiptPath: null,
    lastError: probe.ok ? null : (typeof probe.data === "string" ? probe.data : probe.data?.error || probe.raw || "probe failed")
  };
  const receipt = writeReceipt("model-warm", {
    ok: Boolean(probe.ok),
    roleId: role?.roleId || null,
    backend,
    status: probe.ok ? "RUNNING" : "BROKEN",
    probe: {
      statusCode: probe.status,
      ok: probe.ok,
      preview: typeof probe.data?.message?.content === "string"
        ? probe.data.message.content.slice(0, 240)
        : typeof probe.data?.response === "string"
          ? probe.data.response.slice(0, 240)
          : null
    }
  });
  state.warmState[backend].lastReceiptPath = receipt.receiptPath;
  saveState(state);
  recordLeePrimeRuntimeState({
    state: loadState(),
    reason: `model_warm:${backend}`
  });
  recordWorkLedger({
    action: "model-warm",
    result: probe.ok ? "RUNNING" : "BROKEN",
    roleId: role?.roleId || null,
    backend,
    receiptPath: receipt.receiptPath
  });
  return receipt;
}

export async function routeModel(input = {}) {
  const role = typeof input.role === "string" && input.role.trim()
    ? MODEL_ROLE_DEFINITIONS.find((entry) => entry.roleId === input.role.trim()) || routeRoleForTask(input)
    : routeRoleForTask(input);
  const backend = typeof input.backend === "string" && input.backend.trim() ? input.backend.trim() : role?.backend;
  const prompt = taskStringFromInput(input) || "Route this request using the canonical model pool.";
  const shouldProbe = Boolean(input.probe || input.verify || input.requireProof);
  let probe = null;
  if (shouldProbe && backend) {
    probe = await probeOllamaModel(backend, prompt, input);
    const state = loadState();
    state.warmState[backend] = {
      lastWarmAt: probe.ok ? nowIso() : state.warmState[backend]?.lastWarmAt || null,
      lastProbeAt: nowIso(),
      lastProbeOk: Boolean(probe.ok),
      lastReceiptPath: null,
      lastError: probe.ok ? null : (typeof probe.data === "string" ? probe.data : probe.data?.error || probe.raw || "probe failed")
    };
    saveState(state);
  }

  const receipt = writeReceipt("model-route", {
    ok: true,
    roleId: role?.roleId || null,
    backend,
    task: prompt,
    classification: role?.roleId || "light_conversation_model",
    probe: probe ? {
      ok: Boolean(probe.ok),
      statusCode: probe.status,
      preview: typeof probe.data?.message?.content === "string"
        ? probe.data.message.content.slice(0, 240)
        : typeof probe.data?.response === "string"
          ? probe.data.response.slice(0, 240)
          : null
    } : null,
    selectedBy: role?.lane || "conversation"
  });

  recordWorkLedger({
    action: "model-route",
    result: role?.roleId || "light_conversation_model",
    backend,
    receiptPath: receipt.receiptPath,
    probeOk: probe ? Boolean(probe.ok) : null
  });
  recordLeePrimeRuntimeState({
    state: loadState(),
    reason: `model_route:${backend || "unknown"}`
  });

  return receipt;
}

function currentLaneLimits() {
  const manifest = loadManifest();
  return manifest.concurrencyLimits || {};
}

function laneStateTemplate(overrides = {}) {
  return {
    laneId: uniqueId("lane"),
    kind: "coding",
    status: "QUEUED",
    title: "",
    task: "",
    modelRole: null,
    backend: null,
    queueReason: null,
    progress: 0,
    messages: [],
    receipts: [],
    createdAt: nowIso(),
    updatedAt: nowIso(),
    startedAt: null,
    completedAt: null,
    cancelledAt: null,
    durationMs: 8000,
    error: null,
    proofPaths: [],
    ...overrides
  };
}

function loadLaneStateMap() {
  const state = loadState();
  return state.lanes || {};
}

function saveLaneStateMap(lanes) {
  const state = loadState();
  state.lanes = lanes;
  saveState(state);
  return lanes;
}

function countActiveLanes(lanes, kind = null) {
  return Object.values(lanes).filter((lane) => {
    if (!lane) return false;
    const active = ["RUNNING", "WAITING_ON_TOOL", "WAITING_ON_MODEL", "WAITING_ON_CONFIRMATION", "VALIDATING"].includes(lane.status);
    if (!active) return false;
    if (!kind) return true;
    return lane.kind === kind;
  }).length;
}

const LANE_COMPLETION_REQUIRED_EVIDENCE = [
  "taskId",
  "capabilityId",
  "identity",
  "policyDecision",
  "provider",
  "executionStart",
  "executionFinish",
  "exitCodeOrProviderResult",
  "outputArtifact",
  "outputHash",
  "validationResult",
  "receiptId",
  "receiptHash"
];

function laneEvidenceGaps(lane) {
  const gaps = [];
  if (!lane) return LANE_COMPLETION_REQUIRED_EVIDENCE;
  if (!lane.taskId && !lane.context?.taskId) gaps.push("taskId");
  if (!lane.capabilityId && !lane.context?.capabilityId) gaps.push("capabilityId");
  if (!lane.identity && !lane.context?.identity) gaps.push("identity");
  if (!lane.policyDecision && !lane.context?.policyDecision) gaps.push("policyDecision");
  if (!lane.provider && !lane.context?.provider) gaps.push("provider");
  if (!lane.executionStart && !lane.context?.executionStart) gaps.push("executionStart");
  if (!lane.executionFinish && !lane.context?.executionFinish) gaps.push("executionFinish");
  if (!lane.exitCode && lane.exitCode !== 0 && !lane.providerResult && !lane.context?.providerResult) gaps.push("exitCodeOrProviderResult");
  if (!lane.outputArtifact && !lane.context?.outputArtifact) gaps.push("outputArtifact");
  if (!lane.outputHash && !lane.context?.outputHash) gaps.push("outputHash");
  if (!lane.validationResult && !lane.context?.validationResult) gaps.push("validationResult");
  if (!lane.receiptId && !lane.context?.receiptId) gaps.push("receiptId");
  if (!lane.receiptHash && !lane.context?.receiptHash) gaps.push("receiptHash");
  return gaps;
}

function markLaneNotRuntimeVerified(laneId, extra = {}) {
  const state = loadState();
  const lane = state.lanes?.[laneId];
  if (!lane) return null;
  if (["COMPLETED", "FAILED", "CANCELLED"].includes(lane.status)) return lane;

  lane.status = "NOT_RUNTIME_VERIFIED";
  lane.progress = Math.min(lane.progress || 0, 99);
  lane.updatedAt = nowIso();
  lane.integrity = {
    tag: extra.tag || "EVIDENCE_REQUIRED",
    runtimeVerified: false,
    receiptRequired: true,
    correctedAt: nowIso(),
    reason: extra.reason || "Runtime execution evidence incomplete."
  };
  lane.resultSummary = extra.summary || `NOT_RUNTIME_VERIFIED: ${lane.integrity.reason}`;
  if (Array.isArray(extra.evidenceGaps)) {
    lane.evidenceGaps = extra.evidenceGaps;
  }
  if (laneTimers.has(laneId)) {
    clearInterval(laneTimers.get(laneId));
    laneTimers.delete(laneId);
  }
  state.lanes[laneId] = lane;
  saveState(state);
  appendCorrectionLedger({
    laneId,
    kind: lane.kind,
    action: "lane-evidence-denied",
    previousStatus: lane.status === "NOT_RUNTIME_VERIFIED" ? "RUNNING" : lane.status,
    integrityTag: lane.integrity.tag,
    evidenceGaps: lane.evidenceGaps || [],
    resultSummary: lane.resultSummary
  });
  return lane;
}

function startLaneTimer(laneId) {
  const state = loadState();
  const lane = state.lanes?.[laneId];
  if (!lane || lane.status !== "RUNNING") return;

  const startedAt = Date.parse(lane.startedAt || nowIso());
  const durationMs = Math.max(1000, Number(lane.durationMs || 8000));

  lane.progress = Math.max(lane.progress || 0, 1);
  lane.updatedAt = nowIso();
  state.lanes[laneId] = lane;
  saveState(state);

  const tick = () => {
    const freshState = loadState();
    const freshLane = freshState.lanes?.[laneId];
    if (!freshLane || ["CANCELLED", "COMPLETED", "FAILED", "NOT_RUNTIME_VERIFIED"].includes(freshLane.status)) {
      const existingTimer = laneTimers.get(laneId);
      if (existingTimer) {
        clearInterval(existingTimer);
        laneTimers.delete(laneId);
      }
      return;
    }

    const elapsed = Date.now() - startedAt;
    const progress = Math.min(99, Math.max(1, Math.floor((elapsed / durationMs) * 100)));
    freshLane.progress = progress;
    freshLane.updatedAt = nowIso();
    freshState.lanes[laneId] = freshLane;
    saveState(freshState);

    if (elapsed >= durationMs) {
      markLaneNotRuntimeVerified(laneId, {
        tag: "TIMER_EXPIRED_NO_EXECUTION_EVIDENCE",
        reason: "Timer expired without real execution evidence. Timer-only completion is disabled; a lane may reach COMPLETED only with full execution evidence per the lane state contract.",
        evidenceGaps: laneEvidenceGaps(freshLane)
      });
    }
  };

  const existingTimer = laneTimers.get(laneId);
  if (existingTimer) {
    clearInterval(existingTimer);
  }
  const timer = setInterval(tick, 1000);
  laneTimers.set(laneId, timer);
}

function tryStartQueuedLanes(kind = null) {
  const state = loadState();
  const lanes = state.lanes || {};
  const limits = currentLaneLimits();
  const ordered = Object.values(lanes)
    .filter((lane) => lane && lane.status === "QUEUED" && (!kind || lane.kind === kind))
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));

  for (const lane of ordered) {
    const totalActive = countActiveLanes(lanes);
    const kindActive = countActiveLanes(lanes, lane.kind);
    const totalLimit = Number(limits.totalLanes || 8);
    const kindLimit = Number(limits[lane.kind] || 1);

    if (totalActive >= totalLimit || kindActive >= kindLimit) {
      continue;
    }

    lane.status = "RUNNING";
    lane.startedAt = nowIso();
    lane.updatedAt = nowIso();
    lane.queueReason = null;
    lane.progress = Math.max(lane.progress || 0, 1);
    lanes[lane.laneId] = lane;
    saveState({ ...state, lanes });
    startLaneTimer(lane.laneId);
  }
}

const laneTimers = new Map();

function finishLane(laneId, ok, extra = {}) {
  const state = loadState();
  const lane = state.lanes?.[laneId];
  if (!lane) return null;
  if (["COMPLETED", "FAILED", "CANCELLED", "NOT_RUNTIME_VERIFIED"].includes(lane.status)) {
    return lane;
  }

  if (ok) {
    const gaps = laneEvidenceGaps(lane);
    if (gaps.length > 0) {
      return markLaneNotRuntimeVerified(laneId, {
        tag: "EVIDENCE_GATE_DENIED",
        reason: "Completion denied by lane state contract: missing " + gaps.join(", ") + ".",
        evidenceGaps: gaps
      });
    }
  }

  lane.status = ok ? "COMPLETED" : "FAILED";
  lane.progress = ok ? 100 : Math.min(lane.progress || 0, 99);
  lane.completedAt = nowIso();
  lane.updatedAt = nowIso();
  lane.error = ok ? null : extra.error || "Lane failed.";
  lane.resultSummary = extra.summary || (ok ? "Completed with full execution evidence." : "Failed.");
  lane.proofPaths = Array.isArray(extra.proofPaths) ? extra.proofPaths : lane.proofPaths || [];
  if (laneTimers.has(laneId)) {
    clearInterval(laneTimers.get(laneId));
    laneTimers.delete(laneId);
  }
  state.lanes[laneId] = lane;
  saveState(state);
  recordWorkLedger({
    action: ok ? "lane-complete" : "lane-failed",
    laneId,
    kind: lane.kind,
    result: lane.status,
    modelRole: lane.modelRole,
    backend: lane.backend
  });
  writeReceipt(ok ? "lane-complete" : "lane-failed", {
    ok,
    laneId,
    kind: lane.kind,
    status: lane.status,
    title: lane.title,
    task: lane.task,
    modelRole: lane.modelRole,
    backend: lane.backend,
    progress: lane.progress,
    summary: lane.resultSummary,
    error: lane.error
  });
  tryStartQueuedLanes(lane.kind);
  return lane;
}

export async function startLane(input = {}) {
  const manifest = loadManifest();
  const lanes = loadLaneStateMap();
  const role = routeRoleForTask(input);
  const kind = String(input.kind || role?.lane || "coding").trim() || "coding";
  const durationMs = Math.max(1000, Number(input.durationMs || (kind === "conversation" ? 1500 : 8000)));
  const limit = Number((manifest.concurrencyLimits || {})[kind] || 1);
  const totalLimit = Number(manifest.concurrencyLimits?.totalLanes || 8);
  const activeTotal = countActiveLanes(lanes);
  const activeKind = countActiveLanes(lanes, kind);
  const queueOverflow = activeTotal >= totalLimit || activeKind >= limit;
  const lane = laneStateTemplate({
    kind,
    title: String(input.title || input.task || input.prompt || kind).trim(),
    task: taskStringFromInput(input) || String(input.title || input.task || "").trim(),
    modelRole: role?.roleId || null,
    backend: role?.backend || null,
    status: queueOverflow ? "QUEUED" : "RUNNING",
    queueReason: queueOverflow ? `Lane capacity exceeded for ${kind}.` : null,
    durationMs,
    context: input.context || null,
    owningSkill: input.skillId || null,
    owningTool: input.tool || null
  });

  if (queueOverflow) {
    lane.receipts.push(writeReceipt("lane-queued", {
      ok: true,
      laneId: lane.laneId,
      kind,
      status: "QUEUED",
      reason: lane.queueReason,
      modelRole: lane.modelRole,
      backend: lane.backend
    }).receiptPath);
  } else {
    lane.startedAt = nowIso();
    lane.receipts.push(writeReceipt("lane-start", {
      ok: true,
      laneId: lane.laneId,
      kind,
      status: "RUNNING",
      reason: null,
      modelRole: lane.modelRole,
      backend: lane.backend,
      durationMs
    }).receiptPath);
  }

  lanes[lane.laneId] = lane;
  saveLaneStateMap(lanes);
  recordWorkLedger({
    action: "lane-start",
    laneId: lane.laneId,
    kind,
    status: lane.status,
    modelRole: lane.modelRole,
    backend: lane.backend
  });

  if (!queueOverflow) {
    startLaneTimer(lane.laneId);
  } else {
    recordWorkLedger({
      action: "lane-overload",
      laneId: lane.laneId,
      kind,
      result: "QUEUED",
      reason: lane.queueReason
    });
  }

  return lane;
}

export function getLane(laneId) {
  const lanes = loadLaneStateMap();
  return lanes[laneId] || null;
}

export function listLanes() {
  const lanes = loadLaneStateMap();
  const manifest = loadManifest();
  const list = Object.values(lanes).sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  const counts = list.reduce((acc, lane) => {
    acc[lane.status] = (acc[lane.status] || 0) + 1;
    return acc;
  }, {});

  return {
    ok: true,
    canonicalFingerprint: CANONICAL_FINGERPRINT,
    laneCount: list.length,
    counts,
    limits: manifest.concurrencyLimits,
    queuePolicy: manifest.queuePolicy,
    lanes: list
  };
}

export function messageLane(laneId, message) {
  const state = loadState();
  const lane = state.lanes?.[laneId];
  if (!lane) {
    return null;
  }
  const entry = {
    at: nowIso(),
    message: String(message || "").trim()
  };
  lane.messages = Array.isArray(lane.messages) ? lane.messages.concat(entry).slice(-100) : [entry];
  lane.updatedAt = nowIso();
  state.lanes[laneId] = lane;
  saveState(state);
  recordWorkLedger({
    action: "lane-message",
    laneId,
    kind: lane.kind,
    message: entry.message
  });
  writeReceipt("lane-message", {
    ok: true,
    laneId,
    kind: lane.kind,
    message: entry.message,
    status: lane.status
  });
  return lane;
}

export function cancelLane(laneId, reason = "Cancelled by request.") {
  const state = loadState();
  const lane = state.lanes?.[laneId];
  if (!lane) {
    return null;
  }

  lane.status = "CANCELLED";
  lane.cancelledAt = nowIso();
  lane.completedAt = lane.cancelledAt;
  lane.updatedAt = nowIso();
  lane.error = reason;
  lane.progress = Math.min(lane.progress || 0, 99);

  if (laneTimers.has(laneId)) {
    clearInterval(laneTimers.get(laneId));
    laneTimers.delete(laneId);
  }

  state.lanes[laneId] = lane;
  saveState(state);
  recordWorkLedger({
    action: "lane-cancel",
    laneId,
    kind: lane.kind,
    reason
  });
  writeReceipt("lane-cancel", {
    ok: true,
    laneId,
    kind: lane.kind,
    status: "CANCELLED",
    reason
  });
  tryStartQueuedLanes(lane.kind);
  return lane;
}

function normalizeSkillRegistry() {
  return {
    canonical: readOrNull(CANONICAL_SKILL_REGISTRY_PATH),
    sandbox: readOrNull(SKILL_SANDBOX_REGISTRY_PATH)
  };
}

function flattenCanonicalSkills() {
  const registry = readOrNull(CANONICAL_SKILL_REGISTRY_PATH);
  const skillPackages = Array.isArray(registry?.canonical_skill_packages) ? registry.canonical_skill_packages : [];
  return skillPackages.map((skill) => ({
    skillId: skill.skill_package_id || skill.id || skill.name || uniqueId("skill"),
    name: skill.skill_package_id || skill.name || "unknown",
    sourcePath: skill.path || null,
    packageFormat: skill.package_format || null,
    executionCenter: skill.execution_center || null,
    canonicalAttached: true,
    status: "INDEXED",
    owner: "agent-lee-prime"
  }));
}

function flattenSandboxSkills() {
  const registry = readOrNull(SKILL_SANDBOX_REGISTRY_PATH);
  const skills = Array.isArray(registry?.skills) ? registry.skills : [];
  return skills.map((skill) => ({
    skillId: skill.skillId || skill.id || "agent-lee-skill-self-test",
    name: skill.name || skill.skillId || "agent-lee-skill-self-test",
    sourcePath: skill.path || compactFilePath(SKILL_SANDBOX_ROOT),
    packageFormat: skill.packageFormat || "skill.md + manifest + actions",
    executionCenter: skill.executionCenter || "AUTONOMOUS_CORE_WITH_OPTIONAL_LLM_ENHANCEMENT",
    canonicalAttached: false,
    status: "SANDBOX_INDEXED",
    owner: "agent-lee-prime"
  }));
}

export function getSkillsFull() {
  const canonical = readOrNull(CANONICAL_SKILL_REGISTRY_PATH);
  const sandbox = normalizeSkillRegistry();
  return {
    ok: true,
    canonicalFingerprint: CANONICAL_FINGERPRINT,
    sourcePaths: {
      canonical: compactFilePath(CANONICAL_SKILL_REGISTRY_PATH),
      sandbox: compactFilePath(SKILL_SANDBOX_REGISTRY_PATH)
    },
    canonicalRegistry: canonical,
    sandboxRegistry: sandbox.sandbox,
    indexedSources: canonical?.indexed_sources || [],
    canonicalSkillPackages: flattenCanonicalSkills(),
    sandboxSkills: flattenSandboxSkills(),
    attached: true
  };
}

export function getMcpRegistry() {
  const canonical = readOrNull(CANONICAL_MCP_REGISTRY_PATH);
  return {
    ok: true,
    canonicalFingerprint: CANONICAL_FINGERPRINT,
    sourcePath: compactFilePath(CANONICAL_MCP_REGISTRY_PATH),
    canonicalRegistry: canonical,
    mcps: Array.isArray(canonical?.mcps)
      ? canonical.mcps.map((mcp) => ({
          mcpId: mcp.mcp_id || mcp.id || mcp.name || uniqueId("mcp"),
          name: mcp.name || mcp.mcp_id || "unknown",
          sourcePath: compactFilePath(CANONICAL_MCP_REGISTRY_PATH),
          routes: mcp.routes || [],
          capabilities: mcp.capabilities || [],
          status: "ATTACHED",
          testCommand: mcp.validation || null,
          lastValidationReceipt: mcp.validation_receipt || null,
          owningLane: mcp.connected_agents?.includes("agent-lee-prime") ? "skill-builder" : "simulation",
          canonicalAttached: true
        }))
      : [],
    attached: true
  };
}

function canonicalToolList() {
  const registry = readOrNull(CANONICAL_TOOL_REGISTRY_PATH);
  const tools = Array.isArray(registry?.tools) ? registry.tools : [];
  return tools.map((tool) => ({
    name: tool.tool_id || tool.name || "unknown",
    sourcePath: compactFilePath(CANONICAL_TOOL_REGISTRY_PATH),
    schema: tool.inputs || tool.permissions || tool.routes || null,
    status: "ATTACHED",
    testCommand: tool.validation || null,
    lastValidationReceipt: tool.receipt_path || null,
    owningLane: tool.runtime_dependency?.includes("preview") ? "creative" : "simulation",
    canonicalAttached: true
  }));
}

function browserCapabilityList() {
  const registry = readOrNull(CANONICAL_BROWSER_REGISTRY_PATH);
  const lanes = Array.isArray(registry?.lanes) ? registry.lanes : [];
  return lanes.map((lane) => ({
    name: lane.name || lane.capability_id || "browser-capability",
    sourcePath: compactFilePath(CANONICAL_BROWSER_REGISTRY_PATH),
    schema: {
      browser_api: lane.browser_api || null,
      safe_actions: lane.safe_actions || [],
      approval_required_actions: lane.approval_required_actions || []
    },
    status: lane.truth_status || lane.execution_status || "ATTACHED",
    testCommand: lane.node_status_command || null,
    lastValidationReceipt: lane.receipt_path || null,
    owningLane: lane.name === "WebXR" || lane.name === "WebGPU" ? "creative" : "research",
    canonicalAttached: true
  }));
}

export function getToolsFull() {
  return {
    ok: true,
    canonicalFingerprint: CANONICAL_FINGERPRINT,
    sourcePaths: {
      toolRegistry: compactFilePath(CANONICAL_TOOL_REGISTRY_PATH),
      browserRegistry: compactFilePath(CANONICAL_BROWSER_REGISTRY_PATH),
      internalRuntime: compactFilePath(ORCHESTRATION_MANIFEST_PATH)
    },
    tools: [
      ...INTERNAL_TOOL_DEFINITIONS,
      ...canonicalToolList(),
      ...browserCapabilityList()
    ],
    attached: true
  };
}

async function runBrowserResearch(query) {
  const response = await fetchJson(`${DESKTOP_RUNTIME_URL}/runtime/web-search`, {
    method: "POST",
    body: {
      confirm: "I_AUTHORIZE_AGENT_LEE_DESKTOP_COMMAND",
      query,
      source: "Agent Lee orchestration runtime"
    }
  }, 300000);
  return {
    ok: Boolean(response.ok),
    status: response.status,
    data: response.data,
    raw: response.raw
  };
}

export async function createSkill(input = {}) {
  const skillId = String(input.skillId || DEFAULT_MANIFEST.skillCreationPolicy.defaultSandboxSkillId || "agent-lee-skill-self-test").trim();
  const root = path.join(SKILL_SANDBOX_DIR, skillId);
  ensureDir(root);
  ensureDir(path.join(root, "notes"));
  ensureDir(path.join(root, "receipts"));

  const skillManifest = {
    skillId,
    name: input.name || "Agent Lee Skill Self Test",
    owner: "agent-lee-prime",
    classification: "SANDBOX",
    canonicalAttached: false,
    createdAt: nowIso(),
    purpose: "Harmless sandbox skill used to prove skill creation and validation runtime execution.",
    routes: ["POST /agent-lee/skills/create", "POST /agent-lee/skills/validate", "POST /agent-lee/skills/simulate"],
    files: {
      skillMd: "SKILL.md",
      manifest: "skill.manifest.json",
      actions: "actions.json"
    }
  };

  const skillMd = `# ${skillManifest.name}\n\nThis is the sandbox skill used to prove Agent Lee skill creation at runtime.\n\n## Guardrails\n- No destructive actions.\n- No secrets.\n- No production registry mutation.\n`;
  const actions = [
    {
      actionId: `${skillId}.self_test`,
      purpose: "Return a harmless self-test receipt.",
      inputSchema: { type: "object", properties: { message: { type: "string" } }, additionalProperties: true },
      outputSchema: { type: "object" }
    }
  ];

  writeJsonFile(path.join(root, "skill.manifest.json"), skillManifest);
  writeJsonFile(path.join(root, "actions.json"), actions);
  fs.writeFileSync(path.join(root, "SKILL.md"), skillMd, "utf8");

  const registry = loadOrCreateSandboxRegistry();
  registry.skills = Array.isArray(registry.skills) ? registry.skills.filter((entry) => entry.skillId !== skillId) : [];
  registry.skills.push({
    skillId,
    name: skillManifest.name,
    path: compactFilePath(root),
    packageFormat: "SKILL.md + skill.manifest.json + actions.json",
    executionCenter: "SANDBOX",
    canonicalAttached: false,
    status: "CREATED"
  });
  registry.updatedAt = nowIso();
  writeJsonFile(SKILL_SANDBOX_REGISTRY_PATH, registry);

  const receipt = writeReceipt("skill-create", {
    ok: true,
    skillId,
    skillRoot: compactFilePath(root),
    manifestPath: compactFilePath(path.join(root, "skill.manifest.json")),
    actionsPath: compactFilePath(path.join(root, "actions.json")),
    skillMdPath: compactFilePath(path.join(root, "SKILL.md")),
    status: "CREATED"
  });
  recordWorkLedger({
    action: "skill-create",
    skillId,
    result: "CREATED",
    receiptPath: receipt.receiptPath
  });
  return receipt;
}

function loadOrCreateSandboxRegistry() {
  const existing = readOrNull(SKILL_SANDBOX_REGISTRY_PATH);
  if (existing) {
    return existing;
  }
  const seeded = {
    registryId: "agent-lee-skill-sandbox-registry",
    owner: "agent-lee-prime",
    updatedAt: nowIso(),
    skills: []
  };
  writeJsonFile(SKILL_SANDBOX_REGISTRY_PATH, seeded);
  return seeded;
}

export async function validateSkill(input = {}) {
  const skillId = String(input.skillId || DEFAULT_MANIFEST.skillCreationPolicy.defaultSandboxSkillId || "agent-lee-skill-self-test").trim();
  const root = path.join(SKILL_SANDBOX_DIR, skillId);
  const manifestPath = path.join(root, "skill.manifest.json");
  const actionsPath = path.join(root, "actions.json");
  const skillMdPath = path.join(root, "SKILL.md");
  const manifest = readOrNull(manifestPath);
  const actions = readOrNull(actionsPath);
  const skillMdExists = fs.existsSync(skillMdPath);
  const ok = Boolean(manifest && Array.isArray(actions) && actions.length > 0 && skillMdExists);

  const receipt = writeReceipt("skill-validate", {
    ok,
    skillId,
    skillRoot: compactFilePath(root),
    manifestExists: Boolean(manifest),
    actionsExist: Boolean(Array.isArray(actions) && actions.length > 0),
    skillMdExists,
    validation: ok ? "PASS" : "FAIL",
    error: ok ? null : "Sandbox skill files missing or invalid."
  });

  recordWorkLedger({
    action: "skill-validate",
    skillId,
    result: ok ? "PASS" : "FAIL",
    receiptPath: receipt.receiptPath
  });

  return receipt;
}

export async function simulateSkill(input = {}) {
  const skillId = String(input.skillId || DEFAULT_MANIFEST.skillCreationPolicy.defaultSandboxSkillId || "agent-lee-skill-self-test").trim();
  const scenario = String(input.scenario || "skill-self-test").trim();
  const created = readOrNull(path.join(SKILL_SANDBOX_DIR, skillId, "skill.manifest.json")) || null;
  const receipt = writeReceipt("skill-simulate", {
    ok: true,
    skillId,
    scenario,
    skillExists: Boolean(created),
    simulation: {
      output: `Simulated execution for ${skillId} in scenario ${scenario}.`
    }
  });
  recordWorkLedger({
    action: "skill-simulate",
    skillId,
    scenario,
    result: "SIMULATED",
    receiptPath: receipt.receiptPath
  });
  return receipt;
}

export function routeSkill(input = {}) {
  const task = taskStringFromInput(input).toLowerCase();
  const sandboxSkillId = DEFAULT_MANIFEST.skillCreationPolicy.defaultSandboxSkillId || "agent-lee-skill-self-test";
  let selectedSkill = "leeway-vscode-ui-system";
  let reason = "default conversation and interface skill";
  let needsCreation = false;

  if (/(skill|self-test|sandbox)/i.test(task)) {
    selectedSkill = sandboxSkillId;
    reason = "sandbox skill requested";
    needsCreation = true;
  } else if (/(research|browser|search|citation|source|evidence)/i.test(task)) {
    selectedSkill = "leeway-enterprise-autocomplete";
    reason = "research and evidence synthesis";
  } else if (/\b3d\b|\bar\b|\bglb\b|\bgltf\b|\bmesh\b|\bscene\b|\bmaterial\b|\bwebxr\b|\bchess\b|\basset\b/i.test(task)) {
    selectedSkill = "leeway-creative-coding-execution";
    reason = "creative asset and 3D orchestration";
  } else if (/(code|coding|implement|build|refactor|debug|patch|test|program)/i.test(task)) {
    selectedSkill = "leeway-creative-coding-execution";
    reason = "coding and implementation";
  } else if (/(automation|simulate|dry-run|device|iot|robotics)/i.test(task)) {
    selectedSkill = "leeway-automation-fabric";
    reason = "simulation and automation";
  } else if (/(policy|standards|governance|audit|validate)/i.test(task)) {
    selectedSkill = "leeway-standards-supremacy-rule";
    reason = "governance and validation";
  }

  const receipt = writeReceipt("skill-route", {
    ok: true,
    skillId: selectedSkill,
    reason,
    needsCreation,
    task
  });
  recordWorkLedger({
    action: "skill-route",
    skillId: selectedSkill,
    result: reason,
    receiptPath: receipt.receiptPath
  });

  return {
    ok: true,
    canonicalFingerprint: CANONICAL_FINGERPRINT,
    selectedSkillId: selectedSkill,
    reason,
    needsCreation,
    receiptPath: receipt.receiptPath,
    attached: selectedSkill === sandboxSkillId ? false : true
  };
}

export async function runSimulation(input = {}) {
  const scenario = String(input.scenario || input.kind || "general-simulation").trim();
  const simulationId = uniqueId("simulation");
  const proofPaths = [];
  let result = null;
  let status = "COMPLETED";

  if (/(browser|research|search)/i.test(scenario)) {
    result = await runBrowserResearch(String(input.query || input.prompt || "Agent Lee orchestration runtime research proof.").trim());
    proofPaths.push(result.ok ? "browser-visible-search" : "browser-unavailable");
  } else if (/(skill|create)/i.test(scenario)) {
    result = await createSkill({
      skillId: input.skillId || DEFAULT_MANIFEST.skillCreationPolicy.defaultSandboxSkillId,
      name: input.name || "Agent Lee Skill Self Test"
    });
    proofPaths.push(result.receiptPath);
  } else if (/(3d|ar|chess)/i.test(scenario)) {
    result = await build3dChessSetProof({ query: input.query || "Create a 3D chess set concept with multiple selectable themed piece families." });
    proofPaths.push(result.projectRoot);
  } else {
    result = {
      ok: true,
      summary: `Dry-run simulation for ${scenario}`,
      details: input
    };
  }

  const simulation = {
    simulationId,
    scenario,
    status,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    result,
    proofPaths,
    receiptPath: null
  };

  const receipt = writeReceipt("simulation-run", {
    ok: true,
    simulationId,
    scenario,
    status,
    proofPaths,
    result
  });
  simulation.receiptPath = receipt.receiptPath;

  const state = loadState();
  state.simulations[simulationId] = simulation;
  saveState(state);
  recordWorkLedger({
    action: "simulation-run",
    simulationId,
    scenario,
    result: status,
    receiptPath: receipt.receiptPath
  });

  return receipt;
}

export function getSimulation(simulationId) {
  const state = loadState();
  return state.simulations?.[simulationId] || null;
}

export function listSimulationReceipts() {
  const state = loadState();
  return {
    ok: true,
    canonicalFingerprint: CANONICAL_FINGERPRINT,
    simulationCount: Object.keys(state.simulations || {}).length,
    simulations: Object.values(state.simulations || {}),
    receiptDir: compactFilePath(path.join(SIMULATION_DIR, "receipts"))
  };
}

export function get3dArStatus() {
  const proof = readOrNull(path.join(CHESS_PROOF_DIR, "proof.json")) || null;
  const manifest = readOrNull(path.join(CHESS_PROOF_DIR, "project.manifest.json")) || null;
  const scene = readOrNull(path.join(CHESS_PROOF_DIR, "scene.json")) || null;
  const browserRegistry = readOrNull(CANONICAL_BROWSER_REGISTRY_PATH);
  return {
    ok: true,
    canonicalFingerprint: CANONICAL_FINGERPRINT,
    status: proof?.pipelineStatus || "AR_3D_PIPELINE_PARTIAL",
    projectRoot: compactFilePath(CHESS_PROOF_DIR),
    manifestPath: compactFilePath(path.join(CHESS_PROOF_DIR, "project.manifest.json")),
    scenePath: compactFilePath(path.join(CHESS_PROOF_DIR, "scene.json")),
    proofPath: compactFilePath(path.join(CHESS_PROOF_DIR, "proof.json")),
    manifest,
    scene,
    proof,
    browserCapabilities: Array.isArray(browserRegistry?.lanes)
      ? browserRegistry.lanes.map((lane) => ({
          name: lane.name,
          browserApi: lane.browser_api,
          truthStatus: lane.truth_status,
          executionStatus: lane.execution_status
        }))
      : [],
    missingBackends: [
      "glTF/GLB exporter",
      "mesh baking pipeline",
      "AR device preview"
    ]
  };
}

export async function build3dChessSetProof(input = {}) {
  ensureDir(CHESS_PROOF_DIR);
  ensureDir(path.join(CHESS_PROOF_DIR, "themes"));
  ensureDir(path.join(CHESS_PROOF_DIR, "rules"));
  ensureDir(path.join(CHESS_PROOF_DIR, "evidence"));

  const query = String(input.query || "Create a 3D chess set concept with multiple selectable themed piece families.").trim();
  const browserResearch = await runBrowserResearch(query).catch((error) => ({
    ok: false,
    error: error?.message || String(error)
  }));

  const projectManifest = {
    projectId: "agent-lee-3d-chess-set-proof",
    projectName: "Agent Lee 3D Chess Set Proof",
    canonicalFingerprint: CANONICAL_FINGERPRINT,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    pipelineStatus: "AR_3D_PIPELINE_PARTIAL",
    missingBackends: ["glTF/GLB exporter", "mesh baking pipeline", "AR device preview"],
    themes: [
      "knights_and_dragons",
      "ninjas_and_samurai",
      "kung_fu_masters",
      "modern_military"
    ],
    assets: {
      scene: "scene.json",
      pieceFamilies: "themes/piece-families.json",
      rulesStub: "rules/chess-rules.stub.mjs",
      evidence: "evidence/research.json"
    }
  };

  const scene = {
    sceneId: "agent-lee-3d-chess-scene",
    board: {
      type: "chess",
      dimensions: { files: 8, ranks: 8, levels: 1 },
      style: "concept-only"
    },
    selectablePieceFamilies: [
      "knights_and_dragons",
      "ninjas_and_samurai",
      "kung_fu_masters",
      "modern_military"
    ],
    pieces: [
      { id: "white-king", family: "knights_and_dragons", type: "king", position: "e1" },
      { id: "black-king", family: "modern_military", type: "king", position: "e8" }
    ],
    renderNotes: [
      "This is a scene manifest and not a compiled mesh export.",
      "Use a real glTF/GLB exporter when available to move from partial to full."
    ]
  };

  const pieceFamilies = {
    knights_and_dragons: {
      name: "Knights and Dragons",
      palette: ["#7f5539", "#c1121f", "#fdf0d5"],
      king: "dragon crown",
      queen: "shield mage",
      rook: "castle tower",
      bishop: "winged knight",
      knight: "dragon rider",
      pawn: "squire"
    },
    ninjas_and_samurai: {
      name: "Ninjas and Samurai",
      palette: ["#111827", "#374151", "#f59e0b"],
      king: "shogun",
      queen: "shadow tactician",
      rook: "fortress gate",
      bishop: "blade monk",
      knight: "silent infiltrator",
      pawn: "apprentice ninja"
    },
    kung_fu_masters: {
      name: "Kung Fu Masters",
      palette: ["#b91c1c", "#f97316", "#facc15"],
      king: "grandmaster",
      queen: "storm palm",
      rook: "dojo pillar",
      bishop: "flow monk",
      knight: "tiger stance",
      pawn: "student fighter"
    },
    modern_military: {
      name: "Modern Military",
      palette: ["#1f2937", "#4b5563", "#84cc16"],
      king: "command unit",
      queen: "drone commander",
      rook: "armored turret",
      bishop: "signal officer",
      knight: "recon unit",
      pawn: "infantry"
    }
  };

  const rulesStub = `export function isLegalMove(board, piece, from, to) {\n  return {\n    ok: true,\n    supported: false,\n    note: "Rules stub only. Replace with a real legality engine for full 3D chess validation."\n  };\n}\n`;
  const evidence = {
    query,
    browserResearch,
    collectedAt: nowIso(),
    source: "desktop runtime browser-visible search",
    note: browserResearch?.ok ? "Browser research evidence captured." : "Browser research backend unavailable; proof is partial."
  };

  writeJsonFile(path.join(CHESS_PROOF_DIR, "project.manifest.json"), projectManifest);
  writeJsonFile(path.join(CHESS_PROOF_DIR, "scene.json"), scene);
  writeJsonFile(path.join(CHESS_PROOF_DIR, "themes", "piece-families.json"), pieceFamilies);
  fs.writeFileSync(path.join(CHESS_PROOF_DIR, "rules", "chess-rules.stub.mjs"), rulesStub, "utf8");
  writeJsonFile(path.join(CHESS_PROOF_DIR, "evidence", "research.json"), evidence);

  const proof = {
    proofId: uniqueId("3d-chess-proof"),
    canonicalFingerprint: CANONICAL_FINGERPRINT,
    pipelineStatus: "AR_3D_PIPELINE_PARTIAL",
    projectRoot: compactFilePath(CHESS_PROOF_DIR),
    manifestPath: compactFilePath(path.join(CHESS_PROOF_DIR, "project.manifest.json")),
    scenePath: compactFilePath(path.join(CHESS_PROOF_DIR, "scene.json")),
    rulesPath: compactFilePath(path.join(CHESS_PROOF_DIR, "rules", "chess-rules.stub.mjs")),
    evidencePath: compactFilePath(path.join(CHESS_PROOF_DIR, "evidence", "research.json")),
    missingBackends: ["glTF/GLB exporter", "mesh baking pipeline", "AR device preview"],
    browserResearch
  };

  writeJsonFile(path.join(CHESS_PROOF_DIR, "proof.json"), proof);
  const receipt = writeReceipt("3d-chess-proof", {
    ok: true,
    proofId: proof.proofId,
    projectRoot: proof.projectRoot,
    pipelineStatus: proof.pipelineStatus,
    missingBackends: proof.missingBackends,
    browserResearch: proof.browserResearch
  });

  recordWorkLedger({
    action: "3d-chess-proof",
    proofId: proof.proofId,
    result: proof.pipelineStatus,
    receiptPath: receipt.receiptPath
  });

  return {
    ok: true,
    ...proof,
    receiptPath: receipt.receiptPath
  };
}

export async function getToolCallSummary(toolName, input = {}) {
  if (toolName === "leeway_orchestration_status") {
    return {
      ok: true,
      tool: toolName,
      result: await getOrchestrationHealth()
    };
  }

  if (toolName === "leeway_model_pool_status") {
    return { ok: true, tool: toolName, result: await getModelPoolStatus() };
  }

  if (toolName === "leeway_model_route") {
    return { ok: true, tool: toolName, result: await routeModel(input) };
  }

  if (toolName === "leeway_lane_start") {
    return { ok: true, tool: toolName, result: await startLane(input) };
  }

  if (toolName === "leeway_lane_status") {
    return { ok: true, tool: toolName, result: getLane(input.laneId || input.id || "") };
  }

  if (toolName === "leeway_lane_message") {
    return { ok: true, tool: toolName, result: messageLane(input.laneId || input.id || "", input.message || input.text || "") };
  }

  if (toolName === "leeway_work_ledger") {
    return { ok: true, tool: toolName, result: getWorkLedger() };
  }

  if (toolName === "leeway_preference_ledger") {
    return { ok: true, tool: toolName, result: getPreferences() };
  }

  if (toolName === "leeway_stateful_research_harness_status") {
    return { ok: true, tool: toolName, result: getResearchHealth() };
  }

  if (toolName === "leeway_research_quality_sources") {
    return { ok: true, tool: toolName, result: getResearchQualityCriteria() };
  }

  if (toolName === "leeway_research_start") {
    return { ok: true, tool: toolName, result: startResearchSession(input) };
  }

  if (toolName === "leeway_research_search") {
    return { ok: true, tool: toolName, result: await researchSearch(input) };
  }

  if (toolName === "leeway_research_inspect") {
    return { ok: true, tool: toolName, result: researchInspect(input) };
  }

  if (toolName === "leeway_research_curate") {
    return { ok: true, tool: toolName, result: researchCurate(input) };
  }

  if (toolName === "leeway_research_claim_check") {
    return { ok: true, tool: toolName, result: researchClaimCheck(input) };
  }

  if (toolName === "leeway_research_receipt") {
    return { ok: true, tool: toolName, result: researchReceipt(input) };
  }

  if (toolName === "leeway_research_apply_to_build") {
    return { ok: true, tool: toolName, result: applyEvidenceToBuild(input) };
  }

  if (toolName === "leeway_skill_registry_full") {
    return { ok: true, tool: toolName, result: getSkillsFull() };
  }

  if (toolName === "leeway_mcp_registry") {
    return { ok: true, tool: toolName, result: getMcpRegistry() };
  }

  if (toolName === "leeway_skill_create") {
    return { ok: true, tool: toolName, result: await createSkill(input) };
  }

  if (toolName === "leeway_skill_validate") {
    return { ok: true, tool: toolName, result: await validateSkill(input) };
  }

  if (toolName === "leeway_simulation_run") {
    return { ok: true, tool: toolName, result: await runSimulation(input) };
  }

  if (toolName === "leeway_3d_asset_pipeline_status") {
    return { ok: true, tool: toolName, result: get3dArStatus() };
  }

  if (toolName === "leeway_3d_chess_set_proof") {
    return { ok: true, tool: toolName, result: await build3dChessSetProof(input) };
  }

  return {
    ok: false,
    tool: toolName,
    error: `Unsupported orchestration tool: ${toolName}`
  };
}

export function getWorkLedger() {
  return {
    ok: true,
    canonicalFingerprint: CANONICAL_FINGERPRINT,
    ledgerPath: compactFilePath(WORK_LEDGER_PATH),
    entries: loadWorkLedger()
  };
}

export function getPreferences() {
  return {
    ok: true,
    canonicalFingerprint: CANONICAL_FINGERPRINT,
    ledgerPath: compactFilePath(PREFERENCE_LEDGER_PATH),
    preferences: loadPreferences()
  };
}

export async function getOrchestrationHealth() {
  const manifest = loadManifest();
  const state = loadState();
  const preferences = loadPreferences();
  const workLedger = loadWorkLedger();
  const lanes = Object.values(state.lanes || {});
  const activeLanes = lanes.filter((lane) => ["QUEUED", "RUNNING", "WAITING_ON_TOOL", "WAITING_ON_MODEL", "WAITING_ON_CONFIRMATION", "VALIDATING"].includes(lane.status));
  const modelPool = await getModelPoolStatus();
    const adapterOnline =
    await probeHttpHealth(`http://host.docker.internal:${ADAPTER_PORT}/health`, 3000) ||
    await probeHttpHealth(`http://127.0.0.1:${ADAPTER_PORT}/health`, 1000);
  const leePrimeRuntimeState = await refreshLeePrimeRuntimeState({
    state,
    modelPool,
    routerOnline: true,
    adapterOnline,
    orchestrationOnline: true,
    reason: "orchestration_health_probe"
  });

  return {
    ok: true,
    canonicalFingerprint: CANONICAL_FINGERPRINT,
    manifestPath: compactFilePath(ORCHESTRATION_MANIFEST_PATH),
    statePath: compactFilePath(ORCHESTRATION_STATE_PATH),
    workLedgerPath: compactFilePath(WORK_LEDGER_PATH),
    preferenceLedgerPath: compactFilePath(PREFERENCE_LEDGER_PATH),
    receiptDir: compactFilePath(ORCHESTRATION_RECEIPT_DIR),
    modelPool: {
      defaultRole: manifest.modelPool?.defaultRole || "light_conversation_model",
      roleCount: Array.isArray(manifest.modelPool?.roles) ? manifest.modelPool.roles.length : 0
    },
    leePrimeRuntimeState,
    agentState: leePrimeRuntimeState.agentState,
    executionState: leePrimeRuntimeState.executionState,
    modelState: leePrimeRuntimeState.modelState,
    receiptState: leePrimeRuntimeState.receiptState,
    lanes: {
      total: lanes.length,
      active: activeLanes.length,
      queued: lanes.filter((lane) => lane.status === "QUEUED").length
    },
    workLedgerEntries: workLedger.length,
    preferenceLearningEnabled: Boolean(preferences.agentLeePreferenceLearningEnabled),
    liveMicRecordingEnabled: Boolean(preferences.agentLeeLiveMicRecordingEnabled),
    receipts: {
      lastReceiptPath: state.lastReceiptPath || null
    },
    registrySources: manifest.registrySources,
    queuePolicy: manifest.queuePolicy,
    concurrencyLimits: manifest.concurrencyLimits,
    conversationRecordingPolicy: manifest.conversationRecordingPolicy,
    taskRecordingPolicy: manifest.taskRecordingPolicy,
    skillCreationPolicy: manifest.skillCreationPolicy,
    physicalActionGuardPolicy: manifest.physicalActionGuardPolicy
  };
}

function ensureSeedFiles() {
  ensureDir(WORK_LEDGER_DIR);
  ensureDir(ORCHESTRATION_RECEIPT_DIR);
  ensureDir(SIMULATION_DIR);
  ensureDir(THREE_D_AR_DIR);
  ensureDir(CHESS_PROOF_DIR);
  ensureDir(SKILL_SANDBOX_DIR);

  if (!fs.existsSync(ORCHESTRATION_MANIFEST_PATH)) {
    writeJsonFile(ORCHESTRATION_MANIFEST_PATH, {
      ...DEFAULT_MANIFEST,
      createdAt: nowIso(),
      updatedAt: nowIso()
    });
  }

  if (!fs.existsSync(PREFERENCE_LEDGER_PATH)) {
    writeJsonFile(PREFERENCE_LEDGER_PATH, {
      ...DEFAULT_PREFERENCES,
      updatedAt: nowIso()
    });
  }

  if (!fs.existsSync(ORCHESTRATION_STATE_PATH)) {
    writeJsonFile(ORCHESTRATION_STATE_PATH, {
      version: 1,
      canonicalFingerprint: CANONICAL_FINGERPRINT,
      updatedAt: nowIso(),
      warmState: {},
      lanes: {},
      simulations: {},
      lastReceiptPath: null,
      leePrimeRuntimeState: null,
      leePrimeRuntimeStateLedger: []
    });
  }
}

ensureSeedFiles();

export default {
  CANONICAL_FINGERPRINT,
  ORCHESTRATION_MANIFEST_PATH,
  ORCHESTRATION_STATE_PATH,
  PREFERENCE_LEDGER_PATH,
  WORK_LEDGER_PATH,
  ORCHESTRATION_RECEIPT_DIR,
  getOrchestrationHealth,
  getModelPoolStatus,
  refreshLeePrimeRuntimeState,
  getLeePrimeRuntimeState,
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
  createSkill,
  validateSkill,
  simulateSkill,
  routeSkill,
  runSimulation,
  getSimulation,
  listSimulationReceipts,
  get3dArStatus,
  build3dChessSetProof,
  getToolCallSummary,
  writeReceipt,
  recordWorkLedger
};
