# Leeway Content Foundry

Leeway Content Foundry is an AI-first orchestration product for converting source content into multi-platform publishing pipelines, with Agent Lee as the execution persona and Leeway governance controls embedded in runtime.

## Executive Summary

- Product: Leeway Content Foundry
- Persona: Agent Lee
- Author: Leonard Le
- Stack: React 19 + Vite 6 + TypeScript + Tailwind v4
- Core capability: Build, route, and execute node-based content workflows from source to distribution

## Why This Matters

For developers:

- Clear local setup and governed build pipeline
- Extensible node and platform model
- Runtime manifests for HiveMind orchestration and platform API skills

For investors:

- Productized orchestration UI, not just a script-based prototype
- Governance-backed execution controls and brand gate enforcement
- Platform deployment readiness model with documentation-grounded skills
- Clear path from content production to social distribution automation

## Current State (April 2026)

- Branding and product framing set to Leeway Content Foundry
- Agent Lee orchestration lane supports:
   - `auto` (hybrid)
   - `hivemind` (manifest-based)
   - `gemini` (provider-first with fallback)
- Platform API skill manifest generation implemented (`public/platform-api-skills.json`)
- UI improvements completed:
   - Collapsed-node connection alignment
   - Color-coded connection lines by action/category
   - Wallet renamed to Content Wallet
   - Header/hero/right-panel logo and targeted-training messaging updates

See full state snapshot in [docs/CURRENT_STATE.md](docs/CURRENT_STATE.md).

## Documentation Index

- Developer guide: [docs/DEVELOPER_GUIDE.md](docs/DEVELOPER_GUIDE.md)
- Investor overview: [docs/INVESTOR_OVERVIEW.md](docs/INVESTOR_OVERVIEW.md)
- Current state and roadmap: [docs/CURRENT_STATE.md](docs/CURRENT_STATE.md)

## Local Setup

Prerequisites:

- Node.js 20+
- npm 10+

Install and run:

```bash
npm install
npm run dev
```

Optional environment configuration (`.env.local`):

```env
GEMINI_API_KEY=your_key_here
VITE_AGENTLEE_AI_MODE=auto
```

Dev server runs on port `7007`.

## Key Scripts

- `npm run dev`: Sync manifests and launch local app
- `npm run build`: Sync manifests, brand-check, and create production build
- `npm run hivemind:sync`: Build HiveMind runtime manifest
- `npm run platform:skills`: Build platform API skills manifest
- `npm run brand:check`: Validate branding/governance constraints

## Runtime Architecture

1. Source inputs and transforms are represented as workflow nodes.
2. Agent Lee maps intent to node sequences.
3. HiveMind manifest contributes intent routing and roster metadata.
4. Platform API skills provide deployment-grounded requirements.
5. Execution state updates are reflected in UI and wallet artifacts.

## Governance And Standards

- Standards root: `LeeWay-Standards/`
- Primary runtime policy: `LeeWay-Standards/.leeway/layer-policy.json`
- App governance profile: `governance/leeway-application-governance.json`

## CI/CD (GitHub Actions)

Top-level CI workflow is provided in [\.github/workflows/ci.yml](.github/workflows/ci.yml) and performs:

- dependency installation
- production build
- artifact upload (`dist/`)

This validates merge readiness for repository collaborators and external reviewers.

## License

This repository includes an MIT License in [LICENSE](LICENSE).
