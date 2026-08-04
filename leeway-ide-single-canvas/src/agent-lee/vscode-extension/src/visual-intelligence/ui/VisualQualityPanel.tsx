/*
LEEWAY_HEADER - DO NOT REMOVE

REGION: UI
TAG: UI.VISUAL.QUALITY_PANEL
PURPOSE: Thin quality panel descriptor for LVIS.
DISCOVERY_PIPELINE:
  Voice → Intent → Location → Vertical → Ranking → Render
*/

export function createVisualQualityPanelSummary() {
  return {
    panel: "VisualQualityPanel",
    focuses: ["Fidelity gates", "Schema validation", "Repair recommendations"]
  };
}
