# REGION: LeeWay Agent Skills / canonical read-only projection
# TAG: LEEWAY-SKILLS-DOCKER-AUTHORITY-V1
# WHO: Agent Lee under Leonard Lee authority.
# WHAT: Expose pinned canonical instructions alongside the preserved legacy workflow registry.
# WHY: Separate skill knowledge from operational execution and show live Docker state.
# WHERE: Existing skills service. WHEN: GET requests. HOW: hash-checked files and existing bridge.
# ROLE: read-only adapter. LICENSE: MIT.
import hashlib
import json
from pathlib import Path
from urllib.request import urlopen
from fastapi import HTTPException

ROOT = Path("/canonical-agent-skills")
MANIFEST = Path("/app/authority-manifest.json")
DOCKER_INVENTORY_URL = "http://leeway_docker_reality:8781/containers"

def load_manifest():
    return json.loads(MANIFEST.read_text(encoding="utf-8-sig"))

def verified_file(relative, manifest):
    if relative not in manifest["files"]:
        raise HTTPException(status_code=404, detail="File is not in the pinned authority manifest")
    root = ROOT.resolve()
    target = (root / relative).resolve()
    if root not in target.parents:
        raise HTTPException(status_code=400, detail="Path outside authority root")
    try:
        raw = target.read_bytes()
    except OSError:
        raise HTTPException(status_code=503, detail="Authority file unavailable")
    digest = hashlib.sha256(raw).hexdigest()
    if digest != manifest["files"][relative].lower():
        raise HTTPException(status_code=409, detail="Authority hash mismatch")
    return raw

def install(app):
    @app.get("/authority")
    def authority():
        m = load_manifest()
        for relative in m["files"]:
            verified_file(relative, m)
        return {
            "repository": m["repository"], "commit": m["commit"],
            "verification": "PINNED_FILE_HASHES_VERIFIED",
            "skill_count": len(m["skills"]),
            "execution_enabled": False,
            "legacy_workflows": "/skills",
            "canonical_instructions": "/authority/skills",
            "live_docker_inventory": "/authority/runtime",
            "formula_execution": "NOT_EXECUTED_BY_THIS_ADAPTER"
        }

    @app.get("/authority/skills")
    def skills():
        m = load_manifest()
        for relative in m["skills"]:
            verified_file(relative, m)
        return {"repository": m["repository"], "commit": m["commit"],
                "skills": [{"path": p, "sha256": m["files"][p]} for p in m["skills"]]}

    @app.get("/authority/file")
    def file(path: str):
        m = load_manifest()
        raw = verified_file(path, m)
        return {"path": path, "commit": m["commit"], "sha256": m["files"][path],
                "content": raw.decode("utf-8-sig")}

    @app.get("/authority/runtime")
    def runtime():
        try:
            with urlopen(DOCKER_INVENTORY_URL, timeout=5) as response:
                data = json.load(response)
        except Exception:
            raise HTTPException(status_code=503, detail="Existing Docker Reality bridge unavailable")
        # Do not forward configuration labels or host mount paths to this endpoint.
        rows = data.get("containers", [])
        return {"source": "leeway_docker_reality", "total": len(rows),
                "containers": [{k: row.get(k) for k in
                    ("id", "name", "image", "state", "status")} for row in rows],
                "execution_enabled": False}

