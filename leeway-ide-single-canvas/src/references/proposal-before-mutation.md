<!--
LEEWAY_HEADER - DO NOT REMOVE
REGION: CORE
TAG: CORE.REFERENCE.PROPOSAL_BEFORE_MUTATION
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
PURPOSE: Reference for LeeWay proposal-before-mutation rules and workflows.
-->

# LeeWay Proposal Before Mutation

Any agent-driven change must follow the proposal-before-mutation model.

## Required workflow
- Create a proposal object before any write action.
- Show before and after values.
- Include target surface, file, or region metadata.
- Declare affected LeeWay IDs.
- Attach law references and lane classification.
- Require `requiresHumanApproval: true`.
- Set `publishDirectly: false` for draft or public state changes.
- Provide owner approval and rejection actions.
- Record telemetry and audit events for each proposal step.

## Proposal contents
- proposal ID
- owner or role target
- affected files or runtime surfaces
- before values
- after values
- law references
- approval state
- audit trace
- tool/MCP usage record

## Enforcement
- no direct Run button for agent write tasks
- no silent mutation from preview or selected-area flows
- no direct public publish from agent-generated proposals
