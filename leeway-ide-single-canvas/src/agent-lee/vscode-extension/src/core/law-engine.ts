/*
LEEWAY_HEADER - DO NOT REMOVE

TAG: CORE.GOVERNANCE.LAW.ENGINE
REGION: 🟢 CORE
DISCOVERY_PIPELINE:
  Voice → Intent → Location → Vertical → Ranking → Render
*/

export type RuntimeStage =
  | "intake"
  | "routing"
  | "execution"
  | "verification"
  | "synthesis"
  | "voice";

export function enforceLaw(action: string) {
  const blocked = ["force-push", "delete-branch", "overwrite-core", "direct-main-push", "unsafe-terminal", "bulk-delete"];
  if (blocked.includes(action)) return { allowed: false, reason: "BLOCKED BY AGENT LEE LAW ENGINE" };
  return { allowed: true, reason: "Allowed" };
}

export function enforceStageLaw(stage: RuntimeStage, details?: { speaker?: string; directUserFacing?: boolean }) {
  if ((stage === "synthesis" || stage === "voice") && details?.speaker && details.speaker !== "Agent Lee") {
    return { allowed: false, reason: "ONLY AGENT LEE MAY SPEAK TO THE USER" };
  }

  if (details?.directUserFacing && details?.speaker && details.speaker !== "Agent Lee") {
    return { allowed: false, reason: "INTERNAL WORKERS MAY NOT SPEAK DIRECTLY" };
  }

  return { allowed: true, reason: "Allowed" };
}
