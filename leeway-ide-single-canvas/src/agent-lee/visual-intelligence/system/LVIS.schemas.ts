/*
LEEWAY_HEADER - DO NOT REMOVE

REGION: 🟢 CORE
TAG: CORE.VISUAL.LVIS.SCHEMAS
PURPOSE: Schema notes for LVIS system manifests and worker registration.
DISCOVERY_PIPELINE:
  Voice → Intent → Location → Vertical → Ranking → Render
*/

export type LvisSchemaNote = {
  systemId: "LVIS";
  title: "LEEWAY SOVEREIGN VISUAL INTELLIGENCE SYSTEM";
  workerIds: string[];
  uiPanels: string[];
};
