# Leeway Migration Baseline (Cerebral)

Date: 2026-06-08

## Objective

Align the Cerebral workspace with Leeway standards expectations:

- projection/runtime repository remains lean
- core governance remains outside projection logic
- canonical entrypoints are explicit
- generated artifacts are not mixed into source roots

## Standards interpreted

- `MASTER_RULES.md`: Agent Lee OS delegates execution to Cerebral APIs.
- `LeeWay-Standards` doctrine: projections should contain adapters/render surfaces and avoid sovereign core duplication.
- Runtime and audit evidence should be observable and centralized.

## Changes applied in this baseline

1. Canonical daemon standardization
- Canonical daemon entrypoint is `CerebralDaemon.py`.
- `cerebral_daemon.py` converted to compatibility shim only.
- Tooling scripts updated to launch `CerebralDaemon.py`.

2. Duplicate directory cleanup
- Removed recursive mirror tree: `MD_File_Directory/`.
- Consolidated `MD-File-Directory/` note files into `DOCS/legacy/`.

3. Runtime artifact consolidation
- Moved root runtime logs into `logs/runtime/`.
- Added root `.gitignore` to keep generated artifacts out of source control.

4. Legacy root archival
- Archived legacy files into `archive/legacy-root/`:
	- `server.py`
	- `talk.py`
	- `Cerebral_Dashboard.pyw`
	- `get-pip.py`

## Canonical layout targets (this repo)

- Runtime/API: root Python runtime files (`CerebralDaemon.py`, routers, engines)
- UI: `agent-lee-os2/`
- Docs: `DOCS/`
- Operational logs: `logs/`
- Tools and scripts: `tools/`, `scripts/`
- Governance reference: `LeeWay-Standards/` (read-only authority source)

## Next cleanup wave (recommended)

1. Normalize generated reports into `logs/reports/`:
- `repo_map.json`
- `repo_map.md`
- `repo_map.mmd`
- `Cerebral_FULL_SYSTEM_REPORT.md`

2. Remove stale bootstrap scripts from archive once no rollback is needed.

3. Add CI checks enforcing:
- no runtime log files in repo root
- no recursive self-mirroring directories
- canonical daemon launcher references
