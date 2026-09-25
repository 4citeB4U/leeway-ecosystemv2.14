import asyncio
import hashlib
import hmac
import json
import os
import threading
from pathlib import Path

from fastapi import FastAPI, Query, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles

from . import (
    adaptive_body,
    context_projection,
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


@app.post("/brain/integrations/workstation/events", status_code=201)
async def ingest_workstation_event(payload: dict, request: Request, response: Response):
    """Governed, idempotent ingestion for Agent Workstation trace events.

    This route is intentionally separate from filesystem live-sync: a partial
    projection must never be treated as the complete LeeWay root. Private
    workspace content is rejected; only its hash and trace metadata may enter
    Digital Brain. Shared blackboard content is bounded and may be indexed.
    """
    configured_token = os.environ.get("BRAIN_INGEST_TOKEN", "")
    if not configured_token:
        try:
            configured_token = Path(
                os.environ.get("BRAIN_INGEST_TOKEN_FILE", "/run/secrets/brain_ingest_token")
            ).read_text(encoding="utf-8").strip()
        except OSError:
            configured_token = ""
    supplied_token = request.headers.get("x-leeway-brain-token", "")
    if not configured_token or not hmac.compare_digest(configured_token, supplied_token):
        response.status_code = 403
        return {"status": "BRAIN_INGEST_NOT_AUTHORIZED"}

    event_id = str(payload.get("eventId") or "")
    correlation_id = str(payload.get("correlationId") or "")
    agent_id = str(payload.get("agentId") or "")
    key = str(payload.get("key") or "")
    scope = str(payload.get("scope") or "")
    operation = str(payload.get("operation") or "")
    authority_route = str(payload.get("authorityRoute") or "")
    value = payload.get("value")
    value_hash = payload.get("valueSha256")
    if not event_id.startswith("workstation-") or len(event_id) > 160:
        response.status_code = 400
        return {"status": "INVALID_EVENT_ID"}
    if not correlation_id or len(correlation_id) > 80:
        response.status_code = 400
        return {"status": "INVALID_CORRELATION_ID"}
    if not agent_id or len(agent_id) > 80 or not key or len(key) > 256:
        response.status_code = 400
        return {"status": "INVALID_AGENT_OR_KEY"}
    if scope not in ("private", "shared") or operation not in ("set", "remove"):
        response.status_code = 400
        return {"status": "INVALID_EVENT_SCOPE_OR_OPERATION"}
    if authority_route != "runtime-fabric":
        response.status_code = 403
        return {"status": "RUNTIME_FABRIC_AUTHORITY_REQUIRED"}
    if scope == "private" and value is not None:
        response.status_code = 400
        return {"status": "PRIVATE_CONTENT_REJECTED"}
    if value is not None and len(str(value).encode("utf-8")) > 65536:
        response.status_code = 413
        return {"status": "SHARED_CONTENT_TOO_LARGE"}

    canonical = {
        "eventId": event_id,
        "correlationId": correlation_id,
        "capturedAt": str(payload.get("capturedAt") or store.time_stamp()),
        "agentId": agent_id,
        "operation": operation,
        "key": key,
        "scope": scope,
        "valueSha256": value_hash,
        "valueBytes": int(payload.get("valueBytes") or 0),
        "value": str(value) if scope == "shared" and value is not None else None,
        "projection": "leeway.agent.primary-workstation",
        "authorityRoute": "runtime-fabric",
    }
    event_hash = hashlib.sha256(
        json.dumps(canonical, ensure_ascii=False, sort_keys=True).encode("utf-8")
    ).hexdigest()
    node_id = f"workspace-event::{event_id}"
    conn = _conn()
    try:
        existing = store.get_node(conn, node_id)
        if existing:
            try:
                prior = json.loads(existing["metadata_json"] or "{}")
            except (json.JSONDecodeError, TypeError):
                prior = {}
            if prior.get("eventSha256") != event_hash:
                response.status_code = 409
                return {"status": "EVENT_ID_CONFLICT", "nodeId": node_id}
            response.status_code = 200
            return {"status": "ALREADY_INGESTED", "nodeId": node_id, "eventSha256": event_hash}

        description = (
            str(value)[:500] if scope == "shared" and value is not None
            else f"Private workspace mutation; content withheld; sha256={value_hash or 'none'}"
        )
        node = {
            "id": node_id,
            "canonical_id": node_id,
            "domain": "workspace",
            "type": "agent-event",
            "subtype": scope,
            "title": f"{agent_id}: {key}",
            "description": description,
            "source": "agent-workstation",
            "source_path": f"leeway-workstation://agent/{agent_id}/event/{event_id}",
            "source_anchor": "system::digital-brain",
            "tags_json": json.dumps(["agent-workstation", agent_id, scope, operation, "live"], ensure_ascii=False),
            "status": "active",
            "confidence": 1.0,
            "metadata_json": json.dumps({**canonical, "eventSha256": event_hash}, ensure_ascii=False),
            "created_at": canonical["capturedAt"],
            "source_kind": "governed-workstation-event",
        }
        store.upsert_node(conn, node)
        store.add_provenance(
            conn, node_id, "workstation-event", canonical["authorityRoute"],
            json.dumps({"correlationId": correlation_id, "eventSha256": event_hash, "scope": scope}, ensure_ascii=False),
        )
        conn.commit()
        row = store.get_node(conn, node_id)
        live_sync.publish({"op": "create", "node": live_sync.node_payload(row), "links": []})
        return {
            "status": "INGESTED",
            "nodeId": node_id,
            "eventId": event_id,
            "correlationId": correlation_id,
            "eventSha256": event_hash,
            "privateContentStored": False if scope == "private" else None,
        }
    finally:
        conn.close()


# =====================================================================
# LEEWAY_WD_STORAGE_EVENT_IDENTITY_ADAPTER_V2
# Runtime-compatible storage ingress.
# Identity law: HemisphereID == canonical Brain NodeID.
# =====================================================================

def _leeway_storage_upsert_edge_v2(conn, parent_id, child_id, captured_at, transaction_id):
    import hashlib as _hashlib
    import inspect as _inspect
    import json as _json
    import re as _re

    edge_id = _hashlib.sha256(
        ("leeway-storage-edge-v2|" + str(parent_id) + "|" + str(child_id)).encode("utf-8")
    ).hexdigest()

    metadata_obj = {
        "authority": "leeway-storage-twin",
        "transactionId": transaction_id,
        "parent": parent_id,
        "child": child_id,
    }
    metadata = _json.dumps(metadata_obj, ensure_ascii=False)

    edge = {
        "id": edge_id,
        "edge_id": edge_id,
        "source": parent_id,
        "source_id": parent_id,
        "from": parent_id,
        "from_id": parent_id,
        "from_node": parent_id,
        "from_node_id": parent_id,
        "src": parent_id,
        "parent": parent_id,
        "parent_id": parent_id,
        "target": child_id,
        "target_id": child_id,
        "to": child_id,
        "to_id": child_id,
        "to_node": child_id,
        "to_node_id": child_id,
        "dst": child_id,
        "child": child_id,
        "child_id": child_id,
        "type": "contains",
        "edge_type": "contains",
        "relation": "contains",
        "kind": "contains",
        "label": "contains",
        "confidence": 1.0,
        "weight": 1.0,
        "metadata": metadata,
        "metadata_json": metadata,
        "details": metadata,
        "created_at": captured_at,
        "updated_at": captured_at,
        "timestamp": captured_at,
    }

    store_error = ""
    fn = getattr(store, "upsert_edge", None)
    if callable(fn):
        try:
            sig = _inspect.signature(fn)
            params = list(sig.parameters.values())
            if len(params) == 2:
                fn(conn, edge)
                return {"mode": "store.upsert_edge", "edgeId": edge_id, "storeError": ""}

            aliases = dict(edge)
            aliases["edge"] = edge
            kwargs = {}
            for p in params[1:]:
                if p.name in aliases:
                    kwargs[p.name] = aliases[p.name]
                elif p.default is _inspect.Parameter.empty:
                    raise RuntimeError("UNSUPPORTED_UPSERT_EDGE_PARAM:" + p.name)
            fn(conn, **kwargs)
            return {"mode": "store.upsert_edge", "edgeId": edge_id, "storeError": ""}
        except Exception as exc:
            store_error = type(exc).__name__ + ":" + str(exc)

    tables = [
        str(r[0]) for r in conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
        ).fetchall()
    ]
    preferred = []
    for name in ("edges", "links", "relations", "node_edges", "brain_edges"):
        if name in tables and name not in preferred:
            preferred.append(name)
    for name in tables:
        low = name.lower()
        if ("edge" in low or "link" in low or "relation" in low) and name not in preferred:
            preferred.append(name)

    source_aliases = ("source_id", "source", "parent_id", "parent", "from_id", "from_node_id", "src_id", "src")
    target_aliases = ("target_id", "target", "child_id", "child", "to_id", "to_node_id", "dst_id", "dst")
    id_aliases = ("edge_id", "id")
    type_aliases = ("edge_type", "relation_type", "type", "relation", "kind", "label")
    meta_aliases = ("metadata_json", "metadata", "details")
    created_aliases = ("created_at", "created_utc", "timestamp", "at_utc")
    updated_aliases = ("updated_at", "updated_utc")

    def _pick(names, aliases):
        for a in aliases:
            if a in names:
                return a
        return None

    errors = []
    for table in preferred:
        if not _re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", table):
            continue
        try:
            qtable = table.replace('"', '""')
            info = conn.execute('PRAGMA table_info("' + qtable + '")').fetchall()
            if not info:
                continue
            names = [str(r[1]).lower() for r in info]
            original = {str(r[1]).lower(): str(r[1]) for r in info}
            src = _pick(names, source_aliases)
            dst = _pick(names, target_aliases)
            if not src or not dst:
                continue

            values = {
                src: parent_id,
                dst: child_id,
            }
            eid = _pick(names, id_aliases)
            etype = _pick(names, type_aliases)
            emeta = _pick(names, meta_aliases)
            ecreated = _pick(names, created_aliases)
            eupdated = _pick(names, updated_aliases)
            if eid:
                row = next(r for r in info if str(r[1]).lower() == eid)
                declared = str(row[2] or "").upper()
                is_pk = bool(row[5])
                if not (is_pk and "INT" in declared):
                    values[eid] = edge_id
            if etype:
                values[etype] = "contains"
            if emeta:
                values[emeta] = metadata
            if ecreated:
                values[ecreated] = captured_at
            if eupdated:
                values[eupdated] = captured_at
            for alias in ("confidence", "weight"):
                if alias in names:
                    values[alias] = 1.0

            incompatible = False
            for r in info:
                n = str(r[1]).lower()
                declared = str(r[2] or "").upper()
                notnull = bool(r[3])
                default = r[4]
                pk = bool(r[5])
                if n in values:
                    continue
                if pk and "INT" in declared:
                    continue
                if notnull and default is None:
                    incompatible = True
                    break
            if incompatible:
                continue

            cols = list(values.keys())
            quoted = ['"' + original[c].replace('"', '""') + '"' for c in cols]
            placeholders = ",".join(["?"] * len(cols))
            sql = 'INSERT OR IGNORE INTO "' + qtable + '" (' + ",".join(quoted) + ') VALUES (' + placeholders + ')'
            conn.execute(sql, [values[c] for c in cols])

            qsrc = '"' + original[src].replace('"', '""') + '"'
            qdst = '"' + original[dst].replace('"', '""') + '"'
            exists = conn.execute(
                'SELECT 1 FROM "' + qtable + '" WHERE ' + qsrc + '=? AND ' + qdst + '=? LIMIT 1',
                (parent_id, child_id),
            ).fetchone()
            if exists:
                return {
                    "mode": "sqlite:" + table,
                    "edgeId": edge_id,
                    "storeError": store_error,
                }
        except Exception as exc:
            errors.append(table + ":" + type(exc).__name__ + ":" + str(exc))

    raise RuntimeError(
        "LEEWAY_STORAGE_EDGE_PERSIST_FAIL|store=" + store_error + "|tables=" + ";".join(errors[:8])
    )


