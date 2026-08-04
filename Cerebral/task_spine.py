"""
task_spine.py — Cerebral Task Execution Spine v1
=================================================
The single canonical orchestration path for all non-trivial actions.

Flow
----
  request
    → classify_intent()          4-way: chat / tool / plan / vision
    → if plan: generate_plan()   Foundry or fallback
    → policy_gate()              per-step ALLOW / ALLOW_LOG / APPROVE / DENY
    → execute_plan()             step-by-step with pre/post verification
    → verify_step()              screenshot + window check + retry
    → memory_log()               write execution record
    → SpineResult                structured result with proofs

Usage from CerebralDaemon.py
-----------------------------
  from task_spine import run_spine, Intent

  result = run_spine(message, user_name=..., body_state=..., on_approve=None)
  # result.intent, result.plan, result.steps, result.speak,
  # result.proofs, result.success, result.blocked_by_policy
"""

from __future__ import annotations

import json
import importlib
import os
import re
import time
import threading
from dataclasses import dataclass, field
from typing import Any, Callable, Optional

from planner_engine import generate_plan, validate_plan
from policy_engine import check as policy_check, PolicyTier, get_runtime_integration_status
from tool_router import route as _tool_route, TOOL_CONTRACT_BLOCK
from desktop_hands import get_hands

_runtime_live_bridge = importlib.import_module("runtime_live_bridge")
RuntimeEventNames = _runtime_live_bridge.RuntimeEventNames
append_cerebral_memory = _runtime_live_bridge.append_cerebral_memory
emit_runtime_event = _runtime_live_bridge.emit_runtime_event
get_live_bridge_paths = _runtime_live_bridge.get_live_bridge_paths
record_task_progress = _runtime_live_bridge.record_task_progress
record_transcript = _runtime_live_bridge.record_transcript


# ══════════════════════════════════════════════════════════════════════════════
# Intent classifier
# ══════════════════════════════════════════════════════════════════════════════

class Intent:
    CHAT   = "chat"
    TOOL   = "tool"
    PLAN   = "plan"
    VISION = "vision"


_VISION_RE = re.compile(
    r'\b(camera|webcam|see|look|wearing|wear|outfit|clothes|clothing|'
    r'background|behind me|in front|face|hair|shirt|pants|appearance|describe me|'
    r'what do you see|show me|can you see|what.?s there|who.?s there|'
    r'what am i|how do i look|what color|what colour|look at me|check me out|'
    r'surroundings|room|holding|sitting|standing)\b',
    re.IGNORECASE,
)

_TOOL_RE = re.compile(
    r'\b(open|read|write|save|create|delete|find|search|list|'
    r'launch|start|run|screenshot|convert|compare|summarize|summarise|'
    r'repo.?map|index|file|folder|directory|window|focus|'
    r'click|type|press|drag|scroll|key|keyboard|mouse|'
    r'power.?plan|powercfg|ipconfig|tasklist|control.?panel|task.?manager|'
    r'status|health|port|service|browse|navigate)\b',
    re.IGNORECASE,
)

# Patterns that signal MULTI-STEP intent (→ PLAN mode)
_PLAN_RE = re.compile(
    r'\b(then|after that|and then|next|step|sequence|followed by|'
    r'once you|when done|afterwards|finally|first.*then)\b',
    re.IGNORECASE,
)

# Minimum tool-keyword hits to trigger PLAN (vs. single TOOL)
_PLAN_TOOL_THRESHOLD = 3


def classify_intent(message: str) -> str:
    """
    Classify the request into one of four intents.
    Fast — no LLM call, purely pattern-based.

    Priority:  VISION > PLAN > TOOL > CHAT
    """
    if _VISION_RE.search(message):
        return Intent.VISION

    tool_hits = len(_TOOL_RE.findall(message))

    # Multi-step signal: explicit sequencing words OR many action verbs
    if _PLAN_RE.search(message) or tool_hits >= _PLAN_TOOL_THRESHOLD:
        return Intent.PLAN

    if tool_hits >= 1:
        return Intent.TOOL

    return Intent.CHAT


# ══════════════════════════════════════════════════════════════════════════════
# SpineResult
# ══════════════════════════════════════════════════════════════════════════════

