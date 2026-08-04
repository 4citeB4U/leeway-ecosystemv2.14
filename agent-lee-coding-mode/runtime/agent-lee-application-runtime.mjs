import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const AGENT_LEE_ROOT = path.resolve(__dirname, "..");
const WORKSPACE_ROOT = path.resolve(AGENT_LEE_ROOT, "..");
const ARCHIVE_ROOT = path.join(WORKSPACE_ROOT, "Archive");
const RECEIPT_DIR = path.join(ARCHIVE_ROOT, "receipts", "agent-lee-app-runtime");
const REGISTRY_PATH = path.join(__dirname, "agent-lee-application-registry.json");
const INVENTORY_PATH = path.join(__dirname, "agent-lee-application-inventory.json");
const DISCOVERY_SCRIPT_PATH = path.join(AGENT_LEE_ROOT, "tools", "discover-agent-lee-windows-apps.ps1");

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".bmp", ".webp"]);
const FALLBACK_REGISTRY = {
  registryId: "LEEWAY_AGENT_LEE_APPLICATION_REGISTRY_FALLBACK",
  version: "1.0.0",
  agentId: "agent-lee",
  authorityMode: "fallback",
  generatedAt: null,
  sourceOfTruth: "agent-lee-coding-mode/runtime/agent-lee-application-runtime.mjs",
  summary: { totalApps: 0, safeToAutoOpen: 0, requiresConfirmation: 0, shellAppIdBacked: 0, fileOpenCapable: 0 },
  apps: []
};

const ownedLaunches = new Map();

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
    const text = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

function writeJsonFile(filePath, payload) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf8");
  return payload;
}

function compactPath(value) {
  if (!value) return value;
  const resolved = path.resolve(value);
  if (resolved.startsWith(WORKSPACE_ROOT)) {
    return path.relative(WORKSPACE_ROOT, resolved).replace(/\\/g, "/");
  }
  return resolved;
}

function timestampForFile(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-");
}

function normaliseQuery(value) {
  return String(value || "").trim().toLowerCase();
}

function loadApplicationRegistry() {
  const registry = readJsonFile(REGISTRY_PATH, FALLBACK_REGISTRY);
  const apps = Array.isArray(registry?.apps) ? registry.apps : [];
  return {
    ...FALLBACK_REGISTRY,
    ...registry,
    apps
  };
}

function indexApplications(registry) {
  const byId = new Map();
  const byDisplayName = new Map();
  const byAlias = new Map();
  const byStartAppId = new Map();

  for (const record of registry.apps || []) {
    const appId = normaliseQuery(record.appId);
    if (appId) byId.set(appId, record);
    const displayName = normaliseQuery(record.displayName);
    if (displayName) byDisplayName.set(displayName, record);
    const startAppId = normaliseQuery(record.startAppId);
    if (startAppId) byStartAppId.set(startAppId, record);
    for (const alias of Array.isArray(record.aliases) ? record.aliases : []) {
      const normalized = normaliseQuery(alias);
      if (normalized) byAlias.set(normalized, record);
    }
  }

  return { byId, byDisplayName, byAlias, byStartAppId };
}

function findApplication(query, registry = loadApplicationRegistry()) {
  const normalized = normaliseQuery(query);
  if (!normalized) return null;
  const indexes = indexApplications(registry);
  return (
    indexes.byId.get(normalized) ||
    indexes.byDisplayName.get(normalized) ||
    indexes.byAlias.get(normalized) ||
    indexes.byStartAppId.get(normalized) ||
    (registry.apps || []).find((record) => normaliseQuery(record.displayName).includes(normalized)) ||
    null
  );
}

function createReceipt(action, payload = {}) {
  ensureDir(RECEIPT_DIR);
  const stamp = timestampForFile();
  const receiptPath = path.join(RECEIPT_DIR, `agent-lee-app-${action}-${stamp}-${crypto.randomBytes(3).toString("hex")}.json`);
  const receipt = {
    receiptId: `LEEWAY_RECEIPT::AGENT_LEE_APP_${action.toUpperCase()}`,
    action,
    workspaceRoot: WORKSPACE_ROOT,
    createdAt: new Date().toISOString(),
    ...payload
  };
  writeJsonFile(receiptPath, { ...receipt, receiptPath });
  return {
    receiptPath: compactPath(receiptPath),
    absoluteReceiptPath: receiptPath,
    receipt
  };
}

function recordLaunch(pid, payload) {
  if (!pid) return;
  ownedLaunches.set(String(pid), {
    pid,
    ...payload,
    trackedAt: new Date().toISOString()
  });
}

function spawnDetached(command, args = [], options = {}) {
  const child = spawn(command, args, {
    cwd: options.cwd || WORKSPACE_ROOT,
    detached: true,
    stdio: "ignore",
    windowsHide: true,
    shell: false
  });
  child.unref();
  recordLaunch(child.pid, {
    command,
    args,
    appId: options.appId || null,
    targetPath: options.targetPath || null
  });
  return child;
}

