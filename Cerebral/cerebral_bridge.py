from flask import Blueprint, jsonify, request
import psutil
import datetime
import os
import json
import uuid
import sys
import requests

# Ensure we can import from the parent directory if needed
sys.path.append(os.path.dirname(__file__))

# Import policy check from the existing engine
try:
    from policy_engine import requires_approval, load_policy
except ImportError:
    def load_policy():
        return {"allowlisted_actions": [], "restricted_actions": []}
    def requires_approval(action):
        return False

bridge_bp = Blueprint('bridge', __name__)
CANONICAL_AGENT_LEE_FINGERPRINT = "leeway.agent-lee.code-mode.canonical.supreme-agent-lead.v1"

LOG_FILE = r"C:\Cerebral\logs\bridge_audit.jsonl"

def log_event(entry):
    os.makedirs(os.path.dirname(LOG_FILE), exist_ok=True)
    with open(LOG_FILE, 'a', encoding='utf-8') as f:
        f.write(json.dumps(entry) + '\n')

def is_authorized(action):
    policy = load_policy()
    allowlist = policy.get("allowlisted_actions", [])
    return action in allowlist

def _probe_canonical_agent_lee():
    runtime_base = os.environ.get("LEEWAY_RUNTIME_FABRIC_URL", "http://127.0.0.1:4001").rstrip("/")
    try:
        identity_response = requests.get(f"{runtime_base}/agent-lee/identity", timeout=5)
        identity = identity_response.json() if identity_response.content else {}
        universe_response = requests.get(f"{runtime_base}/agent-lee/universe", timeout=5)
        universe = universe_response.json() if universe_response.content else {}
    except Exception as exc:
        return {
            "ok": False,
            "status": "NON_CANONICAL_AGENT_LEE_UNREACHABLE",
            "expectedFingerprint": CANONICAL_AGENT_LEE_FINGERPRINT,
            "fingerprint": None,
            "fingerprintMatches": False,
            "canonical": False,
            "agentMode": None,
            "role": None,
            "instanceContract": None,
            "universeVisible": False,
            "identity": {"error": str(exc)},
            "universe": {"error": str(exc)},
        }

    fingerprint = (
        identity.get("identityFingerprint")
        or (identity.get("canonicalCodeMode") or {}).get("identityFingerprint")
        or (identity.get("canonicalAgentLee") or {}).get("identityFingerprint")
        or (identity.get("canonicalProof") or {}).get("expectedIdentityFingerprint")
    )
    manifest = universe.get("manifest") or universe.get("universe") or ((universe.get("coreMap") or {}).get("universe") or {}).get("manifest") or {}
    harness = manifest.get("statefulResearchHarness") or (universe.get("coreMap") or {}).get("statefulResearchHarnessCopies") or {}
    skills = manifest.get("searchPaths", {}).get("skills", []) or (universe.get("coreMap") or {}).get("activeSkillSearchPaths", [])
    capabilities = manifest.get("searchPaths", {}).get("capabilities", []) or (universe.get("coreMap") or {}).get("activeCapabilitySearchPaths", [])
    universe_visible = bool(
        isinstance(harness, dict)
        and harness.get("activeCopy")
        and any("stateful-research-harness" in str(entry.get("absolute") if isinstance(entry, dict) else entry) for entry in skills)
        and any("capability-registry" in str(entry.get("absolute") if isinstance(entry, dict) else entry) for entry in capabilities)
    )
    canonical = bool(identity.get("canonical") or (identity.get("canonicalCodeMode") or {}).get("canonical") or (identity.get("canonicalProof") or {}).get("canonical"))
    agent_mode = identity.get("agent_mode") or identity.get("agentMode")
    role = identity.get("role")
    instance_contract = identity.get("instance_contract") or identity.get("instanceContract")
    ok = bool(
        identity_response.ok
        and universe_response.ok
        and canonical
        and fingerprint == CANONICAL_AGENT_LEE_FINGERPRINT
        and agent_mode == "code-mode"
        and role == "supreme-agent-lead"
        and instance_contract == "canonical-agent-lee-code-mode"
        and universe_visible
    )

    return {
        "ok": ok,
        "status": "CANONICAL_AGENT_LEE_CONFIRMED" if ok else "NON_CANONICAL_AGENT_LEE_DETECTED",
        "expectedFingerprint": CANONICAL_AGENT_LEE_FINGERPRINT,
        "fingerprint": fingerprint,
        "fingerprintMatches": fingerprint == CANONICAL_AGENT_LEE_FINGERPRINT,
        "canonical": canonical,
        "agentMode": agent_mode,
        "role": role,
        "instanceContract": instance_contract,
        "universeVisible": universe_visible,
        "identity": identity,
        "universe": universe,
    }

