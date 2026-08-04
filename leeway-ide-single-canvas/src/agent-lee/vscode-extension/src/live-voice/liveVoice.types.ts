/*
LEEWAY_HEADER - DO NOT REMOVE

REGION: VOICE_RUNTIME
TAG: CORE.AGENT_LEE.LEEWAY_AGENT_VOICE_RUNTIME.TYPES
PURPOSE: LeeWay Agent Voice Runtime live event types and speech contract for Agent Lee.
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
*/

export type AgentLeeLiveEventType =
  | "task.started"
  | "edit.pending.created"
  | "edit.hunk.accepted"
  | "edit.hunk.rejected"
  | "edit.apply.started"
  | "edit.apply.finished"
  | "edit.apply.blocked"
  | "verify.started"
  | "verify.finished"
  | "repair.candidates.found"
  | "repair.package.created"
  | "approval.required"
  | "receipt.written"
  | "task.failed"
  | "task.finished";

export interface AgentLeeLiveEvent {
  id: string;
  type: AgentLeeLiveEventType;
  message: string;
  severity: "info" | "success" | "warning" | "error";
  speak: boolean;
  data?: Record<string, unknown>;
  timestamp: string;
}

export interface AgentLeeSpeechRequest {
  text: string;
  reason:
    | "status"
    | "verification"
    | "repair"
    | "approval"
    | "warning"
    | "error"
    | "summary";
  interruptible: boolean;
}

export type LeeWayVoiceRuntimeEventType =
  | "LAVR_SESSION_STARTED"
  | "LAVR_SESSION_CLOSED"
  | "LAVR_FALLBACK_BRIDGE_REQUESTED"
  | "LAVR_USER_AUDIO_DELTA"
  | "LAVR_USER_SPEECH_STARTED"
  | "LAVR_USER_SPEECH_STOPPED"
  | "LAVR_TURN_COMMITTED"
  | "LAVR_ASSISTANT_RESPONSE_STARTED"
  | "LAVR_ASSISTANT_RESPONSE_DONE"
  | "LAVR_INTERRUPT_REQUESTED"
  | "LAVR_TOOL_REQUESTED"
  | "LAVR_TOOL_COMPLETED"
  | "LAVR_ERROR";
/** @deprecated Use LeeWayVoiceRuntimeEventType */
export type AgentLeeRealtimeVoiceEventType = LeeWayVoiceRuntimeEventType;

export interface LeeWayVoiceRuntimeLiveEvent {
  type: LeeWayVoiceRuntimeEventType;
  timestamp?: number;
  transcript?: string;
  source?: string;
  reason?: string;
  message?: string;
  name?: string;
  args?: unknown;
  callId?: string;
  result?: unknown;
}
