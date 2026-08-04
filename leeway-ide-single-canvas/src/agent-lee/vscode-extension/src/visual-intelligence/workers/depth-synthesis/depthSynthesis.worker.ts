/*
LEEWAY_HEADER - DO NOT REMOVE

REGION: 🧠 AI
TAG: AI.VISUAL.DEPTH_SYNTHESIS.WORKER
PURPOSE: Governed depth planning worker for voxel and scene reconstruction under LVIS.
DISCOVERY_PIPELINE:
  Voice → Intent → Location → Vertical → Ranking → Render
*/

import type { DepthSynthesisInput } from "./depthSynthesis.schema";
import { assignPartDepth, buildLayerMap, estimateDepth, repairDepth, scoreDepth } from "./depthSynthesis.tools";

export async function runDepthSynthesisWorker(input: DepthSynthesisInput) {
  const estimated = estimateDepth(input.width, input.height);
  const layerMap = buildLayerMap(input.width, input.height);
  const repaired = repairDepth(layerMap);
  const partDepth = assignPartDepth(input.parts);
  return {
    worker: "leeway-depth-synthesis-worker",
    estimated,
    layerMap: repaired,
    partDepth,
    score: scoreDepth(repaired)
  };
}
