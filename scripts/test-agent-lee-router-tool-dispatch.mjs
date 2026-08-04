/**
 * test-agent-lee-router-tool-dispatch.mjs
 *
 * Canonical Node validator for the Agent Lee router tool dispatch loop.
 *
 * Distinguishes:
 *   ROUTER_PROCESS_REACHABLE  — TCP port answers, any HTTP response
 *   ROUTER_HEALTH_READY       — /ping or /routes responds instantly (lightweight)
 *   ROUTER_HEALTH_TIMEOUT     — /health or /agent-lee/status timed out (heavy check)
 *   ROUTER_TOOL_DISPATCH_READY — /agent-lee/tools/call executed and returned a result
 *
 * Runs three dispatch proofs:
 *   A. write_receipt  — safe pipe test (no desktop interaction)
 *   B. web_search     — real browser/search desktop action
 *   C. take_screenshot — real screen capture desktop action
 *
 * Key rule: if /agent-lee/tools/call succeeds while /health times out, mark:
 *   routerHealth = ROUTER_HEALTH_TIMEOUT
 *   toolDispatch = ROUTER_TOOL_DISPATCH_READY
 * Do NOT fail the whole proof just because the heavy health check is slow.
 *
 * Usage:
 *   node scripts/test-agent-lee-router-tool-dispatch.mjs
 *
 * Classification: CANONICAL_NODE_VALIDATOR
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WORKSPACE_ROOT = path.resolve(__dirname, "..");

const ROUTER_BASE = process.env.AGENT_LEE_ROUTER_BASE || "http://127.0.0.1:8080";
const DESKTOP_BASE = process.env.AGENT_LEE_DESKTOP_RUNTIME_BASE || "http://127.0.0.1:8091";
const CONFIRM = process.env.AGENT_LEE_DESKTOP_COMMAND_CONFIRM || "I_AUTHORIZE_AGENT_LEE_DESKTOP_COMMAND";
const REPORT_PATH = path.join(WORKSPACE_ROOT, "Archive", "reports", "agent-lee-router-tool-dispatch-report.json");
const RECEIPT_PATH = path.join(WORKSPACE_ROOT, "Archive", "receipts", "agent-lee-router-tool-dispatch-receipt.json");

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix = "router-dispatch-test") {
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
    return { ok: res.ok, status: res.status, data, timedOut: false };
  } catch (err) {
    const timedOut = err.name === "AbortError";
    return { ok: false, status: 0, error: err?.message || String(err), timedOut };
  } finally {
    clearTimeout(timer);
  }
}

async function postJson(url, body, timeoutMs = 30000) {
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
    return { ok: res.ok, status: res.status, data, timedOut: false };
  } catch (err) {
    const timedOut = err.name === "AbortError";
    return { ok: false, status: 0, error: err?.message || String(err), timedOut };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Probe router process reachability and classify health state.
 * Uses /ping first (lightweight, no external calls).
 * Falls back to /routes (also synchronous).
 * Falls back to /agent-lee/status (heavy, may timeout).
 * Classifies result honestly.
 */
async function probeRouterHealth() {
  // 1. Try /ping (lightweight, introduced in this repair pass)
  const pingResult = await getJson(`${ROUTER_BASE}/ping`, 5000);
  if (pingResult.ok && pingResult.data?.pong) {
    return {
      processReachable: true,
      healthStatus: "ROUTER_HEALTH_READY",
      healthProbe: "/ping",
      httpStatus: pingResult.status,
      data: pingResult.data
    };
  }

  // 2. /ping not yet deployed (404) or router answered but no pong —
  //    try /routes which is also synchronous and has always existed.
  const routesResult = await getJson(`${ROUTER_BASE}/routes`, 5000);
  if (routesResult.ok && routesResult.data?.routes) {
    return {
      processReachable: true,
      healthStatus: "ROUTER_HEALTH_READY",
      healthProbe: "/routes",
      httpStatus: routesResult.status,
      data: routesResult.data,
      pingNote: "/ping returned " + (pingResult.timedOut ? "TIMEOUT" : `HTTP ${pingResult.status}`) + " (not yet deployed)"
    };
  }

  // 3. Both lightweight probes failed — try heavy /agent-lee/status with short timeout
  const statusResult = await getJson(`${ROUTER_BASE}/agent-lee/status`, 10000);
  if (statusResult.ok) {
    return {
      processReachable: true,
      healthStatus: "ROUTER_HEALTH_READY",
      healthProbe: "/agent-lee/status",
      httpStatus: statusResult.status,
      data: statusResult.data,
      pingNote: "Lightweight probes unavailable; fell back to /agent-lee/status"
    };
  }

  // 4. Heavy check timed out — process may still be alive (TCP answered) but health check is slow
  if (statusResult.timedOut || pingResult.status !== 0 || routesResult.status !== 0) {
    const anyTcpAnswer = pingResult.status !== 0 || routesResult.status !== 0 || statusResult.status !== 0;
    return {
      processReachable: anyTcpAnswer,
      healthStatus: statusResult.timedOut ? "ROUTER_HEALTH_TIMEOUT" : "ROUTER_HEALTH_DEGRADED",
      healthProbe: "/agent-lee/status",
      httpStatus: statusResult.status || pingResult.status || routesResult.status,
      data: statusResult.data || null,
      error: statusResult.error || "Health check failed"
    };
  }

  return {
    processReachable: false,
    healthStatus: "ROUTER_PROCESS_UNREACHABLE",
    healthProbe: "none",
    httpStatus: 0,
    error: "No router endpoint answered"
  };
}

