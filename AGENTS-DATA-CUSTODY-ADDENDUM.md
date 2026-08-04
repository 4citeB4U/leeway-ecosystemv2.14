# AGENTS.md Data Custody Addendum

This addendum extends AGENTS.md to cover data custody, state persistence, and backup standards for the Leeway Ecosystem.

## Data vs Code Distinction

Code is easy to recover from source control.

Data is harder to recover and requires explicit custody.

**Data includes:**

```text
receipts
ledgers
manifests
runtime state
database snapshots
preferences
work history
evidence chains
proof artifacts
session state
orchestration state
model warmup state
```

**Code includes:**

```text
source files
scripts
validators
tools
runtime executables
```

## Archive Structure for Data

All data must be stored under structured Archive paths:

```text
Archive/
├── receipts/           # Operational receipts (action proof)
├── ledgers/            # Work ledgers, preference ledgers, evidence ledgers
├── manifests/          # Identity manifests, capability manifests, runtime manifests
├── runtime-state/      # Agent state, model state, orchestration state snapshots
├── database-snapshots/ # State persistence, checkpoint data
├── preferences/        # User preferences, agent preferences, system preferences
├── proofs/             # Evidence artifacts backed by receipts
├── diagnostics/        # Debug output, logs, troubleshooting notes
├── backups/            # Rollback copies and timestamped backups
└── tmp/                # Temporary probes and scratch outputs
```

## Receipts Standard

Already covered in AGENTS.md lines 195-234.

Receipts prove **actions occurred**.

Required location:

```text
Archive/receipts/<event-family>/<YYYY>/<MM>/<DD>/<receipt-name>.json
```

Event families:

```text
adapter/
runtime/
execution/
proof-link/
diagnostic-trace/
system-mutation/
gate/
hash/
media/
```

## Ledgers Standard

Ledgers track **work history** and **decision chains**.

### Work Ledger

Location:

```text
Archive/ledgers/work-ledger/work-ledger.jsonl
```

Purpose:

```text
Track all work requests
Track all work completions
Track all work failures
Track all work cancellations
Link to receipts
Link to artifacts
```

Required fields:

```text
workId
requestedAt
requestedBy
workType
workScope
status
completedAt
receiptPath
artifactPaths
```

### Preference Ledger

Location:

```text
Archive/ledgers/preferences/preference-ledger.json
```

Purpose:

```text
Track user preferences
Track agent preferences
Track system preferences
Track preference changes
Track preference history
```

Required fields:

```text
preferenceId
category
key
value
setAt
setBy
previousValue
```

### Evidence Ledger

Location:

```text
Archive/ledgers/evidence/<research-id>/evidence-ledger.json
```

Purpose:

```text
Track research evidence
Track candidate evidence
Track curated evidence
Track rejected evidence
Track claim checks
Link to receipts
```

Required fields:

```text
evidenceId
researchId
evidenceType
source
capturedAt
status
claimSupport
receiptPath
```

## Manifests Standard

Manifests define **identity** and **capability contracts**.

### Identity Manifest

Location:

```text
Archive/manifests/identity/agent-lee-identity.manifest.json
```

Purpose:

```text
Define agent identity
Define agent fingerprint
Define agent authority
Define agent capabilities
Define agent constraints
```

Required fields:

```text
agentId
agentMode
role
canonicalFingerprint
instanceContract
sourceOfEmbodiment
authorityOwner
createdAt
version
```

### Capability Manifest

Location:

```text
Archive/manifests/capabilities/<capability-name>.manifest.json
```

Purpose:

```text
Define capability contract
Define capability requirements
Define capability constraints
Define capability proof requirements
```

Required fields:

```text
capabilityId
capabilityName
capabilityType
requirements
constraints
proofRequirements
version
```

### Runtime Manifest

Location:

```text
Archive/manifests/runtime/<runtime-name>.manifest.json
```

Purpose:

```text
Define runtime configuration
Define runtime endpoints
Define runtime dependencies
Define runtime health checks
```

Required fields:

```text
runtimeId
runtimeName
endpoints
dependencies
healthChecks
version
```

## Runtime State Standard

Runtime state captures **current operational state**.

### Agent State

Location:

```text
Archive/runtime-state/agent-state/<YYYY-MM-DD-HHMMSS>.json
```

Purpose:

```text
Capture agent operational state
Separate from model state
Separate from execution state
Separate from receipt state
```

Required fields:

```text
agentState (HEALTHY | DEGRADED | FAILED)
agentId
capturedAt
uptime
lastActivity
activeConnections
queueDepth
```

### Model State

Location:

```text
Archive/runtime-state/model-state/<YYYY-MM-DD-HHMMSS>.json
```

Purpose:

```text
Capture model fabric state
Track model availability
Track model warmup state
Track model health
```

Required fields:

```text
modelState (HEALTHY | DEGRADED | FAILED)
models (array of model status)
capturedAt
ollamaStatus
warmupStatus
```

### Orchestration State

Location:

```text
Archive/runtime-state/orchestration-state/<YYYY-MM-DD-HHMMSS>.json
```

Purpose:

```text
Capture orchestration state
Track lane status
Track work queue
Track scheduling state
```

Required fields:

```text
orchestrationState (HEALTHY | DEGRADED | FAILED)
lanes (array of lane status)
workQueue
capturedAt
```

## Database Snapshots Standard

Database snapshots preserve **persistent state**.

### State Snapshot

Location:

