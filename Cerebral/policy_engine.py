"""
policy_engine.py — Cerebral Policy Gate v2
==========================================
4-tier decision model:

  ALLOW       — read-only or informational; proceed silently
  ALLOW_LOG   — consequential but safe; proceed and write audit entry
  APPROVE     — requires explicit user confirmation before execution
  DENY        — blocked; return error, never execute

Risk classification uses:
  1. Explicit per-action overrides in config/policy.json
  2. Inferred tier from tool namespace and keyword analysis

Tool risk defaults
------------------
  filesystem.list_dir         → ALLOW
  filesystem.read_file        → ALLOW
  filesystem.write_file       → ALLOW_LOG     (reversible edit)
  filesystem.open_file        → ALLOW
  filesystem.search           → ALLOW
  filesystem.summarize        → ALLOW
  filesystem.compare          → ALLOW
  filesystem.repo_map         → ALLOW
  desktop.open_path           → ALLOW
  desktop.list_windows        → ALLOW
  desktop.screenshot          → ALLOW
  desktop.screenshot_proof    → ALLOW
  desktop.get_mouse_pos       → ALLOW
  desktop.focus_window        → ALLOW_LOG
  desktop.launch_app          → ALLOW_LOG
  desktop.click               → ALLOW_LOG
  desktop.double_click        → ALLOW_LOG
  desktop.right_click         → ALLOW_LOG
  desktop.scroll              → ALLOW
  desktop.type_text           → APPROVE       (keyboard injection — considered sensitive)
  desktop.key_press           → APPROVE       (hotkeys can trigger system actions)
  desktop.drag                → ALLOW_LOG
  desktop.find_and_click      → ALLOW_LOG
  desktop.find_image          → ALLOW
  desktop.describe_screen     → ALLOW
  desktop.camera_capture      → ALLOW_LOG
  terminal.run                → APPROVE       (shell commands)
  convert.*                   → ALLOW_LOG
  vision.*                    → ALLOW
"""

import json
import os
import re
import time
from typing import Literal

POLICY_FILE = os.path.join(os.path.dirname(__file__), "config", "policy.json")
AUDIT_FILE  = os.path.join(os.path.dirname(__file__), "logs", "bridge_audit.jsonl")
RUNTIME_ROOT = os.path.join(os.path.dirname(__file__), "runtime")
RUNTIME_MANIFEST = os.path.join(RUNTIME_ROOT, "OPENCLAW_DONOR_MANIFEST.md")
LIVE_RUNTIME_BRIDGE = os.path.join(os.path.dirname(__file__), "runtime_live_bridge.py")

PolicyTier = Literal["ALLOW", "ALLOW_LOG", "APPROVE", "DENY"]

# ── Default risk tiers by tool name ──────────────────────────────────────────
_TIER_MAP: dict[str, PolicyTier] = {
    # filesystem
    "filesystem.list_dir":      "ALLOW",
    "filesystem.read_file":     "ALLOW",
    "filesystem.write_file":    "ALLOW_LOG",
    "filesystem.open_file":     "ALLOW",
    "filesystem.search":        "ALLOW",
    "filesystem.summarize":     "ALLOW",
    "filesystem.compare":       "ALLOW",
    "filesystem.repo_map":      "ALLOW",
    "filesystem.move_file":     "ALLOW_LOG",
    "filesystem.delete_file":   "APPROVE",
    # desktop — observation
    "desktop.open_path":        "ALLOW",
    "desktop.list_windows":     "ALLOW",
    "desktop.screenshot":       "ALLOW",
    "desktop.screenshot_proof": "ALLOW",
    "desktop.get_mouse_pos":    "ALLOW",
    "desktop.describe_screen":  "ALLOW",
    "desktop.find_image":       "ALLOW",
    "desktop.camera_capture":   "ALLOW_LOG",
    # desktop — navigation
    "desktop.focus_window":     "ALLOW_LOG",
    "desktop.launch_app":       "ALLOW_LOG",
    "desktop.click":            "ALLOW_LOG",
    "desktop.double_click":     "ALLOW_LOG",
    "desktop.right_click":      "ALLOW_LOG",
    "desktop.scroll":           "ALLOW",
    "desktop.drag":             "ALLOW_LOG",
    "desktop.find_and_click":   "ALLOW_LOG",
    "desktop.vl_load":          "ALLOW_LOG",
    # desktop — input injection (higher risk)
    "desktop.type_text":        "APPROVE",
    "desktop.key_press":        "APPROVE",
    # terminal
    "terminal.run":             "APPROVE",
    # convert
    "convert.file":             "ALLOW_LOG",
    "convert.resample_audio":   "ALLOW_LOG",
    "convert.resize_image":     "ALLOW_LOG",
    # vision
    "vision.describe_screen":   "ALLOW",
    "vision.find_on_screen":    "ALLOW",
    "vision.capture_camera":    "ALLOW_LOG",
}

# Patterns that force APPROVE regardless of tool list
_APPROVE_KEYWORDS = re.compile(
    r'\b(send|submit|delete|remove|format|install|uninstall|shutdown|reboot|'
    r'post|publish|deploy|push|commit|rm|del|wipe|erase|kill|restart|click|'
    r'fill|script|spawn|terminate)\b',
    re.IGNORECASE
)

