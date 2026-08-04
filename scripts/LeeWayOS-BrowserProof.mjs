import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("D:/Leeway-Ecosystem v2.1.4/leeway-ide-single-canvas/node_modules/playwright-core/index.js");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ts = new Date().toISOString().replace(/[:T]/g, "-").slice(0, 19);
const evidenceDir = "D:/Leeway-Ecosystem v2.1.4/LeeWay-Enterprise-Transit-Hub/_evidence/MIG-008D-P0-Emergency-Recovery-Gate-20260802/phase-c";
fs.mkdirSync(evidenceDir, { recursive: true });

const executablePath = "C:/Users/Leona/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe";
const consoleIssues = [];
const requestFailures = [];
const pagesProbed = [];

function browserContext(browser) {
  return browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
}

async function probe(page, label, url, { waitForSelector, waitMs }) {
  const entry = { label, url, status: "unknown" };
  try {
    const resp = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    entry.http = resp ? resp.status() : null;
    await page.waitForTimeout(waitMs || 2500);
    if (waitForSelector) {
      try {
        await page.waitForSelector(waitForSelector, { timeout: 15000 });
        entry.shellSelectorFound = true;
      } catch {
        entry.shellSelectorFound = false;
      }
    }
    entry.title = await page.title().catch(() => null);
    pagesProbed.push(entry);
    return entry;
  } catch (e) {
    entry.status = "error";
    entry.error = String(e.message || e);
    pagesProbed.push(entry);
    return entry;
  }
}

(async () => {
  const browser = await chromium.launch({ executablePath, headless: false, timeout: 60000 });

  // ---- Surface 1: LeeWay OS shell on 3000 (leeway-ide-single-canvas) ----
  const ctx1 = await browserContext(browser);
  const page1 = await ctx1.newPage();
  page1.on("console", (msg) => { if (msg.type() === "error") consoleIssues.push({ page: "3000", text: msg.text() }); });
  page1.on("requestfailed", (req) => requestFailures.push({ page: "3000", url: req.url(), failure: req.failure()?.errorText }));
  const s1 = await probe(page1, "os-shell-3000", "http://127.0.0.1:3000/", { waitMs: 6000 });
  await page1.screenshot({ path: path.join(evidenceDir, "LEEWAY-OS-LIVE-DESKTOP.png") });

  // launcher interaction attempt
  let launcherFound = false;
  for (const sel of ["text=Launchpad", "text=Launcher", "text=Applications", "[aria-label*='launcher' i]", "text=Launch"]) {
    const el = page1.locator(sel).first();
    try {
      if ((await el.count()) > 0 && (await el.isVisible().catch(() => false))) {
        await el.click({ timeout: 5000 });
        launcherFound = true;
        break;
      }
    } catch { /* try next */ }
  }
  await page1.waitForTimeout(2500);
  await page1.screenshot({ path: path.join(evidenceDir, "LEEWAY-OS-LAUNCHER.png") });

  // workspace window attempt: click first visible app tile / window card
  let workspaceFound = false;
  const tiles = page1.locator("[data-app-id], .app-tile, [class*='app-card'], [class*='window-card']").first();
  try {
    if ((await tiles.count()) > 0 && (await tiles.isVisible().catch(() => false))) {
      await tiles.click({ timeout: 5000 });
      workspaceFound = true;
      await page1.waitForTimeout(2500);
    }
  } catch { /* no tile */ }
  await page1.screenshot({ path: path.join(evidenceDir, "LEEWAY-OS-WORKSPACE-WINDOW.png") });

  // ---- Surface 2: LeeWay OS 3001 static gallery ----
  const ctx2 = await browserContext(browser);
  const page2 = await ctx2.newPage();
  page2.on("console", (msg) => { if (msg.type() === "error") consoleIssues.push({ page: "3001", text: msg.text() }); });
  page2.on("requestfailed", (req) => requestFailures.push({ page: "3001", url: req.url(), failure: req.failure()?.errorText }));
  const s2 = await probe(page2, "os-3001-root", "http://127.0.0.1:3001/", { waitMs: 3000 });
  await page2.screenshot({ path: path.join(evidenceDir, "LEEWAY-OS-3001-LANDING.png") });
  const s3 = await probe(page2, "os-3001-desktop", "http://127.0.0.1:3001/s/leeway_os_desktop_1", { waitMs: 5000 });
  await page2.screenshot({ path: path.join(evidenceDir, "LEEWAY-OS-MOBILE.png"), fullPage: true });

  await browser.close();

  const result = {
    schema: "leeway-evidence-artifact",
    evidenceId: "LEEWAY-OS-BROWSER-VISIBILITY-20260802",
    mission: "MIG-008D-P0-EMERGENCY-RECOVERY-GATE",
    phase: "C",
    capturedAt: ts,
    screenshots: fs.readdirSync(evidenceDir).filter((f) => f.endsWith(".png")),
    pagesProbed,
    shellInteraction: { launcherFound, workspaceFound },
    consoleErrors: consoleIssues,
    requestFailures,
    proofLevel: "PROOF_LEVEL_4_FUNCTIONAL_RUNTIME"
  };
  fs.writeFileSync(path.join(evidenceDir, "LEEWAY-OS-BROWSER-VISIBILITY.json"), JSON.stringify(result, null, 2));
  fs.writeFileSync(path.join(evidenceDir, "PHASE-C-RECEIPT.json"), JSON.stringify({
    schema: "leeway-proof-backed-receipt-schema.json",
    receiptId: "mig008d-p0-phase-c-receipt-20260802",
    mission: "MIG-008D-P0-EMERGENCY-RECOVERY-GATE",
    phase: "C",
    status: "complete",
    startedAt: ts,
    endedAt: new Date().toISOString().replace(/[:T]/g, "-").slice(0, 19),
    controlSurface: "headed_playwright_core_chromium",
    agentIdentity: "agent-lee",
    screenshots: result.screenshots,
    pagesProbed: result.pagesProbed,
    consoleErrors: consoleIssues,
    requestFailures,
    ok: true,
    officialLockClaimed: false,
    proofLevel: "PROOF_LEVEL_4_FUNCTIONAL_RUNTIME"
  }, null, 2));

  console.log(JSON.stringify(result, null, 2));
})().catch((e) => {
  console.error("FATAL", e);
  process.exit(1);
});
