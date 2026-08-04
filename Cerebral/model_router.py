"""
model_router.py — Cerebral Unified Model Router
================================================
⚠️  DEPRECATED FOR CHAT — All chat inference now routes through Agent Lee Prime:
    Cerebral → Runtime Fabric (4001) → Router Brain (8080) → Ollama (11434)
    → qwen3:latest / qwen2.5-coder:7b

This module is kept for backward compatibility with subsystems that still
reference it (task_spine, planner_engine, briefing_engine) but the /api/chat
endpoint no longer calls model_router.call(). Those subsystems' code paths
are unreachable from the main chat flow after the Phase 3 routing unification.

Original single source of truth for all LLM inference calls.
------------
Every subsystem (planner_engine, briefing_engine, daemon chat path) calls
model_router.call() instead of hitting the Foundry API directly.

The router knows:
  - Which model handles which task type
  - Per-task system prompts and generation params
  - How to discover the live Foundry URL (same logic as daemon)
  - When to fall back gracefully if Foundry is offline

Task types
----------
  "dialogue"   → main chat/QA  (Phi-3.5)
  "plan"       → generate ActionPlan JSON  (Phi-3.5, low temp, JSON mode)
  "tool_json"  → single tool-call argument JSON  (Phi-3.5, low temp)
  "briefing"   → short status report spoken aloud  (Phi-3.5)
  "classify"   → LOCAL — never calls an LLM (handled by task_spine pattern match)
  "vision"     → Qwen2.5-VL GGUF via llama.cpp (separate call path)

Usage
-----
    from model_router import call, FOUNDRY_BASE, MODELS

    reply = call("dialogue", "What's the capital of France?")
    plan_json = call("plan", "Open Notepad and write a shopping list")
"""

from __future__ import annotations

import json
import os
import re
import subprocess
import time
from typing import Optional

import requests

# ══════════════════════════════════════════════════════════════════════════════
# Foundry discovery — mirrors the daemon's own discovery logic
# ══════════════════════════════════════════════════════════════════════════════

def _discover_foundry() -> str:
    """Return base URL for the live Foundry Local instance."""
    # 1. Explicit env override
    env = os.environ.get("CEREBRAL_FOUNDRY_BASE", "").strip()
    if env:
        return env.rstrip("/")

    # 2. Ask foundry CLI
    try:
        out = subprocess.check_output(
            ["foundry", "service", "status"],
            stderr=subprocess.DEVNULL,
            timeout=4,
        ).decode(errors="replace")
        m = re.search(r"https?://[\w.:]+", out)
        if m:
            base = m.group(0).rstrip("/")
            # Quick liveness check
            try:
                requests.get(f"{base}/v1/models", timeout=2)
                return base
            except Exception:
                pass
    except Exception:
        pass

    # 3. Probe candidate ports
    for port in [56995, 64557, 5272, 11434]:
        try:
            r = requests.get(f"http://127.0.0.1:{port}/v1/models", timeout=2)
            if r.ok:
                return f"http://127.0.0.1:{port}"
        except Exception:
            continue

    # 4. Fall back to default
    return "http://127.0.0.1:56995"


FOUNDRY_BASE: str = _discover_foundry()
_CHAT_URL: str    = f"{FOUNDRY_BASE}/v1/chat/completions"

# ══════════════════════════════════════════════════════════════════════════════
# Model catalogue
# ══════════════════════════════════════════════════════════════════════════════

MODELS: dict[str, dict] = {
    "phi35": {
        "id":           "Phi-3.5-mini-instruct-generic-cpu:1",
        "provider":     "foundry",
        "context":      114688,
        "vision":       False,
        "tool_calling": False,
        "tasks":        ["dialogue", "plan", "tool_json", "briefing"],
    },
    "vl": {
        "id":       "Qwen2.5-VL-3B-Instruct-GGUF",
        "provider": "llama.cpp",
        "context":  32768,
        "vision":   True,
        "tasks":    ["vision"],
    },
}


