"""
Reflection Engine

Analyzes receipts to extract patterns and insights.
"""

from typing import Dict, List, Any
from collections import defaultdict


class ReflectionEngine:
    """Analyzes execution receipts for patterns"""
    
    def analyze_receipt(self, receipt: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze single receipt for insights.
        
        Args:
            receipt: Receipt dictionary
            
        Returns:
            Analysis results
        """
        return {
            "success_factors": self._extract_success_factors(receipt),
            "failure_patterns": self._extract_failure_patterns(receipt),
            "performance_metrics": self._extract_performance(receipt),
            "improvement_opportunities": self._identify_improvements(receipt)
        }
    
    def analyze_batch(self, receipts: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Analyze batch of receipts for patterns.
        
        Args:
            receipts: List of receipt dictionaries
            
        Returns:
            Batch analysis results
        """
        if not receipts:
            return {"error": "No receipts to analyze"}
        
        # Aggregate metrics
        success_count = sum(1 for r in receipts if r.get("success_score", 0) >= 0.8)
        total_count = len(receipts)
        success_rate = success_count / total_count if total_count > 0 else 0.0
        
        # Tool usage patterns
        tool_usage = defaultdict(int)
        for receipt in receipts:
            for tool in receipt.get("tools_used", []):
                tool_usage[tool] += 1
        
        # Failure patterns
        failure_modes = defaultdict(int)
        for receipt in receipts:
            for failure in receipt.get("failure_modes", []):
                failure_modes[str(failure)] += 1
        
        # Performance metrics
        latencies = [r.get("latency_ms", 0) for r in receipts]
        avg_latency = sum(latencies) / len(latencies) if latencies else 0.0
        
        return {
            "total_executions": total_count,
            "success_rate": success_rate,
            "average_latency_ms": avg_latency,
            "tool_usage": dict(tool_usage),
            "common_failures": dict(sorted(
                failure_modes.items(),
                key=lambda x: x[1],
                reverse=True
            )[:5]),
            "recommendations": self._generate_recommendations(
                success_rate,
                tool_usage,
                failure_modes
            )
        }
    
    def _extract_success_factors(self, receipt: Dict[str, Any]) -> List[str]:
        """Extract what made execution successful"""
        factors = []
        
        if receipt.get("success_score", 0) >= 0.8:
            factors.append("high_success_score")
        
        if receipt.get("latency_ms", 0) < 1000:
            factors.append("fast_execution")
        
        if not receipt.get("failure_modes"):
            factors.append("no_failures")
        
        return factors
    
    def _extract_failure_patterns(self, receipt: Dict[str, Any]) -> List[str]:
        """Extract failure patterns"""
        patterns = []
        
        for failure in receipt.get("failure_modes", []):
            if isinstance(failure, dict):
                patterns.append(failure.get("type", "unknown"))
            else:
                patterns.append(str(failure))
        
        return patterns
    
    def _extract_performance(self, receipt: Dict[str, Any]) -> Dict[str, float]:
        """Extract performance metrics"""
        return {
            "latency_ms": receipt.get("latency_ms", 0.0),
            "success_score": receipt.get("success_score", 0.0),
            "tool_count": len(receipt.get("tools_used", []))
        }
    
    def _identify_improvements(self, receipt: Dict[str, Any]) -> List[str]:
        """Identify improvement opportunities"""
        improvements = []
        
        if receipt.get("latency_ms", 0) > 5000:
            improvements.append("optimize_latency")
        
        if receipt.get("success_score", 0) < 0.8:
            improvements.append("improve_success_rate")
        
        if len(receipt.get("failure_modes", [])) > 0:
            improvements.append("reduce_failures")
        
        return improvements
    
    def _generate_recommendations(
        self,
        success_rate: float,
        tool_usage: Dict[str, int],
        failure_modes: Dict[str, int]
    ) -> List[str]:
        """Generate recommendations from patterns"""
        recommendations = []
        
        if success_rate < 0.8:
            recommendations.append(
                "Success rate below 80% - investigate common failure modes"
            )
        
        if failure_modes:
            top_failure = max(failure_modes.items(), key=lambda x: x[1])
            recommendations.append(
                f"Most common failure: {top_failure[0]} ({top_failure[1]} occurrences)"
            )
        
        if tool_usage:
            most_used = max(tool_usage.items(), key=lambda x: x[1])
            recommendations.append(
                f"Most used tool: {most_used[0]} ({most_used[1]} uses) - consider optimization"
            )
        
        return recommendations

# Made with Bob
