/*
LEEWAY HEADER — DO NOT REMOVE

REGION: 🧠 AI
TAG: AI.EXECUTION_BRAIN.DEPENDENCY_IMPACT_ANALYZER

5WH:
WHAT = Agent Lee dependency impact analyzer
WHY = Warns execution planning about files likely affected by proposed edits
WHO = Agent Lee Execution Brain
WHERE = src/execution-brain/dependencyImpactAnalyzer.ts
WHEN = 2026
HOW = Expands target files through the indexed dependency graph and returns impact warnings

AGENTS:
PRIME
DOCTOR
AUDIT

LICENSE:
MIT
*/

import { queryRelatedFilesFromIndex } from "./dependencyGraph.query";

export interface DependencyImpactAnalysis {
  impactedFiles: string[];
  warnings: string[];
}

export function analyzeDependencyImpact(
  workspaceRoot: string,
  targetFiles: string[]
): DependencyImpactAnalysis {
  const impacted = new Set<string>();

  for (const file of targetFiles) {
    impacted.add(file);
    for (const related of queryRelatedFilesFromIndex(workspaceRoot, file)) {
      impacted.add(related);
    }
  }

  const impactedFiles = Array.from(impacted);
  const warnings: string[] = [];

  if (impactedFiles.length > targetFiles.length) {
    warnings.push(
      `Dependency graph indicates ${impactedFiles.length - targetFiles.length} additional connected file(s) may be affected.`
    );
  }

  if (impactedFiles.length >= 12) {
    warnings.push("Large dependency impact detected. Review connected files before apply.");
  }

  return { impactedFiles, warnings };
}

/*
DISCOVERY_PIPELINE:
Voice → Intent → Location → Vertical → Ranking → Render
*/