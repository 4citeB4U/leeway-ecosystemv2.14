/*
LEEWAY_HEADER - DO NOT REMOVE

REGION: 🟢 CORE
TAG: CORE.VISUAL.TOOLS.SVG_PROCESSING
PURPOSE: Deterministic SVG sanitization, validation, optimization, and TSX export helpers for LVIS.
DISCOVERY_PIPELINE:
  Voice → Intent → Location → Vertical → Ranking → Render
*/

import { sanitizeSvgForExport, validateSvgXml } from "../visualRuntime";

export function buildSvgCandidate(width: number, height: number, detail = "balanced") {
  const strokeWidth = detail === "high" ? 1 : 2;
  return `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="8" width="${Math.max(16, width - 16)}" height="${Math.max(16, height - 16)}" rx="12" fill="#0f172a"/><circle cx="${Math.round(width / 2)}" cy="${Math.round(height / 2)}" r="${Math.round(Math.min(width, height) / 5)}" fill="#38bdf8" stroke="#e2e8f0" stroke-width="${strokeWidth}"/></svg>`;
}

export function optimizeSvg(svg: string) {
  return String(svg || "")
    .replace(/\s{2,}/g, " ")
    .replace(/>\s+</g, "><")
    .trim();
}

export function sanitizeSvg(svg: string, width: number, height: number) {
  return sanitizeSvgForExport(svg, width, height);
}

export function validateSvg(svg: string) {
  return validateSvgXml(svg);
}

export function exportSvgTsx(componentName: string, svg: string) {
  const safeComponent = componentName.replace(/[^a-zA-Z0-9_]/g, "") || "AssetVector";
  const next = svg.replace(/class=/g, "className=");
  return [
    "import * as React from 'react';",
    "",
    `export function ${safeComponent}(props: React.SVGProps<SVGSVGElement>) {`,
    `  return (${next.replace("<svg", "<svg {...props}")});`,
    "}"
  ].join("\n");
}
