import json
import os
import re
import time
import html
import uuid
from pathlib import Path
from datetime import datetime, timezone
from typing import Any, Dict, Optional, List

import requests
from bs4 import BeautifulSoup
from fastapi import FastAPI
from pydantic import BaseModel, Field

APP = "leeway_research_lane"
VERSION = "0.2.0-weather-web-fallback"
RECEIPT_DIR = Path(os.environ.get("LEEWAY_RECEIPT_DIR", "/app/receipts"))
BRIEF_DIR = Path(os.environ.get("LEEWAY_BRIEF_DIR", "/app/briefs"))
RECEIPT_DIR.mkdir(parents=True, exist_ok=True)
BRIEF_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title=APP, version=VERSION)


class SearchRequest(BaseModel):
    query: str = Field(..., min_length=1)
    limit: int = 8
    source: Optional[str] = "telegram"
    mode: Optional[str] = "quick"


class BriefRequest(BaseModel):
    topic: str = Field(..., min_length=1)
    content: Optional[str] = ""
    query: Optional[str] = None
    source: Optional[str] = "telegram"


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def slugify(value: str) -> str:
    value = re.sub(r"[^a-zA-Z0-9]+", "-", value.strip().lower()).strip("-")
    return value[:80] or "research"


def write_receipt(kind: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    receipt = {
        "verdict": payload.get("verdict", f"{APP}_{kind.upper()}_RECEIPT"),
        "lane": APP,
        "version": VERSION,
        "kind": kind,
        "created_at": now_iso(),
        **payload,
    }
    path = RECEIPT_DIR / f"{APP}_{kind}_{int(time.time())}_{uuid.uuid4().hex[:8]}.receipt.json"
    path.write_text(json.dumps(receipt, indent=2), encoding="utf-8")
    latest = RECEIPT_DIR / "latest.receipt.json"
    latest.write_text(json.dumps(receipt, indent=2), encoding="utf-8")
    receipt["receipt_path"] = str(path)
    return receipt


def looks_like_weather(query: str) -> bool:
    q = query.lower()
    return any(x in q for x in ["weather", "temperature", "forecast", "rain", "snow", "storm"])


def extract_weather_location(query: str) -> str:
    q = query
    q = re.sub(r"(?i)\b(today'?s?|current|weather|forecast|temperature|in|for|right now|please|search|web)\b", " ", q)
    q = re.sub(r"\s+", " ", q).strip(" ,.-")
    return q or "Milwaukee Wisconsin"


def weather_lookup(query: str) -> List[Dict[str, Any]]:
    location = extract_weather_location(query)
    url = f"https://wttr.in/{requests.utils.quote(location)}"
    r = requests.get(
        url,
        params={"format": "j1"},
        headers={"User-Agent": "LeewayResearchLane/0.2"},
        timeout=20,
    )
    r.raise_for_status()
    data = r.json()
    current = (data.get("current_condition") or [{}])[0]
    nearest = (data.get("nearest_area") or [{}])[0]
    area = ", ".join([
        ((nearest.get("areaName") or [{}])[0].get("value") if nearest.get("areaName") else location) or location,
        ((nearest.get("region") or [{}])[0].get("value") if nearest.get("region") else "") or "",
        ((nearest.get("country") or [{}])[0].get("value") if nearest.get("country") else "") or "",
    ]).strip(", ")
    desc = ((current.get("weatherDesc") or [{}])[0].get("value") if current.get("weatherDesc") else "") or "weather unavailable"
    temp_f = current.get("temp_F")
    feels_f = current.get("FeelsLikeF")
    humidity = current.get("humidity")
    wind = current.get("windspeedMiles")
    answer = f"{area}: {desc}, {temp_f}┬░F, feels like {feels_f}┬░F, humidity {humidity}%, wind {wind} mph."
    return [{
        "title": f"Current weather for {area}",
        "url": url,
        "snippet": answer,
        "source": "wttr_in_keyless_weather",
        "raw_current": current,
    }]


def duckduckgo_lite(query: str, limit: int = 8) -> List[Dict[str, Any]]:
    urls = [
        ("GET", "https://html.duckduckgo.com/html/", {"q": query}),
        ("POST", "https://duckduckgo.com/html/", {"q": query}),
    ]

    last_error = None
    for method, url, params in urls:
        try:
            if method == "GET":
                r = requests.get(url, params=params, headers={"User-Agent": "Mozilla/5.0 LeewayResearchLane/0.2"}, timeout=20)
            else:
                r = requests.post(url, data=params, headers={"User-Agent": "Mozilla/5.0 LeewayResearchLane/0.2"}, timeout=20)
            r.raise_for_status()
            soup = BeautifulSoup(r.text, "html.parser")
            results = []

            selectors = [
                ("a.result__a", ".result__snippet"),
                (".result a", ".result__snippet"),
                ("a[href]", None),
            ]

            for link_sel, snippet_sel in selectors:
                for a in soup.select(link_sel):
                    title = a.get_text(" ", strip=True)
                    href = a.get("href") or ""
                    if not title or not href:
                        continue
                    if "duckduckgo.com" in href and "uddg=" in href:
                        try:
                            from urllib.parse import urlparse, parse_qs, unquote
                            qs = parse_qs(urlparse(href).query)
                            if "uddg" in qs:
                                href = unquote(qs["uddg"][0])
                        except Exception:
                            pass
                    snippet = ""
                    parent = a.find_parent()
                    if parent and snippet_sel:
                        s = parent.select_one(snippet_sel)
                        snippet = s.get_text(" ", strip=True) if s else ""
                    if href.startswith("http") and "duckduckgo.com/y.js" not in href:
                        results.append({
                            "title": title,
                            "url": href,
                            "snippet": snippet,
                            "source": "duckduckgo_html",
                        })
                    if len(results) >= limit:
                        return results
            if results:
                return results
        except Exception as e:
            last_error = repr(e)

    if last_error:
        raise RuntimeError(last_error)
    return []


def hn_search(query: str, limit: int = 6) -> List[Dict[str, Any]]:
    url = "https://hn.algolia.com/api/v1/search"
    r = requests.get(
        url,
        params={"query": query, "tags": "story", "hitsPerPage": limit},
        headers={"User-Agent": "LeewayResearchLane/0.2"},
        timeout=18,
    )
    r.raise_for_status()
    data = r.json()
    out = []
    for item in data.get("hits", [])[:limit]:
        out.append({
            "title": item.get("title") or item.get("story_title") or "",
            "url": item.get("url") or f"https://news.ycombinator.com/item?id={item.get('objectID')}",
            "points": item.get("points"),
            "comments": item.get("num_comments"),
            "source": "hackernews_algolia",
        })
    return out


def github_search(query: str, limit: int = 5) -> List[Dict[str, Any]]:
    url = "https://api.github.com/search/repositories"
    r = requests.get(
        url,
        params={"q": query, "sort": "updated", "order": "desc", "per_page": limit},
        headers={"User-Agent": "LeewayResearchLane/0.2"},
        timeout=18,
    )
    r.raise_for_status()
    data = r.json()
    out = []
    for item in data.get("items", [])[:limit]:
        out.append({
            "title": item.get("full_name"),
            "url": item.get("html_url"),
            "snippet": item.get("description") or "",
            "stars": item.get("stargazers_count"),
            "updated_at": item.get("updated_at"),
            "source": "github_repositories",
        })
    return out


def synthesize(query: str, results: List[Dict[str, Any]], mode: str) -> str:
    if not results:
        return f"I could not find reliable results for: {query}"

    if looks_like_weather(query) and results and results[0].get("source") == "wttr_in_keyless_weather":
        return results[0].get("snippet", "")

    lines = [f"Research mode: {mode}", f"Query: {query}", ""]
    for idx, item in enumerate(results[:10], start=1):
        title = item.get("title") or "Untitled"
        src = item.get("source") or "source"
        snippet = item.get("snippet") or ""
        url = item.get("url") or ""
        line = f"{idx}. [{src}] {title}"
        if snippet:
            line += f" - {snippet[:220]}"
        if url:
            line += f" ({url})"
        lines.append(line)
    return "\n".join(lines)


@app.get("/health")
def health():
    return {"ok": True, "app": APP, "version": VERSION, "created_at": now_iso()}


@app.get("/status")
def status():
    return {
        "app": APP,
        "version": VERSION,
        "purpose": "Leeway-native research lane for quick web search, weather, deep current-signal research, and HTML briefs.",
        "endpoints": ["/health", "/status", "/openapi.json", "/search/quick", "/search/deep", "/brief/html", "/receipts/latest"],
        "quick_sources": ["wttr_in_keyless_weather", "duckduckgo_html"],
        "deep_sources_v1": ["duckduckgo_html", "hackernews_algolia", "github_repositories"],
        "future_sources": ["reddit", "youtube", "polymarket", "perplexity", "last30days_style_plugins"],
        "receipt_dir": str(RECEIPT_DIR),
        "brief_dir": str(BRIEF_DIR),
        "created_at": now_iso(),
    }


@app.post("/search/quick")
def search_quick(req: SearchRequest):
    query = req.query.strip()
    results = []
    errors = []

    if looks_like_weather(query):
        try:
            results.extend(weather_lookup(query))
        except Exception as e:
            errors.append(f"wttr_in_keyless_weather: {repr(e)}")

    if not results:
        try:
            results.extend(duckduckgo_lite(query, req.limit))
        except Exception as e:
            errors.append(f"duckduckgo_html: {repr(e)}")

    answer = synthesize(query, results, "quick")
    receipt = write_receipt("quick_search", {
        "verdict": "LEEWAY_RESEARCH_QUICK_SEARCH_COMPLETE" if results else "LEEWAY_RESEARCH_QUICK_SEARCH_DEGRADED",
        "query": query,
        "source": req.source,
        "result_count": len(results),
        "results": results,
        "errors": errors,
        "answer": answer,
    })

    return {"ok": bool(results), "lane": APP, "mode": "quick", "query": query, "answer": answer, "results": results, "errors": errors, "receipt": receipt}


@app.post("/search/deep")
def search_deep(req: SearchRequest):
    query = req.query.strip()
    results = []
    errors = []

    for name, fn in [("duckduckgo_html", duckduckgo_lite), ("hackernews_algolia", hn_search), ("github_repositories", github_search)]:
        try:
            results.extend(fn(query, req.limit))
        except Exception as e:
            errors.append(f"{name}: {repr(e)}")

    answer = synthesize(query, results, "deep_v1")
    receipt = write_receipt("deep_search", {
        "verdict": "LEEWAY_RESEARCH_DEEP_SEARCH_COMPLETE" if results else "LEEWAY_RESEARCH_DEEP_SEARCH_DEGRADED",
        "query": query,
        "source": req.source,
        "result_count": len(results),
        "results": results,
        "errors": errors,
        "answer": answer,
        "note": "V1 deep search uses free/keyless public sources where possible. Paid/browser-cookie sources remain disabled until explicitly approved.",
    })

    return {"ok": bool(results), "lane": APP, "mode": "deep_v1", "query": query, "answer": answer, "results": results, "errors": errors, "receipt": receipt}


@app.post("/brief/html")
def brief_html(req: BriefRequest):
    topic = req.topic.strip()
    content = req.content or ""

    if req.query and not content:
        deep = search_deep(SearchRequest(query=req.query, limit=8, source=req.source, mode="deep"))
        content = deep.get("answer", "")

    slug = slugify(topic)
    path = BRIEF_DIR / f"{slug}-{int(time.time())}.html"

    escaped_topic = html.escape(topic)
    escaped_content = html.escape(content).replace("\n", "<br>\n")

    html_doc = f"""<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>{escaped_topic}</title>
<style>
body {{ font-family: system-ui, Segoe UI, Arial, sans-serif; background:#101114; color:#f4f4f5; line-height:1.55; padding:32px; }}
main {{ max-width: 980px; margin:auto; }}
.card {{ background:#181a20; border:1px solid #2d3340; border-radius:16px; padding:24px; }}
.badge {{ display:inline-block; padding:4px 10px; border:1px solid #3b82f6; border-radius:999px; color:#93c5fd; }}
.meta {{ color:#a1a1aa; font-size:14px; }}
</style>
</head>
<body>
<main>
<p class="badge">Leeway Research Brief</p>
<h1>{escaped_topic}</h1>
<p class="meta">Created by {APP} at {html.escape(now_iso())}</p>
<section class="card">{escaped_content}</section>
</main>
</body>
</html>"""

    path.write_text(html_doc, encoding="utf-8")
    receipt = write_receipt("html_brief", {"verdict": "LEEWAY_RESEARCH_HTML_BRIEF_CREATED", "topic": topic, "brief_path": str(path), "source": req.source})
    return {"ok": True, "lane": APP, "topic": topic, "brief_path": str(path), "receipt": receipt}


@app.get("/receipts/latest")
def latest_receipt():
    path = RECEIPT_DIR / "latest.receipt.json"
    if not path.exists():
        return {"ok": False, "lane": APP, "message": "No receipt exists yet."}
    return json.loads(path.read_text(encoding="utf-8"))


# LEEWAY_LASER_FASTAPI_ROUTES_BEGIN
try:
    from datetime import datetime
    from typing import Any, Dict
    from fastapi.responses import HTMLResponse

    _leeway_laser_service = "leeway_research_lane"

    @app.get("/")
    def leeway_laser_root():
        return {
            "ok": True,
            "service": _leeway_laser_service,
            "version": "2.1.4",
            "health": "/health",
            "status": "/status",
            "routes": "/routes",
            "openapi": "/openapi.json",
            "docs": "/docs"
        }

    @app.get("/status")
    def leeway_laser_status():
        return {
            "ok": True,
            "status": "running",
            "service": _leeway_laser_service,
            "time": datetime.utcnow().isoformat()
        }

    @app.get("/routes")
    def leeway_laser_routes():
        return {
            "ok": True,
            "service": _leeway_laser_service,
            "routes": ["/", "/health", "/status", "/routes", "/openapi.json", "/docs", "/system-health/report"]
        }

    @app.post("/system-health/report")
    def leeway_laser_system_health_report(payload: Dict[str, Any]):
        return {
            "ok": True,
            "accepted": True,
            "service": _leeway_laser_service,
            "receivedAt": datetime.utcnow().isoformat(),
            "message": "System health report received."
        }
except Exception:
    pass
# LEEWAY_LASER_FASTAPI_ROUTES_END
