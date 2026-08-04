/*
LEEWAY_HEADER - DO NOT REMOVE

REGION: 🧠 AI
TAG: AI.VISUAL.VOXEL_RECONSTRUCTION.SCHEMA
PURPOSE: Input schema for the Leeway Voxel Reconstruction Worker.
DISCOVERY_PIPELINE:
  Voice → Intent → Location → Vertical → Ranking → Render
*/

export type VoxelReconstructionInput = {
  assetName: string;
  width?: number;
  height?: number;
  depth?: number;
  svg?: string;
};

export function validateVoxelReconstructionInput(input: VoxelReconstructionInput) {
  return Boolean(input.assetName && (input.svg || input.width || input.height));
}
