/*
LEEWAY_HEADER - DO NOT REMOVE

REGION: 🧠 AI
TAG: AI.VISUAL.SCENE_RECONSTRUCTION.TOOLS
PURPOSE: Tool surface for Leeway Scene Reconstruction Worker.
DISCOVERY_PIPELINE:
  Voice → Intent → Location → Vertical → Ranking → Render
*/

import { hideBodyText, zoomCamera } from "../../visualRuntime";

export function createSceneGraph(prompt: string) {
  return {
    prompt,
    nodes: ["environment", "camera", "lights", "hero-asset", "props"],
    layout: "center-weighted"
  };
}

export function generateThreeComponent(assetName: string, graph: ReturnType<typeof createSceneGraph>) {
  const componentName = `${assetName}Scene`;
  return [
    "import * as React from 'react';",
    "",
    `export function ${componentName}() {`,
    "  return null;",
    "}",
    "",
    `export const sceneGraph = ${JSON.stringify(graph, null, 2)};`
  ].join("\n");
}

export function generateMaterials() {
  return [{ id: "hero", type: "MeshStandardMaterial" }, { id: "ground", type: "MeshLambertMaterial" }];
}

export function validateScene(graph: ReturnType<typeof createSceneGraph>) {
  return { valid: graph.nodes.includes("camera") && graph.nodes.includes("lights"), warnings: [] as string[] };
}

export function exportHtml(prompt: string) {
  return zoomCamera(hideBodyText(`<!DOCTYPE html><html><head><title>${prompt}</title></head><body><div id="scene-root"></div></body></html>`));
}

export function exportTsx(assetName: string, graph: ReturnType<typeof createSceneGraph>) {
  return generateThreeComponent(assetName, graph);
}
