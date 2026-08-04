/*
LEEWAY_HEADER - DO NOT REMOVE

REGION: 🟢 CORE
TAG: CORE.VISUAL.TOOLS.RENDER_PREVIEW
PURPOSE: Preview and similarity scoring helpers for LVIS structural fidelity checks.
DISCOVERY_PIPELINE:
  Voice → Intent → Location → Vertical → Ranking → Render
*/

export function renderPreviewToken(input: string) {
  const normalized = String(input || "").replace(/\s+/g, " ").trim();
  return `${normalized.slice(0, 32)}::${normalized.length}`;
}

export function scoreSimilarity(source: string, candidate: string) {
  const left = renderPreviewToken(source);
  const right = renderPreviewToken(candidate);
  const overlap = left.split("").filter((char) => right.includes(char)).length;
  return Math.max(0, Math.min(100, Math.round((overlap / Math.max(left.length, 1)) * 100)));
}

export function buildAssetScore(parts: number[]) {
  const sum = parts.reduce((total, value) => total + value, 0);
  return Math.round(sum / Math.max(parts.length, 1));
}