def _leeway_storage_provenance_v2(conn, node_id, transaction_id, object_id, logical_path, event_hash, root_id):
    import inspect as _inspect
    import json as _json
    fn = getattr(store, "add_provenance", None)
    if not callable(fn):
        return "NOT_AVAILABLE"
    details = _json.dumps(
        {
            "TransactionID": transaction_id,
            "ObjectID": object_id,
            "LogicalPath": logical_path,
            "eventSha256": event_hash,
            "parent": root_id,
        },
        ensure_ascii=False,
    )
    try:
        sig = _inspect.signature(fn)
        params = list(sig.parameters.values())
        if len(params) == 5:
            fn(conn, node_id, "wd-storage-event", "leeway-storage-twin", details)
            return "STORE_POSITIONAL"
        aliases = {
            "node_id": node_id,
            "node": node_id,
            "id": node_id,
            "source_kind": "wd-storage-event",
            "kind": "wd-storage-event",
            "source": "leeway-storage-twin",
            "source_id": "leeway-storage-twin",
            "details": details,
            "metadata": details,
            "metadata_json": details,
        }
        kwargs = {}
        for p in params[1:]:
            if p.name in aliases:
                kwargs[p.name] = aliases[p.name]
            elif p.default is _inspect.Parameter.empty:
                return "SKIPPED_UNSUPPORTED_PARAM:" + p.name
        fn(conn, **kwargs)
        return "STORE_KWARGS"
    except Exception as exc:
        return "SKIPPED_ERROR:" + type(exc).__name__ + ":" + str(exc)



