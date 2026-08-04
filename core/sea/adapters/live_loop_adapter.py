"""
LiveLoop Adapter - Wraps Cerebral live loop engine

This adapter wraps the live loop engine from Cerebral, exposing it as a
SEA-compatible execution target for continuous monitoring and reactive tasks.
"""

import logging
import sys
import os
from typing import List
import time

# Add Cerebral to path
cerebral_path = os.path.join(os.path.dirname(__file__), "..", "..", "..", "Cerebral")
if cerebral_path not in sys.path:
    sys.path.insert(0, cerebral_path)

from .base_adapter import BaseAdapter
from ..models.execution_context import ExecutionContext, ExecutionResult

logger = logging.getLogger(__name__)


class LiveLoopAdapter(BaseAdapter):
    """
    Adapter for Cerebral live loop engine.
    
    Wraps continuous monitoring and reactive task execution.
    """
    
    def __init__(self):
        """Initialize LiveLoop adapter"""
        super().__init__("live_loop")
        self.engine = None
        self._initialize_engine()
    
    def _initialize_engine(self) -> None:
        """
        Initialize the live loop engine.
        
        Imports actual Cerebral live loop if available.
        """
        try:
            from runtime_live_bridge import emit_runtime_event, record_task_progress
            self.engine = {
                "emit_event": emit_runtime_event,
                "record_progress": record_task_progress
            }
            logger.info("LiveLoop engine initialized with real Cerebral runtime_live_bridge")
        except ImportError as e:
            logger.warning(f"Could not import runtime_live_bridge: {e}, using stub mode")
            self.engine = None
    
    def execute(self, ctx: ExecutionContext) -> ExecutionResult:
        """
        Execute live loop request.
        
        Args:
            ctx: Execution context
            
        Returns:
            ExecutionResult
        """
        start_time = time.time()
        
        try:
            if self.engine is None:
                # Engine not available
                self._record_execution(False)
                return ExecutionResult(
                    request_id=ctx.request_id,
                    status="failure",
                    error="LiveLoop engine not available",
                    duration_ms=0
                )
            
            # Call actual engine methods
            event_name = ctx.parameters.get("event_name", "cerebral.task.requested")
            payload = ctx.parameters.get("payload", {})
            
            result = self.engine["emit_event"](event_name, payload)
            
            output = {
                "message": "LiveLoop event emitted",
                "event": event_name,
                "result": result
            }
            
            duration_ms = (time.time() - start_time) * 1000
            self._record_execution(True)
            
            return ExecutionResult(
                request_id=ctx.request_id,
                status="success",
                output=output,
                duration_ms=duration_ms
            )
            
        except Exception as e:
            duration_ms = (time.time() - start_time) * 1000
            self._record_execution(False)
            
            logger.error(f"LiveLoop execution error: {e}", exc_info=True)
            
            return ExecutionResult(
                request_id=ctx.request_id,
                status="failure",
                error=str(e),
                duration_ms=duration_ms
            )
    
    def health_check(self) -> bool:
        """
        Check if live loop engine is healthy.
        
        Returns:
            True if healthy, False otherwise
        """
        return self.engine is not None
    
    def get_capabilities(self) -> List[str]:
        """Get LiveLoop adapter capabilities"""
        caps = [
            "event_emission",
            "task_progress",
            "runtime_monitoring",
            "reactive_execution"
        ]
        if self.engine is None:
            caps.append("stub_mode")
        return caps

# Made with Bob
