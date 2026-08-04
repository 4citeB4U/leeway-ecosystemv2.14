"""
Cache Injection System

Injects learned patterns into Agent Lee's runtime cache.
"""

from typing import Dict, List, Any
import json
from pathlib import Path
from datetime import datetime


class CacheInjectionSystem:
    """Injects learning into runtime cache"""
    
    def __init__(self, cache_root: str = "agent-lee-coding-mode/.leeway-vscode/bridge-runtime/cache"):
        self.cache_root = Path(cache_root)
        self.agent_cache = self.cache_root / "agent"
        self.agent_cache.mkdir(parents=True, exist_ok=True)
    
    def inject_learning(
        self,
        learning_rule: Dict[str, Any],
        cache_type: str = "behavior"
    ) -> str:
        """
        Inject learning rule into runtime cache.
        
        Args:
            learning_rule: Compiled learning rule
            cache_type: Type of cache (behavior, pattern, optimization)
            
        Returns:
            Path to injected cache entry
        """
        cache_entry = self._create_cache_entry(learning_rule, cache_type)
        cache_path = self._get_cache_path(cache_type, learning_rule)
        
        # Write cache entry
        with open(cache_path, 'w', encoding='utf-8') as f:
            json.dump(cache_entry, f, indent=2, ensure_ascii=False)
        
        return str(cache_path)
    
    def inject_batch(
        self,
        learning_rules: List[Dict[str, Any]]
    ) -> List[str]:
        """
        Inject batch of learning rules.
        
        Args:
            learning_rules: List of learning rules
            
        Returns:
            List of cache paths
        """
        paths = []
        for rule in learning_rules:
            cache_type = self._determine_cache_type(rule)
            path = self.inject_learning(rule, cache_type)
            paths.append(path)
        return paths
    
    def get_cached_learning(
        self,
        cache_type: str = "behavior"
    ) -> List[Dict[str, Any]]:
        """
        Get cached learning rules.
        
        Args:
            cache_type: Type of cache to retrieve
            
        Returns:
            List of cached learning rules
        """
        cache_dir = self.agent_cache / cache_type
        if not cache_dir.exists():
            return []
        
        cached = []
        for cache_file in cache_dir.glob("*.json"):
            try:
                with open(cache_file, 'r', encoding='utf-8') as f:
                    cached.append(json.load(f))
            except Exception:
                continue
        
        return cached
    
    def invalidate_cache(
        self,
        learning_id: str
    ) -> bool:
        """
        Invalidate cached learning by ID.
        
        Args:
            learning_id: Learning ID to invalidate
            
        Returns:
            True if invalidated, False if not found
        """
        for cache_file in self.agent_cache.rglob("*.json"):
            try:
                with open(cache_file, 'r', encoding='utf-8') as f:
                    entry = json.load(f)
                    if entry.get("learning_id") == learning_id:
                        cache_file.unlink()
                        return True
            except Exception:
                continue
        
        return False
    
    def _create_cache_entry(
        self,
        learning_rule: Dict[str, Any],
        cache_type: str
    ) -> Dict[str, Any]:
        """Create cache entry from learning rule"""
        return {
            "learning_id": learning_rule.get("learning_id"),
            "cache_type": cache_type,
            "cached_at": datetime.utcnow().isoformat(),
            "rule": learning_rule.get("rule", {}),
            "pattern": learning_rule.get("pattern", {}),
            "priority": learning_rule.get("priority", "medium"),
            "confidence": learning_rule.get("confidence", 0.5),
            "application_scope": learning_rule.get("application_scope", "local"),
            "ttl_hours": self._calculate_ttl(learning_rule)
        }
    
    def _get_cache_path(
        self,
        cache_type: str,
        learning_rule: Dict[str, Any]
    ) -> Path:
        """Get cache file path"""
        cache_dir = self.agent_cache / cache_type
        cache_dir.mkdir(parents=True, exist_ok=True)
        
        learning_id = learning_rule.get("learning_id", "unknown")
        filename = f"{learning_id}.json"
        
        return cache_dir / filename
    
    def _determine_cache_type(self, learning_rule: Dict[str, Any]) -> str:
        """Determine cache type from learning rule"""
        rule_type = learning_rule.get("type", "")
        
        if "optimization" in rule_type:
            return "optimization"
        elif "pattern" in rule_type:
            return "pattern"
        else:
            return "behavior"
    
    def _calculate_ttl(self, learning_rule: Dict[str, Any]) -> int:
        """Calculate time-to-live for cache entry"""
        priority = learning_rule.get("priority", "medium")
        confidence = learning_rule.get("confidence", 0.5)
        
        # High priority, high confidence = longer TTL
        if priority == "high" and confidence >= 0.8:
            return 168  # 1 week
        elif priority == "medium" or confidence >= 0.6:
            return 72   # 3 days
        else:
            return 24   # 1 day

# Made with Bob
