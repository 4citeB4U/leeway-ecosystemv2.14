"""
Subsystem Registry - Central registry of all adapters

This module maintains a registry of all available subsystem adapters,
their capabilities, health status, and metadata.
"""

import logging
from datetime import datetime
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)


class SubsystemRegistry:
    """
    Central registry for all subsystem adapters.
    
    Tracks:
    - Registered adapters
    - Adapter capabilities
    - Health status
    - Registration metadata
    """
    
    def __init__(self):
        """Initialize subsystem registry"""
        self.subsystems: Dict[str, Dict[str, Any]] = {}
        self.registration_count = 0
        
        logger.info("Subsystem registry initialized")
    
    def register(
        self,
        name: str,
        adapter: Any,
        capabilities: List[str],
        metadata: Optional[Dict[str, Any]] = None
    ) -> None:
        """
        Register a subsystem adapter.
        
        Args:
            name: Unique name for this subsystem
            adapter: Adapter instance
            capabilities: List of capabilities this adapter provides
            metadata: Optional additional metadata
        """
        if name in self.subsystems:
            logger.warning(f"Overwriting existing subsystem: {name}")
        
        self.subsystems[name] = {
            "adapter": adapter,
            "capabilities": capabilities,
            "metadata": metadata or {},
            "registered_at": datetime.utcnow().isoformat(),
            "status": "registered",
            "last_health_check": None,
            "health_status": "unknown",
            "execution_count": 0,
            "error_count": 0
        }
        
        self.registration_count += 1
        
        logger.info(
            f"Subsystem registered: {name} "
            f"(capabilities={', '.join(capabilities)})"
        )
    
    def get(self, name: str) -> Optional[Any]:
        """
        Get adapter by name.
        
        Args:
            name: Subsystem name
            
        Returns:
            Adapter instance, or None if not found
        """
        subsystem = self.subsystems.get(name)
        return subsystem["adapter"] if subsystem else None
    
    def get_info(self, name: str) -> Optional[Dict[str, Any]]:
        """
        Get full subsystem information.
        
        Args:
            name: Subsystem name
            
        Returns:
            Subsystem info dict, or None if not found
        """
        return self.subsystems.get(name)
    
    def has_subsystem(self, name: str) -> bool:
        """Check if subsystem is registered"""
        return name in self.subsystems
    
    def has_capability(self, capability: str) -> bool:
        """Check if any subsystem provides a capability"""
        for subsystem in self.subsystems.values():
            if capability in subsystem["capabilities"]:
                return True
        return False
    
    def find_by_capability(self, capability: str) -> List[str]:
        """
        Find all subsystems that provide a capability.
        
        Args:
            capability: Capability to search for
            
        Returns:
            List of subsystem names
        """
        matches = []
        for name, subsystem in self.subsystems.items():
            if capability in subsystem["capabilities"]:
                matches.append(name)
        return matches
    
    def get_all_names(self) -> List[str]:
        """Get list of all registered subsystem names"""
        return list(self.subsystems.keys())
    
    def get_all_capabilities(self) -> List[str]:
        """Get list of all available capabilities"""
        capabilities = set()
        for subsystem in self.subsystems.values():
            capabilities.update(subsystem["capabilities"])
        return sorted(list(capabilities))
    
    def update_health(self, name: str, is_healthy: bool, details: Optional[str] = None) -> None:
        """
        Update health status for a subsystem.
        
        Args:
            name: Subsystem name
            is_healthy: Whether subsystem is healthy
            details: Optional health check details
        """
        if name not in self.subsystems:
            logger.warning(f"Cannot update health for unknown subsystem: {name}")
            return
        
        self.subsystems[name]["last_health_check"] = datetime.utcnow().isoformat()
        self.subsystems[name]["health_status"] = "healthy" if is_healthy else "unhealthy"
        
        if details:
            self.subsystems[name]["health_details"] = details
        
        logger.debug(f"Health updated for {name}: {'healthy' if is_healthy else 'unhealthy'}")
    
    def mark_execution(self, name: str, success: bool) -> None:
        """
        Mark an execution for a subsystem.
        
        Args:
            name: Subsystem name
            success: Whether execution was successful
        """
        if name not in self.subsystems:
            return
        
        self.subsystems[name]["execution_count"] += 1
        
        if not success:
            self.subsystems[name]["error_count"] += 1
    
    def set_status(self, name: str, status: str) -> None:
        """
        Set subsystem status.
        
        Args:
            name: Subsystem name
            status: Status string (e.g., "active", "paused", "disabled")
        """
        if name not in self.subsystems:
            logger.warning(f"Cannot set status for unknown subsystem: {name}")
            return
        
        self.subsystems[name]["status"] = status
        logger.info(f"Subsystem {name} status: {status}")
    
    def unregister(self, name: str) -> bool:
        """
        Unregister a subsystem.
        
        Args:
            name: Subsystem name
            
        Returns:
            True if unregistered, False if not found
        """
        if name in self.subsystems:
            del self.subsystems[name]
            logger.info(f"Subsystem unregistered: {name}")
            return True
        
        return False
    
    def get_stats(self) -> Dict[str, Any]:
        """
        Get registry statistics.
        
        Returns:
            dict with registry stats
        """
        healthy_count = sum(
            1 for s in self.subsystems.values()
            if s["health_status"] == "healthy"
        )
        
        total_executions = sum(
            s["execution_count"] for s in self.subsystems.values()
        )
        
        total_errors = sum(
            s["error_count"] for s in self.subsystems.values()
        )
        
        return {
            "total_subsystems": len(self.subsystems),
            "healthy_subsystems": healthy_count,
            "total_capabilities": len(self.get_all_capabilities()),
            "total_executions": total_executions,
            "total_errors": total_errors,
            "error_rate": total_errors / total_executions if total_executions > 0 else 0
        }
    
    def get_health_report(self) -> Dict[str, Any]:
        """
        Get health report for all subsystems.
        
        Returns:
            dict mapping subsystem names to health status
        """
        report = {}
        for name, subsystem in self.subsystems.items():
            report[name] = {
                "health_status": subsystem["health_status"],
                "last_health_check": subsystem["last_health_check"],
                "status": subsystem["status"],
                "execution_count": subsystem["execution_count"],
                "error_count": subsystem["error_count"],
                "error_rate": (
                    subsystem["error_count"] / subsystem["execution_count"]
                    if subsystem["execution_count"] > 0 else 0
                )
            }
        return report
    
    def clear(self) -> None:
        """Clear all registered subsystems"""
        self.subsystems.clear()
        logger.info("All subsystems cleared from registry")
    
    def __repr__(self) -> str:
        """String representation for debugging"""
        stats = self.get_stats()
        return (
            f"SubsystemRegistry("
            f"subsystems={stats['total_subsystems']}, "
            f"healthy={stats['healthy_subsystems']}, "
            f"capabilities={stats['total_capabilities']})"
        )


# Convenience function for quick registration
def register_subsystem(
    name: str,
    adapter: Any,
    capabilities: List[str],
    registry: Optional[SubsystemRegistry] = None
) -> SubsystemRegistry:
    """
    Quick subsystem registration.
    
    Args:
        name: Subsystem name
        adapter: Adapter instance
        capabilities: List of capabilities
        registry: Optional existing registry (creates new if None)
        
    Returns:
        Registry instance
    """
    if registry is None:
        registry = SubsystemRegistry()
    
    registry.register(name, adapter, capabilities)
    return registry

# Made with Bob
