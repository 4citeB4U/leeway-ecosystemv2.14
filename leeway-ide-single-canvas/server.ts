/**
 * LEEWAY_HEADER - DO NOT REMOVE
 *
 * REGION: RUNTIME
 * TAG: RUNTIME.FABRIC.AGENT_BRIDGE
 * PURPOSE: Leeway Runtime Fabric proxy for Agent Lee IDE chat and runtime commands.
 * DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
 */

import express from "express";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { getSkillRegistrySnapshot } from "./src/services/tooling/skillRegistry";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

type RuntimeBridgeConfig = {
  runtimeFabricUrl: string;
  localDeviceBridgeUrl: string | null;
  localDeviceBridgeConfigured: boolean;
  localDeviceBridgeApiKeyConfigured: boolean;
  endpoints: Record<string, string>;
};

const CANONICAL_AGENT_LEE_FINGERPRINT = "leeway.agent-lee.code-mode.canonical.supreme-agent-lead.v1";

function normalizePath(value: string | undefined, fallback: string): string {
  const candidate = (value || fallback).trim();
  return candidate.startsWith("/") ? candidate : `/${candidate}`;
}

function buildRuntimeBridgeConfig(): RuntimeBridgeConfig {
  return {
    runtimeFabricUrl: process.env.LEEWAY_RUNTIME_FABRIC_URL || "http://127.0.0.1:4001",
    localDeviceBridgeUrl: process.env.LOCAL_DEVICE_BRIDGE_URL || null,
    localDeviceBridgeConfigured: Boolean(process.env.LOCAL_DEVICE_BRIDGE_URL),
    localDeviceBridgeApiKeyConfigured: Boolean(process.env.LOCAL_DEVICE_BRIDGE_API_KEY),
    endpoints: {
      health: normalizePath(process.env.LEEWAY_RUNTIME_HEALTH_ENDPOINT, "/runtime/health"),
      runtimeStatus: normalizePath(process.env.LEEWAY_RUNTIME_STATUS_ENDPOINT, "/runtime/status"),
      terminalStatus: normalizePath(process.env.LEEWAY_OMNI_TERMINAL_STATUS_ENDPOINT, "/terminal/status"),
      terminalSessions: normalizePath(process.env.LEEWAY_TERMINAL_SESSIONS_ENDPOINT, "/terminal/sessions"),
      devices: normalizePath(process.env.LEEWAY_DEVICE_REGISTRY_ENDPOINT, "/devices"),
      wslStatus: normalizePath(process.env.LEEWAY_WSL_STATUS_ENDPOINT, "/device/wsl/status"),
      wslStart: normalizePath(process.env.LEEWAY_WSL_START_ENDPOINT, "/device/wsl/start"),
      deviceTags: normalizePath(process.env.LEEWAY_DEVICE_TAGS_ENDPOINT, "/device-tags"),
      protocols: normalizePath(process.env.LEEWAY_PROTOCOLS_ENDPOINT, "/protocols"),
      commandPlan: normalizePath(process.env.LEEWAY_COMMAND_PLAN_ENDPOINT, "/command/plan"),
      commandExecute: normalizePath(process.env.LEEWAY_COMMAND_EXECUTE_ENDPOINT, "/command/execute"),
      commandReceipts: normalizePath(process.env.LEEWAY_COMMAND_RECEIPTS_ENDPOINT, "/receipts/commands"),
      localWorkerStatus: normalizePath(process.env.LEEWAY_LOCAL_DEVICE_BRIDGE_STATUS_ENDPOINT, "/local-worker/status"),
    },
  };
}

function readIdentityFingerprint(payload: any): string | null {
  return (
    payload?.identityFingerprint ||
    payload?.canonicalCodeMode?.identityFingerprint ||
    payload?.canonicalAgentLee?.identityFingerprint ||
    payload?.canonicalProof?.expectedIdentityFingerprint ||
    null
  );
}

function readCanonicalField(payload: any, snakeKey: string, camelKey: string) {
  return payload?.[snakeKey] ?? payload?.[camelKey] ?? null;
}

