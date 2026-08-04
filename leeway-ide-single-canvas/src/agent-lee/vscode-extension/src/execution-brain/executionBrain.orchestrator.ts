/*
LEEWAY HEADER - DO NOT REMOVE

REGION: AI
TAG: AI.EXECUTION_BRAIN.ORCHESTRATOR.MAIN
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
*/

import * as path from "path";
import { buildDependencyGraph } from "./dependencyGraph.builder";
import { analyzeDependencyImpact } from "./dependencyImpactAnalyzer";
import { getIndexedDependencyNodes } from "./dependencyGraph.query";
import { generateMinimalHunks } from "./minimalHunk.generator";
import { planDatabaseTransactions } from "./databaseTransaction.planner";
import { defaultVerificationCommands } from "./terminalVerification.runner";
import { writeExecutionReceipt } from "./executionReceipt.logger";
import type { DependencyNode, ExecutionBrainPlan, ExecutionRisk } from "./executionBrain.types";

function inferRisk(prompt: string): ExecutionRisk {
  if (/\b(payment|deploy|database|secret|auth)\b/i.test(prompt)) return "critical";
  if (/\b(refactor|rewrite|rename|migrate)\b/i.test(prompt)) return "high";
  if (/\b(fix|repair|update|edit)\b/i.test(prompt)) return "medium";
  return "low";
}

function selectTargetFiles(prompt: string, graph: DependencyNode[]) {
  const lower = prompt.toLowerCase();
  const scored = graph.map((node) => {
    const rel = node.filePath.toLowerCase();
    let score = 0;
    for (const token of lower.split(/\s+/).filter(Boolean)) {
      if (rel.includes(token)) score += 3;
      if (node.exports.some((value) => value.toLowerCase().includes(token))) score += 2;
      if (node.commands.some((value) => value.toLowerCase().includes(token))) score += 2;
      if (node.routes.some((value) => value.toLowerCase().includes(token))) score += 2;
    }
    return { filePath: node.filePath, score };
  });

  return scored
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map((entry) => entry.filePath);
}

export function buildExecutionBrainPlan(workspaceRoot: string, prompt: string): ExecutionBrainPlan {
  const indexedGraph = getIndexedDependencyNodes(workspaceRoot);
  const graph = indexedGraph.length ? indexedGraph : buildDependencyGraph(workspaceRoot);
  const targetFiles = selectTargetFiles(prompt, graph);
  const impact = analyzeDependencyImpact(workspaceRoot, targetFiles);
  const hunks = generateMinimalHunks(prompt, targetFiles);
  const databaseTransactions = planDatabaseTransactions(prompt);
  const verificationCommands = defaultVerificationCommands(workspaceRoot);

  const plan: ExecutionBrainPlan = {
    id: `exec-${Date.now()}`,
    title: `Execution plan for ${path.basename(workspaceRoot) || "workspace"}`,
    prompt,
    phase: "planning",
    risk: inferRisk(prompt),
    dependencyNodes: graph,
    targetFiles,
    hunks,
    verificationCommands,
    databaseTransactions,
    repairCandidates: [],
    receipts: []
  };

  const receipt = writeExecutionReceipt({
    id: plan.id,
    title: plan.title,
    risk: plan.risk,
    targetFiles: plan.targetFiles,
    impactedFiles: impact.impactedFiles,
    impactWarnings: impact.warnings,
    dependencySource: indexedGraph.length ? "indexed" : "preview-builder",
    hunkCount: plan.hunks.length,
    verificationCommands: plan.verificationCommands.map((item) => item.command),
    databaseTransactions: plan.databaseTransactions
  });
  plan.receipts.push(receipt);
  return plan;
}
