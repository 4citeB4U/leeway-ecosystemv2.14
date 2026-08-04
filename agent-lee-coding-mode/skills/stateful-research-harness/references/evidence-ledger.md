# Evidence Ledger Reference

Use this file when the research task needs auditability, handoff, or source reconciliation.

## Minimal ledger

```markdown
| id | source | status | key evidence | supports | confidence | notes |
|---|---|---|---|---|---|---|
| E1 | [source/title] | curated | [specific fact] | [claim] | high | [date/version/owner] |
```

## Extended ledger

```markdown
| id | source | source type | date/version | status | key evidence | supports | contradicts | confidence | notes |
|---|---|---|---|---|---|---|---|---|---|
| E1 | ... | internal doc / repo / official doc / news / community | ... | candidate / curated / rejected / needs-check | ... | ... | ... | high / medium / low | ... |
```

## Status definitions

- candidate: potentially useful, not yet validated.
- curated: validated enough to support final synthesis.
- rejected: not useful, stale, contradicted, duplicate, or too weak.
- needs-check: promising but unsafe to rely on until verified.

## Claim-check template

```markdown
Claim check
- Claim: ...
- Claim type: current fact / historical fact / interpretation / recommendation / forecast
- Evidence used: E1, E2
- Counterevidence searched: ...
- Freshness requirement: low / medium / high
- Result: supported / unsupported / contradicted / ambiguous
- Confidence: high / medium / low
- Final wording: ...
```

## Confidence rubric

High confidence:
- Supported by primary or internal source-of-truth evidence.
- Current enough for the task.
- No meaningful contradiction found.

Medium confidence:
- Supported by credible evidence but not ideal primary evidence.
- Some freshness, scope, or interpretation caveat remains.

Low confidence:
- Evidence is indirect, stale, incomplete, or contradictory.
- Use only with clear caveats or as a lead for follow-up.

## Rejection reasons

Use short rejection notes:

- stale
- duplicate
- source not authoritative
- contradicted by stronger source
- irrelevant scope
- marketing claim only
- unverifiable
- inaccessible
- insufficient detail
