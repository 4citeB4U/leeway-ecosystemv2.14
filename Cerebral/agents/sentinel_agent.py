"""
SentinelAgent — System Health Watchdog
========================================
Monitors CPU, RAM, disk, services, and processes.
Writes continuous health events to logs/health.ndjson.
Can kill rogue processes, probe services, and trigger SSE alerts.

Tools
------
  health_snapshot       — Current CPU/RAM/disk/uptime snapshot
  health_history        — Last N entries from logs/health.ndjson
  check_service         — Probe a TCP port or HTTP endpoint
  process_list          — Top N processes sorted by cpu|memory
  kill_process          — Kill by PID or name (blocked: system procs)
  disk_usage            — All drive space breakdown
  alert_trigger         — Push message to Cerebral SSE /api/tts/events
  service_restart       — Restart a named Windows service via sc.exe
  log_event             — Append a custom event to health.ndjson
"""

import json
import os
import socket
import subprocess
import time
from datetime import datetime, timezone
from typing import Any

import psutil
import requests

ROOT        = r"C:\Cerebral"
LOG_PATH    = os.path.join(ROOT, "logs", "health.ndjson")
DAEMON_BASE = "http://127.0.0.1:8765"

# Processes that must NEVER be killed
PROTECTED = {"system", "smss.exe", "csrss.exe", "wininit.exe", "winlogon.exe",
             "services.exe", "lsass.exe", "svchost.exe"}

TOOLS = [
    "health_snapshot", "health_history", "check_service",
    "process_list", "kill_process", "disk_usage",
    "alert_trigger", "service_restart", "log_event",
]


