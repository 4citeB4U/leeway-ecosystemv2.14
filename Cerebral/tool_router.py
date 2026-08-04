"""
tool_router.py — Cerebral Tool-First Router
=============================================
Intercepts the LLM's response, parses the structured JSON tool plan,
and dispatches to local bridges (filesystem, DesktopHands, converters).

RESPONSE CONTRACT
-----------------
Cerebral must output ONE of:

  Mode A — TALK (informational)
  {
    "mode": "TALK",
    "speak": { "immediate": "..." }
  }

  Mode B — TOOL (actionable)
  {
    "mode": "TOOL",
    "intent": "open_file | list_dir | read_file | write_file | summarize_file |
                compare_files | map_repo | search_files | launch_app |
                open_path | focus_window | screenshot | list_windows |
                capture_camera |
                convert_file | resample_audio | resize_image |
                open_file | diff_files",
    "risk": "low | medium | high",
    "requires_confirmation": false,
    "tool_calls": [
      { "tool": "...", "args": { ... } }
    ],
    "speak": {
      "immediate": "Acknowledged. Executing now.",
      "final": "Done. Here is what I found..."
    }
  }

If the model returns natural language (no JSON), the router treats it as
TALK mode — text is passed through unchanged.
"""

import json
import importlib
import os
import re
from typing import Optional


# ── Import local bridges ──────────────────────────────────────────────────────
from file_indexer import (
    build_repo_map, search_index, summarise_file, compare_files, load_index
)
from desktop_hands import get_hands
from convert_tools import convert
from body_state import WORKSPACE_ROOTS
from policy_engine import check as policy_check, get_runtime_integration_status

_runtime_live_bridge = importlib.import_module("runtime_live_bridge")
emit_runtime_event = _runtime_live_bridge.emit_runtime_event
RuntimeEventNames = _runtime_live_bridge.RuntimeEventNames


# ── JSON extraction ───────────────────────────────────────────────────────────

_JSON_RE = re.compile(r"\{[\s\S]*\}", re.MULTILINE)


def _extract_json(text: str) -> Optional[dict]:
    """Try to extract the first JSON object from an LLM response."""
    text = text.strip()
    # Direct parse
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    # Extract embedded JSON block
    m = _JSON_RE.search(text)
    if m:
        try:
            return json.loads(m.group(0))
        except json.JSONDecodeError:
            pass
    return None


# ── Policy gate ───────────────────────────────────────────────────────────────

def _policy_check(plan: dict, body_state: dict) -> Optional[str]:
    """
    Returns an error string if the plan is blocked by policy, else None.
    Called before any tool execution.
    """
    risk = plan.get("risk", "low")
    req_confirm = plan.get("requires_confirmation", False)

    if risk == "high" and req_confirm:
        return (
            "This action is high-risk and requires explicit confirmation. "
            "Please confirm before I proceed."
        )

    intent = plan.get("intent", "")

    # Block desktop actions if DesktopHands is offline
    desktop_intents = {"launch_app", "focus_window", "screenshot", "list_windows", "open_path"}
    if intent in desktop_intents and not body_state.get("desktop_ok", False):
        return (
            "DesktopHands bridge is offline. "
            "I cannot control windows or launch applications until it is connected."
        )

    # Block MCP intents
    mcp_intents = {"run_playwright", "run_testsprite", "run_insforge"}
    if intent in mcp_intents and not body_state.get("mcp_ok", False):
        return "MCP bridge is offline. This tool is unavailable."

    return None


# ── Tool executor ─────────────────────────────────────────────────────────────

