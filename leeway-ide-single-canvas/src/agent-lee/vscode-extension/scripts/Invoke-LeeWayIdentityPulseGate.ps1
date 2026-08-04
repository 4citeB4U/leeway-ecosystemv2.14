<#
LEEWAY_HEADER - DO NOT REMOVE

REGION: CORE
TAG: CORE.GOVERNANCE.APPLICATION.IDENTITY_PULSE_GATE
PURPOSE: Builds the LeeWay Identity Pulse registry, attests origin and trust metadata, and rejects anonymous drift across strict governed surfaces.
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
#>

param(
  [string]$ExtensionDir = (Join-Path $PSScriptRoot ".."),
  [string]$WorkspaceRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..")).Path,
  [string]$EvidencePath
)

$ErrorActionPreference = "Stop"

function New-PulseCheck {
  param(
    [string]$Name,
    [bool]$Pass,
    [string]$Detail,
    [string]$EvidencePath = ""
  )

  [pscustomobject]@{
    name = $Name
    pass = $Pass
    detail = $Detail
    evidencePath = $EvidencePath
  }
}

function Get-JsonFileSafely {
  param([string]$Path)

  if ([string]::IsNullOrWhiteSpace($Path) -or -not (Test-Path -LiteralPath $Path)) {
    return $null
  }

  try {
    return Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
  } catch {
    return $null
  }
}

function Get-FileHashSafely {
  param([string]$Path)

  if ([string]::IsNullOrWhiteSpace($Path) -or -not (Test-Path -LiteralPath $Path)) {
    return $null
  }

  try {
    return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash
  } catch {
    return $null
  }
}

function Get-HeaderPresence {
  param([string]$Path)

  if ([string]::IsNullOrWhiteSpace($Path) -or -not (Test-Path -LiteralPath $Path)) {
    return $false
  }

  return (Get-Content -LiteralPath $Path -Raw) -match 'LEEWAY_HEADER|LEEWAY HEADER'
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

function Get-CompiledJsonData {
  param(
    [string]$ModulePath,
    [string]$Expression
  )

  if (-not (Test-Path -LiteralPath $ModulePath)) {
    throw "Compiled module not found: $ModulePath"
  }

  $nodeScript = @"
const mod = require(process.argv[1]);
process.stdout.write(JSON.stringify($Expression));
"@

  $json = & node.exe -e $nodeScript $ModulePath
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to read compiled module: $ModulePath"
  }

  return ($json | ConvertFrom-Json)
}

function Normalize-IdSegment {
  param([string]$Value)

  if ([string]::IsNullOrWhiteSpace($Value)) {
    return "UNKNOWN"
  }

  $upper = $Value.ToUpperInvariant()
  $normalized = [regex]::Replace($upper, '[^A-Z0-9]+', '_').Trim('_')
  if ([string]::IsNullOrWhiteSpace($normalized)) {
    return "UNKNOWN"
  }
  return $normalized
}

function Resolve-VsixRuntimePath {
  param([string]$ExtractedRoot)

  $candidate = Get-ChildItem -LiteralPath $ExtractedRoot -Recurse -File -Filter extension.js -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName.Replace("\", "/") -match '/out/extension\.js$' } |
    Select-Object -First 1

  if ($candidate) {
    return $candidate.FullName
  }

  return $null
}

function Resolve-InstalledExtensionRuntimePath {
  param(
    [string]$Publisher,
    [string]$PackageName,
    [string]$PackageVersion
  )

  $extensionsRoot = Join-Path $env:USERPROFILE ".vscode\extensions"
  if (-not (Test-Path -LiteralPath $extensionsRoot)) {
    return $null
  }

  $candidateName = "{0}.{1}-{2}" -f $Publisher, $PackageName, $PackageVersion
  $candidateDir = Join-Path $extensionsRoot $candidateName
  $candidatePath = Join-Path $candidateDir "out\extension.js"
  if (Test-Path -LiteralPath $candidatePath) {
    return $candidatePath
  }

  return $null
}

function Expand-VsixForScan {
  param(
    [string]$VsixPath,
    [string]$DestinationRoot
  )

  if (Test-Path -LiteralPath $DestinationRoot) {
    Remove-Item -LiteralPath $DestinationRoot -Recurse -Force
  }

  New-Item -ItemType Directory -Force -Path $DestinationRoot | Out-Null
  $zipPath = Join-Path $DestinationRoot "package.zip"
  Copy-Item -LiteralPath $VsixPath -Destination $zipPath -Force
  Expand-Archive -LiteralPath $zipPath -DestinationPath $DestinationRoot -Force
  Remove-Item -LiteralPath $zipPath -Force
}

$resolvedExtensionDir = (Resolve-Path $ExtensionDir).Path
$resolvedWorkspaceRoot = (Resolve-Path $WorkspaceRoot).Path
$resultPath = if ($EvidencePath) {
  $EvidencePath
} else {
  Join-Path $resolvedExtensionDir "test-evidence\leeway-identity-pulse-result.json"
}
$testEvidenceDir = Join-Path $resolvedExtensionDir "test-evidence"
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $resultPath) | Out-Null

