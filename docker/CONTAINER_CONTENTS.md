# LeeWay running container contents - 43 containers

Current checkpoint: storage access restored; eight duplicated shells consolidated. See CURRENT_STATUS.md and evidence/consolidation-live-20260917.json. Provider execution remains unverified where noted.

| Container | What is inside / what it actually does | Consolidation decision |
|---|---|---|
| leeway_runtime_fabric | Node execution/routing service, /run interface, component/runtime APIs and Formula health interface; 170 source files inspected | Keep one execution authority |
| leeway_hybrid_fabric | One Node worker; polls Docker and service endpoints, discovers Ollama model tags, writes status JSON and an event log; serves /health and /state on 8777. Does not execute inference or control Docker | Move monitoring into the core monitoring layer after its consumers are mapped; it is not a second execution engine |
| agent_lee_code_mode | Node Agent Lee runtime; status, monitor, speaking and coding/control interfaces; 31 source files inspected | Core actor behind Runtime Fabric, not another governance authority |
| leeway_agent_workstation | Node workstation interface and integration bridge | Group with core UI; retain its client contract |
| leeway_digital_brain | Python Cognitive Fabric APIs for events, integrations and hardware/data views; 21 source files | Keep state ownership explicit; storage access restored |
| leeway_docker_reality | Docker inventory/readiness adapter used by skills and the brain | Canonical Docker observation interface |
| leeway_agent_skills | Python skill-discovery API, 100 pinned canonical skills, eight legacy recipes and read-only runtime visibility | Retain as skill adapter; storage access restored |
| leeway_capability_centers | One Node process preserving four former center interfaces on 8860-8863; dispatch acknowledges requests | Already consolidated from four containers |
| leeway_ollama | Ollama model server and shared model storage | Keep one inference server; prior duplicate removed |
| leeway_device_operator | Python device/channel registry, cursor profiles, license profiles and approval-mediated action requests; actual physical actions require a host/mobile adapter | Candidate module in the capability service, with its own state and approval contracts; storage access restored |
| leeway_performance_runtime | Python performance/rap/song/singing request APIs and voice-service requests; not proof of an independent music-generation model | Candidate capability module; storage access restored and voice target unresolved |
| leeway_document_runtime | Python document-creation and receipt endpoints | Workspace module candidate; storage access restored |
| leeway_open_notebook | Python notebook creation, lookup and export-related interfaces | Workspace module candidate; storage access restored |
| leeway_artifact_viewer | Python PDF/artifact and room-view interfaces reading document/notebook state | Workspace module candidate; storage access restored |
| leeway_meeting_runtime | Python meeting-record/session interfaces | Workspace module candidate; does not replace the Jitsi media stack; storage access restored |
| leeway_context_gateway | Python text compression/retrieval, hashing, stored-context statistics and failure-learning records | Core context module candidate; storage access restored |
| leeway_api_gateway | Python capability/health discovery, research and approval-routing interfaces | Core gateway module candidate; storage access restored |
| leeway_research_lane | Python quick/deep research and HTML brief interfaces | Core research module candidate; storage access restored |
| leeway_seafile_storage_gateway | Python store-receipt, research-brief and notebook-export adapter | Storage integration module candidate; storage access restored |
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
| leeway_capability_suite | One Python process, eight port-selected work-order/receipt modules; legacy ports and DNS names preserved; state on canonical D: | Promoted and restart/persistence verified; original eight retired with rollback archive |
