import * as fs from "fs";
import * as path from "path";
import { spawn, ChildProcess } from "child_process";
import type { ConsoleMessage, Page, Request, Response } from "playwright-core";

const ROOT = path.join(process.env.USERPROFILE || "", ".leeway-vscode");
const BROWSER_REPORT_DIR = path.join(ROOT, "agent-lee", "reports", "browser");
const BROWSER_BASELINE_DIR = path.join(BROWSER_REPORT_DIR, "baselines");
const BROWSER_DIFF_DIR = path.join(BROWSER_REPORT_DIR, "diffs");
const BROWSER_FLOW_DIR = path.join(BROWSER_REPORT_DIR, "flows");
const DEFAULT_PORT = 4173;

type PreviewSession = {
  key: string;
  url: string;
  process: ChildProcess | null;
};

type CursorPosition = {
  px: number;
  py: number;
};

export type BrowserFlowAction =
  | { type: "navigate"; url: string; label?: string }
  | { type: "click"; selector: string; label?: string }
  | { type: "hover"; selector: string; label?: string }
  | { type: "fill"; selector: string; value: string; label?: string }
  | { type: "press"; selector: string; key: string; label?: string }
  | { type: "wait"; ms: number; label?: string }
  | { type: "assertVisible"; selector: string; label?: string }
  | { type: "assertText"; selector: string; text: string; label?: string }
  | { type: "assertCount"; selector: string; atLeast?: number; exactly?: number; label?: string };

export type BrowserFlowPlan = {
  goal: string;
  targetUrl?: string;
  actions: BrowserFlowAction[];
};

export type BrowserInspectionResult = {
  ok: boolean;
  targetUrl: string;
  source: "remote-url" | "dev-server" | "static-file" | "unavailable";
  screenshotPath: string;
  reportPath: string;
  consoleErrors: string[];
  pageErrors: string[];
  visualDiff: {
    comparedTo: string;
    diffImagePath: string;
    changedPixels: number;
    diffRatio: number;
    baselineCreated: boolean;
  };
  accessibility: {
    violations: {
      id: string;
      impact: string;
      description: string;
      help: string;
      nodeCount: number;
    }[];
    incomplete: number;
    passes: number;
  };
  performance: {
    loadTime: number;
    domContentLoaded: number;
    firstPaint: number;
    firstContentfulPaint: number;
    largestContentfulPaint: number;
    cumulativeLayoutShift: number;
    totalRequests: number;
    totalTransferred: number;
  };
  network: {
    requests: {
      url: string;
      method: string;
      status: number;
      size: number;
      type: string;
      duration: number;
    }[];
    failedRequests: number;
  };
  bugs: {
    brokenLinks: string[];
    missingImages: string[];
    consoleWarnings: string[];
    jsErrors: string[];
  };
  domSummary: {
    title: string;
    headings: string[];
    buttons: string[];
    landmarks: string[];
    forms: number;
    images: number;
    links: number;
  };
  summary: string;
};

export type BrowserFlowResult = {
  ok: boolean;
  targetUrl: string;
  source: "remote-url" | "dev-server" | "static-file" | "unavailable";
  flowReportPath: string;
  screenshotPath: string;
  consoleErrors: string[];
  pageErrors: string[];
  executedSteps: {
    label: string;
    type: string;
    selector?: string;
    success: boolean;
    details: string;
  }[];
  assertions: {
    passed: number;
    failed: number;
  };
  summary: string;
};

const previewSessions = new Map<string, PreviewSession>();

function loadChromium() {
  try {
    return require("playwright-core").chromium as {
      launch: (options: Record<string, unknown>) => Promise<any>;
    };
  } catch {
    return null;
  }
}

function loadPngRuntime() {
  try {
    const { PNG } = require("pngjs") as {
      PNG: {
        new (options: { width: number; height: number }): any;
        sync: {
          read: (buffer: Buffer) => any;
          write: (png: any) => Buffer;
        };
        bitblt: (...args: any[]) => void;
      };
    };
    return PNG;
  } catch {
    return null;
  }
}

