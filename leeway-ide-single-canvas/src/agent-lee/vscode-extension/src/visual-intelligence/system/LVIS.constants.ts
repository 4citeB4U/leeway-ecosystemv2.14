/*
LEEWAY_HEADER - DO NOT REMOVE

REGION: 🟢 CORE
TAG: CORE.VISUAL.LVIS.CONSTANTS
PURPOSE: Shared LVIS constants for workflows, outputs, routing, and quality gates.
DISCOVERY_PIPELINE:
  Voice → Intent → Location → Vertical → Ranking → Render
*/

export const LVIS_SYSTEM_NAME = "LVIS";
export const LVIS_HOST_NAME = "Leeway VS Code";
export const LVIS_ORCHESTRATOR_ID = "leeway-visual-orchestrator-agent";
export const LVIS_FORBIDDEN_PROVIDERS = ["external-cloud-provider", "non-leeway-provider"] as const;
export const LVIS_OUTPUT_FILES = [
  "asset.svg",
  "asset.optimized.svg",
  "AssetVector.tsx",
  "asset.voxel.json",
  "AssetVoxel.tsx",
  "preview.png",
  "quality-report.json",
  "agent-receipt.json",
  "usage.md"
] as const;
export const LVIS_QUALITY_GATES = {
  svg: 90,
  voxel: 85,
  scene: 80
} as const;
