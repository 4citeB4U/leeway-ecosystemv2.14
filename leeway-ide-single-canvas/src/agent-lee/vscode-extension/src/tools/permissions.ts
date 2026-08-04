/*
LEEWAY_HEADER - DO NOT REMOVE

REGION: 🟢 CORE
TAG: CORE.SECURITY.PERMISSIONS.MAIN

5WH:
WHAT = Defines the lightweight approval mode and risky action gate helpers.
WHY = Keeps unsafe actions behind explicit LeeWay approval checks.
WHO = Agent Lee / LeeWay Runtime.
WHERE = agent-lee/vscode-extension/src/tools/permissions.ts
WHEN = 2026
HOW = Static permission mode plus action classification for approval decisions.
*/

export type PermissionMode = "ASK" | "ASSISTED" | "AUTONOMOUS";

export function getPermissionMode(): PermissionMode {
  return "ASK";
}

export function requiresApproval(action: string) {
  const risky = ["write", "delete", "terminal", "autofix", "mutation"];
  return risky.includes(action);
}

/*
DISCOVERY_PIPELINE:
Voice → Intent → Location → Vertical → Ranking → Render
*/
