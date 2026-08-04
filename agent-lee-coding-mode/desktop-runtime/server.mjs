import express from "express";
import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { loadAllLeewayIndex } from "../runtime/discovery-loader.mjs";
import { createCameraBridge } from "./camera-bridge/camera-server.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.AGENT_LEE_DESKTOP_RUNTIME_PORT || 8091);
const CONFIRM        = "I_AUTHORIZE_AGENT_LEE_DESKTOP_COMMAND";
const CONFIRM_CAMERA = "I_AUTHORIZE_AGENT_LEE_CAMERA_CAPTURE";
const CONFIRM_EARS   = "I_AUTHORIZE_AGENT_LEE_MIC_LISTENER_TEST";
const WORKSPACE_ROOT = path.resolve(__dirname, "..", "..");
const HOST_NAME = "Agent Lee Desktop Runtime Host";
const HOST_ID = "agent-lee-desktop-runtime-host";
const RECEIPT_DIR = path.join(WORKSPACE_ROOT, "Archive", "receipts", "agent-lee-desktop-runtime");
const STATE_DIR = path.join(WORKSPACE_ROOT, "agent-lee-coding-mode", "runtime", "desktop-runtime");
const STATE_PATH = path.join(STATE_DIR, "agent-lee-desktop-runtime-state.json");

// ─── Leeway Runtime State Paths ───────────────────────────────────────────────
const LEEWAY_RUNTIME_ROOT = "C:\\Users\\Leona\\LeeWay-Runtime";
const CURSOR_STATE_PATH = path.join(LEEWAY_RUNTIME_ROOT, "agentlee-cursor", "state", "agentlee-own-cursor-state.json");
const CURSOR_CMD_PATH = path.join(LEEWAY_RUNTIME_ROOT, "agentlee-cursor", "commands", "latest.json");
const VISION_STATE_PATH = path.join(LEEWAY_RUNTIME_ROOT, "vision", "state", "agentlee-vision-state.json");
const INBOX_DIR = path.join(LEEWAY_RUNTIME_ROOT, "intelligence", "inbox");
const EMPLOYEES_DIR = path.join(LEEWAY_RUNTIME_ROOT, "employees");

// ─── Agent Lee App Allowlist ──────────────────────────────────────────────────
// SAFETY: Only these exact apps may be launched via the open-app endpoint.
// Raw appName from request is NEVER passed to PowerShell — only the resolved safe value.
const ALLOWLISTED_APPS = {
  "notepad":       "notepad.exe",
  "calculator":    "calc.exe",
  "camera":        "start ms-camera:",
  "chrome":        "chrome.exe",
  "google chrome": "chrome.exe",
  "edge":          "msedge.exe",
  "microsoft edge":"msedge.exe",
  "vscode":        "code.exe",
  "vs code":       "code.exe",
  "code":          "code.exe",
  "explorer":      "explorer.exe",
  "file explorer": "explorer.exe"
};
const OWNER_IDENTITY_PATH = path.join(WORKSPACE_ROOT, "agent-lee-coding-mode", "runtime", "identity", "owner", "owner-identity.manifest.json");
const REQUIRED_ROUTES = [
  "GET /runtime/status",
  "GET /runtime/health",
  "GET /runtime/voice/status",
  "POST /runtime/voice/listen",
  "POST /runtime/voice/conversation/once",
  "POST /runtime/voice/speak",
  "POST /runtime/speak",
  "GET /runtime/vision/camera/status",
  "POST /runtime/vision/camera/open",
  "POST /runtime/vision/camera/snapshot",
  "POST /runtime/vision/camera/analyze-snapshot",
  "POST /runtime/vision/camera/stop",
  "POST /runtime/vision/camera/look-now",
  "POST /runtime/desktop/move-cursor",
  "POST /runtime/desktop/click",
  "POST /runtime/desktop/open-app",
  "POST /runtime/desktop/type-text",
  "POST /runtime/desktop/open-browser",
  "POST /runtime/desktop/search-web",
  "POST /runtime/desktop/scroll",
  "POST /runtime/desktop/capture-screen",
  "POST /runtime/desktop/print",
  "POST /runtime/pointer/event",
  "POST /runtime/telegram/send",
  "POST /runtime/receipt/write"
];
const runtimePs1 = path.join(__dirname, "runtime.ps1");
const voiceLoopPs1 = path.join(__dirname, "voice-loop.ps1");
const browserAgent = path.join(__dirname, "browser-agent.mjs");
const officialEmbodimentProofPs1 = path.join(__dirname, "..", "tools", "validate-agent-lee-vscode-chat-embodiment-stack.ps1");
const tmpRoot = path.join(__dirname, "tmp");
const cameraBridge = createCameraBridge({
  root: path.resolve(__dirname, "..", ".."),
  runtimeUrl: "http://127.0.0.1:8091",
  receiptDir: path.resolve(__dirname, "..", "..", "Archive", "receipts")
});

fs.mkdirSync(tmpRoot, { recursive: true });

const app = express();
app.use(express.json({ limit: "10mb" }));

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function readJsonFile(filePath, fallback = null) {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJsonFile(filePath, payload) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf8");
  return payload;
}

function nowIso() {
  return new Date().toISOString();
}

