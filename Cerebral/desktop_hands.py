"""
desktop_hands.py — Cerebral Full Desktop Actuator
==================================================
READ (low risk)
  list_windows()                   list open window titles + rects
  get_mouse_pos()                  current cursor coordinates
  screenshot(region, path)         capture screen → file or base64

NAVIGATE (medium risk)
  focus_window(title)              bring window to foreground
  open_path(path)                  open file/folder with default program
  launch_app(app_id)               open application by name / path

ACT (high risk — human-visible)
  click(x, y, button)             single click
  double_click(x, y)              double click
  right_click(x, y)               right click
  type_text(text, interval)       type string with realistic timing
  key_press(keys)                 press key combo e.g. "win+r", "ctrl+c"
  scroll(x, y, amount)            scroll wheel
  drag(x1, y1, x2, y2, duration)  drag from A to B

SMART
  find_and_click(text)            OCR-find text on screen → click it
  find_image(template_path)       template match → return coords

VERIFY
  screenshot_proof(label)         timestamped screenshot to tmp/ → path
  run_command(cmd)                shell command → stdout + stderr
"""

import json
import os
import io
import base64
import time
import threading
import subprocess
from typing import Optional

# ── Win32 for window management ───────────────────────────────────────────────
try:
    import win32gui
    import win32con
    import win32process
    _WIN32_OK = True
except ImportError:
    _WIN32_OK = False

# ── pyautogui for mouse / keyboard / screenshot ───────────────────────────────
try:
    import pyautogui
    pyautogui.FAILSAFE = True   # move mouse to top-left to abort
    pyautogui.PAUSE    = 0.05   # tiny inter-action delay
    _PAG_OK = True
except ImportError:
    pyautogui = None            # type: ignore
    _PAG_OK   = False

# ── cv2 for template matching ─────────────────────────────────────────────────
try:
    import cv2
    import numpy as np
    _CV2_OK = True
except ImportError:
    _CV2_OK = False

# ── pytesseract for on-screen OCR (optional fallback) ────────────────────────
try:
    import pytesseract                      # type: ignore
    _TESS_OK = True
except ImportError:
    _TESS_OK = False

# ── vision_llm: Qwen2.5-VL local model for AI-based screen finding ────────────
try:
    import vision_llm as _vllm
    _VLM_OK = True
except ImportError:
    _vllm   = None          # type: ignore
    _VLM_OK = False


# ── Application registry ──────────────────────────────────────────────────────
APP_REGISTRY_PATH = os.path.join(os.path.dirname(__file__), "runtime", "agent-lee-application-registry.json")
DEFAULT_APP_REGISTRY: dict[str, str] = {
    "notepad":          "notepad.exe",
    "explorer":         "explorer.exe",
    "file explorer":    "explorer.exe",
    "calculator":       "calc.exe",
    "vs code":          r"C:\Users\Leona\AppData\Local\Programs\Microsoft VS Code\Code.exe",
    "vscode":           r"C:\Users\Leona\AppData\Local\Programs\Microsoft VS Code\Code.exe",
    "chrome":           r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    "terminal":         "wt.exe",
    "windows terminal": "wt.exe",
    "powershell":       "powershell.exe",
    "cmd":              "cmd.exe",
    "paint":            "mspaint.exe",
    "wordpad":          "wordpad.exe",
    "task manager":     "taskmgr.exe",
    "edge":             r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    "vlc":              r"C:\Program Files\VideoLAN\VLC\vlc.exe",
    "settings":         "ms-settings:",
    "control panel":    "control.exe",
    "snipping tool":    "snippingtool.exe",
}


def _normalize_app_key(value: str) -> str:
    return (value or "").strip().lower()


