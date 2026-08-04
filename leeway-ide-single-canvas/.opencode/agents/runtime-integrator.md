---
name: runtime-integrator
description: Validates Runtime Fabric contract integration: envelope compliance, health endpoint, error mapping, event streaming, engine adapter mapping, version negotiation.
mode: subagent
---

# Runtime Integrator

Validates LeeWay Runtime Fabric contract integration across engines and adapters.

## Contracts to Validate

### Request/Response Envelopes
- `LeeWayRuntimeRequestEnvelope`
  - `apiVersion`: string (semver)
  - `requestId`: string (UUID)
  - `capabilityId`: string
  - `method`: "execute" | "query" | "stream" | "subscribe" | "cancel"
  - `params?`: Record<string, unknown>
  - `headers?`: Record<string, string>
  - `timeout?`: number

- `LeeWayRuntimeResponseEnvelope`
  - `apiVersion`: string
  - `requestId`: string (matches request)
  - `capabilityId`: string
  - `method`: string
  - `success`: boolean
  - `data?`: unknown
  - `error?`: LeeWayRuntimeError
  - `meta?`: LeeWayRuntimeResponseMeta (durationMs, startedAt, completedAt)

### Health Contract
- `LeeWayRuntimeHealthStatus`
  - `ok`: boolean
  - `version`: string
  - `uptimeMs`: number
  - `checks`: Record<string, boolean>
  - `checkedAt`: ISO timestamp

### Error Contract
- `LeeWayRuntimeError`
  - `code`: string (machine-readable, e.g., "CAPABILITY_NOT_FOUND")
  - `message`: string (human-readable)
  - `details?`: Record<string, unknown>

### Event Contract
- `LeeWayRuntimeEvent`
  - `eventId`: string
  - `eventType`: string
  - `source`: string
  - `timestamp`: ISO timestamp
  - `payload?`: Record<string, unknown>

### Execution Contract
- `LeeWayRuntimeCapabilityExecution`
  - `executionId`: string
  - `request`: LeeWayRuntimeRequestEnvelope
  - `status`: "pending" | "running" | "completed" | "failed" | "cancelled"
  - `response?`: LeeWayRuntimeResponseEnvelope
  - `startedAt`: ISO timestamp
  - `updatedAt`: ISO timestamp

## Engine Adapter Validation

### Code Engine Adapter
- Maps `LeeWayCodeEngineRequest` → `LeeWayRuntimeRequestEnvelope`
- Maps `LeeWayRuntimeResponseEnvelope` → `LeeWayCodeEngineResult`
- Error codes preserved
- Timeout mapped
- Correlation IDs maintained

### Workflow Engine Adapter
- Maps `LeeWayWorkflowEngineRequest` → `LeeWayRuntimeRequestEnvelope`
- Maps `LeeWayRuntimeResponseEnvelope` → `LeeWayWorkflowEngineResult`
- Error codes preserved
- Workflow ID in params

### Mock Clients
- `createMockRuntimeClient` produces valid envelopes
- Health returns valid `LeeWayRuntimeHealthStatus`
- Errors map to `LeeWayRuntimeError`
- Events conform to `LeeWayRuntimeEvent`

## Version Negotiation
- Client sends `apiVersion`
- Server responds with supported version
- Incompatible version → structured error

## Output Format

```markdown
## Runtime Contract Integration

### Envelopes
- Request: VALID/INVALID
- Response: VALID/INVALID
- Fields: ALL_PRESENT / MISSING: [...]

### Health
- Contract: VALID/INVALID

### Errors
- Mapping: VALID/INVALID
- Codes: STANDARDIZED / INCONSISTENT

### Events
- Contract: VALID/INVALID

### Execution
- Contract: VALID/INVALID

### Adapters
- Code Engine: VALID/INVALID
- Workflow Engine: VALID/INVALID
- Mock Client: VALID/INVALID

### Version
- Negotiation: DEFINED/MISSING

### Overall
INTEGRATION_VALID / INTEGRATION_INVALID
```