@dataclass
class StepResult:
    step_id:    int
    tool:       str
    args:       dict
    desc:       str
    policy:     str           # ALLOW / ALLOW_LOG / APPROVE / DENY
    ok:         bool
    result:     dict
    pre_proof:  Optional[str] = None  # path to pre-action screenshot
    post_proof: Optional[str] = None  # path to post-action screenshot
    verified:   Optional[bool] = None
    retry_count: int = 0
    error:      Optional[str] = None


@dataclass
class SpineResult:
    intent:             str
    message:            str
    plan:               Optional[dict] = None
    steps:              list[StepResult] = field(default_factory=list)
    speak:              str = ""
    success:            bool = False
    blocked_by_policy:  Optional[str] = None   # tool name that was blocked
    approval_needed:    list[str] = field(default_factory=list)  # tools needing approval
    proofs:             list[str] = field(default_factory=list)  # screenshot paths
    memory_id:          Optional[str] = None
    duration_s:         float = 0.0
    runtime_bridge:     dict = field(default_factory=dict)


# ══════════════════════════════════════════════════════════════════════════════
# Desktop verification helpers
# ══════════════════════════════════════════════════════════════════════════════

def _take_proof_screenshot(
    label: str,
    task_id: str = "",
    step_id: int | None = None,
) -> Optional[str]:
    """Take a screenshot and return its path, or None on failure."""
    try:
        hands = get_hands()
        result = hands.screenshot_proof(label=label)
        proof_path = result.get("path") if result.get("ok") else None
        if proof_path:
            emit_runtime_event(
                RuntimeEventNames.PROOF_CAPTURED,
                {
                    "task_id": task_id,
                    "step_id": step_id,
                    "label": label,
                    "path": proof_path,
                },
            )
        return proof_path
    except Exception:
        return None


def _get_active_window_title() -> str:
    """Return the title of the currently active window."""
    try:
        import win32gui
        hwnd = win32gui.GetForegroundWindow()
        return win32gui.GetWindowText(hwnd)
    except Exception:
        return ""


def _verify_step(step: dict, post_result: dict) -> bool:
    """
    Check that a step succeeded based on its verify hint.
    Returns True if verification passes (or hint is empty/none).
    """
    hint = (step.get("verify") or "none").strip().lower()
    if not hint or hint == "none":
        # No specific check — trust the tool's ok flag
        return post_result.get("ok", False)

    if hint.startswith("window_title:"):
        needle = hint[len("window_title:"):].strip()
        active = _get_active_window_title().lower()
        return needle.lower() in active

    if hint.startswith("text_present:"):
        # Basic: check if the expected text appears in the result description
        needle = hint[len("text_present:"):].strip().lower()
        result_str = json.dumps(post_result).lower()
        return needle in result_str

    # Unknown hint style — trust ok flag
    return post_result.get("ok", False)


# ══════════════════════════════════════════════════════════════════════════════
# Tool executor (single step)
# ══════════════════════════════════════════════════════════════════════════════

def _execute_tool(tool: str, args: dict) -> dict:
    """
    Execute a single tool call directly via the tool_router dispatch table.
    Wraps the router so we can call it without a full LLM response string.
    """
    # Build a minimal TOOL JSON that tool_router expects
    mock_response = json.dumps({
        "mode": "TOOL",
        "intent": tool.split(".")[-1],
        "risk": "low",
        "requires_confirmation": False,
        "tool_calls": [{"tool": tool, "args": args}],
        "speak": {"immediate": "", "final": ""},
    })
    try:
        result = _tool_route(mock_response, {})
        tool_results = result.get("tool_results", [{}])
        return tool_results[0] if tool_results else {"ok": False, "error": "no result"}
    except Exception as e:
        return {"ok": False, "error": str(e)}


# ══════════════════════════════════════════════════════════════════════════════
# Plan executor
# ══════════════════════════════════════════════════════════════════════════════

MAX_RETRIES = 1   # retry each failed step once before reporting failure


