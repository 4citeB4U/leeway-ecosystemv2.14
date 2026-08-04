/*
LEEWAY_HEADER - DO NOT REMOVE

TAG: DATA.LOCAL.MEMORY.MAIN
REGION: 💾 DATA
PURPOSE: Local memory support for Agent Lee runtime state and continuity.
DISCOVERY_PIPELINE:
  Voice → Intent → Location → Vertical → Ranking → Render
*/

import * as fs from "fs";
import * as path from "path";
import { appendFileWithRetries, describeFileError } from "./file-ops";
import { buildMemoryProvenance } from "./zero-trust";

const ROOT = path.join(process.env.USERPROFILE || "", ".leeway-vscode");
const MEMORY_ROOT = path.join(ROOT, "memory");
const FILE = path.join(MEMORY_ROOT, "agent-lee", "memory.jsonl");

function safeMemoryId(value: string) {
  return String(value || "agent")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "agent";
}

export function getAgentMemoryLedgerPath(agentId: string) {
  return path.join(MEMORY_ROOT, "agents", safeMemoryId(agentId), "events.jsonl");
}

export function store(text: string) {
  try {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    const provenance = buildMemoryProvenance("runtime", { sourceUnit: "agent-lee.runtime", provenance: "agent-lee-memory-store" });
    appendFileWithRetries(FILE, JSON.stringify({ ts: Date.now(), text, ...provenance }) + "\n");
  } catch (error) {
    console.warn(`[Agent Lee] Memory persistence failed: ${describeFileError(error)}`);
  }
}

export function storeAgentMemory(agentId: string, event: string, payload: Record<string, unknown> = {}) {
  const file = getAgentMemoryLedgerPath(agentId);
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const provenance = buildMemoryProvenance("agent", payload, {
      sourceUnit: safeMemoryId(agentId),
      provenance: "agent-event-ledger",
      securityZone: "Z1"
    });
    appendFileWithRetries(file, JSON.stringify({
      ts: new Date().toISOString(),
      agentId: safeMemoryId(agentId),
      event,
      ...provenance,
      ...payload
    }) + "\n");
  } catch (error) {
    console.warn(`[Agent Lee] Agent memory persistence failed: ${describeFileError(error)}`);
  }
  return file;
}

export function getMemoryStatus(agentId?: string) {
  return {
    root: MEMORY_ROOT,
    agentLeeLedgerPath: FILE,
    agentLedgerPath: agentId ? getAgentMemoryLedgerPath(agentId) : ""
  };
}
