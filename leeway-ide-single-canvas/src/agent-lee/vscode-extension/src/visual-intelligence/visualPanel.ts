/*
LEEWAY_HEADER - DO NOT REMOVE

REGION: UI
TAG: UI.VISUAL.LVIS.PANEL
PURPOSE: Internal LVIS panel surface for Agent Lee inside the VS Code extension.
DISCOVERY_PIPELINE:
  Voice → Intent → Location → Vertical → Ranking → Render
*/

import * as vscode from "vscode";
import { getLvisSystemStatus } from "./visualRuntime";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildHtml(status: Awaited<ReturnType<typeof getLvisSystemStatus>>) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>LVIS</title>
  <style>
    body{margin:0;background:#0d1016;color:#e7eef8;font-family:Segoe UI,Arial,sans-serif}
    .shell{padding:20px;display:grid;gap:16px}
    .hero,.card{border:1px solid rgba(255,255,255,.12);border-radius:16px;background:linear-gradient(180deg,rgba(34,44,63,.96),rgba(16,20,30,.96));padding:16px}
    .eyebrow{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#84d1ff;font-weight:700}
    h1{margin:8px 0 6px;font-size:22px}
    p{margin:0;color:#b6c5dc;line-height:1.5}
    .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px}
    .list{margin:10px 0 0;padding-left:18px;color:#d9e3f0}
    .meta{font-size:12px;color:#8aa0bd}
    .pill{display:inline-block;padding:5px 9px;border-radius:999px;background:rgba(132,209,255,.12);color:#b9e6ff;font-size:11px;margin:4px 6px 0 0}
    button{background:#7bd389;color:#04130a;border:none;border-radius:10px;padding:10px 14px;font-weight:700;cursor:pointer}
    button.secondary{background:#1a2536;color:#d5e2f2;border:1px solid rgba(255,255,255,.12)}
    .actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px}
    code{font-family:Consolas,monospace;color:#b9e6ff}
  </style>
</head>
<body>
  <div class="shell">
    <section class="hero">
      <div class="eyebrow">Leeway Sovereign Visual Intelligence System</div>
      <h1>${escapeHtml(status.title)}</h1>
      <p>External cloud provider routing is removed from this architecture. LVIS is routed through Leeway Runtime, Leeway Workers, and the local sovereign model stack.</p>
      <div class="actions">
        <button onclick="post('refresh')">Refresh Status</button>
        <button class="secondary" onclick="post('status')">Write Status Receipt</button>
        <button class="secondary" onclick="post('reveal')">Reveal LVIS Folder</button>
      </div>
    </section>
    <section class="grid">
      <div class="card">
        <div class="eyebrow">Runtime</div>
        <p class="meta">Root</p>
        <p><code>${escapeHtml(status.rootPath)}</code></p>
        <p class="meta" style="margin-top:10px">Panels</p>
        ${status.integratedPanels.map((panel) => `<span class="pill">${escapeHtml(panel)}</span>`).join("")}
      </div>
      <div class="card">
        <div class="eyebrow">Model Stack</div>
        <ul class="list">
          ${status.routes.map((route) => `<li><strong>${escapeHtml(route.role.toUpperCase())}</strong>: ${escapeHtml(route.resolved)} ${route.available ? "" : "(configured route not currently installed)"}</li>`).join("")}
        </ul>
      </div>
      <div class="card">
        <div class="eyebrow">Deterministic Core</div>
        <ul class="list">
          ${status.deterministicCapabilities.map((capability) => `<li>${escapeHtml(capability)}</li>`).join("")}
        </ul>
      </div>
    </section>
    <section class="card">
      <div class="eyebrow">Workers</div>
      <div class="grid" style="margin-top:12px">
        ${status.workers.map((worker) => `
          <div class="card">
            <div class="eyebrow">${escapeHtml(worker.routeKey.toUpperCase())}</div>
            <h1 style="font-size:16px;margin-top:6px">${escapeHtml(worker.name)}</h1>
            <p>${escapeHtml(worker.specialty)}</p>
            <ul class="list">
              ${worker.responsibilities.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
            </ul>
          </div>
        `).join("")}
      </div>
    </section>
  </div>
  <script>
    const vscode = acquireVsCodeApi();
    function post(command){ vscode.postMessage({ command }); }
  </script>
</body>
</html>`;
}

export async function openLvisPanel(context: vscode.ExtensionContext) {
  const panel = vscode.window.createWebviewPanel(
    "agentLee.visual.panel",
    "Agent Lee Visual Intelligence",
    vscode.ViewColumn.Beside,
    { enableScripts: true, retainContextWhenHidden: true }
  );

  const render = async () => {
    const status = await getLvisSystemStatus();
    panel.webview.html = buildHtml(status);
  };

  panel.webview.onDidReceiveMessage(async (msg) => {
    if (msg?.command === "refresh") {
      await render();
      return;
    }
    if (msg?.command === "status") {
      await vscode.commands.executeCommand("agentLee.visual.systemStatus");
      return;
    }
    if (msg?.command === "reveal") {
      await vscode.commands.executeCommand("agentLee.visual.revealWorkspace");
    }
  }, undefined, context.subscriptions);

  await render();
  return panel;
}
