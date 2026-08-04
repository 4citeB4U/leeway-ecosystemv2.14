# LeeWay Production Cleanse Standard

Use production cleanse passes to remove drift without damaging the active app.

## Sequence

1. Freeze feature work.
2. Inventory suspicious files.
3. Classify each file:
   - active
   - fallback
   - evidence
   - generated
   - quarantine
   - delete-pending
4. Delete one category only.
5. Run the identity graph gate.
6. Run the application integrity gate.
7. Commit only the safe deletion unit.

## Preferred Delete Order

1. generated debug artifacts
2. backup and broken source artifacts
3. old UI proof artifacts
4. stale compiled outputs
5. obsolete adapters or providers
6. archive or backup leftovers

## Cleanse Law

- Do not delete active runtime files during the same pass that establishes their replacement.
- Do not delete ambiguous files until identity ownership is explicit.
- Do not mix unrelated cleanup categories in one commit.
