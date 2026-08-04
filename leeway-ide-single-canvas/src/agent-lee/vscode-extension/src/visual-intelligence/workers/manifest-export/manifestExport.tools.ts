/*
LEEWAY_HEADER - DO NOT REMOVE

REGION: 🧠 AI
TAG: AI.VISUAL.MANIFEST_EXPORT.TOOLS
PURPOSE: Tool surface for the Leeway Manifest Export Worker.
DISCOVERY_PIPELINE:
  Voice → Intent → Location → Vertical → Ranking → Render
*/

import { writeAssetOutputPackage } from "../../tools/fileWriters";
import type { ManifestExportInput } from "./manifestExport.schema";

export function packageAsset(input: ManifestExportInput) {
  return writeAssetOutputPackage(input.outputRoot, input.assetPackage, input.receipt);
}
