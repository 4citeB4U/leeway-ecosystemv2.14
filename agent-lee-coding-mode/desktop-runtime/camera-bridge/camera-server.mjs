import fs from "fs";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CAMERA_CONFIRM = "I_AUTHORIZE_AGENT_LEE_CAMERA_CAPTURE";
const DESKTOP_CONFIRM = "I_AUTHORIZE_AGENT_LEE_DESKTOP_COMMAND";
const DEFAULT_VISION_BACKEND = process.env.AGENT_LEE_VISION_MODEL || "qwen2.5vl:7b";

function isoStamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function writeJson(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), "utf8");
}

function parseDataUrl(dataUrl) {
  const match = String(dataUrl || "").match(/^data:image\/jpeg;base64,(.+)$/i);
  if (!match) {
    throw new Error("Camera snapshot did not return a JPEG data URL.");
  }

  return Buffer.from(match[1], "base64");
}

function normalizeSnapshotPath(candidate) {
  let snapshotPath = String(candidate || "").trim();
  if (!snapshotPath) return "";

  if ((snapshotPath.startsWith('"') && snapshotPath.endsWith('"')) ||
      (snapshotPath.startsWith("'") && snapshotPath.endsWith("'"))) {
    snapshotPath = snapshotPath.slice(1, -1).trim();
  }

  if (/^file:\/\//i.test(snapshotPath)) {
    try {
      snapshotPath = fileURLToPath(new URL(snapshotPath));
    } catch {
      // leave as-is and attempt normalization below
    }
  }

  if (/^data:/i.test(snapshotPath)) {
    return "";
  }

  snapshotPath = snapshotPath.replace(/^\/+([A-Za-z]:[\\/])/, "$1");
  snapshotPath = path.normalize(snapshotPath);

  if (!path.isAbsolute(snapshotPath)) {
    if (activeRun?.runRoot) {
      const resolved = path.resolve(activeRun.runRoot, snapshotPath);
      if (fs.existsSync(resolved)) {
        return resolved;
      }
    }
    return path.resolve(process.cwd(), snapshotPath);
  }

  return snapshotPath;
}

function extractFirstText(parsed) {
  const candidates = [
    parsed?.choices?.[0]?.message?.content,
    parsed?.choices?.[0]?.text,
    parsed?.message?.content,
    parsed?.content,
    parsed?.response,
    parsed?.result?.content,
    parsed?.agentLeeTurbo?.content,
    parsed?.agentLeeTurbo?.trace?.content,
    parsed?.agentLeeTurbo?.downstreamTrace?.content
  ];

  for (const candidate of candidates) {
    const text = String(candidate ?? "").trim();
    if (text) return text;
  }

  return "";
}

async function postJson(url, body, timeoutMs = 180000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    const raw = await response.text();
    let parsed = null;
    try { parsed = raw ? JSON.parse(raw) : null; } catch {}
    return {
      ok: response.ok,
      statusCode: response.status,
      rawBody: raw,
      parsed,
      error: null
    };
  } catch (error) {
    return {
      ok: false,
      statusCode: 0,
      rawBody: "",
      parsed: null,
      error: error?.name === "AbortError" ? `Request timed out after ${timeoutMs}ms` : (error?.message || String(error))
    };
  } finally {
    clearTimeout(timer);
  }
}

function createReceiptSkeleton(overrides = {}) {
  return {
    schema: "leeway.agent-lee.camera-physical-eyes-proof.v1",
    status: "STARTED",
    lock: "AGENT_LEE_PHYSICAL_CAMERA_EYES_LOCKED",
    controlSurface: "diagnostic_terminal",
    originProof: {
      vscodeChat: false,
      adapterPort: 8787,
      routerPort: 8080,
      runtimeFabric: true,
      desktopRuntimePort: 8091,
      notCodex: true,
      notDirectPowerShell: true,
      notDirectBrowserOnly: true
    },
    camera: {
      bridge: "leeway_camera_bridge",
      cameraPermissionRequired: true,
      cameraPermissionResult: "unknown",
      snapshotPath: "",
      snapshotBytes: 0,
      cameraActiveMs: 0
    },
    vision: {
      backend: DEFAULT_VISION_BACKEND,
      responseMode: "",
      selectedBackend: "",
      fallbackUsed: false,
      timeout: false,
      analysisText: ""
    },
    speech: {
      spoken: false,
      runRoot: "",
      file: "",
      playback: {}
    },
    safety: {
      noSilentCapture: true,
      explicitConsent: true,
      localOnly: true,
      noIdentityRecognition: true
    },
    ok: false,
    error: null,
    startedAt: new Date().toISOString(),
    endedAt: null,
    ...overrides
  };
}

