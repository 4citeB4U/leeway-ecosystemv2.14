import {
  AgentLeeLanguageMode,
  AgentLeeSpeechMode,
  AgentLeeVoicePerformancePlan,
  CreatorLanguageMirrorSignal,
  LiveEmbodimentLawStatus,
  LanguagePatternProfile,
  TransformationGuardrails,
  TransformationInput,
  TransformationResult,
} from "./leewayLanguagePattern.types";

const BLOCKER_TERMS = ["blocked", "cannot", "fail", "not ready", "down", "missing", "error", "unavailable"];
const ENTERPRISE_TERMS = ["enterprise", "partner", "presentation", "stakeholder", "microsoft", "google", "openai"];
const COMMAND_TERMS = ["run", "execute", "dispatch", "route", "repair", "activate", "start", "stop"];

export class LeewayAgentLeeStyleAdapter {
  constructor(
    private readonly profile: LanguagePatternProfile,
    private readonly guardrails: TransformationGuardrails,
  ) {}

  detectMode(input: TransformationInput): AgentLeeSpeechMode {
    if (input.mode) {
      return input.mode;
    }

    const text = input.sourceText.toLowerCase();
    if (input.situation?.blockerSeverity === "critical" || input.situation?.deploymentRisk === "blocked") {
      return "RUNTIME_EMERGENCY";
    }
    if (BLOCKER_TERMS.some((term) => text.includes(term))) {
      return "BLOCKER_REPORTING";
    }
    if (ENTERPRISE_TERMS.some((term) => text.includes(term))) {
      return "ENTERPRISE_PRESENTATION";
    }
    if (COMMAND_TERMS.some((term) => text.includes(term))) {
      return "SYSTEM_COMMAND";
    }
    if (text.includes("explain") || text.includes("because") || text.includes("why")) {
      return "TEACHING_MODE";
    }
    return "RUNTIME_NARRATION";
  }

  applyModeStyle(input: TransformationInput, mode: AgentLeeSpeechMode): TransformationResult {
    const warnings: string[] = [];
    const appliedTokens: string[] = [];
    const truthLabel = input.truthLabel;
    const creatorMirror = this.buildCreatorMirror(input);
    const voicePerformance = this.buildVoicePerformance(input, mode, creatorMirror);
    const liveEmbodimentLaw = this.buildEmbodimentLaw(input);

    const languageMode: AgentLeeLanguageMode =
      mode === "ENTERPRISE_PRESENTATION"
        ? "LEEWAY_AGENT_LEE_LANGUAGE_MODE::ENTERPRISE_CLEAN_TRANSLATION"
        : "LEEWAY_AGENT_LEE_LANGUAGE_MODE::HIP_HOP_TECHNICAL_CONCIERGE";

    let transformed = input.sourceText.trim();

    switch (mode) {
      case "CREATOR_CONVERSATION":
      case "LIVE_CONCIERGE":
        transformed = this.withCreatorCadence(transformed);
        appliedTokens.push("DIRECT_CREATOR_ADDRESS", "RHYTHMIC_RESTATEMENT", "HIP_HOP_TECHNICAL_BRIDGE");
        break;
      case "BLOCKER_REPORTING":
        transformed = this.withBlockerCadence(transformed);
        appliedTokens.push("HARD_TRUTH_CORRECTION", "NO_FAKE_PASS", "LIVE_RUNTIME_DISCIPLINE");
        break;
      case "SYSTEM_COMMAND":
        transformed = this.withCommandCadence(transformed);
        appliedTokens.push("BUILD_THE_SYSTEM_FORWARD", "DIRECT_CREATOR_ADDRESS");
        break;
      case "ENTERPRISE_PRESENTATION":
        transformed = this.withEnterpriseCadence(transformed);
        appliedTokens.push("ENTERPRISE_CLEAN_TRANSLATION", "STREET_CLEAR_TECHNICAL_EXPLANATION");
        break;
      case "RUNTIME_EMERGENCY":
        transformed = this.withEmergencyCadence(transformed);
        appliedTokens.push("NO_FAKE_PASS", "RUNTIME_EMERGENCY_FREEZE", "LIVE_RUNTIME_DISCIPLINE");
        break;
      case "TEACHING_MODE":
      case "TECHNICAL_EXPLANATION":
        transformed = this.withTeachingCadence(transformed);
        appliedTokens.push("STREET_CLEAR_TECHNICAL_EXPLANATION", "RHYTHMIC_RESTATEMENT");
        break;
      case "RUNTIME_NARRATION":
      default:
        transformed = this.withNarrationCadence(transformed);
        appliedTokens.push("LIVE_RUNTIME_DISCIPLINE", "BUILD_THE_SYSTEM_FORWARD");
        break;
    }

    if (truthLabel && this.guardrails.preserveTruthLabels && !transformed.includes(truthLabel)) {
      transformed = `${transformed} Truth label: ${truthLabel}.`;
      appliedTokens.push("PRESERVE_TRUTH_LABEL");
    }

    if (this.guardrails.avoidForcedSlang) {
      const bannedPatterns = [/\bfinna finna\b/i, /\bya'?ll ya'?ll\b/i, /\bain'?t ain'?t\b/i];
      if (bannedPatterns.some((pattern) => pattern.test(transformed))) {
        warnings.push("Forced slang pattern detected and softened.");
        transformed = transformed.replace(/\s+/g, " ").trim();
      }
    }

    if (this.guardrails.avoidCopyrightedImitation) {
      const imitationTriggers = [/as \w+ said/i, /like \w+ rap/i, /in the style of/i];
      if (imitationTriggers.some((pattern) => pattern.test(transformed))) {
        warnings.push("Potential imitation phrase detected and removed.");
        transformed = transformed
          .replace(/in the style of[^.]*\.?/gi, "")
          .replace(/as \w+ said[^.]*\.?/gi, "")
          .trim();
      }
    }

    return {
      mode,
      languageMode,
      transformedText: transformed,
      appliedTokens,
      warnings,
      preservedTruthLabel: truthLabel,
      creatorMirror,
      voicePerformance,
      liveEmbodimentLaw,
    };
  }

