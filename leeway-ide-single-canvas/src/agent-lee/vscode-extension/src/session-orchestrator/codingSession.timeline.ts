/*
LEEWAY HEADER — DO NOT REMOVE

REGION: 🟢 CORE
TAG: CORE.SESSION.TIMELINE.MAIN

5WH:
WHAT = Agent Lee coding session timeline helpers
WHY = Converts session events into readable progress, receipts, and voice-friendly summaries
WHO = Agent Lee Session Orchestrator
WHERE = src/session-orchestrator/codingSession.timeline.ts
WHEN = 2026
HOW = Timeline formatting and filtering helpers

AGENTS:
SESSION
VOICE
AUDIT

LICENSE:
MIT
*/

import type { CodingSession, CodingSessionTimelineEvent } from "./codingSession.types";

export function formatTimelineEvent(event: CodingSessionTimelineEvent): string {
  const time = new Date(event.timestamp).toLocaleTimeString();
  return `[${time}] ${event.type}: ${event.message}`;
}

export function formatSessionTimeline(session: CodingSession): string {
  if (session.timeline.length === 0) {
    return "No session events recorded yet.";
  }
  return session.timeline.map(formatTimelineEvent).join("\n");
}

export function formatSessionProgressForSpeech(session: CodingSession): string {
  const parts = [
    `Session ${session.title} is currently ${session.phase}.`,
    `Voice turns: ${session.metrics.voiceTurns}.`,
    `Pending packages: ${session.metrics.pendingPackages}.`,
    `Repair packages: ${session.metrics.repairPackages}.`,
    `Accepted hunks: ${session.metrics.hunksAccepted}.`,
    `Rejected hunks: ${session.metrics.hunksRejected}.`,
    `Verification runs: ${session.metrics.verificationRuns}.`,
  ];

  if (session.snapshot.lastVerificationSummary) {
    parts.push(`Last verification: ${session.snapshot.lastVerificationSummary}`);
  }

  if (session.snapshot.blockedFilePaths.length > 0) {
    parts.push(`Blocked files: ${session.snapshot.blockedFilePaths.join(", ")}.`);
  }

  return parts.join(" ");
}

export function getChangedFilesFromTimeline(session: CodingSession): string[] {
  const files = new Set<string>();

  for (const event of session.timeline) {
    const filePath = event.data?.filePath;
    const filesList = event.data?.files;

    if (typeof filePath === "string") {
      files.add(filePath);
    }

    if (Array.isArray(filesList)) {
      for (const item of filesList) {
        if (typeof item === "string") files.add(item);
      }
    }
  }

  return Array.from(files);
}

/*
DISCOVERY_PIPELINE:
Voice → Intent → Location → Vertical → Ranking → Render
*/
