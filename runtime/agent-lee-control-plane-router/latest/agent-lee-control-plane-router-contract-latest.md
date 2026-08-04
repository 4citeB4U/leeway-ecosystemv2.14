# Agent Lee Control Plane Router Contract

Version: LEEWAY_AGENT_LEE_CONTROL_PLANE_ROUTER_CONTRACT_2026-07-05

Contract ID: agent-lee-control-plane-router-contract-20260705-191446

## Current Posture

- Master Device Operator: leeway_device_operator on port 5323
- Windows satellite: windows-agent-lee
- Dry-run actuator: http://127.0.0.1:7331
- Real-alpha actuator: http://127.0.0.1:7332
- Real-alpha mode: APPROVAL_ONLY_LOCKED_AFTER_SCREEN_STATUS_PROOF
- Real execution enabled: False
- Physical execution enabled: False
- Read-only status enabled: False
- Real-alpha locked: True

## Routing Rules

| Intent Class | Route | Approval Required | Physical Action Possible |
|---|---|---:|---:|
| status_or_dashboard | device_operator_and_dashboard_artifacts | False | False |
| catalog_lookup | read_only_action_catalog | False | False |
| dry_run_action_preview | dry_run_actuator | False | False |
| real_physical_action_request | approval_gate_pending_request | True | True |
| external_communication | communication_shell_approval_preview | True | False |
| dangerous_or_blocked | blocked | True | False |

## Direct Real-Alpha Execution

- Direct real-alpha execution is blocked by default.
- Real actions must route through approval-gate pending request or dry-run preview.
- Lockback is required after every approved proof.

## Artifacts

- Action catalog JSON: E:\.LeeWay-Produucts-File\Leeway-Ecosystem v2.1.4\runtime\device-layer-action-catalog\latest\control-plane-action-catalog-latest.json
- Dashboard JSON: E:\.LeeWay-Produucts-File\Leeway-Ecosystem v2.1.4\runtime\device-layer-dashboard\latest\device-layer-dashboard-latest.json
- Router contract JSON: E:\.LeeWay-Produucts-File\Leeway-Ecosystem v2.1.4\runtime\agent-lee-control-plane-router\contracts\agent-lee-control-plane-router-contract-20260705-191446.json