def _execute_tool_call(tool_call: dict, body_state: dict) -> dict:
    """
    Dispatch a single tool call and return a result dict.
    All results have at minimum: { "ok": bool, ... }
    """
    tool  = tool_call.get("tool", "")
    args  = tool_call.get("args", {})
    hands = get_hands()

    # ── Filesystem ────────────────────────────────────────────────────────────
    if tool == "filesystem.list_dir":
        path = args.get("path", os.getcwd())
        try:
            entries = []
            for item in os.scandir(path):
                try:
                    stat = item.stat()
                    entries.append({
                        "name": item.name,
                        "is_dir": item.is_dir(),
                        "size": stat.st_size if item.is_file() else 0,
                    })
                except Exception:
                    pass
            return {"ok": True, "path": path, "entries": entries}
        except Exception as e:
            return {"ok": False, "error": str(e)}

    if tool == "filesystem.read_file":
        path = args.get("path", "")
        return summarise_file(path, max_chars=args.get("max_chars", 8000))

    if tool == "filesystem.write_file":
        path    = args.get("path", "")
        content = args.get("content", "")
        try:
            os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
            with open(path, "w", encoding="utf-8") as f:
                f.write(content)
            return {"ok": True, "path": path}
        except Exception as e:
            return {"ok": False, "error": str(e)}

    if tool == "filesystem.open_file":
        path = args.get("path", "")
        if not os.path.exists(path):
            return {"ok": False, "error": f"Not found: {path}"}
        try:
            os.startfile(path)
            return {"ok": True, "path": path}
        except Exception as e:
            return {"ok": False, "error": str(e)}

    if tool == "filesystem.search":
        query = args.get("query", "")
        roots = args.get("roots", WORKSPACE_ROOTS)
        if isinstance(roots, str):
            roots = [roots]
        results = search_index(roots, query, limit=args.get("limit", 50))
        return {"ok": True, "results": [r["path"] for r in results]}

    if tool == "filesystem.summarize":
        path = args.get("path", "")
        return summarise_file(path, max_chars=args.get("max_chars", 8000))

    if tool == "filesystem.compare":
        a = args.get("path_a", "")
        b = args.get("path_b", "")
        return compare_files(a, b, context_lines=args.get("context_lines", 4))

    if tool == "filesystem.repo_map":
        roots = args.get("roots", WORKSPACE_ROOTS)
        if isinstance(roots, str):
            roots = [roots]
        out_dir = args.get("out_dir", roots[0] if roots else None)
        result = build_repo_map(roots, out_dir=out_dir)
        return {
            "ok": True,
            "json_path": result["json_path"],
            "md_path":   result["md_path"],
            "total_files": result["total_files"],
            "languages": result["stats"],
        }

    # ── Desktop ───────────────────────────────────────────────────────────────
    if tool == "desktop.open_path":
        return hands.open_path(args.get("path", ""))

    if tool == "desktop.launch_app":
        return hands.launch_app(args.get("app_id", ""))

    if tool == "desktop.focus_window":
        return hands.focus_window(args.get("title", ""))

    if tool == "desktop.list_windows":
        wins = hands.list_windows()
        return {"ok": True, "windows": [w.get("title") for w in wins]}

    if tool == "desktop.screenshot":
        region = args.get("region")
        label  = args.get("label", "")
        if label:
            return hands.screenshot_proof(label=label)
        return hands.screenshot(region=tuple(region) if region else None)

    if tool == "desktop.screenshot_proof":
        return hands.screenshot_proof(label=args.get("label", "step"))

    if tool == "desktop.click":
        return hands.click(int(args.get("x", 0)), int(args.get("y", 0)),
                           args.get("button", "left"))

    if tool == "desktop.double_click":
        return hands.double_click(int(args.get("x", 0)), int(args.get("y", 0)))

    if tool == "desktop.right_click":
        return hands.right_click(int(args.get("x", 0)), int(args.get("y", 0)))

    if tool == "desktop.scroll":
        return hands.scroll(int(args.get("x", 0)), int(args.get("y", 0)),
                            int(args.get("amount", 3)))

    if tool == "desktop.drag":
        return hands.drag(
            int(args.get("x1", 0)), int(args.get("y1", 0)),
            int(args.get("x2", 0)), int(args.get("y2", 0)),
            float(args.get("duration", 0.5)),
        )

    if tool == "desktop.type_text":
        return hands.type_text(str(args.get("text", "")),
                               float(args.get("interval", 0.04)))

    if tool == "desktop.key_press":
        return hands.key_press(str(args.get("keys", "")))

    if tool == "desktop.find_and_click":
        return hands.find_and_click(str(args.get("text", "")),
                                    bool(args.get("auto_load_vl", True)))

    if tool == "desktop.find_image":
        return hands.find_image(str(args.get("template_path", "")),
                                float(args.get("confidence", 0.8)))

    if tool == "desktop.get_mouse_pos":
        return hands.get_mouse_pos()

    if tool == "desktop.describe_screen":
        q = str(args.get("question", "What is shown on this screen?"))
        return hands.describe_screen(question=q)

    if tool == "desktop.vl_load":
        return hands.vl_load()

    if tool == "terminal.run":
        return hands.run_command(
            str(args.get("command", "")),
            shell=args.get("shell", True),
            timeout=int(args.get("timeout", 30)),
        )

    if tool == "desktop.camera_capture":
        """
        Capture a single frame from the default webcam and save it to disk.
        Returns the saved path + a plain-text description using basic stats.
        """
        try:
            import cv2  # type: ignore
        except ImportError:
            return {"ok": False, "error": "OpenCV not installed. Run: pip install opencv-python"}
        try:
            cam_index = int(args.get("camera_index", 0))
            cap = cv2.VideoCapture(cam_index, cv2.CAP_DSHOW)
            if not cap.isOpened():
                return {"ok": False, "error": f"Camera index {cam_index} could not be opened."}
            ret, frame = cap.read()
            cap.release()
            if not ret or frame is None:
                return {"ok": False, "error": "Camera opened but no frame was captured."}
            save_path = args.get("save_path", os.path.join(os.environ.get("TEMP", "C:/Temp"), "cerebral_camera_capture.jpg"))
            os.makedirs(os.path.dirname(save_path), exist_ok=True)
            cv2.imwrite(save_path, frame)
            h, w, ch = frame.shape
            # Basic brightness metric
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            bright = float(gray.mean())
            # Human-friendly description
            if bright > 150:
                light_desc = "The environment appears well-lit."
            elif bright > 80:
                light_desc = "Moderate lighting in the environment."
            elif bright > 30:
                light_desc = "The environment appears dim."
            else:
                light_desc = "Very low light. The scene is mostly dark."
            desc = f"Camera active. Frame is {w} by {h} pixels. {light_desc} Saved to {save_path}."
            return {
                "ok": True,
                "path": save_path,
                "width": w,
                "height": h,
                "brightness": round(bright, 1),
                "description": desc,
            }
        except Exception as e:
            return {"ok": False, "error": str(e)}

    # ── Conversion ────────────────────────────────────────────────────────────
    if tool.startswith("convert."):
        conversion = tool.split(".", 1)[1]
        return convert(
            conversion=conversion,
            src=args.get("src", ""),
            out_path=args.get("out_path"),
            allow_overwrite=args.get("allow_overwrite", False),
            **{k: v for k, v in args.items()
               if k not in {"src", "out_path", "allow_overwrite"}},
        )

    return {"ok": False, "error": f"Unknown tool: '{tool}'"}


