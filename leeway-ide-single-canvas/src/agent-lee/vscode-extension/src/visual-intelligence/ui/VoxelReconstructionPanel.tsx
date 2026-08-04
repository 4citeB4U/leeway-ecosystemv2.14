/*
LEEWAY_HEADER - DO NOT REMOVE

REGION: UI
TAG: UI.VISUAL.VOXEL_RECONSTRUCTION_PANEL
PURPOSE: Thin voxel reconstruction panel descriptor for LVIS.
DISCOVERY_PIPELINE:
  Voice → Intent → Location → Vertical → Ranking → Render
*/

export function createVoxelReconstructionPanelSummary() {
  return {
    panel: "VoxelReconstructionPanel",
    focuses: ["Voxel grids", "Depth synthesis", "Voxel JSON export"]
  };
}
