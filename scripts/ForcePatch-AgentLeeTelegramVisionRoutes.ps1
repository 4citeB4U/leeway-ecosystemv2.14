$ErrorActionPreference = "Stop"

$Root = "D:\Leeway-Ecosystem v2.1.4"
$ServiceRoot = Join-Path $Root "Cerebral\services\agent-lee-telegram-vision-lane"
$MainPy = Join-Path $ServiceRoot "app\main.py"
$ImageName = "agent-lee-telegram-vision-lane:local"
$ContainerName = "agent-lee-telegram-vision-lane"
$Artifacts = Join-Path $Root "Archive\agent-lee-artifacts\telegram-vision-lane"
$Proof = Join-Path $Root "Archive\proofs\telegram-vision-lane"
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"

New-Item -ItemType Directory -Force -Path $Proof | Out-Null

if (-not (Test-Path $MainPy)) {
  throw "main.py not found: $MainPy"
}

$Text = Get-Content $MainPy -Raw

if ($Text -notmatch "TELEGRAM_OFFSET_FILE") {
  $Text = $Text.Replace(
    'LATEST_FILE = ARTIFACT_ROOT / "latest_telegram_vision.json"',
    'LATEST_FILE = ARTIFACT_ROOT / "latest_telegram_vision.json"
TELEGRAM_OFFSET_FILE = ARTIFACT_ROOT / "telegram_update_offset.json"'
  )
}

if ($Text -notmatch '@app.post\("/test/send-telegram"\)') {
$Text += @'


# ---------------------------------------------------------------------
# Agent Lee Telegram send / vision-send / polling routes
# ---------------------------------------------------------------------

def get_telegram_offset() -> int:
    if not TELEGRAM_OFFSET_FILE.exists():
        return 0
    try:
        data = json.loads(TELEGRAM_OFFSET_FILE.read_text(encoding="utf-8"))
        return int(data.get("offset", 0))
    except Exception:
        return 0


def set_telegram_offset(offset: int) -> None:
    write_json(TELEGRAM_OFFSET_FILE, {
        "offset": int(offset),
        "updated_at": now_iso(),
    })


def telegram_get_updates(timeout_seconds: int = 20) -> Dict[str, Any]:
    if not TELEGRAM_BOT_TOKEN:
        return {"ok": False, "error": "TELEGRAM_BOT_TOKEN_NOT_SET"}

    payload = {
        "timeout": timeout_seconds,
        "allowed_updates": ["message", "edited_message"],
    }

    offset = get_telegram_offset()
    if offset > 0:
        payload["offset"] = offset

    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/getUpdates"
    r = requests.post(url, json=payload, timeout=timeout_seconds + 20)

    try:
        return r.json()
    except Exception:
        return {
            "ok": False,
            "error": "TELEGRAM_GET_UPDATES_NON_JSON",
            "status_code": r.status_code,
            "text": r.text[:1500],
        }


@app.post("/test/send-telegram")
async def test_send_telegram(request: Request):
    data = await request.json()
    text = data.get("text") or "Agent Lee Telegram vision lane test message."
    chat_id = str(data.get("chat_id") or DEFAULT_CHAT_ID)

    result = telegram_api("sendMessage", {
        "chat_id": chat_id,
        "text": text[:3900],
    })

    return {
        "ok": bool(result.get("ok")),
        "telegram": result,
        "chat_id_present": bool(chat_id),
        "token_present": bool(TELEGRAM_BOT_TOKEN),
        "created_at": now_iso(),
    }


@app.post("/test/describe-local-and-send")
async def describe_local_and_send(request: Request):
    data = await request.json()

    image_path = Path(data.get("image_path", ""))
    prompt = data.get("prompt")
    chat_id = str(data.get("chat_id") or DEFAULT_CHAT_ID)

    if not image_path.exists():
        alt = ARTIFACT_ROOT / str(data.get("image_path", "")).lstrip("/").replace("\\", "/")
        if alt.exists():
            image_path = alt
        else:
            return JSONResponse(status_code=404, content={
                "ok": False,
                "error": "IMAGE_NOT_FOUND",
                "image_path": str(image_path),
            })

    normalized = normalize_image(image_path)
    vision = qwen_vision_describe(normalized, prompt)
    description = vision.get("response") or vision.get("error") or "Agent Lee could not analyze the image."

    message = "Agent Lee Vision:\n\n" + description

    result = telegram_api("sendMessage", {
        "chat_id": chat_id,
        "text": message[:3900],
    })

    return {
        "ok": bool(vision.get("ok")) and bool(result.get("ok")),
        "image_path": str(image_path),
        "normalized": str(normalized),
        "vision": vision,
        "telegram": result,
        "created_at": now_iso(),
    }


@app.post("/telegram/poll-once")
def telegram_poll_once():
    updates = telegram_get_updates(timeout_seconds=15)

    receipt = {
        "ok": False,
        "verdict": "TELEGRAM_POLL_ONCE_STARTED",
        "updates": updates,
        "handled": [],
        "created_at": now_iso(),
    }

    if not updates.get("ok"):
        receipt["verdict"] = "TELEGRAM_POLL_FAILED"
        return receipt

    results = updates.get("result", [])

    for update in results:
        update_id = int(update.get("update_id", 0))
        if update_id:
            set_telegram_offset(update_id + 1)

        message = update.get("message") or update.get("edited_message") or {}

        if "photo" in message:
            handled = handle_photo_message(message)
            receipt["handled"].append(handled)
        else:
            chat_id = str(message.get("chat", {}).get("id", DEFAULT_CHAT_ID))
            text = message.get("text", "")
            if text:
                reply = telegram_api("sendMessage", {
                    "chat_id": chat_id,
                    "text": "Agent Lee Vision is online. Send me a photo and I will describe it.",
                })
                receipt["handled"].append({
                    "type": "text",
                    "text": text,
                    "reply": reply,
                })

    receipt["ok"] = True
    receipt["verdict"] = "TELEGRAM_POLL_ONCE_COMPLETED"
    receipt["update_count"] = len(results)
    receipt["completed_at"] = now_iso()
    return receipt

'@
}

