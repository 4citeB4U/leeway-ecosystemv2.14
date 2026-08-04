/*
LEEWAY_HEADER - DO NOT REMOVE

REGION: CORE.APPLICATION_GENERATION
TAG: CORE.APPLICATION_GENERATION.RECEIPTS
PURPOSE: Writes governed generation receipts for generated applications.
*/

import * as path from "path";
import { writeJsonWithRetries } from "../core/file-ops";
import type { LeeWayCertificationResult, LeeWayGeneratedPackage } from "./leewayApplicationCertification";

export function writeLeeWayGeneratedAppReceipt(
  receiptRoot: string,
  generatedPackage: LeeWayGeneratedPackage,
  certification: LeeWayCertificationResult
) {
  const timestamp = new Date().toISOString().replace(/[.:]/g, "-");
  const filePath = path.join(receiptRoot, `generated-app-receipt-${timestamp}.json`);
  const payload = {
    receiptObjectId: "LEEWAY-RECEIPT-GENERATION-0001",
    generatedAt: new Date().toISOString(),
    applicationObjectId: generatedPackage.applicationObjectId,
    traceId: generatedPackage.traceId,
    transactionId: generatedPackage.transactionId,
    receiptId: generatedPackage.receiptId,
    certification
  };

  writeJsonWithRetries(filePath, payload, "Generated application certification receipt.");
  return filePath;
}
