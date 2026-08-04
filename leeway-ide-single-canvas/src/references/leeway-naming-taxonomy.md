# LeeWay Naming Taxonomy

## Domain Examples

- `BOOT`
- `UI`
- `COMMAND`
- `WORKSPACE`
- `MODEL_HIVE`
- `ENGINEERING_LOOP`
- `GOVERNANCE`
- `PERSONA`
- `MCP`
- `CAPABILITY`
- `BROWSER`
- `MEMORY`
- `KNOWLEDGE`
- `VOICE`
- `PACKAGE`
- `GATE`
- `TEST`

## Pipeline Examples

- `EXTENSION_HOST`
- `COMMAND_ROUTER`
- `RUNTIME_SETTINGS`
- `ROUTER`
- `CATALOG`
- `VALIDATOR`
- `LAW_ENGINE`
- `INTEGRITY_GATE`
- `APPLICATION_IDENTITY_GRAPH`

## Node Naming Rules

- Use singular concrete nouns when possible.
- Prefer the runtime role over implementation details.
- Use `ROOT` for system owners.
- Use `SURFACE` for command families or UI families.
- Use `QUARANTINE` when a path exists only to be explicitly non-canonical.

## Classification Guidance

- `PRODUCTION_RUNTIME`: active app behavior
- `COMMAND_ROUTE`: command registration or message routing
- `EVENT_ROUTE`: event transport or translation
- `GOVERNANCE_GATE`: verification or law enforcement
- `QUARANTINE`: present on disk but explicitly non-canonical
- `DEPRECATED_DELETE`: scheduled for removal after verification
