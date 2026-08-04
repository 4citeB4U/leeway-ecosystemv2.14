/*
LEEWAY_HEADER - DO NOT REMOVE

REGION: 🧠 AI
TAG: AI.VISUAL.PROJECT_INTEGRATION.WORKER
PURPOSE: Governed asset insertion worker for pending edits, imports, and build-safe LVIS integration.
DISCOVERY_PIPELINE:
  Voice → Intent → Location → Vertical → Ranking → Render
*/

import type { ProjectIntegrationInput } from "./projectIntegration.schema";
import { createPendingEdits, inspectWorkspace, proposeAssetPlacement } from "./projectIntegration.tools";

export async function runProjectIntegrationWorker(input: ProjectIntegrationInput) {
  const placement = proposeAssetPlacement(input);
  const pendingPackageId = await createPendingEdits(input);
  return {
    worker: "leeway-project-integration-worker",
    workspace: inspectWorkspace(input.workspaceRoot),
    placement,
    pendingPackageId
  };
}
