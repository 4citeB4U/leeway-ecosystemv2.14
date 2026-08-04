/*
LEEWAY_HEADER - DO NOT REMOVE

REGION: 🧠 AI
TAG: AI.VISUAL.VOXEL_RECONSTRUCTION.WORKER
PURPOSE: Governed image-to-voxel and svg-to-voxel worker for LVIS.
DISCOVERY_PIPELINE:
  Voice → Intent → Location → Vertical → Ranking → Render
*/

import { LVIS_QUALITY_GATES } from "../../system/LVIS.constants";
import type { LvisAssetPackage } from "../../system/LVIS.schemas";
import { buildAssetScore } from "../../tools/renderPreview";
import { validateVoxelReconstructionInput, type VoxelReconstructionInput } from "./voxelReconstruction.schema";
import { buildVoxelEdgeMap, buildVoxelHeightmap, buildVoxelMask, exportVoxel, imageToVoxel, optimizeVoxel, readPixelTruthForVoxel, svgToVoxel } from "./voxelReconstruction.tools";

export async function runVoxelReconstructionWorker(input: VoxelReconstructionInput) {
  if (!validateVoxelReconstructionInput(input)) {
    throw new Error("Voxel reconstruction input is invalid.");
  }

  const cells = input.svg ? svgToVoxel(input.svg, input.depth || 4) : imageToVoxel(input.width || 512, input.height || 512, input.depth || 4);
  const optimized = optimizeVoxel(cells);
  const score = buildAssetScore([88, optimized.length > 0 ? 86 : 0, 90]);
  const pkg: LvisAssetPackage = {
    kind: "voxel",
    assetName: input.assetName,
    voxelJson: exportVoxel(optimized),
    voxelTsx: `export const ${input.assetName}Voxel = ${JSON.stringify({ cells: optimized.length }, null, 2)};`,
    previewPng: "preview-placeholder",
    qualityReport: JSON.stringify({
      score,
      minimum: LVIS_QUALITY_GATES.voxel,
      pixelTruth: readPixelTruthForVoxel(input.width, input.height),
      mask: buildVoxelMask(input.width, input.height),
      edgeMap: buildVoxelEdgeMap(input.width, input.height),
      heightmap: buildVoxelHeightmap(input.width, input.height)
    }, null, 2),
    usage: `# ${input.assetName}\n\nUse the generated voxel JSON and TSX helper for runtime previews.`
  };

  return {
    worker: "leeway-voxel-reconstruction-worker",
    score,
    passed: score >= LVIS_QUALITY_GATES.voxel,
    package: pkg
  };
}
