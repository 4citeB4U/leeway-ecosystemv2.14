"""
Bootstrap Importer

Scans filesystem and builds initial topology map.
"""

import os
from typing import List, Dict, Any
from pathlib import Path


class BootstrapImporter:
    """
    Scans filesystem and discovers system components.
    """
    
    # Known system directories
    SYSTEM_DIRS = {
        "core": "system_core",
        "Archive": "data_archive",
        "agent-lee-coding-mode": "agent_runtime",
        "Cerebral": "cerebral_layer",
        "leeway-ide-single-canvas": "ide_layer",
        "leeway-presentation-engine": "presentation_layer",
        "leeway-employment-center": "employment_layer",
        "GenesisRuntime": "genesis_runtime",
        "Leeway Runtime Fabric": "runtime_fabric"
    }
    
    # File type classifications
    FILE_TYPES = {
        ".py": "python_module",
        ".js": "javascript_module",
        ".mjs": "javascript_module",
        ".ts": "typescript_module",
        ".json": "config_file",
        ".md": "documentation",
        ".ps1": "powershell_script",
        ".sh": "shell_script",
        ".yaml": "config_file",
        ".yml": "config_file"
    }
    
    def __init__(self):
        self.discovered_nodes: List[Dict[str, Any]] = []
    
    def scan(self, root: str, max_depth: int = 3) -> List[Dict[str, Any]]:
        """
        Scan filesystem and discover components.
        
        Args:
            root: Root directory to scan
            max_depth: Maximum directory depth
            
        Returns:
            List of discovered nodes
        """
        self.discovered_nodes = []
        root_path = Path(root)
        
        # Scan directories
        self._scan_directories(root_path, max_depth)
        
        # Scan key files
        self._scan_key_files(root_path)
        
        return self.discovered_nodes
    
    def _scan_directories(self, root: Path, max_depth: int):
        """Scan directories up to max depth"""
        for dirpath, dirnames, _ in os.walk(root):
            # Calculate depth
            depth = len(Path(dirpath).relative_to(root).parts)
            if depth > max_depth:
                continue
            
            for dirname in dirnames:
                full_path = Path(dirpath) / dirname
                node = self._classify_directory(full_path, root)
                if node:
                    self.discovered_nodes.append(node)
    
    def _scan_key_files(self, root: Path):
        """Scan key system files"""
        key_patterns = [
            "*/sea_core.py",
            "*/discovery_kernel.py",
            "*/command_orchestrator.py",
            "*/__init__.py",
            "*/manifest*.json",
            "*/README.md"
        ]
        
        for pattern in key_patterns:
            for file_path in root.glob(pattern):
                node = self._classify_file(file_path, root)
                if node:
                    self.discovered_nodes.append(node)
    
    def _classify_directory(self, path: Path, root: Path) -> Dict[str, Any]:
        """Classify directory type"""
        rel_path = path.relative_to(root)
        dir_name = path.name
        
        # Check if it's a known system directory
        for known_dir, classification in self.SYSTEM_DIRS.items():
            if known_dir in str(rel_path):
                return {
                    "node_id": str(rel_path).replace("\\", "/"),
                    "type": "directory",
                    "classification": classification,
                    "path": str(path),
                    "name": dir_name,
                    "layer": self._determine_layer(rel_path)
                }
        
        # Default classification
        return {
            "node_id": str(rel_path).replace("\\", "/"),
            "type": "directory",
            "classification": "unknown_directory",
            "path": str(path),
            "name": dir_name,
            "layer": self._determine_layer(rel_path)
        }
    
    def _classify_file(self, path: Path, root: Path) -> Dict[str, Any]:
        """Classify file type"""
        rel_path = path.relative_to(root)
        file_ext = path.suffix.lower()
        
        # Get file type classification
        file_type = self.FILE_TYPES.get(file_ext, "unknown_file")
        
        # Special classifications
        if path.name == "sea_core.py":
            classification = "sea_execution_engine"
        elif path.name == "discovery_kernel.py":
            classification = "discovery_kernel"
        elif path.name == "command_orchestrator.py":
            classification = "command_orchestrator"
        elif path.name == "__init__.py":
            classification = "python_package"
        elif "manifest" in path.name.lower():
            classification = "manifest_file"
        else:
            classification = file_type
        
        return {
            "node_id": str(rel_path).replace("\\", "/"),
            "type": "file",
            "classification": classification,
            "path": str(path),
            "name": path.name,
            "extension": file_ext,
            "layer": self._determine_layer(rel_path)
        }
    
    def _determine_layer(self, rel_path: Path) -> str:
        """Determine which layer a path belongs to"""
        path_str = str(rel_path).lower()
        
        if "core" in path_str:
            return "L0_CORE"
        elif "archive" in path_str:
            return "L1_ARCHIVE"
        elif "cerebral" in path_str:
            return "L2_CEREBRAL"
        elif "runtime" in path_str:
            return "L3_RUNTIME"
        elif "ide" in path_str:
            return "L4_IDE"
        elif "presentation" in path_str:
            return "L5_PRESENTATION"
        else:
            return "L_UNKNOWN"
    
    def get_summary(self) -> Dict[str, Any]:
        """Get scan summary"""
        type_counts: Dict[str, int] = {}
        layer_counts: Dict[str, int] = {}
        
        for node in self.discovered_nodes:
            node_type = node.get("type", "unknown")
            layer = node.get("layer", "unknown")
            
            type_counts[node_type] = type_counts.get(node_type, 0) + 1
            layer_counts[layer] = layer_counts.get(layer, 0) + 1
        
        return {
            "total_nodes": len(self.discovered_nodes),
            "by_type": type_counts,
            "by_layer": layer_counts
        }

# Made with Bob
