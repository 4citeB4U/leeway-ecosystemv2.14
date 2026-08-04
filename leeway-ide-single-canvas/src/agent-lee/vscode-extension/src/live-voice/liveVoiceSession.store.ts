/*
LEEWAY HEADER — DO NOT REMOVE

REGION: 🟢 CORE
TAG: CORE.LIVEVOICE.SESSION.STORE

5WH:
WHAT = Agent Lee live voice session state store
WHY = Track whether Agent Lee is listening, speaking, waiting for approval, executing, paused, or muted so the conversation controller can respond naturally
WHO = Agent Lee Live Voice Runtime
WHERE = src/live-voice/liveVoiceSession.store.ts
WHEN = 2026
HOW = Singleton with VS Code EventEmitter; consumed by conversation controller and interrupt handler

AGENTS:
PRIME
VOICE
SHIELD
AUDIT

LICENSE:
MIT
*/

import * as vscode from "vscode";

export type VoiceSessionPhase =
  | "idle"
  | "listening"
  | "speaking"
  | "waiting_approval"
  | "executing"
  | "paused"
  | "muted";

export interface VoiceSessionState {
  phase: VoiceSessionPhase;
  activeTaskLabel: string | null;
  activeTaskCommand: string | null;
  lastTranscript: string | null;
  pendingApprovalLabel: string | null;
  turnCount: number;
  sessionStartedAt: string | null;
  lastActivityAt: string | null;
}

const DEFAULT_STATE: VoiceSessionState = {
  phase: "idle",
  activeTaskLabel: null,
  activeTaskCommand: null,
  lastTranscript: null,
  pendingApprovalLabel: null,
  turnCount: 0,
  sessionStartedAt: null,
  lastActivityAt: null,
};

export class AgentLeeVoiceSessionStore {
  private state: VoiceSessionState = { ...DEFAULT_STATE };
  private readonly emitter = new vscode.EventEmitter<VoiceSessionState>();

  readonly onDidChange = this.emitter.event;

  get(): Readonly<VoiceSessionState> {
    return this.state;
  }

  setPhase(phase: VoiceSessionPhase): void {
    this.state = {
      ...this.state,
      phase,
      lastActivityAt: new Date().toISOString(),
    };
    this.emitter.fire(this.state);
  }

  setActiveTask(label: string | null, command: string | null): void {
    this.state = {
      ...this.state,
      activeTaskLabel: label,
      activeTaskCommand: command,
      lastActivityAt: new Date().toISOString(),
    };
    this.emitter.fire(this.state);
  }

  setPendingApproval(label: string | null): void {
    this.state = {
      ...this.state,
      pendingApprovalLabel: label,
      phase: label ? "waiting_approval" : this.state.phase,
      lastActivityAt: new Date().toISOString(),
    };
    this.emitter.fire(this.state);
  }

  recordTranscript(text: string): void {
    this.state = {
      ...this.state,
      lastTranscript: text,
      turnCount: this.state.turnCount + 1,
      lastActivityAt: new Date().toISOString(),
      sessionStartedAt: this.state.sessionStartedAt ?? new Date().toISOString(),
    };
    this.emitter.fire(this.state);
  }

  summarize(): string {
    const s = this.state;

    if (s.phase === "muted") {
      return "I am currently muted.";
    }
    if (s.phase === "paused") {
      const task = s.activeTaskLabel ?? "the current task";
      return `I have paused ${task}. Say resume or continue to carry on.`;
    }
    if (s.phase === "waiting_approval") {
      const label = s.pendingApprovalLabel ?? "an action";
      return `I am waiting for your approval to ${label}. Say yes to approve, or no to cancel.`;
    }
    if (s.phase === "executing") {
      const task = s.activeTaskLabel ?? "a task";
      return `I am currently executing ${task}.`;
    }
    if (s.phase === "speaking") {
      return "I am currently speaking. Say stop talking to interrupt me.";
    }
    if (s.phase === "listening") {
      return "I am listening. Go ahead and speak your command.";
    }
    return "I am idle and ready for your next command.";
  }

  reset(): void {
    this.state = { ...DEFAULT_STATE };
    this.emitter.fire(this.state);
  }

  dispose(): void {
    this.emitter.dispose();
  }
}

export const voiceSessionStore = new AgentLeeVoiceSessionStore();

/*
DISCOVERY_PIPELINE:
Voice → Intent → Location → Vertical → Ranking → Render
*/
