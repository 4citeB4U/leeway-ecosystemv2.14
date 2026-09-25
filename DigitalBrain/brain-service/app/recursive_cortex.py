"""DB-03 Recursive Cortex: lazy universe materialization.

Scopes form a tree:
    root (whole brain)
    -> hemisphere scope        provider "hemi-regions"
    -> region scope            provider "region-clusters"
    -> cluster scope           provider "cluster-nodes"
    -> filesystem dir scope    provider "filesystem"   (source_path backed)
    -> file leaves

Children are materialized on first fetch (lazy load) and persisted in the
canonical graph with parent_id, depth, expandable, child_count. The Digital
Brain never edits this store itself; it only reads/projects. View positions
are visual state and live in a separate table (view_positions).
"""

import json
import os
from pathlib import Path

from . import store, taxonomy

FS_SKIP = {".git", "node_modules", "__pycache__", ".venv", "venv", "dist",
           "build", ".next", ".idea", ".vscode"}
FS_CAP = 120


def hemi_code(h):
    h = (h or "").strip().lower()
    return "L" if h in ("left", "l") else "R"


def taxonomy_meta_of(n):
    """Same contract as main.py taxonomy_meta, normalized to L/R."""
    try:
        spatial = json.loads(n.get("spatial_json") or "") if n.get("spatial_json") else {}
    except (json.JSONDecodeError, TypeError):
        spatial = {}
    if spatial.get("region"):
        return {
            "hemisphere": hemi_code(spatial.get("hemisphere")),
            "region": spatial.get("region"),
            "cluster": spatial.get("cluster"),
        }
    hemisphere, region, cluster = taxonomy.assign(dict(n))
    return {"hemisphere": hemi_code(hemisphere), "region": region, "cluster": cluster}


def scope_id(kind, *keys):
    return "scope::" + kind + "::" + "::".join(str(k) for k in keys)


def _node_dict(row):
    d = dict(row)
    return {
        "id": d["id"],
        "canonical_id": d.get("canonical_id") or d["id"],
        "title": d.get("title") or d["id"],
        "description": (d.get("description") or "")[:200],
        "type": d.get("type") or "object",
        "subtype": d.get("subtype") or "",
        "domain": d.get("domain") or "",
        "source_path": d.get("source_path") or "",
        "source_kind": d.get("source_kind") or "",
        "parent_id": d.get("parent_id") or None,
        "depth": d.get("depth") or 0,
        "expandable": bool(d.get("expandable")),
        "child_count": d.get("child_count") or 0,
        "child_provider": d.get("child_provider") or None,
        "status": d.get("status") or "",
    }


def _upsert_scope(conn, sid, title, provider, parent_id, depth, extra=None):
    node = {
        "id": sid,
        "canonical_id": sid,
        "domain": "scope",
        "type": "scope",
        "subtype": provider,
        "title": title,
        "description": "Recursive cortex scope",
        "source": "recursive-cortex",
        "source_anchor": provider,
        "tags_json": json.dumps(["scope", provider], ensure_ascii=False),
        "status": "active",
        "confidence": 1.0,
        "parent_id": parent_id,
        "depth": depth,
        "expandable": 1,
        "child_provider": provider,
        "child_count": 0,
    }
    if extra:
        node.update(extra)
    store.upsert_node(conn, node)
    return sid


def host_to_container(path_text):
    """Map a host source_path to the container-side path (workspace mount)."""
    if not path_text:
        return None
    host_root = os.environ.get("LEEWAY_ROOT_HOST_ABS", "")
    leeway_root = os.environ.get("LEEWAY_ROOT", "/leeway-root")
    p = str(path_text).replace("\\", "/")
    if host_root:
        hr = host_root.replace("\\", "/").rstrip("/")
        if p == hr:
            return leeway_root
        if p.startswith(hr + "/"):
            return leeway_root + p[len(hr):]
    from pathlib import PureWindowsPath
    return None if PureWindowsPath(p).is_absolute() else p


