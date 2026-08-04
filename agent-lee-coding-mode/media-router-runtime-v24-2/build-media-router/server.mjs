import http from "node:http";
import fs from "node:fs";
import os from "node:os";

const PORT = Number(process.env.LEEWAY_MEDIA_ROUTER_PORT || 5301);

const upstreams = {
  agentLee: process.env.LEEWAY_AGENT_LEE_URL || "http://agent-lee:8080",
  runtimeFabric: process.env.LEEWAY_RUNTIME_FABRIC_URL || "http://runtime-fabric:4001",
  mediaIngestion: process.env.LEEWAY_MEDIA_INGESTION_URL || "http://leeway-media-ingestion-layer:5300",
  agentCenter: process.env.LEEWAY_AGENT_CENTER_URL || "http://leeway-agent-center:8860",
  mcpAgentCenter: process.env.LEEWAY_MCP_AGENT_CENTER_URL || "http://leeway-mcp-agent-center:8861",
  workerCenter: process.env.LEEWAY_WORKER_CENTER_URL || "http://leeway-worker-center:8862",
  mcpCenter: process.env.LEEWAY_MCP_CENTER_URL || "http://leeway-mcp-center:8863"
};

const startedAt = new Date().toISOString();
let routeCount = 0;
let dispatchCount = 0;
let lastRoute = null;
let lastDispatch = null;

const routeRules = [
  {
    route: "video",
    triggers: ["video","movie","film","mp4","webm","avi","mov","mkv","frame","scene","clip"],
    mcp: "leeway-video-analysis-ingestion-mcp",
    workers: [
      "leeway-video-analysis-ingestion-mcp-execution-worker",
      "leeway-video-analysis-ingestion-mcp-audit-worker"
    ],
    targetAreas: ["runtime-fabric","vision-kernel","mcp-center","worker-center"]
  },
  {
    route: "audio",
    triggers: ["audio","sound","music","song","voice","mp3","wav","flac","ogg","m4a","aac"],
    mcp: "leeway-audio-analysis-ingestion-mcp",
    workers: [
      "leeway-audio-analysis-ingestion-mcp-execution-worker",
      "leeway-audio-analysis-ingestion-mcp-audit-worker"
    ],
    targetAreas: ["runtime-fabric","audio","creation-kernel","mcp-center","worker-center"]
  },
  {
    route: "document",
    triggers: ["pdf","document","docx","spreadsheet","excel","xlsx","csv","report","paper","book","text"],
    mcp: "leeway-document-media-ingestion-mcp",
    workers: [
      "leeway-document-media-ingestion-mcp-execution-worker",
      "leeway-document-media-ingestion-mcp-audit-worker"
    ],
    targetAreas: ["runtime-fabric","documents","creation-kernel","mcp-center","worker-center"]
  },
  {
    route: "general-media",
    triggers: ["media","upload","ingest","image","picture","photo","png","jpg","jpeg","gif","webp"],
    mcp: "leeway-media-ingestion-mcp",
    workers: [
      "leeway-media-ingestion-mcp-execution-worker",
      "leeway-media-ingestion-mcp-audit-worker"
    ],
    targetAreas: ["runtime-fabric","vision","creation","mcp-center","worker-center"]
  }
];

function sendJson(res, code, obj) {
  res.writeHead(code, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type"
  });
  res.end(JSON.stringify(obj, null, 2));
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 10 * 1024 * 1024) req.destroy();
    });
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        resolve({ raw: data });
      }
    });
  });
}

async function getJson(url, timeoutMs = 5000) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const r = await fetch(url, { signal: controller.signal });
    const text = await r.text();
    let body = null;
    try { body = text ? JSON.parse(text) : null; } catch { body = { raw: text }; }
    return { ok: r.ok, status: r.status, body };
  } catch (e) {
    return { ok: false, status: 0, error: String(e.message || e) };
  } finally {
    clearTimeout(t);
  }
}

async function postJson(url, payload, timeoutMs = 5000) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    const text = await r.text();
    let body = null;
    try { body = text ? JSON.parse(text) : null; } catch { body = { raw: text }; }
    return { ok: r.ok, status: r.status, body };
  } catch (e) {
    return { ok: false, status: 0, error: String(e.message || e) };
  } finally {
    clearTimeout(t);
  }
}

function stringifyTask(input) {
  return JSON.stringify(input || {}).toLowerCase();
}

function classify(input) {
  const text = stringifyTask(input);

  for (const rule of routeRules) {
    for (const t of rule.triggers) {
      if (text.includes(t.toLowerCase())) {
        return rule;
      }
    }
  }

  return {
    route: "general-media",
    triggers: [],
    mcp: "leeway-media-ingestion-mcp",
    workers: [
      "leeway-media-ingestion-mcp-execution-worker",
      "leeway-media-ingestion-mcp-audit-worker"
    ],
    targetAreas: ["runtime-fabric","vision","creation","mcp-center","worker-center"]
  };
}

