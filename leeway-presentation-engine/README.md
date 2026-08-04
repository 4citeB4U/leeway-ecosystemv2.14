# LeeWay Presentation Engine

LeeWay Presentation Engine is the governed slide and presentation surface for the ecosystem.

## What Lives Here

- `index.html` is the live presentation surface.
- `style.css` holds the presentation styling.
- `decks-data.json` stores the deck content and proof mapping data.
- `leeway.project.json` is the project contract.
- `leeway.presentation.manifest.json` is the capability manifest for launch, proof, and narration modes.
- `scripts/leeway-verify.mjs` writes the proof receipts.
- `scripts/leeway-launch.mjs` writes the launch receipt.

## Monetization Narration

The presentation engine now points at the Agent Lee monetization narration mode stored at:

- `../agent-lee-coding-mode/runtime/agent-lee-monetization-narration-mode.json`

That mode is intended for proof-backed presentation copy, demo narration, launch language, and operator-facing monetization framing.

## Runtime Routes

When the Runtime Fabric is running, the canonical routes are:

- `GET /agent-lee/capabilities/presentation`
- `POST /agent-lee/capabilities/presentation/launch`
- `POST /agent-lee/capabilities/presentation/proof`
- `GET /agent-lee/capabilities/monetization/narration`

## Receipts

Presentation receipts are written in two places:

- local engine receipts in `receipts/`
- shared evidence receipts in `../Archive/receipts/leeway-presentation-engine/`

The local proof receipt remains the project gate reference, while the shared receipts feed the broader proof corpus.
