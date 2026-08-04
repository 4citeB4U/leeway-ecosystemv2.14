"""
Discovery Kernel

Minimal Discovery System Kernel - "If Discovery doesn't know it, it doesn't exist."
"""

from pathlib import Path
from typing import Dict, Any, Optional, List
import json
from .topology_registry import TopologyRegistry
from .bootstrap_importer import BootstrapImporter
from .receipt_binding import ReceiptBinding
from .sea_hook import SEAHook
from .estate_inventory import EstateInventory, ENTRY_SURFACES, SYSTEM_AUTHORITY_DIRS


ESTATE_CACHE_FILENAME = "discovery-registry-cache.json"


class DiscoveryKernel:
    """
    Minimum Viable Truth System
    
    Provides:
    - System-wide registry
    - Bootstrap scanner
    - SEA runtime hook
    - Receipt-to-truth binding
    - Queryable topology graph
    """
    
    def __init__(self):
        self.registry = TopologyRegistry()
        self.bootstrap = BootstrapImporter()
        self.receipts = ReceiptBinding(self.registry)
        self.sea_hook = SEAHook(self.registry)
        self.estate_inventory: Optional[EstateInventory] = None
        self.estate_cache: Optional[Dict[str, Any]] = None
        self.estate_cache_path: Optional[Path] = None
        self.bootstrapped = False
    
    def bootstrap_system(self, root: str, max_depth: int = 3):
        """
        Bootstrap system by scanning filesystem.
        
        Args:
            root: Root directory to scan
            max_depth: Maximum scan depth
        """
        print("[Discovery] Bootstrapping system...")
        
        # Scan filesystem
        nodes = self.bootstrap.scan(root, max_depth)
        
        # Register all discovered nodes
        for node in nodes:
            self.registry.register(node["node_id"], node)
        
        # Get summary
        summary = self.bootstrap.get_summary()
        
        print(f"[Discovery] Registered {summary['total_nodes']} nodes")
        print(f"[Discovery] By type: {summary['by_type']}")
        print(f"[Discovery] By layer: {summary['by_layer']}")
        
        # Persist registry
        registry_path = self.registry.persist()
        print(f"[Discovery] Registry persisted to: {registry_path}")
        
        self.bootstrapped = True

    def bootstrap_estate(
        self,
        root: str,
        created_files_log: Optional[str] = None,
        file_inventory_log: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Build an estate-wide snapshot from the canonical inventory logs.

        This is the discovery-first path for the broader LeeWay estate.
        """
        self.estate_inventory = EstateInventory(
            root=root,
            created_files_log=created_files_log,
            file_inventory_log=file_inventory_log,
        )
        snapshot = self.estate_inventory.build()
        self.estate_cache_path = self._resolve_estate_cache_path(root)
        self.estate_cache = self._build_cache_from_snapshot(snapshot)
        self.persist_estate_cache()
        return snapshot

    def _resolve_estate_cache_path(self, root: Optional[str | Path] = None) -> Path:
        base = Path(root).resolve() if root is not None else (self.estate_inventory.root if self.estate_inventory else Path(".").resolve())
        return base / "Archive" / "discovery" / ESTATE_CACHE_FILENAME

    def _normalize(self, value: str) -> str:
        return value.replace("\\", "/").strip()

    def _candidate_estate_keys(self, identifier: str) -> List[str]:
        normalized = self._normalize(identifier)
        candidates = [normalized]
        if self.estate_inventory is not None:
            root_prefix = self._normalize(str(self.estate_inventory.root)) + "/"
            if normalized.startswith(root_prefix):
                candidates.append(normalized[len(root_prefix) :])
        return list(dict.fromkeys(candidate for candidate in candidates if candidate))

    def _build_cache_from_snapshot(self, snapshot: Dict[str, Any]) -> Dict[str, Any]:
        nodes = snapshot.get("nodes", [])
        top_level_directories = snapshot.get("topLevelDirectories", [])
        by_path: Dict[str, Dict[str, Any]] = {}
        by_top_level: Dict[str, List[str]] = {}
        by_classification: Dict[str, List[str]] = {}
        by_review_state: Dict[str, List[str]] = {}
        by_owner_surface: Dict[str, List[str]] = {}

        def add_index(index: Dict[str, List[str]], key: str, value: str) -> None:
            if not key:
                return
            index.setdefault(key, []).append(value)

        for node in nodes:
            rel = node.get("rel_path")
            if not rel:
                continue
            slim = {
                "path": node.get("path"),
                "relPath": rel,
                "topLevel": node.get("top_level"),
                "classification": node.get("classification"),
                "lifecycle": node.get("lifecycle"),
                "reviewState": node.get("review_state"),
                "role": node.get("role"),
                "ownerSurface": node.get("owner_surface"),
                "inCreatedLog": node.get("in_created_log"),
                "nodeKind": node.get("node_kind"),
            }
            by_path[self._normalize(rel)] = slim
            add_index(by_top_level, node.get("top_level", ""), rel)
            add_index(by_classification, node.get("classification", ""), rel)
            add_index(by_review_state, node.get("review_state", ""), rel)
            add_index(by_owner_surface, node.get("owner_surface", ""), rel)

        entry_surfaces = [item.get("name") for item in top_level_directories if item.get("entrySurface")]
        authoritative_dirs = [item.get("name") for item in top_level_directories if item.get("classification") == "SYSTEM_CRITICAL"]

        return {
            "schema": "leeway.discovery.registry-cache.v1",
            "generatedAt": snapshot.get("generatedAt"),
            "source": {
                "estateTopology": "Archive/discovery/estate-topology.json",
                "lookupOrder": [
                    "Canonical Discovery Graph",
                    "Runtime Registry Cache",
                    "Indexed Search",
                    "Filesystem Lookup",
                    "Estate Crawl",
                ],
            },
            "summary": {
                "nodeCount": len(nodes),
                "topLevelCount": len(by_top_level),
                "evidenceCount": len(by_review_state.get("evidence", [])),
                "activeCount": len(by_review_state.get("active", [])),
                "quarantineCandidateCount": len(by_review_state.get("quarantine_candidate", [])),
            },
            "fastLookup": {
                "entrySurfaces": sorted(dict.fromkeys(name for name in entry_surfaces if name)),
                "authoritativeDirs": sorted(dict.fromkeys(name for name in authoritative_dirs if name)),
            },
            "indexes": {
                "byPath": by_path,
                "byTopLevel": {key: sorted(dict.fromkeys(values)) for key, values in sorted(by_top_level.items())},
                "byClassification": {key: sorted(dict.fromkeys(values)) for key, values in sorted(by_classification.items())},
                "byReviewState": {key: sorted(dict.fromkeys(values)) for key, values in sorted(by_review_state.items())},
                "byOwnerSurface": {key: sorted(dict.fromkeys(values)) for key, values in sorted(by_owner_surface.items())},
            },
        }

    def _load_json(self, path: Path) -> Optional[Dict[str, Any]]:
        if not path.exists():
            return None
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            return None

    def load_estate_cache(self, root: Optional[str | Path] = None) -> bool:
        path = self._resolve_estate_cache_path(root)
        cache = self._load_json(path)
        if cache is None:
            return False
        self.estate_cache_path = path
        self.estate_cache = cache
        return True

    def persist_estate_cache(self) -> Optional[str]:
        if self.estate_cache is None:
            return None
        if self.estate_cache_path is None:
            self.estate_cache_path = self._resolve_estate_cache_path()
        self.estate_cache_path.parent.mkdir(parents=True, exist_ok=True)
        self.estate_cache_path.write_text(json.dumps(self.estate_cache, indent=2, ensure_ascii=False), encoding="utf-8")
        return str(self.estate_cache_path)

    def query_estate_cache(self, identifier: str) -> Optional[Dict[str, Any]]:
        if not self.estate_cache:
            return None
        indexes = self.estate_cache.get("indexes", {})
        by_path = indexes.get("byPath", {})
        for candidate in self._candidate_estate_keys(identifier):
            if candidate in by_path:
                return {
                    "source": "estate_cache",
                    "matchType": "path",
                    "query": identifier,
                    "path": candidate,
                    "entry": by_path[candidate],
                }

        for index_name in ("byTopLevel", "byClassification", "byReviewState", "byOwnerSurface"):
            index = indexes.get(index_name, {})
            if identifier in index:
                return {
                    "source": "estate_cache",
                    "matchType": index_name,
                    "query": identifier,
                    "matches": index[identifier],
                    "count": len(index[identifier]),
                }
        return None
    
    def attach_to_sea(self):
        """Attach Discovery hook to SEA"""
        print("[Discovery] SEA hook attached")
        print("[Discovery] SEA cannot execute without Discovery acknowledgment")
    
    def ingest_receipt(self, receipt: Dict[str, Any]) -> Dict[str, Any]:
        """
        Ingest execution receipt.
        
        Args:
            receipt: Execution receipt
            
        Returns:
            Binding result with validation status
        """
        return self.receipts.bind(receipt)
    
    def validate_receipt(self, receipt: Dict[str, Any]) -> bool:
        """
        Validate receipt against registry.
        
        Args:
            receipt: Receipt to validate
            
        Returns:
            True if valid, False if orphan
        """
        return self.receipts.validate_receipt(receipt)
    
    def query(self, node_id: str) -> Optional[Dict[str, Any]]:
        """
        Query node by ID.
        
        Args:
            node_id: Node ID to query
            
        Returns:
            Node data or None
        """
        node = self.registry.get(node_id)
        if node is not None:
            return node
        return self.query_estate_cache(node_id)
    
    def exists(self, node_id: str) -> bool:
        """
        Check if node exists.
        
        Args:
            node_id: Node ID to check
            
        Returns:
            True if exists, False otherwise
        """
        return self.registry.exists(node_id) or self.query_estate_cache(node_id) is not None
    
    def dump(self) -> Dict[str, Dict[str, Any]]:
        """Dump entire registry"""
        return self.registry.all()
    
    def get_stats(self) -> Dict[str, Any]:
        """Get Discovery statistics"""
        cache_summary = self.estate_cache.get("summary", {}) if self.estate_cache else {}
        return {
            "bootstrapped": self.bootstrapped,
            "registry_stats": self.registry.get_stats(),
            "sea_registered": self.sea_hook.is_registered(),
            "estate_inventory_loaded": self.estate_inventory is not None,
            "estate_cache_loaded": self.estate_cache is not None,
            "estate_cache_path": str(self.estate_cache_path) if self.estate_cache_path else None,
            "estate_cache_summary": cache_summary,
        }
    
    def persist(self) -> str:
        """Persist registry to disk"""
        registry_path = self.registry.persist()
        self.persist_estate_cache()
        return registry_path
    
    def load(self) -> bool:
        """Load registry from disk"""
        loaded = self.registry.load()
        cache_loaded = self.load_estate_cache()
        if loaded:
            self.bootstrapped = True
        if cache_loaded:
            self.bootstrapped = True
        return loaded or cache_loaded
    
    def enforce_sea_registration(self):
        """
        Enforce that SEA is registered.
        
        Raises:
            RuntimeError: If SEA is not registered
        """
        self.sea_hook.enforce_registration()
    
    def get_component_receipts(self, component_id: str) -> list:
        """
        Get all receipts for a component.
        
        Args:
            component_id: Component ID
            
        Returns:
            List of receipts
        """
        return self.receipts.get_component_receipts(component_id)
    
    def get_active_components(self) -> list:
        """Get list of active component IDs"""
        return self.registry.active_nodes()

    def get_estate_nodes_by_review_state(self, review_state: str) -> list:
        """Get estate snapshot nodes for a review state from the cache."""
        if not self.estate_cache:
            return []
        return self.estate_cache.get("indexes", {}).get("byReviewState", {}).get(review_state, [])

# Made with Bob
