<#
LEEWAY_HEADER - DO NOT REMOVE

REGION: 🟢 CORE
TAG: CORE.RUNTIME.DOCTOR.MAIN
PURPOSE: Verifies Agent Lee sovereign runtime wiring, build health, and LeeWay governance compliance.

5WH:
WHAT = Rebuild and compliance verification script for Agent Lee.
WHY = Proves the extension can build, package, and satisfy required V1 checks.
WHO = Agent Lee / LeeWay Runtime.
WHERE = agent-lee/scripts/Invoke-AgentLeeDoctor.ps1
WHEN = 2026
HOW = PowerShell validation across package metadata, compile output, Ollama, MCP, and compliance reports.

AGENTS:
PRIME
AUDIT
DOCTOR
ALIGN

LICENSE:
MIT
#>

param(
  [string]$WorkspaceDir = (Join-Path $PSScriptRoot "..\.."),
  [string]$ExtensionDir,
  [string]$CodeCmdPath = "$env:LOCALAPPDATA\Programs\Microsoft VS Code\bin\code.cmd",
  [string]$UserDataDir = (Join-Path $env:TEMP "agent-lee-vscode-profile"),
  [string]$ExtensionsDir = (Join-Path $env:TEMP "agent-lee-vscode-extensions"),
  [string]$OutputDir = (Join-Path (Join-Path (Join-Path $PSScriptRoot "..\..\reports") "Doctor") ("doctor-" + (Get-Date -Format "yyyyMMdd-HHmmss"))),
  [switch]$SkipBuild,
  [switch]$SkipPackage,
  [switch]$Install,
  [switch]$CheckOllama,
  [switch]$AllLocalFiles
)

$ErrorActionPreference = "Stop"

function New-Check {
  param(
    [string]$Name,
    [bool]$Pass,
    [string]$Detail = ""
  )

  [pscustomobject]@{
    name = $Name
    pass = $Pass
    detail = $Detail
  }
}

function Test-AgentLeeRuntimeNotificationFormatting {
  param(
    [string]$Path
  )

  if (-not (Test-Path $Path)) {
    return [pscustomobject]@{
      pass = $false
      detail = "Missing file."
    }
  }

  $content = Get-Content -LiteralPath $Path -Raw
  $directNotificationMatches = [regex]::Matches(
    $content,
    'vscode\.window\.show(?:Information|Warning|Error)Message\(\s*(?!formatAgentLeeRuntimeMessage\()'
  )
  $directAppendLineMatches = [regex]::Matches(
    $content,
    '(?<!appendAgentLeeLine\()output\.appendLine\('
  )
  $usesApprovedRouting = (
    $content -match "formatThroughAgentLee" -or
    $content -match "formatAgentLeeRuntimeMessage" -or
    $content -match "showAgentLeeRuntime(?:Info|Warning|Error)"
  )

  $issues = @()
  if (-not $usesApprovedRouting) {
    $issues += "missing Agent Lee runtime formatter or approved notification wrapper"
  }
  if ($directNotificationMatches.Count -gt 0) {
    $issues += "$($directNotificationMatches.Count) direct notification call(s)"
  }
  if ($directAppendLineMatches.Count -gt 0) {
    $issues += "$($directAppendLineMatches.Count) direct output summary line(s)"
  }

  [pscustomobject]@{
    pass = $issues.Count -eq 0
    detail = if ($issues.Count -eq 0) { "Agent Lee runtime-formatted helper summaries only." } else { $issues -join "; " }
  }
}

function Test-ExtensionTsNotificationFormatting {
  param(
    [string]$Path
  )

  if (-not (Test-Path $Path)) {
    return [pscustomobject]@{
      pass = $false
      detail = "Missing file."
    }
  }

  $content = Get-Content -LiteralPath $Path -Raw
  $issues = @()

  if (-not ($content -match "formatThroughAgentLee" -or $content -match "agentLeeText")) {
    $issues += "missing Agent Lee runtime formatter usage"
  }

  $directNotificationMatches = [regex]::Matches(
    $content,
    'vscode\.window\.show(?:Information|Warning|Error)Message\(\s*(?!agentLeeText\()'
  )
  if ($directNotificationMatches.Count -gt 0) {
    $issues += "$($directNotificationMatches.Count) direct notification call(s)"
  }

  $directInputBoxMatches = [regex]::Matches(
    $content,
    'vscode\.window\.showInputBox\(\s*{'
  )
  if ($directInputBoxMatches.Count -gt 1) {
    $issues += "$($directInputBoxMatches.Count - 1) direct Agent Lee input prompt call(s)"
  }

  $genericPhrasePatterns = @(
    'showWarningMessage\("Open a file first\."\)',
    'showWarningMessage\("Done"\)',
    'showInformationMessage\("Done"\)',
    'showErrorMessage\("Done"\)',
    'show(?:Information|Warning|Error)Message\("Sure',
    'show(?:Information|Warning|Error)Message\("I can help',
    'show(?:Information|Warning|Error)Message\("As an AI'
  )
  foreach ($pattern in $genericPhrasePatterns) {
    if ($content -match $pattern) {
      $issues += "generic unformatted extension.ts phrasing detected"
      break
    }
  }

  [pscustomobject]@{
    pass = $issues.Count -eq 0
    detail = if ($issues.Count -eq 0) { "extension.ts routes Agent Lee controlled prompts and summaries through approved wrappers." } else { $issues -join "; " }
  }
}

function Test-RequiredModelPresent {
  param(
    [string]$RequiredModel,
    [string[]]$AvailableModels
  )

  if ($RequiredModel -match ":") {
    return $AvailableModels -contains $RequiredModel
  }

  return ($AvailableModels -contains $RequiredModel) -or ($AvailableModels -contains "${RequiredModel}:latest")
}