export function createCameraBridge(options = {}) {
  const root = options.root || path.resolve(__dirname, "..", "..", "..");
  const runtimeUrl = options.runtimeUrl || "http://127.0.0.1:8091";
  const visionBackend = options.visionBackend || DEFAULT_VISION_BACKEND;
  const allowAutoGrant = options.autoGrantPermissions !== false;
  const receiptDir = options.receiptDir || path.join(root, "Archive", "receipts");
  const runsRoot = options.runsRoot || path.join(root, "agent-lee-coding-mode", "desktop-runtime", "runs");
  const pageFile = options.pageFile || path.join(__dirname, "camera-page.html");

  ensureDir(receiptDir);
  ensureDir(runsRoot);

  let server = null;
  let serverPort = null;
  let browser = null;
  let context = null;
  let page = null;
  let activeRun = null;
  let lastStatus = "idle";

  function currentPageUrl() {
    return serverPort ? `http://127.0.0.1:${serverPort}/camera-page.html` : null;
  }

  function makeRunRoot() {
    const runRoot = path.join(runsRoot, `camera-snapshot-${isoStamp()}`);
    ensureDir(runRoot);
    return runRoot;
  }

  function saveReceipt(runRoot, data) {
    const receiptPath = path.join(runRoot, "receipt.json");
    writeJson(receiptPath, data);
    return receiptPath;
  }

  async function ensureServer() {
    if (server) return;

    server = http.createServer((req, res) => {
      const requestUrl = new URL(req.url || "/", "http://127.0.0.1");
      if (req.method === "GET" && (requestUrl.pathname === "/" || requestUrl.pathname === "/camera-page.html")) {
        try {
          const html = readText(pageFile);
          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
          res.end(html);
          return;
        } catch (error) {
          res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({ ok: false, error: error.message }));
          return;
        }
      }

      if (req.method === "GET" && requestUrl.pathname === "/status") {
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({
          ok: true,
          bridge: "leeway_camera_bridge",
          serverPort,
          pageUrl: currentPageUrl(),
          browserOpen: Boolean(browser),
          pageOpen: Boolean(page),
          status: lastStatus,
          runRoot: activeRun?.runRoot || null,
          snapshotPath: activeRun?.snapshotPath || null,
          permissionResult: activeRun?.cameraPermissionResult || "unknown"
        }));
        return;
      }

      res.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ ok: false, error: "Not found" }));
    });

    await new Promise((resolve) => {
      server.listen(0, "127.0.0.1", () => {
        serverPort = server.address().port;
        resolve();
      });
    });
  }

  async function ensureBrowser(permissionsMode = "auto") {
    if (browser && page && !page.isClosed()) return page;

    await ensureServer();

    if (browser) {
      try { await browser.close(); } catch {}
    }

    const launchArgs = {
      headless: false,
      args: [
        "--new-window",
        "--disable-background-timer-throttling",
        "--disable-renderer-backgrounding"
      ]
    };

    let launched = null;
    try {
      launched = await chromium.launch({ ...launchArgs, channel: "msedge" });
    } catch {
      launched = await chromium.launch(launchArgs);
    }

    browser = launched;
    context = await browser.newContext({
      viewport: { width: 1365, height: 960 }
    });

    if (allowAutoGrant && permissionsMode !== "prompt") {
      try {
        await context.grantPermissions(["camera"], { origin: `http://127.0.0.1:${serverPort}` });
      } catch {}
    }

    page = await context.newPage();
    await page.goto(currentPageUrl(), { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForLoadState("domcontentloaded").catch(() => {});
    return page;
  }

  async function getPageState() {
    if (!page || page.isClosed()) return { active: false, permissionResult: "unknown" };
    try {
      return await page.evaluate(() => window.agentLeeCameraBridge?.getState?.() || { active: false, permissionResult: "unknown" });
    } catch {
      return { active: false, permissionResult: "unknown" };
    }
  }

  async function open(payload = {}) {
    const permissionsMode = String(payload.permissionMode || "auto");
    await ensureBrowser(permissionsMode);
    lastStatus = "open";
    const state = await getPageState();
    activeRun = activeRun || {
      runRoot: null,
      receiptPath: null,
      startedAt: new Date().toISOString(),
      status: "OPEN"
    };

    activeRun.cameraPermissionResult = state.permissionResult || (permissionsMode === "prompt" ? "prompt_pending" : "granted");
    activeRun.controlSurface = String(payload.controlSurface || "diagnostic_terminal");

    return {
      ok: true,
      bridge: "leeway_camera_bridge",
      status: "open",
      pageUrl: currentPageUrl(),
      browserOpen: true,
      permissionResult: activeRun.cameraPermissionResult,
      runRoot: activeRun.runRoot || null,
      receiptPath: activeRun.receiptPath || null
    };
  }

  async function captureSnapshot(payload = {}) {
    const openResult = await open(payload);
    const runRoot = activeRun.runRoot || makeRunRoot();
    activeRun.runRoot = runRoot;
    const framePath = path.join(runRoot, "frame.jpg");

    const state = await getPageState();
    if (!state.active && payload.autoStart !== false) {
      try {
        await page.evaluate(() => window.agentLeeCameraBridge.startCamera());
      } catch (error) {
        activeRun.cameraPermissionResult = "denied";
        const receipt = createReceiptSkeleton({
          status: "FAIL",
          controlSurface: openResult.pageUrl ? "vscode_chat" : "diagnostic_terminal"
        });
        receipt.camera.cameraPermissionResult = "denied";
        receipt.error = error.message;
        receipt.endedAt = new Date().toISOString();
        activeRun.receiptPath = saveReceipt(runRoot, receipt);
        return {
          ok: false,
          bridge: "leeway_camera_bridge",
          error: error.message,
          runRoot,
          receiptPath: activeRun.receiptPath
        };
      }
    }

    const capture = await page.evaluate(async () => window.agentLeeCameraBridge.captureSnapshot());
    const bytes = parseDataUrl(capture.dataUrl);
    fs.writeFileSync(framePath, bytes);

    const request = {
      confirm: CAMERA_CONFIRM,
      mode: "snapshot",
      controlSurface: String(payload.controlSurface || "diagnostic_terminal"),
      permissionMode: String(payload.permissionMode || "auto")
    };
    writeJson(path.join(runRoot, "camera-request.json"), request);
    writeJson(path.join(runRoot, "camera-response.json"), capture);
    writeJson(path.join(runRoot, "timeline.json"), [
      { at: new Date().toISOString(), event: "snapshot", framePath, bytes: bytes.length }
    ]);

    activeRun.snapshotPath = framePath;
    activeRun.snapshotBytes = bytes.length;
    activeRun.cameraActiveMs = capture.cameraActiveMs || 0;
    activeRun.cameraPermissionResult = capture.permissionResult || activeRun.cameraPermissionResult || "unknown";
    activeRun.status = "CAPTURED";
    activeRun.receiptPath = saveReceipt(runRoot, createReceiptSkeleton({
      status: "CAPTURED",
      controlSurface: String(payload.controlSurface || "diagnostic_terminal")
    }));
    return {
      ok: true,
      bridge: "leeway_camera_bridge",
      status: "captured",
      runRoot,
      snapshotPath: framePath,
      snapshotBytes: bytes.length,
      cameraPermissionResult: activeRun.cameraPermissionResult,
      cameraActiveMs: capture.cameraActiveMs || 0,
      receiptPath: activeRun.receiptPath
    };
  }

  async function analyzeSnapshot(payload = {}) {
    const rawSnapshotPath = String(
      payload.snapshotPath ||
      payload.snapshot ||
      payload.imagePath ||
      (Array.isArray(payload.imagePaths) && payload.imagePaths[0]) ||
      activeRun?.snapshotPath ||
      ""
    );
    const snapshotPath = normalizeSnapshotPath(rawSnapshotPath);
    const runRoot = activeRun?.runRoot || payload.runRoot || makeRunRoot();

    if (!snapshotPath) {
      throw new Error(`No snapshot available for analysis. rawSnapshotPath=${JSON.stringify(rawSnapshotPath)}`);
    }

    if (!fs.existsSync(snapshotPath)) {
      throw new Error(`Snapshot not found: ${snapshotPath}`);
    }

    activeRun = activeRun || { runRoot };
    activeRun.runRoot = runRoot;
    activeRun.snapshotPath = snapshotPath;

    const prompt = String(payload.prompt || "Describe the visible environment, objects, lighting, and any visible screen context. Do not identify people by name.");
    const imageBytes = fs.readFileSync(snapshotPath);
    const imageUrl = `data:image/jpeg;base64,${imageBytes.toString("base64")}`;
    const visionRequest = {
      model: String(payload.visionBackend || visionBackend),
      stream: false,
      messages: [
        {
          role: "system",
          content: "You are Agent Lee's local vision lane. Return concise direct observations without naming people."
        },
        {
          role: "user",
          content: prompt,
          images: [imageUrl.replace(/^data:image\/jpeg;base64,/i, "")]
        }
      ],
      options: {
        temperature: 0,
        num_predict: 256
      }
    };

    writeJson(path.join(runRoot, "vision-request.json"), visionRequest);
    const analysisTimeoutMs = Number(payload.timeoutMs || 60000);
    const visionResponse = await postJson("http://127.0.0.1:11434/api/chat", visionRequest, analysisTimeoutMs);
    writeJson(path.join(runRoot, "vision-response.json"), visionResponse);

    const analysisText = extractFirstText(visionResponse.parsed);
    const hasTimeoutText = /downstream model backend did not respond|request timed out|Backend note/i.test(analysisText + "\n" + visionResponse.rawBody + "\n" + visionResponse.error);
    const isTimedOut = Boolean(visionResponse.error) && /timed out|abort/i.test(String(visionResponse.error));

    if (payload.speakSummary && analysisText) {
      try {
        const speakResponse = await postJson(`${runtimeUrl}/runtime/speak`, {
          confirm: DESKTOP_CONFIRM,
          text: analysisText.slice(0, 700),
          voice: String(payload.voice || "andrew")
        }, 180000);
        activeRun.speech = {
          spoken: Boolean(speakResponse.ok),
          runRoot: speakResponse.parsed?.runRoot || "",
          file: speakResponse.parsed?.result?.file || speakResponse.parsed?.file || "",
          playback: speakResponse.parsed?.result?.playback || speakResponse.parsed?.playback || {}
        };
      } catch {}
    }

    activeRun.visionBackend = String(payload.visionBackend || visionBackend);
    activeRun.analysisText = analysisText;
    activeRun.visionTimeout = hasTimeoutText;
    activeRun.status = analysisText ? "ANALYZED" : (isTimedOut ? "PARTIAL" : "FAIL");

    const receipt = createReceiptSkeleton({
      status: analysisText ? "PASS_MACHINE_ONLY" : (isTimedOut ? "PARTIAL" : "FAIL"),
      controlSurface: String(payload.controlSurface || "diagnostic_terminal"),
      ok: Boolean(analysisText)
    });
    receipt.camera.cameraPermissionResult = activeRun.cameraPermissionResult || "unknown";
    receipt.camera.snapshotPath = snapshotPath;
    receipt.camera.snapshotBytes = imageBytes.length;
    receipt.camera.cameraActiveMs = activeRun.cameraActiveMs || 0;
    receipt.vision.backend = String(payload.visionBackend || visionBackend);
    receipt.vision.responseMode = "vision_model_completion";
    receipt.vision.selectedBackend = String(payload.visionBackend || visionBackend);
    receipt.vision.fallbackUsed = false;
    receipt.vision.timeout = hasTimeoutText;
    receipt.vision.analysisText = analysisText;
    receipt.speech = activeRun.speech || receipt.speech;
    receipt.error = analysisText ? null : (isTimedOut ? visionResponse.error : "No analysis text returned.");
    receipt.endedAt = new Date().toISOString();
    activeRun.receiptPath = saveReceipt(runRoot, receipt);

    return {
      ok: Boolean(analysisText),
      bridge: "leeway_camera_bridge",
      status: analysisText ? "analyzed" : (isTimedOut ? "partial" : "fail"),
      runRoot,
      snapshotPath,
      snapshotBytes: imageBytes.length,
      visionBackend: String(payload.visionBackend || visionBackend),
      responseMode: "vision_model_completion",
      selectedBackend: String(payload.visionBackend || visionBackend),
      fallbackUsed: false,
      timeout: hasTimeoutText,
      analysisText,
      speech: activeRun.speech || { spoken: false, runRoot: "", file: "", playback: {} },
      receiptPath: activeRun.receiptPath
    };
  }

  async function stop(payload = {}) {
    const state = await getPageState();
    try {
      if (page && !page.isClosed()) {
        await page.evaluate(() => window.agentLeeCameraBridge.stopCamera()).catch(() => {});
        await page.close().catch(() => {});
      }
    } finally {
      try { await context?.close(); } catch {}
      try { await browser?.close(); } catch {}
      page = null;
      context = null;
      browser = null;
      lastStatus = "stopped";
    }

    if (activeRun?.runRoot && activeRun.receiptPath && fs.existsSync(activeRun.receiptPath)) {
      try {
        const receipt = JSON.parse(fs.readFileSync(activeRun.receiptPath, "utf8"));
        receipt.camera.cameraPermissionResult = activeRun.cameraPermissionResult || receipt.camera.cameraPermissionResult;
        receipt.ok = Boolean(receipt.analysisText ? true : receipt.ok);
        receipt.status = receipt.ok ? receipt.status : "FAIL";
        receipt.endedAt = new Date().toISOString();
        writeJson(activeRun.receiptPath, receipt);
      } catch {}
    }

    return {
      ok: true,
      bridge: "leeway_camera_bridge",
      status: "stopped",
      cameraPermissionResult: state.permissionResult || activeRun?.cameraPermissionResult || "unknown",
      runRoot: activeRun?.runRoot || null,
      receiptPath: activeRun?.receiptPath || null
    };
  }

  async function lookNow(payload = {}) {
    const opened = await open(payload);
    const snapshot = await captureSnapshot(payload);
    const analysis = await analyzeSnapshot(payload);
    const speech = analysis.speech || { spoken: false, runRoot: "", file: "", playback: {} };
    const stopped = payload.autoStop === false ? { ok: true, status: "not-stopped" } : await stop(payload);

    return {
      ok: Boolean(analysis.ok),
      runRoot: snapshot.runRoot || analysis.runRoot,
      snapshotPath: snapshot.snapshotPath,
      snapshotBytes: snapshot.snapshotBytes,
      visionBackend: analysis.visionBackend,
      analysisText: analysis.analysisText,
      speech,
      receiptPath: analysis.receiptPath || snapshot.receiptPath,
      cameraPermissionResult: snapshot.cameraPermissionResult || opened.permissionResult,
      stopped: stopped.status === "stopped"
    };
  }

  async function status() {
    const state = await getPageState();
    return {
      ok: true,
      bridge: "leeway_camera_bridge",
      cameraPermissionRequired: true,
      cameraPermissionResult: state.permissionResult || "unknown",
      cameraActive: Boolean(state.active),
      pageUrl: currentPageUrl(),
      serverPort,
      browserOpen: Boolean(browser),
      runRoot: activeRun?.runRoot || null,
      snapshotPath: activeRun?.snapshotPath || null,
      snapshotBytes: activeRun?.snapshotBytes || 0,
      visionBackend: activeRun?.visionBackend || visionBackend,
      receiptPath: activeRun?.receiptPath || null
    };
  }

  return {
    confirmToken: CAMERA_CONFIRM,
    status,
    open,
    snapshot: captureSnapshot,
    analyzeSnapshot,
    stop,
    lookNow,
    getCurrentPageUrl: currentPageUrl
  };
}
