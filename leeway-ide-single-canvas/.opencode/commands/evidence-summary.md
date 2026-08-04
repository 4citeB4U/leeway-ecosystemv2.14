# Evidence Summary Command

Generate a summary report of all migration evidence.

## Usage

```
/evidence-summary [--format <json|markdown|text>] [--since <migration-id>]
```

## Behavior

1. Scan all `evidence/MIG-*/<timestamp>/` directories
2. For each, read receipt.json and validation.json
3. Compile summary:
   - Migration timeline
   - File creation/modification counts
   - Build validation history
   - Protected file integrity
   - Rollback availability

## Output (Markdown)

```markdown
# LeeWay IDE 2.0 Migration Evidence Summary

Generated: 2026-07-29T19:30:00Z

## Migration Status

| Migration | Status | Timestamp | Evidence | Files Created | Files Modified | Build Validated |
|-----------|--------|-----------|----------|---------------|----------------|-----------------|
| MIG-001 | PASS | 2026-07-29 17:36 | evidence/MIG-001/... | 0 | 0 | N/A |
| MIG-002 | PASS | 2026-07-29 17:59 | evidence/MIG-002/... | 12 | 0 | PASS |
| MIG-002A | PASS | 2026-07-29 18:01 | evidence/MIG-002A/... | 2 | 0 | PASS |
| MIG-003 | PASS | 2026-07-29 18:03 | evidence/MIG-003/... | 6 | 0 | PASS |
| MIG-004 | PASS | 2026-07-29 18:05 | evidence/MIG-004/... | 5 | 0 | PASS |
| MIG-005 | PASS | 2026-07-29 18:08 | evidence/MIG-005/... | 6 | 0 | PASS |
| MIG-006A | PASS | 2026-07-29 19:16 | evidence/MIG-006A/... | 6 | 0 | PASS |

## Protected File Integrity

All protected files (package.json, package-lock.json, server.ts, vite.config.ts) have remained unchanged across all migrations.

## Rollback Availability

All PASS migrations have complete rollback artifacts in their evidence sessions.

## Known Gaps

- MIG-006B: Not started
- MIG-006C: Not started
- MIG-007A-D: Not started
- MIG-008A-E: Not started
- MIG-009: Not started
- MIG-010A-I: Not started
```