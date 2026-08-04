# SAP7 OS-Level Agent Suite Runbook

## Prerequisites

- Windows PowerShell available
- Python environment at `C:\Cerebral\.venv`
- `mcp` package installed (FastMCP)

Set audit HMAC key (User scope, one-time):

```powershell
[Environment]::SetEnvironmentVariable("CEREBRAL_AUDIT_HMAC_KEY", (New-Guid).Guid.Replace("-","") + (New-Guid).Guid.Replace("-", ""), "User")
```

Restart shell sessions after setting the key.

## Wave 1 (Discovery)

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File C:\Cerebral\tools\Wave1_Discovery.ps1 -DryRun
```

Discovery excludes non-project/system-heavy directories by default: `.venv`, `node_modules`, `__pycache__`, `staging`, `Cerebral_backup`.

## Wave 2 (Audit + Staging)

```powershell
python C:\Cerebral\tools\os_audit.py --wave1 C:\Cerebral\tools\reports\Wave1_Discovery.json --output C:\Cerebral\tools\reports\Wave2_Audit.json --sample-size 10
python C:\Cerebral\tools\stager.py --wave1 C:\Cerebral\tools\reports\Wave1_Discovery.json --staging C:\Cerebral\staging --limit 20 --output C:\Cerebral\tools\reports\Wave2_Staging.json
```

The default staging command is **plan-only** and does not copy files.

To copy staged files, use apply mode explicitly:

```powershell
python C:\Cerebral\tools\stager.py --wave1 C:\Cerebral\tools\reports\Wave1_Discovery.json --staging C:\Cerebral\staging --limit 20 --output C:\Cerebral\tools\reports\Wave2_Staging.json --apply
```

Apply-mode with immutable audit trail:

```powershell
python C:\Cerebral\tools\stager.py `
 --wave1 C:\Cerebral\tools\reports\Wave1_Discovery.json `
 --staging C:\Cerebral\staging `
 --limit 20 `
 --apply `
 --operator "CommanderLee" `
 --audit C:\Cerebral\tools\reports\Wave2_Staging_Audit.jsonl `
 --output C:\Cerebral\tools\reports\Wave2_Staging.json
```

Apply-mode staging with automatic audit rotation (omit `--audit`):

```powershell
python C:\Cerebral\tools\stager.py `
 --wave1 C:\Cerebral\tools\reports\Wave1_Discovery.json `
 --staging C:\Cerebral\staging `
 --limit 20 `
 --apply `
 --operator "CommanderLee" `
 --output C:\Cerebral\tools\reports\Wave2_Staging.json
```

Apply-mode policy gate:

- `CEREBRAL_AUDIT_HMAC_KEY` must be set, otherwise apply is denied.
- After apply, stager automatically runs strict verification on the latest audit log and fails closed on verification errors.

When `--apply` is used and `--audit` is omitted, stager writes to:
`C:\Cerebral\tools\reports\Wave2_Staging_Audit_YYYYMMDD_HHMMSSZ.jsonl`.
Use the returned `audit_log` path from command output for strict verification.

Stager also updates pointer file on every run:
`C:\Cerebral\tools\reports\LATEST_AUDIT_LOG.txt`

Verify audit integrity:

```powershell
python C:\Cerebral\tools\verify_audit.py --audit C:\Cerebral\tools\reports\Wave2_Staging_Audit.jsonl --output C:\Cerebral\tools\reports\AuditVerify.json
```

Strict mode (recommended for apply-mode environments):

```powershell
python C:\Cerebral\tools\verify_audit.py `
 --audit C:\Cerebral\tools\reports\Wave2_Staging_Audit.jsonl `
 --output C:\Cerebral\tools\reports\AuditVerify.json `
 --strict
```

Verify latest using pointer file (no JSON parsing needed):

```powershell
$audit = (Get-Content C:\Cerebral\tools\reports\LATEST_AUDIT_LOG.txt | Select-String '^audit_log=').ToString().Split('=')[1]
python C:\Cerebral\tools\verify_audit.py --audit $audit --output C:\Cerebral\tools\reports\AuditVerify_latest.json --strict
```

Recommended preflight in apply environments:

```powershell
if (-not $env:CEREBRAL_AUDIT_HMAC_KEY) { throw "CEREBRAL_AUDIT_HMAC_KEY is required for --apply" }
```

Non-strict mode (migration period only):

```powershell
python C:\Cerebral\tools\verify_audit.py `
 --audit C:\Cerebral\tools\reports\Wave2_Staging_Audit.jsonl `
 --output C:\Cerebral\tools\reports\AuditVerify.json
