# LeeWay Docker execution checkpoint - 2026-09-16

**Maintenance is partially executed. Archive reload succeeded. The guarded retirement process later exited with an error, and intermittent workstation access has prevented final state reconciliation. This is not a production-ready declaration.**

## Last stable fleet before recovery probes

| Measure | Baseline | Last confirmed |
|---|---:|---:|
| Running containers | 54 | 50 |
| Original stopped/created containers | 52 | 52 retained |
| Total containers | 106 | 102 |

The table records the fleet before the guarded retirement sequence. Do not treat 102 as a current total: final removal state and temporary recovery-probe cleanup require reconciliation. At the last readable manifest, zero originals had been removed; the retirement process subsequently exited with an error. The running count fell through four-to-one capability-center consolidation and retirement of an isolated idle Ollama duplicate. The skills service was replaced one-for-one. Temporary candidates were removed.

## Completed

- Consolidated four byte-identical capability-center servers into one healthy container. Four identities, ports 8860-8863, registries and 12 legacy network aliases were preserved. These routes display registries and acknowledge dispatch; they do not execute dispatched work.
- Replaced the legacy skills container with a healthy service that preserves its eight workflow recipes and exposes 100 hash-verified canonical SKILL.md files from LeeWay-Agent-Skills commit `66c976bb0e79e24503c847ef90929c6fb9d5d818`.
- Added read-only access to the existing Docker Reality inventory through the skills service, and persistent skills/receipt state under the verified ecosystem root. No second execution authority or Docker socket was added to skills.
- Retired the disconnected, idle Ollama duplicate after image-archive reload verification. The active service's sorted 13-entry model inventory stayed stable during the resumed check; shared model storage was retained. The earlier unsorted comparison failed for an unproven reason and was not represented as a pass.
- Inspected configuration, mounts, networks and processes across the initial fleet, plus source structures inside 27 Python and nine Node services. These inventories distinguish implemented interfaces from successful end-to-end operations.
- Fresh upstream-base builds of the centers and skills recipes both passed their contract tests. Centers passed 12 endpoint comparisons, four missing-route checks and four acknowledgement-only dispatch checks. Skills passed canonical authority, legacy-recipe equivalence, live inventory, negative HTTP, tamper and missing-file checks.
- Recovered and published live app.py source plus reference build inputs for 18 additional services. The local Services source files differed from the running bytes; source-provenance.json records this drift. These 18 reference builds are not fresh-build certified.
- Preserved unrelated changes in the root repository by publishing from an isolated checkout.

Source: [capability centers](capability-centers/), [skills service](agent-skills/), [18 recovered services](recovered-services/), [recovery scripts](recovery/), [baseline and candidate evidence](evidence/). The older component READMEs describe earlier checkpoints; this page records the later confirmed execution state.

For a source-only skills image, use `Dockerfile.rebuild`; the older `Dockerfile` uses a workstation legacy image. Initialize the pinned authority submodule first. Fresh builds require application state and secrets to be supplied separately.

## Stopped-container recovery: pending final verification

The verified root is `D:\LeeWay\Ecosystem`. The backup set is `Archive/backups/stopped-docker-20260916-154303`.

- Full original configuration was protected with Windows DPAPI CurrentUser and its decryption checked.
- 44 stopped containers were committed as image snapshots. Eight whose original image metadata was unavailable were preserved as root-filesystem exports.
- The shared-layer image archive is 19,125,731,328 bytes.
- Its completed SHA-256 is `072A3ACF8F52E49A322B2B58AD80E960B9038E993081F1572F9ADA8AE9F23D3B`.
- Docker archive reload verification completed successfully, recorded at 2026-09-16T21:46:54Z in the preservation receipt.
- The guarded retirement process started. Its output explicitly confirmed isolated recreation for at least 34 containers, then reported process exit code 1. The remaining output and final manifest must be reconciled before claiming completion or rerunning anything.
- Original volumes, images and bind-mounted data were retained. Git does not contain private filesystem archives, secrets or application data.

The next operator must read the tail of Desktop Commander process 33324 and the current preservation-manifest.json / restore-tests.json before doing anything else. Do not rerun completed preservation or repeat deletion blindly. The archive is already verified. The saved workstation scripts are `Restore-LeeWayPreservedDocker-v1.ps1` and `Invoke-LeeWayStoppedDockerRetirement-v1.ps1` under `Archive/operator-scripts`. The retirement script requires archive verification and all isolated recreation checks before deletion.

## Remaining production blockers

Seafile returns HTTP 502 and is unhealthy. MariaDB responds, but `ccnet_db` and `seafile_db` have no tables. `seahub_db` has 100 tables and no `auth_user` entries. No schema reset or administrator creation was performed.

A preserved, unused volume named `leeway-seafile-db-data` was subsequently found. Inspection on a separate clone found 12 ccnet tables, 39 seafile tables, 110 seahub tables, one existing email account and two repositories. A cloned application/database/cache stack on an internal network became Docker-healthy. An internal API ping returned HTTP 200, service database authentication passed, and both repository head objects matched the cloned current data files. The vendor's read-only fsck completed for both repositories with exit 0 and zero failure signals. See the [Seafile 11 integrity-check documentation](https://manual.seafile.com/11.0/maintain/seafile_fsck/).

Production Seafile has NOT been switched. The recovered database root credential differs from the current database container's environment, although the application service credential works. Reconcile that on the clone before any promotion. The candidate test's host-side probe could not establish access through its internal network; the internal ping, database query and fsck are separate confirmed evidence. Source volumes were retained.

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
- Source audits, recovery scripts, fresh-build result files and the 18 recovered build contexts are published in this branch. Later Seafile recovery evidence and final retirement results still require publication.
- The native Docker API-version field is Server.APIVersion; the workstation restore helper was corrected before its successful recreation checks.
- Desktop Commander access recovered after the first HTTP 504, then became intermittent again. No unobserved action or final state is assumed.
