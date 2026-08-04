/*
LEEWAY_HEADER - DO NOT REMOVE
TAG: REVIEW.AUTHORITY.TYPES
REGION: GOVERNANCE
PURPOSE: Defines governed code review receipts and routing contracts.
*/

export type LeewaySeverityRanking = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type LeewayConfidenceRanking = "LOW" | "MEDIUM" | "HIGH";
export type LeewayApprovalStatus =
  | "ACCEPTED_BY_STANDARDS"
  | "BLOCKED_BY_STANDARDS"
  | "NEEDS_HUMAN_REVIEW"
  | "NEEDS_TEST_PROOF"
  | "NEEDS_SECURITY_REVIEW"
  | "NEEDS_RUNTIME_PROOF"
  | "NEEDS_ADMINOS_ALIGNMENT"
  | "NEEDS_SIGNATURE_BRAND_ALIGNMENT";

export interface LeewayFixItem {
  title: string;
  rationale: string;
  filePaths: string[];
}

export interface LeewayCodeReviewRequest {
  targetRoot: string;
  intentSummary: string;
  changeSummary: string;
  filesReviewed: string[];
  surroundingCodeInspected?: string[];
  reviewedByAgentIds?: string[];
  standardsAccepted?: boolean;
}

export interface LeewayReviewContext {
  workspaceRoot: string;
  targetRoot: string;
  intentSummary: string;
  changeSummary: string;
  filesReviewed: string[];
  surroundingCodeInspected: string[];
  architectureImpact: string[];
  standardsImpact: string[];
  agentBookImpact: string[];
  modelHiveImpact: string[];
  edgeImpact: string[];
  adminOsImpact: string[];
  securityRisks: string[];
  testCoverage: string[];
  runtimeRisks: string[];
  deploymentRisks: string[];
}

export interface LeewayRiskAssessment {
  severityRanking: LeewaySeverityRanking;
  confidenceRanking: LeewayConfidenceRanking;
  approvalStatus: LeewayApprovalStatus;
  requiredFixes: LeewayFixItem[];
  recommendedFixes: LeewayFixItem[];
}

export interface LeewayCodeReviewReceipt extends LeewayReviewContext, LeewayRiskAssessment {
  reviewId: string;
  reviewedByAgentIds: string[];
  receiptPath: string;
  standardsAcceptanceRequired: boolean;
}