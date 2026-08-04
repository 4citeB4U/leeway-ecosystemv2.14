/*
LEEWAY HEADER — DO NOT REMOVE

REGION: 🟢 CORE
TAG: CORE.LIVEVOICE.INTERRUPTS

5WH:
WHAT = Agent Lee live voice interrupt + barge-in handler
WHY = Allow the user to stop speaking, pause tasks, resume tasks, or query status at any time without waiting for the current action to finish
WHO = Agent Lee Live Voice Runtime
WHERE = src/live-voice/liveVoiceInterrupts.ts
WHEN = 2026
HOW = Checks incoming transcript for interrupt keywords before routing to full intent detection; gates on session phase

AGENTS:
PRIME
VOICE
SHIELD
AUDIT

LICENSE:
MIT
*/

import * as vscode from "vscode";
import { agentLeeLiveTaskEvents } from "./liveTaskEvents";
import { voiceSessionStore } from "./liveVoiceSession.store";

export type InterruptKind =
  | "stop_speaking"
  | "pause_task"
  | "resume_task"
  | "current_status"
  | "reopen_diff"
  | "mute"
  | "unmute"
  | "none";

const STOP_SPEAKING_RE = /\b(stop (talking|speaking)|quiet|shut up|silence)\b/i;
const PAUSE_RE = /\b(pause|hold on|wait|hold that|freeze)\b/i;
const RESUME_RE = /\b(resume|continue|carry on|unpause|go)\b/i;
const STATUS_RE = /\b(what are you doing|status|what('s| is) (happening|going on)|tell me where)\b/i;
const REOPEN_DIFF_RE = /\b(reopen|open|show).*(diff|changes|edit)\b/i;
const MUTE_RE = /\b(mute|be quiet|stop narrating|no more speech)\b/i;
const UNMUTE_RE = /\b(unmute|start (talking|narrating)|voice on)\b/i;
const SERVICE_CONTROL_RE = /\b(service|services)\b/i;
const INDEX_CONTROL_RE = /\b(index status|pause indexing|resume indexing|indexing)\b/i;

export function detectInterrupt(text: string): InterruptKind {
  if (SERVICE_CONTROL_RE.test(text)) return "none";
  if (INDEX_CONTROL_RE.test(text)) return "none";

  if (STOP_SPEAKING_RE.test(text)) return "stop_speaking";
  if (MUTE_RE.test(text)) return "mute";
  if (UNMUTE_RE.test(text)) return "unmute";
  if (PAUSE_RE.test(text)) return "pause_task";
  if (RESUME_RE.test(text)) return "resume_task";
  if (STATUS_RE.test(text)) return "current_status";
  if (REOPEN_DIFF_RE.test(text)) return "reopen_diff";
  return "none";
}

export async function handleInterrupt(
  kind: InterruptKind,
  speak: (text: string) => void | Promise<void>
): Promise<boolean> {
  switch (kind) {
    case "stop_speaking":
      await vscode.commands.executeCommand("agentLee.liveVoice.stopSpeaking");
      return true;

    case "pause_task": {
      const phase = voiceSessionStore.get().phase;
      if (phase === "executing" || phase === "listening") {
        voiceSessionStore.setPhase("paused");
        await vscode.commands.executeCommand("agentLee.liveVoice.pauseTask");
      } else {
        await speak("There is nothing active to pause right now.");
      }
      return true;
    }

    case "resume_task": {
      const phase = voiceSessionStore.get().phase;
      if (phase === "paused") {
        voiceSessionStore.setPhase("listening");
        await vscode.commands.executeCommand("agentLee.liveVoice.resumeTask");
      } else {
        await speak("I was not paused. Ready for your next command.");
      }
      return true;
    }

    case "current_status": {
      const summary = voiceSessionStore.summarize();
      agentLeeLiveTaskEvents.emit("task.started", summary, {
        severity: "info",
        speak: true,
      });
      return true;
    }

    case "reopen_diff":
      await vscode.commands.executeCommand("agentLee.liveVoice.reopenActiveDiff");
      return true;

    case "mute":
      voiceSessionStore.setPhase("muted");
      agentLeeLiveTaskEvents.emit(
        "task.finished",
        "Voice narration muted. Say unmute to restore.",
        { severity: "info", speak: true }
      );
      return true;

    case "unmute":
      voiceSessionStore.setPhase("idle");
      agentLeeLiveTaskEvents.emit(
        "task.started",
        "Voice narration restored.",
        { severity: "success", speak: true }
      );
      return true;

    case "none":
    default:
      return false;
  }
}

/*
DISCOVERY_PIPELINE:
Voice → Intent → Location → Vertical → Ranking → Render
*/
