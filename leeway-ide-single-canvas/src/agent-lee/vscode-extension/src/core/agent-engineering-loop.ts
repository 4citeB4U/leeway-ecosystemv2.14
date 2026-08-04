/*
LEEWAY_HEADER - DO NOT REMOVE

REGION: 🟢 CORE
TAG: CORE.RUNTIME.AGENT_ENGINEERING_LOOP.MAIN

5WH:
WHAT = Codex-style engineering workflow controller for Agent Lee.
WHY = Gives Agent Lee an inspect, plan, stage, approve, apply, verify, and receipt loop inside VS Code.
WHO = Agent Lee / LeeWay Runtime.
WHERE = agent-lee/vscode-extension/src/core/agent-engineering-loop.ts
WHEN = 2026
HOW = Collects workspace inspection, stages pending edits, requests approval, runs verification, and writes governed receipts.
*/

/*
LEEWAY_HEADER - DO NOT REMOVE

REGION: CORE
TAG: CORE.RUNTIME.ENGINEERING.LOOP
PURPOSE: Agent Lee engineering workflow loop using inspect, plan, stage, approve, apply, verify, and receipt.
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
*/

import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { execSync } from "child_process";
import { applyAcceptedHunksConflictAware } from "../edit-buffer/editBuffer.apply";
import { editBufferStore } from "../edit-buffer/editBuffer.store";
import { sendExecutionPlanToEditBuffer, type ExecutionBrainPlanLike } from "../execution-brain/executionToEditBuffer.adapter";
import { defaultVerificationCommands, runVerificationCommand } from "../execution-brain/terminalVerification.runner";
import { formatThroughAgentLee, getAgentLeeRuntimeState } from "./agent-lee-runtime-bootstrap";
import { auditDirectoryBeforeWrite, shouldBypassLeeway } from "./leeway-write-policy";
import { writeJsonWithRetries } from "./file-ops";

export type EngineeringWorkflowState =
  | "IDLE"
  | "INSPECTING"
  | "PLANNING"
  | "STAGING_DIFF"
  | "WAITING_FOR_APPROVAL"
  | "APPLYING_PATCH"
  | "RUNNING_VERIFICATION"
  | "WRITING_RECEIPT"
  | "DONE"
  | "FAILED";

export type WorkspaceInspection = {
  workspaceRoot: string;
  targetPath: string;
  relevantFiles: string[];
  leewayDirectoryAudit: ReturnType<typeof auditDirectoryBeforeWrite>;
  packageManager: string;
  compileScript: string;
  testScript: string;
  lintScript: string;
  gitStatus: string[];
  commandRegistrations: string[];
  writePaths: string[];
};

export type ExecutionPlan = {
  summary: string;
  reason: string;
  targetPath: string;
  risky: boolean;
  filesLikelyChanged: string[];
  inspection: WorkspaceInspection;
  executionBrainPlan?: ExecutionBrainPlanLike;
};

export type StagedPatch = {
  state: EngineeringWorkflowState;
  summary: string;
  riskLevel: "low" | "medium" | "high";
  reason: string;
  files: string[];
  stagedPackageId?: string;
  approvalRequired: boolean;
  inspection: WorkspaceInspection;
};

export type EngineeringRunResult = {
  state: EngineeringWorkflowState;
  userRequest: string;
  targetPath: string;
  approvalStatus: "approved" | "declined" | "not_required";
  commandsRun: { command: string; ok: boolean; summary: string }[];
  filesInspected: string[];
  filesChanged: string[];
  stagedPackageId?: string;
  compileResult?: string;
  packageResult?: string;
  doctorResult?: string;
  complianceBefore: number;
  complianceAfter: number;
  remainingBlockers: string[];
  nextPatchRecommendation: string;
};

const ROOT = path.join(process.env.USERPROFILE || process.env.HOME || ".", ".leeway-vscode");
const RECEIPT_ROOT = path.join(ROOT, "reports", "engineering-runs");
let latestStagedPatch: StagedPatch | null = null;

