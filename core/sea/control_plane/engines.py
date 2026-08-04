"""
SEA Control Plane Engines

All control plane engines in one module for efficiency:
- StateSnapshotEngine: Periodic state snapshots
- ExecutionGraphEngine: Execution flow visualization
- HealthStreamEngine: Real-time health monitoring
- WebSocketEventBus: Event broadcasting
"""

import logging
import json
import asyncio
from datetime import datetime
from typing import Dict, Any, List, Set
from dataclasses import dataclass, asdict
import os

logger = logging.getLogger(__name__)


# ============================================================================
# State Snapshot Engine
# ============================================================================

class StateSnapshotEngine:
    """
    Captures periodic snapshots of SEA state.
    
    Snapshots include:
    - Queue depth
    - Performance metrics
    - Adapter status
    - System resources
    """
    
    def __init__(self, sea_instance=None, snapshot_dir="Archive/runtime-state"):
        """
        Initialize snapshot engine.
        
        Args:
            sea_instance: SEA instance to snapshot
            snapshot_dir: Directory for snapshots
        """
        self.sea = sea_instance
        self.snapshot_dir = snapshot_dir
        self.snapshot_interval = 60  # seconds
        self.running = False
        
        # Ensure directory exists
        os.makedirs(snapshot_dir, exist_ok=True)
        
        logger.info(f"StateSnapshotEngine initialized (interval={self.snapshot_interval}s)")
    
    def capture_snapshot(self) -> Dict[str, Any]:
        """
        Capture current state snapshot.
        
        Returns:
            State snapshot dict
        """
        if not self.sea:
            return {"error": "SEA not available"}
        
        try:
            import psutil
            process = psutil.Process()
            
            snapshot = {
                "timestamp": datetime.utcnow().isoformat(),
                "sea_status": "running" if self.sea.running else "stopped",
                "queue_depth": self.sea.get_queue_depth(),
                "metrics": self.sea.get_performance_metrics(),
                "system": {
                    "cpu_percent": process.cpu_percent(),
                    "memory_mb": process.memory_info().rss / 1024 / 1024,
                    "threads": process.num_threads()
                },
                "adapters": {}
            }
            
            # Add adapter status
            for name, info in self.sea.registry.subsystems.items():
                snapshot["adapters"][name] = {
                    "status": info["status"],
                    "health": info["health_status"],
                    "execution_count": info["execution_count"],
                    "error_count": info["error_count"]
                }
            
            return snapshot
        
        except Exception as e:
            logger.error(f"Error capturing snapshot: {e}")
            return {"error": str(e)}
    
    def save_snapshot(self, snapshot: Dict[str, Any]) -> str:
        """
        Save snapshot to file.
        
        Args:
            snapshot: Snapshot data
            
        Returns:
            Path to saved snapshot
        """
        timestamp = datetime.utcnow().strftime("%Y%m%d-%H%M%S")
        filename = f"sea-state-{timestamp}.json"
        filepath = os.path.join(self.snapshot_dir, filename)
        
        try:
            with open(filepath, 'w') as f:
                json.dump(snapshot, f, indent=2)
            
            logger.debug(f"Snapshot saved: {filepath}")
            return filepath
        
        except Exception as e:
            logger.error(f"Error saving snapshot: {e}")
            return ""
    
    async def run(self):
        """Run snapshot loop"""
        self.running = True
        logger.info("StateSnapshotEngine started")
        
        while self.running:
            try:
                snapshot = self.capture_snapshot()
                self.save_snapshot(snapshot)
                await asyncio.sleep(self.snapshot_interval)
            except Exception as e:
                logger.error(f"Snapshot loop error: {e}")
                await asyncio.sleep(self.snapshot_interval)
    
    def stop(self):
        """Stop snapshot loop"""
        self.running = False
        logger.info("StateSnapshotEngine stopped")


# ============================================================================
# Execution Graph Engine
# ============================================================================

@dataclass
class ExecutionNode:
    """Node in execution graph"""
    node_id: str
    node_type: str  # request, governance, adapter, result
    timestamp: str
    status: str
    data: Dict[str, Any]


@dataclass
class ExecutionEdge:
    """Edge in execution graph"""
    from_node: str
    to_node: str
    edge_type: str  # queued, validated, routed, executed
    timestamp: str


