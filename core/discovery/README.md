# Discovery Layer - Minimum Viable Truth System

**Core Rule**: "If Discovery doesn't know it, it doesn't exist."

## Purpose

The Discovery Layer is the authoritative knowledge graph of the LeeWay ecosystem. It provides:

1. **System-wide registry** - Canonical truth about what exists
2. **Bootstrap scanner** - Automatic system discovery
3. **SEA runtime hook** - Execution enforcement
4. **Receipt binding** - Governance proof
5. **Queryable topology** - System introspection

## Architecture

```
Bootstrap Importer (scan filesystem)
    ↓
Topology Registry (register nodes)
    ↓
SEA Hook (enforce registration)
    ↓
Receipt Binding (validate receipts)
    ↓
Discovery Kernel (orchestrate all)
```

## Components

### 1. Topology Registry (`topology_registry.py`)

**Purpose**: Source of truth for system topology.

**Key Methods**:
```python
register(node_id, data)      # Register a node
get(node_id)                 # Get node data
exists(node_id)              # Check if node exists
update_status(node_id, status) # Update node status
heartbeat(node_id)           # Update heartbeat
unregister(node_id)          # Unregister node
persist()                    # Save to disk
load()                       # Load from disk
```

**Storage**: `Archive/discovery/topology_registry.json`

### 2. Bootstrap Importer (`bootstrap_importer.py`)

**Purpose**: Scans filesystem and discovers system components.

**Key Methods**:
```python
scan(root, max_depth)        # Scan filesystem
get_summary()                # Get scan summary
```

**Classifications**:
- **Directories**: system_core, data_archive, agent_runtime, etc.
- **Files**: python_module, config_file, documentation, etc.
- **Layers**: L0_CORE, L1_ARCHIVE, L2_CEREBRAL, etc.

### 3. SEA Hook (`sea_hook.py`)

**Purpose**: Ensures SEA is registered in Discovery before execution.

**Key Methods**:
```python
before_tick(context)         # Called before SEA tick
after_tick(result)           # Called after SEA tick
on_shutdown()                # Called on SEA shutdown
enforce_registration()       # Enforce SEA is registered
```

**Enforcement Rule**: SEA cannot execute without Discovery acknowledgment.

### 4. Receipt Binding (`receipt_binding.py`)

**Purpose**: Validates receipts against Discovery registry.

**Key Methods**:
```python
bind(receipt)                # Bind receipt to topology
validate_receipt(receipt)    # Validate receipt
get_component_receipts(id)   # Get component receipts
```

**Validation Rule**: A receipt is ONLY valid if `receipt.component_id ∈ Discovery Registry`

**Invalid Status**: `INVALID_SYSTEM_ORPHAN`

### 5. Discovery Kernel (`discovery_kernel.py`)

**Purpose**: Main orchestrator for Discovery system.

**Key Methods**:
```python
bootstrap_system(root)       # Bootstrap from filesystem
attach_to_sea()              # Attach SEA hook
ingest_receipt(receipt)      # Ingest and validate receipt
query(node_id)               # Query node
exists(node_id)              # Check existence
get_stats()                  # Get statistics
persist()                    # Save registry
load()                       # Load registry
```

## Usage

### Bootstrap Discovery

```python
from core.discovery import DiscoveryKernel

# Create kernel
discovery = DiscoveryKernel()

# Bootstrap system
discovery.bootstrap_system(
    root="E:/.LeeWay-Produucts-File/Leeway-Ecosystem v2.1.4",
    max_depth=3
)

# Output:
# [Discovery] Bootstrapping system...
# [Discovery] Registered 1247 nodes
# [Discovery] By type: {'directory': 523, 'file': 724}
# [Discovery] By layer: {'L0_CORE': 89, 'L1_ARCHIVE': 234, ...}
# [Discovery] Registry persisted to: Archive/discovery/topology_registry.json
```

### Attach to SEA

```python
# Attach Discovery hook to SEA
discovery.attach_to_sea()

# In SEA execution loop:
discovery.sea_hook.before_tick(context)
result = sea.execute()
discovery.sea_hook.after_tick(result)
```

### Validate Receipts

