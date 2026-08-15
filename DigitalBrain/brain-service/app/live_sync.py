"""P1-12 (DB-04): Continuous Reality Synchronization.

The Digital Brain becomes a live event-driven projection of LeeWay reality:
  CREATE  -> discover -> classify -> canonical graph insert -> LW-B1 placement
             (if spatially addressable) -> B64 path -> client delta -> history
  MODIFY  -> detect content/state change -> update canonical object (never a
             duplicate) -> hash/timestamps -> client delta -> history
  RENAME  -> preserve canonical continuity (content-hash identity) -> update
             path/name, no orphan -> history old/new
  MOVE    -> update parent/scope -> rerun LW-B1 placement if spatial ancestry
             changes -> provenance -> history
  DELETE  -> remove from ACTIVE graph -> tombstone/history -> client delta

Watch authority: the existing PROJECT_DIRS map in ingest_runtime.py (single
Discovery authority — no second independent discovery). Bounded: polling +
per-path coalescing + debounce + content hashes + capped scan; never a blind
full-ecosystem rescan per event. Deltas are pushed to clients over the single
SSE endpoint /brain/events (no duplicate transport).
"""

import hashlib
import json
import os
import threading
import time
from pathlib import Path

from . import b64_cortex, recursive_cortex, store, taxonomy
from .ingest_runtime import PROJECT_DIRS
from .lw_b1 import LW_B1

POLL_INTERVAL = 1.5          # seconds between bounded scans
HASH_CAP = 512 * 1024 * 1024  # files >= 512MB: metadata-only hash (bounded)
MAX_ENTRIES = 4000           # hard cap per scan (bounded walk)
EVENT_KEEP = 1000            # SSE bus retention

_TRACE_PATH = Path(os.environ.get("BRAIN_DATA_DIR", "data")) / "live-sync-trace.jsonl"

_TABLES = """\
CREATE TABLE IF NOT EXISTS sync_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id TEXT,
    op TEXT,
    node_id TEXT,
    prev_node_id TEXT,
    path TEXT,
    prev_path TEXT,
    hash TEXT,
    prev_hash TEXT,
    size INTEGER,
    mtime_ns INTEGER,
    parent_id TEXT,
    prev_parent_id TEXT,
    b64_path TEXT,
    prev_b64_path TEXT,
    detail_json TEXT,
    captured_at TEXT
);
CREATE TABLE IF NOT EXISTS node_tombstones (
    node_id TEXT PRIMARY KEY,
    title TEXT,
    path TEXT,
    b64_path TEXT,
    parent_id TEXT,
    kind TEXT,
    deleted_at TEXT,
    detail_json TEXT
);
"""

# ---------------------------------------------------------------- SSE bus
_lock = threading.Lock()
_events = []
_next_id = 0


def publish(delta):
    global _next_id
    with _lock:
        delta = dict(delta)
        delta["id"] = _next_id
        _next_id += 1
        _events.append(delta)
        if len(_events) > EVENT_KEEP:
            del _events[: len(_events) - EVENT_KEEP]


def events_since(last_id):
    with _lock:
        return [e for e in _events if e["id"] > last_id]


# ---------------------------------------------------------------- helpers
def _fs_id(container_path):
    return "fs::" + store.path_key(container_path).replace("path::", "")


def _host_path(container_path, leeway_root):
    host_root = os.environ.get("LEEWAY_ROOT_HOST_ABS", "").replace("\\", "/").rstrip("/")
    rel = str(container_path)[len(str(leeway_root)):]
    return f"{host_root}{rel}" if host_root else str(container_path)


def _parent_for(container_path, leeway_root):
    p = Path(container_path)
    parent = p.parent
    if parent.as_posix() == str(leeway_root).rstrip("/"):
        return None
    return _fs_id(parent.as_posix())


