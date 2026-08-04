/*
LEEWAY_HEADER - DO NOT REMOVE

REGION: 🧠 AI
TAG: AI.VISUAL.ASSET_REPAIR.SCHEMA
PURPOSE: Input schema for the Leeway Asset Repair Worker.
DISCOVERY_PIPELINE:
  Voice → Intent → Location → Vertical → Ranking → Render
*/

export type AssetRepairInput = {
  kind: "svg" | "voxel" | "depth";
  candidate: string;
  score: number;
};
