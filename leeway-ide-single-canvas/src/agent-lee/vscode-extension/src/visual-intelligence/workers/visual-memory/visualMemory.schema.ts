/*
LEEWAY_HEADER - DO NOT REMOVE

REGION: 🧠 AI
TAG: AI.VISUAL.VISUAL_MEMORY.SCHEMA
PURPOSE: Input schema for the Leeway Visual Memory Worker.
DISCOVERY_PIPELINE:
  Voice → Intent → Location → Vertical → Ranking → Render
*/

export type VisualMemoryInput = {
  key: string;
  value: Record<string, unknown>;
};
