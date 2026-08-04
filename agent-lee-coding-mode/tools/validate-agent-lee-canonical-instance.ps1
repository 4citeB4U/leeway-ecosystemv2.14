$ErrorActionPreference = 'Stop'

function Resolve-WorkspaceRoot {
  Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
}

function Read-JsonFile {
  param([Parameter(Mandatory = $true)][string]$Path)
  if (!(Test-Path -LiteralPath $Path)) { return $null }
  try {
    return (Get-Content -LiteralPath $Path -Raw) | ConvertFrom-Json
  } catch {
    return $null
  }
}

function Test-DirectSkillFile {
  param([Parameter(Mandatory = $true)][string]$Root)
  $skillMd = Join-Path $Root 'SKILL.md'
  return (Test-Path -LiteralPath $skillMd)
}

$WorkspaceRoot = Resolve-WorkspaceRoot
$ExpectedFingerprint = 'leeway.agent-lee.code-mode.canonical.supreme-agent-lead.v1'
$RuntimeFabricRoot = Join-Path $WorkspaceRoot 'Leeway Runtime Fabric'
$IdentityManifestPath = Join-Path $WorkspaceRoot 'agent-lee-coding-mode\agent-lee-identity.manifest.json'
$UniverseManifestPath = Join-Path $RuntimeFabricRoot 'capability-registry\registry\leeway-universe.manifest.json'
$VscodeSettingsPath = Join-Path $WorkspaceRoot '.vscode\settings.json'
$CodeModeSettingsPath = Join-Path $WorkspaceRoot 'agent-lee-coding-mode\.vscode\settings.json'
$UserSettingsPath = Join-Path $WorkspaceRoot '.leeway-vscode\devhost-user-data\User\settings.json'
$ByokCandidatePath = Join-Path $WorkspaceRoot '.vscode\agent-lee-byok-candidate-settings.json'
$ValidationProofPath = Join-Path $WorkspaceRoot 'agent-lee-coding-mode\tools\prove-agent-lee-same-instance.ps1'
$VscodeValidatorPath = Join-Path $WorkspaceRoot 'agent-lee-coding-mode\tools\validate-agent-lee-vscode-chat.ps1'
$RuntimeFabricHarnessRoot = Join-Path $RuntimeFabricRoot 'stateful-research-harness'
$RuntimeFabricHarnessMirrorRoot = Join-Path $RuntimeFabricRoot 'skills\stateful-research-harness'
$CodeModeHarnessRoot = Join-Path $WorkspaceRoot 'agent-lee-coding-mode\skills\stateful-research-harness'

$Identity = Read-JsonFile -Path $IdentityManifestPath
$Universe = Read-JsonFile -Path $UniverseManifestPath
$VscodeSettings = Read-JsonFile -Path $VscodeSettingsPath
$CodeModeSettings = Read-JsonFile -Path $CodeModeSettingsPath
$UserSettings = Read-JsonFile -Path $UserSettingsPath
$ByokCandidate = Read-JsonFile -Path $ByokCandidatePath

