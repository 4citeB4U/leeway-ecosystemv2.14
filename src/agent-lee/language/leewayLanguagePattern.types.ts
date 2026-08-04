export type AgentLeeSpeechMode =
  | "CREATOR_CONVERSATION"
  | "RUNTIME_NARRATION"
  | "BLOCKER_REPORTING"
  | "ENTERPRISE_PRESENTATION"
  | "TECHNICAL_EXPLANATION"
  | "SYSTEM_COMMAND"
  | "LIVE_CONCIERGE"
  | "TEACHING_MODE"
  | "PUBLIC_DEMO"
  | "RUNTIME_EMERGENCY";

export type AgentLeeLanguageMode =
  | "LEEWAY_AGENT_LEE_LANGUAGE_MODE::HIP_HOP_TECHNICAL_CONCIERGE"
  | "LEEWAY_AGENT_LEE_LANGUAGE_MODE::ENTERPRISE_CLEAN_TRANSLATION";

export interface SpeechPatternToken {
  token: string;
  description: string;
  usageRule: string;
  bannedInEnterprise?: boolean;
}

export interface LanguagePatternProfile {
  profileId: string;
  categories: Record<string, string[]>;
  patternTokens: SpeechPatternToken[];
}

export interface TransformationGuardrails {
  preserveTruthLabels: boolean;
  preserveTechnicalAccuracy: boolean;
  avoidStereotypes: boolean;
  avoidForcedSlang: boolean;
  avoidCopyrightedImitation: boolean;
  enforceEnterpriseBoundaries: boolean;
}

export interface TransformationInput {
  sourceText: string;
  mode?: AgentLeeSpeechMode;
  contextTags?: string[];
  truthLabel?: "LIVE_PROVEN" | "PARTIAL" | "BLOCKED" | "NOT_YET_PROVEN";
  situation?: LiveLanguageRuntimeSituation;
  speaker?: "Leonard Lee" | "Agent Lee" | "Runtime" | "Generated Application";
}

export interface TransformationResult {
  mode: AgentLeeSpeechMode;
  languageMode: AgentLeeLanguageMode;
  transformedText: string;
  appliedTokens: string[];
  warnings: string[];
  preservedTruthLabel?: string;
  creatorMirror?: CreatorLanguageMirrorSignal;
  voicePerformance?: AgentLeeVoicePerformancePlan;
  liveEmbodimentLaw?: LiveEmbodimentLawStatus;
}

export interface LiveLanguageRuntimeSituation {
  blockerSeverity?: "none" | "minor" | "major" | "critical";
  runtimeHealth?: "healthy" | "degraded" | "critical" | "unknown";
  deploymentRisk?: "low" | "medium" | "high" | "blocked";
  rtcContinuity?: "LIVE_PROVEN" | "PARTIAL" | "BLOCKED" | "NOT_YET_PROVEN";
  gpuAuthority?: "LIVE_PROVEN" | "PARTIAL" | "BLOCKED" | "NOT_YET_PROVEN";
  voiceContinuity?: "LIVE_PROVEN" | "PARTIAL" | "BLOCKED" | "NOT_YET_PROVEN";
  microphoneContinuity?: "LIVE_PROVEN" | "PARTIAL" | "BLOCKED" | "NOT_YET_PROVEN";
  enterpriseContext?: boolean;
}

export interface CreatorLanguageMirrorSignal {
  layerId: "LEEWAY_CREATOR_LANGUAGE_MIRROR";
  recognizedPatterns: string[];
  commandCadence: "none" | "direct" | "stacked" | "urgent";
  correctionCadence: "none" | "truth_label" | "escalated_truth";
  visionaryCadence: "none" | "architectural" | "movement_scale";
  emotionalState: "neutral" | "runtime_frustration" | "excitement_approval" | "focused_pressure";
}

export interface AgentLeeVoicePerformancePlan {
  engineId: "LEEWAY_AGENT_LEE_VOICE_PERFORMANCE_ENGINE";
  pauses: "short" | "measured" | "firm";
  emphasis: "light" | "clear" | "strong";
  urgency: "low" | "medium" | "high" | "freeze";
  pacing: "slow" | "steady" | "quick";
  toneLane: "creator" | "operator" | "enterprise" | "public_demo" | "educational" | "emergency";
}

export interface LiveEmbodimentLawStatus {
  languageProcessorActive: boolean;
  rtcContinuityActive: boolean;
  voiceContinuityActive: boolean;
  microphoneContinuityActive: boolean;
  narrationActive: boolean;
  creatorMirroringActive: boolean;
  runtimeAwarenessActive: boolean;
  finalEmbodimentSatisfied: boolean;
}
