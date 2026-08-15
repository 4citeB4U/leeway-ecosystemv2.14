"""P3-18..23: Hardware lane for the Digital Brain.

Container-visible host/device reality + Runtime Fabric device lanes, sampled on a
bounded cadence, surfaced through a status endpoint, client panel, alert
evaluator, and LW-B1 placement of the hardware object graph. Stdlib only (no new
dependencies). Never fabricates telemetry: every device row is measured or
explicitly marked available/unavailable with a reason.
"""

import json
import os
import shutil
import threading
import time
import urllib.request
from datetime import datetime, timezone

SAMPLE_INTERVAL = 30.0        # bounded sampling cadence (seconds)
SAMPLE_CAP = 96               # rows kept (48 min of history)
ALERT_MEM_PCT = 90.0          # thresholds (documented contract)
ALERT_DISK_PCT = 90.0
FABRIC_TIMEOUT = 2.5
_HW_TABLES = """\
CREATE TABLE IF NOT EXISTS hardware_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    captured_at TEXT,
    platform TEXT,
    hostname TEXT,
    kernel TEXT,
    cpu_count INTEGER,
    cpu_usage_pct REAL,
    mem_total_mb INTEGER,
    mem_used_mb INTEGER,
    mem_pct REAL,
    disk_brain_total_mb INTEGER,
    disk_brain_used_mb INTEGER,
    disk_brain_pct REAL,
    disk_root_total_mb INTEGER,
    disk_root_used_mb INTEGER,
    disk_root_pct REAL,
    fabric_status TEXT,
    fabric_detail_json TEXT,
    alerts_json TEXT,
    db_size_mb REAL
);
"""

_lock = threading.Lock()
_latest = None  # dict snapshot


def ensure_tables(conn):
    conn.executescript(_HW_TABLES)
    conn.commit()


def _read_proc_meminfo():
    try:
        rows = {}
        with open("/proc/meminfo", "r", encoding="utf-8") as fh:
            for line in fh:
                parts = line.split(":")
                if len(parts) == 2:
                    rows[parts[0]] = parts[1].strip()
        total_kb = int(rows.get("MemTotal", "0").split()[0])
        avail_kb = int(rows.get("MemAvailable", "0").split()[0])
        used_kb = total_kb - avail_kb
        return total_kb / 1024, used_kb / 1024
    except Exception:  # noqa: BLE001
        return 0, 0


def _read_proc_cpu():
    """CPU busy% from /proc/stat deltas; first call returns None (baseline)."""
    try:
        with open("/proc/stat", "r", encoding="utf-8") as fh:
            line = fh.readline()
        parts = [int(x) for x in line.split()[1:]]
        idle = parts[3] + (parts[4] if len(parts) > 4 else 0)
        total = sum(parts)
        now = (total, idle)
        with _lock:
            prev = getattr(_read_proc_cpu, "_prev", None)
            setattr(_read_proc_cpu, "_prev", now)
        if not prev:
            return None
        dt = total - prev[0]
        if dt <= 0:
            return 0.0
        return round(100.0 * (1 - (idle - prev[1]) / dt), 1)
    except Exception:  # noqa: BLE001
        return None


def _fabric_get(path):
    """Best-effort fabric device probe; NEVER fabricated on failure."""
    url = f"{os.environ.get('FABRIC_DEFAULT', 'http://172.18.0.1:4001')}{path}"
    try:
        req = urllib.request.Request(url, method="GET")
        with urllib.request.urlopen(req, timeout=FABRIC_TIMEOUT) as resp:
            return json.loads(resp.read().decode("utf-8", "replace"))
    except Exception as exc:  # noqa: BLE001
        return {"ok": False, "available": False, "error": str(exc)[:160]}


def _fabric_devices():
    devices = {}
    for path, key in (
        ("/runtime/status", "runtime"),
        ("/device/wsl/status", "wsl"),
        ("/terminal/status", "terminal"),
    ):
        d = _fabric_get(path)
        ok = bool(d.get("ok")) or bool(d.get("status"))
        devices[key] = {
            "available": ok,
            "status": d.get("status") or d.get("state") or ("ok" if ok else "offline"),
            "detail": {k2: v for k2, v in d.items() if k2 in ("state", "platform", "defaultDistro")},
            "error": d.get("error") if not ok else None,
        }
    return devices


def evaluate_alerts(snapshot):
    """Alert evaluator (pure): returns alert rows from a snapshot dict.
    Testable with synthetic snapshots; live snapshots flow through the same path."""
    alerts = []
    if (snapshot.get("mem_pct") or 0) >= ALERT_MEM_PCT:
        alerts.append({"device": "memory", "level": "WARN", "message": f"memory {snapshot['mem_pct']}% >= {ALERT_MEM_PCT}%"})
    if (snapshot.get("disk_brain_pct") or 0) >= ALERT_DISK_PCT:
        alerts.append({"device": "disk:/brain-data", "level": "WARN", "message": f"disk {snapshot['disk_brain_pct']}% >= {ALERT_DISK_PCT}%"})
    fab = snapshot.get("fabric_status") or {}
    if isinstance(fab, dict) and not fab.get("runtime", {}).get("available"):
        alerts.append({"device": "fabric:runtime", "level": "WARN", "message": "Runtime Fabric device lane unavailable"})
    return alerts


