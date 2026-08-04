#!/usr/bin/env node
/*
LEEWAY HEADER — DO NOT REMOVE

REGION: CORE
TAG: CORE.MODULE.ENFORCE.MAIN
DESCRIPTION: Auto-enforced by LeeWay Standards Enforcement Engine
AUTHORITY: LeeWay-Standards
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

5WH:
WHAT = enforce — governed module
WHY = Enforce LeeWay architectural standards in this file
WHO = Leeway Innovations / LeeWay Standards Enforcement Engine
WHERE = scripts/enforce.mjs
WHEN = 2026-04-18
HOW = Auto-enforced header; update manually with full 5WH detail

CHAIN: Standards → Integrated → Runtime → Projections
LICENSE: PROPRIETARY
*/

import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const runAgentsPath = path.join(__dirname, "run-agents.mjs");

const child = spawn("node", [runAgentsPath, "--mode=enforce"], {
  stdio: "inherit",
  cwd: path.resolve(__dirname, ".."),
});

child.on("close", (code) => {
  process.exit(code ?? 1);
});
