/*
LEEWAY_HEADER - DO NOT REMOVE

REGION: 🧠 AI
TAG: AI.VISUAL.DEPTH_SYNTHESIS.TOOLS
PURPOSE: Tool surface for Leeway Depth Synthesis Worker.
DISCOVERY_PIPELINE:
  Voice → Intent → Location → Vertical → Ranking → Render
*/

import { analyzeRasterProfile, buildHeightmap } from "../../tools/imageProcessing";
import { buildAssetScore } from "../../tools/renderPreview";

export function estimateDepth(width = 512, height = 512) {
  const profile = analyzeRasterProfile({ width, height, sourceData: "depth" });
  return {
    strategy: profile.dominantType === "scene" ? "layered-environment" : "silhouette-extrusion",
    confidence: Number((0.7 + profile.edgeDensity / 3).toFixed(2))
  };
}

export function buildLayerMap(width = 512, height = 512) {
  return buildHeightmap(analyzeRasterProfile({ width, height, sourceData: "depth" }));
}

export function assignPartDepth(parts: string[] = []) {
  return parts.map((part, index) => ({ part, depth: index + 1 }));
}

export function repairDepth(layerMap: number[][]) {
  return layerMap.map((row) => row.map((cell) => Math.max(1, cell)));
}

export function scoreDepth(layerMap: number[][]) {
  return buildAssetScore(layerMap.flat().slice(0, 8));
}
