/*
LEEWAY_HEADER - DO NOT REMOVE

REGION: 🧠 AI
TAG: AI.VISUAL.VISUAL_MEMORY.TOOLS
PURPOSE: Tool surface for the Leeway Visual Memory Worker.
DISCOVERY_PIPELINE:
  Voice → Intent → Location → Vertical → Ranking → Render
*/

import * as fs from "fs";
import * as path from "path";

const ROOT = path.join(process.env.USERPROFILE || "", ".leeway-vscode", "agent-lee", "visual-intelligence", "memory");
const MEMORY_FILE = path.join(ROOT, "visual-memory.json");

function readStore() {
  try {
    return JSON.parse(fs.readFileSync(MEMORY_FILE, "utf8"));
  } catch {
    return { presets: {}, failures: {}, history: [] as unknown[] };
  }
}

function writeStore(store: Record<string, unknown>) {
  fs.mkdirSync(ROOT, { recursive: true });
  fs.writeFileSync(MEMORY_FILE, JSON.stringify(store, null, 2), "utf8");
}

export function savePreset(key: string, value: Record<string, unknown>) {
  const store = readStore();
  (store.presets as Record<string, unknown>)[key] = value;
  writeStore(store);
  return value;
}

export function loadPreset(key: string) {
  const store = readStore();
  return (store.presets as Record<string, unknown>)[key] || null;
}

export function saveFailurePattern(key: string, value: Record<string, unknown>) {
  const store = readStore();
  (store.failures as Record<string, unknown>)[key] = value;
  writeStore(store);
  return value;
}

export function suggestStrategy(key: string) {
  return loadPreset(key) || { strategy: "balanced-pass", reason: "No prior preset found." };
}

export function writeRunHistory(entry: Record<string, unknown>) {
  const store = readStore();
  (store.history as unknown[]).push(entry);
  writeStore(store);
  return entry;
}
