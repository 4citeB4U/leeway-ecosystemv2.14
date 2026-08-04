/*
LEEWAY_HEADER - DO NOT REMOVE

REGION: UI
TAG: UI.VISUAL.VECTOR_RECONSTRUCTION_PANEL
PURPOSE: Thin vector reconstruction panel descriptor for LVIS.
DISCOVERY_PIPELINE:
  Voice → Intent → Location → Vertical → Ranking → Render
*/

export function createVectorReconstructionPanelSummary() {
  return {
    panel: "VectorReconstructionPanel",
    focuses: ["SVG tracing", "TSX export", "Fidelity scoring"]
  };
}
