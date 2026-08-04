/*
LEEWAY HEADER — DO NOT REMOVE
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
AUTHORITY: LeeWay-Standards

REGION: MCP.TOOLING.ORCHESTRATOR
TAG: MCP.TOOLING.ORCHESTRATOR.CLI

COLOR_ONION_HEX:
NEON=#00E5FF
FLUO=#4FC3F7
PASTEL=#B3E5FC

ICON_ASCII:
family=lucide
glyph=wrench

5WH:
WHAT = VS Code MCP tooling launcher for testsprite, playwright, insforge, and stitch processes
WHY = Provides one deterministic CLI to boot and diagnose MCP tool processes in the Agent Lee stack
WHO = Agent Lee OS — MCP Tooling Layer
WHERE = MCP agents/vscode-mcp-tooling/src/tool.js
WHEN = 2026
HOW = Loads dotenv, normalizes env compatibility keys, resolves package entrypoints, and launches processes

AGENTS:
ASSESS
ALIGN
AUDIT

LICENSE:
PROPRIETARY
*/
// CHAIN: Standards → Integrated → Runtime → Projections


import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { CONFIG } from "./config.js";
import { loadDotenv, mergeEnv } from "./dotenv.js";
import { run } from "./exec.js";

// Load environment early
mergeEnv(loadDotenv(CONFIG.DOTENV_PATH));

// ---- Env compatibility shims ----
if (!process.env.INSFORGE_TOKEN && process.env.INSFORGE_API_KEY) {
  process.env.INSFORGE_TOKEN = process.env.INSFORGE_API_KEY;
}
if (!process.env.TESTSPRITE_API_KEY && process.env.TEST_SPRITE_KEY) {
  process.env.TESTSPRITE_API_KEY = process.env.TEST_SPRITE_KEY;
}
// TestSprite MCP reads API_KEY — ensure it is always set
if (!process.env.API_KEY && (process.env.TESTSPRITE_API_KEY || process.env.TEST_SPRITE_KEY)) {
  process.env.API_KEY = process.env.TESTSPRITE_API_KEY || process.env.TEST_SPRITE_KEY;
}

function stripOuterQuotes(s) {
  s = String(s ?? "");
  return s.replace(/^\"+|\"+$/g, "");
}

function diag() {
  console.log("[diag] PWD:", process.cwd());
  console.log("[diag] DOTENV:", CONFIG.DOTENV_PATH);
  console.log("[diag] NPM_CMD:", CONFIG.NPM_CMD);
  console.log("[diag] NODE_EXE:", CONFIG.NODE_EXE);
  console.log("[diag] STITCH_PATH:", CONFIG.STITCH_PATH);

  const needKeys = ["leeway_API_KEY", "STITCH_API_KEY", "TESTSPRITE_API_KEY", "INSFORGE_TOKEN", "INSFORGE_API_KEY"];
  for (const k of needKeys) console.log("[diag] ENV " + k + ":", process.env[k] ? "set" : "missing");
}

function usage() {
  console.log([
    "Usage:",
    "  node src/tool.js testsprite",
    "  node src/tool.js playwright",
    "  node src/tool.js insforge",
    "  node src/tool.js stitch"
  ].join("\n"));
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");
const NODE_MODULES = path.join(PROJECT_ROOT, "node_modules");

function resolvePkgDir(pkgName) {
  const parts = pkgName.split("/");
  if (pkgName.startsWith("@") && parts.length >= 2) return path.join(NODE_MODULES, parts[0], parts[1]);
  return path.join(NODE_MODULES, pkgName);
}

function resolveEntryFromPackageJson(pkgDir) {
  const pj = path.join(pkgDir, "package.json");
  if (!fs.existsSync(pj)) throw new Error("Missing package.json: " + pj);
  const pkg = JSON.parse(fs.readFileSync(pj, "utf8"));

  const exportRoot = pkg.exports?.["."];
  const exportDefault =
    typeof exportRoot === "string"
      ? exportRoot
      : exportRoot?.default || exportRoot?.import || null;

  let entry =
    pkg.module ||
    pkg.main ||
    (pkg.exports && typeof pkg.exports === "string" ? pkg.exports : null) ||
    exportDefault;

  if (!entry && pkg.bin) {
    const binValue = typeof pkg.bin === "string" ? pkg.bin : Object.values(pkg.bin)[0];
    if (binValue) entry = binValue;
  }

  if (!entry) throw new Error("No main/module/exports entry in " + pj);

  const cleaned = String(entry).replace(/^\.\//, ""); // fix regex escape issue
  const abs = path.join(pkgDir, cleaned);
  if (!fs.existsSync(abs)) throw new Error("Entry not found: " + abs);
  return abs;
}

async function ensureInstalled(pkgSpec) {
  const npmCmd = stripOuterQuotes(CONFIG.NPM_CMD);
  const env = { ...process.env };
  console.log("[diag] installing (if needed):", pkgSpec);
  return await run(npmCmd, ["i", "--no-fund", "--no-audit", pkgSpec], { env, timeoutMs: 0, logLaunch: true });
}

async function runPkgByEntry(pkgSpec, pkgDirName) {
  const env = { ...process.env };
  const nodeExe = stripOuterQuotes(CONFIG.NODE_EXE);

  const install = await ensureInstalled(pkgSpec);
  if (install.code !== 0) return install;

  const pkgDir = resolvePkgDir(pkgDirName);
  console.log("[diag] pkgDir:", pkgDir);

  const entry = resolveEntryFromPackageJson(pkgDir);
  console.log("[diag] entry:", entry);

  return await run(nodeExe, [entry], { env, timeoutMs: 0, logLaunch: true });
}

async function runStitch() {
  const env = { ...process.env };

  // Prefer leeway_API_KEY when both are present
  if (env.leeway_API_KEY && env.leeway_API_KEY) delete env.leeway_API_KEY;

  const cwd = stripOuterQuotes(CONFIG.STITCH_PATH);
  if (!cwd || !fs.existsSync(cwd)) return { code: 2, out: "", err: "Missing STITCH_PATH: " + cwd };

  const entry = path.join(cwd, "dist", "index.js");
  if (!fs.existsSync(entry)) return { code: 3, out: "", err: "Missing dist/index.js: " + entry };

  const nodeExe = stripOuterQuotes(CONFIG.NODE_EXE);
  return await run(nodeExe, [entry], { cwd, env, timeoutMs: 0, logLaunch: true });
}

// Main execution
const cmd = (process.argv[2] || "").toLowerCase();

if (!cmd) {
  usage();
  process.exit(1);
}

// Because of top-level await, we wrap in IIFE or just rely on ESM top-level capability
try {
  diag();

  let r;
  if (cmd === "testsprite") r = await runPkgByEntry("@testsprite/testsprite-mcp@latest", "@testsprite/testsprite-mcp");
  else if (cmd === "playwright") r = await runPkgByEntry("@playwright/mcp@latest", "@playwright/mcp");
  else if (cmd === "insforge") r = await runPkgByEntry("@insforge/mcp@latest", "@insforge/mcp");
  else if (cmd === "stitch") r = await runStitch();
  else { usage(); process.exit(1); }

  console.log(r.code === 0 ? "OK" : "FAIL", "(code=" + r.code + ")");
  if ((r.out || "").trim()) console.log("\n--- STDOUT ---\n" + r.out.trim());
  if ((r.err || "").trim()) console.log("\n--- STDERR ---\n" + r.err.trim());
  process.exit(r.code);

} catch (err) {
  console.error("Fatal error:", err);
  process.exit(1);
}

