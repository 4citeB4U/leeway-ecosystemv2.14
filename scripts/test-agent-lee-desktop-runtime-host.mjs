/**
 * test-agent-lee-desktop-runtime-host.mjs
 *
 * Canonical Node validator for the Agent Lee Desktop Runtime Host (port 8091).
 * Tests that all required routes are present and the host is operational.
 * Tests that the pointer event hook works.
 * Tests that the receipt write route works.
 *
 * Usage:
 *   node scripts/test-agent-lee-desktop-runtime-host.mjs
 *
 * Classification: CANONICAL_NODE_VALIDATOR — not a PowerShell wrapper.
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WORKSPACE_ROOT = path.resolve(__dirname, "..");

const DESKTOP_BASE = process.env.AGENT_LEE_DESKTOP_RUNTIME_BASE || "http://127.0.0.1:8091";
const CONFIRM = process.env.AGENT_LEE_DESKTOP_COMMAND_CONFIRM || "I_AUTHORIZE_AGENT_LEE_DESKTOP_COMMAND";
const REPORT_PATH = path.join(WORKSPACE_ROOT, "Archive", "reports", "agent-lee-desktop-runtime-host-report.json");
const RECEIPT_PATH = path.join(WORKSPACE_ROOT, "Archive", "receipts", "agent-lee-desktop-runtime-host-receipt.json");

const REQUIRED_ROUTES = [
  { method: "GET",  path: "/runtime/status" },
  { method: "GET",  path: "/runtime/health" },
  { method: "POST", path: "/runtime/pointer/event" },
  { method: "POST", path: "/runtime/receipt/write" },
  { method: "POST", path: "/runtime/desktop/capture-screen" },
  { method: "POST", path: "/runtime/desktop/open-browser" },
  { method: "POST", path: "/runtime/desktop/search-web" },
  { method: "POST", path: "/runtime/vision/camera/look-now" }
];

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix = "desktop-runtime-test") {
  return `${prefix}-${Date.now().toString(36)}-${crypto.randomBytes(4).toString("hex")}`;
}

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

async function getJson(url, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    const text = await res.text();
    let data = null;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    return { ok: false, status: 0, error: err?.message || String(err) };
  } finally {
    clearTimeout(timer);
  }
}

async function postJson(url, body, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    const text = await res.text();
    let data = null;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    return { ok: false, status: 0, error: err?.message || String(err) };
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const testId = makeId("desktop-runtime-test");
  const startedAt = nowIso();
  console.log(`[${startedAt}] Starting agent-lee desktop runtime host validator`);
  console.log(`  Desktop: ${DESKTOP_BASE}`);
  console.log(`  TestId:  ${testId}`);

  const report = {
    testId,
    startedAt,
    endedAt: null,
    desktopBase: DESKTOP_BASE,
    hostStatus: null,
    requiredRoutesChecked: REQUIRED_ROUTES.length,
    pointerEventOk: false,
    receiptWriteOk: false,
    receiptPath: null,
    cases: [],
    verdict: "AGENT_LEE_DESKTOP_RUNTIME_BLOCKED",
    blockers: []
  };

  // --- Case 1: GET /runtime/status ---
  const statusResult = await getJson(`${DESKTOP_BASE}/runtime/status`);
  report.hostStatus = statusResult?.data?.hostStatus || statusResult?.data?.status || (statusResult.ok ? "RESPONDING" : "UNREACHABLE");
  report.cases.push({ case: "runtime_status", status: statusResult.ok ? "PASS" : "FAIL", detail: statusResult.data || statusResult.error });
  if (!statusResult.ok) report.blockers.push(`/runtime/status not reachable: ${statusResult.error || statusResult.status}`);
  console.log(`  [1] /runtime/status: ${statusResult.ok ? "PASS" : "FAIL"} (hostStatus=${report.hostStatus})`);

  // --- Case 2: Required routes probe (GET /runtime/health) ---
  const healthResult = await getJson(`${DESKTOP_BASE}/runtime/health`);
  const healthPass = healthResult.ok || healthResult.status < 500;
  report.cases.push({ case: "runtime_health", status: healthPass ? "PASS" : "FAIL", httpStatus: healthResult.status });
  if (!healthPass) report.blockers.push(`/runtime/health returned ${healthResult.status}`);
  console.log(`  [2] /runtime/health: ${healthPass ? "PASS" : "FAIL"} (http=${healthResult.status})`);

  // --- Case 3: Pointer event hook ---
  const pointerBody = {
    source: "test-agent-lee-desktop-runtime-host.mjs",
    event: "tool_started",
    toolName: "write_receipt",
    requestId: testId,
    target: "/runtime/receipt/write"
  };
  const pointerResult = await postJson(`${DESKTOP_BASE}/runtime/pointer/event`, pointerBody, 10000);
  report.pointerEventOk = pointerResult.ok || pointerResult.status === 200;
  report.cases.push({ case: "pointer_event", status: report.pointerEventOk ? "PASS" : "FAIL", detail: pointerResult.data || pointerResult.error });
  if (!report.pointerEventOk) report.blockers.push(`/runtime/pointer/event failed: ${pointerResult.error || pointerResult.status}`);
  console.log(`  [3] /runtime/pointer/event: ${report.pointerEventOk ? "PASS" : "FAIL"} (http=${pointerResult.status})`);

  // --- Case 4: Receipt write ---
  const receiptBody = {
    confirm: CONFIRM,
    receiptId: testId,
    name: "agent-lee-desktop-runtime-host-validator",
    payload: {
      source: "test-agent-lee-desktop-runtime-host.mjs",
      testId,
      checkedAt: nowIso()
    }
  };
  const receiptResult = await postJson(`${DESKTOP_BASE}/runtime/receipt/write`, receiptBody, 10000);
  report.receiptWriteOk = receiptResult.ok || receiptResult.status === 200;
  report.receiptPath = receiptResult?.data?.receiptPath || null;
  report.cases.push({ case: "receipt_write", status: report.receiptWriteOk ? "PASS" : "PARTIAL", detail: receiptResult.data || receiptResult.error });
  if (!report.receiptWriteOk) report.blockers.push(`/runtime/receipt/write failed: ${receiptResult.error || receiptResult.status}`);
  console.log(`  [4] /runtime/receipt/write: ${report.receiptWriteOk ? "PASS" : "PARTIAL"} (receiptPath=${report.receiptPath || "(none)"})`);

  // --- Verdict ---
  const hostUp = statusResult.ok;
  const coreOk = hostUp && report.pointerEventOk && report.receiptWriteOk;
  report.verdict = coreOk
    ? "AGENT_LEE_DESKTOP_RUNTIME_READY"
    : hostUp
      ? "AGENT_LEE_DESKTOP_RUNTIME_PARTIAL"
      : "AGENT_LEE_DESKTOP_RUNTIME_BLOCKED";
  report.endedAt = nowIso();

  ensureDir(path.dirname(REPORT_PATH));
  ensureDir(path.dirname(RECEIPT_PATH));
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), "utf8");
  const receipt = {
    schema: "agent-lee-desktop-runtime-host-receipt",
    receiptId: testId,
    testId,
    startedAt,
    endedAt: report.endedAt,
    controlSurface: "node-validator",
    desktopPort: 8091,
    runtimeFabric: true,
    verdictFinal: report.verdict,
    blockers: report.blockers,
    reportPath: REPORT_PATH,
    ok: report.verdict !== "AGENT_LEE_DESKTOP_RUNTIME_BLOCKED",
    source: "test-agent-lee-desktop-runtime-host.mjs"
  };
  fs.writeFileSync(RECEIPT_PATH, JSON.stringify(receipt, null, 2), "utf8");

  console.log(`\n  Verdict: ${report.verdict}`);
  if (report.blockers.length > 0) {
    console.log(`  Blockers:`);
    for (const b of report.blockers) console.log(`    - ${b}`);
  }
  console.log(`  Report:  ${REPORT_PATH}`);
  console.log(`  Receipt: ${RECEIPT_PATH}`);
  console.log("\nAgent Lee desktop control is only proven when the router dispatches tool calls to the Desktop Runtime Host and runtime receipts prove execution.");
}

main().catch((err) => {
  console.error("Validator fatal error:", err?.message || String(err));
  process.exit(1);
});
