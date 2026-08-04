/*
LEEWAY HEADER - DO NOT REMOVE

REGION: AI
TAG: AI.EXECUTION.REPAIR.NARRATION
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
*/

import type { VerificationRepairCandidate } from "./verificationRepairToEditBuffer.adapter";

export function summarizeRepairCandidatesForSpeech(
  candidates: VerificationRepairCandidate[]
): string {
  if (candidates.length === 0) {
    return "Verification found issues, but I do not have a safe repair candidate yet.";
  }

  const lowRisk = candidates.filter((candidate) => candidate.risk === "low").length;
  const reviewRequired = candidates.filter((candidate) => candidate.reviewRequired).length;
  const first = candidates[0];

  return [
    `Verification found ${candidates.length} repair candidate${candidates.length === 1 ? "" : "s"}.`,
    lowRisk > 0 ? `${lowRisk} look low risk.` : "",
    reviewRequired > 0 ? `${reviewRequired} need review before we move.` : "",
    first.spokenSummary ? `First repair: ${first.spokenSummary}` : "",
    "I can create a pending repair package so you can review the diff before anything is applied."
  ].filter(Boolean).join(" ");
}