function universeVisibleToRuntimeFabric(payload: any): boolean {
  const manifest = payload?.manifest || payload?.universe || payload?.coreMap?.universe?.manifest || null;
  const harness = manifest?.statefulResearchHarness || payload?.coreMap?.statefulResearchHarnessCopies || null;
  const skills = manifest?.searchPaths?.skills || payload?.coreMap?.activeSkillSearchPaths || [];
  const capabilities = manifest?.searchPaths?.capabilities || payload?.coreMap?.activeCapabilitySearchPaths || [];
  return Boolean(
    harness?.activeCopy &&
    skills.some((entry: any) => String(entry?.absolute || entry).includes("stateful-research-harness")) &&
    capabilities.some((entry: any) => String(entry?.absolute || entry).includes("capability-registry"))
  );
}

async function probeCanonicalAgentLee(runtimeFabricUrl: string) {
  try {
    const identityResponse = await fetch(`${runtimeFabricUrl}/agent-lee/identity`, { method: "GET" });
    const identity = await identityResponse.json().catch(() => ({}));
    const universeResponse = await fetch(`${runtimeFabricUrl}/agent-lee/universe`, { method: "GET" });
    const universe = await universeResponse.json().catch(() => ({}));

    const fingerprint = readIdentityFingerprint(identity);
    const agentMode = readCanonicalField(identity, "agent_mode", "agentMode");
    const role = readCanonicalField(identity, "role", "role");
    const instanceContract = readCanonicalField(identity, "instance_contract", "instanceContract");
    const canonical = Boolean(identity?.canonical ?? identity?.canonicalCodeMode?.canonical ?? identity?.canonicalProof?.canonical ?? false);
    const fingerprintMatches = fingerprint === CANONICAL_AGENT_LEE_FINGERPRINT;
    const universeVisible = universeVisibleToRuntimeFabric(universe);
    const ok = Boolean(
      identityResponse.ok &&
      universeResponse.ok &&
      canonical &&
      fingerprintMatches &&
      agentMode === "code-mode" &&
      role === "supreme-agent-lead" &&
      instanceContract === "canonical-agent-lee-code-mode" &&
      universeVisible
    );

    return {
      ok,
      status: ok ? "CANONICAL_AGENT_LEE_CONFIRMED" : "NON_CANONICAL_AGENT_LEE_DETECTED",
      expectedFingerprint: CANONICAL_AGENT_LEE_FINGERPRINT,
      fingerprint,
      fingerprintMatches,
      canonical,
      agentMode,
      role,
      instanceContract,
      universeVisible,
      identityStatus: identityResponse.status,
      universeStatus: universeResponse.status,
      identity,
      universe,
    };
  } catch (error: any) {
    return {
      ok: false,
      status: "NON_CANONICAL_AGENT_LEE_UNREACHABLE",
      expectedFingerprint: CANONICAL_AGENT_LEE_FINGERPRINT,
      fingerprint: null,
      fingerprintMatches: false,
      canonical: false,
      agentMode: null,
      role: null,
      instanceContract: null,
      universeVisible: false,
      identityStatus: 0,
      universeStatus: 0,
      identity: { error: error?.message || String(error) },
      universe: { error: error?.message || String(error) },
    };
  }
}

function splitPathAndQuery(fabricPath: string) {
  const [pathname, query = ""] = fabricPath.split("?");
  return { pathname: pathname || "/", query: query ? `?${query}` : "" };
}

function resolveRuntimeFabricPath(fabricPath: string, endpoints: RuntimeBridgeConfig["endpoints"]) {
  const { pathname, query } = splitPathAndQuery(fabricPath);
  const pathMap: Record<string, string> = {
    "/health": endpoints.health,
    "/runtime/status": endpoints.runtimeStatus,
    "/runtime/health": endpoints.health,
    "/terminal/status": endpoints.terminalStatus,
    "/terminal/sessions": endpoints.terminalSessions,
    "/devices": endpoints.devices,
    "/device/wsl/status": endpoints.wslStatus,
    "/device/wsl/start": endpoints.wslStart,
    "/device-tags": endpoints.deviceTags,
    "/protocols": endpoints.protocols,
    "/command/plan": endpoints.commandPlan,
    "/command/execute": endpoints.commandExecute,
    "/receipts/commands": endpoints.commandReceipts,
    "/local-worker/status": endpoints.localWorkerStatus,
  };
  return `${pathMap[pathname] || pathname}${query}`;
}