def _fs_children(conn, node):
    container = host_to_container(node.get("source_path"))
    if not container:
        return []
    d = Path(container)
    try:
        if not d.is_dir():
            return []
        entries = sorted(d.iterdir(), key=lambda p: (not p.is_dir(), p.name.lower()))
    except OSError:
        return []
    children = []
    for p in entries[:FS_CAP]:
        name = p.name
        if name in FS_SKIP or name.startswith("."):
            continue
        try:
            is_dir = p.is_dir()
        except OSError:
            continue
        host_path = os.path.join(node.get("source_path") or "", name).replace("\\", "/")
        cid = "fs::" + store.path_key(container + "/" + name).replace("path::", "")
        store.upsert_node(conn, {
            "id": cid,
            "canonical_id": cid,
            "domain": "fs",
            "type": "directory" if is_dir else "file",
            "subtype": p.suffix.lstrip(".") if not is_dir else "dir",
            "title": name,
            "description": ("directory" if is_dir else f"{p.suffix or 'file'} · {_size_kb(p)}") if not is_dir else "directory",
            "source": "filesystem",
            "source_path": host_path,
            "source_anchor": container,
            "tags_json": json.dumps(["fs", "directory" if is_dir else "file"], ensure_ascii=False),
            "status": "active",
            "confidence": 1.0,
            "parent_id": node["id"],
            "depth": (node.get("depth") or 0) + 1,
            "expandable": 1 if is_dir else 0,
            "child_count": 0,
            "child_provider": "filesystem" if is_dir else None,
            "source_kind": "filesystem",
        })
        children.append(cid)
    node["expandable"] = 1 if children else 0
    node["child_count"] = len(children)
    store.upsert_node(conn, node)
    return children


def _size_kb(p):
    try:
        return f"{p.stat().st_size // 1024} KB"
    except OSError:
        return ""


def _children_of_scope(conn, node):
    """Materialize children for a scope provider; returns child ids."""
    provider = node.get("child_provider")
    if provider == "hemi-regions":
        hemi = node["id"].split("::")[2]
        regions = {}
        for row in conn.execute("SELECT * FROM nodes WHERE domain != 'scope' AND domain != 'fs'").fetchall():
            m = taxonomy_meta_of(dict(row))
            if m["hemisphere"] != hemi:
                continue
            regions.setdefault(m["region"], 0)
            regions[m["region"]] += 1
        ids = []
        for region, count in sorted(regions.items()):
            sid = scope_id("region", region)
            _upsert_scope(conn, sid, taxonomy.region_label(region), "region-clusters",
                          node["id"], (node.get("depth") or 0) + 1,
                          {"title": taxonomy.region_label(region), "child_count": count,
                           "tags_json": json.dumps(["scope", "region", hemi], ensure_ascii=False)})
            ids.append(sid)
        node["child_count"] = len(ids)
        store.upsert_node(conn, node)
        return ids
    if provider == "region-clusters":
        parts = node["id"].split("::")
        region = parts[2]
        hemi = None
        parent = conn.execute("SELECT id, parent_id FROM nodes WHERE id = ?", (node["id"],)).fetchone()
        hemi = "L"
        clusters = {}
        for row in conn.execute("SELECT * FROM nodes WHERE domain != 'scope' AND domain != 'fs'").fetchall():
            m = taxonomy_meta_of(dict(row))
            if m["region"] != region:
                continue
            if hemi is None:
                hemi = m["hemisphere"]
            clusters.setdefault(m["cluster"] or "general", 0)
            clusters[m["cluster"] or "general"] += 1
        ids = []
        for cluster, count in sorted(clusters.items()):
            sid = scope_id("cluster", hemi, region, cluster)
            _upsert_scope(conn, sid, cluster, "cluster-nodes",
                          node["id"], (node.get("depth") or 0) + 1,
                          {"child_count": count,
                           "tags_json": json.dumps(["scope", "cluster", hemi], ensure_ascii=False)})
            ids.append(sid)
        node["child_count"] = len(ids)
        store.upsert_node(conn, node)
        return ids
    if provider == "cluster-nodes":
        parts = node["id"].split("::")
        hemi, region, cluster = parts[2], parts[3], parts[4]
        ids = []
        for row in conn.execute("SELECT * FROM nodes WHERE domain != 'scope' AND domain != 'fs'").fetchall():
            m = taxonomy_meta_of(dict(row))
            if (m["hemisphere"], m["region"], m.get("cluster") or "general") == (hemi, region, cluster):
                conn.execute("UPDATE nodes SET parent_id = ?, depth = ? WHERE id = ?",
                             (node["id"], (node.get("depth") or 0) + 1, row["id"]))
                ids.append(row["id"])
        node["child_count"] = len(ids)
        store.upsert_node(conn, node)
        return ids
    if provider == "filesystem":
        return _fs_children(conn, node)
    return []