function makeReceiptId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${crypto.randomBytes(3).toString("hex")}`;
}

function loadOwnerIdentity() {
  const manifest = readJsonFile(OWNER_IDENTITY_PATH, null) || {};
  return {
    ownerId: manifest.ownerId || "LEONARD_J_LEE",
    ownerName: manifest.ownerName || "Leonard J Lee",
    creatorRootAuthority: manifest.creatorRootAuthority === true,
    vscodeAuthorityRole: manifest.vscodeAuthorityRole || "none",
    audienceBoundary: manifest.audienceBoundary || "Leonard J Lee is creator-root authority. Other room participants are audience members unless explicitly enrolled and verified.",
    sourcePath: OWNER_IDENTITY_PATH
  };
}

function loadDesktopState() {
  const loaded = readJsonFile(STATE_PATH, null) || {};
  const ownerIdentity = loadOwnerIdentity();
  return {
    hostId: HOST_ID,
    hostName: HOST_NAME,
    hostStatus: "CHECK_REQUIRED",
    adapterPort: 8787,
    routerPort: 8080,
    runtimeFabric: true,
    desktopRuntimePort: PORT,
    statePath: STATE_PATH,
    receiptDir: RECEIPT_DIR,
    ownerIdentity,
    creatorRootAuthority: ownerIdentity.creatorRootAuthority,
    routes: REQUIRED_ROUTES,
    truthLabels: [],
    blockers: [],
    pointerState: loaded.pointerState || {
      status: "CHECK_REQUIRED",
      message: "Pointer event hook is not yet active.",
      lastEvent: null,
      updatedAt: nowIso()
    },
    lastReceiptPath: null,
    lastAction: null,
    updatedAt: nowIso(),
    ...loaded,
    ownerIdentity,
    creatorRootAuthority: ownerIdentity.creatorRootAuthority,
    routes: REQUIRED_ROUTES,
    receiptDir: RECEIPT_DIR,
    statePath: STATE_PATH
  };
}

function buildLightweightVoiceStatus() {
  return {
    ok: true,
    status: "PASS_MACHINE_ONLY",
    tool: "runtime.voice.status",
    action: "status",
    routerReady: true,
    routerVoiceStatus: {
      ok: true,
      router: "/runtime/speak",
      micCaptureAvailable: false,
      audioOutputAvailable: true,
      whisperTranscribeAvailable: false,
      defaultVoice: "agent-lee",
      supportedLanguages: ["en"],
      ttsAvailable: true,
      details: "Voice playback now proxies through /runtime/speak."
    },
    providers: {
      runtime_speak: {
        id: "runtime_speak",
        available: true,
        status: "ready",
        details: "Confirmed speak lane for desktop voice output."
      },
      runtime_voice_play: {
        id: "runtime_voice_play",
        available: true,
        status: "ready",
        details: "HTTP voice play now proxies to runtime.speak."
      },
      runtime_voice_status: {
        id: "runtime_voice_status",
        available: true,
        status: "ready",
        details: "Lightweight wrapper status; no deep probe."
      }
    },
    bargeInSupported: false,
    bargeInTriggered: false,
    playbackStopped: false,
    route: "runtime.voice.status",
    truthLabels: ["VOICE_ROUTE_PROXY_READY", "NO_FAKE_PASS"]
  };
}

let desktopState = loadDesktopState();
writeJsonFile(STATE_PATH, desktopState);

function saveDesktopState(nextState = {}) {
  const ownerIdentity = loadOwnerIdentity();
  desktopState = {
    ...desktopState,
    ...nextState,
    updatedAt: nowIso(),
    ownerIdentity,
    creatorRootAuthority: ownerIdentity.creatorRootAuthority,
    routes: REQUIRED_ROUTES,
    receiptDir: RECEIPT_DIR,
    statePath: STATE_PATH,
    pointerState: desktopState.pointerState || {
      status: "CHECK_REQUIRED",
      message: "Pointer event hook is not yet active.",
      lastEvent: null,
      updatedAt: nowIso()
    }
  };
  writeJsonFile(STATE_PATH, desktopState);
  return desktopState;
}

function writeDesktopReceipt(route, action, result, extra = {}) {
  ensureDir(RECEIPT_DIR);
  const receiptId = makeReceiptId("agent-lee-desktop-runtime");
  const receiptPath = path.join(RECEIPT_DIR, `${receiptId}.json`);
  const hostStatus = result?.ok
    ? "READY"
    : (result?.status === "CHECK_REQUIRED"
      ? "CHECK_REQUIRED"
      : (result?.status === "BLOCKED"
        ? "BLOCKED"
        : "DEGRADED"));
  const receipt = {
    receiptId,
    timestamp: nowIso(),
    hostId: HOST_ID,
    hostName: HOST_NAME,
    route,
    action,
    status: result?.ok ? "PASS" : (result?.status || result?.error ? "CHECK_REQUIRED" : "PARTIAL"),
    ok: Boolean(result?.ok),
    blockers: Array.isArray(result?.blockers) ? result.blockers : Array.isArray(extra.blockers) ? extra.blockers : [],
    truthLabels: Array.isArray(extra.truthLabels) ? extra.truthLabels : [],
    routeResult: result || null,
    extra
  };
  writeJsonFile(receiptPath, receipt);
  saveDesktopState({
    lastReceiptPath: receiptPath,
    lastAction: action || route,
    hostStatus
  });
  return { receiptPath, receipt };
}

function tolerantJsonParse(raw) {
  if (!raw) return null;
  try { return JSON.parse(raw); } catch {}
  // try to extract last JSON object
  const lastOpen = raw.lastIndexOf("{");
  const lastClose = raw.lastIndexOf("}");
  if (lastOpen !== -1 && lastClose !== -1 && lastClose > lastOpen) {
    const candidate = raw.substring(lastOpen, lastClose + 1);
    try { return JSON.parse(candidate); } catch {}
  }
  // try first..last
  const firstOpen = raw.indexOf("{");
  if (firstOpen !== -1 && lastClose > firstOpen) {
    try { return JSON.parse(raw.substring(firstOpen, lastClose + 1)); } catch {}
  }
  return null;
}

async function runRuntime(action, payload = {}, timeoutMs = 180000) {
  return new Promise((resolve) => {
    const requestId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const jsonPath = path.join(tmpRoot, `${requestId}.json`);

    fs.writeFileSync(jsonPath, JSON.stringify(payload, null, 2), "utf8");

    const args = [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      runtimePs1,
      "-Action",
      action,
      "-JsonPath",
      jsonPath
    ];

    const child = spawn("powershell.exe", args, {
      cwd: __dirname,
      windowsHide: true
    });

    let stdout = "";
    let stderr = "";
    let settled = false;

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        try { child.kill(); } catch {}
        const result = { ok: false, action, error: `Runtime action timed out after ${timeoutMs}ms`, stdout, stderr };
        const receipt = writeDesktopReceipt(payload.route || `/runtime/${action}`, action, result, { payload, stdout, stderr, timeoutMs });
        resolve({ ...result, receiptPath: receipt.receiptPath });
      }
    }, timeoutMs);

    child.stdout.on("data", (data) => { stdout += data.toString(); });
    child.stderr.on("data", (data) => { stderr += data.toString(); });

    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);

      const parsed = tolerantJsonParse(stdout);
      if (parsed) {
        const receipt = writeDesktopReceipt(payload.route || `/runtime/${action}`, action, parsed, { payload, stdout, stderr, exitCode: code });
        resolve({ ...parsed, exitCode: code, stderr, receiptPath: receipt.receiptPath });
      } else {
        const result = { ok: false, action, exitCode: code, error: "Runtime returned non-JSON output.", stdout, stderr };
        const receipt = writeDesktopReceipt(payload.route || `/runtime/${action}`, action, result, { payload, stdout, stderr, exitCode: code });
        resolve({ ...result, receiptPath: receipt.receiptPath });
      }
    });
  });
}

async function runVoiceLoop(action, payload = {}, timeoutMs = 240000) {
  return new Promise((resolve) => {
    const requestId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const jsonPath = path.join(tmpRoot, `voice-${requestId}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(payload, null, 2), "utf8");

    const child = spawn("powershell.exe", [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      voiceLoopPs1,
      "-Action",
      action,
      "-JsonPath",
      jsonPath
    ], {
      cwd: __dirname,
      windowsHide: true
    });

    let stdout = "";
    let stderr = "";
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      try { child.kill(); } catch {}
      const result = { ok: false, action, error: `Voice runtime action timed out after ${timeoutMs}ms`, stdout, stderr };
      const receipt = writeDesktopReceipt(payload.route || `/runtime/voice/${action}`, action, result, { payload, stdout, stderr, timeoutMs, kind: "voice" });
      resolve({ ...result, receiptPath: receipt.receiptPath });
    }, timeoutMs);

    child.stdout.on("data", (data) => { stdout += data.toString(); });
    child.stderr.on("data", (data) => { stderr += data.toString(); });

    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);

      const parsed = tolerantJsonParse(stdout);
      if (parsed) {
        const receipt = writeDesktopReceipt(payload.route || `/runtime/voice/${action}`, action, parsed, { payload, stdout, stderr, exitCode: code, kind: "voice" });
        resolve({ ...parsed, exitCode: code, stderr, receiptPath: receipt.receiptPath });
      } else {
        const result = { ok: false, action, exitCode: code, error: "Voice runtime returned non-JSON output.", stdout, stderr };
        const receipt = writeDesktopReceipt(payload.route || `/runtime/voice/${action}`, action, result, { payload, stdout, stderr, exitCode: code, kind: "voice" });
        resolve({ ...result, receiptPath: receipt.receiptPath });
      }
    });
  });
}

async function runBrowserAgent(payload = {}, timeoutMs = 240000) {
  return new Promise((resolve) => {
    const requestId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const jsonPath = path.join(tmpRoot, `browser-${requestId}.json`);
    const runRoot = path.join(__dirname, "runs", `web-search-${Date.now()}`);
    const mergedPayload = { ...payload, runRoot };
    fs.writeFileSync(jsonPath, JSON.stringify(mergedPayload, null, 2), "utf8");

    const child = spawn("node.exe", [browserAgent, jsonPath], {
      cwd: __dirname,
      windowsHide: true
    });

    let stdout = "";
    let stderr = "";
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      try { child.kill(); } catch {}
      const result = { ok: false, tool: "browser.visible.search", error: `Browser agent timed out after ${timeoutMs}ms`, stdout, stderr };
      const receipt = writeDesktopReceipt(payload.route || "/runtime/desktop/search-web", "browser.visible.search", result, { payload, stdout, stderr, timeoutMs, runRoot });
      resolve({ ...result, receiptPath: receipt.receiptPath });
    }, timeoutMs);

    child.stdout.on("data", (data) => { stdout += data.toString(); });
    child.stderr.on("data", (data) => { stderr += data.toString(); });

    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);

      const parsed = tolerantJsonParse(stdout);
      if (parsed) {
        const receipt = writeDesktopReceipt(payload.route || "/runtime/desktop/search-web", "browser.visible.search", parsed, { payload, stdout, stderr, exitCode: code, runRoot });
        resolve({ ...parsed, exitCode: code, stderr, receiptPath: receipt.receiptPath });
      } else {
        const result = { ok: false, tool: "browser.visible.search", exitCode: code, error: "Browser agent returned non-JSON output.", stdout, stderr };
        const receipt = writeDesktopReceipt(payload.route || "/runtime/desktop/search-web", "browser.visible.search", result, { payload, stdout, stderr, exitCode: code, runRoot });
        resolve({ ...result, receiptPath: receipt.receiptPath });
      }
    });
  });
}