function requiredStatusForPath(fabricPath: string) {
  const { pathname } = splitPathAndQuery(fabricPath);
  if (pathname.startsWith("/terminal")) {
    return { status: "OMNI_TERMINAL_FABRIC_REQUIRED", error: "OMNI_TERMINAL_FABRIC_REQUIRED" };
  }
  if (pathname.startsWith("/devices") || pathname.startsWith("/device-tags") || pathname.startsWith("/device/local") || pathname.startsWith("/device/wsl") || pathname.startsWith("/local-worker")) {
    return { status: "LOCAL_DEVICE_BRIDGE_REQUIRED", error: "LOCAL_DEVICE_BRIDGE_REQUIRED" };
  }
  if (pathname.startsWith("/command/execute") || pathname.startsWith("/receipts/commands")) {
    return { status: "COMMAND_RECEIPT_REQUIRED", error: "COMMAND_RECEIPT_REQUIRED" };
  }
  if (pathname.startsWith("/command")) {
    return { status: "COMMAND_PLAN_REQUIRED", error: "COMMAND_PLAN_REQUIRED" };
  }
  if (pathname.startsWith("/protocols")) {
    return { status: "LOCAL_DEVICE_BRIDGE_REQUIRED", error: "LOCAL_DEVICE_BRIDGE_REQUIRED" };
  }
  return { status: "RUNTIME_FABRIC_UNREACHABLE", error: "LEEWAY_RUNTIME_FABRIC_UNREACHABLE" };
}