/**
 * Dispatch one tool call through /agent-lee/tools/call and return structured result.
 */
async function dispatchTool(toolName, payload, label, timeoutMs = 60000) {
  const requestId = makeId(`dispatch-${toolName}`);
  const body = {
    toolName,
    requestId,
    confirm: CONFIRM,
    userText: `Router dispatch validator — ${label}`,
    payload
  };
  const result = await postJson(`${ROUTER_BASE}/agent-lee/tools/call`, body, timeoutMs);
  const dispatchResult = result?.data?.dispatchResult || result?.data?.toolDispatchResults?.[0] || null;
  const runtimeEndpoint = dispatchResult?.runtimeEndpoint || null;
  const receiptPath = dispatchResult?.receiptPath || result?.data?.receiptPath || null;
  const source = dispatchResult?.source || null;
  const dispatchStatus = dispatchResult?.status || (result.ok ? "READY" : (result.timedOut ? "TIMEOUT" : "CHECK_REQUIRED"));
  const dispatchOk = result.ok && (dispatchStatus === "READY");

  return {
    label,
    toolName,
    requestId,
    httpStatus: result.status,
    timedOut: result.timedOut,
    ok: dispatchOk,
    dispatchStatus,
    runtimeEndpoint,
    receiptPath,
    source,
    sourceVerified: source === "agent-lee-router",
    routerToolDispatchReady: dispatchOk && source === "agent-lee-router" && Boolean(runtimeEndpoint),
    blockers: dispatchResult?.blockers || [],
    rawDispatchResult: dispatchResult,
    rawData: result.data
  };
}

