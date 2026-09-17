# LeeWay container contents and consolidation decisions - 2026-09-17

The production engine currently has 50 running containers and no stopped production containers. Running is not a functional-readiness result: 44 of 63 checked Windows bind mounts are inaccessible inside 20 containers. D: files are readable in Windows and through a fresh, read-only WSL mount, but Docker Desktop's existing D: mount reports No such device. E: is absent from Windows and its Docker mounts also report No such device. The default and desktop-linux contexts point to the same engine.

The eight-module capability-suite candidate built from source and passed isolated tests. It was NOT promoted: its fixture data is not recovered production history. Original containers remain unchanged. Empty canonical directories do not prove that the inaccessible old E: state was empty.

The rows below describe executable interfaces, source dependencies and persisted-state behavior inspected in this pass and the preceding source audit. They do not claim successful external provider operations merely because a route or library is present.

| Container | What is inside / what it actually does | Consolidation decision |
|---|---|---|
| leeway_runtime_fabric | Node execution/routing service, /run interface, component/runtime APIs and Formula health interface; 170 source files inspected | Keep one execution authority |
| leeway_hybrid_fabric | One Node worker; polls Docker and service endpoints, discovers Ollama model tags, writes status JSON and an event log; serves /health and /state on 8777. Does not execute inference or control Docker | Move monitoring into the core monitoring layer after its consumers are mapped; it is not a second execution engine |
| agent_lee_code_mode | Node Agent Lee runtime; status, monitor, speaking and coding/control interfaces; 31 source files inspected | Core actor behind Runtime Fabric, not another governance authority |
| leeway_agent_workstation | Node workstation interface and integration bridge | Group with core UI; retain its client contract |
| leeway_digital_brain | Python Cognitive Fabric APIs for events, integrations and hardware/data views; 21 source files | Keep state ownership explicit; D:/E: mounts currently fail |
| leeway_docker_reality | Docker inventory/readiness adapter used by skills and the brain | Canonical Docker observation interface |
| leeway_agent_skills | Python skill-discovery API, 100 pinned canonical skills, eight legacy recipes and read-only runtime visibility | Retain as skill adapter; D: state and receipt mounts currently fail |
| leeway_capability_centers | One Node process preserving four former center interfaces on 8860-8863; dispatch acknowledges requests | Already consolidated from four containers |
| leeway_ollama | Ollama model server and shared model storage | Keep one inference server; prior duplicate removed |
| leeway_device_operator | Python device/channel registry, cursor profiles, license profiles and approval-mediated action requests; actual physical actions require a host/mobile adapter | Candidate module in the capability service, with its own state and approval contracts; E: data unavailable |
| leeway_performance_runtime | Python performance/rap/song/singing request APIs and voice-service requests; not proof of an independent music-generation model | Candidate capability module; E: data unavailable and voice target unresolved |
| leeway_phone_runtime | Python generic work-order and receipt API; no implemented phone provider | Verified equivalent module for capability suite; E: data unavailable |
| leeway_email_runtime | Same work-order engine, configured as email; no implemented email provider | Verified equivalent module for capability suite; E: data unavailable |
| leeway_calendar_runtime | Same work-order engine, configured as calendar; no implemented calendar provider | Verified equivalent module for capability suite; E: data unavailable |
| leeway_browser_runtime | Same work-order engine, configured as browser; no implemented browser automation engine | Verified equivalent module for capability suite; E: data unavailable |
| leeway_desktop_runtime | Same work-order engine, configured as desktop; no implemented physical desktop adapter | Verified equivalent module for capability suite; E: data unavailable |
| leeway_license_runtime | Same work-order engine, configured as licensing; not a complete licensing system | Verified equivalent module for capability suite; E: data unavailable |
| leeway_installer_runtime | Same work-order engine, configured as installer; does not execute installations | Verified equivalent module for capability suite; E: data unavailable |
| leeway_pwa_dashboard | Same work-order engine plus a small HTML page; not a complete PWA platform | Verified equivalent module for capability suite; E: data unavailable |
| leeway_document_runtime | Python document-creation and receipt endpoints | Workspace module candidate; E: documents/receipts unavailable |
| leeway_open_notebook | Python notebook creation, lookup and export-related interfaces | Workspace module candidate; E: notebooks/receipts unavailable |
| leeway_artifact_viewer | Python PDF/artifact and room-view interfaces reading document/notebook state | Workspace module candidate; four E: mounts unavailable |
| leeway_meeting_runtime | Python meeting-record/session interfaces | Workspace module candidate; does not replace the Jitsi media stack; E: state unavailable |
| leeway_context_gateway | Python text compression/retrieval, hashing, stored-context statistics and failure-learning records | Core context module candidate; E: context/receipts unavailable |
| leeway_api_gateway | Python capability/health discovery, research and approval-routing interfaces | Core gateway module candidate; E: approvals/CRM/receipts unavailable |
| leeway_research_lane | Python quick/deep research and HTML brief interfaces | Core research module candidate; E: briefs/receipts unavailable |
| leeway_seafile_storage_gateway | Python store-receipt, research-brief and notebook-export adapter | Storage integration module candidate; three E: mounts unavailable |
| agent-lee-ears-kernel | Python/FastAPI with faster-whisper; audio transcription and text routing; C: audio, transcripts and inbox mounts | Sensory subsystem; actual transcription worker, not equivalent to a work-order shell |
| agent-lee-voice-kernel | Python/FastAPI, Torch, torchaudio, TTS.api and audio-processing modules; /tts, audio retrieval and voice identity | Sensory subsystem; preserve model/runtime dependencies before combining processes |
| agent-lee-vision-kernel | Python vision request adapter, Qwen vision client, input optimizer, room policy, response validation and receipts | Sensory subsystem; adapter is separate from the model-serving backend |
| leeway_media_router | Node media-routing service | Sensory integration module candidate; configured Agent Lee alias is unresolved |
| leeway_media_ingestion_layer | Node upload, URL ingestion and stream start/stop service | Sensory integration module candidate; configured Agent Lee alias is unresolved |
| leeway-triposr-web | Node 3D-tool frontend/API proxy and configuration/audit interfaces; 191 source files | One 3D application group |
| leeway-triposr-backend | Python job/generation/manifest orchestration API; shared output and receipt stores | 3D application backend; retain job and storage contracts |
| leeway-triposr-reconstruction | Python mesh-from-path reconstruction worker and generated artifact viewer | 3D compute worker; evaluate consolidation against real model dependencies |
| leeway-seafile | Seafile application and web backend; recovered pair passed live API, authenticated repository and read-only integrity checks | One storage application group |
| leeway-seafile-db | MariaDB 10.11 holding Seafile metadata; active verified recovery volume | Keep database recovery boundary |
| leeway-seafile-cache | Memcached process used by Seafile | Keep cache dependency in the storage group |
| leeway-forgejo | Forgejo Git hosting service and persisted repository data | Developer-tools group; not interchangeable with its MCP adapter |
| leeway-forgejo-mcp | MCP adapter exposing Forgejo operations | Developer-tools integration module candidate |
| leeway-opencode-control-mcp | Node MCP/control adapter for an OpenCode server | Target server reference is unresolved; this adapter alone is not a working coding backend |
| leeway-bitwarden-lite | Bitwarden credential-vault service and C: persisted configuration/data | Preserve separate credential boundary |
| leeway-n8n-dev | n8n workflow automation service | Workflow application group; not another Runtime Fabric |
| leeway-gravitino | Apache Gravitino data-catalog service with JDBC storage | Data-catalog role; assess actual consumers before retaining/promoting |
| leeway-transit-hub-web | Transit Hub static web application | One Transit Hub application group |
| leeway-transit-hub-sqlserver-dev | SQL Server database for the Transit Hub development deployment | Keep database/data recovery boundary; assess production need |
| leeway-jitsi-meet-web-1 | Jitsi meeting web frontend and web-side configuration | One communications application group |
| leeway-jitsi-meet-jicofo-1 | Jitsi conference coordinator | Distinct protocol role in the same group |
| leeway-jitsi-meet-jvb-1 | Jitsi media bridge forwarding conference media | Distinct network/media role in the same group |
| leeway-jitsi-meet-prosody-1 | Prosody XMPP signaling server | Distinct signaling role in the same group |

## Built consolidation

The eight work-order services have byte-equivalent source after normalizing their service name. The candidate uses one Python process, one common application factory and eight port-selected modules. Legacy ports and network names are represented in the deployment recipe; state and receipts are separated by module.

Verified with isolated fixtures: eight identities, status responses, Host-header routing isolation, invalid-request rejection, work-order creation, receipt ownership, persistence across restart, and HTTP 503 when a receipt directory becomes unavailable. Existing work-order shells report health without checking those mounts.

## Safe next deployment boundary

Repair Docker Desktop's stale D: sharing and reconcile the original E: state with authoritative migration/backup evidence before promotion. Do not interpret the empty D: copies as proof that historical data never existed. Do not delete currently needed containers merely because they stop during a drive-sharing failure.

The Docker Desktop circle's exact meaning has not been established from a screenshot. Docker's Containers view includes both individual containers and Compose applications. Counts and project membership were read directly from the engine; the UI color is not the evidence for functional health.

C0 -> C1 -> C2 -> C3 CURRENT -> C4 -> C5 -> C6. This remains diagnostic maintenance, not official C3 closure.

