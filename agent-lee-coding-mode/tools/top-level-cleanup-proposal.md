# Top-level Cleanup Proposal

Generated: 2026-06-23T12:32:54Z

Purpose
- Collect candidate top-level files and directories that are likely safe to archive (non-destructive staging), to reduce clutter and improve discovery performance.

Destination
- Archive/top-level-cleanup-<timestamp>/ (script will create this path and write a JSON receipt of actions)

Candidate items (proposal only — will not be moved unless you approve with the exact token):

- `build.log` — likely build artifact
- `fabric_err.txt` — error log
- `supervisor-log.txt` — runtime supervisor logs
- `tempfile.txt` — stray temporary file
- `test-output.mp3`, `test_*.wav`, `real.wav` — temporary media/test artifacts
- Top-level `tmp/`, `.tmp/`, `_logs/`, `logs/` directories — move to archive
- Top-level `*.bak` files (e.g., `start-leeway-local-agent-stack.ps1.bak*`) — older backups
- `leeway-80-bench/` and other bench/test directories not required for runtime

Notes and Risks
- This is a conservative proposal intended to avoid moving runtime-critical configuration and receipts. Files explicitly referenced by runtime (e.g., `Agent Lee, audio voice.m4a`, `updated-model-hive-registry.json`, `docker-compose*.yml`) are NOT included.
- The script will create a timestamped archive directory and move matched items there. If any file is locked the script logs a warning and continues.
- A JSON receipt will be written to the new archive dir listing moved items and timestamps.

How to run (requires explicit approval token):

PowerShell example (dry-run):

```powershell
powershell -ExecutionPolicy Bypass -File agent-lee-coding-mode\tools\execute-top-level-cleanup.ps1 -ApprovalToken I_AUTHORIZE_LEEWAY_DESTRUCTIVE_ACTION -WhatIf
```

To execute for real, omit `-WhatIf` and provide the same exact token string for `-ApprovalToken`.

If you approve, provide the exact token `I_AUTHORIZE_LEEWAY_DESTRUCTIVE_ACTION` and I'll run the script and produce receipts.
