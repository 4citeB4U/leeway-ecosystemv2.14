/*
LEEWAY HEADER - DO NOT REMOVE

REGION: AI
TAG: AI.EXECUTION_BRAIN.MINIMAL_HUNK.GENERATOR
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
*/

import * as fs from "fs";
import * as path from "path";
import type { MinimalHunk } from "./executionBrain.types";

function riskForPrompt(prompt: string): MinimalHunk["risk"] {
  if (/\b(auth|database|payment|deploy|secret|token)\b/i.test(prompt)) return "high";
  if (/\b(refactor|rewrite|rename)\b/i.test(prompt)) return "medium";
  return "low";
}

export function generateMinimalHunks(prompt: string, targetFiles: string[]): MinimalHunk[] {
  const risk = riskForPrompt(prompt);
  const hunks: MinimalHunk[] = [];

  for (const filePath of targetFiles.slice(0, 6)) {
    if (!fs.existsSync(filePath)) continue;
    const content = fs.readFileSync(filePath, "utf8");
    const lines = content.split(/\r?\n/);
    const fileName = path.basename(filePath);

    if (/readme|\.md$/i.test(fileName) && /\b(doc|document|explain|readme)\b/i.test(prompt)) {
      const before = lines.slice(0, Math.min(8, lines.length)).join("\n");
      const after = `${before}\n\n<!-- Agent Lee pending documentation update -->`;
      hunks.push({
        id: `${Date.now()}-${hunks.length}`,
        filePath,
        operation: "replace",
        anchorText: lines[0] || "",
        before,
        after,
        reason: "Draft a minimal documentation patch instead of replacing the whole file.",
        confidence: 0.42,
        risk
      });
      continue;
    }

    const importLine = lines.find((line) => /^import\s/.test(line)) || lines[0] || "";
    const before = importLine;
    const after = before;
    hunks.push({
      id: `${Date.now()}-${hunks.length}`,
      filePath,
      operation: "replace",
      anchorText: before,
      before,
      after,
      reason: `Mark ${fileName} as a target file for a minimal patch plan tied to: ${prompt.slice(0, 120)}`,
      confidence: 0.2,
      risk
    });
  }

  return hunks;
}
