/*
LEEWAY_HEADER - DO NOT REMOVE

REGION: 🧠 AI
TAG: AI.VISUAL.VECTOR_RECONSTRUCTION.TOOLS
PURPOSE: Tool surface for Leeway Vector Reconstruction Worker.
DISCOVERY_PIPELINE:
  Voice → Intent → Location → Vertical → Ranking → Render
*/

import { analyzeRasterProfile, preprocessRasterProfile, type VisualImageInput } from "../../tools/imageProcessing";
import { buildAssetScore, scoreSimilarity } from "../../tools/renderPreview";
import { buildSvgCandidate, exportSvgTsx, optimizeSvg, sanitizeSvg, validateSvg } from "../../tools/svgProcessing";

export function analyzeImage(input: VisualImageInput) {
  return analyzeRasterProfile(input);
}

export function preprocessImage(input: VisualImageInput) {
  return preprocessRasterProfile(analyzeRasterProfile(input));
}

export function traceCandidates(input: VisualImageInput) {
  const profile = analyzeRasterProfile(input);
  return [
    buildSvgCandidate(profile.width, profile.height, "balanced"),
    buildSvgCandidate(profile.width, profile.height, "high")
  ];
}

export function scoreFidelity(source: string, candidate: string) {
  return buildAssetScore([scoreSimilarity(source, candidate), 90]);
}

export function sanitizeVectorSvg(svg: string, width: number, height: number) {
  return sanitizeSvg(svg, width, height);
}

export function validateVectorSvg(svg: string) {
  return validateSvg(svg);
}

export function exportVectorSvg(svg: string) {
  return optimizeSvg(svg);
}

export function exportVectorTsx(componentName: string, svg: string) {
  return exportSvgTsx(componentName, svg);
}
