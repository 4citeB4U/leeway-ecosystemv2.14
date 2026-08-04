/*
LEEWAY HEADER — DO NOT REMOVE

REGION: 🟢 CORE
TAG: CORE.PERFORMANCE.PROFILE.MAIN

5WH:
WHAT = Agent Lee performance profile presets
WHY = Gives Agent Lee selectable runtime modes from Raspberry Pi quiet mode to turbo mode
WHO = Agent Lee Runtime Performance Governor
WHERE = src/performance/performanceProfile.ts
WHEN = 2026
HOW = Static runtime budget presets

AGENTS:
DOCTOR
PRIME
AUDIT

LICENSE:
MIT
*/

import type { PerformanceProfile, RuntimeBudget } from "./performance.types";

export const PERFORMANCE_BUDGETS: Record<PerformanceProfile, RuntimeBudget> = {
  raspberry_pi: {
    profile: "raspberry_pi",
    maxConcurrentAgents: 1,
    maxConcurrentModelCalls: 1,
    maxConcurrentMcpCalls: 1,
    maxConcurrentTerminalTasks: 1,
    maxFileIndexBatch: 25,
    maxDecorationsPerEditor: 75,
    maxRepairCandidates: 3,
    maxTranscriptChars: 600,
    decorationThrottleMs: 220,
    receiptFlushMs: 2000,
    idleTaskDelayMs: 1500,
    verificationDebounceMs: 3000,
    enableBackgroundIndexing: false,
    enableAutoRepairSynthesis: true,
    enableLiveVoiceNarration: true,
    enableVerboseNarration: false,
    enableHeavyMcpCalls: false,
    enableAutoVerification: false
  },
  quiet_laptop: {
    profile: "quiet_laptop",
    maxConcurrentAgents: 2,
    maxConcurrentModelCalls: 1,
    maxConcurrentMcpCalls: 2,
    maxConcurrentTerminalTasks: 1,
    maxFileIndexBatch: 60,
    maxDecorationsPerEditor: 150,
    maxRepairCandidates: 5,
    maxTranscriptChars: 900,
    decorationThrottleMs: 140,
    receiptFlushMs: 1200,
    idleTaskDelayMs: 900,
    verificationDebounceMs: 1800,
    enableBackgroundIndexing: true,
    enableAutoRepairSynthesis: true,
    enableLiveVoiceNarration: true,
    enableVerboseNarration: false,
    enableHeavyMcpCalls: false,
    enableAutoVerification: true
  },
  balanced: {
    profile: "balanced",
    maxConcurrentAgents: 3,
    maxConcurrentModelCalls: 2,
    maxConcurrentMcpCalls: 3,
    maxConcurrentTerminalTasks: 2,
    maxFileIndexBatch: 120,
    maxDecorationsPerEditor: 250,
    maxRepairCandidates: 8,
    maxTranscriptChars: 1400,
    decorationThrottleMs: 90,
    receiptFlushMs: 800,
    idleTaskDelayMs: 500,
    verificationDebounceMs: 1000,
    enableBackgroundIndexing: true,
    enableAutoRepairSynthesis: true,
    enableLiveVoiceNarration: true,
    enableVerboseNarration: false,
    enableHeavyMcpCalls: true,
    enableAutoVerification: true
  },
  performance: {
    profile: "performance",
    maxConcurrentAgents: 5,
    maxConcurrentModelCalls: 3,
    maxConcurrentMcpCalls: 5,
    maxConcurrentTerminalTasks: 3,
    maxFileIndexBatch: 250,
    maxDecorationsPerEditor: 500,
    maxRepairCandidates: 15,
    maxTranscriptChars: 2500,
    decorationThrottleMs: 60,
    receiptFlushMs: 500,
    idleTaskDelayMs: 250,
    verificationDebounceMs: 500,
    enableBackgroundIndexing: true,
    enableAutoRepairSynthesis: true,
    enableLiveVoiceNarration: true,
    enableVerboseNarration: true,
    enableHeavyMcpCalls: true,
    enableAutoVerification: true
  },
  turbo: {
    profile: "turbo",
    maxConcurrentAgents: 8,
    maxConcurrentModelCalls: 4,
    maxConcurrentMcpCalls: 8,
    maxConcurrentTerminalTasks: 4,
    maxFileIndexBatch: 500,
    maxDecorationsPerEditor: 1000,
    maxRepairCandidates: 25,
    maxTranscriptChars: 4000,
    decorationThrottleMs: 30,
    receiptFlushMs: 250,
    idleTaskDelayMs: 100,
    verificationDebounceMs: 250,
    enableBackgroundIndexing: true,
    enableAutoRepairSynthesis: true,
    enableLiveVoiceNarration: true,
    enableVerboseNarration: true,
    enableHeavyMcpCalls: true,
    enableAutoVerification: true
  }
};

export function getPerformanceBudget(profile: PerformanceProfile): RuntimeBudget {
  return PERFORMANCE_BUDGETS[profile];
}

/*
DISCOVERY_PIPELINE:
Voice → Intent → Location → Vertical → Ranking → Render
*/