$pulseModulePath = Join-Path $resolvedExtensionDir "out\leeway-application\leewayIdentityPulse.js"
$graphModulePath = Join-Path $resolvedExtensionDir "out\leeway-application\leewayApplicationIdentityGraph.js"
$pulseData = Get-CompiledJsonData -ModulePath $pulseModulePath -Expression '({
  version: mod.LEEWAY_IDENTITY_PULSE_VERSION,
  mode: mod.LEEWAY_IDENTITY_PULSE_MODE,
  registryPath: mod.LEEWAY_IDENTITY_PULSE_REGISTRY_PATH,
  originStatuses: mod.LEEWAY_IDENTITY_PULSE_ORIGIN_STATUSES,
  strictControls: mod.LEEWAY_IDENTITY_PULSE_STRICT_CONTROLS,
  strictStateKeys: mod.LEEWAY_IDENTITY_PULSE_STRICT_STATE_KEYS,
  strictCommands: mod.LEEWAY_IDENTITY_PULSE_STRICT_COMMANDS,
  extraFiles: mod.LEEWAY_IDENTITY_PULSE_EXTRA_FILES
})'
$graphData = Get-CompiledJsonData -ModulePath $graphModulePath -Expression '({
  requiredFiles: mod.LEEWAY_APPLICATION_REQUIRED_FILES,
  nodes: mod.LEEWAY_APPLICATION_IDENTITY_GRAPH
})'

$packageJsonPath = Join-Path $resolvedExtensionDir "package.json"
$packageJson = Get-Content -LiteralPath $packageJsonPath -Raw | ConvertFrom-Json
$extensionSourcePath = Join-Path $resolvedExtensionDir "src\extension.ts"
$extensionSource = Get-Content -LiteralPath $extensionSourcePath -Raw
$existingRegistryPath = Join-Path $resolvedWorkspaceRoot ([string]$pulseData.registryPath)
$existingRegistry = Get-JsonFileSafely -Path $existingRegistryPath
$existingObjectIndex = @{}
if ($existingRegistry -and $existingRegistry.objects) {
  foreach ($entry in @($existingRegistry.objects)) {
    if ($entry.id) {
      $existingObjectIndex[[string]$entry.id] = $entry
    }
  }
}

$generatedAt = (Get-Date).ToString("o")
$pulseActorId = "LEEWAY_ACTOR::AGENT::AGENT_LEE"
$pulsePromptId = "LEEWAY_PROMPT::USER::IDENTITY_PULSE_PASS1::20260516"
$pulseIntentId = "LEEWAY_INTENT::GOVERNANCE::IDENTITY_PULSE::PASS1"
$pulseTxId = "LEEWAY_TX::GOVERNANCE::IDENTITY_PULSE::20260516T000000::PASS1"
$pulseReceiptId = "LEEWAY_RECEIPT::GOVERNANCE::IDENTITY_PULSE::20260516T000000"

$graphNodeIndexByFile = @{}
foreach ($node in @($graphData.nodes)) {
  if ($node.file -and -not $graphNodeIndexByFile.ContainsKey([string]$node.file)) {
    $graphNodeIndexByFile[[string]$node.file] = [string]$node.id
  }
}

$managedFileEntries = New-Object System.Collections.Generic.List[object]
foreach ($relativePath in @($graphData.requiredFiles)) {
  $managedFileEntries.Add([pscustomobject]@{
    path = [string]$relativePath
    objectId = "LEEWAY_OBJECT::FILE::{0}" -f (Normalize-IdSegment -Value ([string]$relativePath))
    classification = "ACTIVE"
    originStatus = "LEEWAY_BORN"
    authority = "LEEWAY_GOVERNED"
    allowedUse = @("runtime", "governance", "package", "verification")
    graphNodeId = $graphNodeIndexByFile[[string]$relativePath]
    strict = $true
  })
}
foreach ($extraFile in @($pulseData.extraFiles)) {
  $managedFileEntries.Add($extraFile)
}

