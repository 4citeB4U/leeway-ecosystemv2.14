/*
LEEWAY_HEADER - DO NOT REMOVE

REGION: 🟢 CORE
TAG: CORE.SECURITY.ZERO_TRUST.RUNTIME
PURPOSE: Shared zero-trust enforcement helpers for plugin routing, memory provenance, and worker identity checks.
DISCOVERY_PIPELINE:
  Voice → Intent → Location → Vertical → Ranking → Render
*/

import type { AgentLeePlugin, PluginCallInput } from "../plugins/plugin.types";
import { inferRequiredPermission, isDestructiveAction } from "../plugins/plugin.guard";

export type VerificationState =
  | "verified"
  | "attested"
  | "asserted"
  | "unverified"
  | "quarantined";

export type ProvenanceSourceType =
  | "user"
  | "agent"
  | "plugin"
  | "runtime"
  | "bridge"
  | "external";

export interface ProvenanceEnvelope {
  sourceUnit: string;
  sourceType: ProvenanceSourceType;
  provenance: string;
  requestReceiptId: string;
  verificationState: VerificationState;
  trustScore: number;
  securityZone: string;
  capabilityProof: string[];
}

export interface PluginTrustAssessment extends ProvenanceEnvelope {
  allowed: boolean;
  requiresConfirmation: boolean;
  reason: string;
  requiredPermission: string;
}

function clampTrustScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function cleanText(value: unknown, fallback: string) {
  const text = String(value || "").trim();
  return text || fallback;
}

function normalizeCapabilityProof(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || "").trim())
      .filter(Boolean)
      .slice(0, 10);
  }

  if (typeof value === "string" && value.trim()) {
    return [value.trim()];
  }

  return [];
}

function inferSecurityZone(plugin: AgentLeePlugin) {
  if (plugin.riskLevel === "critical") return "Z2";
  if (plugin.riskLevel === "high") return "Z2";
  if (plugin.authMode === "mcp") return "Z2";
  return "Z1";
}

function baseTrustScore(plugin: AgentLeePlugin, input: PluginCallInput, userConfirmed: boolean) {
  let score = 70;

  if (plugin.riskLevel === "medium") score -= 5;
  if (plugin.riskLevel === "high") score -= 15;
  if (plugin.riskLevel === "critical") score -= 25;
  if (plugin.authMode === "mcp") score -= 10;
  if (isDestructiveAction(input.action)) score -= 15;
  if (userConfirmed) score += 10;
  if (normalizeCapabilityProof(input.capabilityProof).length) score += 10;
  if (String(input.requestReceiptId || "").trim()) score += 10;
  if (String(input.sourceUnit || "").trim()) score += 5;

  return clampTrustScore(score);
}

export function assessPluginTrust(
  plugin: AgentLeePlugin,
  input: PluginCallInput,
  userConfirmed: boolean
): PluginTrustAssessment {
  const sourceUnit = cleanText(input.sourceUnit, "unknown-source");
  const sourceType = (input.sourceType || "runtime") as ProvenanceSourceType;
  const requestReceiptId = cleanText(input.requestReceiptId, "");
  const capabilityProof = normalizeCapabilityProof(input.capabilityProof);
  const requiredPermission = inferRequiredPermission(input.action);
  const securityZone = cleanText(input.securityZone, inferSecurityZone(plugin));
  const trustScore = baseTrustScore(plugin, input, userConfirmed);
  const destructive = isDestructiveAction(input.action);
  const highRisk = plugin.riskLevel === "high" || plugin.riskLevel === "critical";

  if (highRisk && sourceUnit === "unknown-source") {
    return {
      allowed: false,
      requiresConfirmation: false,
      reason: `${plugin.name} requires a declared source unit before high-risk actions can run.`,
      sourceUnit,
      sourceType,
      provenance: "missing-source-unit",
      requestReceiptId,
      verificationState: "quarantined",
      trustScore,
      securityZone,
      capabilityProof,
      requiredPermission
    };
  }

  if (plugin.riskLevel === "critical" && !requestReceiptId && !userConfirmed) {
    return {
      allowed: false,
      requiresConfirmation: true,
      reason: `${plugin.name} requires explicit approval before critical actions can run without a prior receipt.`,
      sourceUnit,
      sourceType,
      provenance: "critical-action-awaiting-approval",
      requestReceiptId,
      verificationState: "asserted",
      trustScore,
      securityZone,
      capabilityProof,
      requiredPermission
    };
  }

  const verificationState: VerificationState =
    capabilityProof.length && requestReceiptId
      ? "verified"
      : userConfirmed
        ? "attested"
        : sourceUnit === "unknown-source"
          ? "unverified"
          : "asserted";

  if ((destructive || highRisk || plugin.requiresConfirmation) && !userConfirmed) {
    return {
      allowed: false,
      requiresConfirmation: true,
      reason: `${plugin.name} requires human confirmation before running action: ${input.action}`,
      sourceUnit,
      sourceType,
      provenance: "awaiting-human-confirmation",
      requestReceiptId,
      verificationState,
      trustScore,
      securityZone,
      capabilityProof,
      requiredPermission
    };
  }

  return {
    allowed: true,
    requiresConfirmation: false,
    reason: "Plugin call allowed under zero-trust policy.",
    sourceUnit,
    sourceType,
    provenance: requestReceiptId ? "receipt-backed-request" : "runtime-asserted-request",
    requestReceiptId,
    verificationState,
    trustScore,
    securityZone,
    capabilityProof,
    requiredPermission
  };
}

