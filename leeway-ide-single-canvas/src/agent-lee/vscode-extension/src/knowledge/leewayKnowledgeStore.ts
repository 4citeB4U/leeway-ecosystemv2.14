/*
LEEWAY HEADER - DO NOT REMOVE

REGION: DATA
TAG: DATA.KNOWLEDGE.STORE.MAIN
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
*/

import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import type { LeeWayKnowledgeRecord, LeeWayRetrievalMatch, LeeWayRetrievalQuery } from "./leewayKnowledge.types";

const ROOT = path.join(process.env.USERPROFILE || process.env.HOME || ".", ".leeway-vscode");
const KNOWLEDGE_DIR = path.join(ROOT, "knowledge");
const KNOWLEDGE_FILE = path.join(KNOWLEDGE_DIR, "knowledge.jsonl");

fs.mkdirSync(KNOWLEDGE_DIR, { recursive: true });

function now() {
  return new Date().toISOString();
}

function idFor(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex").slice(0, 24);
}

export class LeeWayKnowledgeStore {
  private readonly records = new Map<string, LeeWayKnowledgeRecord>();

  constructor() {
    this.load();
  }

  load() {
    this.records.clear();
    if (!fs.existsSync(KNOWLEDGE_FILE)) return;

    const lines = fs.readFileSync(KNOWLEDGE_FILE, "utf8").split(/\r?\n/).filter(Boolean);
    for (const line of lines) {
      try {
        const record = JSON.parse(line) as LeeWayKnowledgeRecord;
        this.records.set(record.id, record);
      } catch {
        // Ignore corrupted records and keep the runtime alive.
      }
    }
  }

  save() {
    const lines = Array.from(this.records.values()).map((record) => JSON.stringify(record));
    fs.writeFileSync(KNOWLEDGE_FILE, lines.join("\n") + "\n", "utf8");
  }

  upsert(input: Omit<LeeWayKnowledgeRecord, "id" | "createdAt" | "updatedAt"> & { id?: string }) {
    const id = input.id || idFor(`${input.kind}:${input.path || input.title}:${input.summary}`);
    const existing = this.records.get(id);
    const stamp = now();

    const record: LeeWayKnowledgeRecord = {
      ...input,
      id,
      createdAt: existing?.createdAt || stamp,
      updatedAt: stamp
    };

    this.records.set(id, record);
    this.save();
    return record;
  }

  get(id: string) {
    return this.records.get(id);
  }

  all() {
    return Array.from(this.records.values());
  }

  search(query: LeeWayRetrievalQuery): LeeWayRetrievalMatch[] {
    const raw = query.query.trim().toLowerCase();
    const maxResults = query.maxResults ?? 12;
    const minConfidence = query.minConfidence ?? 0;
    const tokens = raw.split(/\s+/).filter(Boolean);

    return this.all()
      .filter((record) => !query.kinds || query.kinds.includes(record.kind))
      .filter((record) => !query.tags || query.tags.some((tag) => record.tags.includes(tag)))
      .filter((record) => record.confidence >= minConfidence)
      .map((record) => {
        const haystack = [
          record.title,
          record.summary,
          record.path || "",
          record.tags.join(" "),
          record.content || ""
        ].join("\n").toLowerCase();

        let score = 0;
        if (raw && haystack.includes(raw)) score += 10;
        for (const token of tokens) {
          if (haystack.includes(token)) score += 1;
        }
        if (record.kind === "instruction") score += 2;
        if (record.kind === "receipt") score += 1;

        return {
          record,
          score,
          reason: score >= 10 ? "Exact semantic text match" : "Token overlap"
        };
      })
      .filter((match) => match.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults);
  }
}

export const leewayKnowledgeStore = new LeeWayKnowledgeStore();
