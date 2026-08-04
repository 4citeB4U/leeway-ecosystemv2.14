# Leeway IDE Single Canvas

Leeway-standard single-canvas IDE surface for Agent Lee, Live Wallet, Foundry-compatible nodes, and the Leeway Runtime Fabric.

## Runtime contract

This application is a Leeway Runtime Fabric surface. Agent execution must route through the Leeway Runtime Fabric and Leeway-standard adapters. Runtime-facing UI should use Leeway identifiers, Leeway headers, Live Wallet terminology, and Foundry-compatible node contracts.

## Local development

```bash
npm install
npm run dev
```

## Leeway-standard surfaces

- Unified canvas with pan, zoom, mesh settings, default background mode, and connection layer.
- Agent Lee settings node controls board background, mesh density, mesh color, speed, dots, and grid lines.
- Live Wallet provides live previews, upload intake, drag-to-canvas behavior, and save-from-node behavior.
- Foundry deployment, utility, content, and Agent Lee cluster nodes use Leeway node metadata.