```text
Archive/database-snapshots/<database-name>/<YYYY-MM-DD-HHMMSS>.snapshot.json
```

Purpose:

```text
Preserve state for recovery
Enable rollback
Enable audit
Enable replay
```

Required fields:

```text
snapshotId
databaseName
capturedAt
capturedBy
recordCount
checksum
compressionUsed
```

### Checkpoint Data

Location:

```text
Archive/database-snapshots/<database-name>/checkpoints/<checkpoint-id>.json
```

Purpose:

```text
Preserve incremental state
Enable point-in-time recovery
Enable fast rollback
```

Required fields:

```text
checkpointId
databaseName
checkpointAt
previousCheckpointId
deltaRecordCount
checksum
```

## Backup Policy Standard

### Automatic Backup Triggers

Backups must be triggered:

```text
Before destructive actions
Before major state changes
Before runtime upgrades
Before manifest changes
Before registry changes
On schedule (daily for data, weekly for full system)
```

### Backup Scope

**Data backups** (critical, frequent):

```text
Archive/receipts/
Archive/ledgers/
Archive/manifests/
Archive/runtime-state/
Archive/database-snapshots/
Archive/preferences/
```

**Code backups** (less critical, less frequent):

```text
Source files (already in git)
Scripts (already in git)
Validators (already in git)
```

### Backup Location

Primary backup location:

```text
Archive/backups/<backup-type>/<YYYY-MM-DD-HHMMSS>/
```

Backup types:

```text
data-full/
data-incremental/
state-snapshot/
manifest-snapshot/
ledger-snapshot/
receipt-snapshot/
```

### Backup Verification

Every backup must:

```text
Write a backup receipt
Include checksum
Include record count
Include backup scope
Include restore instructions
```

Backup receipt location:

```text
Archive/receipts/system-mutation/<YYYY>/<MM>/<DD>/backup-<timestamp>.json
```

## Restore Policy Standard

### Restore Authority

Only these roles may restore from backup:

```text
Creator authority (Leonard Lee)
Operator with explicit approval token
Emergency recovery mode with audit trail
```

### Restore Procedure

1. Verify backup integrity (checksum)
2. Write restore plan receipt
3. Request approval token if required
4. Stop affected services
5. Restore data
6. Verify restore (checksum, record count)
7. Restart services
8. Write restore completion receipt
9. Verify operational state

### Restore Receipt

Location:

```text
Archive/receipts/system-mutation/<YYYY>/<MM>/<DD>/restore-<timestamp>.json
```

Required fields:

```text
restoreId
backupPath
restoredAt
restoredBy
approvalToken
recordsRestored
checksum
verificationStatus
```

## Data Retention Policy

### Receipts

```text
Retain: Forever (or until explicit archive cleanup)
Reason: Audit trail, proof chain, compliance
```

### Ledgers

```text
Retain: Forever (or until explicit archive cleanup)
Reason: Work history, decision chain, evidence chain
```

### Manifests

```text
Retain: Forever (or until explicit archive cleanup)
Reason: Identity proof, capability contracts, runtime contracts
```

### Runtime State Snapshots

```text
Retain: 90 days (configurable)
Reason: Operational diagnostics, performance analysis
Exception: Keep snapshots linked to incidents forever
```

### Database Snapshots

```text
Retain: 30 days for incremental, 1 year for full (configurable)
Reason: Recovery capability, audit capability
Exception: Keep snapshots linked to major releases forever
```

### Preferences

```text
Retain: Forever (or until explicit user deletion)
Reason: User experience, agent behavior continuity
```

## Data Custody Checklist

Before claiming data is safe:

```text
☐ Receipts are written to Archive/receipts/
☐ Ledgers are updated in Archive/ledgers/
☐ Manifests are versioned in Archive/manifests/
☐ Runtime state is captured in Archive/runtime-state/
☐ Database snapshots exist in Archive/database-snapshots/
☐ Preferences are persisted in Archive/preferences/
☐ Backups are timestamped in Archive/backups/
☐ Backup receipts are written
☐ Checksums are verified
☐ Restore procedure is documented
☐ Retention policy is enforced
```

## Integration with AGENTS.md

This addendum extends AGENTS.md:

- AGENTS.md lines 195-234 cover **receipts** (action proof)
- This addendum covers **ledgers, manifests, runtime state, database snapshots, preferences, and backups** (data custody)

Both standards must be followed.

## Non-Negotiables

```text
Never lose receipts.
Never lose ledgers.
Never lose manifests.
Always backup data before destructive actions.
Always write backup receipts.
Always verify backup integrity.
Always document restore procedures.
Never treat Archive as disposable.
Never mix data and code backup policies.
Never skip checksums.
```

## Enforcement

Bridge Runtime must enforce:

```text
Receipt writing for all actions
Ledger updates for all work
Manifest versioning for all identity/capability changes
Runtime state snapshots on schedule
Database snapshots on schedule
Backup triggers before destructive actions
Backup verification after backup
Restore approval gates
```

Validators must check:

```text
Receipt existence
Ledger integrity
Manifest versioning
State snapshot freshness
Database snapshot freshness
Backup completeness
Checksum validity
Restore procedure documentation
```

## Next Steps

1. Add this addendum to AGENTS.md as a new section
2. Update Archive/README.md to reference this standard
3. Create Archive subdirectories: ledgers/, manifests/, runtime-state/, database-snapshots/, preferences/
4. Update backup scripts to follow this policy
5. Update validators to check data custody compliance
6. Write receipts for all data custody actions