def _project_for(path, leeway_root):
    """Which PROJECT_DIRS entry owns this container path: (project_rel, service)."""
    p = str(path).replace("\\", "/")
    for service, project in PROJECT_DIRS.items():
        if p == str(leeway_root).rstrip("/") + "/" + project or p.startswith(
                str(leeway_root).rstrip("/") + "/" + project + "/"):
            return project, service
    return None


def _parent_id_for(container_path, leeway_root, project_rel, service_name):
    p = Path(container_path)
    parent = p.parent
    if parent.as_posix() == str(leeway_root).rstrip("/") + "/" + project_rel:
        return f"system::{service_name}"
    return _fs_id(parent.as_posix())


def _hash_file(path):
    try:
        if path.stat().st_size >= HASH_CAP:
            return "meta:" + str(path.stat().st_size)
        h = hashlib.sha256()
        with open(path, "rb") as fh:
            for chunk in iter(lambda: fh.read(1 << 20), b""):
                h.update(chunk)
        return h.hexdigest()
    except OSError:
        return None


def _scan(leeway_root):
    """Bounded snapshot of PROJECT_DIRS (single Discovery authority)."""
    snap = {}
    for service, project in PROJECT_DIRS.items():
        root = leeway_root / project
        if not root.is_dir():
            continue
        base = root.as_posix()
        entries = 0
        for dirpath, dirnames, filenames in os.walk(root):
            dirnames[:] = sorted(
                d for d in dirnames
                if d not in recursive_cortex.FS_SKIP and not d.startswith(".")
            )
            for name in sorted(filenames):
                if name in recursive_cortex.FS_SKIP or name.startswith("."):
                    continue
                if entries >= MAX_ENTRIES:
                    return snap
                p = Path(dirpath) / name
                try:
                    st = p.stat()
                except OSError:
                    continue
                cp = (str(p).replace("\\", "/"))
                entries += 1
                snap[cp] = {
                    "kind": "file", "size": st.st_size, "mtime_ns": st.st_mtime_ns,
                    "hash": _hash_file(p),
                }
            for name in sorted(dirnames):
                if entries >= MAX_ENTRIES:
                    return snap
                p = Path(dirpath) / name
                try:
                    st = p.stat()
                except OSError:
                    continue
                cp = (str(p).replace("\\", "/"))
                entries += 1
                snap[cp] = {"kind": "dir", "size": 0, "mtime_ns": st.st_mtime_ns, "hash": None}
    return snap


def _changed(prev, entry):
    if prev["kind"] != entry["kind"]:
        return True
    if prev["size"] != entry["size"] or prev["mtime_ns"] != entry["mtime_ns"]:
        return True
    return False


def _tax_meta(n):
    try:
        spatial = json.loads(n.get("spatial_json") or "") if n.get("spatial_json") else {}
    except (json.JSONDecodeError, TypeError):
        spatial = {}
    if spatial.get("region"):
        return {
            "hemisphere": recursive_cortex.hemi_code(spatial.get("hemisphere")),
            "region": spatial.get("region"),
            "cluster": spatial.get("cluster"),
        }
    hemisphere, region, cluster = taxonomy.assign(dict(n))
    return {"hemisphere": recursive_cortex.hemi_code(hemisphere), "region": region, "cluster": cluster}


def _parent_region_label(conn, parent):
    m = _tax_meta(dict(parent))
    return taxonomy.region_label(m["region"])


def node_payload(row):
    n = dict(row)
    m = _tax_meta(n)
    addr = None
    if n.get("b64_path"):
        addr = {
            "path": n["b64_path"],
            "spatial_index": n.get("spatial_index"),
            "binary_path": n.get("binary_path"),
        }
    return {
        "id": n["id"],
        "label": n.get("title") or n["id"],
        "type": n.get("type") or "object",
        "subtype": n.get("subtype") or "",
        "domain": n.get("domain") or "",
        "canonical_id": n.get("canonical_id") or n["id"],
        "source_path": n.get("source_path") or "",
        "status": n.get("status") or "active",
        "parent_id": n.get("parent_id"),
        "depth": n.get("depth") or 0,
        "expandable": bool(n.get("expandable")),
        "child_count": n.get("child_count") or 0,
        "child_provider": n.get("child_provider"),
        "brain_address": addr,
        "formula_state": None,
        "hemisphere": m["hemisphere"],
        "region": m["region"],
        "cluster": m.get("cluster") or "",
        "region_label": taxonomy.region_label(m["region"]),
    }


