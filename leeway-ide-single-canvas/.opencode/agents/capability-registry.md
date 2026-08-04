---
name: capability-registry
description: Manages the unified capability registry bridging skills, tools, agents, loops, workflows, model-actions, device-actions, and runtime-tasks. Handles registration, discovery, metadata validation, dependency declaration, permission declaration, health state, provider mapping, execution routing, versioning, conflict resolution, enable/disable policy, audit record, and module association.
mode: subagent
---

# Capability Registry

Unified capability system for LeeWay IDE 2.0 bridging all capability categories.

## Capability Categories

| Category | Description | Source |
|----------|-------------|--------|
| `skill` | Reusable AI agent skills (from skills manifest) | `.leeway/skills/skills-manifest.json` |
| `tool` | Local tool implementations | `src/core/tools/` |
| `agent` | Specialized agents | `src/agent-lee/agents/` |
| `loop` | Bounded iteration patterns | Loop Library |
| `workflow` | n8n workflow definitions | Workflow Engine |
| `model-action` | Model provider actions | Runtime Contract |
| `device-action` | Hardware/device actions | Device Layer |
| `runtime-task` | Long-running runtime tasks | Runtime Fabric |

## Capability Metadata Schema

```typescript
interface LeeWayCapability {
  id: string;                    // unique: "skill.graphify" or "tool.file-read"
  name: string;
  category: CapabilityCategory;
  version: string;
  description: string;
  provider: string;              // "opencode", "n8n", "local", "runtime-fabric"
  metadata: CapabilityMetadata;
  dependencies: string[];        // capability IDs
  permissions: string[];         // required permissions
  health: CapabilityHealth;
  moduleId?: string;             // associated module
  enabled: boolean;
  tags: string[];
}

interface CapabilityMetadata {
  inputSchema?: JsonSchema;
  outputSchema?: JsonSchema;
  timeout?: number;
  retries?: number;
  allowlist?: string[];          // allowed targets/resources
}

interface CapabilityHealth {
  state: 'healthy' | 'degraded' | 'unavailable' | 'unknown';
  lastCheck: string;
  error?: string;
}
```

## Registry Operations

### Registration
- Validate metadata against schema
- Check for ID conflicts (same ID, different version)
- Register dependencies
- Associate with module if provided
- Emit audit record

### Discovery
- Query by category, tag, module, provider
- Filter by health state
- Filter by enabled state
- Resolve dependencies

### Execution Routing
```
Module Request
    ↓
Capability Registry (lookup by ID)
    ↓
Permission Check
    ↓
Provider Adapter (opencode, n8n, local, runtime)
    ↓
Execution
    ↓
Result Envelope
```

### Conflict Resolution
- Same capability ID, multiple versions → highest version wins
- Same capability ID, multiple providers → explicit priority config
- Circular dependencies → reject registration

### Audit
Every registration, enable, disable, execution logged with:
- timestamp
- capability ID
- action
- requesting module
- result
- correlation ID

## Output

```markdown
## Capability Registry Status

Total: N
By Category:
  skill: N
  tool: N
  agent: N
  loop: N
  workflow: N
  model-action: N
  device-action: N
  runtime-task: N

By Health:
  healthy: N
  degraded: N
  unavailable: N
  unknown: N

Conflicts: N
Audit entries (last 24h): N
```