$StaticChecks = [ordered]@{
  canonicalAgentLeeRootExists = (Test-Path -LiteralPath (Join-Path $WorkspaceRoot 'agent-lee-coding-mode'))
  identityManifestExists = (Test-Path -LiteralPath $IdentityManifestPath)
  universeManifestExists = (Test-Path -LiteralPath $UniverseManifestPath)
  runtimeFabricRootExists = (Test-Path -LiteralPath $RuntimeFabricRoot)
  codeModeSettingsFingerprint = $CodeModeSettings.'agentLeeCodingMode.identityFingerprint'
  userSettingsFingerprint = $UserSettings.'agentLeeCodingMode.identityFingerprint'
  vscodeSettingsFingerprint = $VscodeSettings.'leeway.agentLee.byok'.identityFingerprint
  byokCandidateFingerprint = $ByokCandidate.identityFingerprint
  proofScriptExists = (Test-Path -LiteralPath $ValidationProofPath)
  vscodeValidatorExists = (Test-Path -LiteralPath $VscodeValidatorPath)
  runtimeFabricHarnessVisible = (Test-Path -LiteralPath $RuntimeFabricHarnessRoot) -and (Test-Path -LiteralPath $RuntimeFabricHarnessMirrorRoot)
  codeModeHarnessVisible = (Test-Path -LiteralPath $CodeModeHarnessRoot)
  runtimeFabricHarnessSkillMd = Test-DirectSkillFile -Root $RuntimeFabricHarnessRoot
  runtimeFabricHarnessMirrorSkillMd = Test-DirectSkillFile -Root $RuntimeFabricHarnessMirrorRoot
  codeModeHarnessSkillMd = Test-DirectSkillFile -Root $CodeModeHarnessRoot
  codeModeHarnessAgentsYaml = (Test-Path -LiteralPath (Join-Path $CodeModeHarnessRoot 'agents\openai.yaml'))
  runtimeFabricHarnessAgentsYaml = (Test-Path -LiteralPath (Join-Path $RuntimeFabricHarnessRoot 'agents\openai.yaml'))
  identityFingerprintMatches = ($Identity.identityFingerprint -eq $ExpectedFingerprint)
  universeFingerprintMatches = ($Universe.canonicalAgentLee.identityFingerprint -eq $ExpectedFingerprint)
  identityManifestCanonical = ($Identity.agent_name -eq 'Agent Lee' -and $Identity.agent_mode -eq 'code-mode' -and $Identity.canonical -eq $true -and $Identity.role -eq 'supreme-agent-lead' -and $Identity.instance_contract -eq 'canonical-agent-lee-code-mode')
  universeCanonical = ($Universe.canonicalAgentLee.canonical -eq $true -and $Universe.canonicalAgentLee.agentMode -eq 'code-mode' -and $Universe.canonicalAgentLee.role -eq 'supreme-agent-lead')
}

$StaticPass =
  $StaticChecks.canonicalAgentLeeRootExists -and
  $StaticChecks.identityManifestExists -and
  $StaticChecks.universeManifestExists -and
  $StaticChecks.runtimeFabricRootExists -and
  $StaticChecks.runtimeFabricHarnessVisible -and
  $StaticChecks.codeModeHarnessVisible -and
  $StaticChecks.runtimeFabricHarnessSkillMd -and
  $StaticChecks.runtimeFabricHarnessMirrorSkillMd -and
  $StaticChecks.codeModeHarnessSkillMd -and
  $StaticChecks.identityFingerprintMatches -and
  $StaticChecks.universeFingerprintMatches -and
  $StaticChecks.identityManifestCanonical -and
  $StaticChecks.universeCanonical -and
  $StaticChecks.proofScriptExists

$Report = [ordered]@{
  status = 'PASS'
  expectedFingerprint = $ExpectedFingerprint
  staticChecks = $StaticChecks
  proofScript = $ValidationProofPath
  vscodeValidator = $VscodeValidatorPath
  recommendedFixes = @(
    'Keep the canonical fingerprint mirrored across identity and universe manifests.',
    'Keep the runtime-fabric and code-mode stateful-research-harness copies on direct SKILL.md paths.',
    'Use the proof script to validate live runtime surfaces after any identity change.'
  )
}

if (-not $StaticPass) {
  $Report.status = 'FAIL'
}

Write-Host "Static canonical-instance checks: $($Report.status)"
Write-Host ($Report | ConvertTo-Json -Depth 8)

if (Test-Path -LiteralPath $ValidationProofPath) {
  & $ValidationProofPath
  if ($LASTEXITCODE -ne 0) {
    $Report.status = 'FAIL'
    Write-Host 'Live proof failed.' -ForegroundColor Red
    exit 1
  }
}

if ($Report.status -ne 'PASS') {
  Write-Host 'FAIL: canonical Agent Lee instance validation failed.' -ForegroundColor Red
  exit 1
}

Write-Host 'PASS: canonical Agent Lee instance validation succeeded.' -ForegroundColor Green
exit 0
