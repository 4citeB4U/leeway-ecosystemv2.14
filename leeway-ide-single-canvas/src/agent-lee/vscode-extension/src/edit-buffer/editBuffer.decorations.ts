/*
LEEWAY HEADER - DO NOT REMOVE

REGION: UI
TAG: UI.EDIT_BUFFER.DECORATIONS.MAIN
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
*/

import * as vscode from "vscode";
import { editBufferStore } from "./editBuffer.store";
import { runtimeBudgetStore } from "../performance/runtimeBudget.store";

const pendingDecoration = vscode.window.createTextEditorDecorationType({
  isWholeLine: false,
  borderWidth: "1px",
  borderStyle: "solid",
  borderColor: "rgba(57,255,20,0.55)",
  backgroundColor: "rgba(57,255,20,0.10)"
});

let refreshTimer: NodeJS.Timeout | undefined;

export function refreshAgentLeeDecorations() {
  const budget = runtimeBudgetStore.getBudget();

  if (refreshTimer) {
    clearTimeout(refreshTimer);
  }

  refreshTimer = setTimeout(() => {
    const packages = editBufferStore.allPackages();
    for (const editor of vscode.window.visibleTextEditors) {
      const ranges: vscode.Range[] = [];
      for (const pkg of packages) {
        for (const file of pkg.files) {
          if (file.uri.toString() !== editor.document.uri.toString()) continue;
          for (const hunk of file.hunks) {
            if (hunk.status === "pending") {
              ranges.push(hunk.range);
              if (ranges.length >= budget.maxDecorationsPerEditor) break;
            }
          }
          if (ranges.length >= budget.maxDecorationsPerEditor) break;
        }
        if (ranges.length >= budget.maxDecorationsPerEditor) break;
      }
      editor.setDecorations(
        pendingDecoration,
        ranges.slice(0, budget.maxDecorationsPerEditor)
      );
    }
  }, budget.decorationThrottleMs);
}