function readJsonFile(filePath: string): any {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function discoverInstalledSkills(): Array<{ id: string; name: string; source: string; purpose: string; enabled: boolean }> {
  const homeDir = process.env.USERPROFILE || process.env.HOME || process.cwd();
  const skillsDir = path.join(homeDir, ".agents", "skills");

  if (!fs.existsSync(skillsDir)) {
    return [];
  }

  return fs.readdirSync(skillsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({
      id: entry.name,
      name: entry.name,
      source: "local",
      purpose: `Built-in skill directory: ${entry.name}`,
      enabled: true,
    }));
}

function buildInternalToolingSnapshot() {
  const workspaceRegistry = readJsonFile(path.join(process.cwd(), "src", "agent-lee", "mcp", "mcp-registry.json"));
  const leewayRegistry = readJsonFile(path.join(process.cwd(), "src", "agent-lee", "mcp", "leeway-mcp-registry.json"));
  const workspaceTools = Array.isArray(workspaceRegistry?.tools) ? workspaceRegistry.tools : [];
  const leewayTools = Array.isArray(leewayRegistry?.tools) ? leewayRegistry.tools : [];

  const entries = [...workspaceTools, ...leewayTools]
    .filter(Boolean)
    .map((entry: any) => {
      if (typeof entry === "string") {
        return { id: entry, name: entry, category: "mcp", description: "Registered MCP capability", source: "workspace", enabled: true };
      }
      if (entry?.id || entry?.name) {
        return {
          id: entry.id || entry.name,
          name: entry.name || entry.id,
          category: entry.category || "mcp",
          description: entry.purpose || entry.description || "Registered MCP capability",
          source: entry.source || "workspace",
          enabled: Boolean(entry.enabled ?? true),
          route: entry.route,
          capabilities: Array.isArray(entry.tools) ? entry.tools : undefined,
        };
      }
      return null;
    })
    .filter(Boolean)
    .filter((entry: any, index: number, arr: any[]) => arr.findIndex((candidate: any) => candidate.id === entry.id) === index);

  return {
    generatedAt: new Date().toISOString(),
    mcpCount: entries.length,
    enabledCount: entries.filter((entry: any) => entry.enabled).length,
    entries,
  };
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 3000);
  const runtimeBridgeConfig = buildRuntimeBridgeConfig();
  const runtimeFabricUrl = runtimeBridgeConfig.runtimeFabricUrl;

  app.use(express.json({ limit: "25mb" }));

  const proxyRuntimeFabric = async (req: express.Request, res: express.Response, fabricPath: string) => {
    const resolvedFabricPath = resolveRuntimeFabricPath(fabricPath, runtimeBridgeConfig.endpoints);
    try {
      const method = req.method.toUpperCase();
      const response = await fetch(`${runtimeFabricUrl}${resolvedFabricPath}`, {
        method,
        headers: {
          "Content-Type": "application/json",
          "X-Leeway-Surface": "leeway-ide-single-canvas",
        },
        body: method === "GET" || method === "HEAD" ? undefined : JSON.stringify(req.body ?? {}),
      });

      const text = await response.text();
      if (!response.ok && response.status === 404) {
        const required = requiredStatusForPath(fabricPath);
        return res.status(503).json({
          ...required,
          details: `Runtime Fabric did not expose ${resolvedFabricPath}.`,
          requestedPath: fabricPath,
          resolvedPath: resolvedFabricPath,
        });
      }
      res.status(response.status).type(response.headers.get("content-type") || "application/json").send(text);
    } catch (error: any) {
      const required = requiredStatusForPath(fabricPath);
      res.status(503).json({
        ...required,
        details: error?.message || "Runtime Fabric request failed",
        requestedPath: fabricPath,
        resolvedPath: resolvedFabricPath,
      });
    }
  };

  app.get("/api/leeway/runtime-fabric/config", (_req, res) => {
    res.json({
      ...runtimeBridgeConfig,
      localDeviceBridgeApiKeyConfigured: runtimeBridgeConfig.localDeviceBridgeApiKeyConfigured,
    });
  });

  app.get("/api/leeway/tooling/registry", (_req, res) => {
    const tooling = buildInternalToolingSnapshot();
    const builtInSkills = getSkillRegistrySnapshot();
    const installedSkills = discoverInstalledSkills();
    const mergedSkills = [...builtInSkills, ...installedSkills]
      .filter(Boolean)
      .filter((entry: any, index: number, array: any[]) => array.findIndex((candidate: any) => candidate.id === entry.id) === index);

    res.json({
      ...tooling,
      skills: mergedSkills,
      skillCount: mergedSkills.length,
      enabledSkillCount: mergedSkills.filter((skill: any) => skill.enabled).length,
    });
  });

  app.get("/api/leeway/runtime-fabric/health", async (_req, res) => {
    const [runtimeHealth, canonicalProbe] = await Promise.all([
      (async () => {
        try {
          const response = await fetch(`${runtimeFabricUrl}/runtime/health`, { method: "GET" });
          const data = await response.json().catch(() => ({}));
          return { ok: response.ok, status: response.status, data };
        } catch (error: any) {
          return { ok: false, status: 0, data: { error: error?.message || String(error) } };
        }
      })(),
      probeCanonicalAgentLee(runtimeFabricUrl),
    ]);

    if (!runtimeHealth.ok) {
      return res.status(503).json({
        ok: false,
        status: "DEGRADED_RUNTIME_FABRIC_OFFLINE",
        runtimeFabricReachable: false,
        runtimeFabricStatus: runtimeHealth.status,
        agentLeeCanonical: false,
        expectedFingerprint: CANONICAL_AGENT_LEE_FINGERPRINT,
        identityFingerprint: null,
        agentMode: null,
        role: null,
        instanceContract: null,
        runtimeFabricHealth: runtimeHealth.data,
        canonicalAgentLee: canonicalProbe,
      });
    }

    const agentLeeCanonical = Boolean(canonicalProbe.ok);
    return res.status(200).json({
      ok: agentLeeCanonical,
      status: agentLeeCanonical ? "CANONICAL_RUNTIME_FABRIC_CONFIRMED" : "DEGRADED_NON_CANONICAL_AGENT_LEE",
      runtimeFabricReachable: true,
      runtimeFabricStatus: runtimeHealth.status,
      runtimeFabricHealth: runtimeHealth.data,
      agentLeeCanonical,
      expectedFingerprint: CANONICAL_AGENT_LEE_FINGERPRINT,
      identityFingerprint: canonicalProbe.fingerprint || runtimeHealth.data?.identityFingerprint || null,
      agentMode: canonicalProbe.agentMode,
      role: canonicalProbe.role,
      instanceContract: canonicalProbe.instanceContract,
      canonicalAgentLee: canonicalProbe,
    });
  });

  app.post("/api/leeway/runtime-fabric/agent-chat", async (req, res) => {
    try {
      const input = String(req.body?.input || req.body?.message || req.body?.prompt || "").trim();
      if (!input) {
        return res.status(400).json({
          ok: false,
          error: "AGENT_LEE_CHAT_INPUT_REQUIRED",
          message: "input field required",
        });
      }

      const canonicalProbe = await probeCanonicalAgentLee(runtimeFabricUrl);
      if (!canonicalProbe.ok) {
        return res.status(409).json({
          ok: false,
          error: "NON_CANONICAL_AGENT_LEE_DETECTED",
          message: "Runtime Fabric is reachable, but it is not proving the canonical Agent Lee fingerprint.",
          canonicalProbe,
        });
      }

      const response = await fetch(`${runtimeFabricUrl}/agent-lee/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Leeway-Surface": "leeway-ide-single-canvas" },
        body: JSON.stringify({
          input,
          mode: req.body?.mode || "chat",
          speak: Boolean(req.body?.speak),
        }),
      });

      const text = await response.text();
      res.status(response.status).type(response.headers.get("content-type") || "application/json").send(text);
    } catch (error: any) {
      res.status(503).json({
        error: "LEEWAY_RUNTIME_FABRIC_UNREACHABLE",
        text: "Agent Lee is waiting on the Leeway Runtime Fabric bridge. Start the runtime fabric or set LEEWAY_RUNTIME_FABRIC_URL.",
        details: error?.message || "Runtime fabric request failed",
      });
    }
  });

  app.post("/api/leeway/local-voice/agent-lee-capture", async (req, res) => {
    try {
      const response = await fetch("http://127.0.0.1:8765/api/local-voice/agent-lee-capture", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Leeway-Surface": "leeway-ide-single-canvas" },
        body: JSON.stringify(req.body ?? {}),
      });

      const text = await response.text();
      res.status(response.status).type(response.headers.get("content-type") || "application/json").send(text);
    } catch (error: any) {
      res.status(503).json({
        ok: false,
        error: "CEREBRAL_DAEMON_8765_UNREACHABLE",
        message: "Local voice capture needs CerebralDaemon on 127.0.0.1:8765.",
        details: error?.message || "CerebralDaemon voice route failed",
      });
    }
  });

  app.get("/api/leeway/device/local/status", async (req, res) => {
    await proxyRuntimeFabric(req, res, "/device/local/status");
  });

  app.get("/api/leeway/device/wsl/status", async (req, res) => {
    await proxyRuntimeFabric(req, res, "/device/wsl/status");
  });

  app.post("/api/leeway/device/wsl/start", async (req, res) => {
    await proxyRuntimeFabric(req, res, "/device/wsl/start");
  });

  app.get("/api/leeway/local-status", async (_req, res) => {
    const probe = async (label: string, url: string) => {
      try {
        const response = await fetch(url, { method: "GET" });
        const data = await response.json().catch(() => ({}));
        return { label, ok: response.ok, status: response.status, data };
      } catch (error: any) {
        return { label, ok: false, status: 0, data: { error: error?.message || String(error) } };
      }
    };

    const [agentLeeProof, fabric, router, desktop, ollama, cerebralDaemon, deviceLocal, terminalStatus, wslStatus] = await Promise.all([
      probeCanonicalAgentLee(runtimeFabricUrl),
      probe("Runtime Fabric 4001", `${runtimeFabricUrl}/runtime/health`),
      probe("Router 8080", "http://127.0.0.1:8080/health"),
      probe("Desktop 8091", "http://127.0.0.1:8091/runtime/status"),
      probe("Ollama 11434", "http://127.0.0.1:11434/api/tags"),
      probe("CerebralDaemon 8765", "http://127.0.0.1:8765/api/health"),
      probe("Local Device Fabric", `${runtimeFabricUrl}/device/local/status`),
      probe("Local Terminal Fabric", `${runtimeFabricUrl}/terminal/status`),
      probe("Ubuntu WSL", `${runtimeFabricUrl}/device/wsl/status`),
    ]);

    const agentLeeOk = agentLeeProof.ok;
    const routerValue = typeof router.data?.router === "string"
      ? router.data.router
      : router.ok ? "online" : "offline";

    const terminalStatusValue = typeof terminalStatus.data?.terminalFabric === "string"
      ? `Local Terminal Fabric: ${String(terminalStatus.data.terminalFabric).toLowerCase() === "online" ? "Online" : String(terminalStatus.data.terminalFabric)}`
      : terminalStatus.ok ? "Local Terminal Fabric: Online" : "Local Terminal Fabric: Offline";

    const powerShellValue = typeof deviceLocal.data?.powershell?.available === "boolean"
      ? (deviceLocal.data.powershell.available ? "available" : "missing")
      : "unknown";
    const powerShell7Value = typeof deviceLocal.data?.powershell7?.available === "boolean"
      ? (deviceLocal.data.powershell7.available ? "available" : "unavailable")
      : "unknown";
    const ubuntuStatus = wslStatus.data?.ubuntu || deviceLocal.data?.wsl?.ubuntu || {};
    const wslUbuntuValue = typeof ubuntuStatus?.installed === "boolean"
      ? (ubuntuStatus.installed ? (ubuntuStatus.running ? "running / healthy" : "installed / stopped") : "unavailable")
      : "unknown";
    const wslReceiptPath = wslStatus.data?.receiptPath || null;
    const overallOk = Boolean(agentLeeProof.ok && fabric.ok && router.ok && desktop.ok && ollama.ok && cerebralDaemon.ok);

    res.json({
      ok: overallOk,
      status: agentLeeProof.ok ? "CANONICAL_AGENT_LEE_ONLINE" : "DEGRADED_NON_CANONICAL_AGENT_LEE",
      canonicalAgentLee: agentLeeProof,
      services: [
        { label: "Agent Lee", value: agentLeeOk ? "canonical" : "degraded", ok: agentLeeOk, fingerprint: agentLeeProof.fingerprint, matchesFingerprint: agentLeeProof.fingerprintMatches },
        { label: "Runtime Fabric 4001", value: fabric.ok ? "online" : "offline", ok: fabric.ok },
        { label: "Router 8080", value: routerValue, ok: router.ok },
        { label: "Desktop 8091", value: desktop.ok ? "online" : "offline", ok: desktop.ok },
        { label: "Ollama 11434", value: ollama.ok ? "online" : "offline", ok: ollama.ok },
        { label: "CerebralDaemon 8765", value: cerebralDaemon.ok ? "online" : "offline", ok: cerebralDaemon.ok },
        { label: "Local Device Fabric", value: deviceLocal.ok ? "online" : "offline", ok: deviceLocal.ok },
        { label: "Local Terminal Fabric", value: terminalStatusValue, ok: terminalStatus.ok },
        { label: "Windows PowerShell", value: powerShellValue, ok: Boolean(deviceLocal.data?.powershell?.available) },
        { label: "PowerShell 7", value: powerShell7Value, ok: Boolean(deviceLocal.data?.powershell7?.available) },
        { label: "Ubuntu WSL", value: wslUbuntuValue, ok: Boolean(ubuntuStatus?.installed), running: Boolean(ubuntuStatus?.running), receiptPath: wslReceiptPath },
      ],
      raw: { agentLeeProof, fabric, router, desktop, ollama, cerebralDaemon, deviceLocal, terminalStatus, wslStatus },
    });
  });

  app.all("/api/leeway/runtime-fabric/*path", async (req, res) => {
    const fabricPath = req.originalUrl.replace("/api/leeway/runtime-fabric", "") || "/";
    await proxyRuntimeFabric(req, res, fabricPath);
  });

  if (process.env.NODE_ENV !== "production") {
    console.log("Starting Leeway IDE development server with Vite middleware...");
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    console.log("Starting Leeway IDE production server...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*path", (_req, res) => res.sendFile(path.join(distPath, "index.html")));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Leeway IDE running at http://0.0.0.0:${PORT}`);
    console.log(`Leeway Runtime Fabric target: ${runtimeFabricUrl}`);
    console.log(`Leeway Runtime status endpoint: ${runtimeBridgeConfig.endpoints.runtimeStatus}`);
    console.log(`Leeway Local Device Bridge configured: ${runtimeBridgeConfig.localDeviceBridgeConfigured ? "yes" : "no"}`);
  });
}

startServer();
