/*
LEEWAY HEADER — DO NOT REMOVE
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
AUTHORITY: LeeWay-Standards

REGION: MCP.TOOLING.ENV
TAG: MCP.TOOLING.ENV.DOTENV

COLOR_ONION_HEX:
NEON=#00C853
FLUO=#69F0AE
PASTEL=#C8E6C9

ICON_ASCII:
family=lucide
glyph=file-cog

5WH:
WHAT = Dotenv parser and environment merge helper for MCP tooling
WHY = Ensures local environment variables load consistently before MCP process startup
WHO = Agent Lee OS — MCP Tooling Layer
WHERE = MCP agents/vscode-mcp-tooling/src/dotenv.js
WHEN = 2026
HOW = Reads dotenv files line-by-line, parses key-value pairs, and merges values into process.env

AGENTS:
ASSESS
ALIGN
AUDIT

LICENSE:
PROPRIETARY
*/
// CHAIN: Standards → Integrated → Runtime → Projections


import fs from "fs";

export function loadDotenv(path) {
  const out = {};
  if (!path || !fs.existsSync(path)) return out;

  const lines = fs.readFileSync(path, "utf8").split(/\r?\n/);
  for (const line of lines) {
    if (!line) continue;
    if (/^\s*#/.test(line)) continue;

    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;

    const k = m[1];
    let v = m[2] ?? "";

    v = v.trim();
    v = v.replace(/^[\"']|[\"']$/g, "");
    v = v.trim();

    out[k] = v;
  }
  return out;
}

export function mergeEnv(obj) {
  for (const [k, v] of Object.entries(obj || {})) {
    if (typeof v === "string" && v.length > 0) process.env[k] = v;
  }
}
