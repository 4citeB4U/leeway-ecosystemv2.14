/*
LEEWAY HEADER — DO NOT REMOVE

REGION: 🟢 CORE
TAG: CORE.LIVEVOICE.COMMAND.CONTEXT

5WH:
WHAT = Agent Lee live voice command context tracker
WHY = Track the concrete VS Code objects that pronouns like "this", "that one", "the last repair" resolve to
WHO = Agent Lee Live Voice Runtime
WHERE = src/live-voice/liveVoiceCommandContext.ts
WHEN = 2026
HOW = Singleton updated by edit buffer events and verification events; consumed by the context resolver

AGENTS:
PRIME
VOICE
SHIELD
AUDIT

LICENSE:
MIT
*/

import * as vscode from "vscode";

export interface LiveVoiceCommandSnapshot {
  /** URI of the editor that was active at the time of the last voice command */
  activeEditorUri: vscode.Uri | null;
  /** Language id of the active editor */
  activeEditorLanguageId: string | null;
  /** ID of the edit package currently being worked on */
  activePackageId: string | null;
  /** ID of the file edit currently in focus (e.g. last opened diff) */
  activeFileEditId: string | null;
  /** ID of the hunk most recently accepted, rejected, or focused */
  activeHunkId: string | null;
  /** ID of the last repair package created */
  lastRepairPackageId: string | null;
  /** Summary of the last verification run (pass / fail + error count) */
  lastVerificationSummary: string | null;
  /** Whether the last verification passed */
  lastVerificationPassed: boolean | null;
  /** The last spoken phrase from Agent Lee */
  lastAgentSpeech: string | null;
  /** Paths explicitly blocked by the user during this session */
  blockedFilePaths: Set<string>;
  /** Timestamp of last context update */
  updatedAt: string | null;
}

class AgentLeeVoiceCommandContext {
  private snapshot: LiveVoiceCommandSnapshot = {
    activeEditorUri: null,
    activeEditorLanguageId: null,
    activePackageId: null,
    activeFileEditId: null,
    activeHunkId: null,
    lastRepairPackageId: null,
    lastVerificationSummary: null,
    lastVerificationPassed: null,
    lastAgentSpeech: null,
    blockedFilePaths: new Set(),
    updatedAt: null,
  };

  private readonly emitter = new vscode.EventEmitter<LiveVoiceCommandSnapshot>();
  readonly onDidChange = this.emitter.event;

  get(): Readonly<LiveVoiceCommandSnapshot> {
    return this.snapshot;
  }

  setActiveEditor(uri: vscode.Uri | null, languageId: string | null): void {
    this.patch({ activeEditorUri: uri, activeEditorLanguageId: languageId });
  }

  setActivePackage(packageId: string | null): void {
    this.patch({ activePackageId: packageId });
  }

  setActiveFileEdit(fileEditId: string | null): void {
    this.patch({ activeFileEditId: fileEditId });
  }

  setActiveHunk(hunkId: string | null): void {
    this.patch({ activeHunkId: hunkId });
  }

  setLastRepairPackage(packageId: string | null): void {
    this.patch({ lastRepairPackageId: packageId });
  }

  setLastVerification(summary: string, passed: boolean): void {
    this.patch({ lastVerificationSummary: summary, lastVerificationPassed: passed });
  }

  setLastAgentSpeech(text: string): void {
    this.patch({ lastAgentSpeech: text });
  }

  blockFile(filePath: string): void {
    const next = new Set(this.snapshot.blockedFilePaths);
    next.add(filePath);
    this.patch({ blockedFilePaths: next });
  }

  unblockFile(filePath: string): void {
    const next = new Set(this.snapshot.blockedFilePaths);
    next.delete(filePath);
    this.patch({ blockedFilePaths: next });
  }

  isBlocked(filePath: string): boolean {
    for (const blocked of this.snapshot.blockedFilePaths) {
      if (filePath.includes(blocked) || blocked.includes(filePath)) return true;
    }
    return false;
  }

  private patch(partial: Partial<Omit<LiveVoiceCommandSnapshot, "updatedAt">>): void {
    this.snapshot = {
      ...this.snapshot,
      ...partial,
      updatedAt: new Date().toISOString(),
    };
    this.emitter.fire(this.snapshot);
  }

  dispose(): void {
    this.emitter.dispose();
  }
}

export const voiceCommandContext = new AgentLeeVoiceCommandContext();

/*
DISCOVERY_PIPELINE:
Voice → Intent → Location → Vertical → Ranking → Render
*/