# Patterns that force DENY
_DENY_KEYWORDS = re.compile(
    r'\b(rmdir /s|format c:|rd /s|shutdown /r|reg delete|netsh firewall|'
    r'cacls|bcdedit|diskpart)\b',
    re.IGNORECASE
)

_RUNTIME_BRIDGE_FILES = {
    "policy_bridge": os.path.join(RUNTIME_ROOT, "policies", "CerebralApprovalBridge.ts"),
    "tool_executor": os.path.join(RUNTIME_ROOT, "tools", "CerebralToolExecutor.ts"),
    "task_events": os.path.join(RUNTIME_ROOT, "communication", "CerebralTaskEvents.ts"),
    "mcp_bridge": os.path.join(RUNTIME_ROOT, "mcp", "CerebralMCPBridge.ts"),
    "memory_bridge": os.path.join(RUNTIME_ROOT, "memory", "CerebralMemoryBridge.ts"),
    "session_manager": os.path.join(RUNTIME_ROOT, "agent", "CerebralRuntimeSessionManager.ts"),
    "subagent_manager": os.path.join(RUNTIME_ROOT, "subagents", "CerebralSubAgentManager.ts"),
}


def get_runtime_integration_status() -> dict:
    """
    Return a lightweight snapshot of the staged runtime bridge.
    The live Python path does not execute the TypeScript files directly.
    It only reports whether the staged runtime layer exists.
    """
    bridge_files = {name: os.path.exists(path) for name, path in _RUNTIME_BRIDGE_FILES.items()}
    return {
        "runtime_root": RUNTIME_ROOT,
        "manifest_present": os.path.exists(RUNTIME_MANIFEST),
        "staged": any(bridge_files.values()),
        "live_python_bridge": os.path.exists(LIVE_RUNTIME_BRIDGE),
        "bridge_files": bridge_files,
        "python_integration_targets": [
            "policy_engine.py",
            "tool_router.py",
            "task_spine.py",
            "CerebralDaemon.py",
        ],
    }


def load_policy() -> dict:
    if not os.path.exists(POLICY_FILE):
        return {}
    try:
        with open(POLICY_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def _audit_write(entry: dict) -> None:
    """Append a policy decision to the audit log."""
    os.makedirs(os.path.dirname(AUDIT_FILE), exist_ok=True)
    entry.setdefault("ts", time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()))
    try:
        with open(AUDIT_FILE, "a", encoding="utf-8") as f:
            f.write(json.dumps(entry) + "\n")
    except Exception:
        pass


def get_tier(tool: str, args: dict | None = None, goal: str = "") -> PolicyTier:
    """
    Determine the policy tier for a tool call.
    Checks: deny keywords → explicit overrides (policy.json) → default tier map → inferred.
    """
    combined_text = f"{tool} {goal} {json.dumps(args or {})}"

    # Absolute deny for dangerous shell patterns
    if _DENY_KEYWORDS.search(combined_text):
        return "DENY"

    # Load config overrides
    policy = load_policy()
    overrides: dict = policy.get("tier_overrides", {})
    if tool in overrides:
        return overrides[tool]

    # Legacy: restricted_actions → APPROVE
    if tool in policy.get("restricted_actions", []):
        return "APPROVE"

    # Check default map
    if tool in _TIER_MAP:
        tier = _TIER_MAP[tool]
    else:
        # Infer from namespace
        ns = tool.split(".")[0] if "." in tool else tool
        ns_defaults = {
            "filesystem": "ALLOW_LOG",
            "desktop":    "ALLOW_LOG",
            "terminal":   "APPROVE",
            "convert":    "ALLOW_LOG",
            "vision":     "ALLOW",
            "agent":      "ALLOW_LOG",
            "subagent":   "APPROVE",
        }
        tier = ns_defaults.get(ns, "ALLOW_LOG")

    # Escalate to APPROVE if goal/args contain risky keywords
    if tier not in ("APPROVE", "DENY") and _APPROVE_KEYWORDS.search(combined_text):
        return "APPROVE"

    return tier


def check(tool: str, args: dict | None = None, goal: str = "") -> dict:
    """
    Main policy check. Returns:
      {"tier": "ALLOW"|"ALLOW_LOG"|"APPROVE"|"DENY",
       "allowed": bool,
       "needs_approval": bool,
       "reason": str}
    Writes audit entry for ALLOW_LOG and above.
    """
    tier = get_tier(tool, args, goal)
    decision = {
        "tier":           tier,
        "tool":           tool,
        "goal":           goal,
        "allowed":        tier in ("ALLOW", "ALLOW_LOG"),
        "needs_approval": tier == "APPROVE",
        "denied":         tier == "DENY",
        "runtime_bridge": get_runtime_integration_status(),
        "reason":         {
            "ALLOW":      "Read-only / safe operation.",
            "ALLOW_LOG":  "Consequential action — logged.",
            "APPROVE":    "Input injection or shell command — requires operator confirmation.",
            "DENY":       "Action matches deny-list pattern and is blocked.",
        }.get(tier, "Unknown"),
    }

    if tier in ("ALLOW_LOG", "APPROVE", "DENY"):
        _audit_write({
            "event":     "policy_check",
            "tool":      tool,
            "tier":      tier,
            "allowed":   decision["allowed"],
            "goal":      goal[:200],
        })

    return decision


# ── Legacy compatibility ──────────────────────────────────────────────────────
def requires_approval(action: str) -> bool:
    """Backwards-compatible wrapper."""
    return get_tier(action) in ("APPROVE", "DENY")
