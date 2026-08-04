<!--
FILE: EMPLOYMENT_ADMIN_CONSOLE_SPEC.md
PURPOSE: LeeWay governed asset for leeway-employment-center.
TAG: UTIL.FILE.E_MP_LO_YM_EN_T_A_DM_IN_C_ON_SO_LE_S_PE_C.MAIN
REGION: 🟠 UTIL
GOVERNED_BY: LeeWay Standards
OWNED_BY: Agent Lee / LeeWay Runtime
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
IMPORTS: Inferred by verification scanner
EXPORTS: Inferred by verification scanner
STATUS: ACTIVE
-->
# Employment Admin Console Spec

## Objective

Build the **Leeway Employment Admin Console** as an administrative control layer projected from:

`E:\Agent-Lee-The-Sum-of-All-Systems\agent-lee-motherboard\leeway-construct`

The console governs the lifecycle:

`Deploy -> Monitor -> Approve/Deny -> Suspend -> Revoke -> Audit -> Privacy Guard`

## Managed Systems

- `E:\leeway-employment-center`
- `E:\LeeWay-Edge-GPU`
- `E:\LeeWay-Edge-RTC`
- `E:\LeeWay-Edge-DEVICE`
- `E:\LeeWay-Edge-IOT`
- `E:\LeeWay-Standards`

## Core Administrative Abilities

1. View all digital employees.
2. Inspect employer binding and human/device ownership.
3. Review assigned role, job title, and department.
4. Inspect Agent VM manifest projected from construct.
5. Inspect the full contract, pricing, and policy boundaries.
6. Approve contract.
7. Deny contract.
8. Suspend employee.
9. Revoke employee.
10. Kill active session.
11. View task history.
12. View blocked actions.
13. View tool permissions.
14. View deployment link and QR status.
15. Verify privacy compliance and employer vault isolation.

## Required Panels

- Employee Registry
- Pending Contracts
- Active Deployments
- Session Monitor
- Privacy Guard
- Audit Receipts
- Tool Permissions
- Employer Data Vaults

## Billing Model

- Every governed digital employee is billed at `$1/hour`.
- Billing data is visible in:
  - Workforce registry
  - Contract inspector
  - Employee card / contract card
  - Admin action inspector
- Payment state supports:
  - `pending`
  - `authorized`
  - `paid`
  - `past_due`

## Governance Requirements

Every admin action must:

- route through `SUM.Orchestrator`
- pass Leeway governance
- create an audit receipt
- include:
  - `adminId`
  - `reason`
  - `timestamp`
  - `affected employeeId`
  - `affected employerId`

No direct subsystem access is permitted from the admin UI.

## Agent Lee Administrative Role

The console includes an **Agent Lee** administrative assistant surface that:

- explains contract state
- explains privacy posture
- recommends the next action
- supports revocation / suspension / approval workflows
- helps the admin reduce manual overhead

## Contract and Privacy Visibility

The selected employee inspector exposes:

- employer binding
- billing summary
- activation status
- contract duties
- contract boundaries
- Agent VM manifest
- blocked actions
- task history
- privacy posture

## Verification Targets

- admin can approve contract
- admin can deny contract
- admin can revoke employee
- revoked link fails
- suspended employee cannot execute task
- employer documents stay isolated
- global memory does not receive employer private content
- audit receipt generated for every admin action

## Final Rule

No digital employee is fully trusted until **Admin + Governance** certify it.

