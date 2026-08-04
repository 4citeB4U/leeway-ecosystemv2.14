/*
LEEWAY_HEADER - DO NOT REMOVE

TAG: AI.PERSONA.PROMPT.BUILDER
REGION: 🧠 AI
PURPOSE: Builds heritage-aware Agent Lee runtime prompts from standalone module assets.
DISCOVERY_PIPELINE:
  Voice → Intent → Location → Vertical → Ranking → Render
*/

import * as fs from "fs";
import * as path from "path";
import { loadAgentLeeHeritage } from "./heritage-loader";
import { selectAgentLeeVoiceMode } from "./voice-modes";

function readText(filePath: string) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

function readJson(filePath: string) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function getAgentLeePersonaModuleRoot() {
  return path.resolve(__dirname, "..");
}

export function loadAgentLeeSuperiorPrompt() {
  return readText(path.join(getAgentLeePersonaModuleRoot(), "assets", "01_SUPERIOR_PROMPT", "Agent_Lee_Superior_Prompt.md"));
}

export function loadAgentLeePersonaManifest() {
  return readJson(path.join(getAgentLeePersonaModuleRoot(), "assets", "05_MANIFEST", "agentlee_persona_manifest.json"));
}

export function buildAgentLeeRuntimePrompt(input?: {
  taskContext?: string;
  userRequest?: string;
  voiceMode?: string;
}) {
  const superiorPrompt = loadAgentLeeSuperiorPrompt();
  const heritage = loadAgentLeeHeritage();
  const manifest = loadAgentLeePersonaManifest();
  const selectedVoiceMode = selectAgentLeeVoiceMode(input?.voiceMode);

  return [
    "AGENT LEE PERSONA MODULE:",
    "Agent Lee is a LeeWay-governed software engineering agent.",
    "",
    "SUPERIOR PROMPT:",
    superiorPrompt || "Agent Lee superior prompt unavailable.",
    "",
    "HERITAGE CANON:",
    heritage.markdown || "Agent Lee heritage canon unavailable.",
    "",
    "LEEWAY STANDARDS WRITE LAW:",
    "Every governed file must carry LEEWAY_HEADER, TAG, REGION, and DISCOVERY_PIPELINE unless the user explicitly asks for a plain file.",
    "",
    "ENGINEERING WORKFLOW LAW:",
    "Inspect → Plan → Stage → Approve → Apply → Verify → Receipt",
    "",
    "ANTI-GENERIC LAW:",
    "Do not sound like a generic assistant. Do not force slang. Keep rhythm, clarity, confidence, and technical precision.",
    "",
    `SELECTED VOICE MODE: ${selectedVoiceMode.id}`,
    `VOICE MODE DESCRIPTION: ${selectedVoiceMode.description}`,
    `CURRENT TASK CONTEXT: ${input?.taskContext || "No task context supplied."}`,
    `USER REQUEST: ${input?.userRequest || "No user request supplied."}`,
    "",
    `PERSONA DEFAULTS: ${JSON.stringify((manifest.defaults || {}), null, 2)}`
  ].join("\n");
}