```python
# Ingest receipt
receipt = {
    "receipt_id": "receipt-123",
    "component_id": "sea_core",
    "action": "execute_command",
    "success": True,
    "timestamp": "2026-06-21T10:00:00Z"
}

binding_result = discovery.ingest_receipt(receipt)

if binding_result["status"] == "VALID":
    print("Receipt is valid")
else:
    print(f"Receipt is orphan: {binding_result['reason']}")
```

### Query Topology

```python
# Check if component exists
if discovery.exists("sea_core"):
    print("SEA is registered")

# Get component data
node = discovery.query("sea_core")
print(node)

# Get all active components
active = discovery.get_active_components()
print(f"Active components: {active}")

# Get component receipts
receipts = discovery.get_component_receipts("sea_core")
print(f"SEA has {len(receipts)} receipts")
```

### Get Statistics

```python
stats = discovery.get_stats()

print(f"Bootstrapped: {stats['bootstrapped']}")
print(f"Total nodes: {stats['registry_stats']['total_nodes']}")
print(f"Active nodes: {stats['registry_stats']['active_nodes']}")
print(f"SEA registered: {stats['sea_registered']}")
```

## Integration with SEA

### SEA Execution Flow with Discovery

```python
# Initialize Discovery
discovery = DiscoveryKernel()
discovery.bootstrap_system(root)
discovery.attach_to_sea()

# SEA execution loop
while running:
    # Before execution
    discovery.sea_hook.before_tick(context)
    
    # Execute
    result = sea.execute(request)
    
    # After execution
    discovery.sea_hook.after_tick(result)
    
    # Bind receipt
    if result.get("receipt"):
        binding = discovery.ingest_receipt(result["receipt"])
        if binding["status"] != "VALID":
            log_orphan_receipt(binding)
```

## Integration with 9E Learning

Discovery provides the truth layer for 9E learning:

```python
# 9E receipt generation
receipt = build_receipt(execution)

# Validate against Discovery
if discovery.validate_receipt(receipt):
    # Receipt is valid - proceed with learning
    track_execution(receipt)
    analyze_receipt(receipt)
    compile_learning(receipt)
else:
    # Receipt is orphan - reject
    reject_receipt(receipt, reason="INVALID_SYSTEM_ORPHAN")
```

## Persistence

Discovery persists to:

```
Archive/discovery/
├── topology_registry.json    # Main registry
├── bootstrap.json            # Bootstrap scan results
└── index.map.json            # Quick lookup index
```

## Bootstrap PowerShell Script

```powershell
# BOOTSTRAP-DISCOVERY.ps1

$root = "E:\.LeeWay-Produucts-File\Leeway-Ecosystem v2.1.4"

Write-Host "=== DISCOVERY BOOTSTRAP START ===" -ForegroundColor Cyan

# Run Python bootstrap
python -c "
from core.discovery import DiscoveryKernel
discovery = DiscoveryKernel()
discovery.bootstrap_system('$root')
print('Bootstrap complete')
"

Write-Host "=== DISCOVERY BOOTSTRAP COMPLETE ===" -ForegroundColor Green
```

## System Behavior After Discovery

### Before Discovery

- SEA runs
- Modules exist loosely
- Logs are passive
- No system awareness

### After Discovery

Every tick becomes:

1. SEA executes request
2. SEA reports to Discovery
3. Discovery validates existence
4. Receipt is generated ONLY if valid
5. Reasoning updates memory graph
6. System state evolves

## Critical Design Shift

Discovery moves LeeWay from:

**"system with modules"**

to

**"system with enforced ontology"**

This is a fundamental architecture change.

## Non-Negotiables

1. **Registration Required**: Components must be registered to exist
2. **Receipt Validation**: Receipts must reference registered components
3. **SEA Enforcement**: SEA cannot execute without Discovery acknowledgment
4. **Persistence**: Registry must be persisted regularly
5. **Heartbeats**: Active components must send heartbeats
6. **Orphan Rejection**: Orphan receipts must be rejected

## Future Enhancements

- Dependency graph resolution
- Runtime live graph updates
- Impact analysis
- Auto-healing detection
- Multi-layer reasoning maps
- Distributed topology sync
- Real-time topology visualization

## The Bottom Line

Discovery is the truth layer.

**If Discovery doesn't know it, it doesn't exist.**

This is not optional. This is the foundation of system awareness.