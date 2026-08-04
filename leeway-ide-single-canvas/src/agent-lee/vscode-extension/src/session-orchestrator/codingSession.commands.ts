/*
LEEWAY_HEADER - DO NOT REMOVE

REGION: CORE
TAG: CORE.SESSION.COMMANDS.MAIN
PURPOSE: Coding session command orchestration under Agent Lee sovereign runtime.
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
*/

import * as vscode from "vscode";
import { formatThroughAgentLee, getAgentLeeRuntimeState } from "../core/agent-lee-runtime-bootstrap";
import { codingSessionOrchestrator } from "./codingSession.orchestrator";

export function registerAgentLeeCodingSessionCommands(
  context: vscode.ExtensionContext,
  speak: (text: string) => void | Promise<void>
): void {
  const formatAgentLeeRuntimeMessage = (message: string, routeLabel = "session.commands") => {
    const runtime = getAgentLeeRuntimeState();
    const formatted = formatThroughAgentLee(message, { routeLabel });
    if (runtime.AGENT_LEE_RUNTIME_READY) return formatted;
    return `${runtime.degradedReason || "Agent Lee runtime is degraded."}\n\n${message}`.trim();
  };

  const showAgentLeeRuntimeInfo = (message: string, routeLabel?: string) => {
    void vscode.window.showInformationMessage(formatAgentLeeRuntimeMessage(message, routeLabel));
  };

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "agentLee.session.start",
      async (userRequest?: string) => {
        const editor = vscode.window.activeTextEditor;

        const session = codingSessionOrchestrator.start({
          title: "Agent Lee Coding Session",
          objective: userRequest ?? "Live guided coding session.",
          userRequest,
          activeEditorUri: editor?.document.uri.toString(),
          activeEditorLanguageId: editor?.document.languageId,
        });

        await speak(`Coding session started. Session ID ${session.id}.`);
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("agentLee.session.pause", async () => {
      codingSessionOrchestrator.pause("Coding session paused.");
      await speak("Coding session paused.");
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("agentLee.session.resume", async () => {
      codingSessionOrchestrator.resume("Coding session resumed.");
      await speak("Coding session resumed.");
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("agentLee.session.stop", async () => {
      codingSessionOrchestrator.stop("Coding session stopped.");
      await speak("Coding session stopped.");
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("agentLee.session.status", async () => {
      const status = codingSessionOrchestrator.status();
      await speak(status);
      showAgentLeeRuntimeInfo(status, "session.status");
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("agentLee.session.summary", async () => {
      const summary = codingSessionOrchestrator.summary();
      await speak(summary);
      showAgentLeeRuntimeInfo(summary, "session.summary");
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "agentLee.session.exportReceipt",
      async () => {
        const result = codingSessionOrchestrator.exportReceipt();
        await speak(result);
        showAgentLeeRuntimeInfo(result, "session.export-receipt");
      }
    )
  );
}
