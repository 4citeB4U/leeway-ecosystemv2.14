/*
LEEWAY_HEADER - DO NOT REMOVE

REGION: CORE
TAG: CORE.AGENT_LEE.SUPERVISOR.PLANNER
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
*/

export function createPlan(task: string) {
  return [
    { step: 1, action: "analyze requirement", status: "pending" },
    { step: 2, action: "locate relevant code", status: "pending" },
    { step: 3, action: "implement change", status: "pending" },
    { step: 4, action: "run verification", status: "pending" }
  ];
}