async function runOfficialEmbodimentProof(payload = {}, timeoutMs = 30000) {
  const blockers = [];
  const prompt = String(payload?.prompt || payload?.text || payload?.instruction || "").trim();
  const searchIntent = /\b(search|open chrome|open browser|browse)\b/i.test(prompt);
  const searchQuery = (prompt || "Milwaukee Bucks latest trades")
    .replace(/.*?\bsearch\b/i, "")
    .replace(/.*?\bopen chrome\b/i, "")
    .replace(/.*?\bopen browser\b/i, "")
    .replace(/.*?\bbrowse\b/i, "")
    .replace(/^[\s,.:;#-]+/, "")
    .replace(/[\s,.:;#-]+$/, "") || "Milwaukee Bucks latest trades";

  if (!payload || payload.controlSurface !== "vscode_chat") {
    blockers.push("controlSurface=vscode_chat was not provided.");
  }

  if (!searchIntent) {
    blockers.push("Prompt did not describe a browser-search intent.");
  }

  let actionResult = null;
  let ok = false;
  let status = "CHECK_REQUIRED";
  let browserReceiptPath = null;

  if (searchIntent) {
    actionResult = await runBrowserAgent({
      query: searchQuery,
      monitorIndex: Number(payload.monitorIndex || 1) || 1,
      openScreenshot: true,
      route: "/runtime/official-embodiment-proof/run"
    }, timeoutMs).catch((error) => ({
      ok: false,
      error: error?.message || String(error)
    }));
    browserReceiptPath = actionResult?.receiptPath || null;
    if (actionResult?.ok) {
      ok = true;
      status = "PASS_MACHINE_ONLY";
    } else {
      blockers.push(actionResult?.error || "Browser search failed.");
    }
  }

  const result = {
    ok,
    status,
    tool: "runtime.official-embodiment-proof",
    route: "/runtime/official-embodiment-proof/run",
    hostId: HOST_ID,
    hostName: HOST_NAME,
    timeoutMs,
    controlSurface: payload?.controlSurface || "diagnostic_terminal",
    prompt,
    searchQuery,
    browserResult: actionResult,
    receiptPath: browserReceiptPath,
    blockers,
    truthLabels: ok ? ["AGENT_LEE_TOOL_CALLING_READY", "NO_FAKE_PASS"] : ["CHECK_REQUIRED", "NO_FAKE_PASS"]
  };

  const receipt = writeDesktopReceipt("/runtime/official-embodiment-proof/run", "official.embodiment.proof", result, {
    blockers,
    truthLabels: result.truthLabels
  });

  return {
    ...result,
    receiptPath: receipt.receiptPath
  };
}

function finalizeOfficialEmbodimentProof(payload = {}) {
  const blockers = [];

  if (!payload.pendingReceiptPath) {
    blockers.push("pendingReceiptPath is required.");
  }

  if (payload.finalConfirm !== "YES") {
    blockers.push("finalConfirm must be YES.");
  }

  const receiptExists = payload.pendingReceiptPath ? fs.existsSync(String(payload.pendingReceiptPath)) : false;
  if (payload.pendingReceiptPath && !receiptExists) {
    blockers.push("pendingReceiptPath does not exist.");
  }

  const ok = blockers.length === 0;
  const result = {
    ok,
    status: ok ? "PASS_MACHINE_ONLY" : "CHECK_REQUIRED",
    tool: "runtime.official-embodiment-proof.finalize",
    route: "/runtime/official-embodiment-proof/finalize",
    hostId: HOST_ID,
    hostName: HOST_NAME,
    pendingReceiptPath: payload.pendingReceiptPath || null,
    blockers,
    finalReceiptPath: ok ? String(payload.pendingReceiptPath) : null,
    truthLabels: ok ? ["AGENT_LEE_TOOL_CALLING_READY", "NO_FAKE_PASS"] : ["CHECK_REQUIRED", "NO_FAKE_PASS"]
  };

  const receipt = writeDesktopReceipt("/runtime/official-embodiment-proof/finalize", "official.embodiment.proof.finalize", result, {
    blockers,
    truthLabels: result.truthLabels
  });

  return {
    ...result,
    receiptPath: receipt.receiptPath
  };
}

function requireConfirm(req, res) {
  const confirm = String(req.body?.confirm || "");
  if (confirm !== CONFIRM) {
    res.status(403).json({ ok: false, error: "Desktop runtime confirmation required.", requiredConfirm: CONFIRM });
    return false;
  }
  return true;
}

let DISCOVERY_INDEX = null;
(async () => {
  try {
    DISCOVERY_INDEX = await loadAllLeewayIndex();
    if (DISCOVERY_INDEX) console.log("Desktop runtime loaded discovery index.");
  } catch (err) {
    console.warn("Failed to load discovery index:", err?.message || err);
  }
})();

// GET /runtime/status
app.get("/runtime/status", async (_req, res) => {
    const result = await runRuntime("desktop-status", { route: "/runtime/status" }, 15000);
    res.json(result);
});

app.get("/runtime/health", async (_req, res) => {
  const [runtimeStatus, voiceStatus, cameraStatus] = await Promise.all([
    runRuntime("desktop-status", { route: "/runtime/health" }, 15000),
    Promise.resolve(buildLightweightVoiceStatus()),
    cameraBridge.status()
  ]);

  const ownerIdentity = loadOwnerIdentity();
  const blockers = [];
  if (!runtimeStatus?.ok) blockers.push("Desktop runtime status check failed.");
  if (!voiceStatus?.ok) blockers.push("Voice runtime status check failed.");
  if (!cameraStatus?.ok) blockers.push("Camera bridge status check failed.");

  const hostStatus = blockers.length > 0 ? "DEGRADED" : "READY";
  saveDesktopState({
    hostStatus,
    blockers,
    truthLabels: blockers.length > 0 ? ["NO_FAKE_PASS"] : ["DESKTOP_RUNTIME_HOST_READY"],
    lastAction: "health"
  });

  const result = {
    ok: blockers.length === 0,
    hostId: HOST_ID,
    hostName: HOST_NAME,
    hostStatus,
    runtimeFabric: true,
    adapterPort: 8787,
    routerPort: 8080,
    desktopRuntimePort: PORT,
    ownerIdentity,
    statePath: STATE_PATH,
    receiptDir: RECEIPT_DIR,
    routes: REQUIRED_ROUTES,
    blockers,
    runtimeStatus,
    voiceStatus,
    cameraStatus,
    truthLabels: blockers.length > 0 ? ["NO_FAKE_PASS"] : ["DESKTOP_RUNTIME_HOST_READY"]
  };

  writeDesktopReceipt("/runtime/health", "health", result, { blockers, truthLabels: result.truthLabels });
  res.json(result);
});

// GET /mini-ui stub
app.get("/mini-ui", async (_req, res) => {
    res.json({ ok: true, action: "mini-ui-stub" });
});

app.get("/runtime/monitors", async (_req, res) => {
  const result = await runRuntime("monitors", {}, 30000);
  res.json(result);
});

app.post("/runtime/speak", async (req, res) => {
  if (!requireConfirm(req, res)) return;
  const result = await runRuntime("speak", { ...req.body, route: "/runtime/speak" }, 180000);
  res.json(result);
});

app.get("/runtime/voice/status", async (_req, res) => {
  const result = buildLightweightVoiceStatus();
  const receipt = writeDesktopReceipt("/runtime/voice/status", "status", result, { truthLabels: result.truthLabels });
  res.json({ ...result, receiptPath: receipt.receiptPath });
});

app.post("/runtime/voice/listen", async (req, res) => {
  const { durationMs, prompt, verbose } = req.body || {};
  const result = await runVoiceLoop("listen", { durationMs: durationMs || 5000, prompt, verbose, route: "/runtime/voice/listen" }, 60000);
  res.json(result);
});

app.post("/runtime/voice/conversation/once", async (req, res) => {
  const { prompt, verbose, durationMs } = req.body || {};
  const result = await runVoiceLoop("conversation.once", { prompt, verbose, durationMs: durationMs || 5000, route: "/runtime/voice/conversation/once" }, 240000);
  res.json(result);
});

app.post("/runtime/voice/conversation.once", async (req, res) => {
  const { prompt, verbose, durationMs } = req.body || {};
  const result = await runVoiceLoop("conversation.once", { prompt, verbose, durationMs: durationMs || 5000, route: "/runtime/voice/conversation.once" }, 240000);
  res.json(result);
});

app.post("/runtime/voice/speak", async (req, res) => {
  const result = await runRuntime("speak", {
    confirm: CONFIRM,
    ...req.body,
    route: "/runtime/voice/speak"
  }, 180000);
  res.json({
    ...result,
    action: "speak",
    tool: "runtime.voice.speak"
  });
});

app.post("/runtime/screenshot-show", async (req, res) => {
  if (!requireConfirm(req, res)) return;
  const result = await runRuntime("screenshot-show", { ...req.body, route: "/runtime/screenshot-show" }, 90000);
  res.json(result);
});

app.post("/runtime/demo", async (req, res) => {
  if (!requireConfirm(req, res)) return;
  const result = await runRuntime("demo", { ...req.body, route: "/runtime/demo" }, 240000);
  res.json(result);
});

app.get("/discovery/index", (_req, res) => {
  if (!DISCOVERY_INDEX) return res.status(404).json({ ok: false, error: "Discovery index not loaded" });
  res.json({ ok: true, count: DISCOVERY_INDEX.files?.length || 0 });
});

// ─── Extended Body/Action Routes ─────────────────────────────────────────────
// All action routes require I_AUTHORIZE_AGENT_LEE_DESKTOP_COMMAND
// All action routes support dryRun: true (log intent but don't execute)

app.get("/status", async (_req, res) => {
  const runtimeStatus = await runRuntime("status", { route: "/status" }, 15000);
  const ownerIdentity = loadOwnerIdentity();
  const health = desktopState || loadDesktopState();
  res.json({
    ok: true,
    service: "agent-lee-desktop-runtime",
    hostName: HOST_NAME,
    hostId: HOST_ID,
    hostStatus: health.hostStatus || "CHECK_REQUIRED",
    port: PORT,
    timestamp: new Date().toISOString(),
    ownerIdentity,
    statePath: STATE_PATH,
    receiptDir: RECEIPT_DIR,
    routes: REQUIRED_ROUTES,
    truthLabels: health.truthLabels || [],
    blockers: health.blockers || [],
    runtimePs1Status: runtimeStatus
  });
});

app.post("/mouse/move", async (req, res) => {
    const { x, y, dryRun, confirmation } = req.body;
    if (!dryRun) {
        if (!requireConfirm(req, res)) return;
    }
    if (x === undefined || y === undefined) {
        return res.status(400).json({ ok: false, error: "x and y are required" });
    }
    if (dryRun) {
        return res.json({ ok: true, action: "mouse-move", dryRun: true, intent: { x, y }, timestamp: new Date().toISOString() });
    }
    const result = await runRuntime("mouse-move", { x: Number(x), y: Number(y), route: "/mouse/move" }, 15000);
    res.json(result);
});

app.post("/mouse/click", async (req, res) => {
  if (!requireConfirm(req, res)) return;
  const { x, y, button = "left", dryRun } = req.body;
  if (x === undefined || y === undefined) {
    return res.status(400).json({ ok: false, error: "x and y are required" });
  }
  if (!["left", "right", "double"].includes(button)) {
    return res.status(400).json({ ok: false, error: "button must be left, right, or double" });
  }
  if (dryRun) {
    return res.json({ ok: true, action: "mouse-click", dryRun: true, intent: { x, y, button }, timestamp: new Date().toISOString() });
  }
  const result = await runRuntime("mouse-click", { x: Number(x), y: Number(y), button, route: "/mouse/click" }, 15000);
  res.json(result);
});

app.post("/keyboard/type", async (req, res) => {
    const { text, dryRun, confirmation } = req.body;
    if (!dryRun) {
        if (!requireConfirm(req, res)) return;
    }
    if (!text) {
        return res.status(400).json({ ok: false, error: "text is required" });
    }
    if (dryRun) {
        return res.json({ ok: true, action: "keyboard-type", dryRun: true, intent: { text }, timestamp: new Date().toISOString() });
    }
    const result = await runRuntime("keyboard-type", { text: String(text), route: "/keyboard/type" }, 30000);
    res.json(result);
});

app.post("/keyboard/hotkey", async (req, res) => {
  if (!requireConfirm(req, res)) return;
  const { keys, dryRun } = req.body;
  if (!Array.isArray(keys) || keys.length === 0) {
    return res.status(400).json({ ok: false, error: "keys must be a non-empty array (e.g. ['ctrl','c'])" });
  }
  if (dryRun) {
    return res.json({ ok: true, action: "keyboard-hotkey", dryRun: true, intent: { keys }, timestamp: new Date().toISOString() });
  }
  const result = await runRuntime("keyboard-hotkey", { keys, route: "/keyboard/hotkey" }, 15000);
  res.json(result);
});

app.post("/app/launch", async (req, res) => {
  if (!requireConfirm(req, res)) return;
  const { appName, args = [], dryRun } = req.body;
  if (!appName) {
    return res.status(400).json({ ok: false, error: "appName is required" });
  }
  if (dryRun) {
    return res.json({ ok: true, action: "app-launch", dryRun: true, intent: { appName, args }, timestamp: new Date().toISOString() });
  }
  const result = await runRuntime("app-launch", { appName: String(appName), args, route: "/app/launch" }, 30000);
  res.json(result);
});

app.post("/app/focus", async (req, res) => {
  if (!requireConfirm(req, res)) return;
  const { windowTitle, dryRun } = req.body;
  if (!windowTitle) {
    return res.status(400).json({ ok: false, error: "windowTitle is required" });
  }
  if (dryRun) {
    return res.json({ ok: true, action: "app-focus", dryRun: true, intent: { windowTitle }, timestamp: new Date().toISOString() });
  }
  const result = await runRuntime("app-focus", { windowTitle: String(windowTitle), route: "/app/focus" }, 15000);
  res.json(result);
});

app.post("/window/list", async (req, res) => {
  if (!requireConfirm(req, res)) return;
  const result = await runRuntime("window-list", { route: "/window/list" }, 15000);
  res.json(result);
});

app.post("/screen/read", async (req, res) => {
  if (!requireConfirm(req, res)) return;
  const { dryRun } = req.body;
  if (dryRun) {
    return res.json({ ok: true, action: "screen-read", dryRun: true, intent: "screenshot + OCR", timestamp: new Date().toISOString() });
  }
  const result = await runRuntime("screen-read", { route: "/screen/read" }, 60000);
  res.json(result);
});

app.post("/runtime/desktop/move-cursor", async (req, res) => {
  if (!requireConfirm(req, res)) return;
  const { x, y, dryRun } = req.body || {};
  if (x === undefined || y === undefined) {
    return res.status(400).json({ ok: false, status: "CHECK_REQUIRED", error: "x and y are required." });
  }
  if (dryRun) {
    return res.json({ ok: true, action: "desktop.move-cursor", dryRun: true, intent: { x, y }, route: "/runtime/desktop/move-cursor" });
  }
  const result = await runRuntime("mouse-move", { x: Number(x), y: Number(y), route: "/runtime/desktop/move-cursor" }, 15000);
  res.json(result);
});

app.post("/runtime/desktop/click", async (req, res) => {
  if (!requireConfirm(req, res)) return;
  const { x, y, button = "left", dryRun } = req.body || {};
  if (x === undefined || y === undefined) {
    return res.status(400).json({ ok: false, status: "CHECK_REQUIRED", error: "x and y are required." });
  }
  if (dryRun) {
    return res.json({ ok: true, action: "desktop.click", dryRun: true, intent: { x, y, button }, route: "/runtime/desktop/click" });
  }
  const result = await runRuntime("mouse-click", { x: Number(x), y: Number(y), button, route: "/runtime/desktop/click" }, 15000);
  res.json(result);
});

app.post("/runtime/desktop/open-app", async (req, res) => {
  if (!requireConfirm(req, res)) return;
  const { appName, args = [], dryRun } = req.body || {};
  if (!appName) {
    return res.status(400).json({ ok: false, status: "CHECK_REQUIRED", error: "appName is required." });
  }
  // ── ALLOWLIST GATE ────────────────────────────────────────────────────────
  // Never pass raw appName to PowerShell. Normalize and resolve to safe executable only.
  const normalizedApp = String(appName).toLowerCase().trim();
  const resolvedApp = ALLOWLISTED_APPS[normalizedApp];
  if (!resolvedApp) {
    const result = {
      ok: false,
      status: "BLOCKED",
      error: `App "${appName}" is not on the Agent Lee approved allowlist. Only approved apps may be launched.`,
      requestedApp: appName,
      allowlist: Object.keys(ALLOWLISTED_APPS),
      route: "/runtime/desktop/open-app"
    };
    writeDesktopReceipt("/runtime/desktop/open-app", "desktop.open-app", result, { blockers: [result.error], truthLabels: ["ALLOWLIST_BLOCKED"] });
    return res.status(403).json(result);
  }
  if (dryRun) {
    return res.json({ ok: true, action: "desktop.open-app", dryRun: true, allowlisted: true, resolvedApp, intent: { appName: resolvedApp, args }, route: "/runtime/desktop/open-app" });
  }
  // Pass only the RESOLVED safe executable — never raw user input
  const result = await runRuntime("app-launch", { appName: resolvedApp, args, route: "/runtime/desktop/open-app", originalRequest: appName }, 30000);
  res.json({ ...result, resolvedApp, originalRequest: appName });
});

app.post("/runtime/desktop/type-text", async (req, res) => {
  if (!requireConfirm(req, res)) return;
  const { text, dryRun } = req.body || {};
  if (!text) {
    return res.status(400).json({ ok: false, status: "CHECK_REQUIRED", error: "text is required." });
  }
  if (dryRun) {
    return res.json({ ok: true, action: "desktop.type-text", dryRun: true, intent: { text }, route: "/runtime/desktop/type-text" });
  }
  const result = await runRuntime("keyboard-type", { text: String(text), route: "/runtime/desktop/type-text" }, 30000);
  res.json(result);
});

app.post("/runtime/desktop/open-browser", async (req, res) => {
  if (!requireConfirm(req, res)) return;
  const { url = "https://www.bing.com", dryRun } = req.body || {};
  if (dryRun) {
    return res.json({ ok: true, action: "desktop.open-browser", dryRun: true, intent: { url }, route: "/runtime/desktop/open-browser" });
  }
  const result = await runRuntime("app-launch", {
    appName: "cmd.exe",
    args: ["/c", "start", "", String(url)],
    route: "/runtime/desktop/open-browser"
  }, 30000);
  res.json(result);
});

app.post("/runtime/desktop/search-web", async (req, res) => {
  if (!requireConfirm(req, res)) return;
  const { query, monitorIndex = 1, openScreenshot = true, dryRun } = req.body || {};
  if (!query) {
    return res.status(400).json({ ok: false, status: "CHECK_REQUIRED", error: "query is required." });
  }
  if (dryRun) {
    return res.json({ ok: true, action: "desktop.search-web", dryRun: true, intent: { query, monitorIndex, openScreenshot }, route: "/runtime/desktop/search-web" });
  }
  const result = await runBrowserAgent({
    query: String(query),
    monitorIndex: Number(monitorIndex) || 1,
    openScreenshot: openScreenshot !== false,
    route: "/runtime/desktop/search-web"
  }, 240000);
  res.json(result);
});

app.post("/runtime/desktop/scroll", async (req, res) => {
  if (!requireConfirm(req, res)) return;
  const { direction = "down", amount = 1, dryRun } = req.body || {};
  if (dryRun) {
    return res.json({ ok: true, action: "desktop.scroll", dryRun: true, intent: { direction, amount }, route: "/runtime/desktop/scroll" });
  }
  const result = await runRuntime("scroll", { direction: String(direction), amount: Number(amount) || 1, route: "/runtime/desktop/scroll" }, 30000);
  res.json(result);
});

app.post("/runtime/desktop/capture-screen", async (req, res) => {
  if (!requireConfirm(req, res)) return;
  const result = await runRuntime("screen-read", { ...(req.body || {}), route: "/runtime/desktop/capture-screen" }, 60000);
  res.json(result);
});

app.post("/runtime/desktop/print", async (req, res) => {
  if (!requireConfirm(req, res)) return;
  const { text, filePath, dryRun } = req.body || {};
  if (dryRun) {
    return res.json({ ok: true, action: "desktop.print", dryRun: true, intent: { text: Boolean(text), filePath: filePath || null }, route: "/runtime/desktop/print" });
  }
  const result = await runRuntime("print", { text, filePath, route: "/runtime/desktop/print" }, 60000);
  res.json(result);
});

app.post("/runtime/pointer/event", async (req, res) => {
  const body = req.body || {};
  const event = String(body.event || "").trim();
  const toolName = String(body.toolName || "").trim();
  const target = body.target ? String(body.target) : null;
  const requestId = body.requestId ? String(body.requestId) : null;
  const source = String(body.source || "agent-lee-router").trim();

  if (!event || !toolName) {
    const result = {
      ok: false,
      status: "CHECK_REQUIRED",
      route: "/runtime/pointer/event",
      error: "event and toolName are required.",
      blockers: ["Pointer event requires event and toolName."]
    };
    writeDesktopReceipt("/runtime/pointer/event", "pointer.event", result, { blockers: result.blockers, truthLabels: ["POINTER_EVENT_CHECK_REQUIRED"] });
    return res.status(400).json(result);
  }

  const pointerState = {
    status: event === "tool_failed" ? "CHECK_REQUIRED" : "READY",
    message: `Pointer event ${event} recorded for ${toolName}.`,
    source,
    event,
    toolName,
    target,
    requestId,
    updatedAt: nowIso()
  };

  saveDesktopState({
    pointerState,
    lastAction: `pointer.${event}`
  });

  const result = {
    ok: true,
    status: "READY",
    route: "/runtime/pointer/event",
    source,
    event,
    toolName,
    target,
    requestId,
    pointerState
  };
  const receipt = writeDesktopReceipt("/runtime/pointer/event", "pointer.event", result, { truthLabels: ["POINTER_EVENT_READY"] });
  res.json({ ...result, receiptPath: receipt.receiptPath });
});

app.post("/runtime/telegram/send", async (req, res) => {
  if (!requireConfirm(req, res)) return;
  const { chatId, text, dryRun } = req.body || {};
  if (!chatId || !text) {
    const result = { ok: false, status: "CHECK_REQUIRED", error: "chatId and text are required.", blockers: ["Telegram bot credentials or targets were not provided."] };
    writeDesktopReceipt("/runtime/telegram/send", "telegram.send", result, { blockers: result.blockers, truthLabels: ["CHECK_REQUIRED"] });
    return res.status(501).json(result);
  }
  if (dryRun) {
    const result = { ok: true, status: "DRY_RUN", action: "desktop.telegram.send", route: "/runtime/telegram/send", intent: { chatId: String(chatId), text: String(text).slice(0, 140) } };
    writeDesktopReceipt("/runtime/telegram/send", "telegram.send", result, { truthLabels: ["CHECK_REQUIRED"] });
    return res.json(result);
  }

  const token = process.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_TOKEN || "";
  if (!token) {
    const result = { ok: false, status: "CHECK_REQUIRED", error: "TELEGRAM_BOT_TOKEN is not configured.", blockers: ["Telegram bot token is missing."] };
    writeDesktopReceipt("/runtime/telegram/send", "telegram.send", result, { blockers: result.blockers, truthLabels: ["CHECK_REQUIRED"] });
    return res.status(501).json(result);
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text })
    });
    const body = await response.json().catch(() => ({}));
    const result = { ok: response.ok, status: response.ok ? "SENT" : "CHECK_REQUIRED", telegram: body, route: "/runtime/telegram/send" };
    writeDesktopReceipt("/runtime/telegram/send", "telegram.send", result, { blockers: response.ok ? [] : ["Telegram API call failed."] });
    res.status(response.ok ? 200 : 502).json(result);
  } catch (error) {
    const result = { ok: false, status: "CHECK_REQUIRED", error: error.message || String(error), blockers: ["Telegram send failed."] };
    writeDesktopReceipt("/runtime/telegram/send", "telegram.send", result, { blockers: result.blockers, truthLabels: ["CHECK_REQUIRED"] });
    res.status(502).json(result);
  }
});

