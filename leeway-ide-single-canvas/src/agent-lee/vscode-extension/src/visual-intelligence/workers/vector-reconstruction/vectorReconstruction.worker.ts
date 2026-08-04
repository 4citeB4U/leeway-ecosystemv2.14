/*
LEEWAY_HEADER - DO NOT REMOVE

REGION: 🧠 AI
TAG: AI.VISUAL.VECTOR_RECONSTRUCTION.WORKER
PURPOSE: Governed image-to-SVG reconstruction worker for LVIS.
DISCOVERY_PIPELINE:
  Voice → Intent → Location → Vertical → Ranking → Render
*/

import { LVIS_QUALITY_GATES } from "../../system/LVIS.constants";
import type { LvisAssetPackage } from "../../system/LVIS.schemas";
import { validateVectorReconstructionInput, type VectorReconstructionInput } from "./vectorReconstruction.schema";
import { analyzeImage, exportVectorSvg, exportVectorTsx, sanitizeVectorSvg, scoreFidelity, traceCandidates, validateVectorSvg } from "./vectorReconstruction.tools";

export async function runVectorReconstructionWorker(input: VectorReconstructionInput) {
  if (!validateVectorReconstructionInput(input)) {
    throw new Error("Vector reconstruction input is invalid.");
  }

  const profile = analyzeImage(input);
  const candidates = traceCandidates(input);
  const bestSvg = candidates.sort((left, right) => scoreFidelity(input.assetName, right) - scoreFidelity(input.assetName, left))[0];
  const sanitized = sanitizeVectorSvg(bestSvg, profile.width, profile.height);
  const validation = validateVectorSvg(sanitized);
  const score = scoreFidelity(input.assetName, sanitized);

  const pkg: LvisAssetPackage = {
    kind: "svg",
    assetName: input.assetName,
    svg: sanitized,
    optimizedSvg: exportVectorSvg(sanitized),
    vectorTsx: exportVectorTsx(`${input.assetName}Vector`, sanitized),
    previewPng: "preview-placeholder",
    qualityReport: JSON.stringify({ score, validation, minimum: LVIS_QUALITY_GATES.svg }, null, 2),
    usage: `# ${input.assetName}\n\nImport \`${input.assetName}Vector\` from the generated TSX file.`
  };

  return {
    worker: "leeway-vector-reconstruction-worker",
    profile,
    score,
    passed: validation.valid && score >= LVIS_QUALITY_GATES.svg,
    validation,
    package: pkg
  };
}
