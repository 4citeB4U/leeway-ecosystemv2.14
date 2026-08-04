/*
LEEWAY_HEADER - DO NOT REMOVE
TAG: REVIEW.RISK.RANKER
REGION: GOVERNANCE
PURPOSE: Assigns truthful review severity and approval blocking status.
*/

import type { LeewayApprovalStatus, LeewayFixItem, LeewayRiskAssessment, LeewayReviewContext } from "./review.types";

function buildFix(title: string, rationale: string, filePaths: string[]): LeewayFixItem {
  return { title, rationale, filePaths };
}

export function rankLeewayReviewRisk(context: LeewayReviewContext): LeewayRiskAssessment {
  let severityRanking: LeewayRiskAssessment["severityRanking"] = "LOW";
  let confidenceRanking: LeewayRiskAssessment["confidenceRanking"] = "HIGH";
  let approvalStatus: LeewayApprovalStatus = "BLOCKED_BY_STANDARDS";
  const requiredFixes: LeewayFixItem[] = [];
  const recommendedFixes: LeewayFixItem[] = [];

  const allFiles = context.filesReviewed.join(" ");
  const touchesStandards = context.filesReviewed.some((filePath) => filePath.startsWith("LeeWay-Standards/"));
  const touchesRuntime = context.filesReviewed.some((filePath) => filePath.includes("bridge-runtime") || filePath.includes("runtime"));
  const touchesVoice = context.filesReviewed.some((filePath) => /voice|rtc/i.test(filePath));
  const touchesEdge = context.filesReviewed.some((filePath) => /^LeeWay-Edge-(RTC|GPU|DEVICE|IOT)\//.test(filePath));
  const touchesAdmin = context.filesReviewed.some((filePath) => /admin|reports\//i.test(filePath));
  const missingTests = context.testCoverage.some((entry) => entry.startsWith("No dedicated test file"));

  if (touchesStandards || touchesRuntime || touchesVoice) {
    severityRanking = "CRITICAL";
    approvalStatus = "NEEDS_HUMAN_REVIEW";
    requiredFixes.push(buildFix("Standards acceptance required", "Only LeeWay Standards may accept code that touches Standards, runtime, or voice authority surfaces.", context.filesReviewed));
  }

  if (touchesRuntime) {
    approvalStatus = "NEEDS_RUNTIME_PROOF";
    requiredFixes.push(buildFix("Runtime proof required", "Runtime mutations require PASS 6.5 drift ledger receipt and Bridge Runtime authority evidence.", context.filesReviewed));
  }

  if (touchesVoice) {
    severityRanking = "CRITICAL";
    approvalStatus = "NEEDS_RUNTIME_PROOF";
    requiredFixes.push(buildFix("Voice authority proof required", "Voice changes require PASS 5 and PASS 5B voice authority proof before Standards acceptance.", context.filesReviewed));
  }

  if (touchesEdge && severityRanking !== "CRITICAL") {
    severityRanking = "HIGH";
    approvalStatus = "NEEDS_RUNTIME_PROOF";
    requiredFixes.push(buildFix("Edge gate evidence required", "Edge dependency changes must satisfy the Edge Power Grid gate.", context.filesReviewed));
  }

  if (touchesAdmin) {
    severityRanking = severityRanking === "LOW" ? "HIGH" : severityRanking;
    approvalStatus = "NEEDS_ADMINOS_ALIGNMENT";
    requiredFixes.push(buildFix("AdminOS alignment required", "Admin changes require AdminOS and Application Admin gate alignment.", context.filesReviewed));
  }

  if (allFiles.match(/signature|brand|compliance/i)) {
    severityRanking = severityRanking === "LOW" ? "HIGH" : severityRanking;
    approvalStatus = "NEEDS_SIGNATURE_BRAND_ALIGNMENT";
    requiredFixes.push(buildFix("Signature and brand review required", "Signature and brand mutations require Signature Brand gate alignment.", context.filesReviewed));
  }

  if (context.securityRisks.some((entry) => entry.includes("Security review required"))) {
    severityRanking = severityRanking === "LOW" ? "HIGH" : severityRanking;
    if (approvalStatus === "BLOCKED_BY_STANDARDS") {
      approvalStatus = "NEEDS_SECURITY_REVIEW";
    }
    requiredFixes.push(buildFix("Security review required", "Threat model and execution authority review must complete before acceptance.", context.filesReviewed));
  }

  if (missingTests) {
    if (approvalStatus === "BLOCKED_BY_STANDARDS") {
      approvalStatus = "NEEDS_TEST_PROOF";
    }
    severityRanking = severityRanking === "LOW" ? "MEDIUM" : severityRanking;
    recommendedFixes.push(buildFix("Add targeted proof", "Add or update tests and runtime proof for the touched behavior slice.", context.filesReviewed));
  }

  if (requiredFixes.length > 3) {
    confidenceRanking = "MEDIUM";
  }

  if (severityRanking === "LOW" && requiredFixes.length === 0) {
    recommendedFixes.push(buildFix("Standards decision pending", "Even low-risk changes remain blocked until LeeWay Standards records acceptance.", context.filesReviewed));
  }

  return {
    severityRanking,
    confidenceRanking,
    approvalStatus,
    requiredFixes,
    recommendedFixes
  };
}