function formatAgentLeeRuntimeMessage(message: string, routeLabel = "engineering-loop") {
  const runtime = getAgentLeeRuntimeState();
  const formatted = formatThroughAgentLee(message, { routeLabel });
  if (runtime.AGENT_LEE_RUNTIME_READY) return formatted;
  return `${runtime.degradedReason || "Agent Lee runtime is degraded."}\n\n${message}`.trim();
}

function promptAgentLeeRuntimeInfo(message: string, routeLabel: string, ...items: string[]) {
  return vscode.window.showInformationMessage(formatAgentLeeRuntimeMessage(message, routeLabel), ...items);
}

export async function inspectWorkspace(targetPath: string): Promise<WorkspaceInspection> {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || path.dirname(targetPath) || ROOT;
  const normalizedTarget = targetPath || workspaceRoot;
  const inspectionRoot = fs.existsSync(normalizedTarget) && fs.statSync(normalizedTarget).isDirectory()
    ? normalizedTarget
    : path.dirname(normalizedTarget);
  const relevantFiles = collectRelevantFiles(inspectionRoot).slice(0, 40);
  const packageScripts = readPackageScripts(workspaceRoot);
  const gitStatus = readGitStatus(workspaceRoot);
  const packageJsonPath = path.join(workspaceRoot, "agent-lee", "vscode-extension", "package.json");
  const extensionPackagePath = fs.existsSync(packageJsonPath)
    ? packageJsonPath
    : path.join(workspaceRoot, "package.json");
  const commandRegistrations = readCommandRegistrations(extensionPackagePath);
  const writePaths = findWritePaths(workspaceRoot);

  return {
    workspaceRoot,
    targetPath: normalizedTarget,
    relevantFiles,
    leewayDirectoryAudit: auditDirectoryBeforeWrite(inspectionRoot),
    packageManager: fs.existsSync(path.join(workspaceRoot, "package-lock.json")) ? "npm" : "unknown",
    compileScript: packageScripts.compile,
    testScript: packageScripts.test,
    lintScript: packageScripts.lint,
    gitStatus,
    commandRegistrations,
    writePaths
  };
}

export function buildExecutionPlan(userRequest: string, inspection: WorkspaceInspection): ExecutionPlan {
  const risky = shouldRequireApproval(userRequest, inspection) || shouldBypassLeeway(userRequest);
  const targetFile = inspection.relevantFiles.find((file) => file === inspection.targetPath) || inspection.relevantFiles[0] || inspection.targetPath;
  const targetContent = fs.existsSync(targetFile) && fs.statSync(targetFile).isFile()
    ? fs.readFileSync(targetFile, "utf8")
    : "";
  const executionBrainPlan = fs.existsSync(targetFile) && fs.statSync(targetFile).isFile()
    ? {
        title: "Agent Lee Engineering Staged Patch",
        objective: userRequest,
        hunks: [{
          filePath: targetFile,
          title: "Agent Lee staged review marker",
          reason: "Stage a reviewable pending patch before any direct apply path.",
          originalText: targetContent,
          proposedText: targetContent,
          startOffset: 0,
          endOffset: targetContent.length,
          risk: risky ? "high" as const : "low" as const
        }]
      }
    : undefined;

  return {
    summary: `Inspect ${inspection.relevantFiles.length} relevant file(s), stage reviewable edits, and verify with LeeWay governance.`,
    reason: userRequest,
    targetPath: inspection.targetPath,
    risky,
    filesLikelyChanged: executionBrainPlan ? [targetFile] : [],
    inspection,
    executionBrainPlan
  };
}