def _links_for(conn, node_id):
    out = []
    for e in conn.execute("SELECT * FROM edges WHERE source_id = ? OR target_id = ?", (node_id, node_id)).fetchall():
        out.append({
            "source": e["source_id"], "target": e["target_id"],
            "predicate": e["predicate"], "provenance_kind": e["provenance_kind"],
            "kind": "route" if e["predicate"] == "ROUTES_VIA" else "semantic",
        })
    return out


def _trace(event, **fields):
    try:
        line = json.dumps({"ts": store.time_stamp(), "event": event, **fields}, ensure_ascii=False, default=str)
        with open(_TRACE_PATH, "a", encoding="utf-8") as fh:
            fh.write(line + "\n")
    except OSError:
        pass


def _log(conn, op, **kw):
    fields = {
        "event_id": f"evt-{op}-{int(time.time() * 1000)}", "op": op,
        "node_id": None, "prev_node_id": None, "path": None, "prev_path": None,
        "hash": None, "prev_hash": None, "size": None, "mtime_ns": None,
        "parent_id": None, "prev_parent_id": None, "b64_path": None,
        "prev_b64_path": None, "detail_json": json.dumps({}),
        "captured_at": store.time_stamp(),
    }
    fields.update(kw)
    if fields.get("detail_json") and not isinstance(fields["detail_json"], str):
        fields["detail_json"] = json.dumps(fields["detail_json"], ensure_ascii=False)
    conn.execute(
        "INSERT INTO sync_events (event_id, op, node_id, prev_node_id, path, prev_path, hash, prev_hash,"
        " size, mtime_ns, parent_id, prev_parent_id, b64_path, prev_b64_path, detail_json, captured_at)"
        " VALUES (:event_id, :op, :node_id, :prev_node_id, :path, :prev_path, :hash, :prev_hash,"
        " :size, :mtime_ns, :parent_id, :prev_parent_id, :b64_path, :prev_b64_path, :detail_json, :captured_at)",
        fields,
    )
    _trace(op, event_id=fields["event_id"], node_id=fields["node_id"], path=fields["path"],
           hash=fields["hash"], parent_id=fields["parent_id"], b64_path=fields["b64_path"],
           detail=fields["detail_json"])


