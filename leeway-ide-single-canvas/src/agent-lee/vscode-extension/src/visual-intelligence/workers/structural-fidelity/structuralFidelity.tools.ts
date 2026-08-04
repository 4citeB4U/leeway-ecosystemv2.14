/*
LEEWAY_HEADER - DO NOT REMOVE

REGION: 🧠 AI
TAG: AI.VISUAL.STRUCTURAL_FIDELITY.TOOLS
PURPOSE: Tool surface for Leeway Structural Fidelity Worker.
DISCOVERY_PIPELINE:
  Voice → Intent → Location → Vertical → Ranking → Render
*/

import { buildAssetScore, renderPreviewToken, scoreSimilarity } from "../../tools/renderPreview";

export function renderPreview(input: string) {
  return renderPreviewToken(input);
}

export function comparePixels(source: string, candidate: string) {
  return scoreSimilarity(source, candidate);
}

export function compareEdges(source: string, candidate: string) {
  return scoreSimilarity(source.replace(/[aeiou]/gi, ""), candidate.replace(/[aeiou]/gi, ""));
}

export function compareSilhouette(source: string, candidate: string) {
  return scoreSimilarity(source.replace(/\s+/g, ""), candidate.replace(/\s+/g, ""));
}

export function scoreAsset(source: string, candidate: string) {
  return buildAssetScore([
    comparePixels(source, candidate),
    compareEdges(source, candidate),
    compareSilhouette(source, candidate)
  ]);
}

export function recommendRepair(score: number) {
  if (score >= 90) return "No repair needed.";
  if (score >= 80) return "Run a targeted repair pass and re-score the candidate.";
  return "Rebuild the candidate with stronger edge locking and a higher fidelity threshold.";
}