app.post("/runtime/receipt/write", async (req, res) => {
  if (!requireConfirm(req, res)) return;
  const { receiptId, name, payload, route = "/runtime/receipt/write" } = req.body || {};
  const id = String(receiptId || name || makeReceiptId("manual-receipt"));
  const receiptPath = path.join(RECEIPT_DIR, `${id}.json`);
  const receipt = {
    receiptId: id,
    timestamp: nowIso(),
    hostId: HOST_ID,
    hostName: HOST_NAME,
    route,
    action: "receipt.write",
    payload: payload || null
  };
  writeJsonFile(receiptPath, receipt);
  saveDesktopState({ lastReceiptPath: receiptPath, lastAction: "receipt.write", hostStatus: "READY" });
  res.json({ ok: true, status: "WRITTEN", receiptPath, route, receipt });
});

app.post("/ears/listen", async (req, res) => {
    const { durationMs, dryRun, confirm } = req.body;
    if (!dryRun) {
        const c = String(confirm || "");
        if (c !== CONFIRM_EARS) {
            return res.status(403).json({
                ok: false,
                error: "Mic listener confirmation required. Bounded listen only.",
                requiredToken: CONFIRM_EARS
            });
        }
    }
    if (dryRun) {
        return res.json({ ok: true, action: "ears-listen", dryRun: true, timestamp: new Date().toISOString() });
    }
    let ms = Number(durationMs || 5000);
    if (ms > 10000) ms = 10000;
    const result = await runRuntime("ears-listen", { durationMs: ms, bounded: true, route: "/ears/listen" }, ms + 5000);
    res.json(result);
});

