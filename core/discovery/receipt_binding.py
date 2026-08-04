"""
Receipt Binding

Converts execution receipts into topology updates.
Critical piece: Receipts become governance proof.
"""

from typing import Dict, Any
from datetime import datetime


class ReceiptBinding:
    """
    Binds execution receipts to Discovery topology.
    
    Rule: A receipt is ONLY valid if receipt.component_id ∈ Discovery Registry
    """
    
    def __init__(self, registry):
        self.registry = registry
    
    def bind(self, receipt: Dict[str, Any]) -> Dict[str, Any]:
        """
        Bind receipt to topology.
        
        Args:
            receipt: Execution receipt
            
        Returns:
            Binding result with validation status
        """
        node_id = receipt.get("node_id") or receipt.get("component_id", "unknown")
        
        # Validate component exists in Discovery
        if not self.registry.exists(node_id):
            return {
                "status": "INVALID_SYSTEM_ORPHAN",
                "node_id": node_id,
                "reason": "Component not registered in Discovery",
                "receipt_id": receipt.get("receipt_id"),
                "validated_at": datetime.utcnow().isoformat()
            }
        
        # Register receipt as proof of execution
        self.registry.register(
            f"receipt:{receipt.get('receipt_id', 'unknown')}",
            {
                "type": "execution_receipt",
                "component_id": node_id,
                "action": receipt.get("action"),
                "success": receipt.get("success"),
                "timestamp": receipt.get("timestamp"),
                "dependencies": receipt.get("dependencies", []),
                "receipt_data": receipt
            }
        )
        
        # Update component heartbeat
        self.registry.heartbeat(node_id)
        
        return {
            "status": "VALID",
            "node_id": node_id,
            "receipt_id": receipt.get("receipt_id"),
            "validated_at": datetime.utcnow().isoformat()
        }
    
    def validate_receipt(self, receipt: Dict[str, Any]) -> bool:
        """
        Validate receipt against Discovery registry.
        
        Args:
            receipt: Receipt to validate
            
        Returns:
            True if valid, False if orphan
        """
        node_id = receipt.get("node_id") or receipt.get("component_id")
        return self.registry.exists(node_id) if node_id else False
    
    def get_component_receipts(self, component_id: str) -> list:
        """
        Get all receipts for a component.
        
        Args:
            component_id: Component ID
            
        Returns:
            List of receipt nodes
        """
        receipts = []
        for node_id, node in self.registry.all().items():
            if node_id.startswith("receipt:"):
                if node.get("data", {}).get("component_id") == component_id:
                    receipts.append(node)
        return receipts

# Made with Bob
