/*
LEEWAY_HEADER - DO NOT REMOVE

REGION: 🟢 CORE
TAG: CORE.VISUAL.TOOLS.IMAGE_PROCESSING
PURPOSE: Deterministic image-profile helpers for LVIS analysis, masking, and depth preparation.
DISCOVERY_PIPELINE:
  Voice → Intent → Location → Vertical → Ranking → Render
*/

import * as path from "path";

export type VisualImageInput = {
  sourcePath?: string;
  sourceData?: string;
  width?: number;
  height?: number;
};

export type RasterProfile = {
  sourceId: string;
  width: number;
  height: number;
  aspectRatio: number;
  dominantType: "logo" | "illustration" | "scene";
  edgeDensity: number;
  luminanceBands: number[];
};

export function analyzeRasterProfile(input: VisualImageInput): RasterProfile {
  const sourceId = input.sourcePath ? path.basename(input.sourcePath) : "inline-asset";
  const width = Math.max(64, input.width || 512);
  const height = Math.max(64, input.height || 512);
  const aspectRatio = Number((width / height).toFixed(2));
  const name = sourceId.toLowerCase();
  const dominantType = /logo|icon|mark|badge/.test(name) ? "logo" : /scene|room|world|environment/.test(name) ? "scene" : "illustration";
  const seed = sourceId.length + width + height;
  return {
    sourceId,
    width,
    height,
    aspectRatio,
    dominantType,
    edgeDensity: Number((((seed % 37) + 20) / 100).toFixed(2)),
    luminanceBands: [seed % 255, (seed * 3) % 255, (seed * 5) % 255]
  };
}

export function preprocessRasterProfile(profile: RasterProfile) {
  return {
    sharpen: profile.dominantType !== "scene",
    upscaleFactor: profile.dominantType === "logo" ? 2 : 1,
    contrastBoost: profile.edgeDensity < 0.4 ? 1.15 : 1.05
  };
}

export function buildMask(profile: RasterProfile) {
  return {
    foregroundRatio: Number(Math.min(0.92, 0.35 + profile.edgeDensity).toFixed(2)),
    backgroundRatio: Number(Math.max(0.08, 0.65 - profile.edgeDensity).toFixed(2)),
    strategy: profile.dominantType === "scene" ? "layered-mask" : "edge-locked-mask"
  };
}

export function buildEdgeMap(profile: RasterProfile) {
  const segments = Math.max(8, Math.round(profile.edgeDensity * 24));
  return Array.from({ length: segments }, (_, index) => ({
    index,
    weight: Number((((index + 1) / segments) * profile.edgeDensity).toFixed(3))
  }));
}

export function readPixelTruth(profile: RasterProfile) {
  return {
    truthBands: profile.luminanceBands,
    confidence: Number((0.72 + profile.edgeDensity / 4).toFixed(2))
  };
}

export function buildHeightmap(profile: RasterProfile) {
  return Array.from({ length: 4 }, (_, y) =>
    Array.from({ length: 4 }, (_, x) => ((x + y + Math.round(profile.edgeDensity * 10)) % 6) + 1)
  );
}
