# Leeway Node System Guide

This project uses Leeway-standard runtime nodes. Nodes must be compatible with the Leeway Runtime Fabric and must route through Leeway Runtime Fabric adapters only.

## Required node fields

Every runtime node must carry: `id`, `type`, `title`, canvas position, size, z-index, status metadata, configuration, content payload, schedule payload, input/output ports, and Leeway/Live Wallet identifiers where applicable.

## Canvas behavior

The canvas owns pan and zoom. Nodes render inside the transformed canvas layer so mouse-wheel zoom scrolls nodes small/large together with the connection mesh. Node ports are interactive and create Leeway connection records.

## Live Wallet

The Live Wallet must show live previews where possible, accept uploads, support drag-to-canvas, and accept save events from runtime nodes.

## Agent Lee settings

The Agent Lee settings node controls the canvas board: background mode, galactic mesh, default no-shape background, mesh tint, accent color, density, drift speed, dots, and grid lines.
