/*
LEEWAY_HEADER - DO NOT REMOVE

REGION: 🧠 AI
TAG: AI.VISUAL.MANIFEST_EXPORT.SCHEMA
PURPOSE: Input schema for the Leeway Manifest Export Worker.
DISCOVERY_PIPELINE:
  Voice → Intent → Location → Vertical → Ranking → Render
*/

import type { LvisAssetPackage, LvisReceipt } from "../../system/LVIS.schemas";

export type ManifestExportInput = {
  outputRoot: string;
  assetPackage: LvisAssetPackage;
  receipt: LvisReceipt;
};
