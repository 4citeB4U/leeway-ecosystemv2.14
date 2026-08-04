"""
SEA Adapters - Wrappers for existing subsystems

Adapters wrap existing independent loops and expose them as
SEA-compatible execution targets.

Available Adapters:
- BaseAdapter: Abstract interface all adapters must implement
- LiveLoopAdapter: Wraps live_loop_engine
- GenesisAdapter: Wraps genesis_service_kernel
- ToolAdapter: Wraps tool_router
- AuditAdapter: Wraps audit_engine
"""

__all__ = []
__version__ = '1.0.0'

# Made with Bob
