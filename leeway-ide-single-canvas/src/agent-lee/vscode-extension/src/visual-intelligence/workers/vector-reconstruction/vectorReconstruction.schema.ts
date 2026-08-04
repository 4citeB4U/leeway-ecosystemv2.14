/*
LEEWAY_HEADER - DO NOT REMOVE

REGION: 🧠 AI
TAG: AI.VISUAL.VECTOR_RECONSTRUCTION.SCHEMA
PURPOSE: Input and output schema guards for the Leeway Vector Reconstruction Worker.
DISCOVERY_PIPELINE:
  Voice → Intent → Location → Vertical → Ranking → Render
*/

export type VectorReconstructionInput = {
  assetName: string;
  sourcePath?: string;
  sourceData?: string;
  width?: number;
  height?: number;
};

export function validateVectorReconstructionInput(input: VectorReconstructionInput) {
  return Boolean(input.assetName && (input.sourcePath || input.sourceData));
}
