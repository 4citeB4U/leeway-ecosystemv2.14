# Agent Lee 3D Chess Proof

This is the themed 3D chess proof for Agent Lee.

## What it shows

- Visible board preview
- Theme switching across the requested families
- Partial legal move validation
- 3D / AR-ready scene manifest
- Research-backed notes and evidence

## Files

- `index.html`
- `styles.css`
- `app.js`
- `chess-rules-engine.js`
- `themes.json`
- `scene.graph.json`
- `chess-project.manifest.json`
- `research-notes.md`

## How to view

Open `index.html` in a browser, or serve the folder with a local static server if you want module-style validation tooling around it.

## Honest limits

- This is a proof-of-concept, not a shipped GLB export pipeline.
- Castling, en passant, check detection, and engine search remain guarded or partial.
- The 3D/AR scene is manifest-backed, not a claim that a device AR backend is already live.

## Validation

The validator checks the visible board, theme switching, move legality, research notes, and receipt generation.
