/*
LEEWAY HEADER — DO NOT REMOVE

REGION: 🟢 CORE
TAG: CORE.INDEXING.BACKGROUND.TYPES

5WH:
WHAT = Agent Lee background indexer type system
WHY = Defines the governed workspace indexing contracts used by runtime service control
WHO = Agent Lee Background Indexer Runtime
WHERE = src/indexing/backgroundIndexer.types.ts
WHEN = 2026
HOW = Shared state and record types for index batches, graph output, and receipts

AGENTS:
PRIME
DOCTOR
AUDIT

LICENSE:
MIT
*/

export type BackgroundIndexerPhase = "idle" | "running" | "paused" | "failed";

export interface BackgroundIndexerFileRecord {
  path: string;
  language: string;
  imports: string[];
  symbols: string[];
  commands: string[];
  packageScripts: string[];
  hasLeeWayHeader: boolean;
  indexedAt: string;
}

export interface BackgroundIndexerGraphEdge {
  from: string;
  to: string;
  kind: "import" | "command";
}

export interface BackgroundIndexerState {
  phase: BackgroundIndexerPhase;
  workspaceRoot: string;
  queuedFiles: number;
  indexedFiles: number;
  lastBatchCount: number;
  lastRunAt?: string;
  message: string;
}

export interface BackgroundIndexerReceipt {
  ts: string;
  phase: BackgroundIndexerPhase;
  indexedFiles: number;
  queuedFiles: number;
  lastBatchCount: number;
  message: string;
}

/*
DISCOVERY_PIPELINE:
Voice → Intent → Location → Vertical → Ranking → Render
*/