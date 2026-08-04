param(
  [string]$Root = "D:\Leeway-Ecosystem v2.1.4"
)

$ErrorActionPreference = "Stop"

$BridgePath = Join-Path $Root "agent-lee-coding-mode\runtime\telegram\agent-lee-telegram-bridge.cjs"
$PidPath = Join-Path $Root "agent-lee-coding-mode\runtime\telegram\agent-lee-telegram-bridge.pid"
$StatePath = Join-Path $Root "agent-lee-coding-mode\runtime\telegram\agent-lee-telegram-bridge.state.json"

if (-not (Test-Path -LiteralPath $BridgePath)) {
  throw "Telegram bridge not found: $BridgePath"
}

if (Test-Path -LiteralPath $PidPath) {
  try {
    $existingPid = [int](Get-Content -LiteralPath $PidPath -Raw).Trim()
    $existing = Get-Process -Id $existingPid -ErrorAction SilentlyContinue
    if ($existing) {
      [ordered]@{
        ok = $true
        status = "ALREADY_RUNNING"
        pid = $existingPid
        bridgePath = $BridgePath
        pidPath = $PidPath
        statePath = $StatePath
      } | ConvertTo-Json -Depth 8 -Compress
      exit 0
    }
  } catch {}
}

$proc = Start-Process -FilePath "node.exe" -ArgumentList @($BridgePath) -WorkingDirectory (Join-Path $Root "agent-lee-coding-mode\runtime\telegram") -PassThru -WindowStyle Hidden
Set-Content -LiteralPath $PidPath -Value $proc.Id -Encoding ASCII

[ordered]@{
  ok = $true
  status = "STARTED"
  pid = $proc.Id
  bridgePath = $BridgePath
  pidPath = $PidPath
  statePath = $StatePath
} | ConvertTo-Json -Depth 8 -Compress
