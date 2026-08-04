/*
LEEWAY HEADER — DO NOT REMOVE

REGION: 💾 DATA
TAG: DATA.SESSION.STORE.MAIN

5WH:
WHAT = Agent Lee coding session store
WHY = Tracks one live coding session with state, metrics, context, and timeline
WHO = Agent Lee Session Orchestrator
WHERE = src/session-orchestrator/codingSession.store.ts
WHEN = 2026
HOW = Singleton in-memory store with VS Code event emitter

AGENTS:
SESSION
PRIME
AUDIT

LICENSE:
MIT
*/

import * as vscode from "vscode";
import type {
  CodingSession,
  CodingSessionEventType,
  CodingSessionPhase,
  CodingSessionSnapshot,
  CodingSessionTimelineEvent,
} from "./codingSession.types";

function makeId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function now(): string {
  return new Date().toISOString();
}

const EMPTY_SNAPSHOT: CodingSessionSnapshot = {
  blockedFilePaths: [],
};

class CodingSessionStore {
  private activeSession: CodingSession | null = null;

  private readonly _onDidChange = new vscode.EventEmitter<CodingSession | null>();
  readonly onDidChange = this._onDidChange.event;

  start(input: {
    title: string;
    objective: string;
    userRequest?: string;
    snapshot?: Partial<CodingSessionSnapshot>;
  }): CodingSession {
    const stamp = now();

    this.activeSession = {
      id: makeId("session"),
      title: input.title,
      objective: input.objective,
      phase: "started",
      startedAt: stamp,
      updatedAt: stamp,
      lastUserRequest: input.userRequest,
      snapshot: {
        ...EMPTY_SNAPSHOT,
        ...input.snapshot,
        blockedFilePaths: input.snapshot?.blockedFilePaths ?? [],
      },
      timeline: [],
      metrics: {
        voiceTurns: 0,
        pendingPackages: 0,
        repairPackages: 0,
        hunksAccepted: 0,
        hunksRejected: 0,
        applyAttempts: 0,
        verificationRuns: 0,
        filesBlocked: input.snapshot?.blockedFilePaths?.length ?? 0,
      },
    };

    this.addEvent("session.started", `Started session: ${input.title}`, {
      objective: input.objective,
      userRequest: input.userRequest,
    });

    this.fireChange();
    return this.activeSession;
  }

  getActive(): CodingSession | null {
    return this.activeSession;
  }

  requireActive(): CodingSession {
    if (!this.activeSession) {
      throw new Error("No active Agent Lee coding session.");
    }
    return this.activeSession;
  }

  setPhase(phase: CodingSessionPhase, message?: string): void {
    if (!this.activeSession) return;

    this.activeSession.phase = phase;
    this.activeSession.updatedAt = now();

    if (message) {
      const eventType = `session.${phase}` as CodingSessionEventType;
      // Only add event for known phase transitions
      const knownPhaseEvents: CodingSessionEventType[] = [
        "session.started",
        "session.paused",
        "session.resumed",
        "session.stopped",
        "session.completed",
        "session.failed",
      ];
      if (knownPhaseEvents.includes(eventType)) {
        this.addEvent(eventType, message);
      }
    }

    this.fireChange();
  }

  updateSnapshot(snapshot: Partial<CodingSessionSnapshot>): void {
    if (!this.activeSession) return;

    this.activeSession.snapshot = {
      ...this.activeSession.snapshot,
      ...snapshot,
      blockedFilePaths:
        snapshot.blockedFilePaths ?? this.activeSession.snapshot.blockedFilePaths,
    };

    this.activeSession.updatedAt = now();
    this.fireChange();
  }

  addEvent(
    type: CodingSessionEventType,
    message: string,
    data?: Record<string, unknown>
  ): CodingSessionTimelineEvent {
    const session = this.requireActive();

    const event: CodingSessionTimelineEvent = {
      id: makeId("event"),
      type,
      message,
      timestamp: now(),
      data,
    };

    session.timeline.push(event);
    session.updatedAt = now();

    this.bumpMetric(type);
    this.fireChange();

    return event;
  }

  stop(reason = "Session stopped by user."): CodingSession | null {
    if (!this.activeSession) return null;

    this.activeSession.phase = "stopped";
    this.activeSession.endedAt = now();
    this.activeSession.updatedAt = now();
    this.addEvent("session.stopped", reason);

    const stopped = this.activeSession;
    this.fireChange();
    return stopped;
  }

  complete(message = "Session completed."): CodingSession | null {
    if (!this.activeSession) return null;

    this.activeSession.phase = "completed";
    this.activeSession.endedAt = now();
    this.activeSession.updatedAt = now();
    this.addEvent("session.completed", message);

    const completed = this.activeSession;
    this.fireChange();
    return completed;
  }

  fail(message: string): CodingSession | null {
    if (!this.activeSession) return null;

    this.activeSession.phase = "failed";
    this.activeSession.endedAt = now();
    this.activeSession.updatedAt = now();
    this.addEvent("session.failed", message);

    const failed = this.activeSession;
    this.fireChange();
    return failed;
  }

  private bumpMetric(type: CodingSessionEventType): void {
    if (!this.activeSession) return;
    const m = this.activeSession.metrics;

    if (type === "voice.turn") m.voiceTurns += 1;
    if (type === "pending.package.created") m.pendingPackages += 1;
    if (type === "repair.package.created") m.repairPackages += 1;
    if (type === "hunk.accepted") m.hunksAccepted += 1;
    if (type === "hunk.rejected") m.hunksRejected += 1;
    if (type === "apply.started") m.applyAttempts += 1;
    if (type === "verify.started") m.verificationRuns += 1;
    if (type === "file.blocked") {
      m.filesBlocked = this.activeSession.snapshot.blockedFilePaths.length;
    }
  }

  private fireChange(): void {
    this._onDidChange.fire(this.activeSession);
  }
}

export const codingSessionStore = new CodingSessionStore();

/*
DISCOVERY_PIPELINE:
Voice → Intent → Location → Vertical → Ranking → Render
*/
