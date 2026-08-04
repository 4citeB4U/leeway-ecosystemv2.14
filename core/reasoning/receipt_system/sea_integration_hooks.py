"""
SEA Integration Hooks

Provides hooks for integrating 9E cognitive system with SEA.
"""

from typing import Dict, Any, Optional
import asyncio
from datetime import datetime

from .receipt_schema_engine import ExecutionReceipt
from .receipt_builder import ReceiptBuilder
from .execution_tracker import ExecutionTracker
from .reflection_engine import ReflectionEngine
from .learning_compiler import LearningCompiler
from .identity_mutation_rules import IdentityMutationRules
from .cache_injection_system import CacheInjectionSystem
from .pattern_extractor import PatternExtractor


class SEAIntegrationHooks:
    """Integration hooks for SEA execution"""
    
    def __init__(self, enabled: bool = True):
        self.enabled = enabled
        self.receipt_builder = ReceiptBuilder()
        self.execution_tracker = ExecutionTracker()
        self.reflection_engine = ReflectionEngine()
        self.learning_compiler = LearningCompiler()
        self.identity_rules = IdentityMutationRules()
        self.cache_system = CacheInjectionSystem()
        self.pattern_extractor = PatternExtractor()
    
    async def pre_execution_hook(
        self,
        context: Any
    ) -> Dict[str, Any]:
        """
        Hook called before SEA execution.
        
        Args:
            context: SEA execution context
            
        Returns:
            Pre-execution metadata
        """
        if not self.enabled:
            return {"9e_enabled": False}
        
        return {
            "9e_enabled": True,
            "started_at": datetime.utcnow().isoformat(),
            "context_id": getattr(context, 'request_id', 'unknown'),
            "cached_learning": self._get_relevant_cache(context)
        }
    
    async def post_execution_hook(
        self,
        context: Any,
        execution_result: Any,
        pre_metadata: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Hook called after SEA execution.
        
        Args:
            context: SEA execution context
            execution_result: Execution result
            pre_metadata: Metadata from pre-execution hook
            
        Returns:
            Post-execution metadata including receipt path
        """
        if not self.enabled:
            return {"9e_enabled": False}
        
        try:
            # Build receipt
            receipt = self.receipt_builder.build(context, execution_result)
            
            # Track execution
            receipt_path = self.execution_tracker.track_execution(receipt)
            
            # Trigger async learning (non-blocking)
            asyncio.create_task(self._async_learning_pipeline(receipt))
            
            return {
                "9e_enabled": True,
                "receipt_path": receipt_path,
                "receipt_id": receipt.receipt_id,
                "completed_at": datetime.utcnow().isoformat()
            }
        except Exception as e:
            return {
                "9e_enabled": True,
                "error": str(e),
                "completed_at": datetime.utcnow().isoformat()
            }
    
    async def _async_learning_pipeline(self, receipt: ExecutionReceipt):
        """
        Async learning pipeline (non-blocking).
        
        Args:
            receipt: Execution receipt
        """
        try:
            # Analyze receipt
            analysis = self.reflection_engine.analyze_receipt(receipt.to_dict())
            
            # Compile learning
            learning_rule = self.learning_compiler.compile_learning(
                analysis,
                context={"receipt_id": receipt.receipt_id}
            )
            
            # Inject into cache
            self.cache_system.inject_learning(learning_rule)
            
            # Check if identity mutation needed
            if learning_rule.get("priority") == "high":
                await self._consider_identity_mutation(learning_rule)
        
        except Exception:
            # Silent failure - learning is best-effort
            pass
    
    async def _consider_identity_mutation(self, learning_rule: Dict[str, Any]):
        """
        Consider identity mutation based on learning.
        
        Args:
            learning_rule: Compiled learning rule
        """
        try:
            # Load current identity
            current_identity = self._load_current_identity()
            
            # Apply learning to identity
            proposed_identity = self.identity_rules.apply_learning(
                learning_rule,
                current_identity
            )
            
            # Validate mutation
            validation = self.identity_rules.validate_mutation(
                proposed_identity,
                current_identity
            )
            
            # Persist if valid
            if validation.get("approved"):
                self.identity_rules.persist_mutation(
                    proposed_identity,
                    learning_rule
                )
        
        except Exception:
            # Silent failure - identity mutation is best-effort
            pass
    
    def _get_relevant_cache(self, context: Any) -> list:
        """Get relevant cached learning for context"""
        try:
            # Get all cached learning
            cached = self.cache_system.get_cached_learning("behavior")
            
            # Filter by relevance (simple implementation)
            task_type = getattr(context, 'task_type', 'unknown')
            relevant = [
                c for c in cached
                if task_type in str(c.get("pattern", {}))
            ]
            
            return relevant[:5]  # Top 5 most relevant
        except Exception:
            return []
    
    def _load_current_identity(self) -> Dict[str, Any]:
        """Load current identity manifest"""
        try:
            import json
            manifest_path = self.identity_rules.manifest_file
            if manifest_path.exists():
                with open(manifest_path, 'r', encoding='utf-8') as f:
                    return json.load(f)
        except Exception:
            pass
        
        # Return default identity
        return {
            "agentId": "agent-lee",
            "agentMode": "code-mode",
            "role": "supreme-agent-lead",
            "canonicalFingerprint": "leeway.agent-lee.code-mode.canonical.supreme-agent-lead.v1",
            "authorityOwner": "Leonard Lee",
            "capabilities": [],
            "behaviors": {},
            "constraints": [],
            "version": "1.0.0"
        }
    
    def get_learning_summary(self) -> Dict[str, Any]:
        """
        Get summary of learning system state.
        
        Returns:
            Learning system summary
        """
        if not self.enabled:
            return {"9e_enabled": False}
        
        try:
            # Get recent receipts
            recent_receipts = self.execution_tracker.get_recent_receipts(limit=20)
            
            # Extract patterns
            patterns = self.pattern_extractor.extract_patterns(recent_receipts)
            
            # Analyze batch
            batch_analysis = self.reflection_engine.analyze_batch(recent_receipts)
            
            # Get cached learning
            cached_behavior = self.cache_system.get_cached_learning("behavior")
            cached_optimization = self.cache_system.get_cached_learning("optimization")
            
            return {
                "9e_enabled": True,
                "recent_executions": len(recent_receipts),
                "success_rate": batch_analysis.get("success_rate", 0),
                "patterns_found": sum(len(p) for p in patterns.values()),
                "cached_learning": {
                    "behavior": len(cached_behavior),
                    "optimization": len(cached_optimization)
                },
                "recommendations": batch_analysis.get("recommendations", [])
            }
        except Exception as e:
            return {
                "9e_enabled": True,
                "error": str(e)
            }

# Made with Bob