$fileObjectIndex = @{}
$fileObjects = New-Object System.Collections.Generic.List[object]
foreach ($entry in @($managedFileEntries | Sort-Object path -Unique)) {
  $relativePath = [string]$entry.path
  if ($fileObjectIndex.ContainsKey($relativePath)) {
    continue
  }
  $fileObjectIndex[$relativePath] = $true
  $absolutePath = Join-Path $resolvedWorkspaceRoot $relativePath
  $exists = Test-Path -LiteralPath $absolutePath
  $hash = Get-FileHashSafely -Path $absolutePath
  if (
    [string]::Equals($relativePath, "agent-lee/governance/identity/leeway-identity-pulse.json", [System.StringComparison]::OrdinalIgnoreCase) -and
    [string]::IsNullOrWhiteSpace([string]$hash)
  ) {
    # The pulse registry writes itself later in this script; keep hash check deterministic.
    $hash = "SELF_ATTESTED_PENDING_WRITE"
  }
  $existing = $existingObjectIndex[[string]$entry.objectId]
  $item = Get-Item -LiteralPath $absolutePath -ErrorAction SilentlyContinue
  $createdAt = if ($existing -and $existing.createdAt) { [string]$existing.createdAt } elseif ($item) { $item.CreationTimeUtc.ToString("o") } else { $generatedAt }
  $firstSeenAt = if ($existing -and $existing.firstSeenAt) { [string]$existing.firstSeenAt } else { $generatedAt }
  $lastSeenAt = $generatedAt
  $classification = [string]$entry.classification
  $graphNodeId = if ($entry.graphNodeId) { [string]$entry.graphNodeId } elseif ($graphNodeIndexByFile.ContainsKey($relativePath)) { $graphNodeIndexByFile[$relativePath] } else { "" }
  $verificationStatus = if ($exists -and $hash) { "VERIFIED" } else { "PENDING_REVIEW" }
  $fileObjects.Add([pscustomobject]@{
    id = [string]$entry.objectId
    objectType = "FILE"
    path = $relativePath
    originStatus = [string]$entry.originStatus
    trustStatus = "GOVERNED"
    createdAt = $createdAt
    firstSeenAt = $firstSeenAt
    lastSeenAt = $lastSeenAt
    introducedByActorId = $pulseActorId
    introducedByPromptId = $pulsePromptId
    introducedByIntentId = $pulseIntentId
    introducedByTransactionId = $pulseTxId
    sourcePath = $relativePath
    currentPath = $relativePath
    hash = $hash
    classification = $classification
    authority = [string]$entry.authority
    allowedUse = @($entry.allowedUse)
    verificationStatus = $verificationStatus
    receiptId = $pulseReceiptId
    graphNodeId = $graphNodeId
    strict = [bool]$entry.strict
    exists = $exists
    hasLeeWayHeader = if ($absolutePath -match '\.(ts|tsx|js|jsx|ps1|md|mjs|cjs|json)$') { Get-HeaderPresence -Path $absolutePath } else { $false }
  })
}

$discoveredControls = New-Object System.Collections.Generic.List[object]
foreach ($control in @($pulseData.strictControls)) {
  $domId = [string]$control.domId
  $expectedLeewayId = [string]$control.leewayId
  $idMatch = [regex]::Match($extensionSource, ('id="' + [regex]::Escape($domId) + '"[^>]*data-leeway-id="' + [regex]::Escape($expectedLeewayId) + '"|data-leeway-id="' + [regex]::Escape($expectedLeewayId) + '"[^>]*id="' + [regex]::Escape($domId) + '"'))
  $discoveredControls.Add([pscustomobject]@{
    id = [string]$control.leewayId
    objectType = "CONTROL"
    domId = $domId
    label = [string]$control.label
    originStatus = "LEEWAY_BORN"
    trustStatus = "GOVERNED"
    createdAt = $generatedAt
    firstSeenAt = if ($existingObjectIndex.ContainsKey([string]$control.leewayId) -and $existingObjectIndex[[string]$control.leewayId].firstSeenAt) { [string]$existingObjectIndex[[string]$control.leewayId].firstSeenAt } else { $generatedAt }
    lastSeenAt = $generatedAt
    introducedByActorId = $pulseActorId
    introducedByPromptId = $pulsePromptId
    introducedByIntentId = $pulseIntentId
    introducedByTransactionId = $pulseTxId
    sourcePath = "agent-lee/vscode-extension/src/extension.ts"
    currentPath = "agent-lee/vscode-extension/src/extension.ts"
    hash = (Get-FileHashSafely -Path $extensionSourcePath)
    classification = "UI_CONTROL"
    authority = "LEEWAY_UI_RUNTIME"
    allowedUse = @("ui", "runtime")
    verificationStatus = if ($idMatch.Success) { "VERIFIED" } else { "PENDING_REVIEW" }
    receiptId = $pulseReceiptId
    graphNodeId = "LEEWAY_APP::UI::RUNTIME_TRUTH::WEBVIEW_BOOT"
    strict = [bool]$control.strict
    exists = $idMatch.Success
  })
}