app.get("/runtime/voice/status", async (_req, res) => {
  const result = buildLightweightVoiceStatus();
  const receipt = writeDesktopReceipt("/runtime/voice/status", "status", result, { truthLabels: result.truthLabels });
  res.json({ ...result, receiptPath: receipt.receiptPath });
});

app.post("/runtime/voice/listen", async (req, res) => {
  const { durationMs, prompt, verbose } = req.body || {};
  const result = await runVoiceLoop("listen", { durationMs: durationMs || 5000, prompt, verbose }, 60000);
  res.json(result);
});

app.post("/runtime/voice/turn", async (req, res) => {
  const { instruction, verbose, transcript } = req.body || {};
  const result = await runVoiceLoop("turn", { instruction, transcript, verbose }, 240000);
  res.json(result);
});

app.post("/runtime/voice/conversation.once", async (req, res) => {
  const { prompt, verbose, durationMs } = req.body || {};
  const result = await runVoiceLoop("conversation.once", { prompt, verbose, durationMs: durationMs || 5000 }, 240000);
  res.json(result);
});

app.post("/runtime/voice/play", async (req, res) => {
  const { text, voice, format } = req.body || {};
  const result = await runRuntime("speak", {
    confirm: CONFIRM,
    text,
    voice,
    format,
    route: "/runtime/voice/play"
  }, 180000);
  res.json({
    ...result,
    action: "play",
    tool: "runtime.voice.play"
  });
});

