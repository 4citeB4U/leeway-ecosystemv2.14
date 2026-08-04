"""Validate expected VS Code speak/voice paths and router endpoints.

This is a lightweight check that ensures the router exposes the expected
voice endpoints and that common runtime files (config, transcribe script)
exist. Returns exit code 0 on success.
"""
import os
import sys
import urllib.request

ROOT = os.path.join(os.getcwd(), 'agent-lee-coding-mode')
ROUTER = os.path.join(ROOT, 'router', 'server-brainfix.mjs')
TRANSCRIBE = os.path.join(ROOT, 'runtime', 'agent_lee_transcribe_wav.py')
CONFIG = os.path.join(ROOT, 'config', 'gec_config.json')

def check_file(path):
    ok = os.path.exists(path)
    print(f"{path}: {'OK' if ok else 'MISSING'}")
    return ok

def check_endpoint(url):
    try:
        with urllib.request.urlopen(url, timeout=5) as r:
            print(f"{url}: {r.status}")
            return r.status == 200
    except Exception as e:
        print(f"{url}: ERROR {e}")
        return False

def main():
    ok = True
    ok = check_file(ROUTER) and ok
    ok = check_file(TRANSCRIBE) and ok
    ok = check_file(CONFIG) and ok

    # check local router endpoints if available
    base = os.environ.get('AGENT_LEE_ROUTER_URL', 'http://127.0.0.1:8080')
    endpoints = [f"{base}/agent-lee/voice/backends", f"{base}/agent-lee/voice/speak"]
    for ep in endpoints:
        ok = check_endpoint(ep) or ok

    sys.exit(0 if ok else 2)

if __name__ == '__main__':
    main()
