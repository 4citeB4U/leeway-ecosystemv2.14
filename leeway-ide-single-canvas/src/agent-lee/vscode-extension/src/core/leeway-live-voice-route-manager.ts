/*
LEEWAY_HEADER - DO NOT REMOVE

REGION: CORE
TAG: CORE.VOICE.ROUTE_MANAGER.MAIN
PURPOSE: Governs LeeWay-owned live voice route selection, fallback policy, and truthful degraded routing.
DISCOVERY_PIPELINE:
  Voice -> Intent -> Location -> Vertical -> Ranking -> Render
*/

import * as fs from "fs";
import * as path from "path";
import type { VoiceRuntimeConfig } from "./voice-adapter";

const ROOT = path.join(process.env.USERPROFILE || "", ".leeway-vscode");
export const LEEWAY_LIVE_VOICE_MANIFEST_PATH = path.join(ROOT, "agent-lee", "voice", "leeway-live-voice-manifest.json");
export const LEEWAY_BRANDED_REFERENCE_AUDIO = path.join(ROOT, "agent-lee", "voice", "default-agent-lee-voice.wav");
export const LEEWAY_BRANDED_REFERENCE_TEXT = "OK let's go ahead and create this. I'll speak into the mic for a certain amount of time. And the words that I'm actually going to say are the words I want the clone voice to be able to say.";

export type LeewayLiveVoiceRouteId =
  | "leeway.voice.primary.clone.live"
  | "leeway.voice.compact.clone.live"
  | "leeway.voice.branded.live"
  | "leeway.voice.text.emergency";

export type LeewayLiveVoiceRouteKind = "clone" | "compact-clone" | "branded" | "text-only";

export type LeewayLiveVoiceRouteManifest = {
  voice: {
    mode: "live";
    ownership: "leeway-owned-only";
    fallbackPolicy: "leeway_live_identity_first";
    requireStreamingInput: true;
    requireStreamingOutput: true;
    allowExternalProviders: false;
    allowUsageBasedFallback: false;
    allowNonLeewayDefault: false;
    routes: Array<{
      id: LeewayLiveVoiceRouteId;
      priority: number;
      kind: LeewayLiveVoiceRouteKind;
      engine: "primary" | "compact" | "branded" | "none";
      streaming: boolean;
      identityRequired: boolean;
      emergencyOnly?: boolean;
      enabled?: boolean;
    }>;
  };
};

export type LeewayLiveVoiceRuntimeFacts = {
  cloneScriptReady: boolean;
  selectedCloneIdentityReady: boolean;
  compactCloneReady: boolean;
  brandedVoiceReady: boolean;
  nonLeewayDefaultConfigured: boolean;
  externalProviderConfigured: boolean;
};

export type LeewayLiveVoiceRouteHealth = {
  id: LeewayLiveVoiceRouteId;
  kind: LeewayLiveVoiceRouteKind;
  priority: number;
  healthy: boolean;
  selected: boolean;
  reason: string;
  streaming: boolean;
  identityRequired: boolean;
};

export type LeewayLiveVoiceRouteDecision = {
  manifest: LeewayLiveVoiceRouteManifest;
  selectedRouteId: LeewayLiveVoiceRouteId;
  selectedRouteKind: LeewayLiveVoiceRouteKind;
  selectedRouteHealthy: boolean;
  policyViolations: string[];
  visibleStatus: string;
  emergencyActive: boolean;
  routes: LeewayLiveVoiceRouteHealth[];
};

export type LeewayLiveVoiceSegmentPlan = {
  routeId: LeewayLiveVoiceRouteId;
  segments: string[];
  supportsMultiSegment: boolean;
  reason: string;
};

export function buildDefaultLeewayLiveVoiceManifest(): LeewayLiveVoiceRouteManifest {
  return {
    voice: {
      mode: "live",
      ownership: "leeway-owned-only",
      fallbackPolicy: "leeway_live_identity_first",
      requireStreamingInput: true,
      requireStreamingOutput: true,
      allowExternalProviders: false,
      allowUsageBasedFallback: false,
      allowNonLeewayDefault: false,
      routes: [
        {
          id: "leeway.voice.primary.clone.live",
          priority: 0,
          kind: "clone",
          engine: "primary",
          streaming: true,
          identityRequired: true,
          enabled: true
        },
        {
          id: "leeway.voice.compact.clone.live",
          priority: 1,
          kind: "compact-clone",
          engine: "compact",
          streaming: true,
          identityRequired: true,
          enabled: true
        },
        {
          id: "leeway.voice.branded.live",
          priority: 2,
          kind: "branded",
          engine: "branded",
          streaming: true,
          identityRequired: false,
          enabled: true
        },
        {
          id: "leeway.voice.text.emergency",
          priority: 3,
          kind: "text-only",
          engine: "none",
          streaming: false,
          identityRequired: false,
          emergencyOnly: true,
          enabled: true
        }
      ]
    }
  };
}

