"""
Tool Adapter - Wraps Cerebral tool router functionality

This adapter wraps the tool router from Cerebral, exposing it as a
SEA-compatible execution target for tool operations.
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


class ToolAdapter(BaseAdapter):
    """
    Adapter for Cerebral tool router.
    
    Wraps tool execution functionality for file operations, system commands,
    API calls, and other tool-based actions.
    """
    
    def __init__(self):
        """Initialize Tool adapter"""
        super().__init__("tools")
        self.router = None
        self._initialize_router()
    
    def _initialize_router(self) -> None:
        """
        Initialize the tool router.
        
        Imports actual Cerebral tool router if available.
        """
        try:
            from tool_router import route as tool_route
            self.router = tool_route
            logger.info("Tool router initialized with real Cerebral tool_router")
        except ImportError as e:
            logger.warning(f"Could not import tool_router: {e}, using stub mode")
            self.router = None
    
    def execute(self, ctx: ExecutionContext) -> ExecutionResult:
        """
        Execute tool request through tool router.
        
        Args:
            ctx: Execution context
            
        Returns:
            ExecutionResult
        """
        start_time = time.time()
        
        try:
            if self.router is None:
                # Router not available
                self._record_execution(False)
                return ExecutionResult(
                    request_id=ctx.request_id,
                    status="failure",
                    error="Tool router not available",
                    duration_ms=0
                )
            
            # Call actual router method
            message = ctx.parameters.get("message", "")
            result = self.router(message)
            
            output = {
                "message": "Tool executed",
                "tool": ctx.action,
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
            
            logger.error(f"Tool execution error: {e}", exc_info=True)
            
            return ExecutionResult(
                request_id=ctx.request_id,
                status="failure",
                error=str(e),
                duration_ms=duration_ms
            )
    
    def health_check(self) -> bool:
        """
        Check if tool router is healthy.
        
        Returns:
            True if healthy, False otherwise
        """
        return self.router is not None
    
    def get_capabilities(self) -> List[str]:
        """Get Tool adapter capabilities"""
        caps = [
            "file_operations",
            "system_commands",
            "api_calls",
            "tool_execution",
            "cerebral_tools"
        ]
        if self.router is None:
            caps.append("stub_mode")
        return caps

# Made with Bob
