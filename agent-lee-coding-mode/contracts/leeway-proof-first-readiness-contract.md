# LeeWay Proof-First Readiness Contract

Object ID: `LEEWAY_APP::GOVERNANCE::PROOF_FIRST::READINESS_CONTRACT`
Classification: `GOVERNANCE_GATE`
Owner: LeeWay Standards

## Contract

Readiness is proof-based, not label-based. PASS, READY, COMPLETE, LIVE, OPERATIONAL, WORKING, and PROVEN are forbidden unless the required proof level is satisfied.

Every lane must declare:

- `claimedStatus`
- `correctedStatus`
- `requiredProofLevel`
- `actualProofLevel`
- `proofArtifacts`
- `rawEvidencePath`
- `lastProofReceipt`
- `blockers`
- `cannotClaimReadyReason`

`READY_PROVEN` is allowed only when `actualProofLevel >= requiredProofLevel` and the report/receipt points to raw evidence.

## Proof Levels

- `PROOF_LEVEL_0_DOCUMENT`
- `PROOF_LEVEL_1_STATIC_VALIDATION`
- `PROOF_LEVEL_2_COMMAND_VALIDATION`
- `PROOF_LEVEL_3_RUNTIME_ENDPOINT`
- `PROOF_LEVEL_4_FUNCTIONAL_RUNTIME`
- `PROOF_LEVEL_5_END_TO_END_PROOF`

## Enforcement

Scripts, gates, reports, receipts, Discovery Graph, live status, and assistant final responses must downgrade lanes when proof is missing.
