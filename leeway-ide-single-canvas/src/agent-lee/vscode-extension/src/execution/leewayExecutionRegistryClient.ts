/*
LEEWAY_HEADER - DO NOT REMOVE
TAG: PASS6.LOADLEEWAYEXECUTIONENVIRONMENTS
REGION: GOVERNANCE
PURPOSE: Bridge Runtime registry client.
*/

import { readStandardsJson } from "../agents/leewayAgentBookClient";

export interface LeewayExecutionEnvironment {
  [key: string]: unknown;
}

export function loadLeewayExecutionEnvironments(workspaceRoot?: string): LeewayExecutionEnvironment[] {
  return readStandardsJson<{ executionEnvironments: LeewayExecutionEnvironment[] }>("registries/leeway-execution-registry.json", { executionEnvironments: [] }, workspaceRoot).executionEnvironments;
}
