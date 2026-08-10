# Finisher-01 Handoff — opencode / deepseek lane (2026-08-09)

This handoff covers continuation after the Forgejo push. The opencode/deepseek
lane (this session) must complete these tracks:

## TRACK C — Model orchestra

1. Discover local models via Ollama API `http://127.0.0.1:11434/api/tags`.
2. Classify each model (reasoning / coding / vision / embedding) per Leeway Model Fabric Rule.
3. Run a synthetic benchmark (single small prompt per model, bounded timeouts).
4. Produce the agent map: lane -> model route (routing table), including the
   `agent-lee-code-mode` canonical alias on `http://127.0.0.1:8787/v1/chat/completions`.
5. Prove delegation: at least one task actually executed by a subagent through
   a discovered route (receipt required).
6. Output evidence dir `C:\Users\Leona\LeeWay-Audits\MODEL-ORCHESTRA-01-<timestamp>\`
   with receipt. Apply MODEL-LIFECYCLE-01 amendment:
   - discovery JSON with size, parameter hint, quantization where available,
   - warmup probes for reasoning lane,
   - cold/busy/timeout states reported exactly, not glossed.

## TRACK D — LeeWay Agent OS preservation

1. `git add -A` + commit the LeeWay Agent OS subtree, or write an evidence
   manifest with git status, SHA-256 tree hash, and component inventory.
2. Capture build state (package.json scripts, env prerequisites).
3. Health probes of local stack endpoints (4001/8080/8787/8091/8765) — statuses only.
4. Evidence: `C:\Users\Leona\LeeWay-Audits\AGENT-OS-PRESERVATION-01-<timestamp>\`.

## TRACK D.1 — Cerebral donor trace

1. Locate the donor source tree that seeded `agent-lee-coding-mode` (previous
   cerebral/coding agent) and trace its code lineage into the new OS.
2. Produce the BackgroundFabric capability proposal (persistent background
   processes, model warmup, low-latency lanes, lifecycle rules, timeout policy).
3. Evidence: `C:\Users\Leona\LeeWay-Audits\CEREBRAL-DONOR-TRACE-01-<timestamp>\`.

## TRACK E — Workspace catalog verify

1. Read `C:\Users\Leona\LeeWay-Audits\WORKSPACE-CATALOG-01-20260809-172402\`.
2. Verify a random sample of 5 catalog entries against the live workspace (exists,
   name matches, size sane). Report discrepancies. Do NOT rebuild the catalog.

## TRACK F — DB-PROD no-mutation verify

1. Locate DB-PROD candidate data dirs (SQLite/Postgres/MariaDB candidates from
   discovery). Record file count, sizes, last-modified before/after.
2. No writes, no schema changes, no new databases. Evidence + receipt.

## TRACK G — Hermes no-mutation verify

1. Locate Hermes mailboxes. Record structure snapshot. No messages created,
   no mailboxes modified. Evidence + receipt.

## TRACK H — Bitwarden Lite Security Foundation

Per LEEWAY ORCHESTRATOR AMENDMENT (task-packets/track-H-bitwarden-lite.json).
Highlights: single container ghcr.io/bitwarden/lite on private localhost only
(port 8123), SQLite, recovery-first for creator, LeeWay-managed backups, secret
domain classes, no master password to agents, broker design for Agent Lee.

## Final output

Update `orchestration/state.json` statuses, write run summary, do NOT push
secrets. All evidence in LeeWay-Audits with receipts.

## Status update (BITWARDEN-LITE-01, 2026-08-09 19:24)

Track H COMPLETE: PASS_BITWARDEN_LITE_FOUNDATION_READY.
- Account registered via 2026 identity flow (send-verification-email + register/finish).
- login/profile/cipher create+read+delete verified via API with client-side encryption (bare iv|ct|mac EncString format).
- Backup (pause+copy+unpause) 10 files, SHA-256 manifest verified; reachable after restart.
- 9/9 official suite checks PASS: C:\LeeWay\BitwardenLite\test-results-final.json
- Evidence: C:\Users\Leona\LeeWay-Audits\BITWARDEN-LITE-01-20260809-192400
- Receipt: Archive\receipts\bitwarden-lite-01-20260809-192400.json
- Secrets: C:\LeeWay\BitwardenLite\local-admin-credentials.json (icacls protected)
- Unproven: SMTP, desktop/mobile clients, 2FA/SSO/SCIM, admin console, import/export, TLS.
- Temp crypto artifacts purged after use.
