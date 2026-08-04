/*
LEEWAY HEADER — DO NOT REMOVE

REGION: 💾 DATA
TAG: DATA.INDEXING.BACKGROUND.STORE

5WH:
WHAT = Agent Lee background indexer state store
WHY = Tracks runtime index state and emits changes to commands/status surfaces
WHO = Agent Lee Background Indexer Runtime
WHERE = src/indexing/backgroundIndexer.store.ts
WHEN = 2026
HOW = Singleton in-memory store with VS Code event emitter

AGENTS:
DOCTOR
PRIME
AUDIT

LICENSE:
MIT
*/

import * as vscode from "vscode";
import type { BackgroundIndexerState } from "./backgroundIndexer.types";

class BackgroundIndexerStore {
  private state: BackgroundIndexerState = {
    phase: "idle",
    workspaceRoot: "",
    queuedFiles: 0,
    indexedFiles: 0,
    lastBatchCount: 0,
    message: "Indexer not started.",
  };

  private readonly onDidChangeEmitter = new vscode.EventEmitter<BackgroundIndexerState>();
  readonly onDidChange = this.onDidChangeEmitter.event;

  get(): BackgroundIndexerState {
    return this.state;
  }

  update(next: Partial<BackgroundIndexerState>): BackgroundIndexerState {
    this.state = {
      ...this.state,
      ...next,
    };
    this.onDidChangeEmitter.fire(this.state);
    return this.state;
  }
}

export const backgroundIndexerStore = new BackgroundIndexerStore();

/*
DISCOVERY_PIPELINE:
Voice → Intent → Location → Vertical → Ranking → Render
*/