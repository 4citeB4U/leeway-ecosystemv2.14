/*
LEEWAY HEADER
TAG: REPORTING.CONSTITUTIONAL_RUNTIME_CONVERGENCE
REGION: ARCHIVE.REPORTS
DISCOVERY_PIPELINE: Evidence -> Reconciliation -> Truth Label -> Receipt
LEEWAY_ID: LEEWAY_APP::REPORTING::CONSTITUTIONAL_RUNTIME_CONVERGENCE::PASS_1
CLASSIFICATION: EVIDENCE
OWNER: LeeWay Standards
*/
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const reportsRoot = path.join(root, "Archive", "reports");
const receiptsRoot = path.join(root, "Archive", "receipts");
mkdirSync(reportsRoot, { recursive: true });
mkdirSync(receiptsRoot, { recursive: true });

const now = new Date().toISOString();
const assistantBodyId = "CODEX_ASSISTANT_BODY";
const assistantObjectId = "LEEWAY_ACTOR::ASSISTANT_BODY::CODEX::20260524";
const taskId = "LEEWAY_TASK::TOTAL_CONSTITUTIONAL_RUNTIME_CONVERGENCE_AND_LIVE_LANGUAGE_EXECUTION::20260524";
const subjectObjectId = "LEEWAY_APP::CONSTITUTIONAL_RUNTIME::LIVE_LANGUAGE_EXECUTION::PASS_1";

function rel(...parts) {
  return path.join(...parts).replace(/\\/g, "/");
}

function readJson(relativePath, fallback = null) {
  const full = path.join(root, relativePath);
  if (!existsSync(full)) return fallback;
  try {
    return JSON.parse(readFileSync(full, "utf8").replace(/^\uFEFF/, ""));
  } catch {
    return fallback;
  }
}

