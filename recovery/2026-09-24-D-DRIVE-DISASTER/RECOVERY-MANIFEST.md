# LeeWay D: Disaster Recovery Manifest — 2026-09-24

Status: ACTIVE_RECOVERY
Branch: `recovery/d-drive-disaster-2026-09-24`
Canonical destination identity: `<LEEWAY_ROOT>` (drive letter is deployment location, not identity)

## Recovery rules

1. Do not format, initialize, chkdsk /f, optimize, clean, or overwrite the damaged D: volume during evidence recovery.
2. Recover proven authority before recreating authority.
3. Stage recovered material outside the damaged volume until integrity is proven.
4. Use: copy/clone -> hash/commit verify -> manifest -> test -> Veritas -> promote.
5. Never equate repository presence with runtime health or Formula execution.

## Current evidence state

- Remote Desktop Commander device `Agent-Lee`: OFFLINE at recovery start; local D:/C:/E: inspection is therefore BLOCKED.
- GitHub `4citeB4U/leeway-ecosystemv2.14`: AVAILABLE; default branch `main`; recovery work isolated on this branch.
- Existing ecosystem repo is only a partial seed; current GitHub history observed two commits, latest `224b524162a69488f8fbce8c5047c5e231c76da5`.
- Full recovery must merge surviving independent LeeWay repositories plus local C:/E:/container/receipt evidence when the host reconnects.

## Pinned surviving source authorities

| Component | Repository | Recovery ref / observed commit | Status |
|---|---|---|---|
| LeeWay Standards | 4citeB4U/LeeWay-Standards | `8ab0b028d829330e1bd22295fa69192696d68b8c` | SURVIVING |
| Runtime Fabric | 4citeB4U/Leeway-Runtime-Fabric | `0c703e3a97f305bb1485a3ac3bcb0504fe565d58` | SURVIVING |
| Agent Skills main | 4citeB4U/LeeWay-Agent-Skills | `f5ac2dcd787f00a4e66fe8128b968b98031045a7` | SURVIVING |
| Agent Skills 238 promotion | 4citeB4U/LeeWay-Agent-Skills | `feature/full-238-gateway-promotion` | SURVIVING / REQUIRED |
| Formula Live | 4citeB4U/Leeway-formula-live | `febaad02c156180c38e90b2b659df003d5d196f9` | SURVIVING |
| Device Bridge | 4citeB4U/LEEWAY-DEVICE-BRIDGE | `7cb4669d1a67820a8b3074f1e32f45399aa1bee3` | SURVIVING |
| Blender Bridge | 4citeB4U/LEEWAY-BRIDGE- | `2c102504719fc8dd4ea2b9e19238831cb6e416b8` | SURVIVING |
| Agent Lee Voice | 4citeB4U/agentleevoice | `fc45fd35c3baa2385e7d3cb15d9773192a9f9e12` | SURVIVING |
| LeeWay Live | 4citeB4U/Leeway-live | `37c6be76079911cb62b79b08bc6bb46dd21836db` | SURVIVING |
| LeeWay VS Code | 4citeB4U/LEEWAY-VSCODE | `735442601bb6e79db47eec91a92cb087f7ea8809` | SURVIVING |
| Leola's Library | 4citeB4U/leolasliabrary | default branch `main` | SURVIVING; pin on restore pass |

## 238-skill continuity authority

Required ref: `feature/full-238-gateway-promotion`

Verified Git blob identities observed from GitHub:
- `AGENTS.md`: `d60f5e395d64fb6a94bb40bb7e999538b09abee7`
- `skills/leeway-continuity-authority/SKILL.md`: `00a08a37e65b6404eae11b873072aed75d7928bf`
- `skills/leeway-context-engineering/SKILL.md`: `ae6c143c1ec473d38eb8b8c565db475b32f93956`
- `skills/leeway-formula-governance/SKILL.md`: `f5b6d042c6809bc49fadfa578a45b92a052a9d51`
- `skills/leeway-formula-authority-recovery/SKILL.md`: `9b93b01e84af3dc9cf02f00ed58fbc01737025d6`

## Formula authority recovery anchors

Canonical executable Formula authority from the recovered LeeWay Formula Authority Recovery skill:

- Formula ID: `LEEWAY-FORMULA-v1.0`
- Runtime base: `http://127.0.0.1:4001`
- Health: `/runtime/formula/v1/health`
- Evaluate: `/runtime/formula/v1/evaluate`
- Adapter: `raw-base64-v1`
- Runtime container: `leeway_runtime_fabric`

Pinned SHA-256 authorities:
- `leeway-formula-v1.mjs`: `6502791BBA909D7481DB3A204F3CBF67B1DC06A4B76A73C797D709408341D63E`
- `canonical-input.mjs`: `4087FC14A9F1F44EB46D9D6417156176794E2ACC72EE9BF481F21A5D0ABE5236`
- `raw-base64-v1.mjs`: `2C8B477ABAD73A0B8519127B20E500BC857F6D26A2722634F23637D4EEAC6215`
- `formula-service.mjs`: `59C74A850CFBACAB4408D73538C824D25687AE0FBD12F07AB5D3622661B7B1EC`

Historical primary Formula runtime authority path:
`C:\LeeWay-Storage-Science\S4R-20260907-131056\S4R-runtime-formula-authority.json`

Historical decision controller:
`C:\LeeWay-Storage-Science\X5-Formula-MultiVariable-Controller-v1.5.0.ps1`

Prior D-side Formula recovery manifest identity:
`<LEEWAY_ROOT>\Authority\Formula-Recovery\20260912\FORMULA-AUTHORITY-RECOVERY-MANIFEST.json`
Known SHA-256 at creation:
`C578A6B9123A4A79F491C32DDCB86F3BCA25323D7D623B4E36837FB3784887EE`

Historical Formula documentation checkpoint previously recorded:
`D:\Leeway-Ecosystem v2.1.4\LeeWay-Standards\Formula\LEEWAY-FORMULA-v1.0.md`
Recorded SHA-256:
`AA0290BB7C084F33EE49A50BFF02FC5D61C05B9EC6A585D89F7DADA81AA6F51E`

## Known local recovery anchors to search when host reconnects

- `C:\LeeWay-Storage-Science`
- `C:\LeeWay\Forgejo`
- `E:\Leeway-Ecosystem v2.1.4`
- `E:\.LeeWay-Produucts-File\Leeway-Ecosystem v2.1.4`
- `D:\LeeWay\Recovered-From-Recycle\Leeway-Ecosystem-v2.1.4-20260907` (historically confirmed recovery tree; current existence unverified after this failure)
- Runtime/receipt archives under prior `Leeway-Ecosystem v2.1.4\Archive`
- Docker/WSL volumes and bind mounts referencing prior LeeWay roots
- Forgejo repositories/remotes and local git object databases

## Promotion gate

Nothing staged by this recovery branch becomes canonical merely by being cloned.

Required convergence:
`source identity -> commit/hash -> local staging -> tests -> runtime binding -> Veritas -> receipt -> promotion`

Until local inspection resumes:
- FORMULA_EVALUATOR: DISCOVERED (historical authority), live state UNVERIFIED
- FORMULA: NOT_EXECUTED
- LOCAL_RUNTIME: BLOCKED
- VERITAS: NOT_RUN
- RECEIPT: branch + commits only; no runtime recovery receipt yet