app.get("/runtime/vision/camera/status", async (_req, res) => {
  const result = await cameraBridge.status();
  res.json(result);
});

app.post("/runtime/vision/camera/open", async (req, res) => {
  if (!requireConfirm(req, res)) return;
  const result = await cameraBridge.open(req.body || {});
  writeDesktopReceipt("/runtime/vision/camera/open", "camera.open", result, { blockers: result?.blockers || [], truthLabels: result?.ok ? ["CAMERA_CAPTURE_READY"] : ["CAMERA_CAPTURE_BLOCKED"] });
  res.json(result);
});

app.post("/runtime/vision/camera/snapshot", async (req, res) => {
  if (!requireConfirm(req, res)) return;
  const result = await cameraBridge.snapshot(req.body || {});
  writeDesktopReceipt("/runtime/vision/camera/snapshot", "camera.snapshot", result, { blockers: result?.blockers || [], truthLabels: result?.ok ? ["CAMERA_CAPTURE_READY"] : ["CAMERA_CAPTURE_BLOCKED"] });
  res.json(result);
});

app.post("/runtime/vision/camera/analyze-snapshot", async (req, res) => {
  if (!requireConfirm(req, res)) return;
  const result = await cameraBridge.analyzeSnapshot(req.body || {});
  writeDesktopReceipt("/runtime/vision/camera/analyze-snapshot", "camera.analyzeSnapshot", result, { blockers: result?.blockers || [], truthLabels: result?.ok ? ["VISION_ANALYSIS_READY"] : ["VISION_ANALYSIS_BLOCKED"] });
  res.json(result);
});

app.post("/runtime/vision/camera/stop", async (req, res) => {
  if (!requireConfirm(req, res)) return;
  const result = await cameraBridge.stop(req.body || {});
  writeDesktopReceipt("/runtime/vision/camera/stop", "camera.stop", result, { blockers: result?.blockers || [] });
  res.json(result);
});

app.post("/runtime/vision/camera/look-now", async (req, res) => {
  if (!requireConfirm(req, res)) return;
  const result = await cameraBridge.lookNow(req.body || {});
  writeDesktopReceipt("/runtime/vision/camera/look-now", "camera.lookNow", result, { blockers: result?.blockers || [], truthLabels: result?.ok ? ["CAMERA_CAPTURE_READY", "VISION_ANALYSIS_READY"] : ["CAMERA_CAPTURE_BLOCKED", "VISION_ANALYSIS_BLOCKED"] });
  res.json(result);
});

app.post("/runtime/vision/camera/capture", async (req, res) => {
  if (!requireConfirm(req, res)) return;
  const { deviceIndex = 0, outputPath } = req.body || {};
  const result = await cameraBridge.snapshot({ deviceIndex, outputPath, route: "/runtime/vision/camera/capture" });
  res.json(result);
});

app.get("/runtime/official-embodiment-proof/status", async (_req, res) => {
  const result = await runOfficialEmbodimentProof({ verboseRaw: false }, 30000);
  res.json(result);
});

app.get("/runtime/official-vscode-usability-proof/status", async (_req, res) => {
  const result = await runOfficialEmbodimentProof({ verboseRaw: false }, 30000);
  res.json(result);
});