export async function stagePatch(plan: ExecutionPlan): Promise<StagedPatch> {
  let stagedPackageId = "";
  if (plan.executionBrainPlan) {
    stagedPackageId = await sendExecutionPlanToEditBuffer(plan.executionBrainPlan, plan.inspection.workspaceRoot);
  }

  const staged: StagedPatch = {
    state: "STAGING_DIFF",
    summary: plan.summary,
    riskLevel: plan.risky ? "high" : "low",
    reason: plan.reason,
    files: plan.filesLikelyChanged,
    stagedPackageId: stagedPackageId || undefined,
    approvalRequired: plan.risky,
    inspection: plan.inspection
  };
  latestStagedPatch = staged;
  return staged;
}

export async function requestPatchApproval(stagedPatch: StagedPatch): Promise<boolean> {
  if (!stagedPatch.approvalRequired) return true;
  const choice = await promptAgentLeeRuntimeInfo(
    `Agent Lee, governing operator for this workspace, staged ${stagedPatch.files.length || 1} file(s) for review. Apply after inspection?`,
    "engineering-loop.approval",
    "Approve",
    "Cancel"
  );
  return choice === "Approve";
}

export async function applyApprovedPatch(stagedPatch: StagedPatch): Promise<{ ok: boolean; summary: string }> {
  if (!stagedPatch.stagedPackageId) {
    return { ok: false, summary: "No staged package is available to apply." };
  }
  const result = await applyAcceptedHunksConflictAware(stagedPatch.stagedPackageId);
  return { ok: result.ok, summary: result.summary };
}

export async function runVerification(targetPath: string) {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || path.dirname(targetPath) || ROOT;
  const commands = defaultVerificationCommands(workspaceRoot);
  const runnable = commands.filter((command) => {
    if (command.command === "npm run lint") return hasScript(workspaceRoot, "lint");
    if (command.command === "npm test") return hasScript(workspaceRoot, "test");
    return hasScript(workspaceRoot, "compile");
  });

  const results: { command: string; ok: boolean; summary: string; output: string }[] = [];
  for (const command of runnable) {
    const result = await runVerificationCommand(command, workspaceRoot);
    results.push({ command: result.command, ok: result.ok, summary: result.summary, output: result.output });
  }
  return results;
}

export function writeEngineeringReceipt(result: EngineeringRunResult) {
  const dir = path.join(RECEIPT_ROOT, new Date().toISOString().replace(/[:.]/g, "-"));
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, "engineering-receipt.json");
  writeJsonWithRetries(file, result, "Agent Lee engineering workflow receipt.");
  return file;
}

export async function runAgentEngineeringTask(userRequest: string, targetPath: string) {
  let state: EngineeringWorkflowState = "INSPECTING";
  const inspection = await inspectWorkspace(targetPath);
  state = "PLANNING";
  const plan = buildExecutionPlan(userRequest, inspection);
  state = "STAGING_DIFF";
  const stagedPatch = await stagePatch(plan);
  state = stagedPatch.approvalRequired ? "WAITING_FOR_APPROVAL" : "APPLYING_PATCH";
  const approved = await requestPatchApproval(stagedPatch);

  let applySummary = "Patch left staged for review.";
  const filesChanged: string[] = [];
  if (approved && stagedPatch.stagedPackageId) {
    state = "APPLYING_PATCH";
    editBufferStore.acceptAll(stagedPatch.stagedPackageId);
    const applyResult = await applyApprovedPatch(stagedPatch);
    applySummary = applyResult.summary;
    filesChanged.push(...stagedPatch.files);
  }

  state = "RUNNING_VERIFICATION";
  const verification = await runVerification(targetPath);
  const complianceBefore = inspection.leewayDirectoryAudit.averageCompliance;
  const complianceAfter = auditDirectoryBeforeWrite(path.dirname(targetPath) || inspection.workspaceRoot).averageCompliance;
  const remainingBlockers = inspection.leewayDirectoryAudit.blockingPaths.slice(0, 20);

  state = "WRITING_RECEIPT";
  const receipt = writeEngineeringReceipt({
    state: verification.every((result) => result.ok) ? "DONE" : "FAILED",
    userRequest,
    targetPath,
    approvalStatus: approved ? (stagedPatch.approvalRequired ? "approved" : "not_required") : "declined",
    commandsRun: verification.map((item) => ({ command: item.command, ok: item.ok, summary: item.summary })),
    filesInspected: inspection.relevantFiles,
    filesChanged,
    stagedPackageId: stagedPatch.stagedPackageId,
    compileResult: verification.find((item) => item.command === "npm run compile")?.summary,
    packageResult: "",
    doctorResult: "",
    complianceBefore,
    complianceAfter,
    remainingBlockers,
    nextPatchRecommendation: "Continue with the next smallest LeeWay governance or compliance patch."
  });

  return {
    state: verification.every((result) => result.ok) ? "DONE" as const : "FAILED" as const,
    inspection,
    plan,
    stagedPatch,
    approved,
    applySummary,
    verification,
    receiptPath: receipt
  };
}

