/*
LEEWAY_HEADER - DO NOT REMOVE
TAG: PASS6.BRIDGE.RUNTIME.REGISTRY.CLIENT
REGION: GOVERNANCE
PURPOSE: Reads Pass 6 Standards registries through Bridge Runtime authority.
*/

import * as fs from "fs";
import * as path from "path";

export function resolveWorkspaceRoot(startDir = __dirname): string {
  let current = startDir;
  for (let i = 0; i < 12; i += 1) {
    if (fs.existsSync(path.join(current, "LeeWay-Standards"))) return current;
    const next = path.dirname(current);
    if (next === current) break;
    current = next;
  }
  return path.resolve(__dirname, "..", "..", "..", "..", "..");
}

export function readStandardsJson<T>(relativePath: string, fallback: T, workspaceRoot = resolveWorkspaceRoot()): T {
  const target = path.join(workspaceRoot, "LeeWay-Standards", relativePath);
  try {
    return JSON.parse(fs.readFileSync(target, "utf8")) as T;
  } catch {
    return fallback;
  }
}


export interface LeewayAgentBookEntry {
  systemLeewayId: string;
  immutableRoleId: string;
  displayName: string;
  agentFamily: string;
  bodyRoot: string;
  allowedWorkflows: string[];
  allowedModelRoutes: string[];
  allowedTools: string[];
  skillIds: string[];
  allowedExecutionEnvironments: string[];
  telemetryStreamIds: string[];
  identityPulseStatus: string;
}

export interface LeewayAgentBook {
  version: string;
  agents: LeewayAgentBookEntry[];
}

export function loadLeewayAgentBook(workspaceRoot?: string): LeewayAgentBook {
  return readStandardsJson<LeewayAgentBook>("registries/leeway-agent-book.json", { version: "0.0.0", agents: [] }, workspaceRoot);
}

export function getLeewayAgent(agentId: string, workspaceRoot?: string): LeewayAgentBookEntry | undefined {
  return loadLeewayAgentBook(workspaceRoot).agents.find((agent) => agent.systemLeewayId === agentId);
}