def children_of(conn, node_id):
    row = conn.execute("SELECT * FROM nodes WHERE id = ?", (node_id,)).fetchone()
    if not row:
        return {"node": None, "children": [], "error": "not found"}
    node = dict(row)
    if node.get("domain") == "fs" and node.get("type") == "file":
        return {"node": _node_dict(row), "children": [], "leaf": True}
    child_ids = _children_of_scope(conn, node)
    conn.commit()
    out = []
    for cid in child_ids:
        r = conn.execute("SELECT * FROM nodes WHERE id = ?", (cid,)).fetchone()
        if r:
            out.append(_node_dict(r))
    return {"node": _node_dict(row), "children": out}


def root_of(conn):
    hemis = []
    for hemi, title, label in (("L", "LeeWay Ecosystem Hemisphere", "LeeWay"),
                               ("R", "User Knowledge Hemisphere", "User")):
        sid = scope_id("hemi", hemi)
        count = conn.execute(
            "SELECT COUNT(*) AS c FROM nodes WHERE domain != 'scope' AND domain != 'fs'"
        ).fetchone()["c"]
        _upsert_scope(conn, sid, title, "hemi-regions", None, 1,
                      {"title": title, "child_count": count,
                       "tags_json": json.dumps(["scope", "hemisphere", hemi], ensure_ascii=False)})
        hemis.append(_node_dict(conn.execute("SELECT * FROM nodes WHERE id = ?", (sid,)).fetchone()))
    total = conn.execute("SELECT COUNT(*) AS c FROM nodes").fetchone()["c"]
    conn.commit()
    return {"root": {"id": "brain::root", "title": "LeeWay Digital Brain", "depth": 0},
            "hemispheres": hemis, "totalNodes": total}


def backfill_parentage(conn):
    """Canonical hierarchy backfill (DB-03): parent every real node under its
    truthful cluster scope (creating region/cluster scopes as needed).

    Enables LW-B1 occupancy: siblings share a parent scope, so Base64 pins
    spread within the 64-slot lattice instead of colliding.
    """
    created = 0
    for row in conn.execute(
        "SELECT * FROM nodes WHERE parent_id IS NULL AND domain != 'scope' AND domain != 'fs'"
    ).fetchall():
        n = dict(row)
        m = taxonomy_meta_of(n)
        hemi, region, cluster = m["hemisphere"], m["region"], m.get("cluster") or "general"

        hemi_sid = scope_id("hemi", hemi)
        if not conn.execute("SELECT 1 FROM nodes WHERE id = ?", (hemi_sid,)).fetchone():
            _upsert_scope(conn, hemi_sid, "LeeWay" if hemi == "L" else "User",
                          "hemi-regions", None, 1, {})
            created += 1

        region_sid = scope_id("region", region)
        if not conn.execute("SELECT 1 FROM nodes WHERE id = ?", (region_sid,)).fetchone():
            _upsert_scope(conn, region_sid, taxonomy.region_label(region),
                          "region-clusters", hemi_sid, 2,
                          {"tags_json": json.dumps(["scope", "region", hemi])})
            created += 1

        cluster_sid = scope_id("cluster", hemi, region, cluster)
        if not conn.execute("SELECT 1 FROM nodes WHERE id = ?", (cluster_sid,)).fetchone():
            _upsert_scope(conn, cluster_sid, cluster, "cluster-nodes",
                          region_sid, 3, {})
            created += 1

        if n.get("parent_id") != cluster_sid:
            conn.execute(
                "UPDATE nodes SET parent_id = ?, depth = ? WHERE id = ?",
                (cluster_sid, 4, n["id"]))
    conn.commit()
    return {"createdScopes": created}


def relationships_of(conn, node_id):
    out = {"node": node_id, "in": [], "out": []}
    for row in conn.execute(
        "SELECT e.source_id, e.target_id, e.predicate, e.confidence, n.title AS target_title "
        "FROM edges e JOIN nodes n ON n.id = e.target_id WHERE e.source_id = ?", (node_id,)
    ).fetchall():
        out["out"].append({"predicate": row["predicate"], "target_id": row["target_id"],
                           "target_title": row["target_title"], "confidence": row["confidence"]})
    for row in conn.execute(
        "SELECT e.source_id, e.target_id, e.predicate, e.confidence, n.title AS source_title "
        "FROM edges e JOIN nodes n ON n.id = e.source_id WHERE e.target_id = ?", (node_id,)
    ).fetchall():
        out["in"].append({"predicate": row["predicate"], "source_id": row["source_id"],
                          "source_title": row["source_title"], "confidence": row["confidence"]})
    return out