# ── Public router ─────────────────────────────────────────────────────────────

def route(llm_response: str, body_state: dict) -> dict:
    """
    Main entry point.  Feed the raw LLM response text + current body_state.

    Returns a result dict:
    {
        "mode":           "TOOL" | "TALK" | "PARSE_FAILED",
        "speak_immediate": str,   # say this before tools run
        "speak_final":    str,    # say this after tools complete
        "tool_results":   list,   # one entry per tool_call executed
        "policy_blocked": str | None,
        "raw":            str,    # original LLM text
    }
    """
    result = {
        "mode":            "TALK",
        "speak_immediate": "",
        "speak_final":     "",
        "tool_results":    [],
        "policy_blocked":  None,
        "runtime_bridge":  get_runtime_integration_status(),
        "raw":             llm_response,
    }

    plan = _extract_json(llm_response)

    # ── TALK / parse failure ──────────────────────────────────────────────────
    if plan is None or plan.get("mode") == "TALK":
        speak = ""
        if plan:
            speak = plan.get("speak", {}).get("immediate", llm_response)
        else:
            speak = llm_response
        result["mode"] = "TALK"
        result["speak_final"] = speak
        return result

    # ── TOOL ─────────────────────────────────────────────────────────────────
    result["mode"] = "TOOL"
    result["speak_immediate"] = (plan.get("speak") or {}).get("immediate", "On it.")
    result["speak_final"]     = (plan.get("speak") or {}).get("final", "")
    goal = plan.get("goal") or plan.get("intent", "")
    emit_runtime_event(
        RuntimeEventNames.TASK_REQUESTED,
        {
            "path": "tool_router.route",
            "intent": plan.get("intent", ""),
            "goal": goal,
            "tool_calls": len(plan.get("tool_calls", [])),
        },
    )

    # Policy check
    policy_err = _policy_check(plan, body_state)
    if policy_err:
        result["policy_blocked"] = policy_err
        result["speak_final"] = policy_err
        return result

    # Execute each tool call sequentially
    tool_calls = plan.get("tool_calls", [])
    for tc in tool_calls:
        tool_name = tc.get("tool", "unknown")
        tool_args = tc.get("args", {})
        decision = policy_check(tool_name, tool_args, goal)
        emit_runtime_event(
            RuntimeEventNames.TOOL_EVALUATED,
            {
                "path": "tool_router.route",
                "tool": tool_name,
                "goal": goal,
                "tier": decision["tier"],
            },
        )

        if decision["denied"] or decision["needs_approval"]:
            reason = decision["reason"]
            if decision["needs_approval"]:
                reason = f"{tool_name} requires approval before execution."
            result["policy_blocked"] = reason
            result["speak_final"] = reason
            result["tool_results"].append({
                "ok": False,
                "error": reason,
                "_tool": tool_name,
                "_policy": decision["tier"],
            })
            emit_runtime_event(
                RuntimeEventNames.TOOL_BLOCKED,
                {
                    "path": "tool_router.route",
                    "tool": tool_name,
                    "goal": goal,
                    "tier": decision["tier"],
                    "reason": reason,
                },
            )
            break

        emit_runtime_event(
            RuntimeEventNames.TOOL_APPROVED,
            {
                "path": "tool_router.route",
                "tool": tool_name,
                "goal": goal,
                "tier": decision["tier"],
            },
        )
        tr = _execute_tool_call(tc, body_state)
        tr["_tool"] = tool_name
        tr["_policy"] = decision["tier"]
        result["tool_results"].append(tr)
        emit_runtime_event(
            RuntimeEventNames.TOOL_DELEGATED,
            {
                "path": "tool_router.route",
                "tool": tool_name,
                "goal": goal,
                "ok": tr.get("ok", False),
            },
        )

    return result


