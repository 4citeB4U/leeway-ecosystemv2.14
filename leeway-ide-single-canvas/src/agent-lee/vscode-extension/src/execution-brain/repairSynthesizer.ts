/*
LEEWAY HEADER - DO NOT REMOVE

REGION: AI
TAG: AI.EXECUTION.REPAIR.SYNTHESIZER
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
*/

import * as path from "path";
import * as vscode from "vscode";
import type { VerificationRepairCandidate } from "./verificationRepairToEditBuffer.adapter";
import { runtimeBudgetStore } from "../performance/runtimeBudget.store";

export interface RawVerificationIssue {
  filePath: string;
  message: string;
  line?: number;
  character?: number;
  code?: string | number;
}

export async function synthesizeRepairCandidates(
  issues: RawVerificationIssue[]
): Promise<VerificationRepairCandidate[]> {
  const budget = runtimeBudgetStore.getBudget();
  if (!budget.enableAutoRepairSynthesis) {
    return [];
  }

  const candidates: VerificationRepairCandidate[] = [];

  for (const issue of issues) {
    if (/package\.json$/i.test(issue.filePath)) continue;

    const candidate =
      await synthesizeMissingImport(issue) ||
      await synthesizeCannotFindName(issue) ||
      await synthesizeUnusedImport(issue) ||
      await synthesizeSimpleTypeMismatch(issue);

    if (candidate) candidates.push(candidate);
  }

  return candidates.slice(0, budget.maxRepairCandidates);
}

async function synthesizeMissingImport(
  issue: RawVerificationIssue
): Promise<VerificationRepairCandidate | null> {
  const match = issue.message.match(/Cannot find module ['"](.+?)['"]/i);
  if (!match) return null;

  const moduleName = match[1];
  return {
    filePath: issue.filePath,
    title: `Add note for missing module: ${moduleName}`,
    message: issue.message,
    reason: `TypeScript cannot resolve module "${moduleName}". This repair adds a visible TODO marker for review instead of guessing the import path.`,
    line: 0,
    proposedText: `// TODO Agent Lee: verify missing module dependency "${moduleName}".`,
    risk: "low",
    confidence: 0.62,
    repairKind: "missing_module",
    spokenSummary: `I found a missing module reference for ${moduleName}. I created a safe review note instead of guessing an import path.`,
    reviewRequired: true,
    safeToAutoSuggest: true
  };
}

async function synthesizeCannotFindName(
  issue: RawVerificationIssue
): Promise<VerificationRepairCandidate | null> {
  const match = issue.message.match(/Cannot find name ['"]?([A-Za-z0-9_$]+)['"]?/i);
  if (!match) return null;

  const symbolName = match[1];
  const document = await openIssueDocument(issue.filePath);
  if (!document) return null;

  const line = Math.max((issue.line ?? 1) - 1, 0);
  const targetLine = safeLine(document, line);
  return {
    filePath: issue.filePath,
    title: `Review unresolved symbol: ${symbolName}`,
    message: issue.message,
    reason: `The symbol "${symbolName}" is unresolved. Agent Lee is creating a reviewable marker instead of guessing an unsafe import.`,
    originalText: targetLine,
    proposedText: `${targetLine}\n// TODO Agent Lee: resolve missing symbol "${symbolName}".`,
    line,
    risk: "medium",
    confidence: 0.55,
    repairKind: "missing_symbol",
    spokenSummary: `I found an unresolved symbol named ${symbolName}. I am not guessing the import and created a review marker instead.`,
    reviewRequired: true,
    safeToAutoSuggest: false
  };
}

async function synthesizeUnusedImport(
  issue: RawVerificationIssue
): Promise<VerificationRepairCandidate | null> {
  const match = issue.message.match(/['"]?([A-Za-z0-9_$]+)['"]? is declared but its value is never read/i);
  if (!match) return null;

  const symbolName = match[1];
  const document = await openIssueDocument(issue.filePath);
  if (!document) return null;

  const text = document.getText();
  const importRegex = new RegExp(`^import\\s+.*\\b${symbolName}\\b.*;$`, "m");
  const importMatch = text.match(importRegex);
  if (!importMatch || importMatch.index === undefined) return null;

  return {
    filePath: issue.filePath,
    title: `Remove unused import: ${symbolName}`,
    message: issue.message,
    reason: `The import/reference "${symbolName}" appears unused according to TypeScript.`,
    originalText: importMatch[0],
    proposedText: "",
    startOffset: importMatch.index,
    endOffset: importMatch.index + importMatch[0].length,
    risk: "low",
    confidence: 0.92,
    repairKind: "unused_import",
    spokenSummary: `I found an unused import named ${symbolName}. This is low risk because TypeScript reports it is not being read.`,
    reviewRequired: false,
    safeToAutoSuggest: true
  };
}

async function synthesizeSimpleTypeMismatch(
  issue: RawVerificationIssue
): Promise<VerificationRepairCandidate | null> {
  if (!/Type .* is not assignable to type/i.test(issue.message)) return null;

  const document = await openIssueDocument(issue.filePath);
  if (!document) return null;

  const line = Math.max((issue.line ?? 1) - 1, 0);
  const targetLine = safeLine(document, line);
  return {
    filePath: issue.filePath,
    title: "Review TypeScript type mismatch",
    message: issue.message,
    reason: "TypeScript reported a type mismatch. Agent Lee is creating a review marker instead of forcing an unsafe cast.",
    originalText: targetLine,
    proposedText: `${targetLine}\n// TODO Agent Lee: resolve type mismatch safely. Avoid unsafe casts unless reviewed.`,
    line,
    risk: "medium",
    confidence: 0.5,
    repairKind: "type_mismatch",
    spokenSummary: "I found a type mismatch and created a safe review marker instead of forcing a cast.",
    reviewRequired: true,
    safeToAutoSuggest: false
  };
}

async function openIssueDocument(filePath: string): Promise<vscode.TextDocument | null> {
  try {
    const uri = /^[a-zA-Z]:[\\/]/.test(filePath)
      ? vscode.Uri.file(filePath)
      : vscode.Uri.file(path.join(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? "", filePath));

    return await vscode.workspace.openTextDocument(uri);
  } catch {
    return null;
  }
}

function safeLine(document: vscode.TextDocument, line: number): string {
  const safe = Math.min(Math.max(line, 0), document.lineCount - 1);
  return document.lineAt(safe).text;
}
