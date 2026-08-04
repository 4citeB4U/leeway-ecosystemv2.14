/*
LEEWAY_HEADER - DO NOT REMOVE

REGION: CORE
TAG: CORE.INDEXING.COMMANDS.MAIN
PURPOSE: Background indexer command surface governed by Agent Lee sovereign runtime.
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
*/

import * as vscode from "vscode";
import { formatThroughAgentLee, getAgentLeeRuntimeState } from "../core/agent-lee-runtime-bootstrap";
import { agentLeeLiveTaskEvents } from "../live-voice/liveTaskEvents";
import { getOrCreateBackgroundIndexerService } from "./backgroundIndexer.service";
import { getOrCreateIndexQueryService } from "./indexQuery.service";

export function registerAgentLeeBackgroundIndexerCommands(
  context: vscode.ExtensionContext,
  speak: (text: string) => void | Promise<void>
): void {
  const formatAgentLeeRuntimeMessage = (message: string, routeLabel = "indexing.commands") => {
    const runtime = getAgentLeeRuntimeState();
    const formatted = formatThroughAgentLee(message, { routeLabel });
    if (runtime.AGENT_LEE_RUNTIME_READY) return formatted;
    return `${runtime.degradedReason || "Agent Lee runtime is degraded."}\n\n${message}`.trim();
  };

  const showAgentLeeRuntimeInfo = (message: string, routeLabel?: string) => {
    void vscode.window.showInformationMessage(formatAgentLeeRuntimeMessage(message, routeLabel));
  };

  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || "";
  const service = getOrCreateBackgroundIndexerService(workspaceRoot);
  const indexQuery = getOrCreateIndexQueryService(workspaceRoot);

  context.subscriptions.push(
    vscode.commands.registerCommand("agentLee.indexing.runBatch", async () => {
      const state = await service.runBatch();
      const message = `Indexer ${state.phase}. ${state.message}`;
      agentLeeLiveTaskEvents.emit("task.started", message, { severity: "info", speak: true });
      await speak(message);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("agentLee.indexing.status", async () => {
      const state = service.status();
      const message = `Index status: ${state.phase}. Indexed ${state.indexedFiles} files. ${state.queuedFiles} queued.`;
      await speak(message);
      showAgentLeeRuntimeInfo(message, "indexing.status");
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("agentLee.indexing.pause", async () => {
      const state = service.pause();
      const message = state.message;
      await speak(message);
      showAgentLeeRuntimeInfo(message, "indexing.pause");
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("agentLee.indexing.resume", async () => {
      const state = service.resume();
      const message = state.message;
      await speak(message);
      showAgentLeeRuntimeInfo(message, "indexing.resume");
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("agentLee.indexing.relatedFiles", async (inputFilePath?: string) => {
      const active = vscode.window.activeTextEditor?.document.uri.fsPath || "";
      const fromInput = inputFilePath || active;
      const normalized = fromInput.replace(/\\/g, "/");
      const rel = normalized.startsWith(workspaceRoot.replace(/\\/g, "/"))
        ? normalized.slice(workspaceRoot.replace(/\\/g, "/").length + 1)
        : normalized;

      const related = indexQuery.relatedFiles(rel);
      const message = related.length
        ? `Related files for ${rel}: ${related.slice(0, 12).join(", ")}`
        : `No related files found for ${rel}.`;
      await speak(message);
      showAgentLeeRuntimeInfo(message, "indexing.related-files");
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("agentLee.indexing.dependencyStatus", async () => {
      const status = indexQuery.dependencyStatus();
      const message = status
        ? `Dependency index has ${status.filesIndexed} files, ${status.importEdges} import edges, ${status.commandEdges} command edges, and ${status.missingHeaders} files missing LeeWay headers.`
        : "Dependency index is not available yet. Run an index batch first.";
      await speak(message);
      showAgentLeeRuntimeInfo(message, "indexing.dependency-status");
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("agentLee.indexing.missingHeaders", async () => {
      const files = indexQuery.missingHeaders();
      const message = files.length
        ? `Found ${files.length} file(s) missing LeeWay headers: ${files.slice(0, 12).join(", ")}`
        : "No missing LeeWay headers detected in indexed files.";
      await speak(message);
      showAgentLeeRuntimeInfo(message, "indexing.missing-headers");
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("agentLee.indexing.commandMap", async () => {
      const mapped = indexQuery.commandMap();
      const preview = mapped
        .slice(0, 10)
        .map((entry) => `${entry.command} -> ${entry.files[0]}`)
        .join("; ");
      const message = mapped.length
        ? `Indexed ${mapped.length} command registration(s). ${preview}`
        : "No command registrations were found in the index.";
      await speak(message);
      showAgentLeeRuntimeInfo(message, "indexing.command-map");
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("agentLee.indexing.symbolSearch", async (symbol?: string) => {
      const target = String(symbol || "").trim();
      if (!target) {
        await speak("Please provide a symbol name for symbol search.");
        return;
      }

      const files = indexQuery.symbolSearch(target);
      const message = files.length
        ? `Symbol ${target} appears in: ${files.slice(0, 12).join(", ")}`
        : `No indexed file references symbol ${target}.`;
      await speak(message);
      showAgentLeeRuntimeInfo(message, "indexing.symbol-search");
    })
  );
}
