/*
LEEWAY HEADER - DO NOT REMOVE

REGION: AI
TAG: AI.EXECUTION_BRAIN.CONFLICT_DETECTOR.MAIN
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
*/

import * as fs from "fs";
import type { ConflictCheckResult, MinimalHunk } from "./executionBrain.types";

export function detectHunkConflict(hunk: MinimalHunk): ConflictCheckResult {
  if (!fs.existsSync(hunk.filePath)) {
    return { safe: false, conflictType: "file_deleted", detail: "Target file no longer exists." };
  }

  const content = fs.readFileSync(hunk.filePath, "utf8");
  if (hunk.before && content.includes(hunk.before)) {
    return { safe: true, conflictType: "none", detail: "Original hunk text still matches the file." };
  }

  if (hunk.anchorText && !content.includes(hunk.anchorText)) {
    return { safe: false, conflictType: "anchor_missing", detail: "Anchor text is missing; hunk may be stale." };
  }

  return {
    safe: false,
    conflictType: "original_text_missing",
    detail: "The original text is no longer present in the file."
  };
}
