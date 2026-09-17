# REGION: LeeWay skills authority verification
# TAG: LEEWAY-SKILLS-AUTHORITY-TEST-V1
# WHO: Agent Lee; WHAT: test authority, legacy compatibility and failure boundaries.
# WHY: prevent authority drift or filesystem exposure. WHERE: candidate container.
# WHEN: before cutover; HOW: HTTP and isolated temporary fixtures; ROLE: verifier; LICENSE: MIT.
import hashlib
import json
import sys
import tempfile
from pathlib import Path
from urllib.request import urlopen, Request
from urllib.error import HTTPError
sys.path.insert(0, "/app")
import authority_projection as projection
from fastapi import HTTPException

def get(path, base="http://127.0.0.1:5327"):
    with urlopen(base + path, timeout=10) as r:
        return json.load(r)

a = get("/authority")
assert a["commit"] == "66c976bb0e79e24503c847ef90929c6fb9d5d818"
assert a["skill_count"] == 100
assert a["execution_enabled"] is False
index = get("/authority/skills")["skills"]
assert len(index) == 100
for row in index:
    assert len(row["sha256"]) == 64
path = "skills/leeway-continuity-authority/SKILL.md"
body = get("/authority/file?path=" + path)
assert "Continuity" in body["content"]
legacy = get("/skills")
baseline = get("/skills", "http://host.docker.internal:5327")
assert legacy == baseline
assert len(legacy["registry"]["skills"]) == 8
runtime = get("/authority/runtime")
assert any(r["name"] == "leeway_capability_centers" and r["state"] == "running" for r in runtime["containers"])
assert all("mounts" not in r and "labels" not in r for r in runtime["containers"])
for method, target, allowed in [
    ("GET", "/authority/file?path=../../etc/passwd", [404]),
    ("GET", "/authority/file?path=missing", [404]),
    ("POST", "/authority/skills", [405])
]:
    try:
        urlopen(Request("http://127.0.0.1:5327" + target, method=method), timeout=5)
        raise AssertionError("Request unexpectedly accepted")
    except HTTPError as e:
        assert e.code in allowed
with tempfile.TemporaryDirectory(prefix="leeway-authority-test-") as folder:
    original_root = projection.ROOT
    projection.ROOT = Path(folder)
    try:
        testfile = Path(folder) / "sample.md"
        testfile.write_bytes(b"original")
        m = {"files": {"sample.md": hashlib.sha256(b"original").hexdigest()}}
        assert projection.verified_file("sample.md", m) == b"original"
        testfile.write_bytes(b"tampered")
        try:
            projection.verified_file("sample.md", m)
            raise AssertionError("Tampered content accepted")
        except HTTPException as e:
            assert e.status_code == 409
        testfile.unlink()
        try:
            projection.verified_file("sample.md", m)
            raise AssertionError("Missing authority accepted")
        except HTTPException as e:
            assert e.status_code == 503
    finally:
        projection.ROOT = original_root
print(json.dumps({"status":"PASS","canonicalSkills":100,"preservedLegacyRecipes":8,"liveDockerInventory":True,"negativeHttpTests":3,"hashTamperRejected":True,"missingFileRejected":True,"formulaExecuted":False}))

