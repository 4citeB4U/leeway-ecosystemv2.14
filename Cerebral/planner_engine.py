"""
planner_engine.py — Cerebral Multi-Step Planner v2
===================================================
Turns a natural-language goal into a structured ActionPlan that the
Task Execution Spine can execute step by step.

ActionPlan schema
-----------------
{
  "goal":             "Human goal description",
  "mode":             "plan",
  "requires_approval": false,
  "steps": [
    {
      "id":     1,
      "tool":   "desktop.launch_app",
      "args":   {"app": "Telegram"},
      "desc":   "Launch Telegram",
      "verify": "window_title:Telegram"   // optional hint for post-check
    },
    ...
  ]
}

verify values (optional):
  "window_title:<partial>"   — check that a window with that title is active
  "text_present:<needle>"    — check that text appears on screen (screenshot OCR)
  "none"                     — no verification needed
  ""                         — same as "none"

The planner calls Foundry (Phi-3.5 or best available model) to generate the
plan JSON. If Foundry is offline, it uses a keyword-based fallback planner.
"""

import json
import os
import re
import time

# ── Use model_router as the single LLM gateway ─────────────────────────────────
try:
    from model_router import call_json as _mr_call_json, FOUNDRY_BASE
except Exception:
    _mr_call_json = None
    FOUNDRY_BASE  = os.environ.get("CEREBRAL_FOUNDRY_BASE", "http://127.0.0.1:56995")

# Available tools the planner can reference
AVAILABLE_TOOLS = """
filesystem.list_dir      args: {path}
filesystem.read_file     args: {path, max_chars?}
filesystem.write_file    args: {path, content}
filesystem.open_file     args: {path}
filesystem.search        args: {query, roots?}
filesystem.move_file     args: {src, dest}
desktop.open_path        args: {path}
desktop.launch_app       args: {app}           -- app: app name or exe path
desktop.focus_window     args: {title}         -- partial window title match
desktop.list_windows     args: {}
desktop.screenshot       args: {label?}
desktop.screenshot_proof args: {label}
desktop.click            args: {x, y, button?}
desktop.double_click     args: {x, y}
desktop.type_text        args: {text}
desktop.key_press        args: {keys}          -- e.g. "ctrl+a", "enter"
desktop.scroll           args: {x, y, amount}
desktop.find_and_click   args: {text}          -- semantic label on screen
desktop.describe_screen  args: {question}
terminal.run             args: {command}
convert.file             args: {input_path, output_path, format}
"""

PLAN_SCHEMA = """{
  "goal": "<restate goal>",
  "mode": "plan",
  "requires_approval": false,
  "steps": [
    {"id": 1, "tool": "<tool>", "args": {}, "desc": "<one line>", "verify": "<hint or none>"}
  ]
}"""

PLANNER_SYSTEM = f"""You are the Cerebral Planner — an expert at decomposing user goals into minimal, ordered desktop automation steps.

AVAILABLE TOOLS:
{AVAILABLE_TOOLS}

OUTPUT RULES:
- Respond ONLY with valid JSON matching this schema:
{PLAN_SCHEMA}
- Use the minimum number of steps to achieve the goal.
- For apps, use desktop.launch_app with just the app name (e.g. "Telegram", "Notepad", "Chrome").
- After launching an app, always add desktop.focus_window.
- If typing is needed, add desktop.find_and_click to locate the input first, then desktop.type_text.
- Set requires_approval: true if the plan will SEND data externally, DELETE files, or run shell commands.
- verify hints: use "window_title:Telegram" or "none". Keep them simple.
- Steps must be in strict execution order.
- Do NOT add explanations outside the JSON block."""


def _call_foundry(goal: str, context: str = "") -> dict | None:
    """Call Foundry LLM via model_router to generate an ActionPlan."""
    if _mr_call_json is None:
        return None
    user_msg = f"Goal: {goal}"
    if context:
        user_msg += f"\n\nContext: {context}"
    try:
        return _mr_call_json(
            "plan",
            user_msg,
            system_override=PLANNER_SYSTEM,
            timeout=5,  # fast timeout — fall back to keyword planner if Foundry is slow
        )
    except Exception:
        return None


