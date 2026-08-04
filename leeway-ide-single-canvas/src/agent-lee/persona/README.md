<!--
LEEWAY_HEADER - DO NOT REMOVE
TAG: AI.PERSONA.MODULE.README
REGION: 🧠 AI
PURPOSE: Documents the mandatory standalone Agent Lee persona module.
DISCOVERY_PIPELINE:
  Voice → Intent → Location → Vertical → Ranking → Render
-->

# Agent Lee Persona Module

Agent Lee Persona Module is mandatory runtime infrastructure.

The VS Code extension, engineering loop, model router, and command handlers must not bypass this module.

This module owns:

- runtime prompt construction
- voice mode selection
- anti-generic filtering
- heritage loading
- persona validation

