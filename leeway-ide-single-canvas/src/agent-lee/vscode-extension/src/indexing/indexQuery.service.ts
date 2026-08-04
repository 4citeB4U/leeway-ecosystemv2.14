/*
LEEWAY HEADER — DO NOT REMOVE

REGION: 🟢 CORE
TAG: CORE.INDEXING.QUERY.SERVICE

5WH:
WHAT = Agent Lee indexed workspace query service
WHY = Turns indexed workspace records into actionable dependency/symbol/command intelligence
WHO = Agent Lee Index Query Runtime
WHERE = src/indexing/indexQuery.service.ts
WHEN = 2026
HOW = Reads knowledge-index.json and exposes query helpers for commands, voice intents, and execution planning

AGENTS:
PRIME
DOCTOR
AUDIT

LICENSE:
MIT
*/

import * as fs from "fs";
import * as path from "path";
import type { BackgroundIndexerFileRecord, BackgroundIndexerGraphEdge } from "./backgroundIndexer.types";

export interface KnowledgeIndexPayload {
  generatedAt: string;
  records: BackgroundIndexerFileRecord[];
  graph: BackgroundIndexerGraphEdge[];
}

export interface DependencyStatusSummary {
  generatedAt: string;
  filesIndexed: number;
  importEdges: number;
  commandEdges: number;
  missingHeaders: number;
}

export interface IndexCommandMapEntry {
  command: string;
  files: string[];
}

export class AgentLeeIndexQueryService {
  constructor(private readonly workspaceRoot: string) {}

  readKnowledgeIndex(): KnowledgeIndexPayload | null {
    const filePath = path.join(this.workspaceRoot, ".agent-lee", "indexing", "knowledge-index.json");
    if (!fs.existsSync(filePath)) return null;

    try {
      const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as KnowledgeIndexPayload;
      return {
        generatedAt: parsed.generatedAt,
        records: parsed.records || [],
        graph: parsed.graph || [],
      };
    } catch {
      return null;
    }
  }

  dependencyStatus(): DependencyStatusSummary | null {
    const index = this.readKnowledgeIndex();
    if (!index) return null;

    return {
      generatedAt: index.generatedAt,
      filesIndexed: index.records.length,
      importEdges: index.graph.filter((edge) => edge.kind === "import").length,
      commandEdges: index.graph.filter((edge) => edge.kind === "command").length,
      missingHeaders: index.records.filter((record) => !record.hasLeeWayHeader).length,
    };
  }

  relatedFiles(filePath: string): string[] {
    const index = this.readKnowledgeIndex();
    if (!index) return [];

    const normalized = normalizePath(filePath);
    const related = new Set<string>();

    for (const edge of index.graph) {
      const from = normalizePath(edge.from);
      const to = normalizePath(edge.to);

      if (from === normalized) related.add(edge.to);
      if (to === normalized) related.add(edge.from);
    }

    const byImport = index.records
      .find((record) => normalizePath(record.path) === normalized)
      ?.imports ?? [];
    for (const item of byImport) related.add(item);

    return Array.from(related).filter(Boolean);
  }

  commandMap(): IndexCommandMapEntry[] {
    const index = this.readKnowledgeIndex();
    if (!index) return [];

    const map = new Map<string, Set<string>>();
    for (const record of index.records) {
      for (const command of record.commands) {
        const current = map.get(command) ?? new Set<string>();
        current.add(record.path);
        map.set(command, current);
      }
    }

    return Array.from(map.entries())
      .map(([command, files]) => ({ command, files: Array.from(files) }))
      .sort((a, b) => a.command.localeCompare(b.command));
  }

  symbolSearch(symbol: string): string[] {
    const index = this.readKnowledgeIndex();
    if (!index) return [];

    const token = symbol.trim().toLowerCase();
    if (!token) return [];

    return index.records
      .filter((record) => record.symbols.some((value) => value.toLowerCase().includes(token)))
      .map((record) => record.path);
  }

  missingHeaders(): string[] {
    const index = this.readKnowledgeIndex();
    if (!index) return [];

    return index.records
      .filter((record) => !record.hasLeeWayHeader)
      .map((record) => record.path);
  }
}

let singleton: AgentLeeIndexQueryService | null = null;

export function getOrCreateIndexQueryService(workspaceRoot: string): AgentLeeIndexQueryService {
  if (!singleton) singleton = new AgentLeeIndexQueryService(workspaceRoot);
  return singleton;
}

function normalizePath(value: string): string {
  return value.replace(/\\/g, "/").toLowerCase();
}

/*
DISCOVERY_PIPELINE:
Voice → Intent → Location → Vertical → Ranking → Render
*/