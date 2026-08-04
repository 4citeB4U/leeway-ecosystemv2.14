"""
Learning Compiler

Compiles insights from reflection into actionable learning rules.
"""

from typing import Dict, List, Any
from datetime import datetime


class LearningCompiler:
    """Compiles reflection insights into learning rules"""
    
    def compile_learning(
        self,
        analysis: Dict[str, Any],
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Compile analysis into learning rule.
        
        Args:
            analysis: Reflection analysis results
            context: Execution context
            
        Returns:
            Learning rule dictionary
        """
        learning_id = self._generate_learning_id()
        
        return {
            "learning_id": learning_id,
            "learned_at": datetime.utcnow().isoformat(),
            "source": "reflection_engine",
            "confidence": self._calculate_confidence(analysis),
            "pattern": self._extract_pattern(analysis),
            "rule": self._generate_rule(analysis, context),
            "application_scope": self._determine_scope(analysis),
            "priority": self._calculate_priority(analysis),
            "validation_criteria": self._define_validation(analysis)
        }
    
    def compile_batch_learning(
        self,
        batch_analysis: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Compile batch analysis into multiple learning rules.
        
        Args:
            batch_analysis: Batch reflection results
            
        Returns:
            List of learning rules
        """
        rules = []
        
        # Success rate learning
        if batch_analysis.get("success_rate", 0) < 0.8:
            rules.append(self._create_success_improvement_rule(batch_analysis))
        
        # Performance learning
        if batch_analysis.get("average_latency_ms", 0) > 3000:
            rules.append(self._create_performance_rule(batch_analysis))
        
        # Tool usage learning
        tool_usage = batch_analysis.get("tool_usage", {})
        if tool_usage:
            rules.append(self._create_tool_optimization_rule(tool_usage))
        
        # Failure pattern learning
        failures = batch_analysis.get("common_failures", {})
        if failures:
            rules.append(self._create_failure_prevention_rule(failures))
        
        return rules
    
    def _generate_learning_id(self) -> str:
        """Generate unique learning ID"""
        timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S%f")
        return f"learning-{timestamp}"
    
    def _calculate_confidence(self, analysis: Dict[str, Any]) -> float:
        """Calculate confidence in learning"""
        # Base confidence on data quality
        success_factors = len(analysis.get("success_factors", []))
        failure_patterns = len(analysis.get("failure_patterns", []))
        
        if success_factors + failure_patterns == 0:
            return 0.5
        
        return min(1.0, (success_factors + failure_patterns) / 10.0)
    
    def _extract_pattern(self, analysis: Dict[str, Any]) -> Dict[str, Any]:
        """Extract pattern from analysis"""
        return {
            "success_factors": analysis.get("success_factors", []),
            "failure_patterns": analysis.get("failure_patterns", []),
            "performance": analysis.get("performance_metrics", {})
        }
    
    def _generate_rule(
        self,
        analysis: Dict[str, Any],
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate actionable rule"""
        improvements = analysis.get("improvement_opportunities", [])
        
        if "optimize_latency" in improvements:
            return {
                "type": "performance_optimization",
                "action": "cache_results",
                "condition": "latency > 5000ms"
            }
        
        if "improve_success_rate" in improvements:
            return {
                "type": "reliability_improvement",
                "action": "add_retry_logic",
                "condition": "success_score < 0.8"
            }
        
        return {
            "type": "general_improvement",
            "action": "monitor_and_analyze",
            "condition": "always"
        }
    
    def _determine_scope(self, analysis: Dict[str, Any]) -> str:
        """Determine where rule applies"""
        # Determine scope based on pattern breadth
        if len(analysis.get("success_factors", [])) > 3:
            return "global"
        return "local"
    
    def _calculate_priority(self, analysis: Dict[str, Any]) -> str:
        """Calculate rule priority"""
        improvements = analysis.get("improvement_opportunities", [])
        
        if "reduce_failures" in improvements:
            return "high"
        if "optimize_latency" in improvements:
            return "medium"
        return "low"
    
    def _define_validation(self, analysis: Dict[str, Any]) -> Dict[str, Any]:
        """Define how to validate rule effectiveness"""
        return {
            "metric": "success_score",
            "threshold": 0.8,
            "sample_size": 10
        }
    
    def _create_success_improvement_rule(
        self,
        batch_analysis: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Create rule to improve success rate"""
        return {
            "learning_id": self._generate_learning_id(),
            "learned_at": datetime.utcnow().isoformat(),
            "type": "success_improvement",
            "pattern": {
                "success_rate": batch_analysis.get("success_rate", 0),
                "common_failures": batch_analysis.get("common_failures", {})
            },
            "rule": {
                "action": "implement_failure_prevention",
                "targets": list(batch_analysis.get("common_failures", {}).keys())[:3]
            },
            "priority": "high",
            "confidence": 0.8
        }
    
    def _create_performance_rule(
        self,
        batch_analysis: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Create rule to improve performance"""
        return {
            "learning_id": self._generate_learning_id(),
            "learned_at": datetime.utcnow().isoformat(),
            "type": "performance_optimization",
            "pattern": {
                "average_latency": batch_analysis.get("average_latency_ms", 0)
            },
            "rule": {
                "action": "optimize_slow_operations",
                "threshold": 3000
            },
            "priority": "medium",
            "confidence": 0.7
        }
    
    def _create_tool_optimization_rule(
        self,
        tool_usage: Dict[str, int]
    ) -> Dict[str, Any]:
        """Create rule to optimize tool usage"""
        most_used = max(tool_usage.items(), key=lambda x: x[1]) if tool_usage else ("unknown", 0)
        
        return {
            "learning_id": self._generate_learning_id(),
            "learned_at": datetime.utcnow().isoformat(),
            "type": "tool_optimization",
            "pattern": {
                "tool_usage": tool_usage
            },
            "rule": {
                "action": "optimize_tool",
                "target": most_used[0],
                "usage_count": most_used[1]
            },
            "priority": "low",
            "confidence": 0.6
        }
    
    def _create_failure_prevention_rule(
        self,
        failures: Dict[str, int]
    ) -> Dict[str, Any]:
        """Create rule to prevent failures"""
        top_failure = max(failures.items(), key=lambda x: x[1]) if failures else ("unknown", 0)
        
        return {
            "learning_id": self._generate_learning_id(),
            "learned_at": datetime.utcnow().isoformat(),
            "type": "failure_prevention",
            "pattern": {
                "common_failures": failures
            },
            "rule": {
                "action": "prevent_failure",
                "target": top_failure[0],
                "occurrence_count": top_failure[1]
            },
            "priority": "high",
            "confidence": 0.9
        }

# Made with Bob
