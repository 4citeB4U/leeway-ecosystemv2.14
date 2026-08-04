/*
LEEWAY HEADER — DO NOT REMOVE

REGION: 🧠 AI
TAG: AI.INDEXING.DEPENDENCY_GRAPH.ADAPTER

5WH:
WHAT = Agent Lee index-to-dependency graph adapter
WHY = Converts workspace index payloads into execution-brain dependency nodes
WHO = Agent Lee Index Query Runtime
WHERE = src/indexing/indexToDependencyGraph.adapter.ts
WHEN = 2026
HOW = Maps indexed records + graph edges into DependencyNode contracts

AGENTS:
PRIME
DOCTOR
AUDIT

LICENSE:
MIT
*/

import type { DependencyNode } from "../execution-brain/executionBrain.types";
import type { KnowledgeIndexPayload } from "./indexQuery.service";

export function adaptIndexToDependencyGraph(input: KnowledgeIndexPayload): DependencyNode[] {
  const edgesByFile = new Map<string, Set<string>>();

  for (const edge of input.graph) {
    if (edge.kind !== "import") continue;

    const current = edgesByFile.get(edge.from) ?? new Set<string>();
    current.add(edge.to);
    edgesByFile.set(edge.from, current);
  }

  return input.records.map((record) => ({
    filePath: record.path,
    imports: record.imports,
    exports: record.symbols,
    commands: record.commands,
    routes: [],
    envVars: [],
    relatedFiles: Array.from(edgesByFile.get(record.path) ?? []),
  }));
}

/*
DISCOVERY_PIPELINE:
Voice → Intent → Location → Vertical → Ranking → Render
*/