function Test-LeeWayCompliance {
  param(
    [string]$Root,
    [switch]$AllLocalFiles
  )

  $extensions = @(".ts", ".js", ".ps1", ".json", ".md", ".txt")
  $ignoredSegments = "\\(node_modules|\.git|\.venv|out|dist|build|logs|memory|reports|backups|patches|sandbox|coverage)\\"
  $ignoredFiles = @(
    "agent-lee\vscode-extension\package-lock.json",
    ".vscode\extensions.json",
    "AUTO_UPDATE_FIX_SUMMARY.md",
    "AUTO_UPDATE_IMPLEMENTATION_COMPLETE.md",
    "agent-lee\Agent_Lee_Persona_System\00_README.md"
  )
  $ignoredFilePatterns = @(
    '^agent-lee\\voice\\models\\.+\.onnx\.json$',
    '^agent-lee\\receipts(\\|$)',
    '^agent-lee\\mcp\\adapters(\\|$)',
    '^agent-lee\\sdk\\leeway-sdk(\\|$)',
    '^agent-lee\\sdk\\schemas(\\|$)',
    '^agent-lee\\vscode-extension\\test-evidence(\\|$)',
    '^agent-lee\\vscode-extension\\receipts(\\|$)',
    '^agent-lee\\vscode-extension\\src\\types\\.+\.d\.ts$'
  )
  Push-Location $Root
  try {
    if (-not $AllLocalFiles) {
      $gitFiles = & git ls-files 2>$null
      if ($LASTEXITCODE -eq 0 -and $gitFiles) {
        $files = $gitFiles |
          Where-Object { $extensions -contains [System.IO.Path]::GetExtension($_).ToLowerInvariant() } |
          Where-Object { Test-Path -LiteralPath $_ } |
          ForEach-Object { Get-Item -LiteralPath $_ }
      } else {
        $files = Get-ChildItem -Path $Root -Recurse -File |
          Where-Object { $_.FullName -notmatch $ignoredSegments -and $extensions -contains $_.Extension }
      }
    } else {
      $files = Get-ChildItem -Path $Root -Recurse -File |
        Where-Object { $_.FullName -notmatch $ignoredSegments -and $extensions -contains $_.Extension }
    }
  }
  finally {
    Pop-Location
  }

  $inspected = 0
  $withHeader = 0
  $missing = @()

  foreach ($file in $files) {
    $relativePath = $file.FullName.Substring($Root.Length).TrimStart("\", "/").Replace("/", "\")
    if ($ignoredFiles -contains $relativePath) {
      continue
    }
    if ($ignoredFilePatterns | Where-Object { $relativePath -match $_ }) {
      continue
    }

    $text = Get-Content -LiteralPath $file.FullName -Raw -ErrorAction SilentlyContinue
    if ($null -eq $text) {
      continue
    }

    $inspected++
    $hasHeader = $text -match "LEEWAY_HEADER" -or $text -match "LEEWAY HEADER" -or $text -match '"LEEWAY_HEADER"'
    $hasRegion = $text -match "REGION:" -or $text -match '"REGION"\s*:'
    $hasTag = $text -match "TAG:" -or $text -match '"TAG"\s*:'
    $hasPipeline = $text -match "DISCOVERY_PIPELINE" -or $text -match '"DISCOVERY_PIPELINE"'
    $fileScore = 0
    if ($hasHeader) { $fileScore += 25 }
    if ($hasTag) { $fileScore += 25 }
    if ($hasRegion) { $fileScore += 25 }
    if ($hasPipeline) { $fileScore += 25 }

    if ($hasHeader -and $hasRegion -and $hasTag -and $hasPipeline) {
      $withHeader++
    }

    if ($fileScore -lt 100) {
      $missing += [pscustomobject]@{
        path = Resolve-Path -Relative $file.FullName
        score = $fileScore
        header = $hasHeader
        region = $hasRegion
        tag = $hasTag
        discoveryPipeline = $hasPipeline
      }
    }
  }

  $score = 0
  if ($inspected -gt 0) {
    $score = [math]::Round(($withHeader / $inspected) * 100, 2)
  }

  [pscustomobject]@{
    inspected = $inspected
    compliant = $withHeader
    score = $score
    blocking = (@($missing | Where-Object { $_.score -lt 70 }).Count -gt 0)
    blockingFiles = @($missing | Where-Object { $_.score -lt 70 })
    missing = $missing
  }
}

$resolvedWorkspace = (Resolve-Path $WorkspaceDir).Path
$resolvedExtensionDir = & (Join-Path $PSScriptRoot "Resolve-AgentLeeExtension.ps1") -ExtensionDir $ExtensionDir
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

$checks = New-Object System.Collections.Generic.List[object]
$checks.Add((New-Check "Extension folder exists" (Test-Path $resolvedExtensionDir) $resolvedExtensionDir))

$packagePath = Join-Path $resolvedExtensionDir "package.json"
$packageExists = Test-Path $packagePath
$checks.Add((New-Check "package.json exists" $packageExists $packagePath))

$package = $null
if ($packageExists) {
  $package = Get-Content $packagePath -Raw | ConvertFrom-Json
  $checks.Add((New-Check "main points to out/extension.js" ($package.main -eq "./out/extension.js") $package.main))
  $activityIcon = $package.contributes.viewsContainers.activitybar[0].icon
  $iconPath = Join-Path $resolvedExtensionDir $activityIcon
  $checks.Add((New-Check "Activity Bar icon exists" (Test-Path $iconPath) $activityIcon))
  $commands = @($package.contributes.commands | ForEach-Object { $_.command })
  $activationEvents = @($package.activationEvents)
  $requiredCommands = @(
    "agentLee.open",
    "agentLee.openPanel",
    "agentLee.openSidebar",
    "agentLee.scanWorkspace",
    "agentLee.fixWorkspace",
    "agentLee.verifyWorkspace",
    "agentLee.askLocalModel",
    "agentLee.engineerTask",
    "agentLee.inspectWorkspace",
    "agentLee.stagePatch",
    "agentLee.applyApprovedPatch",
    "agentLee.runVerification",
    "agentLee.showReceipts",
    "agentLee.runtimeStatus",
    "agentLee.testPersona"
  )
  foreach ($command in $requiredCommands) {
    $checks.Add((New-Check "Command registered: $command" ($commands -contains $command)))
  }
  $checks.Add((New-Check "Activation event includes wildcard startup activation" ($activationEvents -contains "*") ($activationEvents -join ", ")))
  $checks.Add((New-Check "Activation does not rely on stale view/startup assumptions" (-not (($activationEvents -contains "onStartupFinished") -or ($activationEvents -contains "onView:agentLee.sidebar"))) ($activationEvents -join ", ")))
  $redundantCommands = $activationEvents | Where-Object { $_ -match "^onCommand:agentLee\." }
  $checks.Add((New-Check "No redundant onCommand activation events" ($redundantCommands.Count -eq 0) ($redundantCommands -join ", ")))

  $viewContainerId = $package.contributes.viewsContainers.activitybar[0].id
  $viewId = $package.contributes.views.$viewContainerId[0].id
  $checks.Add((New-Check "Activity Bar view container ID is present" (-not [string]::IsNullOrWhiteSpace($viewContainerId)) $viewContainerId))
  $checks.Add((New-Check "Sidebar view ID is present" (-not [string]::IsNullOrWhiteSpace($viewId)) $viewId))
  $agentLeeRootSetting = $package.contributes.configuration.properties."agentLee.rootPath"
  $checks.Add((New-Check "package.json contributes agentLee.rootPath setting" ($null -ne $agentLeeRootSetting) $packagePath))
  if ($null -ne $agentLeeRootSetting) {
    $checks.Add((New-Check "agentLee.rootPath default points to standalone root" ($agentLeeRootSetting.default -eq "C:\Users\Leona\.leeway-vscode\agent-lee") $packagePath))
  }
}

$extensionSourcePath = Join-Path $resolvedExtensionDir "src\extension.ts"
$checks.Add((New-Check "extension.ts exists" (Test-Path $extensionSourcePath) $extensionSourcePath))
if (Test-Path $extensionSourcePath) {
  $extensionSource = Get-Content $extensionSourcePath -Raw
  $requiredRegistrations = @(
    "agentLee.openPanel",
    "agentLee.scanWorkspace",
    "agentLee.fixWorkspace",
    "agentLee.verifyWorkspace",
    "agentLee.askLocalModel",
    "agentLee.engineerTask",
    "agentLee.inspectWorkspace",
    "agentLee.stagePatch",
    "agentLee.applyApprovedPatch",
    "agentLee.runVerification",
    "agentLee.showReceipts",
    "agentLee.runtimeStatus",
    "agentLee.testPersona"
  )
  foreach ($command in $requiredRegistrations) {
    $checks.Add((New-Check "extension.ts registers $command" ($extensionSource -match [regex]::Escape($command)) $extensionSourcePath))
  }

  if ($package) {
    $viewContainerId = $package.contributes.viewsContainers.activitybar[0].id
    $viewId = $package.contributes.views.$viewContainerId[0].id
    $providerUsesConstant = $extensionSource -match 'registerWebviewViewProvider\(\s*AGENT_LEE_SIDEBAR_VIEW_ID'
    $providerUsesLiteral = $extensionSource -match ('registerWebviewViewProvider\(\s*"' + [regex]::Escape($viewId) + '"')
    $checks.Add((New-Check "package.json view ID matches registered WebviewViewProvider ID" ($providerUsesConstant -or $providerUsesLiteral) $extensionSourcePath))
  }

  $checks.Add((New-Check "extension.ts contains AGENT_LEE_UI_VERSION" ($extensionSource -match 'AGENT_LEE_UI_VERSION\s*=\s*"chat-ui-restored-2026-05-07"') $extensionSourcePath))
  $checks.Add((New-Check "Status bar item uses Agent Lee ready/degraded proof text" (($extensionSource -match 'Agent Lee: Ready') -and ($extensionSource -match 'Agent Lee: Degraded')) $extensionSourcePath))
  $checks.Add((New-Check "Status bar item uses runtimeStatus command and required tooltip" (($extensionSource -match 'Agent Lee sovereign runtime is active') -and ($extensionSource -match 'agentLee\.runtimeStatus')) $extensionSourcePath))
  $checks.Add((New-Check "extension.ts creates WebviewPanel for openPanel" (($extensionSource -match 'createWebviewPanel') -and ($extensionSource -match 'agentLeeRuntimePanel')) $extensionSourcePath))
  $checks.Add((New-Check "openPanel uses real chat UI builder" ($extensionSource -match 'panel\.webview\.html\s*=\s*getHtml\(panel\.webview,\s*context\)') $extensionSourcePath))
  $checks.Add((New-Check "sidebar provider uses real chat UI builder" ($extensionSource -match 'view\.webview\.html\s*=\s*getHtml\(view\.webview,\s*this\.context\)') $extensionSourcePath))
  $checks.Add((New-Check "extension.ts registers WebviewViewProvider" ($extensionSource -match 'registerWebviewViewProvider') $extensionSourcePath))
  $checks.Add((New-Check "Webview HTML calls acquireVsCodeApi exactly once" ([regex]::Matches($extensionSource, 'acquireVsCodeApi\(\)').Count -eq 1) $extensionSourcePath))
  $checks.Add((New-Check "Webview buttons post messages" (($extensionSource -match 'agentLeeUiAction') -and ($extensionSource -match 'postUiAction') -and ($extensionSource -match 'data-ui-action')) $extensionSourcePath))
  foreach ($buttonLabel in @(
    "Engineer Task",
    "Runtime Status",
    "Scan Agent Lee Self",
    "Verify Agent Lee Self",
    "Ask Local Model"
  )) {
    $checks.Add((New-Check "Webview button exists: $buttonLabel" ($extensionSource -match [regex]::Escape($buttonLabel)) $extensionSourcePath))
  }
  foreach ($uiCommand in @(
    "sendMessage",
    "askLocalModel",
    "engineerTask",
    "scanSelf",
    "verifySelf",
    "runtimeStatus",
    "scanWorkspace",
    "verifyWorkspace",
    "clearChat",
    "openReport",
    "openReceipts"
  )) {
    $checks.Add((New-Check "extension.ts handles webview message command/action: $uiCommand" ($extensionSource -match [regex]::Escape($uiCommand)) $extensionSourcePath))
  }
  if ($package) {
    $viewContainerId = $package.contributes.viewsContainers.activitybar[0].id
    $viewId = $package.contributes.views.$viewContainerId[0].id
    $checks.Add((New-Check "Activity Bar/sidebar IDs match package.json" (($viewContainerId -eq "agentLee") -and ($viewId -eq "agentLee.sidebar")) $packagePath))
  }
  $checks.Add((New-Check "No activation-blocking await occurs before UI registration" (-not ($extensionSource -match 'export async function activate\(context: vscode\.ExtensionContext\)\s*\{\s*await initializeAgentLeeRuntime\(context\)')) $extensionSourcePath))
}

$writePolicyPath = Join-Path $resolvedExtensionDir "src\core\leeway-write-policy.ts"
$runtimeBootstrapPath = Join-Path $resolvedExtensionDir "src\core\agent-lee-runtime-bootstrap.ts"
$modelGovernancePath = Join-Path $resolvedExtensionDir "src\core\model-governance.ts"
$agentGovernancePath = Join-Path $resolvedExtensionDir "src\core\agent-governance.ts"
$llmProviderPath = Join-Path $resolvedExtensionDir "src\core\LLMProvider.ts"
$imageToolPath = Join-Path $resolvedExtensionDir "src\tools\image-tool.ts"
$pluginRouterPath = Join-Path $resolvedExtensionDir "src\plugins\agentLeePluginRouter.ts"
$engineeringLoopPath = Join-Path $resolvedExtensionDir "src\core\agent-engineering-loop.ts"
$engineeringPromptPath = Join-Path $resolvedExtensionDir "src\core\agent-lee-engineering-prompt.ts"
$connectivityLoaderPath = Join-Path $resolvedExtensionDir "src\core\leeway-connectivity-loader.ts"
$personaBridgePath = Join-Path $resolvedExtensionDir "src\persona\persona-runtime-bridge.ts"
$personaCorePath = Join-Path $resolvedExtensionDir "src\core\persona.ts"
$standaloneAgentLeeRoot = Join-Path $resolvedWorkspace "agent-lee"
$standaloneSdkRoot = Join-Path $resolvedWorkspace "agent-lee\sdk"
$standaloneMcpRoot = Join-Path $resolvedWorkspace "agent-lee\mcp"
$standaloneAgentsRoot = Join-Path $resolvedWorkspace "agent-lee\agents"
$standaloneGovernanceRoot = Join-Path $resolvedWorkspace "agent-lee\governance"
$standalonePersonaSystemRoot = Join-Path $resolvedWorkspace "agent-lee\Agent_Lee_Persona_System"
$standalonePersonaModuleRoot = Join-Path $resolvedWorkspace "agent-lee\persona"
$agentRegistryPath = Join-Path $resolvedWorkspace "agent-lee\agents\registry\agent-registry.json"
$standardsCanonPath = Join-Path $resolvedWorkspace "agent-lee\sdk\standards\leeway-standards-canon.json"
$sdkManifestPath = Join-Path $resolvedWorkspace "agent-lee\sdk\leeway-sdk\manifest.json"
$personaManifestPath = Join-Path $resolvedWorkspace "agent-lee\Agent_Lee_Persona_System\05_MANIFEST\agentlee_persona_manifest.json"
$heritageCanonPath = Join-Path $resolvedWorkspace "agent-lee\Agent_Lee_Persona_System\06_HERITAGE\agentlee_heritage_canon.md"
$heritageJsonPath = Join-Path $resolvedWorkspace "agent-lee\Agent_Lee_Persona_System\06_HERITAGE\agentlee_heritage_canon.json"
$personaModuleManifestPath = Join-Path $resolvedWorkspace "agent-lee\persona\assets\05_MANIFEST\agentlee_persona_manifest.json"
$personaModuleHeritageCanonPath = Join-Path $resolvedWorkspace "agent-lee\persona\assets\06_HERITAGE\agentlee_heritage_canon.md"
$personaModuleHeritageJsonPath = Join-Path $resolvedWorkspace "agent-lee\persona\assets\06_HERITAGE\agentlee_heritage_canon.json"
$checks.Add((New-Check "LeeWay write policy exists" (Test-Path $writePolicyPath) $writePolicyPath))
$checks.Add((New-Check "Agent Lee runtime bootstrap exists" (Test-Path $runtimeBootstrapPath) $runtimeBootstrapPath))
$checks.Add((New-Check "Model governance exists" (Test-Path $modelGovernancePath) $modelGovernancePath))
$checks.Add((New-Check "Agent governance exists" (Test-Path $agentGovernancePath) $agentGovernancePath))
$checks.Add((New-Check "Engineering loop exists" (Test-Path $engineeringLoopPath) $engineeringLoopPath))
$checks.Add((New-Check "Engineering prompt exists" (Test-Path $engineeringPromptPath) $engineeringPromptPath))
$checks.Add((New-Check "Standalone connectivity loader exists" (Test-Path $connectivityLoaderPath) $connectivityLoaderPath))
$checks.Add((New-Check "Persona runtime bridge exists" (Test-Path $personaBridgePath) $personaBridgePath))
$checks.Add((New-Check "Standalone Agent Lee source root exists" (Test-Path $standaloneAgentLeeRoot) $standaloneAgentLeeRoot))
$checks.Add((New-Check "VSIX package root exists" (Test-Path $resolvedExtensionDir) $resolvedExtensionDir))
$packageRootHasStandaloneDirs =
  (Test-Path (Join-Path $resolvedExtensionDir "sdk")) -and
  (Test-Path (Join-Path $resolvedExtensionDir "mcp")) -and
  (Test-Path (Join-Path $resolvedExtensionDir "agents")) -and
  (Test-Path (Join-Path $resolvedExtensionDir "governance")) -and
  (Test-Path (Join-Path $resolvedExtensionDir "Agent_Lee_Persona_System")) -and
  (Test-Path (Join-Path $resolvedExtensionDir "persona")) -and
  (Test-Path (Join-Path $resolvedExtensionDir "vscode-extension"))
$checks.Add((New-Check "Installed VSIX package root is not treated as runtime root unless it carries standalone directories" (-not $packageRootHasStandaloneDirs) "$resolvedExtensionDir standaloneDirsPresent=$packageRootHasStandaloneDirs"))
$checks.Add((New-Check "Standalone SDK root exists" (Test-Path $standaloneSdkRoot) $standaloneSdkRoot))
$checks.Add((New-Check "Standalone MCP root exists" (Test-Path $standaloneMcpRoot) $standaloneMcpRoot))
$checks.Add((New-Check "Standalone agents root exists" (Test-Path $standaloneAgentsRoot) $standaloneAgentsRoot))
$checks.Add((New-Check "Standalone governance root exists" (Test-Path $standaloneGovernanceRoot) $standaloneGovernanceRoot))
$checks.Add((New-Check "Standalone persona system root exists" (Test-Path $standalonePersonaSystemRoot) $standalonePersonaSystemRoot))
$checks.Add((New-Check "Standalone persona module root exists" (Test-Path $standalonePersonaModuleRoot) $standalonePersonaModuleRoot))
$checks.Add((New-Check "Standalone SDK manifest exists" (Test-Path $sdkManifestPath) $sdkManifestPath))
$checks.Add((New-Check "Standalone agent registry exists" (Test-Path $agentRegistryPath) $agentRegistryPath))
$checks.Add((New-Check "Standalone standards canon exists" (Test-Path $standardsCanonPath) $standardsCanonPath))
$checks.Add((New-Check "Heritage canon markdown exists" (Test-Path $heritageCanonPath) $heritageCanonPath))
$checks.Add((New-Check "Heritage canon JSON exists" (Test-Path $heritageJsonPath) $heritageJsonPath))
$checks.Add((New-Check "Persona module heritage markdown exists" (Test-Path $personaModuleHeritageCanonPath) $personaModuleHeritageCanonPath))
$checks.Add((New-Check "Persona module heritage JSON exists" (Test-Path $personaModuleHeritageJsonPath) $personaModuleHeritageJsonPath))
$checks.Add((New-Check "Persona manifest exists" (Test-Path $personaManifestPath) $personaManifestPath))
$checks.Add((New-Check "Persona module manifest exists" (Test-Path $personaModuleManifestPath) $personaModuleManifestPath))

if (Test-Path $connectivityLoaderPath) {
  $connectivityLoader = Get-Content $connectivityLoaderPath -Raw
  foreach ($exportName in @(
    "resolveAgentLeeRoot",
    "getAgentLeeRootResolution",
    "getAgentLeeRoot",
    "getInternalSdkRoot",
    "getInternalStandardsRoot",
    "getInternalMcpRoot",
    "getInternalAgentsRoot",
    "getInternalGovernanceRoot",
    "validateStandaloneConnectivity",
    "loadLeewaySdkManifest",
    "loadAgentRegistry",
    "loadMcpRegistry",
    "loadStandardsCanon"
  )) {
    $checks.Add((New-Check "Connectivity loader exports $exportName" ($connectivityLoader -match [regex]::Escape($exportName)) $connectivityLoaderPath))
  }
  $checks.Add((New-Check "Connectivity loader supports AGENT_LEE_ROOT override" ($connectivityLoader -match "AGENT_LEE_ROOT") $connectivityLoaderPath))
  $checks.Add((New-Check "Connectivity loader reads agentLee.rootPath configuration" ($connectivityLoader -match 'getConfiguration\("agentLee"\)' -and $connectivityLoader -match "rootPath") $connectivityLoaderPath))
  $checks.Add((New-Check "Connectivity loader defines standalone default root" ($connectivityLoader -match "DEFAULT_AGENT_LEE_ROOT" -and $connectivityLoader -match [regex]::Escape('C:\\Users\\Leona\\.leeway-vscode\\agent-lee')) $connectivityLoaderPath))
  $checks.Add((New-Check "Connectivity loader uses walk-up discovery" ($connectivityLoader -match "walkUpRoots" -and $connectivityLoader -match "containsStandaloneDirectories" -and $connectivityLoader -match "extensionPath") $connectivityLoaderPath))
  $checks.Add((New-Check "Connectivity loader avoids trusting installed extension root alone" ($connectivityLoader -match 'rootSource: "degraded"' -and $connectivityLoader -match "containsStandaloneDirectories") $connectivityLoaderPath))
}

if (Test-Path $personaManifestPath) {
  $personaManifest = Get-Content $personaManifestPath -Raw
  $checks.Add((New-Check "Persona manifest references heritage canon" ($personaManifest -match "heritage_canon" -and $personaManifest -match "06_HERITAGE") $personaManifestPath))
}

if (Test-Path $personaBridgePath) {
  $personaBridge = Get-Content $personaBridgePath -Raw
  $checks.Add((New-Check "Persona bridge loads heritage canon" ($personaBridge -match "heritageCanon" -and $personaBridge -match "buildAgentLeeRuntimePrompt") $personaBridgePath))
  $checks.Add((New-Check "Runtime prompt includes heritage and governance laws" ($personaBridge -match "HERITAGE CANON" -and $personaBridge -match "LEEWAY WRITE LAW" -and $personaBridge -match "ENGINEERING WORKFLOW LAW" -and $personaBridge -match "ANTI-GENERIC LAW" -and $personaBridge -match "CURRENT TASK CONTEXT") $personaBridgePath))
  $checks.Add((New-Check "Persona bridge uses standalone persona module root" ($personaBridge -match "getAgentLeePersonaModuleRoot" -or $personaBridge -match "getPersonaModuleRoot") $personaBridgePath))
  $personaTestPasses = (
    ($personaBridge -match "LeeWay governance") -and
    ($personaBridge -match "not generic") -and
    ($personaBridge -match "culturally grounded") -and
    ($personaBridge -match "do not perform culture") -and
    ($personaBridge -match "inspect first") -and
    ($personaBridge -match "plan the move") -and
    ($personaBridge -match "stage the patch") -and
    ($personaBridge -match "verify the result") -and
    ($personaBridge -match "receipt")
  )
  $checks.Add((New-Check "Persona test is anti-generic" $personaTestPasses $personaBridgePath))
}

if (Test-Path $personaCorePath) {
  $personaCore = Get-Content $personaCorePath -Raw
  $checks.Add((New-Check "Core persona uses runtime bridge" ($personaCore -match "buildAgentLeeRuntimePrompt" -and $personaCore -match "validatePersonaSystem" -and $personaCore -match "testPersona" -and $personaCore -match "formatAgentLeeResponse") $personaCorePath))
}

if (Test-Path $runtimeBootstrapPath) {
  $runtimeBootstrap = Get-Content $runtimeBootstrapPath -Raw
  foreach ($exportName in @(
    "initializeAgentLeeRuntime",
    "assertAgentLeeRuntimeReady",
    "getAgentLeeRuntimeState",
    "refreshDoctorStatus",
    "setDoctorStatus",
    "getDoctorStatus",
    "formatThroughAgentLee",
    "buildModelPromptThroughAgentLee",
    "recordAgentLeeRuntimeReceipt"
  )) {
    $checks.Add((New-Check "Runtime bootstrap exports $exportName" ($runtimeBootstrap -match [regex]::Escape($exportName)) $runtimeBootstrapPath))
  }
  $checks.Add((New-Check "Runtime bootstrap declares degraded mode" ($runtimeBootstrap -match "Agent Lee runtime is degraded: persona module unavailable") $runtimeBootstrapPath))
  $checks.Add((New-Check "Runtime bootstrap sets AGENT_LEE_RUNTIME_READY flag" ($runtimeBootstrap -match "AGENT_LEE_RUNTIME_READY") $runtimeBootstrapPath))
  $checks.Add((New-Check "Runtime bootstrap wires doctor status refresh and report parsing" (($runtimeBootstrap -match "refreshDoctorStatus") -and ($runtimeBootstrap -match "setDoctorStatus") -and ($runtimeBootstrap -match "getDoctorStatus") -and ($runtimeBootstrap -match "Failed checks:")) $runtimeBootstrapPath))
  $checks.Add((New-Check "Runtime bootstrap reports resolvedRoot rootSource and missingConnectivityPaths" (($runtimeBootstrap -match "resolvedRoot") -and ($runtimeBootstrap -match "rootSource") -and ($runtimeBootstrap -match "missingConnectivityPaths")) $runtimeBootstrapPath))
}

# Governance Classifier Checks
$leewayPolicyPath = Join-Path $resolvedExtensionDir "src\core\leeway-write-policy.ts"
if (Test-Path $leewayPolicyPath) {
  $policyContent = Get-Content $leewayPolicyPath -Raw
  $checks.Add((New-Check "Shared governed-file classifier exists" ($policyContent -match 'isGovernedLeeWayFile') $leewayPolicyPath))
  $checks.Add((New-Check "Self-scan excludes mcp/adapters" ($policyContent -match 'mcp/adapters') $leewayPolicyPath))
  $checks.Add((New-Check "Self-scan excludes runtime-state.json" ($policyContent -match 'runtime-state\.json') $leewayPolicyPath))
  $checks.Add((New-Check "Self-scan excludes persona README" ($policyContent -match 'Persona_System/00_README\.md') $leewayPolicyPath))
}

$leewayScannerPath = Join-Path $resolvedExtensionDir "src\tools\leeway-scanner.ts"
if (Test-Path $leewayScannerPath) {
  $scannerContent = Get-Content $leewayScannerPath -Raw
  $checks.Add((New-Check "Live scanner exports scanLeeWayCompliance" ($scannerContent -match 'export async function scanLeeWayCompliance') $leewayScannerPath))
  $checks.Add((New-Check "Live scanner defines unified version" ($scannerContent -match 'export const LEEWAY_SCANNER_VERSION = "self-scan-unified-2026-05-07"') $leewayScannerPath))
  $checks.Add((New-Check "Live scanner getFiles supports root and mode" ($scannerContent -match 'getFiles\(dir: string, out: string\[\] = \[\], root: string = dir, mode: "self" \| "workspace" \| "currentFile" = "workspace"') $leewayScannerPath))
}

$extensionPath = Join-Path $resolvedExtensionDir "src\extension.ts"
if (Test-Path $extensionPath) {
  $extContent = Get-Content $extensionPath -Raw
  $checks.Add((New-Check "extension.ts imports scanLeeWayCompliance" ($extContent -match 'import \{.*scanLeeWayCompliance.*\} from "./tools/leeway-scanner"') $extensionPath))
  $checks.Add((New-Check "extension.ts imports LEEWAY_SCANNER_VERSION" ($extContent -match 'import \{.*LEEWAY_SCANNER_VERSION.*\} from "./tools/leeway-scanner"') $extensionPath))
  $checks.Add((New-Check "runWorkspaceScan uses unified scanLeeWayCompliance" ($extContent -match 'await scanLeeWayCompliance\(\{ root, mode: isSelf \? "self" : "workspace" \}\)') $extensionPath))
  $checks.Add((New-Check "runWorkspaceScan outputs scanner version" ($extContent -match 'Scanner version: \$\{LEEWAY_SCANNER_VERSION\}') $extensionPath))
  $checks.Add((New-Check "runWorkspaceScan calls setDoctorStatus for self-scan" ($extContent -match 'setDoctorStatus\(result\.blockingFiles\.length === 0 \? "pass" : "fail"\)') $extensionPath))
  $checks.Add((New-Check "gatherComplianceResults removed from extension.ts" (-not ($extContent -match 'function gatherComplianceResults')) $extensionPath))
}

$bootstrapPath = Join-Path $resolvedExtensionDir "src\core\agent-lee-runtime-bootstrap.ts"
if (Test-Path $bootstrapPath) {
  $bootContent = Get-Content $bootstrapPath -Raw
  $checks.Add((New-Check "Runtime bootstrap refreshDoctorStatus handles compliance reports" ($bootContent -match "readLatestComplianceReport" -and $bootContent -match "COMPLIANCE_REPORTS_ROOT") $bootstrapPath))
}



$receiptDir = Join-Path $resolvedWorkspace "reports\engineering-runs"
New-Item -ItemType Directory -Force -Path $receiptDir | Out-Null
$checks.Add((New-Check "Engineering receipt directory is creatable" (Test-Path $receiptDir) $receiptDir))

$policyUsageTargets = @(
  "src\core\file-ops.ts",
  "src\extension.ts",
  "src\execution-brain\executionToEditBuffer.adapter.ts",
  "src\edit-buffer\editBuffer.apply.ts"
)
foreach ($relativePath in $policyUsageTargets) {
  $fullPath = Join-Path $resolvedExtensionDir $relativePath
  $usesPolicy = $false
  if (Test-Path $fullPath) {
    $content = Get-Content $fullPath -Raw
    $usesPolicy = $content -match "leeway-write-policy" -or $content -match "ensureLeewayCompliantContent" -or $content -match "writeTextWithRetries" -or $content -match "writeJsonWithRetries"
  }
  $checks.Add((New-Check "Write path uses LeeWay policy: $relativePath" $usesPolicy $fullPath))
}

$fileOpsPath = Join-Path $resolvedExtensionDir "src\core\file-ops.ts"
if (Test-Path $fileOpsPath) {
  $fileOpsContent = Get-Content $fileOpsPath -Raw
  $checks.Add((New-Check "Governed writes enforce LeeWay compliance" (($fileOpsContent -match "ensureGovernedContent") -and ($fileOpsContent -match "ensureLeewayCompliantContent")) $fileOpsPath))
}

if (-not $SkipBuild) {
  Push-Location $resolvedExtensionDir
  try {
    & node.exe .\scripts\sync-release-metadata.mjs
    $checks.Add((New-Check "Release metadata synchronized" ($LASTEXITCODE -eq 0)))
    if ($LASTEXITCODE -ne 0) {
      throw "Release metadata sync failed."
    }

    if (-not (Test-Path "node_modules")) {
      if (Test-Path "package-lock.json") {
        & npm.cmd ci
      } else {
        & npm.cmd install
      }
      $checks.Add((New-Check "Dependencies installed" ($LASTEXITCODE -eq 0)))
      if ($LASTEXITCODE -ne 0) {
        throw "Dependency install failed."
      }
    } else {
      $checks.Add((New-Check "Dependencies installed" $true "node_modules already exists"))
    }

    & npm.cmd run compile
    $checks.Add((New-Check "TypeScript compile succeeds" ($LASTEXITCODE -eq 0)))
    if ($LASTEXITCODE -ne 0) {
      throw "TypeScript compile failed."
    }
  }
  finally {
    Pop-Location
  }
}

$outPath = Join-Path $resolvedExtensionDir "out\extension.js"
$checks.Add((New-Check "out/extension.js exists" (Test-Path $outPath) $outPath))
if (Test-Path $outPath) {
  $outContent = Get-Content $outPath -Raw
    $checks.Add((New-Check "out/extension.js contains activate/deactivate" ($outContent -match "activate\s*=" -and $outContent -match "deactivate\s*=" -or ($outContent -match "function activate\(" -and $outContent -match "function deactivate\(")) $outPath))
  $checks.Add((New-Check "out/extension.js contains initializeAgentLeeRuntime" ($outContent -match "initializeAgentLeeRuntime")))
  $checks.Add((New-Check "out/extension.js contains registerWebviewViewProvider" ($outContent -match "registerWebviewViewProvider")))
  $checks.Add((New-Check "out/extension.js contains agentLee commands" (($outContent -match "agentLee\.runtimeStatus") -and ($outContent -match "agentLee\.openPanel"))))
}

$vsixPath = Join-Path $resolvedExtensionDir "$($package.name)-$($package.version).vsix"
if (-not $SkipPackage) {
  Push-Location $resolvedExtensionDir
  try {
    & node.exe .\scripts\package-release.mjs (Split-Path -Leaf $vsixPath)
    $checks.Add((New-Check "VSIX package builds" ($LASTEXITCODE -eq 0) $vsixPath))
    if ($LASTEXITCODE -ne 0) {
      throw "VSIX packaging failed."
    }
  }
  finally {
    Pop-Location
  }
}
$checks.Add((New-Check "VSIX file exists" (Test-Path $vsixPath) $vsixPath))
if (Test-Path $vsixPath) {
  # Estimate file count by unzipping or just using vsce ls if available
  Push-Location $resolvedExtensionDir
  try {
    $fileList = & npx.cmd vsce ls
    $count = ($fileList | Measure-Object).Count
    $checks.Add((New-Check "VSIX file count is below 700" ($count -lt 700) "Count: $count"))
  } finally {
    Pop-Location
  }
}

if ($Install) {
  $canInstall = (Test-Path $CodeCmdPath) -and (Test-Path $vsixPath)
  $checks.Add((New-Check "VS Code CLI exists" (Test-Path $CodeCmdPath) $CodeCmdPath))
  if ($canInstall) {
    & (Join-Path $PSScriptRoot "Install-AgentLeeVSIX.ps1") `
      -VsixPath $vsixPath `
      -CodeCmdPath $CodeCmdPath `
      -UserDataDir $UserDataDir `
      -ExtensionsDir $ExtensionsDir | Out-Null
    $checks.Add((New-Check "VSIX installs into isolated profile" ($LASTEXITCODE -eq 0) $ExtensionsDir))

    $installed = & $CodeCmdPath --extensions-dir $ExtensionsDir --list-extensions --show-versions
    $installedPath = Join-Path $OutputDir "installed-extensions.txt"
    $installed | Out-File $installedPath -Encoding utf8
    $checks.Add((New-Check "Agent Lee listed in isolated profile" (($installed -join "`n") -match "leeway\.agent-lee-leeway-coding-system") $installedPath))
  }
}

if ($true) {
  try {
    $ollamaTags = Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -TimeoutSec 3
    $count = @($ollamaTags.models).Count
    $checks.Add((New-Check "Ollama API reachable" $true "$count model(s) reported"))
    $requiredModels = @(
      "qwen2.5-coder:1.5b",
      "qwen2.5-coder:7b",
      "qwen2.5-coder:14b",
      "qwen2.5-coder:14b",
      "qwen3:latest",
      "qwen3-vl-embedding"
    )
    $availableModels = @($ollamaTags.models | ForEach-Object { $_.name })
    foreach ($model in $requiredModels) {
      $present = Test-RequiredModelPresent -RequiredModel $model -AvailableModels $availableModels
      $checks.Add((New-Check "Required Ollama model present: $model" $present))
    }
  } catch {
    $checks.Add((New-Check "Ollama API reachable" $false $_.Exception.Message))
  }
}

$mcpRegistryPath = Join-Path $resolvedWorkspace "agent-lee\mcp\mcp-registry.json"
$checks.Add((New-Check "MCP registry exists" (Test-Path $mcpRegistryPath) $mcpRegistryPath))
if (Test-Path $mcpRegistryPath) {
  $registry = Get-Content $mcpRegistryPath -Raw | ConvertFrom-Json
  $tools = @($registry.tools)
  foreach ($tool in @("leeway.scan", "leeway.fix", "leeway.verify", "leeway.model.route", "persona.runtime.bridge", "write.policy", "engineering.loop", "sdk.validator", "agent.registry.loader")) {
    $checks.Add((New-Check "MCP registry tool present: $tool" ($tools -contains $tool) $mcpRegistryPath))
  }
}

$personaModuleIndexPath = Join-Path $resolvedWorkspace "agent-lee\persona\index.ts"
$personaModuleFiles = @(
  $personaModuleIndexPath,
  (Join-Path $resolvedWorkspace "agent-lee\persona\src\persona-module.ts"),
  (Join-Path $resolvedWorkspace "agent-lee\persona\src\prompt-builder.ts"),
  (Join-Path $resolvedWorkspace "agent-lee\persona\src\response-formatter.ts"),
  (Join-Path $resolvedWorkspace "agent-lee\persona\src\voice-modes.ts"),
  (Join-Path $resolvedWorkspace "agent-lee\persona\src\heritage-loader.ts"),
  (Join-Path $resolvedWorkspace "agent-lee\persona\src\persona-validator.ts"),
  (Join-Path $resolvedWorkspace "agent-lee\persona\src\anti-generic-filter.ts")
)
foreach ($personaModuleFile in $personaModuleFiles) {
  $checks.Add((New-Check "Persona module file exists: $([System.IO.Path]::GetFileName($personaModuleFile))" (Test-Path $personaModuleFile) $personaModuleFile))
}
if (Test-Path $personaModuleIndexPath) {
  $personaModuleIndex = Get-Content $personaModuleIndexPath -Raw
  foreach ($exportName in @("buildAgentLeeRuntimePrompt", "formatAgentLeeResponse", "validateAgentLeePersonaModule", "testAgentLeePersona")) {
    $checks.Add((New-Check "Persona module export present: $exportName" ($personaModuleIndex -match [regex]::Escape($exportName)) $personaModuleIndexPath))
  }
}

$extensionSource = if (Test-Path $extensionSourcePath) { Get-Content $extensionSourcePath -Raw } else { "" }
if ($extensionSource) {
  $checks.Add((New-Check "Extension activation initializes Agent Lee runtime asynchronously" ($extensionSource -match "initializeAgentLeeRuntime\(context\)") $extensionSourcePath))
  $checks.Add((New-Check "Command responses use Agent Lee runtime formatter" ($extensionSource -match "formatThroughAgentLee" -or $extensionSource -match "agentLeeText") $extensionSourcePath))
  $checks.Add((New-Check "Local model prompts route through Agent Lee prompt builder" ($extensionSource -match "buildModelPromptThroughAgentLee") $extensionSourcePath))
  $checks.Add((New-Check "Runtime status command exists" ($extensionSource -match "agentLee\.runtimeStatus") $extensionSourcePath))
  $checks.Add((New-Check "Test persona is diagnostic only" ($extensionSource -match "Diagnostic probe confirmed the always-on persona runtime" -and $extensionSource -match "assertAgentLeeRuntimeReady") $extensionSourcePath))
  $extensionFormatting = Test-ExtensionTsNotificationFormatting -Path $extensionSourcePath
  $checks.Add((New-Check "extension.ts routes Agent Lee controlled prompts and summaries through approved wrappers" $extensionFormatting.pass $extensionFormatting.detail))
}

$runtimeNotificationTargets = @(
  "src\edit-buffer\editBuffer.commands.ts",
  "src\session-orchestrator\codingSession.commands.ts",
  "src\execution-brain\verificationRepairToEditBuffer.adapter.ts",
  "src\execution-brain\executionToEditBuffer.adapter.ts",
  "src\indexing\backgroundIndexer.commands.ts",
  "src\performance\performance.commands.ts",
  "src\core\agent-engineering-loop.ts"
)
foreach ($relativePath in $runtimeNotificationTargets) {
  $fullPath = Join-Path $resolvedExtensionDir $relativePath
  $result = Test-AgentLeeRuntimeNotificationFormatting -Path $fullPath
  $checks.Add((New-Check "Helper summaries route through Agent Lee runtime: $relativePath" $result.pass $result.detail))
}

if (Test-Path $llmProviderPath) {
  $llmProvider = Get-Content $llmProviderPath -Raw
  $checks.Add((New-Check "LLMProvider routes prompts through Agent Lee" ($llmProvider -match "buildModelPromptThroughAgentLee") $llmProviderPath))
}

if (Test-Path $imageToolPath) {
  $imageTool = Get-Content $imageToolPath -Raw
  $checks.Add((New-Check "Image tool routes prompts through Agent Lee" ($imageTool -match "buildModelPromptThroughAgentLee") $imageToolPath))
}

if (Test-Path $pluginRouterPath) {
  $pluginRouter = Get-Content $pluginRouterPath -Raw
  $checks.Add((New-Check "Plugin results route back through Agent Lee" ($pluginRouter -match "formatAgentRoutedMessage" -and $pluginRouter -match "recordAgentLeeRuntimeReceipt") $pluginRouterPath))
}

$governanceLoaderPath = Join-Path $resolvedExtensionDir "src\core\governance-loader.ts"
if (Test-Path $governanceLoaderPath) {
  $governanceLoader = Get-Content $governanceLoaderPath -Raw
  $checks.Add((New-Check "Governance loader uses standalone connectivity loader" ($governanceLoader -match "leeway-connectivity-loader") $governanceLoaderPath))
}

$runtimeFilesToScan = @(
  (Join-Path $resolvedExtensionDir "src"),
  (Join-Path $resolvedWorkspace "agent-lee\voice\voice-runtime.json"),
  (Join-Path $resolvedExtensionDir "package.json")
)
$externalPathHits = @()
foreach ($target in $runtimeFilesToScan) {
  if (-not (Test-Path $target)) { continue }
  if ((Get-Item $target).PSIsContainer) {
    $hits = Get-ChildItem $target -Recurse -File | Select-String -Pattern "LeeWay-Standards|\.leeway-vscode\\LeeWay-Standards|\.leeway-vscode/LeeWay-Standards" | Where-Object {
       $_.Path -notmatch "leeway-standards-canon\.json" -and 
       $_.Path -notmatch "leeway-standards-button\.png" -and
       $_.Line -notmatch "leeway-standards-button\.png" -and
       $_.Line -notmatch "path\.join\(paths\.standards" -and
       $_.Line -notmatch "getInternalStandardsRoot"
    }
    if ($hits) { $externalPathHits += $hits }
  } else {
    $content = Get-Content $target -Raw
    if ($content -match "LeeWay-Standards" -and $target -notmatch "leeway-standards-canon\.json" -and $target -notmatch "leeway-standards-button\.png") {
       $hits = $content | Select-String -Pattern "LeeWay-Standards" -AllMatches | Where-Object {
          $_.Line -notmatch "leeway-standards-button\.png" -and
          $_.Line -notmatch "path\.join\(paths\.standards" -and
          $_.Line -notmatch "getInternalStandardsRoot"
       }
       if ($hits) { $externalPathHits += $hits }
    }
  }
}
$checks.Add((New-Check "No runtime dependency on external LeeWay-Standards remains" ($externalPathHits.Count -eq 0) (($externalPathHits -join "; "))))

$compliance = Test-LeeWayCompliance -Root $resolvedWorkspace -AllLocalFiles:$AllLocalFiles
$checks.Add((New-Check "LeeWay aggregate compliance reported" $true "Score: $($compliance.score)"))
$checks.Add((New-Check "LeeWay blocking file count is zero" (-not $compliance.blocking) "Blocking files: $(@($compliance.blockingFiles).Count)"))

$report = [pscustomobject]@{
  generatedAt = (Get-Date).ToString("o")
  workspaceDir = $resolvedWorkspace
  extensionDir = $resolvedExtensionDir
  vsixPath = $vsixPath
  checks = $checks
  leewayCompliance = $compliance
}

$jsonPath = Join-Path $OutputDir "agent-lee-doctor.json"
$mdPath = Join-Path $OutputDir "AGENT_LEE_DOCTOR.md"
$report | ConvertTo-Json -Depth 8 | Out-File $jsonPath -Encoding utf8

$failed = @($checks | Where-Object { -not $_.pass })
$lines = @(
  "# Agent Lee Doctor Report",
  "",
  "- Generated: $($report.generatedAt)",
  "- Extension: ``$resolvedExtensionDir``",
  "- VSIX: ``$vsixPath``",
  "- Failed checks: $($failed.Count)",
  "- LeeWay compliance: $($compliance.score)%",
  "- LeeWay blocking file count: $(@($compliance.blockingFiles).Count)",
  "",
  "## Checks"
)

foreach ($check in $checks) {
  $status = if ($check.pass) { "PASS" } else { "FAIL" }
  $lines += "- [$status] $($check.name) $($check.detail)"
}

$lines += @(
  "",
  "## Compliance",
  "",
  "Inspected $($compliance.inspected) files; $($compliance.compliant) are fully marked with header, region, tag, and discovery pipeline.",
  "Aggregate compliance percentage: $($compliance.score)%",
  "Blocking files: $(@($compliance.blockingFiles).Count)"
)

if (@($compliance.blockingFiles).Count -gt 0) {
  $lines += ""
  $lines += "## Blocking Compliance Files"
  foreach ($item in @($compliance.blockingFiles | Select-Object -First 50)) {
    $missingBits = @()
    if (-not $item.header) { $missingBits += "LEEWAY_HEADER" }
    if (-not $item.region) { $missingBits += "REGION" }
    if (-not $item.tag) { $missingBits += "TAG" }
    if (-not $item.discoveryPipeline) { $missingBits += "DISCOVERY_PIPELINE" }
    $lines += "- $($item.path): missing $($missingBits -join ', ')"
  }
}

if ($failed.Count -gt 0) {
  $lines += ""
  $lines += "## Blocking Items"
  foreach ($item in $failed) {
    $lines += "- $($item.name): $($item.detail)"
  }
}

$lines | Out-File $mdPath -Encoding utf8

Write-Host "Doctor report written to $mdPath" -ForegroundColor Green
$report

<#
DISCOVERY_PIPELINE:
Voice → Intent → Location → Vertical → Ranking → Render
#>