export function loadLeewayLiveVoiceManifest() {
  try {
    return JSON.parse(fs.readFileSync(LEEWAY_LIVE_VOICE_MANIFEST_PATH, "utf8")) as LeewayLiveVoiceRouteManifest;
  } catch {
    return buildDefaultLeewayLiveVoiceManifest();
  }
}

function routeHealthy(routeId: LeewayLiveVoiceRouteId, facts: LeewayLiveVoiceRuntimeFacts) {
  switch (routeId) {
    case "leeway.voice.primary.clone.live":
      return {
        healthy: facts.cloneScriptReady && facts.selectedCloneIdentityReady,
        reason: facts.cloneScriptReady && facts.selectedCloneIdentityReady
          ? "Selected Agent Lee live clone identity is ready."
          : "Selected Agent Lee live clone identity is missing or unhealthy."
      };
    case "leeway.voice.compact.clone.live":
      return {
        healthy: facts.cloneScriptReady && facts.compactCloneReady,
        reason: facts.cloneScriptReady && facts.compactCloneReady
          ? "Compact LeeWay clone route is ready."
          : "Compact LeeWay clone route is unavailable."
      };
    case "leeway.voice.branded.live":
      return {
        healthy: facts.cloneScriptReady && facts.brandedVoiceReady,
        reason: facts.cloneScriptReady && facts.brandedVoiceReady
          ? "Branded LeeWay live voice route is ready."
          : "Branded LeeWay live voice route is unavailable."
      };
    case "leeway.voice.text.emergency":
    default:
      return {
        healthy: true,
        reason: "LeeWay text-only emergency route is always available."
      };
  }
}

export function evaluateLeewayLiveVoiceRoutes(
  manifest: LeewayLiveVoiceRouteManifest,
  facts: LeewayLiveVoiceRuntimeFacts
): LeewayLiveVoiceRouteDecision {
  const policyViolations: string[] = [];
  if (facts.nonLeewayDefaultConfigured && manifest.voice.allowNonLeewayDefault === false) {
    policyViolations.push("LEEWAY_APP::VOICE::POLICY::NO_FOREIGN_DEFAULT");
  }
  if (facts.externalProviderConfigured && manifest.voice.allowExternalProviders === false) {
    policyViolations.push("LEEWAY_APP::VOICE::POLICY::LEEWAY_OWNED_ONLY");
  }

  const routes = [...manifest.voice.routes]
    .filter((route) => route.enabled !== false)
    .sort((a, b) => a.priority - b.priority);

  let selectedRouteId: LeewayLiveVoiceRouteId = "leeway.voice.text.emergency";
  let selectedRouteKind: LeewayLiveVoiceRouteKind = "text-only";
  let selectedRouteHealthy = true;

  if (policyViolations.length === 0) {
    for (const route of routes) {
      if (route.emergencyOnly) continue;
      const state = routeHealthy(route.id, facts);
      if (state.healthy) {
        selectedRouteId = route.id;
        selectedRouteKind = route.kind;
        selectedRouteHealthy = true;
        break;
      }
    }

    if (selectedRouteId === "leeway.voice.text.emergency") {
      selectedRouteHealthy = false;
    }
  } else {
    selectedRouteHealthy = false;
  }

  const detailedRoutes = routes.map((route) => {
    const state = routeHealthy(route.id, facts);
    return {
      id: route.id,
      kind: route.kind,
      priority: route.priority,
      healthy: route.emergencyOnly ? true : state.healthy,
      selected: route.id === selectedRouteId,
      reason: route.emergencyOnly && selectedRouteId === route.id && policyViolations.length
        ? `Emergency selected due to policy violation: ${policyViolations.join(", ")}`
        : state.reason,
      streaming: route.streaming,
      identityRequired: route.identityRequired
    };
  });

  const emergencyActive = selectedRouteId === "leeway.voice.text.emergency";
  const visibleStatus = emergencyActive
    ? policyViolations.length
      ? `LeeWay live voice rejected the current configuration (${policyViolations.join(", ")}). Text-only emergency is active.`
      : "LeeWay live voice routes are unavailable. Text-only emergency is active."
    : `LeeWay live voice route active: ${selectedRouteId}`;

  return {
    manifest,
    selectedRouteId,
    selectedRouteKind,
    selectedRouteHealthy,
    policyViolations,
    visibleStatus,
    emergencyActive,
    routes: detailedRoutes
  };
}