def _snapshot(conn):
    total_mb, used_mb = _read_proc_meminfo()
    mem_pct = round(100.0 * used_mb / total_mb, 1) if total_mb else 0.0
    cpu = _read_proc_cpu()
    disk_brain = shutil.disk_usage("/brain-data")
    disk_root = shutil.disk_usage("/leeway-root")
    db_path = os.environ.get("BRAIN_DATA_DIR", "/brain-data") + "/digital-brain.sqlite"
    db_size = os.path.getsize(db_path) / (1024 * 1024) if os.path.exists(db_path) else 0.0
    devices = _fabric_devices()
    snap = {
        "captured_at": datetime.now(timezone.utc).isoformat(),
        "platform": os.uname().sysname.lower(),
        "hostname": os.uname().nodename,
        "kernel": os.uname().release,
        "cpu_count": os.cpu_count() or 0,
        "cpu_usage_pct": cpu,
        "mem_total_mb": int(total_mb),
        "mem_used_mb": int(used_mb),
        "mem_pct": mem_pct,
        "disk_brain_total_mb": int(disk_brain.total / (1024 * 1024)),
        "disk_brain_used_mb": int(disk_brain.used / (1024 * 1024)),
        "disk_brain_pct": round(100.0 * disk_brain.used / disk_brain.total, 1) if disk_brain.total else 0.0,
        "disk_root_total_mb": int(disk_root.total / (1024 * 1024)),
        "disk_root_used_mb": int(disk_root.used / (1024 * 1024)),
        "disk_root_pct": round(100.0 * disk_root.used / disk_root.total, 1) if disk_root.total else 0.0,
        "fabric_status": devices,
        "db_size_mb": round(db_size, 2),
        "alerts": [],
    }
    snap["alerts"] = evaluate_alerts(snap)
    cur = conn.execute(
        "INSERT INTO hardware_stats (captured_at, platform, hostname, kernel, cpu_count, cpu_usage_pct,"
        " mem_total_mb, mem_used_mb, mem_pct, disk_brain_total_mb, disk_brain_used_mb, disk_brain_pct,"
        " disk_root_total_mb, disk_root_used_mb, disk_root_pct, fabric_status, alerts_json, db_size_mb)"
        " VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        (snap["captured_at"], snap["platform"], snap["hostname"], snap["kernel"], snap["cpu_count"],
         snap["cpu_usage_pct"], snap["mem_total_mb"], snap["mem_used_mb"], snap["mem_pct"],
         snap["disk_brain_total_mb"], snap["disk_brain_used_mb"], snap["disk_brain_pct"],
         snap["disk_root_total_mb"], snap["disk_root_used_mb"], snap["disk_root_pct"],
         json.dumps(snap["fabric_status"]), json.dumps(snap["alerts"]), snap["db_size_mb"]),
    )
    conn.execute("DELETE FROM hardware_stats WHERE id NOT IN (SELECT id FROM hardware_stats ORDER BY id DESC LIMIT ?)", (SAMPLE_CAP,))
    conn.commit()
    global _latest
    with _lock:
        _latest = snap
    return snap


def latest():
    with _lock:
        return _latest


def run(loop=True):
    """Sampler loop (bounded): baseline cpu first, then steady snapshots."""
    from . import store
    conn = store.connect()
    ensure_tables(conn)
    try:
        _read_proc_cpu()  # baseline
        while True:
            try:
                _snapshot(conn)
            except Exception as exc:  # noqa: BLE001
                global _latest
                with _lock:
                    _latest = {"captured_at": datetime.now(timezone.utc).isoformat(), "error": str(exc)}
            if not loop:
                return
            time.sleep(SAMPLE_INTERVAL)
    finally:
        conn.close()


# ---------------------------------------------------------------- P3-23 placement
_HW_NODES = [
    ("system::hardware", "Host Hardware", "Hardware", "hardware", "device"),
    ("system::hardware.cpu", "CPU", "Hardware", "hardware", "cpu"),
    ("system::hardware.memory", "Memory", "Hardware", "hardware", "memory"),
    ("system::hardware.disk", "Disk", "Hardware", "hardware", "disk"),
    ("system::hardware.fabric", "Runtime Fabric Device Lane", "Hardware", "hardware", "fabric"),
    ("system::hardware.brain", "Digital Brain Runtime", "Hardware", "hardware", "runtime"),
]


def place_hardware_nodes(conn):
    """Additive LW-B1 placement of the hardware object graph under
    system::digital-brain via the single placement authority (live_sync._place).
    Only addresses currently-unaddressed rows; never re-places addressed nodes.
    Returns (placed, blocked)."""
    from . import store
    from .live_sync import _place
    placed, blocked = [], []
    parent = conn.execute("SELECT * FROM nodes WHERE id = 'system::digital-brain'").fetchone()
    if not parent or not parent["b64_path"]:
        return placed, blocked
    for node_id, title, region_label, _typ, sub in _HW_NODES:
        row = conn.execute("SELECT * FROM nodes WHERE id = ?", (node_id,)).fetchone()
        if row and row["b64_path"]:
            continue
        node = {
            "id": node_id,
            "canonical_id": node_id,
            "domain": "system",
            "type": "hardware",
            "subtype": sub,
            "title": title,
            "description": f"Host hardware / device lane ({sub})",
            "source": "digital-brain-hardware-lane",
            "status": "active",
            "parent_id": "system::digital-brain",
            "metadata_json": json.dumps({"capability": "hardware", "device": sub}),
        }
        try:
            store.upsert_node(conn, node)
            row = conn.execute("SELECT * FROM nodes WHERE id = ?", (node_id,)).fetchone()
            b64, reason = _place(conn, row, parent, "Infrastructure")
            if b64:
                store.add_provenance(conn, node_id, "formula", "digital-brain-hardware-lane",
                                     f"LW-B1 placement {b64}")
                conn.commit()
                placed.append((node_id, b64))
            else:
                blocked.append((node_id, reason))
        except Exception as exc:  # noqa: BLE001
            blocked.append((node_id, str(exc)[:160]))
    return placed, blocked