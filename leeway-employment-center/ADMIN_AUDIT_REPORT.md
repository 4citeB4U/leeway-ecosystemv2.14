<!--
FILE: ADMIN_AUDIT_REPORT.md
PURPOSE: LeeWay governed asset for leeway-employment-center.
TAG: UTIL.FILE.A_DM_IN_A_UD_IT_R_EP_OR_T.MAIN
REGION: 🟠 UTIL
GOVERNED_BY: LeeWay Standards
OWNED_BY: Agent Lee / LeeWay Runtime
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
IMPORTS: Inferred by verification scanner
EXPORTS: Inferred by verification scanner
STATUS: ACTIVE
-->
# Admin Audit Report

## Scope

This report describes the implemented audit behavior for the Leeway Employment Admin Console inside the employment center application.

## Receipt Schema

Each receipt records:

- `id`
- `action`
- `adminId`
- `reason`
- `timestamp`
- `affectedEmployeeId`
- `affectedEmployerId`
- `orchestratorRoute`
- `governanceStatus`
- `subsystem`
- `privacyResult`
- `receiptHash`

## Audited Actions

- Approve Contract
- Deny Contract
- Suspend Employee
- Revoke Employee
- Kill Session
- Rotate Activation Link
- Lock Device Binding
- Verify Privacy Compliance

## Orchestration Route

`SUM.Orchestrator -> Leeway Governance -> Leeway Construct`

## Current Verification Expectations

- Contract approval writes a receipt.
- Contract denial writes a receipt.
- Suspension writes a receipt.
- Revocation writes a receipt.
- Session kill writes a receipt.
- Privacy verification writes a receipt.

## Administrative Evidence Surface

The Audit Receipts panel exposes:

- receipt ID
- action name
- employee and employer binding
- timestamp
- admin ID
- reason
- privacy result
- route
- receipt hash

## Operational Note

Audit receipts are generated for admin actions only. Builder intake creates staged workforce records that then require admin/governance action before trust is granted.

