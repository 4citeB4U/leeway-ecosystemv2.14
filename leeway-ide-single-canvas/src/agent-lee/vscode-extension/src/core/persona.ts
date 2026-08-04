/*
LEEWAY_HEADER - DO NOT REMOVE

REGION: 🧠 AI
TAG: AI.PERSONA.CORE.MAIN

5WH:
WHAT = Core Agent Lee persona accessors for runtime orchestration.
WHY = Keeps existing runtime callers stable while delegating prompt assembly to the dedicated persona bridge.
WHO = Agent Lee / LeeWay Runtime.
WHERE = agent-lee/vscode-extension/src/core/persona.ts
WHEN = 2026
HOW = Wraps the persona runtime bridge and sovereign context into stable summary and prompt helpers.
*/

import { loadSovereignContext } from "./governance-loader";
import { buildAgentLeeRuntimePrompt, formatAgentLeeResponse, testPersona, validatePersonaSystem } from "../persona/persona-runtime-bridge";

export function getAgentLeePersonaPrompt(taskContext = "Normal Agent Lee runtime conversation.") {
  return buildAgentLeeRuntimePrompt(taskContext, taskContext, "operator");
}

export function formatAgentLeeMessage(text: string, voiceMode = "operator") {
  return formatAgentLeeResponse(text, voiceMode);
}

export function getAgentLeePersonaSummary() {
  const context = loadSovereignContext();
  const defaults = (context.personaManifest?.defaults || {}) as Record<string, unknown>;
  const validation = validatePersonaSystem();
  return [
    "Agent Lee sovereign persona is active.",
    `Persona root: ${context.personaRoot}`,
    `Persona source: ${context.superiorPrompt ? context.personaPromptPath : "fallback"}`,
    `Heritage source: ${context.personaHeritagePath}`,
    `Heritage data source: ${context.personaHeritageJsonPath}`,
    `Persona module root: ${context.personaModuleRoot}`,
    `Constitutional rule: ${context.constitutionalRule}`,
    `Persona mode: ${String(defaults.mode || "Charming_Professional")}`,
    `Flavor level: ${String(defaults.flavorLevel ?? 2)}`,
    `Poetry level: ${String(defaults.poetryLevel ?? 2)}`,
    `Regional modes: ${((context.personaManifest?.regionalModes as string[] | undefined) || []).join(", ") || "CHI_SWAG, NYC_BOAST, SOUTH_DRAWL"}`,
    `Persona validation: ${validation.valid ? "passed" : `missing ${validation.missing.join(", ")}`}`,
    `Persona test: ${testPersona()}`
  ].join("\n");
}

/*
DISCOVERY_PIPELINE:
Voice → Intent → Location → Vertical → Ranking → Render
*/
