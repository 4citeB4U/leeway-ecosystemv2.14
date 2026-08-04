/*
LEEWAY_HEADER - DO NOT REMOVE

REGION: 💾 DATA
TAG: DATA.VISUAL.LVIS.RECEIPTS
PURPOSE: Writes receipts for LVIS command usage and integration outcomes.
DISCOVERY_PIPELINE:
  Voice → Intent → Location → Vertical → Ranking → Render
*/

import * as fs from "fs";
import * as path from "path";

const ROOT = path.join(process.env.USERPROFILE || "", ".leeway-vscode");
const RECEIPT_DIR = path.join(ROOT, "agent-lee", "receipts");

export function writeLvisReceipt(action: string, summary: string, details: Record<string, unknown> = {}) {
  fs.mkdirSync(RECEIPT_DIR, { recursive: true });
  const timestamp = new Date().toISOString();
  const safeStamp = timestamp.replace(/[:.]/g, "-");
  const target = path.join(RECEIPT_DIR, `lvis-${safeStamp}.md`);
  const lines = [
    "<!--",
    "LEEWAY_HEADER - DO NOT REMOVE",
    "REGION: 💾 DATA",
    "TAG: DATA.VISUAL.LVIS.RECEIPT",
    "DISCOVERY_PIPELINE:",
    "  Voice → Intent → Location → Vertical → Ranking → Render",
    "-->",
    "",
    `# LVIS Receipt`,
    "",
    `- Timestamp: ${timestamp}`,
    `- Action: ${action}`,
    `- Summary: ${summary}`,
    `- Details: \`${JSON.stringify(details)}\``
  ];
  fs.writeFileSync(target, lines.join("\n"), "utf8");
  return target;
}
