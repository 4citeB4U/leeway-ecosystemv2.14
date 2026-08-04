<#
LEEWAY_HEADER - DO NOT REMOVE

REGION: CORE
TAG: CORE.GOVERNANCE.APPLICATION.CONSTRUCTION_LAW_GATE
PURPOSE: Verifies that LeeWay construction law exists at the skill, repo law, instruction, and integrity-gate layers.
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
#>

param(
  [string]$ExtensionDir = (Join-Path $PSScriptRoot ".."),
  [string]$WorkspaceRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..")).Path,
  [string]$EvidencePath
)

$ErrorActionPreference = "Stop"

function New-ConstructionLawCheck {
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

  if (-not (Test-Path -LiteralPath $Path)) {
    return $null
  }

  try {
    return Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
  } catch {
    return $null
  }
}

function Get-IdentityGraphData {
  param([string]$ExtensionRoot)

  $compiledModulePath = Join-Path $ExtensionRoot "out\leeway-application\leewayApplicationIdentityGraph.js"
  if (-not (Test-Path -LiteralPath $compiledModulePath)) {
    throw "Compiled identity graph module not found: $compiledModulePath"
  }

  $nodeScript = @"
const mod = require(process.argv[1]);
process.stdout.write(JSON.stringify({
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

function Get-IdentityMeshData {
  param([string]$ExtensionRoot)

  $compiledModulePath = Join-Path $ExtensionRoot "out\leeway-application\leewayIdentityMesh.js"
  if (-not (Test-Path -LiteralPath $compiledModulePath)) {
    throw "Compiled identity mesh module not found: $compiledModulePath"
  }

  $nodeScript = @"
const mod = require(process.argv[1]);
process.stdout.write(JSON.stringify({
  families: mod.LEEWAY_ID_FAMILIES,
  sovereignLayers: mod.LEEWAY_SOVEREIGN_LAYER_ANATOMY,
  records: mod.LEEWAY_IDENTITY_MESH_RECORDS
}));
"@

  $json = & node.exe -e $nodeScript $compiledModulePath
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to read compiled identity mesh module."
  }

  return ($json | ConvertFrom-Json)
}

function Expand-ZipForValidation {
  param(
    [string]$ZipPath,
    [string]$DestinationRoot
  )

  if (Test-Path -LiteralPath $DestinationRoot) {
    Remove-Item -LiteralPath $DestinationRoot -Recurse -Force
  }

  New-Item -ItemType Directory -Force -Path $DestinationRoot | Out-Null
  Expand-Archive -LiteralPath $ZipPath -DestinationPath $DestinationRoot -Force
}

function Invoke-SmokeCommand {
  param(
    [string]$Name,
    [string]$FilePath,
    [string[]]$ArgumentList,
    [string]$WorkingDirectory
  )

  $stdoutPath = [System.IO.Path]::GetTempFileName()
  $stderrPath = [System.IO.Path]::GetTempFileName()
  $outputLines = New-Object System.Collections.Generic.List[string]
  $exitCode = 0

  try {
    $process = Start-Process `
      -FilePath $FilePath `
      -ArgumentList $ArgumentList `
      -WorkingDirectory $WorkingDirectory `
      -RedirectStandardOutput $stdoutPath `
      -RedirectStandardError $stderrPath `
      -Wait `
      -PassThru `
      -NoNewWindow
    $exitCode = [int]$process.ExitCode
    foreach ($path in @($stdoutPath, $stderrPath)) {
      if (Test-Path -LiteralPath $path) {
        foreach ($line in @(Get-Content -LiteralPath $path -ErrorAction SilentlyContinue)) {
          $outputLines.Add([string]$line)
        }
      }
    }
  } catch {
    $exitCode = 1
    $outputLines.Add($_.Exception.Message)
  } finally {
    foreach ($path in @($stdoutPath, $stderrPath)) {
      if (Test-Path -LiteralPath $path) {
        Remove-Item -LiteralPath $path -Force -ErrorAction SilentlyContinue
      }
    }
  }

  [pscustomobject]@{
    name = $Name
    exitCode = $exitCode
    passed = ($exitCode -eq 0)
    output = @($outputLines)
  }
}

$resolvedExtensionDir = (Resolve-Path $ExtensionDir).Path
$resolvedWorkspaceRoot = (Resolve-Path $WorkspaceRoot).Path
$resultPath = if ($EvidencePath) {
  $EvidencePath
} else {
  Join-Path $resolvedExtensionDir "test-evidence\leeway-construction-law-result.json"
}
$smokeResultPath = Join-Path $resolvedExtensionDir "test-evidence\leeway-construction-law-skill-smoke-test.json"
$identityGraphResultPath = Join-Path $resolvedExtensionDir "test-evidence\leeway-application-identity-graph-result.json"
$integrityGateScriptPath = Join-Path $resolvedExtensionDir "scripts\Invoke-LeeWayApplicationIntegrityGate.ps1"
$packageJsonPath = Join-Path $resolvedExtensionDir "package.json"
$skillRoot = if ($env:CODEX_HOME) {
  Join-Path $env:CODEX_HOME "skills\leeway-application-standards"
} else {
  Join-Path $env:USERPROFILE ".codex\skills\leeway-application-standards"
}
$skillZipPath = Join-Path $resolvedWorkspaceRoot "skill.zip"

New-Item -ItemType Directory -Force -Path (Split-Path -Parent $resultPath) | Out-Null

$requiredSkillFiles = @(
  "SKILL.md",
  "agents/openai.yaml",
  "references/leeway-application-integrity-gate-standard.md",
  "references/leeway-agent-learned-behavior.md",
  "references/leeway-identity-mesh-standard.md",
  "references/leeway-tracer-pack-standard.md",
  "references/leeway-creation-law.md",
  "references/leeway-identity-graph-standard.md",
  "references/leeway-naming-taxonomy.md",
  "references/leeway-production-cleanse-standard.md",
  "references/leeway-self-healing-repair-flow.md",
  "scripts/classify_leeway_files.py",
  "scripts/detect_duplicate_pipelines.py",
  "scripts/detect_orphan_commands.py",
  "scripts/validate_leeway_identity_graph.py"
)

$requiredRepoLawFiles = @(
  "agent-lee/governance/law/leeway-application-construction-law.md",
  "agent-lee/governance/law/leeway-identity-graph-law.md",
  "agent-lee/governance/law/leeway-production-cleanse-law.md",
  "agent-lee/governance/law/leeway-self-healing-repair-law.md",
  "agent-lee/governance/law/leeway-agent-code-generation-law.md",
  "agent-lee/governance/law/leeway-identity-pulse-law.md",
  "agent-lee/governance/law/leeway-identity-mesh-law.md",
  "agent-lee/governance/law/leeway-prompt-transaction-law.md",
  "agent-lee/governance/law/leeway-actor-authority-law.md",
  "agent-lee/governance/law/leeway-tracer-pack-law.md"
)

$instructionFiles = @(
  "AGENTS.md",
  ".codex/instructions.md"
)

$requiredConstructionNodeIds = @(
  "LEEWAY_APP::GOVERNANCE::CONSTRUCTION_LAW::APPLICATION_STANDARDS_SKILL",
  "LEEWAY_APP::GOVERNANCE::CONSTRUCTION_LAW::LEARNED_BEHAVIOR_ENFORCEMENT",
  "LEEWAY_APP::GOVERNANCE::IDENTITY_MESH::REGISTRY",
  "LEEWAY_APP::GOVERNANCE::TRACER_PACK::ROOT",
  "LEEWAY_APP::GATE::CONSTRUCTION_LAW",
  "LEEWAY_APP::GATE::IDENTITY_MESH",
  "LEEWAY_APP::GATE::TRACER_PACK",
  "LEEWAY_APP::AGENT::CODE_GENERATION::CODEX",
  "LEEWAY_APP::AGENT::CODE_GENERATION::CHATGPT",
  "LEEWAY_APP::AGENT::CODE_GENERATION::AUTOCOMPLETE",
  "LEEWAY_APP::AGENT::CODE_GENERATION::MCP_AGENT",
  "LEEWAY_APP::AGENT::CODE_GENERATION::LOCAL_MODEL_HIVE",
  "LEEWAY_APP::AGENT::CODE_GENERATION::ENGINEERING_LOOP"
)

$repoLearnedBehaviorReference = "references/leeway-agent-learned-behavior.md"

$checks = New-Object System.Collections.Generic.List[object]

$skillMissing = New-Object System.Collections.Generic.List[string]
foreach ($relativePath in $requiredSkillFiles) {
  $absolutePath = Join-Path $skillRoot $relativePath
  if (-not (Test-Path -LiteralPath $absolutePath)) {
    $skillMissing.Add($relativePath)
  }
}
$checks.Add((New-ConstructionLawCheck -Name "leeway application standards skill exists" -Pass ((Test-Path -LiteralPath $skillRoot) -and $skillMissing.Count -eq 0) -Detail ("Missing skill files: " + $skillMissing.Count) -EvidencePath $skillRoot))

$zipValidationRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("leeway-skill-validate-" + [guid]::NewGuid().ToString("N"))
$zipEntriesMissing = New-Object System.Collections.Generic.List[string]
try {
  if (Test-Path -LiteralPath $skillZipPath) {
    Expand-ZipForValidation -ZipPath $skillZipPath -DestinationRoot $zipValidationRoot
    foreach ($relativePath in $requiredSkillFiles) {
      $entryPath = Join-Path $zipValidationRoot $relativePath
      if (-not (Test-Path -LiteralPath $entryPath)) {
        $zipEntriesMissing.Add($relativePath)
      }
    }
  } else {
    foreach ($relativePath in $requiredSkillFiles) {
      $zipEntriesMissing.Add($relativePath)
    }
  }
} finally {
  if (Test-Path -LiteralPath $zipValidationRoot) {
    Remove-Item -LiteralPath $zipValidationRoot -Recurse -Force -ErrorAction SilentlyContinue
  }
}
$checks.Add((New-ConstructionLawCheck -Name "skill package exists and validates" -Pass ((Test-Path -LiteralPath $skillZipPath) -and $zipEntriesMissing.Count -eq 0) -Detail ("Missing zip entries: " + $zipEntriesMissing.Count) -EvidencePath $skillZipPath))

$graphData = Get-IdentityGraphData -ExtensionRoot $resolvedExtensionDir
$graphNodeIds = @($graphData.nodes | ForEach-Object { $_.id })
$missingConstructionNodes = @($requiredConstructionNodeIds | Where-Object { $_ -notin $graphNodeIds })
$checks.Add((New-ConstructionLawCheck -Name "construction law surfaces are registered in the identity graph" -Pass ($missingConstructionNodes.Count -eq 0) -Detail ("Missing nodes: " + $missingConstructionNodes.Count) -EvidencePath $identityGraphResultPath))

$meshData = Get-IdentityMeshData -ExtensionRoot $resolvedExtensionDir
$meshRecordIds = @($meshData.records | ForEach-Object { $_.id })
$sovereignLayers = @($meshData.sovereignLayers)
$emptySovereignLayers = @($sovereignLayers | Where-Object { [string]::IsNullOrWhiteSpace([string]$_.layerId) -or @($_.subIds).Count -eq 0 })
$missingSovereignSubIds = New-Object System.Collections.Generic.List[string]
foreach ($layer in $sovereignLayers) {
  foreach ($subId in @($layer.subIds)) {
    if ($subId -notin $meshRecordIds) {
      $missingSovereignSubIds.Add([string]$subId)
    }
  }
}
$sovereignAnatomyPass = ($sovereignLayers.Count -eq 8) -and ($emptySovereignLayers.Count -eq 0) -and ($missingSovereignSubIds.Count -eq 0)
$checks.Add((New-ConstructionLawCheck -Name "eight sovereign enforcement layers have sub-ID anatomy" -Pass $sovereignAnatomyPass -Detail ("Layers: $($sovereignLayers.Count); Empty layers: $($emptySovereignLayers.Count); Missing sub-ID records: $($missingSovereignSubIds.Count)") -EvidencePath (Join-Path $resolvedExtensionDir "test-evidence\leeway-identity-mesh-result.json")))

$missingLawFiles = New-Object System.Collections.Generic.List[string]
foreach ($relativePath in $requiredRepoLawFiles) {
  $absolutePath = Join-Path $resolvedWorkspaceRoot $relativePath
  if (-not (Test-Path -LiteralPath $absolutePath)) {
    $missingLawFiles.Add($relativePath)
  }
}
$checks.Add((New-ConstructionLawCheck -Name "repo governance law mirrors exist" -Pass ($missingLawFiles.Count -eq 0) -Detail ("Missing repo law files: " + $missingLawFiles.Count)))

$skillDefinitionPath = Join-Path $skillRoot "SKILL.md"
$skillDefinitionContent = if (Test-Path -LiteralPath $skillDefinitionPath) {
  Get-Content -LiteralPath $skillDefinitionPath -Raw
} else {
  ""
}
$skillLearnedBehaviorPass = (
  $skillDefinitionContent -match "apply this skill before proposing code"
) -and (
  $skillDefinitionContent -match "references/leeway-agent-learned-behavior\.md"
) -and (
  $skillDefinitionContent -match "references/leeway-identity-mesh-standard\.md"
) -and (
  $skillDefinitionContent -match "references/leeway-tracer-pack-standard\.md"
)
$checks.Add((New-ConstructionLawCheck -Name "SKILL.md references learned behavior before implementation" -Pass $skillLearnedBehaviorPass -Detail "Skill must require pre-code LeeWay behavior and reference the learned-behavior document." -EvidencePath $skillDefinitionPath))

$repoLearnedBehaviorPath = Join-Path $resolvedWorkspaceRoot $repoLearnedBehaviorReference
$repoLearnedBehaviorPass = Test-Path -LiteralPath $repoLearnedBehaviorPath
$checks.Add((New-ConstructionLawCheck -Name "learned behavior reference exists" -Pass $repoLearnedBehaviorPass -Detail $repoLearnedBehaviorReference -EvidencePath $repoLearnedBehaviorPath))

$repoLawPath = Join-Path $resolvedWorkspaceRoot "agent-lee/governance/law/leeway-agent-code-generation-law.md"
$repoLawContent = if (Test-Path -LiteralPath $repoLawPath) {
  Get-Content -LiteralPath $repoLawPath -Raw
} else {
  ""
}
$repoLawLearnedBehaviorPass = (
  $repoLawContent -match "## Learned Construction Behavior"
) -and (
  $repoLawContent -match "begin from LeeWay identity"
)
$checks.Add((New-ConstructionLawCheck -Name "repo law contains learned construction behavior" -Pass $repoLawLearnedBehaviorPass -Detail "Repo law must bind code-writing agents to LeeWay identity from creation time." -EvidencePath $repoLawPath))

$instructionMissing = New-Object System.Collections.Generic.List[string]
foreach ($relativePath in $instructionFiles) {
  $absolutePath = Join-Path $resolvedWorkspaceRoot $relativePath
  if (-not (Test-Path -LiteralPath $absolutePath)) {
    $instructionMissing.Add($relativePath)
    continue
  }
  $content = Get-Content -LiteralPath $absolutePath -Raw
  $hasConstructionReference = ($content -match "LeeWay Application Standards") -and ($content -match "LeeWay construction law")
  $hasPrecondition = $content -match "Before writing code in this repository, identify the LeeWay node, pipeline, classification, owner, and verification path"
  if (-not ($hasConstructionReference -and $hasPrecondition)) {
    $instructionMissing.Add($relativePath)
  }
}
$checks.Add((New-ConstructionLawCheck -Name "instruction surfaces contain LeeWay construction precondition" -Pass ($instructionMissing.Count -eq 0) -Detail ("Missing or incomplete instruction files: " + $instructionMissing.Count)))

$identityGraphResult = Get-JsonFileSafely -Path $identityGraphResultPath
$identityGraphPass = $false
$identityGraphDetail = "Identity graph result not found."
if ($identityGraphResult) {
  $identityGraphPass = [bool]$identityGraphResult.passed
  $identityGraphDetail = "Failed checks: $($identityGraphResult.summary.failedChecks); Registered nodes: $($identityGraphResult.summary.registeredNodes)"
}
$checks.Add((New-ConstructionLawCheck -Name "identity graph gate remains green for construction law binding" -Pass $identityGraphPass -Detail $identityGraphDetail -EvidencePath $identityGraphResultPath))

$integrityScriptContent = Get-Content -LiteralPath $integrityGateScriptPath -Raw
$packageJsonContent = Get-Content -LiteralPath $packageJsonPath -Raw
$integrityWiringPass = ($integrityScriptContent -match "Invoke-LeeWayConstructionLawGate\.ps1") -and ($packageJsonContent -match "LEEWAY_CONSTRUCTION_LAW_GATE")
$checks.Add((New-ConstructionLawCheck -Name "integrity surfaces include the construction law gate" -Pass $integrityWiringPass -Detail "Integrity script and package.json must both reference the construction law gate."))

$smokeTempDir = Join-Path ([System.IO.Path]::GetTempPath()) ("leeway-construction-law-smoke-" + [guid]::NewGuid().ToString("N"))
$smokeInventoryPath = Join-Path $smokeTempDir "leeway-full-file-inventory.txt"
New-Item -ItemType Directory -Force -Path $smokeTempDir | Out-Null

try {
  & git.exe -C $resolvedWorkspaceRoot ls-files | Out-File -LiteralPath $smokeInventoryPath -Encoding utf8

  $smokeRuns = @(
    (Invoke-SmokeCommand -Name "validate_leeway_identity_graph.py" -FilePath "python" -ArgumentList @(
      (Join-Path $skillRoot "scripts\validate_leeway_identity_graph.py"),
      "--graph", $identityGraphResultPath,
      "--min-nodes", "10",
      "--min-files", "10"
    ) -WorkingDirectory $resolvedWorkspaceRoot),
    (Invoke-SmokeCommand -Name "classify_leeway_files.py" -FilePath "python" -ArgumentList @(
      (Join-Path $skillRoot "scripts\classify_leeway_files.py"),
      "--input", $smokeInventoryPath
    ) -WorkingDirectory $resolvedWorkspaceRoot),
    (Invoke-SmokeCommand -Name "detect_duplicate_pipelines.py" -FilePath "python" -ArgumentList @(
      (Join-Path $skillRoot "scripts\detect_duplicate_pipelines.py"),
      "--input", $smokeInventoryPath
    ) -WorkingDirectory $resolvedWorkspaceRoot),
    (Invoke-SmokeCommand -Name "detect_orphan_commands.py" -FilePath "python" -ArgumentList @(
      (Join-Path $skillRoot "scripts\detect_orphan_commands.py"),
      "--package", $packageJsonPath,
      "--src", (Join-Path $resolvedExtensionDir "src"),
      "--graph", $identityGraphResultPath
    ) -WorkingDirectory $resolvedWorkspaceRoot)
  )
} finally {
  if (Test-Path -LiteralPath $smokeTempDir) {
    Remove-Item -LiteralPath $smokeTempDir -Recurse -Force -ErrorAction SilentlyContinue
  }
}

$smokeReport = [pscustomobject]@{
  generatedAt = (Get-Date).ToString("o")
  skillRoot = $skillRoot
  skillZip = $skillZipPath
  runs = $smokeRuns
  passed = (@($smokeRuns | Where-Object { -not $_.passed }).Count -eq 0)
}
$smokeReport | ConvertTo-Json -Depth 8 | Out-File -LiteralPath $smokeResultPath -Encoding utf8
$checks.Add((New-ConstructionLawCheck -Name "construction law skill smoke tests pass" -Pass $smokeReport.passed -Detail ("Failed smoke tests: " + @($smokeRuns | Where-Object { -not $_.passed }).Count) -EvidencePath $smokeResultPath))

$failedChecks = @($checks | Where-Object { -not $_.pass })
$result = [pscustomobject]@{
  gate = "LEEWAY_CONSTRUCTION_LAW_GATE"
  generatedAt = (Get-Date).ToString("o")
  workspaceRoot = $resolvedWorkspaceRoot
  extensionDir = $resolvedExtensionDir
  skillRoot = $skillRoot
  skillZip = $skillZipPath
  passed = ($failedChecks.Count -eq 0)
  summary = [pscustomobject]@{
    totalChecks = $checks.Count
    failedChecks = $failedChecks.Count
  }
  checks = $checks
  smokeTests = $smokeReport
}

$result | ConvertTo-Json -Depth 10 | Out-File -LiteralPath $resultPath -Encoding utf8
Write-Host "Construction law result written to $resultPath" -ForegroundColor Green

if (-not $result.passed) {
  exit 1
}
