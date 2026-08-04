/*
LEEWAY_HEADER - DO NOT REMOVE

REGION: 🧠 AI
TAG: AI.VISUAL.VOXEL_RECONSTRUCTION.TOOLS
PURPOSE: Tool surface for Leeway Voxel Reconstruction Worker.
DISCOVERY_PIPELINE:
  Voice → Intent → Location → Vertical → Ranking → Render
*/

import { analyzeRasterProfile, buildEdgeMap, buildHeightmap, buildMask, readPixelTruth } from "../../tools/imageProcessing";
import { exportVoxelJson, imageToVoxelModel, optimizeVoxelModel, svgToVoxelModel } from "../../tools/voxelProcessing";

export function readPixelTruthForVoxel(width = 512, height = 512) {
  return readPixelTruth(analyzeRasterProfile({ width, height, sourceData: "voxel" }));
}

export function buildVoxelMask(width = 512, height = 512) {
  return buildMask(analyzeRasterProfile({ width, height, sourceData: "voxel" }));
}

export function buildVoxelEdgeMap(width = 512, height = 512) {
  return buildEdgeMap(analyzeRasterProfile({ width, height, sourceData: "voxel" }));
}

export function imageToVoxel(width = 512, height = 512, depth = 4) {
  return imageToVoxelModel(width, height, depth);
}

export function svgToVoxel(svg: string, depth = 4) {
  return svgToVoxelModel(svg, depth);
}

export function buildVoxelHeightmap(width = 512, height = 512) {
  return buildHeightmap(analyzeRasterProfile({ width, height, sourceData: "voxel" }));
}

export function optimizeVoxel(cells: ReturnType<typeof imageToVoxelModel>) {
  return optimizeVoxelModel(cells);
}

export function exportVoxel(cells: ReturnType<typeof imageToVoxelModel>) {
  return exportVoxelJson(cells);
}