# Merge in registry models if available (updated-model-routes.json)
try:
    # Local import from Cerebral package
    from model_registry import get_models as _get_registry_models  # type: ignore
    _reg_models = _get_registry_models()
    for m in _reg_models:
        mid = m.get("model_id")
        if not mid:
            continue
        # Skip DeepSeek explicitly
        if "deepseek" in mid.lower():
            continue
        # Create a safe key name without special chars
        key = mid.replace(':', '_').replace('-', '_')
        if key in MODELS:
            continue
        MODELS[key] = {
            "id": mid,
            "provider": "ollama" if "qwen" in mid.lower() or "qwen" in (m.get("meta", {}).get("routeAlias","")) else "foundry",
            "context": None,
            "vision": bool("vl" in mid.lower() or "vl" in (m.get("meta", {}).get("routeAlias", ""))),
            "tasks": ["dialogue", "plan"] if not ("vl" in mid.lower()) else ["vision"],
        }
except Exception:
    # If registry not present or import fails, continue with defaults
    pass

# Default model for Foundry tasks
_DEFAULT_MODEL = MODELS["phi35"]["id"]

# ══════════════════════════════════════════════════════════════════════════════
# Per-task configuration
# ══════════════════════════════════════════════════════════════════════════════

_TASK_CONFIG: dict[str, dict] = {
    "dialogue": {
        "system": (
            "You are Cerebral, an advanced AI desktop assistant. "
            "You are concise, direct, and helpful. "
            "Reply in plain text, no code fences unless the user asks for code."
        ),
        "temperature": 0.7,
        "max_tokens":  512,
    },
    "plan": {
        "system": (
            "You are the Cerebral Planner. Convert the user's goal into a minimal, "
            "ordered list of desktop automation steps. Reply ONLY with valid JSON "
            "matching this schema exactly — no markdown, no explanation:\n"
            '{"goal":"...","mode":"plan","requires_approval":false,'
            '"steps":[{"id":1,"tool":"<tool>","args":{},"desc":"<one line>",'
            '"verify":"<window_title:X|text_present:X|none>"}]}'
        ),
        "temperature": 0.1,
        "max_tokens":  800,
    },
    "tool_json": {
        "system": (
            "You are a JSON argument generator for desktop automation. "
            "Given a tool name and a natural-language description, output ONLY "
            "a valid JSON object of arguments — no markdown, no explanation."
        ),
        "temperature": 0.0,
        "max_tokens":  256,
    },
    "briefing": {
        "system": (
            "You are Cerebral. Write a short spoken status briefing (2-4 sentences). "
            "Natural, confident, no bullet points — it will be read aloud by TTS. "
            "Avoid markdown, dashes, and asterisks."
        ),
        "temperature": 0.6,
        "max_tokens":  200,
    },
}

# ══════════════════════════════════════════════════════════════════════════════
# Core call function
# ══════════════════════════════════════════════════════════════════════════════

def call(
    task_type: str,
    user_text: str,
    system_override: Optional[str] = None,
    context_messages: Optional[list] = None,
    timeout: float = 30.0,
    **extra_params,
) -> str:
    """
    Route a text request to the appropriate model and return the reply string.

    Parameters
    ----------
    task_type        : One of "dialogue", "plan", "tool_json", "briefing".
    user_text        : The user's message or prompt.
    system_override  : Replace the default system prompt if provided.
    context_messages : Extra prior messages to prepend (list of {role, content}).
    timeout          : HTTP request timeout in seconds.
    **extra_params   : Forwarded to the Foundry payload (temperature, max_tokens, …).

    Returns
    -------
    The model's reply as a plain string.  Raises RuntimeError if the call fails.
    """
    if task_type == "classify":
        raise ValueError(
            "task_type='classify' is handled locally by task_spine.classify_intent — "
            "do not route it through model_router.call()"
        )
    if task_type == "vision":
        raise ValueError(
            "task_type='vision' uses the llama.cpp VL endpoint — "
            "call model_router.call_vision() instead"
        )

    cfg = _TASK_CONFIG.get(task_type, _TASK_CONFIG["dialogue"])
    system_prompt = system_override or cfg["system"]

    messages: list[dict] = [{"role": "system", "content": system_prompt}]
    if context_messages:
        messages.extend(context_messages)
    messages.append({"role": "user", "content": user_text})

    payload = {
        "model":       _DEFAULT_MODEL,
        "messages":    messages,
        "temperature": cfg.get("temperature", 0.7),
        "max_tokens":  cfg.get("max_tokens", 512),
    }
    payload.update(extra_params)

    try:
        r = requests.post(_CHAT_URL, json=payload, timeout=timeout)
        r.raise_for_status()
        data = r.json()
        return data["choices"][0]["message"]["content"].strip()
    except requests.Timeout:
        raise RuntimeError(f"model_router: Foundry timed out ({timeout}s) for task '{task_type}'")
    except requests.ConnectionError:
        raise RuntimeError("model_router: Foundry is offline")
    except Exception as exc:
        raise RuntimeError(f"model_router: Foundry error — {exc}") from exc


