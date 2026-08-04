# Migration Plan Command

Read the ADR and migration specification for a given migration ID and produce a mutation boundary plan.

## Usage

```
/migration-plan <migration-id>
```

## Behavior

1. Resolve the ADR(s) referenced in the migration specification
2. Read the migration specification markdown
3. Inspect current repository state (git status, existing files, directory structure)
4. Read latest prerequisite receipts
5. Produce a mutation boundary document with:
   - Files to create
   - Files to modify
   - Files to delete
   - Protected files that must NOT change (package.json, server.ts, vite.config.ts, etc.)
   - Validation criteria
   - Rollback strategy
   - Evidence requirements

## Output

Write to `.opencode/migration-plans/<migration-id>-plan.json`:

```json
{
  "migrationId": "MIG-XXX",
  "planVersion": 1,
  "adrReferences": ["ADR-XXX"],
  "specification": "migration/MIG-XXX-xxx.md",
  "prerequisiteReceipts": ["evidence/MIG-XXX/.../receipt.json"],
  "mutationBoundary": {
    "create": [],
    "modify": [],
    "delete": [],
    "protected": ["package.json", "package-lock.json", "server.ts", "vite.config.ts"]
  },
  "validation": {
    "parser": true,
    "typescript": true,
    "build": true,
    "symbols": [],
    "protectedHashes": true
  },
  "rollback": {
    "strategy": "restore-backups",
    "actions": []
  },
  "evidenceRequirements": [
    "environment.json",
    "migration.json",
    "validation.json",
    "receipt.json",
    "transcript.log",
    "npm-build.log"
  ]
}
```