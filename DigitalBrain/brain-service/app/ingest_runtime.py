"""Ingest the LeeWay runtime truth layer: compose services, canonical endpoints,
runtime routes (control path) and semantic model usage — all evidence-backed.
"""

import json
import os
import re
from pathlib import Path

from . import store, taxonomy

CANONICAL_ENDPOINT_RE = re.compile(r"^([^:]{3,80}?):\s+(https?://\S+)\s*$", re.MULTILINE)

COMPOSE_FILES = [
    "docker-compose.leeway.yml",
    "docker-compose.digital-brain.yml",
]

ROUTE_PAIRS = [
    # control path from AGENTS.md: VS Code Chat -> Turbo 8787 -> router 8080 -> Runtime Fabric 4001
    ("system::agent-lee-turbo-adapter", "system::agent-lee-router", "ROUTES_VIA"),
    ("system::agent-lee-router", "system::runtime-fabric", "ROUTES_VIA"),
    ("system::runtime-fabric", "system::ollama", "ROUTES_VIA"),
    ("system::digital-brain", "system::ollama", "ROUTES_VIA"),
    ("system::agent-lee-router", "system::ollama", "ROUTES_VIA"),
]

SEMANTIC_PAIRS = [
    ("system::digital-brain", "system::ollama", "USES_MODEL"),
    ("system::agent-lee", "system::ollama", "USES_MODEL"),
    ("system::runtime-fabric", "system::ollama", "USES_MODEL"),
]

# DB-03: services whose source project lives inside the workspace become
# filesystem-backed universes (child_provider "filesystem"), so the brain can
# descend Brain -> Applications -> <service> -> dir -> file. Only applied when
# the directory actually exists (never fabricated).
PROJECT_DIRS = {
    "digital-brain": "DigitalBrain",
    "runtime-fabric": "Leeway Runtime Fabric",
}


def _endpoint_table(leeway_root):
    """Parse the Canonical Local Endpoints table from AGENTS.md."""
    agents_md = leeway_root / "AGENTS.md"
    if not agents_md.is_file():
        return {}
    try:
        text = agents_md.read_text(encoding="utf-8")
    except OSError:
        return {}
    table = {}
    section = text.partition("## Canonical Local Endpoints")[2]
    for line in section.splitlines()[:40]:
        m = CANONICAL_ENDPOINT_RE.match(line)
        if m:
            table[m.group(1).strip().lower()] = m.group(2)
    return table


def _compose_services(leeway_root):
    """Very small YAML-lite reader for the canonical compose files (service names only)."""
    services = {}
    for rel in COMPOSE_FILES:
        path = leeway_root / rel
        if not path.is_file():
            continue
        try:
            text = path.read_text(encoding="utf-8")
        except OSError:
            continue
        current = None
        for line in text.splitlines():
            if re.match(r"^  [a-z0-9][a-z0-9-]*:$", line):
                current = line.strip().rstrip(":")
                services.setdefault(current, []).append(path)
            elif line.startswith("    image:"):
                pass
    return services


