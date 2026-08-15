"""Ingest real system data into the brain:

- Archive/receipts + ledgers -> left Memory & Evidence territory
- Archive/preferences + work-ledger -> right Profile / Tasks / History territories
All previewable via /brain/preview since they live under the mounted root.
"""

import json
import os
from pathlib import Path

from . import store

RECEIPT_CAP = 60
LEDGER_CAP = 15
TASK_CAP = 40
PREF_CAP = 25


def _mtime_key(path):
    try:
        return path.stat().st_mtime_ns
    except OSError:
        return 0


def _json(obj):
    return json.dumps(obj, ensure_ascii=False)


def _newest(paths):
    return max((_mtime_key(p) for p in paths), default=0)


def _newest_files(root, want=200, depth=3):
    """Bounded newest-first walk: sorts each level by mtime and stops early,
    so huge Archive trees (44k+ receipts) never stall startup on slow mounts."""
    found = []

    def walk(d, dep):
        if dep < 0 or len(found) >= want:
            return
        try:
            entries = list(d.iterdir())
        except OSError:
            return
        entries.sort(key=_mtime_key, reverse=True)
        for p in entries:
            if len(found) >= want:
                return
            try:
                if p.is_file():
                    if p.suffix == ".json":
                        found.append(p)
                elif p.is_dir():
                    walk(p, dep - 1)
            except OSError:
                continue

    walk(root, depth)
    return found


