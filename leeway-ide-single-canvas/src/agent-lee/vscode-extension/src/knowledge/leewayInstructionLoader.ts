/*
LEEWAY HEADER - DO NOT REMOVE

REGION: AI
TAG: AI.KNOWLEDGE.INSTRUCTIONS.LOADER
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
*/

import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { leewayKnowledgeStore } from "./leewayKnowledgeStore";

const INSTRUCTION_FILES = [
  "AGENTS.md",
  "LEEWAY.md",
  "LEEWAY_STANDARDS.md",
  ".leeway/AGENTS.md",
  ".leeway/LEEWAY.md",
  ".github/copilot-instructions.md"
];

function summarize(text: string) {
  return text
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .slice(0, 12)
    .join(" ")
    .slice(0, 600);
}

function hashText(text: string) {
  return crypto.createHash("sha256").update(text).digest("hex").slice(0, 24);
}

export function loadProjectInstructions(workspaceRoot: string) {
  const loaded = [];

  for (const rel of INSTRUCTION_FILES) {
    const full = path.join(workspaceRoot, rel);
    if (!fs.existsSync(full)) continue;

    const content = fs.readFileSync(full, "utf8");
    loaded.push(leewayKnowledgeStore.upsert({
      kind: "instruction",
      drive: "L",
      title: rel,
      path: full,
      summary: summarize(content),
      content,
      tags: ["instructions", "project-guidance", "leeway"],
      region: "CORE",
      tag: "CORE.INSTRUCTIONS.PROJECT.MAIN",
      source: "workspace",
      confidence: 1,
      hash: hashText(content)
    }));
  }

  return loaded;
}
