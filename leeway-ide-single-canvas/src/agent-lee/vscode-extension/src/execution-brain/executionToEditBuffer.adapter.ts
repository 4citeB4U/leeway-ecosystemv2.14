/*
LEEWAY_HEADER - DO NOT REMOVE

REGION: CORE
TAG: CORE.EXECUTION.EDITBUFFER.ADAPTER
PURPOSE: Execution brain routing into edit buffer under Agent Lee governance.
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
*/

import * as path from "path";
import * as vscode from "vscode";
import { formatThroughAgentLee, getAgentLeeRuntimeState } from "../core/agent-lee-runtime-bootstrap";
import { ensureLeewayCompliantContent, isGovernedFile } from "../core/leeway-write-policy";
import { openAgentLeeDiff } from "../edit-buffer/editBuffer.diffProvider";
import { refreshAgentLeeDecorations } from "../edit-buffer/editBuffer.decorations";
import { createId, editBufferStore } from "../edit-buffer/editBuffer.store";
import type { AgentLeeEditHunk, AgentLeeFileEdit } from "../edit-buffer/editBuffer.types";
import type { DiagnosticRepairCandidate } from "./executionBrain.types";

export type ExecutionBrainHunk = {
  filePath: string;
  title: string;
  reason: string;
  originalText: string;
  proposedText: string;
  startOffset?: number;
  endOffset?: number;
  risk?: "low" | "medium" | "high" | "critical";
};

export type ExecutionBrainPlanLike = {
  title: string;
  objective: string;
  hunks: ExecutionBrainHunk[];
};

export async function sendExecutionPlanToEditBuffer(
  plan: ExecutionBrainPlanLike,
  workspaceRoot?: string
): Promise<string> {
  const formatAgentLeeRuntimeMessage = (message: string, routeLabel = "execution.editbuffer.adapter") => {
    const runtime = getAgentLeeRuntimeState();
    const formatted = formatThroughAgentLee(message, { routeLabel });
    if (runtime.AGENT_LEE_RUNTIME_READY) return formatted;
    return `${runtime.degradedReason || "Agent Lee runtime is degraded."}\n\n${message}`.trim();
  };

  const showAgentLeeRuntimeInfo = (message: string, routeLabel?: string) => {
    void vscode.window.showInformationMessage(formatAgentLeeRuntimeMessage(message, routeLabel));
  };

  const pkg = editBufferStore.createPackage(plan.title, plan.objective);
  const hunksByFile = groupBy(plan.hunks, (hunk) => hunk.filePath);

  for (const [filePath, hunks] of hunksByFile.entries()) {
    const uri = resolveWorkspaceUri(filePath, workspaceRoot);
    const document = await vscode.workspace.openTextDocument(uri);
    const currentText = document.getText();
    const fileId = createId("file");
    const now = new Date().toISOString();

    const editHunks: AgentLeeEditHunk[] = hunks.map((hunk) => {
      const range = resolveHunkRange(document, hunk, currentText);
      return {
        id: createId("hunk"),
        fileId,
        title: hunk.title,
        reason: hunk.reason,
        risk: hunk.risk ?? "medium",
        status: "pending",
        range,
        originalText: hunk.originalText,
        proposedText: hunk.proposedText,
        createdAt: now,
        updatedAt: now
      };
    });

    const proposedText = buildGovernedPreviewText(uri.fsPath, currentText, editHunks);
    const fileEdit: AgentLeeFileEdit = {
      id: fileId,
      uri,
      path: vscode.workspace.asRelativePath(uri),
      languageId: document.languageId,
      status: "pending",
      originalText: currentText,
      proposedText,
      hunks: editHunks,
      createdAt: now,
      updatedAt: now
    };

    editBufferStore.addFileEdit(pkg.id, fileEdit);
  }

  refreshAgentLeeDecorations();
  const firstFile = pkg.files[0];
  if (firstFile) {
    await openAgentLeeDiff(pkg.id, firstFile.id);
  }

  showAgentLeeRuntimeInfo(
    `Agent Lee created pending edits from Execution Brain: ${pkg.files.length} file(s).`,
    "execution.editbuffer.created"
  );
  return pkg.id;
}