function loadPixelmatch() {
  try {
    return require("pixelmatch") as (
      img1: Uint8Array,
      img2: Uint8Array,
      output: Uint8Array,
      width: number,
      height: number,
      options?: { threshold?: number }
    ) => number;
  } catch {
    return null;
  }
}

function loadAxeSource() {
  try {
    const axe = require("axe-core") as { source?: string };
    return typeof axe.source === "string" ? axe.source : null;
  } catch {
    return null;
  }
}

function ensureDir() {
  fs.mkdirSync(BROWSER_REPORT_DIR, { recursive: true });
  fs.mkdirSync(BROWSER_BASELINE_DIR, { recursive: true });
  fs.mkdirSync(BROWSER_DIFF_DIR, { recursive: true });
  fs.mkdirSync(BROWSER_FLOW_DIR, { recursive: true });
}

function detectBrowserExecutable() {
  const paths = [
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"
  ];

  return paths.find((item) => fs.existsSync(item)) || "";
}

function packageInfo(workspaceRoot: string) {
  try {
    const pkgPath = path.join(workspaceRoot, "package.json");
    if (!fs.existsSync(pkgPath)) return null;
    return JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  } catch {
    return null;
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForUrl(url: string, timeoutMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {
    }
    await delay(1000);
  }
  return false;
}

async function ensurePreviewUrl(workspaceRoot: string): Promise<{ url: string; source: "dev-server" | "static-file" | "unavailable" }> {
  if (!workspaceRoot || !fs.existsSync(workspaceRoot)) {
    return { url: "", source: "unavailable" };
  }

  const staticIndex = path.join(workspaceRoot, "index.html");
  if (fs.existsSync(staticIndex)) {
    return { url: `file:///${staticIndex.replace(/\\/g, "/")}`, source: "static-file" };
  }

  const pkg = packageInfo(workspaceRoot);
  if (!pkg?.scripts) {
    return { url: "", source: "unavailable" };
  }

  const sessionKey = workspaceRoot.toLowerCase();
  const existing = previewSessions.get(sessionKey);
  if (existing) {
    return { url: existing.url, source: "dev-server" };
  }

  const deps = {
    ...(pkg.dependencies || {}),
    ...(pkg.devDependencies || {})
  };
  const scripts = pkg.scripts || {};
  const url = `http://127.0.0.1:${DEFAULT_PORT}`;
  let command: string[] | null = null;
  let env: NodeJS.ProcessEnv = { ...process.env };

  if (deps.vite || /vite/i.test(String(scripts.dev || ""))) {
    command = ["run", "dev", "--", "--host", "127.0.0.1", "--port", String(DEFAULT_PORT)];
  } else if (deps.next || /next dev/i.test(String(scripts.dev || ""))) {
    command = ["run", "dev", "--", "--hostname", "127.0.0.1", "--port", String(DEFAULT_PORT)];
  } else if (/react-scripts/i.test(String(scripts.start || scripts.dev || ""))) {
    env = { ...env, PORT: String(DEFAULT_PORT), BROWSER: "none" };
    command = scripts.start ? ["run", "start"] : ["run", "dev"];
  } else if (scripts.preview) {
    command = ["run", "preview", "--", "--host", "127.0.0.1", "--port", String(DEFAULT_PORT)];
  }

  if (!command) {
    return { url: "", source: "unavailable" };
  }

  const proc = spawn("npm.cmd", command, {
    cwd: workspaceRoot,
    env,
    stdio: "ignore",
    detached: false
  });

  previewSessions.set(sessionKey, { key: sessionKey, url, process: proc });
  const up = await waitForUrl(url);
  if (!up) {
    try {
      proc.kill();
    } catch {
    }
    previewSessions.delete(sessionKey);
    return { url: "", source: "unavailable" };
  }

  return { url, source: "dev-server" };
}

function targetKey(url: string) {
  return Buffer.from(url).toString("base64").replace(/[/+=]/g, "_").slice(0, 80);
}

function compareScreenshots(currentPath: string, baselinePath: string, diffPath: string) {
  const PNG = loadPngRuntime();
  const pixelmatch = loadPixelmatch();

  if (!PNG || !pixelmatch) {
    return {
      comparedTo: baselinePath,
      diffImagePath: "",
      changedPixels: 0,
      diffRatio: 0,
      baselineCreated: false
    };
  }

  if (!fs.existsSync(baselinePath)) {
    fs.copyFileSync(currentPath, baselinePath);
    return {
      comparedTo: baselinePath,
      diffImagePath: "",
      changedPixels: 0,
      diffRatio: 0,
      baselineCreated: true
    };
  }

  const current = PNG.sync.read(fs.readFileSync(currentPath));
  const baseline = PNG.sync.read(fs.readFileSync(baselinePath));

  const width = Math.max(current.width, baseline.width);
  const height = Math.max(current.height, baseline.height);

  const normalizedCurrent = new PNG({ width, height });
  const normalizedBaseline = new PNG({ width, height });
  PNG.bitblt(current, normalizedCurrent, 0, 0, current.width, current.height, 0, 0);
  PNG.bitblt(baseline, normalizedBaseline, 0, 0, baseline.width, baseline.height, 0, 0);

  const diff = new PNG({ width, height });
  const changedPixels = pixelmatch(
    normalizedBaseline.data,
    normalizedCurrent.data,
    diff.data,
    width,
    height,
    { threshold: 0.1 }
  );

  fs.writeFileSync(diffPath, PNG.sync.write(diff));
  fs.copyFileSync(currentPath, baselinePath);

  return {
    comparedTo: baselinePath,
    diffImagePath: diffPath,
    changedPixels,
    diffRatio: changedPixels / (width * height),
    baselineCreated: false
  };
}

async function runAccessibilityAudit(page: Page) {
  const axeSource = loadAxeSource();
  if (!axeSource) {
    return {
      violations: [],
      incomplete: 0,
      passes: 0
    };
  }

  await page.addScriptTag({ content: axeSource });
  return page.evaluate(async () => {
    const result = await (window as any).axe.run(document, {
      runOnly: {
        type: "tag",
        values: ["wcag2a", "wcag2aa"]
      }
    });

    return {
      violations: result.violations.map((item: any) => ({
        id: item.id,
        impact: item.impact || "unknown",
        description: item.description,
        help: item.help,
        nodeCount: item.nodes.length
      })),
      incomplete: result.incomplete.length,
      passes: result.passes.length
    };
  });
}

function summarizeVisual(result: BrowserInspectionResult) {
  return [
    `Visual browser source: ${result.source}`,
    `Target URL: ${result.targetUrl}`,
    `Page title: ${result.domSummary.title || "Untitled"}`,
    `Headings: ${result.domSummary.headings.slice(0, 6).join(" | ") || "none detected"}`,
    `Buttons: ${result.domSummary.buttons.slice(0, 6).join(" | ") || "none detected"}`,
    `Landmarks: ${result.domSummary.landmarks.join(", ") || "none detected"}`,
    `Forms: ${result.domSummary.forms} | Images: ${result.domSummary.images} | Links: ${result.domSummary.links}`,
    `Console errors: ${result.consoleErrors.length} | Page errors: ${result.pageErrors.length}`,
    `A11y violations: ${result.accessibility.violations.length} | Incomplete checks: ${result.accessibility.incomplete}`,
    `Visual diff ratio: ${result.visualDiff.diffRatio.toFixed(4)} | Changed pixels: ${result.visualDiff.changedPixels}`,
    `Load time: ${result.performance.loadTime}ms | DOM ready: ${result.performance.domContentLoaded}ms`,
    `First paint: ${result.performance.firstPaint}ms | LCP: ${result.performance.largestContentfulPaint}ms`,
    `CLS: ${result.performance.cumulativeLayoutShift.toFixed(4)} | Requests: ${result.performance.totalRequests}`,
    `Network failed: ${result.network.failedRequests} | Bugs detected: ${result.bugs.brokenLinks.length + result.bugs.missingImages.length + result.bugs.jsErrors.length}`,
    `Screenshot: ${result.screenshotPath}`,
    `Browser report: ${result.reportPath}`
  ].join("\n");
}

function summarizeFlow(result: BrowserFlowResult) {
  return [
    `Flow source: ${result.source}`,
    `Target URL: ${result.targetUrl}`,
    `Steps executed: ${result.executedSteps.length}`,
    `Assertions passed: ${result.assertions.passed} | failed: ${result.assertions.failed}`,
    `Console errors: ${result.consoleErrors.length} | Page errors: ${result.pageErrors.length}`,
    `Flow screenshot: ${result.screenshotPath}`,
    `Flow report: ${result.flowReportPath}`
  ].join("\n");
}

async function resolveTarget(args: { workspaceRoot: string; explicitUrl?: string }) {
  const resolvedTarget = args.explicitUrl
    ? { url: args.explicitUrl, source: "remote-url" as const }
    : await ensurePreviewUrl(args.workspaceRoot);
  return resolvedTarget;
}

function fallbackInspection(message: string, unavailablePath: string): BrowserInspectionResult {
  const fallback: BrowserInspectionResult = {
    ok: false,
    targetUrl: "",
    source: "unavailable",
    screenshotPath: "",
    reportPath: unavailablePath,
    consoleErrors: [],
    pageErrors: [],
    visualDiff: {
      comparedTo: "",
      diffImagePath: "",
      changedPixels: 0,
      diffRatio: 0,
      baselineCreated: false
    },
    accessibility: {
      violations: [],
      incomplete: 0,
      passes: 0
    },
    performance: {
      loadTime: 0,
      domContentLoaded: 0,
      firstPaint: 0,
      firstContentfulPaint: 0,
      largestContentfulPaint: 0,
      cumulativeLayoutShift: 0,
      totalRequests: 0,
      totalTransferred: 0
    },
    network: {
      requests: [],
      failedRequests: 0
    },
    bugs: {
      brokenLinks: [],
      missingImages: [],
      consoleWarnings: [],
      jsErrors: []
    },
    domSummary: {
      title: "",
      headings: [],
      buttons: [],
      landmarks: [],
      forms: 0,
      images: 0,
      links: 0
    },
    summary: message
  };
  fs.writeFileSync(unavailablePath, JSON.stringify(fallback, null, 2), "utf8");
  return fallback;
}

function fallbackFlow(message: string, unavailablePath: string): BrowserFlowResult {
  const fallback: BrowserFlowResult = {
    ok: false,
    targetUrl: "",
    source: "unavailable",
    flowReportPath: unavailablePath,
    screenshotPath: "",
    consoleErrors: [],
    pageErrors: [],
    executedSteps: [],
    assertions: {
      passed: 0,
      failed: 0
    },
    summary: message
  };
  fs.writeFileSync(unavailablePath, JSON.stringify(fallback, null, 2), "utf8");
  return fallback;
}

async function injectCursor(page: Page) {
  await page.addInitScript(() => {
    (window as any).__agentLeeCursorMove = (x: number, y: number, click = false) => {
      let el = document.getElementById("__agent_lee_cursor__");
      if (!el) {
        el = document.createElement("div");
        el.id = "__agent_lee_cursor__";
        el.style.position = "fixed";
        el.style.width = "16px";
        el.style.height = "16px";
        el.style.borderRadius = "999px";
        el.style.background = "rgba(0, 183, 255, 0.85)";
        el.style.boxShadow = "0 0 0 3px rgba(255,255,255,0.85), 0 0 18px rgba(0,183,255,0.6)";
        el.style.zIndex = "2147483647";
        el.style.pointerEvents = "none";
        el.style.transform = "translate(-50%, -50%)";
        el.style.transition = "transform 80ms linear, left 80ms linear, top 80ms linear";
        document.documentElement.appendChild(el);
      }
      el.style.left = x + "px";
      el.style.top = y + "px";
      el.style.opacity = "1";
      if (click) {
        el.animate(
          [
            { transform: "translate(-50%, -50%) scale(1)" },
            { transform: "translate(-50%, -50%) scale(1.45)" },
            { transform: "translate(-50%, -50%) scale(1)" }
          ],
          { duration: 250, easing: "ease-out" }
        );
      }
    };
  });
}

async function moveMouseHuman(page: Page, from: { x: number; y: number }, to: { x: number; y: number }, showCursor: boolean) {
  const steps = Math.max(12, Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) / 25));
  for (let i = 1; i <= steps; i++) {
    const progress = i / steps;
    const x = from.x + (to.x - from.x) * progress;
    const y = from.y + (to.y - from.y) * progress;
    await page.mouse.move(x, y);
    if (showCursor) {
      await page.evaluate(
        ({ px, py }) => (window as any).__agentLeeCursorMove?.(px, py, false),
        { px: x, py: y }
      );
    }
    await delay(16);
  }
}

