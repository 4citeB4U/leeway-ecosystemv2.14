/*
LEEWAY_HEADER - DO NOT REMOVE

REGION: CORE
TAG: CORE.EDITBUFFER.COMMANDS.MAIN
PURPOSE: Edit buffer command routing under Agent Lee sovereign runtime.
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
*/

import * as vscode from "vscode";
import { formatThroughAgentLee, getAgentLeeRuntimeState } from "../core/agent-lee-runtime-bootstrap";
import { collectRepairCandidates } from "../execution-brain/diagnosticRepair.loop";
import { summarizeRepairCandidatesForSpeech } from "../execution-brain/repairNarration";
import { synthesizeRepairCandidates, type RawVerificationIssue } from "../execution-brain/repairSynthesizer";
import { defaultVerificationCommands, runVerificationCommand } from "../execution-brain/terminalVerification.runner";
import { sendVerificationRepairsToEditBuffer } from "../execution-brain/verificationRepairToEditBuffer.adapter";
import { voiceCommandContext } from "../live-voice/liveVoiceCommandContext";
import { agentLeeLiveTaskEvents } from "../live-voice/liveTaskEvents";
import { performanceGovernor } from "../performance/performanceGovernor";
import { runtimeBudgetStore } from "../performance/runtimeBudget.store";
import { runGovernedTask } from "../performance/taskThrottle";
import { applyAcceptedHunksConflictAware } from "./editBuffer.apply";
import { openAgentLeeDiff } from "./editBuffer.diffProvider";
import { refreshAgentLeeDecorations } from "./editBuffer.decorations";
import { writeEditBufferReceipt } from "./editBuffer.receipts";
import { editBufferStore } from "./editBuffer.store";
import type { AgentLeeEditBufferCodeLensProvider } from "./editBuffer.codeLens";