# ============================================================================
# LEEWAY_WD_SYNC_EVENTS_FALLBACK_V5
#
# Durable event persistence for the canonical WD storage ingress.
# The public live_sync.publish call remains the live SSE publication path.
# ============================================================================

def _leeway_storage_sync_fallback_v5(
    conn,
    sync_count_before,
    event_hash,
    node_id,
    canonical,
):
    import json as _leeway_json_v5

    sync_count_after = conn.execute(
        "SELECT COUNT(*) FROM sync_events"
    ).fetchone()[0]

    if sync_count_after != sync_count_before:
        return False

    sync_detail = {
        "op": "create",
        "nodeId": node_id,
        "leewayStorage": canonical,
    }

    sync_path = canonical.get("LogicalPath") or ""
    sync_hash = canonical.get("ObjectID") or ""
    sync_parent = canonical.get("RootID") or ""

    sync_at = (
        canonical.get("AtUtc")
        or canonical.get("capturedAt")
        or canonical.get("atUtc")
        or ""
    )

    conn.execute(
        "INSERT INTO sync_events "
        "(event_id, op, node_id, prev_node_id, path, prev_path, "
        "hash, prev_hash, size, mtime_ns, parent_id, prev_parent_id, "
        "b64_path, prev_b64_path, detail_json, captured_at) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (
            "wd-storage::" + event_hash,
            "create",
            node_id,
            None,
            sync_path,
            None,
            sync_hash,
            None,
            None,
            None,
            sync_parent,
            None,
            None,
            None,
            _leeway_json_v5.dumps(
                sync_detail,
                ensure_ascii=False,
            ),
            sync_at,
        ),
    )

    conn.commit()
    return True

