import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const AGENT_LEE_ROOT = path.resolve(__dirname, "..");
const WORKSPACE_ROOT = path.resolve(AGENT_LEE_ROOT, "..");
const ARCHIVE_ROOT = path.join(WORKSPACE_ROOT, "Archive");
const RECEIPT_ROOT = path.join(ARCHIVE_ROOT, "receipts", "agent-lee-research");
const RESEARCH_ROOT = path.join(__dirname, "research");
const RESEARCH_SESSION_DIR = path.join(RESEARCH_ROOT, "sessions");
const RESEARCH_STATE_PATH = path.join(RESEARCH_ROOT, "research-state.json");
const RESEARCH_MANIFEST_PATH = path.join(__dirname, "agent-lee-research-harness.manifest.json");
const EVIDENCE_LEDGER_SCHEMA_PATH = path.join(__dirname, "agent-lee-evidence-ledger.schema.json");
const DESKTOP_RUNTIME_URL = "http://127.0.0.1:8091";
const VS_CODE_CHAT_ENDPOINT = "http://127.0.0.1:8787/v1/chat/completions";
const CANONICAL_FINGERPRINT = "leeway.agent-lee.code-mode.canonical.supreme-agent-lead.v1";

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function nowIso() {
  return new Date().toISOString();
}

