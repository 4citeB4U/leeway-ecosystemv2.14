/*
LEEWAY_HEADER - DO NOT REMOVE

TAG: AI.PERSONA.HERITAGE.LOADER
REGION: 🧠 AI
PURPOSE: Loads Agent Lee heritage canon assets from the standalone persona module.
DISCOVERY_PIPELINE:
  Voice → Intent → Location → Vertical → Ranking → Render
*/

import * as fs from "fs";
import * as path from "path";

function root() {
  return path.resolve(__dirname, "..");
}

export function loadAgentLeeHeritage() {
  const markdownPath = path.join(root(), "assets", "06_HERITAGE", "agentlee_heritage_canon.md");
  const jsonPath = path.join(root(), "assets", "06_HERITAGE", "agentlee_heritage_canon.json");
  let markdown = "";
  let json: Record<string, unknown> = {};

  try {
    markdown = fs.readFileSync(markdownPath, "utf8");
  } catch {}

  try {
    json = JSON.parse(fs.readFileSync(jsonPath, "utf8")) as Record<string, unknown>;
  } catch {}

  return {
    markdownPath,
    jsonPath,
    markdown,
    json
  };
}