export function getLatestStagedPatch() {
  return latestStagedPatch;
}

function collectRelevantFiles(rootPath: string, output: string[] = []) {
  if (!fs.existsSync(rootPath)) return output;
  for (const entry of fs.readdirSync(rootPath, { withFileTypes: true })) {
    const fullPath = path.join(rootPath, entry.name);
    if (entry.isDirectory()) {
      if (["node_modules", ".git", "out", "dist", "build"].includes(entry.name)) continue;
      collectRelevantFiles(fullPath, output);
      continue;
    }
    if (/\.(ts|tsx|js|jsx|json|md|ps1)$/i.test(entry.name)) output.push(fullPath);
  }
  return output;
}

function readPackageScripts(workspaceRoot: string) {
  try {
    const packageFile = JSON.parse(fs.readFileSync(path.join(workspaceRoot, "package.json"), "utf8"));
    return {
      compile: packageFile.scripts?.compile || "",
      test: packageFile.scripts?.test || "",
      lint: packageFile.scripts?.lint || ""
    };
  } catch {
    return { compile: "", test: "", lint: "" };
  }
}

function readGitStatus(workspaceRoot: string) {
  try {
    return String(execSync("git status --short", { cwd: workspaceRoot, stdio: ["ignore", "pipe", "ignore"] }))
      .split(/\r?\n/)
      .filter(Boolean);
  } catch {
    return [];
  }
}

function readCommandRegistrations(packageJsonPath: string) {
  try {
    const packageFile = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
    return Array.isArray(packageFile.contributes?.commands)
      ? packageFile.contributes.commands.map((item: { command?: string }) => item.command || "").filter(Boolean)
      : [];
  } catch {
    return [];
  }
}

function findWritePaths(workspaceRoot: string) {
  const matches: string[] = [];
  for (const file of collectRelevantFiles(path.join(workspaceRoot, "src")).slice(0, 200)) {
    try {
      const content = fs.readFileSync(file, "utf8");
      if (/writeFileSync|appendFileSync|workspace\.fs\.writeFile|WorkspaceEdit/.test(content)) {
        matches.push(file);
      }
    } catch {}
  }
  return matches;
}

function shouldRequireApproval(userRequest: string, inspection: WorkspaceInspection) {
  if (inspection.relevantFiles.length > 3) return true;
  if (/package\.json|law|governance|model routing|delete/i.test(userRequest)) return true;
  if (inspection.writePaths.length > 0 && /write|patch|modify|apply/i.test(userRequest)) return true;
  return false;
}

function hasScript(workspaceRoot: string, script: string) {
  try {
    const packageFile = JSON.parse(fs.readFileSync(path.join(workspaceRoot, "package.json"), "utf8"));
    return Boolean(packageFile.scripts?.[script]);
  } catch {
    return false;
  }
}

/*
DISCOVERY_PIPELINE:
Voice → Intent → Location → Vertical → Ranking → Render
*/