function uniqueId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${crypto.randomBytes(4).toString("hex")}`;
}

function readJson(filePath, fallback = null) {
  if (!fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, payload) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf8");
  return payload;
}

function compactPath(filePath) {
  return path.relative(WORKSPACE_ROOT, filePath).replace(/\\/g, "/");
}

function loadState() {
  const existing = readJson(RESEARCH_STATE_PATH, null);
  if (existing) return existing;
  const seeded = {
    researchSessions: {},
    updatedAt: nowIso()
  };
  writeJson(RESEARCH_STATE_PATH, seeded);
  return seeded;
}

function saveState(state) {
  const payload = {
    ...state,
    updatedAt: nowIso()
  };
  return writeJson(RESEARCH_STATE_PATH, payload);
}

function sessionPath(researchId) {
  return path.join(RESEARCH_SESSION_DIR, `${researchId}.json`);
}

function loadSession(researchId) {
  if (!researchId) return null;
  const fromDisk = readJson(sessionPath(researchId), null);
  if (fromDisk) return fromDisk;
  const state = loadState();
  return state.researchSessions?.[researchId] || null;
}

function saveSession(session) {
  if (!session?.researchId) {
    throw new Error("Research session is missing researchId.");
  }
  ensureDir(RESEARCH_SESSION_DIR);
  const payload = {
    ...session,
    updatedAt: nowIso()
  };
  writeJson(sessionPath(session.researchId), payload);
  const state = loadState();
  state.researchSessions = state.researchSessions || {};
  state.researchSessions[session.researchId] = payload;
  saveState(state);
  return payload;
}

function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function evidenceId(prefix = "evidence") {
  return uniqueId(prefix);
}

const SOURCE_TYPE_SCORES = {
  official_doc: 96,
  standards: 98,
  source_code: 94,
  project_readme: 88,
  documentation: 90,
  research_paper: 93,
  reputable_secondary: 72,
  browser_search: 64,
  local_receipt: 91,
  local_manifest: 90,
  local_doc: 84,
  community: 42,
  seo_filler: 16,
  duplicate: 18,
  stale: 28,
  unverifiable: 20
};

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
}

function sourceQualityScore(sourceType, hints = {}) {
  const base = SOURCE_TYPE_SCORES[String(sourceType || "documentation").toLowerCase()] ?? 60;
  const freshnessScore = clampScore(hints.freshnessScore ?? 72);
  const relevanceScore = clampScore(hints.relevanceScore ?? 72);
  const authorityBoost = hints.authorityBoost ? clampScore(hints.authorityBoost) : 0;
  return clampScore((base * 0.5) + (freshnessScore * 0.25) + (relevanceScore * 0.25) + authorityBoost);
}

function createEvidenceItem(input = {}) {
  const sourceType = String(input.sourceType || "documentation").trim();
  const freshnessScore = clampScore(input.freshnessScore ?? (sourceType === "browser_search" ? 66 : 78));
  const relevanceScore = clampScore(input.relevanceScore ?? 80);
  const qualityScore = sourceQualityScore(sourceType, {
    freshnessScore,
    relevanceScore,
    authorityBoost: input.authorityBoost || 0
  });
  return {
    id: String(input.id || evidenceId("evidence")),
    source: String(input.source || input.url || input.localPath || "unknown-source"),
    title: String(input.title || input.source || "Untitled source"),
    url: input.url ? String(input.url) : undefined,
    localPath: input.localPath ? String(input.localPath) : undefined,
    sourceType,
    status: String(input.status || "candidate"),
    qualityScore,
    relevanceScore,
    freshnessScore,
    keyEvidence: String(input.keyEvidence || input.summary || input.notes || ""),
    supports: Array.isArray(input.supports) ? input.supports : (input.supports ? [String(input.supports)] : []),
    confidence: String(input.confidence || (qualityScore >= 85 ? "high" : qualityScore >= 60 ? "medium" : "low")),
    notes: String(input.notes || ""),
    capturedAt: input.capturedAt || nowIso()
  };
}

function createClaimCheck(input = {}) {
  return {
    id: String(input.id || evidenceId("claim")),
    claim: String(input.claim || ""),
    claimType: String(input.claimType || "current fact"),
    evidenceIds: Array.isArray(input.evidenceIds) ? input.evidenceIds : [],
    counterevidence: String(input.counterevidence || input.counterEvidence || ""),
    freshnessRequirement: String(input.freshnessRequirement || "medium"),
    result: String(input.result || "needs-review"),
    confidence: String(input.confidence || "medium"),
    finalWording: String(input.finalWording || input.finalWording || ""),
    notes: String(input.notes || ""),
    checkedAt: input.checkedAt || nowIso()
  };
}

function ensureSessionShape(session) {
  return {
    researchId: session.researchId,
    objective: session.objective || "",
    query: session.query || "",
    entrySurface: session.entrySurface || "vscode-chat",
    adapterEndpoint: session.adapterEndpoint || VS_CODE_CHAT_ENDPOINT,
    canonicalFingerprint: session.canonicalFingerprint || CANONICAL_FINGERPRINT,
    sourceMap: Array.isArray(session.sourceMap) ? session.sourceMap : [],
    candidateEvidence: Array.isArray(session.candidateEvidence) ? session.candidateEvidence : [],
    curatedEvidence: Array.isArray(session.curatedEvidence) ? session.curatedEvidence : [],
    rejectedEvidence: Array.isArray(session.rejectedEvidence) ? session.rejectedEvidence : [],
    claimChecks: Array.isArray(session.claimChecks) ? session.claimChecks : [],
    openGaps: Array.isArray(session.openGaps) ? session.openGaps : [],
    buildDecisions: Array.isArray(session.buildDecisions) ? session.buildDecisions : [],
    receipts: Array.isArray(session.receipts) ? session.receipts : [],
    browser: session.browser || {
      opened: false,
      query: "",
      searchEngine: "desktop-runtime-web-search",
      candidateLinks: [],
      pagesInspected: [],
      screenshots: [],
      runRoot: null
    },
    status: session.status || "ACTIVE",
    createdAt: session.createdAt || nowIso(),
    updatedAt: nowIso()
  };
}

export function getResearchManifest() {
  return readJson(RESEARCH_MANIFEST_PATH, null);
}

export function getEvidenceLedgerSchema() {
  return readJson(EVIDENCE_LEDGER_SCHEMA_PATH, null);
}

export function getResearchHealth() {
  const state = loadState();
  const sessions = Object.values(state.researchSessions || {});
  return {
    ok: true,
    canonicalFingerprint: CANONICAL_FINGERPRINT,
    manifestPath: compactPath(RESEARCH_MANIFEST_PATH),
    evidenceLedgerSchemaPath: compactPath(EVIDENCE_LEDGER_SCHEMA_PATH),
    researchRoot: compactPath(RESEARCH_ROOT),
    sessionDir: compactPath(RESEARCH_SESSION_DIR),
    receiptDir: compactPath(RECEIPT_ROOT),
    sessionCount: sessions.length,
    activeSessions: sessions.filter((session) => session.status === "ACTIVE").length,
    browserRuntime: {
      available: true,
      endpoint: DESKTOP_RUNTIME_URL,
      searchSurface: `${DESKTOP_RUNTIME_URL}/runtime/web-search`
    },
    entrySurfaceRequirement: "vscode-chat",
    endpointPaths: [
      "GET /agent-lee/research/health",
      "POST /agent-lee/research/start",
      "POST /agent-lee/research/search",
      "POST /agent-lee/research/inspect",
      "POST /agent-lee/research/curate",
      "POST /agent-lee/research/claim-check",
      "GET /agent-lee/research/:id",
      "GET /agent-lee/research/:id/evidence",
      "POST /agent-lee/research/:id/receipt"
    ]
  };
}

export function startResearchSession(input = {}) {
  const researchId = String(input.researchId || uniqueId("research")).trim();
  const session = ensureSessionShape({
    researchId,
    objective: normalizeText(input.objective || input.query || ""),
    query: normalizeText(input.query || input.objective || ""),
    entrySurface: String(input.entrySurface || "vscode-chat"),
    adapterEndpoint: String(input.adapterEndpoint || VS_CODE_CHAT_ENDPOINT),
    canonicalFingerprint: CANONICAL_FINGERPRINT,
    sourceMap: Array.isArray(input.sourceMap) ? input.sourceMap : [],
    candidateEvidence: [],
    curatedEvidence: [],
    rejectedEvidence: [],
    claimChecks: [],
    openGaps: Array.isArray(input.openGaps) ? input.openGaps : [],
    buildDecisions: Array.isArray(input.buildDecisions) ? input.buildDecisions : [],
    receipts: [],
    browser: {
      opened: false,
      query: normalizeText(input.query || input.objective || ""),
      searchEngine: "desktop-runtime-web-search",
      candidateLinks: [],
      pagesInspected: [],
      screenshots: [],
      runRoot: null
    },
    status: "ACTIVE",
    createdAt: nowIso(),
    updatedAt: nowIso()
  });
  saveSession(session);
  return session;
}

async function callBrowserSearch(query) {
  const response = await fetch(`${DESKTOP_RUNTIME_URL}/runtime/web-search`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      confirm: "I_AUTHORIZE_AGENT_LEE_DESKTOP_COMMAND",
      query,
      source: "Agent Lee stateful research harness",
      narrate: false,
      slowMode: false,
      openScreenshot: true
    })
  });

  const raw = await response.text();
  let data = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = raw;
  }

  return {
    ok: response.ok,
    status: response.status,
    data,
    raw
  };
}

function buildBrowserEvidence(query, browserResult) {
  const runRoot = browserResult?.data?.runRoot || browserResult?.data?.run_root || null;
  const screenshot = browserResult?.data?.screenshot || browserResult?.data?.screenshotPath || null;
  const title = browserResult?.data?.title || `Browser search evidence for ${query}`;
  const url = browserResult?.data?.url || "";

  return createEvidenceItem({
    source: "desktop runtime browser search",
    title,
    url: url || undefined,
    localPath: runRoot || undefined,
    sourceType: "browser_search",
    status: browserResult.ok ? "candidate" : "needs-check",
    relevanceScore: 78,
    freshnessScore: 72,
    keyEvidence: browserResult.ok
      ? `Browser search executed for query: ${query}`
      : `Browser search failed for query: ${query}`,
    supports: [query],
    confidence: browserResult.ok ? "medium" : "low",
    notes: screenshot ? `Screenshot captured at ${screenshot}` : "No screenshot captured."
  });
}

export async function researchSearch(input = {}) {
  const researchId = String(input.researchId || "").trim();
  const query = normalizeText(input.query || input.objective || input.search || "");
  if (!researchId) {
    throw new Error("Missing researchId.");
  }
  const session = loadSession(researchId);
  if (!session) {
    throw new Error(`Research session not found: ${researchId}`);
  }

  const browserResult = await callBrowserSearch(query || session.query || session.objective || "Agent Lee research");
  const candidate = buildBrowserEvidence(query || session.query || session.objective || "Agent Lee research", browserResult);

  session.browser = {
    opened: true,
    query: query || session.query || session.objective || "",
    searchEngine: "desktop-runtime-web-search",
    candidateLinks: browserResult?.data?.links || browserResult?.data?.candidateLinks || [],
    pagesInspected: browserResult?.data?.pagesInspected || browserResult?.data?.pages || [],
    screenshots: browserResult?.data?.screenshot ? [browserResult.data.screenshot] : [],
    runRoot: browserResult?.data?.runRoot || browserResult?.data?.run_root || null
  };
  session.sourceMap.push(candidate);
  session.candidateEvidence.push(candidate);
  session.buildDecisions.push({
    id: evidenceId("decision"),
    kind: "search",
    decision: browserResult.ok ? "keep" : "defer",
    reason: browserResult.ok ? "browser research surfaced candidate evidence" : "browser research backend returned a non-success response",
    query,
    at: nowIso()
  });
  session.receipts.push({
    kind: "browser-search",
    ok: browserResult.ok,
    query,
    runRoot: browserResult?.data?.runRoot || null,
    screenshot: browserResult?.data?.screenshot || null,
    at: nowIso()
  });

  saveSession(session);

  return {
    ok: browserResult.ok,
    researchId,
    browserOpened: Boolean(browserResult.ok),
    browserSearch: browserResult,
    candidateEvidence: candidate,
    session: summarizeSession(session)
  };
}

export function researchInspect(input = {}) {
  const researchId = String(input.researchId || "").trim();
  const session = loadSession(researchId);
  if (!session) throw new Error(`Research session not found: ${researchId}`);

  const evidence = createEvidenceItem({
    ...input,
    sourceType: input.sourceType || "documentation",
    status: input.status || "candidate",
    source: input.source || input.title || input.url || input.localPath || "manual-inspection",
    keyEvidence: input.keyEvidence || input.notes || "Inspection recorded.",
    supports: input.supports || []
  });

  const targetBucket = evidence.status === "rejected" || evidence.qualityScore < 45 ? "rejectedEvidence" : "candidateEvidence";
  session[targetBucket].push(evidence);
  session.sourceMap.push(evidence);
  session.receipts.push({
    kind: "inspect",
    evidenceId: evidence.id,
    status: evidence.status,
    qualityScore: evidence.qualityScore,
    at: nowIso()
  });
  saveSession(session);
  return {
    ok: true,
    researchId,
    evidence,
    session: summarizeSession(session)
  };
}

export function researchCurate(input = {}) {
  const researchId = String(input.researchId || "").trim();
  const session = loadSession(researchId);
  if (!session) throw new Error(`Research session not found: ${researchId}`);

  const evidenceIdValue = String(input.evidenceId || input.id || "").trim();
  const source = [...session.candidateEvidence, ...session.rejectedEvidence, ...session.curatedEvidence]
    .find((entry) => entry.id === evidenceIdValue);

  if (!source) {
    throw new Error(`Evidence not found: ${evidenceIdValue}`);
  }

  const curated = {
    ...source,
    status: "curated",
    confidence: input.confidence || source.confidence || (source.qualityScore >= 85 ? "high" : "medium"),
    notes: normalizeText([source.notes, input.notes].filter(Boolean).join(" | "))
  };

  session.candidateEvidence = session.candidateEvidence.filter((entry) => entry.id !== evidenceIdValue);
  session.rejectedEvidence = session.rejectedEvidence.filter((entry) => entry.id !== evidenceIdValue);
  session.curatedEvidence = session.curatedEvidence.filter((entry) => entry.id !== evidenceIdValue);
  session.curatedEvidence.push(curated);
  session.receipts.push({
    kind: "curate",
    evidenceId: curated.id,
    at: nowIso()
  });
  session.buildDecisions.push({
    id: evidenceId("decision"),
    kind: "curation",
    decision: "curated",
    reason: normalizeText(input.reason || "Evidence curated after inspection."),
    evidenceId: curated.id,
    at: nowIso()
  });
  saveSession(session);
  return {
    ok: true,
    researchId,
    evidence: curated,
    session: summarizeSession(session)
  };
}

export function researchClaimCheck(input = {}) {
  const researchId = String(input.researchId || "").trim();
  const session = loadSession(researchId);
  if (!session) throw new Error(`Research session not found: ${researchId}`);

  const check = createClaimCheck(input);
  const evidenceIds = Array.isArray(check.evidenceIds) ? check.evidenceIds : [];
  const supportingEvidence = [...session.candidateEvidence, ...session.curatedEvidence, ...session.rejectedEvidence]
    .filter((entry) => evidenceIds.includes(entry.id));

  check.result = check.result || (supportingEvidence.some((entry) => entry.status === "curated") ? "supported" : "needs-review");
  check.confidence = check.confidence || (supportingEvidence.some((entry) => entry.qualityScore >= 85) ? "high" : "medium");
  session.claimChecks.push(check);
  session.receipts.push({
    kind: "claim-check",
    claimCheckId: check.id,
    at: nowIso()
  });
  session.openGaps = Array.isArray(session.openGaps) ? session.openGaps : [];
  if (check.result !== "supported") {
    session.openGaps.push({
      id: evidenceId("gap"),
      claim: check.claim,
      reason: `Claim check ended as ${check.result}.`,
      at: nowIso()
    });
  }
  saveSession(session);
  return {
    ok: true,
    researchId,
    claimCheck: check,
    session: summarizeSession(session)
  };
}

export function researchReceipt(input = {}) {
  const researchId = String(input.researchId || "").trim();
  const session = loadSession(researchId);
  if (!session) throw new Error(`Research session not found: ${researchId}`);

  const receipt = {
    researchId,
    objective: session.objective,
    query: session.query,
    entrySurface: session.entrySurface,
    adapterEndpoint: session.adapterEndpoint,
    canonicalFingerprint: session.canonicalFingerprint,
    browser: session.browser,
    candidateEvidenceCount: session.candidateEvidence.length,
    curatedEvidenceCount: session.curatedEvidence.length,
    rejectedEvidenceCount: session.rejectedEvidence.length,
    claimCheckCount: session.claimChecks.length,
    openGapCount: session.openGaps.length,
    buildDecisions: session.buildDecisions,
    sourceMap: session.sourceMap,
    candidateEvidence: session.candidateEvidence,
    curatedEvidence: session.curatedEvidence,
    rejectedEvidence: session.rejectedEvidence,
    claimChecks: session.claimChecks,
    receipts: session.receipts,
    createdAt: session.createdAt,
    updatedAt: nowIso(),
    ...input.extra
  };

  ensureDir(RECEIPT_ROOT);
  const receiptPath = path.join(RECEIPT_ROOT, `${researchId}-${Date.now().toString(36)}.json`);
  writeJson(receiptPath, {
    ...receipt,
    receiptPath
  });
  session.receipts.push({
    kind: "receipt",
    receiptPath: compactPath(receiptPath),
    at: nowIso()
  });
  saveSession(session);
  return {
    ok: true,
    receiptPath: compactPath(receiptPath),
    receipt
  };
}

export function getResearchSession(researchId) {
  return loadSession(researchId);
}

export function getResearchEvidence(researchId) {
  const session = loadSession(researchId);
  if (!session) return null;
  return {
    researchId,
    sourceMap: session.sourceMap,
    candidateEvidence: session.candidateEvidence,
    curatedEvidence: session.curatedEvidence,
    rejectedEvidence: session.rejectedEvidence,
    claimChecks: session.claimChecks,
    openGaps: session.openGaps,
    buildDecisions: session.buildDecisions,
    receipts: session.receipts
  };
}

export function summarizeSession(session) {
  if (!session) return null;
  return {
    researchId: session.researchId,
    objective: session.objective,
    query: session.query,
    entrySurface: session.entrySurface,
    adapterEndpoint: session.adapterEndpoint,
    canonicalFingerprint: session.canonicalFingerprint,
    status: session.status,
    candidateEvidenceCount: session.candidateEvidence?.length || 0,
    curatedEvidenceCount: session.curatedEvidence?.length || 0,
    rejectedEvidenceCount: session.rejectedEvidence?.length || 0,
    claimCheckCount: session.claimChecks?.length || 0,
    openGapCount: session.openGaps?.length || 0,
    receiptCount: session.receipts?.length || 0,
    browserOpened: Boolean(session.browser?.opened),
    browserRunRoot: session.browser?.runRoot || null,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt
  };
}

export function getResearchQualityCriteria() {
  return {
    canonicalFingerprint: CANONICAL_FINGERPRINT,
    preferredSources: [
      "official docs",
      "source code",
      "project READMEs",
      "standards/specs",
      "high-quality references",
      "direct evidence"
    ],
    rejectedSources: [
      "irrelevant content",
      "obvious SEO filler",
      "stale docs when newer docs exist",
      "unverifiable claims",
      "duplicate thin summaries"
    ],
    sourceTypeScores: SOURCE_TYPE_SCORES
  };
}

export function applyEvidenceToBuild(input = {}) {
  const researchId = String(input.researchId || "").trim();
  const session = loadSession(researchId);
  if (!session) throw new Error(`Research session not found: ${researchId}`);

  const decision = {
    id: evidenceId("build"),
    researchId,
    buildTarget: String(input.buildTarget || input.target || "unknown"),
    decision: String(input.decision || "apply"),
    evidenceIds: Array.isArray(input.evidenceIds) ? input.evidenceIds : [],
    reason: String(input.reason || input.notes || ""),
    at: nowIso()
  };
  session.buildDecisions.push(decision);
  session.receipts.push({
    kind: "build-decision",
    decisionId: decision.id,
    at: nowIso()
  });
  saveSession(session);
  return {
    ok: true,
    researchId,
    decision,
    session: summarizeSession(session)
  };
}

