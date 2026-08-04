/*
LEEWAY_HEADER - DO NOT REMOVE

REGION: CORE
TAG: CORE.AGENT_LEE.WORKERS.EXECUTOR
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
*/

export async function executeStep(step: any, context: any) {
  return {
    success: true,
    output: `Executed step: ${step.action}`
  };
}

