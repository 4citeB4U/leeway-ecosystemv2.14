"""
Estate Inventory

Builds an estate-wide snapshot from the canonical inventory logs and live
runtime signals without performing a full destructive mutation pass.
"""

from __future__ import annotations

from collections import Counter, defaultdict
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional
import datetime as dt
import json
import os
import subprocess


SYSTEM_AUTHORITY_DIRS = {"Archive", "core", "Leeway Runtime Fabric", "LeeWay-Standards"}
ENTRY_SURFACES = {
    "agent-lee-coding-mode",
    "leeway-ide-single-canvas",
    "leeway_complete_cockpit",
    "leeway-employment-center",
    "agent-lee-os2",
    "agent-lee-voice-kernel",
    "Leeway Runtime Fabric",
    "LeeWay-Standards",
    "Cerebral",
    "leeway-model-family",
}
UTILITY_DIRS = {"scripts", "tests", "tools", "models", "reports", "logs", "tmp", "simulations"}
EVIDENCE_SURFACES = {"Archive", "reports", "receipts", "ledgers", "manifests", "proofs", "diagnostics", "logs"}
IGNORED_NOISE_SEGMENTS = {
    ".git",
    ".next",
    ".pytest_cache",
    ".tox",
    ".turbo",
    ".venv",
    "__pycache__",
    "build",
    "coverage",
    "dist",
    "node_modules",
    "site-packages",
    "venv",
}
QUARANTINE_PREFIXES = ("tmp", "temp", "test_", "copilot_", "fabric-cache")
QUARANTINE_SUFFIXES = (".bak", ".tmp", ".old")
EVIDENCE_HINTS = ("receipt", "report", "ledger", "audit", "inventory", "diagnostic", "proof", "manifest", "log")
AUTHORITY_HINTS = ("governance", "policy", "authority", "lifecycle", "runtime", "routing", "discovery", "control")


@dataclass
class InventoryNode:
    path: str
    rel_path: str
    top_level: str
    node_kind: str
    classification: str
    lifecycle: str
    review_state: str
    role: str
    owner_surface: str
    in_created_log: bool


def _normalize(path: str) -> str:
    return path.replace("\\", "/").strip()


def _safe_read_lines(path: Path) -> List[str]:
    if not path.exists():
        return []
    with path.open("r", encoding="utf-8", errors="replace") as handle:
        return [line.rstrip("\r\n") for line in handle]


def _is_probably_path(line: str, root_prefix: str) -> bool:
    line = _normalize(line.strip())
    return bool(line) and line.startswith(root_prefix)


