"""
State Store - Runtime state management and request queue for SEA

This module manages:
- Request queue (thread-safe)
- Runtime state snapshots
- State persistence
- Queue depth monitoring

State snapshots are written to: Archive/runtime-state/
"""

import json
import logging
import threading
from collections import deque
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional, List
from queue import Queue, Empty

from .models.execution_context import ExecutionContext

logger = logging.getLogger(__name__)


class StateStore:
    """
    Manages SEA runtime state and request queue.
    
    Features:
    - Thread-safe request queue
    - Periodic state snapshots to disk
    - State recovery on restart
    - Queue depth monitoring
    - Performance metrics
    
    State snapshots location: Archive/runtime-state/
    """
    
    STATE_DIR = Path("Archive/runtime-state")
    SNAPSHOT_INTERVAL_SECONDS = 60  # Snapshot every minute
    MAX_QUEUE_SIZE = 1000  # Maximum pending requests
    
    def __init__(self):
        """Initialize state store"""
        self.request_queue = Queue(maxsize=self.MAX_QUEUE_SIZE)
        self.state_lock = threading.Lock()
        
        # Runtime state
        self.sea_status = "initializing"
        self.started_at = datetime.utcnow()
        self.total_requests_processed = 0
        self.total_requests_queued = 0
        self.total_requests_rejected = 0
        self.active_adapters = []
        self.last_snapshot_at = None
        
        # Performance metrics
        self.execution_times = deque(maxlen=1000)  # Last 1000 execution times
        self.governance_decisions = {"approved": 0, "rejected": 0}
        self.errors = deque(maxlen=100)  # Last 100 errors
        
        # Ensure state directory exists
        self.STATE_DIR.mkdir(parents=True, exist_ok=True)
        
        logger.info(f"State store initialized (queue_max={self.MAX_QUEUE_SIZE})")
    
    def queue_request(self, ctx: ExecutionContext) -> bool:
        """
        Add request to queue.
        
        Args:
            ctx: Execution context to queue
            
        Returns:
            True if queued successfully, False if queue is full
        """
        try:
            self.request_queue.put(ctx, block=False)
            
            with self.state_lock:
                self.total_requests_queued += 1
            
            logger.debug(f"Request queued: {ctx.request_id} (depth={self.get_queue_depth()})")
            return True
            
        except Exception as e:
            logger.error(f"Failed to queue request: {e}")
            
            with self.state_lock:
                self.total_requests_rejected += 1
            
            return False
    
    def get_next_request(self, timeout: float = 0.1) -> Optional[ExecutionContext]:
        """
        Get next request from queue.
        
        Args:
            timeout: Maximum time to wait for request (seconds)
            
        Returns:
            Next execution context, or None if queue is empty
        """
        try:
            ctx = self.request_queue.get(block=True, timeout=timeout)
            logger.debug(f"Request dequeued: {ctx.request_id}")
            return ctx
            
        except Empty:
            return None
        except Exception as e:
            logger.error(f"Failed to get request: {e}")
            return None
    
    def get_queue_depth(self) -> int:
        """Get current queue depth"""
        return self.request_queue.qsize()
    
    def is_queue_full(self) -> bool:
        """Check if queue is full"""
        return self.request_queue.full()
    
    def is_queue_empty(self) -> bool:
        """Check if queue is empty"""
        return self.request_queue.empty()
    
    def mark_request_processed(
        self,
        request_id: str,
        execution_time_ms: float,
        success: bool
    ) -> None:
        """
        Mark request as processed and update metrics.
        
        Args:
            request_id: ID of processed request
            execution_time_ms: Execution time in milliseconds
            success: Whether execution was successful
        """
        with self.state_lock:
            self.total_requests_processed += 1
            self.execution_times.append(execution_time_ms)
        
        logger.debug(
            f"Request processed: {request_id} "
            f"(time={execution_time_ms:.1f}ms, success={success})"
        )
    
    def mark_governance_decision(self, approved: bool) -> None:
        """Record governance decision"""
        with self.state_lock:
            if approved:
                self.governance_decisions["approved"] += 1
            else:
                self.governance_decisions["rejected"] += 1
    
    def record_error(self, error: str, context: Optional[Dict[str, Any]] = None) -> None:
        """Record error for monitoring"""
        error_record = {
            "timestamp": datetime.utcnow().isoformat(),
            "error": error,
            "context": context or {}
        }
        
        with self.state_lock:
            self.errors.append(error_record)
        
        logger.error(f"Error recorded: {error}")
    
    def set_sea_status(self, status: str) -> None:
        """Set SEA status"""
        with self.state_lock:
            self.sea_status = status
        logger.info(f"SEA status: {status}")
    
    def register_adapter(self, adapter_name: str) -> None:
        """Register active adapter"""
        with self.state_lock:
            if adapter_name not in self.active_adapters:
                self.active_adapters.append(adapter_name)
        logger.info(f"Adapter registered: {adapter_name}")
    
    def get_state_snapshot(self) -> Dict[str, Any]:
        """
        Get current state snapshot.
        
        Returns:
            dict containing complete runtime state
        """
        with self.state_lock:
            uptime = (datetime.utcnow() - self.started_at).total_seconds()
            
            # Calculate metrics
            avg_execution_time = (
                sum(self.execution_times) / len(self.execution_times)
                if self.execution_times else 0
            )
            
            total_governance = sum(self.governance_decisions.values())
            approval_rate = (
                self.governance_decisions["approved"] / total_governance
                if total_governance > 0 else 0
            )
            
            error_rate = (
                len(self.errors) / self.total_requests_processed
                if self.total_requests_processed > 0 else 0
            )
            
            return {
                "sea_status": self.sea_status,
                "uptime_seconds": uptime,
                "started_at": self.started_at.isoformat(),
                "queue_depth": self.get_queue_depth(),
                "queue_max_size": self.MAX_QUEUE_SIZE,
                "total_requests_queued": self.total_requests_queued,
                "total_requests_processed": self.total_requests_processed,
                "total_requests_rejected": self.total_requests_rejected,
                "active_adapters": self.active_adapters.copy(),
                "last_snapshot_at": self.last_snapshot_at,
                "metrics": {
                    "avg_execution_time_ms": avg_execution_time,
                    "governance_approval_rate": approval_rate,
                    "error_rate": error_rate,
                    "governance_decisions": self.governance_decisions.copy(),
                    "recent_errors_count": len(self.errors)
                }
            }
    
    def write_snapshot(self) -> str:
        """
        Write state snapshot to disk.
        
        Returns:
            Path to written snapshot file
        """
        snapshot = self.get_state_snapshot()
        
        # Generate filename
        timestamp = datetime.utcnow().strftime("%Y%m%d-%H%M%S")
        filename = f"sea-state-{timestamp}.json"
        snapshot_path = self.STATE_DIR / filename
        
        try:
            with open(snapshot_path, 'w', encoding='utf-8') as f:
                json.dump(snapshot, f, indent=2, ensure_ascii=False)
            
            with self.state_lock:
                self.last_snapshot_at = datetime.utcnow().isoformat()
            
            logger.info(f"State snapshot written: {snapshot_path}")
            return str(snapshot_path)
            
        except (IOError, OSError) as e:
            logger.error(f"Failed to write state snapshot: {e}")
            raise RuntimeError(f"Failed to write state snapshot: {e}")
    
    def load_latest_snapshot(self) -> Optional[Dict[str, Any]]:
        """
        Load most recent state snapshot.
        
        Returns:
            State snapshot data, or None if no snapshots exist
        """
        try:
            # Find most recent snapshot
            snapshots = sorted(self.STATE_DIR.glob("sea-state-*.json"), reverse=True)
            
            if not snapshots:
                logger.info("No previous state snapshots found")
                return None
            
            latest = snapshots[0]
            
            with open(latest, 'r', encoding='utf-8') as f:
                snapshot = json.load(f)
            
            logger.info(f"Loaded state snapshot: {latest}")
            return snapshot
            
        except (IOError, OSError, json.JSONDecodeError) as e:
            logger.error(f"Failed to load state snapshot: {e}")
            return None
    
    def restore_from_snapshot(self, snapshot: Dict[str, Any]) -> None:
        """
        Restore state from snapshot.
        
        Args:
            snapshot: State snapshot to restore from
        """
        with self.state_lock:
            # Restore counters (but not queue - that's transient)
            self.total_requests_processed = snapshot.get("total_requests_processed", 0)
            self.total_requests_queued = snapshot.get("total_requests_queued", 0)
            self.total_requests_rejected = snapshot.get("total_requests_rejected", 0)
            self.active_adapters = snapshot.get("active_adapters", [])
            
            # Restore governance decisions
            if "metrics" in snapshot and "governance_decisions" in snapshot["metrics"]:
                self.governance_decisions = snapshot["metrics"]["governance_decisions"]
        
        logger.info("State restored from snapshot")
    
    def get_stats(self) -> Dict[str, Any]:
        """Get state store statistics"""
        return self.get_state_snapshot()
    
    def clear_queue(self) -> int:
        """
        Clear all pending requests from queue.
        
        Returns:
            Number of requests cleared
        """
        count = 0
        while not self.request_queue.empty():
            try:
                self.request_queue.get(block=False)
                count += 1
            except Empty:
                break
        
        logger.warning(f"Queue cleared: {count} requests removed")
        return count
    
    def __repr__(self) -> str:
        """String representation for debugging"""
        return (
            f"StateStore("
            f"status={self.sea_status}, "
            f"queue_depth={self.get_queue_depth()}, "
            f"processed={self.total_requests_processed})"
        )

# Made with Bob