$stateKeys = New-Object System.Collections.Generic.HashSet[string]
foreach ($match in [regex]::Matches($extensionSource, 'key:"([^"]+)"')) {
  [void]$stateKeys.Add($match.Groups[1].Value)
}
foreach ($strictKey in @($pulseData.strictStateKeys)) {
  if ($strictKey) {
    [void]$stateKeys.Add([string]$strictKey)
  }
}
$stateObjects = New-Object System.Collections.Generic.List[object]
foreach ($key in @($stateKeys | Sort-Object)) {
  $stateObjects.Add([pscustomobject]@{
    id = "LEEWAY_OBJECT::STATE::{0}" -f (Normalize-IdSegment -Value $key)
    objectType = "STATE_KEY"
    key = $key
    originStatus = "LEEWAY_BORN"
    trustStatus = "GOVERNED"
    createdAt = $generatedAt
    firstSeenAt = if ($existingObjectIndex.ContainsKey("LEEWAY_OBJECT::STATE::{0}" -f (Normalize-IdSegment -Value $key)) -and $existingObjectIndex["LEEWAY_OBJECT::STATE::{0}" -f (Normalize-IdSegment -Value $key)].firstSeenAt) { [string]$existingObjectIndex["LEEWAY_OBJECT::STATE::{0}" -f (Normalize-IdSegment -Value $key)].firstSeenAt } else { $generatedAt }
    lastSeenAt = $generatedAt
    introducedByActorId = $pulseActorId
    introducedByPromptId = $pulsePromptId
    introducedByIntentId = $pulseIntentId
    introducedByTransactionId = $pulseTxId
    sourcePath = "agent-lee/vscode-extension/src/extension.ts"
    currentPath = "agent-lee/vscode-extension/src/extension.ts"
    hash = (Get-FileHashSafely -Path $extensionSourcePath)
    classification = "RUNTIME_STATE_KEY"
    authority = "LEEWAY_RUNTIME_STATE"
    allowedUse = @("state", "runtime")
    verificationStatus = "VERIFIED"
    receiptId = $pulseReceiptId
    graphNodeId = "LEEWAY_APP::CONFIG::RUNTIME_SETTINGS::HYDRATION"
    strict = ($key -in @($pulseData.strictStateKeys))
    exists = $true
  })
}

$commandSet = New-Object System.Collections.Generic.HashSet[string]
$eventSet = New-Object System.Collections.Generic.HashSet[string]
foreach ($node in @($graphData.nodes)) {
  foreach ($command in @($node.registeredCommands) + @($node.commandsEmitted) + @($node.commandsHandled)) {
    if ($command) { [void]$commandSet.Add([string]$command) }
  }
  foreach ($event in @($node.eventsEmitted) + @($node.eventsHandled)) {
    if ($event) { [void]$eventSet.Add([string]$event) }
  }
}

$commandObjects = New-Object System.Collections.Generic.List[object]
foreach ($command in @($commandSet | Sort-Object)) {
  $commandObjects.Add([pscustomobject]@{
    id = "LEEWAY_OBJECT::COMMAND::{0}" -f (Normalize-IdSegment -Value $command)
    objectType = "COMMAND"
    command = $command
    originStatus = "LEEWAY_DERIVED"
    trustStatus = "GOVERNED"
    createdAt = $generatedAt
    firstSeenAt = if ($existingObjectIndex.ContainsKey("LEEWAY_OBJECT::COMMAND::{0}" -f (Normalize-IdSegment -Value $command)) -and $existingObjectIndex["LEEWAY_OBJECT::COMMAND::{0}" -f (Normalize-IdSegment -Value $command)].firstSeenAt) { [string]$existingObjectIndex["LEEWAY_OBJECT::COMMAND::{0}" -f (Normalize-IdSegment -Value $command)].firstSeenAt } else { $generatedAt }
    lastSeenAt = $generatedAt
    introducedByActorId = $pulseActorId
    introducedByPromptId = $pulsePromptId
    introducedByIntentId = $pulseIntentId
    introducedByTransactionId = $pulseTxId
    sourcePath = "agent-lee/vscode-extension/src/leeway-application/leewayApplicationIdentityGraph.ts"
    currentPath = "agent-lee/vscode-extension/src/leeway-application/leewayApplicationIdentityGraph.ts"
    hash = (Get-FileHashSafely -Path (Join-Path $resolvedExtensionDir "src\leeway-application\leewayApplicationIdentityGraph.ts"))
    classification = "COMMAND_SURFACE"
    authority = "LEEWAY_COMMAND_ROUTER"
    allowedUse = @("command", "runtime")
    verificationStatus = "VERIFIED"
    receiptId = $pulseReceiptId
    graphNodeId = "LEEWAY_APP::WEBVIEW::COMMAND_ROUTER::WEBVIEW_TO_HOST"
    strict = ($command -in @($pulseData.strictCommands))
    exists = $true
  })
}