def _load_application_registry() -> tuple[list[dict], dict[str, str]]:
    records: list[dict] = []
    aliases: dict[str, str] = dict(DEFAULT_APP_REGISTRY)

    try:
        if os.path.exists(APP_REGISTRY_PATH):
            with open(APP_REGISTRY_PATH, "r", encoding="utf-8") as handle:
                payload = json.load(handle)
            for record in payload.get("apps", []):
                if not isinstance(record, dict):
                    continue
                app_id = _normalize_app_key(str(record.get("appId", "")))
                display_name = _normalize_app_key(str(record.get("displayName", "")))
                launch_method = str(record.get("launchMethod", "")).strip().lower()
                launch_target = ""
                if launch_method == "uri":
                    launch_target = str(record.get("uri", "")).strip()
                elif launch_method == "shell-appid":
                    launch_target = str(record.get("shellTarget") or record.get("startAppId") or "").strip()
                else:
                    launch_target = str(record.get("executablePath") or "").strip()

                for alias in {app_id, display_name, _normalize_app_key(str(record.get("startAppId", "")))}:
                    if alias and launch_target:
                        aliases[alias] = launch_target
                for alias in record.get("aliases", []) or []:
                    alias_key = _normalize_app_key(str(alias))
                    if alias_key and launch_target:
                        aliases[alias_key] = launch_target
                records.append(record)
    except Exception:
        records = []

    if not records:
        for alias, target in DEFAULT_APP_REGISTRY.items():
            records.append({
                "appId": alias,
                "displayName": alias.title(),
                "aliases": [alias],
                "launchMethod": "uri" if target.startswith("ms-") else "path",
                "executablePath": target if not target.startswith("ms-") else None,
                "uri": target if target.startswith("ms-") else None,
                "safeToAutoOpen": True,
                "requiresConfirmation": False
            })

    return records, aliases


APP_RECORDS, APP_REGISTRY = _load_application_registry()


def _resolve_application_record(app_id: str) -> dict | None:
    query = _normalize_app_key(app_id)
    if not query:
        return None

    for record in APP_RECORDS:
        if _normalize_app_key(str(record.get("appId", ""))) == query:
            return record
        if _normalize_app_key(str(record.get("displayName", ""))) == query:
            return record
        if _normalize_app_key(str(record.get("startAppId", ""))) == query:
            return record
        for alias in record.get("aliases", []) or []:
            if _normalize_app_key(str(alias)) == query:
                return record

    target = APP_REGISTRY.get(query)
    if target:
        return {
            "appId": query,
            "displayName": app_id,
            "launchMethod": "uri" if str(target).startswith("ms-") else "path",
            "executablePath": target if not str(target).startswith("ms-") else None,
            "uri": target if str(target).startswith("ms-") else None,
            "safeToAutoOpen": True,
            "requiresConfirmation": False,
            "supportsFileOpen": False
        }

    return None

_IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".bmp", ".webp"}
_POLICY_PATH = os.path.join(os.path.dirname(__file__), "config", "policy.json")


def _normalize_path(value: str) -> str:
    return os.path.abspath(os.path.normpath(value))


def _load_allowed_roots() -> list[str]:
    roots: list[str] = []
    try:
        if os.path.exists(_POLICY_PATH):
            with open(_POLICY_PATH, "r", encoding="utf-8") as handle:
                policy = json.load(handle)
            username = os.environ.get("USERNAME", "")
            for root in policy.get("allowed_roots", []):
                if not isinstance(root, str) or not root.strip():
                    continue
                expanded = root.replace("%USERNAME%", username)
                roots.append(_normalize_path(expanded))
    except Exception:
        pass
    return roots


_ALLOWED_OPEN_ROOTS = tuple(_load_allowed_roots())


def _is_image_file(path: str) -> bool:
    return os.path.splitext(path)[1].lower() in _IMAGE_EXTENSIONS


def _is_within_allowed_root(path: str) -> bool:
    resolved = _normalize_path(path)
    for root in _ALLOWED_OPEN_ROOTS:
        try:
            if os.path.commonpath([resolved, root]) == root:
                return True
        except Exception:
            continue
    return False


