/*
LEEWAY HEADER — DO NOT REMOVE

REGION: 🟢 CORE
TAG: CORE.PLUGIN.GUARD.MAIN

5WH:
WHAT = Agent Lee plugin permission and safety gate
WHY = Prevents unsafe plugin actions without confirmation
WHO = Agent Lee Plugin Runtime
WHERE = src/plugins/plugin.guard.ts
WHEN = 2026
HOW = Risk scoring, permission checks, and confirmation enforcement

AGENTS:
SHIELD
AUDIT
PRIME

LICENSE:
MIT
*/

import type { AgentLeePlugin, PluginCallInput, PluginPermission } from "./plugin.types";
import { assessPluginTrust } from "../core/zero-trust";

export interface PluginGuardResult {
  allowed: boolean;
  requiresConfirmation: boolean;
  reason: string;
  missingPermissions?: PluginPermission[];
}

const DESTRUCTIVE_ACTIONS = [
  "delete",
  "remove",
  "destroy",
  "drop",
  "purge",
  "cancel",
  "disable",
  "deactivate",
  "refund",
  "charge",
  "send",
  "deploy",
  "publish"
];

export function inferRequiredPermission(action: string): PluginPermission {
  const normalized = action.toLowerCase();
  if (normalized.includes("send")) return "send";
  if (normalized.includes("deploy") || normalized.includes("publish")) return "deploy";
  if (normalized.includes("delete") || normalized.includes("remove") || normalized.includes("drop")) return "delete";
  if (normalized.includes("charge") || normalized.includes("refund") || normalized.includes("payment")) return "billing";
  if (normalized.includes("admin")) return "admin";
  if (normalized.includes("create") || normalized.includes("update") || normalized.includes("write") || normalized.includes("draft")) return "write";
  return "read";
}

export function isDestructiveAction(action: string): boolean {
  const normalized = action.toLowerCase();
  return DESTRUCTIVE_ACTIONS.some((word) => normalized.includes(word));
}

export function guardPluginCall(
  plugin: AgentLeePlugin,
  input: PluginCallInput,
  userConfirmed = false
): PluginGuardResult {
  if (!plugin.enabled) {
    return {
      allowed: false,
      requiresConfirmation: false,
      reason: `${plugin.name} is not enabled in Agent Lee's plugin mesh.`
    };
  }

  const requiredPermission = inferRequiredPermission(input.action);
  if (!plugin.permissions.includes(requiredPermission)) {
    return {
      allowed: false,
      requiresConfirmation: false,
      reason: `${plugin.name} does not allow ${requiredPermission} permission.`,
      missingPermissions: [requiredPermission]
    };
  }

  const trust = assessPluginTrust(plugin, input, userConfirmed);
  if (!trust.allowed) {
    return {
      allowed: false,
      requiresConfirmation: trust.requiresConfirmation,
      reason: trust.reason
    };
  }

  const destructive = isDestructiveAction(input.action);
  if ((plugin.requiresConfirmation || destructive || plugin.riskLevel === "critical") && !userConfirmed) {
    return {
      allowed: false,
      requiresConfirmation: true,
      reason: `${plugin.name} requires confirmation before running action: ${input.action}`
    };
  }

  return {
    allowed: true,
    requiresConfirmation: false,
    reason: "Plugin call allowed."
  };
}

/*
DISCOVERY_PIPELINE:
Voice → Intent → Location → Vertical → Ranking → Render
*/
