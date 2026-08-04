/*
LEEWAY_HEADER - DO NOT REMOVE

REGION: 🧠 AI
TAG: AI.VISUAL.ASSET_REPAIR.WORKER
PURPOSE: Governed repair worker for SVG, voxel, mask, and depth correction loops under LVIS.
DISCOVERY_PIPELINE:
  Voice → Intent → Location → Vertical → Ranking → Render
*/

import type { AssetRepairInput } from "./assetRepair.schema";
import { repairDepth, repairMask, repairSvg, repairVoxel, retryCandidate } from "./assetRepair.tools";

export async function runAssetRepairWorker(input: AssetRepairInput) {
  const repaired = input.kind === "svg"
    ? repairSvg(input.candidate)
    : input.kind === "voxel"
      ? repairVoxel(input.candidate)
      : repairDepth(input.candidate);

  return {
    worker: "leeway-asset-repair-worker",
    repaired,
    maskPass: repairMask(input.candidate),
    retry: retryCandidate(input.score)
  };
}
