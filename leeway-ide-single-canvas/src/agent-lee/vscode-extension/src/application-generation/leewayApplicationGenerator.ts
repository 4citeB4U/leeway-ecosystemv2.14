/*
LEEWAY_HEADER - DO NOT REMOVE

REGION: CORE.APPLICATION_GENERATION
TAG: CORE.APPLICATION_GENERATION.GENERATOR
PURPOSE: Generates a governed LeeWay application package from the universal blueprint.
*/

import * as path from "path";
import { loadLeeWayUniversalBlueprint } from "./leewayBlueprintLoader";
import { certifyLeeWayGeneratedApplication, type LeeWayGeneratedPackage } from "./leewayApplicationCertification";
import { writeLeeWayGeneratedAppReceipt } from "./leewayGeneratedAppReceipts";

export type LeeWayGeneratorInput = {
  blueprintPath: string;
  receiptRoot: string;
  applicationName: string;
  owner: string;
};

export type LeeWayGeneratorOutput = {
  package: LeeWayGeneratedPackage;
  receiptPath: string;
  finalStatus: "PASS" | "FAIL";
  violations: string[];
};

export function generateLeeWayApplication(input: LeeWayGeneratorInput): LeeWayGeneratorOutput {
  const blueprint = loadLeeWayUniversalBlueprint(input.blueprintPath);

  const generatedPackage: LeeWayGeneratedPackage = {
    applicationObjectId: "LEEWAY-APP-GENERATED-0001",
    traceId: "LEEWAY-TRACE-GENERATION-0001",
    transactionId: "LEEWAY-TXN-GENERATION-0001",
    receiptId: "LEEWAY-RECEIPT-GENERATION-0001",
    artifacts: [...blueprint.requiredArtifacts],
    runtime: {
      health: "/health",
      ready: "/ready",
      metrics: "/metrics",
      lineage: "/lineage",
      receipts: path.join(input.receiptRoot, "receipts")
    }
  };

  const certification = certifyLeeWayGeneratedApplication(blueprint, generatedPackage);
  const receiptPath = writeLeeWayGeneratedAppReceipt(input.receiptRoot, generatedPackage, certification);

  return {
    package: generatedPackage,
    receiptPath,
    finalStatus: certification.finalStatus,
    violations: certification.violations
  };
}
