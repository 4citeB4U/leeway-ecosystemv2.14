# Agent Lee Code Mode Operating Map

Use this reference when the user asks Agent Lee to work across the Leeway Ecosystem v2.1.4 runtime, skills universe, benchmark suite, or codebase. Treat the user-provided local Windows paths as the canonical layout unless a later manifest, repository, or uploaded file supersedes them.

## Canonical local root

```text
E:\.LeeWay-Produucts-File\Leeway-Ecosystem v2.1.4
```

Major roots:

- `Leeway Runtime Fabric`: production/runtime modules, skills infrastructure, hardware/robotics/device layers, deployment, ledgers, risk, tools, and training logs.
- `leeway-80-bench`: benchmark harness, agents, contracts, levels, rubrics, reports, recordings, workers, workflows, simulations, and benchmark-scoped skills.

Do not assume direct filesystem access to these Windows paths from ChatGPT. When files are not uploaded or accessible through connectors, ask the user to upload the relevant files or provide a directory listing, manifest, repo link, or archive. If access is unavailable, work from the path map and state the limitation.

## Runtime Fabric domains

### Agent runtime and identity

Paths:

- `Leeway Runtime Fabric\agent-lee-expression-runtime`
- `Leeway Runtime Fabric\agent-lee-entity-identity-runtime`
- `Leeway Runtime Fabric\agent-training`
- `Leeway Runtime Fabric\training-logs`

Purpose:

- Expression/runtime behavior for Agent Lee.
- Entity identity, persona, continuity, and identity-bound runtime context.
- Training workflows and logs.

Code mode behavior:

- Inspect identity/runtime contracts before modifying behavior.
- Preserve compatibility between expression runtime and entity identity runtime.
- Treat training logs as evidence, not source-of-truth configuration.
- Separate persona/identity logic from tool execution logic.

### Skills and capability system

Paths:

- `Leeway Runtime Fabric\skills`
- `Leeway Runtime Fabric\skills-gateway`
- `Leeway Runtime Fabric\skills-university`
- `Leeway Runtime Fabric\skills-university-exports`
- `Leeway Runtime Fabric\capability-registry`
- `Leeway Runtime Fabric\capability-augmentation`

Purpose:

- Skill storage, routing, export, registry, augmentation, and capability discovery.

Code mode behavior:

- Treat `skills-university` as the teaching/source library.
- Treat `skills-university-exports` as packaged/distributable outputs.
- Treat `skills-gateway` as the runtime bridge between Agent Lee and executable skills.
- Treat `capability-registry` as the source of available capability metadata.
- Treat `capability-augmentation` as the layer that extends or composes capabilities.
- When adding a skill, update its package, metadata, registry entry, gateway routing, and export artifact where applicable.

### Automation, tools, deployment, ownership

Paths:

- `Leeway Runtime Fabric\automation-runtime`
- `Leeway Runtime Fabric\tools`
- `Leeway Runtime Fabric\deploy`
- `Leeway Runtime Fabric\deployment-ownership-runtime`
- `Leeway Runtime Fabric\provider-fabric`

Purpose:

- Automation execution, tool inventory, deployment workflows, owner mapping, and provider integration.

Code mode behavior:

- Identify owners before changing deployment-sensitive files.
- Keep provider-specific logic isolated in provider fabric.
- Add test/rollback notes for deployment changes.
- Avoid mixing automation logic with skill instruction content unless gateway routing requires it.

### Device, hardware, robotics, simulation

Paths:

- `Leeway Runtime Fabric\device-intelligence`
- `Leeway Runtime Fabric\device-os`
- `Leeway Runtime Fabric\hardware-intelligence`
- `Leeway Runtime Fabric\hardware-archeology`
- `Leeway Runtime Fabric\physical-intelligence-engine`
- `Leeway Runtime Fabric\real-world-hardware`
- `Leeway Runtime Fabric\real-device-hardening`
- `Leeway Runtime Fabric\robotics-runtime`
- `Leeway Runtime Fabric\stem-robotics-os`
- `Leeway Runtime Fabric\iot-os`
- `Leeway Runtime Fabric\sim-runtime`
- `Leeway Runtime Fabric\simulations`
- `Leeway Runtime Fabric\ffmpeg-full-shared`

Purpose:

- Device and hardware abstractions, robotics execution, physical intelligence, real-device hardening, IoT, simulation, and media/runtime dependencies.

Code mode behavior:

- Treat real-device paths as safety-critical.
- Prefer simulation first, then bench/harness, then real-device execution.
- Require explicit test plans for hardware, robotics, physical-intelligence, IoT, or device OS changes.
- Track dependencies such as `ffmpeg-full-shared` as runtime prerequisites, not skill content.
- Use `hardware-archeology` for legacy reconstruction, reverse mapping, or discovered hardware history.

### Proof, ledger, cage, risk, production

Paths:

- `Leeway Runtime Fabric\ledger`
- `Leeway Runtime Fabric\enterprise-proof`
- `Leeway Runtime Fabric\production-proof`
- `Leeway Runtime Fabric\risk`
- `Leeway Runtime Fabric\cage`

Purpose:

- Evidence, auditability, enterprise/production proof, risk controls, and constrained execution/sandboxing.

Code mode behavior:

- Use ledger/proof folders to support claims about readiness, compliance, test history, and provenance.
- Use risk materials before recommending production rollout.
- Treat `cage` as a containment or constrained-execution layer until proven otherwise by code inspection.
- Never skip proof/risk review for deployment, hardware, automation, or customer-impacting changes.

## Leeway 80 Bench domains

Root:

```text
E:\.LeeWay-Produucts-File\Leeway-Ecosystem v2.1.4\leeway-80-bench
```

Paths:

- `agents`: benchmark agents.
- `automations`: benchmark automation cases.
- `contracts`: expected interfaces, acceptance contracts, or behavioral contracts.
- `harness`: benchmark harness and orchestration.
- `integrity`: validation, tamper checks, or result integrity.
- `levels`: task levels or scenario tiers.
- `recordings`: run recordings or traces.
- `reports`: generated benchmark outputs.
- `rubrics`: scoring rules.
- `simulations`: simulated environments.
- `skills`: benchmark-scoped skills.
- `workers`: execution workers.
- `workflows`: benchmark workflows.
- `README.md`: entrypoint and overview.

Code mode behavior:

- Read `README.md`, `contracts`, and `rubrics` before interpreting benchmark results.
- Use `recordings` as evidence of actual behavior.
- Use `reports` as summaries that should be traceable back to recordings, contracts, rubrics, and harness output.
- Treat benchmark `skills` separately from Runtime Fabric `skills` until their packaging/routing relationship is confirmed.

## Required code mode workflow

For any Agent Lee code-mode task across this universe:

1. Classify the task domain: skill, runtime, automation, hardware, robotics, deployment, benchmark, proof/risk, or cross-domain.
2. Identify canonical paths and likely owners/modules.
3. Build a research state block and evidence ledger before making recommendations.
4. Inspect source-of-truth files first: README, manifests, contracts, registry metadata, gateway routing, tests, rubrics, deployment ownership, proof, and risk docs.
5. For code changes, propose or apply changes in the smallest coherent patch.
6. Update adjacent metadata: skill metadata, capability registry, gateway route, export bundle, tests, proof/ledger entries, and docs when relevant.
7. Validate with the nearest available test: unit test, smoke test, benchmark harness, simulation, or dry run.
8. Produce a handoff with changed files, rationale, validation result, gaps, and next action.

## Source-of-truth priority for Agent Lee

Use this priority order:

1. Current user instruction in the conversation.
2. Uploaded files or archives from the local Leeway ecosystem.
3. Repository files, manifests, README files, contracts, registries, rubrics, tests, and deployment ownership records.
4. Ledger, proof, recordings, benchmark reports, and training logs.
5. Public documentation or external sources only when internal sources are missing or external dependency behavior is involved.

## Safety and integrity rules

- Do not claim a local file was inspected unless it was uploaded, opened through a connector, or explicitly provided.
- Do not invent module APIs from folder names alone.
- For hardware, robotics, IoT, physical intelligence, automation, deployment, or production-proof changes, include a rollback or simulation-first plan.
- For skill-universe changes, preserve uploadable Skill package requirements: `SKILL.md`, `agents/openai.yaml`, optional `references`, optional `scripts`, optional `assets`, and packaged `skill.zip` when delivering a ChatGPT skill.
- Keep Leeway naming and domain boundaries intact unless the user asks for a refactor.
