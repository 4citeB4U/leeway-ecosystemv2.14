# LeeWay No Pass Without Proof Contract

Object ID: `LEEWAY_APP::GOVERNANCE::PROOF_FIRST::NO_PASS_WITHOUT_PROOF`
Classification: `GOVERNANCE_GATE`
Owner: LeeWay Standards

## Rule

No LeeWay component may claim `PASS`, `READY`, `COMPLETE`, `LIVE`, `OPERATIONAL`, `WORKING`, or `PROVEN` unless the required proof level is satisfied and raw evidence is preserved.

## Required Evidence

- Command run
- Exit code or bounded timeout result
- Raw stdout/stderr path when a command runs
- Raw endpoint response path when an endpoint is tested
- Artifact path when a capability produces output
- Report path
- Receipt path
- Pass/fail rule

## False Pass Result

If proof is missing, the claim must be downgraded to `PARTIAL`, `DOCUMENT_ONLY`, `STATIC_ONLY`, `RUNTIME_ENDPOINT_ONLY`, `FUNCTIONAL_PROOF_MISSING`, `END_TO_END_PROOF_MISSING`, `TIMED_OUT`, `SKIPPED`, `BLOCKED_*`, or `MISSING`.

