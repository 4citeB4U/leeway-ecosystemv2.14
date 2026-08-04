"""
Receipt Schema Engine

Defines the immutable execution receipt structure.
Every execution MUST produce a normalized cognitive artifact.
"""

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional
from datetime import datetime
import uuid


@dataclass
class ExecutionReceipt:
    """
    Universal execution receipt structure.
    
    This is the canonical record of "what happened" for every execution.
    """
    
    # Identity
    receipt_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    
    # Intent & Plan
    intent: Optional[Dict[str, Any]] = None
    plan: Optional[Dict[str, Any]] = None
    
    # Execution
    execution_steps: Optional[List[Dict[str, Any]]] = None
    tools_used: Optional[List[str]] = None
    
    # Outcome
    expected_outcome: str = ""
    actual_outcome: str = ""
    
    # Metrics
    success_score: float = 0.0
    failure_modes: Optional[List[str]] = None
    latency_ms: float = 0.0
    
    # System Impact
    system_impact: Optional[Dict[str, float]] = None
    
    # Reasoning
    reasoning_trace: Optional[List[str]] = None
    
    # Learning
    learning_signals: Optional[List[str]] = None
    pattern_candidates: Optional[List[str]] = None
    
    # Identity
    identity_delta: Optional[Dict[str, Any]] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization"""
        return {
            "receipt_id": self.receipt_id,
            "timestamp": self.timestamp,
            "intent": self.intent,
            "plan": self.plan,
            "execution_steps": self.execution_steps,
            "tools_used": self.tools_used,
            "expected_outcome": self.expected_outcome,
            "actual_outcome": self.actual_outcome,
            "success_score": self.success_score,
            "failure_modes": self.failure_modes,
            "latency_ms": self.latency_ms,
            "system_impact": self.system_impact,
            "reasoning_trace": self.reasoning_trace,
            "learning_signals": self.learning_signals,
            "pattern_candidates": self.pattern_candidates,
            "identity_delta": self.identity_delta
        }

# Made with Bob