class SentinelAgent:
    """Sovereign health watchdog — monitors, alerts, and auto-remediates."""

    name        = "sentinel"
    description = "Real-time system health monitoring, process management, and alerting."
    tools       = TOOLS

    # ── Public interface ──────────────────────────────────────────────────────

    def run(self, tool: str, args: dict = None) -> dict:
        args = args or {}
        if tool not in TOOLS:
            return {"ok": False, "error": f"Unknown tool '{tool}'. Available: {TOOLS}"}
        method = getattr(self, f"_tool_{tool}", None)
        if method is None:
            return {"ok": False, "error": f"Tool '{tool}' not implemented."}
        try:
            return method(args)
        except Exception as e:
            return {"ok": False, "error": str(e), "tool": tool}

    # ── Tools ─────────────────────────────────────────────────────────────────

    def _tool_health_snapshot(self, args: dict) -> dict:
        cpu   = psutil.cpu_percent(interval=1)
        ram   = psutil.virtual_memory()
        disk  = psutil.disk_usage("C:\\")
        net   = psutil.net_io_counters()
        boot  = datetime.fromtimestamp(psutil.boot_time(), tz=timezone.utc).isoformat()
        snap  = {
            "ok":           True,
            "ts":           datetime.now(timezone.utc).isoformat(),
            "cpu_percent":  cpu,
            "ram_percent":  ram.percent,
            "ram_used_gb":  round(ram.used / 1e9, 2),
            "ram_total_gb": round(ram.total / 1e9, 2),
            "disk_used_gb": round(disk.used / 1e9, 2),
            "disk_free_gb": round(disk.free / 1e9, 2),
            "disk_percent": disk.percent,
            "net_sent_mb":  round(net.bytes_sent / 1e6, 1),
            "net_recv_mb":  round(net.bytes_recv / 1e6, 1),
            "boot_time":    boot,
            "alerts":       [],
        }
        # Auto-generate alerts
        if cpu > 90:       snap["alerts"].append(f"CPU critical: {cpu}%")
        if ram.percent > 95: snap["alerts"].append(f"RAM critical: {ram.percent}%")
        if disk.percent > 90: snap["alerts"].append(f"Disk C: critical: {disk.percent}%")
        # Log to ndjson
        self._append_log(snap)
        return snap

    def _tool_health_history(self, args: dict) -> dict:
        n = int(args.get("n", 20))
        lines = []
        if os.path.exists(LOG_PATH):
            with open(LOG_PATH, "r", encoding="utf-8", errors="replace") as f:
                lines = f.readlines()
        entries = []
        for line in lines[-n:]:
            try:
                entries.append(json.loads(line.strip()))
            except Exception:
                pass
        return {"ok": True, "count": len(entries), "entries": entries}

    def _tool_check_service(self, args: dict) -> dict:
        host = args.get("host", "127.0.0.1")
        port = int(args.get("port", 8765))
        url  = args.get("url", "")
        result = {"ok": False, "host": host, "port": port}
        # TCP probe
        try:
            s = socket.create_connection((host, port), timeout=2)
            s.close()
            result["tcp"] = "open"
        except Exception as e:
            result["tcp"] = f"closed ({e})"
        # HTTP probe
        if url:
            try:
                r = requests.get(url, timeout=3)
                result["http_status"] = r.status_code
                result["http_ok"]     = r.status_code < 400
                result["ok"]          = True
            except Exception as e:
                result["http_error"] = str(e)
        else:
            result["ok"] = result["tcp"] == "open"
        return result

    def _tool_process_list(self, args: dict) -> dict:
        sort_by = args.get("sort_by", "cpu")  # cpu | memory
        n       = int(args.get("n", 15))
        procs   = []
        for p in psutil.process_iter(["pid", "name", "cpu_percent", "memory_info", "status"]):
            try:
                mi = p.info["memory_info"]
                procs.append({
                    "pid":        p.info["pid"],
                    "name":       p.info["name"],
                    "cpu":        p.info["cpu_percent"],
                    "ram_mb":     round(mi.rss / 1e6, 1) if mi else 0,
                    "status":     p.info["status"],
                })
            except Exception:
                pass
        key   = "cpu" if sort_by == "cpu" else "ram_mb"
        procs = sorted(procs, key=lambda x: x.get(key, 0), reverse=True)
        return {"ok": True, "sort_by": sort_by, "processes": procs[:n]}

    def _tool_kill_process(self, args: dict) -> dict:
        pid  = args.get("pid")
        name = args.get("name", "").lower()
        if name in PROTECTED:
            return {"ok": False, "error": f"Process '{name}' is protected and cannot be killed."}
        killed = []
        for p in psutil.process_iter(["pid", "name"]):
            try:
                match = (pid and p.pid == int(pid)) or (name and p.info["name"].lower() == name)
                if match:
                    if p.info["name"].lower() in PROTECTED:
                        return {"ok": False, "error": f"Process is protected."}
                    p.kill()
                    killed.append({"pid": p.pid, "name": p.info["name"]})
            except Exception as e:
                pass
        return {"ok": bool(killed), "killed": killed,
                "message": f"Killed {len(killed)} process(es)." if killed else "No matching process found."}

    def _tool_disk_usage(self, args: dict) -> dict:
        drives = []
        for part in psutil.disk_partitions():
            try:
                usage = psutil.disk_usage(part.mountpoint)
                drives.append({
                    "drive":      part.mountpoint,
                    "total_gb":   round(usage.total / 1e9, 1),
                    "used_gb":    round(usage.used / 1e9, 1),
                    "free_gb":    round(usage.free / 1e9, 1),
                    "percent":    usage.percent,
                })
            except Exception:
                pass
        return {"ok": True, "drives": drives}

    def _tool_alert_trigger(self, args: dict) -> dict:
        message  = args.get("message", "System alert from Sentinel.")
        severity = args.get("severity", "warning")  # info | warning | critical
        payload  = {"type": "agent_alert", "message": message, "severity": severity,
                    "ts": datetime.now(timezone.utc).isoformat()}
        # Push to daemon SSE queue
        try:
            r = requests.post(f"{DAEMON_BASE}/api/chat/tts",
                              json={"text": message, "priority": severity}, timeout=3)
            payload["tts_ok"] = r.status_code == 200
        except Exception as e:
            payload["tts_ok"] = False
            payload["tts_error"] = str(e)
        self._append_log({"event": "alert", **payload})
        return {"ok": True, **payload}

    def _tool_service_restart(self, args: dict) -> dict:
        service = args.get("service", "")
        if not service:
            return {"ok": False, "error": "service name required"}
        try:
            r = subprocess.run(
                ["sc.exe", "stop", service], capture_output=True, text=True, timeout=15
            )
            time.sleep(2)
            r2 = subprocess.run(
                ["sc.exe", "start", service], capture_output=True, text=True, timeout=15
            )
            return {"ok": r2.returncode == 0, "stop": r.stdout.strip(), "start": r2.stdout.strip()}
        except Exception as e:
            return {"ok": False, "error": str(e)}

    def _tool_log_event(self, args: dict) -> dict:
        event = {"ts": datetime.now(timezone.utc).isoformat(), **args}
        self._append_log(event)
        return {"ok": True, "logged": event}

    # ── Helpers ───────────────────────────────────────────────────────────────

    def _append_log(self, entry: dict):
        os.makedirs(os.path.dirname(LOG_PATH), exist_ok=True)
        with open(LOG_PATH, "a", encoding="utf-8") as f:
            f.write(json.dumps(entry) + "\n")