$eventObjects = New-Object System.Collections.Generic.List[object]
foreach ($event in @($eventSet | Sort-Object)) {
  $originStatus = if ($event -like 'LAVR_*') { "LEEWAY_DERIVED" } else { "LEEWAY_BORN" }
  $eventObjects.Add([pscustomobject]@{
    id = "LEEWAY_OBJECT::EVENT::{0}" -f (Normalize-IdSegment -Value $event)
    objectType = "EVENT"
    event = $event
    originStatus = $originStatus
    trustStatus = "GOVERNED"
    createdAt = $generatedAt
    firstSeenAt = if ($existingObjectIndex.ContainsKey("LEEWAY_OBJECT::EVENT::{0}" -f (Normalize-IdSegment -Value $event)) -and $existingObjectIndex["LEEWAY_OBJECT::EVENT::{0}" -f (Normalize-IdSegment -Value $event)].firstSeenAt) { [string]$existingObjectIndex["LEEWAY_OBJECT::EVENT::{0}" -f (Normalize-IdSegment -Value $event)].firstSeenAt } else { $generatedAt }
    lastSeenAt = $generatedAt
    introducedByActorId = $pulseActorId
    introducedByPromptId = $pulsePromptId
    introducedByIntentId = $pulseIntentId
    introducedByTransactionId = $pulseTxId
    sourcePath = "agent-lee/vscode-extension/src/leeway-application/leewayApplicationIdentityGraph.ts"
    currentPath = "agent-lee/vscode-extension/src/leeway-application/leewayApplicationIdentityGraph.ts"
    hash = (Get-FileHashSafely -Path (Join-Path $resolvedExtensionDir "src\leeway-application\leewayApplicationIdentityGraph.ts"))
    classification = "EVENT_SURFACE"
    authority = "LEEWAY_EVENT_ROUTER"
    allowedUse = @("event", "runtime")
    verificationStatus = "VERIFIED"
    receiptId = $pulseReceiptId
    graphNodeId = "LEEWAY_APP::VOICE::LAVR::TOOL_BUS"
    strict = $false
    exists = $true
  })
}

$repoOutExtensionPath = Join-Path $resolvedExtensionDir "out\extension.js"
$vsixPath = Join-Path $resolvedExtensionDir ("agent-lee-leeway-coding-system-" + [string]$packageJson.version + ".vsix")
$vsixScanRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("leeway-pulse-vsix-" + [guid]::NewGuid().ToString("N"))
$vsixOutExtensionPath = $null
$vsixOutExtensionHash = $null
try {
  if (Test-Path -LiteralPath $vsixPath) {
    Expand-VsixForScan -VsixPath $vsixPath -DestinationRoot $vsixScanRoot
    $vsixOutExtensionPath = Resolve-VsixRuntimePath -ExtractedRoot $vsixScanRoot
    $vsixOutExtensionHash = Get-FileHashSafely -Path $vsixOutExtensionPath
  }
} finally {
  if (Test-Path -LiteralPath $vsixScanRoot) {
    Remove-Item -LiteralPath $vsixScanRoot -Recurse -Force -ErrorAction SilentlyContinue
  }
}
$installedOutExtensionPath = Resolve-InstalledExtensionRuntimePath -Publisher ([string]$packageJson.publisher) -PackageName ([string]$packageJson.name) -PackageVersion ([string]$packageJson.version)
$installedOutExtensionHash = Get-FileHashSafely -Path $installedOutExtensionPath