@app.post("/brain/integrations/storage/events", status_code=201)
async def ingest_leeway_storage_event_v2(payload: dict, request: Request, response: Response):
    import hashlib as _hashlib
    import hmac as _hmac
    import json as _json
    import os as _os
    import re as _re
    from pathlib import Path as _Path

    configured_token = _os.environ.get("BRAIN_INGEST_TOKEN", "")
    if not configured_token:
        try:
            configured_token = _Path(
                _os.environ.get("BRAIN_INGEST_TOKEN_FILE", "/run/secrets/brain_ingest_token")
            ).read_text(encoding="utf-8").strip()
        except OSError:
            configured_token = ""
    supplied_token = request.headers.get("x-leeway-brain-token", "")
    if not configured_token or not _hmac.compare_digest(configured_token, supplied_token):
        response.status_code = 403
        return {"status": "BRAIN_INGEST_NOT_AUTHORIZED"}

    event_name = str(payload.get("Event") or "")
    transaction_id = str(payload.get("TransactionID") or "")
    hemisphere_id = str(payload.get("HemisphereID") or "").upper()
    object_id = str(payload.get("ObjectID") or "").upper()
    logical_path = str(payload.get("LogicalPath") or "")
    captured_at = str(payload.get("AtUtc") or store.time_stamp())
    root_id = str(payload.get("RootID") or "storage::wd::1F0E5W9U")
    expected_root = "storage::wd::1F0E5W9U"

    if event_name != "HEMISPHERE_STORAGE_MIRROR_COMMITTED":
        response.status_code = 400
        return {"status": "UNSUPPORTED_STORAGE_EVENT"}
    if root_id != expected_root:
        response.status_code = 400
        return {"status": "INVALID_STORAGE_ROOT"}
    if not transaction_id or len(transaction_id) > 160:
        response.status_code = 400
        return {"status": "INVALID_TRANSACTION_ID"}
    if not _re.fullmatch(r"[A-F0-9]{64}", hemisphere_id):
        response.status_code = 400
        return {"status": "INVALID_HEMISPHERE_ID"}
    if not _re.fullmatch(r"[A-F0-9]{64}", object_id):
        response.status_code = 400
        return {"status": "INVALID_OBJECT_ID"}
    normalized_parts = logical_path.replace("\\", "/").split("/")
    if (
        not logical_path
        or len(logical_path) > 4096
        or logical_path.startswith(("/", "\\"))
        or _re.match(r"^[A-Za-z]:", logical_path)
        or ".." in normalized_parts
    ):
        response.status_code = 400
        return {"status": "INVALID_LOGICAL_PATH"}

    canonical = {
        "Event": event_name,
        "TransactionID": transaction_id,
        "HemisphereID": hemisphere_id,
        "ObjectID": object_id,
        "LogicalPath": logical_path,
        "AtUtc": captured_at,
        "RootID": root_id,
        "ParentID": root_id,
        "Authority": "leeway-storage-twin",
    }
    event_hash = _hashlib.sha256(
        _json.dumps(canonical, ensure_ascii=False, sort_keys=True).encode("utf-8")
    ).hexdigest()
    node_id = hemisphere_id
    conn = _conn()
    try:
        existing = store.get_node(conn, node_id)
        if existing:
            try:
                prior = _json.loads(existing["metadata_json"] or "{}")
            except (_json.JSONDecodeError, TypeError):
                prior = {}
            same_identity = (
                str(prior.get("ObjectID") or prior.get("objectId") or "").upper() == object_id
                and str(prior.get("LogicalPath") or prior.get("logicalPath") or "") == logical_path
            )
            if same_identity:
                response.status_code = 200
                return {
                    "status": "ALREADY_INGESTED",
                    "nodeId": node_id,
                    "transactionId": transaction_id,
                    "eventSha256": event_hash,
                }
            response.status_code = 409
            return {"status": "HEMISPHERE_ID_CONFLICT", "nodeId": node_id}

        title = logical_path.replace("\\", "/").rstrip("/").split("/")[-1]
        metadata = {
            **canonical,
            "eventSha256": event_hash,
            "parent": root_id,
            "parent_id": root_id,
        }
        node = {
            "id": node_id,
            "canonical_id": node_id,
            "domain": "data-fabric",
            "type": "storage-hemisphere",
            "subtype": "reconstruction-object",
            "title": title or node_id,
            "description": "LeeWay WD storage hemisphere; ObjectID=" + object_id,
            "source": "leeway-storage-twin",
            "source_path": "leeway-storage://wd/1F0E5W9U/" + logical_path.replace("\\", "/"),
            "source_anchor": root_id,
            "tags_json": _json.dumps(["leeway", "storage", "wd", "hemisphere", "reconstruction", "live"], ensure_ascii=False),
            "status": "active",
            "confidence": 1.0,
            "metadata_json": _json.dumps(metadata, ensure_ascii=False),
            "created_at": captured_at,
            "source_kind": "governed-wd-storage-event",
        }

        store.upsert_node(conn, node)
        edge_result = _leeway_storage_upsert_edge_v2(
            conn, root_id, node_id, captured_at, transaction_id
        )
        provenance_mode = _leeway_storage_provenance_v2(
            conn, node_id, transaction_id, object_id, logical_path, event_hash, root_id
        )
        conn.commit()
        row = store.get_node(conn, node_id)
        if row is None:
            raise RuntimeError("LEEWAY_STORAGE_NODE_NOT_FOUND_AFTER_COMMIT")

        link = {
            "source": root_id,
            "source_id": root_id,
            "parent": root_id,
            "parent_id": root_id,
            "target": node_id,
            "target_id": node_id,
            "child": node_id,
            "child_id": node_id,
            "type": "contains",
            "relation": "contains",
        }
        _leeway_sync_count_before = conn.execute("SELECT COUNT(*) FROM sync_events").fetchone()[0]

        live_sync.publish(
            {
                "op": "create",
                "node": live_sync.node_payload(row),
                "links": [link],
                "leewayStorage": canonical,
            }
        )

        _leeway_storage_sync_fallback_v5(
            conn,
            _leeway_sync_count_before,
            event_hash,
            node_id,
            canonical,
        )
        return {
            "status": "INGESTED",
            "nodeId": node_id,
            "hemisphereId": hemisphere_id,
            "objectId": object_id,
            "logicalPath": logical_path,
            "parentId": root_id,
            "transactionId": transaction_id,
            "eventSha256": event_hash,
            "edgeMode": edge_result.get("mode"),
            "provenanceMode": provenance_mode,
        }
    except Exception as exc:
        try:
            conn.rollback()
        except Exception:
            pass
        response.status_code = 500
        return {
            "status": "STORAGE_INGEST_INTERNAL_ERROR",
            "errorType": type(exc).__name__,
            "error": str(exc)[:1500],
            "nodeId": node_id,
            "transactionId": transaction_id,
        }
    finally:
        conn.close()

