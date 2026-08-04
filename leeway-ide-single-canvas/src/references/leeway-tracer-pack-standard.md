# LeeWay Tracer Pack Standard

A LeeWay Tracer Pack is the complete evidence chain for one action or attempted action.

It must answer:

- Who entered?
- What did they ask?
- Who received it?
- What intent was extracted?
- What authority did they have?
- What node or pipeline did it touch?
- What gate accepted or rejected it?
- What evidence proves that?
- What receipt records it?
- What was returned or blocked?

## Required Tracer Pack IDs

- `LEEWAY_TRACE::<DOMAIN>::<CASE>::<TIMESTAMP>::<HASH>`
- `LEEWAY_ACTOR::<CLASS>::<POSITION>::<INSTANCE>`
- `LEEWAY_PROMPT::<SOURCE>::<TYPE>::<HASH>`
- `LEEWAY_INTENT::<DOMAIN>::<PURPOSE>::<HASH>`
- `LEEWAY_TX::<DOMAIN>::<ACTION>::<TIMESTAMP>::<HASH>`
- `LEEWAY_AUTHORITY::<ROLE>::<PERMISSION>::<SCOPE>`
- `LEEWAY_GATE::<DOMAIN>::<GATE_NAME>`
- `LEEWAY_POLICY::<DOMAIN>::<LAW_NAME>`
- `LEEWAY_EVIDENCE::<DOMAIN>::<ARTIFACT>::<HASH>`
- `LEEWAY_RECEIPT::<DOMAIN>::<RESULT>::<TIMESTAMP>`

## Always

- Before acting, create or update the Tracer Pack.
- When rejecting, write the Tracer Pack.
- When quarantining, write the Tracer Pack.
- When converting external LLM output into LeeWay action, write the Tracer Pack.
- When reporting corruption, use the public-safe Tracer Pack report.

## Public-Safe Reporting

Public-safe reports may include trace ID, actor ID, prompt ID, transaction ID, violated policy, rejecting gate, classification, risk level, evidence hash, receipt path, and human review status.

Public-safe reports must exclude private user data, secrets, local filesystem details, private prompts unless approved, tokens, API keys, and sensitive business logic.
