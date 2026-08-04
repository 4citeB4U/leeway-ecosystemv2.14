/*
LEEWAY_HEADER - DO NOT REMOVE

REGION: 🧠 AI
TAG: AI.VISUAL.SCENE_RECONSTRUCTION.SCHEMA
PURPOSE: Input schema for the Leeway Scene Reconstruction Worker.
DISCOVERY_PIPELINE:
  Voice → Intent → Location → Vertical → Ranking → Render
*/

export type SceneReconstructionInput = {
  assetName: string;
  prompt: string;
  width?: number;
  height?: number;
};
