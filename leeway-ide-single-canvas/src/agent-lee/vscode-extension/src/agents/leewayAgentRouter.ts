/*
LEEWAY_HEADER - DO NOT REMOVE
TAG: PASS6.AGENT.ROUTER
REGION: GOVERNANCE
PURPOSE: Routes only registered LeeWay agents.
*/

import { getLeewayAgent } from "./leewayAgentBookClient";

export function assertRegisteredLeewayAgent(agentId: string, workspaceRoot?: string) {
  const agent = getLeewayAgent(agentId, workspaceRoot);
  if (!agent) throw new Error(`Unregistered LeeWay agent blocked: ${agentId}`);
  if (!agent.allowedWorkflows.length) throw new Error(`LeeWay agent has no allowed workflows: ${agentId}`);
  return agent;
}
