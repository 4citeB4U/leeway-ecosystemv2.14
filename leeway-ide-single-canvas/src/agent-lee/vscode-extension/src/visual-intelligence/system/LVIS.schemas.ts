/*
LEEWAY_HEADER - DO NOT REMOVE

REGION: 🟢 CORE
TAG: CORE.VISUAL.LVIS.SCHEMAS
PURPOSE: Schema-first types and validators for LVIS runs, asset packages, and receipts.
DISCOVERY_PIPELINE:
  Voice → Intent → Location → Vertical → Ranking → Render
*/

import { LVIS_HOST_NAME, LVIS_ORCHESTRATOR_ID, LVIS_SYSTEM_NAME } from "./LVIS.constants";

export type VisualWorkflowId = "image-to-svg" | "image-to-voxel" | "svg-to-voxel" | "asset-to-project" | "scene-reconstruction";
export type VisualAssetKind = "svg" | "voxel" | "scene";

export type LvisQuality = {
  score: number;
  passed: boolean;
  warnings: string[];
};

export type LvisValidation = {
  schemaValid: boolean;
  assetValid: boolean;
  tsxValid: boolean;
};

export type LvisReceipt = {
  system: string;
  host: string;
  agent: string;
  workersUsed: string[];
  inputFiles: string[];
  outputFiles: string[];
  workflow: string;
  quality: LvisQuality;
  validation: LvisValidation;
  governance: {
    localOnly: boolean;
    externalProviderFree: boolean;
    pendingEditsUsed: boolean;
    receiptWritten: boolean;
  };
};

export type LvisAssetPackage = {
  kind: VisualAssetKind;
  assetName: string;
  svg?: string;
  optimizedSvg?: string;
  vectorTsx?: string;
  voxelJson?: string;
  voxelTsx?: string;
  previewPng?: string;
  qualityReport?: string;
  usage?: string;
};

export function createBaseReceipt(workflow: VisualWorkflowId): LvisReceipt {
  return {
    system: LVIS_SYSTEM_NAME,
    host: LVIS_HOST_NAME,
    agent: LVIS_ORCHESTRATOR_ID,
    workersUsed: [],
    inputFiles: [],
    outputFiles: [],
    workflow,
    quality: {
      score: 0,
      passed: false,
      warnings: []
    },
    validation: {
      schemaValid: false,
      assetValid: false,
      tsxValid: false
    },
    governance: {
      localOnly: true,
      externalProviderFree: true,
      pendingEditsUsed: workflow === "asset-to-project",
      receiptWritten: false
    }
  };
}

export function validateReceiptSchema(receipt: LvisReceipt) {
  return Boolean(
    receipt.system === LVIS_SYSTEM_NAME &&
    receipt.host === LVIS_HOST_NAME &&
    Array.isArray(receipt.workersUsed) &&
    Array.isArray(receipt.outputFiles) &&
    typeof receipt.quality?.score === "number"
  );
}
