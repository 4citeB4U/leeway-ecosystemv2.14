import os
import json
from typing import Dict, List, Any


_CACHE: Dict[str, Any] = {}


def _find_registry_path() -> str:
    # Allow explicit override
    env = os.environ.get("LEEWAY_MODEL_ROUTES_PATH")
    if env and os.path.exists(env):
        return env
    # Candidate: repo root updated-model-routes.json
    here = os.path.dirname(__file__)
    repo_root = os.path.abspath(os.path.join(here, ".."))

    # Discovery-first: attempt to read the canonical discovery index and prefer entries there
    def _load_discovery_index() -> dict:
        candidates = [
            os.path.join(repo_root, 'agent-lee-coding-mode', 'source-index', 'all-leeway-files.index.json.new'),
            os.path.join(repo_root, 'agent-lee-coding-mode', 'source-index', 'all-leeway-files.index.json'),
        ]
        for p in candidates:
            if os.path.exists(p):
                try:
                    with open(p, 'r', encoding='utf-8') as f:
                        raw = f.read()
                    try:
                        parsed = json.loads(raw)
                    except Exception:
                        # attempt last JSON object
                        last_open = raw.rfind('{')
                        last_close = raw.rfind('}')
                        if last_open != -1 and last_close > last_open:
                            try:
                                parsed = json.loads(raw[last_open:last_close+1])
                            except Exception:
                                parsed = None
                        else:
                            parsed = None
                    if isinstance(parsed, list):
                        return {'files': parsed}
                    return parsed or {}
                except Exception:
                    continue
        return {}

    discovery = _load_discovery_index()
    # Look for updated-model-routes.json in discovery
    files = discovery.get('files') or []
    for f in files:
        name = f.get('Name') if isinstance(f, dict) else None
        full = f.get('FullName') if isinstance(f, dict) else None
        if name == 'updated-model-routes.json' and full and os.path.exists(full):
            return full

    # Prefer runtime fabric model authority manifest if present
    mab = os.path.join(repo_root, '..', 'Leeway Runtime Fabric', 'capability-registry', 'registry', 'model-authority.json')
    if os.path.exists(mab):
        return mab

    # Fallback candidates at repo root
    candidates = [
        os.path.join(repo_root, "updated-model-routes.json"),
        os.path.join(repo_root, "model-hive-cleanup-and-deepseek-reactivation-report.json"),
    ]
    for p in candidates:
        if p and os.path.exists(p):
            return p
    return ""


def load_registry() -> Dict[str, Any]:
    """Load and return the model routes registry as a dict. Results are cached."""
    if _CACHE.get("registry"):
        return _CACHE["registry"]

    path = _find_registry_path()
    if not path:
        _CACHE["registry"] = {"ok": False, "error": "REGISTRY_NOT_FOUND", "models": []}
        return _CACHE["registry"]

    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception as e:
        _CACHE["registry"] = {"ok": False, "error": str(e), "models": []}
        return _CACHE["registry"]

    # Collect models from modelToRouteMapping and activeRoutes
    models = []
    model_to_route = data.get("modelToRouteMapping", {}) if isinstance(data, dict) else {}
    active_routes = {r.get("targetModel"): r for r in data.get("activeRoutes", []) if isinstance(r, dict)}

    for model_id, routes in model_to_route.items():
        if not model_id:
            continue
        # Exclude DeepSeek models explicitly
        if "deepseek" in model_id.lower():
            continue

        entry = {
            "model_id": model_id,
            "routes": routes if isinstance(routes, list) else [routes],
            "meta": {},
        }
        # Attach any activeRoute metadata if present
        ar = active_routes.get(model_id)
        if ar:
            entry["meta"] = {
                "routeId": ar.get("routeId"),
                "routeAlias": ar.get("routeAlias"),
                "routePurpose": ar.get("routePurpose"),
                "status": ar.get("status"),
            }

        models.append(entry)

    _CACHE["registry"] = {"ok": True, "path": path, "models": models, "count": len(models)}
    return _CACHE["registry"]


def get_models() -> List[Dict[str, Any]]:
    return load_registry().get("models", [])


def as_simple_list() -> List[str]:
    return [m.get("model_id") for m in get_models()]


if __name__ == "__main__":
    print(json.dumps(load_registry(), indent=2))
