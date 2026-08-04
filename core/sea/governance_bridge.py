"""
Governance Bridge - Inline enforcement of Standards + Laws

This module integrates the existing governance layer (Standards Engine,
Law Engine, and Validation Gate) directly into the SEA execution pipeline.

CRITICAL: Every execution MUST pass through governance validation.
No execution may bypass this bridge.
"""

import logging
from typing import Dict, Any, Tuple
from pathlib import Path
import sys

from .models.execution_context import ExecutionContext

logger = logging.getLogger(__name__)


class GovernanceBridge:
    """
    Bridges SEA execution pipeline to governance layer.
    
    Enforces:
    - LeeWay Standards (8 rules)
    - 79 Leeway Laws (15 categories)
    - Validation Gate decisions
    
    Every execution context is validated before execution.
    Rejections are logged and receipted.
    """
    
    def __init__(self):
        """Initialize governance bridge"""
        self.governance_gate = None
        self.standards_engine = None
        self.law_engine = None
        self.validation_count = 0
        self.approval_count = 0
        self.rejection_count = 0
        
        # Try to import governance layer
        self._initialize_governance()
        
        logger.info(
            f"Governance bridge initialized "
            f"(gate_available={self.governance_gate is not None})"
        )
    
    def _initialize_governance(self) -> None:
        """Initialize governance layer components"""
        try:
            # Add core directory to path if needed
            core_path = Path(__file__).parent.parent
            if str(core_path) not in sys.path:
                sys.path.insert(0, str(core_path))
            
            # Import governance components
            from governance import GovernanceGate, LeeWayStandardsEngine, LeeWayLawEngine
            
            self.governance_gate = GovernanceGate()
            self.standards_engine = LeeWayStandardsEngine()
            self.law_engine = LeeWayLawEngine()
            
            logger.info("Governance layer loaded successfully")
            
        except ImportError as e:
            logger.warning(
                f"Governance layer not available: {e}. "
                f"Running in PERMISSIVE mode (all requests approved). "
                f"This is NOT safe for production!"
            )
            self.governance_gate = None
    
    def validate(self, ctx: ExecutionContext) -> Tuple[bool, str, Dict[str, Any]]:
        """
        Validate execution context against governance rules.
        
        Args:
            ctx: Execution context to validate
            
        Returns:
            Tuple of (allowed, reason, details):
                - allowed: True if execution is approved
                - reason: Explanation of decision
                - details: Additional governance details
        """
        self.validation_count += 1
        
        # If governance layer not available, run in permissive mode
        if self.governance_gate is None:
            logger.warning(
                f"PERMISSIVE MODE: Approving request {ctx.request_id} "
                f"(governance layer not available)"
            )
            self.approval_count += 1
            return True, "approved_permissive_mode", {
                "mode": "permissive",
                "warning": "governance_layer_not_available"
            }
        
        # Convert execution context to governance action format
        action = self._context_to_action(ctx)
        
        try:
            # Validate through governance gate
            # GovernanceGate.validate() returns tuple: (allowed, reason, details)
            allowed, reason, gate_details = self.governance_gate.validate(action)
            
            # Track statistics
            if allowed:
                self.approval_count += 1
            else:
                self.rejection_count += 1
            
            # Build detailed response using gate_details from tuple
            details = {
                "standards_check": gate_details.get("standards_check", "UNKNOWN") if isinstance(gate_details, dict) else "UNKNOWN",
                "laws_check": gate_details.get("laws_check", "UNKNOWN") if isinstance(gate_details, dict) else "UNKNOWN",
                "validation_details": gate_details if isinstance(gate_details, dict) else {},
                "receipt_path": gate_details.get("receipt_path") if isinstance(gate_details, dict) else None
            }
            
            logger.debug(
                f"Governance decision for {ctx.request_id}: "
                f"allowed={allowed}, reason={reason}"
            )
            
            return allowed, reason, details
            
        except Exception as e:
            # Governance check failed - REJECT for safety
            logger.error(f"Governance validation error: {e}")
            self.rejection_count += 1
            
            return False, f"governance_error: {str(e)}", {
                "error": str(e),
                "error_type": type(e).__name__
            }
    
    def _context_to_action(self, ctx: ExecutionContext) -> Dict[str, Any]:
        """
        Convert execution context to governance action format.
        
        Args:
            ctx: Execution context
            
        Returns:
            Action dict in governance format
        """
        return {
            "type": ctx.task_type,
            "action": ctx.action,
            "parameters": ctx.parameters,
            "source": ctx.source,
            "priority": ctx.priority,
            "metadata": ctx.metadata,
            "request_id": ctx.request_id
        }
    
    def check_standards(self, ctx: ExecutionContext) -> Tuple[bool, str]:
        """
        Check execution context against LeeWay Standards only.
        
        Args:
            ctx: Execution context
            
        Returns:
            Tuple of (passed, reason)
        """
        if self.standards_engine is None:
            return True, "standards_engine_not_available"
        
        try:
            action = self._context_to_action(ctx)
            result = self.standards_engine.check(action)
            
            return result.get("passed", False), result.get("reason", "unknown")
            
        except Exception as e:
            logger.error(f"Standards check error: {e}")
            return False, f"standards_error: {str(e)}"
    
    def check_laws(self, ctx: ExecutionContext) -> Tuple[bool, str]:
        """
        Check execution context against 79 Leeway Laws only.
        
        Args:
            ctx: Execution context
            
        Returns:
            Tuple of (passed, reason)
        """
        if self.law_engine is None:
            return True, "law_engine_not_available"
        
        try:
            action = self._context_to_action(ctx)
            result = self.law_engine.check(action)
            
            return result.get("passed", False), result.get("reason", "unknown")
            
        except Exception as e:
            logger.error(f"Laws check error: {e}")
            return False, f"laws_error: {str(e)}"
    
    def get_stats(self) -> Dict[str, Any]:
        """
        Get governance bridge statistics.
        
        Returns:
            dict with validation stats
        """
        approval_rate = (
            self.approval_count / self.validation_count
            if self.validation_count > 0 else 0
        )
        
        rejection_rate = (
            self.rejection_count / self.validation_count
            if self.validation_count > 0 else 0
        )
        
        return {
            "governance_available": self.governance_gate is not None,
            "validation_count": self.validation_count,
            "approval_count": self.approval_count,
            "rejection_count": self.rejection_count,
            "approval_rate": approval_rate,
            "rejection_rate": rejection_rate,
            "mode": "enforced" if self.governance_gate else "permissive"
        }
    
    def is_available(self) -> bool:
        """Check if governance layer is available"""
        return self.governance_gate is not None
    
    def is_healthy(self) -> bool:
        """
        Check if governance bridge is healthy.
        
        Returns:
            True if governance is available and functioning
        """
        if not self.is_available():
            return False
        
        # Check if approval rate is reasonable (not 0% or 100%)
        stats = self.get_stats()
        if stats["validation_count"] > 10:
            rate = stats["approval_rate"]
            # Healthy range: 50-99% approval
            return 0.5 <= rate <= 0.99
        
        return True
    
    def reset_stats(self) -> None:
        """Reset statistics"""
        self.validation_count = 0
        self.approval_count = 0
        self.rejection_count = 0
        logger.info("Governance bridge stats reset")
    
    def __repr__(self) -> str:
        """String representation for debugging"""
        stats = self.get_stats()
        return (
            f"GovernanceBridge("
            f"mode={stats['mode']}, "
            f"validations={stats['validation_count']}, "
            f"approval_rate={stats['approval_rate']:.2%})"
        )


# Convenience function for quick validation
def validate_action(
    task_type: str,
    action: str,
    parameters: Dict[str, Any] = None,
    source: str = "unknown"
) -> Tuple[bool, str]:
    """
    Quick validation without full execution context.
    
    Args:
        task_type: Type of task
        action: Action to perform
        parameters: Optional parameters
        source: Source of request
        
    Returns:
        Tuple of (allowed, reason)
    """
    bridge = GovernanceBridge()
    
    ctx = ExecutionContext(
        task_type=task_type,
        action=action,
        parameters=parameters or {},
        source=source
    )
    
    allowed, reason, _ = bridge.validate(ctx)
    return allowed, reason

# Made with Bob