# ---------------------------------------------------------------- placement
def _place(conn, row, parent_row, region_label):
    """LW-B1 placement into the parent's lattice; (b64_path, None) or (None, reason)."""
    row = dict(row) if not isinstance(row, dict) else row
    parent_row = dict(parent_row) if not isinstance(parent_row, dict) else parent_row
    if not parent_row or not parent_row.get("b64_path"):
        return None, "PARENT_UNPLACED"
    controller = LW_B1(store)
    siblings = conn.execute(
        "SELECT * FROM nodes WHERE parent_id = ? AND id != ?", (parent_row["id"], row["id"])
    ).fetchall()
    evidence = {}
    for e in conn.execute("SELECT node_id, COUNT(*) AS n FROM provenance GROUP BY node_id").fetchall():
        evidence[e["node_id"]] = e["n"]
    feats = [{
        "region_label": region_label,
        "domain": s["domain"] or "fs",
        "pagerank": 0.0,
        "activity": 0.0,
        "evidence": min(1.0, evidence.get(s["id"], 0) / 10.0),
        "balance": 0.0,
        "b64_index": s["spatial_index"],
    } for s in siblings]
    passport, addr = controller.place(dict(row), feats, region_label, "fs", parent_row["b64_path"][0])
    if passport.get("status") != "PASS" or not addr:
        return None, passport.get("reason")
    own_word, own_index = addr["words"][0], addr["indices"][0]
    parent_words = parent_row["b64_path"].split(":")[1:]
    path = addr["hemi"] + ":" + ":".join(parent_words) + ":" + own_word
    binary = ".".join([parent_row["binary_path"], b64_cortex.to_bits(own_index)])
    conn.execute(
        "UPDATE nodes SET b64_path = ?, spatial_index = ?, binary_path = ? WHERE id = ?",
        (path, own_index, binary, row["id"]),
    )
    store.upsert_passport(conn, {
        "node_id": row["id"],
        "formula_id": passport["formulaVersion"],
        "adapter_id": passport["adapterId"],
        "policy": passport["policy"],
        "status": passport["status"],
        "top6_json": json.dumps(passport["top6"]),
        "base64_top6_json": json.dumps(passport["base64Top6"]),
        "selected_index": own_index,
        "selected_b64": own_word,
        "selected_bits": addr["bits"][0],
        "window_hash": passport["inputHash"],
        "input_hash": passport["inputHash"],
        "result_hash": passport["resultHash"],
        "receipt_path": passport["receiptPath"],
        "evaluated_at": passport["evaluatedAt"],
        "kernel_status": passport["kernelStatus"],
        "confidence": passport["confidence"],
        "free_slots": passport["freeSlots"],
        "detail_json": json.dumps({
            "policy": passport["policy"], "attempts": passport.get("attempts"),
            "attemptUsed": passport.get("attemptUsed"),
        }, ensure_ascii=False),
    })
    return path, None


def formula_enabled():
    """Formula gate (P4-24..27): BRAIN_FORMULA=0 stops NEW placements while
    preserving persisted addresses. Never mutates existing B64 state."""
    return os.environ.get("BRAIN_FORMULA", "1") != "0"


def _startup_placement(conn):
    """Additive pre-pass: place unaddressed fs nodes whose parent is addressed
    (existing materialized fs children become coherent with new live nodes)."""
    if not formula_enabled():
        _trace("startup-placement-skipped-formula-off")
        return
    placed, blocked = 0, 0
    for row in conn.execute(
        "SELECT * FROM nodes WHERE domain = 'fs' AND b64_path IS NULL AND parent_id IS NOT NULL"
    ).fetchall():
        row = dict(row)
        parent = conn.execute("SELECT * FROM nodes WHERE id = ?", (row["parent_id"],)).fetchone()
        if not parent or not parent["b64_path"]:
            continue
        b64, reason = _place(conn, row, parent, _parent_region_label(conn, parent))
        if b64:
            placed += 1
        else:
            blocked += 1
            _trace("startup-place-blocked", id=row["id"], reason=reason)
    conn.commit()
    _trace("startup-placement", placed=placed, blocked=blocked)


