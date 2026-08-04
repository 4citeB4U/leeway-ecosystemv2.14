import json
import os
import threading
import time
from typing import Any, Callable

from memory_engine import append_memory

ROOT = os.path.dirname(__file__)
LOG_DIR = os.path.join(ROOT, "logs")
RUNTIME_EVENT_LOG = os.path.join(LOG_DIR, "runtime_events.jsonl")
RUNTIME_PROGRESS_LOG = os.path.join(LOG_DIR, "runtime_progress.jsonl")
RUNTIME_SESSION_LOG = os.path.join(LOG_DIR, "runtime_sessions.jsonl")
RUNTIME_STATE_FILE = os.path.join(LOG_DIR, "runtime_state.json")

_LOCK = threading.Lock()


class RuntimeEventNames:
    TASK_REQUESTED = "cerebral.task.requested"
    TOOL_EVALUATED = "cerebral.tool.evaluated"
    TOOL_APPROVED = "cerebral.tool.approved"
    TOOL_BLOCKED = "cerebral.tool.blocked"
    TOOL_DELEGATED = "cerebral.tool.delegated"
    PROOF_CAPTURED = "cerebral.proof.captured"
    TRACE_RECORDED = "cerebral.trace.recorded"


def get_live_bridge_paths() -> dict:
    return {
        "event_log": RUNTIME_EVENT_LOG,
        "progress_log": RUNTIME_PROGRESS_LOG,
        "session_log": RUNTIME_SESSION_LOG,
        "state_file": RUNTIME_STATE_FILE,
    }


def append_cerebral_memory(entry: dict) -> dict:
    append_memory(entry)
    return entry


def emit_runtime_event(event_name: str, payload: dict | None = None) -> dict:
    entry = {
        "ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "event": event_name,
        "payload": payload or {},
    }
    _append_ndjson(RUNTIME_EVENT_LOG, entry)
    return entry


def record_task_progress(
    task_id: str,
    status: str,
    step_id: int | None = None,
    tool: str | None = None,
    details: dict | None = None,
) -> dict:
    entry = {
        "ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "task_id": task_id,
        "status": status,
        "step_id": step_id,
        "tool": tool,
        "details": details or {},
    }
    _append_ndjson(RUNTIME_PROGRESS_LOG, entry)
    project_task_state(task_id, status, step_id=step_id, tool=tool, details=details)

    if status in {"queued", "classified", "planned"}:
        emit_runtime_event(RuntimeEventNames.TASK_REQUESTED, entry)
    elif status in {"blocked", "approval_required"}:
        emit_runtime_event(RuntimeEventNames.TOOL_BLOCKED, entry)
    elif status == "running":
        emit_runtime_event(RuntimeEventNames.TOOL_DELEGATED, entry)
    else:
        emit_runtime_event(RuntimeEventNames.TRACE_RECORDED, entry)

    return entry