# ─────────────────────────────────────────────────────────────────────────────
class DesktopHands:
    """Full desktop actuator — every method returns {ok: bool, ...}"""

    # ── Health ────────────────────────────────────────────────────────────────

    def health(self) -> dict:
        vl_health = _vllm.health() if _VLM_OK and _vllm is not None else {}
        return {
            "status":   "ok",
            "win32":    _WIN32_OK,
            "pyautogui":_PAG_OK,
            "cv2":      _CV2_OK,
            "tesseract":_TESS_OK,
            "vl_model": {
                "available"     : _VLM_OK,
                "loaded"        : vl_health.get("loaded", False),
                "files_present" : vl_health.get("files_present", False),
                "model"         : "Qwen2.5-VL-3B-Instruct",
            },
            "capabilities": {
                "screenshot":   _PAG_OK,
                "click":        _PAG_OK,
                "type":         _PAG_OK,
                "key_press":    _PAG_OK,
                "scroll":       _PAG_OK,
                "drag":         _PAG_OK,
                "find_text":    _TESS_OK or (vl_health.get("files_present", False)),
                "find_text_ai": vl_health.get("files_present", False),
                "find_image":   _CV2_OK,
                "window_focus": _WIN32_OK,
                "run_command":  True,
                "describe_screen": vl_health.get("files_present", False),
            }
        }

    # ── Screenshot / proof ────────────────────────────────────────────────────

    def screenshot(self, region: Optional[tuple] = None,
                   as_base64: bool = False,
                   path: Optional[str] = None) -> dict:
        """
        Capture screen or a region (left, top, width, height).
        Returns path by default; set as_base64=True for inline PNG.
        """
        if not _PAG_OK:
            return {"ok": False, "error": "pyautogui not installed. Run: pip install pyautogui"}
        try:
            img = pyautogui.screenshot(region=region)
            if path:
                os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
                img.save(path)
                return {"ok": True, "path": path}
            if as_base64:
                buf = io.BytesIO()
                img.save(buf, format="PNG")
                b64 = base64.b64encode(buf.getvalue()).decode("ascii")
                return {"ok": True, "format": "png", "data": b64}
            # Default: save timestamped file
            ts      = int(time.time() * 1000)
            save    = os.path.join(os.path.dirname(__file__), "tmp", f"screen_{ts}.png")
            os.makedirs(os.path.dirname(save), exist_ok=True)
            img.save(save)
            return {"ok": True, "path": save}
        except Exception as e:
            return {"ok": False, "error": str(e)}

    def screenshot_proof(self, label: str = "step") -> dict:
        """
        Save timestamped screenshot for audit/evidence.
        Use label 'before' or 'after' to bracket an action.
        """
        ts   = time.strftime("%Y%m%d_%H%M%S")
        path = os.path.join(os.path.dirname(__file__), "tmp", f"proof_{label}_{ts}.png")
        result = self.screenshot(path=path)
        if result.get("ok"):
            result["description"] = f"Screenshot saved as {os.path.basename(path)}"
        return result

    # ── Mouse ─────────────────────────────────────────────────────────────────

    def get_mouse_pos(self) -> dict:
        if not _PAG_OK:
            return {"ok": False, "error": "pyautogui not installed"}
        x, y = pyautogui.position()
        return {"ok": True, "x": int(x), "y": int(y)}

    def click(self, x: int, y: int, button: str = "left") -> dict:
        """Single click at (x, y)."""
        if not _PAG_OK:
            return {"ok": False, "error": "pyautogui not installed"}
        try:
            pyautogui.click(int(x), int(y), button=button)
            return {"ok": True, "action": "click", "x": x, "y": y, "button": button,
                    "description": f"Clicked {button} button at ({x}, {y})"}
        except Exception as e:
            return {"ok": False, "error": str(e)}

    def double_click(self, x: int, y: int) -> dict:
        if not _PAG_OK:
            return {"ok": False, "error": "pyautogui not installed"}
        try:
            pyautogui.doubleClick(int(x), int(y))
            return {"ok": True, "action": "double_click", "x": x, "y": y,
                    "description": f"Double-clicked at ({x}, {y})"}
        except Exception as e:
            return {"ok": False, "error": str(e)}

    def right_click(self, x: int, y: int) -> dict:
        return self.click(x, y, button="right")

    def scroll(self, x: int, y: int, amount: int = 3) -> dict:
        """amount > 0 = up, < 0 = down."""
        if not _PAG_OK:
            return {"ok": False, "error": "pyautogui not installed"}
        try:
            pyautogui.moveTo(int(x), int(y))
            pyautogui.scroll(amount)
            return {"ok": True, "action": "scroll", "x": x, "y": y, "amount": amount}
        except Exception as e:
            return {"ok": False, "error": str(e)}

    def drag(self, x1: int, y1: int, x2: int, y2: int,
             duration: float = 0.5) -> dict:
        if not _PAG_OK:
            return {"ok": False, "error": "pyautogui not installed"}
        try:
            pyautogui.moveTo(int(x1), int(y1))
            pyautogui.dragTo(int(x2), int(y2), duration=duration, button="left")
            return {"ok": True, "action": "drag",
                    "from": [x1, y1], "to": [x2, y2],
                    "description": f"Dragged from ({x1},{y1}) to ({x2},{y2})"}
        except Exception as e:
            return {"ok": False, "error": str(e)}

    # ── Keyboard ──────────────────────────────────────────────────────────────

    def type_text(self, text: str, interval: float = 0.04) -> dict:
        """Type text character by character with realistic timing."""
        if not _PAG_OK:
            return {"ok": False, "error": "pyautogui not installed"}
        try:
            pyautogui.write(str(text), interval=interval)
            return {"ok": True, "action": "type", "text": text,
                    "description": f"Typed: {text[:60]}{'...' if len(text)>60 else ''}"}
        except Exception as e:
            return {"ok": False, "error": str(e)}

    def key_press(self, keys: str) -> dict:
        """
        Press key or combo. Use '+' for chord, ',' for sequence.
        Examples: 'enter', 'ctrl+c', 'win+r', 'win, r' (win then r separately)
        """
        if not _PAG_OK:
            return {"ok": False, "error": "pyautogui not installed"}
        try:
            actions = [k.strip() for k in keys.split(",")]
            for action in actions:
                parts = [p.strip().lower() for p in action.split("+")]
                if len(parts) == 1:
                    pyautogui.press(parts[0])
                else:
                    pyautogui.hotkey(*parts)
                time.sleep(0.12)
            return {"ok": True, "action": "key_press", "keys": keys,
                    "description": f"Pressed keys: {keys}"}
        except Exception as e:
            return {"ok": False, "error": str(e)}

    # ── Smart locators ────────────────────────────────────────────────────────

    def find_and_click(self, text: str, auto_load_vl: bool = True) -> dict:
        """
        Find UI element by description on screen, then click it.

        Strategy (in priority order):
          1. VL model (Qwen2.5-VL) — AI understands semantic descriptions
          2. pytesseract OCR        — fallback if VL model unavailable
          3. Error                  — neither available

        `text` can be a human description: "Submit button", "search bar", "X to close".
        """
        if not _PAG_OK:
            return {"ok": False, "error": "pyautogui not installed"}

        # ── Take a screenshot for analysis ───────────────────────────────────
        scr = self.screenshot(as_base64=False)
        if not scr.get("ok"):
            return {"ok": False, "error": "Screenshot failed"}
        screenshot_path = scr["path"]

        # ── PATH 1: Qwen2.5-VL AI locator ────────────────────────────────────
        if _VLM_OK and _vllm is not None and (_vllm.is_ready() or auto_load_vl):
            if _vllm._files_present() or _vllm.is_ready():
                try:
                    sw, sh = pyautogui.size() if _PAG_OK else (1920, 1080)
                    r = _vllm.find_on_screen(
                        screenshot_path = screenshot_path,
                        description     = text,
                        screen_w        = sw,
                        screen_h        = sh,
                        auto_load       = auto_load_vl,
                    )
                    if r.get("ok"):
                        clicked = self.click(r["x"], r["y"])
                        clicked["found_via"]  = "vl_model"
                        clicked["found_at"]   = [r["x"], r["y"]]
                        clicked["vl_raw"]     = r.get("raw", "")
                        return clicked
                    # VL found nothing — fall through to OCR
                except Exception as ve:
                    pass  # fall through to OCR

        # ── PATH 2: pytesseract OCR fallback ─────────────────────────────────
        if _TESS_OK and _CV2_OK:
            try:
                img    = cv2.imread(screenshot_path)
                data   = pytesseract.image_to_data(img, output_type=pytesseract.Output.DICT)
                needle = text.lower()
                for i, word in enumerate(data["text"]):
                    if needle in str(word).lower():
                        x = data["left"][i]  + data["width"][i]  // 2
                        y = data["top"][i]   + data["height"][i] // 2
                        r = self.click(x, y)
                        r["found_via"]  = "ocr"
                        r["found_text"] = word
                        r["found_at"]   = [x, y]
                        return r
                return {"ok": False, "error": f"Text '{text}' not found on screen (OCR)"}
            except Exception as e:
                return {"ok": False, "error": f"OCR search failed: {e}"}

        # ── No locator available ──────────────────────────────────────────────
        vl_status = (
            "VL model files not downloaded yet"
            if _VLM_OK and not _vllm._files_present()
            else "vision_llm not importable"
            if not _VLM_OK
            else "VL unavailable"
        )
        return {
            "ok"   : False,
            "error": f"No screen locator available. {vl_status}. pytesseract: {_TESS_OK}",
        }

    def find_image(self, template_path: str, confidence: float = 0.8) -> dict:
        """Find template image on screen via cv2 template matching."""
        if not _PAG_OK or not _CV2_OK:
            return {"ok": False, "error": "pyautogui and cv2 required"}
        if not os.path.exists(template_path):
            return {"ok": False, "error": f"Template not found: {template_path}"}
        try:
            scr = self.screenshot(as_base64=False)
            if not scr.get("ok"):
                return {"ok": False, "error": "Screenshot failed"}
            img    = cv2.imread(scr["path"])
            tmpl   = cv2.imread(template_path)
            res    = cv2.matchTemplate(img, tmpl, cv2.TM_CCOEFF_NORMED)
            _, max_val, _, max_loc = cv2.minMaxLoc(res)
            if max_val < confidence:
                return {"ok": False, "error": f"No match (best {max_val:.2f} < {confidence})"}
            th, tw = tmpl.shape[:2]
            cx = max_loc[0] + tw // 2
            cy = max_loc[1] + th // 2
            return {"ok": True, "x": cx, "y": cy, "confidence": float(max_val)}
        except Exception as e:
            return {"ok": False, "error": str(e)}

    # ── Window management ─────────────────────────────────────────────────────

    def list_windows(self) -> list[dict]:
        if not _WIN32_OK:
            return [{"error": "win32gui not available (install pywin32)"}]
        windows = []
        def _cb(hwnd, _):
            if win32gui.IsWindowVisible(hwnd):
                title = win32gui.GetWindowText(hwnd)
                if title.strip():
                    _, pid = win32process.GetWindowThreadProcessId(hwnd)
                    r = win32gui.GetWindowRect(hwnd)
                    windows.append({
                        "hwnd": hwnd, "title": title, "pid": pid,
                        "rect": {"left": r[0], "top": r[1], "right": r[2], "bottom": r[3]}
                    })
        win32gui.EnumWindows(_cb, None)
        return windows

    def focus_window(self, title_fragment: str) -> dict:
        if not _WIN32_OK:
            return {"ok": False, "error": "win32gui not available"}
        frag = title_fragment.lower()
        for w in self.list_windows():
            if frag in w.get("title", "").lower():
                hwnd = w["hwnd"]
                try:
                    win32gui.ShowWindow(hwnd, win32con.SW_RESTORE)
                    win32gui.SetForegroundWindow(hwnd)
                    time.sleep(0.2)
                    return {"ok": True, "hwnd": hwnd, "title": w["title"],
                            "description": f"Focused window: {w['title']}"}
                except Exception as e:
                    return {"ok": False, "error": str(e)}
        return {"ok": False, "error": f"No window matching '{title_fragment}'"}

    # ── Open / Launch ─────────────────────────────────────────────────────────

    def open_path(self, path: str, mode: str = "", preview: bool = False) -> dict:
        raw_path = (path or "").strip()
        resolved = _normalize_path(raw_path) if raw_path else raw_path
        open_mode = (mode or "").strip().lower()
        preview_requested = bool(preview)

        result = {
            "ok": False,
            "path": raw_path,
            "resolvedPath": resolved,
            "previewPath": resolved,
            "previewOpenAttempted": preview_requested,
            "previewOpenSkippedReason": None,
            "opened": False,
            "method": None,
        }

        if not raw_path:
            result["previewOpenSkippedReason"] = "no path provided"
            result["error"] = "no path provided"
            return result

        if not os.path.exists(raw_path):
            result["previewOpenSkippedReason"] = f"path not found: {raw_path}"
            result["error"] = result["previewOpenSkippedReason"]
            return result

        if not preview_requested:
            result["ok"] = True
            result["previewOpenSkippedReason"] = "preview disabled"
            result["method"] = "preview-skipped"
            return result

        if os.path.isdir(raw_path):
            if open_mode != "explorer":
                result["previewOpenSkippedReason"] = "directory paths require explicit explorer mode"
                result["error"] = result["previewOpenSkippedReason"]
                return result

            if not _is_within_allowed_root(resolved):
                result["previewOpenSkippedReason"] = "directory is outside the allowed open roots"
                result["error"] = result["previewOpenSkippedReason"]
                return result

            try:
                subprocess.Popen(["explorer.exe", resolved])
                result.update({
                    "ok": True,
                    "opened": True,
                    "method": "explorer",
                    "previewOpenSkippedReason": None,
                })
                return result
            except Exception as e:
                result["error"] = str(e)
                return result

        if open_mode == "explorer":
            result["previewOpenSkippedReason"] = "explorer mode only applies to directories"
            result["error"] = result["previewOpenSkippedReason"]
            return result

        if open_mode == "paint" and not _is_image_file(resolved):
            result["previewOpenSkippedReason"] = "paint requires a real image file"
            result["error"] = result["previewOpenSkippedReason"]
            return result

        try:
            if open_mode == "paint":
                subprocess.Popen(["mspaint.exe", resolved])
                result["method"] = "paint"
            else:
                os.startfile(resolved)
                result["method"] = "startfile"

            result["ok"] = True
            result["opened"] = True
            result["previewOpenSkippedReason"] = None
            return result
        except Exception as e:
            result["error"] = str(e)
            return result

    def launch_app(self, app_id: str) -> dict:
        record = _resolve_application_record(app_id)
        if record is not None:
            if record.get("requiresConfirmation") and not record.get("safeToAutoOpen"):
                return {
                    "ok": False,
                    "error": "launch requires confirmation",
                    "appId": record.get("appId"),
                    "displayName": record.get("displayName")
                }

            launch_method = str(record.get("launchMethod", "")).strip().lower()
            try:
                if launch_method == "uri" and record.get("uri"):
                    os.startfile(str(record.get("uri")))
                    return {
                        "ok": True,
                        "launched": record.get("uri"),
                        "method": "uri",
                        "appId": record.get("appId"),
                        "displayName": record.get("displayName")
                    }

                if launch_method == "shell-appid" and record.get("startAppId"):
                    target = f"shell:AppsFolder\\{record.get('startAppId')}"
                    subprocess.Popen(["explorer.exe", target])
                    return {
                        "ok": True,
                        "launched": target,
                        "method": "shell-appid",
                        "appId": record.get("appId"),
                        "displayName": record.get("displayName")
                    }

                executable = str(record.get("executablePath") or "").strip()
                if executable:
                    args = list(record.get("launchArgs") or [])
                    subprocess.Popen([executable, *args])
                    return {
                        "ok": True,
                        "launched": executable,
                        "method": "path",
                        "appId": record.get("appId"),
                        "displayName": record.get("displayName")
                    }
            except Exception as e:
                return {"ok": False, "error": str(e), "appId": record.get("appId"), "displayName": record.get("displayName")}

        target = APP_REGISTRY.get(app_id.strip().lower(), app_id)
        try:
            if target.startswith("ms-"):
                os.startfile(target)
                return {"ok": True, "launched": target, "method": "uri"}
            if os.path.isfile(target):
                subprocess.Popen([target])
                return {"ok": True, "launched": target, "method": "registry"}
            subprocess.Popen([target])
            return {"ok": True, "launched": target, "method": "shell"}
        except Exception as e:
            return {"ok": False, "error": str(e)}

    # ── Shell command (terminal.run) ───────────────────────────────────────────

    def run_command(self, command: str, shell: bool = True,
                    timeout: int = 30, cwd: Optional[str] = None) -> dict:
        """
        Run a shell command and return stdout + stderr.
        This powers the terminal.run tool call.
        """
        try:
            proc = subprocess.run(
                command, shell=shell, capture_output=True, text=True,
                timeout=timeout, cwd=cwd or os.path.dirname(__file__),
            )
            out = proc.stdout.strip()
            err = proc.stderr.strip()
            return {
                "ok":         proc.returncode == 0,
                "returncode": proc.returncode,
                "stdout":     out,
                "stderr":     err,
                "command":    command,
                "description": out if out else (err if err else f"Command exit code {proc.returncode}"),
            }
        except subprocess.TimeoutExpired:
            return {"ok": False, "error": f"Timed out after {timeout}s", "command": command}
        except Exception as e:
            return {"ok": False, "error": str(e), "command": command}

    # ── VL model controls ─────────────────────────────────────────────────────

    def vl_load(self) -> dict:
        """Explicitly load the Qwen2.5-VL model into memory (2-3 s on first call)."""
        if not _VLM_OK or _vllm is None:
            return {"ok": False, "error": "vision_llm module not available"}
        return _vllm.load()

    def describe_screen(self, question: str = "What is shown on this screen?",
                        region: Optional[tuple] = None) -> dict:
        """
        Take a screenshot and ask the VL model to describe / answer a question about it.
        E.g. "Is there an error dialog?" / "What application is open?" / "What are the menu items?"
        Returns {ok, answer} or {ok: False, error}.
        """
        if not _VLM_OK or _vllm is None:
            return {"ok": False, "error": "vision_llm module not available"}
        scr = self.screenshot(region=region, as_base64=False)
        if not scr.get("ok"):
            return {"ok": False, "error": "Screenshot failed"}
        return _vllm.describe_screen(scr["path"], question)


# ── Singleton ─────────────────────────────────────────────────────────────────
_hands: Optional[DesktopHands] = None
_lock  = threading.Lock()

def get_hands() -> DesktopHands:
    global _hands
    with _lock:
        if _hands is None:
            _hands = DesktopHands()
    return _hands
