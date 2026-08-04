"""
Topology Registry

Canonical truth store for all system components.
If it's not here, it does not exist in LeeWay.
"""

import time
from typing import Dict, Any, Optional, List
import json
from pathlib import Path
from datetime import datetime


class TopologyRegistry:
    """
    Source of truth for system topology.
    
    Rule: If Discovery doesn't know it, it doesn't exist.
    """
    
    def __init__(self, persist_path: str = "Archive/discovery"):
        self.nodes: Dict[str, Dict[str, Any]] = {}
        self.persist_path = Path(persist_path)
        self.persist_path.mkdir(parents=True, exist_ok=True)
    
    def register(self, node_id: str, data: Dict[str, Any]):
        """
        Register a node in the topology.
        
        Args:
            node_id: Unique node identifier
            data: Node metadata
        """
        self.nodes[node_id] = {
            "data": data,
            "last_seen": time.time(),
            "status": "active",
            "registered_at": datetime.utcnow().isoformat()
        }
    
    def get(self, node_id: str) -> Optional[Dict[str, Any]]:
        """Get node by ID"""
        return self.nodes.get(node_id)
    
    def exists(self, node_id: str) -> bool:
        """Check if node exists"""
        return node_id in self.nodes
    
    def update_status(self, node_id: str, status: str):
        """Update node status"""
        if node_id in self.nodes:
            self.nodes[node_id]["status"] = status
            self.nodes[node_id]["last_seen"] = time.time()
    
    def heartbeat(self, node_id: str):
        """Update node heartbeat"""
        if node_id in self.nodes:
            self.nodes[node_id]["last_seen"] = time.time()
    
    def unregister(self, node_id: str):
        """Unregister a node"""
        if node_id in self.nodes:
            self.nodes[node_id]["status"] = "unregistered"
            self.nodes[node_id]["unregistered_at"] = datetime.utcnow().isoformat()
    
    def all(self) -> Dict[str, Dict[str, Any]]:
        """Get all nodes"""
        return self.nodes
    
    def active_nodes(self) -> List[str]:
        """Get list of active node IDs"""
        return [
            node_id for node_id, node in self.nodes.items()
            if node.get("status") == "active"
        ]
    
    def persist(self):
        """Persist registry to disk"""
        registry_file = self.persist_path / "topology_registry.json"
        with open(registry_file, 'w', encoding='utf-8') as f:
            json.dump({
                "nodes": self.nodes,
                "persisted_at": datetime.utcnow().isoformat(),
                "node_count": len(self.nodes),
                "active_count": len(self.active_nodes())
            }, f, indent=2, ensure_ascii=False)
        
        return str(registry_file)
    
    def load(self):
        """Load registry from disk"""
        registry_file = self.persist_path / "topology_registry.json"
        if registry_file.exists():
            with open(registry_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                self.nodes = data.get("nodes", {})
                return True
        return False
    
    def get_stats(self) -> Dict[str, Any]:
        """Get registry statistics"""
        return {
            "total_nodes": len(self.nodes),
            "active_nodes": len(self.active_nodes()),
            "node_types": self._count_by_type(),
            "last_update": max(
                (n.get("last_seen", 0) for n in self.nodes.values()),
                default=0
            )
        }
    
    def _count_by_type(self) -> Dict[str, int]:
        """Count nodes by type"""
        type_counts: Dict[str, int] = {}
        for node in self.nodes.values():
            node_type = node.get("data", {}).get("type", "unknown")
            type_counts[node_type] = type_counts.get(node_type, 0) + 1
        return type_counts

# Made with Bob
