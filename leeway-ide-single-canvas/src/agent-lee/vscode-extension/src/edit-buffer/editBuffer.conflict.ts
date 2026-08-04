/*
LEEWAY HEADER - DO NOT REMOVE

REGION: CORE
TAG: CORE.EDITBUFFER.CONFLICT.MAIN
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
*/

import * as vscode from "vscode";
import type { AgentLeeEditHunk } from "./editBuffer.types";

export type HunkConflictStatus =
  | "clean"
  | "rebase_available"
  | "conflict"
  | "missing_original";

export interface HunkConflictResult {
  status: HunkConflictStatus;
  message: string;
  range: vscode.Range;
}

export function checkHunkConflict(
  document: vscode.TextDocument,
  hunk: AgentLeeEditHunk
): HunkConflictResult {
  const currentText = document.getText();
  const currentAtRange = safeGetRangeText(document, hunk.range);

  if (currentAtRange === hunk.originalText) {
    return {
      status: "clean",
      message: "Hunk original text still matches current range.",
      range: hunk.range
    };
  }

  const exactIndex = currentText.indexOf(hunk.originalText);
  if (exactIndex >= 0) {
    const rebasedRange = new vscode.Range(
      document.positionAt(exactIndex),
      document.positionAt(exactIndex + hunk.originalText.length)
    );
    return {
      status: "rebase_available",
      message: "Original text moved. Hunk can be safely rebased.",
      range: rebasedRange
    };
  }

  if (!hunk.originalText.trim() && hunk.range.isEmpty) {
    return {
      status: "clean",
      message: "Insertion hunk is clean.",
      range: hunk.range
    };
  }

  return {
    status: "conflict",
    message: "Original text no longer matches. Manual review required.",
    range: hunk.range
  };
}

function safeGetRangeText(document: vscode.TextDocument, range: vscode.Range) {
  try {
    return document.getText(range);
  } catch {
    return "";
  }
}
