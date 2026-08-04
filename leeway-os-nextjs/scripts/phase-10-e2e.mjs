/**
 * MIG-008B Phase 10 — End-to-end proof (authoritative network + receipt + ledger):
 * UI (3001, ?corr=...) -> BFF /api/leeway/request -> kernel 4002 /requests ->
 * proof gate -> receipt (correlationId) -> ledger entry -> Evidence Center UI.
 * Origin: DIAGNOSTIC_OPENCODE_CLI_NOT_OFFICIAL.
 */
import { chromium } from "playwright-core";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const BASE = "http://127.0.0.1:3001";
const CHROME = "C:\\Users\\Leona\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe";
const LEDGER = "D:\\Leeway-Ecosystem v2.1.4\\Leeway Runtime Fabric\\ledger\\chain\\ledger-chain.jsonl";
const RECEIPT_DIR = "D:\\Leeway-Ecosystem v2.1.4\\Leeway Runtime Fabric\\runtime-kernel\\data\\receipts";
const EVIDENCE_ROOT = "D:\\Leeway-Ecosystem v2.1.4\\LeeWay-Enterprise-Transit-Hub\\_evidence\\MIG-008B-P0-LeeWay-OS-Live-Embodiment-20260801-181012";

const ledgerLines = () => fs.readFileSync(LEDGER, "utf8").split("\n").filter((l) => l.trim().length > 0);

