/*
LEEWAY_HEADER - DO NOT REMOVE

REGION: 🧠 AI
TAG: AI.VISUAL.DEPTH_SYNTHESIS.SCHEMA
PURPOSE: Input schema for the Leeway Depth Synthesis Worker.
DISCOVERY_PIPELINE:
  Voice → Intent → Location → Vertical → Ranking → Render
*/

export type DepthSynthesisInput = {
  assetName: string;
  width?: number;
  height?: number;
  parts?: string[];
};
