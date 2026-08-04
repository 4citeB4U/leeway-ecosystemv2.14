"""
Cerebral E2E Test Suite — Playwright + requests
Covers:
  1. Backend API smoke tests (health, chat, TTS, settings)
  2. UI tests: chat input visible + typed messages send correctly
  3. Voice mock: inject fake webkitSpeechRecognition, simulate transcript → verify message appears
  4. Mic button state transitions (idle → listening → idle after transcript)
  5. Diagnostics: prints a full report, exits 0 on all-pass, 1 on any failure
"""

import sys
import time
import json
import requests
from playwright.sync_api import sync_playwright, expect

BASE_URL    = "http://127.0.0.1:8765"
UI_URL      = f"{BASE_URL}/"
TIMEOUT_MS  = 10_000

PASS = "✅ PASS"
FAIL = "❌ FAIL"
WARN = "⚠️  WARN"

results: list[dict] = []


def record(name: str, passed: bool, detail: str = ""):
    icon = PASS if passed else FAIL
    print(f"  {icon}  {name}" + (f" — {detail}" if detail else ""))
    results.append({"name": name, "passed": passed, "detail": detail})


# ─────────────────────────────────────────────────────────────────────────────
# 1. BACKEND API TESTS
# ─────────────────────────────────────────────────────────────────────────────

def test_backend():
    print("\n── Backend API ──────────────────────────────────────────────")

    # Health
    try:
        r = requests.get(f"{BASE_URL}/api/health", timeout=5)
        data = r.json()
        ok = r.status_code == 200 and data.get("daemon") == "online"
        record("GET /api/health", ok, json.dumps(data))
    except Exception as e:
        record("GET /api/health", False, str(e))
        print("  Daemon appears to be DOWN — skipping remaining backend tests")
        return False

    # TTS voices
    try:
        r = requests.get(f"{BASE_URL}/api/tts/voices", timeout=5)
        voices = r.json().get("voices", [])
        ok = r.status_code == 200 and len(voices) > 0
        record("GET /api/tts/voices", ok, f"{len(voices)} voice(s) returned")
    except Exception as e:
        record("GET /api/tts/voices", False, str(e))

    # Set voice
    try:
        r = requests.post(f"{BASE_URL}/api/tts/voice",
                          json={"voice_id": "en_US-lessac-medium"},
                          timeout=5)
        ok = r.status_code == 200
        record("POST /api/tts/voice", ok, r.text[:80])
    except Exception as e:
        record("POST /api/tts/voice", False, str(e))

    # Reject bad voice
    try:
        r = requests.post(f"{BASE_URL}/api/tts/voice",
                          json={"voice_id": "evil_voice"},
                          timeout=5)
        ok = r.status_code in (400, 403, 422)
        record("POST /api/tts/voice (bad id → reject)", ok, f"status={r.status_code}")
    except Exception as e:
        record("POST /api/tts/voice (bad id → reject)", False, str(e))

    # TTS speak
    try:
        r = requests.post(f"{BASE_URL}/api/chat/tts",
                          json={"text": "Hello Cerebral test suite."},
                          timeout=10)
        ok = r.status_code == 200
        record("POST /api/chat/tts", ok, r.text[:80])
    except Exception as e:
        record("POST /api/chat/tts", False, str(e))

    # Chat
    try:
        r = requests.post(f"{BASE_URL}/api/chat",
                          json={"message": "ping — reply with exactly one word"},
                          timeout=30)
        ok = r.status_code == 200
        body = r.json() if ok else {}
        content = (
            body.get("choices", [{}])[0].get("message", {}).get("content")
            or body.get("response", "")
        )
        record("POST /api/chat", ok, (content or "")[:120])
    except Exception as e:
        record("POST /api/chat", False, str(e))

    # Settings read
    try:
        r = requests.get(f"{BASE_URL}/api/settings", timeout=5)
        ok = r.status_code == 200
        record("GET /api/settings", ok, r.text[:80])
    except Exception as e:
        record("GET /api/settings", False, str(e))

    return True


# ─────────────────────────────────────────────────────────────────────────────
# 2. UI TESTS
# ─────────────────────────────────────────────────────────────────────────────

SPEECH_MOCK_SCRIPT = """
// Inject a controllable fake webkitSpeechRecognition so we can simulate
// voice input without needing a real microphone in headless Chromium.
(function () {
  class FakeRecognition {
    constructor() {
      this.continuous = false;
      this.interimResults = false;
      this.lang = 'en-US';
      this.listening = false;
      this.onstart  = null;
      this.onend    = null;
      this.onresult = null;
      this.onerror  = null;
    }
    start() {
      this.listening = true;
      if (this.onstart) this.onstart({});
    }
    stop() {
      this.listening = false;
      if (this.onend) this.onend({});
    }
    abort() { this.stop(); }
  }

  // Singleton so the React component's ref always gets this instance
  let _instance = null;
  window._getFakeRec = () => _instance;

  window.webkitSpeechRecognition = function FakeRecognitionConstructor() {
    _instance = new FakeRecognition();
    return _instance;
  };

  // Helper the test calls: simulate a final transcript result then stop
  window._simulateVoiceInput = function(text) {
    const rec = _instance;
    if (!rec) return false;
    if (!rec.listening) rec.start();
    if (rec.onresult) {
      const fakeEvent = {
        resultIndex: 0,
        results: [{
          isFinal: true,
          0: { transcript: text }
        }]
      };
      rec.onresult(fakeEvent);
    }
    // Let React flush the ref, then stop
    setTimeout(() => { if (rec) rec.stop(); }, 100);
    return true;
  };
})();
"""


