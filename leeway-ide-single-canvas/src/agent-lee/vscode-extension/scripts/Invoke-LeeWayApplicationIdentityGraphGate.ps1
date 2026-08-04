<#
LEEWAY_HEADER - DO NOT REMOVE

REGION: CORE
TAG: CORE.GOVERNANCE.APPLICATION.IDENTITY_GRAPH_GATE
PURPOSE: Verifies the LeeWay application identity graph registry against active runtime files, command routes, and LAVR event ownership.
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
#>

param(
  [string]$ExtensionDir = (Join-Path $PSScriptRoot ".."),
  [string]$WorkspaceRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..")).Path,
  [string]$EvidencePath
)

$ErrorActionPreference = "Stop"

function New-IdentityCheck {
  param(
    [string]$Name,
    [bool]$Pass,
    [string]$Detail
  )

  [pscustomobject]@{
    name = $Name
    pass = $Pass
    detail = $Detail
  }
}

function Get-IdentityGraphData {
  param(
    [string]$ExtensionRoot
  )

  $compiledModulePath = Join-Path $ExtensionRoot "out\leeway-application\leewayApplicationIdentityGraph.js"
  if (-not (Test-Path -LiteralPath $compiledModulePath)) {
    throw "Compiled identity graph module not found: $compiledModulePath"
  }

  $nodeScript = @"
const mod = require(process.argv[1]);
process.stdout.write(JSON.stringify({
  version: mod.LEEWAY_APPLICATION_IDENTITY_GRAPH_VERSION,
  requiredNodeIds: mod.LEEWAY_APPLICATION_REQUIRED_NODE_IDS,
  requiredFiles: mod.LEEWAY_APPLICATION_REQUIRED_FILES,
  nodes: mod.LEEWAY_APPLICATION_IDENTITY_GRAPH
}));
"@

  $json = & node.exe -e $nodeScript $compiledModulePath
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to read compiled identity graph module."
  }

  return ($json | ConvertFrom-Json)
}

function Get-HeaderPresence {
  param([string]$Path)

  if (-not (Test-Path -LiteralPath $Path)) {
    return $false
  }

  $content = Get-Content -LiteralPath $Path -Raw
  return $content -match 'LEEWAY_HEADER|LEEWAY HEADER'
}

function Get-JsonFileSafely {
  param([string]$Path)

  if (-not (Test-Path -LiteralPath $Path)) {
    return $null
  }

  try {
    return Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
  } catch {
    return $null
  }
}

function Get-ExtensionCommandSurface {
  param([string]$ExtensionSourcePath)

  $content = Get-Content -LiteralPath $ExtensionSourcePath -Raw
  $webviewToHost = New-Object System.Collections.Generic.HashSet[string]
  $hostToWebview = New-Object System.Collections.Generic.HashSet[string]
  $handled = New-Object System.Collections.Generic.HashSet[string]

  foreach ($match in [regex]::Matches($content, 'vscode\.postMessage\(\s*\{[^{}]*command\s*:\s*"([^"]+)"', 'Singleline')) {
    [void]$webviewToHost.Add($match.Groups[1].Value)
  }
  foreach ($match in [regex]::Matches($content, 'webview\.postMessage\(\s*\{[^{}]*command\s*:\s*"([^"]+)"', 'Singleline')) {
    [void]$hostToWebview.Add($match.Groups[1].Value)
  }
  foreach ($match in [regex]::Matches($content, 'msg\.command\s*===\s*"([^"]+)"', 'Singleline')) {
    [void]$handled.Add($match.Groups[1].Value)
  }

  [pscustomobject]@{
    webviewToHost = @($webviewToHost | Sort-Object)
    hostToWebview = @($hostToWebview | Sort-Object)
    handled = @($handled | Sort-Object)
  }
}

