/*
LEEWAY_HEADER - DO NOT REMOVE

REGION: CORE
TAG: CORE.VOICE.TRUTH.MAIN
PURPOSE: LeeWay Voice authority, identity, deduplication, and truthful degradation helpers.
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
*/

import * as crypto from "crypto";

export type LeeWayVoiceAuthorityState =
  | "LEEWAY_VOICE_READY"
  | "LEEWAY_VOICE_DEGRADED"
  | "LEEWAY_VOICE_UNAVAILABLE"
  | "LOCAL_TRANSCRIPT_BRIDGE_READY"
  | "LOCAL_TRANSCRIPT_BRIDGE_DEGRADED"
  | "BROWSER_SPEECH_AVAILABLE"
  | "BROWSER_SPEECH_UNAVAILABLE"
  | "MIC_PERMISSION_REQUIRED"
  | "STALE_EXTENSION_RUNTIME"
  | "VOICE_STATUS_LOOP_DETECTED";

export type LeeWayVoiceBridgeStatusCode =
  | "BRIDGE_OFFLINE"
  | "BRIDGE_ONLINE"
  | "BROWSER_SPEECH_AVAILABLE"
  | "BROWSER_SPEECH_UNAVAILABLE"
  | "LOCAL_TRANSCRIPT_AVAILABLE"
  | "LOCAL_TRANSCRIPT_UNAVAILABLE"
  | "MIC_PERMISSION_REQUIRED"
  | "STALE_EXTENSION_RUNTIME"
  | "VOICE_STATUS_LOOP_DETECTED"
  | "ERROR";

export type LeeWayVoiceEventSource =
  | "LEEWAY_VOICE"
  | "BROWSER_SPEECH_FALLBACK"
  | "LOCAL_TRANSCRIPT_BRIDGE"
  | "RUNTIME_STATUS";

export type LeeWayVoiceMessageSource =
  | "browser"
  | "local-bridge"
  | "runtime-health";

export type LeeWayVoiceTranscriptSource =
  | "browser-speech"
  | "local-transcript";

export type LeeWayVoiceBridgeMessage =
  | {
      type: "VOICE_STATUS";
      status: LeeWayVoiceBridgeStatusCode;
      message: string;
      timestamp: string;
      source: LeeWayVoiceMessageSource;
    }
  | {
      type: "VOICE_TRANSCRIPT";
      transcriptId: string;
      text: string;
      confidence?: number;
      isFinal: boolean;
      timestamp: string;
      source: LeeWayVoiceTranscriptSource;
    }
  | {
      type: "VOICE_ERROR";
      errorId: string;
      message: string;
      timestamp: string;
      source: string;
    };

export type LeeWayVoiceIdentity = {
  voiceEventId: string;
  voiceSessionId: string;
  transcriptId?: string;
  source: LeeWayVoiceEventSource;
  authorityState: LeeWayVoiceAuthorityState;
  ownerAgent: "Lee Prime";
  workflowId: "workflow.voice.command-intake";
  screenId: "screen.agent-lee.voice";
  telemetryStreamId: "stream.voice.bridge";
  auditCategory: "voice.bridge.intake";
  lawReferences: string[];
  timestamp: string;
};

export type LeeWayVoiceReviewClassification =
  | "question"
  | "instruction"
  | "code change request"
  | "app generation request"
  | "admin action request"
  | "publish/security-sensitive request"
  | "unknown";

export type LeeWayVoiceReviewRisk = "low" | "medium" | "high" | "critical";

export type LeeWayVoiceReviewNextAction =
  | "Send as message"
  | "Create proposal"
  | "Ask clarification"
  | "Discard";

export type LeeWayVoiceReviewState = {
  heardText: string;
  source: LeeWayVoiceEventSource;
  sourceLabel: string;
  confidence?: number;
  transcriptId: string;
  timestamp: string;
  classification: LeeWayVoiceReviewClassification;
  risk: LeeWayVoiceReviewRisk;
  nextAction: LeeWayVoiceReviewNextAction;
  sent: boolean;
  identity: LeeWayVoiceIdentity;
};

export type LeeWayVoiceBridgeRuntimeState = {
  runtimeId: string;
  bridgeId: "leeway.voice.local-transcript-bridge";
  status:
    | "offline"
    | "online"
    | "degraded"
    | "permission-required"
    | "loop-detected"
    | "error";
  browserSpeechAvailable: boolean;
  localTranscriptAvailable: boolean;
  endpointUrl: string;
  lastHeartbeatAt?: string;
  lastTranscriptAt?: string;
  lastError?: string;
  loopDetected: boolean;
  duplicateSuppressionCount: number;
  runtimeSourceMode: string;
  telemetryStreamId: string;
  auditCategory: string;
  lawReferences: string[];
  authorityState: LeeWayVoiceAuthorityState;
  listeningSource: LeeWayVoiceEventSource | "NONE";
  lastHeardText: string;
  lastSentText: string;
  typedInputAvailable: boolean;
  staleRuntime: boolean;
  nextActionHint: string;
};

