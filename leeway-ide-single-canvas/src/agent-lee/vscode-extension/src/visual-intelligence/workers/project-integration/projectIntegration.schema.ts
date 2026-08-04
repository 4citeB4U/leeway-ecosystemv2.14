/*
LEEWAY_HEADER - DO NOT REMOVE

REGION: 🧠 AI
TAG: AI.VISUAL.PROJECT_INTEGRATION.SCHEMA
PURPOSE: Input schema for the Leeway Project Integration Worker.
DISCOVERY_PIPELINE:
  Voice → Intent → Location → Vertical → Ranking → Render
*/

export type ProjectIntegrationInput = {
  workspaceRoot: string;
  assetName: string;
  assetImportPath: string;
};
