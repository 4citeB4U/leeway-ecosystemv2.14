# Running service inventory

Snapshot: 2026-09-16T23:21:42.164Z. Source routes show implemented interfaces, not successful business workflows. Vendor entries describe image/process roles; their complete operations were not exercised.

| Container | Docker health | Source files inspected | Observed interface or role |
|---|---|---:|---|
| leeway-seafile | healthy | vendor | File application; recovered pair, HTTP 200 and repository integrity verified |
| leeway-seafile-db | healthy | vendor | MariaDB; recovered database clone, authenticated application verified |
| leeway_agent_skills | healthy | 4 | GET /health; GET /status; GET /skills; GET /skills/{name}; GET /skills/search |
| leeway_capability_centers | healthy | 4 | Source structure and process inspected; see linked evidence |
| leeway_digital_brain | healthy | 21 | GET /brain/events; POST /brain/integrations/workstation/events; POST /brain/integrations/storage/events; GET /brain/hardware; GET /brain/hardware/alerts |
| leeway_docker_reality | not-configured | 1 | Source structure and process inspected; see linked evidence |
| leeway_runtime_fabric | not-configured | 170 | GET /health; POST /run; GET /; GET /api/health; GET /api/components |
| leeway_agent_workstation | healthy | 2 | Source structure and process inspected; see linked evidence |
| agent_lee_code_mode | not-configured | 31 | GET /runtime/status; GET /runtime/health; GET /mini-ui; GET /runtime/monitors; POST /runtime/speak |
| leeway-n8n-dev | healthy | vendor | Workflow automation server |
| agent-lee-voice-kernel | healthy | 12 | GET /; GET /health; GET /ready; GET /capabilities; GET /metrics |
| leeway-seafile-cache | not-configured | vendor | Seafile cache process |
| leeway_hybrid_fabric | not-configured | 1 | Source structure and process inspected; see linked evidence |
| leeway-opencode-control-mcp | not-configured | 2 | Source structure and process inspected; see linked evidence |
| leeway-forgejo-mcp | healthy | 3 | Source structure and process inspected; see linked evidence |
| leeway_ollama | not-configured | vendor | Model serving; 13 model entries retained |
| leeway-gravitino | not-configured | vendor | Catalog service with JDBC data store |
| leeway-bitwarden-lite | not-configured | vendor | Credential vault service |
| leeway-forgejo | not-configured | vendor | Git hosting service |
| leeway-transit-hub-web | healthy | vendor | Static web frontend |
| leeway-transit-hub-sqlserver-dev | not-configured | vendor | SQL Server data service |
| leeway-triposr-web | not-configured | 191 | GET /api/status; GET /api/audit; GET /api/health; GET /api/leeway/config; POST /api/leeway/config |
| leeway-triposr-backend | not-configured | 7 | GET /health; GET /health/verify; GET /manifest/{job_id}; GET /api/v1/generate; GET /api/jobs/{job_id} |
| leeway-triposr-reconstruction | not-configured | 1 | GET /health; GET /status; POST /mesh/from-path; GET /latest; GET /latest/viewer.html |
| leeway_device_operator | not-configured | 1 | GET /health; GET /status; GET /cursor/profile; POST /cursor/set-profile; POST /devices/register |
| leeway_performance_runtime | not-configured | 1 | GET /health; GET /status; POST /performance/create; POST /rap/create; POST /song/create |
| leeway_pwa_dashboard | not-configured | 1 | Work-order shell; provider/device execution not implemented |
| leeway_installer_runtime | not-configured | 1 | Work-order shell; provider/device execution not implemented |
| leeway_license_runtime | not-configured | 1 | Work-order shell; provider/device execution not implemented |
| leeway_desktop_runtime | not-configured | 1 | Work-order shell; provider/device execution not implemented |
| leeway_browser_runtime | not-configured | 1 | Work-order shell; provider/device execution not implemented |
| leeway_phone_runtime | not-configured | 1 | Work-order shell; provider/device execution not implemented |
| leeway_calendar_runtime | not-configured | 1 | Work-order shell; provider/device execution not implemented |
| leeway_email_runtime | not-configured | 1 | Work-order shell; provider/device execution not implemented |
| leeway_artifact_viewer | not-configured | 1 | GET /health; GET /status; GET /artifacts/pdf/{filename}; GET /artifacts/latest; GET /rooms/latest |
| leeway_open_notebook | not-configured | 1 | GET /health; GET /status; POST /notebook/create; GET /notebook/latest; GET /notebook/{notebook_id} |
| leeway_meeting_runtime | not-configured | 1 | GET /health; GET /status; POST /meeting/create; GET /meeting/latest; GET /meeting/{meeting_id} |
| leeway_document_runtime | not-configured | 1 | GET /health; GET /status; POST /document/create; GET /documents/latest; GET /receipts/latest |
| leeway_context_gateway | not-configured | 1 | GET /health; GET /status; POST /compress; POST /retrieve; GET /stats |
| leeway_api_gateway | not-configured | 1 | GET /health; GET /status; GET /capabilities; GET /lanes/health; POST /research/quick |
| leeway_research_lane | not-configured | 1 | GET /health; GET /status; POST /search/quick; POST /search/deep; POST /brief/html |
| leeway_seafile_storage_gateway | not-configured | 1 | GET /health; GET /status; POST /store/receipt; POST /store/research-brief; POST /store/notebook-export |
| leeway-jitsi-meet-web-1 | not-configured | vendor | Meeting web frontend |
| leeway-jitsi-meet-jicofo-1 | not-configured | vendor | Conference coordination process |
| leeway-jitsi-meet-jvb-1 | not-configured | vendor | Media bridge process |
| leeway-jitsi-meet-prosody-1 | not-configured | vendor | XMPP signaling process |
| agent-lee-ears-kernel | not-configured | 1 | GET /; GET /health; GET /ears/status; POST /ears/route-text; POST /ears/transcribe |
| leeway_media_router | not-configured | 1 | Source structure and process inspected; see linked evidence |
| leeway_media_ingestion_layer | not-configured | 1 | GET /media-ingestion/status; POST /media-ingestion/upload; POST /media-ingestion/from-url; POST /media-ingestion/stream/start; POST /media-ingestion/stream/stop |
| agent-lee-vision-kernel | not-configured | 7 | GET /health; GET /vision/status; GET /vision/manifest; GET /vision/model; POST /vision/analyze/image |
