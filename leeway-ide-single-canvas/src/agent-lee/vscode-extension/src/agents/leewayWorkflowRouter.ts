/*
LEEWAY_HEADER - DO NOT REMOVE
TAG: PASS6.WORKFLOW.ROUTER
REGION: GOVERNANCE
PURPOSE: Routes workflows through owner agents, model routes, tool routes, telemetry, trace path, and receipt policy.
*/

import { readStandardsJson } from "./leewayAgentBookClient";

export interface LeewayWorkflowEntry {
  workflowId: string;
  ownerAgentId: string;
  allowedAgents: string[];
  allowedModelRoutes: string[];
  allowedTools: string[];
  allowedSkills: string[];
  tracePath: string;
  receiptRequired: boolean;
}

export function loadLeewayWorkflows(workspaceRoot?: string): LeewayWorkflowEntry[] {
  return readStandardsJson<{ workflows: LeewayWorkflowEntry[] }>("registries/leeway-workflow-registry.json", { workflows: [] }, workspaceRoot).workflows;
}

export function assertWorkflowRoute(workflowId: string, agentId: string, workspaceRoot?: string) {
  const workflow = loadLeewayWorkflows(workspaceRoot).find((entry) => entry.workflowId === workflowId);
  if (!workflow) throw new Error(`Unregistered LeeWay workflow blocked: ${workflowId}`);
  if (!workflow.allowedAgents.includes(agentId)) throw new Error(`Agent ${agentId} cannot run workflow ${workflowId}`);
  if (!workflow.receiptRequired) throw new Error(`Workflow lacks receipt requirement: ${workflowId}`);
  return workflow;
}