function makePlan(input) {
  const rule = classify(input);

  return {
    schema: "leeway-media-route-plan-v24-2",
    createdAt: new Date().toISOString(),
    route: rule.route,
    selectedMcp: rule.mcp,
    selectedWorkers: rule.workers,
    targetAreas: rule.targetAreas,
    endpoints: {
      mediaIngestionHealth: `${upstreams.mediaIngestion}/media-ingestion/health`,
      mediaIngestionStatus: `${upstreams.mediaIngestion}/media-ingestion/status`,
      mediaIngestionUpload: `${upstreams.mediaIngestion}/media-ingestion/upload`,
      mcpCenterDispatch: `${upstreams.mcpCenter}/dispatch`,
      workerCenterDispatch: `${upstreams.workerCenter}/dispatch`,
      agentCenterDispatch: `${upstreams.agentCenter}/dispatch`
    },
    input,
    truthRule: "This is an autonomous route plan. Execution is delegated to the proper MCP, worker, and downstream service."
  };
}

function state() {
  return {
    schema: "leeway-media-router-state-v24-2",
    status: "READY",
    startedAt,
    uptimeSeconds: Math.round(process.uptime()),
    hostname: os.hostname(),
    routeCount,
    dispatchCount,
    lastRoute,
    lastDispatch,
    upstreams,
    routeRules
  };
}

async function buildHealth() {
  const checks = {
    mediaIngestionHealth: await getJson(`${upstreams.mediaIngestion}/media-ingestion/health`),
    mediaIngestionStatus: await getJson(`${upstreams.mediaIngestion}/media-ingestion/status`),
    agentCenter: await getJson(`${upstreams.agentCenter}/health`),
    mcpAgentCenter: await getJson(`${upstreams.mcpAgentCenter}/health`),
    workerCenter: await getJson(`${upstreams.workerCenter}/health`),
    mcpCenter: await getJson(`${upstreams.mcpCenter}/health`)
  };

  const ready = Object.values(checks).every((x) => x.ok === true);

  return {
    schema: "leeway-media-router-health-v24-2",
    status: ready ? "READY" : "DEGRADED",
    ready,
    centerId: "leeway-media-router",
    port: PORT,
    checks
  };
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-allow-headers": "content-type"
    });
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;

  if (path === "/") {
    return sendJson(res, 200, {
      service: "Leeway Media Router",
      status: "READY",
      dispatch: "/dispatch",
      route: "/route",
      routes: "/routes",
      health: "/health"
    });
  }

  if (path === "/health") {
    return sendJson(res, 200, await buildHealth());
  }

  if (path === "/state") {
    return sendJson(res, 200, state());
  }

  if (path === "/routes") {
    return sendJson(res, 200, {
      schema: "leeway-media-router-routes-v24-2",
      routeRules,
      upstreams
    });
  }

  if (path === "/route" && req.method === "POST") {
    const body = await readBody(req);
    const plan = makePlan(body);
    routeCount += 1;
    lastRoute = plan;
    return sendJson(res, 200, plan);
  }

  if (path === "/dispatch" && req.method === "POST") {
    const body = await readBody(req);
    const plan = makePlan(body);

    const dispatchPayload = {
      schema: "leeway-media-router-dispatch-v24-2",
      receivedAt: new Date().toISOString(),
      source: "leeway-media-router",
      requestedBy: body.requestedBy || "agent-lee",
      plan
    };

    const mediaHealth = await getJson(`${upstreams.mediaIngestion}/media-ingestion/health`);
    const mediaStatus = await getJson(`${upstreams.mediaIngestion}/media-ingestion/status`);

    const mcpDispatch = await postJson(`${upstreams.mcpCenter}/dispatch`, {
      type: "mcp-dispatch",
      selectedMcp: plan.selectedMcp,
      plan
    });

    const workerDispatch = await postJson(`${upstreams.workerCenter}/dispatch`, {
      type: "worker-dispatch",
      selectedWorkers: plan.selectedWorkers,
      plan
    });

    dispatchCount += 1;
    lastDispatch = {
      completedAt: new Date().toISOString(),
      plan,
      mediaHealth,
      mediaStatus,
      mcpDispatch,
      workerDispatch
    };

    return sendJson(res, 202, {
      schema: "leeway-media-router-dispatch-result-v24-2",
      status: "MEDIA_ROUTE_DISPATCHED",
      route: plan.route,
      selectedMcp: plan.selectedMcp,
      selectedWorkers: plan.selectedWorkers,
      mediaIngestion: {
        health: mediaHealth,
        status: mediaStatus
      },
      centerDispatch: {
        mcpCenter: mcpDispatch,
        workerCenter: workerDispatch
      },
      nextAction: "Agent Lee should continue the task using this route plan and downstream worker/MCP receipts.",
      plan
    });
  }

  return sendJson(res, 404, {
    status: "NOT_FOUND",
    path
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(JSON.stringify({
    event: "LEEWAY_MEDIA_ROUTER_STARTED",
    port: PORT,
    status: "READY"
  }));
});