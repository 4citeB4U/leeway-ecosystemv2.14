/*
LEEWAY_HEADER - DO NOT REMOVE

REGION: 🟢 CORE
TAG: CORE.VISUAL.TOOLS.VOXEL_PROCESSING
PURPOSE: Deterministic voxel model helpers for LVIS planning, extrusion, optimization, and export.
DISCOVERY_PIPELINE:
  Voice → Intent → Location → Vertical → Ranking → Render
*/

export type VoxelCell = { x: number; y: number; z: number; color: string };

export function imageToVoxelModel(width: number, height: number, depth: number) {
  const cells: VoxelCell[] = [];
  const xCount = Math.max(4, Math.round(width / 64));
  const yCount = Math.max(4, Math.round(height / 64));
  for (let x = 0; x < xCount; x += 1) {
    for (let y = 0; y < yCount; y += 1) {
      for (let z = 0; z < depth; z += 1) {
        if ((x + y + z) % 2 === 0) {
          cells.push({ x, y, z, color: z % 2 === 0 ? "#38bdf8" : "#0f172a" });
        }
      }
    }
  }
  return cells;
}

export function svgToVoxelModel(svg: string, depth: number) {
  const pathCount = Math.max(1, (svg.match(/<path|<circle|<rect|<polygon/g) || []).length);
  return imageToVoxelModel(pathCount * 64, pathCount * 64, Math.max(2, depth));
}

export function optimizeVoxelModel(cells: VoxelCell[]) {
  const seen = new Set<string>();
  return cells.filter((cell) => {
    const key = `${cell.x}:${cell.y}:${cell.z}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function exportVoxelJson(cells: VoxelCell[]) {
  return JSON.stringify({ version: 1, cells }, null, 2);
}
