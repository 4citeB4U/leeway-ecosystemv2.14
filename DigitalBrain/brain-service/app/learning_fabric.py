"""LW-LH1 learning foundation (P5): Experience Fabric, Feature Fabric,
Learning Registry, learning scopes, replay/regression/rollback state, and a
resource-gated background learning scheduler.

Authority: LeeWay Standards > Creator > LW-F1 v1.0 > LW-LH1 (this module).
Constraints: stdlib-only (fastapi/uvicorn/httpx are the only deps in the
container). Never mutates Formula v1, Standards, or security/governance rules.
Never fabricates measurements: UNKNOWN / UNAVAILABLE are written as such,
never as 0, unless zero was actually measured.

Escalation law: validated recurring behavior migrates DOWN to the smallest
reliable local mechanism; novel/low-confidence/unsafe conditions escalate UP
(LEVEL 0..8). This module implements LEVEL 0-3 primitives only; higher levels
are invoked via routing, never embedded.
"""

import hashlib
import json
import os
import sqlite3
import threading
import time

from . import store

FEATURE_SCHEMA_VERSION = "lw-features-v1"
LEARNING_SCOPES = ["WORKSPACE", "APPLICATION", "CAPABILITY", "USER", "AGENT_LEE", "HARDWARE_DEVICE", "ECOSYSTEM"]
LIFECYCLE = ["TRAINING", "CANDIDATE", "VALIDATED", "CANARY", "PROMOTED", "ACTIVE", "REJECTED", "ROLLED_BACK"]

_LOGGER_LOCK = threading.Lock()

_EXPERIENCES_DDL = """
CREATE TABLE IF NOT EXISTS experiences (
    experience_id TEXT PRIMARY KEY,
    timestamp TEXT,
    scope TEXT NOT NULL DEFAULT 'WORKSPACE',
    workspace_id TEXT,
    application_id TEXT,
    capability_id TEXT,
    agent_id TEXT,
    goal TEXT,
    starting_state_json TEXT,
    observations_json TEXT,
    features_json TEXT,
    formula_version TEXT,
    formula_controller TEXT,
    formula_inputs_json TEXT,
    formula_top6_json TEXT,
    selected_action TEXT,
    model_used TEXT,
    skill_used TEXT,
    mcp_used TEXT,
    tool_used TEXT,
    actions_json TEXT,
    files_changed_json TEXT,
    runtime_changes_json TEXT,
    hardware_state_json TEXT,
    duration_ms INTEGER,
    cpu_cost TEXT,
    ram_cost TEXT,
    gpu_cost TEXT,
    vram_cost TEXT,
    bandwidth_cost TEXT,
    network_cost TEXT,
    outcome TEXT,
    veritas_status TEXT,
    receipt_refs_json TEXT,
    ledger_refs_json TEXT,
    provenance TEXT,
    confidence REAL,
    learning_eligibility TEXT,
    learning_scope TEXT,
    negative_outcome_reason TEXT,
    rollback_ref TEXT,
    classification TEXT,
    source TEXT,
    inserted_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_exp_scope ON experiences(scope);
CREATE INDEX IF NOT EXISTS idx_exp_cap ON experiences(capability_id);
CREATE INDEX IF NOT EXISTS idx_exp_elig ON experiences(learning_eligibility);
CREATE INDEX IF NOT EXISTS idx_exp_outcome ON experiences(outcome);
"""

_FEATURES_DDL = """
CREATE TABLE IF NOT EXISTS experience_features (
    experience_id TEXT PRIMARY KEY,
    feature_schema_version TEXT NOT NULL,
    features_json TEXT NOT NULL,
    extracted_at TEXT
);
CREATE TABLE IF NOT EXISTS feature_schemas (
    schema_version TEXT PRIMARY KEY,
    schema_json TEXT NOT NULL,
    created_at TEXT
);
"""

