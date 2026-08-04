# Migration Rollback Command

Rollback a failed migration using its rollback artifacts.

## Usage

```
/migration-rollback <migration-id> [--evidence-session <timestamp>]
```

## Behavior

1. Locate the latest evidence session for the migration (or use specified)
2. Read the rollback actions from the session
3. Execute rollback in reverse order:
   - Restore modified files from backup
   - Remove created files
4. Verify protected file hashes match pre-migration state
5. Write rollback receipt

## Prerequisites

- Evidence session must exist with rollback directory
- Must not rollback migrations that have subsequent successful migrations depending on them

## Output

Print rollback receipt path and status.