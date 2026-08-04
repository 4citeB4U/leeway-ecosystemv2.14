/*
LEEWAY HEADER — DO NOT REMOVE
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
AUTHORITY: LeeWay-Standards

REGION: MCP.TOOLING.CONFIG
TAG: MCP.TOOLING.CONFIG.PATHS

COLOR_ONION_HEX:
NEON=#FFAB00
FLUO=#FFD54F
PASTEL=#FFECB3

ICON_ASCII:
family=lucide
glyph=settings

5WH:
WHAT = Shared configuration constants for MCP tooling runtime paths and executables
WHY = Centralizes path and executable defaults used by MCP tooling scripts
WHO = Agent Lee OS — MCP Tooling Layer
WHERE = MCP agents/vscode-mcp-tooling/src/config.js
WHEN = 2026
HOW = Resolves workspace-relative root and exports immutable config object values

AGENTS:
ASSESS
ALIGN
AUDIT

LICENSE:
PROPRIETARY
*/
// CHAIN: Standards → Integrated → Runtime → Projections


import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "../../");

export const CONFIG = {
  DOTENV_PATH: path.join(ROOT, ".env.local"),
  NPM_CMD: "npm.cmd",
  NODE_EXE: "node.exe",
  STITCH_PATH: path.join(ROOT, "workspace/preview") // Refers to the likely location of stitch projects
};
