# Cerebral Services Recovery Script
# This script restarts the foundational services for Agent Lee

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$VenvPython = Join-Path $Root ".venv\Scripts\python.exe"
$VenvPythonW = Join-Path $Root ".venv\Scripts\pythonw.exe"
$ModelPath = "C:\models\qwen2.5-1.5b-instruct-q4_k_m.gguf"
$PocketServerPath = Join-Path (Split-Path -Parent $Root) "Tools\Portable-VSCode-MCP-Kit\scripts\pocket_tts_server.py"

Write-Output "[Recovery] Cleaning up existing Python processes..."
Get-Process -Name python, pythonw -ErrorAction SilentlyContinue | Stop-Process -Force

Write-Output "[Recovery] Starting llama_cpp (Foundry) on port 8000..."
# Start llama_cpp if the model path exists
if (Test-Path $ModelPath) {
    Start-Process -FilePath $VenvPython -ArgumentList "-m", "llama_cpp.server", "--model", $ModelPath, "--port", "8000", "--n_ctx", "2048", "--host", "0.0.0.0" -NoNewWindow
} else {
    Write-Warning "[Recovery] Model path $ModelPath not found. Skipping llama_cpp startup."
}

Write-Output "[Recovery] Starting Pocket TTS on port 8007..."
if (Test-Path $PocketServerPath) {
    # Set ENV for port override
    $Env:POCKET_TTS_PORT = "8007"
    $Env:POCKET_ALLOW_APP_VOICE_OVERRIDE = "true"
    Start-Process -FilePath $VenvPython -ArgumentList $PocketServerPath, "--port", "8007" -NoNewWindow
} else {
    Write-Warning "[Recovery] Pocket TTS server path $PocketServerPath not found. Skipping Pocket TTS startup."
}

Write-Output "[Recovery] Starting Cerebral Daemon on port 8765..."
# Set ENV for ports so daemon picks up the right values
$Env:CEREBRAL_FOUNDRY_BASE = "http://127.0.0.1:8000"
$Env:CEREBRAL_FOUNDRY_PORT = "8000"
$Env:POCKET_TTS_URL = "http://127.0.0.1:8007/tts"
Start-Process -FilePath $VenvPython -ArgumentList (Join-Path $Root "CerebralDaemon.py") -NoNewWindow

Write-Output "[Recovery] Waiting for services to initialize..."
Start-Sleep -Seconds 5

Write-Output "[Recovery] Checking health nodes..."
try {
    $foundry = Invoke-RestMethod -Uri "http://127.0.0.1:8000/v1/models" -Method Get -TimeoutSec 5
    Write-Output "[Health] Foundry OK: $($foundry.data[0].id)"
}
catch {
    Write-Warning "[Health] Foundry NOT responding on 8000"
}

try {
    $tts = Invoke-RestMethod -Uri "http://127.0.0.1:8007/health" -Method Get -TimeoutSec 2
    Write-Output "[Health] Pocket TTS OK: $($tts.status)"
}
catch {
    Write-Warning "[Health] Pocket TTS NOT responding on 8007"
}

try {
    $daemon = Invoke-RestMethod -Uri "http://127.0.0.1:8765/api/health" -Method Get -TimeoutSec 2
    Write-Output "[Health] Cerebral Daemon OK: $($daemon.status)"
}
catch {
    Write-Warning "[Health] Cerebral Daemon NOT responding on 8765"
}

Write-Output "[Recovery] All foundational services should be online. Check logs if issues persist."