function Get-VsCodeRegisteredCommandSurface {
  param([string]$SourceRoot)

  $registered = New-Object System.Collections.Generic.HashSet[string]
  $sourceFiles = Get-ChildItem -LiteralPath $SourceRoot -Recurse -File -Include *.ts,*.tsx,*.js,*.jsx
  foreach ($file in $sourceFiles) {
    $content = Get-Content -LiteralPath $file.FullName -Raw
    foreach ($match in [regex]::Matches($content, 'registerCommand\(\s*"([^"]+)"', 'Singleline')) {
      [void]$registered.Add($match.Groups[1].Value)
    }
  }

  [pscustomobject]@{
    registered = @($registered | Sort-Object)
  }
}

function Get-ManifestCommandSurface {
  param([string]$PackageJsonPath)

  $packageJson = Get-Content -LiteralPath $PackageJsonPath -Raw | ConvertFrom-Json
  $commands = @()
  if ($packageJson.contributes -and $packageJson.contributes.commands) {
    $commands = @($packageJson.contributes.commands | ForEach-Object { $_.command } | Where-Object { $_ } | Sort-Object -Unique)
  }

  [pscustomobject]@{
    contributed = $commands
  }
}

function Get-LavrEventSurface {
  param(
    [string[]]$Files
  )

  $emitted = New-Object System.Collections.Generic.HashSet[string]
  $handled = New-Object System.Collections.Generic.HashSet[string]

  foreach ($file in $Files) {
    if (-not (Test-Path -LiteralPath $file)) {
      continue
    }
    $content = Get-Content -LiteralPath $file -Raw

    foreach ($match in [regex]::Matches($content, '(?:emitLeeWayVoiceEvent|dispatcher\.emit)\(\s*"([^"]+)"', 'Singleline')) {
      if ($match.Groups[1].Value -like 'LAVR_*') {
        [void]$emitted.Add($match.Groups[1].Value)
      }
    }

    foreach ($match in [regex]::Matches($content, 'eventType\s*===\s*"([^"]+)"', 'Singleline')) {
      if ($match.Groups[1].Value -like 'LAVR_*') {
        [void]$handled.Add($match.Groups[1].Value)
      }
    }
  }

  [pscustomobject]@{
    emitted = @($emitted | Sort-Object)
    handled = @($handled | Sort-Object)
  }
}