function launchCommandForRecord(record, args = []) {
  if (!record) return null;

  if (record.launchMethod === "uri") {
    return {
      command: "cmd.exe",
      args: ["/c", "start", "", record.uri || record.startAppId || ""]
    };
  }

  if (record.launchMethod === "shell-appid") {
    const shellTarget = record.shellTarget || record.startAppId || "";
    return {
      command: "explorer.exe",
      args: [shellTarget]
    };
  }

  return {
    command: record.executablePath,
    args: [...(Array.isArray(record.launchArgs) ? record.launchArgs : []), ...args]
  };
}

function launchApplication(appQuery, options = {}) {
  const registry = loadApplicationRegistry();
  const record = findApplication(appQuery, registry);
  const confirmationRequired = Boolean(record?.requiresConfirmation || record?.safeToAutoOpen === false);

  if (!record) {
    const receipt = createReceipt("launch-blocked", {
      ok: false,
      appQuery,
      status: "APP_NOT_FOUND",
      error: `Application not found: ${appQuery}`
    });
    return { ok: false, status: "APP_NOT_FOUND", receiptPath: receipt.receiptPath, receipt: receipt.receipt };
  }

  if (confirmationRequired && !options.confirm) {
    const receipt = createReceipt("launch-blocked", {
      ok: false,
      appQuery,
      appId: record.appId,
      displayName: record.displayName,
      status: "CONFIRMATION_REQUIRED",
      requiresConfirmation: true
    });
    return {
      ok: false,
      status: "CONFIRMATION_REQUIRED",
      app: record,
      receiptPath: receipt.receiptPath,
      receipt: receipt.receipt
    };
  }

  try {
    const plan = launchCommandForRecord(record, Array.isArray(options.args) ? options.args : []);
    if (!plan?.command) {
      throw new Error(`No launch plan available for ${record.displayName}`);
    }

    const child = spawnDetached(plan.command, plan.args, {
      cwd: options.cwd || WORKSPACE_ROOT,
      appId: record.appId
    });

    const receipt = createReceipt("launch", {
      ok: true,
      status: "LAUNCHED",
      appQuery,
      appId: record.appId,
      displayName: record.displayName,
      launchMethod: record.launchMethod,
      command: plan.command,
      args: plan.args,
      pid: child.pid,
      supportsFileOpen: Boolean(record.supportsFileOpen),
      confirmationRequired
    });

    return {
      ok: true,
      status: "LAUNCHED",
      app: record,
      command: plan.command,
      args: plan.args,
      pid: child.pid,
      receiptPath: receipt.receiptPath,
      receipt: receipt.receipt
    };
  } catch (error) {
    const receipt = createReceipt("launch-failed", {
      ok: false,
      appQuery,
      appId: record.appId,
      displayName: record.displayName,
      status: "EXECUTION_FAILED",
      error: String(error?.message || error)
    });
    return {
      ok: false,
      status: "EXECUTION_FAILED",
      app: record,
      error: String(error?.message || error),
      receiptPath: receipt.receiptPath,
      receipt: receipt.receipt
    };
  }
}

