# LeeWay Docker organization and authority

This map describes the inspected runtime. The exact 50-container inventory, images, ports, source hashes, shared writable mounts and declared dependencies are recorded in SERVICE_INVENTORY.md and evidence/fleet-after.json.

| Responsibility | Runtime owner | Boundary |
|---|---|---|
| Procedural skill authority | 4citeB4U/LeeWay-Agent-Skills, pinned commit 66c976bb0e79e24503c847ef90929c6fb9d5d818 | Canonical skill definitions; this maintenance did not alter that repository |
| Skill discovery and runtime inspection | leeway_agent_skills | Serves 100 verified skills and eight legacy recipes; Docker visibility is read-only through Docker Reality |
| Capability-center interfaces | leeway_capability_centers | One process preserves four former service identities and four ports; dispatch acknowledges work rather than proving execution |
| Runtime governance and routing | leeway_runtime_fabric and its existing gateways | Not replaced by the skills adapter; official C3 execution proof remains open |
| Model serving | leeway_ollama | One active model server; redundant old instance removed, model volume preserved |
| File application and database | leeway-seafile, leeway-seafile-db, leeway-seafile-cache | Verified recovery pair and cache; source recipe pins immutable images and existing external volumes |
| Other applications, tools and media | Individual entries in SERVICE_INVENTORY.md | Retained where the inspection did not prove safe equivalence or redundancy |

## What was consolidated

Four byte-identical capability-center servers became one container with preserved contracts. The skills runtime now consumes canonical skills instead of introducing another authority. The isolated redundant Ollama server was removed. All 52 original stopped containers were preserved, recreation-tested and retired. Temporary Seafile recovery and rollback containers were retired after verified recovery preservation.

Separate databases, caches and application processes have different state and recovery requirements. Their shared deployment recipe is the organization boundary. Combining them into one process was not established as safe by this inspection.

## Remaining conflicts and incomplete capabilities

Six environment references point to missing running aliases; their exact source, setting and target appear in README.md. Those references were already unresolved in the running fleet before stopped-container retirement. They need contract-specific repairs; renaming another service would not establish compatibility.

Eight phone, email, calendar, browser, desktop, license, installer and PWA runtimes contain explicit work-order-only markers. Their code and reference build contexts are preserved in recovered-services. A future consolidation must preserve each service's state ownership and caller contract; the current report does not claim actual provider/device execution.

Five groups of shared writable mounts remain. The fleet evidence identifies the writers and destinations without publishing private host paths. Sharing alone is not proof of conflicting writes, and this pass does not establish exclusive write ownership.

## Reconstruction and evidence

The two changed custom applications passed fresh source builds and contract tests. Seafile's three-image recipe passed Compose validation and the recovered live application passed API, authenticated repository and read-only fsck checks. Eighteen further source contexts are published with provenance but have not passed fresh build verification. This is not a complete fresh-machine rebuild of all 50 services.

Private recovery archives, protected configuration and application data remain on the workstation. Public source does not contain credentials or a copy of private database contents. Recovery receipts identify archive hashes and verified boundaries.

C0 -> C1 -> C2 -> C3 CURRENT -> C4 -> C5 -> C6. Maintenance receipts are diagnostic; Formula execution and Learning Ledger updates were not performed, and C3 is not closed.

