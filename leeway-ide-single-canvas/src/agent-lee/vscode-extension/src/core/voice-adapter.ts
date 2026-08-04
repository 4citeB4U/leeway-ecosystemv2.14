/*
LEEWAY_HEADER - DO NOT REMOVE

TAG: CORE.VOICE.ADAPTER.MAIN
REGION: 🟢 CORE
PURPOSE: Voice adapter bridge for Agent Lee runtime speech and command interaction.
DISCOVERY_PIPELINE:
  Voice → Intent → Location → Vertical → Ranking → Render
*/

import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { execFile, execSync, ChildProcess } from "child_process";
import { describeFileError, writeTextWithRetries } from "./file-ops";
import {
  LEEWAY_BRANDED_REFERENCE_AUDIO,
  LEEWAY_BRANDED_REFERENCE_TEXT,
  buildDefaultLeewayLiveVoiceManifest,
  buildLeewayLiveVoiceRuntimeFacts,
  evaluateLeewayLiveVoiceRoutes,
  loadLeewayLiveVoiceManifest,
  type LeewayLiveVoiceRouteDecision,
  type LeewayLiveVoiceRouteId
} from "./leeway-live-voice-route-manager";

const ROOT = path.join(process.env.USERPROFILE || "", ".leeway-vscode");
const CONFIG_FILE = path.join(ROOT, "agent-lee", "voice", "voice-runtime.json");
const CLONED_SCRIPT = path.join(ROOT, "agent-lee", "voice", "Speak-AgentLeeCloned.ps1");

export type VoiceEngine = "f5-clone-local";

export type VoiceRuntimeConfig = {
  engine: VoiceEngine;
  preferVoiceServer?: boolean;
  voiceWsUrl?: string;
  fallbackEngine: "none";
  personaSpeechMode: string;
  interruptionPolicy: string;
  selectedVoiceId?: string;
  selectedVoiceLabel?: string;
  selectedSpeakerId?: string | number;
  sampleRate: number;
  clonePythonPath?: string;
  cloneScriptPath?: string;
  cloneServerScriptPath?: string;
  cloneServerUrl?: string;
  cloneDevice?: "cpu" | "cuda";
  cloneReferenceAudioPath?: string;
  cloneReferenceText?: string;
  cloneOutputPath?: string;
  cloneSpeedRatio?: number;
  cloneVolumeRatio?: number;
  tuning?: {
    sampleTrimRatio?: number;
    playbackRateRatio?: number;
    pitchRatio?: number;
    toneRatio?: number;
  };
};

export type VoiceStatus = {
  engine: string;
  model: string;
  ready: boolean;
  fallback: string;
  speaking: boolean;
  routeId?: string;
  visibleStatus?: string;
  policyViolations?: string[];
};

export type VoicePlaybackCallbacks = {
  onSegmentStarted?: () => void;
  onSegmentCompleted?: () => void;
  onLifecycleEvent?: (event: LeeWayVoiceLifecycleEvent) => void;
};

export type LeeWayVoiceLifecycleEventType =
  | "LEEWAY_VOICE_STATUS_CHANGED"
  | "LEEWAY_VOICE_FIRST_AUDIO"
  | "LEEWAY_VOICE_PLAYBACK_STARTED"
  | "LEEWAY_VOICE_PLAYBACK_COMPLETED"
  | "LEEWAY_VOICE_PLAYBACK_FAILED"
  | "LEEWAY_VOICE_SEGMENT_PLAYED";

export type LeeWayVoiceLifecycleEvent = {
  eventType: LeeWayVoiceLifecycleEventType;
  timestamp: string;
  status?: string;
  routeId?: string;
  outputPath?: string;
  firstAudioLatencyMs?: number;
  audioBytes?: number;
  detail?: string;
};

let currentSpeech: ChildProcess | null = null;
let voiceQueue: Promise<void> = Promise.resolve();
let activeVoiceGeneration = 0;

function readConfig(): VoiceRuntimeConfig {
  return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8")) as VoiceRuntimeConfig;
}

function cloneVoiceReady(config: VoiceRuntimeConfig | null) {
  return Boolean(
    config &&
    fs.existsSync(CLONED_SCRIPT) &&
    config.clonePythonPath &&
    fs.existsSync(config.clonePythonPath) &&
    config.cloneScriptPath &&
    fs.existsSync(config.cloneScriptPath) &&
    config.cloneReferenceAudioPath &&
    fs.existsSync(config.cloneReferenceAudioPath) &&
    String(config.cloneReferenceText || "").trim()
  );
}