function openApplicationFile(filePath, options = {}) {
  const registry = loadApplicationRegistry();
  const targetPath = String(filePath || "").trim();
  const appQuery = String(options.appId || options.app || options.application || "").trim();
  const record = appQuery ? findApplication(appQuery, registry) : null;
  const resolvedPath = targetPath ? path.resolve(targetPath) : "";

  if (!targetPath) {
    const receipt = createReceipt("open-file-blocked", {
      ok: false,
      status: "NO_PATH_PROVIDED",
      error: "No file path provided"
    });
    return {
      ok: false,
      status: "NO_PATH_PROVIDED",
      receiptPath: receipt.receiptPath,
      receipt: receipt.receipt,
      previewPath: null,
      previewOpenAttempted: false,
      previewOpenSkippedReason: "no file path provided"
    };
  }

  if (!fs.existsSync(resolvedPath)) {
    const receipt = createReceipt("open-file-blocked", {
      ok: false,
      status: "PATH_NOT_FOUND",
      path: targetPath,
      resolvedPath,
      error: `Path not found: ${targetPath}`
    });
    return {
      ok: false,
      status: "PATH_NOT_FOUND",
      receiptPath: receipt.receiptPath,
      receipt: receipt.receipt,
      previewPath: resolvedPath,
      previewOpenAttempted: true,
      previewOpenSkippedReason: `path not found: ${targetPath}`
    };
  }

  if (fs.statSync(resolvedPath).isDirectory()) {
    if ((options.mode || "").toLowerCase() !== "explorer") {
      const receipt = createReceipt("open-file-blocked", {
        ok: false,
        status: "DIRECTORY_REQUIRES_EXPLORER",
        path: targetPath,
        resolvedPath,
        error: "Directory paths require explicit explorer mode"
      });
      return {
        ok: false,
        status: "DIRECTORY_REQUIRES_EXPLORER",
        receiptPath: receipt.receiptPath,
        receipt: receipt.receipt,
        previewPath: resolvedPath,
        previewOpenAttempted: true,
        previewOpenSkippedReason: "directory paths require explicit explorer mode"
      };
    }

    const launched = launchApplication("file-explorer", {
      confirm: true,
      args: [resolvedPath],
      cwd: options.cwd
    });
    return {
      ...launched,
      status: launched.ok ? "DIRECTORY_OPENED" : launched.status,
      previewPath: resolvedPath,
      previewOpenAttempted: true,
      previewOpenSkippedReason: launched.ok ? null : launched.error || "directory open failed"
    };
  }

  const ext = path.extname(resolvedPath).toLowerCase();
  if ((record?.displayName || "").toLowerCase() === "paint" && !IMAGE_EXTENSIONS.has(ext)) {
    const receipt = createReceipt("open-file-blocked", {
      ok: false,
      status: "PAINT_IMAGE_ONLY",
      path: targetPath,
      resolvedPath,
      error: "Paint only accepts real image files"
    });
    return {
      ok: false,
      status: "PAINT_IMAGE_ONLY",
      receiptPath: receipt.receiptPath,
      receipt: receipt.receipt,
      previewPath: resolvedPath,
      previewOpenAttempted: true,
      previewOpenSkippedReason: "paint requires a real image file"
    };
  }

  if (record && record.launchMethod === "path") {
    const launched = launchApplication(record.appId, {
      confirm: Boolean(options.confirm),
      args: [resolvedPath],
      cwd: options.cwd
    });
    return {
      ...launched,
      status: launched.ok ? "FILE_OPENED" : launched.status,
      previewPath: resolvedPath,
      previewOpenAttempted: true,
      previewOpenSkippedReason: launched.ok ? null : launched.error || "file open failed"
    };
  }

  try {
    const child = spawnDetached("cmd.exe", ["/c", "start", "", resolvedPath], {
      cwd: options.cwd || WORKSPACE_ROOT,
      appId: record?.appId || null,
      targetPath: resolvedPath
    });
    const receipt = createReceipt("open-file", {
      ok: true,
      status: "FILE_OPENED",
      path: targetPath,
      resolvedPath,
      appId: record?.appId || null,
      displayName: record?.displayName || null,
      pid: child.pid
    });
    return {
      ok: true,
      status: "FILE_OPENED",
      pid: child.pid,
      app: record,
      receiptPath: receipt.receiptPath,
      receipt: receipt.receipt,
      previewPath: resolvedPath,
      previewOpenAttempted: true,
      previewOpenSkippedReason: null
    };
  } catch (error) {
    const receipt = createReceipt("open-file-failed", {
      ok: false,
      status: "EXECUTION_FAILED",
      path: targetPath,
      resolvedPath,
      error: String(error?.message || error)
    });
    return {
      ok: false,
      status: "EXECUTION_FAILED",
      error: String(error?.message || error),
      receiptPath: receipt.receiptPath,
      receipt: receipt.receipt,
      previewPath: resolvedPath,
      previewOpenAttempted: true,
      previewOpenSkippedReason: String(error?.message || error)
    };
  }
}

function discoverApplications(options = {}) {
  const discoveryResult = {
    ok: true,
    status: "DISCOVERY_SKIPPED",
    registryPath: compactPath(REGISTRY_PATH),
    inventoryPath: compactPath(INVENTORY_PATH),
    scriptPath: compactPath(DISCOVERY_SCRIPT_PATH)
  };

  if (fs.existsSync(DISCOVERY_SCRIPT_PATH)) {
    const run = spawnSync("powershell.exe", ["-ExecutionPolicy", "Bypass", "-File", DISCOVERY_SCRIPT_PATH], {
      cwd: WORKSPACE_ROOT,
      encoding: "utf8",
      windowsHide: true
    });
    discoveryResult.ok = run.status === 0;
    discoveryResult.status = run.status === 0 ? "DISCOVERED" : "DISCOVERY_FAILED";
    discoveryResult.exitCode = run.status;
    discoveryResult.stdout = run.stdout || "";
    discoveryResult.stderr = run.stderr || "";
  }

  const registry = loadApplicationRegistry();
  const receipt = createReceipt("discover", {
    ...discoveryResult,
    ok: discoveryResult.ok,
    appCount: Array.isArray(registry.apps) ? registry.apps.length : 0,
    summary: registry.summary || null
  });

  return {
    ...discoveryResult,
    registry,
    receiptPath: receipt.receiptPath,
    receipt: receipt.receipt
  };
}

