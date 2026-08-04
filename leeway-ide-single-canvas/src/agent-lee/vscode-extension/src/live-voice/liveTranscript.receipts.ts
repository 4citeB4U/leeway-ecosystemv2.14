/*
LEEWAY HEADER — DO NOT REMOVE

REGION: 🟢 CORE
TAG: CORE.LIVEVOICE.TRANSCRIPT.RECEIPTS

5WH:
WHAT = Agent Lee live voice transcript receipt writer
WHY = Persist spoken turns so the session is auditable and reviewable after the fact
WHO = Agent Lee Live Voice Runtime
WHERE = src/live-voice/liveTranscript.receipts.ts
WHEN = 2026
HOW = Appends JSONL receipt entries to a rolling daily file under <workspace>/.agent-lee/receipts/voice/

AGENTS:
PRIME
VOICE
SHIELD
AUDIT

LICENSE:
MIT
*/

import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { performanceGovernor } from "../performance/performanceGovernor";

export interface TranscriptReceiptEntry {
  timestamp: string;
  turn: number;
  speaker: "user" | "agent";
  text: string;
  intent?: string;
  interrupted?: boolean;
  phase?: string;
}

const pendingReceiptLines = new Map<string, string[]>();
const pendingReceiptTimers = new Map<string, NodeJS.Timeout>();

function resolveReceiptDir(): string | null {
  const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!root) return null;
  return path.join(root, ".agent-lee", "receipts", "voice");
}

function todayFileName(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `transcript-${y}-${m}-${day}.jsonl`;
}

export function writeTranscriptReceipt(entry: TranscriptReceiptEntry): void {
  const dir = resolveReceiptDir();
  if (!dir) return;

  try {
    fs.mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, todayFileName());
    const line = JSON.stringify(entry) + "\n";
    queueTranscriptLine(filePath, line);
  } catch {
    // Non-blocking: receipt write failures must not interrupt voice flow
  }
}

export function readTodayTranscripts(): TranscriptReceiptEntry[] {
  const dir = resolveReceiptDir();
  if (!dir) return [];

  try {
    const filePath = path.join(dir, todayFileName());
    flushTranscriptFile(filePath);
    if (!fs.existsSync(filePath)) return [];

    const raw = fs.readFileSync(filePath, "utf8");
    return raw
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line) as TranscriptReceiptEntry);
  } catch {
    return [];
  }
}

function queueTranscriptLine(filePath: string, line: string): void {
  const queued = pendingReceiptLines.get(filePath) ?? [];
  queued.push(line);
  pendingReceiptLines.set(filePath, queued);

  const existingTimer = pendingReceiptTimers.get(filePath);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  const delay = performanceGovernor.getBudget().receiptFlushMs;
  pendingReceiptTimers.set(
    filePath,
    setTimeout(() => {
      flushTranscriptFile(filePath);
    }, delay)
  );
}

function flushTranscriptFile(filePath: string): void {
  const queued = pendingReceiptLines.get(filePath);
  if (!queued?.length) return;

  fs.appendFileSync(filePath, queued.join(""), "utf8");
  pendingReceiptLines.delete(filePath);

  const existingTimer = pendingReceiptTimers.get(filePath);
  if (existingTimer) {
    clearTimeout(existingTimer);
    pendingReceiptTimers.delete(filePath);
  }
}

export function summarizeTodaySession(): string {
  const entries = readTodayTranscripts();
  if (!entries.length) {
    return "No voice turns recorded today yet.";
  }

  const userTurns = entries.filter((e) => e.speaker === "user").length;
  const agentTurns = entries.filter((e) => e.speaker === "agent").length;
  const interrupted = entries.filter((e) => e.interrupted).length;

  return (
    `Today's session has ${userTurns} user turn${userTurns !== 1 ? "s" : ""} ` +
    `and ${agentTurns} agent response${agentTurns !== 1 ? "s" : ""}` +
    (interrupted ? `, with ${interrupted} interrupt${interrupted !== 1 ? "s" : ""}.` : ".")
  );
}

/*
DISCOVERY_PIPELINE:
Voice → Intent → Location → Vertical → Ranking → Render
*/
