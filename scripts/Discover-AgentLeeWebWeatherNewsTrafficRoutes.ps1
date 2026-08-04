$ErrorActionPreference = "Continue"

$Root = "D:\Leeway-Ecosystem v2.1.4"
$Proof = Join-Path $Root "Archive\proofs\telegram-shell"
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
New-Item -ItemType Directory -Force -Path $Proof | Out-Null

$Container = "agent-lee-telegram-shell"

function Run-Text {
  param([scriptblock]$Block)
  try {
    return (& $Block 2>&1 | Out-String)
  } catch {
    return $_.Exception.Message
  }
}

$ProbePython = @"
import json, urllib.request, urllib.error

targets = [
  ("code_routes", "GET", "http://agent_lee_code_mode:8080/routes", None),
  ("code_tools_full", "GET", "http://agent_lee_code_mode:8080/agent-lee/tools/full", None),
  ("code_skills_full", "GET", "http://agent_lee_code_mode:8080/agent-lee/skills/full", None),
  ("code_health", "GET", "http://agent_lee_code_mode:8080/health", None),
  ("runtime_root", "GET", "http://leeway_runtime_fabric:4001/", None),
  ("runtime_health", "GET", "http://leeway_runtime_fabric:4001/health", None),
  ("runtime_routes", "GET", "http://leeway_runtime_fabric:4001/routes", None),
  ("runtime_tools", "GET", "http://leeway_runtime_fabric:4001/tools", None),
  ("runtime_capabilities", "GET", "http://leeway_runtime_fabric:4001/capabilities", None),
]

tool_payloads = [
  ("tools_call_noop", "http://agent_lee_code_mode:8080/agent-lee/tools/call", {"tool":"noop","arguments":{}}),
  ("tools_call_weather", "http://agent_lee_code_mode:8080/agent-lee/tools/call", {"tool":"weather","arguments":{"location":"Milwaukee, WI"}}),
  ("tools_call_time", "http://agent_lee_code_mode:8080/agent-lee/tools/call", {"tool":"time","arguments":{"location":"Milwaukee, WI"}}),
  ("tools_call_web", "http://agent_lee_code_mode:8080/agent-lee/tools/call", {"tool":"web","arguments":{"query":"weather Milwaukee today"}}),
  ("runtime_tool_weather", "http://leeway_runtime_fabric:4001/tools/call", {"tool":"weather","arguments":{"location":"Milwaukee, WI"}}),
  ("runtime_tool_web", "http://leeway_runtime_fabric:4001/tools/call", {"tool":"web_search","arguments":{"query":"weather Milwaukee today"}}),
]

for name, method, url, payload in targets:
    print("\\n====", name, method, url, "====")
    try:
        req = urllib.request.Request(url, method=method)
        with urllib.request.urlopen(req, timeout=12) as r:
            body = r.read(5000).decode("utf-8", "replace")
            print("STATUS", r.status)
            print(body)
    except Exception as e:
        print("ERROR", repr(e))

for name, url, payload in tool_payloads:
    print("\\n====", name, "POST", url, "====")
    try:
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(url, data=data, method="POST", headers={"Content-Type":"application/json"})
        with urllib.request.urlopen(req, timeout=20) as r:
            body = r.read(5000).decode("utf-8", "replace")
            print("STATUS", r.status)
            print(body)
    except urllib.error.HTTPError as e:
        print("HTTP_ERROR", e.code)
        print(e.read(5000).decode("utf-8", "replace"))
    except Exception as e:
        print("ERROR", repr(e))
"@

$ContainerProbe = Run-Text {
  docker exec $Container python -c $ProbePython
}

$SourceSearch = Run-Text {
  $Patterns = @(
    "web_search",
    "search_web",
    "weather",
    "traffic",
    "news",
    "duckduckgo",
    "serp",
    "google",
    "browser",
    "runtime/web-search",
    "tools/call",
    "agent-lee/tools/call"
  )

  $SearchRoots = @(
    (Join-Path $Root "agent-lee-coding-mode"),
    (Join-Path $Root "Leeway Runtime Fabric"),
    (Join-Path $Root "Cerebral"),
    (Join-Path $Root "runtime"),
    (Join-Path $Root "scripts")
  )

  foreach ($SearchRoot in $SearchRoots) {
    if (-not (Test-Path $SearchRoot)) { continue }
    Write-Output "===== SEARCH ROOT: $SearchRoot ====="
    Get-ChildItem $SearchRoot -Recurse -File -ErrorAction SilentlyContinue |
      Where-Object { $_.Extension -in @(".py",".js",".mjs",".ts",".tsx",".json",".ps1",".md",".txt",".yml",".yaml") } |
      Select-String -Pattern $Patterns -SimpleMatch -ErrorAction SilentlyContinue |
      Select-Object Path, LineNumber, Line |
      Format-Table -AutoSize | Out-String -Width 260
  }
}

$Receipt = @{
  verdict = "AGENT_LEE_WEB_WEATHER_NEWS_TRAFFIC_ROUTE_DISCOVERY_COMPLETE"
  container_probe = $ContainerProbe
  source_search = $SourceSearch
  created_at = (Get-Date).ToString("o")
}

$ReceiptPath = Join-Path $Proof "AGENT_LEE_WEB_WEATHER_NEWS_TRAFFIC_ROUTE_DISCOVERY_$Stamp.receipt.json"
$TextPath = Join-Path $Proof "AGENT_LEE_WEB_WEATHER_NEWS_TRAFFIC_ROUTE_DISCOVERY_$Stamp.txt"

$Receipt | ConvertTo-Json -Depth 100 | Set-Content -Path $ReceiptPath -Encoding UTF8

@"
==================== CONTAINER ROUTE PROBE ====================

$ContainerProbe

==================== SOURCE SEARCH ====================

$SourceSearch
"@ | Set-Content -Path $TextPath -Encoding UTF8

Write-Host ""
Write-Host "Web/weather/news/traffic discovery complete." -ForegroundColor Green
Write-Host "Receipt: $ReceiptPath" -ForegroundColor Cyan
Write-Host "Text report: $TextPath" -ForegroundColor Cyan

notepad $TextPath
