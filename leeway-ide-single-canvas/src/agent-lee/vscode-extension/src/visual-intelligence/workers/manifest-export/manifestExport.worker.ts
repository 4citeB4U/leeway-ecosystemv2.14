/*
LEEWAY_HEADER - DO NOT REMOVE

REGION: 🧠 AI
TAG: AI.VISUAL.MANIFEST_EXPORT.WORKER
PURPOSE: Governed export packaging worker for LVIS asset outputs, reports, and receipts.
DISCOVERY_PIPELINE:
  Voice → Intent → Location → Vertical → Ranking → Render
*/

import type { ManifestExportInput } from "./manifestExport.schema";
import { packageAsset } from "./manifestExport.tools";

export async function runManifestExportWorker(input: ManifestExportInput) {
  return {
    worker: "leeway-manifest-export-worker",
    outputs: packageAsset(input)
  };
}
