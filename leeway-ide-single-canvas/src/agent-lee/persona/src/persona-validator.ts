/*
LEEWAY_HEADER - DO NOT REMOVE

TAG: AI.PERSONA.VALIDATOR.MAIN
REGION: 🧠 AI
PURPOSE: Validates the standalone Agent Lee persona module and produces a governed test response.
DISCOVERY_PIPELINE:
  Voice → Intent → Location → Vertical → Ranking → Render
*/

import * as fs from "fs";
import * as path from "path";
import { buildAgentLeeRuntimePrompt, getAgentLeePersonaModuleRoot, loadAgentLeePersonaManifest, loadAgentLeeSuperiorPrompt } from "./prompt-builder";
import { loadAgentLeeHeritage } from "./heritage-loader";

export function validateAgentLeePersonaModule() {
  const root = getAgentLeePersonaModuleRoot();
  const required = [
    path.join(root, "index.ts"),
    path.join(root, "src", "persona-module.ts"),
    path.join(root, "src", "prompt-builder.ts"),
    path.join(root, "src", "response-formatter.ts"),
    path.join(root, "src", "voice-modes.ts"),
    path.join(root, "src", "heritage-loader.ts"),
    path.join(root, "src", "persona-validator.ts"),
    path.join(root, "src", "anti-generic-filter.ts"),
    path.join(root, "assets", "01_SUPERIOR_PROMPT", "Agent_Lee_Superior_Prompt.md"),
    path.join(root, "assets", "05_MANIFEST", "agentlee_persona_manifest.json"),
    path.join(root, "assets", "06_HERITAGE", "agentlee_heritage_canon.md"),
    path.join(root, "assets", "06_HERITAGE", "agentlee_heritage_canon.json")
  ];

  const missing = required.filter((item) => !fs.existsSync(item));
  const heritage = loadAgentLeeHeritage();
  const prompt = buildAgentLeeRuntimePrompt({ taskContext: "validation" });
  const manifest = loadAgentLeePersonaManifest();
  const superior = loadAgentLeeSuperiorPrompt();

  return {
    valid: missing.length === 0 &&
      Boolean(superior.trim()) &&
      Boolean(heritage.markdown.trim()) &&
      Object.keys(heritage.json).length > 0 &&
      Object.keys(manifest).length > 0 &&
      /Agent Lee/i.test(prompt) &&
      /LeeWay/i.test(prompt) &&
      /Inspect → Plan → Stage → Approve → Apply → Verify → Receipt/i.test(prompt),
    missing,
    root
  };
}

export function testAgentLeePersona() {
  return [
    "I am Agent Lee, and I move under LeeWay governance.",
    "I do not talk like a generic assistant, and I do not perform culture as a costume.",
    "My voice stays grounded, culturally aware, technically precise, and alive.",
    "My workflow is inspect, plan, stage, approve, apply, verify, then leave the receipt."
  ].join(" ");
}
