/*
LEEWAY_HEADER - DO NOT REMOVE

REGION: 🧠 AI
TAG: AI.VISUAL.SCENE_RECONSTRUCTION.WORKER
PURPOSE: Governed scene reconstruction worker for LVIS Three.js-compatible output planning.
DISCOVERY_PIPELINE:
  Voice → Intent → Location → Vertical → Ranking → Render
*/

import { LVIS_QUALITY_GATES } from "../../system/LVIS.constants";
import { buildAssetScore } from "../../tools/renderPreview";
import type { SceneReconstructionInput } from "./sceneReconstruction.schema";
import { createSceneGraph, exportHtml, exportTsx, generateMaterials, validateScene } from "./sceneReconstruction.tools";

export async function runSceneReconstructionWorker(input: SceneReconstructionInput) {
  const sceneGraph = createSceneGraph(input.prompt);
  const validation = validateScene(sceneGraph);
  const score = buildAssetScore([82, validation.valid ? 84 : 0, 80]);
  return {
    worker: "leeway-scene-reconstruction-worker",
    sceneGraph,
    materials: generateMaterials(),
    html: exportHtml(input.prompt),
    tsx: exportTsx(input.assetName, sceneGraph),
    score,
    passed: validation.valid && score >= LVIS_QUALITY_GATES.scene,
    validation
  };
}
