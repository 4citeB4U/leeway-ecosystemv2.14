/*
LEEWAY_HEADER - DO NOT REMOVE

REGION: CORE
TAG: CORE.PERFORMANCE.COMMANDS.MAIN
PURPOSE: Performance command surface governed by Agent Lee runtime.
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
*/

import * as vscode from "vscode";
import { formatThroughAgentLee, getAgentLeeRuntimeState } from "../core/agent-lee-runtime-bootstrap";
import type { PerformanceProfile, RuntimeBudgetOverrideKey } from "./performance.types";
import { performanceGovernor } from "./performanceGovernor";
import { agentLeeLiveTaskEvents } from "../live-voice/liveTaskEvents";
import { lazyServiceRegistry } from "./lazyServiceRegistry";
import { warmCoreRuntimeServices } from "./runtimeServices";

const PROFILES: PerformanceProfile[] = [
  "raspberry_pi",
  "quiet_laptop",
  "balanced",
  "performance",
  "turbo"
];

function overrideMessage(key: RuntimeBudgetOverrideKey, value: boolean): string {
  const labelMap: Record<RuntimeBudgetOverrideKey, string> = {
    enableHeavyMcpCalls: "heavy MCP calls",
    enableBackgroundIndexing: "background indexing",
    enableVerboseNarration: "verbose narration",
    enableAutoVerification: "auto verification",
  };

  return `${labelMap[key]} ${value ? "enabled" : "disabled"}.`;
}

export function registerAgentLeePerformanceCommands(
  context: vscode.ExtensionContext,
  speak: (text: string) => void | Promise<void>
): void {
  const formatAgentLeeRuntimeMessage = (message: string, routeLabel = "performance.commands") => {
    const runtime = getAgentLeeRuntimeState();
    const formatted = formatThroughAgentLee(message, { routeLabel });
    if (runtime.AGENT_LEE_RUNTIME_READY) return formatted;
    return `${runtime.degradedReason || "Agent Lee runtime is degraded."}\n\n${message}`.trim();
  };

  const showAgentLeeRuntimeInfo = (message: string, routeLabel?: string) => {
    void vscode.window.showInformationMessage(formatAgentLeeRuntimeMessage(message, routeLabel));
  };

  context.subscriptions.push(
    vscode.commands.registerCommand("agentLee.performance.setProfile", async (selected?: PerformanceProfile) => {
      let profile: PerformanceProfile | undefined = selected;

      if (!profile) {
        profile = (await vscode.window.showQuickPick(PROFILES, {
          title: "Agent Lee Performance Profile",
          placeHolder: "Choose how hard Agent Lee is allowed to run"
        })) as PerformanceProfile | undefined;
      }

      if (!profile) return;

      performanceGovernor.setProfile(profile);
      const message = `Agent Lee performance profile set to ${profile}.`;
      agentLeeLiveTaskEvents.emit("task.finished", message, {
        severity: "success",
        speak: true
      });
      await speak(message);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("agentLee.performance.quietMode", async () => {
      performanceGovernor.setProfile("quiet_laptop");
      await speak("Quiet laptop mode is active. I will stay efficient and avoid heavy background work.");
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("agentLee.performance.raspberryPiMode", async () => {
      performanceGovernor.setProfile("raspberry_pi");
      await speak("Raspberry Pi mode is active. I will run lean, limit concurrency, and avoid heavy MCP calls.");
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("agentLee.performance.status", async () => {
      const summary = performanceGovernor.summarize();
      await speak(summary);
      showAgentLeeRuntimeInfo(summary, "performance.status");
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "agentLee.performance.setOverride",
      async (key: RuntimeBudgetOverrideKey, value: boolean) => {
        performanceGovernor.setOverride(key, value);
        const message = `Performance override applied: ${overrideMessage(key, value)}`;
        agentLeeLiveTaskEvents.emit("task.finished", message, {
          severity: "success",
          speak: true,
        });
        await speak(message);
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("agentLee.performance.clearOverrides", async () => {
      performanceGovernor.clearOverrides();
      const message = "Performance overrides cleared. The active profile now applies without feature overrides.";
      agentLeeLiveTaskEvents.emit("task.finished", message, {
        severity: "success",
        speak: true,
      });
      await speak(message);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("agentLee.performance.services", async () => {
      const services = lazyServiceRegistry.list();
      const summary = services.length
        ? `Services: ${services.map((service) => `${service.id}:${service.state}`).join(", ")}.`
        : "No lazy services are registered yet.";
      await speak(summary);
      showAgentLeeRuntimeInfo(summary, "performance.services");
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("agentLee.performance.pauseServices", async () => {
      const paused = await lazyServiceRegistry.pauseServices();
      const message = paused.length
        ? `Paused services: ${paused.join(", ")}.`
        : "No services were available to pause.";
      await speak(message);
      showAgentLeeRuntimeInfo(message, "performance.pause-services");
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("agentLee.performance.resumeServices", async () => {
      const resumed = await lazyServiceRegistry.resumeServices();
      const message = resumed.length
        ? `Resumed services: ${resumed.join(", ")}.`
        : "No services were available to resume.";
      await speak(message);
      showAgentLeeRuntimeInfo(message, "performance.resume-services");
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("agentLee.performance.disposeIdleServices", async () => {
      const disposed = await lazyServiceRegistry.disposeIdleServices();
      const message = disposed.length
        ? `Disposed idle services: ${disposed.join(", ")}.`
        : "No idle services needed disposal.";
      await speak(message);
      showAgentLeeRuntimeInfo(message, "performance.dispose-idle-services");
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("agentLee.performance.warmCoreServices", async () => {
      const warmed = await warmCoreRuntimeServices();
      const message = warmed.length
        ? `Warmed core services: ${warmed.join(", ")}.`
        : "No core services were warmed.";
      await speak(message);
      showAgentLeeRuntimeInfo(message, "performance.warm-core-services");
    })
  );
}