export function registerAgentLeeEditBufferCommands(
  context: vscode.ExtensionContext,
  codeLensProvider: AgentLeeEditBufferCodeLensProvider
) {
  const formatAgentLeeRuntimeMessage = (message: string, routeLabel = "edit-buffer.commands") => {
    const runtime = getAgentLeeRuntimeState();
    const formatted = formatThroughAgentLee(message, { routeLabel });
    if (runtime.AGENT_LEE_RUNTIME_READY) return formatted;
    return `${runtime.degradedReason || "Agent Lee runtime is degraded."}\n\n${message}`.trim();
  };

  const showAgentLeeRuntimeInfo = (message: string, routeLabel?: string) => {
    void vscode.window.showInformationMessage(formatAgentLeeRuntimeMessage(message, routeLabel));
  };

  const showAgentLeeRuntimeWarning = (message: string, routeLabel?: string) => {
    void vscode.window.showWarningMessage(formatAgentLeeRuntimeMessage(message, routeLabel));
  };

  const showAgentLeeRuntimeError = (message: string, routeLabel?: string) => {
    void vscode.window.showErrorMessage(formatAgentLeeRuntimeMessage(message, routeLabel));
  };

  const promptAgentLeeRuntimeInfo = (message: string, routeLabel: string, ...items: string[]) => {
    return vscode.window.showInformationMessage(formatAgentLeeRuntimeMessage(message, routeLabel), ...items);
  };

  const setVoiceEditContext = (packageId: string, fileId: string | null, hunkId: string | null) => {
    voiceCommandContext.setActivePackage(packageId);
    voiceCommandContext.setActiveFileEdit(fileId);
    voiceCommandContext.setActiveHunk(hunkId);
  };

  const resolveActiveEditTarget = () => {
    const activePackage = editBufferStore.getActivePackage();
    if (!activePackage) return undefined;

    const activeFile = activePackage.files.find((file) =>
      file.hunks.some((hunk) => hunk.status === "pending" || hunk.status === "accepted")
    ) ?? activePackage.files[0];
    if (!activeFile) return undefined;

    const activeHunk = activeFile.hunks.find((hunk) =>
      hunk.status === "pending" || hunk.status === "accepted"
    ) ?? activeFile.hunks[0];

    return {
      packageId: activePackage.id,
      fileId: activeFile.id,
      hunkId: activeHunk?.id ?? null
    };
  };

  const refreshUi = () => {
    refreshAgentLeeDecorations();
    codeLensProvider.refresh();
  };

  context.subscriptions.push(vscode.commands.registerCommand(
    "agentLee.editBuffer.acceptHunk",
    async (packageId: string, fileId: string, hunkId: string) => {
      editBufferStore.updateHunkStatus(packageId, fileId, hunkId, "accepted");
      setVoiceEditContext(packageId, fileId, hunkId);
      refreshUi();
      agentLeeLiveTaskEvents.emit("edit.hunk.accepted", `Accepted hunk ${hunkId} in ${fileId}.`, {
        severity: "success",
        speak: true,
        data: { packageId, fileId, hunkId }
      });
      showAgentLeeRuntimeInfo("Agent Lee accepted this hunk.", "edit-buffer.accept-hunk");
    }
  ));

  context.subscriptions.push(vscode.commands.registerCommand(
    "agentLee.editBuffer.rejectHunk",
    async (packageId: string, fileId: string, hunkId: string) => {
      editBufferStore.updateHunkStatus(packageId, fileId, hunkId, "rejected");
      setVoiceEditContext(packageId, fileId, hunkId);
      refreshUi();
      agentLeeLiveTaskEvents.emit("edit.hunk.rejected", `Rejected hunk ${hunkId} in ${fileId}.`, {
        severity: "warning",
        speak: true,
        data: { packageId, fileId, hunkId }
      });
      showAgentLeeRuntimeWarning("Agent Lee rejected this hunk.", "edit-buffer.reject-hunk");
    }
  ));

  context.subscriptions.push(vscode.commands.registerCommand(
    "agentLee.editBuffer.openDiff",
    async (packageId: string, fileId: string) => {
      setVoiceEditContext(packageId, fileId, null);
      await openAgentLeeDiff(packageId, fileId);
    }
  ));

  context.subscriptions.push(vscode.commands.registerCommand(
    "agentLee.editBuffer.openActiveDiff",
    async () => {
      const target = resolveActiveEditTarget();
      if (!target) {
        showAgentLeeRuntimeWarning("No active Agent Lee diff is available right now.", "edit-buffer.open-active-diff");
        return;
      }

      setVoiceEditContext(target.packageId, target.fileId, target.hunkId);
      await openAgentLeeDiff(target.packageId, target.fileId);
    }
  ));

  context.subscriptions.push(vscode.commands.registerCommand(
    "agentLee.editBuffer.acceptActiveHunk",
    async () => {
      const target = resolveActiveEditTarget();
      if (!target?.hunkId) {
        showAgentLeeRuntimeWarning("No active Agent Lee hunk is available right now.", "edit-buffer.accept-active-hunk");
        return;
      }

      await vscode.commands.executeCommand(
        "agentLee.editBuffer.acceptHunk",
        target.packageId,
        target.fileId,
        target.hunkId
      );
    }
  ));

  context.subscriptions.push(vscode.commands.registerCommand(
    "agentLee.editBuffer.rejectActiveHunk",
    async () => {
      const target = resolveActiveEditTarget();
      if (!target?.hunkId) {
        showAgentLeeRuntimeWarning("No active Agent Lee hunk is available right now.", "edit-buffer.reject-active-hunk");
        return;
      }

      await vscode.commands.executeCommand(
        "agentLee.editBuffer.rejectHunk",
        target.packageId,
        target.fileId,
        target.hunkId
      );
    }
  ));

  context.subscriptions.push(vscode.commands.registerCommand(
    "agentLee.editBuffer.explainHunk",
    async (packageId: string, fileId: string, hunkId: string) => {
      const pkg = editBufferStore.getPackage(packageId);
      const file = editBufferStore.findFile(packageId, fileId);
      const hunk = editBufferStore.findHunk(packageId, fileId, hunkId);

      if (!pkg || !file || !hunk) {
        showAgentLeeRuntimeError("Agent Lee could not find this pending hunk.", "edit-buffer.explain-hunk");
        return;
      }

      const choice = await promptAgentLeeRuntimeInfo(
        `Agent Lee: ${hunk.reason || "This hunk is part of the pending execution plan."}`,
        "edit-buffer.explain-hunk",
        "Open Diff"
      );
      if (choice === "Open Diff") {
        await openAgentLeeDiff(packageId, fileId);
      }
    }
  ));

  context.subscriptions.push(vscode.commands.registerCommand(
    "agentLee.editBuffer.acceptFile",
    async (packageId: string, fileId: string) => {
      editBufferStore.updateFileStatus(packageId, fileId, "accepted");
      setVoiceEditContext(packageId, fileId, null);
      refreshUi();
      showAgentLeeRuntimeInfo("Agent Lee accepted all pending hunks in this file.", "edit-buffer.accept-file");
    }
  ));

  context.subscriptions.push(vscode.commands.registerCommand(
    "agentLee.editBuffer.rejectFile",
    async (packageId: string, fileId: string) => {
      editBufferStore.updateFileStatus(packageId, fileId, "rejected");
      setVoiceEditContext(packageId, fileId, null);
      refreshUi();
      showAgentLeeRuntimeWarning("Agent Lee rejected all pending hunks in this file.", "edit-buffer.reject-file");
    }
  ));

  context.subscriptions.push(vscode.commands.registerCommand(
    "agentLee.editBuffer.acceptAll",
    async (packageId: string) => {
      editBufferStore.acceptAll(packageId);
      setVoiceEditContext(packageId, null, null);
      refreshUi();
      showAgentLeeRuntimeInfo("Agent Lee accepted all pending hunks in this package.", "edit-buffer.accept-all");
    }
  ));

  context.subscriptions.push(vscode.commands.registerCommand(
    "agentLee.editBuffer.applyAccepted",
    async (packageId?: string) => {
      const activePackage = packageId
        ? editBufferStore.getPackage(packageId)
        : editBufferStore.getActivePackage();

      if (!activePackage) {
        showAgentLeeRuntimeWarning("No active Agent Lee pending-edit package found.", "edit-buffer.apply-accepted");
        return;
      }

      setVoiceEditContext(activePackage.id, null, null);
      agentLeeLiveTaskEvents.emit("edit.apply.started", "Applying accepted hunks through WorkspaceEdit.", {
        severity: "info",
        speak: true,
        data: { packageId: activePackage.id }
      });
      const result = await applyAcceptedHunksConflictAware(activePackage.id);
      refreshUi();

      agentLeeLiveTaskEvents.emit(
        result.ok ? "edit.apply.finished" : "edit.apply.blocked",
        result.summary,
        {
          severity: result.ok ? "success" : "warning",
          speak: true,
          data: { packageId: activePackage.id, applied: result.applied, blocked: result.blocked, rebased: result.rebased }
        }
      );

      if (result.ok) showAgentLeeRuntimeInfo(result.summary, "edit-buffer.apply-accepted");
      else showAgentLeeRuntimeWarning(result.summary, "edit-buffer.apply-accepted");
    }
  ));

  context.subscriptions.push(vscode.commands.registerCommand(
    "agentLee.editBuffer.applyAcceptedAndVerify",
    async (packageId?: string) => {
      const activePackage = packageId
        ? editBufferStore.getPackage(packageId)
        : editBufferStore.getActivePackage();

      if (!activePackage) {
        showAgentLeeRuntimeWarning("No active Agent Lee pending-edit package found.", "edit-buffer.apply-accepted-and-verify");
        return;
      }

      setVoiceEditContext(activePackage.id, null, null);
      agentLeeLiveTaskEvents.emit("edit.apply.started", "Applying accepted hunks through WorkspaceEdit.", {
        severity: "info",
        speak: true,
        data: { packageId: activePackage.id }
      });
      const applyResult = await applyAcceptedHunksConflictAware(activePackage.id);
      refreshUi();
      agentLeeLiveTaskEvents.emit(
        applyResult.ok ? "edit.apply.finished" : "edit.apply.blocked",
        applyResult.summary,
        {
          severity: applyResult.ok ? "success" : "warning",
          speak: true,
          data: {
            packageId: activePackage.id,
            applied: applyResult.applied,
            blocked: applyResult.blocked,
            rebased: applyResult.rebased
          }
        }
      );

      const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || "";
      const commands = defaultVerificationCommands(workspaceRoot);
      const results = [];
      const budget = runtimeBudgetStore.getBudget();

      agentLeeLiveTaskEvents.emit("verify.started", "Running compile and verification checks.", {
        severity: "info",
        speak: true,
        data: { packageId: activePackage.id, commandCount: commands.length }
      });

      for (const command of commands) {
        if (!workspaceRoot) break;
        const result = await runGovernedTask(
          {
            label: `verify:${command}`,
            domain: "verify",
            priority: "high"
          },
          async () => runVerificationCommand(command, workspaceRoot)
        );
        results.push(result);
      }

      const existingRepairCandidates = collectRepairCandidates(results);
      const rawIssues: RawVerificationIssue[] = existingRepairCandidates.map((candidate) => ({
        filePath: candidate.filePath,
        message: candidate.message,
        line: candidate.line,
        character: candidate.column
      }));
      const synthesizedCandidates = await synthesizeRepairCandidates(rawIssues);
      const repairCandidates = [
        ...existingRepairCandidates.map((candidate) => ({
          filePath: candidate.filePath,
          title: `Repair: ${candidate.message.slice(0, 80)}`,
          message: candidate.message,
          reason: candidate.suggestedAction,
          line: typeof candidate.line === "number" ? Math.max(0, candidate.line - 1) : undefined,
          character: typeof candidate.column === "number" ? Math.max(0, candidate.column - 1) : undefined,
          risk: candidate.severity === "error" ? "high" as const : "medium" as const,
          confidence: candidate.severity === "error" ? 0.6 : 0.45,
          repairKind: "unknown" as const,
          spokenSummary: `I found a ${candidate.severity} diagnostic in ${candidate.filePath}. I created a review candidate so you can inspect it before apply.`,
          reviewRequired: true,
          safeToAutoSuggest: false
        })),
        ...synthesizedCandidates
      ].slice(0, budget.maxRepairCandidates);
      const spokenRepairSummary = summarizeRepairCandidatesForSpeech(repairCandidates);
      agentLeeLiveTaskEvents.emit("repair.candidates.found", spokenRepairSummary, {
        severity: repairCandidates.length > 0 ? "warning" : "info",
        speak: true,
        data: { repairCandidates: repairCandidates.length, packageId: activePackage.id }
      });
      await vscode.commands.executeCommand(
        "agentLee.liveVoice.speakStatus",
        spokenRepairSummary
      ).then(undefined, () => {
        console.log("[AGENT_LEE_REPAIR_NARRATION]", spokenRepairSummary);
      });

      let repairPackageId: string | undefined;
      if (repairCandidates.length > 0) {
        const choice = await promptAgentLeeRuntimeInfo(
          `Agent Lee found ${repairCandidates.length} repair candidate(s). Create a pending repair package?`,
          "edit-buffer.repair-package-prompt",
          "Create Repair Package",
          "Not Now"
        );

        if (choice === "Create Repair Package") {
          try {
            repairPackageId = (await sendVerificationRepairsToEditBuffer({
              title: "Agent Lee Verification Repair Package",
              objective: "Repair issues found after Apply Accepted + Verify.",
              candidates: repairCandidates,
              workspaceRoot
            })) ?? undefined;
            if (repairPackageId) {
              voiceCommandContext.setLastRepairPackage(repairPackageId);
              agentLeeLiveTaskEvents.emit("repair.package.created", `Repair package created: ${repairPackageId}`, {
                severity: "success",
                speak: true,
                data: { repairPackageId, packageId: activePackage.id }
              });
            }
          } catch (error) {
            showAgentLeeRuntimeWarning(
              `Verification found repair candidates, but creating a follow-up pending package failed: ${error instanceof Error ? error.message : String(error)}`,
              "edit-buffer.repair-package-failed"
            );
          }
        }
      }

      writeEditBufferReceipt({
        packageId: activePackage.id,
        action: "edit.applyAcceptedAndVerify",
        status: results.every((item) => item.ok) ? "passed" : "failed",
        summary: `Verification finished with ${results.filter((item) => !item.ok).length} failing command(s), ${existingRepairCandidates.length} extracted candidate(s), and ${synthesizedCandidates.length} synthesized candidate(s).`,
        files: activePackage.files.map((file) => file.path),
        hunks: existingRepairCandidates.map((candidate) => candidate.id),
        details: {
          applyResult,
          commands: results.map((item) => ({
            command: item.command,
            ok: item.ok,
            exitCode: item.exitCode,
            summary: item.summary
          })),
          existingRepairCandidates,
          synthesizedCandidates,
          repairCandidates,
          repairPackageId
        }
      });

      const summary = [
        applyResult.summary,
        `Verification commands run: ${results.length}.`,
        `Repair candidates found: ${repairCandidates.length}.`,
        performanceGovernor.canRunAutoVerification()
          ? "Runtime governor allowed verification in the current profile."
          : "Runtime governor is in quiet mode; verification ran because you requested it explicitly.",
        repairPackageId ? `Created follow-up pending repair package: ${repairPackageId}.` : ""
      ].join(" ");
      const verificationOk = results.every((item) => item.ok);
      voiceCommandContext.setLastVerification(summary, verificationOk);
      agentLeeLiveTaskEvents.emit("verify.finished", summary, {
        severity: verificationOk ? "success" : "warning",
        speak: true,
        data: {
          packageId: activePackage.id,
          verificationOk,
          commandCount: results.length,
          repairCandidates: repairCandidates.length,
          repairPackageId
        }
      });

      if (verificationOk) showAgentLeeRuntimeInfo(summary, "edit-buffer.apply-accepted-and-verify");
      else showAgentLeeRuntimeWarning(summary, "edit-buffer.apply-accepted-and-verify");
    }
  ));
}
