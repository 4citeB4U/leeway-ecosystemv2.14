/*
LEEWAY_HEADER - DO NOT REMOVE

REGION: CORE.APPLICATION_GENERATION
TAG: CORE.APPLICATION_GENERATION.BLUEPRINT_LOADER
PURPOSE: Loads and validates the LeeWay universal application blueprint.
*/

import * as fs from "fs";

export type LeeWayUniversalBlueprint = {
  blueprintId: string;
  blueprintObjectId: string;
  subjectObjectId: string;
  requiredArtifacts: string[];
  requiredRuntimeSurfaces: string[];
  requiredGovernanceGates: string[];
  noBypassPolicy: {
    allowUngovernedGeneration: boolean;
    allowMissingReceipts: boolean;
    allowMissingTraceFields: boolean;
    allowPASSWithoutEvidence: boolean;
  };
};

export function loadLeeWayUniversalBlueprint(filePath: string): LeeWayUniversalBlueprint {
  const raw = fs.readFileSync(filePath, "utf8");
  const parsed = JSON.parse(raw) as Partial<LeeWayUniversalBlueprint>;

  if (!parsed.blueprintObjectId || !Array.isArray(parsed.requiredArtifacts) || !Array.isArray(parsed.requiredRuntimeSurfaces)) {
    throw new Error("Universal application blueprint is missing required fields.");
  }

  return parsed as LeeWayUniversalBlueprint;
}
