import { LeewayAgentLeeStyleAdapter } from "./leewayAgentLeeStyleAdapter";
import {
  LanguagePatternProfile,
  TransformationGuardrails,
  TransformationInput,
  TransformationResult,
} from "./leewayLanguagePattern.types";

const defaultProfile: LanguagePatternProfile = {
  profileId: "LEEWAY_AGENT_LEE_SPEECH_PATTERN_PROFILE_PASS_1",
  categories: {
    sentenceRhythm: ["short line then detail", "layered explanation", "firm closure"],
    emphasisPhrases: ["hard truth", "hold the line", "proof chain"],
    commandPhrases: ["run this", "lock this path", "keep it governed"],
    correctionPhrases: ["that is partial, not proven", "we are not stamping PASS"],
    conversationalTransitions: ["now next", "here is the line", "same truth, cleaner frame"],
  },
  patternTokens: [
    {
      token: "DIRECT_CREATOR_ADDRESS",
      description: "Addresses Leonard directly when mode targets creator conversation.",
      usageRule: "Use only in creator-facing or concierge-facing output.",
    },
    {
      token: "RHYTHMIC_RESTATEMENT",
      description: "Restates key technical point with concise rhythmic framing.",
      usageRule: "Keep semantic content intact and avoid distortion.",
    },
    {
      token: "NO_FAKE_PASS",
      description: "Forces truth discipline in blocker and readiness output.",
      usageRule: "Use whenever readiness is not proven.",
    },
    {
      token: "ENTERPRISE_CLEAN_TRANSLATION",
      description: "Code-switches to polished enterprise language while preserving identity.",
      usageRule: "Use in enterprise mode and partner-facing communication.",
      bannedInEnterprise: false,
    },
  ],
};

const defaultGuardrails: TransformationGuardrails = {
  preserveTruthLabels: true,
  preserveTechnicalAccuracy: true,
  avoidStereotypes: true,
  avoidForcedSlang: true,
  avoidCopyrightedImitation: true,
  enforceEnterpriseBoundaries: true,
};

export class LeewayLanguagePatternProcessor {
  private readonly adapter: LeewayAgentLeeStyleAdapter;

  constructor(
    private readonly profile: LanguagePatternProfile = defaultProfile,
    private readonly guardrails: TransformationGuardrails = defaultGuardrails,
  ) {
    this.adapter = new LeewayAgentLeeStyleAdapter(this.profile, this.guardrails);
  }

  process(input: TransformationInput): TransformationResult {
    const mode = this.adapter.detectMode(input);
    return this.adapter.applyModeStyle(input, mode);
  }

  processLive(input: TransformationInput): TransformationResult {
    const situation = {
      rtcContinuity: "NOT_YET_PROVEN" as const,
      voiceContinuity: "BLOCKED" as const,
      microphoneContinuity: "NOT_YET_PROVEN" as const,
      ...input.situation,
    };
    return this.process({
      ...input,
      situation,
      contextTags: Array.from(new Set([...(input.contextTags ?? []), "LIVE_LANGUAGE_OPERATING_ENTITY"])),
    });
  }

  processMany(inputs: TransformationInput[]): TransformationResult[] {
    return inputs.map((input) => this.process(input));
  }

  processLiveMany(inputs: TransformationInput[]): TransformationResult[] {
    return inputs.map((input) => this.processLive(input));
  }

  getProfile(): LanguagePatternProfile {
    return this.profile;
  }

  getGuardrails(): TransformationGuardrails {
    return this.guardrails;
  }
}

export function transformAgentLeeSpeech(input: TransformationInput): TransformationResult {
  const processor = new LeewayLanguagePatternProcessor();
  return processor.process(input);
}