# ---------------------------------------------------------------- ops
def _apply_create(conn, path, entry, leeway_root, project_rel, service_name):
    parent_id = _parent_id_for(path, leeway_root, project_rel, service_name)
    parent = conn.execute("SELECT * FROM nodes WHERE id = ?", (parent_id,)).fetchone()
    cid = _fs_id(path)
    is_dir = entry["kind"] == "dir"
    node = {
        "id": cid,
        "canonical_id": cid,
        "domain": "fs",
        "type": "directory" if is_dir else "file",
        "subtype": "dir" if is_dir else (Path(path).suffix.lstrip(".") or "file"),
        "title": Path(path).name,
        "description": "directory" if is_dir else f"{Path(path).suffix or 'file'} · {_size_kb(entry)}",
        "source": "filesystem",
        "source_path": _host_path(path, leeway_root),
        "source_anchor": parent_id or "system",
        "tags_json": json.dumps(["fs", "directory" if is_dir else "file", "live"], ensure_ascii=False),
        "status": "active",
        "confidence": 1.0,
        "parent_id": parent_id,
        "depth": (parent["depth"] if parent else 0) + 1,
        "expandable": 1 if is_dir else 0,
        "child_count": 0,
        "child_provider": "filesystem" if is_dir else None,
        "source_kind": "filesystem",
        "metadata_json": json.dumps(
            {"size": entry["size"], "mtime_ns": entry["mtime_ns"], "sha256": entry["hash"]},
            ensure_ascii=False,
        ),
    }
    store.upsert_node(conn, node)
    store.add_provenance(conn, cid, "filesystem", path, f"live-sync create ({entry['kind']})")
    b64 = None
    if parent and parent["b64_path"]:
        if formula_enabled():
            b64, reason = _place(conn, node, parent, _parent_region_label(conn, parent))
            if b64 is None:
                _trace("place-blocked", id=cid, reason=reason)
        else:
            _trace("placement-skipped-formula-off", id=cid, path=path)
    _log(conn, "create", node_id=cid, path=path, hash=entry["hash"], size=entry["size"],
         mtime_ns=entry["mtime_ns"], parent_id=parent_id, b64_path=b64)
    _publish(conn, "create", cid)


def _apply_modify(conn, path, entry, leeway_root):
    cid = _fs_id(path)
    row = conn.execute("SELECT * FROM nodes WHERE id = ?", (cid,)).fetchone()
    if not row:
        _trace("modify-missing->create", path=path)
        _apply_modify_missing(conn, path, entry, leeway_root)
        return
    prev_hash = None
    try:
        meta = json.loads(row["metadata_json"]) if row["metadata_json"] else {}
        prev_hash = meta.get("sha256")
    except (json.JSONDecodeError, TypeError):
        meta = {}
    meta.update({"size": entry["size"], "mtime_ns": entry["mtime_ns"], "sha256": entry["hash"]})
    conn.execute(
        "UPDATE nodes SET description = ?, metadata_json = ?, status = 'active' WHERE id = ?",
        (f"{Path(path).suffix or 'file'} · {_size_kb(entry)}", json.dumps(meta, ensure_ascii=False), cid),
    )
    # self-heal: an unaddressed node (e.g. written during formula OFF) whose
    # parent became addressed is placed on modify, not only on create/sweep
    placed_b64 = row["b64_path"]
    if not placed_b64 and formula_enabled():
        parent = conn.execute("SELECT * FROM nodes WHERE id = ?", (row["parent_id"],)).fetchone()
        if parent and parent["b64_path"]:
            placed_b64, reason = _place(conn, row, parent, _parent_region_label(conn, parent))
            if placed_b64 is None:
                _trace("place-blocked", id=cid, reason=reason)
    store.add_provenance(conn, cid, "filesystem", path, "live-sync modify")
    _log(conn, "modify", node_id=cid, path=path, hash=entry["hash"], prev_hash=prev_hash,
         size=entry["size"], mtime_ns=entry["mtime_ns"],
         parent_id=row["parent_id"], b64_path=placed_b64,
         detail_json={"prevHash": prev_hash})
    _publish(conn, "modify", cid)


def _apply_modify_missing(conn, path, entry, leeway_root):
    proj = _project_for(path, leeway_root)
    if proj:
        project_rel, service_name = proj
        _apply_create(conn, path, entry, leeway_root, project_rel, service_name)
    else:
        _trace("modify-outside-projects", path=path)