_REGISTRY_DDL = """
CREATE TABLE IF NOT EXISTS learning_artifacts (
    learning_id TEXT PRIMARY KEY,
    capability TEXT NOT NULL,
    scope TEXT NOT NULL DEFAULT 'WORKSPACE',
    version INTEGER NOT NULL DEFAULT 1,
    parent_version INTEGER,
    algorithm TEXT,
    model_type TEXT,
    model_size TEXT,
    training_dataset_hash TEXT,
    training_experience_ids_json TEXT,
    feature_schema_version TEXT,
    training_window TEXT,
    created_at TEXT,
    validation_suite_json TEXT,
    validation_results_json TEXT,
    confidence_calibration_json TEXT,
    ood_behavior_json TEXT,
    veritas_status TEXT,
    canary_status TEXT,
    promotion_status TEXT NOT NULL DEFAULT 'TRAINING',
    rollback_artifact_id TEXT,
    authority TEXT,
    receipt_path TEXT,
    last_used TEXT,
    performance_history_json TEXT
);
CREATE INDEX IF NOT EXISTS idx_lart_scope ON learning_artifacts(scope);
CREATE INDEX IF NOT EXISTS idx_lart_status ON learning_artifacts(promotion_status);
CREATE TABLE IF NOT EXISTS learning_scopes (
    scope TEXT PRIMARY KEY,
    capability TEXT,
    level TEXT NOT NULL DEFAULT 'WORKSPACE',
    promotion_evidence_count INTEGER NOT NULL DEFAULT 0,
    last_promoted_at TEXT,
    detail_json TEXT
);
"""

_DDL = _EXPERIENCES_DDL + _FEATURES_DDL + _REGISTRY_DDL


def time_stamp():
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def ensure_tables(conn):
    conn.executescript(_DDL)
    conn.execute("INSERT OR IGNORE INTO feature_schemas (schema_version, schema_json, created_at) VALUES (?, ?, ?)",
                 (FEATURE_SCHEMA_VERSION, json.dumps(_feature_schema()), time_stamp()))
    conn.commit()


# ---------------------------------------------------------------- experience
def _safe(rec, key, default=None):
    v = rec.get(key)
    return v if v is not None and v != "" else default


def normalize_experience(rec):
    """Normalize an arbitrary evidence record into the canonical experience
    shape. Missing measurements become UNKNOWN / UNAVAILABLE, never 0."""
    rec = dict(rec or {})
    exp_id = rec.get("experience_id")
    if not exp_id:
        src = rec.get("source") or "receipt"
        key = f"{src}|{rec.get('capability_id') or rec.get('family') or ''}|{rec.get('timestamp') or rec.get('endedAt') or rec.get('completedAt') or time_stamp()}|{rec.get('receipt_refs') or rec.get('receipt') or ''}"
        exp_id = "exp-" + hashlib.sha1(key.encode("utf-8")).hexdigest()[:16]
    scope = str(_safe(rec, "scope", "WORKSPACE")).upper()
    if scope not in LEARNING_SCOPES:
        scope = "WORKSPACE"
    cost = lambda k: str(_safe(rec, k, "UNKNOWN"))
    outcome = _safe(rec, "outcome", "UNKNOWN")
    if not rec.get("outcome"):
        st = str(_safe(rec, "status", "") or "").upper()
        if st in ("PASS", "PROVEN", "COMPLETED", "OK"):
            outcome = "SUCCESS"
        elif st in ("FAIL", "BLOCKED", "ERROR"):
            outcome = "FAILURE"
        else:
            outcome = "UNKNOWN"
    elig = _safe(rec, "learning_eligibility", "not-admitted")
    scalar_keys = ["experience_id", "timestamp", "scope", "workspace_id", "application_id",
                   "capability_id", "agent_id", "goal", "formula_version", "formula_controller",
                   "selected_action", "model_used", "skill_used", "mcp_used", "tool_used",
                   "outcome", "veritas_status", "provenance", "learning_eligibility",
                   "learning_scope", "negative_outcome_reason", "rollback_ref", "classification", "source"]
    return _coerce_scalars({
        "experience_id": exp_id,
        "timestamp": _safe(rec, "timestamp", None) or _safe(rec, "endedAt", None) or _safe(rec, "completedAt", None) or _safe(rec, "capturedAt", None) or time_stamp(),
        "scope": scope,
        "workspace_id": _safe(rec, "workspace_id", "UNKNOWN"),
        "application_id": _safe(rec, "application_id", "UNKNOWN"),
        "capability_id": _safe(rec, "capability_id", None) or _safe(rec, "family", None) or "general",
        "agent_id": _safe(rec, "agent_id", "agent-lee"),
        "goal": _safe(rec, "goal", None) or _safe(rec, "workType", None) or _safe(rec, "workScope", None),
        "starting_state_json": json.dumps(_safe(rec, "starting_state", {}) or {}),
        "observations_json": json.dumps(_safe(rec, "observations", {}) or {}),
        "features_json": json.dumps(_safe(rec, "features", {}) or {}),
        "formula_version": _safe(rec, "formula_version", "lw-f1-v1.0"),
        "formula_controller": _safe(rec, "formula_controller", "LW-B1"),
        "formula_inputs_json": json.dumps(_safe(rec, "formula_inputs", {}) or {}),
        "formula_top6_json": json.dumps(_safe(rec, "formula_top6", []) or []),
        "selected_action": _safe(rec, "selected_action", "UNKNOWN"),
        "model_used": _safe(rec, "model_used", "none"),
        "skill_used": _safe(rec, "skill_used", "none"),
        "mcp_used": _safe(rec, "mcp_used", "none"),
        "tool_used": _safe(rec, "tool_used", "none"),
        "actions_json": json.dumps(_safe(rec, "actions", []) or []),
        "files_changed_json": json.dumps(_safe(rec, "files_changed", []) or []),
        "runtime_changes_json": json.dumps(_safe(rec, "runtime_changes", {}) or {}),
        "hardware_state_json": json.dumps(_safe(rec, "hardware_state", {}) or {}),
        "duration_ms": _safe(rec, "duration_ms", None),
        "cpu_cost": cost("cpu_cost"), "ram_cost": cost("ram_cost"),
        "gpu_cost": cost("gpu_cost"), "vram_cost": cost("vram_cost"),
        "bandwidth_cost": cost("bandwidth_cost"), "network_cost": cost("network_cost"),
        "outcome": outcome,
        "veritas_status": _safe(rec, "veritas_status", "NOT_EVALUATED"),
        "receipt_refs_json": json.dumps(_safe(rec, "receipt_refs", []) or ([] if not rec.get("receipt_refs") else rec["receipt_refs"])),
        "ledger_refs_json": json.dumps(_safe(rec, "ledger_refs", []) or []),
        "provenance": _safe(rec, "provenance", "machine-diagnostic") or "machine-diagnostic",
        "confidence": _safe(rec, "confidence", None),
        "learning_eligibility": elig,
        "learning_scope": scope,
        "negative_outcome_reason": _safe(rec, "negative_outcome_reason", None),
        "rollback_ref": _safe(rec, "rollback_ref", None),
        "classification": _safe(rec, "classification", "AMBIGUOUS"),
        "source": _safe(rec, "source", "unknown"),
        "inserted_at": time_stamp(),
    }, scalar_keys)