```

Migration note: rotate audit logs after enabling signing to avoid mixed signed/unsigned history.

## Reproducible Build Preflight

Preferred one-command build path:

```powershell
python C:\Cerebral\Cerebral_SAP7_Sovereign.py build-pipeline `
 --root C:\Cerebral `
 --build-dir C:\Cerebral\build `
 --dist-dir C:\Cerebral\dist `
 --install-pyinstaller
```

First build on a fresh machine (no existing manifest):

```powershell
python C:\Cerebral\Cerebral_SAP7_Sovereign.py build-pipeline `
 --root C:\Cerebral `
 --build-dir C:\Cerebral\build `
 --dist-dir C:\Cerebral\dist `
 --install-pyinstaller `
 --allow-missing-manifest
```

Manual two-step fallback:

Run rebuild check before onefile builds:

```powershell
python C:\Cerebral\Cerebral_SAP7_Sovereign.py rebuild-check --root C:\Cerebral --strict
```

Then build:

```powershell
python C:\Cerebral\Cerebral_SAP7_Sovereign.py build-onefile --root C:\Cerebral --build-dir C:\Cerebral\build --dist-dir C:\Cerebral\dist --install-pyinstaller
```

`rebuild-check` writes:
`C:\Cerebral\build\metadata\rebuild_check.json`

Exit codes:

- `0` = clean (or missing manifest in non-strict mode)
- `5` = drift detected (or missing manifest in strict mode)
- `6` = build failed
- `7` = post-build repeatability check failed

## Cleanup Bootstrap Validation Artifacts

```powershell
python C:\Cerebral\Cerebral_SAP7_Sovereign.py cleanup-bootstrap-test --root C:\Cerebral
```

Force mode (skip confirmation prompt):

```powershell
python C:\Cerebral\Cerebral_SAP7_Sovereign.py cleanup-bootstrap-test --root C:\Cerebral --force
```

Removes `tmp/bootstrap-*` directories only. Refuses any target that equals the app root, falls outside it, or whose name does not contain "bootstrap".

Exit codes:

- `0` = directories removed successfully
- `8` = nothing to remove
- `9` = unsafe path detected (hard fail)

## Cleanup Build Artifacts

```powershell
python C:\Cerebral\Cerebral_SAP7_Sovereign.py cleanup-build-artifacts --root C:\Cerebral
```

Force mode:

```powershell
python C:\Cerebral\Cerebral_SAP7_Sovereign.py cleanup-build-artifacts --root C:\Cerebral --force
```

Removes `build/` and `dist/` directories. Never deletes the sovereign source file.

Exit codes:

- `0` = directories removed successfully
- `8` = nothing to remove
- `9` = unsafe path detected (hard fail)

## Wave 3 (Repair Draft)

```powershell
python C:\Cerebral\tools\repair_templater.py --wave2 C:\Cerebral\tools\reports\Wave2_Audit.json --output C:\Cerebral\tools\reports\Wave3_RepairDraft.json
```

## MCP Tools

SAP7 pipeline tools:

- `run_env_check`
- `discovery_wave1`
- `hardware_baseline`
- `audit_wave2`
- `stage_wave2`
- `repair_wave3`
- `insforge_generate_shim`
- `executive_handshake`

Agent tool suites (exposed by `cerebral_mcp_server.py`):

- Sentinel: `sentinel_health_snapshot`, `sentinel_process_list`, `sentinel_check_service`, `sentinel_disk_usage`, `sentinel_health_history`
- Navigator: `navigator_open_url`, `navigator_screenshot_page`, `navigator_extract_text`, `navigator_search_web`, `navigator_run_script`
- CodeScout: `code_scout_scan_repo`, `code_scout_find_symbol`, `code_scout_find_todos`, `code_scout_analyze_errors`, `code_scout_count_loc`
- Archivist: `archivist_memory_stats`, `archivist_memory_search`, `archivist_memory_write`, `archivist_generate_briefing`, `archivist_session_export`

## Safety

- Default mode is read-only or staging only.
- `stage_wave2` via MCP requires `apply_mode=true` and approval token `COMMANDER_LEE_APPROVED`.
- Apply-mode execution requires Commander approval.
- `stager.py` hard-fails if `--staging` is outside `C:\Cerebral\staging`.
- Audit lines are HMAC signed when `CEREBRAL_AUDIT_HMAC_KEY` is present.
- For apply-capable environments, use strict verification (`--strict` / `--audit-strict`) as the trust gate.