def _execute_plan(
    plan: dict,
    on_approve: Optional[Callable[[str, dict], bool]] = None,
    task_id: str = "",
) -> tuple[list[StepResult], list[str], bool, Optional[str]]:
    """
    Execute a multi-step plan.

    Returns:
      (step_results, proof_paths, overall_success, blocked_tool_name)

    on_approve(tool, args) → bool
      Called when a step needs APPROVE tier. If None, approval is denied.
    """
    step_results: list[StepResult] = []
    all_proofs:   list[str]        = []
    blocked_tool: Optional[str]    = None

    steps = plan.get("steps", [])

    for step in steps:
        tool  = step.get("tool", "")
        args  = step.get("args", {})
        desc  = step.get("desc", tool)
        goal  = plan.get("goal", "")

        if task_id:
            record_task_progress(
                task_id,
                "running",
                step_id=step.get("id", 0),
                tool=tool,
                details={"desc": desc, "goal": goal},
            )

        # ── Policy check ──────────────────────────────────────────────────────
        pc = policy_check(tool, args, goal)

        if pc["denied"]:
            sr = StepResult(
                step_id=step.get("id", 0), tool=tool, args=args, desc=desc,
                policy="DENY", ok=False, result={},
                error=f"DENIED by policy: {pc['reason']}",
            )
            step_results.append(sr)
            blocked_tool = tool
            if task_id:
                record_task_progress(
                    task_id,
                    "blocked",
                    step_id=step.get("id", 0),
                    tool=tool,
                    details={"reason": pc["reason"]},
                )
            break   # Hard stop on deny

        if pc["needs_approval"]:
            approved = on_approve(tool, args) if on_approve else False
            if not approved:
                sr = StepResult(
                    step_id=step.get("id", 0), tool=tool, args=args, desc=desc,
                    policy="APPROVE", ok=False, result={},
                    error=f"Step requires approval ({tool}). Not confirmed.",
                )
                step_results.append(sr)
                blocked_tool = tool
                if task_id:
                    record_task_progress(
                        task_id,
                        "approval_required",
                        step_id=step.get("id", 0),
                        tool=tool,
                        details={"reason": f"Approval required for {tool}."},
                    )
                break   # Stop and ask for approval

        # ── Pre-action proof ──────────────────────────────────────────────────
        pre_proof = _take_proof_screenshot(
            f"pre_step{step.get('id',0)}",
            task_id=task_id,
            step_id=step.get("id", 0),
        )
        if pre_proof:
            all_proofs.append(pre_proof)

        # ── Execute with retry ────────────────────────────────────────────────
        result      = {}
        retry_count = 0
        ok          = False

        for attempt in range(MAX_RETRIES + 1):
            result = _execute_tool(tool, args)
            ok     = result.get("ok", False)

            if ok:
                break

            retry_count = attempt + 1
            if retry_count <= MAX_RETRIES:
                time.sleep(1.0)   # Brief pause before retry

        # ── Post-action proof + verify ────────────────────────────────────────
        post_proof = _take_proof_screenshot(
            f"post_step{step.get('id',0)}",
            task_id=task_id,
            step_id=step.get("id", 0),
        )
        if post_proof:
            all_proofs.append(post_proof)

        verified = _verify_step(step, result) if ok else False

        sr = StepResult(
            step_id=step.get("id", 0), tool=tool, args=args, desc=desc,
            policy=pc["tier"], ok=ok, result=result,
            pre_proof=pre_proof, post_proof=post_proof,
            verified=verified, retry_count=retry_count,
            error=result.get("error") if not ok else None,
        )
        step_results.append(sr)

        if task_id:
            record_task_progress(
                task_id,
                "completed" if ok else "failed",
                step_id=step.get("id", 0),
                tool=tool,
                details={
                    "verified": verified,
                    "retry_count": retry_count,
                    "error": sr.error,
                },
            )

        if not ok:
            # Abort plan on step failure
            break

    overall_success = all(sr.ok for sr in step_results) and not blocked_tool
    return step_results, all_proofs, overall_success, blocked_tool


# ══════════════════════════════════════════════════════════════════════════════
# Memory logger
# ══════════════════════════════════════════════════════════════════════════════

def _log_to_memory(result: SpineResult) -> str:
    """
    Write a compact execution record to memory.json.
    Returns the timestamp key used.
    """
    ts = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    entry = {
        "type":     "task_execution",
        "ts":       ts,
        "intent":   result.intent,
        "goal":     result.message[:200],
        "success":  result.success,
        "steps":    len(result.steps),
        "duration": round(result.duration_s, 1),
        "runtime_staged": bool(result.runtime_bridge.get("staged")),
        "proofs":   [os.path.basename(p) for p in result.proofs],
        "speak":    result.speak[:300],
    }
    append_cerebral_memory({"task": entry})
    return ts


