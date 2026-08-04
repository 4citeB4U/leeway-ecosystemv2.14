/*
LEEWAY HEADER — DO NOT REMOVE

REGION: 🟢 CORE
TAG: CORE.SESSION.TYPES.MAIN

5WH:
WHAT = Agent Lee coding session type system
WHY = Defines live coding session state, timeline events, receipts, and summaries
WHO = Agent Lee Session Orchestrator
WHERE = src/session-orchestrator/codingSession.types.ts
WHEN = 2026
HOW = TypeScript contracts for guided coding sessions

AGENTS:
PRIME
SESSION
AUDIT
SHIELD

LICENSE:
MIT
*/

export type CodingSessionPhase =
  | "idle"
  | "started"
  | "planning"
  | "editing"
  | "reviewing"
  | "applying"
  | "verifying"
  | "repairing"
  | "paused"
  | "completed"
  | "failed"
  | "stopped";

export type CodingSessionEventType =
  | "session.started"
  | "session.paused"
  | "session.resumed"
  | "session.stopped"
  | "session.completed"
  | "session.failed"
  | "context.captured"
  | "plan.created"
  | "pending.package.created"
  | "hunk.accepted"
  | "hunk.rejected"
  | "apply.started"
  | "apply.finished"
  | "verify.started"
  | "verify.finished"
  | "repair.candidates.found"
  | "repair.package.created"
  | "receipt.exported"
  | "voice.turn"
  | "file.blocked"
  | "file.unblocked";

export interface CodingSessionTimelineEvent {
  id: string;
  type: CodingSessionEventType;
  message: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

export interface CodingSessionSnapshot {
  activeEditorUri?: string;
  activeEditorLanguageId?: string;
  activePackageId?: string;
  activeFileEditId?: string;
  activeHunkId?: string;
  lastRepairPackageId?: string;
  lastVerificationSummary?: string;
  lastVerificationPassed?: boolean;
  blockedFilePaths: string[];
}

export interface CodingSession {
  id: string;
  title: string;
  objective: string;
  phase: CodingSessionPhase;
  startedAt: string;
  updatedAt: string;
  endedAt?: string;

  activeTaskLabel?: string;
  lastUserRequest?: string;

  snapshot: CodingSessionSnapshot;
  timeline: CodingSessionTimelineEvent[];

  metrics: {
    voiceTurns: number;
    pendingPackages: number;
    repairPackages: number;
    hunksAccepted: number;
    hunksRejected: number;
    applyAttempts: number;
    verificationRuns: number;
    filesBlocked: number;
  };
}

export interface CodingSessionSummary {
  id: string;
  title: string;
  objective: string;
  phase: CodingSessionPhase;
  durationSeconds: number;
  metrics: CodingSession["metrics"];
  changedFiles: string[];
  blockedFiles: string[];
  lastVerificationSummary?: string;
  finalStatus: string;
  timelineText: string;
}

/*
DISCOVERY_PIPELINE:
Voice → Intent → Location → Vertical → Ranking → Render
*/
