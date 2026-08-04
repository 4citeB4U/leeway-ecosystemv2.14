/*
LEEWAY_HEADER - DO NOT REMOVE

REGION: UI
TAG: UI.VISUAL.EXPORT_PANEL
PURPOSE: Thin export panel descriptor for LVIS.
DISCOVERY_PIPELINE:
  Voice → Intent → Location → Vertical → Ranking → Render
*/

export function createVisualExportPanelSummary() {
  return {
    panel: "VisualExportPanel",
    focuses: ["Asset packages", "Receipts", "Usage documentation"]
  };
}
