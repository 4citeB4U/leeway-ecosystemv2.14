/*
LEEWAY HEADER — DO NOT REMOVE

REGION: 🧠 AI
TAG: AI.SESSION.ORCHESTRATOR.MAIN

5WH:
WHAT = Agent Lee coding session orchestrator
WHY = Coordinates live coding sessions across voice, execution brain, edit buffer, verification, repair, and receipts
WHO = Agent Lee Session Orchestrator
WHERE = src/session-orchestrator/codingSession.orchestrator.ts
WHEN = 2026
HOW = Session lifecycle manager with VS Code command integration

AGENTS:
PRIME
SESSION
VOICE
DOCTOR
AUDIT

LICENSE:
MIT
*/

import { codingSessionStore } from "./codingSession.store";
import {
  buildCodingSessionSummary,
  exportCodingSessionReceipt,
} from "./codingSession.summary";
import { formatSessionProgressForSpeech } from "./codingSession.timeline";
import { agentLeeLiveTaskEvents } from "../live-voice/liveTaskEvents";

export class AgentLeeCodingSessionOrchestrator {
  start(input: {
    title?: string;
    objective?: string;
    userRequest?: string;
    activeEditorUri?: string;
    activeEditorLanguageId?: string;
    blockedFilePaths?: string[];
  }) {
    const session = codingSessionStore.start({
      title: input.title ?? "Agent Lee Coding Session",
      objective:
        input.objective ?? input.userRequest ?? "Live guided coding session.",
      userRequest: input.userRequest,
      snapshot: {
        activeEditorUri: input.activeEditorUri,
        activeEditorLanguageId: input.activeEditorLanguageId,
        blockedFilePaths: input.blockedFilePaths ?? [],
      },
    });

    agentLeeLiveTaskEvents.emit(
      "task.started",
      `Coding session started: ${session.title}`,
      { severity: "success", speak: true, data: { sessionId: session.id } }
    );

    return session;
  }

  pause(reason = "Session paused."): void {
    codingSessionStore.setPhase("paused", reason);
    agentLeeLiveTaskEvents.emit("task.finished", reason, {
      severity: "warning",
      speak: true,
    });
  }

  resume(reason = "Session resumed."): void {
    codingSessionStore.setPhase("started", reason);
    agentLeeLiveTaskEvents.emit("task.started", reason, {
      severity: "info",
      speak: true,
    });
  }

  stop(reason = "Session stopped."): void {
    const stopped = codingSessionStore.stop(reason);
    if (stopped) {
      agentLeeLiveTaskEvents.emit("task.finished", reason, {
        severity: "warning",
        speak: true,
        data: { sessionId: stopped.id },
      });
    }
  }

  complete(message = "Session completed."): void {
    const completed = codingSessionStore.complete(message);
    if (completed) {
      const exported = exportCodingSessionReceipt(completed);
      agentLeeLiveTaskEvents.emit(
        "task.finished",
        `Session completed. Receipt exported to ${exported.markdownPath}.`,
        {
          severity: "success",
          speak: true,
          data: {
            sessionId: completed.id,
            markdownPath: exported.markdownPath,
            jsonPath: exported.jsonPath,
          },
        }
      );
    }
  }

  fail(message: string): void {
    const failed = codingSessionStore.fail(message);
    if (failed) {
      exportCodingSessionReceipt(failed);
      agentLeeLiveTaskEvents.emit("task.failed", message, {
        severity: "error",
        speak: true,
        data: { sessionId: failed.id },
      });
    }
  }

  status(): string {
    const session = codingSessionStore.getActive();
    if (!session) return "No active Agent Lee coding session.";
    return formatSessionProgressForSpeech(session);
  }

  summary(): string {
    const session = codingSessionStore.getActive();
    if (!session) return "No active Agent Lee coding session to summarize.";

    const s = buildCodingSessionSummary(session);
    return [
      `Session ${s.title} is ${s.phase}.`,
      `Duration: ${s.durationSeconds} seconds.`,
      `Voice turns: ${s.metrics.voiceTurns}.`,
      `Pending packages: ${s.metrics.pendingPackages}.`,
      `Repair packages: ${s.metrics.repairPackages}.`,
      `Accepted hunks: ${s.metrics.hunksAccepted}.`,
      `Rejected hunks: ${s.metrics.hunksRejected}.`,
      `Verification runs: ${s.metrics.verificationRuns}.`,
      s.lastVerificationSummary
        ? `Last verification: ${s.lastVerificationSummary}.`
        : "",
    ]
      .filter(Boolean)
      .join(" ");
  }

  exportReceipt(): string {
    const session = codingSessionStore.getActive();
    if (!session) return "No active Agent Lee coding session to export.";

    const exported = exportCodingSessionReceipt(session);
    return `Session receipt exported. Markdown: ${exported.markdownPath}. JSON: ${exported.jsonPath}.`;
  }

  recordVoiceTurn(text: string): void {
    if (!codingSessionStore.getActive()) return;
    codingSessionStore.addEvent("voice.turn", text, { text });
  }

  recordPendingPackage(packageId: string, label?: string): void {
    if (!codingSessionStore.getActive()) return;
    codingSessionStore.updateSnapshot({ activePackageId: packageId });
    codingSessionStore.addEvent(
      "pending.package.created",
      label ?? `Pending package created: ${packageId}`,
      { packageId }
    );
  }

  recordRepairPackage(packageId: string): void {
    if (!codingSessionStore.getActive()) return;
    codingSessionStore.updateSnapshot({
      activePackageId: packageId,
      lastRepairPackageId: packageId,
    });
    codingSessionStore.addEvent(
      "repair.package.created",
      `Repair package created: ${packageId}`,
      { packageId }
    );
  }

  recordVerification(summary: string, passed: boolean): void {
    if (!codingSessionStore.getActive()) return;
    codingSessionStore.updateSnapshot({
      lastVerificationSummary: summary,
      lastVerificationPassed: passed,
    });
    codingSessionStore.addEvent("verify.finished", summary, { passed });
  }

  recordBlockedFile(filePath: string): void {
    const session = codingSessionStore.getActive();
    if (!session) return;

    const current = new Set(session.snapshot.blockedFilePaths);
    current.add(filePath);

    codingSessionStore.updateSnapshot({
      blockedFilePaths: Array.from(current),
    });
    codingSessionStore.addEvent(
      "file.blocked",
      `Blocked file from session edits: ${filePath}`,
      { filePath }
    );
  }
}

export const codingSessionOrchestrator = new AgentLeeCodingSessionOrchestrator();

/*
DISCOVERY_PIPELINE:
Voice → Intent → Location → Vertical → Ranking → Render
*/