def ingest(conn, leeway_root_env=None, force=False):
    leeway_root = Path(os.environ.get("LEEWAY_ROOT", leeway_root_env or "."))
    agents_md = leeway_root / "AGENTS.md"

    sources = [agents_md, Path(__file__).resolve()] + [leeway_root / rel for rel in COMPOSE_FILES if (leeway_root / rel).is_file()]
    newest = max((p.stat().st_mtime_ns for p in sources if p.is_file()), default=0)
    last_scan = store.get_meta(conn, "system_last_scan")
    if not force and last_scan and int(last_scan) >= newest:
        return {"status": "fresh", "domain": "system", "nodes": 0, "edges": 0}

    # P4: never wipe formula state. Runtime re-scans must preserve addresses
    # (b64_path/spatial_index/binary_path/parent_id) of addressed system nodes
    # because upsert_node uses INSERT OR REPLACE (missing keys -> NULL).
    preserved = {}
    for row in conn.execute(
        "SELECT id, b64_path, spatial_index, binary_path, parent_id FROM nodes"
        " WHERE domain = 'system' AND b64_path IS NOT NULL"
    ).fetchall():
        preserved[row["id"]] = row

    store.clear_domain(conn, "system")
    counts = {"nodes": 0, "edges": 0}
    endpoints = _endpoint_table(leeway_root)
    compose_services = _compose_services(leeway_root)

    # AGENTS.md canonical endpoints -> service nodes (the runtime truth layer)
    endpoint_to_service = {
        "vs code adapter / agent lee turbo": "agent-lee-turbo-adapter",
        "agent lee router": "agent-lee-router",
        "runtime fabric": "runtime-fabric",
        "leeway ide": "leeway-ide",
        "forgejo (source forge, port policy)": "forgejo",
        "cerebral daemon": "cerebral-daemon",
        "cerebral ui": "cerebral-ui",
        "desktop runtime / voice / body": "desktop-runtime",
        "ollama / local model fabric": "ollama",
    }

    all_services = set(compose_services) | set(endpoint_to_service.values())
    service_ids = {f"system::{n}" for n in all_services}

    for name in sorted(all_services):
        svc_id = f"system::{name}"
        endpoint = endpoints.get(name.replace("-", " "), "")
        compose_ref = compose_services.get(name, [agents_md])
        node_meta = {"endpoint": endpoint, "compose": [str(p) for p in compose_ref]}
        provider = None
        source_kind = None
        source_path = str(compose_ref[0])
        # DB-03 / P1-11: services with a real project dir inside the workspace
        # become filesystem-backed universes (child_provider "filesystem"), so the
        # brain can descend Brain -> Applications -> <service> -> dir -> file.
        # Only applied when the directory actually exists (never fabricated).
        project = PROJECT_DIRS.get(name)
        if project:
            cand = leeway_root / project
            if cand.is_dir():
                host_root = os.environ.get("LEEWAY_ROOT_HOST_ABS", "").replace("\\", "/").rstrip("/")
                host_path = f"{host_root}/{project}" if host_root else str(cand)
                node_meta["project_dir"] = host_path
                provider = "filesystem"
                source_kind = "filesystem"
                source_path = host_path
        store.upsert_node(conn, {
            "id": svc_id,
            "canonical_id": f"runtime::{name}",
            "domain": "system",
            "type": "application",
            "subtype": "service",
            "title": name.replace("-", " ").title(),
            "description": f"LeeWay runtime service '{name}' (port policy per AGENTS.md)",
            "source": "docker-compose.leeway.yml + AGENTS.md",
            "source_path": source_path,
            "source_anchor": "canonical endpoints table",
            "source_kind": source_kind,
            "tags_json": json.dumps(["runtime", "service", name], ensure_ascii=False),
            "status": "active",
            "confidence": 1.0,
            "expandable": 1 if provider else 0,
            "child_count": 0,
            "child_provider": provider,
            "spatial_json": None,
            "metadata_json": json.dumps(node_meta, ensure_ascii=False),
        })
        store.add_provenance(conn, svc_id, "compose", str(compose_ref[0]), name)
        if provider:
            store.add_provenance(conn, svc_id, "filesystem", source_path, f"project dir {project}")
        if endpoint:
            store.add_provenance(conn, svc_id, "endpoint", str(agents_md), endpoint)
        counts["nodes"] += 1

    def edge(source_id, predicate, target_id, ref, confidence=1.0):
        store.upsert_edge(conn, {
            "source_id": source_id,
            "predicate": predicate,
            "target_id": target_id,
            "provenance_kind": "runtime-route",
            "confidence": confidence,
            "source_ref": str(ref),
        })
        counts["edges"] += 1

    for source_id, target_id, predicate in ROUTE_PAIRS:
        if source_id in service_ids and target_id in service_ids:
            edge(source_id, predicate, target_id, agents_md)

    for source_id, target_id, predicate in SEMANTIC_PAIRS:
        if source_id in service_ids and target_id in service_ids:
            edge(source_id, predicate, target_id, agents_md, 0.9)

    conn.commit()
    for svc_id, p in preserved.items():
        conn.execute(
            "UPDATE nodes SET b64_path = ?, spatial_index = ?, binary_path = ?, parent_id = ?"
            " WHERE id = ?",
            (p["b64_path"], p["spatial_index"], p["binary_path"], p["parent_id"], svc_id),
        )
    conn.commit()
    store.set_meta(conn, "system_last_scan", str(newest))
    conn.commit()
    return {"status": "ingested", "domain": "system", "nodes": counts["nodes"], "edges": counts["edges"]}