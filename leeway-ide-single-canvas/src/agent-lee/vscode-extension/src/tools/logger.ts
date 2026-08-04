/*
LEEWAY_HEADER - DO NOT REMOVE

REGION: 🟠 UTIL
TAG: UTIL.LOGGING.TOOLS.MAIN

5WH:
WHAT = Writes Agent Lee runtime event logs and memory traces.
WHY = Preserves receipts and debug context for governed execution.
WHO = Agent Lee / LeeWay Runtime.
WHERE = agent-lee/vscode-extension/src/tools/logger.ts
WHEN = 2026
HOW = Append-only JSONL logging with file-operation retry helpers.
*/

import * as fs from "fs";
import { appendFileWithRetries, describeFileError } from "../core/file-ops";

export function logEvent(type: string, agent: string, message: string, details: any = {}) {
  const root = process.env.USERPROFILE + "\\.leeway-vscode";
  const date = new Date().toISOString().slice(0,10);

  const entry = {
    timestamp: new Date().toISOString(),
    type,
    agent,
    message,
    details
  };

  const line = JSON.stringify(entry);

  fs.mkdirSync(`${root}\\logs\\daily`, { recursive: true });
  fs.mkdirSync(`${root}\\memory\\db`, { recursive: true });

  try {
    appendFileWithRetries(`${root}\\logs\\daily\\agent-lee-${date}.jsonl`, line + "\n");
  } catch (error) {
    console.warn(`[Agent Lee] Daily log write failed: ${describeFileError(error)}`);
  }

  try {
    appendFileWithRetries(`${root}\\memory\\db\\agent-lee-memory.jsonl`, line + "\n");
  } catch (error) {
    console.warn(`[Agent Lee] Memory log write failed: ${describeFileError(error)}`);
  }
}

/*
DISCOVERY_PIPELINE:
Voice → Intent → Location → Vertical → Ranking → Render
*/
