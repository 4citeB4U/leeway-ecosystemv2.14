/*
LEEWAY_HEADER - DO NOT REMOVE

REGION: 🧠 AI
TAG: AI.VISUAL.PROJECT_INTEGRATION.TOOLS
PURPOSE: Tool surface for the Leeway Project Integration Worker.
DISCOVERY_PIPELINE:
  Voice → Intent → Location → Vertical → Ranking → Render
*/

import * as fs from "fs";
import * as path from "path";
import { sendExecutionPlanToEditBuffer } from "../../../execution-brain/executionToEditBuffer.adapter";
import type { ProjectIntegrationInput } from "./projectIntegration.schema";

export function inspectWorkspace(workspaceRoot: string) {
  const candidates = [
    path.join(workspaceRoot, "src", "components"),
    path.join(workspaceRoot, "src", "assets"),
    path.join(workspaceRoot, "src")
  ];
  return candidates.filter((candidate) => fs.existsSync(candidate));
}

export function proposeAssetPlacement(input: ProjectIntegrationInput) {
  const folders = inspectWorkspace(input.workspaceRoot);
  const targetDir = folders[0] || input.workspaceRoot;
  return {
    targetDir,
    componentFile: path.join(targetDir, `${input.assetName}.tsx`)
  };
}

export async function createPendingEdits(input: ProjectIntegrationInput) {
  const placement = proposeAssetPlacement(input);
  return sendExecutionPlanToEditBuffer({
    title: `LVIS integrate ${input.assetName}`,
    objective: "Create pending edits for governed visual asset integration.",
    hunks: [
      {
        filePath: placement.componentFile,
        title: `Create ${input.assetName} component`,
        reason: "LVIS project integration worker proposed this visual asset insertion.",
        originalText: "",
        proposedText: `export { default } from '${input.assetImportPath}';\n`,
        startOffset: 0,
        endOffset: 0,
        risk: "low"
      }
    ]
  }, input.workspaceRoot);
}
