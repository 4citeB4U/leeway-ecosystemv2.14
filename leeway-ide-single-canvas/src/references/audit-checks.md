<!--
LEEWAY_HEADER - DO NOT REMOVE
REGION: CORE
TAG: CORE.REFERENCE.AUDIT_CHECKS
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
PURPOSE: Reference for LeeWay audit engine checks, enforcement rules, and regression guards.
-->

# LeeWay Audit Checks

The LeeWay audit engine must include checks for the following conditions.

## Governance and metadata checks
- missing LeeWay header
- missing screen ID
- missing workflow ID
- missing action ID
- button without help entry when owner-facing
- input without schema path
- image without asset ID or alt path
- public/admin component missing `data-leeway-id`
- agent action without action identity
- proposal missing before/after values
- proposal missing `publishDirectly: false`
- proposal missing `requiresHumanApproval: true`
- telemetry missing stream ID
- audit event missing law references
- MCP claiming connected without connection state
- secret-like string in frontend code
- data field without classification
- owner-facing feature without manual/help/onboarding
- runtime claim without runtime validation
- report claiming PASS without evidence
- fallback simulation or fake runtime claim
- fake AI/autonomy language in descriptions
- direct draft mutation from preview AI
- direct publish from agent without owner approval
- dangling manual links
- onboarding targets missing from UI
- contextual help registry entries not surfaced
- selected region without binding
- skill without runtime function

## Enforcement notes
- Audit checks should be grounded in runtime evidence when possible.
- A reported PASS must include a proof path.
- A PARTIAL result must clearly state the missing artifact or verification gap.
- A FAIL result must include the exact missing fields and broken link.
