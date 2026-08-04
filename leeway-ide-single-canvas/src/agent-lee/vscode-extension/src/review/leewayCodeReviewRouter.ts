/*
LEEWAY_HEADER - DO NOT REMOVE
TAG: REVIEW.ROUTER
REGION: GOVERNANCE
PURPOSE: Routes governed code review while keeping Standards as the only acceptance authority.
*/

import { readStandardsJson, resolveWorkspaceRoot } from "../agents/leewayAgentBookClient";
import { assertRegisteredLeewayAgent } from "../agents/leewayAgentRouter";
import { assertBridgeModelRoute } from "../models/bridgeModelAuthorityRouter";
import { buildLeewayReviewContext } from "./leewayReviewContextBuilder";
import { rankLeewayReviewRisk } from "./leewayRiskRanker";
import { writeLeewayReviewReceipt } from "./leewayReviewReceiptWriter";
import type { LeewayApprovalStatus, LeewayCodeReviewReceipt, LeewayCodeReviewRequest } from "./review.types";

interface ReviewAgentRegistryEntry {
  agentId: string;
  allowedModelRoutes: string[];
}

function loadReviewAgentRegistry(workspaceRoot?: string): ReviewAgentRegistryEntry[] {
  return readStandardsJson<{ reviewAgents: ReviewAgentRegistryEntry[] }>(
    "registries/leeway-review-agent-registry.json",
    { reviewAgents: [] },
    workspaceRoot
  ).reviewAgents;
}

function generateReviewId(): string {
  return `LEEWAY_REVIEW_${Date.now().toString(36).toUpperCase()}`;
}

export function routeLeewayCodeReview(request: LeewayCodeReviewRequest, workspaceRoot = resolveWorkspaceRoot()): LeewayCodeReviewReceipt {
  const reviewAgents = request.reviewedByAgentIds?.length ? request.reviewedByAgentIds : loadReviewAgentRegistry(workspaceRoot).map((agent) => agent.agentId);

  reviewAgents.forEach((agentId) => {
    assertRegisteredLeewayAgent(agentId, workspaceRoot);
  });

  const registry = loadReviewAgentRegistry(workspaceRoot);
  const modelRoutes = new Set<string>();
  registry
    .filter((entry) => reviewAgents.includes(entry.agentId))
    .forEach((entry) => entry.allowedModelRoutes.forEach((routeId) => modelRoutes.add(routeId)));
  modelRoutes.forEach((routeId) => assertBridgeModelRoute(routeId, workspaceRoot));

  const context = buildLeewayReviewContext(request, workspaceRoot);
  const assessment = rankLeewayReviewRisk(context);
  const approvalStatus: LeewayApprovalStatus = request.standardsAccepted === true && assessment.requiredFixes.length === 0
    ? "ACCEPTED_BY_STANDARDS"
    : assessment.approvalStatus;

  return writeLeewayReviewReceipt(
    {
      reviewId: generateReviewId(),
      ...context,
      ...assessment,
      approvalStatus,
      reviewedByAgentIds: reviewAgents,
      receiptPath: "",
      standardsAcceptanceRequired: true
    },
    workspaceRoot
  );
}