/*
LEEWAY HEADER — DO NOT REMOVE

REGION: 💾 DATA
TAG: DATA.SESSION.SUMMARY.MAIN

5WH:
WHAT = Agent Lee coding session summary and receipt exporter
WHY = Produces session summaries and persistent receipts for live coding work
WHO = Agent Lee Session Orchestrator
WHERE = src/session-orchestrator/codingSession.summary.ts
WHEN = 2026
HOW = Summary generation plus Markdown/JSON receipt export

AGENTS:
SESSION
AUDIT
PRIME

LICENSE:
MIT
*/

import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import type { CodingSession, CodingSessionSummary } from "./codingSession.types";
import {
  formatSessionTimeline,
  getChangedFilesFromTimeline,
} from "./codingSession.timeline";

function rootDir(): string {
  const workspace = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  return workspace ?? process.env["USERPROFILE"] ?? process.env["HOME"] ?? ".";
}

function receiptDir(): string {
  const dir = path.join(rootDir(), ".agent-lee", "receipts", "sessions");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function buildCodingSessionSummary(
  session: CodingSession
): CodingSessionSummary {
  const start = new Date(session.startedAt).getTime();
  const end = new Date(session.endedAt ?? new Date().toISOString()).getTime();
  const changedFiles = getChangedFilesFromTimeline(session);

  return {
    id: session.id,
    title: session.title,
    objective: session.objective,
    phase: session.phase,
    durationSeconds: Math.max(0, Math.round((end - start) / 1000)),
    metrics: session.metrics,
    changedFiles,
    blockedFiles: session.snapshot.blockedFilePaths,
    lastVerificationSummary: session.snapshot.lastVerificationSummary,
    finalStatus: session.phase,
    timelineText: formatSessionTimeline(session),
  };
}

export function formatCodingSessionSummary(
  summary: CodingSessionSummary
): string {
  return [
    `# Agent Lee Coding Session Summary`,
    ``,
    `## Session`,
    `- ID: ${summary.id}`,
    `- Title: ${summary.title}`,
    `- Objective: ${summary.objective}`,
    `- Final status: ${summary.finalStatus}`,
    `- Duration: ${summary.durationSeconds}s`,
    ``,
    `## Metrics`,
    `- Voice turns: ${summary.metrics.voiceTurns}`,
    `- Pending packages: ${summary.metrics.pendingPackages}`,
    `- Repair packages: ${summary.metrics.repairPackages}`,
    `- Accepted hunks: ${summary.metrics.hunksAccepted}`,
    `- Rejected hunks: ${summary.metrics.hunksRejected}`,
    `- Apply attempts: ${summary.metrics.applyAttempts}`,
    `- Verification runs: ${summary.metrics.verificationRuns}`,
    `- Blocked files: ${summary.metrics.filesBlocked}`,
    ``,
    `## Changed Files`,
    ...(summary.changedFiles.length
      ? summary.changedFiles.map((f) => `- ${f}`)
      : [`- None recorded`]),
    ``,
    `## Blocked Files`,
    ...(summary.blockedFiles.length
      ? summary.blockedFiles.map((f) => `- ${f}`)
      : [`- None`]),
    ``,
    `## Last Verification`,
    summary.lastVerificationSummary ?? `No verification summary recorded.`,
    ``,
    `## Timeline`,
    "```txt",
    summary.timelineText,
    "```",
  ].join("\n");
}

export function exportCodingSessionReceipt(session: CodingSession): {
  markdownPath: string;
  jsonPath: string;
  summary: CodingSessionSummary;
} {
  const summary = buildCodingSessionSummary(session);
  const dir = receiptDir();
  const base = `${new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14)}-${session.id}`;

  const markdownPath = path.join(dir, `${base}.md`);
  const jsonPath = path.join(dir, `${base}.json`);

  fs.writeFileSync(markdownPath, formatCodingSessionSummary(summary), "utf8");
  fs.writeFileSync(
    jsonPath,
    JSON.stringify({ session, summary }, null, 2),
    "utf8"
  );

  return { markdownPath, jsonPath, summary };
}

/*
DISCOVERY_PIPELINE:
Voice → Intent → Location → Vertical → Ranking → Render
*/