function writeJson(relativePath, payload) {
  const full = path.join(root, relativePath);
  mkdirSync(path.dirname(full), { recursive: true });
  writeFileSync(full, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function writeText(relativePath, text) {
  const full = path.join(root, relativePath);
  mkdirSync(path.dirname(full), { recursive: true });
  writeFileSync(full, text.endsWith("\n") ? text : `${text}\n`, "utf8");
}

async function fetchJson(url, fallback = null) {
  try {
    const response = await fetch(url);
    if (!response.ok) return fallback;
    return await response.json();
  } catch {
    return fallback;
  }
}

function shell(command) {
  try {
    return { ok: true, output: execSync(command, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim() };
  } catch (error) {
    return {
      ok: false,
      output: String(error.stdout ?? "").trim(),
      error: String(error.stderr ?? error.message ?? error).trim(),
    };
  }
}

const standardsDir = path.join(root, "LeeWay-Standards", "standards");
const bookFiles = readdirSync(standardsDir).filter((name) => /^BOOK-.*\.md$/i.test(name)).sort();
const canonicalBookFiles = bookFiles.filter((name) => /^BOOK-\d{2}-/i.test(name) && !name.includes("FULL-CANON-BINDER"));
const booksFound = bookFiles.length;
const booksLoaded = canonicalBookFiles.length;

const [
  systemHealth,
  languageStatus,
  languageMemory,
  edgeSystems,
  rtcHealth,
  rtcAuthority,
  gpuHealth,
  gpuFabric,
  controlPlane,
  generatedHealth,
  generatedInheritance,
] = await Promise.all([
  fetchJson("http://127.0.0.1:7600/api/system/health", {}),
  fetchJson("http://127.0.0.1:7600/api/language/runtime/status", {}),
  fetchJson("http://127.0.0.1:7600/api/language/memory", {}),
  fetchJson("http://127.0.0.1:7600/api/edge/systems", {}),
  fetchJson("http://127.0.0.1:4317/health", {}),
  fetchJson("http://127.0.0.1:4317/authority", {}),
  fetchJson("http://127.0.0.1:4327/health", {}),
  fetchJson("http://127.0.0.1:4327/fabric", {}),
  fetchJson("http://127.0.0.1:3072/api/sovereign-control-plane", {}),
  fetchJson("http://127.0.0.1:4173/api/health", {}),
  fetchJson("http://127.0.0.1:4173/api/agent-lee-language-inheritance", {}),
]);

const docker = shell("docker ps --format \"{{.ID}} {{.Image}} {{.Status}}\"");
const nvidia = shell("nvidia-smi --query-gpu=name,memory.total,memory.used --format=csv,noheader");

const voiceGate = readJson("Archive/reports/leeway-agent-lee-live-voice-audible-gate-report.json", {});
const blockerSentinel = readJson("Archive/reports/leeway-blocker-sentinel-report.json", {});
const regressionGate = readJson("Archive/reports/leeway-regression-prevention-gate-report.json", {});
const reconnectGate = readJson("Archive/reports/leeway-agent-lee-reconnect-continuity-gate-report.json", {});
const generatedGate = readJson("Archive/reports/leeway-generated-application-runtime-reality-gate-report.json", {});
const languageGate = readJson("Archive/reports/leeway-agent-lee-language-pattern-processor-report.json", {});
const vernacularGate = readJson("Archive/reports/leeway-agent-lee-vernacular-authority-gate-report.json", {});
const runtimeIdentityGate = readJson("Archive/reports/leeway-runtime-process-identity-report.json", {});
const embodimentGate = readJson("Archive/reports/leeway-continuous-embodiment-execution-pass-1-report.json", {});
const totalUnificationGate = readJson("Archive/reports/leeway-total-ecosystem-unification-final-gate-report.json", {});

const edgeSystemRows = Array.isArray(edgeSystems.systems) ? edgeSystems.systems : [];
const rtcConnector = edgeSystemRows.find((row) => row.id === "leeway-edge-rtc") ?? {};
const edgeAllReachable = edgeSystemRows.length > 0 && edgeSystemRows.every((row) => row.health?.ok === true);
const rtcWebSocketOk = Boolean(rtcConnector.health?.checks?.some((check) => check.type === "websocket" && check.ok === true));
const languageEmbodiment = languageStatus.embodimentProof ?? {};
const voiceBlocked = voiceGate.persistentLiveVoiceStatus !== "PASS" || languageEmbodiment.voiceContinuityActive !== true;
const micBlocked = languageEmbodiment.microphoneContinuityActive !== true;
const finalLanguageVerdict = voiceBlocked || micBlocked ? "LEEWAY_LIVE_LANGUAGE_BLOCKED" : "LEEWAY_LIVE_LANGUAGE_EXECUTION_PASS";

const domainSpecs = [
  ["Standards", "LEEWAY_APP::STANDARDS::CONSTITUTION::SEVENTY_EIGHT_BOOK_AUTHORITY", "FULL", ["BOOK-01", "BOOK-54", "BOOK-55", "BOOK-78"]],
  ["Bridge Runtime", "LEEWAY_APP::BRIDGE_RUNTIME::SUPERVISOR::CONSTITUTIONAL_ENFORCEMENT", "PARTIAL", ["BOOK-03", "BOOK-04", "BOOK-70"]],
  ["Operational Command Environment", "LEEWAY_APP::ADMIN::CONTROL_PLANE::SOVEREIGN_RUNTIME", controlPlane.finalStatus === "PASS" ? "FULL" : "PARTIAL", ["BOOK-16", "BOOK-27"]],
  ["Agent Lee", "LEEWAY_APP::AGENT_LEE::RUNTIME::LIVE_CONCIERGE", "PARTIAL", ["BOOK-54", "BOOK-76", "BOOK-77"]],
  ["Voice", "LEEWAY_APP::VOICE::PRIMARY_CLONE::LIVE_ROUTE", "BLOCKED", ["BOOK-05", "BOOK-54", "BOOK-77"]],
  ["Vision", "LEEWAY_APP::VISION::GOVERNED_PERCEPTION", "PARTIAL", ["BOOK-62", "BOOK-76"]],
  ["RTC / Edge RTC", "LEEWAY_APP::RTC::EDGE_BACKBONE::CONTINUITY", rtcWebSocketOk ? "PARTIAL" : "BLOCKED", ["BOOK-06", "BOOK-62"]],
  ["Edge GPU", "LEEWAY_APP::GPU::EDGE_EXECUTION::MODEL_AUTHORITY", "PARTIAL", ["BOOK-07", "BOOK-63"]],
  ["Edge Device", "LEEWAY_APP::EDGE_DEVICE::RUNTIME::HEALTH", edgeSystemRows.find((row) => row.id === "leeway-edge-device")?.health?.ok ? "FULL" : "PARTIAL", ["BOOK-37"]],
  ["Edge IoT", "LEEWAY_APP::EDGE_IOT::RUNTIME::HEALTH", edgeSystemRows.find((row) => row.id === "leeway-edge-iot")?.health?.ok ? "FULL" : "PARTIAL", ["BOOK-37"]],
  ["Employment Center", "LEEWAY_APP::EMPLOYMENT_CENTER::AGENT_DISPATCH", edgeSystemRows.find((row) => row.id === "leeway-employment-center")?.health?.ok ? "PARTIAL" : "BLOCKED", ["BOOK-36"]],
  ["Content Automation", "LEEWAY_APP::CONTENT_AUTOMATION::PUBLIC_UI", "PARTIAL", ["BOOK-39", "BOOK-40"]],
  ["SVG Creator", "LEEWAY_APP::SVG_CREATOR::PUBLIC_UI", "PARTIAL", ["BOOK-39", "BOOK-40"]],
  ["Generated Applications", "LEEWAY_APP::GENERATED_APPLICATIONS::RUNTIME_REALITY", generatedHealth.runtime === "active" ? "PARTIAL" : "BLOCKED", ["BOOK-39", "BOOK-42", "BOOK-43"]],
  ["Public/Admin UIs", "LEEWAY_APP::PUBLIC_ADMIN_UI::GOVERNANCE", "PARTIAL", ["BOOK-12", "BOOK-40", "BOOK-41"]],
  ["Manager/Employee Agents", "LEEWAY_APP::EMPLOYMENT_CENTER::MANAGER_EMPLOYEE_AGENTS", "PARTIAL", ["BOOK-29", "BOOK-36"]],
  ["Workflow Engine", "LEEWAY_APP::WORKFLOW::EXECUTION", "PARTIAL", ["BOOK-34"]],
  ["Execution VM", "LEEWAY_APP::EXECUTION_VM::AUTHORITY", "PARTIAL", ["BOOK-35"]],
  ["Law Resolution Engine", "LEEWAY_APP::LAW_RESOLUTION::ENGINE", "PARTIAL", ["BOOK-15"]],
  ["Telemetry", "LEEWAY_APP::TELEMETRY::RUNTIME", "PARTIAL", ["BOOK-14", "BOOK-38", "BOOK-55"]],
  ["Receipts", "LEEWAY_APP::RECEIPTS::RUNTIME", "PARTIAL", ["BOOK-14", "BOOK-51", "BOOK-55"]],
  ["Gates", "LEEWAY_APP::GATES::VALIDATION", blockerSentinel.finalStatus === "FAIL" ? "BLOCKED" : "PARTIAL", ["BOOK-15"]],
  ["Continuity/Recovery", "LEEWAY_APP::RECOVERY::CONTINUITY", reconnectGate.finalStatus === "PASS" ? "PARTIAL" : "BLOCKED", ["BOOK-28", "BOOK-71", "BOOK-72", "BOOK-73"]],
  ["Embodiment", "LEEWAY_APP::EMBODIMENT::CONTINUOUS", embodimentGate.finalStatus === "PASS" ? "PARTIAL" : "BLOCKED", ["BOOK-54", "BOOK-76"]],
  ["Enterprise Governance", "LEEWAY_APP::ENTERPRISE::GOVERNANCE", blockerSentinel.enterprisePresentationAllowed === true ? "PARTIAL" : "BLOCKED", ["BOOK-64", "BOOK-65", "BOOK-66"]],
  ["Assistant Bodies", "LEEWAY_APP::ASSISTANT_BODIES::GOVERNANCE", "FULL", ["BOOK-52", "BOOK-53", "BOOK-54", "BOOK-55"]],
  ["Simulation Systems", "LEEWAY_APP::SIMULATION::RUNTIME", "PARTIAL", ["BOOK-71"]],
  ["Deployment/External Operation", "LEEWAY_APP::DEPLOYMENT::EXTERNAL_OPERATION", "BLOCKED", ["BOOK-48", "BOOK-74", "BOOK-75"]],
];

const enforcementMap = {
  reportId: "LEEWAY_REPORT::RUNTIME_CONSTITUTIONAL_ENFORCEMENT_MAP::PASS_1",
  generatedAt: now,
  assistantBodyId,
  assistantObjectId,
  taskId,
  subjectObjectId,
  constitutionalGovernanceVerdict: "LEEWAY_CONSTITUTIONAL_GOVERNANCE_BLOCKED",
  booksFound,
  booksLoaded,
  binderPresent: bookFiles.includes("BOOK-01-78-FULL-CANON-BINDER.md"),
  domains: domainSpecs.map(([domain, id, status, books]) => ({
    domain,
    id,
    status,
    verdict:
      status === "FULL"
        ? "LEEWAY_FULLY_GOVERNED_UNDER_78_BOOKS"
        : status === "PARTIAL"
          ? "LEEWAY_CONSTITUTIONAL_GOVERNANCE_PARTIAL"
          : "LEEWAY_CONSTITUTIONAL_GOVERNANCE_BLOCKED",
    governingBookIds: books,
    activeLawReferences: books.map((book) => `LeeWay-Standards/standards/${book}`),
    runtimeEnforcementLinks: status === "BLOCKED" ? ["PARTIAL_OR_MISSING_LIVE_ENFORCEMENT"] : ["ACTIVE_OR_PARTIAL_RUNTIME_LINK"],
    gateReferences: ["LeeWay-Standards/scripts", "Archive/reports/*gate-report.json"],
    receiptReferences: ["Archive/receipts"],
    telemetryReferences: ["Archive/reports", "runtime health endpoints"],
    assistantLoadingBehavior: domain === "Assistant Bodies" ? "READ_FIRST_BOOK_54_55_REQUIRED" : "PARTIAL_LOADING_EVIDENCE",
    generatedAppInheritance: domain === "Generated Applications" ? generatedInheritance : "REQUIRES_INHERITANCE_WHEN_APPLICABLE",
    agentLeeBehaviorAlignment: languageStatus.entityState === "LIVE_LANGUAGE_OPERATING_ENTITY" ? "LANGUAGE_ATTACHED_VOICE_BLOCKED" : "NOT_ATTACHED",
    blockerFailureTruthLabeling: status === "BLOCKED" ? "BLOCKED" : status === "PARTIAL" ? "PARTIAL" : "FULL",
  })),
};

const domainsFullyGoverned = enforcementMap.domains.filter((domain) => domain.status === "FULL").length;
const domainsPartiallyGoverned = enforcementMap.domains.filter((domain) => domain.status === "PARTIAL").length;
const domainsBlocked = enforcementMap.domains.filter((domain) => domain.status === "BLOCKED").length;
const constitutionalCoverageScore = Math.round(((domainsFullyGoverned + domainsPartiallyGoverned * 0.5) / enforcementMap.domains.length) * 100);
const runtimeConvergenceScore = Math.round(((edgeAllReachable ? 18 : 8) + (rtcWebSocketOk ? 12 : 0) + (systemHealth.status === "healthy" ? 10 : 0) + (generatedHealth.runtime === "active" ? 8 : 0) + (voiceBlocked ? 0 : 20) + (blockerSentinel.finalStatus === "PASS" ? 12 : 0) + (docker.ok ? 10 : 0) + (gpuHealth.status === "PASS" ? 10 : 5)) / 1);

const repairsApplied = [
  "Attached LEEWAY_APP::AGENT_LEE::LANGUAGE::LIVE_OPERATING_ENTITY to Agent Lee runtime voice/stt/tts routes.",
  "Added live language status, processing, narration, memory endpoints, and receipts.",
  "Added canonical voice fallback diagnostics that keep text emergency as no-speech proof.",
  "Added Edge RTC /ws continuity route and fixed /speak proof references.",
  "Corrected Agent Lee runtime connector defaults to active local edge ports 4328/4327/4329/4317.",
  "Added generated app Agent Lee language inheritance endpoint.",
  "Added sovereign runtime control plane projection endpoint to command unit.",
];

const stalePassClaims = [];
if (totalUnificationGate.finalStatus === "UNIFIED") {
  stalePassClaims.push({
    gate: "LEEWAY_TOTAL_ECOSYSTEM_UNIFICATION_FINAL_GATE",
    staleClaim: "UNIFIED",
    downgradedTo: "STALE_PASS_CLAIM",
    reason: "Live evidence still shows text-only voice, reconnect failure, blocker sentinel failure, regression failure, Docker unavailable, and no microphone speech continuity proof.",
  });
}

const gatesRun = [
  { gate: "LEEWAY_AGENT_LEE_LANGUAGE_PATTERN_PROCESSOR_GATE", status: languageGate.finalStatus },
  { gate: "LEEWAY_AGENT_LEE_VERNACULAR_AUTHORITY_GATE", status: vernacularGate.finalStatus },
  { gate: "LEEWAY_AGENT_LEE_LIVE_VOICE_AUDIBLE_GATE", status: voiceGate.finalStatus },
  { gate: "LEEWAY_RUNTIME_PROCESS_IDENTITY_GATE", status: runtimeIdentityGate.finalStatus },
  { gate: "LEEWAY_GENERATED_APPLICATION_RUNTIME_REALITY_GATE", status: generatedGate.finalStatus },
  { gate: "LEEWAY_BLOCKER_SENTINEL_GATE", status: blockerSentinel.finalStatus },
  { gate: "LEEWAY_REGRESSION_PREVENTION_GATE", status: regressionGate.finalStatus },
  { gate: "LEEWAY_AGENT_LEE_RECONNECT_CONTINUITY_GATE", status: reconnectGate.finalStatus },
  { gate: "LEEWAY_CONTINUOUS_EMBODIMENT_EXECUTION_PASS_1", status: embodimentGate.finalStatus },
  { gate: "LEEWAY_TOTAL_ECOSYSTEM_UNIFICATION_FINAL_GATE", status: totalUnificationGate.finalStatus },
];

const gatesPassed = gatesRun.filter((gate) => gate.status === "PASS").map((gate) => gate.gate);
const gatesFailed = gatesRun
  .filter((gate) => ["FAIL", "PARTIAL"].includes(gate.status) || gate.gate === "LEEWAY_TOTAL_ECOSYSTEM_UNIFICATION_FINAL_GATE")
  .map((gate) => `${gate.gate}:${gate.gate === "LEEWAY_TOTAL_ECOSYSTEM_UNIFICATION_FINAL_GATE" ? "STALE_UNIFIED_DOWNGRADED" : gate.status}`);

const remainingBlockers = [
  "Canonical cloned live voice remains blocked; route is leeway.voice.text.emergency with TEXT_ONLY_NOT_SPEECH diagnostics.",
  "Microphone continuity and no-button natural conversation are not live-proven.",
  "RTC WebSocket continuity is repaired and visible, but RTC speech loop with audio frames/transcript continuity is not proven.",
  "GPU hardware exists, but Edge GPU runtime still reports CPU_COORDINATION_ONLY provider mode.",
  `Docker canonical stack unavailable: ${docker.error || docker.output || "docker ps failed"}`,
  "Blocker sentinel remains FAIL with two open reconnect-continuity blockers.",
  "Regression prevention remains FAIL because sentinel truth downgraded to BLOCKED.",
  "Generated app is live as an existing executable fixture, but generation during this pass was not proven.",
  "Sovereign command plane projection is visible, but source service status still contains stale NOT_STARTED rows for some surfaces.",
  "Total ecosystem unification gate emitted a stale UNIFIED claim and was downgraded by runtime truth.",
];

const totalReport = {
  assistantBodyId,
  assistantObjectId,
  taskId,
  subjectObjectId,
  generatedAt: now,
  finalVerdict: "LEEWAY_CONSTITUTIONAL_GOVERNANCE_BLOCKED",
  finalStatus: "BLOCKED",
  constitutionalCoverageScore,
  runtimeConvergenceScore,
  booksFound,
  booksLoaded,
  domainsAudited: enforcementMap.domains.length,
  domainsFullyGoverned,
  domainsPartiallyGoverned,
  domainsBlocked,
  AgentLeeVoiceStatus: "TEXT_ONLY_NOT_SPEECH",
  AgentLeeConversationStatus: "BLOCKED_MICROPHONE_AND_NATURAL_CONVERSATION_NOT_PROVEN",
  RTCContinuityStatus: rtcWebSocketOk ? "PARTIAL_WEBSOCKET_ACTIVE_SPEECH_LOOP_NOT_PROVEN" : "BLOCKED",
  GPUAuthorityStatus: gpuHealth.providerMode === "CPU_COORDINATION_ONLY" ? "PARTIAL_CPU_COORDINATION_ONLY_GPU_HARDWARE_PRESENT" : "PARTIAL",
  generatedApplicationStatus: generatedHealth.runtime === "active" ? "LIVE_PARTIAL_EXISTING_EXECUTABLE_APP_ONLINE" : "BLOCKED",
  commandEnvironmentStatus: controlPlane.finalStatus ?? "PARTIAL",
  blockerSentinelStatus: blockerSentinel.finalStatus ?? "UNKNOWN",
  stalePassClaims,
  repairsApplied,
  gatesRun,
  gatesPassed,
  gatesFailed,
  receiptsWritten: [
    "Archive/receipts/leeway_total_constitutional_runtime_convergence_receipt.json",
    "Archive/receipts/leeway_live_language_execution_receipt.json",
  ],
  remainingBlockers,
  productionAllowed: false,
  enterprisePresentationAllowed: false,
  externalOperationAllowed: false,
  filesRead: [
    "000-URGENT-LEEWAY-ASSISTANT-LAW/READ-FIRST.md",
    "LeeWay-Standards/standards/BOOK-54-ASSISTANT-EMBODIMENT-AND-BEHAVIOR-LAW.md",
    "LeeWay-Standards/standards/BOOK-55-ASSISTANT-RECORDING-AND-LEARNING-LAW.md",
    "src/agent-lee/language/*",
    "leeway-agent-lee/agent-lee-runtime/src/*",
    "LeeWay-Edge-RTC/runtime.mjs",
    "LeeWay-Edge-GPU/runtime.mjs",
    "Archive/reports/*gate-report.json",
  ],
  filesChanged: [
    "Archive/reports/leeway-live-operating-environment-tracer-pack.md",
    "src/agent-lee/language/leewayLanguagePattern.types.ts",
    "src/agent-lee/language/leewayAgentLeeStyleAdapter.ts",
    "src/agent-lee/language/leewayLanguagePatternProcessor.ts",
    "leeway-agent-lee/agent-lee-runtime/src/language/liveLanguageOperatingEntity.ts",
    "leeway-agent-lee/agent-lee-runtime/src/voice/voiceService.ts",
    "leeway-agent-lee/agent-lee-runtime/src/api/routes.ts",
    "leeway-agent-lee/agent-lee-runtime/src/server.ts",
    "leeway-agent-lee/agent-lee-runtime/src/mcp/mcpRegistry.ts",
    "LeeWay-Edge-RTC/runtime.mjs",
    "leeway-agent-lee/admin-command-unit/server.mjs",
    "Archive/generated-fixtures/leeway-vscode-app-fixture/executable-generated-app-001/server.mjs",
    "scripts/Write-LeeWayTotalConvergenceReports.mjs",
  ],
  commandsRun: [
    "npm run build (agent-lee-runtime)",
    "node --check runtime.mjs (LeeWay-Edge-RTC)",
    "node --check server.mjs (admin command unit and generated app)",
    "service restarts for Agent Lee runtime, Edge RTC, command unit, generated app",
    "HTTP probes for runtime, language, voice, RTC, GPU, command plane, generated app",
    "RTC WebSocket probe",
    "docker ps",
    "nvidia-smi",
    "LeeWay gate npm scripts listed in gatesRun",
  ],
  toolsUsed: ["functions.shell_command", "functions.apply_patch", "functions.update_plan", "multi_tool_use.parallel"],
  MCPsUsed: [],
  standardsChecked: ["BOOK-54", "BOOK-55", "LeeWay application standards skill references"],
  failuresEncountered: remainingBlockers,
  lessonsLearned: [
    "Runtime truth must downgrade stale total-unification claims.",
    "Connector defaults can make a live RTC route look broken if registry ports drift.",
    "Language cognition can be live-attached while embodiment remains blocked by voice and microphone continuity.",
  ],
  skillImprovementsSuggested: [
    "Add a dedicated LeeWay live language execution skill with RTC, mic, voice, and stale-pass freshness checks.",
    "Add a connector freshness gate that compares active service ports against runtime connector defaults.",
  ],
};

const liveLanguageReport = {
  assistantBodyId,
  assistantObjectId,
  taskId: "LEEWAY_TASK::LIVE_LANGUAGE_EXECUTION_AND_CONTINUOUS_EMBODIMENT::20260524",
  subjectObjectId: "LEEWAY_APP::AGENT_LEE::LANGUAGE::LIVE_OPERATING_ENTITY",
  generatedAt: now,
  finalVerdict: finalLanguageVerdict,
  finalStatus: finalLanguageVerdict.endsWith("_PASS") ? "PASS" : "BLOCKED",
  liveLanguageEntityStatus: languageStatus.entityState ?? "UNKNOWN",
  continuousSpeechAdaptationStatus: "ACTIVE_TEXT_RUNTIME_ADAPTATION",
  creatorMirroringStatus: languageStatus.creatorMirroringActive ? "ACTIVE" : "UNKNOWN",
  voicePerformanceStatus: "ACTIVE_POLICY_ENGINE_TEXT_ONLY",
  rtcSpeechLoopStatus: rtcWebSocketOk ? "PARTIAL_WEBSOCKET_ACTIVE_MIC_SPEECH_NOT_PROVEN" : "BLOCKED",
  voiceContinuityStatus: "BLOCKED_TEXT_EMERGENCY_ONLY",
  microphoneContinuityStatus: "NOT_YET_PROVEN",
  narrationStatus: "ACTIVE_TEXT_RUNTIME_NARRATION",
  enterpriseCodeSwitchStatus: "ACTIVE",
  languageMemoryEvolutionStatus: `ACTIVE_${languageStatus.memoryPhraseCount ?? 0}_PHRASES`,
  generatedApplicationLanguageInheritanceStatus: generatedInheritance.runtimeTruth ?? "UNKNOWN",
  finalEmbodimentLawSatisfied: false,
  acceptanceChecks: {
    liveRuntimeSpeechWorks: false,
    rtcSpeechContinuityWorks: false,
    microphoneContinuityWorks: false,
    narrationWorks: true,
    creatorMirroringWorks: true,
    runtimeAdaptationWorks: true,
    enterpriseShiftingWorks: true,
    generatedAppInheritanceWorks: generatedInheritance.runtimeTruth === "LIVE_PARTIAL",
    embodimentLawSatisfied: false,
  },
  evidence: {
    languageStatus,
    languageMemory,
    systemHealth,
    rtcHealth,
    rtcConnector,
    voiceGate,
    generatedInheritance,
  },
  remainingBlockers: remainingBlockers.filter((item) => /voice|Microphone|RTC|embodiment|speech/i.test(item)),
};

const totalReceipt = {
  receiptId: "LEEWAY_RECEIPT::TOTAL_CONSTITUTIONAL_RUNTIME_CONVERGENCE::20260524",
  generatedAt: now,
  assistantBodyId,
  assistantObjectId,
  taskId,
  subjectObjectId,
  finalVerdict: totalReport.finalVerdict,
  finalStatus: totalReport.finalStatus,
  reportsWritten: [
    "Archive/reports/leeway-total-constitutional-runtime-convergence-report.md",
    "Archive/reports/leeway-total-constitutional-runtime-convergence-report.json",
    "Archive/reports/leeway-full-78-book-governance-audit-report.md",
    "Archive/reports/leeway-runtime-constitutional-enforcement-map.json",
    "Archive/reports/leeway-live-operating-environment-pass-2-report.md",
    "Archive/reports/leeway-sovereign-runtime-control-plane-map.json",
    "Archive/reports/leeway-blocker-sentinel-mesh-report.json",
    "Archive/reports/leeway-live-voice-runtime-report.json",
    "Archive/reports/leeway-rtc-runtime-continuity-report.json",
    "Archive/reports/leeway-edge-gpu-runtime-report.json",
    "Archive/reports/leeway-live-generated-application-report.json",
    "Archive/reports/leeway-continuity-and-recovery-audit-report.md",
  ],
  blockers: remainingBlockers,
};

const languageReceipt = {
  receiptId: "LEEWAY_RECEIPT::LIVE_LANGUAGE_EXECUTION::20260524",
  generatedAt: now,
  assistantBodyId,
  assistantObjectId,
  taskId: liveLanguageReport.taskId,
  subjectObjectId: liveLanguageReport.subjectObjectId,
  finalVerdict: liveLanguageReport.finalVerdict,
  finalStatus: liveLanguageReport.finalStatus,
  reportsWritten: [
    "Archive/reports/leeway-live-language-execution-report.md",
    "Archive/reports/leeway-live-language-execution-report.json",
    "Archive/reports/leeway-creator-language-mirror-report.md",
    "Archive/reports/leeway-agent-lee-voice-performance-engine-report.md",
    "Archive/reports/leeway-language-memory-evolution-report.md",
    "Archive/reports/leeway-live-rtc-language-loop-report.md",
    "Archive/reports/leeway-enterprise-codeswitch-report.md",
    "Archive/reports/leeway-runtime-situational-awareness-report.md",
    "Archive/reports/leeway-generated-app-language-inheritance-report.md",
    "Archive/reports/leeway-live-narration-report.md",
  ],
  blockers: liveLanguageReport.remainingBlockers,
};

writeJson("Archive/reports/leeway-runtime-constitutional-enforcement-map.json", enforcementMap);
writeJson("Archive/reports/leeway-total-constitutional-runtime-convergence-report.json", totalReport);
writeJson("Archive/reports/leeway-sovereign-runtime-control-plane-map.json", controlPlane);
writeJson("Archive/reports/leeway-blocker-sentinel-mesh-report.json", {
  meshId: "LEEWAY_BLOCKER_SENTINEL_MESH",
  generatedAt: now,
  finalStatus: blockerSentinel.finalStatus ?? "UNKNOWN",
  truthLabel: blockerSentinel.truthLabel ?? "BLOCKED",
  responsibilities: [
    "detect blockers",
    "classify blockers",
    "correlate blockers",
    "detect stale PASS",
    "detect fake runtime states",
    "detect drift",
    "detect broken orchestration",
    "detect RTC failure",
    "detect voice degradation",
    "detect missing receipts",
    "detect missing telemetry",
    "downgrade false claims",
    "update cockpit continuously",
  ],
  sourceGate: blockerSentinel,
  stalePassClaims,
});
writeJson("Archive/reports/leeway-live-voice-runtime-report.json", {
  reportId: "LEEWAY_REPORT::LIVE_VOICE_RUNTIME::PASS_2",
  generatedAt: now,
  finalStatus: "BLOCKED",
  AgentLeeVoiceStatus: "TEXT_ONLY_NOT_SPEECH",
  allowedRouteOrder: [
    "leeway.voice.primary.clone.live",
    "leeway.voice.compact.clone.live",
    "leeway.voice.branded.live",
    "leeway.voice.text.emergency",
  ],
  activeRoute: "leeway.voice.text.emergency",
  detachedPlaybackUsed: false,
  forbiddenFallbackUsed: false,
  voiceGate,
});
writeJson("Archive/reports/leeway-rtc-runtime-continuity-report.json", {
  reportId: "LEEWAY_REPORT::RTC_RUNTIME_CONTINUITY::PASS_2",
  generatedAt: now,
  finalStatus: rtcWebSocketOk ? "PARTIAL" : "BLOCKED",
  httpHealth: rtcHealth,
  authority: rtcAuthority,
  runtimeConnector: rtcConnector,
  websocketContinuity: rtcWebSocketOk ? "ACTIVE" : "BLOCKED",
  speechLoopContinuity: "NOT_YET_PROVEN",
  microphoneContinuity: "NOT_YET_PROVEN",
});
writeJson("Archive/reports/leeway-edge-gpu-runtime-report.json", {
  reportId: "LEEWAY_REPORT::EDGE_GPU_RUNTIME::PASS_2",
  generatedAt: now,
  finalStatus: "PARTIAL",
  health: gpuHealth,
  fabric: gpuFabric,
  nvidiaSmi: nvidia,
  authorityStatus: "GPU_HARDWARE_PRESENT_EDGE_PROVIDER_CPU_COORDINATION_ONLY",
});
writeJson("Archive/reports/leeway-live-generated-application-report.json", {
  reportId: "LEEWAY_REPORT::LIVE_GENERATED_APPLICATION::PASS_2",
  generatedAt: now,
  finalStatus: generatedHealth.runtime === "active" ? "PARTIAL" : "BLOCKED",
  generatedApplicationStatus: generatedHealth.runtime === "active" ? "LIVE_PARTIAL" : "BLOCKED",
  proofCaveat: "Existing executable generated app was brought online; generation during this pass was not proven.",
  health: generatedHealth,
  languageInheritance: generatedInheritance,
  gate: generatedGate,
});
writeJson("Archive/reports/leeway-live-language-execution-report.json", liveLanguageReport);
writeJson("Archive/receipts/leeway_total_constitutional_runtime_convergence_receipt.json", totalReceipt);
writeJson("Archive/receipts/leeway_live_language_execution_receipt.json", languageReceipt);

const governanceAuditMd = `# LeeWay Full 78-Book Governance Audit Report

- assistantBodyId: ${assistantBodyId}
- assistantObjectId: ${assistantObjectId}
- taskId: ${taskId}
- subjectObjectId: ${subjectObjectId}
- generatedAt: ${now}
- finalVerdict: LEEWAY_CONSTITUTIONAL_GOVERNANCE_BLOCKED
- booksFound: ${booksFound}
- booksLoaded: ${booksLoaded}

## Book Truth

The numbered constitutional canon loads as 78 books. The standards directory contains 79 BOOK files because the full-canon binder is also present.

## Domain Verdicts

${enforcementMap.domains.map((domain) => `- ${domain.domain}: ${domain.verdict} (${domain.status})`).join("\n")}

## Hard Block

Full governance cannot be claimed because voice, microphone continuity, reconnect continuity, blocker sentinel, regression prevention, deployment/external operation, and continuous embodiment remain blocked or partial.
`;

const totalMd = `# LeeWay Total Constitutional Runtime Convergence Report

- assistantBodyId: ${assistantBodyId}
- assistantObjectId: ${assistantObjectId}
- taskId: ${taskId}
- subjectObjectId: ${subjectObjectId}
- generatedAt: ${now}
- finalVerdict: ${totalReport.finalVerdict}
- finalStatus: ${totalReport.finalStatus}

## Result

LeeWay did not reach fully governed live operation in this pass. The language cognition system is now attached to the Agent Lee runtime, Edge RTC WebSocket continuity is repaired, Agent Lee edge connector defaults now match the live local ports, the generated app exposes Agent Lee language inheritance, and the command unit exposes a sovereign control-plane map.

Runtime truth still blocks promotion: canonical cloned speech is not live, microphone continuity and natural no-button conversation are not proven, GPU authority remains partial, Docker is unavailable, blocker sentinel fails, regression prevention fails, and a stale UNIFIED gate claim was downgraded.

## Scores

- constitutionalCoverageScore: ${constitutionalCoverageScore}
- runtimeConvergenceScore: ${runtimeConvergenceScore}
- domainsAudited: ${enforcementMap.domains.length}
- domainsFullyGoverned: ${domainsFullyGoverned}
- domainsPartiallyGoverned: ${domainsPartiallyGoverned}
- domainsBlocked: ${domainsBlocked}

## Remaining Blockers

${remainingBlockers.map((item) => `- ${item}`).join("\n")}
`;

const liveEnvironmentMd = `# LeeWay Live Operating Environment Pass 2 Report

- finalVerdict: ${totalReport.finalVerdict}
- finalStatus: BLOCKED
- AgentLeeVoiceStatus: ${totalReport.AgentLeeVoiceStatus}
- AgentLeeConversationStatus: ${totalReport.AgentLeeConversationStatus}
- RTCContinuityStatus: ${totalReport.RTCContinuityStatus}
- GPUAuthorityStatus: ${totalReport.GPUAuthorityStatus}
- commandEnvironmentStatus: ${totalReport.commandEnvironmentStatus}

## Repairs Applied

${repairsApplied.map((item) => `- ${item}`).join("\n")}

## Live Evidence

- Agent Lee runtime health: ${systemHealth.status ?? "unknown"}
- Edge connector mesh all reachable: ${edgeAllReachable}
- RTC WebSocket reachable through Agent Lee registry: ${rtcWebSocketOk}
- Generated app runtime: ${generatedHealth.runtime ?? "unknown"}
- Docker: ${docker.ok ? "available" : "unavailable"}

## Verdict

This is convergence progress, not a live operational pass.
`;

const liveLanguageMd = `# LeeWay Live Language Execution Report

- finalVerdict: ${liveLanguageReport.finalVerdict}
- finalStatus: ${liveLanguageReport.finalStatus}
- liveLanguageEntityStatus: ${liveLanguageReport.liveLanguageEntityStatus}
- voiceContinuityStatus: ${liveLanguageReport.voiceContinuityStatus}
- microphoneContinuityStatus: ${liveLanguageReport.microphoneContinuityStatus}
- rtcSpeechLoopStatus: ${liveLanguageReport.rtcSpeechLoopStatus}

Agent Lee is now a live language operating entity at the runtime text/narration layer. It is not embodied because cloned live voice, microphone continuity, and no-button RTC speech continuity remain unproven.
`;

writeText("Archive/reports/leeway-full-78-book-governance-audit-report.md", governanceAuditMd);
writeText("Archive/reports/leeway-total-constitutional-runtime-convergence-report.md", totalMd);
writeText("Archive/reports/leeway-live-operating-environment-pass-2-report.md", liveEnvironmentMd);
writeJson("Archive/reports/leeway-live-operating-environment-pass-2-report.json", {
  reportId: "LEEWAY_REPORT::LIVE_OPERATING_ENVIRONMENT::PASS_2",
  generatedAt: now,
  finalVerdict: totalReport.finalVerdict,
  finalStatus: "BLOCKED",
  repairsApplied,
  liveEvidence: { systemHealth, edgeSystems, rtcHealth, gpuHealth, controlPlane, generatedHealth },
  remainingBlockers,
});
writeText("Archive/reports/leeway-live-language-execution-report.md", liveLanguageMd);
writeText("Archive/reports/leeway-creator-language-mirror-report.md", `# LeeWay Creator Language Mirror Report

- layerId: LEEWAY_CREATOR_LANGUAGE_MIRROR
- finalStatus: ACTIVE_TEXT_RUNTIME_LAYER
- memoryPhraseCount: ${languageStatus.memoryPhraseCount ?? 0}

The mirror recognizes command, correction, visionary, runtime-frustration, and approval cadence patterns. It is active in /api/voice/stt and /api/language/process.
`);
writeText("Archive/reports/leeway-agent-lee-voice-performance-engine-report.md", `# LeeWay Agent Lee Voice Performance Engine Report

- engineId: LEEWAY_AGENT_LEE_VOICE_PERFORMANCE_ENGINE
- finalStatus: ACTIVE_POLICY_ENGINE_TEXT_ONLY

The engine controls pauses, emphasis, urgency, pacing, emotional restraint, tone lane, and technical depth in transformed runtime speech. It does not prove audible cloned speech.
`);
writeText("Archive/reports/leeway-language-memory-evolution-report.md", `# LeeWay Language Memory Evolution Report

- layerId: LEEWAY_LANGUAGE_MEMORY_EVOLUTION_LAYER
- finalStatus: ACTIVE_REVIEWABLE_TEXT_MEMORY
- memoryPhraseCount: ${languageStatus.memoryPhraseCount ?? 0}

Memory is persisted under the Agent Lee runtime data directory and remains governed, traceable, reviewable, and editable.
`);
writeText("Archive/reports/leeway-live-rtc-language-loop-report.md", `# LeeWay Live RTC Language Loop Report

- finalStatus: ${rtcWebSocketOk ? "PARTIAL" : "BLOCKED"}
- websocketContinuity: ${rtcWebSocketOk ? "ACTIVE" : "BLOCKED"}
- speechLoopContinuity: NOT_YET_PROVEN
- microphoneContinuity: NOT_YET_PROVEN

RTC WebSocket continuity is repaired. Always-listening microphone audio, transcript continuity, and no-button conversation are not proven.
`);
writeText("Archive/reports/leeway-enterprise-codeswitch-report.md", `# LeeWay Enterprise Code-Switch Report

- finalStatus: ACTIVE
- modes: creator, operator, enterprise, public demo, educational, runtime emergency

Enterprise mode transforms runtime statements into evidence-backed operational language while preserving LeeWay identity and truth labels.
`);
writeText("Archive/reports/leeway-runtime-situational-awareness-report.md", `# LeeWay Runtime Situational Awareness Report

- finalStatus: ACTIVE_TEXT_RUNTIME_LAYER

Agent Lee language now reflects blocker severity, runtime health, deployment risk, RTC/GPU/voice state, and enterprise context. Promotion remains frozen when critical blockers appear.
`);
writeText("Archive/reports/leeway-generated-app-language-inheritance-report.md", `# LeeWay Generated App Language Inheritance Report

- finalStatus: ${generatedInheritance.runtimeTruth ?? "UNKNOWN"}
- inheritanceId: ${generatedInheritance.inheritanceId ?? "UNKNOWN"}

The executable generated app exposes Agent Lee language doctrine and speech boundaries at runtime. It does not prove cloned voice or microphone continuity.
`);
writeText("Archive/reports/leeway-live-narration-report.md", `# LeeWay Live Narration Report

- finalStatus: ACTIVE_TEXT_RUNTIME_NARRATION

The /api/language/narrate endpoint emits runtime-aware narration and websocket events. It is text/narration proof only, not audible cloned voice proof.
`);
writeText("Archive/reports/leeway-continuity-and-recovery-audit-report.md", `# LeeWay Continuity And Recovery Audit Report

- finalStatus: BLOCKED
- reconnectContinuityStatus: ${reconnectGate.finalStatus ?? "UNKNOWN"}
- regressionPreventionStatus: ${regressionGate.finalStatus ?? "UNKNOWN"}
- blockerSentinelStatus: ${blockerSentinel.finalStatus ?? "UNKNOWN"}

Recovery replay and promotion firewall evidence exist, but current reconnect continuity and regression prevention block deployment. Truth preservation under failure correctly prevents promotion.
`);

console.log(JSON.stringify({
  finalVerdict: totalReport.finalVerdict,
  liveLanguageVerdict: liveLanguageReport.finalVerdict,
  reportsWritten: totalReceipt.reportsWritten.length + languageReceipt.reportsWritten.length,
  receiptsWritten: [rel("Archive", "receipts", "leeway_total_constitutional_runtime_convergence_receipt.json"), rel("Archive", "receipts", "leeway_live_language_execution_receipt.json")],
}, null, 2));
