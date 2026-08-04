/*
LEEWAY HEADER — DO NOT REMOVE
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
AUTHORITY: LeeWay-Standards

REGION: MCP.TOOLING.EXEC
TAG: MCP.TOOLING.EXEC.RUNNER

COLOR_ONION_HEX:
NEON=#7C4DFF
FLUO=#9575CD
PASTEL=#D1C4E9

ICON_ASCII:
family=lucide
glyph=terminal

5WH:
WHAT = Process execution utility for MCP tooling commands
WHY = Standardizes subprocess launching, timeout handling, and output capture across MCP tooling
WHO = Agent Lee OS — MCP Tooling Layer
WHERE = MCP agents/vscode-mcp-tooling/src/exec.js
WHEN = 2026
HOW = Spawns command/cmd processes, captures streams, and resolves normalized execution result objects

AGENTS:
ASSESS
ALIGN
AUDIT

LICENSE:
PROPRIETARY
*/
// CHAIN: Standards → Integrated → Runtime → Projections


import { spawn } from "child_process";

function isCmdFile(p) {
  const s = String(p || "").toLowerCase();
  return process.platform === "win32" && (s.endsWith(".cmd") || s.endsWith(".bat"));
}

export function run(cmd, args = [], opts = {}) {
  const { cwd, env, timeoutMs = 0, logLaunch = true } = opts;

  return new Promise((resolve) => {
    let child;

    if (logLaunch) {
      console.log("[exec] cmd:", cmd);
      console.log("[exec] args:", JSON.stringify(args));
      if (cwd) console.log("[exec] cwd:", cwd);
    }

    if (isCmdFile(cmd)) {
      child = spawn("cmd.exe", ["/d", "/s", "/c", "call", cmd, ...args], { cwd, env, windowsHide: true });
    } else {
      child = spawn(cmd, args, { cwd, env, windowsHide: true });
    }

    let out = "";
    let err = "";

    if (child.stdout) child.stdout.on("data", (d) => (out += d.toString()));
    if (child.stderr) child.stderr.on("data", (d) => (err += d.toString()));

    let t = null;
    if (typeof timeoutMs === "number" && timeoutMs > 0) {
      t = setTimeout(() => {
        try { child.kill(); } catch {}
        resolve({ code: 124, out, err: (err + "\n[exec] TIMEOUT after " + timeoutMs + "ms").trim() });
      }, timeoutMs);
    }

    child.on("close", (code) => {
      if (t) clearTimeout(t);
      resolve({ code, out, err });
    });

    child.on("error", (e) => {
      if (t) clearTimeout(t);
      resolve({ code: 1, out: "", err: String(e?.message || e) });
    });
  });
}
