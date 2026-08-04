/*
LEEWAY_HEADER - DO NOT REMOVE

REGION: 💾 DATA
TAG: DATA.VISUAL.TOOLS.FILE_WRITERS
PURPOSE: Writes LVIS asset-output packages, reports, and documentation files.
DISCOVERY_PIPELINE:
  Voice → Intent → Location → Vertical → Ranking → Render
*/

import * as fs from "fs";
import * as path from "path";
import type { LvisAssetPackage, LvisReceipt } from "../system/LVIS.schemas";

export function writeAssetOutputPackage(outputRoot: string, pkg: LvisAssetPackage, receipt: LvisReceipt) {
  const assetRoot = path.join(outputRoot, "asset-output");
  fs.mkdirSync(assetRoot, { recursive: true });
  const outputs: string[] = [];

  const writeIf = (name: string, value?: string) => {
    if (!value) return;
    const target = path.join(assetRoot, name);
    fs.writeFileSync(target, value, "utf8");
    outputs.push(target);
  };

  writeIf("asset.svg", pkg.svg);
  writeIf("asset.optimized.svg", pkg.optimizedSvg);
  writeIf("AssetVector.tsx", pkg.vectorTsx);
  writeIf("asset.voxel.json", pkg.voxelJson);
  writeIf("AssetVoxel.tsx", pkg.voxelTsx);
  writeIf("preview.png", pkg.previewPng || "preview-placeholder");
  writeIf("quality-report.json", pkg.qualityReport);
  writeIf("usage.md", pkg.usage);
  writeIf("agent-receipt.json", JSON.stringify(receipt, null, 2));

  return outputs;
}
