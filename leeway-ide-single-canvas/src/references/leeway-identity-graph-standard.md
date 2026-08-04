# LeeWay Identity Graph Standard

## ID Pattern

Use:

`LEEWAY_APP::<DOMAIN>::<PIPELINE>::<NODE>`

Examples:

- `LEEWAY_APP::BOOT::EXTENSION_HOST::ENTRYPOINT`
- `LEEWAY_APP::VOICE::LAVR::PLAYBACK_GATE`
- `LEEWAY_APP::GOVERNANCE::INTEGRITY_GATE::ROOT`

## Required Node Fields

- `id`
- `name`
- `classification`
- `owner`
- `domain`
- `pipeline`
- `file`
- `inputs`
- `outputs`
- `commandsEmitted`
- `commandsHandled`
- `eventsEmitted`
- `eventsHandled`
- `verification`
- `evidence`
- `status`

## Status Values

- `ACTIVE`
- `FALLBACK`
- `TEST_ONLY`
- `GENERATED`
- `DELETE_PENDING`

## Classification Values

- `PRODUCTION_START`
- `PRODUCTION_RUNTIME`
- `LOCAL_RUNTIME`
- `BROWSER_FALLBACK`
- `COMMAND_ROUTE`
- `EVENT_ROUTE`
- `TOOL_BUS`
- `TURN_GATE`
- `PLAYBACK_GATE`
- `CONFIGURATION`
- `PACKAGING`
- `GOVERNANCE_GATE`
- `TEST_HARNESS`
- `EVIDENCE`
- `RECEIPT`
- `GENERATED_TRANSIENT`
- `DEPRECATED_DELETE`
- `QUARANTINE`

## Identity Rules

- Every active command must map to a registered node.
- Every emitted event must have a registered owner and consumer.
- Every active file in core runtime directories must be covered by the graph.
- Historical alternate runtime outputs like `dist` must be marked quarantine if `out` is canonical.
