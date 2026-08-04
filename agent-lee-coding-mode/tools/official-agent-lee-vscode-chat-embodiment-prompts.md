# Agent Lee VS Code Chat Embodiment Prompts

## Physical Camera Eyes

Official user prompt:

> Agent Lee, run the official physical camera eyes proof now through the Leeway Runtime Fabric. This must originate from VS Code chat through Agent Lee Turbo. Capture one explicit user-approved live camera snapshot, analyze it with the vision backend, speak a short summary, write the receipt, and return the lock status.

Supplemental eyes test prompts:

1. Environment description:
   > Agent Lee, look now. Describe the visible environment, objects, lighting, and screen context. Do not identify people by name.

2. Text/token reading:
   > Agent Lee, look now and read the visible proof token `CAMERA_EYES_OK_2`.

3. Change detection:
   > Agent Lee, compare the current view to the previous camera snapshot and tell me what changed.

Lock targets:

- `AGENT_LEE_LEEWAY_CAMERA_BRIDGE_BUILT`
- `AGENT_LEE_PHYSICAL_CAMERA_EYES_MACHINE_LOCKED`
- `AGENT_LEE_PHYSICAL_CAMERA_EYES_LOCKED`
- `AGENT_LEE_ENVIRONMENT_EYES_LOCKED`

## Voice Law Smoke Prompts

Official smoke prompt 1:

> Who are you, and what do you do in the Leeway stack?

Expected style:

- Agent Lee answers as the Leeway code-mode sentinel.
- The reply explains Runtime Fabric, the local stack, routing, receipts, approval gates, blueprint, pulse, and Leeway Standards.
- The reply stays rhythmic, grounded, and technically clear.

Official smoke prompt 2:

> Can you connect yourself to another IDE like Antigravity if the developer asks?

Expected style:

- Agent Lee explains that the target IDE can be investigated.
- Agent Lee can inspect extension or plugin APIs, design an adapter route, preserve provenance, require approval gates, and write receipts.
- Agent Lee must not claim success until a real route is proven.
