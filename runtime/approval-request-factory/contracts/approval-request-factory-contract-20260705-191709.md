# Approval Request Factory Contract

Version: LEEWAY_APPROVAL_REQUEST_FACTORY_CONTRACT_2026-07-05

Contract ID: approval-request-factory-contract-20260705-191709

## Purpose

Create pending approval request records only. This contract does not approve, execute, unlock, restart, patch, or delete anything.

## Current Posture

- Real-alpha mode: APPROVAL_ONLY_LOCKED_AFTER_SCREEN_STATUS_PROOF
- Real execution enabled: False
- Physical execution enabled: False
- Read-only status enabled: False
- Real-alpha locked: True

## Factory Rules

- Created requests must be PENDING.
- Factory may not create APPROVED records.
- Factory may not write EXECUTED records.
- Factory may not call real-alpha execution routes.
- Factory may not enable real execution.
- Factory may not restart services or patch code.

## Templates

| Action | Risk Tier | Dry Run Preview Required |
|---|---|---:|
| real_open_app | controlled_physical | True |
| real_open_url | controlled_physical_network | True |
| real_browser_search | controlled_physical_network | True |
| real_type_text | controlled_physical_keyboard | True |
| real_hotkey | controlled_physical_keyboard | True |
| real_screen_status | read_only_status | False |
| real_mouse_click | high_risk_physical_pointer | True |
| real_shell_allowed_command | high_risk_admin | True |

