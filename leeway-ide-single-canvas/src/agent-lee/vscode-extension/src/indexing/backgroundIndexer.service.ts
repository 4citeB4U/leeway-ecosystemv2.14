/*
LEEWAY HEADER — DO NOT REMOVE

REGION: 🟢 CORE
TAG: CORE.INDEXING.BACKGROUND.SERVICE

5WH:
WHAT = Agent Lee background workspace indexer service
WHY = Builds a lightweight dependency/command/header index in governed batches
WHO = Agent Lee Background Indexer Runtime
WHERE = src/indexing/backgroundIndexer.service.ts
WHEN = 2026
HOW = Small batch indexer with pause/resume, profile-aware limits, and receipt output

AGENTS:
PRIME
DOCTOR
AUDIT

LICENSE:
MIT
*/

import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { performanceGovernor } from "../performance/performanceGovernor";
import { backgroundIndexerStore } from "./backgroundIndexer.store";
import type {
  BackgroundIndexerFileRecord,
  BackgroundIndexerGraphEdge,
  BackgroundIndexerReceipt,
  BackgroundIndexerState,
} from "./backgroundIndexer.types";

const RECEIPT_ROOT = path.join(process.env.USERPROFILE || process.env.HOME || ".", ".leeway-vscode", "logs", "agent-lee", "indexing");
const EXCLUDE_GLOB = "**/{node_modules,.git,dist,build,out}/**";

export class AgentLeeBackgroundIndexerService {
  private queue: string[] = [];
  private records = new Map<string, BackgroundIndexerFileRecord>();
  private edges: BackgroundIndexerGraphEdge[] = [];

  constructor(private readonly workspaceRoot: string) {
    fs.mkdirSync(RECEIPT_ROOT, { recursive: true });
    backgroundIndexerStore.update({ workspaceRoot: this.workspaceRoot });
  }

  async initializeQueue(): Promise<void> {
    const uris = await vscode.workspace.findFiles("**/*", EXCLUDE_GLOB);
    this.queue = uris
      .map((uri) => uri.fsPath)
      .filter((filePath) => fs.existsSync(filePath) && fs.statSync(filePath).isFile());

    backgroundIndexerStore.update({
      queuedFiles: this.queue.length,
      message: `Queued ${this.queue.length} files for background indexing.`,
    });
  }

  async runBatch(): Promise<BackgroundIndexerState> {
    const budget = performanceGovernor.getBudget();

    if (!budget.enableBackgroundIndexing || budget.profile === "raspberry_pi") {
      return backgroundIndexerStore.update({
        phase: "paused",
        message: `Background indexing is paused for ${budget.profile} profile.`,
      });
    }

    if (!this.queue.length) {
      await this.initializeQueue();
    }

    const batchSize = Math.max(1, budget.maxFileIndexBatch);
    const batch = this.queue.splice(0, batchSize);

    backgroundIndexerStore.update({
      phase: "running",
      queuedFiles: this.queue.length,
      lastBatchCount: batch.length,
      message: `Indexing batch of ${batch.length} file(s).`,
    });

    for (const filePath of batch) {
      const record = this.indexFile(filePath);
      if (!record) continue;
      this.records.set(record.path, record);

      for (const imported of record.imports) {
        this.edges.push({ from: record.path, to: imported, kind: "import" });
      }
      for (const command of record.commands) {
        this.edges.push({ from: record.path, to: command, kind: "command" });
      }
    }

    const nextState = backgroundIndexerStore.update({
      phase: this.queue.length ? "running" : "idle",
      queuedFiles: this.queue.length,
      indexedFiles: this.records.size,
      lastBatchCount: batch.length,
      lastRunAt: new Date().toISOString(),
      message: this.queue.length
        ? `Indexed ${batch.length} files. ${this.queue.length} remaining.`
        : `Index complete. ${this.records.size} files indexed.`,
    });

    this.writeKnowledgeBase();
    this.writeReceipt(nextState);
    return nextState;
  }

  pause(): BackgroundIndexerState {
    return backgroundIndexerStore.update({
      phase: "paused",
      message: "Background indexing paused.",
    });
  }

  resume(): BackgroundIndexerState {
    return backgroundIndexerStore.update({
      phase: "idle",
      message: "Background indexing resumed.",
    });
  }

  status(): BackgroundIndexerState {
    return backgroundIndexerStore.get();
  }

  dispose(): void {
    this.queue = [];
    this.records.clear();
    this.edges = [];
    backgroundIndexerStore.update({
      phase: "idle",
      queuedFiles: 0,
      indexedFiles: 0,
      lastBatchCount: 0,
      message: "Background indexing disposed.",
    });
  }

  private indexFile(filePath: string): BackgroundIndexerFileRecord | null {
    try {
      const text = fs.readFileSync(filePath, "utf8");
      const rel = path.relative(this.workspaceRoot, filePath).replace(/\\/g, "/");
      const language = path.extname(filePath).replace(".", "") || "text";

      const imports = extractMatches(text, /from\s+['"]([^'"]+)['"]|require\(['"]([^'"]+)['"]\)/g);
      const symbols = extractMatches(text, /(?:function|class|interface|type|const|let)\s+([A-Za-z0-9_]+)/g);
      const commands = extractMatches(text, /(agentLee\.[A-Za-z0-9_.-]+)/g);
      const packageScripts = rel.endsWith("package.json") ? extractPackageScripts(text) : [];

      return {
        path: rel,
        language,
        imports,
        symbols,
        commands,
        packageScripts,
        hasLeeWayHeader: /LEEWAY HEADER/i.test(text),
        indexedAt: new Date().toISOString(),
      };
    } catch {
      return null;
    }
  }

  private writeKnowledgeBase(): void {
    const targetDir = path.join(this.workspaceRoot, ".agent-lee", "indexing");
    fs.mkdirSync(targetDir, { recursive: true });

    const payload = {
      generatedAt: new Date().toISOString(),
      records: Array.from(this.records.values()),
      graph: this.edges,
    };

    fs.writeFileSync(
      path.join(targetDir, "knowledge-index.json"),
      JSON.stringify(payload, null, 2),
      "utf8"
    );
  }

  private writeReceipt(state: BackgroundIndexerState): void {
    const receipt: BackgroundIndexerReceipt = {
      ts: new Date().toISOString(),
      phase: state.phase,
      indexedFiles: state.indexedFiles,
      queuedFiles: state.queuedFiles,
      lastBatchCount: state.lastBatchCount,
      message: state.message,
    };

    fs.appendFileSync(
      path.join(RECEIPT_ROOT, "background-indexer.ndjson"),
      JSON.stringify(receipt) + "\n",
      "utf8"
    );
  }
}

let singletonService: AgentLeeBackgroundIndexerService | null = null;

export function getOrCreateBackgroundIndexerService(workspaceRoot: string): AgentLeeBackgroundIndexerService {
  if (!singletonService) {
    singletonService = new AgentLeeBackgroundIndexerService(workspaceRoot);
  }
  return singletonService;
}

function extractMatches(text: string, regex: RegExp): string[] {
  const out = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const value = match.slice(1).find(Boolean) || match[1] || match[0];
    if (value) out.add(String(value));
  }
  return Array.from(out);
}

function extractPackageScripts(text: string): string[] {
  try {
    const parsed = JSON.parse(text) as { scripts?: Record<string, string> };
    return parsed.scripts ? Object.keys(parsed.scripts) : [];
  } catch {
    return [];
  }
}

/*
DISCOVERY_PIPELINE:
Voice → Intent → Location → Vertical → Ranking → Render
*/