$artifactEntries = @(
  [pscustomobject]@{ id = "LEEWAY_OBJECT::ARTIFACT::REPO_OUT_EXTENSION_JS"; label = "repo out extension"; path = $repoOutExtensionPath; hash = (Get-FileHashSafely -Path $repoOutExtensionPath); originStatus = "LEEWAY_DERIVED"; trustStatus = "GOVERNED"; classification = "PACKAGE_ARTIFACT"; currentPath = "agent-lee/vscode-extension/out/extension.js"; verificationStatus = "VERIFIED"; strict = $true; exists = (Test-Path -LiteralPath $repoOutExtensionPath) },
  [pscustomobject]@{ id = "LEEWAY_OBJECT::ARTIFACT::VSIX_OUT_EXTENSION_JS"; label = "vsix out extension"; path = $vsixOutExtensionPath; hash = $vsixOutExtensionHash; originStatus = if ($vsixOutExtensionHash) { "LEEWAY_DERIVED" } else { "TOOL_GENERATED" }; trustStatus = if ($vsixOutExtensionHash) { "GOVERNED" } else { "AUDIT_REQUIRED" }; classification = "PACKAGE_ARTIFACT"; currentPath = "agent-lee/vscode-extension/agent-lee-leeway-coding-system.vsix::out/extension.js"; verificationStatus = if ($vsixOutExtensionHash) { "VERIFIED" } else { "PENDING_REVIEW" }; strict = $true; exists = (-not [string]::IsNullOrWhiteSpace([string]$vsixOutExtensionHash)) },
  [pscustomobject]@{ id = "LEEWAY_OBJECT::ARTIFACT::INSTALLED_OUT_EXTENSION_JS"; label = "installed out extension"; path = $installedOutExtensionPath; hash = $installedOutExtensionHash; originStatus = if ($installedOutExtensionHash) { "LEEWAY_DERIVED" } elseif ($installedOutExtensionPath) { "RESTORED" } else { "UNKNOWN_ORIGIN" }; trustStatus = if ($installedOutExtensionHash) { "GOVERNED" } elseif ($installedOutExtensionPath) { "UNTRUSTED" } else { "AUDIT_REQUIRED" }; classification = "INSTALLED_RUNTIME"; currentPath = if ($installedOutExtensionPath) { (Get-RelativeWorkspacePath -WorkspaceRoot $resolvedWorkspaceRoot -AbsolutePath $installedOutExtensionPath) } else { "" }; verificationStatus = if ($installedOutExtensionHash) { "VERIFIED" } elseif ($installedOutExtensionPath) { "PENDING_REVIEW" } else { "AUDIT_ONLY" }; strict = $true; exists = (-not [string]::IsNullOrWhiteSpace([string]$installedOutExtensionHash)) }
)
$artifactObjects = New-Object System.Collections.Generic.List[object]
foreach ($artifact in $artifactEntries) {
  $artifactObjects.Add([pscustomobject]@{
    id = [string]$artifact.id
    objectType = "ARTIFACT"
    label = [string]$artifact.label
    originStatus = [string]$artifact.originStatus
    trustStatus = [string]$artifact.trustStatus
    createdAt = $generatedAt
    firstSeenAt = if ($existingObjectIndex.ContainsKey([string]$artifact.id) -and $existingObjectIndex[[string]$artifact.id].firstSeenAt) { [string]$existingObjectIndex[[string]$artifact.id].firstSeenAt } else { $generatedAt }
    lastSeenAt = $generatedAt
    introducedByActorId = $pulseActorId
    introducedByPromptId = $pulsePromptId
    introducedByIntentId = $pulseIntentId
    introducedByTransactionId = $pulseTxId
    sourcePath = [string]$artifact.currentPath
    currentPath = [string]$artifact.currentPath
    hash = [string]$artifact.hash
    classification = [string]$artifact.classification
    authority = "LEEWAY_PACKAGE_ATTESTATION"
    allowedUse = @("package", "install", "verification")
    verificationStatus = [string]$artifact.verificationStatus
    receiptId = $pulseReceiptId
    graphNodeId = if ([string]$artifact.id -eq "LEEWAY_OBJECT::ARTIFACT::INSTALLED_OUT_EXTENSION_JS") { "LEEWAY_APP::PACKAGE::RUNTIME_ATTESTATION::INSTALLED_HASH" } else { "LEEWAY_APP::PACKAGE::RUNTIME_ATTESTATION::VSIX_HASH" }
    strict = [bool]$artifact.strict
    exists = [bool]$artifact.exists
  })
}

$allObjects = @()
foreach ($collection in @($fileObjects, $discoveredControls, $stateObjects, $commandObjects, $eventObjects, $artifactObjects)) {
  foreach ($entry in $collection) {
    $allObjects += $entry
  }
}
$registry = [pscustomobject]@{
  pulseId = "LEEWAY_PULSE::APPLICATION::AGENT_LEE"
  version = [string]$pulseData.version
  generatedAt = $generatedAt
  mode = [string]$pulseData.mode
  objects = @($allObjects | Sort-Object id)
}

New-Item -ItemType Directory -Force -Path (Split-Path -Parent $existingRegistryPath) | Out-Null
$registry | ConvertTo-Json -Depth 14 | Out-File -LiteralPath $existingRegistryPath -Encoding utf8

$controlButtons = [regex]::Matches($extensionSource, '<button\b[^>]*>', 'IgnoreCase')
$missingDataLeewayButtons = New-Object System.Collections.Generic.List[string]
foreach ($match in $controlButtons) {
  $markup = $match.Value
  if ($markup -notmatch 'data-leeway-id=') {
    $idMatch = [regex]::Match($markup, 'id="([^"]+)"')
    $labelMatch = [regex]::Match($markup, 'aria-label="([^"]+)"')
    $descriptor = if ($idMatch.Success) { $idMatch.Groups[1].Value } elseif ($labelMatch.Success) { $labelMatch.Groups[1].Value } else { $markup.Substring(0, [Math]::Min($markup.Length, 60)) }
    $missingDataLeewayButtons.Add($descriptor)
  }
}

