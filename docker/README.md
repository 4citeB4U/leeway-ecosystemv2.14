# LeeWay Docker execution checkpoint — 2026-09-16

**Maintenance is partially executed. Workstation access timed out before stopped-container recovery verification and retirement could finish. This is not a production-ready declaration.**

## Last confirmed state

| Measure | Baseline | Last confirmed |
|---|---:|---:|
| Running containers | 54 | 50 |
| Original stopped/created containers | 52 | 52 retained |
| Total containers | 106 | 102 |

The 52 original stopped containers have not been issued removal commands. The running count fell through four-to-one capability-center consolidation and retirement of an isolated idle Ollama duplicate. The skills service was replaced one-for-one. Temporary candidates were removed.

## Completed

- Consolidated four byte-identical capability-center servers into one healthy container. Four identities, ports 8860–8863, registries and 12 legacy network aliases were preserved. These routes display registries and acknowledge dispatch; they do not execute dispatched work.
- Replaced the legacy skills container with a healthy service that preserves its eight workflow recipes and exposes 100 hash-verified canonical SKILL.md files from LeeWay-Agent-Skills commit `66c976bb0e79e24503c847ef90929c6fb9d5d818`.
- Added read-only access to the existing Docker Reality inventory through the skills service, and persistent skills/receipt state under the verified ecosystem root. No second execution authority or Docker socket was added to skills.
- Retired the disconnected, idle Ollama duplicate after image-archive reload verification. The active service's sorted 13-entry model inventory stayed stable during the resumed check; shared model storage was retained. The earlier unsorted comparison failed for an unproven reason and was not represented as a pass.
- Inspected configuration, mounts, networks and processes across the initial fleet, plus source structures inside 27 Python and nine Node services. These inventories distinguish implemented interfaces from successful end-to-end operations.
- Fresh upstream-base builds of the centers and skills recipes both passed their contract tests. Centers passed 12 endpoint comparisons, four missing-route checks and four acknowledgement-only dispatch checks. Skills passed canonical authority, legacy-recipe equivalence, live inventory, negative HTTP, tamper and missing-file checks.
- Preserved unrelated changes in the root repository by publishing from an isolated checkout.

Source: [capability centers](capability-centers/), [skills service](agent-skills/), [baseline and candidate evidence](evidence/). The older component READMEs describe earlier checkpoints; this page records the later confirmed execution state.

For a source-only skills image, use `Dockerfile.rebuild`; the older `Dockerfile` uses a workstation legacy image. Initialize the pinned authority submodule first. Fresh builds require application state and secrets to be supplied separately.

## Stopped-container recovery: pending final verification

The verified root is `D:\LeeWay\Ecosystem`. The backup set is `Archive/backups/stopped-docker-20260916-154303`.

- Full original configuration was protected with Windows DPAPI CurrentUser and its decryption checked.
- 44 stopped containers were committed as image snapshots. Eight whose original image metadata was unavailable were preserved as root-filesystem exports.
- The shared-layer image archive is 19,125,731,328 bytes.
- Its completed SHA-256 is `072A3ACF8F52E49A322B2B58AD80E960B9038E993081F1572F9ADA8AE9F23D3B`.
- Docker archive reload verification was running at the last confirmed checkpoint. Completion is **not yet confirmed**.
- Isolated create-without-start checks for all 52 and final removal are **not yet executed**.
- Original volumes, images and bind-mounted data were retained. Git does not contain private filesystem archives, secrets or application data.

The next operator must inspect the existing preservation process and receipts before doing anything else; do not rerun the backup or issue a prune. The saved workstation scripts are `Restore-LeeWayPreservedDocker-v1.ps1` and `Invoke-LeeWayStoppedDockerRetirement-v1.ps1` under `Archive/operator-scripts`. The retirement script requires archive verification and all isolated recreation checks before deletion.

## Remaining production blockers

Seafile returns HTTP 502 and is unhealthy. MariaDB responds, but `ccnet_db` and `seafile_db` have no tables. `seahub_db` has 100 tables and no `auth_user` entries. No schema reset or administrator creation was performed; authoritative data recovery must be established first.

Six running-service settings refer to names with no running Docker alias:

| Running service | Setting | Missing endpoint name |
|---|---|---|
| leeway_agent_workstation | WORKBOARD_BASE | leeway_workboard_runtime |
| agent_lee_code_mode | AGENT_LEE_VOICE_SERVICE | agent-lee-qwen-voice |
| leeway-opencode-control-mcp | LEEWAY_OPENCODE_URL | leeway-opencode-server |
| leeway_performance_runtime | AGENT_LEE_VOICE_URL | agent-lee-qwen-voice |
| leeway_media_router | LEEWAY_AGENT_LEE_URL | agent-lee |
| leeway_media_ingestion_layer | LEEWAY_AGENT_LEE_URL | agent-lee |

Eight phone/email/calendar/browser/desktop/license/installer/PWA runtimes explicitly identify themselves as work-order shells without completed provider/device execution. Further consolidation requires reconciling their state ownership and client contracts.

Forty running containers lack Docker health checks. Read-only checks found successful HTTP responses from 34 custom services after using the correct workstation and web routes. Forgejo MCP has a passing TCP health check but no `/health` route; Docker Reality is internal and was verified through the skills inventory bridge. None of these checks proves a complete business workflow.

Historical C:/E: bindings, relocated Compose labels, shared writable data ownership and full-fleet source/build publication remain unresolved. The stale July skills architecture manifest was not promoted to current truth.

## Proof boundaries

- These are `DIAGNOSTIC_ONLY_NOT_OFFICIAL` maintenance results. Official C3 ingress completion is not established.
- Formula health reported PASS, but Formula selection/execution was NOT_EXECUTED for these maintenance decisions.
- Learning Ledger was NOT_UPDATED in this pass.
- The correct baseline receipt is `docker-consolidation-discovery-20260916-152839.json`; earlier nested-array output reporting one container is superseded.
- Additional source audits, recovery scripts and fresh-build result files are saved on the workstation but their final publication is pending restored access.
- Desktop Commander returned HTTP 504 while the device registry still reported Agent-Lee online. No successful status read after that failure is assumed.
