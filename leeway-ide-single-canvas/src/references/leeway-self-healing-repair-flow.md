# LeeWay Self-Healing Repair Flow

Use this flow when drift, anonymous code, or duplicate paths are found.

1. Detect the anonymous file, command, event, or pipeline.
2. Classify it:
   - active
   - fallback
   - evidence
   - generated
   - quarantine
   - delete-pending
3. Assign or correct the LeeWay ID.
4. Verify source and consumer relationships.
5. Remove or quarantine duplicate or stale paths.
6. Run the identity graph gate.
7. Run the application integrity gate.
8. Preserve evidence and write a receipt.

## Repair Law

- Prefer correcting the source of truth over layering more compatibility around drift.
- Prefer quarantine or deletion over keeping duplicate production paths alive.
- Preserve evidence of the repair pass so the same drift does not need to be rediscovered.
