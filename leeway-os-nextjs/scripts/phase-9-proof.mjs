/**
 * MIG-008B Phase 9 — Playwright live-proof of the LeeWay OS on 3001.
 * Opens desktop + mobile viewports across core routes, captures console/
 * network/HTTP errors, asserts no blank page / no ERR_CONNECTION_REFUSED,
 * verifies live kernel panels are mounted, and writes evidence artifacts.
 * Origin: DIAGNOSTIC_OPENCODE_CLI_NOT_OFFICIAL (receipt rule).
 */
import { chromium } from "playwright-core";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const BASE = "http://127.0.0.1:3001";
const CHROME = "C:\\Users\\Leona\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe";
const EVIDENCE_ROOT = "D:\\Leeway-Ecosystem v2.1.4\\LeeWay-Enterprise-Transit-Hub\\_evidence\\MIG-008B-P0-LeeWay-OS-Live-Embodiment-20260801-181012";
const SHOT_DIR = path.join(EVIDENCE_ROOT, "phase-09-screenshots");

const ROUTES = [
  { path: "/", name: "root-welcome", desktop: true, mobile: true },
  { path: "/s/welcome_to_leeway", name: "welcome", desktop: true, mobile: false },
  { path: "/s/leeway_os_desktop_1", name: "os-desktop", desktop: true, mobile: true },
  { path: "/s/evidence_center", name: "evidence-center", desktop: true, mobile: true },
  { path: "/s/agent_lee_interaction", name: "agent-interaction", desktop: true, mobile: false },
  { path: "/s/control_center", name: "control-center", desktop: true, mobile: false },
  { path: "/s/sign_in_or_create_id", name: "sign-in", desktop: true, mobile: false },
  { path: "/s/leeway_os_mobile_desktop", name: "os-mobile-concept", desktop: false, mobile: true },
  { path: "/s/leeway_home_1", name: "home-1", desktop: true, mobile: false },
  { path: "/s/workspaces", name: "workspaces", desktop: true, mobile: false },
  { path: "/s/leeway_marketplace_1", name: "marketplace", desktop: true, mobile: false },
  { path: "/s/leeway_files", name: "files", desktop: true, mobile: false },
  { path: "/s/communications", name: "communications", desktop: true, mobile: false },
  { path: "/s/leeway_os_unified_shell", name: "unified-shell", desktop: true, mobile: false },
  { path: "/s/device_center", name: "device-center", desktop: true, mobile: false },
  { path: "/s/github_import_tool", name: "github-import", desktop: true, mobile: false }
];

function sha256(s) {
  return crypto.createHash("sha256").update(s).digest("hex").toUpperCase();
}

