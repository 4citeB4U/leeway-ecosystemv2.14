/*
LEEWAY_HEADER - DO NOT REMOVE

REGION: CORE
TAG: CORE.AGENT_LEE.CORE.DRIFT
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
*/

let errorCount = 0;

export function trackError() {
  errorCount++;

  if (errorCount > 5) {
    return {
      drift: true,
      action: "STOP_SYSTEM"
    };
  }

  return { drift: false };
}

