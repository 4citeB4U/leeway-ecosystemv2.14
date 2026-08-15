"""PCIe Intelligence (P10, LW-H4P): interface + honest unavailable path.

There is no PCIe (NVMe/GPU) hardware controller on this host, so LW-H4P
proves its CONTRACT and its UNAVAILABLE path only. It NEVER fabricates PCIe
telemetry. When a Leeway PCIe bridge exists, it must report a device list
via PCIE_BRIDGE_URL; until then every capability reports UNKNOWN/UNAVAILABLE."""

import json
import os
import urllib.request

from . import store

META = "lw_h4p"
META_AT = "lw_h4p_at"

BRIDGE_URL = os.environ.get("PCIE_BRIDGE_URL", "").strip()


def _read_bridge():
    """Try the Leeway PCIe bridge once, bounded. Returns (ok, payload)."""
    if not BRIDGE_URL:
        return False, "no PCIE_BRIDGE_URL configured"
    try:
        with urllib.request.urlopen(BRIDGE_URL, timeout=3) as resp:
            return True, json.loads(resp.read().decode("utf-8"))
    except Exception as exc:  # noqa: BLE001
        return False, f"bridge unreachable: {type(exc).__name__}"


def compute(conn):
    ok, payload = _read_bridge()
    if ok:
        devices = payload.get("devices", []) if isinstance(payload, dict) else payload
        return {
            "computedAt": None, "availability": "AVAILABLE", "bridge": BRIDGE_URL,
            "devices": devices, "deviceCount": len(devices) if isinstance(devices, list) else "UNKNOWN",
            "capabilities": {"nvme_latency": "UNKNOWN", "gpu_utilization": "UNKNOWN",
                             "pcie_bandwidth": "UNKNOWN", "link_errors": "UNKNOWN"},
            "learning": "learning window opens when device telemetry exists; never trained on fabricated data",
        }
    return {
        "computedAt": None, "availability": "UNAVAILABLE", "bridge": BRIDGE_URL or "not-configured",
        "deviceCount": "UNAVAILABLE", "reason": payload,
        "capabilities": {"nvme_latency": "UNKNOWN", "gpu_utilization": "UNKNOWN",
                         "pcie_bandwidth": "UNKNOWN", "link_errors": "UNKNOWN"},
        "learning": "no PCIe telemetry; all metrics UNKNOWN/UNAVAILABLE by policy -- no fabricated measurements",
        "interface": "set PCIE_BRIDGE_URL to a Leeway PCIe bridge exposing {devices: [...]}",
    }


def refresh(conn):
    snap = compute(conn)
    import time
    snap["computedAt"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    store.set_meta(conn, META, json.dumps(snap))
    store.set_meta(conn, META_AT, snap["computedAt"])
    conn.commit()
    return snap


def snapshot(conn):
    raw = store.get_meta(conn, META)
    at = store.get_meta(conn, META_AT)
    if not raw:
        return {"computedAt": at, "availability": "UNKNOWN", "bridge": BRIDGE_URL or "not-configured",
                "deviceCount": "UNKNOWN", "reason": "no snapshot yet",
                "capabilities": {"nvme_latency": "UNKNOWN", "gpu_utilization": "UNKNOWN",
                                 "pcie_bandwidth": "UNKNOWN", "link_errors": "UNKNOWN"},
                "learning": "no PCIe telemetry; all metrics UNKNOWN/UNAVAILABLE by policy"}
    snap = json.loads(raw)
    snap["computedAt"] = at
    return snap