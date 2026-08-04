/*
LEEWAY HEADER - DO NOT REMOVE

REGION: DATA
TAG: DATA.EDITBUFFER.RECEIPTS.MAIN
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
*/

import * as fs from "fs";
import * as path from "path";
import { performanceGovernor } from "../performance/performanceGovernor";

export interface EditBufferReceipt {
  id: string;
  packageId: string;
  action: string;
  status: "passed" | "failed" | "blocked" | "rebased";
  summary: string;
  files?: string[];
  hunks?: string[];
  timestamp: string;
  details?: Record<string, unknown>;
}

const ROOT = path.join(process.env.USERPROFILE || process.env.HOME || ".", ".leeway-vscode");
const RECEIPT_DIR = path.join(ROOT, "logs", "agent-lee", "edit-buffer");

fs.mkdirSync(RECEIPT_DIR, { recursive: true });

const queuedReceiptLines = new Map<string, string[]>();
const flushTimers = new Map<string, NodeJS.Timeout>();

export function writeEditBufferReceipt(
  input: Omit<EditBufferReceipt, "id" | "timestamp">
): EditBufferReceipt {
  const receipt: EditBufferReceipt = {
    id: createReceiptId(),
    timestamp: new Date().toISOString(),
    ...input
  };

  const file = path.join(RECEIPT_DIR, `${new Date().toISOString().slice(0, 10)}.jsonl`);
  queueReceiptLine(file, JSON.stringify(receipt) + "\n");
  return receipt;
}

function queueReceiptLine(filePath: string, line: string) {
  const existing = queuedReceiptLines.get(filePath) ?? [];
  existing.push(line);
  queuedReceiptLines.set(filePath, existing);

  const currentTimer = flushTimers.get(filePath);
  if (currentTimer) {
    clearTimeout(currentTimer);
  }

  const delay = performanceGovernor.getBudget().receiptFlushMs;
  flushTimers.set(
    filePath,
    setTimeout(() => {
      flushReceiptFile(filePath);
    }, delay)
  );
}

function flushReceiptFile(filePath: string) {
  const lines = queuedReceiptLines.get(filePath);
  if (!lines?.length) return;

  fs.appendFileSync(filePath, lines.join(""), "utf8");
  queuedReceiptLines.delete(filePath);

  const currentTimer = flushTimers.get(filePath);
  if (currentTimer) {
    clearTimeout(currentTimer);
    flushTimers.delete(filePath);
  }
}

function createReceiptId() {
  const stamp = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
  const rand = Math.random().toString(36).slice(2, 8);
  return `LEE-EDIT-${stamp}-${rand}`;
}
