<!--
LEEWAY_HEADER - DO NOT REMOVE
REGION: CORE
TAG: CORE.REFERENCE.SECURITY_HARDENING
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
PURPOSE: Reference for LeeWay security hardening and privacy protections.
-->

# LeeWay Security Hardening

## Required protections
- classify every data field and sensitive input
- enforce deny-by-default database rules
- apply role-based least privilege policies
- block frontend secrets in code and config
- validate uploads and asset inputs
- enforce payment data boundaries
- require auditable incident lockdown state
- isolate deception/trap systems and keep them telemetry-only

## Runtime requirements
- no agent may claim tool or MCP access without actual connection state
- no fake bridge connectivity claims
- security center surfaces should report permission state, audits, and health
- audit exports must be tamper-evident and owner-readable