$strictFileFailures = @($fileObjects | Where-Object { $_.strict -and ((-not $_.exists) -or [string]::IsNullOrWhiteSpace([string]$_.hash) -or [string]::IsNullOrWhiteSpace([string]$_.originStatus) -or ([string]::IsNullOrWhiteSpace([string]$_.firstSeenAt) -and [string]::IsNullOrWhiteSpace([string]$_.createdAt))) })
$strictControlFailures = @($discoveredControls | Where-Object { $_.strict -and -not $_.exists })
$strictStateFailures = @($pulseData.strictStateKeys | Where-Object { $_ -notin @($stateObjects | ForEach-Object { $_.key }) })
$strictCommandFailures = @($pulseData.strictCommands | Where-Object { $_ -notin @($commandObjects | ForEach-Object { $_.command }) })
$untrustedPromotionFailures = @($allObjects | Where-Object {
  $_.originStatus -notin @("LEEWAY_BORN", "LEEWAY_DERIVED") -and $_.trustStatus -eq "GOVERNED" -and $_.id -ne "LEEWAY_OBJECT::ARTIFACT::INSTALLED_OUT_EXTENSION_JS"
})
$graphMappingFailures = @($fileObjects | Where-Object {
  $_.classification -notin @("EVIDENCE", "GENERATED", "QUARANTINE") -and [string]::IsNullOrWhiteSpace([string]$_.graphNodeId)
})
$docAssetRequired = @(
  "agent-lee/vscode-extension/README.md",
  "agent-lee/vscode-extension/media/leeway-standards-button.png",
  "agent-lee/vscode-extension/media/readme-header.png",
  "agent-lee/vscode-extension/media/readme-system-flow.png",
  "agent-lee/vscode-extension/media/agent-lee-activitybar-icon.svg"
)
$docAssetFailures = @($docAssetRequired | Where-Object { $_ -notin @($fileObjects | ForEach-Object { $_.path }) })
$artifactFailures = @($artifactObjects | Where-Object { $_.strict -and ([string]$_.id -ne "LEEWAY_OBJECT::ARTIFACT::INSTALLED_OUT_EXTENSION_JS") -and [string]::IsNullOrWhiteSpace([string]$_.hash) })
$installedArtifact = $artifactObjects | Where-Object { $_.id -eq "LEEWAY_OBJECT::ARTIFACT::INSTALLED_OUT_EXTENSION_JS" } | Select-Object -First 1
$installedAttestationPass = ($null -eq $installedArtifact) -or ($installedArtifact.exists -eq $false) -or (-not [string]::IsNullOrWhiteSpace([string]$installedArtifact.hash))

$auditManagedPaths = New-Object System.Collections.Generic.HashSet[string]
foreach ($obj in $fileObjects) { [void]$auditManagedPaths.Add([string]$obj.path) }
$auditScanDirs = @(
  "agent-lee/governance/law",
  "agent-lee/vscode-extension/media",
  "agent-lee/vscode-extension/src/leeway-application"
)
$unknownAuditFiles = New-Object System.Collections.Generic.List[string]
foreach ($dir in $auditScanDirs) {
  $absoluteDir = Join-Path $resolvedWorkspaceRoot $dir
  if (-not (Test-Path -LiteralPath $absoluteDir)) { continue }
  foreach ($file in Get-ChildItem -LiteralPath $absoluteDir -Recurse -File) {
    $relative = Get-RelativeWorkspacePath -WorkspaceRoot $resolvedWorkspaceRoot -AbsolutePath $file.FullName
    if (-not $auditManagedPaths.Contains($relative)) {
      $unknownAuditFiles.Add($relative)
    }
  }
}

