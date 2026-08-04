/*
LEEWAY_HEADER - DO NOT REMOVE
TAG: PASS6.LOADLEEWAYSKILLS
REGION: GOVERNANCE
PURPOSE: Bridge Runtime registry client.
*/

import { readStandardsJson } from "../agents/leewayAgentBookClient";

export interface LeewaySkillEntry {
  [key: string]: unknown;
}

export function loadLeewaySkills(workspaceRoot?: string): LeewaySkillEntry[] {
  return readStandardsJson<{ skills: LeewaySkillEntry[] }>("registries/leeway-skill-registry.json", { skills: [] }, workspaceRoot).skills;
}
