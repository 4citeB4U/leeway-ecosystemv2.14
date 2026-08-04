/*
LEEWAY HEADER — DO NOT REMOVE

REGION: 🟢 CORE
TAG: CORE.PERFORMANCE.TYPES.MAIN

5WH:
WHAT = Agent Lee performance governance types
WHY = Keeps Agent Lee powerful while running quiet on laptop/edge-class hardware
WHO = Agent Lee Runtime Performance Governor
WHERE = src/performance/performance.types.ts
WHEN = 2026
HOW = Runtime budgets, profiles, throttle policies, and service state contracts

AGENTS:
PRIME
DOCTOR
SHIELD
AUDIT

LICENSE:
MIT
*/

export type PerformanceProfile =
  | "raspberry_pi"
  | "quiet_laptop"
  | "balanced"
  | "performance"
  | "turbo";

export type ServiceState =
  | "disabled"
  | "idle"
  | "warm"
  | "active"
  | "throttled"
  | "paused"
  | "failed";

export interface RuntimeBudget {
  profile: PerformanceProfile;
  maxConcurrentAgents: number;
  maxConcurrentModelCalls: number;
  maxConcurrentMcpCalls: number;
  maxConcurrentTerminalTasks: number;
  maxFileIndexBatch: number;
  maxDecorationsPerEditor: number;
  maxRepairCandidates: number;
  maxTranscriptChars: number;
  decorationThrottleMs: number;
  receiptFlushMs: number;
  idleTaskDelayMs: number;
  verificationDebounceMs: number;
  enableBackgroundIndexing: boolean;
  enableAutoRepairSynthesis: boolean;
  enableLiveVoiceNarration: boolean;
  enableVerboseNarration: boolean;
  enableHeavyMcpCalls: boolean;
  enableAutoVerification: boolean;
}

export type RuntimeBudgetOverrideKey =
  | "enableHeavyMcpCalls"
  | "enableBackgroundIndexing"
  | "enableVerboseNarration"
  | "enableAutoVerification";

export type RuntimeBudgetOverrides = Partial<Pick<
  RuntimeBudget,
  RuntimeBudgetOverrideKey
>>;

export interface RuntimeLoadSnapshot {
  timestamp: string;
  activeAgents: number;
  activeModelCalls: number;
  activeMcpCalls: number;
  activeTerminalTasks: number;
  queuedTasks: number;
  heapUsedMb?: number;
  heapTotalMb?: number;
}

export interface GovernedTask {
  id: string;
  label: string;
  domain:
    | "voice"
    | "edit"
    | "verify"
    | "repair"
    | "mcp"
    | "model"
    | "index"
    | "receipt"
    | "ui";
  priority: "low" | "normal" | "high" | "critical";
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
}

/*
DISCOVERY_PIPELINE:
Voice → Intent → Location → Vertical → Ranking → Render
*/