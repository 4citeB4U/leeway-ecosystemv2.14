/*
LEEWAY HEADER - DO NOT REMOVE

REGION: AI
TAG: AI.EXECUTION_BRAIN.HUNK_REBASE.MAIN
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
*/

import * as fs from "fs";
import type { MinimalHunk, RebasedHunkResult } from "./executionBrain.types";

function nearestLine(content: string, anchorText: string) {
  const lines = content.split(/\r?\n/);
  const index = lines.findIndex((line) => line.includes(anchorText));
  return index >= 0 ? lines[index] : "";
}

export function rebaseHunk(hunk: MinimalHunk): RebasedHunkResult {
  if (!fs.existsSync(hunk.filePath)) {
    return { rebased: false, before: hunk.before, after: hunk.after, anchorText: hunk.anchorText, detail: "Cannot rebase because the file is gone." };
  }

  const content = fs.readFileSync(hunk.filePath, "utf8");
  if (hunk.before && content.includes(hunk.before)) {
    return { rebased: true, before: hunk.before, after: hunk.after, anchorText: hunk.anchorText, detail: "No rebase needed; original text still exists." };
  }

  if (hunk.anchorText && content.includes(hunk.anchorText)) {
    const anchor = nearestLine(content, hunk.anchorText);
    return {
      rebased: true,
      before: anchor || hunk.before,
      after: hunk.after,
      anchorText: hunk.anchorText,
      detail: "Rebased hunk using nearby anchor text."
    };
  }

  return {
    rebased: false,
    before: hunk.before,
    after: hunk.after,
    anchorText: hunk.anchorText,
    detail: "Unable to find a safe anchor for rebase."
  };
}
