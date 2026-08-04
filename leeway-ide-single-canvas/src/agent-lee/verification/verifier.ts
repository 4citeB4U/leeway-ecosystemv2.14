/*
LEEWAY_HEADER - DO NOT REMOVE

REGION: CORE
TAG: CORE.AGENT_LEE.VERIFICATION.VERIFIER
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
*/

export function verify(result: any) {
  if (!result || !result.success) {
    return { pass: false, reason: "Execution failed" };
  }

  return { pass: true };
}