export function buildMemoryProvenance(
  sourceType: ProvenanceSourceType,
  payload: Record<string, unknown> = {},
  defaults: Partial<ProvenanceEnvelope> = {}
): ProvenanceEnvelope {
  const sourceUnit = cleanText(payload.sourceUnit ?? defaults.sourceUnit, sourceType === "agent" ? "unknown-agent" : "agent-lee.runtime");
  const provenance = cleanText(payload.provenance ?? defaults.provenance, `${sourceType}-ledger`);
  const requestReceiptId = cleanText(payload.requestReceiptId ?? defaults.requestReceiptId, "");
  const capabilityProof = normalizeCapabilityProof(payload.capabilityProof ?? defaults.capabilityProof);
  const securityZone = cleanText(payload.securityZone ?? defaults.securityZone, sourceType === "external" || sourceType === "bridge" ? "Z2" : "Z1");

  let verificationState = cleanText(
    payload.verificationState ?? defaults.verificationState,
    sourceUnit.startsWith("unknown") ? "unverified" : "asserted"
  ) as VerificationState;

  if (!["verified", "attested", "asserted", "unverified", "quarantined"].includes(verificationState)) {
    verificationState = "unverified";
  }

  let trustScore = Number(payload.trustScore ?? defaults.trustScore ?? 60);
  if (!Number.isFinite(trustScore)) {
    trustScore = 60;
  }

  if (sourceUnit.startsWith("unknown")) trustScore -= 20;
  if (verificationState === "verified") trustScore += 15;
  if (verificationState === "attested") trustScore += 5;
  if (verificationState === "quarantined") trustScore = Math.min(trustScore, 20);
  if (capabilityProof.length) trustScore += 5;
  if (requestReceiptId) trustScore += 5;

  return {
    sourceUnit,
    sourceType,
    provenance,
    requestReceiptId,
    verificationState,
    trustScore: clampTrustScore(trustScore),
    securityZone,
    capabilityProof
  };
}

export function assessWorkerIdentity(rawEvent: Record<string, unknown>) {
  const agentId = cleanText(rawEvent.agentId ?? rawEvent.id, "unknown-agent");
  const declaredSourceUnit = cleanText(rawEvent.sourceUnit, agentId);
  const route = cleanText(rawEvent.route, "unknown-route");
  const bridgeEvent = cleanText(rawEvent.bridgeEvent, "");
  const capabilityProof = normalizeCapabilityProof(rawEvent.capabilityProof);
  const requestReceiptId = cleanText(rawEvent.requestReceiptId, "");
  const routeLooksTrusted = route.includes("Agent Lee");
  const sourceMatchesAgent = declaredSourceUnit.includes(agentId) || agentId.includes(declaredSourceUnit);

  const verificationState: VerificationState =
    routeLooksTrusted && sourceMatchesAgent && requestReceiptId
      ? "verified"
      : routeLooksTrusted && sourceMatchesAgent
        ? "attested"
        : declaredSourceUnit === "unknown-agent"
          ? "quarantined"
          : "unverified";

  const trustScore = clampTrustScore(
    55 +
    (routeLooksTrusted ? 10 : -10) +
    (sourceMatchesAgent ? 10 : -15) +
    (requestReceiptId ? 10 : 0) +
    (capabilityProof.length ? 5 : 0) +
    (bridgeEvent ? 5 : 0)
  );

  return {
    agentId,
    sourceUnit: declaredSourceUnit,
    sourceType: "agent" as ProvenanceSourceType,
    provenance: routeLooksTrusted ? "worker-diagnostic-bridge" : "worker-diagnostic-untrusted-route",
    requestReceiptId,
    verificationState,
    trustScore,
    securityZone: "Z1",
    capabilityProof,
    routeLooksTrusted,
    sourceMatchesAgent
  };
}
