/*
LEEWAY_HEADER - DO NOT REMOVE

REGION: 🧠 AI
TAG: AI.VISUAL.VISUAL_MEMORY.WORKER
PURPOSE: Governed visual memory worker for presets, failure patterns, and LVIS run history.
DISCOVERY_PIPELINE:
  Voice → Intent → Location → Vertical → Ranking → Render
*/

import type { VisualMemoryInput } from "./visualMemory.schema";
import { loadPreset, saveFailurePattern, savePreset, suggestStrategy, writeRunHistory } from "./visualMemory.tools";

export async function runVisualMemoryWorker(input: VisualMemoryInput) {
  return {
    worker: "leeway-visual-memory-worker",
    savedPreset: savePreset(input.key, input.value),
    loadedPreset: loadPreset(input.key),
    failurePattern: saveFailurePattern(input.key, { lastFailure: input.value }),
    strategy: suggestStrategy(input.key),
    history: writeRunHistory({ key: input.key, at: new Date().toISOString() })
  };
}