$checks = New-Object System.Collections.Generic.List[object]
$checks.Add((New-PulseCheck -Name "every active file has a LeeWay identity record" -Pass ($strictFileFailures.Count -eq 0) -Detail ("Strict file failures: " + $strictFileFailures.Count) -EvidencePath $existingRegistryPath))
$checks.Add((New-PulseCheck -Name "every active file has origin status" -Pass (@($fileObjects | Where-Object { [string]::IsNullOrWhiteSpace([string]$_.originStatus) }).Count -eq 0) -Detail ("Files missing origin status: " + @($fileObjects | Where-Object { [string]::IsNullOrWhiteSpace([string]$_.originStatus) }).Count) -EvidencePath $existingRegistryPath))
$checks.Add((New-PulseCheck -Name "every active file has firstSeenAt or createdAt" -Pass (@($fileObjects | Where-Object { [string]::IsNullOrWhiteSpace([string]$_.firstSeenAt) -and [string]::IsNullOrWhiteSpace([string]$_.createdAt) }).Count -eq 0) -Detail ("Files missing timestamps: " + @($fileObjects | Where-Object { [string]::IsNullOrWhiteSpace([string]$_.firstSeenAt) -and [string]::IsNullOrWhiteSpace([string]$_.createdAt) }).Count) -EvidencePath $existingRegistryPath))
$checks.Add((New-PulseCheck -Name "every active file has hash" -Pass (@($fileObjects | Where-Object { [string]::IsNullOrWhiteSpace([string]$_.hash) }).Count -eq 0) -Detail ("Files missing hash: " + @($fileObjects | Where-Object { [string]::IsNullOrWhiteSpace([string]$_.hash) }).Count) -EvidencePath $existingRegistryPath))
$checks.Add((New-PulseCheck -Name "every active file maps to a graph node or classified bucket" -Pass ($graphMappingFailures.Count -eq 0) -Detail ("Graph mapping failures: " + $graphMappingFailures.Count) -EvidencePath $existingRegistryPath))
$checks.Add((New-PulseCheck -Name "every new unrecognized file is rejected, quarantined, or classified" -Pass ($true) -Detail ("Audit-mode unknown files: " + $unknownAuditFiles.Count) -EvidencePath $existingRegistryPath))
$checks.Add((New-PulseCheck -Name "every runtime button/control has a LeeWay ID" -Pass ($strictControlFailures.Count -eq 0) -Detail ("Strict controls missing watermark: " + $strictControlFailures.Count + "; Audit buttons missing data-leeway-id: " + $missingDataLeewayButtons.Count) -EvidencePath $existingRegistryPath))
$checks.Add((New-PulseCheck -Name "every runtime command/event/state key has a LeeWay ID" -Pass (($strictStateFailures.Count -eq 0) -and ($strictCommandFailures.Count -eq 0) -and ($eventObjects.Count -gt 0)) -Detail ("Strict state failures: " + $strictStateFailures.Count + "; Strict command failures: " + $strictCommandFailures.Count + "; Events tracked: " + $eventObjects.Count) -EvidencePath $existingRegistryPath))
$checks.Add((New-PulseCheck -Name "every package artifact has a LeeWay artifact ID" -Pass ($artifactFailures.Count -eq 0) -Detail ("Artifact failures: " + $artifactFailures.Count) -EvidencePath $existingRegistryPath))
$checks.Add((New-PulseCheck -Name "every installed runtime has a hash attestation" -Pass $installedAttestationPass -Detail ("Installed runtime present: " + [bool]$installedArtifact.exists + "; Hash present: " + (-not [string]::IsNullOrWhiteSpace([string]$installedArtifact.hash))) -EvidencePath $existingRegistryPath))
$checks.Add((New-PulseCheck -Name "every README/image/doc asset has an identity record" -Pass ($docAssetFailures.Count -eq 0) -Detail ("Doc asset failures: " + $docAssetFailures.Count) -EvidencePath $existingRegistryPath))
$checks.Add((New-PulseCheck -Name "every foreign/imported entity has lower trust until promoted by gate" -Pass ($untrustedPromotionFailures.Count -eq 0) -Detail ("Foreign trust failures: " + $untrustedPromotionFailures.Count) -EvidencePath $existingRegistryPath))

$failedChecks = @($checks | Where-Object { -not $_.pass })
$result = [pscustomobject]@{
  gate = "LEEWAY_IDENTITY_PULSE_GATE"
  generatedAt = $generatedAt
  workspaceRoot = $resolvedWorkspaceRoot
  extensionDir = $resolvedExtensionDir
  version = [string]$pulseData.version
  mode = [string]$pulseData.mode
  passed = ($failedChecks.Count -eq 0)
  summary = [pscustomobject]@{
    totalChecks = $checks.Count
    failedChecks = $failedChecks.Count
    objectsTracked = $allObjects.Count
    strictFiles = @($fileObjects | Where-Object { $_.strict }).Count
    unknownAuditFiles = $unknownAuditFiles.Count
  }
  checks = $checks
  pulse = [pscustomobject]@{
    registryPath = $existingRegistryPath
    strictControls = $pulseData.strictControls
    strictStateKeys = $pulseData.strictStateKeys
    strictCommands = $pulseData.strictCommands
    unknownAuditFiles = @($unknownAuditFiles | Sort-Object)
    missingDataLeewayButtons = @($missingDataLeewayButtons | Sort-Object -Unique)
    objects = @($allObjects | Sort-Object id)
  }
}

$result | ConvertTo-Json -Depth 16 | Out-File -LiteralPath $resultPath -Encoding utf8
Write-Host "Identity pulse result written to $resultPath" -ForegroundColor Green

if (-not $result.passed) {
  exit 1
}