function assertClonedVoiceReady(config: VoiceRuntimeConfig | null) {
  if (!config) throw new Error("Cloned voice runtime is missing.");
  if (!fs.existsSync(CLONED_SCRIPT)) {
    throw new Error(`Voice runtime script is missing: ${CLONED_SCRIPT}`);
  }
  if (!config.clonePythonPath || !fs.existsSync(config.clonePythonPath)) {
    throw new Error("Cloned voice Python runtime is missing.");
  }
  if (!config.cloneScriptPath || !fs.existsSync(config.cloneScriptPath)) {
    throw new Error("Cloned voice synthesis script is missing.");
  }
  if (!config.cloneReferenceAudioPath || !fs.existsSync(config.cloneReferenceAudioPath)) {
    throw new Error("Cloned voice reference audio is missing.");
  }
  if (!String(config.cloneReferenceText || "").trim()) {
    throw new Error("Cloned voice reference transcript is missing.");
  }
}

function runVoiceScript(
  targetScript: string,
  text: string,
  configPath: string,
  onError?: (message: string) => void,
  onComplete?: () => void
) {
  currentSpeech = execFile(
    "powershell.exe",
    [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      targetScript,
      "-Text",
      text,
      "-ConfigPath",
      configPath
    ],
    (error) => {
      currentSpeech = null;
      if (error) onError?.(error.message);
      onComplete?.();
    }
  );

  return true;
}

function writeEphemeralVoiceConfig(config: VoiceRuntimeConfig) {
  const tempPath = path.join(os.tmpdir(), `agent-lee-voice-route-${Date.now()}-${Math.random().toString(16).slice(2)}.json`);
  fs.writeFileSync(tempPath, JSON.stringify(config, null, 2), "utf8");
  return tempPath;
}

function createVoiceProofPath() {
  return path.join(os.tmpdir(), `agent-lee-voice-proof-${Date.now()}-${Math.random().toString(16).slice(2)}.ndjson`);
}

function startVoiceProofWatcher(
  proofPath: string,
  onLifecycleEvent?: (event: LeeWayVoiceLifecycleEvent) => void
) {
  let offset = 0;
  const timer = setInterval(() => {
    try {
      if (!fs.existsSync(proofPath)) return;
      const content = fs.readFileSync(proofPath, "utf8");
      const next = content.slice(offset);
      offset = content.length;
      for (const line of next.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          onLifecycleEvent?.(JSON.parse(trimmed) as LeeWayVoiceLifecycleEvent);
        } catch {}
      }
    } catch {}
  }, 80);

  return () => {
    clearInterval(timer);
    try {
      if (fs.existsSync(proofPath)) {
        const content = fs.readFileSync(proofPath, "utf8");
        const next = content.slice(offset);
        for (const line of next.split(/\r?\n/)) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            onLifecycleEvent?.(JSON.parse(trimmed) as LeeWayVoiceLifecycleEvent);
          } catch {}
        }
      }
    } catch {}
    try { fs.unlinkSync(proofPath); } catch {}
  };
}

function routePlaybackConfig(baseConfig: VoiceRuntimeConfig, routeId: LeewayLiveVoiceRouteId) {
  if (routeId === "leeway.voice.primary.clone.live") {
    return {
      config: baseConfig,
      configPath: CONFIG_FILE,
      cleanup: undefined as undefined | (() => void)
    };
  }

  const override: VoiceRuntimeConfig = {
    ...baseConfig,
    engine: "f5-clone-local",
    fallbackEngine: "none",
    preferVoiceServer: true,
    cloneReferenceAudioPath: LEEWAY_BRANDED_REFERENCE_AUDIO,
    cloneReferenceText: LEEWAY_BRANDED_REFERENCE_TEXT,
    selectedVoiceId: routeId === "leeway.voice.compact.clone.live" ? "leeway-compact-clone-live" : "leeway-branded-live",
    selectedVoiceLabel: routeId === "leeway.voice.compact.clone.live" ? "Agent Lee Compact Clone Voice" : "Agent Lee Branded Live Voice",
    cloneSpeedRatio: routeId === "leeway.voice.compact.clone.live" ? Math.max(0.95, Number(baseConfig.cloneSpeedRatio || 1)) : baseConfig.cloneSpeedRatio,
    tuning: {
      ...(baseConfig.tuning || {}),
      playbackRateRatio: routeId === "leeway.voice.compact.clone.live"
        ? Math.max(1, Number(baseConfig.tuning?.playbackRateRatio || 1))
        : Number(baseConfig.tuning?.playbackRateRatio || 1)
    }
  };
  const configPath = writeEphemeralVoiceConfig(override);
  return {
    config: override,
    configPath,
    cleanup: () => {
      try { fs.unlinkSync(configPath); } catch {}
    }
  };
}

