/*
LEEWAY HEADER - DO NOT REMOVE

REGION: AI
TAG: AI.KNOWLEDGE.REPO.INDEXER
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
*/

import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { leewayKnowledgeStore } from "./leewayKnowledgeStore";
import type { LeeWayRegion } from "./leewayKnowledge.types";

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "out",
  "build",
  ".next",
  "coverage",
  ".turbo",
  ".cache",
  "_archive",
  "reports",
  "knowledge",
  "memory",
  "logs",
  "backups",
  "patches",
  "sandbox"
]);
const INDEX_EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".json", ".md", ".css", ".html", ".ps1", ".py", ".yml", ".yaml"]);

export interface RepoIndexStats {
  filesIndexed: number;
  instructionsIndexed: number;
  skipped: number;
}

function safeRead(filePath: string) {
  try {
    const stat = fs.statSync(filePath);
    if (stat.size > 750000) return "";
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

function summarizeFile(rel: string, content: string) {
  const firstLines = content.split(/\r?\n/).slice(0, 25).join(" ");
  return `${rel}: ${firstLines}`.slice(0, 700);
}

function inferRegion(rel: string): LeeWayRegion {
  const lower = rel.toLowerCase();
  if (lower.includes("component") || lower.includes("webview") || lower.endsWith(".tsx") || lower.endsWith(".css")) return "UI";
  if (lower.includes("plugin") || lower.includes("mcp") || lower.includes("adapter")) return "MCP";
  if (lower.includes("store") || lower.includes("database") || lower.includes("memory")) return "DATA";
  if (lower.includes("persona") || lower.includes("model") || lower.includes("orchestrator") || lower.includes("knowledge")) return "AI";
  if (lower.includes("seo")) return "SEO";
  if (lower.includes("script") || lower.includes("util")) return "UTIL";
  return "CORE";
}

function lastPart(tag: string) {
  const parts = tag.split(".").filter(Boolean);
  return parts[parts.length - 1] || "MAIN";
}

function inferTag(rel: string) {
  const clean = rel.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9]+/g, ".").replace(/^\.+|\.+$/g, "").toUpperCase();
  if (rel.toLowerCase().includes("component")) return `UI.COMPONENT.${lastPart(clean)}.MAIN`;
  if (rel.toLowerCase().includes("plugin")) return `MCP.PLUGIN.${lastPart(clean)}.MAIN`;
  if (rel.toLowerCase().includes("persona")) return `AI.PERSONA.${lastPart(clean)}.MAIN`;
  if (rel.toLowerCase().includes("store")) return "DATA.LOCAL.STORE.MAIN";
  return `CORE.REPO.${lastPart(clean)}.MAIN`;
}

function inferTags(rel: string, content: string) {
  const tags = new Set<string>();
  for (const part of rel.toLowerCase().split(/[\\/._-]+/)) {
    if (part.length > 2) tags.add(part);
  }
  if (content.includes("vscode")) tags.add("vscode");
  if (content.includes("WorkspaceEdit")) tags.add("workspace-edit");
  if (content.includes("CodeLens")) tags.add("codelens");
  if (content.includes("AGENTS.md")) tags.add("agents-md");
  if (content.includes("LEEWAY HEADER")) tags.add("leeway-header");
  return Array.from(tags).slice(0, 20);
}

function hashText(text: string) {
  return crypto.createHash("sha256").update(text).digest("hex").slice(0, 24);
}

function walk(dir: string, onFile: (filePath: string) => void) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(path.join(dir, entry.name), onFile);
      continue;
    }
    onFile(path.join(dir, entry.name));
  }
}

export function indexWorkspace(workspaceRoot: string): RepoIndexStats {
  const stats: RepoIndexStats = { filesIndexed: 0, instructionsIndexed: 0, skipped: 0 };

  walk(workspaceRoot, (filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    if (!INDEX_EXTS.has(ext)) {
      stats.skipped += 1;
      return;
    }

    const content = safeRead(filePath);
    if (!content) return;

    const rel = path.relative(workspaceRoot, filePath);
    const kind = /agents\.md|leeway/i.test(rel) ? "instruction" : "file";

    leewayKnowledgeStore.upsert({
      kind,
      drive: kind === "instruction" ? "L" : "R",
      title: rel,
      path: filePath,
      summary: summarizeFile(rel, content),
      content: content.slice(0, 12000),
      tags: inferTags(rel, content),
      region: inferRegion(rel),
      tag: inferTag(rel),
      source: "workspace",
      confidence: 0.85,
      hash: hashText(content)
    });

    if (kind === "instruction") stats.instructionsIndexed += 1;
    else stats.filesIndexed += 1;
  });

  return stats;
}
