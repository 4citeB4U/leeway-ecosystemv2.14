# Leeway Control Plane Action Catalog

**Version:** LEEWAY_CONTROL_PLANE_ACTION_CATALOG_READ_ONLY_2026-07-05

**Timestamp:** 07/05/2026 19:12:35

## Posture

- Master Device Operator: leeway_device_operator:5323
- Windows satellite: windows-agent-lee
- Dry-run actuator: http://127.0.0.1:7331
- Real-alpha actuator: http://127.0.0.1:7332
- Real-alpha mode: APPROVAL_ONLY_LOCKED_AFTER_SCREEN_STATUS_PROOF
- Real execution enabled: False
- Physical execution enabled: False
- Read-only status enabled: False
- All lock probes executed=false: True

## Summary

| Counter | Value |
|---|---:|
| Total cataloged actions | 13 |
| Previously proven actions | 6 |
| Locked actions | 6 |
| Not-enabled actions | 7 |
| Enabled now | 0 |
| Approval-required actions | 13 |

## Action Catalog

| Action | State | Proven | Risk Tier | Approval | Scope |
|---|---|---:|---|---:|---|
| real_open_app | locked | True | controlled_physical | True | notepad only |
| real_open_url | locked | True | controlled_physical_network | True | https://example.com only |
| real_browser_search | locked | True | controlled_physical_network | True | Bing search in Edge only |
| real_type_text | locked | True | controlled_physical_keyboard | True | approved fixed text into controlled Notepad only |
| real_hotkey | locked | True | controlled_physical_keyboard | True | F5 into controlled Notepad only |
| real_screen_status | locked | True | read_only_status | True | read-only monitor and screen metrics, no screenshot |
| real_mouse_click | not_enabled | False | high_risk_physical_pointer | True | not yet proven |
| real_mouse_move | not_enabled | False | high_risk_physical_pointer | True | not yet proven |
| real_screenshot | not_enabled | False | privacy_sensitive_read | True | not yet proven |
| real_shell_allowed_command | not_enabled | False | high_risk_admin | True | not yet proven |
| real_print | not_enabled | False | external_physical_output | True | not yet proven |
| real_message_send | not_enabled | False | external_communication | True | not yet proven |
| real_phone_call | not_enabled | False | external_communication_voice | True | not yet proven |

## Safety

- Enabled real actions: 0
- Real execution enabled: false
- Physical execution enabled: false
- Read-only status enabled: false
- No service restart, code patch, Docker prune, destructive cleanup, UI action, screenshot, shell, print, message, or phone action.

