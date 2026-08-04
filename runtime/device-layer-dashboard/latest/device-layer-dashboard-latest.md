# Leeway Device Layer Dashboard Export

**Version:** LEEWAY_DEVICE_LAYER_DASHBOARD_EXPORT_2026-07-05

**Timestamp:** 07/05/2026 19:00:33

**Verdict:** LEEWAY_DEVICE_LAYER_DASHBOARD_EXPORT_CLEAN

## Current Posture

| Item | Value |
|---|---|
| Master Device Operator | leeway_device_operator on port 5323 |
| Windows Satellite | windows-agent-lee |
| Dry-Run Actuator | http://127.0.0.1:7331 |
| Real Alpha Actuator | http://127.0.0.1:7332 |
| Real Alpha Mode | APPROVAL_ONLY_LOCKED_AFTER_SCREEN_STATUS_PROOF |
| Real Execution Enabled | False |
| Physical Execution Enabled | False |
| Read-Only Status Enabled | False |
| Lock Probes All False | True |

## Counters

| Counter | Value |
|---|---:|
| Approved Approvals | 10 |
| Executed Approvals | 10 |
| Pending Approvals | 3 |
| Denied Approvals | 0 |
| Expired Approvals | 0 |
| Proof Receipts | 57 |
| Real-Alpha Receipts | 81 |

## Lock Probes

| Probe | Executed |
|---|---:|
| screen-status | False |
| shell | False |
| hotkey | False |
| type-text | False |
| mouse-click | False |
| open-app | False |

## Milestones

| Milestone | Found | Verdict |
|---|---:|---|
| 164_windows_satellite | True | LEEWAY_WINDOWS_SATELLITE_REGISTERED |
| 166_actuator_contract | True | LEEWAY_WINDOWS_LOCAL_ACTUATOR_SERVICE_CONTRACT_CREATED |
| 167b_dryrun_fixed | True | LEEWAY_WINDOWS_LOCAL_ACTUATOR_DRY_RUN_LAUNCHER_FIXED |
| 169_approval_gate | True | LEEWAY_REAL_WINDOWS_ACTUATOR_APPROVAL_GATE_CREATED |
| 170_real_alpha_locked | True | LEEWAY_APPROVED_REAL_WINDOWS_ACTUATOR_ALPHA_CREATED_LOCKED |
| 171c_approval_lookup | True | LEEWAY_REAL_ALPHA_APPROVAL_LOOKUP_DIAGNOSED_AND_VALIDATED |
| 172_open_notepad | True | LEEWAY_ONE_ACTION_REAL_OPEN_NOTEPAD_ALPHA_EXECUTED |
| 173_lock_notepad | True | LEEWAY_REAL_ALPHA_LOCKED_BACK_TO_APPROVAL_ONLY |
| 174_open_url | True | LEEWAY_ONE_ACTION_REAL_OPEN_URL_ALPHA_EXECUTED |
| 175_lock_url | True | LEEWAY_REAL_ALPHA_LOCKED_BACK_AFTER_URL_PROOF |
| 176_browser_search | True | LEEWAY_ONE_ACTION_REAL_BROWSER_SEARCH_ALPHA_EXECUTED |
| 177_lock_browser_search | True | LEEWAY_REAL_ALPHA_LOCKED_BACK_AFTER_BROWSER_SEARCH_PROOF |
| 178_type_text | True | LEEWAY_ONE_ACTION_REAL_TYPE_TEXT_ALPHA_EXECUTED |
| 179_lock_type_text | True | LEEWAY_REAL_ALPHA_LOCKED_BACK_AFTER_TYPE_TEXT_PROOF |
| 180_hotkey | True | LEEWAY_ONE_ACTION_REAL_HOTKEY_ALPHA_EXECUTED |
| 181_lock_hotkey | True | LEEWAY_REAL_ALPHA_LOCKED_BACK_AFTER_HOTKEY_PROOF |
| 182_screen_status | True | LEEWAY_READ_ONLY_SCREEN_STATUS_ALPHA_EXECUTED |
| 183_lock_screen_status | True | LEEWAY_REAL_ALPHA_LOCKED_BACK_AFTER_SCREEN_STATUS_PROOF |
| 184_status_summary | True | LEEWAY_DEVICE_LAYER_STATUS_SUMMARY_CLEAN |

## Safety

- Docker prune: false
- Destructive cleanup: false
- Real execution enabled: false
- Physical execution enabled: false
- Read-only status enabled: false
- Physical UI action executed: false
- Screenshot captured: false
- Hotkey sent: false
- Mouse moved: false
- Mouse clicked: false
- Keyboard typed text: false
- App opened: false
- URL opened: false
- Browser search opened: false
- Type-text executed: false
- File opened/saved/deleted: false
- Printer used: false
- Message sent: false
- Phone call made: false
- Shell command executed: false
- Windows-only master created: false

## Files

- Dashboard JSON: C:\Users\Leona\Leeway-System-PowerShell-Scripts\AgentLee-Device-Layer\Run-185-20260705-190033\dashboard-export\device-layer-dashboard-export-20260705-190033.json
- Dashboard Markdown: C:\Users\Leona\Leeway-System-PowerShell-Scripts\AgentLee-Device-Layer\Run-185-20260705-190033\dashboard-export\device-layer-dashboard-export-20260705-190033.md
- Dashboard HTML: C:\Users\Leona\Leeway-System-PowerShell-Scripts\AgentLee-Device-Layer\Run-185-20260705-190033\dashboard-export\device-layer-dashboard-export-20260705-190033.html
- Latest JSON: E:\.LeeWay-Produucts-File\Leeway-Ecosystem v2.1.4\runtime\device-layer-dashboard\latest\device-layer-dashboard-latest.json
- Latest Markdown: E:\.LeeWay-Produucts-File\Leeway-Ecosystem v2.1.4\runtime\device-layer-dashboard\latest\device-layer-dashboard-latest.md
- Latest HTML: E:\.LeeWay-Produucts-File\Leeway-Ecosystem v2.1.4\runtime\device-layer-dashboard\latest\device-layer-dashboard-latest.html

