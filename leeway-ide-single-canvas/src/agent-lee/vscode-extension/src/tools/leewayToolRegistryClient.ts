/*
LEEWAY_HEADER - DO NOT REMOVE
TAG: PASS6.LOADLEEWAYTOOLS
REGION: GOVERNANCE
PURPOSE: Bridge Runtime registry client.
*/

import { readStandardsJson } from "../agents/leewayAgentBookClient";

export interface LeewayToolEntry {
  [key: string]: unknown;
}

export function loadLeewayTools(workspaceRoot?: string): LeewayToolEntry[] {
  return readStandardsJson<{ tools: LeewayToolEntry[] }>("registries/leeway-tool-registry.json", { tools: [] }, workspaceRoot).tools;
}