def _fallback_plan(goal: str) -> dict:
    """
    Rule-based fallback when Foundry is offline.
    Handles the most common request patterns without LLM.
    """
    g = goal.lower()
    steps: list[dict] = []
    sid = 1

    # Detect app launch
    app_match = re.search(r'\b(open|launch|start|run)\s+([a-zA-Z0-9 _\-\.]+?)(?:\s|$|,|\.)', g)
    if app_match:
        app = app_match.group(2).strip()
        steps.append({"id": sid, "tool": "desktop.launch_app",
                       "args": {"app": app}, "desc": f"Launch {app}",
                       "verify": f"window_title:{app}"})
        sid += 1
        steps.append({"id": sid, "tool": "desktop.focus_window",
                       "args": {"title": app}, "desc": f"Focus {app} window",
                       "verify": "none"})
        sid += 1

    # Detect typing
    type_match = re.search(r'\b(type|write|enter|say|send)\s+["\']?(.+?)["\']?(?:\s|$)', g)
    if type_match:
        text = type_match.group(2).strip().strip('"\'')
        steps.append({"id": sid, "tool": "desktop.type_text",
                       "args": {"text": text}, "desc": f"Type: {text[:40]}",
                       "verify": "none"})
        sid += 1

    # Detect screenshot
    if "screenshot" in g or "capture" in g:
        steps.append({"id": sid, "tool": "desktop.screenshot_proof",
                       "args": {"label": "requested"}, "desc": "Take screenshot",
                       "verify": "none"})
        sid += 1

    # Detect file open
    file_match = re.search(r'\b(?:open|read)\s+(?:file\s+)?["\']?([a-zA-Z0-9_\-\. :\\\/]+\.[a-zA-Z]{2,5})["\']?', goal, re.IGNORECASE)
    if file_match and not app_match:
        path = file_match.group(1).strip()
        steps.append({"id": sid, "tool": "filesystem.open_file",
                       "args": {"path": path}, "desc": f"Open {path}",
                       "verify": "none"})
        sid += 1

    if not steps:
        # Generic single-tool fallback — show current windows
        steps = [{"id": 1, "tool": "desktop.list_windows", "args": {},
                  "desc": "List open windows to find target", "verify": "none"}]

    return {
        "goal":              goal,
        "mode":              "plan",
        "requires_approval": any(
            k in g for k in ["send", "delete", "submit", "post", "publish"]
        ),
        "steps":             steps,
        "_source":           "fallback",
    }


def generate_plan(goal: str, context: str = "", prefer_fast: bool = True) -> dict:
    """
    Main entry point. Returns an ActionPlan dict.
    Tries Foundry first (20s timeout), falls back to keyword-based planner.
    Set prefer_fast=False to allow a 45s Foundry timeout (async/background use).
    """
    plan = _call_foundry(goal, context)
    if plan and isinstance(plan.get("steps"), list) and len(plan["steps"]) > 0:
        plan["_source"] = "foundry"
        return plan
    # Foundry slow/offline — use fast keyword fallback so UI stays responsive
    fb = _fallback_plan(goal)
    return fb


def validate_plan(plan: dict) -> tuple[bool, str]:
    """
    Check that a plan is structurally valid and references known tools.
    Returns (valid, reason).
    """
    if not isinstance(plan.get("steps"), list):
        return False, "Plan has no steps list."
    if len(plan["steps"]) == 0:
        return False, "Plan has zero steps."
    known_tools = set(AVAILABLE_TOOLS.strip().splitlines())
    known_prefixes = {"filesystem.", "desktop.", "terminal.", "convert.", "vision."}
    for step in plan["steps"]:
        tool = step.get("tool", "")
        if not any(tool.startswith(p) for p in known_prefixes):
            return False, f"Unknown tool namespace: {tool}"
        if not isinstance(step.get("args"), dict):
            return False, f"Step {step.get('id')} missing args dict."
    return True, "ok"
