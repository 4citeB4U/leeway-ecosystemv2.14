/*
LEEWAY_HEADER - DO NOT REMOVE

REGION: 🧠 AI
TAG: AI.VISUAL.STRUCTURAL_FIDELITY.WORKER
PURPOSE: Governed structural fidelity worker for visual asset similarity and retry guidance.
DISCOVERY_PIPELINE:
  Voice → Intent → Location → Vertical → Ranking → Render
*/

import type { StructuralFidelityInput } from "./structuralFidelity.schema";
import { compareEdges, comparePixels, compareSilhouette, recommendRepair, renderPreview, scoreAsset } from "./structuralFidelity.tools";

export async function runStructuralFidelityWorker(input: StructuralFidelityInput) {
  const pixelScore = comparePixels(input.source, input.candidate);
  const edgeScore = compareEdges(input.source, input.candidate);
  const silhouetteScore = compareSilhouette(input.source, input.candidate);
  const score = scoreAsset(input.source, input.candidate);
  return {
    worker: "leeway-structural-fidelity-worker",
    preview: renderPreview(input.candidate),
    pixelScore,
    edgeScore,
    silhouetteScore,
    score,
    recommendation: recommendRepair(score)
  };
}