def call_json(
    task_type: str,
    user_text: str,
    **kwargs,
) -> dict:
    """
    Same as call() but parses the reply as JSON.
    Raises RuntimeError if the reply is not valid JSON.
    """
    raw = call(task_type, user_text, **kwargs)
    # Strip markdown code fences if present
    raw = re.sub(r"^```(?:json)?\s*", "", raw, flags=re.MULTILINE)
    raw = re.sub(r"\s*```$", "", raw, flags=re.MULTILINE)
    try:
        return json.loads(raw.strip())
    except json.JSONDecodeError as exc:
        raise RuntimeError(
            f"model_router: reply was not valid JSON — {exc}\nRaw reply: {raw[:300]}"
        ) from exc


# ══════════════════════════════════════════════════════════════════════════════
# Vision call (llama.cpp VL model — separate endpoint)
# ══════════════════════════════════════════════════════════════════════════════

_VL_BASE = os.environ.get("CEREBRAL_VL_BASE", "http://127.0.0.1:8080")
_VL_CHAT = f"{_VL_BASE}/v1/chat/completions"


def call_vision(
    question: str,
    image_b64: Optional[str] = None,
    image_path: Optional[str] = None,
    timeout: float = 45.0,
) -> str:
    """
    Send an image + question to the Qwen2.5-VL GGUF model via llama.cpp server.

    Either image_b64 (base64-encoded PNG/JPEG string) or image_path must be given.
    Returns the model's text description/answer.
    """
    if image_path and not image_b64:
        import base64
        with open(image_path, "rb") as f:
            image_b64 = base64.b64encode(f.read()).decode()

    if not image_b64:
        raise ValueError("call_vision: provide image_b64 or image_path")

    messages = [
        {
            "role": "user",
            "content": [
                {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{image_b64}"}},
                {"type": "text", "text": question},
            ],
        }
    ]
    payload = {
        "model":       MODELS["vl"]["id"],
        "messages":    messages,
        "temperature": 0.1,
        "max_tokens":  512,
    }
    try:
        r = requests.post(_VL_CHAT, json=payload, timeout=timeout)
        r.raise_for_status()
        return r.json()["choices"][0]["message"]["content"].strip()
    except requests.ConnectionError:
        raise RuntimeError("model_router: VL model server is offline (start llama.cpp server first)")
    except Exception as exc:
        raise RuntimeError(f"model_router: VL call failed — {exc}") from exc


# ══════════════════════════════════════════════════════════════════════════════
# Health check
# ══════════════════════════════════════════════════════════════════════════════

def health() -> dict:
    """
    Return a dict describing the current state of connected model backends.
    Safe to call frequently — uses short timeouts.
    """
    result = {
        "foundry_base": FOUNDRY_BASE,
        "foundry_ok":   False,
        "foundry_models": [],
        "vl_ok":        False,
    }
    try:
        r = requests.get(f"{FOUNDRY_BASE}/v1/models", timeout=3)
        if r.ok:
            result["foundry_ok"]     = True
            result["foundry_models"] = [m["id"] for m in r.json().get("data", [])]
    except Exception:
        pass

    try:
        r2 = requests.get(f"{_VL_BASE}/health", timeout=2)
        result["vl_ok"] = r2.ok
    except Exception:
        pass

    return result


# ══════════════════════════════════════════════════════════════════════════════
# Quick self-test
# ══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("Model Router self-test")
    print("  Foundry base:", FOUNDRY_BASE)
    h = health()
    print("  Health:", json.dumps(h, indent=2))
    if h["foundry_ok"]:
        try:
            reply = call("dialogue", "Say exactly: MODEL_ROUTER_OK", timeout=20)
            print("  dialogue test:", reply[:80])
        except Exception as e:
            print("  dialogue test FAILED:", e)
    else:
        print("  Foundry offline — skipping live call test")
    print("Done.")
