/*
LEEWAY HEADER — DO NOT REMOVE

REGION: 🟢 CORE
TAG: CORE.PERFORMANCE.GOVERNOR.MAIN

5WH:
WHAT = Agent Lee runtime performance governor
WHY = Central control point for quiet, edge-like runtime behavior
WHO = Agent Lee Runtime Performance Governor
WHERE = src/performance/performanceGovernor.ts
WHEN = 2026
HOW = Budget store + throttling + feature gates + status summaries

AGENTS:
PRIME
DOCTOR
SHIELD
AUDIT

LICENSE:
MIT
*/

import type { PerformanceProfile } from "./performance.types";
import { runtimeBudgetStore } from "./runtimeBudget.store";
import { chooseModelClass } from "./modelBudget.policy";
import { lazyServiceRegistry } from "./lazyServiceRegistry";
import { performanceOverridesStore } from "./performanceOverrides.store";

export class AgentLeePerformanceGovernor {
  setProfile(profile: PerformanceProfile) {
    return runtimeBudgetStore.setProfile(profile);
  }

  setOverride(key: Parameters<typeof performanceOverridesStore.setOverride>[0], value: boolean) {
    return performanceOverridesStore.setOverride(key, value);
  }

  clearOverrides() {
    performanceOverridesStore.clearOverrides();
  }

  getOverrides() {
    return performanceOverridesStore.getOverrides();
  }

  getProfile() {
    return this.getBudget().profile;
  }

  getBudget() {
    return performanceOverridesStore.getEffectiveBudget(runtimeBudgetStore.getBudget());
  }

  getSnapshot() {
    return runtimeBudgetStore.getSnapshot();
  }

  canRunHeavyMcp(): boolean {
    return this.getBudget().enableHeavyMcpCalls;
  }

  canRunAutoVerification(): boolean {
    return this.getBudget().enableAutoVerification;
  }

  canRunBackgroundIndexing(): boolean {
    return this.getBudget().enableBackgroundIndexing;
  }

  chooseModel(input: Parameters<typeof chooseModelClass>[0]) {
    return chooseModelClass(input);
  }

  summarize(): string {
    const budget = runtimeBudgetStore.getBudget();
    const snapshot = runtimeBudgetStore.getSnapshot();
    const services = lazyServiceRegistry.list();

    return [
      `Performance profile: ${budget.profile}.`,
      `Active agents: ${snapshot.activeAgents}/${budget.maxConcurrentAgents}.`,
      `Model calls: ${snapshot.activeModelCalls}/${budget.maxConcurrentModelCalls}.`,
      `MCP calls: ${snapshot.activeMcpCalls}/${budget.maxConcurrentMcpCalls}.`,
      `Terminal tasks: ${snapshot.activeTerminalTasks}/${budget.maxConcurrentTerminalTasks}.`,
      snapshot.heapUsedMb ? `Heap used: ${snapshot.heapUsedMb} MB.` : "",
      `Background indexing: ${budget.enableBackgroundIndexing ? "on" : "off"}.`,
      `Heavy MCP calls: ${budget.enableHeavyMcpCalls ? "on" : "off"}.`,
      `Verbose narration: ${budget.enableVerboseNarration ? "on" : "off"}.`,
      `Auto verification: ${budget.enableAutoVerification ? "on" : "off"}.`,
      `Overrides: ${Object.entries(this.getOverrides()).map(([key, value]) => `${key}=${value}`).join(", ") || "none"}.`,
      `Services: ${services.map((service) => `${service.id}:${service.state}`).join(", ") || "none"}.`
    ].filter(Boolean).join(" ");
  }
}

export const performanceGovernor = new AgentLeePerformanceGovernor();

/*
DISCOVERY_PIPELINE:
Voice → Intent → Location → Vertical → Ranking → Render
*/