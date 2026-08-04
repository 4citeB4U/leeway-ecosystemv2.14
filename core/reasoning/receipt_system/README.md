# 9E Cognitive Receipt System

The 9E (Nine-E) Cognitive Receipt & Identity Loop is Agent Lee's self-improvement backbone.

## Core Principle

**"Every thought becomes a record. Every record becomes learning. Every learning changes behavior."**

If it is not receipted, it did not happen.

## Architecture

```
Execution → Receipt → Reflection → Learning → Identity Mutation → Cache Injection → Behavior Change
```

## Components

### 1. Receipt Schema Engine (`receipt_schema_engine.py`)
- Defines `ExecutionReceipt` dataclass
- Canonical receipt structure
- Serialization/deserialization

### 2. Receipt Builder (`receipt_builder.py`)
- Converts SEA execution context into structured receipts
- Extracts intent, plan, steps, tools, outcomes
- Calculates success scores

### 3. Execution Tracker (`execution_tracker.py`)
- Persists receipts to `Archive/receipts/`
- Timestamped directory structure: `category/YYYY/MM/DD/`
- Receipt retrieval and search

### 4. Reflection Engine (`reflection_engine.py`)
- Analyzes receipts for patterns
- Single receipt analysis
- Batch analysis with aggregated metrics
- Generates recommendations

### 5. Learning Compiler (`learning_compiler.py`)
- Compiles reflection insights into actionable learning rules
- Calculates confidence and priority
- Defines validation criteria
- Creates improvement rules

### 6. Identity Mutation Rules (`identity_mutation_rules.py`)
- Applies learning to Agent Lee's identity manifest
- Validates mutations (preserves core identity, authority)
- Persists to `Archive/manifests/identity/`
- Version management

### 7. Cache Injection System (`cache_injection_system.py`)
- Injects learning into runtime cache
- Cache types: behavior, pattern, optimization
- TTL management based on priority/confidence
- Cache invalidation

### 8. Pattern Extractor (`pattern_extractor.py`)
- Extracts patterns from receipt batches
- Success patterns, failure patterns
- Performance patterns, tool patterns
- Temporal patterns

### 9. SEA Integration Hooks (`sea_integration_hooks.py`)
- Pre-execution hook (loads relevant cache)
- Post-execution hook (builds receipt, triggers learning)
- Async learning pipeline (non-blocking)
- Learning summary API

## Integration with SEA

The 9E system integrates with SEA through hooks:

```python
from core.reasoning.receipt_system import SEAIntegrationHooks

# Initialize
hooks = SEAIntegrationHooks(enabled=True)

# Before execution
pre_metadata = await hooks.pre_execution_hook(context)

# After execution
post_metadata = await hooks.post_execution_hook(
    context,
    execution_result,
    pre_metadata
)
```

See `SEA-9E-INTEGRATION-PATCH.md` for exact integration points.

## Receipt Flow

1. **Execution**: SEA executes adapter request
2. **Receipt Building**: Context + result → ExecutionReceipt
3. **Tracking**: Receipt persisted to Archive
4. **Reflection**: Receipt analyzed for insights
5. **Learning**: Insights compiled into rules
6. **Identity Mutation**: High-priority learning updates identity
7. **Cache Injection**: Learning injected into runtime cache
8. **Behavior Change**: Next execution uses cached learning

## Receipt Structure

```json
{
  "receipt_id": "receipt-20260621-101234567890",
  "timestamp": "2026-06-21T10:12:34.567890Z",
  "intent": {
    "task_type": "code_modification",
    "action": "apply_diff",
    "params": {}
  },
  "plan": {
    "request_id": "req-123",
    "priority": "normal"
  },
  "execution_steps": [...],
  "tools_used": ["apply_diff", "read_file"],
  "expected_outcome": "File modified successfully",
  "actual_outcome": "File modified successfully",
  "success_score": 1.0,
  "failure_modes": [],
  "latency_ms": 234.5,
  "system_impact": {
    "cpu_delta": 0.02,
    "memory_delta_mb": 5.3
  },
  "reasoning_trace": [...]
}
```

## Learning Rule Structure

```json
{
  "learning_id": "learning-20260621101234567890",
  "learned_at": "2026-06-21T10:12:34.567890Z",
  "source": "reflection_engine",
  "confidence": 0.85,
  "pattern": {
    "success_factors": ["fast_execution", "no_failures"],
    "failure_patterns": [],
    "performance": {"latency_ms": 234.5}
  },
  "rule": {
    "type": "performance_optimization",
    "action": "cache_results",
    "condition": "latency > 5000ms"
  },
  "application_scope": "global",
  "priority": "high",
  "validation_criteria": {
    "metric": "success_score",
    "threshold": 0.8,
    "sample_size": 10
  }
}
```

## Identity Mutation

Learning can mutate Agent Lee's identity in three ways:

1. **Capability Enhancement**: Add new capabilities
2. **Behavior Adjustment**: Modify behavior priorities
3. **Constraint Modification**: Add failure prevention constraints

All mutations:
- Preserve core identity (agentId, role, fingerprint)
- Preserve authority owner
- Stay within capability bounds
- Are versioned
- Are validated before persistence

## Cache Structure

Cached learning stored at:
```
agent-lee-coding-mode/.leeway-vscode/bridge-runtime/cache/agent/
├── behavior/
│   └── learning-20260621101234567890.json
├── optimization/
│   └── learning-20260621101234567891.json
└── pattern/
    └── learning-20260621101234567892.json
```

Each cache entry includes:
- Learning ID
- Cache type
- Cached timestamp
- Rule and pattern
- Priority and confidence
- TTL (time-to-live)

## Usage Examples

### Get Learning Summary

```python
hooks = SEAIntegrationHooks(enabled=True)
summary = hooks.get_learning_summary()

print(f"Success rate: {summary['success_rate']}")
print(f"Patterns found: {summary['patterns_found']}")
print(f"Cached learning: {summary['cached_learning']}")
```

### Manual Receipt Analysis

```python
from core.reasoning.receipt_system import (
    ExecutionTracker,
    ReflectionEngine,
    PatternExtractor
)

tracker = ExecutionTracker()
reflection = ReflectionEngine()
extractor = PatternExtractor()

# Get recent receipts
receipts = tracker.get_recent_receipts(limit=50)

# Analyze batch
analysis = reflection.analyze_batch(receipts)

# Extract patterns
patterns = extractor.extract_patterns(receipts)
```

### Manual Learning Injection

```python
from core.reasoning.receipt_system import (
    LearningCompiler,
    CacheInjectionSystem
)

compiler = LearningCompiler()
cache = CacheInjectionSystem()

# Compile learning
learning_rule = compiler.compile_learning(analysis, context)

# Inject into cache
cache_path = cache.inject_learning(learning_rule, "behavior")
```

## Graceful Degradation

The 9E system is designed for graceful degradation:

- If 9E is disabled, SEA works normally
- If receipt writing fails, execution continues
- If learning pipeline fails, it fails silently
- If identity mutation fails, current identity preserved
- If cache injection fails, execution continues

## Non-Negotiables

1. Every execution must attempt to write a receipt
2. Receipts must be timestamped and immutable
3. Core identity must be preserved during mutations
4. Authority owner cannot be changed by learning
5. Learning pipeline must not block execution
6. Cache TTL must be respected
7. Pattern extraction requires minimum occurrences

## Future Enhancements

- Real-time pattern detection
- Multi-agent learning sharing
- Federated learning across Agent Lee instances
- Automatic A/B testing of learning rules
- Learning rule effectiveness tracking
- Identity rollback capability
- Receipt compression for long-term storage