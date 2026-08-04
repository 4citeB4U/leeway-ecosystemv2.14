/*
LEEWAY_HEADER - DO NOT REMOVE
TAG: REVIEW.RECEIPT.WRITER
REGION: GOVERNANCE
PURPOSE: Writes governed code review receipts through Bridge Runtime evidence paths.
*/

import * as fs from "fs";
import * as path from "path";
import { resolveWorkspaceRoot } from "../agents/leewayAgentBookClient";
import type { LeewayCodeReviewReceipt } from "./review.types";

function ensureDirectory(targetPath: string) {
  fs.mkdirSync(targetPath, { recursive: true });
}

export function writeLeewayReviewReceipt(receipt: LeewayCodeReviewReceipt, workspaceRoot = resolveWorkspaceRoot()): LeewayCodeReviewReceipt {
  const reportsRoot = path.join(workspaceRoot, ".leeway-vscode", "bridge-runtime", "reports");
  ensureDirectory(reportsRoot);

  const receiptFileName = `code-review-receipt-${receipt.reviewId}.json`;
  const receiptPath = path.join(reportsRoot, receiptFileName);
  const receiptWithPath: LeewayCodeReviewReceipt = {
    ...receipt,
    receiptPath: path.relative(workspaceRoot, receiptPath).replace(/\\/g, "/")
  };

  fs.writeFileSync(receiptPath, JSON.stringify(receiptWithPath, null, 2), "utf8");

  const authorityStatusPath = path.join(reportsRoot, "code-review-authority-status.json");
  const nextStatus = {
    status: "PARTIAL",
    standardsAuthority: "LeeWay-Standards",
    bridgeRuntimeExecutor: ".leeway-vscode/bridge-runtime",
    reviewExecutor: "Agent Lee VS Code Extension",
    lastReview: receiptWithPath,
    lastUpdatedAt: new Date().toISOString()
  };

  fs.writeFileSync(authorityStatusPath, JSON.stringify(nextStatus, null, 2), "utf8");
  return receiptWithPath;
}