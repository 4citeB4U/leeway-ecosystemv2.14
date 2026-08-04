/*
LEEWAY HEADER — DO NOT REMOVE

REGION: 🟢 CORE
TAG: CORE.PERFORMANCE.TASK.THROTTLE

5WH:
WHAT = Agent Lee task throttle
WHY = Prevents too many agents, models, MCP calls, or verification tasks from running at once
WHO = Agent Lee Runtime Performance Governor
WHERE = src/performance/taskThrottle.ts
WHEN = 2026
HOW = Budget-aware async task gate

AGENTS:
DOCTOR
SHIELD
PRIME

LICENSE:
MIT
*/

import type { GovernedTask } from "./performance.types";
import { runtimeBudgetStore } from "./runtimeBudget.store";

function createTaskId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function runGovernedTask<T>(
  input: Omit<GovernedTask, "id" | "createdAt">,
  fn: () => Promise<T>
): Promise<T> {
  const task: GovernedTask = {
    id: createTaskId("task"),
    createdAt: new Date().toISOString(),
    ...input
  };

  const budget = runtimeBudgetStore.getBudget();
  const snapshot = runtimeBudgetStore.getSnapshot();

  if (task.domain === "model" && snapshot.activeModelCalls >= budget.maxConcurrentModelCalls) {
    throw new Error(`Model call blocked by runtime budget: ${budget.profile}`);
  }

  if (task.domain === "mcp" && snapshot.activeMcpCalls >= budget.maxConcurrentMcpCalls) {
    throw new Error(`MCP call blocked by runtime budget: ${budget.profile}`);
  }

  if (task.domain === "verify" && snapshot.activeTerminalTasks >= budget.maxConcurrentTerminalTasks) {
    throw new Error(`Verification task blocked by runtime budget: ${budget.profile}`);
  }

  if (snapshot.activeAgents >= budget.maxConcurrentAgents) {
    throw new Error(`Agent task blocked by runtime budget: ${budget.profile}`);
  }

  runtimeBudgetStore.registerTask(task);
  runtimeBudgetStore.startTask(task.id);

  try {
    return await fn();
  } finally {
    runtimeBudgetStore.finishTask(task.id);
  }
}

/*
DISCOVERY_PIPELINE:
Voice → Intent → Location → Vertical → Ranking → Render
*/