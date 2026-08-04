"""
Genesis Adapter - Wraps Cerebral genesis service kernel

This adapter wraps the genesis service kernel from Cerebral, exposing it as a
SEA-compatible execution target for service orchestration and lifecycle management.
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


class GenesisAdapter(BaseAdapter):
    """
    Adapter for Cerebral genesis service kernel.
    
    Wraps service orchestration and lifecycle management.
    """
    
    def __init__(self):
        """Initialize Genesis adapter"""
        super().__init__("genesis")
        self.kernel = None
        self._initialize_kernel()
    
    def _initialize_kernel(self) -> None:
        """
        Initialize the genesis kernel.
        
        Imports actual Cerebral genesis kernel if available.
        """
        try:
            from task_spine import run_spine
            self.kernel = {"run_spine": run_spine}
            logger.info("Genesis kernel initialized with real Cerebral task_spine")
        except ImportError as e:
            logger.warning(f"Could not import task_spine: {e}, using stub mode")
            self.kernel = None
    
    def execute(self, ctx: ExecutionContext) -> ExecutionResult:
        """
        Execute genesis request.
        
        Args:
            ctx: Execution context
            
        Returns:
            ExecutionResult
        """
        start_time = time.time()
        
        try:
            if self.kernel is None:
                # Kernel not available
                self._record_execution(False)
                return ExecutionResult(
                    request_id=ctx.request_id,
                    status="failure",
                    error="Genesis kernel not available",
                    duration_ms=0
                )
            
            # Call actual kernel method
            message = ctx.parameters.get("message", "")
            user_name = ctx.parameters.get("user_name", "system")
            
            result = self.kernel["run_spine"](message, user_name=user_name)
            
            output = {
                "message": "Genesis task executed",
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
            
            logger.error(f"Genesis execution error: {e}", exc_info=True)
            
            return ExecutionResult(
                request_id=ctx.request_id,
                status="failure",
                error=str(e),
                duration_ms=duration_ms
            )
    
    def health_check(self) -> bool:
        """
        Check if genesis kernel is healthy.
        
        Returns:
            True if healthy, False otherwise
        """
        return self.kernel is not None
    
    def get_capabilities(self) -> List[str]:
        """Get Genesis adapter capabilities"""
        caps = [
            "service_orchestration",
            "lifecycle_management",
            "task_execution",
            "planning"
        ]
        if self.kernel is None:
            caps.append("stub_mode")
        return caps

# Made with Bob