# =====================================================================
# END LEEWAY_WD_STORAGE_EVENT_IDENTITY_ADAPTER_V2
# =====================================================================

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
    storage = storage_diagnostic()
    return {
        "status": storage["status"],
        "uiAuthority": "/brain/static/brain.html",
        "graph": "/brain/graph.json",
        "events": "/brain/events",
        "context": "/brain/context",
        "storage": "/brain/storage/diagnostic",
        "note": storage["note"],
    }


@app.get("/brain/storage/diagnostic")
def storage_diagnostic():
    """Report the physical WD scope separately from the bounded graph projection."""
    inventory_dir = Path(os.environ.get("LEEWAY_INVENTORY_DIR", "/leeway-inventory"))
    summary_path = inventory_dir / "D-Drive-Inventory-20260910-114937" / "summary.json"
    if not summary_path.is_file():
        candidates = sorted(inventory_dir.glob("*/summary.json"))
        summary_path = candidates[-1] if candidates else summary_path

    summary = {}
    if summary_path.is_file():
        try:
            summary = json.loads(summary_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            summary = {}

    wd8 = Path(os.environ.get("WD8_MOUNT", "/wd8"))
    root = Path(os.environ.get("LEEWAY_ROOT", "/leeway-root"))
    scanned_root = str(summary.get("scanned_root", ""))
    full_drive_inventory = scanned_root.upper() in {"D:\\", "D:/"}
    try:
        wd8_is_root = wd8.is_dir() and any(p.name == "System Volume Information" for p in wd8.iterdir())
    except OSError:
        wd8_is_root = False
    inventory_errors = int(summary.get("errors") or 0)
    coverage = "FULL_D_DRIVE_INVENTORY" if full_drive_inventory else "UNKNOWN"
    if full_drive_inventory and inventory_errors:
        coverage = "FULL_D_DRIVE_INVENTORY_WITH_ERRORS"
    status = "PASS" if full_drive_inventory and wd8_is_root and inventory_errors == 0 else "BLOCKED"
    return {
        "status": status,
        "coverage": coverage,
        "note": "The graph is a bounded projection; full-drive counts come only from the read-only D: inventory.",
        "physical_source": scanned_root or "UNAVAILABLE",
        "container_mount": str(wd8),
        "lee_way_root": str(root),
        "mount_represents_drive_root": wd8_is_root,
        "inventory": {
            "directories": summary.get("directory_count"),
            "files": summary.get("file_count"),
            "file_bytes": summary.get("total_file_bytes"),
            "drive_size_bytes": summary.get("drive_size_bytes"),
            "drive_free_bytes": summary.get("drive_free_bytes"),
            "errors": summary.get("errors"),
            "finished": summary.get("finished"),
            "source": str(summary_path),
        },
        "graph_projection": {
            "bounded": True,
            "source": str(root),
            "warning": "Do not interpret graph node totals as total D: file or directory counts.",
        },
    }


@app.get("/brain/context")
def brain_context(scope: str | None = None):
    return context_projection.build(scope=scope)


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