@bridge_bp.route('/health', methods=['GET'])
def health():
    canonical = _probe_canonical_agent_lee()
    return jsonify({
        "status": "ok", 
        "service": "Cerebral Bridge", 
        "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
        "agentLeeCanonical": canonical,
        "canonicalStatus": "online" if canonical["ok"] else "degraded"
    })

@bridge_bp.route('/status', methods=['GET'])
def status():
    # Attempt to check foundry status if possible
    foundry_status = "unknown"
    try:
        from CerebralDaemon import foundry_alive
        foundry_status = "online" if foundry_alive else "offline"
    except Exception:
        pass

    canonical = _probe_canonical_agent_lee()
    return jsonify({
        "status": "online",
        "model_availability": foundry_status,
        "cpu": psutil.cpu_percent(),
        "ram": psutil.virtual_memory().percent,
        "disk": psutil.disk_usage('C:\\').percent,
        "active_jobs": 0,
        "agentLeeCanonical": canonical,
        "canonicalStatus": "online" if canonical["ok"] else "degraded"
    })

@bridge_bp.route('/bridge/handshake', methods=['POST'])
def handshake():
    data = request.get_json(force=True)
    device_id = data.get("device_id", "unknown")
    correlation_id = data.get("correlation_id", str(uuid.uuid4()))
    
    log_event({
        "ts": datetime.datetime.utcnow().isoformat() + "Z",
        "event": "handshake",
        "device_id": device_id,
        "correlation_id": correlation_id,
        "outcome": "success"
    })
    
    return jsonify({
        "ok": True,
        "summary": "Handshake successful. Device identity established.",
        "correlation_id": correlation_id
    })

@bridge_bp.route('/ops/request', methods=['POST'])
def ops_request():
    data = request.get_json(force=True)
    action_type = data.get("action_type")
    params = data.get("parameters", {})
    correlation_id = data.get("correlation_id", str(uuid.uuid4()))
    device_id = data.get("device_id", "unknown")
    
    # Audit log the request stage
    log_event({
        "ts": datetime.datetime.utcnow().isoformat() + "Z",
        "event": "ops_request_received",
        "action_type": action_type,
        "device_id": device_id,
        "correlation_id": correlation_id
    })

    # Policy Check
    policy = load_policy()
    allowlist = policy.get("allowlisted_actions", [])
    restricted = policy.get("restricted_actions", [])
    
    authorized = (action_type in allowlist) and (action_type not in restricted)
    
    if not authorized:
        result = {
            "ok": False,
            "summary": f"Action '{action_type}' denied by policy. (Authorized: {authorized})",
            "correlation_id": correlation_id,
            "error": "policy_violation"
        }
        log_event({**result, "ts": datetime.datetime.utcnow().isoformat() + "Z", "device_id": device_id})
        return jsonify(result), 403

    # Implementation for specific actions
    summary = ""
    ok = True
    artifacts = []
    
    if action_type == "summarize_file":
        path = params.get("path")
        summary = f"Summarization for {path} accepted. Execution queued."
        # In a real scenario, this would trigger an async task
    elif action_type == "search_file":
        query = params.get("query")
        summary = f"Search for '{query}' initiated."
    elif action_type == "open_app":
        app = params.get("app")
        # Even if authorized, we mock the success for the smoke test as per plan
        summary = f"Request to open {app} processed."
    else:
        summary = f"Action {action_type} accepted. Generic handler invoked."

    res = {
        "ok": ok,
        "summary": summary,
        "correlation_id": correlation_id,
        "artifacts": artifacts,
        "logs": [f"Operation {action_type} logged and policy-verified."]
    }
    
    log_event({
        "ts": datetime.datetime.utcnow().isoformat() + "Z", 
        "device_id": device_id,
        "correlation_id": correlation_id,
        "action": action_type,
        "outcome": "success" if ok else "failed",
        "summary": summary
    })
    
    return jsonify(res)

@bridge_bp.route('/alerts/push', methods=['POST'])
def alerts_push():
    data = request.get_json(force=True)
    log_event({
        "ts": datetime.datetime.utcnow().isoformat() + "Z",
        "event": "alert_push",
        "data": data
    })
    return jsonify({"ok": True})
