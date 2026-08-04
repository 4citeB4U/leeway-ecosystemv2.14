# Docker Container Gate Governance Writeout - 443

## Docker Gate Governance

Docker is classified as a governed Runtime Fabric substrate, not an execution permission source.

## Current Counts

- Total containers: 54
- Locked active scope: 10
- Deferred scope: 37
- Document-only scope: 7

## Docker Rules

- No docker exec.
- No Docker mutation.
- No start/stop/restart/build/compose up/down/rm/prune.
- Backup/rollback/exited containers remain document-only.
- Host-port and high-risk surfaces require explicit scope and approval.
- Docker containers do not own canonical evidence.
