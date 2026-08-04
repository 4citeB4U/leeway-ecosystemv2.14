/*
LEEWAY HEADER — DO NOT REMOVE

REGION: 🟢 CORE
TAG: CORE.PERFORMANCE.STATUS.VIEW

5WH:
WHAT = Agent Lee runtime performance status surface
WHY = Gives the user a small always-visible summary of the active runtime profile, overrides, and load
WHO = Agent Lee Runtime Performance Governor
WHERE = src/performance/performanceStatusView.ts
WHEN = 2026
HOW = Status bar item with event-driven and interval refresh

AGENTS:
DOCTOR
PRIME
VOICE
AUDIT

LICENSE:
MIT
*/

import * as vscode from "vscode";
import { performanceGovernor } from "./performanceGovernor";
import { performanceOverridesStore } from "./performanceOverrides.store";
import { runtimeBudgetStore } from "./runtimeBudget.store";

export function registerAgentLeePerformanceStatusView(
  context: vscode.ExtensionContext
): void {
  const item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 99);
  item.name = "Agent Lee Performance Governor";
  item.command = "agentLee.performance.status";

  const update = () => {
    const budget = performanceGovernor.getBudget();
    const overrides = performanceGovernor.getOverrides();
    const snapshot = performanceGovernor.getSnapshot();
    const overrideCount = Object.keys(overrides).length;
    const narrationLabel = budget.enableVerboseNarration ? "verbose" : "quiet";
    const verificationLabel = budget.enableAutoVerification ? "auto" : "manual";

    item.text = `$(dashboard) Lee ${budget.profile}${overrideCount ? ` +${overrideCount}` : ""}`;
    item.tooltip = [
      `Profile: ${budget.profile}`,
      `Overrides:`,
      `- Heavy MCP calls: ${budget.enableHeavyMcpCalls ? "on" : "off"}`,
      `- Background indexing: ${budget.enableBackgroundIndexing ? "on" : "off"}`,
      `- Auto verification: ${verificationLabel}`,
      `- Narration: ${narrationLabel}`,
      ``,
      `Runtime:`,
      `- Active agents: ${snapshot.activeAgents}`,
      `- Active model calls: ${snapshot.activeModelCalls}`,
      `- Active MCP calls: ${snapshot.activeMcpCalls}`,
      `- Terminal tasks: ${snapshot.activeTerminalTasks}`,
      snapshot.heapUsedMb ? `- Heap used: ${snapshot.heapUsedMb} MB` : `- Heap used: n/a`,
    ].join("\n");
    item.show();
  };

  const interval = setInterval(update, 3000);
  update();

  context.subscriptions.push(item);
  context.subscriptions.push(runtimeBudgetStore.onDidChange(() => update()));
  context.subscriptions.push(performanceOverridesStore.onDidChange(() => update()));
  context.subscriptions.push({
    dispose() {
      clearInterval(interval);
    },
  });
}

/*
DISCOVERY_PIPELINE:
Voice → Intent → Location → Vertical → Ranking → Render
*/