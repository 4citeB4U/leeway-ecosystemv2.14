/*
LEEWAY HEADER — DO NOT REMOVE

REGION: 🧠 AI
TAG: AI.EXECUTION_BRAIN.DEPENDENCY_GRAPH.QUERY

5WH:
WHAT = Agent Lee dependency graph query bridge
WHY = Provides execution-brain access to indexed dependency graph and command/symbol maps
WHO = Agent Lee Execution Brain
WHERE = src/execution-brain/dependencyGraph.query.ts
WHEN = 2026
HOW = Uses index query service + graph adapter for execution-ready dependency lookups

AGENTS:
PRIME
DOCTOR
AUDIT

LICENSE:
MIT
*/

import type { DependencyNode } from "./executionBrain.types";
import { adaptIndexToDependencyGraph } from "../indexing/indexToDependencyGraph.adapter";
import { getOrCreateIndexQueryService } from "../indexing/indexQuery.service";

export function getIndexedDependencyNodes(workspaceRoot: string): DependencyNode[] {
  const service = getOrCreateIndexQueryService(workspaceRoot);
  const payload = service.readKnowledgeIndex();
  if (!payload) return [];
  return adaptIndexToDependencyGraph(payload);
}

export function queryRelatedFilesFromIndex(workspaceRoot: string, filePath: string): string[] {
  return getOrCreateIndexQueryService(workspaceRoot).relatedFiles(filePath);
}

export function queryIndexedCommandMap(workspaceRoot: string) {
  return getOrCreateIndexQueryService(workspaceRoot).commandMap();
}

export function queryIndexedSymbol(workspaceRoot: string, symbol: string): string[] {
  return getOrCreateIndexQueryService(workspaceRoot).symbolSearch(symbol);
}

export function queryMissingLeeWayHeaders(workspaceRoot: string): string[] {
  return getOrCreateIndexQueryService(workspaceRoot).missingHeaders();
}

/*
DISCOVERY_PIPELINE:
Voice → Intent → Location → Vertical → Ranking → Render
*/