/*
LEEWAY_HEADER - DO NOT REMOVE

REGION: CORE
TAG: CORE.AGENT_LEE.CORE.LAW_ENGINE
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
*/

export function enforceLaw(action: string) {

  const blocked = ["force-push", "delete-branch", "overwrite-core"];

  if (blocked.includes(action)) {
    return { allowed: false, reason: "Violation of system law" };
  }

  return { allowed: true };
}

