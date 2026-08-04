/*
LEEWAY_HEADER - DO NOT REMOVE
TAG: REVIEW.CONTEXT.BUILDER
REGION: GOVERNANCE
PURPOSE: Builds repository-aware review context for governed code review.
*/

import * as fs from "fs";
import * as path from "path";
import { resolveWorkspaceRoot } from "../agents/leewayAgentBookClient";
import type { LeewayCodeReviewRequest, LeewayReviewContext } from "./review.types";

function normalizeWorkspacePath(workspaceRoot: string, filePath: string): string {
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(workspaceRoot, filePath);
  return path.relative(workspaceRoot, absolutePath).replace(/\\/g, "/");
}

function safeReadFile(workspaceRoot: string, filePath: string): string {
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(workspaceRoot, filePath);
  try {
    return fs.readFileSync(absolutePath, "utf8").split(/\r?\n/).slice(0, 40).join("\n");
  } catch {
    return "";
  }
}

export function buildLeewayReviewContext(request: LeewayCodeReviewRequest, workspaceRoot = resolveWorkspaceRoot()): LeewayReviewContext {
  const normalizedFiles = request.filesReviewed.map((filePath) => normalizeWorkspacePath(workspaceRoot, filePath));
  const surroundingCodeInspected = request.surroundingCodeInspected?.length
    ? request.surroundingCodeInspected.map((filePath) => normalizeWorkspacePath(workspaceRoot, filePath))
    : normalizedFiles;

  const combinedSource = normalizedFiles.map((filePath) => safeReadFile(workspaceRoot, filePath)).join("\n");
  const hasStandardsImpact = normalizedFiles.some((filePath) => filePath.startsWith("LeeWay-Standards/"));
  const hasBridgeImpact = normalizedFiles.some((filePath) => filePath.startsWith(".leeway-vscode/"));
  const hasEdgeImpact = normalizedFiles.some((filePath) => /^LeeWay-Edge-(RTC|GPU|DEVICE|IOT)\//.test(filePath));
  const hasAdminImpact = normalizedFiles.some((filePath) => /admin|reports\//i.test(filePath));
  const hasRuntimeImpact = normalizedFiles.some((filePath) => /runtime|bridge-runtime|voice/i.test(filePath));

  return {
    workspaceRoot,
    targetRoot: normalizeWorkspacePath(workspaceRoot, request.targetRoot),
    intentSummary: request.intentSummary,
    changeSummary: request.changeSummary,
    filesReviewed: normalizedFiles,
    surroundingCodeInspected,
    architectureImpact: normalizedFiles.length > 1 ? ["Change spans multiple files and requires interaction review."] : ["Change is localized but still requires Standards acceptance."],
    standardsImpact: hasStandardsImpact ? ["Standards-root files changed and require constitutional review."] : ["Standards root unchanged, but Standards acceptance is still required."],
    agentBookImpact: /LEEWAY_AGENT::|allowedWorkflows|allowedTools/.test(combinedSource) ? ["Agent authority or workflow definitions may be affected."] : ["No direct Agent Book mutation detected from reviewed source excerpt."],
    modelHiveImpact: /LEEWAY_LLM_ROUTE::|model/i.test(combinedSource) ? ["Model route behavior or authority assumptions require review."] : ["No direct Model Hive route mutation detected from reviewed source excerpt."],
    edgeImpact: hasEdgeImpact ? ["Edge dependency path touched and must respect Edge Power Grid gate."] : ["No direct edge root mutation detected."],
    adminOsImpact: hasAdminImpact ? ["Admin or reporting surfaces changed and must remain AdminOS-aligned."] : ["No admin surface mutation detected."],
    securityRisks: /token|secret|auth|permission|execute|terminal/i.test(combinedSource) ? ["Sensitive authority or execution path detected. Security review required."] : ["No obvious secret or execution keyword spike detected in sampled code."],
    testCoverage: normalizedFiles.some((filePath) => /test|spec/i.test(filePath)) ? ["Test or proof file included in review set."] : ["No dedicated test file detected in review set. Proof review still required."],
    runtimeRisks: hasRuntimeImpact ? ["Runtime or voice surface changed and requires runtime authority proof."] : ["No direct runtime host mutation detected."],
    deploymentRisks: /deploy|publish|release|build/i.test(combinedSource) ? ["Deployment-sensitive code path detected and requires deployment review."] : ["No direct deployment keyword spike detected in sampled code."]
  };
}