# Protected Files Check Command

Verify that protected files have not been modified since the last migration.

## Usage

```
/protected-check [--since <migration-id>]
```

## Behavior

1. Read the protected file list from the migration script pattern
2. Compute current SHA-256 hashes for each protected file
3. Compare against the latest migration evidence `protectedBefore`/`protectedAfter`
4. Report any changes

## Protected Files

```
package.json
package-lock.json
server.ts
vite.config.ts
vite.config.js
```

## Output

```text
Protected Files Check
=====================
package.json          UNCHANGED  (a1b2c3d4...)
package-lock.json     UNCHANGED  (e5f6g7h8...)
server.ts             UNCHANGED  (i9j0k1l2...)
vite.config.ts        UNCHANGED  (m3n4o5p6...)
vite.config.js        NOT_FOUND  (expected)
```

If any file is CHANGED, exit with non-zero code.