# ── System-prompt fragment for tool contract enforcement ──────────────────────

TOOL_CONTRACT_BLOCK = """
─── TOOL RESPONSE CONTRACT ───────────────────────────────────────────────────
ALWAYS respond in strict JSON. No prose before or after the JSON block.

For INFORMATIONAL requests:
{
  "mode": "TALK",
  "speak": { "immediate": "<your response>" }
}

For ACTIONABLE requests:
{
  "mode": "TOOL",
  "intent": "<intent_identifier>",
  "risk": "low|medium|high",
  "requires_confirmation": false,
  "tool_calls": [
    { "tool": "<tool_name>", "args": { ... } }
  ],
  "speak": {
    "immediate": "<say this while tools run>",
    "final": "<say this after tools complete>"
  }
}

Available tools:

  FILESYSTEM (low risk)
  filesystem.list_dir        args: path
  filesystem.read_file       args: path, max_chars
  filesystem.write_file      args: path, content
  filesystem.open_file       args: path
  filesystem.search          args: query, roots[], limit
  filesystem.summarize       args: path
  filesystem.compare         args: path_a, path_b
  filesystem.repo_map        args: roots[], out_dir

  DESKTOP — READ (low risk)
  desktop.list_windows       (no args) → window titles
  desktop.get_mouse_pos      (no args) → {x, y}
  desktop.screenshot         args: region (optional [l,t,w,h]), label
  desktop.screenshot_proof   args: label (e.g. 'before','after') → timestamped file

  DESKTOP — NAVIGATE (medium risk)
  desktop.open_path          args: path
  desktop.launch_app         args: app_id  (e.g. 'notepad','settings','chrome')
  desktop.focus_window       args: title

  DESKTOP — ACT (high risk — physically moves mouse/keyboard)
  desktop.click              args: x, y, button ('left'|'right'|'middle')
  desktop.double_click       args: x, y
  desktop.right_click        args: x, y
  desktop.scroll             args: x, y, amount (pos=up, neg=down)
  desktop.drag               args: x1, y1, x2, y2, duration
  desktop.type_text          args: text, interval (default 0.04s)
  desktop.key_press          args: keys (e.g. 'enter','ctrl+c','win+r','alt+f4')
  desktop.find_and_click     args: text  → AI (VL model) finds element by description and clicks it
  desktop.find_image         args: template_path, confidence
  desktop.describe_screen    args: question  → asks VL model to describe what's on screen
  desktop.vl_load            args: (none)    → pre-loads Qwen2.5-VL into memory

  CAMERA (low risk)
  desktop.camera_capture     args: camera_index (0=builtin,1=external), save_path

  TERMINAL (medium/high risk)
  terminal.run               args: command, shell (true), timeout (30)
                             → returns: stdout, stderr, returncode
                             → use this for powercfg, ipconfig, tasklist, etc.

  CONVERT (medium risk)
  convert.json_to_yaml       args: src, out_path
  convert.yaml_to_json       args: src, out_path
  convert.csv_to_json        args: src, out_path
  convert.md_to_text         args: src, out_path
  convert.md_to_pdf          args: src, out_path
  convert.audio_resample     args: src, out_path, sample_rate
  convert.image_resize       args: src, out_path, width, height, quality

Risk levels:
  low    — read-only, no side effects
  medium — creates/reads files, no destructive change
  high   — overwrites files, controls desktop, runs shell commands

EVIDENCE RULE: For any ACT that changes system state, your tool_calls MUST include:
  1. desktop.screenshot_proof label='before'
  2. the action tool(s)
  3. terminal.run to verify  (e.g. powercfg /getactivescheme)
  4. desktop.screenshot_proof label='after'
Never claim an action succeeded without evidence steps.

Rule: If a bridge is OFFLINE, respond in TALK mode explaining what is missing.
─────────────────────────────────────────────────────────────────────────────
"""
