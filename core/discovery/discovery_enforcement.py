"""
Discovery Enforcement Layer
Ensures all components are registered and validated by Discovery.

CRITICAL RULE: If Discovery doesn't know it, it does not exist.
"""

import json
import logging
from pathlib import Path
from typing import Dict, List, Any, Optional
from datetime import datetime

logger = logging.getLogger(__name__)


class DiscoveryEnforcement:
    """
    Enforces Discovery as the authoritative source of truth.
    
    All components must register with Discovery.
    All capability claims must be validated by Discovery.
    All runtime components must report health to Discovery.
    """
    
    def __init__(self, registry_path: str = "core/discovery/registry.json"):
        """Initialize Discovery enforcement"""
        self.registry_path = Path(registry_path)
        self.registry_path.parent.mkdir(parents=True, exist_ok=True)
        self.registry = self._load_registry()
        
        logger.info("Discovery Enforcement initialized")
        logger.info(f"Registry: {self.registry_path}")
        logger.info(f"Registered components: {len(self.registry.get('components', {}))}")
    
    def _load_registry(self) -> Dict[str, Any]:
        """Load component registry"""
        if self.registry_path.exists():
            with open(self.registry_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        
        # Initialize empty registry
        return {
            "schema": "leeway.discovery.registry.v1",
            "created_at": datetime.utcnow().isoformat(),
            "components": {},
            "capabilities": {},
            "health_checks": {}
        }
    
    def _save_registry(self) -> None:
        """Save component registry"""
        self.registry["updated_at"] = datetime.utcnow().isoformat()
        with open(self.registry_path, 'w', encoding='utf-8') as f:
            json.dump(self.registry, f, indent=2, ensure_ascii=False)
    
    def register_component(
        self,
        component_id: str,
        component_type: str,
        capabilities: List[str],
        location: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Register a component with Discovery.
        
        Args:
            component_id: Unique component identifier
            component_type: Type of component (adapter, service, module, etc.)
            capabilities: List of capabilities this component provides
            location: File path or endpoint location
            metadata: Additional component metadata
            
        Returns:
            True if registration successful
        """
        component_data = {
            "component_id": component_id,
            "component_type": component_type,
            "capabilities": capabilities,
            "location": location,
            "registered_at": datetime.utcnow().isoformat(),
            "status": "registered",
            "metadata": metadata or {}
        }
        
        self.registry["components"][component_id] = component_data
        
        # Register capabilities
        for capability in capabilities:
            if capability not in self.registry["capabilities"]:
                self.registry["capabilities"][capability] = []
            self.registry["capabilities"][capability].append(component_id)
        
        self._save_registry()
        
        logger.info(f"Component registered: {component_id} ({component_type})")
        logger.info(f"  Capabilities: {', '.join(capabilities)}")
        logger.info(f"  Location: {location}")
        
        return True
    
    def is_registered(self, component_id: str) -> bool:
        """Check if component is registered"""
        return component_id in self.registry["components"]
    
    def validate_capability_claim(
        self,
        component_id: str,
        capability: str
    ) -> bool:
        """
        Validate that a component can claim a capability.
        
        Args:
            component_id: Component making the claim
            capability: Capability being claimed
            
        Returns:
            True if claim is valid, False otherwise
        """
        # Check if component is registered
        if not self.is_registered(component_id):
            logger.error(f"VALIDATION FAILED: Component not registered: {component_id}")
            return False
        
        # Check if component has this capability
        component = self.registry["components"][component_id]
        if capability not in component["capabilities"]:
            logger.error(
                f"VALIDATION FAILED: Component {component_id} "
                f"does not have capability: {capability}"
            )
            return False
        
        logger.debug(f"Capability claim validated: {component_id} -> {capability}")
        return True
    
    def reject_unregistered(self, component_id: str) -> Dict[str, Any]:
        """
        Reject an unregistered component.
        
        Returns rejection receipt.
        """
        rejection = {
            "status": "rejected",
            "component_id": component_id,
            "reason": "Component not registered with Discovery",
            "rejected_at": datetime.utcnow().isoformat(),
            "enforcement_rule": "If Discovery doesn't know it, it does not exist"
        }
        
        logger.warning(f"REJECTED: Unregistered component: {component_id}")
        
        return rejection
    
    def report_health(
        self,
        component_id: str,
        health_status: str,
        details: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Report component health status.
        
        Args:
            component_id: Component reporting health
            health_status: HEALTHY | DEGRADED | FAILED
            details: Additional health details
            
        Returns:
            True if health report accepted
        """
        if not self.is_registered(component_id):
            logger.error(f"Health report rejected: Component not registered: {component_id}")
            return False
        
        health_data = {
            "status": health_status,
            "reported_at": datetime.utcnow().isoformat(),
            "details": details or {}
        }
        
        self.registry["health_checks"][component_id] = health_data
        self._save_registry()
        
        logger.info(f"Health reported: {component_id} -> {health_status}")
        
        return True
    
    def get_component(self, component_id: str) -> Optional[Dict[str, Any]]:
        """Get component data"""
        return self.registry["components"].get(component_id)
    
    def get_components_by_capability(self, capability: str) -> List[str]:
        """Get all components that provide a capability"""
        return self.registry["capabilities"].get(capability, [])
    
    def get_all_components(self) -> Dict[str, Any]:
        """Get all registered components"""
        return self.registry["components"]
    
    def get_health_status(self, component_id: str) -> Optional[Dict[str, Any]]:
        """Get component health status"""
        return self.registry["health_checks"].get(component_id)
    
    def enforce_existence(self, component_id: str) -> bool:
        """
        Enforce that a component exists in Discovery.
        
        Returns True if exists, raises exception if not.
        """
        if not self.is_registered(component_id):
            raise DiscoveryEnforcementError(
                f"Component does not exist in Discovery: {component_id}. "
                f"Enforcement rule: If Discovery doesn't know it, it does not exist."
            )
        return True
    
    def get_registry_stats(self) -> Dict[str, Any]:
        """Get registry statistics"""
        return {
            "total_components": len(self.registry["components"]),
            "total_capabilities": len(self.registry["capabilities"]),
            "components_with_health": len(self.registry["health_checks"]),
            "registry_path": str(self.registry_path),
            "last_updated": self.registry.get("updated_at", "never")
        }


class DiscoveryEnforcementError(Exception):
    """Raised when Discovery enforcement fails"""
    pass


# Made with Bob