# ══════════════════════════════════════════════════════════════════════════════
# Speak composer
# ══════════════════════════════════════════════════════════════════════════════

def _compose_speak(result: SpineResult) -> str:
    """
    Build a concise natural-language summary of what happened.
    No LLM call — deterministic from StepResults.
    """
    if result.blocked_by_policy:
        return (
            f"I stopped before executing '{result.blocked_by_policy}' — "
            f"that step requires your approval. Say 'confirm' to proceed."
        )

    if result.approval_needed:
        tools = ", ".join(result.approval_needed)
        return f"Before I continue, I need your confirmation to: {tools}."

    if not result.steps:
        return "I couldn't generate a valid plan for that request."

    if not result.success:
        failed = [s for s in result.steps if not s.ok]
        if failed:
            f = failed[0]
            return (
                f"Step {f.step_id} failed — {f.desc}. "
                f"Error: {f.error or 'unknown'}. "
                f"{'Retried once.' if f.retry_count else ''}"
            )
        return "The plan did not complete successfully."

    # Success — summarize what was done
    descs = [s.desc for s in result.steps if s.ok]
    proof_note = f" {len(result.proofs)} screenshots saved." if result.proofs else ""
    if len(descs) == 1:
        return f"Done — {descs[0]}.{proof_note}"
    summary = ", then ".join(descs[:-1]) + f", and finally {descs[-1]}"
    return f"Completed {len(descs)} steps: {summary}.{proof_note}"


# ══════════════════════════════════════════════════════════════════════════════
# Main entry point
# ══════════════════════════════════════════════════════════════════════════════

