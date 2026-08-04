/*
LEEWAY HEADER - DO NOT REMOVE

REGION: UI
TAG: UI.EDITBUFFER.CODELENS.MAIN
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
*/

import * as vscode from "vscode";
import { editBufferStore } from "./editBuffer.store";

export class AgentLeeEditBufferCodeLensProvider implements vscode.CodeLensProvider {
  private readonly onDidChangeEmitter = new vscode.EventEmitter<void>();
  readonly onDidChangeCodeLenses = this.onDidChangeEmitter.event;

  refresh() {
    this.onDidChangeEmitter.fire();
  }

  provideCodeLenses(document: vscode.TextDocument) {
    const lenses: vscode.CodeLens[] = [];

    for (const pkg of editBufferStore.listPackages()) {
      for (const file of pkg.files) {
        if (file.uri.toString() !== document.uri.toString()) continue;

        for (const hunk of file.hunks) {
          if (hunk.status !== "pending") continue;
          const range = new vscode.Range(hunk.range.start, hunk.range.start);

          lenses.push(new vscode.CodeLens(range, {
            title: "Agent Lee: Accept Hunk",
            command: "agentLee.editBuffer.acceptHunk",
            arguments: [pkg.id, file.id, hunk.id]
          }));

          lenses.push(new vscode.CodeLens(range, {
            title: "Reject",
            command: "agentLee.editBuffer.rejectHunk",
            arguments: [pkg.id, file.id, hunk.id]
          }));

          lenses.push(new vscode.CodeLens(range, {
            title: "Explain",
            command: "agentLee.editBuffer.explainHunk",
            arguments: [pkg.id, file.id, hunk.id]
          }));

          lenses.push(new vscode.CodeLens(range, {
            title: "Open Diff",
            command: "agentLee.editBuffer.openDiff",
            arguments: [pkg.id, file.id]
          }));
        }
      }
    }

    return lenses;
  }
}
