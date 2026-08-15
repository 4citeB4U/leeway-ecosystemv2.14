import asyncio
import json
import os
import threading
from pathlib import Path

from fastapi import FastAPI, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles

from . import (
    adaptive_body,
    b64_cortex,
    ecosystem_analytics,
    hardware_learning,
    hardware_sync,
    harness_engine,
    ingest_ecosystem,
    ingest_evidence,
    ingest_obsidian,
    ingest_runtime,
    learning_cortex,
    learning_fabric,
    live_sync,
    lw_b1,
    pcie_intelligence,
    recursive_cortex,
    store,
    taxonomy,
)

ROOT = Path(__file__).resolve().parent
STATIC = ROOT / "static"

app = FastAPI(title="LeeWay Digital Brain", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
app.mount("/brain/static", StaticFiles(directory=str(STATIC)), name="static")


@app.on_event("startup")
def _startup():
    conn = store.connect()
    force = os.environ.get("BRAIN_FORCE_RESCAN", "") == "1"
    ingest_ecosystem.ingest(conn, force=force)
    ingest_obsidian.ingest(conn, force=force)
    ingest_evidence.ingest(conn, force=force)
    ingest_runtime.ingest(conn, force=force)
    recursive_cortex.backfill_parentage(conn)
    try:
        learning_fabric.ensure_tables(conn)
        conn.commit()
        if not store.get_meta(conn, "learning_experiences_loaded") or force:
            corpus = "/leeway-root/Archive/learning/experiences/experiences.jsonl"
            if os.path.isfile(corpus):
                res = learning_fabric.load_corpus(conn, corpus)
                admitted = conn.execute(
                    "SELECT COUNT(*) AS n FROM experiences WHERE learning_eligibility LIKE 'admitted%'"
                ).fetchone()["n"]
                for row in conn.execute(
                    "SELECT experience_id FROM experiences WHERE learning_eligibility LIKE 'admitted%'"
                ).fetchall():
                    learning_fabric.extract_features(conn, row["experience_id"])
                store.set_meta(conn, "learning_experiences_loaded", str(res))
                conn.commit()
                print(f"[learning] corpus loaded: {res} admitted_features={admitted}")
    except Exception as exc:  # noqa: BLE001
        print(f"[learning] startup error: {exc}")
    try:
        placed_hw, blocked_hw = hardware_sync.place_hardware_nodes(conn)
        if placed_hw or blocked_hw:
            store.add_provenance(conn, "system::digital-brain", "hardware",
                                 "digital-brain-hardware-lane",
                                 f"hardware lane placement: placed={placed_hw} blocked={blocked_hw}")
            conn.commit()
    except Exception as exc:  # noqa: BLE001
        pass
    conn.close()
    if os.environ.get("BRAIN_LIVE_SYNC", "1") != "0":
        threading.Thread(target=live_sync.run, kwargs={"loop": True}, daemon=True, name="live-sync").start()
    if os.environ.get("BRAIN_HARDWARE_SYNC", "1") != "0":
        threading.Thread(target=hardware_sync.run, kwargs={"loop": True}, daemon=True, name="hardware-sync").start()
    if os.environ.get("BRAIN_HARNESS", "1") != "0":
        harness_engine.start_thread()


@app.get("/brain/events")
async def brain_events(request: Request):
    """Single live-transport: SSE stream of graph deltas (P1-12 / DB-04).
    Clients connect via EventSource; deltas carry op/node/links; the client
    merges them without a page reload or graph rebuild."""

    async def gen():
        try:
            last = int(request.headers.get("last-event-id", "-1"))
        except ValueError:
            last = -1
        yield "retry: 2000\n\n"
        while True:
            for e in live_sync.events_since(last):
                last = e["id"]
                yield f"id: {e['id']}\ndata: {json.dumps(e, ensure_ascii=False)}\n\n"
            await asyncio.sleep(0.4)

    return StreamingResponse(
        gen(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.get("/brain/hardware")
def brain_hardware():
    """P3-19: latest hardware/device snapshot + bounded history + alerts."""
    conn = _conn()
    try:
        hardware_sync.ensure_tables(conn)
        snap = hardware_sync.latest()
        history = [
            {k: row[k] for k in ("captured_at", "cpu_usage_pct", "mem_pct", "disk_brain_pct", "disk_root_pct")}
            for row in conn.execute(
                "SELECT captured_at, cpu_usage_pct, mem_pct, disk_brain_pct, disk_root_pct"
                " FROM hardware_stats ORDER BY id DESC LIMIT 12").fetchall()
        ]
        return {"snapshot": snap, "history": history}
    finally:
        conn.close()


@app.get("/brain/hardware/alerts")
def brain_hardware_alerts():
    """P3-22: active alerts from the latest snapshot."""
    snap = hardware_sync.latest() or {}
    return {"alerts": snap.get("alerts") or [], "captured_at": snap.get("captured_at")}


def _conn():
    conn = store.connect()
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def _fabric_formula_block():
    """Live fabric formula block; BLOCKED on any failure (fail-closed)."""
    try:
        return lw_b1._fabric_formula_health(lw_b1.FABRIC_DEFAULT)
    except Exception as e:
        return {"status": "LEEWAY_FORMULA_V1_BLOCKED", "reason": str(e)}


@app.get("/")
def index():
    return FileResponse(STATIC / "brain.html")


@app.get("/brain/diagnostic")
def diagnostic():
    return FileResponse(STATIC / "graph.html")


@app.get("/brain/health")
def health():
    conn = _conn()
    try:
        node_count = conn.execute("SELECT COUNT(*) FROM nodes").fetchone()[0]
        edge_count = conn.execute("SELECT COUNT(*) FROM edges").fetchone()[0]
        return {
            "status": "PASS",
            "service": "digital-brain",
            "version": "0.1.0",
            "nodes": node_count,
            "edges": edge_count,
            "dataDir": store.BRAIN_DATA_DIR.as_posix(),
            "leewayRoot": os.environ.get("LEEWAY_ROOT", "."),
            "vault": os.environ.get("OBSIDIAN_VAULT", ""),
            "ollama": os.environ.get("OLLAMA_BASE_URL", ""),
            "llmModel": os.environ.get("BRAIN_LLM_MODEL", ""),
            "embeddingModel": os.environ.get("BRAIN_EMBEDDING_MODEL", ""),
            "pathAgnostic": True,
            "modelAgnostic": True,
            "llmEnabled": bool(os.environ.get("BRAIN_LLM_MODEL")),
            "embeddingEnabled": bool(os.environ.get("BRAIN_EMBEDDING_MODEL")),
        }
    finally:
        conn.close()


@app.get("/brain/stats")
def stats():
    conn = _conn()
    rows = conn.execute(
        "SELECT domain, type, COUNT(*) AS count FROM nodes GROUP BY domain, type ORDER BY domain, type"
    ).fetchall()
    conn.close()
    return {"entries": [dict(r) for r in rows]}


@app.get("/brain/ecosystem")
def ecosystem():
    conn = _conn()
    rows = conn.execute("SELECT domain, COUNT(*) AS count FROM nodes GROUP BY domain").fetchall()
    conn.close()
    return {"domains": {r["domain"]: r["count"] for r in rows}}


@app.get("/brain/node/{node_id}")
def node(node_id: str):
    conn = _conn()
    row = conn.execute(
        "SELECT * FROM nodes WHERE id = ? OR canonical_id = ?", (node_id, node_id)
    ).fetchone()
    if not row:
        conn.close()
        return {"error": "not found"}
    data = dict(row)
    for field in ("tags_json", "metadata_json", "spatial_json"):
        if data.get(field):
            try:
                data[field] = json.loads(data[field])
            except json.JSONDecodeError:
                pass
    prov = conn.execute(
        "SELECT kind, source, detail, captured_at FROM provenance WHERE node_id = ? ORDER BY id", (row["id"],)
    ).fetchall()
    conn.close()
    data["provenance"] = [dict(p) for p in prov]
    return data


@app.get("/brain/neighbors/{node_id}")
def neighbors(node_id: str):
    conn = _conn()
    edges = conn.execute(
        "SELECT e.*, sn.title AS source_title, tn.title AS target_title "
        "FROM edges e "
        "LEFT JOIN nodes sn ON sn.id = e.source_id "
        "LEFT JOIN nodes tn ON tn.id = e.target_id "
        "WHERE e.source_id = ? OR e.target_id = ?",
        (node_id, node_id),
    ).fetchall()
    conn.close()
    return {"edges": [dict(e) for e in edges]}


@app.get("/brain/search")
def search(q: str = Query(..., min_length=1), limit: int = 25):
    conn = _conn()
    like = f"%{q}%"
    rows = conn.execute(
        "SELECT * FROM nodes WHERE title LIKE ? OR description LIKE ? OR id LIKE ? OR tags_json LIKE ? "
        "ORDER BY (CASE WHEN title LIKE ? THEN 0 ELSE 1 END) LIMIT ?",
        (like, like, like, like, like, limit),
    ).fetchall()
    conn.close()
    return {"query": q, "results": [dict(r) for r in rows]}


def _scope_breadcrumb(conn, scope_id):
    breadcrumb = []
    cur = conn.execute("SELECT * FROM nodes WHERE id = ?", (scope_id,)).fetchone()
    while cur:
        breadcrumb.insert(0, {"id": cur["id"], "label": cur["title"], "type": cur["type"], "subtype": cur["subtype"]})
        pid = cur["parent_id"]
        if not pid or not pid.startswith("scope::"):
            break
        cur = conn.execute("SELECT * FROM nodes WHERE id = ?", (pid,)).fetchone()
    return breadcrumb


def _graph_payload(conn, scope_id=None):
    if scope_id:
        rows = conn.execute(
            "SELECT * FROM nodes WHERE id = ? OR parent_id = ?", (scope_id, scope_id)
        ).fetchall()
        breadcrumb = _scope_breadcrumb(conn, scope_id)
        ancestor_ids = [b["id"] for b in breadcrumb]
        if ancestor_ids:
            marks = ",".join("?" * len(ancestor_ids))
            extra = conn.execute(
                f"SELECT * FROM nodes WHERE id IN ({marks})", ancestor_ids
            ).fetchall()
            known = {r["id"] for r in rows}
            rows = rows + [r for r in extra if r["id"] not in known]
    else:
        rows = conn.execute("SELECT * FROM nodes").fetchall()
        breadcrumb = []
    edges = conn.execute("SELECT * FROM edges").fetchall()
    node_ids = {n["id"] for n in rows}
    passports = {p["node_id"]: p for p in store.get_passports(conn)}
    return {
        "directed": True,
        "multigraph": False,
        "graph": {
            "name": "leeway-digital-brain",
            "version": "0.4.0",
            "domains": sorted({n["domain"] for n in rows}),
            "scope_id": scope_id,
            "breadcrumb": breadcrumb,
        },
        "nodes": [
            {
                "id": n["id"],
                "label": n["title"],
                "type": n["type"],
                "subtype": n["subtype"],
                "domain": n["domain"],
                "canonical_id": n["canonical_id"],
                "source_path": n["source_path"],
                "status": n["status"],
                "pagerank": None,
                "parent_id": n["parent_id"],
                "depth": n["depth"],
                "expandable": bool(n["expandable"]),
                "child_count": n["child_count"],
                "child_provider": n["child_provider"],
                "brain_address": _brain_address(n),
                "formula_state": _formula_state(passports.get(n["id"])),
                **taxonomy_meta(n),
            }
            for n in rows
        ],
        "links": [
            {
                "source": e["source_id"],
                "target": e["target_id"],
                "predicate": e["predicate"],
                "provenance_kind": e["provenance_kind"],
                "kind": "route" if e["predicate"] == "ROUTES_VIA" else "semantic",
            }
            for e in edges
            if e["source_id"] in node_ids and e["target_id"] in node_ids
        ],
    }


def _brain_address(n):
    if not n["b64_path"]:
        return None
    return {
        "path": n["b64_path"],
        "spatial_index": n["spatial_index"],
        "binary_path": n["binary_path"],
    }


def _formula_state(p):
    if not p:
        return None
    top6 = []
    b64_top6 = []
    try:
        top6 = json.loads(p["top6_json"]) if p["top6_json"] else []
        b64_top6 = json.loads(p["base64_top6_json"]) if p["base64_top6_json"] else []
    except (json.JSONDecodeError, TypeError):
        pass
    return {
        "status": p["status"],
        "formula_id": p["formula_id"],
        "top6": top6,
        "base64_top6": b64_top6,
        "selected_index": p["selected_index"],
        "selected_b64": p["selected_b64"],
        "evaluated_at": p["evaluated_at"],
        "kernel_status": p["kernel_status"],
        "policy": p["policy"],
    }


def _hemi_code(h):
    """Normalize hemisphere to client contract 'L'/'R' (accepts left/right/other)."""
    h = (h or "").strip().lower()
    return "L" if h in ("left", "l") else "R"


def taxonomy_meta(n):
    try:
        spatial = json.loads(n["spatial_json"]) if n["spatial_json"] else {}
    except (json.JSONDecodeError, TypeError):
        spatial = {}
    if spatial.get("region"):
        return {
            "hemisphere": _hemi_code(spatial.get("hemisphere")),
            "region": spatial.get("region"),
            "cluster": spatial.get("cluster"),
            "region_label": taxonomy.region_label(spatial.get("region")),
        }
    hemisphere, region, cluster = taxonomy.assign(dict(n))
    return {
        "hemisphere": _hemi_code(hemisphere),
        "region": region,
        "cluster": cluster,
        "region_label": taxonomy.region_label(region),
    }


@app.get("/brain/graph.json")
def graph_json(scope: str = ""):
    conn = _conn()
    payload = _graph_payload(conn, scope or None)
    conn.close()
    return payload


@app.get("/brain/regions")
def regions():
    conn = _conn()
    rows = conn.execute("SELECT * FROM nodes").fetchall()
    conn.close()
    meta = {}
    for n in rows:
        m = taxonomy_meta(n)
        key = (m["hemisphere"], m["region"], m["cluster"])
        meta.setdefault(key, {"count": 0, "ids": []})
        meta[key]["count"] += 1
        meta[key]["ids"].append(n["id"])
    groups = {}
    for (hemi, region, cluster), info in sorted(meta.items()):
        entry = {
            "hemisphere": hemi,
            "region": region,
            "region_label": taxonomy.region_label(region),
            "cluster": cluster,
            "count": info["count"],
            "ids": info["ids"][:40],
        }
        groups.setdefault((hemi, region), []).append(entry)
    payload = []
    for (hemi, region), clusters in groups.items():
        payload.append({
            "hemisphere": hemi,
            "region": region,
            "region_label": taxonomy.region_label(region),
            "count": sum(c["count"] for c in clusters),
            "clusters": clusters,
        })
    return {"regions": payload}


@app.get("/brain/core")
def core():
    conn = _conn()
    services = conn.execute("SELECT * FROM nodes WHERE domain = 'system' ORDER BY title").fetchall()
    total = conn.execute("SELECT COUNT(*) AS c FROM nodes").fetchone()["c"]
    edges = conn.execute("SELECT COUNT(*) AS c FROM edges").fetchone()["c"]
    by_domain = conn.execute("SELECT domain, COUNT(*) AS c FROM nodes GROUP BY domain").fetchall()
    conn.close()
    return {
        "nexus": {
            "name": "LeeWay Runtime Fabric",
            "controlPath": ["VS Code Chat", "Turbo Adapter 8787", "Router 8080", "Runtime Fabric 4001", "Tools / Devices / Models"],
            "functions": ["discovery", "routing", "memory-context", "permissions", "validation", "events", "evidence", "execution"],
            "governance": "LeeWay Standards is above all; formulas may optimize permitted behavior, never override.",
        },
        "services": [
            {
                "id": s["id"],
                "title": s["title"],
                "status": s["status"],
                "source_path": s["source_path"],
                "metadata": json.loads(s["metadata_json"]) if s["metadata_json"] else {},
            }
            for s in services
        ],
        "stats": {"nodes": total, "edges": edges, "by_domain": {r["domain"]: r["c"] for r in by_domain}},
    }


@app.get("/brain/root")
def brain_root():
    conn = _conn()
    try:
        return recursive_cortex.root_of(conn)
    finally:
        conn.close()


@app.get("/brain/node/{node_id:path}/children")
def node_children(node_id: str):
    conn = _conn()
    try:
        return recursive_cortex.children_of(conn, node_id)
    finally:
        conn.close()


@app.get("/brain/node/{node_id:path}/relationships")
def node_relationships(node_id: str):
    conn = _conn()
    try:
        return recursive_cortex.relationships_of(conn, node_id)
    finally:
        conn.close()


@app.get("/brain/view-position")
def view_positions():
    conn = _conn()
    try:
        rows = store.get_view_positions(conn)
        return {"positions": {r["node_id"]: {"x": r["x"], "y": r["y"], "z": r["z"]} for r in rows}}
    finally:
        conn.close()


@app.post("/brain/view-position")
async def set_view_position(payload: dict):
    node_id = payload.get("id")
    if not node_id:
        return {"ok": False, "error": "id required"}
    conn = _conn()
    try:
        store.set_view_position(conn, node_id, payload.get("x", 0), payload.get("y", 0), payload.get("z", 0))
        conn.commit()
        return {"ok": True, "id": node_id}
    finally:
        conn.close()


@app.get("/brain/formula/status")
def formula_status():
    conn = _conn()
    try:
        b64 = b64_cortex.self_test()
        return {
            "kernel": _fabric_formula_block(),
            "codecSelfTest": b64,
            "passportCount": store.passport_count(conn),
            "b64": store.get_b64_stats(conn),
            "policy": lw_b1.PLACEMENT_POLICY,
            "fabricUrl": lw_b1.FABRIC_DEFAULT,
            "enabled": live_sync.formula_enabled(),
        }
    finally:
        conn.close()


@app.get("/brain/node/{node_id:path}/formula")
def node_formula(node_id: str):
    conn = _conn()
    try:
        row = conn.execute(
            "SELECT id, b64_path, spatial_index, binary_path FROM nodes WHERE id = ? OR canonical_id = ?",
            (node_id, node_id),
        ).fetchone()
        if not row:
            return {"error": "not found"}
        return {
            "node": row["id"],
            "brain_address": _brain_address(row),
            "passport": dict(store.get_passport(conn, row["id"])) if store.get_passport(conn, row["id"]) else None,
        }
    finally:
        conn.close()


@app.post("/brain/formula/refresh")
def formula_refresh(scope: str = None, force: bool = False):
    """Recursive Base64 pin assignment via LW-B1 (fabric kernel).

    Lattice per scope: every scope (region/cluster) gets a pin in its parent
    lattice; every real node gets a pin in its parent scope's lattice.
    Address = <hemi>:<scope-word>...:<own-word> (recursive Base64 path).
    force: re-place already-addressed objects. Fail-closed: BLOCKED if the
    kernel is unavailable (never fabricates).
    """
    if not live_sync.formula_enabled():
        return {"disabled": True, "reason": "FORMULA_DISABLED",
                "placedCount": 0, "blockedCount": 0, "placed": [], "blocked": []}
    conn = _conn()
    try:
        evidence_counts = {}
        for ev in conn.execute("SELECT node_id, COUNT(*) AS n FROM provenance GROUP BY node_id").fetchall():
            evidence_counts[ev["node_id"]] = ev["n"]
        controller = lw_b1.LW_B1(store)
        placed, blocked = [], []

        def sib_features(siblings):
            feats = []
            for s in siblings:
                m = taxonomy_meta(s)
                feats.append({
                    "region_label": m.get("region_label"),
                    "domain": s["domain"],
                    "pagerank": 0.0,
                    "activity": 0.0,
                    "evidence": min(1.0, evidence_counts.get(s["id"], 0) / 10.0),
                    "balance": 0.0,
                    "b64_index": s["spatial_index"],
                })
            return feats

        def upsert_passport_for(node_id, passport, addr):
            store.upsert_passport(conn, {
                "node_id": node_id,
                "formula_id": passport["formulaVersion"],
                "adapter_id": passport["adapterId"],
                "policy": passport["policy"],
                "status": passport["status"],
                "top6_json": json.dumps(passport["top6"]),
                "base64_top6_json": json.dumps(passport["base64Top6"]),
                "selected_index": addr["indices"][-1],
                "selected_b64": addr["words"][-1],
                "selected_bits": addr["bits"][-1],
                "window_hash": passport["windowHash"],
                "input_hash": passport["inputHash"],
                "result_hash": passport["resultHash"],
                "receipt_path": passport["receiptPath"],
                "evaluated_at": passport["evaluatedAt"],
                "kernel_status": passport["kernelStatus"],
                "confidence": passport["confidence"],
                "free_slots": passport["freeSlots"],
                "detail_json": json.dumps({
                    "policy": passport["policy"],
                    "attempts": passport.get("attempts"),
                    "spatialTop6": passport.get("spatialTop6"),
                    "operationalOnly": passport.get("operationalOnly"),
                    "attemptUsed": passport.get("attemptUsed"),
                }),
            })
            placed.append({"id": node_id, "b64": addr["path"],
                           "top6": passport["base64Top6"],
                           "resultHash": passport["resultHash"]})

        def place_into_lattice(item, siblings, region_label, domain, hemi):
            """LW-B1 placement; returns (passport, addr) or (blocked_dict, None)."""
            passport, addr = controller.place(
                dict(item), sib_features(siblings), region_label, domain, hemi)
            if passport.get("status") != "PASS" or not addr:
                return None, {"id": item["id"], "kind": item["type"],
                              "reason": passport.get("reason")}
            return (passport, addr), None

        def finalize(item, parent, passport, addr):
            """Assemble recursive path from parent chain + own word; persist."""
            own_word = addr["words"][0]
            own_index = addr["indices"][0]
            if parent and parent["b64_path"]:
                parent_words = parent["b64_path"].split(":")[1:]
                path = f"{addr['hemi']}:" + ":".join(parent_words) + f":{own_word}"
                binary = ".".join([parent["binary_path"], b64_cortex.to_bits(own_index)])
            else:
                path = f"{addr['hemi']}:{own_word}"
                binary = b64_cortex.to_bits(own_index)
            conn.execute(
                "UPDATE nodes SET b64_path = ?, spatial_index = ?, binary_path = ? WHERE id = ?",
                (path, own_index, binary, item["id"]),
            )
            addr["path"] = path
            upsert_passport_for(item["id"], passport, addr)

        # Level 1+2: scope nodes (region, cluster) -> parent lattice
        if scope:
            scope_rows = conn.execute("SELECT * FROM nodes WHERE id = ?", (scope,)).fetchall()
        else:
            scope_rows = conn.execute(
                "SELECT * FROM nodes WHERE domain = 'scope' AND subtype IN ('region-clusters','cluster-nodes') ORDER BY CASE subtype WHEN 'region-clusters' THEN 0 ELSE 1 END, id"
            ).fetchall()
        for sc in scope_rows:
            if not force and sc["b64_path"]:
                continue
            parent = conn.execute("SELECT * FROM nodes WHERE id = ?", (sc["parent_id"],)).fetchone() if sc["parent_id"] else None
            if sc["subtype"] == "cluster-nodes" and (not parent or not parent["b64_path"]):
                blocked.append({"id": sc["id"], "kind": sc["type"],
                                "reason": "PARENT_UNPLACED"})
                continue
            siblings = conn.execute(
                "SELECT * FROM nodes WHERE parent_id = ? AND id != ?",
                (sc["parent_id"], sc["id"]),
            ).fetchall() if sc["parent_id"] else []
            parts = sc["id"].split("::")
            if sc["subtype"] == "region-clusters":
                region_name = parts[2]
                hemi = "R" if "R" in (sc["tags_json"] or "") else "L"
            else:
                region_name = parts[3]
                hemi = parts[2]
            result, blocked_entry = place_into_lattice(
                sc, siblings, taxonomy.region_label(region_name), sc["domain"], hemi)
            if result:
                passport, addr = result
                finalize(sc, parent, passport, addr)
            else:
                blocked.append(blocked_entry)
            conn.commit()

        # Level 3: real nodes -> parent scope lattice
        if scope:
            rows = conn.execute(
                "SELECT * FROM nodes WHERE parent_id = ? AND domain NOT IN ('scope','fs')",
                (scope,),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM nodes WHERE parent_id IS NOT NULL AND domain NOT IN ('scope','fs')"
            ).fetchall()
        for n in rows:
            if not force and n["b64_path"]:
                continue
            parent = conn.execute("SELECT * FROM nodes WHERE id = ?", (n["parent_id"],)).fetchone()
            if not parent or not parent["b64_path"]:
                blocked.append({"id": n["id"], "kind": n["type"],
                                "reason": "PARENT_UNPLACED"})
                continue
            siblings = conn.execute(
                "SELECT * FROM nodes WHERE parent_id = ? AND id != ?",
                (n["parent_id"], n["id"]),
            ).fetchall()
            meta = taxonomy_meta(n)
            result, blocked_entry = place_into_lattice(
                n, siblings, meta.get("region_label"), n["domain"], parent["b64_path"][0])
            if result:
                passport, addr = result
                finalize(n, parent, passport, addr)
            else:
                blocked.append(blocked_entry)
            conn.commit()
        return {"placed": placed, "blocked": blocked,
                "placedCount": len(placed), "blockedCount": len(blocked),
                "kernelStatus": "LEEWAY_FORMULA_V1_PASS"}
    finally:
        conn.close()


@app.get("/brain/preview/{node_id}")
def preview(node_id: str, max_lines: int = 80):
    conn = _conn()
    row = conn.execute(
        "SELECT id, title, source_path, type FROM nodes WHERE id = ? OR canonical_id = ?", (node_id, node_id)
    ).fetchone()
    conn.close()
    if not row:
        return {"error": "not found"}
    source_path = row["source_path"] or ""
    leeway_root = Path(os.environ.get("LEEWAY_ROOT", "/leeway-root")).resolve()
    candidate = Path(source_path)
    container = recursive_cortex.host_to_container(source_path)
    if container:
        candidate = Path(container)
    elif not candidate.is_absolute():
        candidate = leeway_root / candidate
    if not candidate.is_file():
        vault = os.environ.get("OBSIDIAN_VAULT", "")
        if vault:
            alt = Path(vault) / source_path
            if alt.is_file():
                candidate = alt
    try:
        resolved = candidate.resolve()
        resolved.relative_to(leeway_root)
    except (OSError, ValueError):
        vault = os.environ.get("OBSIDIAN_VAULT", "")
        if vault:
            try:
                resolved = (Path(vault) / source_path).resolve()
                resolved.relative_to(Path(vault).resolve())
            except (OSError, ValueError):
                return {"error": "preview not available", "node": row["id"], "reason": "path outside mounted root"}
        else:
            return {"error": "preview not available", "node": row["id"], "reason": "path outside mounted root"}
    try:
        text = resolved.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return {"error": "preview not available", "node": row["id"], "reason": "unreadable"}
    lines = text.splitlines()
    head = lines[: max(1, min(max_lines, 200))]
    return {
        "node": row["id"],
        "title": row["title"],
        "path": resolved.as_posix(),
        "extension": resolved.suffix,
        "totalLines": len(lines),
        "size": resolved.stat().st_size,
        "truncated": len(lines) > len(head),
        "head": "\n".join(head),
    }


@app.post("/brain/ask")
async def ask(payload: dict):
    question = (payload.get("question") or "").strip()[:2000]
    if not question:
        return {"status": "error", "message": "question required"}

    conn = _conn()
    scored = []
    terms = [t for t in question.lower().split() if len(t) > 2]
    results = conn.execute("SELECT * FROM nodes").fetchall()
    for row in results:
        hay = " ".join([row["title"] or "", row["description"] or "", row["tags_json"] or ""]).lower()
        score = sum(1 for term in terms if term in hay)
        if score:
            scored.append((score, dict(row)))
    scored.sort(key=lambda item: item[0], reverse=True)
    context = [d for _, d in scored[:6]]
    conn.close()

    model = os.environ.get("BRAIN_LLM_MODEL", "").strip()
    if not context:
        return {"status": "no-context", "message": "No brain context found for that question."}

    if not model:
        return {
            "status": "no-model",
            "message": f"Brain context found ({len(context)} nodes) but no LLM model configured. Set BRAIN_LLM_MODEL.",
            "context": [{"id": c["id"], "title": c["title"]} for c in context],
        }

    try:
        import httpx

        async with httpx.AsyncClient(timeout=180) as client:
            resp = await client.post(
                f"{os.environ.get('OLLAMA_BASE_URL', 'http://ollama:11434')}/api/chat",
                json={
                    "model": model,
                    "stream": False,
                    "messages": [
                        {
                            "role": "system",
                            "content": (
                                "You are the LeeWay Digital Brain. Ground every answer only in the graph context "
                                "provided. No invented laws, objects, or capabilities."
                            ),
                        },
                        {
                            "role": "user",
                            "content": f"Context:\n{json.dumps(context, ensure_ascii=False, default=str)}\n\nQuestion: {question}",
                        },
                    ],
                },
            )
            resp.raise_for_status()
            data = resp.json()
            return {"status": "answered", "model": model, "answer": data.get("message", {}).get("content", "")}
    except Exception as exc:  # noqa: BLE001
        return {"status": "error", "message": f"Ollama unreachable: {type(exc).__name__}", "context": [{"id": c["id"], "title": c["title"]} for c in context]}


# ---------------------------------------------------------------- learning
@app.get("/brain/learning/experiences")
def learning_experiences(limit: int = 10, capability: str = None, eligibility: str = None):
    """Experience Fabric overview (P5-3)."""
    conn = _conn()
    try:
        where, args = [], []
        if capability:
            where.append("capability_id = ?"); args.append(capability)
        if eligibility:
            where.append("learning_eligibility = ?"); args.append(eligibility)
        w = (" WHERE " + " AND ".join(where)) if where else ""
        total = conn.execute(f"SELECT COUNT(*) AS n FROM experiences{w}", args).fetchone()["n"]
        admitted = conn.execute(
            "SELECT COUNT(*) AS n FROM experiences WHERE learning_eligibility LIKE 'admitted%'"
        ).fetchone()["n"]
        outcomes = {r["outcome"]: r["n"] for r in conn.execute(
            "SELECT outcome, COUNT(*) AS n FROM experiences GROUP BY outcome ORDER BY n DESC")}
        eligibility_counts = {r["learning_eligibility"]: r["n"] for r in conn.execute(
            "SELECT learning_eligibility, COUNT(*) AS n FROM experiences GROUP BY learning_eligibility ORDER BY n DESC")}
        dup = conn.execute("SELECT COUNT(*) - COUNT(DISTINCT experience_id) AS n FROM experiences").fetchone()["n"]
        top_caps = [dict(r) for r in conn.execute(
            "SELECT capability_id, COUNT(*) AS n FROM experiences GROUP BY capability_id ORDER BY n DESC LIMIT 12")]
        latest = [dict(r) for r in conn.execute(f"SELECT experience_id, capability_id, outcome, learning_eligibility, timestamp FROM experiences{w} ORDER BY inserted_at DESC LIMIT ?", args + [limit])]
        return {"total": total, "admitted": admitted, "duplicates": dup, "outcomes": outcomes,
                "eligibility": eligibility_counts, "topCapabilities": top_caps, "latest": latest}
    finally:
        conn.close()


@app.get("/brain/learning/registry")
def learning_registry(capability: str = None):
    """Learning Registry overview (P5-5)."""
    conn = _conn()
    try:
        where, args = [], []
        if capability:
            where.append("capability = ?"); args.append(capability)
        w = (" WHERE " + " AND ".join(where)) if where else ""
        artifacts = [dict(r) for r in conn.execute(
            f"SELECT learning_id, capability, scope, version, parent_version, algorithm, model_type,"
            f" promotion_status, veritas_status, canary_status, rollback_artifact_id, created_at, last_used"
            f" FROM learning_artifacts{w} ORDER BY created_at DESC LIMIT 50", args)]
        statuses = {r["promotion_status"]: r["n"] for r in conn.execute(
            "SELECT promotion_status, COUNT(*) AS n FROM learning_artifacts GROUP BY promotion_status")}
        return {"artifacts": artifacts, "statusCounts": statuses, "lifecycle": learning_fabric.LIFECYCLE}
    finally:
        conn.close()


@app.post("/brain/learning/registry")
def learning_registry_register(body: dict = None):
    """Register a learned artifact (TRAINING) or advance its lifecycle."""
    conn = _conn()
    try:
        body = body or {}
        if body.get("validate"):
            v = body["validate"]
            return learning_fabric.validate_candidate(
                conn, v["learningId"], v.get("metricName", "regression_accuracy"),
                v.get("metricValue"), v.get("verdict", "reject"))
        if body.get("advance"):
            return learning_fabric.set_lifecycle(conn, body["learningId"], body["advance"], body.get("detail"))
        lid = learning_fabric.register_artifact(
            conn, body.get("capability"), scope=body.get("scope", "WORKSPACE"),
            algorithm=body.get("algorithm", "rule"), model_type=body.get("modelType", "counter"),
            training_experience_ids=body.get("trainingExperienceIds"),
            training_dataset_hash=body.get("trainingDatasetHash"),
            authority=body.get("authority", "LW-LH1"),
        )
        return {"ok": True, "learning_id": lid, "learningId": lid}
    finally:
        conn.close()


@app.get("/brain/learning/scopes")
def learning_scopes_list():
    conn = _conn()
    try:
        scopes = [dict(r) for r in conn.execute("SELECT * FROM learning_scopes ORDER BY scope, capability")]
        return {"scopes": scopes, "allowedLevels": learning_fabric.LEARNING_SCOPES}
    finally:
        conn.close()


@app.get("/brain/learning/features")
def learning_features(limit: int = 1):
    """Feature Fabric (P5-4): current feature schema version + extraction stats."""
    conn = _conn()
    try:
        schema = conn.execute("SELECT * FROM feature_schemas ORDER BY created_at DESC LIMIT 1").fetchone()
        extracted = conn.execute("SELECT COUNT(*) AS n FROM experience_features").fetchone()["n"]
        sample = [dict(r) for r in conn.execute(
            "SELECT experience_id, feature_schema_version, features_json FROM experience_features LIMIT ?", (limit,))]
        return {"featureSchemaVersion": schema["schema_version"] if schema else None,
                "schemaGroups": json.loads(schema["schema_json"])["groups"] if schema else {},
                "featureCount": extracted, "sample": sample}
    finally:
        conn.close()


@app.get("/brain/learning/scheduler")
def learning_scheduler_status():
    """Background learning scheduler gate (P5-8) using live hardware telemetry."""
    conn = _conn()
    try:
        telemetry = conn.execute("SELECT * FROM hardware_stats ORDER BY captured_at DESC LIMIT 1").fetchone()
        decision = learning_fabric.scheduler_tick(conn, dict(telemetry) if telemetry else None)
        return decision
    finally:
        conn.close()


@app.get("/brain/learning/harness")
def learning_harness_status():
    """LW-LH1 native harness (P6): tick counters, canary queue, LLM avoidance."""
    conn = _conn()
    try:
        return harness_engine.status(conn)
    finally:
        conn.close()


@app.post("/brain/learning/harness/tick")
def learning_harness_tick():
    """Force one synchronous harness tick (tests / manual)."""
    conn = _conn()
    try:
        telemetry = conn.execute("SELECT * FROM hardware_stats ORDER BY captured_at DESC LIMIT 1").fetchone()
        return harness_engine.run_tick(conn, dict(telemetry) if telemetry else None)
    finally:
        conn.close()


@app.get("/brain/learning/ecosystem")
def learning_ecosystem():
    """Ecosystem Learning (P7): engagement / retention / error patterns."""
    conn = _conn()
    try:
        return ecosystem_analytics.snapshot(conn)
    finally:
        conn.close()


@app.post("/brain/learning/ecosystem/refresh")
def learning_ecosystem_refresh(days: int = 14):
    conn = _conn()
    try:
        return ecosystem_analytics.refresh(conn, days=max(1, min(days, 90)))
    finally:
        conn.close()


@app.get("/brain/adaptive/state")
def adaptive_state():
    """Agent Lee Adaptive Body (P8): posture + energy budget + recommendations."""
    conn = _conn()
    try:
        return adaptive_body.snapshot(conn)
    finally:
        conn.close()


@app.post("/brain/adaptive/tick")
def adaptive_tick():
    """Recompute adaptive body state from live telemetry."""
    conn = _conn()
    try:
        return adaptive_body.compute(conn)
    finally:
        conn.close()


@app.get("/brain/learning/hardware")
def learning_hardware():
    """Hardware Learning (P9): load patterns + anomaly analytics."""
    conn = _conn()
    try:
        return hardware_learning.snapshot(conn)
    finally:
        conn.close()


@app.post("/brain/learning/hardware/refresh")
def learning_hardware_refresh():
    conn = _conn()
    try:
        return hardware_learning.refresh(conn)
    finally:
        conn.close()


@app.get("/brain/learning/pcie")
def learning_pcie():
    """PCIe Intelligence (P10, LW-H4P): contract + honest UNAVAILABLE path."""
    conn = _conn()
    try:
        return pcie_intelligence.snapshot(conn)
    finally:
        conn.close()


@app.post("/brain/learning/pcie/refresh")
def learning_pcie_refresh():
    conn = _conn()
    try:
        return pcie_intelligence.refresh(conn)
    finally:
        conn.close()


@app.get("/brain/learning/cortex")
def learning_cortex_status():
    """Digital Brain Learning Cortex (P11): read-only aggregate of P5-P10."""
    conn = _conn()
    try:
        return learning_cortex.cortex(conn)
    finally:
        conn.close()


@app.post("/brain/learning/meta")
def learning_meta_set(body: dict = None):
    """Harness-internal meta test helper. Only lw_lh1_* keys are writable;
    every other meta key is refused (no governance bypass)."""
    body = body or {}
    key, value = body.get("key"), body.get("value")
    if not key or not str(key).startswith("lw_lh1_"):
        return {"ok": False, "reason": "only lw_lh1_* keys are writable"}
    conn = _conn()
    try:
        store.set_meta(conn, str(key), str(value))
        conn.commit()
        return {"ok": True, "key": key, "value": value}
    finally:
        conn.close()