(async () => {
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const startedAt = new Date().toISOString();
  const cases = [];
  let failures = 0;

  for (const route of ROUTES) {
    for (const vp of [{ label: "desktop", width: 1440, height: 900 }, { label: "mobile", width: 390, height: 844 }]) {
      if (!route[vp.label]) continue;
      const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
      const consoleErrors = [];
      const requestFailures = [];
      const httpErrors = [];
      const pageErrors = [];
      page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text().slice(0, 300)); });
      page.on("requestfailed", (r) => requestFailures.push(r.url() + " :: " + (r.failure()?.errorText || "?")));
      page.on("response", (r) => { if (r.status() >= 400) httpErrors.push(r.status() + " " + r.url().replace(BASE, "")); });
      page.on("pageerror", (e) => pageErrors.push(e.message.slice(0, 300)));

      const started = Date.now();
      let navStatus = "ok";
      let dom = null;
      try {
        await page.goto(BASE + route.path, { waitUntil: "domcontentloaded", timeout: 25000 });
        await page.waitForTimeout(3000);
        dom = await page.evaluate(() => {
          const visible = [...document.querySelectorAll("body *")].filter((el) => {
            const r = el.getBoundingClientRect();
            const st = getComputedStyle(el);
            return r.width > 0 && r.height > 0 && st.visibility !== "hidden" && st.display !== "none";
          });
          return {
            bodyLen: document.body.innerHTML.length,
            visibleCount: visible.length,
            title: document.title,
            h1: document.querySelector("h1, h2")?.textContent?.trim().slice(0, 60) || null,
            text: document.body.innerText || ""
          };
        });
      } catch (e) {
        navStatus = "FAILED: " + String(e).split("\n")[0];
      }
      const ms = Date.now() - started;

      const livePanel = dom?.text?.includes("LIVE:") || false;
      const blank = !dom || dom.bodyLen < 1000 || dom.visibleCount < 10;
      const refused = [...consoleErrors, ...requestFailures].some((x) => /ERR_CONNECTION_REFUSED|net::ERR/i.test(x));
      const ok = navStatus === "ok" && !blank && !refused && pageErrors.length === 0 && httpErrors.length === 0;
      if (!ok) failures++;

      const caseRec = {
        route: route.path, viewport: vp.label, ok,
        navStatus, blank, refused, livePanel,
        consoleErrors: consoleErrors.slice(0, 10),
        requestFailures: requestFailures.slice(0, 10),
        httpErrors: httpErrors.slice(0, 10),
        pageErrors: pageErrors.slice(0, 10),
        title: dom?.title, h1: dom?.h1, visibleCount: dom?.visibleCount, bodyLen: dom?.bodyLen,
        loadMs: ms, viewportSize: vp.width + "x" + vp.height
      };
      cases.push(caseRec);

      const shot = path.join(SHOT_DIR, `${route.name}-${vp.label}.png`);
      try { await page.screenshot({ path: shot, fullPage: false }); } catch { /* screenshot best effort */ }
      await page.close();
      console.log(`${ok ? "PASS" : "FAIL"} ${route.path} [${vp.label}] vis=${dom?.visibleCount} live=${livePanel} ${ms}ms`);
    }
  }

  const summary = {
    schema: "leeway-proof-receipt.v1",
    title: "LEEWAY-OS-PLAYWRIGHT-LIVE-VERIFICATION",
    baseUrl: BASE,
    browser: { engine: "chromium-1234", headless: true, launch: CHROME },
    startedAt,
    endedAt: new Date().toISOString(),
    totalCases: cases.length,
    passed: cases.length - failures,
    failed: failures,
    status: failures === 0 ? "PASS" : "PARTIAL",
    origin: "DIAGNOSTIC_OPENCODE_CLI_NOT_OFFICIAL",
    evidenceRoot: EVIDENCE_ROOT
  };

  const resultsDoc = {
    schema: "leeway-proof-backed-receipt.v1",
    ...summary,
    cases
  };
  fs.writeFileSync(path.join(EVIDENCE_ROOT, "LEEWAY-OS-PLAYWRIGHT-RESULTS.json"), JSON.stringify(resultsDoc, null, 2), "utf8");

  const liveUrl = {
    schema: "leeway-os-live-url.v1",
    canonicalUrl: BASE + "/",
    hostBinding: "127.0.0.1:3001",
    process: "next start (leeway-os-nextjs production build)",
    policy: "PRESERVE_EXACT_FRONTEND_AND_ADAPT_RUNTIME_BEHIND_IT",
    authorityFile: "LEEWAY-OS-FRONTEND-AUTHORITY.json",
    bffBase: BASE + "/api/leeway",
    provedBy: "LEEWAY-OS-PLAYWRIGHT-RESULTS.json",
    origin: "DIAGNOSTIC_OPENCODE_CLI_NOT_OFFICIAL",
    status: failures === 0 ? "LIVE_PROVEN" : "LIVE_PARTIAL"
  };
  fs.writeFileSync(path.join(EVIDENCE_ROOT, "LEEWAY-OS-LIVE-URL.json"), JSON.stringify(liveUrl, null, 2), "utf8");

  const receipt = {
    schema: "leeway-proof-backed-receipt.v1",
    receiptId: "leeway-os-playwright-live-proof-" + new Date().toISOString().replace(/[-:]/g, "").replace(/\..*/, "").replace("T", "-"),
    status: failures === 0 ? "ok" : "partial",
    startedAt, endedAt: summary.endedAt,
    controlSurface: "opencode_cli_terminal",
    adapterPort: 0, routerPort: 0, runtimeFabric: false, desktopRuntimePort: 0,
    agentIdentity: "agent-lee-code-mode",
    caseResults: { total: cases.length, passed: cases.length - failures, failed: failures },
    artifactPaths: [
      "LEEWAY-OS-LIVE-URL.json",
      "LEEWAY-OS-PLAYWRIGHT-RESULTS.json",
      "phase-09-screenshots/"
    ],
    ok: failures === 0
  };
  fs.writeFileSync(path.join(EVIDENCE_ROOT, "phase-09-receipt.json"), JSON.stringify(receipt, null, 2), "utf8");

  const hashOf = sha256(JSON.stringify(resultsDoc));
  console.log(`\nSUMMARY: ${summary.totalCases} cases | pass=${summary.passed} fail=${summary.failed} | status=${summary.status}`);
  console.log("HASH(results):", hashOf);
  await browser.close();
})();
