"""
9E - Cognitive Receipt & Identity Loop

This module implements the self-improvement backbone of Agent Lee.
Every execution generates a receipt, triggers reflection, extracts patterns,
updates cache, and mutates identity.

Core Principle:
    "Every thought becomes a record. Every record becomes learning. 
     Every learning changes behavior."

Key Rule:
    If it is not receipted, it did not happen.
"""

from .receipt_schema_engine import ExecutionReceipt
from .receipt_builder import ReceiptBuilder
from .execution_tracker import ExecutionTracker
from .reflection_engine import ReflectionEngine
from .learning_compiler import LearningCompiler
from .identity_mutation_rules import IdentityMutationRules
from .cache_injection_system import CacheInjectionSystem
from .pattern_extractor import PatternExtractor
from .sea_integration_hooks import SEAIntegrationHooks

__all__ = [
    'ExecutionReceipt',
    'ReceiptBuilder',
    'ExecutionTracker',
    'ReflectionEngine',
    'LearningCompiler',
    'IdentityMutationRules',
    'CacheInjectionSystem',
    'PatternExtractor',
    'SEAIntegrationHooks',
]

__version__ = '1.0.0'

# Made with Bob