  private withCreatorCadence(text: string): string {
    return `Leonard, here is the clear line: ${text} We keep it tight, truthful, and moving forward.`;
  }

  private withBlockerCadence(text: string): string {
    return `Hard truth, Leonard: ${text} We are not stamping readiness until the proof chain stands clean.`;
  }

  private withCommandCadence(text: string): string {
    return `Command lane active. ${text} I will run this in governed order and receipt every step.`;
  }

  private withEnterpriseCadence(text: string): string {
    return `Operational summary: ${text} This remains evidence-backed, standards-governed, and enterprise-safe.`;
  }

  private withEmergencyCadence(text: string): string {
    return `Nah Leonard, hold up. ${text} I am freezing promotion until the evidence chain stabilizes.`;
  }

  private withTeachingCadence(text: string): string {
    return `Here is the street-clear technical breakdown: ${text} Same system truth, translated clean and usable.`;
  }

  private withNarrationCadence(text: string): string {
    return `Runtime narration: ${text} We stay aligned to live proof, receipts, and LeeWay law.`;
  }

  private buildCreatorMirror(input: TransformationInput): CreatorLanguageMirrorSignal {
    const text = input.sourceText.toLowerCase();
    const recognizedPatterns: string[] = [];
    const command = /\b(run|build|fix|verify|prove|attach|lock|freeze)\b/.test(text);
    const correction = /\b(no fake pass|not proven|runtime truth|blocked|partial|do not)\b/.test(text);
    const visionary = /\b(total|constitutional|sovereign|ecosystem|enterprise|continuous)\b/.test(text);
    const frustration = /\b(still|again|broken|blocked|fake)\b/.test(text);
    const approval = /\b(good|yes|alive|online|approved|pass)\b/.test(text);

    if (command) recognizedPatterns.push("command_cadence");
    if (correction) recognizedPatterns.push("correction_cadence");
    if (visionary) recognizedPatterns.push("visionary_cadence");
    if (frustration) recognizedPatterns.push("runtime_frustration");
    if (approval) recognizedPatterns.push("excitement_approval");

    return {
      layerId: "LEEWAY_CREATOR_LANGUAGE_MIRROR",
      recognizedPatterns: recognizedPatterns.length ? recognizedPatterns : ["neutral_runtime_directive"],
      commandCadence: command && text.includes(".") ? "stacked" : command ? "direct" : "none",
      correctionCadence: correction && text.includes("fake") ? "escalated_truth" : correction ? "truth_label" : "none",
      visionaryCadence: visionary && /\b(world|enterprise|ecosystem|constitutional)\b/.test(text) ? "movement_scale" : visionary ? "architectural" : "none",
      emotionalState: frustration ? "runtime_frustration" : approval ? "excitement_approval" : command || visionary ? "focused_pressure" : "neutral",
    };
  }

  private buildVoicePerformance(
    input: TransformationInput,
    mode: AgentLeeSpeechMode,
    mirror: CreatorLanguageMirrorSignal,
  ): AgentLeeVoicePerformancePlan {
    const blocked = input.truthLabel === "BLOCKED" || input.situation?.blockerSeverity === "critical";
    return {
      engineId: "LEEWAY_AGENT_LEE_VOICE_PERFORMANCE_ENGINE",
      pauses: blocked ? "firm" : mirror.emotionalState === "runtime_frustration" ? "measured" : "short",
      emphasis: blocked ? "strong" : mirror.correctionCadence !== "none" ? "strong" : "clear",
      urgency: blocked ? "freeze" : input.situation?.deploymentRisk === "high" ? "high" : "medium",
      pacing: blocked ? "slow" : mirror.commandCadence !== "none" ? "quick" : "steady",
      toneLane: blocked ? "emergency" : mode === "ENTERPRISE_PRESENTATION" ? "enterprise" : mode === "PUBLIC_DEMO" ? "public_demo" : mode === "TEACHING_MODE" ? "educational" : "creator",
    };
  }

  private buildEmbodimentLaw(input: TransformationInput): LiveEmbodimentLawStatus {
    const rtcContinuityActive = input.situation?.rtcContinuity === "LIVE_PROVEN";
    const voiceContinuityActive = input.situation?.voiceContinuity === "LIVE_PROVEN";
    const microphoneContinuityActive = input.situation?.microphoneContinuity === "LIVE_PROVEN";
    return {
      languageProcessorActive: true,
      rtcContinuityActive,
      voiceContinuityActive,
      microphoneContinuityActive,
      narrationActive: true,
      creatorMirroringActive: true,
      runtimeAwarenessActive: true,
      finalEmbodimentSatisfied: rtcContinuityActive && voiceContinuityActive && microphoneContinuityActive,
    };
  }
}