function Get-RelativeWorkspacePath {
  param(
    [string]$WorkspaceRoot,
    [string]$AbsolutePath
  )

  $normalizedRoot = [System.IO.Path]::GetFullPath($WorkspaceRoot).TrimEnd("\", "/")
  $normalizedPath = [System.IO.Path]::GetFullPath($AbsolutePath)
  if ($normalizedPath.StartsWith($normalizedRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
    return $normalizedPath.Substring($normalizedRoot.Length).TrimStart("\", "/").Replace("\", "/")
  }
  return $normalizedPath.Replace("\", "/")
}

$resolvedExtensionDir = (Resolve-Path $ExtensionDir).Path
$resolvedWorkspaceRoot = (Resolve-Path $WorkspaceRoot).Path
$resultPath = if ($EvidencePath) {
  $EvidencePath
} else {
  Join-Path $resolvedExtensionDir "test-evidence\leeway-application-identity-graph-result.json"
}

New-Item -ItemType Directory -Force -Path (Split-Path -Parent $resultPath) | Out-Null

$graphData = Get-IdentityGraphData -ExtensionRoot $resolvedExtensionDir
$nodes = @($graphData.nodes)
$nodeIds = @($nodes | ForEach-Object { $_.id })
$requiredNodeIds = @($graphData.requiredNodeIds)
$requiredFiles = @($graphData.requiredFiles)

$checks = New-Object System.Collections.Generic.List[object]

$missingNodeIds = @($requiredNodeIds | Where-Object { $_ -notin $nodeIds })
$checks.Add((New-IdentityCheck -Name "required identity graph nodes" -Pass ($missingNodeIds.Count -eq 0) -Detail ("Missing nodes: " + $missingNodeIds.Count)))

$missingFiles = New-Object System.Collections.Generic.List[string]
foreach ($relativePath in $requiredFiles) {
  $absolutePath = Join-Path $resolvedWorkspaceRoot $relativePath
  if (-not (Test-Path -LiteralPath $absolutePath)) {
    $missingFiles.Add($relativePath)
  }
}
$checks.Add((New-IdentityCheck -Name "registered files exist" -Pass ($missingFiles.Count -eq 0) -Detail ("Missing files: " + $missingFiles.Count)))

$headerEligibleClassifications = @(
  "PRODUCTION_START",
  "PRODUCTION_RUNTIME",
  "LOCAL_RUNTIME",
  "BROWSER_FALLBACK",
  "COMMAND_ROUTE",
  "EVENT_ROUTE",
  "TOOL_BUS",
  "TURN_GATE",
  "PLAYBACK_GATE",
  "CONFIGURATION",
  "PACKAGING",
  "GOVERNANCE_GATE"
)
$headerMissing = New-Object System.Collections.Generic.List[string]
foreach ($node in $nodes) {
  if ($node.classification -notin $headerEligibleClassifications) {
    continue
  }
  $absolutePath = Join-Path $resolvedWorkspaceRoot $node.file
  if (-not (Get-HeaderPresence -Path $absolutePath)) {
    $headerMissing.Add($node.file)
  }
}
$checks.Add((New-IdentityCheck -Name "registered production files contain LeeWay headers" -Pass ($headerMissing.Count -eq 0) -Detail ("Files without headers: " + $headerMissing.Count)))

$activeNodeFiles = @(
  $nodes |
    Where-Object { $_.status -in @("ACTIVE", "FALLBACK", "TEST_ONLY", "DELETE_PENDING", "GENERATED") } |
    ForEach-Object { $_.file } |
    Sort-Object -Unique
)
$unclassifiedRequiredFiles = @($requiredFiles | Where-Object { $_ -notin $activeNodeFiles })
$checks.Add((New-IdentityCheck -Name "required file coverage is classified" -Pass ($unclassifiedRequiredFiles.Count -eq 0) -Detail ("Unclassified required files: " + $unclassifiedRequiredFiles.Count)))

$extensionSourcePath = Join-Path $resolvedExtensionDir "src\extension.ts"
$commandSurface = Get-ExtensionCommandSurface -ExtensionSourcePath $extensionSourcePath
$registeredCommandSurface = Get-VsCodeRegisteredCommandSurface -SourceRoot (Join-Path $resolvedExtensionDir "src")
$manifestCommandSurface = Get-ManifestCommandSurface -PackageJsonPath (Join-Path $resolvedExtensionDir "package.json")

$ownedEmittedCommands = @($nodes | ForEach-Object { @($_.commandsEmitted) } | Where-Object { $_ } | Sort-Object -Unique)
$ownedHandledCommands = @($nodes | ForEach-Object { @($_.commandsHandled) } | Where-Object { $_ } | Sort-Object -Unique)
$ownedRegisteredCommands = @($nodes | ForEach-Object { @($_.registeredCommands) } | Where-Object { $_ } | Sort-Object -Unique)

$unownedWebviewToHost = @($commandSurface.webviewToHost | Where-Object { $_ -notin $ownedEmittedCommands })
$unownedHostToWebview = @($commandSurface.hostToWebview | Where-Object { $_ -notin $ownedEmittedCommands })
$unownedHandledCommands = @($commandSurface.handled | Where-Object { $_ -notin $ownedHandledCommands })
$unownedRegisteredCommands = @($registeredCommandSurface.registered | Where-Object { $_ -notin $ownedRegisteredCommands })
$unownedManifestCommands = @($manifestCommandSurface.contributed | Where-Object { $_ -notin $ownedRegisteredCommands })

$checks.Add((New-IdentityCheck -Name "webview to host commands are owned by identity graph" -Pass ($unownedWebviewToHost.Count -eq 0) -Detail ("Unowned commands: " + $unownedWebviewToHost.Count)))
$checks.Add((New-IdentityCheck -Name "host to webview commands are owned by identity graph" -Pass ($unownedHostToWebview.Count -eq 0) -Detail ("Unowned commands: " + $unownedHostToWebview.Count)))
$checks.Add((New-IdentityCheck -Name "handled commands are owned by identity graph" -Pass ($unownedHandledCommands.Count -eq 0) -Detail ("Unowned handlers: " + $unownedHandledCommands.Count)))
$checks.Add((New-IdentityCheck -Name "registered VS Code commands are owned by identity graph" -Pass ($unownedRegisteredCommands.Count -eq 0) -Detail ("Unowned registered commands: " + $unownedRegisteredCommands.Count)))
$checks.Add((New-IdentityCheck -Name "manifest VS Code commands are owned by identity graph" -Pass ($unownedManifestCommands.Count -eq 0) -Detail ("Unowned manifest commands: " + $unownedManifestCommands.Count)))

$identityAuditFiles = @(
  (Join-Path $resolvedExtensionDir "src\extension.ts"),
  (Join-Path $resolvedExtensionDir "src\live-voice\providers\browserSpeechRecognitionProvider.ts"),
  (Join-Path $resolvedExtensionDir "src\live-voice\providers\stubRealtimeVoiceProvider.ts"),
  (Join-Path $resolvedExtensionDir "src\live-voice\providers\unavailableRealtimeVoiceProvider.ts"),
  (Join-Path $resolvedExtensionDir "src\live-voice\voiceProviderFactory.ts"),
  (Join-Path $resolvedExtensionDir "src\leeway-agent-voice-runtime\lavrPlaybackGate.ts")
)
$eventSurface = Get-LavrEventSurface -Files $identityAuditFiles

$ownedEmittedEvents = @($nodes | ForEach-Object { @($_.eventsEmitted) } | Where-Object { $_ } | Sort-Object -Unique)
$ownedHandledEvents = @($nodes | ForEach-Object { @($_.eventsHandled) } | Where-Object { $_ } | Sort-Object -Unique)

$unownedEmittedEvents = @($eventSurface.emitted | Where-Object { $_ -notin $ownedEmittedEvents })
$unconsumedEmittedEvents = @($eventSurface.emitted | Where-Object { $_ -notin $ownedHandledEvents })
$checks.Add((New-IdentityCheck -Name "LAVR emitted events are owned by identity graph" -Pass ($unownedEmittedEvents.Count -eq 0) -Detail ("Unowned emitted events: " + $unownedEmittedEvents.Count)))
$checks.Add((New-IdentityCheck -Name "LAVR emitted events have registered consumers" -Pass ($unconsumedEmittedEvents.Count -eq 0) -Detail ("Events without consumers: " + $unconsumedEmittedEvents.Count)))

$identityResultEvidence = @(
  "agent-lee/vscode-extension/test-evidence/leeway-application-identity-graph-result.json"
)
$missingEvidenceNodes = @(
  $nodes |
    Where-Object { $_.classification -eq "GOVERNANCE_GATE" -and $_.id -eq "LEEWAY_APP::GOVERNANCE::INTEGRITY_GATE::ROOT" } |
    Where-Object { @($_.evidence) -notcontains $identityResultEvidence[0] }
)
$checks.Add((New-IdentityCheck -Name "identity graph evidence is registered" -Pass ($missingEvidenceNodes.Count -eq 0) -Detail ("Governance nodes missing graph evidence: " + $missingEvidenceNodes.Count)))

$keySourcePrefixes = @(
  "agent-lee/vscode-extension/src/core/",
  "agent-lee/vscode-extension/src/plugins/",
  "agent-lee/vscode-extension/src/tools/",
  "agent-lee/vscode-extension/src/knowledge/",
  "agent-lee/vscode-extension/src/persona/",
  "agent-lee/vscode-extension/src/visual-intelligence/",
  "agent-lee/vscode-extension/src/live-voice/",
  "agent-lee/vscode-extension/src/performance/",
  "agent-lee/vscode-extension/src/indexing/",
  "agent-lee/vscode-extension/src/edit-buffer/",
  "agent-lee/vscode-extension/src/session-orchestrator/",
  "agent-lee/vscode-extension/src/execution-brain/",
  "agent-lee/vscode-extension/src/workqueue/",
  "agent-lee/vscode-extension/src/leeway-application/"
)
$coveragePrefixes = @(
  $nodes |
    ForEach-Object { @($_.ownedPathPrefixes) + @($_.file) } |
    Where-Object { $_ } |
    Sort-Object -Unique
)
$sourceFiles = @(Get-ChildItem -LiteralPath (Join-Path $resolvedExtensionDir "src") -Recurse -File | Where-Object {
  $_.Extension -in @(".ts", ".tsx", ".js", ".jsx", ".json", ".md")
})
$uncoveredKeySourceFiles = New-Object System.Collections.Generic.List[string]
foreach ($file in $sourceFiles) {
  $relativePath = Get-RelativeWorkspacePath -WorkspaceRoot $resolvedWorkspaceRoot -AbsolutePath $file.FullName
  if ($relativePath -like "*backup-*" -or $relativePath -like "*broken-*") {
    continue
  }
  if (-not ($keySourcePrefixes | Where-Object { $relativePath.StartsWith($_) })) {
    continue
  }
  $covered = $false
  foreach ($prefix in $coveragePrefixes) {
    if ($relativePath -eq $prefix -or $relativePath.StartsWith($prefix)) {
      $covered = $true
      break
    }
  }
  if (-not $covered) {
    $uncoveredKeySourceFiles.Add($relativePath)
  }
}
$checks.Add((New-IdentityCheck -Name "key source directories are covered by identity graph" -Pass ($uncoveredKeySourceFiles.Count -eq 0) -Detail ("Uncovered files: " + $uncoveredKeySourceFiles.Count)))

$distExtensionPath = Join-Path $resolvedExtensionDir "dist\extension.js"
$distNode = $nodes | Where-Object { $_.file -eq "agent-lee/vscode-extension/dist/extension.js" } | Select-Object -First 1
$distAmbiguityPass = $true
$distAmbiguityDetail = "No historical dist start path present."
if (Test-Path -LiteralPath $distExtensionPath) {
  $distAmbiguityPass = $null -ne $distNode -and $distNode.classification -eq "QUARANTINE"
  $distAmbiguityDetail = if ($distAmbiguityPass) {
    "Historical dist start path exists and is quarantined."
  } else {
    "Historical dist start path exists without quarantine classification."
  }
}
$checks.Add((New-IdentityCheck -Name "historical dist start path is quarantined" -Pass $distAmbiguityPass -Detail $distAmbiguityDetail))

$fileIntelligencePath = Join-Path $resolvedExtensionDir "src\core\file-intelligence.ts"
$repoIndexerPath = Join-Path $resolvedExtensionDir "src\knowledge\leewayRepoIndexer.ts"
$fileIntelligenceContent = Get-Content -LiteralPath $fileIntelligencePath -Raw
$repoIndexerContent = Get-Content -LiteralPath $repoIndexerPath -Raw
$contextExclusions = @("reports", "knowledge", "memory", "logs")
$missingContextExclusions = @(
  $contextExclusions | Where-Object {
    ($fileIntelligenceContent -notmatch [regex]::Escape($_)) -or
    ($repoIndexerContent -notmatch [regex]::Escape($_))
  }
)
$checks.Add((New-IdentityCheck -Name "context contamination exclusions are present" -Pass ($missingContextExclusions.Count -eq 0) -Detail ("Missing exclusions: " + $missingContextExclusions.Count)))

$voiceLockPath = Join-Path $resolvedWorkspaceRoot "agent-lee\voice\VOICE_LOCK.md"
$voiceRuntimePath = Join-Path $resolvedWorkspaceRoot "agent-lee\voice\voice-runtime.json"
$voicePipelinePath = Join-Path $resolvedWorkspaceRoot "agent-lee\voice\Speak-AgentLeeCloned.ps1"
$voiceManifestPath = Join-Path $resolvedWorkspaceRoot "agent-lee\voice\leeway-live-voice-manifest.json"

$checks.Add((New-IdentityCheck -Name "voice lock governing file exists" -Pass (Test-Path -LiteralPath $voiceLockPath) -Detail $voiceLockPath))
$checks.Add((New-IdentityCheck -Name "voice runtime configuration exists" -Pass (Test-Path -LiteralPath $voiceRuntimePath) -Detail $voiceRuntimePath))
$checks.Add((New-IdentityCheck -Name "LeeWay cloned speech pipeline exists" -Pass (Test-Path -LiteralPath $voicePipelinePath) -Detail $voicePipelinePath))
$checks.Add((New-IdentityCheck -Name "LeeWay live voice manifest exists" -Pass (Test-Path -LiteralPath $voiceManifestPath) -Detail $voiceManifestPath))

$voiceRuntime = Get-JsonFileSafely -Path $voiceRuntimePath
$lockedEnginePass = $false
$lockedEngineDetail = "voice-runtime.json not readable."
$fallbackPass = $false
$fallbackDetail = "voice-runtime.json not readable."
if ($voiceRuntime) {
  $lockedEnginePass = ([string]$voiceRuntime.engine -eq "f5-clone-local")
  $lockedEngineDetail = "engine=$([string]$voiceRuntime.engine)"
  $fallbackPass = ([string]$voiceRuntime.fallbackEngine -eq "none")
  $fallbackDetail = "fallbackEngine=$([string]$voiceRuntime.fallbackEngine)"
}
$checks.Add((New-IdentityCheck -Name "LeeWay live runtime engine is clone-local" -Pass $lockedEnginePass -Detail $lockedEngineDetail))
$checks.Add((New-IdentityCheck -Name "LeeWay live runtime fallback is disabled" -Pass $fallbackPass -Detail $fallbackDetail))

$generatedClonesNode = $nodes | Where-Object { $_.id -eq "LEEWAY_APP::VOICE::GENERATED::CLONED_WAV_OUTPUTS" } | Select-Object -First 1

$generatedCloneFiles = @(Get-ChildItem -LiteralPath (Join-Path $resolvedWorkspaceRoot "agent-lee\voice") -File -Filter "agent-lee-cloned-*.wav" -ErrorAction SilentlyContinue)
$generatedClonePass = ($null -ne $generatedClonesNode)
$generatedCloneDetail = "Generated clone files: $($generatedCloneFiles.Count); Classified node present: $($null -ne $generatedClonesNode)"
$checks.Add((New-IdentityCheck -Name "generated clone WAV outputs are classified" -Pass $generatedClonePass -Detail $generatedCloneDetail))

$failedChecks = @($checks | Where-Object { -not $_.pass })
$result = [pscustomobject]@{
  gate = "LEEWAY_APPLICATION_IDENTITY_GRAPH_GATE"
  generatedAt = (Get-Date).ToString("o")
  version = $graphData.version
  passed = ($failedChecks.Count -eq 0)
  summary = [pscustomobject]@{
    totalChecks = $checks.Count
    failedChecks = $failedChecks.Count
    registeredNodes = $nodes.Count
    registeredFiles = $requiredFiles.Count
  }
  checks = $checks
  graph = [pscustomobject]@{
    requiredNodeIds = $requiredNodeIds
    requiredFiles = $requiredFiles
    nodes = $nodes
  }
  commandSurface = [pscustomobject]@{
    webviewToHost = $commandSurface.webviewToHost
    hostToWebview = $commandSurface.hostToWebview
    handled = $commandSurface.handled
    unownedWebviewToHost = $unownedWebviewToHost
    unownedHostToWebview = $unownedHostToWebview
    unownedHandled = $unownedHandledCommands
    registered = $registeredCommandSurface.registered
    manifest = $manifestCommandSurface.contributed
    unownedRegistered = $unownedRegisteredCommands
    unownedManifest = $unownedManifestCommands
  }
  eventSurface = [pscustomobject]@{
    emitted = $eventSurface.emitted
    handled = $eventSurface.handled
    unownedEmitted = $unownedEmittedEvents
    unconsumedEmitted = $unconsumedEmittedEvents
  }
  fileCoverage = [pscustomobject]@{
    missingFiles = @($missingFiles)
    headerMissing = @($headerMissing)
    unclassifiedRequiredFiles = @($unclassifiedRequiredFiles)
    uncoveredKeySourceFiles = @($uncoveredKeySourceFiles)
  }
}

$result | ConvertTo-Json -Depth 16 | Out-File -LiteralPath $resultPath -Encoding utf8
Write-Host "Identity graph result written to $resultPath" -ForegroundColor Green

if (-not $result.passed) {
  exit 1
}