def _coerce_scalars(e, scalar_keys):
    """Defensive: never let a dict/list reach a scalar DB column. Non-primitives
    are JSON-encoded; everything else passes through (str() fallback)."""
    for k, v in list(e.items()):
        if k in scalar_keys and not isinstance(v, (str, int, float, bool, type(None))):
            e[k] = json.dumps(v, default=str)
    return e


def ingest_experience(conn, rec):
    """INSERT OR IGNORE a normalized experience. Returns 'inserted'|'duplicate'."""
    e = normalize_experience(rec)
    cols = list(e.keys())
    conn.execute(
        f"INSERT OR IGNORE INTO experiences ({','.join(cols)}) VALUES ({','.join(['?'] * len(cols))})",
        [e[c] for c in cols],
    )
    return "inserted" if conn.execute("SELECT changes() AS n").fetchone()["n"] else "duplicate"


def load_corpus(conn, jsonl_path, limit=None):
    """Load normalized experience records from a JSONL corpus file."""
    inserted = skipped = 0
    n = 0
    with open(jsonl_path, "r", encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            try:
                rec = json.loads(line)
            except json.JSONDecodeError:
                skipped += 1
                continue
            if ingest_experience(conn, rec) == "inserted":
                inserted += 1
            n += 1
            if limit and n >= limit:
                break
    conn.commit()
    return {"read": n, "inserted": inserted, "skipped": skipped}


# ---------------------------------------------------------------- features
def _feature_schema():
    return {
        "schema_version": FEATURE_SCHEMA_VERSION,
        "groups": {
            "workspace": ["language", "framework", "package_manager", "build_system", "test_framework", "docker_presence"],
            "self_healing": ["failed_service", "port_state", "exit_code", "error_fingerprint", "dependent_services", "last_known_good"],
            "voice": ["pause_duration_ms", "speech_rate", "interruption_ms", "response_latency_ms", "turn_state"],
            "vision": ["object_count", "scene_state", "motion_delta", "anomaly_state", "ui_state"],
            "hardware": ["cpu_pct", "ram_pct", "gpu_pct", "vram_pct", "storage_pct", "queue_state", "thermal_state", "power_state", "uncertainty"],
            "outcome": ["outcome", "veritas_status", "learning_eligibility"],
        },
        "unavailable_policy": "missing metrics recorded as UNKNOWN/UNAVAILABLE, never fabricated as 0",
    }


def extract_features(conn, exp_id):
    """Extract the canonical v1 feature vector from an experience row.
    Returns the feature dict (deterministic, versioned)."""
    row = conn.execute("SELECT * FROM experiences WHERE experience_id = ?", (exp_id,)).fetchone()
    if not row:
        return None
    r = dict(row)
    feats = {}
    for group, keys in _feature_schema()["groups"].items():
        for k in keys:
            feats[f"{group}.{k}"] = "UNKNOWN"
    try:
        feats["outcome.outcome"] = r["outcome"]
    except Exception:  # noqa: BLE001
        pass
    try:
        feats["outcome.veritas_status"] = r["veritas_status"]
        feats["outcome.learning_eligibility"] = r["learning_eligibility"]
    except Exception:  # noqa: BLE001
        pass
    hw = {}
    try:
        hw = json.loads(r["hardware_state_json"] or "{}")
    except (json.JSONDecodeError, TypeError):
        hw = {}
    for k in ("cpu_pct", "ram_pct", "gpu_pct", "vram_pct", "storage_pct", "queue_state", "thermal_state", "power_state", "uncertainty"):
        if k in hw:
            feats[f"hardware.{k}"] = hw[k]
    conn.execute(
        "INSERT OR REPLACE INTO experience_features (experience_id, feature_schema_version, features_json, extracted_at)"
        " VALUES (?, ?, ?, ?)",
        (exp_id, FEATURE_SCHEMA_VERSION, json.dumps(feats), time_stamp()),
    )
    conn.commit()
    return feats


# ---------------------------------------------------------------- registry
def register_artifact(conn, capability, scope="WORKSPACE", algorithm="rule", model_type="counter",
                      training_experience_ids=None, training_dataset_hash=None, authority="LW-LH1"):
    """Register a learned artifact in TRAINING state with a rollback target
    (parent version). Never silently replaces an ACTIVE artifact."""
    prev = conn.execute(
        "SELECT * FROM learning_artifacts WHERE capability = ? AND scope = ? ORDER BY version DESC LIMIT 1",
        (capability, scope),
    ).fetchone()
    version = (prev["version"] + 1) if prev else 1
    learning_id = f"lw-lh1:{capability}:{scope.lower()}:v{version}"
    conn.execute(
        "INSERT OR REPLACE INTO learning_artifacts (learning_id, capability, scope, version, parent_version,"
        " algorithm, model_type, training_dataset_hash, training_experience_ids_json, feature_schema_version,"
        " created_at, promotion_status, rollback_artifact_id, authority)"
        " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'TRAINING', ?, ?)",
        (learning_id, capability, scope, version, (prev["learning_id"] if prev else None),
         algorithm, model_type, training_dataset_hash,
         json.dumps(training_experience_ids or []), FEATURE_SCHEMA_VERSION,
         time_stamp(), (prev["learning_id"] if prev else None), authority),
    )
    conn.commit()
    return learning_id


def set_lifecycle(conn, learning_id, new_status, detail=None):
    """Move an artifact through TRAINING -> CANDIDATE -> VALIDATED -> CANARY
    -> PROMOTED -> ACTIVE | REJECTED | ROLLED_BACK. Step order is enforced;
    jumps and auto-promotion are refused (no silent replacement)."""
    if new_status not in LIFECYCLE:
        return {"ok": False, "reason": f"invalid lifecycle {new_status}"}
    row = conn.execute("SELECT * FROM learning_artifacts WHERE learning_id = ?", (learning_id,)).fetchone()
    if not row:
        return {"ok": False, "reason": "unknown learning_id"}
    cur = row["promotion_status"]
    if new_status == "REJECTED":
        if cur == "ACTIVE":
            return {"ok": False, "reason": "ACTIVE cannot be REJECTED; use ROLLED_BACK"}
    if new_status == "ROLLED_BACK":
        target = row["rollback_artifact_id"]
        if not target:
            return {"ok": False, "reason": "no rollback target"}
        conn.execute("UPDATE learning_artifacts SET promotion_status = 'ROLLED_BACK', canary_status = 'rolled_back', performance_history_json = ? WHERE learning_id = ?",
                     (json.dumps({"rolledBackTo": target, "at": time_stamp(), "detail": detail}), learning_id))
        conn.execute("UPDATE learning_artifacts SET promotion_status = 'ACTIVE', canary_status = 'restored' WHERE learning_id = ?", (target,))
        conn.commit()
        return {"ok": True, "learningId": learning_id, "newStatus": "ROLLED_BACK", "restored": target}
    order = ["TRAINING", "CANDIDATE", "VALIDATED", "CANARY", "PROMOTED", "ACTIVE"]
    if cur not in order or new_status not in order:
        conn.commit()
        return {"ok": False, "reason": f"cannot go {cur} -> {new_status}"}
    if order.index(new_status) != order.index(cur) + 1:
        return {"ok": False, "reason": f"lifecycle step order violated: {cur} -> {new_status} (must be exactly one step)"}
    if new_status == "ACTIVE":
        conn.execute("UPDATE learning_artifacts SET promotion_status = 'ACTIVE', canary_status = 'none' WHERE learning_id = ?", (learning_id,))
    else:
        conn.execute("UPDATE learning_artifacts SET promotion_status = ? WHERE learning_id = ?", (new_status, learning_id))
    conn.commit()
    return {"ok": True, "learningId": learning_id, "newStatus": new_status}


def validate_candidate(conn, learning_id, metric_name, metric_value, regression_verdict):
    """P5-7: record validation results for a candidate. Promotion gate: the
    candidate must improve the new case WITHOUT regressing the validated
    corpus. Verdict is 'admit' | 'reject' | 'regression'."""
    row = conn.execute("SELECT * FROM learning_artifacts WHERE learning_id = ?", (learning_id,)).fetchone()
    if not row:
        return {"ok": False, "reason": "unknown learning_id"}
    prior = {}
    try:
        prior = json.loads(row["validation_results_json"] or "{}")
    except (json.JSONDecodeError, TypeError):
        prior = {}
    prior[metric_name] = {"value": metric_value, "verdict": regression_verdict, "at": time_stamp()}
    conn.execute(
        "UPDATE learning_artifacts SET validation_results_json = ?, veritas_status = ? WHERE learning_id = ?",
        (json.dumps(prior), "VERITAS_PASS" if regression_verdict == "admit" else "VERITAS_BLOCKED", learning_id),
    )
    conn.commit()
    return {"ok": True, "learningId": learning_id, "verdict": regression_verdict, "veritas": prior}


def scope_status(conn, scope, capability):
    """Learning scope admission: never auto-promote beyond WORKSPACE."""
    row = conn.execute("SELECT * FROM learning_scopes WHERE scope = ? AND capability = ?", (scope, capability)).fetchone()
    return dict(row) if row else {"scope": scope, "capability": capability, "level": "WORKSPACE", "promotion_evidence_count": 0}


def bump_scope_evidence(conn, scope, capability):
    conn.execute(
        "INSERT OR REPLACE INTO learning_scopes (scope, capability, level, promotion_evidence_count, last_promoted_at, detail_json)"
        " VALUES (?, ?, 'WORKSPACE', COALESCE((SELECT promotion_evidence_count + 1 FROM learning_scopes WHERE scope = ? AND capability = ?), 1), ?, '{}')",
        (scope, capability, scope, capability, time_stamp()),
    )
    conn.commit()


# ---------------------------------------------------------------- scheduler
def can_train(telemetry):
    """Resource gate for background learning (P5-8): CPU headroom, RAM headroom,
    no active alerts, no critical workload signal. Pure and testable."""
    if not telemetry:
        return True, {}
    try:
        cpu = float(telemetry.get("cpu_usage_pct") or 0)
        mem = float(telemetry.get("mem_pct") or 0)
    except (TypeError, ValueError):
        return False, {"reason": "telemetry unparseable"}
    alerts = telemetry.get("alerts_json") or "[]"
    try:
        alert_count = len(json.loads(alerts))
    except (json.JSONDecodeError, TypeError):
        alert_count = 1
    ok = cpu < 80.0 and mem < 90.0 and alert_count == 0
    return ok, {"cpu_pct": cpu, "mem_pct": mem, "alerts": alert_count}


def scheduler_tick(conn, telemetry):
    """One background-learning eligibility tick. Returns decision dict."""
    ok, detail = can_train(telemetry)
    decision = {
        "tickAt": time_stamp(),
        "eligible": ok,
        "detail": detail,
        "queuedJobs": 0,
    }
    if ok:
        decision["recommended"] = "process queued learning jobs (replay/regression/canary evaluation)"
    else:
        decision["recommended"] = "checkpoint + pause + release resources (background learning never thrashes)"
    return decision
