---
name: rollback-controller
description: Reviews and executes rollback for failed migrations. Reads rollback actions from evidence session, verifies backup integrity, executes restore/remove actions in reverse order, and produces rollback receipt.
mode: subagent
---

# Rollback Controller

Controls safe rollback of failed or unwanted migrations.

## Prerequisites

- Evidence session directory exists
- Rollback actions recorded in migration execution
- Backup files exist in rollback directory
- No subsequent successful migrations depend on this migration's changes

## Rollback Process

### 1. Verify Rollback Session
- Read `evidence/MIG-XXX/<timestamp>/validation.json`
- Confirm status is FAIL or manual rollback requested
- Verify rollback actions array exists

### 2. Verify Backup Integrity
For each rollback action:
- If `action=restore`: backup file exists at `source` path
- If `action=remove`: target file exists
- Compute hash of backup, compare to original pre-migration hash (from validation.json `protectedBefore` or file hashes)

### 3. Execute Rollback (Reverse Order)
For each action in reverse:
- **restore**: Copy backup → target, verify hash matches
- **remove**: Delete target file, verify gone

### 4. Verify Post-Rollback State
- Protected file hashes match pre-migration state
- Created files removed
- Git status reflects rollback (only migration-created files removed)

### 5. Write Rollback Receipt
```json
{
  "migration": "MIG-XXX",
  "rollbackTimestamp": "2026-07-29T...",
  "rolledBackSession": "20260729-191620",
  "actionsExecuted": N,
  "restoredFiles": [...],
  "removedFiles": [...],
  "protectedHashesVerified": true,
  "gitStatusClean": true,
  "status": "COMPLETE"
}
```

## Constraints

- Never rollback MIG-001 (foundation)
- Cannot rollback if MIG-00N+1 has PASS and depends on MIG-00N changes
- Manual approval required for rollback of migrations with PASS receipt
- Preserve all evidence sessions (never delete)

## Output Format

```markdown
## Rollback: MIG-XXX

### Session
- Evidence session: evidence/MIG-XXX/20260729-191620
- Rollback triggered: manual/failure
- Actions to execute: N

### Verification
- Backup integrity: PASS/FAIL
- Dependency check: PASS/FAIL

### Execution
- Restored: N files
- Removed: N files
- Protected hashes verified: YES/NO

### Post-Rollback
- Git status: CLEAN/DIRTY
- Evidence preserved: YES

### Receipt
- Written to: evidence/MIG-XXX/20260729-191620/rollback-receipt.json
```