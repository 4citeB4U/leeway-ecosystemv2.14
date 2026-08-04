/*
LEEWAY_HEADER - DO NOT REMOVE

REGION: CORE.APPLICATION_GENERATION
TAG: CORE.APPLICATION_GENERATION.CERTIFICATION
PURPOSE: Certifies generated applications against blueprint requirements.
*/

import type { LeeWayUniversalBlueprint } from "./leewayBlueprintLoader";

export type LeeWayGeneratedPackage = {
  applicationObjectId: string;
  traceId: string;
  transactionId: string;
  receiptId: string;
  artifacts: string[];
  runtime: Record<string, string>;
};

export type LeeWayCertificationResult = {
  certificationObjectId: string;
  violations: string[];
  finalStatus: "PASS" | "FAIL";
};

export function certifyLeeWayGeneratedApplication(
  blueprint: LeeWayUniversalBlueprint,
  generatedPackage: LeeWayGeneratedPackage
): LeeWayCertificationResult {
  const violations: string[] = [];

  if (!generatedPackage.applicationObjectId) violations.push("Missing applicationObjectId.");
  if (!generatedPackage.traceId) violations.push("Missing traceId.");
  if (!generatedPackage.transactionId) violations.push("Missing transactionId.");
  if (!generatedPackage.receiptId) violations.push("Missing receiptId.");

  for (const artifact of blueprint.requiredArtifacts) {
    if (!generatedPackage.artifacts.includes(artifact)) {
      violations.push(`Missing required artifact: ${artifact}`);
    }
  }

  for (const surface of blueprint.requiredRuntimeSurfaces) {
    if (!generatedPackage.runtime[surface]) {
      violations.push(`Missing runtime surface: ${surface}`);
    }
  }

  return {
    certificationObjectId: "LEEWAY-CERTIFICATION-GENERATION-0001",
    violations,
    finalStatus: violations.length === 0 ? "PASS" : "FAIL"
  };
}