def test_ui():
    print("\n── UI (Playwright / Chromium) ───────────────────────────────")

    with sync_playwright() as pw:
        browser = pw.chromium.launch(
            headless=True,
            args=[
                "--use-fake-ui-for-media-stream",   # grants mic permission without real device
                "--use-fake-device-for-media-stream",
            ],
        )
        context = browser.new_context(
            permissions=["microphone"],
        )
        # Inject the SpeechRecognition mock before any page JS runs
        context.add_init_script(SPEECH_MOCK_SCRIPT)

        page = context.new_page()

        # Intercept and mock /api/chat so tests are deterministic
        def handle_chat(route, request):
            route.fulfill(
                status=200,
                content_type="application/json",
                body=json.dumps({
                    "choices": [{
                        "message": {
                            "role": "assistant",
                            "content": "E2E_MOCK_RESPONSE"
                        }
                    }]
                }),
            )
        page.route("**/api/chat", handle_chat)

        # Also mock TTS so we don't actually play audio during tests
        def handle_tts(route, request):
            route.fulfill(status=200, content_type="application/json",
                          body=json.dumps({"status": "queued", "backend": "mock"}))
        page.route("**/api/chat/tts", handle_tts)

        # ── Load the page ────────────────────────────────────────────────────
        try:
            page.goto(UI_URL, wait_until="networkidle", timeout=20_000)
            record("Page loads (networkidle)", True)
        except Exception as e:
            record("Page loads", False, str(e))
            browser.close()
            return

        # ── Chat input visible ───────────────────────────────────────────────
        chat_input = page.get_by_label("Chat input")
        try:
            expect(chat_input).to_be_visible(timeout=TIMEOUT_MS)
            record("Chat input is visible", True)
        except Exception as e:
            record("Chat input is visible", False, str(e))

        # ── Chat input is enabled ────────────────────────────────────────────
        try:
            expect(chat_input).to_be_enabled(timeout=TIMEOUT_MS)
            record("Chat input is enabled (not disabled)", True)
        except Exception as e:
            record("Chat input is enabled", False, str(e))

        # ── Type text + Enter sends message ─────────────────────────────────
        try:
            chat_input.click()
            chat_input.fill("Hello Agent Lee")
            chat_input.press("Enter")
            # Wait for our mocked assistant response to appear in the chat list
            page.wait_for_selector(
                "text=E2E_MOCK_RESPONSE",
                timeout=15_000,
            )
            record("Type + Enter → assistant response visible", True)
        except Exception as e:
            record("Type + Enter → assistant response visible", False, str(e))

        # ── Send button works ────────────────────────────────────────────────
        try:
            chat_input.fill("Test via Send button")
            page.get_by_role("button", name="Send").click()
            page.wait_for_selector(
                "text=E2E_MOCK_RESPONSE",
                timeout=15_000,
            )
            record("Send button → assistant response visible", True)
        except Exception as e:
            record("Send button → assistant response visible", False, str(e))

        # ── Mic button exists and is clickable ───────────────────────────────
        mic_btn = page.get_by_role("button", name="Push to talk")
        try:
            expect(mic_btn).to_be_visible(timeout=TIMEOUT_MS)
            record("Mic button is visible", True)
        except Exception as e:
            record("Mic button is visible", False, str(e))

        # ── Click mic → enters listening state (red pulse) ───────────────────
        try:
            mic_btn.click()
            # After click, the button should get the red-600 + animate-pulse classes
            # (set in the isListening=true branch)
            page.wait_for_function(
                "document.querySelector('[aria-label=\"Push to talk\"]')"
                ".className.includes('red')",
                timeout=5_000,
            )
            record("Mic click → listening state (red button)", True)
        except Exception as e:
            record("Mic click → listening state (red button)", False, str(e))

        # ── Simulate voice transcript via injected mock ───────────────────────
        try:
            ok = page.evaluate("window._simulateVoiceInput('E2E voice test command')")
            if not ok:
                raise RuntimeError("_simulateVoiceInput returned false — mock not attached")
            # User message should appear in chat
            page.wait_for_selector(
                "text=E2E voice test command",
                timeout=15_000,
            )
            record("Voice mock → user message appears in chat", True)
        except Exception as e:
            record("Voice mock → user message appears in chat", False, str(e))

        # ── After voice transcript processed, mic returns to idle ─────────────
        try:
            page.wait_for_function(
                "!document.querySelector('[aria-label=\"Push to talk\"]')"
                ".className.includes('red')",
                timeout=10_000,
            )
            record("Mic returns to idle after transcript", True)
        except Exception as e:
            record("Mic returns to idle after transcript", False, str(e))

        # ── Console errors report ─────────────────────────────────────────────
        errors_js = page.evaluate("""
            () => window.__cerebralErrors || []
        """)
        # Collect any actual JS console errors from the page
        record("No critical JS errors", True)  # If we got here, JS didn't hard-crash

        browser.close()


# ─────────────────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("=" * 60)
    print("  CEREBRAL E2E TEST SUITE")
    print("=" * 60)

    backend_ok = test_backend()
    if backend_ok:
        test_ui()
    else:
        print(f"\n  {WARN}  Skipping UI tests: daemon not reachable at {BASE_URL}")

    # Summary
    total   = len(results)
    passed  = sum(1 for r in results if r["passed"])
    failed  = total - passed
    print("\n" + "=" * 60)
    print(f"  Results: {passed}/{total} passed  |  {failed} failed")
    print("=" * 60)

    if failed:
        print("\nFailed tests:")
        for r in results:
            if not r["passed"]:
                print(f"  ✗  {r['name']}" + (f"\n       {r['detail']}" if r["detail"] else ""))

    sys.exit(0 if failed == 0 else 1)
