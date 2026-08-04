/*
LEEWAY HEADER - DO NOT REMOVE

REGION: AI
TAG: AI.EXECUTION_BRAIN.DIAGNOSTIC_REPAIR.LOOP
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
*/

import type { DiagnosticRepairCandidate, VerificationResult } from "./executionBrain.types";

const TS_ERROR_PATTERN = /([A-Za-z0-9_./\\:-]+\.(?:ts|tsx|js|jsx))\((\d+),(\d+)\):\s*error\s*(TS\d+)?:?\s*(.+)/gi;

export function collectRepairCandidates(results: VerificationResult[]): DiagnosticRepairCandidate[] {
  const candidates: DiagnosticRepairCandidate[] = [];

  for (const result of results) {
    let match: RegExpExecArray | null;
    while ((match = TS_ERROR_PATTERN.exec(result.output))) {
      candidates.push({
        id: `${Date.now()}-${candidates.length}`,
        filePath: match[1],
        source: "typescript",
        line: Number(match[2]),
        column: Number(match[3]),
        severity: "error",
        message: match[5],
        suggestedAction: "Review the failing symbol, import, or type mismatch and draft a minimal repair hunk."
      });
    }
  }

  return candidates;
}
