/*
LEEWAY_HEADER - DO NOT REMOVE

REGION: 🧠 AI
TAG: AI.VISUAL.ASSET_REPAIR.TOOLS
PURPOSE: Tool surface for the Leeway Asset Repair Worker.
DISCOVERY_PIPELINE:
  Voice → Intent → Location → Vertical → Ranking → Render
*/

import { sanitizeSvg } from "../../tools/svgProcessing";

export function repairSvg(svg: string) {
  return sanitizeSvg(svg, 512, 512);
}

export function repairVoxel(candidate: string) {
  return `${candidate}\n// voxel-repair-pass`;
}

export function repairDepth(candidate: string) {
  return `${candidate}\n// depth-repair-pass`;
}

export function repairMask(candidate: string) {
  return `${candidate}\n// mask-repair-pass`;
}

export function retryCandidate(score: number) {
  return {
    shouldRetry: score < 90,
    nextPass: score < 80 ? "high-fidelity-rebuild" : "targeted-repair"
  };
}