class EstateInventory:
    """
    Parse the canonical inventory logs and derive an estate-wide topology view.
    """

    def __init__(
        self,
        root: str | Path,
        created_files_log: str | Path | None = None,
        file_inventory_log: str | Path | None = None,
    ) -> None:
        self.root = Path(root).resolve()
        self.created_files_log = Path(created_files_log) if created_files_log else self.root / "leeway-created-files.log"
        self.file_inventory_log = Path(file_inventory_log) if file_inventory_log else self.root / "leeway-file-inventory.log"
        self.root_prefix = _normalize(str(self.root)) + "/"

    def load_created_paths(self) -> List[str]:
        return [p for p in _safe_read_lines(self.created_files_log) if _is_probably_path(p, self.root_prefix)]

    def load_inventory_paths(self) -> List[str]:
        return [p for p in _safe_read_lines(self.file_inventory_log) if _is_probably_path(p, self.root_prefix)]

    def live_top_level_paths(self) -> List[Path]:
        if not self.root.exists():
            return []
        return [entry for entry in self.root.iterdir()]

    def build(self) -> Dict[str, Any]:
        created_paths = {_normalize(p) for p in self.load_created_paths()}
        inventory_paths = [_normalize(p) for p in self.load_inventory_paths()]
        top_level_dirs = self._summarize_top_level_dirs(inventory_paths)
        top_level_files = self._summarize_top_level_files(inventory_paths)
        nodes = [asdict(self._classify_path(path, created_paths)) for path in inventory_paths]
        live_containers = self._docker_ps()
        live_container_stats = self._docker_stats()
        compliance = self._build_compliance_report(inventory_paths)
        review_state_counts = Counter(node["review_state"] for node in nodes)

        return {
            "schema": "leeway.estate.inventory.v1",
            "generatedAt": dt.datetime.utcnow().isoformat() + "Z",
            "root": str(self.root),
            "sources": {
                "createdFilesLog": str(self.created_files_log),
                "fileInventoryLog": str(self.file_inventory_log),
            },
            "summary": {
                "inventoryPathCount": len(inventory_paths),
                "createdPathCount": len(created_paths),
                "overlapCount": len(set(inventory_paths) & created_paths),
                "topLevelFileCount": len(top_level_files),
                "topLevelDirectoryCount": len(top_level_dirs),
                "entrySurfaceCount": sum(1 for item in top_level_dirs if item["name"] in ENTRY_SURFACES),
                "evidenceCount": review_state_counts.get("evidence", 0),
                "activeCount": review_state_counts.get("active", 0),
                "generatedCount": review_state_counts.get("generated", 0),
                "quarantineCandidateCount": review_state_counts.get("quarantine_candidate", 0),
                "cleanupCandidateCount": review_state_counts.get("quarantine_candidate", 0),
            },
            "topLevelFiles": top_level_files,
            "topLevelDirectories": top_level_dirs,
            "nodes": nodes,
            "runtime": {
                "containers": live_containers,
                "containerStats": live_container_stats,
            },
            "compliance": compliance,
        }

    def _summarize_top_level_files(self, inventory_paths: Iterable[str]) -> List[Dict[str, Any]]:
        items: Dict[str, Dict[str, Any]] = {}
        for path in inventory_paths:
            rel = self._relative_path(path)
            if not rel or "/" in rel:
                continue
            items[rel] = {
                "name": rel,
                "path": path,
                "classification": self._classify_file_name(rel),
                "ownerSurface": "root",
                "status": self._status_for_classification(self._classify_file_name(rel)),
            }
        return [items[key] for key in sorted(items)]

    def _summarize_top_level_dirs(self, inventory_paths: Iterable[str]) -> List[Dict[str, Any]]:
        counts = Counter()
        samples: Dict[str, str] = {}
        for path in inventory_paths:
            rel = self._relative_path(path)
            if not rel:
                continue
            first = rel.split("/", 1)[0]
            if rel == first:
                continue
            counts[first] += 1
            samples.setdefault(first, path)

        out: List[Dict[str, Any]] = []
        for name in sorted(counts):
            path = _normalize(samples[name])
            out.append(
                {
                    "name": name,
                    "path": path,
                    "entrySurface": name in ENTRY_SURFACES,
                    "kind": "application_shell" if name in ENTRY_SURFACES else "directory",
                    "classification": self._classify_directory_name(name),
                    "inventoryCount": counts[name],
                    "ownerSurface": name if name in ENTRY_SURFACES else self._owner_surface_for_name(name),
                }
            )
        return out

    def _relative_path(self, full_path: str) -> str:
        normalized = _normalize(full_path)
        if normalized.startswith(self.root_prefix):
            return normalized[len(self.root_prefix) :]
        return normalized

    def _owner_surface_for_name(self, name: str) -> str:
        if name in SYSTEM_AUTHORITY_DIRS:
            return name
        if name in ENTRY_SURFACES:
            return name
        if name in UTILITY_DIRS:
            return "utility"
        return "estate"

    def _classify_directory_name(self, name: str) -> str:
        if name in ENTRY_SURFACES:
            return "ACTIVE"
        if name in SYSTEM_AUTHORITY_DIRS:
            return "SYSTEM_CRITICAL"
        if self._looks_quarantined(name):
            return "QUARANTINE"
        return "ACTIVE" if name in UTILITY_DIRS else "ARCHIVED"

    def _classify_file_name(self, name: str) -> str:
        lower = name.lower()
        if self._looks_quarantined(lower):
            return "QUARANTINE"
        if any(hint in lower for hint in EVIDENCE_HINTS):
            return "EVIDENCE"
        if lower.endswith((".json", ".md", ".ps1", ".py", ".mjs", ".ts", ".js")):
            return "GENERATED" if lower.startswith(("copilot_", "tmp-", "aa-plan-", "warmup-")) else "ACTIVE"
        return "FALLBACK"

    def _looks_quarantined(self, name: str) -> bool:
        lower = name.lower()
        return lower.startswith(QUARANTINE_PREFIXES) or lower.endswith(QUARANTINE_SUFFIXES)

    def _is_noise_path(self, rel: str) -> bool:
        parts = [segment.lower() for segment in rel.split("/") if segment]
        return any(part in IGNORED_NOISE_SEGMENTS for part in parts)

    def _is_evidence_path(self, rel: str, top_level: str, base_name: str) -> bool:
        parts = [segment.lower() for segment in rel.split("/") if segment]
        if any(part in {surface.lower() for surface in EVIDENCE_SURFACES} for part in parts):
            return True
        if top_level in {"Archive", "logs"}:
            return True
        lower_base = base_name.lower()
        if any(hint in lower_base for hint in EVIDENCE_HINTS):
            return top_level in SYSTEM_AUTHORITY_DIRS or top_level in ENTRY_SURFACES or top_level in {"Archive", "logs"}
        return False

    def _is_quarantine_candidate(self, rel: str, base_name: str) -> bool:
        if self._is_noise_path(rel):
            return False
        if self._is_evidence_path(rel, rel.split("/", 1)[0] if rel else "", base_name):
            return False
        lower_rel = rel.lower()
        lower_base = base_name.lower()
        if any(segment in {"tmp", "temp"} for segment in lower_rel.split("/")):
            return True
        return lower_base.startswith(QUARANTINE_PREFIXES) or lower_base.endswith(QUARANTINE_SUFFIXES)

    def _status_for_classification(self, classification: str) -> str:
        if classification in {"SYSTEM_CRITICAL", "ACTIVE"}:
            return "ACTIVE"
        if classification == "EVIDENCE":
            return "EVIDENCE"
        if classification == "QUARANTINE":
            return "QUARANTINE"
        if classification == "GENERATED":
            return "GENERATED"
        return "FALLBACK"

    def _classify_path(self, full_path: str, created_paths: set[str]) -> InventoryNode:
        rel = self._relative_path(full_path)
        segments = rel.split("/") if rel else [rel]
        top_level = segments[0] if segments else ""
        base_name = segments[-1] if segments else rel
        owner = self._owner_surface_for_name(top_level)
        if self._is_noise_path(rel):
            node_class = "GENERATED" if self._classify_file_name(base_name) == "GENERATED" else "FALLBACK"
        elif top_level in ENTRY_SURFACES:
            node_class = "SYSTEM_CRITICAL" if top_level in SYSTEM_AUTHORITY_DIRS else "ACTIVE"
        elif any(token in rel.lower() for token in AUTHORITY_HINTS) and not self._is_noise_path(rel):
            node_class = "SYSTEM_CRITICAL" if owner in SYSTEM_AUTHORITY_DIRS else "FALLBACK"
        elif self._is_evidence_path(rel, top_level, base_name):
            node_class = "EVIDENCE"
        elif self._is_quarantine_candidate(rel, base_name):
            node_class = "QUARANTINE"
        elif top_level in UTILITY_DIRS:
            node_class = "GENERATED"
        else:
            node_class = self._classify_file_name(base_name)

        review_state = (
            "evidence"
            if node_class == "EVIDENCE"
            else "quarantine_candidate"
            if node_class == "QUARANTINE"
            else "generated"
            if node_class == "GENERATED"
            else "active"
            if node_class in {"ACTIVE", "SYSTEM_CRITICAL"}
            else "fallback"
        )
        lifecycle = "DELETE_PENDING" if review_state == "quarantine_candidate" else "ARCHIVED" if review_state == "evidence" else "ACTIVE"
        role = "entry_surface" if top_level in ENTRY_SURFACES else "authority" if top_level in SYSTEM_AUTHORITY_DIRS else "utility" if top_level in UTILITY_DIRS else "asset"
        node_kind = "file"

        return InventoryNode(
            path=full_path,
            rel_path=rel,
            top_level=top_level,
            node_kind=node_kind,
            classification=node_class,
            lifecycle=lifecycle,
            review_state=review_state,
            role=role,
            owner_surface=owner,
            in_created_log=_normalize(full_path) in created_paths,
        )

    def _docker_ps(self) -> List[Dict[str, Any]]:
        command = ["docker", "ps", "--format", "{{json .}}"]
        try:
            proc = subprocess.run(command, capture_output=True, text=True, check=False)
        except FileNotFoundError:
            return [{"available": False, "error": "docker_not_installed"}]
        if proc.returncode != 0:
            return [{"available": False, "error": proc.stderr.strip() or "docker_ps_failed"}]

        containers: List[Dict[str, Any]] = []
        for line in proc.stdout.splitlines():
            line = line.strip()
            if not line:
                continue
            try:
                payload = json.loads(line)
            except json.JSONDecodeError:
                continue
            containers.append(
                {
                    "id": payload.get("ID"),
                    "name": payload.get("Names"),
                    "image": payload.get("Image"),
                    "status": payload.get("Status"),
                    "ports": payload.get("Ports"),
                }
            )
        return containers

    def _docker_stats(self) -> List[Dict[str, Any]]:
        command = ["docker", "stats", "--no-stream", "--format", "{{json .}}"]
        try:
            proc = subprocess.run(command, capture_output=True, text=True, check=False)
        except FileNotFoundError:
            return []
        if proc.returncode != 0:
            return []

        stats: List[Dict[str, Any]] = []
        for line in proc.stdout.splitlines():
            line = line.strip()
            if not line:
                continue
            try:
                payload = json.loads(line)
            except json.JSONDecodeError:
                continue
            stats.append(payload)
        return self._rank_container_stats(stats)

    def _rank_container_stats(self, stats: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        def parse_cpu(value: Optional[str]) -> float:
            if not value:
                return 0.0
            try:
                return float(value.rstrip("%"))
            except ValueError:
                return 0.0

        def parse_mem(value: Optional[str]) -> float:
            if not value:
                return 0.0
            token = value.split(" ", 1)[0]
            amount = "".join(ch for ch in token if (ch.isdigit() or ch == ".")) or "0"
            unit = "".join(ch for ch in token if ch.isalpha()).upper()
            try:
                amount_f = float(amount)
            except ValueError:
                return 0.0
            if unit.startswith("G"):
                return amount_f * 1024
            if unit.startswith("M"):
                return amount_f
            if unit.startswith("K"):
                return amount_f / 1024
            return amount_f

        ranked = []
        for entry in stats:
            ranked.append(
                {
                    **entry,
                    "_cpu": parse_cpu(entry.get("CPUPerc")),
                    "_mem": parse_mem(entry.get("MemUsage")),
                }
            )
        ranked.sort(key=lambda item: (item["_cpu"], item["_mem"]), reverse=True)
        for entry in ranked:
            entry.pop("_cpu", None)
            entry.pop("_mem", None)
        return ranked

    def _build_compliance_report(self, inventory_paths: List[str]) -> Dict[str, Any]:
        bypass_signatures = [
            "os.walk(",
            "Get-ChildItem",
            "glob.glob(",
            "Path.rglob(",
            "Path.glob(",
            "rg --files",
        ]
        bypass_candidates = [
            "core/discovery/bootstrap_importer.py",
            "scripts/generate_receipt_catalog.py",
            "scripts/register_all_components.py",
            "scripts/fix_component_layers.py",
            "scripts/diagnose-agent-lee-vscode-live-timeout.ps1",
            "scripts/fix-agent-lee-vscode-backend-timeout-live.ps1",
            "scripts/fix-vscode-agent-lee-timeout-source-v2.ps1",
        ]
        findings = []
        for rel in bypass_candidates:
            full = self.root / rel
            if not full.exists():
                continue
            try:
                text = full.read_text(encoding="utf-8", errors="replace")
            except OSError:
                continue
            matches = [signature for signature in bypass_signatures if signature in text]
            if matches:
                findings.append(
                    {
                        "path": rel,
                        "signatures": matches,
                        "classification": "DIRECT_FILESYSTEM_ACCESS",
                    }
                )

        inventory_sources = {
            "leeway-created-files.log": self.created_files_log.exists(),
            "leeway-file-inventory.log": self.file_inventory_log.exists(),
        }
        return {
            "lookupOrder": [
                "Canonical Discovery Graph",
                "Runtime Registry Cache",
                "Indexed Search",
                "Filesystem Lookup",
                "Estate Crawl",
            ],
            "inventorySources": inventory_sources,
            "directFilesystemBypassFindings": findings,
            "inventoryCount": len(inventory_paths),
            "policy": "Discovery-first lookup is the required default. Filesystem crawl is fallback only.",
        }