class ExecutionGraphEngine:
    """
    Builds execution flow graph for visualization.
    
    Tracks:
    - Request flow through SEA
    - Governance decisions
    - Adapter execution
    - Results
    """
    
    def __init__(self, max_nodes=1000):
        """
        Initialize graph engine.
        
        Args:
            max_nodes: Maximum nodes to keep in memory
        """
        self.nodes: Dict[str, ExecutionNode] = {}
        self.edges: List[ExecutionEdge] = []
        self.max_nodes = max_nodes
        
        logger.info(f"ExecutionGraphEngine initialized (max_nodes={max_nodes})")
    
    def add_node(self, node: ExecutionNode):
        """Add node to graph"""
        self.nodes[node.node_id] = node
        
        # Prune old nodes if needed
        if len(self.nodes) > self.max_nodes:
            # Remove oldest 10%
            to_remove = sorted(self.nodes.keys())[:self.max_nodes // 10]
            for node_id in to_remove:
                del self.nodes[node_id]
            
            # Remove edges referencing removed nodes
            self.edges = [
                e for e in self.edges
                if e.from_node not in to_remove and e.to_node not in to_remove
            ]
    
    def add_edge(self, edge: ExecutionEdge):
        """Add edge to graph"""
        self.edges.append(edge)
    
    def get_graph(self) -> Dict[str, Any]:
        """
        Get graph data for visualization.
        
        Returns:
            Graph data with nodes and edges
        """
        return {
            "nodes": [asdict(node) for node in self.nodes.values()],
            "edges": [asdict(edge) for edge in self.edges],
            "node_count": len(self.nodes),
            "edge_count": len(self.edges)
        }
    
    def track_request(self, request_id: str, task_type: str, action: str):
        """Track new request"""
        node = ExecutionNode(
            node_id=f"req-{request_id}",
            node_type="request",
            timestamp=datetime.utcnow().isoformat(),
            status="queued",
            data={"task_type": task_type, "action": action}
        )
        self.add_node(node)
    
    def track_governance(self, request_id: str, allowed: bool, reason: str):
        """Track governance decision"""
        node = ExecutionNode(
            node_id=f"gov-{request_id}",
            node_type="governance",
            timestamp=datetime.utcnow().isoformat(),
            status="approved" if allowed else "rejected",
            data={"reason": reason}
        )
        self.add_node(node)
        
        edge = ExecutionEdge(
            from_node=f"req-{request_id}",
            to_node=f"gov-{request_id}",
            edge_type="validated",
            timestamp=datetime.utcnow().isoformat()
        )
        self.add_edge(edge)
    
    def track_execution(self, request_id: str, adapter: str, status: str):
        """Track adapter execution"""
        node = ExecutionNode(
            node_id=f"exec-{request_id}",
            node_type="adapter",
            timestamp=datetime.utcnow().isoformat(),
            status=status,
            data={"adapter": adapter}
        )
        self.add_node(node)
        
        edge = ExecutionEdge(
            from_node=f"gov-{request_id}",
            to_node=f"exec-{request_id}",
            edge_type="executed",
            timestamp=datetime.utcnow().isoformat()
        )
        self.add_edge(edge)


# ============================================================================
# Health Stream Engine
# ============================================================================

class HealthStreamEngine:
    """
    Real-time health monitoring and alerting.
    
    Monitors:
    - CPU usage
    - Memory usage
    - Queue depth
    - Error rates
    - Adapter health
    """
    
    def __init__(self, sea_instance=None):
        """
        Initialize health stream engine.
        
        Args:
            sea_instance: SEA instance to monitor
        """
        self.sea = sea_instance
        self.running = False
        self.health_checks = []
        self.alert_thresholds = {
            "cpu_percent": 80,
            "memory_mb": 1000,
            "queue_depth": 100,
            "error_rate": 0.05
        }
        
        logger.info("HealthStreamEngine initialized")
    
    def check_health(self) -> Dict[str, Any]:
        """
        Perform health check.
        
        Returns:
            Health status dict
        """
        if not self.sea:
            return {"status": "unavailable", "reason": "SEA not initialized"}
        
        try:
            import psutil
            process = psutil.Process()
            
            metrics = self.sea.get_performance_metrics()
            cpu_percent = process.cpu_percent()
            memory_mb = process.memory_info().rss / 1024 / 1024
            queue_depth = self.sea.get_queue_depth()
            
            total = metrics.get("total_requests", 1)
            failed = metrics.get("failed_requests", 0)
            error_rate = failed / max(total, 1)
            
            alerts = []
            if cpu_percent > self.alert_thresholds["cpu_percent"]:
                alerts.append(f"High CPU: {cpu_percent:.1f}%")
            if memory_mb > self.alert_thresholds["memory_mb"]:
                alerts.append(f"High memory: {memory_mb:.1f}MB")
            if queue_depth > self.alert_thresholds["queue_depth"]:
                alerts.append(f"High queue depth: {queue_depth}")
            if error_rate > self.alert_thresholds["error_rate"]:
                alerts.append(f"High error rate: {error_rate:.1%}")
            
            status = "healthy" if not alerts else "degraded"
            
            return {
                "status": status,
                "timestamp": datetime.utcnow().isoformat(),
                "metrics": {
                    "cpu_percent": cpu_percent,
                    "memory_mb": memory_mb,
                    "queue_depth": queue_depth,
                    "error_rate": error_rate
                },
                "alerts": alerts
            }
        
        except Exception as e:
            logger.error(f"Health check error: {e}")
            return {"status": "error", "reason": str(e)}
    
    async def run(self, interval=5):
        """
        Run health monitoring loop.
        
        Args:
            interval: Check interval in seconds
        """
        self.running = True
        logger.info(f"HealthStreamEngine started (interval={interval}s)")
        
        while self.running:
            try:
                health = self.check_health()
                self.health_checks.append(health)
                
                # Keep last 100 checks
                if len(self.health_checks) > 100:
                    self.health_checks = self.health_checks[-100:]
                
                # Log alerts
                if health.get("alerts"):
                    for alert in health["alerts"]:
                        logger.warning(f"Health alert: {alert}")
                
                await asyncio.sleep(interval)
            
            except Exception as e:
                logger.error(f"Health monitoring error: {e}")
                await asyncio.sleep(interval)
    
    def stop(self):
        """Stop health monitoring"""
        self.running = False
        logger.info("HealthStreamEngine stopped")


# ============================================================================
# WebSocket Event Bus
# ============================================================================

class WebSocketEventBus:
    """
    Event broadcasting to WebSocket clients.
    
    Broadcasts:
    - State changes
    - Performance metrics
    - Health alerts
    - Execution events
    """
    
    def __init__(self):
        """Initialize event bus"""
        self.subscribers: Set[Any] = set()  # WebSocket connections
        self.event_queue: asyncio.Queue = asyncio.Queue()
        self.running = False
        
        logger.info("WebSocketEventBus initialized")
    
    def subscribe(self, websocket):
        """Add WebSocket subscriber"""
        self.subscribers.add(websocket)
        logger.info(f"WebSocket subscribed (total: {len(self.subscribers)})")
    
    def unsubscribe(self, websocket):
        """Remove WebSocket subscriber"""
        self.subscribers.discard(websocket)
        logger.info(f"WebSocket unsubscribed (total: {len(self.subscribers)})")
    
    async def publish(self, event: Dict[str, Any]):
        """
        Publish event to all subscribers.
        
        Args:
            event: Event data
        """
        await self.event_queue.put(event)
    
    async def run(self):
        """Run event broadcasting loop"""
        self.running = True
        logger.info("WebSocketEventBus started")
        
        while self.running:
            try:
                # Get event from queue
                event = await asyncio.wait_for(
                    self.event_queue.get(),
                    timeout=1.0
                )
                
                # Broadcast to all subscribers
                disconnected = []
                for ws in self.subscribers:
                    try:
                        await ws.send_json(event)
                    except Exception as e:
                        logger.error(f"Error sending to subscriber: {e}")
                        disconnected.append(ws)
                
                # Remove disconnected
                for ws in disconnected:
                    self.unsubscribe(ws)
            
            except asyncio.TimeoutError:
                continue
            except Exception as e:
                logger.error(f"Event bus error: {e}")
    
    def stop(self):
        """Stop event bus"""
        self.running = False
        logger.info("WebSocketEventBus stopped")


# Made with Bob