function enqueueClonedVoice(
  text: string,
  configPath: string,
  routeId: LeewayLiveVoiceRouteId,
  onError?: (message: string) => void,
  callbacks?: VoicePlaybackCallbacks,
  cleanup?: () => void
) {
  const generation = activeVoiceGeneration;
  const proofPath = createVoiceProofPath();
  voiceQueue = voiceQueue.then(() => new Promise<void>((resolve) => {
    if (generation !== activeVoiceGeneration) {
      try { if (fs.existsSync(proofPath)) fs.unlinkSync(proofPath); } catch {}
      cleanup?.();
      resolve();
      return;
    }

    callbacks?.onSegmentStarted?.();
    callbacks?.onLifecycleEvent?.({
      eventType: "LEEWAY_VOICE_STATUS_CHANGED",
      timestamp: new Date().toISOString(),
      routeId,
      status: "LeeWay live voice segment is starting."
    });
    const stopProofWatcher = startVoiceProofWatcher(proofPath, callbacks?.onLifecycleEvent);
    currentSpeech = execFile(
      "powershell.exe",
      [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        CLONED_SCRIPT,
        "-Text",
        text,
        "-ConfigPath",
        configPath,
        "-ProofPath",
        proofPath
      ],
      (error) => {
        stopProofWatcher();
        currentSpeech = null;
        if (error) {
          callbacks?.onLifecycleEvent?.({
            eventType: "LEEWAY_VOICE_PLAYBACK_FAILED",
            timestamp: new Date().toISOString(),
            routeId,
            detail: error.message
          });
          onError?.(error.message);
        }
        callbacks?.onSegmentCompleted?.();
        cleanup?.();
        resolve();
      }
    );
  }));
  return true;
}

function currentRouteDecision(config: VoiceRuntimeConfig | null): LeewayLiveVoiceRouteDecision {
  const manifest = loadLeewayLiveVoiceManifest() || buildDefaultLeewayLiveVoiceManifest();
  const facts = buildLeewayLiveVoiceRuntimeFacts(config);
  return evaluateLeewayLiveVoiceRoutes(manifest, facts);
}

export function loadVoiceRuntime() {
  try {
    return readConfig();
  } catch {
    return null;
  }
}

export function getVoiceStatus(): VoiceStatus {
  const config = loadVoiceRuntime();
  const decision = currentRouteDecision(config);
  const engine = config?.engine || "f5-clone-local";
  const ready = decision.selectedRouteId !== "leeway.voice.text.emergency";

  return {
    engine,
    model: config?.selectedVoiceLabel || path.basename(config?.cloneReferenceAudioPath || "voice-runtime"),
    ready,
    fallback: decision.selectedRouteId,
    speaking: Boolean(currentSpeech),
    routeId: decision.selectedRouteId,
    visibleStatus: decision.visibleStatus,
    policyViolations: decision.policyViolations
  };
}

export function stopVoicePlayback() {
  activeVoiceGeneration += 1;
  voiceQueue = Promise.resolve();
  if (currentSpeech) {
    const pid = currentSpeech.pid;
    try {
      if (pid && process.platform === "win32") {
        try { execSync(`taskkill /F /T /PID ${pid}`, { stdio: "ignore" }); } catch {}
      } else {
        currentSpeech.kill("SIGKILL");
      }
    } catch {}
    currentSpeech = null;
  }
}

export function speakWithVoice(
  text: string,
  onError?: (message: string) => void,
  callbacks?: VoicePlaybackCallbacks
) {
  try {
    const config = loadVoiceRuntime();
    if (!config) throw new Error("LeeWay live voice runtime config is missing.");
    const decision = currentRouteDecision(config);
    if (decision.selectedRouteId === "leeway.voice.text.emergency") {
      throw new Error(decision.visibleStatus);
    }
    const playback = routePlaybackConfig(config, decision.selectedRouteId);
    assertClonedVoiceReady(playback.config);
    return enqueueClonedVoice(text, playback.configPath, decision.selectedRouteId, onError, callbacks, playback.cleanup);
  } catch (error: any) {
    const message = error instanceof Error ? error.message : String(error);
    onError?.(message);
    return false;
  }
}

export function speakWithClonedVoice(
  text: string,
  onError?: (message: string) => void,
  callbacks?: VoicePlaybackCallbacks
) {
  try {
    const config = loadVoiceRuntime();
    assertClonedVoiceReady(config);
    return enqueueClonedVoice(text, CONFIG_FILE, "leeway.voice.primary.clone.live", onError, callbacks);
  } catch (error: any) {
    const message = error instanceof Error ? error.message : String(error);
    onError?.(message);
    return false;
  }
}

export function saveVoiceRuntime(config: VoiceRuntimeConfig) {
  try {
    writeTextWithRetries(CONFIG_FILE, JSON.stringify(config, null, 2), "Agent Lee voice runtime update.");
    return true;
  } catch (error) {
    console.warn(`[Agent Lee] Voice runtime persistence failed: ${describeFileError(error)}`);
    return false;
  }
}
