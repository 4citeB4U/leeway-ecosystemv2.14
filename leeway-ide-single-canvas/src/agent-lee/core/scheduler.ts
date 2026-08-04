/*
LEEWAY_HEADER - DO NOT REMOVE

REGION: CORE
TAG: CORE.AGENT_LEE.CORE.SCHEDULER
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
*/

let activeAgents = 0;
const MAX_AGENTS = 3;

export function requestExecution() {
  if (activeAgents >= MAX_AGENTS) {
    return false;
  }
  activeAgents++;
  return true;
}

export function releaseExecution() {
  if (activeAgents > 0) activeAgents--;
}

