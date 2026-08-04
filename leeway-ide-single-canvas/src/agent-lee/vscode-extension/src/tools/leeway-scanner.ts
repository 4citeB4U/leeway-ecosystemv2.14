/*
LEEWAY_HEADER - DO NOT REMOVE

REGION: 🟢 CORE
TAG: CORE.TOOLS.LEEWAY.SCANNER
PURPOSE: Unified LeeWay compliance scanner for Agent Lee live commands and runtime verification.
DISCOVERY_PIPELINE:
  Voice → Intent → Location → Vertical → Ranking → Render
*/

import * as fs from "fs";
import * as path from "path";

import { isGovernedLeeWayFile, VALID_REGIONS } from "../core/leeway-write-policy";

export const LEEWAY_SCANNER_VERSION = "self-scan-unified-2026-05-07";

const REGIONS = VALID_REGIONS;

export type AuditResult = {
  file: string;
  score: number;
  grade: string;
  header: boolean;
  region: boolean;
  tag: boolean;
  pipeline: boolean;
};

export type ScanOptions = {
  root: string;
  mode: "self" | "workspace" | "currentFile";
  label?: string;
};

export type ScanResult = {
  scannedRoot: string;
  scanMode: string;
  inspected: number;
  fullyCompliant: number;
  averageScore: number;
  blockingFiles: AuditResult[];
  blockingPaths: string[];
  excludedFiles: number;
  results: AuditResult[];
};

export function getFiles(dir: string, out: string[] = [], root: string = dir, mode: "self" | "workspace" | "currentFile" = "workspace"): string[] {
  if (!fs.existsSync(dir)) return out;

  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    const stat = fs.statSync(full);

    if (stat.isDirectory()) {
      // Still need directory recursion, but we skip if the directory itself is governed-excluded
      if (isGovernedLeeWayFile(full + "/placeholder.ts", root, mode)) {
         getFiles(full, out, root, mode);
      }
    } else {
      if (isGovernedLeeWayFile(full, root, mode)) {
        out.push(full);
      }
    }
  }
  return out;
}

export function auditFile(file: string): AuditResult {
  let content = "";
  try {
    content = fs.readFileSync(file, "utf8");
  } catch {
    return { file, score: 0, grade: "ERROR", header: false, region: false, tag: false, pipeline: false };
  }

  const hasHeader = content.includes("LEEWAY_HEADER") || content.includes("LEEWAY HEADER") || content.includes('"LEEWAY_HEADER"');
  const hasRegion = content.includes("REGION:") || /"REGION"\s*:/.test(content);
  const hasTag = content.includes("TAG:") || /"TAG"\s*:/.test(content);
  const hasPipeline = content.includes("DISCOVERY_PIPELINE") || /"DISCOVERY_PIPELINE"/.test(content) || /Voice\s*[\u2192-]\s*Intent/.test(content);

  let score = 0;
  if (hasHeader) score += 25;
  if (hasTag) score += 25;
  if (hasRegion) score += 25;
  if (hasPipeline) score += 25;

  let grade = "NON-COMPLIANT";
  if (score >= 100) grade = "GOLD";
  else if (score >= 75) grade = "SILVER";
  else if (score >= 50) grade = "BRONZE";

  return {
    file,
    score,
    grade,
    header: hasHeader,
    region: hasRegion,
    tag: hasTag,
    pipeline: hasPipeline
  };
}

/**
 * Unified LeeWay compliance scanner API.
 * This is the single source of truth for doctor, live scan, and verify commands.
 */
export async function scanLeeWayCompliance(options: ScanOptions): Promise<ScanResult> {
  const { root, mode } = options;
  const files = getFiles(root, [], root, mode);
  const results = files.map((file) => auditFile(file));
  const blockingFiles = results.filter((result) => result.score < 70);
  
  const inspected = results.length;
  const fullyCompliant = results.filter((r) => r.score >= 100).length;
  const averageScore = inspected
    ? Number((results.reduce((sum, r) => sum + r.score, 0) / inspected).toFixed(2))
    : 100;

  return {
    scannedRoot: root,
    scanMode: mode,
    inspected,
    fullyCompliant,
    averageScore,
    blockingFiles,
    blockingPaths: blockingFiles.map(f => f.file),
    excludedFiles: 0, // Placeholder if we ever want to count them explicitly during the walk
    results
  };
}

export function makeHeader(file: string) {
  const base = path.basename(file, path.extname(file)).replace(/[^a-zA-Z0-9]/g, "_").toUpperCase();
  return `/*
LEEWAY_HEADER - DO NOT REMOVE

REGION: 🛠️ UTIL
TAG: UTIL.LOCAL.${base}.MAIN
PURPOSE: Agent Lee governed LeeWay source file.
DISCOVERY_PIPELINE:
  Voice → Intent → Location → Vertical → Ranking → Render
*/
`;
}
