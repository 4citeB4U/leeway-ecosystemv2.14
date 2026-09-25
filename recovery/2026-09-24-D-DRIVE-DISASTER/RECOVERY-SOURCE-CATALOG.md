# LeeWay Disaster Recovery Source Catalog — 2026-09-24

Status: `ACTIVE_RECOVERY`

This catalog separates **reconstruction authority**, **recoverable source**, **reference evidence**, and **still-missing local state**. Repository availability does not imply runtime execution or canonical promotion.

## Tier A — Core reconstruction authorities

| Component | Source | Pinned ref | Classification |
|---|---|---|---|
| LeeWay Standards | `4citeB4U/LeeWay-Standards` | `8ab0b028d829330e1bd22295fa69192696d68b8c` | CORE SOURCE |
| Runtime Fabric | `4citeB4U/Leeway-Runtime-Fabric` | `0c703e3a97f305bb1485a3ac3bcb0504fe565d58` | CORE SOURCE |
| Agent Skills | `4citeB4U/LeeWay-Agent-Skills` | `feature/full-238-gateway-promotion` | CORE SOURCE / 238-SKILL AUTHORITY |
| Formula Live | `4citeB4U/Leeway-formula-live` | `febaad02c156180c38e90b2b659df003d5d196f9` | FORMULA RESEARCH / EVIDENCE SOURCE |
| LeeWay VS Code | `4citeB4U/LEEWAY-VSCODE` | `735442601bb6e79db47eec91a92cb087f7ea8809` | RUNTIME / IDE SOURCE |
| LeeWay Live | `4citeB4U/Leeway-live` | `37c6be76079911cb62b79b08bc6bb46dd21836db` | LIVE UI / C3 EVIDENCE SOURCE |
| Device Bridge | `4citeB4U/LEEWAY-DEVICE-BRIDGE` | `7cb4669d1a67820a8b3074f1e32f45399aa1bee3` | DEVICE RUNTIME SOURCE |
| Blender Bridge | `4citeB4U/LEEWAY-BRIDGE-` | `2c102504719fc8dd4ea2b9e19238831cb6e416b8` | BLENDER / TOOL SOURCE |
| Agent Lee Voice | `4citeB4U/agentleevoice` | `fc45fd35c3baa2385e7d3cb15d9773192a9f9e12` | VOICE SOURCE |

## Tier B — Important recoverable subsystems / projects

| Component | Source | Pinned ref | Classification |
|---|---|---|---|
| Leola's Library | `4citeB4U/leolasliabrary` | `cb3e7a716f71a6a77983d12436730fb9e4bf5953` | PROJECT SOURCE |
| Edge GPU | `4citeB4U/LeeWay-Edge-GPU` | `df5196f15df0843b30e6368724f9cf1756447f9f` | GPU SOURCE |
| Edge RTC | `4citeB4U/LeeWay-Edge-RTC` | `9906815adab063c03f4446a0bd65d489955d96e6` | RTC SOURCE / PRIVATE |
| LeeWay Training | `4citeB4U/Leeway-Training` | `c219ad14e41c6aa005fa8f9d58edef9ac5984f45` | TRAINING SOURCE |
| Agent Lee — Sum of All Systems | `4citeB4U/Agent-Lee-The-Sum-of-All-Systems` | `19b316b67038416600467c4ae84dea5503f3f27e` | HISTORICAL / PROJECT SOURCE |
| Model Family | `4citeB4U/leeway-model-family` | `c3860139615f8f502ef61f483d181d9a41efe027` | MODEL POLICY SOURCE / PRIVATE |
| Admin Cockpit | `4citeB4U/Leeway-admin-cockpit` | `9f28b033269f1c0f41e098e2fb0bbf2e886a0738` | ADMIN SOURCE / PRIVATE |
| Older Ecosystem config repo | `4citeB4U/leeway-ecosystem` | `891bb3b3b22868ea42526c4dfa1b9ed2e2ae1144` | HISTORICAL CONFIG SOURCE |

Tier B is not auto-promoted into the canonical root. Restore into staging first and reconcile against recovered manifests / runtime consumers.

## Independent recovery evidence outside GitHub

### ChatGPT Library / retained artifacts

- `drive-reconciliation.csv`
  - preserves the historical D/C/E dependency map
  - records the promoted D canonical shadow, the separate pending D branch, C-backed Docker/Forgejo/runtime state, E runtime dependencies, and M4-R2 status
- `LeeWay-Master-Recovery-Plan-2026-09-17.xlsx`
  - preserves the 82-work-item recovery register, C3 gate, acceptance boundaries, rollback rules, and historical drive observations

These files are planning/evidence artifacts. They do not themselves execute restoration.

### Google Drive — reference evidence only

Two independently stored LeeWay documents were confirmed:

- `The LeeWay Formula: Mathematical Textbook & Engineering Specification`
- `The LeeWay Formula & System Architecture: Technical Master Report`

Classification: `REFERENCE_ONLY`

Reason: these documents contain architecture/mathematical descriptions but do not replace the hash-pinned executable Formula implementation, runtime endpoint, receipts, or Veritas convergence.

Exact-name Drive searches did **not** find copies of:
- `S4R-runtime-formula-authority.json`
- `X5-Formula-MultiVariable-Controller-v1.5.0.ps1`
- `FORMULA-AUTHORITY-RECOVERY-MANIFEST.json`
- `compose.recovery.agent-lee.yaml`
- `D-PARTIAL-ROOT-REHOME`
- `M4R2-CORPUS-CONTRACT-PASS`
- `D-ROOT-PROMOTION`
- `agent-lee-docker-recovery-20260702-215139`
- `runtime-fabric-data-fabric-forgejo-20260814-143334`

Therefore those exact artifacts remain local/container/Forgejo recovery targets.

## Still-missing state that GitHub cannot substitute

The following classes require host-level recovery when the workstation reconnects:

1. Local Formula v1 executable files and historical receipts on C:/E:/D:.
2. Runtime-generated receipts and `ledger-chain.jsonl` history not committed to source.
3. Forgejo repositories, application data, credentials and MCP receipts under the historical C-backed state.
4. Docker/WSL volumes and the Docker data disk.
5. Bitwarden Lite state.
6. Jitsi configuration/state.
7. Agent Lee ears/sensory runtime state.
8. Recovered Recycle Bin tree / unique local files.
9. M4-R2 shard/checkpoint products not represented in GitHub.
10. Any uncommitted work, local branches, ignored files, generated evidence, model files, databases, media, and application state.

## Recovery promotion law

`AVAILABLE != CANONICAL`

For every recovered component:

`source -> immutable identity -> staging -> dependency reconciliation -> tests -> runtime binding -> Veritas -> receipt -> promote`

Until that chain converges, the component remains staged or reference-only.