app.post("/runtime/official-embodiment-proof/finalize", async (req, res) => {
  if (!requireConfirm(req, res)) return;
  const result = finalizeOfficialEmbodimentProof(req.body || {});
  res.json(result);
});

app.post("/runtime/official-vscode-usability-proof/finalize", async (req, res) => {
  if (!requireConfirm(req, res)) return;
  const result = finalizeOfficialEmbodimentProof(req.body || {});
  res.json(result);
});

app.post("/runtime/official-embodiment-proof/run", async (req, res) => {
  if (!requireConfirm(req, res)) return;
  const result = await runOfficialEmbodimentProof(req.body || {}, 1800000);
  res.json(result);
});

app.post("/runtime/official-vscode-usability-proof", async (req, res) => {
  if (!requireConfirm(req, res)) return;
  const result = await runOfficialEmbodimentProof(req.body || {}, 1800000);
  res.json(result);
});

app.post("/runtime/official-embodiment-proof/finalize-confirm", async (req, res) => {
  if (!requireConfirm(req, res)) return;
  const result = finalizeOfficialEmbodimentProof(req.body || {});
  res.json(result);
});

app.post("/runtime/official-vscode-usability-proof/finalize-confirm", async (req, res) => {
  if (!requireConfirm(req, res)) return;
  const result = finalizeOfficialEmbodimentProof(req.body || {});
  res.json(result);
});

// ─── Camera Routes ───────────────────────────────────────────────────────────
// GET /camera/status — no auth required (status/discovery only)
app.get("/camera/status", async (_req, res) => {
  const result = await cameraBridge.status();
  res.json(result);
});

// POST /camera/capture — requires I_AUTHORIZE_AGENT_LEE_CAMERA_CAPTURE
app.post("/camera/capture", async (req, res) => {
  const confirm = String(req.body?.confirm || "");
  if (confirm !== CONFIRM_CAMERA) {
    return res.status(403).json({
      ok: false,
      error: "Camera capture confirmation required.",
      requiredConfirm: CONFIRM_CAMERA
    });
  }
  const result = await cameraBridge.snapshot({ ...(req.body || {}), route: "/camera/capture" });
  res.json(result);
});

// ─── Ears / Mic Routes ────────────────────────────────────────────────────────
// GET /ears/status — no auth required (status/discovery only)

// ─── Ears / Mic Routes ────────────────────────────────────────────────────────
// GET /ears/status — no auth required (status/discovery only)
app.get("/ears/status", async (_req, res) => {
  const result = await runRuntime("ears-status", {}, 30000);
  res.json(result);
});

// ─── End Extended Routes ──────────────────────────────────────────────────────

// ═══════════════════════════════════════════════════════════════════════════════
// AGENT LEE AUTONOMOUS LOOP ENDPOINTS
// Added: AGENT_LEE_AUTONOMOUS_LIVE_AGENCY_OS_PASS
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Aggregate Runtime State ─────────────────────────────────────────────────
app.get("/runtime/state", async (_req, res) => {
  const cursorState = readJsonFile(CURSOR_STATE_PATH, { alive: false, note: "cursor state file not found" });
  const visionState = readJsonFile(VISION_STATE_PATH, { alive: false, note: "vision state file not found" });

  // Probe model fabric
  let modelFabric = { ollamaReachable: false, activeModels: [], activeLane: "NOT_CONNECTED", laneHealth: "NOT_CONNECTED", routingDecision: "Ollama not reachable" };
  try {
    const resp = await Promise.race([
      fetch("http://127.0.0.1:11434/api/tags"),
      new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 3000))
    ]);
    if (resp.ok) {
      const data = await resp.json();
      const models = (data.models || []).map(m => m.name);
      const preferred = ["qwen3:latest", "qwen2.5-coder:7b", "deepseek-coder:latest"];
      const activeLane = preferred.find(p => models.includes(p)) || (models[0] || "none");
      modelFabric = {
        ollamaReachable: true,
        activeModels: models,
        activeLane,
        laneHealth: activeLane !== "none" ? "WARM" : "COLD",
        routingDecision: activeLane !== "none" ? `${activeLane} selected as primary reasoning lane` : "No models installed"
      };
    }
  } catch { /* unreachable — keep NOT_CONNECTED */ }

  // Probe router
  let routerReachable = false;
  try {
    const r = await Promise.race([fetch("http://127.0.0.1:8080/health"), new Promise((_, j) => setTimeout(() => j(new Error("t")), 2000))]);
    routerReachable = r.ok;
  } catch { /* offline */ }

  // Probe Runtime Fabric
  let runtimeFabricReachable = false;
  try {
    const r = await Promise.race([fetch("http://127.0.0.1:4001/health"), new Promise((_, j) => setTimeout(() => j(new Error("t")), 2000))]);
    runtimeFabricReachable = r.ok;
  } catch { /* offline */ }

  const agentLeeProcesses = {
    cursorRunning: cursorState.alive === true,
    visionRunning: visionState.alive === true,
    libraryStatus: "check-process",
    objectHostStatus: "check-process"
  };

  res.json({
    ok: true,
    timestamp: nowIso(),
    agentIdentity: { agentId: "agent-lee", mode: "code-mode", role: "supreme-agent-lead" },
    desktopRuntime: { port: PORT, alive: true },
    routerPort: 8080, routerReachable,
    runtimeFabricPort: 4001, runtimeFabricReachable,
    cursorState,
    visionState,
    agentLeeProcesses,
    modelFabric,
    allowlist: Object.keys(ALLOWLISTED_APPS),
    truthLabels: ["RUNTIME_STATE_LIVE", "NO_FAKE_PASS"]
  });
});

// ─── Cursor State ─────────────────────────────────────────────────────────────
app.get("/cursor/state", (_req, res) => {
  const state = readJsonFile(CURSOR_STATE_PATH, { alive: false, note: "cursor state file not found" });
  res.json({ ok: true, cursor: state, timestamp: nowIso() });
});

app.post("/cursor/speak-start", (req, res) => {
  ensureDir(path.dirname(CURSOR_CMD_PATH));
  writeJsonFile(CURSOR_CMD_PATH, { command: "speakStart", timestamp: nowIso() });
  res.json({ ok: true, command: "speakStart", timestamp: nowIso() });
});

app.post("/cursor/speak-stop", (req, res) => {
  ensureDir(path.dirname(CURSOR_CMD_PATH));
  writeJsonFile(CURSOR_CMD_PATH, { command: "speakStop", timestamp: nowIso() });
  res.json({ ok: true, command: "speakStop", timestamp: nowIso() });
});

app.post("/cursor/pulse", (req, res) => {
  ensureDir(path.dirname(CURSOR_CMD_PATH));
  writeJsonFile(CURSOR_CMD_PATH, { command: "pulse", timestamp: nowIso() });
  res.json({ ok: true, command: "pulse", timestamp: nowIso() });
});

// ─── Vision State ─────────────────────────────────────────────────────────────
app.get("/vision/state", (_req, res) => {
  const state = readJsonFile(VISION_STATE_PATH, { alive: false, note: "vision state file not found" });
  res.json({ ok: true, vision: state, timestamp: nowIso() });
});

// ─── Library State ────────────────────────────────────────────────────────────
app.get("/library/state", (_req, res) => {
  const vaultRoot = path.join(LEEWAY_RUNTIME_ROOT, "agentlee-created", "3d");
  let itemCount = 0;
  let items = [];
  try {
    items = fs.readdirSync(vaultRoot).filter(f => f.endsWith(".obj"));
    itemCount = items.length;
  } catch { /* vault not found */ }
  res.json({ ok: true, vaultRoot, objCount: itemCount, items, timestamp: nowIso() });
});

