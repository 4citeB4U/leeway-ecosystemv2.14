/*
LEEWAY HEADER - DO NOT REMOVE

REGION: AI
TAG: AI.EXECUTION_BRAIN.DEPENDENCY_GRAPH.BUILDER
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
*/

import * as fs from "fs";
import * as path from "path";
import { buildContext } from "../core/file-intelligence";
import type { DependencyNode } from "./executionBrain.types";

function uniq(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function extractImports(content: string) {
  const results: string[] = [];
  const regex = /from\s+["']([^"']+)["']/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content))) results.push(match[1]);
  return uniq(results);
}

function extractExports(content: string) {
  const results: string[] = [];
  const regex = /export\s+(?:async\s+)?(?:function|const|class|type|interface)\s+([A-Za-z0-9_]+)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content))) results.push(match[1]);
  return uniq(results);
}

function extractCommands(content: string) {
  const results: string[] = [];
  const regex = /["'`]([a-z0-9]+\.[a-z0-9._-]+)["'`]/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content))) {
    if (match[1].includes(".")) results.push(match[1]);
  }
  return uniq(results);
}

function extractRoutes(content: string) {
  const results: string[] = [];
  const regex = /(?:get|post|put|patch|delete)\s*\(\s*["'`]([^"'`]+)["'`]/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content))) results.push(match[1]);
  return uniq(results);
}

function extractEnvVars(content: string) {
  const results: string[] = [];
  const regex = /process\.env\.([A-Z0-9_]+)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content))) results.push(match[1]);
  return uniq(results);
}

function resolveRelatedFiles(filePath: string, imports: string[]) {
  const dir = path.dirname(filePath);
  const related: string[] = [];
  for (const item of imports) {
    if (!item.startsWith(".")) continue;
    const base = path.resolve(dir, item);
    for (const candidate of [base, `${base}.ts`, `${base}.tsx`, `${base}.js`, `${base}.jsx`, path.join(base, "index.ts"), path.join(base, "index.tsx")]) {
      if (fs.existsSync(candidate)) {
        related.push(candidate);
        break;
      }
    }
  }
  return uniq(related);
}

export function buildDependencyGraph(workspaceRoot: string, limit = 80): DependencyNode[] {
  const context = buildContext(workspaceRoot);
  return context.samples.slice(0, limit).map((sample) => {
    const imports = extractImports(sample.preview);
    return {
      filePath: sample.file,
      imports,
      exports: extractExports(sample.preview),
      commands: extractCommands(sample.preview),
      routes: extractRoutes(sample.preview),
      envVars: extractEnvVars(sample.preview),
      relatedFiles: resolveRelatedFiles(sample.file, imports)
    };
  });
}
