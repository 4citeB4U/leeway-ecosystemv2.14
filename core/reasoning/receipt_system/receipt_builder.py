"""
Receipt Builder

Builds execution receipts from SEA execution context.
"""

from typing import Any, Dict
from .receipt_schema_engine import ExecutionReceipt


class ReceiptBuilder:
    """Converts SEA execution into structured receipt"""
    
    def build(self, context: Any, execution_result: Any) -> ExecutionReceipt:
        """
        Build receipt from execution context and result.
        
        Args:
            context: SEA execution context
            execution_result: Result from adapter execution
            
        Returns:
            ExecutionReceipt with complete execution record
        """
        return ExecutionReceipt(
            intent=self._extract_intent(context),
            plan=self._extract_plan(context),
            execution_steps=self._extract_steps(execution_result),
            tools_used=self._extract_tools(execution_result),
            expected_outcome=getattr(context, 'expected_outcome', ''),
            actual_outcome=self._extract_outcome(execution_result),
            success_score=self._calculate_score(execution_result),
            failure_modes=self._extract_failures(execution_result),
            latency_ms=getattr(execution_result, 'duration', 0.0),
            system_impact=self._extract_impact(execution_result),
            reasoning_trace=getattr(context, 'trace', []),
        )
    
    def _extract_intent(self, context: Any) -> Dict[str, Any]:
        """Extract intent from context"""
        return {
            "task_type": getattr(context, 'task_type', 'unknown'),
            "action": getattr(context, 'action', 'unknown'),
            "params": getattr(context, 'params', {})
        }
    
    def _extract_plan(self, context: Any) -> Dict[str, Any]:
        """Extract plan from context"""
        return {
            "request_id": getattr(context, 'request_id', 'unknown'),
            "priority": getattr(context, 'priority', 'normal')
        }
    
    def _extract_steps(self, result: Any) -> list:
        """Extract execution steps"""
        return getattr(result, 'steps', [])
    
    def _extract_tools(self, result: Any) -> list:
        """Extract tools used"""
        return getattr(result, 'tools', [])
    
    def _extract_outcome(self, result: Any) -> str:
        """Extract actual outcome"""
        return str(getattr(result, 'output', ''))
    
    def _calculate_score(self, result: Any) -> float:
        """Calculate success score"""
        if getattr(result, 'success', False):
            return 1.0
        errors = getattr(result, 'errors', [])
        return max(0.0, 1.0 - len(errors) * 0.2)
    
    def _extract_failures(self, result: Any) -> list:
        """Extract failure modes"""
        return getattr(result, 'errors', [])
    
    def _extract_impact(self, result: Any) -> Dict[str, float]:
        """Extract system impact metrics"""
        return getattr(result, 'metrics', {})

# Made with Bob
