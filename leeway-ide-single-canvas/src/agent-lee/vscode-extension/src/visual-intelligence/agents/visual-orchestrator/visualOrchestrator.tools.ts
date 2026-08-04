/*
LEEWAY_HEADER - DO NOT REMOVE

REGION: 🧠 AI
TAG: AI.VISUAL.ORCHESTRATOR.TOOLS
PURPOSE: Request classification and routing helpers for the Leeway Visual Orchestrator Agent.
DISCOVERY_PIPELINE:
  Voice → Intent → Location → Vertical → Ranking → Render
*/

import type { VisualWorkflowId } from "../../system/LVIS.schemas";

export function classifyVisualRequest(request: string): VisualWorkflowId {
  const q = request.toLowerCase();
  if (/svg.+voxel|voxel.+svg/.test(q)) return "svg-to-voxel";
  if (/voxel/.test(q)) return "image-to-voxel";
  if (/scene|3d|three|environment/.test(q)) return "scene-reconstruction";
  if (/project|integrate|insert|pending edit/.test(q)) return "asset-to-project";
  return "image-to-svg";
}
