$ErrorActionPreference = "Continue"

$Root = "D:\Leeway-Ecosystem v2.1.4"
$DiscoveryDir = Join-Path $Root "agent-lee-coding-mode\discovery-layer"
$RuntimeDir = Join-Path $Root "agent-lee-coding-mode\runtime-fabric"
$DesktopDir = Join-Path $Root "agent-lee-coding-mode\desktop-runtime"
$LearningDir = Join-Path $Root "agent-lee-coding-mode\learning-development"
$ArchiveDir = Join-Path $Root "Archive"

foreach ($d in @(
    $DiscoveryDir,
    $RuntimeDir,
    $DesktopDir,
    $LearningDir,
    "$LearningDir\llm-advisor",
    "$LearningDir\events"
)) {
    New-Item -ItemType Directory -Force -Path $d | Out-Null
}

try {
    $state = Invoke-RestMethod "http://127.0.0.1:8777/state" -TimeoutSec 8
    $json = $state | ConvertTo-Json -Depth 80
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)

    [System.IO.File]::WriteAllText((Join-Path $DiscoveryDir "AGENT_LEE_DOCKER_HYBRID_FABRIC_STATE.json"), $json, $utf8NoBom)
    [System.IO.File]::WriteAllText((Join-Path $DiscoveryDir "AGENT_LEE_HYBRID_AUTONOMIC_FABRIC_STATE.json"), $json, $utf8NoBom)
    [System.IO.File]::WriteAllText((Join-Path $DiscoveryDir "AGENT_LEE_CONTAINER_TOPOLOGY.json"), $json, $utf8NoBom)
    [System.IO.File]::WriteAllText((Join-Path $RuntimeDir "AGENT_LEE_DOCKER_HYBRID_FABRIC_STATE.json"), $json, $utf8NoBom)
    [System.IO.File]::WriteAllText((Join-Path $RuntimeDir "AGENT_LEE_HYBRID_AUTONOMIC_FABRIC_STATE.json"), $json, $utf8NoBom)
    [System.IO.File]::WriteAllText((Join-Path $DesktopDir "AGENT_LEE_DOCKER_HYBRID_FABRIC_STATE.json"), $json, $utf8NoBom)
    [System.IO.File]::WriteAllText((Join-Path $LearningDir "llm-advisor\latest-qwen-advisor-proof.json"), (($state.qwen | ConvertTo-Json -Depth 80)), $utf8NoBom)
} catch {
    exit 0
}