import os
import subprocess
import win32com.client
import pythoncom
import psutil
from flask import Flask, send_from_directory, jsonify, request
from flask_cors import CORS

# Agent Lee OS2 — the one true frontend
UI_DIST = r"C:\Cerebral\agent-lee-os2\dist"

app = Flask(__name__, static_folder=os.path.join(UI_DIST, "assets"))
CORS(app)

# Serve root-level files like the favicon from the repo root so the dist
# index.html can reference `cerebral_icon.ico` without needing an extra copy.
@app.route('/cerebral_icon.ico')
def serve_icon():
    repo_root = os.path.abspath(os.path.dirname(__file__))
    return send_from_directory(repo_root, 'cerebral_icon.ico')

@app.route('/')
def serve_index():
    from flask import make_response
    resp = make_response(send_from_directory(UI_DIST, "index.html"))
    resp.headers['Cache-Control'] = 'no-store, max-age=0'
    resp.headers['Pragma'] = 'no-cache'
    return resp

@app.route('/assets/<path:path>')
def serve_assets(path):
    return send_from_directory(app.static_folder, path)

@app.route('/health')
def health():
    try:
        drives = [{"drive": d.device, "free": psutil.disk_usage(d.mountpoint).free // (2**30)} for d in psutil.disk_partitions() if 'fixed' in d.opts]
    except: drives = []
    return jsonify({
        "cpu": psutil.cpu_percent(),
        "ram": psutil.virtual_memory().percent,
        "drives": drives,
        "status": "Cerebral Prime Online"
    })

@app.route('/speak', methods=['POST'])
def speak():
    data = request.json
    text = data.get("text", "")
    try:
        pythoncom.CoInitialize()
        speaker = win32com.client.Dispatch("SAPI.SpVoice")
        
        # Lock to Microsoft David Desktop
        voices = speaker.GetVoices()
        for i in range(voices.Count):
            if "Microsoft David Desktop" in voices.Item(i).GetDescription():
                speaker.Voice = voices.Item(i)
                break
        
        speaker.Rate = -1 
        speaker.Speak(text)
        return jsonify({"status": "ok", "voice": "Microsoft David Desktop"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})
    finally:
        pythoncom.CoUninitialize()

import threading
import requests as _requests

# ── Foundry LLM discovery ────────────────────────────────────────────────────
FOUNDRY_BASE = os.environ.get("CEREBRAL_FOUNDRY_BASE", "http://127.0.0.1:56995")
FOUNDRY_CHAT = f"{FOUNDRY_BASE}/v1/chat/completions"
FOUNDRY_MODEL = "Phi-3.5-mini-instruct-generic-cpu:1"

# ── Tunnel state ─────────────────────────────────────────────────────────────
_tunnel_proc = None
_tunnel_log = []
_tunnel_url = None
_tunnel_started_at = None
CF_TUNNEL_TOKEN = os.environ.get(
    "CF_TUNNEL_TOKEN_CEREBRAL",
    "eyJhIjoiOWM1YzgzZTJlOWI2YTg1Y2Q1NWY0MWIxMzM5Mjk2NTMiLCJ0IjoiZWJkMjEwM2MtNjk4Mi00N2MyLWI4MTQtMzU2MDI3ZjRlMjQ1IiwicyI6IllXSTVZbUppTjJRdFpqUXhPQzAwTW1Wa0xUaGhaVGN0WmpGallURmhaVGN3TUdVdyJ9"
)
CF_CUSTOM_DOMAIN = "cerebral.rapidwebdevelop.com"


def _tunnel_is_alive():
    global _tunnel_proc
    if _tunnel_proc is None:
        return False
    if _tunnel_proc.poll() is not None:
        _tunnel_proc = None
        return False
    return True


def _read_tunnel_output():
    global _tunnel_url
    import re as _re_t
    url_pat = _re_t.compile(r'(https://[a-zA-Z0-9\-\.]+\.trycloudflare\.com)')
    try:
        for line in _tunnel_proc.stderr:
            line = line.strip()
            if line:
                _tunnel_log.append(line)
                if len(_tunnel_log) > 200:
                    _tunnel_log.pop(0)
                m = url_pat.search(line)
                if m and not _tunnel_url:
                    _tunnel_url = m.group(1)
    except Exception:
        pass


# ── API routes ───────────────────────────────────────────────────────────────

@app.route("/api/health")
def api_health():
    foundry_ok = False
    try:
        r = _requests.get(f"{FOUNDRY_BASE}/v1/models", timeout=2)
        foundry_ok = r.status_code == 200
    except Exception:
        pass
    return jsonify({
        "daemon": "online",
        "foundry": foundry_ok,
        "cpu": psutil.cpu_percent(),
        "ram": psutil.virtual_memory().percent,
    })


@app.route("/api/telemetry")
def api_telemetry():
    try:
        cpu_now = psutil.cpu_percent()
        vm = psutil.virtual_memory()
        disk_c = psutil.disk_io_counters()
        net_c = psutil.net_io_counters()
        return jsonify({
            "instant": {
                "cpu": cpu_now,
                "cpu_per_core": psutil.cpu_percent(percpu=True),
                "ram_percent": vm.percent,
                "ram_used": vm.used,
                "ram_total": vm.total,
                "disk_read_bytes": getattr(disk_c, "read_bytes", None),
                "disk_write_bytes": getattr(disk_c, "write_bytes", None),
                "net_bytes_sent": getattr(net_c, "bytes_sent", None),
                "net_bytes_recv": getattr(net_c, "bytes_recv", None),
            },
            "history": {},
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/chat", methods=["POST"])
def api_chat():
    data = request.get_json(force=True) or {}
    msg = data.get("message", "")
    try:
        r = _requests.post(FOUNDRY_CHAT, json={
            "model": FOUNDRY_MODEL,
            "messages": [{"role": "user", "content": msg}],
            "max_tokens": 512,
        }, timeout=90)
        if r.status_code == 200:
            return jsonify(r.json())
    except Exception:
        pass
    return jsonify({"response": "Cerebral is thinking\u2026 (Foundry offline)"})


@app.route("/api/tunnel/status")
def tunnel_status():
    alive = _tunnel_is_alive()
    # Also detect an externally-started cloudflared process
    if not alive:
        for p in psutil.process_iter(['name']):
            try:
                if 'cloudflared' in (p.info['name'] or '').lower():
                    alive = True
                    break
            except Exception:
                pass
    url = _tunnel_url or (f"https://{CF_CUSTOM_DOMAIN}" if alive else None)
    return jsonify({
        "running": alive,
        "provider": "cloudflare" if alive else None,
        "url": url,
        "customDomain": CF_CUSTOM_DOMAIN if alive else None,
        "log": _tunnel_log[-50:],
        "startedAt": _tunnel_started_at,
        "pid": _tunnel_proc.pid if _tunnel_is_alive() else None,
    })


@app.route("/api/tunnel/start", methods=["POST"])
def tunnel_start():
    global _tunnel_proc, _tunnel_url, _tunnel_log, _tunnel_started_at
    if _tunnel_is_alive():
        url = _tunnel_url or f"https://{CF_CUSTOM_DOMAIN}"
        return jsonify({
            "running": True, "provider": "cloudflare",
            "url": url, "customDomain": CF_CUSTOM_DOMAIN,
            "log": _tunnel_log[-50:], "startedAt": _tunnel_started_at,
            "pid": _tunnel_proc.pid,
        })
    body = request.get_json(force=True) or {}
    custom_domain = body.get("customDomain") or CF_CUSTOM_DOMAIN
    _tunnel_log = []
    _tunnel_url = f"https://{custom_domain}"
    from datetime import datetime, timezone
    _tunnel_started_at = datetime.now(timezone.utc).isoformat()
    try:
        cf_exe = r"C:\Tools\cloudflared.exe"
        if not os.path.exists(cf_exe):
            cf_exe = "cloudflared"
        _tunnel_proc = subprocess.Popen(
            [cf_exe, "tunnel", "--no-autoupdate", "run", "--token", CF_TUNNEL_TOKEN],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.PIPE,
            text=True,
        )
        threading.Thread(target=_read_tunnel_output, daemon=True, name="tunnel-log").start()
        return jsonify({
            "running": True, "provider": "cloudflare",
            "url": _tunnel_url, "customDomain": custom_domain,
            "log": [], "startedAt": _tunnel_started_at,
            "pid": _tunnel_proc.pid,
        })
    except Exception as e:
        return jsonify({"running": False, "error": str(e)}), 500


@app.route("/api/tunnel/stop", methods=["POST"])
def tunnel_stop():
    global _tunnel_proc, _tunnel_url, _tunnel_started_at
    if _tunnel_proc and _tunnel_proc.poll() is None:
        try:
            _tunnel_proc.terminate()
            _tunnel_proc.wait(timeout=5)
        except Exception:
            try:
                _tunnel_proc.kill()
            except Exception:
                pass
    _tunnel_proc = None
    _tunnel_url = None
    _tunnel_started_at = None
    return jsonify({"running": False, "provider": None, "url": None,
                    "log": [], "startedAt": None, "pid": None, "customDomain": None})


@app.route("/api/tunnel/telegram", methods=["POST"])
def tunnel_telegram():
    bot_token = os.environ.get("TELEGRAM_CEREBRAL_TOKEN") or os.environ.get("TELEGRAM_BOT_TOKEN_2")
    chat_id = os.environ.get("TELEGRAM_USER_ID")
    url = _tunnel_url or (f"https://{CF_CUSTOM_DOMAIN}" if _tunnel_is_alive() else None)
    if not bot_token or not chat_id:
        return jsonify({"ok": False, "error": "Telegram credentials not configured"}), 500
    if not url:
        return jsonify({"ok": False, "error": "Tunnel not running"}), 400
    try:
        r = _requests.post(
            f"https://api.telegram.org/bot{bot_token}/sendMessage",
            json={"chat_id": chat_id, "text": f"\U0001f9e0 Cerebral is live at: {url}"},
            timeout=10,
        )
        return jsonify({"ok": r.status_code == 200, "status": r.status_code})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500


@app.route("/api/ports")
def api_ports():
    try:
        listening = set()
        for conn in psutil.net_connections(kind="inet"):
            if conn.status == "LISTEN" and conn.laddr:
                listening.add(conn.laddr.port)
        monitored = list(range(6000, 6021)) + [8765, 56995, 5173, 8787, 8080, 3001, 8001, 3000]
        result = [{"port": p, "online": p in listening} for p in monitored]
        return jsonify({"ports": result})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    # Start Indexer Agent silently
    indexer_path = r"C:\Cerebral\agents\indexer.py"
    if os.path.exists(indexer_path):
        subprocess.Popen(["pythonw", indexer_path])
    
    app.run(host='127.0.0.1', port=8765, debug=False)

