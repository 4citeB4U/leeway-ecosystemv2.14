# LeeWay Docker execution checkpoint - 2026-09-16

Executed on the verified LeeWay workstation through Desktop Commander. This is a diagnostic and recovery checkpoint, not production certification or official C3 ingress proof.

## Completed changes

| Measure | Before | After |
|---|---:|---:|
| Total containers | 106 | 50 |
| Running | 54 | 50 |
| Stopped or created | 52 | 0 |

- Consolidated four byte-identical capability-center servers into one container, preserving four identities, ports 8860-8863, registries and 12 legacy network aliases. Their dispatch route acknowledges requests; it does not execute work.
- Linked the skills service to the canonical LeeWay-Agent-Skills commit 66c976bb0e79e24503c847ef90929c6fb9d5d818: 100 verified SKILL.md files, eight preserved legacy recipes, persistent local state and read-only live Docker inventory.
- Removed the isolated idle Ollama duplicate after image archive reload, shared-volume verification and a stable sorted 13-entry model inventory.
- Preserved and removed all 52 original stopped/created containers: 44 image snapshots and eight root-filesystem export fallbacks. Native archive reload and 52 isolated create-without-start tests passed before original deletion.
- Retained original volumes and images. No system prune, volume prune, original data-volume deletion, or image deletion was performed. Temporary restore-test anonymous volumes were removed only with their never-started test containers.

## Source and recovery material

[Organization and authority map](ORGANIZATION.md), [Seafile deployment](seafile/README.md), [Capability-center source and Compose](capability-centers/README.md), [skills source, pinned submodule and Compose](agent-skills/README.md), [all running services](SERVICE_INVENTORY.md), [execution receipts](evidence/execution-receipts.json), [recovery instructions](recovery/README.md).
The source audits cover 27 Python services and nine Node services. They record source hashes, interfaces and dependency clues without importing application code. The inventory also inspects the remaining vendor containers and process/mount/network configuration.
This publication is not a complete fresh-machine rebuild of the entire fleet. The two changed applications have source and build recipes; their fresh upstream-base builds and full contract tests passed. Eighteen additional live service sources and reference build contexts are published in recovered-services with provenance; their fresh builds are not verified. Remaining build contexts still require reconciliation. Private filesystem snapshots, secrets and application data are not committed to this public repository.

## Remaining production work

1. Seafile recovered: the verified application/database pair now passes live HTTP ping, service database authentication, both repository heads and read-only fsck. The first database-only cutover failed and rolled back; the verified pair cutover followed. Original volumes and protected configuration remain preserved. A real user login/upload workflow has not been exercised. See seafile/README.md and evidence/seafile-production-recovery.json.
2. Six running-service environment references have no running alias. Their end-to-end functions are not repaired by container cleanup:

| Source | Setting | Missing endpoint name |
|---|---|---|
| leeway_agent_workstation | WORKBOARD_BASE | leeway_workboard_runtime |
| agent_lee_code_mode | AGENT_LEE_VOICE_SERVICE | agent-lee-qwen-voice |
| leeway-opencode-control-mcp | LEEWAY_OPENCODE_URL | leeway-opencode-server |
| leeway_performance_runtime | AGENT_LEE_VOICE_URL | agent-lee-qwen-voice |
| leeway_media_router | LEEWAY_AGENT_LEE_URL | agent-lee |
| leeway_media_ingestion_layer | LEEWAY_AGENT_LEE_URL | agent-lee |

3. Eight phone/email/calendar/browser/desktop/license/installer/PWA runtimes explicitly state that they are work-order shells, not completed provider/device execution. They are candidates for a shared service after state ownership and client contracts are reconciled.
4. 40 running containers lack Docker health checks. A successful GET or a green container check does not establish business-workflow correctness.
5. Historical C:/E: bindings, relocated Compose labels, and the legacy skills architecture manifest still need source/data reconciliation. The July architecture snapshot was deliberately not promoted to live truth.
6. Shared writable mounts remain and need ownership review. Sharing does not by itself prove conflicting writes:
- leeway-triposr-backend:/opt/leeway/receipts / leeway-triposr-reconstruction:/opt/leeway/receipts
- leeway-triposr-backend:/var/lib/leeway/outputs / leeway-triposr-reconstruction:/var/lib/leeway/outputs
- leeway_artifact_viewer:/documents / leeway_document_runtime:/documents
- leeway_artifact_viewer:/notebooks / leeway_open_notebook:/notebooks
- leeway_context_gateway:/app/receipts / leeway_api_gateway:/app/receipts / leeway_research_lane:/app/briefs / leeway_research_lane:/app/receipts

## Evidence and continuity boundaries

- Correct baseline is 106 containers in docker-consolidation-discovery-20260916-152839.json. Earlier discovery output with a nested-array count of one is superseded, not authoritative.
- All 52 original recreation tests passed. Retirement was interrupted by an unavailable backup path; the resume reconciled 11 already absent containers and removed the remaining 41. Two of the prior absences were not recorded in the last saved manifest, so their removal timing is not asserted. Progress was then saved using verified temporary files and replacement backups. An unsorted Ollama comparison failed; its cause was not proven. The resumed operation separately verified sorted model identities and archive reload.
- C0 -> C1 -> C2 -> C3 CURRENT -> C4 -> C5 -> C6 remains the continuity path. These direct diagnostics do not establish official C3 completion.
- Formula health reported PASS, but Formula selection/execution was NOT_EXECUTED for these maintenance decisions. Learning Ledger was NOT_UPDATED in this maintenance pass.
- Root repository unrelated changes were preserved; publication used an isolated checkout and branch.
