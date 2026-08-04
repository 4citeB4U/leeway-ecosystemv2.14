"""
Base Adapter - Abstract interface for all SEA adapters

All adapters that wrap existing subsystems must implement this interface.
This ensures consistent behavior across all adapters.
"""

from abc import ABC, abstractmethod
from typing import List, Dict, Any

from ..models.execution_context import ExecutionContext, ExecutionResult


class BaseAdapter(ABC):
    """
    Abstract base class for all SEA adapters.
    
    Adapters wrap existing subsystems and expose them as SEA-compatible
    execution targets. Every adapter must implement:
    - execute(): Process an execution context
    - health_check(): Report health status
    - get_capabilities(): List what this adapter can do
    
    Adapters should NOT contain independent loops. They should expose
    a step() or process() method that SEA can call per request.
    """
    
    def __init__(self, subsystem_name: str):
        """
        Initialize adapter.
        
        Args:
            subsystem_name: Name of the subsystem this adapter wraps
        """
        self.subsystem_name = subsystem_name
        self.execution_count = 0
        self.error_count = 0
    
    @abstractmethod
    def execute(self, ctx: ExecutionContext) -> ExecutionResult:
        """
        Execute a request through this adapter.
        
        This is the main entry point for execution. The adapter should:
        1. Extract parameters from context
        2. Call the underlying subsystem
        3. Collect results
        4. Return ExecutionResult
        
        Args:
            ctx: Execution context containing request details
            
        Returns:
            ExecutionResult with status, output, and timing
            
        Raises:
            Exception: If execution fails critically
        """
        pass
    
    @abstractmethod
    def health_check(self) -> bool:
        """
        Check if the underlying subsystem is healthy.
        
        Returns:
            True if healthy, False otherwise
        """
        pass
    
    @abstractmethod
    def get_capabilities(self) -> List[str]:
        """
        Get list of capabilities this adapter provides.
        
        Returns:
            List of capability strings (e.g., ["request_processing", "state_management"])
        """
        pass
    
    def get_stats(self) -> Dict[str, Any]:
        """
        Get adapter statistics.
        
        Returns:
            dict with execution stats
        """
        error_rate = (
            self.error_count / self.execution_count
            if self.execution_count > 0 else 0
        )
        
        return {
            "subsystem_name": self.subsystem_name,
            "execution_count": self.execution_count,
            "error_count": self.error_count,
            "error_rate": error_rate
        }
    
    def _record_execution(self, success: bool) -> None:
        """Record execution statistics"""
        self.execution_count += 1
        if not success:
            self.error_count += 1
    
    def __repr__(self) -> str:
        """String representation for debugging"""
        return (
            f"{self.__class__.__name__}("
            f"subsystem={self.subsystem_name}, "
            f"executions={self.execution_count})"
        )


class DefaultAdapter(BaseAdapter):
    """
    Default adapter for unknown task types.
    
    Simply logs the request and returns success.
    Useful for testing and as a fallback.
    """
    
    def __init__(self):
        """Initialize default adapter"""
        super().__init__("default")
    
    def execute(self, ctx: ExecutionContext) -> ExecutionResult:
        """Log request and return success"""
        import logging
        logger = logging.getLogger(__name__)
        
        logger.info(
            f"Default adapter handling: {ctx.task_type}.{ctx.action} "
            f"(request_id={ctx.request_id})"
        )
        
        self._record_execution(True)
        
        return ExecutionResult(
            request_id=ctx.request_id,
            status="success",
            output={
                "message": "Handled by default adapter",
                "task_type": ctx.task_type,
                "action": ctx.action
            },
            duration_ms=0.1
        )
    
    def health_check(self) -> bool:
        """Default adapter is always healthy"""
        return True
    
    def get_capabilities(self) -> List[str]:
        """Default adapter provides fallback capability"""
        return ["fallback", "logging"]

# Made with Bob