export async function sendRepairCandidatesToEditBuffer(
  repairCandidates: DiagnosticRepairCandidate[],
  options?: { workspaceRoot?: string; sourcePackageId?: string }
): Promise<string | undefined> {
  if (!repairCandidates.length) return undefined;

  const workspaceRoot = options?.workspaceRoot || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  const executionHunks: ExecutionBrainHunk[] = [];

  for (const candidate of repairCandidates) {
    const uri = resolveWorkspaceUri(candidate.filePath, workspaceRoot);
    const document = await vscode.workspace.openTextDocument(uri);
    const maxLine = Math.max(document.lineCount - 1, 0);
    const lineIndex = Math.max(0, Math.min(maxLine, (candidate.line ?? 1) - 1));
    const line = document.lineAt(lineIndex);

    executionHunks.push({
      filePath: uri.fsPath,
      title: `Repair candidate: ${trimSummary(candidate.message, 80)}`,
      reason: [
        `Source: ${candidate.source}`,
        `Severity: ${candidate.severity}`,
        candidate.message,
        candidate.suggestedAction
      ].join(" | "),
      originalText: line.text,
      proposedText: line.text,
      startOffset: document.offsetAt(line.range.start),
      endOffset: document.offsetAt(line.range.end),
      risk: candidate.severity === "error" ? "high" : "medium"
    });
  }

  if (!executionHunks.length) return undefined;

  const sourceSegment = options?.sourcePackageId ? ` after ${options.sourcePackageId}` : "";
  return sendExecutionPlanToEditBuffer(
    {
      title: `Execution Brain Repair Package${sourceSegment}`,
      objective: `Create a pending repair package from ${repairCandidates.length} verification candidate(s).`,
      hunks: executionHunks
    },
    workspaceRoot
  );
}

function resolveWorkspaceUri(filePath: string, workspaceRoot?: string): vscode.Uri {
  if (/^[a-zA-Z]:[\\/]/.test(filePath)) {
    return vscode.Uri.file(filePath);
  }
  const root = workspaceRoot || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!root) {
    throw new Error("No workspace root available for relative execution hunk path.");
  }
  return vscode.Uri.file(path.join(root, filePath));
}

function resolveHunkRange(
  document: vscode.TextDocument,
  hunk: ExecutionBrainHunk,
  currentText: string
): vscode.Range {
  if (typeof hunk.startOffset === "number" && typeof hunk.endOffset === "number") {
    return new vscode.Range(document.positionAt(hunk.startOffset), document.positionAt(hunk.endOffset));
  }

  const index = currentText.indexOf(hunk.originalText);
  if (index >= 0) {
    return new vscode.Range(
      document.positionAt(index),
      document.positionAt(index + hunk.originalText.length)
    );
  }

  throw new Error(`Could not locate original text for hunk "${hunk.title}" in ${hunk.filePath}.`);
}

function buildGovernedPreviewText(filePath: string, currentText: string, hunks: AgentLeeEditHunk[]) {
  const preview = applyPreviewHunks(currentText, hunks);
  if (!isGovernedFile(filePath)) return preview;
  return ensureLeewayCompliantContent(filePath, preview, `Agent Lee pending edit package for ${path.basename(filePath)}.`);
}

function applyPreviewHunks(currentText: string, hunks: AgentLeeEditHunk[]) {
  const sorted = [...hunks].sort((a, b) => offsetAt(currentText, b.range.start.line, b.range.start.character) - offsetAt(currentText, a.range.start.line, a.range.start.character));
  let output = currentText;

  for (const hunk of sorted) {
    const start = offsetAt(output, hunk.range.start.line, hunk.range.start.character);
    const end = offsetAt(output, hunk.range.end.line, hunk.range.end.character);
    output = output.slice(0, start) + hunk.proposedText + output.slice(end);
  }

  return output;
}

function offsetAt(text: string, line: number, character: number) {
  const lines = text.split(/\r?\n/);
  let offset = 0;
  for (let i = 0; i < line; i += 1) {
    offset += (lines[i] || "").length + 1;
  }
  return offset + character;
}

function groupBy<T, K>(items: T[], getKey: (item: T) => K) {
  const map = new Map<K, T[]>();
  for (const item of items) {
    const key = getKey(item);
    const list = map.get(key) ?? [];
    list.push(item);
    map.set(key, list);
  }
  return map;
}

function trimSummary(text: string, max: number) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 3)}...`;
}