(async () => {
  const corr = "mig008b-e2e-" + Date.now() + "-" + crypto.randomBytes(3).toString("hex");
  const note = "Phase 10 E2E trace " + new Date().toISOString();
  const startedAt = new Date().toISOString();
  const before = ledgerLines();
  console.log("LEDGER_BEFORE:", before.length, "| corr:", corr);

  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const consoleErrors = [];
  page.on("pageerror", (e) => consoleErrors.push(e.message.slice(0, 200)));
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text().slice(0, 200)); });

  let bffPostResponse = null;
  page.on("response", (r) => {
    if (r.url().includes("/api/leeway/request") && r.request().method() === "POST") {
      r.json().then((j) => { bffPostResponse = { status: r.status(), envelope: j }; }).catch(() => {});
    }
  });

  // Step 1: open interaction screen with correlation marker
  await page.goto(BASE + "/s/agent_lee_interaction?corr=" + corr, { waitUntil: "domcontentloaded", timeout: 25000 });
  await page.waitForTimeout(3500);
  const panelVisible = await page.evaluate(() => document.body.innerText.includes("LIVE: Kernel Request"));
  console.log("STEP1 panel_visible:", panelVisible);

  // Step 2: fill note + click Send (real UI interaction)
  await page.fill("input[placeholder='note (optional)']", note);
  await page.click("button:has-text('Send request')");
  await page.waitForTimeout(9000);
  const bffEnvelope = bffPostResponse?.envelope;
  const requestId = bffEnvelope?.data?.request?.requestId || null;
  const state = bffEnvelope?.data?.request?.state || null;
  const receiptId = bffEnvelope?.data?.request?.receiptId || null;
  const corrReturned = bffEnvelope?.correlationId || null;
  const bffOk = bffEnvelope?.status === "ok" && bffEnvelope?.data?.ok === true;
  console.log("STEP2 bff_envelope_status:", bffPostResponse?.status, "| state:", state, "| receipt:", receiptId, "| corr_match:", corrReturned === corr);

  // Step 3: kernel receipt file exists and carries the same correlationId
  let receipt = null;
  let receiptPath = null;
  if (receiptId) {
    const f = path.join(RECEIPT_DIR, receiptId + ".json");
    if (fs.existsSync(f)) {
      receipt = JSON.parse(fs.readFileSync(f, "utf8"));
      receiptPath = f;
    }
  }
  const receiptCorrMatch = receipt ? receipt.correlationId === corr : false;
  console.log("STEP3 receipt_corr_match:", receiptCorrMatch, "| proofLevel:", receipt?.proofLevel, "| status:", receipt?.status);

  // Step 4: ledger contains the request entry (full scan)
  await page.waitForTimeout(1500);
  const after = ledgerLines();
  const entryHits = after.filter((l) => l.includes(requestId));
  const ledgerEntry = entryHits.map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean)[0] || null;
  console.log("STEP4 ledger_growth:", before.length, "->", after.length, "| request_entry_hits:", entryHits.length);

  // Step 5: Evidence Center UI shows the new receipt
  await page.goto(BASE + "/s/evidence_center", { waitUntil: "domcontentloaded", timeout: 25000 });
  await page.waitForTimeout(7000);
  const evText = await page.evaluate(() => document.body.innerText);
  const evidencePanel = evText.includes("LIVE: Kernel Evidence");
  const evidenceShowsRequest = receiptId ? evText.includes(receiptId) || evText.includes(requestId) : false;
  const receiptCountLine = (evText.match(/\d+ receipts/) || [null])[0];
  console.log("STEP5 evidence_panel:", evidencePanel, "| shows_request:", evidenceShowsRequest, "| count:", receiptCountLine);

  await browser.close();
  const endedAt = new Date().toISOString();

  const pass = panelVisible && bffOk && state === "COMPLETED" && !!receiptId && receiptCorrMatch && receipt?.status === "COMPLETED" && entryHits.length > 0 && evidencePanel && evidenceShowsRequest;

  const trace = {
    schema: "leeway-e2e-trace.v1",
    correlationId: corr,
    startedAt, endedAt,
    controlPath: "UI(3001 /s/agent_lee_interaction?corr=) -> BFF POST /api/leeway/request -> kernel 4002 /requests -> proof gate -> receipt -> ledger -> Evidence Center",
    steps: {
      step1_panelVisible: panelVisible,
      step2_bffEnvelope: bffOk ? { status: bffPostResponse.status, envelopeStatus: bffEnvelope.status, proofClassification: bffEnvelope.proofClassification, requestId, state, receiptId, corrReturned, corrMatch: corrReturned === corr, degradedReasons: bffEnvelope.degradedReasons } : { status: bffPostResponse?.status, envelope: bffEnvelope },
      step3_receipt: receipt ? { path: receiptPath, correlationId: receipt.correlationId, corrMatch: receiptCorrMatch, capabilityId: receipt.capabilityId, proofLevel: receipt.proofLevel, status: receipt.status, outputHash: receipt.outputHash } : { found: false },
      step4_ledger: { before: before.length, after: after.length, growth: after.length - before.length, requestEntryHits: entryHits.length, ledgerEntry: ledgerEntry ? { type: ledgerEntry.entry?.type, requestId: ledgerEntry.entry?.requestId, receiptId: ledgerEntry.entry?.receiptId, outputHash: ledgerEntry.entry?.outputHash } : null },
      step5_evidenceUi: { panel: evidencePanel, showsRequest: evidenceShowsRequest, receiptCountLine }
    },
    consoleErrors,
    status: pass ? "PASS" : "PARTIAL",
    proofLevel: "PROOF_LEVEL_5_END_TO_END_PROOF",
    origin: "DIAGNOSTIC_OPENCODE_CLI_NOT_OFFICIAL"
  };
  fs.writeFileSync(EVIDENCE_ROOT + "/LEEWAY-OS-END-TO-END-TRACE.json", JSON.stringify(trace, null, 2), "utf8");

  const receiptDoc = {
    schema: "leeway-proof-backed-receipt.v1",
    receiptId: "leeway-os-e2e-proof-" + new Date().toISOString().replace(/[-:]/g, "").replace(/\..*/, "").replace("T", "-"),
    status: pass ? "ok" : "partial",
    startedAt, endedAt,
    controlSurface: "opencode_cli_terminal",
    adapterPort: 0, routerPort: 0, runtimeFabric: false, desktopRuntimePort: 0,
    agentIdentity: "agent-lee-code-mode",
    correlationId: corr,
    caseResults: { total: 6, passed: [panelVisible, bffOk, state === "COMPLETED", receiptCorrMatch, entryHits.length > 0, evidencePanel && evidenceShowsRequest].filter(Boolean).length },
    artifactPaths: ["LEEWAY-OS-END-TO-END-TRACE.json"],
    ok: pass
  };
  fs.writeFileSync(EVIDENCE_ROOT + "/phase-10-receipt.json", JSON.stringify(receiptDoc, null, 2), "utf8");
  console.log("\nE2E status:", pass ? "PASS" : "PARTIAL");
})();