def run_spine(
    message:    str,
    user_name:  str  = "",
    body_state: dict | None = None,
    on_approve: Optional[Callable[[str, dict], bool]] = None,
    context:    str  = "",
) -> SpineResult:
    """
    Full Task Execution Spine — classify → plan → policy → execute → verify → log.

    Parameters
    ----------
    message    : the raw user message
    user_name  : operator name (for memory entries)
    body_state : current system state dict (from get_body_state())
    on_approve : optional callback(tool, args) → bool for APPROVE-tier steps
    context    : extra context string passed to planner for better plans

    Returns
    -------
    SpineResult with all execution data and the speak string for TTS.
    """
    t0     = time.time()
    intent = classify_intent(message)
    task_id = f"task-spine-{int(time.time() * 1000)}"

    result = SpineResult(
        intent=intent,
        message=message,
        runtime_bridge={
            **get_runtime_integration_status(),
            "session_id": task_id,
            "live_bridge_paths": get_live_bridge_paths(),
        },
    )
    record_task_progress(task_id, "classified", details={"intent": intent})
    record_transcript(
        task_id,
        "user",
        message,
        {"intent": intent, "source": "task_spine.py"},
    )

    # ── VISION ────────────────────────────────────────────────────────────────
    if intent == Intent.VISION:
        # Vision is handled by the daemon's own path (OpenCV capture + Phi-3.5).
        # The spine just classifies it and returns a pass-through flag.
        result.speak   = "__VISION__"
        result.success = True
        result.duration_s = time.time() - t0
        record_task_progress(task_id, "completed", details={"intent": intent, "redirect": "vision"})
        return result

    # ── CHAT ──────────────────────────────────────────────────────────────────
    if intent == Intent.CHAT:
        # Fast path — no planning, no tools.
        result.speak   = "__CHAT__"
        result.success = True
        result.duration_s = time.time() - t0
        record_task_progress(task_id, "completed", details={"intent": intent, "redirect": "chat"})
        return result

    # ── TOOL (single action) ──────────────────────────────────────────────────
    if intent == Intent.TOOL:
        # For single-tool requests, pass back to the existing tool_router path.
        result.speak   = "__TOOL__"
        result.success = True
        result.duration_s = time.time() - t0
        record_task_progress(task_id, "completed", details={"intent": intent, "redirect": "tool_router"})
        return result

    # ── PLAN (multi-step) ─────────────────────────────────────────────────────
    plan = generate_plan(message, context=context)
    valid, reason = validate_plan(plan)

    if not valid:
        result.speak      = f"I could not build a valid plan for that: {reason}"
        result.success    = False
        result.duration_s = time.time() - t0
        record_task_progress(task_id, "failed", details={"reason": reason})
        record_transcript(task_id, "assistant", result.speak, {"success": False, "task_id": task_id})
        return result

    result.plan = plan
    record_task_progress(
        task_id,
        "planned",
        details={"goal": plan.get("goal", ""), "steps": len(plan.get("steps", []))},
    )

    # Pre-flight policy check — scan ALL steps for APPROVE/DENY before starting
    approval_needed: list[str] = []
    for step in plan.get("steps", []):
        pc = policy_check(step.get("tool", ""), step.get("args", {}), plan.get("goal", ""))
        if pc["denied"]:
            result.blocked_by_policy = step["tool"]
            result.speak = f"Step '{step['tool']}' is blocked by security policy and cannot be executed."
            result.duration_s = time.time() - t0
            record_task_progress(
                task_id,
                "blocked",
                step_id=step.get("id", 0),
                tool=step.get("tool", ""),
                details={"reason": pc["reason"]},
            )
            record_transcript(task_id, "assistant", result.speak, {"success": False, "task_id": task_id})
            return result
        if pc["needs_approval"]:
            approval_needed.append(step["tool"])

    result.approval_needed = approval_needed

    # If any steps need approval and no on_approve callback, stop and ask
    if approval_needed and on_approve is None:
        result.speak = _compose_speak(result)
        result.duration_s = time.time() - t0
        record_task_progress(
            task_id,
            "approval_required",
            details={"tools": approval_needed},
        )
        record_transcript(task_id, "assistant", result.speak, {"success": False, "task_id": task_id})
        return result

    # Execute the plan
    step_results, proofs, success, blocked = _execute_plan(
        plan,
        on_approve=on_approve,
        task_id=task_id,
    )

    result.steps              = step_results
    result.proofs             = proofs
    result.success            = success
    result.blocked_by_policy  = blocked
    result.speak              = _compose_speak(result)
    result.duration_s         = time.time() - t0
    record_task_progress(
        task_id,
        "completed" if success else "failed",
        details={
            "steps": len(step_results),
            "blocked": blocked,
            "proofs": len(proofs),
        },
    )
    record_transcript(
        task_id,
        "assistant",
        result.speak,
        {
            "success": success,
            "task_id": task_id,
            "proofs": [os.path.basename(path) for path in proofs],
            "step_results": [
                {
                    "step_id": step.step_id,
                    "tool": step.tool,
                    "ok": step.ok,
                    "verified": step.verified,
                    "error": step.error,
                    "pre_proof": os.path.basename(step.pre_proof) if step.pre_proof else None,
                    "post_proof": os.path.basename(step.post_proof) if step.post_proof else None,
                }
                for step in step_results
            ],
        },
    )

    # Memory log
    try:
        result.memory_id = _log_to_memory(result)
    except Exception:
        pass

    return result


# ══════════════════════════════════════════════════════════════════════════════
# Convenience: serialize a SpineResult to a JSON-safe dict
# ══════════════════════════════════════════════════════════════════════════════

def spine_result_to_dict(r: SpineResult) -> dict:
    return {
        "intent":            r.intent,
        "success":           r.success,
        "speak":             r.speak,
        "plan_goal":         (r.plan or {}).get("goal", ""),
        "plan_source":       (r.plan or {}).get("_source", ""),
        "steps":             [
            {
                "id":       s.step_id,
                "tool":     s.tool,
                "desc":     s.desc,
                "policy":   s.policy,
                "ok":       s.ok,
                "verified": s.verified,
                "retries":  s.retry_count,
                "pre_proof":  os.path.basename(s.pre_proof) if s.pre_proof else None,
                "post_proof": os.path.basename(s.post_proof) if s.post_proof else None,
                "error":    s.error,
            }
            for s in r.steps
        ],
        "proofs":            [os.path.basename(p) for p in r.proofs],
        "blocked_by_policy": r.blocked_by_policy,
        "approval_needed":   r.approval_needed,
        "runtime_bridge":    r.runtime_bridge,
        "duration_s":        round(r.duration_s, 2),
        "memory_id":         r.memory_id,
    }