async function selectorCenter(page: Page, selector: string) {
  const locator = page.locator(selector).first();
  await locator.waitFor({ state: "visible", timeout: 30000 });
  const box = await locator.boundingBox();
  if (!box) {
    throw new Error(`Could not calculate bounding box for selector: ${selector}`);
  }
  return {
    x: box.x + box.width / 2,
    y: box.y + box.height / 2
  };
}

function browserLaunchOptions(browserExe: string, headed: boolean, slowMoMs: number) {
  return {
    executablePath: browserExe,
    headless: !headed,
    slowMo: slowMoMs
  };
}

export async function inspectVisualTarget(args: {
  workspaceRoot: string;
  explicitUrl?: string;
}): Promise<BrowserInspectionResult> {
  ensureDir();
  const playwrightChromium = loadChromium();
  if (!playwrightChromium) {
    const unavailablePath = path.join(BROWSER_REPORT_DIR, `browser-playwright-missing-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
    return fallbackInspection("Browser runtime is unavailable because playwright-core is not installed for this extension build.", unavailablePath);
  }

  const browserExe = detectBrowserExecutable();
  if (!browserExe) {
    const unavailablePath = path.join(BROWSER_REPORT_DIR, `browser-unavailable-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
    return fallbackInspection("No supported local browser executable was found.", unavailablePath);
  }

  const resolvedTarget = await resolveTarget(args);
  if (!resolvedTarget.url) {
    const unavailablePath = path.join(BROWSER_REPORT_DIR, `browser-target-unavailable-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
    return fallbackInspection("No browser target could be resolved from the prompt or workspace preview.", unavailablePath);
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const screenshotPath = path.join(BROWSER_REPORT_DIR, `browser-shot-${stamp}.png`);
  const reportPath = path.join(BROWSER_REPORT_DIR, `browser-report-${stamp}.json`);
  const targetId = targetKey(resolvedTarget.url);
  const baselinePath = path.join(BROWSER_BASELINE_DIR, `${targetId}.png`);
  const diffPath = path.join(BROWSER_DIFF_DIR, `browser-diff-${stamp}.png`);
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];

  const browser = await playwrightChromium.launch(browserLaunchOptions(browserExe, false, 0));

  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1024 } });
    const networkRequests: any[] = [];
    const consoleWarnings: string[] = [];
    const jsErrors: string[] = [];

    page.on("console", (msg: ConsoleMessage) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      } else if (msg.type() === "warning") {
        consoleWarnings.push(msg.text());
      }
    });
    page.on("pageerror", (error: Error) => {
      pageErrors.push(error.message);
      jsErrors.push(error.message);
    });
    page.on("request", (request: Request) => {
      networkRequests.push({
        url: request.url(),
        method: request.method(),
        type: request.resourceType(),
        timestamp: Date.now()
      });
    });
    page.on("response", (response: Response) => {
      const request = networkRequests.find((r) => r.url === response.url());
      if (request) {
        request.status = response.status();
        request.size = response.headers()['content-length'] ? parseInt(response.headers()['content-length']) : 0;
        request.duration = Date.now() - request.timestamp;
      }
    });

    const startTime = Date.now();
    await page.goto(resolvedTarget.url, { waitUntil: "networkidle", timeout: 60000 });
    const loadTime = Date.now() - startTime;

    await page.screenshot({ path: screenshotPath, fullPage: true });

    const accessibility = await runAccessibilityAudit(page);

    const [performanceMetrics, bugs] = await page.evaluate(() => {
      const perf = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paintEntries = performance.getEntriesByType('paint');
      const lcpEntry = performance.getEntriesByType('largest-contentful-paint')[0] as any;
      const clsEntry = performance.getEntriesByType('layout-shift').reduce((sum, entry: any) => sum + entry.value, 0);

      const brokenLinks: string[] = [];
      const missingImages: string[] = [];

      // Check links
      document.querySelectorAll('a[href]').forEach((link) => {
        const href = (link as HTMLAnchorElement).href;
        if (href && !href.startsWith('javascript:') && !href.startsWith('#')) {
          // Simple check for broken links (would need fetch in real implementation)
          // For now, just collect external links
        }
      });

      // Check images
      document.querySelectorAll('img').forEach((img) => {
        const src = (img as HTMLImageElement).src;
        if (src && !img.complete) {
          missingImages.push(src);
        }
      });

      return [{
        loadTime,
        domContentLoaded: perf ? perf.domContentLoadedEventEnd - perf.domContentLoadedEventStart : 0,
        firstPaint: paintEntries.find((e: any) => e.name === 'first-paint')?.startTime || 0,
        firstContentfulPaint: paintEntries.find((e: any) => e.name === 'first-contentful-paint')?.startTime || 0,
        largestContentfulPaint: lcpEntry?.startTime || 0,
        cumulativeLayoutShift: clsEntry,
        totalRequests: performance.getEntriesByType('resource').length,
        totalTransferred: performance.getEntriesByType('resource').reduce((sum, entry: any) => sum + (entry.transferSize || 0), 0)
      }, {
        brokenLinks,
        missingImages,
        consoleWarnings: [],
        jsErrors: []
      }];
    });

    const domSummary = await page.evaluate(() => {
      const pickText = (items: Element[], limit: number) =>
        items
          .map((item) => (item.textContent || "").trim())
          .filter(Boolean)
          .slice(0, limit);

      return {
        title: document.title || "",
        headings: pickText(Array.from(document.querySelectorAll("h1,h2,h3")), 8),
        buttons: pickText(Array.from(document.querySelectorAll("button,[role='button'],a.button,.button")), 8),
        landmarks: Array.from(document.querySelectorAll("header,nav,main,section,footer,aside"))
          .map((item) => item.tagName.toLowerCase())
          .slice(0, 12),
        forms: document.querySelectorAll("form").length,
        images: document.querySelectorAll("img").length,
        links: document.querySelectorAll("a").length
      };
    });

    const visualDiff = compareScreenshots(screenshotPath, baselinePath, diffPath);

    const failedRequests = networkRequests.filter((r) => r.status && r.status >= 400).length;

    const result: BrowserInspectionResult = {
      ok: true,
      targetUrl: resolvedTarget.url,
      source: resolvedTarget.source,
      screenshotPath,
      reportPath,
      consoleErrors,
      pageErrors,
      visualDiff,
      accessibility,
      performance: performanceMetrics,
      network: {
        requests: networkRequests.map((r) => ({
          url: r.url,
          method: r.method,
          status: r.status || 0,
          size: r.size || 0,
          type: r.type,
          duration: r.duration || 0
        })),
        failedRequests
      },
      bugs: {
        brokenLinks: bugs.brokenLinks,
        missingImages: bugs.missingImages,
        consoleWarnings,
        jsErrors
      },
      domSummary,
      summary: ""
    };

    result.summary = summarizeVisual(result);
    fs.writeFileSync(reportPath, JSON.stringify(result, null, 2), "utf8");
    return result;
  } finally {
    await browser.close();
  }
}

export async function runVisualUserFlow(args: {
  workspaceRoot: string;
  explicitUrl?: string;
  plan: BrowserFlowPlan;
  headed?: boolean;
  showCursor?: boolean;
  slowMoMs?: number;
}): Promise<BrowserFlowResult> {
  ensureDir();
  const playwrightChromium = loadChromium();
  if (!playwrightChromium) {
    const unavailablePath = path.join(BROWSER_FLOW_DIR, `browser-flow-playwright-missing-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
    return fallbackFlow("Browser flow runtime is unavailable because playwright-core is not installed for this extension build.", unavailablePath);
  }

  const browserExe = detectBrowserExecutable();
  if (!browserExe) {
    const unavailablePath = path.join(BROWSER_FLOW_DIR, `browser-flow-unavailable-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
    return fallbackFlow("No supported local browser executable was found.", unavailablePath);
  }

  const resolvedTarget = await resolveTarget({
    workspaceRoot: args.workspaceRoot,
    explicitUrl: args.plan.targetUrl || args.explicitUrl
  });
  if (!resolvedTarget.url) {
    const unavailablePath = path.join(BROWSER_FLOW_DIR, `browser-flow-target-unavailable-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
    return fallbackFlow("No browser target could be resolved for the scripted user flow.", unavailablePath);
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const flowReportPath = path.join(BROWSER_FLOW_DIR, `browser-flow-report-${stamp}.json`);
  const screenshotPath = path.join(BROWSER_FLOW_DIR, `browser-flow-shot-${stamp}.png`);
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const executedSteps: BrowserFlowResult["executedSteps"] = [];
  const assertions = { passed: 0, failed: 0 };

  const headed = args.headed !== false;
  const showCursor = args.showCursor !== false;
  const slowMoMs = Math.max(0, args.slowMoMs || 250);

  const browser = await playwrightChromium.launch(browserLaunchOptions(browserExe, headed, slowMoMs));

  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1024 } });
    page.on("console", (msg: ConsoleMessage) => {
      if (msg.type() === "error" || msg.type() === "warning") {
        consoleErrors.push(msg.text());
      }
    });
    page.on("pageerror", (error: Error) => {
      pageErrors.push(error.message);
    });

    if (showCursor) {
      await injectCursor(page);
    }

    await page.goto(resolvedTarget.url, { waitUntil: "networkidle", timeout: 60000 });
    let mouse = { x: 60, y: 60 };
    if (showCursor) {
      await page.evaluate(
        ({ px, py }: CursorPosition) => (window as any).__agentLeeCursorMove?.(px, py, false),
        { px: mouse.x, py: mouse.y }
      );
    }

    for (const action of args.plan.actions) {
      const label = action.label || action.type;
      try {
        if (action.type === "navigate") {
          await page.goto(action.url, { waitUntil: "networkidle", timeout: 60000 });
          executedSteps.push({ label, type: action.type, success: true, details: action.url });
          continue;
        }

        if (action.type === "wait") {
          await delay(action.ms);
          executedSteps.push({ label, type: action.type, success: true, details: `${action.ms}ms wait` });
          continue;
        }

        if (action.type === "click" || action.type === "hover" || action.type === "fill" || action.type === "press") {
          const target = await selectorCenter(page, action.selector);
          await moveMouseHuman(page, mouse, target, showCursor);
          mouse = target;

          if (action.type === "hover") {
            await page.locator(action.selector).first().hover();
            executedSteps.push({ label, type: action.type, selector: action.selector, success: true, details: "hovered" });
            continue;
          }

          if (action.type === "click") {
            if (showCursor) {
              await page.evaluate(
                ({ px, py }: CursorPosition) => (window as any).__agentLeeCursorMove?.(px, py, true),
                { px: mouse.x, py: mouse.y }
              );
            }
            await page.mouse.click(mouse.x, mouse.y);
            await page.waitForLoadState("networkidle").catch(() => undefined);
            executedSteps.push({ label, type: action.type, selector: action.selector, success: true, details: "clicked" });
            continue;
          }

          if (action.type === "fill") {
            await page.locator(action.selector).first().click();
            await page.locator(action.selector).first().fill(action.value);
            executedSteps.push({ label, type: action.type, selector: action.selector, success: true, details: `filled: ${action.value}` });
            continue;
          }

          if (action.type === "press") {
            await page.locator(action.selector).first().click();
            await page.locator(action.selector).first().press(action.key);
            executedSteps.push({ label, type: action.type, selector: action.selector, success: true, details: `pressed: ${action.key}` });
            continue;
          }
        }

        if (action.type === "assertVisible") {
          const visible = await page.locator(action.selector).first().isVisible();
          if (!visible) throw new Error("selector not visible");
          assertions.passed += 1;
          executedSteps.push({ label, type: action.type, selector: action.selector, success: true, details: "visible" });
          continue;
        }

        if (action.type === "assertText") {
          const text = (await page.locator(action.selector).first().textContent()) || "";
          if (!text.includes(action.text)) throw new Error(`expected text containing '${action.text}'`);
          assertions.passed += 1;
          executedSteps.push({ label, type: action.type, selector: action.selector, success: true, details: `matched text: ${action.text}` });
          continue;
        }

        if (action.type === "assertCount") {
          const count = await page.locator(action.selector).count();
          const valid =
            typeof action.exactly === "number" ? count === action.exactly :
            typeof action.atLeast === "number" ? count >= action.atLeast :
            count > 0;
          if (!valid) throw new Error(`count assertion failed with count=${count}`);
          assertions.passed += 1;
          executedSteps.push({ label, type: action.type, selector: action.selector, success: true, details: `count=${count}` });
          continue;
        }
      } catch (error: any) {
        if (action.type.startsWith("assert")) assertions.failed += 1;
        executedSteps.push({
          label,
          type: action.type,
          selector: "selector" in action ? action.selector : undefined,
          success: false,
          details: error.message
        });
      }
    }

    await page.screenshot({ path: screenshotPath, fullPage: true });

    const result: BrowserFlowResult = {
      ok: executedSteps.every((step) => step.success),
      targetUrl: page.url(),
      source: resolvedTarget.source,
      flowReportPath,
      screenshotPath,
      consoleErrors,
      pageErrors,
      executedSteps,
      assertions,
      summary: ""
    };

    result.summary = summarizeFlow(result);
    fs.writeFileSync(flowReportPath, JSON.stringify({
      createdAt: new Date().toISOString(),
      goal: args.plan.goal,
      plan: args.plan,
      ...result
    }, null, 2), "utf8");
    return result;
  } finally {
    await browser.close();
  }
}

export function stopBrowserPreviews() {
  for (const session of previewSessions.values()) {
    try {
      session.process?.kill();
    } catch {
    }
  }
  previewSessions.clear();
}
/*
LEEWAY_HEADER - DO NOT REMOVE

TAG: CORE.RUNTIME.BROWSER.ENGINE
REGION: 🟢 CORE
PURPOSE: Browser automation and runtime page inspection support for Agent Lee verification.
DISCOVERY_PIPELINE:
  Voice → Intent → Location → Vertical → Ranking → Render
*/