Set-Content -Path $MainPy -Value $Text -Encoding UTF8

docker build -t $ImageName $ServiceRoot

$EnvLines = docker inspect agent-lee-telegram-shell --format "{{range .Config.Env}}{{println .}}{{end}}" 2>$null

$TokenLine = $EnvLines | Where-Object { $_ -match "^TELEGRAM_BOT_TOKEN=" } | Select-Object -First 1
$ChatLine = $EnvLines | Where-Object { $_ -match "^TELEGRAM_CHAT_ID=" } | Select-Object -First 1

$Existing = docker ps -a --format "{{.Names}}" | Where-Object { $_ -eq $ContainerName }
if ($Existing) {
  docker rm -f $ContainerName | Out-Null
}

$RunArgs = @(
  "run", "-d",
  "--init",
  "--name", $ContainerName,
  "--network", "leeway-ecosystemv214_leeway-net",
  "-p", "8104:8104",
  "--dns", "8.8.8.8",
  "--dns", "1.1.1.1",
  "--mount", "type=bind,source=$Artifacts,target=/artifacts",
  "-e", "AGENT_LEE_ARTIFACT_ROOT=/artifacts",
  "-e", "OLLAMA_BASE_URL=http://leeway_ollama:11434",
  "-e", "AGENT_LEE_VISION_MODEL=qwen2.5vl:7b"
)

if ($TokenLine) { $RunArgs += @("-e", $TokenLine) }
if ($ChatLine) { $RunArgs += @("-e", $ChatLine) }

$RunArgs += $ImageName

docker @RunArgs | Out-Null

Start-Sleep -Seconds 8

Write-Host ""
Write-Host "Registered routes:" -ForegroundColor Cyan
docker exec agent-lee-telegram-vision-lane python -c "from app.main import app; [print(getattr(r,'path',''), getattr(r,'methods','')) for r in app.routes]"

$Status = Invoke-RestMethod -Method Get -Uri "http://127.0.0.1:8104/status" -TimeoutSec 60

$Receipt = @{
  verdict = "AGENT_LEE_TELEGRAM_VISION_ROUTES_FORCE_PATCHED"
  routes_expected = @(
    "/test/send-telegram",
    "/test/describe-local-and-send",
    "/telegram/poll-once"
  )
  status = $Status
  created_at = (Get-Date).ToString("o")
}

$ReceiptPath = Join-Path $Proof "AGENT_LEE_TELEGRAM_VISION_ROUTES_FORCE_PATCH_$Stamp.receipt.json"
$Receipt | ConvertTo-Json -Depth 80 | Set-Content -Path $ReceiptPath -Encoding UTF8

notepad $ReceiptPath

Write-Host ""
Write-Host "Force patch complete." -ForegroundColor Green
Write-Host "Send test: http://127.0.0.1:8104/test/send-telegram" -ForegroundColor Cyan
Write-Host "Vision-send test: http://127.0.0.1:8104/test/describe-local-and-send" -ForegroundColor Cyan
Write-Host "Poll once: http://127.0.0.1:8104/telegram/poll-once" -ForegroundColor Cyan