export function buildLeewayLiveVoiceRuntimeFacts(
  config: VoiceRuntimeConfig | null,
  fileExists: (target: string) => boolean = fs.existsSync
): LeewayLiveVoiceRuntimeFacts {
  const cloneScriptReady = Boolean(
    config &&
    config.clonePythonPath &&
    fileExists(config.clonePythonPath) &&
    config.cloneScriptPath &&
    fileExists(config.cloneScriptPath)
  );

  const selectedCloneIdentityReady = Boolean(
    cloneScriptReady &&
    config &&
    config.cloneReferenceAudioPath &&
    fileExists(config.cloneReferenceAudioPath) &&
    String(config.cloneReferenceText || "").trim()
  );

  const brandedVoiceReady = Boolean(
    cloneScriptReady &&
    fileExists(LEEWAY_BRANDED_REFERENCE_AUDIO) &&
    LEEWAY_BRANDED_REFERENCE_TEXT.trim()
  );

  return {
    cloneScriptReady,
    selectedCloneIdentityReady,
    compactCloneReady: brandedVoiceReady,
    brandedVoiceReady,
    nonLeewayDefaultConfigured: Boolean(config?.engine && config.engine !== "f5-clone-local"),
    externalProviderConfigured: Boolean(
      config?.voiceWsUrl &&
      !/^wss?:\/\/(127\.0\.0\.1|localhost)(:\d+)?(\/|$)/i.test(String(config.voiceWsUrl))
    )
  };
}

function splitSpeech(text: string, maxChars: number) {
  const normalized = String(text || "").replace(/\s+/g, " ").trim();
  if (!normalized) return [];

  const sentences = normalized.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let current = "";
  for (const sentence of sentences) {
    if (!sentence) continue;
    const candidate = current ? `${current} ${sentence}` : sentence;
    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }
    if (current) chunks.push(current);
    if (sentence.length <= maxChars) {
      current = sentence;
      continue;
    }
    const words = sentence.split(/\s+/);
    let wordChunk = "";
    for (const word of words) {
      const next = wordChunk ? `${wordChunk} ${word}` : word;
      if (next.length <= maxChars) {
        wordChunk = next;
      } else {
        if (wordChunk) chunks.push(wordChunk);
        wordChunk = word;
      }
    }
    current = wordChunk;
  }
  if (current) chunks.push(current);
  return chunks;
}

export function planLeewayLiveVoiceSegments(
  text: string,
  routeId: LeewayLiveVoiceRouteId,
  liveTurnMode: boolean
): LeewayLiveVoiceSegmentPlan {
  if (routeId === "leeway.voice.text.emergency") {
    return {
      routeId,
      segments: [],
      supportsMultiSegment: false,
      reason: "Text-only emergency does not produce live speech segments."
    };
  }

  const maxChars = routeId === "leeway.voice.compact.clone.live" ? 72 : routeId === "leeway.voice.branded.live" ? 96 : 84;
  const chunks = splitSpeech(text, maxChars);
  const segments = liveTurnMode ? chunks.slice(0, Math.max(2, Math.min(2, chunks.length))) : chunks;
  const supportsMultiSegment = segments.length > 1;

  return {
    routeId,
    segments,
    supportsMultiSegment,
    reason: supportsMultiSegment
      ? "LeeWay live route can emit multiple segments."
      : chunks.length <= 1
        ? "Speech text only yielded a single safe segment."
        : "Live turn mode reduced the route to a single segment."
  };
}

export function detectOneWordSpeechFailure(expectedText: string, emittedSegments: string[]) {
  const expectedWords = String(expectedText || "").trim().split(/\s+/).filter(Boolean).length;
  const emittedWords = emittedSegments
    .join(" ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  return {
    expectedWords,
    emittedWords,
    failed: expectedWords > 1 && emittedWords <= 1,
    reason: expectedWords > 1 && emittedWords <= 1
      ? "Speech lifecycle collapsed a multi-word response into one word or less."
      : "Speech lifecycle preserved more than one emitted word."
  };
}
