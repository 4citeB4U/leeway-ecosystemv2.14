/*
LEEWAY_HEADER - DO NOT REMOVE

REGION: 💾 DATA
TAG: DATA.EXECUTION_BRAIN.RECEIPT_LOGGER.MAIN

5WH:
WHAT = Writes execution-brain receipts to disk.
WHY = Preserves governed evidence after execution-brain flows run.
WHO = Agent Lee / LeeWay Runtime.
WHERE = agent-lee/vscode-extension/src/execution-brain/executionReceipt.logger.ts
WHEN = 2026
HOW = Persists JSON receipts through the shared governed file-ops layer.
*/

import * as fs from "fs";
import * as path from "path";
import { writeJsonWithRetries } from "../core/file-ops";

const ROOT = path.join(process.env.USERPROFILE || process.env.HOME || ".", ".leeway-vscode");
const RECEIPT_DIR = path.join(ROOT, "reports", "execution-brain");

fs.mkdirSync(RECEIPT_DIR, { recursive: true });

export function writeExecutionReceipt(input: Record<string, unknown>) {
  const file = path.join(RECEIPT_DIR, `execution-receipt-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  writeJsonWithRetries(file, input, "Agent Lee execution-brain receipt.");
  return file;
}

/*
DISCOVERY_PIPELINE:
Voice → Intent → Location → Vertical → Ranking → Render
*/