def ingest(conn, leeway_root_env=None, force=False):
    leeway_root = Path(os.environ.get("LEEWAY_ROOT", leeway_root_env or "."))
    archive = leeway_root / "Archive"
    if not archive.is_dir():
        return {"status": "skipped", "reason": "no Archive dir", "path": str(archive)}

    receipts = _newest_files(archive / "receipts", RECEIPT_CAP, 3) if (archive / "receipts").is_dir() else []
    ledgers = []
    ledger_dir = archive / "ledgers"
    if ledger_dir.is_dir():
        ledgers = _newest_files(ledger_dir, LEDGER_CAP, 3)
    pref_ledger = archive / "ledgers" / "preferences" / "preference-ledger.json"
    if not pref_ledger.is_file():
        pref_ledger = archive / "preferences" / "preference-ledger.json"
    work_ledger = archive / "ledgers" / "work-ledger" / "work-ledger.jsonl"
    sources = receipts + ledgers + ([pref_ledger] if pref_ledger.is_file() else []) + ([work_ledger] if work_ledger.is_file() else [])
    newest = _newest(sources)
    last_scan = store.get_meta(conn, "evidence_last_scan")
    if not force and last_scan and int(last_scan) >= newest:
        return {"status": "fresh", "domain": "evidence+user", "nodes": 0, "edges": 0}

    store.clear_domain(conn, "evidence")
    store.clear_domain(conn, "user-data")
    counts = {"nodes": 0}

    def upsert(node):
        store.upsert_node(conn, node)
        counts["nodes"] += 1

    for receipt in receipts:
        try:
            data = json.loads(receipt.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue
        rid = f"evidence::receipt::{store.path_key(receipt.relative_to(leeway_root))}"
        upsert({
            "id": rid,
            "canonical_id": f"receipt::{receipt.stem}",
            "domain": "evidence",
            "type": "evidence",
            "subtype": "receipt",
            "title": receipt.stem,
            "description": str(data.get("status") or "") + " — " + str(data.get("capability") or data.get("receiptId") or "")[:160],
            "source": "Archive/receipts",
            "source_path": str(receipt),
            "source_anchor": "receipt ledger",
            "tags_json": _json(["evidence", "receipt"]),
            "status": data.get("status"),
            "confidence": 1.0,
            "spatial_json": None,
            "metadata_json": _json({"kind": "receipt", "endedAt": data.get("endedAt")}),
        })
        store.add_provenance(conn, rid, "receipt", str(receipt), "archive evidence")

    for ledger in ledgers:
        lid = f"evidence::ledger::{store.path_key(ledger.relative_to(leeway_root))}"
        try:
            head = ledger.read_text(encoding="utf-8")[:2000]
        except OSError:
            continue
        upsert({
            "id": lid,
            "canonical_id": f"ledger::{ledger.stem}",
            "domain": "evidence",
            "type": "ledger",
            "subtype": "ledger",
            "title": str(ledger.relative_to(leeway_root)).replace("\\", "/"),
            "description": head.replace("\n", " ")[:240],
            "source": "Archive/ledgers",
            "source_path": str(ledger),
            "source_anchor": "evidence ledger",
            "tags_json": _json(["evidence", "ledger"]),
            "status": "active",
            "confidence": 1.0,
            "spatial_json": None,
            "metadata_json": _json({"kind": "ledger"}),
        })
        store.add_provenance(conn, lid, "ledger", str(ledger), "archive ledger")

    if work_ledger.is_file():
        try:
            lines = [ln for ln in work_ledger.read_text(encoding="utf-8").splitlines() if ln.strip()][-TASK_CAP:]
            for i, line in enumerate(lines):
                try:
                    entry = json.loads(line)
                except json.JSONDecodeError:
                    continue
                tid = f"user::task::{entry.get('workId') or f'wl-{i}'}"
                upsert({
                    "id": tid,
                    "canonical_id": tid,
                    "domain": "user-data",
                    "type": "task",
                    "subtype": entry.get("workType") or "work",
                    "title": entry.get("workScope") or entry.get("workId") or "task",
                    "description": (entry.get("workType") or "") + " · " + (entry.get("status") or ""),
                    "source": "work-ledger",
                    "source_path": str(work_ledger),
                    "source_anchor": "work-ledger.jsonl",
                    "tags_json": _json(["task", entry.get("workType") or ""]),
                    "status": entry.get("status"),
                    "confidence": 1.0,
                    "spatial_json": None,
                    "metadata_json": _json({"workId": entry.get("workId"), "completedAt": entry.get("completedAt")}),
                })
                store.add_provenance(conn, tid, "work-ledger", str(work_ledger), entry.get("workId") or "")
            hid = "user::history::work-ledger"
            upsert({
                "id": hid,
                "canonical_id": "history::work-ledger",
                "domain": "user-data",
                "type": "history",
                "subtype": "ledger",
                "title": "Work Ledger (history)",
                "description": f"{len(lines)} most recent work entries across the LeeWay ecosystem",
                "source": "work-ledger",
                "source_path": str(work_ledger),
                "source_anchor": "work-ledger.jsonl",
                "tags_json": _json(["history", "ledger"]),
                "status": "active",
                "confidence": 1.0,
                "spatial_json": None,
                "metadata_json": _json({"entries": len(lines)}),
            })
            store.add_provenance(conn, hid, "work-ledger", str(work_ledger), "history rollup")
        except OSError:
            pass

    if pref_ledger.is_file():
        try:
            prefs = json.loads(pref_ledger.read_text(encoding="utf-8"))
            entries = prefs.get("entries") or prefs.get("preferences") or (prefs if isinstance(prefs, list) else [])
            entries = entries[:PREF_CAP] if isinstance(entries, list) else []
            for i, entry in enumerate(entries):
                if not isinstance(entry, dict):
                    continue
                pid = f"user::preference::{entry.get('preferenceId') or f'pref-{i}'}"
                upsert({
                    "id": pid,
                    "canonical_id": pid,
                    "domain": "user-data",
                    "type": "preference",
                    "subtype": entry.get("category") or "preference",
                    "title": entry.get("key") or entry.get("preferenceId") or "preference",
                    "description": str(entry.get("value") or "")[:200],
                    "source": "preference-ledger",
                    "source_path": str(pref_ledger),
                    "source_anchor": "preference-ledger.json",
                    "tags_json": _json(["preference", entry.get("category") or ""]),
                    "status": "active",
                    "confidence": 1.0,
                    "spatial_json": None,
                    "metadata_json": _json({"setAt": entry.get("setAt"), "setBy": entry.get("setBy")}),
                })
                store.add_provenance(conn, pid, "preference-ledger", str(pref_ledger), "user preference")
        except (OSError, json.JSONDecodeError):
            pass

    conn.commit()
    store.set_meta(conn, "evidence_last_scan", str(newest))
    conn.commit()
    return {"status": "ingested", "domain": "evidence+user", "nodes": counts["nodes"]}
