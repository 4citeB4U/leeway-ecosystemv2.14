"""
SEA Hook

Injected into SEA execution loop.
Ensures SEA is always registered in Discovery.
"""

from typing import Dict, Any
from datetime import datetime


class SEAHook:
    """
    Discovery hook for SEA execution engine.
    
    Ensures SEA cannot execute without Discovery acknowledgment.
    """
    
    def __init__(self, registry):
        self.registry = registry
        self.sea_registered = False
    
    def before_tick(self, context: Dict[str, Any]):
        """
        Called before SEA tick.
        
        Registers SEA in Discovery if not already registered.
        
        Args:
            context: SEA execution context
        """
        if not self.sea_registered:
            self.registry.register(
                "sea_core",
                {
                    "type": "execution_engine",
                    "component": "SEA",
                    "state": "initializing",
                    "registered_at": datetime.utcnow().isoformat()
                }
            )
            self.sea_registered = True
        
        # Update state
        self.registry.update_status("sea_core", "running")
        
        # Heartbeat
        self.registry.heartbeat("sea_core")
    
    def after_tick(self, result: Dict[str, Any]):
        """
        Called after SEA tick.
        
        Updates SEA state in Discovery.
        
        Args:
            result: SEA execution result
        """
        # Update heartbeat
        self.registry.heartbeat("sea_core")
        
        # Update state based on result
        if result.get("success"):
            self.registry.update_status("sea_core", "active")
        else:
            self.registry.update_status("sea_core", "degraded")
    
    def on_shutdown(self):
        """Called when SEA shuts down"""
        if self.sea_registered:
            self.registry.unregister("sea_core")
            self.sea_registered = False
    
    def is_registered(self) -> bool:
        """Check if SEA is registered"""
        return self.registry.exists("sea_core")
    
    def enforce_registration(self):
        """
        Enforce that SEA is registered.
        
        Raises:
            RuntimeError: If SEA is not registered
        """
        if not self.is_registered():
            raise RuntimeError(
                "SEA execution blocked: Not registered in Discovery. "
                "SEA cannot exist in execution space without Discovery acknowledgment."
            )

# Made with Bob