def _remap_ids(conn, old_id, new_id):
    """Cascade a node id change to edges/provenance/passports/positions/children.
    sync_events is append-only history and is never rewritten."""
    conn.execute("UPDATE nodes SET id = ? WHERE id = ?", (new_id, old_id))
    conn.execute("UPDATE edges SET source_id = ? WHERE source_id = ?", (new_id, old_id))
    conn.execute("UPDATE edges SET target_id = ? WHERE target_id = ?", (new_id, old_id))
    conn.execute("UPDATE provenance SET node_id = ? WHERE node_id = ?", (new_id, old_id))
    conn.execute("UPDATE formula_passports SET node_id = ? WHERE node_id = ?", (new_id, old_id))
    conn.execute("UPDATE view_positions SET node_id = ? WHERE node_id = ?", (new_id, old_id))
    conn.execute("UPDATE nodes SET parent_id = ? WHERE parent_id = ?", (new_id, old_id))


def _descendants(conn, node_id):
    out = []
    queue = [node_id]
    while queue:
        cur = queue.pop(0)
        for ch in conn.execute("SELECT id FROM nodes WHERE parent_id = ?", (cur,)).fetchall():
            out.append(ch["id"])
            queue.append(ch["id"])
    return out


def _apply_rename_or_move(conn, old_path, old_entry, new_path, new_entry,
                          leeway_root, project_rel, service_name, is_move):
    old_id = _fs_id(old_path)
    new_id = _fs_id(new_path)
    row = conn.execute("SELECT * FROM nodes WHERE id = ?", (old_id,)).fetchone()
    if not row:
        _trace("rename-missing-origin", old_path=old_path, new_path=new_path)
        _apply_delete(conn, old_path, old_entry)
        _apply_create(conn, new_path, new_entry, leeway_root, project_rel, service_name)
        return
    old_parent = row["parent_id"]
    old_b64 = row["b64_path"]
    new_parent = _parent_id_for(new_path, leeway_root, project_rel, service_name)
    # remap id + all descendants (dir paths embed the id)
    all_ids = [old_id] + _descendants(conn, old_id)
    for nid in all_ids:
        suffix = nid[len(old_id):]
        _remap_ids(conn, nid, new_id + suffix)
    # update the moved/renamed row itself
    new_depth = 0
    np = conn.execute("SELECT * FROM nodes WHERE id = ?", (new_parent,)).fetchone()
    new_depth = (np["depth"] if np else 0) + 1
    is_dir = row["type"] == "directory"
    meta = {}
    try:
        meta = json.loads(row["metadata_json"]) if row["metadata_json"] else {}
    except (json.JSONDecodeError, TypeError):
        pass
    meta.update({"size": new_entry["size"], "mtime_ns": new_entry["mtime_ns"], "sha256": new_entry["hash"]})
    conn.execute(
        "UPDATE nodes SET title = ?, description = ?, source_path = ?, source_anchor = ?,"
        " parent_id = ?, depth = ?, metadata_json = ? WHERE id = ?",
        (Path(new_path).name,
         "directory" if is_dir else f"{Path(new_path).suffix or 'file'} · {_size_kb(new_entry)}",
         _host_path(new_path, leeway_root), new_parent, new_parent, new_depth,
         json.dumps(meta, ensure_ascii=False), new_id),
    )
    store.add_provenance(conn, new_id, "filesystem", new_path,
                         f"live-sync {'move' if is_move else 'rename'} from {old_path}")
    # rerun LW-B1 placement when canonical spatial ancestry changed
    new_b64 = None
    if old_parent != new_parent or old_b64 is None:
        if np and np["b64_path"]:
            if formula_enabled():
                new_b64, reason = _place(conn, conn.execute("SELECT * FROM nodes WHERE id = ?", (new_id,)).fetchone(),
                                         np, _parent_region_label(conn, np))
                if new_b64 is None:
                    _trace("place-blocked", id=new_id, reason=reason)
            else:
                _trace("placement-skipped-formula-off", id=new_id, path=new_path)
    else:
        new_b64 = old_b64
    _log(conn, "move" if is_move else "rename",
         node_id=new_id, prev_node_id=old_id, path=new_path, prev_path=old_path,
         hash=new_entry["hash"], prev_hash=old_entry["hash"],
         size=new_entry["size"], mtime_ns=new_entry["mtime_ns"],
         parent_id=new_parent, prev_parent_id=old_parent,
         b64_path=new_b64, prev_b64_path=old_b64,
         detail_json={"continuity": "content-hash identity", "oldId": old_id})
    _publish(conn, "move" if is_move else "rename", new_id, prev_id=old_id)


