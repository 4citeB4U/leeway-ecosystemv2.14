"""
SEA (Single Execution Authority) - Agent Lee's Unified Execution Spine

This module provides the single deterministic execution loop that replaces
all fragmented loops in the Agent Lee ecosystem.

Key Components:
- SEACore: Main execution spine
- ExecutionContext: Normalized request/state container
- LoopGuard: Prevents duplicate instances
- Scheduler: Deterministic timing control
- GovernanceBridge: Inline Standards + Laws enforcement
- TaskRouter: Subsystem selection
- SubsystemRegistry: Adapter registration

Usage:
    from core.sea import SEA
    
    sea = SEA()
    sea.run()
"""

from .sea_core import SEA

__all__ = ['SEA']
__version__ = '1.0.0'

# Made with Bob