def project_task_state(
    task_id: str,
    status: str,
    step_id: int | None = None,
    tool: str | None = None,
    details: dict | None = None,
) -> dict:
    return _update_projection(
        "tasks",
        task_id,
        {
            "task_id": task_id,
            "status": status,
            "step_id": step_id,
            "tool": tool,
            "details": details or {},
            "projection_only": True,
            "source_of_truth": "task_spine.py",
            "updated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        },
    )


def project_agent_state(
    agent_session_id: str,
    status: str,
    details: dict | None = None,
) -> dict:
    return _update_projection(
        "agents",
        agent_session_id,
        {
            "agent_session_id": agent_session_id,
            "status": status,
            "details": details or {},
            "projection_only": True,
            "source_of_truth": "CerebralDaemon.py",
            "updated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        },
    )


def record_transcript(
    session_id: str,
    role: str,
    content: str,
    metadata: dict | None = None,
) -> dict | None:
    content = (content or "").strip()
    if not content:
        return None

    entry = {
        "ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "session_id": session_id,
        "role": role,
        "content": content,
        "metadata": metadata or {},
        "storage": "memory_engine.py",
    }
    append_cerebral_memory({"runtime_transcript": entry})
    _append_ndjson(RUNTIME_SESSION_LOG, entry)
    return entry


def invoke_agent_tool(
    agent_name: str,
    tool_name: str,
    args: dict | None,
    goal: str,
    runner: Callable[[], Any],
    approved: bool = False,
    parent_session_id: str | None = None,
) -> dict:
    from policy_engine import check as policy_check

    safe_args = args if isinstance(args, dict) else {}
    session_id = parent_session_id or f"agent:{agent_name}:{int(time.time() * 1000)}"
    policy_tool = "subagent.launch" if parent_session_id else f"agent.{agent_name}.{tool_name}"
    effective_goal = (goal or f"Run agent {agent_name}.{tool_name}").strip()

    record_transcript(
        session_id,
        "user",
        effective_goal,
        {
            "agent": agent_name,
            "tool": tool_name,
            "args": safe_args,
            "launch_type": "subagent" if parent_session_id else "agent",
        },
    )
    emit_runtime_event(
        RuntimeEventNames.TASK_REQUESTED,
        {
            "session_id": session_id,
            "agent": agent_name,
            "tool": tool_name,
            "goal": effective_goal,
        },
    )
    project_agent_state(
        session_id,
        "queued",
        {
            "agent": agent_name,
            "tool": tool_name,
            "goal": effective_goal,
        },
    )

    decision = policy_check(policy_tool, safe_args, effective_goal)
    emit_runtime_event(
        RuntimeEventNames.TOOL_EVALUATED,
        {
            "session_id": session_id,
            "agent": agent_name,
            "tool": tool_name,
            "tier": decision["tier"],
            "goal": effective_goal,
        },
    )

    if decision["denied"] or (decision["needs_approval"] and not approved):
        blocked_state = "approval_required" if decision["needs_approval"] else "blocked"
        project_agent_state(
            session_id,
            blocked_state,
            {
                "agent": agent_name,
                "tool": tool_name,
                "tier": decision["tier"],
                "reason": decision["reason"],
            },
        )
        emit_runtime_event(
            RuntimeEventNames.TOOL_BLOCKED,
            {
                "session_id": session_id,
                "agent": agent_name,
                "tool": tool_name,
                "tier": decision["tier"],
                "reason": decision["reason"],
            },
        )
        record_transcript(
            session_id,
            "assistant",
            decision["reason"],
            {
                "agent": agent_name,
                "tool": tool_name,
                "tier": decision["tier"],
                "blocked": True,
            },
        )
        return {
            "ok": False,
            "agent": agent_name,
            "tool": tool_name,
            "error": decision["reason"],
            "needs_approval": decision["needs_approval"],
            "denied": decision["denied"],
            "policy_tier": decision["tier"],
            "session_id": session_id,
            "runtime_projection": get_live_bridge_paths(),
        }

    project_agent_state(
        session_id,
        "running",
        {
            "agent": agent_name,
            "tool": tool_name,
            "tier": decision["tier"],
        },
    )
    emit_runtime_event(
        RuntimeEventNames.TOOL_APPROVED,
        {
            "session_id": session_id,
            "agent": agent_name,
            "tool": tool_name,
            "tier": decision["tier"],
        },
    )

    raw_result = runner()
    result = raw_result if isinstance(raw_result, dict) else {"ok": True, "result": raw_result}
    ok = bool(result.get("ok", False))
    final_status = "completed" if ok else "failed"

    project_agent_state(
        session_id,
        final_status,
        {
            "agent": agent_name,
            "tool": tool_name,
            "ok": ok,
        },
    )
    emit_runtime_event(
        RuntimeEventNames.TOOL_DELEGATED,
        {
            "session_id": session_id,
            "agent": agent_name,
            "tool": tool_name,
            "ok": ok,
        },
    )
    record_transcript(
        session_id,
        "assistant",
        json.dumps(result, ensure_ascii=True)[:2000],
        {
            "agent": agent_name,
            "tool": tool_name,
            "policy_tier": decision["tier"],
            "ok": ok,
        },
    )

    result.update(
        {
            "policy_tier": decision["tier"],
            "session_id": session_id,
            "runtime_projection": get_live_bridge_paths(),
        }
    )
    return result


def _append_ndjson(path: str, entry: dict) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with _LOCK:
        with open(path, "a", encoding="utf-8") as handle:
            handle.write(json.dumps(entry, ensure_ascii=True) + "\n")


def _read_json(path: str, default: dict) -> dict:
    if not os.path.exists(path):
        return dict(default)
    try:
        with open(path, "r", encoding="utf-8") as handle:
            data = json.load(handle)
        return data if isinstance(data, dict) else dict(default)
    except Exception:
        return dict(default)


def _update_projection(section: str, key: str, value: dict) -> dict:
    os.makedirs(LOG_DIR, exist_ok=True)
    with _LOCK:
        state = _read_json(
            RUNTIME_STATE_FILE,
            {
                "projection_only": True,
                "tasks": {},
                "agents": {},
            },
        )
        state.setdefault("projection_only", True)
        state.setdefault("tasks", {})
        state.setdefault("agents", {})
        state[section][key] = value
        state["updated_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        with open(RUNTIME_STATE_FILE, "w", encoding="utf-8") as handle:
            json.dump(state, handle, indent=2)
    return value