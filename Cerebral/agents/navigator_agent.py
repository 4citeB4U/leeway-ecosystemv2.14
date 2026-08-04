"""
NavigatorAgent — Browser Automation via Playwright
====================================================
Controls a Chromium browser headlessly (or headed) to open URLs,
take screenshots, extract content, click elements, fill forms,
run JavaScript, and scrape search results.

Playwright must be installed:  pip install playwright && playwright install chromium

Tools
------
  healthcheck        — verify Playwright + chromium are available
  open_url           — navigate to a URL, return title + status
  screenshot_page    — capture full-page screenshot, save to tmp/
  extract_text       — return visible body text from current page
  click_selector     — click CSS selector on current page
  fill_form          — fill a dict of {selector: value} pairs + optional submit
  run_script         — execute JavaScript and return result
  search_web         — go to DuckDuckGo, search, return top N results
  pdf_export         — save current page as PDF
  close_browser      — close browser and clean up session
"""

import os
import time
from datetime import datetime, timezone
from typing import Any

ROOT    = r"C:\Cerebral"
TMP_DIR = os.path.join(ROOT, "tmp", "navigator")

TOOLS = [
    "healthcheck", "open_url", "screenshot_page", "extract_text",
    "click_selector", "fill_form", "run_script", "search_web",
    "pdf_export", "close_browser",
]


class NavigatorAgent:
    """Browser automation agent powered by Playwright Chromium."""

    name        = "navigator"
    description = "Headless browser automation — browse, screenshot, scrape, and form-fill via Playwright."
    tools       = TOOLS

    def __init__(self):
        self._browser  = None
        self._page     = None
        self._pw       = None
        self._playwright = None

    # ── Public interface ──────────────────────────────────────────────────────

    def run(self, tool: str, args: dict = None) -> dict:
        args = args or {}
        if tool not in TOOLS:
            return {"ok": False, "error": f"Unknown tool '{tool}'. Available: {TOOLS}"}
        method = getattr(self, f"_tool_{tool}", None)
        if method is None:
            return {"ok": False, "error": f"Tool '{tool}' not implemented."}
        try:
            return method(args)
        except Exception as e:
            return {"ok": False, "error": str(e), "tool": tool}

    # ── Session management ────────────────────────────────────────────────────

    def _ensure_browser(self, headless: bool = True):
        if self._browser and self._page:
            return
        from playwright.sync_api import sync_playwright
        self._playwright = sync_playwright().start()
        self._browser    = self._playwright.chromium.launch(headless=headless)
        self._page       = self._browser.new_page()

    def _close(self):
        try:
            if self._browser:
                self._browser.close()
            if self._playwright:
                self._playwright.stop()
        except Exception:
            pass
        self._browser  = None
        self._page     = None
        self._playwright = None

    # ── Tools ─────────────────────────────────────────────────────────────────

    def _tool_healthcheck(self, args: dict) -> dict:
        try:
            from playwright.sync_api import sync_playwright
            pw = sync_playwright().start()
            browser = pw.chromium.launch(headless=True)
            page    = browser.new_page()
            page.goto("about:blank")
            title   = page.title()
            browser.close()
            pw.stop()
            return {"ok": True, "playwright": "available", "chromium": "launched", "test_title": title}
        except ImportError:
            return {"ok": False, "error": "playwright not installed. Run: pip install playwright && playwright install chromium"}
        except Exception as e:
            return {"ok": False, "error": str(e)}

    def _tool_open_url(self, args: dict) -> dict:
        url       = args.get("url", "https://example.com")
        headless  = args.get("headless", True)
        wait_ms   = int(args.get("wait_ms", 2000))
        self._ensure_browser(headless=headless)
        resp      = self._page.goto(url, timeout=30000)
        self._page.wait_for_timeout(wait_ms)
        return {
            "ok":     True,
            "url":    self._page.url,
            "title":  self._page.title(),
            "status": resp.status if resp else None,
        }

    def _tool_screenshot_page(self, args: dict) -> dict:
        label     = args.get("label", f"nav_{int(time.time())}")
        full_page = args.get("full_page", True)
        os.makedirs(TMP_DIR, exist_ok=True)
        path      = os.path.join(TMP_DIR, f"{label}.png")
        self._ensure_browser()
        self._page.screenshot(path=path, full_page=full_page)
        return {"ok": True, "path": path, "url": self._page.url}

    def _tool_extract_text(self, args: dict) -> dict:
        max_chars = int(args.get("max_chars", 4000))
        self._ensure_browser()
        text = self._page.inner_text("body")
        return {
            "ok":      True,
            "url":     self._page.url,
            "length":  len(text),
            "text":    text[:max_chars],
            "truncated": len(text) > max_chars,
        }

    def _tool_click_selector(self, args: dict) -> dict:
        selector  = args.get("selector", "")
        wait_ms   = int(args.get("wait_ms", 1000))
        self._ensure_browser()
        self._page.click(selector, timeout=10000)
        self._page.wait_for_timeout(wait_ms)
        return {"ok": True, "clicked": selector, "url": self._page.url}

    def _tool_fill_form(self, args: dict) -> dict:
        fields = args.get("fields", {})  # {selector: value}
        submit = args.get("submit", "")  # selector to click after filling
        self._ensure_browser()
        filled = []
        for selector, value in fields.items():
            self._page.fill(selector, str(value))
            filled.append(selector)
        if submit:
            self._page.click(submit)
            self._page.wait_for_timeout(2000)
        return {"ok": True, "filled": filled, "submitted": bool(submit), "url": self._page.url}

    def _tool_run_script(self, args: dict) -> dict:
        script = args.get("script", "document.title")
        self._ensure_browser()
        result = self._page.evaluate(script)
        return {"ok": True, "result": result, "url": self._page.url}

    def _tool_search_web(self, args: dict) -> dict:
        query  = args.get("query", "")
        n      = int(args.get("n", 5))
        engine = args.get("engine", "duckduckgo")  # duckduckgo | bing | google
        urls   = {
            "duckduckgo": f"https://duckduckgo.com/?q={query.replace(' ', '+')}",
            "bing":       f"https://www.bing.com/search?q={query.replace(' ', '+')}",
            "google":     f"https://www.google.com/search?q={query.replace(' ', '+')}",
        }
        self._tool_open_url({"url": urls.get(engine, urls["duckduckgo"]), "wait_ms": 3000})
        # Extract links from results
        links = self._page.evaluate("""
            () => {
                const anchors = Array.from(document.querySelectorAll('a[href^="http"]'));
                return anchors
                    .filter(a => !a.href.includes('duckduckgo') && !a.href.includes('bing.net'))
                    .slice(0, 10)
                    .map(a => ({ text: a.innerText.trim().slice(0, 80), href: a.href }));
            }
        """)
        return {
            "ok":     True,
            "query":  query,
            "engine": engine,
            "results": links[:n],
        }

    def _tool_pdf_export(self, args: dict) -> dict:
        label = args.get("label", f"nav_{int(time.time())}")
        os.makedirs(TMP_DIR, exist_ok=True)
        path  = os.path.join(TMP_DIR, f"{label}.pdf")
        self._ensure_browser()
        self._page.pdf(path=path, format="A4")
        return {"ok": True, "path": path, "url": self._page.url}

    def _tool_close_browser(self, args: dict) -> dict:
        self._close()
        return {"ok": True, "message": "Browser session closed."}

    def __del__(self):
        self._close()