export const LEEWAY_VOICE_LAW_REFERENCES = [
  "LAW-0021 Voice Bridge Message Separation",
  "LeeWay Voice Authority Rule",
  "Proposal Before Mutation"
];

export const KNOWN_STATUS_CHAT_BLOCKLIST = [
  "local transcript bridge is live",
  "browser speech recognition can run when available",
  "endpoint is the local fallback",
  "http://127.0.0.1:7671/transcript"
];

export function createVoiceEventId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function normalizeVoiceText(text: string) {
  return String(text || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function containsBlockedStatusPhrase(text: string) {
  const normalized = normalizeVoiceText(text);
  return KNOWN_STATUS_CHAT_BLOCKLIST.some((phrase) => normalized.includes(phrase));
}

export function hashVoiceText(text: string) {
  return crypto.createHash("sha1").update(String(text || "").trim().toLowerCase()).digest("hex");
}

export function buildLeeWayVoiceIdentity(args: {
  source: LeeWayVoiceEventSource;
  authorityState: LeeWayVoiceAuthorityState;
  voiceSessionId: string;
  transcriptId?: string;
  timestamp?: string;
}): LeeWayVoiceIdentity {
  const timestamp = args.timestamp || new Date().toISOString();
  return {
    voiceEventId: createVoiceEventId("voice-event"),
    voiceSessionId: args.voiceSessionId,
    transcriptId: args.transcriptId,
    source: args.source,
    authorityState: args.authorityState,
    ownerAgent: "Lee Prime",
    workflowId: "workflow.voice.command-intake",
    screenId: "screen.agent-lee.voice",
    telemetryStreamId: "stream.voice.bridge",
    auditCategory: "voice.bridge.intake",
    lawReferences: [...LEEWAY_VOICE_LAW_REFERENCES],
    timestamp
  };
}

export function sourceLabelForVoiceEvent(source: LeeWayVoiceEventSource) {
  switch (source) {
    case "LEEWAY_VOICE":
      return "LeeWay Voice";
    case "BROWSER_SPEECH_FALLBACK":
      return "Browser Speech Fallback";
    case "LOCAL_TRANSCRIPT_BRIDGE":
      return "Local Transcript Bridge";
    case "RUNTIME_STATUS":
    default:
      return "Runtime Status";
  }
}

export function classifyVoiceReview(text: string): {
  classification: LeeWayVoiceReviewClassification;
  risk: LeeWayVoiceReviewRisk;
  nextAction: LeeWayVoiceReviewNextAction;
  mutating: boolean;
} {
  const normalized = normalizeVoiceText(text);
  const has = (value: string) => normalized.includes(value);
  const mutating =
    /(edit|change|update|rewrite|create|generate|apply|install|publish|delete|remove|run|execute|use mcp|tool|setting|configure|deploy)/i.test(text);

  if (/(publish|security|token|secret|credential|permission|root|admin|production|marketplace)/i.test(text)) {
    return { classification: "publish/security-sensitive request", risk: "critical", nextAction: "Create proposal", mutating: true };
  }
  if (/(create app|generate app|scaffold app|build app)/i.test(text)) {
    return { classification: "app generation request", risk: "high", nextAction: "Create proposal", mutating: true };
  }
  if (/(edit|change|update|rewrite|patch|modify|fix|refactor|install extension|install vsix|run code|use mcp|tool)/i.test(text)) {
    return { classification: "code change request", risk: "high", nextAction: "Create proposal", mutating: true };
  }
  if (/(settings|config|enable|disable|turn on|turn off|restart|reload)/i.test(text)) {
    return { classification: "admin action request", risk: "medium", nextAction: "Create proposal", mutating: true };
  }
  if (has("?") || /^(what|why|how|when|where|can you|could you|would you|do you)/i.test(text)) {
    return { classification: "question", risk: "low", nextAction: "Send as message", mutating: false };
  }
  if (mutating) {
    return { classification: "instruction", risk: "medium", nextAction: "Ask clarification", mutating: true };
  }
  return { classification: "unknown", risk: "medium", nextAction: "Ask clarification", mutating: false };
}

export function buildOwnerFacingVoiceStatus(args: {
  authorityState: LeeWayVoiceAuthorityState;
  source: LeeWayVoiceEventSource;
  loopDetected?: boolean;
  microphonePermissionRequired?: boolean;
  staleRuntime?: boolean;
}) {
  if (args.loopDetected || args.authorityState === "VOICE_STATUS_LOOP_DETECTED") {
    return "Voice bridge status loop detected. Status messages are being suppressed and will not enter chat.";
  }
  if (args.microphonePermissionRequired || args.authorityState === "MIC_PERMISSION_REQUIRED") {
    return "Microphone permission is required before LeeWay Voice can listen.";
  }
  if (args.staleRuntime || args.authorityState === "STALE_EXTENSION_RUNTIME") {
    return "Voice may be affected by a stale extension runtime. Typed input remains available while the runtime is repaired.";
  }
  if (args.authorityState === "LEEWAY_VOICE_READY") {
    return "LeeWay Voice is ready. You can speak, review what was heard, and choose when to send.";
  }
  if (args.source === "LOCAL_TRANSCRIPT_BRIDGE") {
    return "Local transcript bridge is available as a fallback. Voice input will be labeled and governed.";
  }
  if (args.source === "BROWSER_SPEECH_FALLBACK") {
    return "Browser speech is available. This is a fallback input path, not full LeeWay Voice authority.";
  }
  if (args.authorityState === "LEEWAY_VOICE_DEGRADED" || args.authorityState === "LOCAL_TRANSCRIPT_BRIDGE_DEGRADED") {
    return "LeeWay Voice is degraded. Typed input remains available, and no voice command will execute automatically.";
  }
  return "Voice input is unavailable right now. Typed input remains available.";
}

export function makeVoiceReviewState(args: {
  text: string;
  source: LeeWayVoiceEventSource;
  authorityState: LeeWayVoiceAuthorityState;
  voiceSessionId: string;
  confidence?: number;
  transcriptId?: string;
  timestamp?: string;
}): LeeWayVoiceReviewState {
  const timestamp = args.timestamp || new Date().toISOString();
  const transcriptId = args.transcriptId || createVoiceEventId("transcript");
  const classified = classifyVoiceReview(args.text);
  return {
    heardText: args.text,
    source: args.source,
    sourceLabel: sourceLabelForVoiceEvent(args.source),
    confidence: args.confidence,
    transcriptId,
    timestamp,
    classification: classified.classification,
    risk: classified.risk,
    nextAction: classified.nextAction,
    sent: false,
    identity: buildLeeWayVoiceIdentity({
      source: args.source,
      authorityState: args.authorityState,
      voiceSessionId: args.voiceSessionId,
      transcriptId,
      timestamp
    })
  };
}

export class LeeWayVoiceDeduplicator {
  private readonly duplicateWindowMs: number;
  private lastStatusKey = "";
  private lastTranscriptId = "";
  private lastTranscriptTextHash = "";
  private lastTranscriptTimestamp = 0;
  private readonly processedTranscriptIds = new Set<string>();
  private duplicateSuppressionCount = 0;

  constructor(options?: { duplicateWindowMs?: number }) {
    this.duplicateWindowMs = Math.max(500, Number(options?.duplicateWindowMs || 5000));
  }

  acceptStatus(status: LeeWayVoiceBridgeStatusCode, message: string, source: string) {
    const key = `${status}:${source}:${normalizeVoiceText(message)}`;
    if (key === this.lastStatusKey) {
      this.duplicateSuppressionCount += 1;
      return { accepted: false, loopDetected: true, duplicateSuppressionCount: this.duplicateSuppressionCount };
    }
    this.lastStatusKey = key;
    return { accepted: true, loopDetected: false, duplicateSuppressionCount: this.duplicateSuppressionCount };
  }

  acceptTranscript(transcriptId: string, text: string, timestamp: number) {
    const nextHash = hashVoiceText(text);
    if (transcriptId && this.processedTranscriptIds.has(transcriptId)) {
      this.duplicateSuppressionCount += 1;
      return { accepted: false, reason: "duplicate_transcript_id", duplicateSuppressionCount: this.duplicateSuppressionCount };
    }
    if (
      nextHash &&
      nextHash === this.lastTranscriptTextHash &&
      Math.abs(timestamp - this.lastTranscriptTimestamp) <= this.duplicateWindowMs
    ) {
      this.duplicateSuppressionCount += 1;
      return { accepted: false, reason: "duplicate_transcript_text_window", duplicateSuppressionCount: this.duplicateSuppressionCount };
    }
    this.lastTranscriptId = transcriptId;
    this.lastTranscriptTextHash = nextHash;
    this.lastTranscriptTimestamp = timestamp;
    if (transcriptId) {
      this.processedTranscriptIds.add(transcriptId);
    }
    return { accepted: true, reason: "", duplicateSuppressionCount: this.duplicateSuppressionCount };
  }

  getState() {
    return {
      lastStatusKey: this.lastStatusKey,
      lastTranscriptId: this.lastTranscriptId,
      lastTranscriptTextHash: this.lastTranscriptTextHash,
      lastTranscriptTimestamp: this.lastTranscriptTimestamp,
      processedTranscriptIds: Array.from(this.processedTranscriptIds),
      duplicateSuppressionCount: this.duplicateSuppressionCount
    };
  }
}
