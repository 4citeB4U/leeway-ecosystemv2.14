# LeeWay Docker recovery and consolidation â€” 2026-09-16

This branch begins publication of previously local Docker evidence and source. It is not a complete ecosystem backup.

## Verified inventory
106 containers: 54 running, 50 exited, 2 created. 45 running containers lacked Docker health checks. Seafile was unhealthy. 62 containers lacked Compose source labels; that does not prove no source file exists. Several labelled Compose paths no longer exist.

The older agent-skills container exposes eight registry entries and reports a missing architecture file. This baseline finding was repaired by the skills update; see ../agent-skills/README.md.

## Capability centers
Four existing services use the identical server SHA-256 f31443e3984f2f8271d3253217d283b71469de8a05cece423ee49651a9948e20.
The consolidated launcher loads four isolated instances in one Node process. Ports 8860â€“8863, identities, registries, routes, and network aliases are retained. These services provide registry displays and acknowledge dispatch; they do not execute dispatched work.

Source and all four original build contexts are included. Original registry bytes are preserved.
Tests passed before cutover: 12 endpoint comparisons, 4 missing-route checks, 4 acknowledgement-only checks.

Build from this directory:
```sh
docker compose -f compose.json build
docker compose -f compose.json up -d
```

The declared Node dependency is node:24.18.0-alpine. The workstation candidate was built using its already-present original center image, digest sha256:720a0f09247fca8365d3f211113425136cf1d840f28847f580e5cccff4803c5e, using the NODE_BASE build argument. A fresh upstream-base rebuild passed all 12 endpoint-equivalence, four negative-route and four dispatch-contract checks on 2026-09-16.

Do not run both stacks on their production ports. The controlled PowerShell cutover preserves originals for rollback and verifies registry equivalence. The legacy Compose file can rebuild the original four containers.

## Evidence boundaries
Inventory excludes secret values and host mount source paths. Full diagnostic evidence remains on the workstation. The inventory is a snapshot, not a health guarantee.
No stopped-container deletion is authorized by this file alone. Recovery requires source/image availability and preservation of writable-layer data, volumes, configuration, and receipts.
Formula health responded; Formula did not select or execute this migration. Desktop Commander diagnostics do not prove the official C3 ingress path.