def _apply_delete(conn, path, entry):
    cid = _fs_id(path)
    row = conn.execute("SELECT * FROM nodes WHERE id = ?", (cid,)).fetchone()
    if not row:
        _trace("delete-skip-missing", path=path)
        return
    all_ids = [cid] + _descendants(conn, cid)
    for nid in reversed(all_ids):
        r = conn.execute("SELECT * FROM nodes WHERE id = ?", (nid,)).fetchone()
        if not r:
            continue
        conn.execute(
            "INSERT OR REPLACE INTO node_tombstones"
            " (node_id, title, path, b64_path, parent_id, kind, deleted_at, detail_json)"
            " VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (r["id"], r["title"] or r["id"], r["source_path"] or "", r["b64_path"],
             r["parent_id"], f"{r['type']}/{r['subtype']}", store.time_stamp(),
             json.dumps({"domain": r["domain"]}, ensure_ascii=False)),
        )
        conn.execute("DELETE FROM edges WHERE source_id = ? OR target_id = ?", (nid, nid))
        conn.execute("DELETE FROM provenance WHERE node_id = ?", (nid,))
        conn.execute("DELETE FROM formula_passports WHERE node_id = ?", (nid,))
        conn.execute("DELETE FROM view_positions WHERE node_id = ?", (nid,))
        conn.execute("DELETE FROM nodes WHERE id = ?", (nid,))
    _log(conn, "delete", node_id=cid, path=path, hash=entry["hash"],
         parent_id=row["parent_id"], prev_b64_path=row["b64_path"],
         detail_json={"tombstonedDescendants": len(all_ids) - 1})
    publish({"op": "delete", "node": {"id": cid, "title": row["title"], "path": row["source_path"]}})


def _size_kb(entry):
    return f"{entry['size'] // 1024} KB" if entry["size"] else ""


def _publish(conn, op, node_id, prev_id=None):
    row = conn.execute("SELECT * FROM nodes WHERE id = ?", (node_id,)).fetchone()
    if not row:
        return
    delta = {"op": op, "node": node_payload(row), "links": _links_for(conn, node_id)}
    if prev_id:
        delta["prevId"] = prev_id
    publish(delta)


# ---------------------------------------------------------------- batch
def _match_continuity(dp, de, creates):
    """RENAME/MOVE identity: same content hash (files) or same title+parent (dirs)."""
    if de["kind"] == "file" and de.get("hash"):
        for cp, ce in creates.items():
            if ce["kind"] == "file" and ce.get("hash") and ce["hash"] == de["hash"]:
                return cp, ce
    else:
        for cp, ce in creates.items():
            if ce["kind"] == "dir" and Path(cp).name == Path(dp).name \
                    and str(Path(cp).parent) == str(Path(dp).parent):
                return cp, ce
    return None


