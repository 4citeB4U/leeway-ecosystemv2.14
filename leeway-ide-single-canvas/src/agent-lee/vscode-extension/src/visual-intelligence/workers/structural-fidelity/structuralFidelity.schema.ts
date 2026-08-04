/*
LEEWAY_HEADER - DO NOT REMOVE

REGION: 🧠 AI
TAG: AI.VISUAL.STRUCTURAL_FIDELITY.SCHEMA
PURPOSE: Input schema for the Leeway Structural Fidelity Worker.
DISCOVERY_PIPELINE:
  Voice → Intent → Location → Vertical → Ranking → Render
*/

export type StructuralFidelityInput = {
  source: string;
  candidate: string;
};
