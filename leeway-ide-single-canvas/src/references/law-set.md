<!--
LEEWAY_HEADER - DO NOT REMOVE
REGION: CORE
TAG: CORE.REFERENCE.LAW_SET
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
PURPOSE: Reference document for the LeeWay governance law set, including human governance, traceability, runtime authority, agent law, owner education, security, and growth lanes.
-->

# LeeWay Law Set

This reference documents the core LeeWay governance law groups required by the Campbell & Co. model.

## Human Governance Laws
- Human owner remains final authority.
- Agents assist under law.
- Manual publish is required.
- Proposal-before-mutation is required.
- Owner understanding is required before approval.

## Traceability Laws
- Always assign IDs to screens, workflows, actions, telemetry, audit events, and runtime artifacts.
- Never allow anonymous runtime parts.
- Every actor, route, and event must be traceable.

## Runtime Authority Laws
- No fallback simulation.
- Classify runtime modes.
- Treat database as storage, not authority.
- For authority, use policy and visible configuration.

## Agent Laws
- Agents need lawful capabilities and skill contracts.
- Agents cannot publish directly or silently mutate.
- Agents must declare status, tools, telemetry, audit, and blocked capabilities.

## Paired AdminOS Control Plane Law
- Every LeeWay-created application with a public or operational surface must include a governed AdminOS control plane unless explicitly exempted.
- The AdminOS must provide real owner controls, not decoration.
- Public apps without paired AdminOS require a governed static-only exception.

## Owner Education Laws
- Provide printable manuals, onboarding, contextual help, troubleshooting, and escalation guidance.
- Surface help in UI, not only registries.
- Onboarding must map to real controls.

## Security Laws
- Enforce zero trust.
- Classify data.
- Apply least privilege.
- Prevent frontend secrets.
- Validate uploads.
- Enforce payment data boundaries.
- Keep tamper-evident audit.

## Governed Growth Laws
- Permit growth through governance lanes.
- Block ungoverned growth.
- Classify new capabilities as Green, Yellow, or Red.
- Require registry, policy, audit, and owner visibility.
