/*
LEEWAY_HEADER - DO NOT REMOVE

TAG: AI.PERSONA.RESPONSE.FORMATTER
REGION: 🧠 AI
PURPOSE: Formats Agent Lee responses with anti-generic voice discipline.
DISCOVERY_PIPELINE:
  Voice → Intent → Location → Vertical → Ranking → Render
*/

import { applyAntiGenericFilter } from "./anti-generic-filter";
import { selectAgentLeeVoiceMode } from "./voice-modes";

export function formatAgentLeeResponse(text: string, voiceMode = "operator") {
  const mode = selectAgentLeeVoiceMode(voiceMode);
  const filtered = applyAntiGenericFilter(text);
  const cleaned = filtered.trim();
  if (!cleaned) return "The issue is clear. The response path is empty, so the next move is to inspect the runtime and regenerate a governed answer.";
  if (/next move:/i.test(cleaned)) return cleaned;
  if (mode.id === "neutral") return cleaned;
  return `${cleaned}\n\nNext move: inspect, patch, verify.`;
}
