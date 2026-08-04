"""
Pattern Extractor

Extracts patterns from execution receipts for learning.
"""

from typing import Dict, List, Any, Tuple
from collections import defaultdict, Counter


class PatternExtractor:
    """Extracts patterns from execution data"""
    
    def extract_patterns(
        self,
        receipts: List[Dict[str, Any]],
        min_occurrences: int = 3
    ) -> Dict[str, Any]:
        """
        Extract patterns from receipts.
        
        Args:
            receipts: List of execution receipts
            min_occurrences: Minimum occurrences to consider a pattern
            
        Returns:
            Extracted patterns
        """
        if not receipts:
            return {"patterns": []}
        
        return {
            "success_patterns": self._extract_success_patterns(receipts, min_occurrences),
            "failure_patterns": self._extract_failure_patterns(receipts, min_occurrences),
            "performance_patterns": self._extract_performance_patterns(receipts),
            "tool_patterns": self._extract_tool_patterns(receipts, min_occurrences),
            "temporal_patterns": self._extract_temporal_patterns(receipts)
        }
    
    def _extract_success_patterns(
        self,
        receipts: List[Dict[str, Any]],
        min_occurrences: int
    ) -> List[Dict[str, Any]]:
        """Extract patterns from successful executions"""
        successful = [r for r in receipts if r.get("success_score", 0) >= 0.8]
        
        if len(successful) < min_occurrences:
            return []
        
        patterns = []
        
        # Tool combination patterns
        tool_combos = Counter()
        for receipt in successful:
            tools = tuple(sorted(receipt.get("tools_used", [])))
            if tools:
                tool_combos[tools] += 1
        
        for combo, count in tool_combos.items():
            if count >= min_occurrences:
                patterns.append({
                    "type": "successful_tool_combination",
                    "tools": list(combo),
                    "occurrences": count,
                    "confidence": count / len(successful)
                })
        
        # Intent patterns
        intent_types = Counter()
        for receipt in successful:
            intent_type = receipt.get("intent", {}).get("task_type", "unknown")
            intent_types[intent_type] += 1
        
        for intent_type, count in intent_types.items():
            if count >= min_occurrences:
                patterns.append({
                    "type": "successful_intent",
                    "intent_type": intent_type,
                    "occurrences": count,
                    "confidence": count / len(successful)
                })
        
        return patterns
    
    def _extract_failure_patterns(
        self,
        receipts: List[Dict[str, Any]],
        min_occurrences: int
    ) -> List[Dict[str, Any]]:
        """Extract patterns from failed executions"""
        failed = [r for r in receipts if r.get("success_score", 0) < 0.8]
        
        if len(failed) < min_occurrences:
            return []
        
        patterns = []
        
        # Failure mode patterns
        failure_modes = Counter()
        for receipt in failed:
            for failure in receipt.get("failure_modes", []):
                failure_key = str(failure)
                failure_modes[failure_key] += 1
        
        for failure_mode, count in failure_modes.items():
            if count >= min_occurrences:
                patterns.append({
                    "type": "common_failure",
                    "failure_mode": failure_mode,
                    "occurrences": count,
                    "confidence": count / len(failed)
                })
        
        # Tool failure patterns
        tool_failures = defaultdict(int)
        for receipt in failed:
            for tool in receipt.get("tools_used", []):
                tool_failures[tool] += 1
        
        for tool, count in tool_failures.items():
            if count >= min_occurrences:
                patterns.append({
                    "type": "tool_failure_correlation",
                    "tool": tool,
                    "occurrences": count,
                    "confidence": count / len(failed)
                })
        
        return patterns
    
    def _extract_performance_patterns(
        self,
        receipts: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Extract performance patterns"""
        patterns = []
        
        # Latency patterns
        latencies = [r.get("latency_ms", 0) for r in receipts]
        if latencies:
            avg_latency = sum(latencies) / len(latencies)
            max_latency = max(latencies)
            min_latency = min(latencies)
            
            patterns.append({
                "type": "latency_distribution",
                "average_ms": avg_latency,
                "max_ms": max_latency,
                "min_ms": min_latency,
                "sample_size": len(latencies)
            })
        
        # Fast vs slow execution patterns
        fast = [r for r in receipts if r.get("latency_ms", 0) < 1000]
        slow = [r for r in receipts if r.get("latency_ms", 0) >= 5000]
        
        if fast:
            fast_tools = Counter()
            for receipt in fast:
                for tool in receipt.get("tools_used", []):
                    fast_tools[tool] += 1
            
            if fast_tools:
                most_common = fast_tools.most_common(3)
                patterns.append({
                    "type": "fast_execution_tools",
                    "tools": [{"tool": t, "count": c} for t, c in most_common]
                })
        
        if slow:
            slow_tools = Counter()
            for receipt in slow:
                for tool in receipt.get("tools_used", []):
                    slow_tools[tool] += 1
            
            if slow_tools:
                most_common = slow_tools.most_common(3)
                patterns.append({
                    "type": "slow_execution_tools",
                    "tools": [{"tool": t, "count": c} for t, c in most_common]
                })
        
        return patterns
    
    def _extract_tool_patterns(
        self,
        receipts: List[Dict[str, Any]],
        min_occurrences: int
    ) -> List[Dict[str, Any]]:
        """Extract tool usage patterns"""
        patterns = []
        
        # Tool frequency
        tool_usage = Counter()
        for receipt in receipts:
            for tool in receipt.get("tools_used", []):
                tool_usage[tool] += 1
        
        for tool, count in tool_usage.items():
            if count >= min_occurrences:
                patterns.append({
                    "type": "frequent_tool",
                    "tool": tool,
                    "occurrences": count,
                    "frequency": count / len(receipts)
                })
        
        # Tool sequences
        sequences = []
        for receipt in receipts:
            tools = receipt.get("tools_used", [])
            if len(tools) >= 2:
                sequences.append(tuple(tools))
        
        if sequences:
            sequence_counts = Counter(sequences)
            for sequence, count in sequence_counts.items():
                if count >= min_occurrences:
                    patterns.append({
                        "type": "tool_sequence",
                        "sequence": list(sequence),
                        "occurrences": count,
                        "confidence": count / len(sequences)
                    })
        
        return patterns
    
    def _extract_temporal_patterns(
        self,
        receipts: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Extract temporal patterns"""
        patterns = []
        
        # Time-based success rate
        if receipts:
            timestamps = []
            for receipt in receipts:
                ts = receipt.get("timestamp")
                success = receipt.get("success_score", 0) >= 0.8
                if ts:
                    timestamps.append((ts, success))
            
            if timestamps:
                # Sort by timestamp
                timestamps.sort(key=lambda x: x[0])
                
                # Calculate success rate over time
                window_size = min(10, len(timestamps))
                if window_size >= 3:
                    recent = timestamps[-window_size:]
                    recent_success_rate = sum(1 for _, s in recent if s) / len(recent)
                    
                    patterns.append({
                        "type": "recent_success_rate",
                        "rate": recent_success_rate,
                        "window_size": window_size
                    })
        
        return patterns

# Made with Bob
