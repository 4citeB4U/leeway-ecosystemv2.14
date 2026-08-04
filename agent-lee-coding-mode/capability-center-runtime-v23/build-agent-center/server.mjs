import http from "node:http";
import fs from "node:fs";
import os from "node:os";

const centerId = process.env.CENTER_ID || "unknown-center";
const centerType = process.env.CENTER_TYPE || "unknown";
const port = Number(process.env.PORT || 8860);
const registryPath = process.env.REGISTRY_PATH || "/app/registry.json";
const startedAt = new Date().toISOString();
let dispatchCount = 0;
let lastDispatch = null;

function readRegistry() {
  try {
    return JSON.parse(fs.readFileSync(registryPath, "utf8"));
  } catch (e) {
    return { schema: "registry-read-error", centerId, error: String(e.message || e) };
  }
}

function getItems(registry) {
  if (Array.isArray(registry.agents)) return registry.agents;
  if (Array.isArray(registry.mcpAgents)) return registry.mcpAgents;
  if (Array.isArray(registry.workers)) return registry.workers;
  if (Array.isArray(registry.mcpPackages)) return registry.mcpPackages;
  return [];
}

function sendJson(res, code, obj) {
  res.writeHead(code, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type"
  });
  res.end(JSON.stringify(obj, null, 2));
}

function sendHtml(res, code, html) {
  res.writeHead(code, { "content-type": "text/html; charset=utf-8", "access-control-allow-origin": "*" });
  res.end(html);
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk) => { data += chunk; if (data.length > 1024 * 1024) req.destroy(); });
    req.on("end", () => {
      try { resolve(data ? JSON.parse(data) : {}); }
      catch { resolve({ raw: data }); }
    });
  });
}

function state() {
  const registry = readRegistry();
  const items = getItems(registry);
  return {
    schema: "leeway-capability-center-runtime-state-v23-1",
    centerId,
    centerType,
    status: "WARM_READY",
    startedAt,
    uptimeSeconds: Math.round(process.uptime()),
    hostname: os.hostname(),
    itemCount: items.length,
    dispatchCount,
    lastDispatch,
    registry
  };
}

function page() {
  const s = state();
  const items = getItems(s.registry);
  const rows = items.map((x) => {
    const caps = Array.isArray(x.capabilities) ? x.capabilities.join(", ") : "";
    return `<tr><td>${x.id || ""}</td><td>${x.name || ""}</td><td>${x.status || ""}</td><td>${x.runtime || ""}</td><td>${x.deploymentLocation || ""}</td><td>${x.layer || ""}</td><td>${x.healthCheck || ""}</td><td>${caps}</td></tr>`;
  }).join("");

  return `<!doctype html><html><head><meta charset="utf-8"><title>${centerType}</title>
<style>
body{font-family:Arial,sans-serif;margin:24px;background:#f4f7fb;color:#102a43}
.card{background:white;border-radius:12px;padding:16px;margin:12px 0;box-shadow:0 2px 8px rgba(0,0,0,.12)}
.badge{display:inline-block;background:#d9f99d;padding:4px 8px;border-radius:8px;font-weight:bold}
table{border-collapse:collapse;width:100%;background:white}
th,td{border:1px solid #d9e2ec;padding:8px;font-size:12px;vertical-align:top}
th{background:#102a43;color:white;position:sticky;top:0}
</style></head><body>
<h1>${centerType}</h1>
<div class="card"><p><b>Center ID:</b> ${centerId}</p><p><b>Status:</b> <span class="badge">${s.status}</span></p><p><b>Item Count:</b> ${s.itemCount}</p><p><b>Dispatch Count:</b> ${s.dispatchCount}</p></div>
<table><thead><tr><th>ID</th><th>Name</th><th>Status</th><th>Runtime</th><th>Deployment</th><th>Layer</th><th>Health Check</th><th>Capabilities</th></tr></thead><tbody>${rows}</tbody></table>
</body></html>`;
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

  if (path === "/") return sendHtml(res, 200, page());
  if (path === "/health") {
    const s = state();
    return sendJson(res, 200, { centerId, centerType, status: "READY", warmStatus: s.status, itemCount: s.itemCount });
  }
  if (path === "/state") return sendJson(res, 200, state());
  if (path === "/registry") return sendJson(res, 200, readRegistry());
  if (path === "/entities") return sendJson(res, 200, { centerId, centerType, items: getItems(readRegistry()) });

  if (path === "/dispatch" && req.method === "POST") {
    const body = await readBody(req);
    dispatchCount += 1;
    lastDispatch = { receivedAt: new Date().toISOString(), request: body };
    return sendJson(res, 202, {
      centerId,
      centerType,
      status: "DISPATCH_ACCEPTED_BY_CENTER_NOT_EXECUTED_DIRECTLY",
      rule: "This center keeps lanes warm and routes authority. Real execution must go through the correct live worker, MCP, model, or host bridge.",
      request: body
    });
  }

  return sendJson(res, 404, { centerId, centerType, status: "NOT_FOUND", path });
});

server.listen(port, "0.0.0.0", () => {
  console.log(JSON.stringify({ event: "LEEWAY_CAPABILITY_CENTER_STARTED", centerId, centerType, port }));
});