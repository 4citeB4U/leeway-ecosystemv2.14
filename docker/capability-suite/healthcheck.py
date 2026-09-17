"""Verify every preserved capability identity, not just one listening socket."""
import json
import urllib.request
from pathlib import Path
for lane in json.loads(Path("/config/lanes.json").read_text(encoding="utf-8-sig")):
    with urllib.request.urlopen("http://127.0.0.1:%s/health" % lane["port"], timeout=1) as response:
        result = json.load(response)
        assert response.status == 200 and result["ok"] and result["runtime"] == lane["name"]

