param(
    [Parameter(Mandatory=$true)]
    [string]$Text,

    [Parameter(Mandatory=$false)]
    [string]$ChatId,

    [Parameter(Mandatory=$false)]
    [string]$EnvPath = "D:\Leeway-Ecosystem v2.1.4\.env.local"
)

$ErrorActionPreference = "Stop"

function Read-EnvMap {
    param([string]$Path)

    $map = @{}

    if (-not (Test-Path $Path)) {
        throw ".env.local not found: $Path"
    }

    $lines = Get-Content -Path $Path -ErrorAction SilentlyContinue

    foreach ($line in $lines) {
        $raw = [string]$line
        $trim = $raw.Trim()

        if ([string]::IsNullOrWhiteSpace($trim)) { continue }
        if ($trim.StartsWith("#")) { continue }

        $idx = $raw.IndexOf("=")
        if ($idx -le 0) { continue }

        $key = $raw.Substring(0, $idx).Trim()
        $value = $raw.Substring($idx + 1).Trim()

        if (
            ($value.StartsWith('"') -and $value.EndsWith('"')) -or
            ($value.StartsWith("'") -and $value.EndsWith("'"))
        ) {
            $value = $value.Substring(1, $value.Length - 2)
        }

        $map[$key] = $value
    }

    return $map
}

function Pick-Value {
    param(
        [hashtable]$Map,
        [string[]]$Keys
    )

    foreach ($key in $Keys) {
        if ($Map.ContainsKey($key) -and -not [string]::IsNullOrWhiteSpace([string]$Map[$key])) {
            return [string]$Map[$key]
        }
    }

    return $null
}

function Get-Sha256Text {
    param([string]$Text)
    $sha = [System.Security.Cryptography.SHA256]::Create()
    $bytes = [System.Text.Encoding]::UTF8.GetBytes([string]$Text)
    $hash = $sha.ComputeHash($bytes)
    return ([System.BitConverter]::ToString($hash)).Replace("-", "").ToLowerInvariant()
}

$envMap = Read-EnvMap -Path $EnvPath

$token = Pick-Value -Map $envMap -Keys @(
    "TELEGRAM_BOT_TOKEN",
    "AGENT_LEE_TELEGRAM_BOT_TOKEN",
    "LEEWAY_TELEGRAM_BOT_TOKEN",
    "TELEGRAM_API_TOKEN",
    "TG_BOT_TOKEN",
    "TELEGRAM_TOKEN",
    "BOT_TOKEN"
)

if ([string]::IsNullOrWhiteSpace($token)) {
    throw "Telegram token missing in .env.local."
}

if ([string]::IsNullOrWhiteSpace($ChatId)) {
    $ChatId = Pick-Value -Map $envMap -Keys @(
        "TELEGRAM_CHAT_ID",
        "AGENT_LEE_TELEGRAM_CHAT_ID",
        "LEEWAY_TELEGRAM_CHAT_ID",
        "LEONARD_TELEGRAM_CHAT_ID",
        "TELEGRAM_USER_CHAT_ID",
        "TG_CHAT_ID",
        "TELEGRAM_TARGET_CHAT_ID"
    )
}

if ([string]::IsNullOrWhiteSpace($ChatId)) {
    throw "Telegram chat id missing in .env.local."
}

if ([string]::IsNullOrWhiteSpace($Text)) {
    throw "Text is required."
}

$uri = "https://api.telegram.org/bot$token/sendMessage"

$body = @{
    chat_id = $ChatId
    text = $Text
    disable_notification = $false
    link_preview_options = @{
        is_disabled = $true
    }
} | ConvertTo-Json -Depth 20

$response = Invoke-RestMethod `
    -Uri $uri `
    -Method Post `
    -ContentType "application/json; charset=utf-8" `
    -Body $body `
    -TimeoutSec 35

$out = [ordered]@{
    ok = ($response.ok -eq $true)
    provider = "telegram"
    operation = "telegram.send_text"
    method = "sendMessage"
    messageId = $(if ($response.result) { $response.result.message_id } else { $null })
    chatIdHash = Get-Sha256Text $ChatId
    textHash = Get-Sha256Text $Text
    sentAt = (Get-Date).ToUniversalTime().ToString("o")
}

$out | ConvertTo-Json -Depth 20