function getApplicationRegistryStatus() {
  const registry = loadApplicationRegistry();
  return {
    ok: true,
    registryId: registry.registryId,
    version: registry.version,
    agentId: registry.agentId,
    authorityMode: registry.authorityMode,
    generatedAt: registry.generatedAt,
    sourceOfTruth: registry.sourceOfTruth,
    registryPath: compactPath(REGISTRY_PATH),
    inventoryPath: compactPath(INVENTORY_PATH),
    appCount: Array.isArray(registry.apps) ? registry.apps.length : 0,
    summary: registry.summary || null,
    apps: listApplicationRecords()
  };
}

function listApplicationRecords() {
  const registry = loadApplicationRegistry();
  return (registry.apps || []).map((record) => ({
    appId: record.appId,
    displayName: record.displayName,
    aliases: record.aliases || [],
    category: record.category || null,
    launchMethod: record.launchMethod || null,
    executablePath: record.executablePath || null,
    uri: record.uri || null,
    startAppId: record.startAppId || null,
    safeToAutoOpen: Boolean(record.safeToAutoOpen),
    requiresConfirmation: Boolean(record.requiresConfirmation),
    supportsFileOpen: Boolean(record.supportsFileOpen),
    supportedFileExtensions: Array.isArray(record.supportedFileExtensions) ? record.supportedFileExtensions : [],
    notes: record.notes || null
  }));
}

function closeOwnedApplications() {
  const results = [];
  for (const [pid, launch] of ownedLaunches.entries()) {
    try {
      const killed = spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], {
        encoding: "utf8",
        windowsHide: true
      });
      results.push({
        pid: Number(pid),
        appId: launch.appId || null,
        ok: killed.status === 0,
        exitCode: killed.status,
        stdout: killed.stdout || "",
        stderr: killed.stderr || ""
      });
      ownedLaunches.delete(pid);
    } catch (error) {
      results.push({
        pid: Number(pid),
        appId: launch.appId || null,
        ok: false,
        error: String(error?.message || error)
      });
    }
  }

  const receipt = createReceipt("close-owned", {
    ok: true,
    status: "CLOSED",
    closed: results
  });

  return {
    ok: true,
    status: "CLOSED",
    closed: results,
    receiptPath: receipt.receiptPath,
    receipt: receipt.receipt
  };
}

function listApplicationReceipts() {
  if (!fs.existsSync(RECEIPT_DIR)) {
    return [];
  }

  return fs.readdirSync(RECEIPT_DIR)
    .filter((entry) => entry.toLowerCase().endsWith(".json"))
    .map((entry) => path.join(RECEIPT_DIR, entry))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)
    .slice(0, 50)
    .map((receiptPath) => ({
      receiptPath: compactPath(receiptPath),
      data: readJsonFile(receiptPath, null)
    }));
}

function isDirectRun() {
  return Boolean(process.argv[1]) && path.resolve(process.argv[1]) === __filename;
}

function parseArgs(argv) {
  const command = (argv[0] || "").trim();
  const options = {
    command,
    appId: null,
    path: null,
    mode: "",
    confirm: false
  };

  for (let index = 1; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--app" || value === "--app-id") options.appId = argv[index + 1];
    if (value === "--path") options.path = argv[index + 1];
    if (value === "--mode") options.mode = argv[index + 1];
    if (value === "--confirm") options.confirm = true;
  }

  return options;
}

if (isDirectRun()) {
  const args = parseArgs(process.argv.slice(2));
  let result = null;

  if (args.command === "discover") {
    result = discoverApplications({ confirm: args.confirm });
  } else if (args.command === "status") {
    result = getApplicationRegistryStatus();
  } else if (args.command === "launch") {
    result = launchApplication(args.appId, { confirm: args.confirm });
  } else if (args.command === "open-file") {
    result = openApplicationFile(args.path, { appId: args.appId, mode: args.mode, confirm: args.confirm });
  } else if (args.command === "close-owned") {
    result = closeOwnedApplications();
  } else if (args.command === "receipts") {
    result = { ok: true, receipts: listApplicationReceipts() };
  } else {
    result = {
      ok: false,
      error: "Usage: node agent-lee-application-runtime.mjs <discover|status|launch|open-file|close-owned|receipts>"
    };
  }

  console.log(JSON.stringify(result, null, 2));
  process.exit(result && result.ok ? 0 : 1);
}

export {
  DISCOVERY_SCRIPT_PATH,
  INVENTORY_PATH,
  REGISTRY_PATH,
  closeOwnedApplications,
  discoverApplications,
  findApplication,
  getApplicationRegistryStatus,
  launchApplication,
  listApplicationRecords,
  listApplicationReceipts,
  loadApplicationRegistry,
  openApplicationFile
};
