/*
LEEWAY_HEADER - DO NOT REMOVE

REGION: VOICE_RUNTIME
TAG: CORE.AGENT_LEE.LEEWAY_AGENT_VOICE_RUNTIME.CONTRACT
PURPOSE: LeeWay Agent Voice Runtime TypeScript contract: event types, provider state interface, and runtime interface.
         All local-only. No external API dependencies.
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
*/

export type LeeWayVoiceRuntimeEventType =
  | "LAVR_SESSION_STARTED"
  | "LAVR_SESSION_CLOSED"
  | "LAVR_SESSION_CONNECTED"
  | "LAVR_SESSION_DISCONNECTED"
  | "LAVR_FALLBACK_BRIDGE_REQUESTED"
  | "LAVR_USER_AUDIO_DELTA"
  | "LAVR_USER_SPEECH_STARTED"
  | "LAVR_USER_SPEECH_STOPPED"
  | "LAVR_TURN_COMMITTED"
  | "LAVR_ASSISTANT_RESPONSE_STARTED"
  | "LAVR_ASSISTANT_AUDIO_DELTA"
  | "LAVR_ASSISTANT_TRANSCRIPT_DELTA"
  | "LAVR_ASSISTANT_RESPONSE_DONE"
  | "LAVR_INTERRUPT_REQUESTED"
  | "LAVR_TOOL_REQUESTED"
  | "LAVR_TOOL_COMPLETED"
  | "LAVR_ERROR";

/** @deprecated Use LeeWayVoiceRuntimeEventType */
export type VoiceRealtimeEventType = LeeWayVoiceRuntimeEventType;

export interface LeeWayVoiceRuntimeEvent {
  type: LeeWayVoiceRuntimeEventType;
  timestamp?: number;
  transcript?: string;
  audio?: ArrayBuffer;
  text?: string;
  source?: string;
  reason?: string;
  message?: string;
  name?: string;
  args?: unknown;
  callId?: string;
  result?: unknown;
  cause?: unknown;
}

export type LeeWayVoiceRuntimeEventHandler = (event: LeeWayVoiceRuntimeEvent) => void;
/** @deprecated Use LeeWayVoiceRuntimeEventHandler */
export type VoiceRealtimeEventHandler = LeeWayVoiceRuntimeEventHandler;

export type LeeWayVoiceRuntimeStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "listening"
  | "user_speaking"
  | "assistant_speaking"
  | "tool_running"
  | "interrupted"
  | "error"
  | "closed";
/** @deprecated Use LeeWayVoiceRuntimeStatus */
export type VoiceRealtimeProviderStatus = LeeWayVoiceRuntimeStatus;

export interface LeeWayVoiceRuntimeState {
  status: LeeWayVoiceRuntimeStatus;
  connected: boolean;
  listening: boolean;
  providerKind: string;
  lastError?: string;
}
/** @deprecated Use LeeWayVoiceRuntimeState */
export interface VoiceRealtimeProviderState extends LeeWayVoiceRuntimeState {}

export interface LeeWayVoiceRuntime {
  id: string;
  connect(): Promise<void> | void;
  disconnect(reason?: string): Promise<void> | void;
  startListening?(): Promise<void> | void;
  stopListening?(): Promise<void> | void;
  sendAudioFrame(frame: ArrayBuffer): Promise<void> | void;
  sendUserText?(text: string): Promise<void> | void;
  cancelResponse(reason?: string): Promise<void> | void;
  sendToolResult(callId: string, result: unknown): Promise<void> | void;
  sendToolError?(callId: string, error: string): Promise<void> | void;
  getState(): LeeWayVoiceRuntimeState;
  on(type: LeeWayVoiceRuntimeEventType, handler: LeeWayVoiceRuntimeEventHandler): () => void;
}
/** @deprecated Use LeeWayVoiceRuntime */
export interface VoiceRealtimeProvider extends LeeWayVoiceRuntime {}