def process_batch(conn, evts, leeway_root):
    last_by_path = {}
    for kind, path, entry in evts:
        last_by_path[path] = (kind, entry)
    deletes = {p: e for p, (k, e) in last_by_path.items() if k == "delete"}
    creates = {p: e for p, (k, e) in last_by_path.items() if k == "create"}
    matched = set()
    ops = []
    for dp, de in list(deletes.items()):
        cand = _match_continuity(dp, de, creates)
        if cand:
            cp, ce = cand
            matched.add(dp)
            matched.add(cp)
            old_parent = _parent_for(dp, leeway_root)
            new_parent = _parent_for(cp, leeway_root)
            ops.append(("move" if old_parent != new_parent else "rename", dp, de, cp, ce))
    for p, (k, e) in last_by_path.items():
        if p in matched:
            continue
        if k == "modify" and e["kind"] == "dir":
            continue  # dir mtime churn is covered by child events
        ops.append((k, p, e))
    def rank(o):
        op, p = o[0], o[1]
        if op == "create":
            return (0, p.count("/"))
        if op in ("rename", "move"):
            return (1, p.count("/"))
        return (2, -p.count("/"))
    ops.sort(key=rank)
    for o in ops:
        proj = _project_for(o[1], leeway_root)
        project_rel = service_name = None
        if proj:
            project_rel, service_name = proj
        if o[0] == "create":
            _apply_create(conn, o[1], o[2], leeway_root, project_rel, service_name)
        elif o[0] == "modify":
            _apply_modify(conn, o[1], o[2], leeway_root)
        elif o[0] in ("rename", "move"):
            _apply_rename_or_move(conn, o[1], o[2], o[3], o[4], leeway_root,
                                  project_rel, service_name, is_move=o[0] == "move")
        else:
            _apply_delete(conn, o[1], o[2])


# ---------------------------------------------------------------- loop
def _seed_state(conn):
    """Seed the poll baseline from persisted fs nodes so boot never re-emits
    creates (no address wipe via INSERT OR REPLACE, no event storm)."""
    state = {}
    for row in conn.execute("SELECT * FROM nodes WHERE domain = 'fs'").fetchall():
        r = dict(row)
        cp = r["id"][4:] if r["id"].startswith("fs::") else None
        if not cp:
            continue
        meta = {}
        try:
            meta = json.loads(r["metadata_json"] or "") if r["metadata_json"] else {}
        except (json.JSONDecodeError, TypeError):
            meta = {}
        if r["type"] == "directory":
            state[cp] = {"kind": "dir", "size": 0, "mtime_ns": 0, "hash": None}
        else:
            state[cp] = {
                "kind": "file",
                "size": int(meta.get("size", 0)),
                "mtime_ns": int(meta.get("mtime_ns", 0)),
                "hash": meta.get("sha256"),
            }
    return state


def run(leeway_root_env=None, loop=True):
    leeway_root = Path(os.environ.get("LEEWAY_ROOT", leeway_root_env or ".")).resolve()
    conn = store.connect()
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=8000")
    conn.executescript(_TABLES)
    conn.commit()
    _trace("sync-start", root=str(leeway_root))
    _trace("startup-placement-begin")
    try:
        _startup_placement(conn)
    except Exception as exc:  # noqa: BLE001
        _trace("startup-placement-error", error=str(exc))
    state = _seed_state(conn)
    _trace("sync-start", root=str(leeway_root), seeded=len(state))
    polls = 0
    while True:
        try:
            # self-healing sweep: place fs nodes whose parents became addressed
            polls += 1
            if polls % 60 == 0:
                try:
                    _startup_placement(conn)
                except Exception as exc:  # noqa: BLE001
                    _trace("sweep-placement-error", error=str(exc))
            snap = _scan(leeway_root)
            evts = []
            for p, e in snap.items():
                prev = state.get(p)
                if prev is None:
                    evts.append(("create", p, e))
                elif _changed(prev, e):
                    evts.append(("modify", p, e))
            for p, e in state.items():
                if p not in snap:
                    evts.append(("delete", p, e))
            if evts:
                conn.execute("BEGIN IMMEDIATE")
                try:
                    process_batch(conn, evts, leeway_root)
                    conn.commit()
                except Exception as exc:  # noqa: BLE001
                    conn.rollback()
                    _trace("batch-error", error=str(exc), count=len(evts))
            state = snap
            _trace("poll", watched=len(snap), events=len(evts))
        except Exception as exc:  # noqa: BLE001
            _trace("loop-error", error=str(exc))
        if not loop:
            break
        time.sleep(POLL_INTERVAL)
    conn.close()
