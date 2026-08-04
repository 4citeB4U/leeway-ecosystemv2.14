# Agent Lee Skills Universe Master Governance - 448S

## Governance State

Agent Lee skills are now defined as a governed Skills Universe, not floating tools.

- Skills Universe governance defined: True
- Skill domains defined: 11
- Skill governance rules defined: 10
- Unique skill containers mapped: 45
- Skill awareness complete: True
- Skill execution allowed now: false
- Runtime execution allowed now: false
- Docker exec allowed now: false
- Docker mutation allowed now: false
- Device control allowed now: false
- Package creation allowed now: false

## Skill Domains

### SKILL_DOMAIN_01 - Executive Behavior and Persona
- Purpose: Govern Agent Lee as a high-executive operator with bounded tone, authority, truthfulness, escalation, and receipt discipline.
- Risk: high
- Containers: leeway_executive_runtime, leeway_agent_skills
- Execution allowed now: false

### SKILL_DOMAIN_02 - Skill Router and Skill Registry
- Purpose: Govern skills as registered capabilities with signatures, requirements, risks, gates, receipts, and non-sovereign authority.
- Risk: high
- Containers: leeway_skill_router, leeway_agent_skills
- Execution allowed now: false

### SKILL_DOMAIN_03 - Creation Fabric
- Purpose: Govern image generation, image-to-3D, artifact viewing, statue creation, video assembly, rendering, and creative pipelines.
- Risk: high
- Containers: agent-lee-sdxl-lightning-image-lane, agent-lee-image-to-3d-pattern-lane, leeway_artifact_viewer
- Execution allowed now: false

### SKILL_DOMAIN_04 - Notebook, Research, and Long-Form Thinking
- Purpose: Govern open notebook, research lane, long-form analysis, storyboarding, scoring, knowledge synthesis, and evidence gathering.
- Risk: medium_high
- Containers: leeway_open_notebook, leeway_research_lane
- Execution allowed now: false

### SKILL_DOMAIN_05 - Memory and Context
- Purpose: Govern context gateway, Seafile storage gateway, memory retrieval, memory writing, evidence archive, and long-term continuity.
- Risk: high
- Containers: leeway_context_gateway, leeway_seafile_storage_gateway
- Execution allowed now: false

### SKILL_DOMAIN_06 - Voice, Ears, and Speech
- Purpose: Govern Qwen voice, TTS, STT, persona voice alignment, audio input/output, and voice-generation boundaries.
- Risk: high
- Containers: agent-lee-qwen-voice
- Execution allowed now: false

### SKILL_DOMAIN_07 - Eyes, Vision, and Artifact Awareness
- Purpose: Govern camera/vision, visual analysis, image interpretation, visual artifact review, and visual safety boundaries.
- Risk: high
- Containers: leeway_artifact_viewer, agent-lee-sdxl-lightning-image-lane
- Execution allowed now: false

### SKILL_DOMAIN_08 - Hands, Desktop, Browser, and Phone
- Purpose: Govern desktop actuator, browser autonomy, phone runtime, cursor/keyboard actions, ADB/IPP/Apple bridge boundaries, and physical/digital action permits.
- Risk: critical
- Containers: leeway_desktop_runtime, leeway_browser_runtime, leeway_phone_runtime
- Execution allowed now: false

### SKILL_DOMAIN_09 - Business, Communications, and Chief of Staff
- Purpose: Govern email, calendar, meeting, workboard, documents, scheduling, outreach, CRM/Rolodex, and administrative workflows.
- Risk: high
- Containers: leeway_email_runtime, leeway_calendar_runtime, leeway_meeting_runtime, leeway_document_runtime, leeway_workboard_runtime
- Execution allowed now: false

### SKILL_DOMAIN_10 - Performance, Hybrid Fabric, and Capability Booster
- Purpose: Govern performance runtime, Leeway Hybrid Fabric, acceleration/booster lanes, self-optimization plans, and non-mutating capability improvement.
- Risk: high
- Containers: leeway_performance_runtime
- Execution allowed now: false

### SKILL_DOMAIN_11 - External Messaging and Social Broadcast
- Purpose: Govern Telegram shell, social staging, YouTube/TikTok/Patreon workflows, notifications, posting, and external messaging.
- Risk: critical
- Containers: agent-lee-telegram-shell, leeway_browser_runtime
- Execution allowed now: false

## Mandatory Rules
- SKILL_RULE_01: All Agent Lee skills are non-sovereign capabilities. They cannot self-execute, self-register, self-upgrade, or self-approve.
- SKILL_RULE_02: Every skill must have a registry signature before it can become executable: name, domain, risk, authority, inputs, outputs, required hardware, memory access, device access, network access, receipt path, and rollback notes.
- SKILL_RULE_03: Skills that touch devices, desktop, browser, phone, Telegram, models, voice, image, video, external accounts, or physical action are high-risk or critical and remain blocked until scoped approval.
- SKILL_RULE_04: Memory skills may read or write only through governed context and evidence paths; Seafile, context gateway, and Archive proofs require receipt-bound access.
- SKILL_RULE_05: Self-learning is allowed only as simulation-first evaluation, benchmark scoring, skill-gap reporting, and receipt writing unless a later gate authorizes mutation.
- SKILL_RULE_06: Agent Lee persona and executive behavior are governed outputs; persona may not override truth, safety, law, owner authority, or Runtime Fabric gates.
- SKILL_RULE_07: Leeway Hybrid Fabric is treated as a performance/capability fabric, not an execution bypass; booster lanes cannot override governance.
- SKILL_RULE_08: No skill execution, runtime execution, model call, Docker exec, Docker mutation, device control, browser control, Telegram posting, memory migration, or package creation is authorized by this governance record.
- SKILL_RULE_09: Skills must maintain continuous self-awareness through Discovery, Runtime Fabric, Device Layer, Standards, and Agent Lee governance records before execution is considered.
- SKILL_RULE_10: Skill training and simulations must produce receipts, scores, failure modes, rollback notes, and human-review flags before any capability is promoted.
