# Migration Status Command

Show the current migration state across all migrations.

## Usage

```
/migration-status
```

## Behavior

1. Scan `evidence/` for all migration directories
2. For each migration, find the latest receipt
3. Display a table:
   - Migration ID
   - Name
   - Status (PASS/FAIL/PARTIAL/NOT_STARTED)
   - Latest receipt timestamp
   - Evidence path
   - Prerequisite status

## Output

```text
MIG-001   Foundation baseline             PASS   2026-07-29 17:36   evidence/MIG-001/20260729-173610
MIG-002   Host-platform initialization    PASS   2026-07-29 17:59   evidence/MIG-002/20260729-175923
MIG-002A  Skills registration             PASS   2026-07-29 18:01   evidence/MIG-002A/20260729-180128
MIG-003   Module framework                PASS   2026-07-29 18:03   evidence/MIG-003/20260729-180332
MIG-004   Runtime contract                PASS   2026-07-29 18:05   evidence/MIG-004/20260729-180545
MIG-005   Code engine                     PASS   2026-07-29 18:08   evidence/MIG-005/20260729-180817
MIG-006A  Workflow engine contracts       PASS   2026-07-29 19:16   evidence/MIG-006A/20260729-191620
MIG-006B  Workflow adapter validation     ...
MIG-006C  Bounded live workflow execution ...
MIG-007A  Runtime client implementation   ...
MIG-007B  Existing route adapter          ...
MIG-007C  Streaming and events            ...
MIG-007D  Runtime integration proof       ...
MIG-008A  Agent Lee contracts             ...
MIG-008B  Planner and dispatcher          ...
MIG-008C  Conversation and task management ...
MIG-008D  Voice and vision                ...
MIG-008E  Memory and embodiment           ...
MIG-009   Capability system               ...
MIG-010A  Next.js shell activation        ...
...
```

## Notes

Shows NOT_STARTED for migrations without evidence.
Shows PARTIAL if evidence exists but receipt is not PASS.