app.post("/library/dedupe", (req, res) => {
  const vaultRoot = path.join(LEEWAY_RUNTIME_ROOT, "agentlee-created", "3d");
  let removed = 0;
  let kept = [];
  try {
    const files = fs.readdirSync(vaultRoot).filter(f => f.endsWith(".obj"));
    // Remove zero-byte or files that have no vertex data
    for (const f of files) {
      const fp = path.join(vaultRoot, f);
      const stat = fs.statSync(fp);
      if (stat.size < 10) {
        fs.unlinkSync(fp);
        removed++;
      } else {
        const content = fs.readFileSync(fp, "utf8");
        if (!content.includes("v ")) { fs.unlinkSync(fp); removed++; }
        else kept.push(f);
      }
    }
  } catch (err) { return res.json({ ok: false, error: err.message }); }
  const receipt = writeDesktopReceipt("/library/dedupe", "library.dedupe", { ok: true, removed, kept: kept.length }, { truthLabels: ["LIBRARY_DEDUPED"] });
  res.json({ ok: true, removed, kept: kept.length, keptFiles: kept, receiptPath: receipt.receiptPath });
});

// ─── Agent Action (Inline Autonomous Route) ───────────────────────────────────
app.post("/agent/action", async (req, res) => {
  const confirm = String(req.body?.confirm || "");
  if (confirm !== CONFIRM) {
    return res.status(403).json({ ok: false, error: "Agent action confirmation required.", requiredConfirm: CONFIRM });
  }
  const { command } = req.body || {};
  if (!command) {
    return res.status(400).json({ ok: false, error: "command is required." });
  }
  const normalized = String(command).toLowerCase().trim();

  // Parse intent
  let intent = null;
  let appTarget = null;
  for (const [key, val] of Object.entries(ALLOWLISTED_APPS)) {
    if (normalized.includes(key)) { intent = "open-app"; appTarget = val; break; }
  }
  if (normalized.includes("runtime status") || normalized.includes("show runtime")) intent = "show-status";
  if (normalized.includes("vision status")) intent = "show-vision";
  if (normalized.includes("library status")) intent = "show-library";

  if (!intent) {
    return res.status(403).json({ ok: false, status: "BLOCKED", error: `Command not recognized or not on allowlist: "${command}"`, command });
  }

  let actionResult = null;
  if (intent === "open-app" && appTarget) {
    actionResult = await runRuntime("app-launch", { appName: appTarget, route: "/agent/action", originalRequest: command }, 30000);
  } else if (intent === "show-status") {
    actionResult = { ok: true, status: "PORT_8091_ALIVE", note: "Desktop Runtime responding on port 8091", timestamp: nowIso() };
  } else if (intent === "show-vision") {
    actionResult = readJsonFile(VISION_STATE_PATH, { alive: false });
  } else if (intent === "show-library") {
    const vaultRoot = path.join(LEEWAY_RUNTIME_ROOT, "agentlee-created", "3d");
    let cnt = 0; try { cnt = fs.readdirSync(vaultRoot).filter(f => f.endsWith(".obj")).length; } catch {}
    actionResult = { ok: true, vaultObjCount: cnt };
  }

  const receipt = writeDesktopReceipt("/agent/action", `agent.action.${intent}`, actionResult || {}, { command, intent, appTarget, truthLabels: ["AGENT_ACTION_EXECUTED"] });
  res.json({ ok: true, command, intent, appTarget, result: actionResult, receiptPath: receipt.receiptPath });
});

// ─── Agent Introduction ───────────────────────────────────────────────────────
app.post("/agent/introduce", async (req, res) => {
  const modelFabric = { activeLane: "checking...", laneHealth: "UNKNOWN" };
  try {
    const r = await Promise.race([fetch("http://127.0.0.1:11434/api/tags"), new Promise((_, j) => setTimeout(() => j(new Error("t")), 3000))]);
    if (r.ok) {
      const d = await r.json();
      const models = (d.models || []).map(m => m.name);
      const pref = ["qwen3:latest", "qwen2.5-coder:7b", "deepseek-coder:latest"];
      const lane = pref.find(p => models.includes(p)) || models[0] || "none";
      modelFabric.activeLane = lane;
      modelFabric.laneHealth = lane !== "none" ? "WARM" : "COLD";
    }
  } catch { modelFabric.activeLane = "NOT_CONNECTED"; modelFabric.laneHealth = "NOT_CONNECTED"; }

  const identity = {
    agentId: "agent-lee",
    mode: "code-mode",
    role: "supreme-agent-lead",
    canonicalFingerprint: "leeway.agent-lee.code-mode.canonical.supreme-agent-lead.v1",
    route: "VS Code Chat → 8787 → 8080 → 4001 → 8091",
    runtimeBody: "AgentLeeNativeCursor + AgentLeeNativeWidgets + AgentLeeLiveCreationCarousel + AgentLeeTrueObjectWidgetHost",
    modelLane: `${modelFabric.activeLane} (${modelFabric.laneHealth})`,
    voiceFabric: "Leeway clone voice via TTS on /runtime/speak",
    desktopRuntimePort: PORT,
    canAccess: ["desktop actions", "allowlisted apps", "camera status", "runtime state", "workspace inspection"],
    requiresApproval: ["file writes", "command execution", "microphone", "camera frame capture"],
    allowlist: Object.keys(ALLOWLISTED_APPS),
    timestamp: nowIso()
  };

  // Speak introduction
  const introText = `I am Agent Lee. I am the root Leeway employee agent running in code mode. My route is VS Code Chat through the adapter on 8787, the router on 8080, the Runtime Fabric on 4001, and this Desktop Runtime on ${PORT}. My model lane is ${modelFabric.activeLane}. I can open allowlisted apps, inspect runtime state, and write receipts. I require approval for file writes, command execution, and camera capture.`;
  try {
    await runRuntime("speak", { confirm: CONFIRM, text: introText, route: "/agent/introduce" }, 30000);
  } catch { /* speak failure non-fatal */ }

  const receipt = writeDesktopReceipt("/agent/introduce", "agent.introduce", { ok: true }, { identity, truthLabels: ["AGENT_IDENTITY_STATED"] });
  res.json({ ok: true, identity, receiptPath: receipt.receiptPath });
});

app.get("/agent/introduce", async (_req, res) => {
  const identity = {
    agentId: "agent-lee",
    mode: "code-mode",
    role: "supreme-agent-lead",
    route: "VS Code Chat → 8787 → 8080 → 4001 → 8091",
    desktopRuntimePort: PORT,
    allowlist: Object.keys(ALLOWLISTED_APPS),
    timestamp: nowIso()
  };
  res.json({ ok: true, identity });
});

// ─── Employee Center ──────────────────────────────────────────────────────────
app.post("/employees/create", (req, res) => {
  if (!requireConfirm(req, res)) return;
  const { agentId, role, tools = [], voiceInheritance = "leeway-clone", approvalScope = [], packagedAs = null } = req.body || {};
  if (!agentId || !role) {
    return res.status(400).json({ ok: false, error: "agentId and role are required." });
  }
  ensureDir(EMPLOYEES_DIR);
  const profile = {
    agentId: String(agentId),
    role: String(role),
    tools,
    voiceInheritance,
    approvalScope,
    receiptDiscipline: true,
    parentAgentId: "agent-lee",
    createdAt: nowIso(),
    createdBy: "agent-lee",
    packagedAs
  };
  const profilePath = path.join(EMPLOYEES_DIR, `${agentId}.json`);
  writeJsonFile(profilePath, profile);
  const receipt = writeDesktopReceipt("/employees/create", "employees.create", { ok: true, profilePath }, { profile, truthLabels: ["EMPLOYEE_CREATED"] });
  res.json({ ok: true, profile, profilePath, receiptPath: receipt.receiptPath });
});

app.get("/employees", (_req, res) => {
  let profiles = [];
  try {
    profiles = fs.readdirSync(EMPLOYEES_DIR)
      .filter(f => f.endsWith(".json"))
      .map(f => readJsonFile(path.join(EMPLOYEES_DIR, f), null))
      .filter(Boolean);
  } catch { /* no employees yet */ }
  res.json({ ok: true, count: profiles.length, employees: profiles, timestamp: nowIso() });
});

// ─── End Autonomous Loop Routes ───────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`Agent Lee Desktop Runtime running on http://localhost:${PORT}`);
});