async function main() {
  const testId = makeId("router-dispatch-test");
  const startedAt = nowIso();

  console.log(`[${startedAt}] Agent Lee Router Tool Dispatch Validator`);
  console.log(`  Router:    ${ROUTER_BASE}`);
  console.log(`  Desktop:   ${DESKTOP_BASE}`);
  console.log(`  TestId:    ${testId}`);
  console.log(`  Confirm:   ${CONFIRM.slice(0, 30)}...`);
  console.log("");

  const report = {
    schema: "agent-lee-router-tool-dispatch-report-v2",
    testId,
    startedAt,
    endedAt: null,
    routerBase: ROUTER_BASE,
    desktopBase: DESKTOP_BASE,

    // Router reachability states
    routerProcessReachable: false,
    routerHealthStatus: "UNKNOWN",         // ROUTER_HEALTH_READY | ROUTER_HEALTH_TIMEOUT | ROUTER_HEALTH_DEGRADED | ROUTER_PROCESS_UNREACHABLE
    routerHealthProbe: null,

    // Desktop runtime
    desktopReachable: false,

    // Dispatch results
    proofA: null,   // write_receipt — safe pipe test
    proofB: null,   // web_search — real browser/search
    proofC: null,   // take_screenshot — real screen capture

    // Overall verdicts
    routerToRuntimeDispatchReady: false,
    desktopActionProven: false,
    verdict: "AGENT_LEE_TOOL_DISPATCH_LOOP_BLOCKED",
    blockers: []
  };

  // ─── Router health probe ────────────────────────────────────────────────────
  console.log("  [Health] Probing router health endpoints...");
  const healthProbe = await probeRouterHealth();
  report.routerProcessReachable = healthProbe.processReachable;
  report.routerHealthStatus = healthProbe.healthStatus;
  report.routerHealthProbe = healthProbe.healthProbe;
  report.routerHealthDetail = healthProbe;

  console.log(`  [Health] Status: ${healthProbe.healthStatus} via ${healthProbe.healthProbe} (http=${healthProbe.httpStatus})`);
  if (healthProbe.pingNote) console.log(`           Note: ${healthProbe.pingNote}`);

  if (!healthProbe.processReachable) {
    report.blockers.push(`Router process not reachable at ${ROUTER_BASE}: ${healthProbe.error || healthProbe.healthStatus}`);
  }

  // ─── Desktop runtime probe ─────────────────────────────────────────────────
  const desktopResult = await getJson(`${DESKTOP_BASE}/runtime/status`, 8000);
  report.desktopReachable = desktopResult.ok;
  report.desktopStatus = desktopResult.data?.hostStatus || (desktopResult.ok ? "RESPONDING" : "UNREACHABLE");
  console.log(`  [Desktop] Status: ${report.desktopStatus} (http=${desktopResult.status})`);
  if (!desktopResult.ok) report.blockers.push(`Desktop runtime not reachable: ${desktopResult.error || desktopResult.status}`);

  // ─── Proof A: write_receipt (safe pipe proof) ──────────────────────────────
  console.log("\n  [Proof A] write_receipt — safe pipe proof...");
  report.proofA = await dispatchTool("write_receipt", {
    receiptId: makeId("proof-a"),
    name: "agent-lee-router-dispatch-proof-a",
    payload: {
      source: "test-agent-lee-router-tool-dispatch.mjs",
      proof: "A",
      checkedAt: nowIso()
    }
  }, "Proof A: write_receipt", 20000);

  console.log(`  [Proof A] ok=${report.proofA.ok} status=${report.proofA.dispatchStatus} endpoint=${report.proofA.runtimeEndpoint || "(none)"}`);
  console.log(`           source=${report.proofA.source} receiptPath=${report.proofA.receiptPath || "(none)"}`);
  if (report.proofA.blockers?.length) console.log(`           blockers: ${report.proofA.blockers.join("; ")}`);

  // ─── Proof B: web_search (real browser/search action) ─────────────────────
  console.log("\n  [Proof B] web_search — real browser/desktop action...");
  report.proofB = await dispatchTool("web_search", {
    query: "Milwaukee Bucks latest trades",
    monitorIndex: 1,
    openScreenshot: false
  }, "Proof B: web_search", 120000);

  console.log(`  [Proof B] ok=${report.proofB.ok} status=${report.proofB.dispatchStatus} endpoint=${report.proofB.runtimeEndpoint || "(none)"} timedOut=${report.proofB.timedOut}`);
  console.log(`           source=${report.proofB.source} receiptPath=${report.proofB.receiptPath || "(none)"}`);
  if (report.proofB.blockers?.length) console.log(`           blockers: ${report.proofB.blockers.join("; ")}`);

  // ─── Proof C: take_screenshot (real screen capture) ───────────────────────
  console.log("\n  [Proof C] take_screenshot — real screen capture...");
  report.proofC = await dispatchTool("take_screenshot", {
    monitorIndex: 1
  }, "Proof C: take_screenshot", 60000);

  console.log(`  [Proof C] ok=${report.proofC.ok} status=${report.proofC.dispatchStatus} endpoint=${report.proofC.runtimeEndpoint || "(none)"} timedOut=${report.proofC.timedOut}`);
  console.log(`           source=${report.proofC.source} receiptPath=${report.proofC.receiptPath || "(none)"}`);
  if (report.proofC.blockers?.length) console.log(`           blockers: ${report.proofC.blockers.join("; ")}`);

  // ─── Compute overall verdict ───────────────────────────────────────────────
  // Pipe is proven if at LEAST write_receipt succeeded through router→runtime
  const pipePassed = report.proofA.routerToolDispatchReady;
  // Desktop action is proven if web_search OR take_screenshot executed (not just write_receipt)
  const desktopActionPassed = report.proofB.routerToolDispatchReady || report.proofC.routerToolDispatchReady;
  // Dispatch loop ready = pipe proven
  const dispatchLoopReady = pipePassed;

  report.routerToRuntimeDispatchReady = dispatchLoopReady;
  report.desktopActionProven = desktopActionPassed;

  // Correct health verdict — do NOT fail dispatch proof because health endpoint is slow
  if (report.routerHealthStatus === "ROUTER_HEALTH_TIMEOUT" && dispatchLoopReady) {
    report.routerHealthNote = "Router /health timed out (getOrchestrationHealth is slow) but tool dispatch succeeded — router process IS reachable.";
  }

  report.verdict = desktopActionPassed
    ? "AGENT_LEE_ROUTER_TO_RUNTIME_DISPATCH_READY"
    : dispatchLoopReady
      ? "AGENT_LEE_TOOL_DISPATCH_LOOP_PARTIAL"
      : "AGENT_LEE_TOOL_DISPATCH_LOOP_BLOCKED";

  // Collect all blockers
  if (!pipePassed) report.blockers.push(`Proof A (write_receipt) did not confirm routerToolDispatchReady: status=${report.proofA.dispatchStatus}`);
  if (!desktopActionPassed) {
    report.blockers.push(`No real desktop action (web_search or take_screenshot) confirmed READY through router dispatch.`);
    if (report.proofB.timedOut) report.blockers.push(`Proof B (web_search) timed out — desktop browser execution may be blocked or slow.`);
    if (report.proofC.timedOut) report.blockers.push(`Proof C (take_screenshot) timed out.`);
  }

  report.endedAt = nowIso();

  // ─── Write report and receipt ──────────────────────────────────────────────
  ensureDir(path.dirname(REPORT_PATH));
  ensureDir(path.dirname(RECEIPT_PATH));
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), "utf8");

  const receipt = {
    schema: "agent-lee-router-tool-dispatch-receipt-v2",
    receiptId: testId,
    testId,
    startedAt,
    endedAt: report.endedAt,
    controlSurface: "node-validator",
    adapterPort: 8787,
    routerPort: 8080,
    runtimeFabric: true,
    routerHealthStatus: report.routerHealthStatus,
    proofAok: report.proofA.ok,
    proofBok: report.proofB.ok,
    proofCok: report.proofC.ok,
    routerToRuntimeDispatchReady: report.routerToRuntimeDispatchReady,
    desktopActionProven: report.desktopActionProven,
    verdictFinal: report.verdict,
    blockers: report.blockers,
    reportPath: REPORT_PATH,
    ok: report.verdict !== "AGENT_LEE_TOOL_DISPATCH_LOOP_BLOCKED",
    source: "test-agent-lee-router-tool-dispatch.mjs"
  };
  fs.writeFileSync(RECEIPT_PATH, JSON.stringify(receipt, null, 2), "utf8");

  // ─── Summary ───────────────────────────────────────────────────────────────
  console.log("\n" + "─".repeat(60));
  console.log(`  VERDICT: ${report.verdict}`);
  console.log(`  routerHealthStatus:          ${report.routerHealthStatus}`);
  console.log(`  routerToRuntimeDispatchReady: ${report.routerToRuntimeDispatchReady}`);
  console.log(`  desktopActionProven:          ${report.desktopActionProven}`);
  console.log("");
  console.log(`  Proof A (write_receipt):      ${report.proofA.dispatchStatus} — routerDispatchReady=${report.proofA.routerToolDispatchReady}`);
  console.log(`  Proof B (web_search):         ${report.proofB.dispatchStatus} — routerDispatchReady=${report.proofB.routerToolDispatchReady}`);
  console.log(`  Proof C (take_screenshot):    ${report.proofC.dispatchStatus} — routerDispatchReady=${report.proofC.routerToolDispatchReady}`);
  if (report.blockers.length > 0) {
    console.log("\n  Blockers:");
    for (const b of report.blockers) console.log(`    - ${b}`);
  }
  if (report.routerHealthNote) console.log(`\n  Note: ${report.routerHealthNote}`);
  console.log("");
  console.log(`  Report:  ${REPORT_PATH}`);
  console.log(`  Receipt: ${RECEIPT_PATH}`);
  console.log("─".repeat(60));
  console.log("\nAgent Lee desktop control is only proven when the router dispatches tool calls to the Desktop Runtime Host and runtime receipts prove execution.");
}

main().catch((err) => {
  console.error("Validator fatal error:", err?.message || String(err));
  process.exit(1);
});
