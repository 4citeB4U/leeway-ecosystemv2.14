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

function Add-PropertyValue {
  param(
    [Parameter(Mandatory = $true)]$Target,
    [string[]]$Names
  )

  foreach ($name in $Names) {
    if ($null -ne $Target -and $Target.PSObject.Properties.Name -contains $name) {
      $value = $Target.$name
      if ($null -ne $value -and $value -ne '') {
        return $value
      }
    }
  }

  return $null
}

function Get-Sources {
  param([Parameter(Mandatory = $true)]$Payload)

  $sources = @()
  if ($null -ne $Payload) { $sources += $Payload }
  if ($Payload -and $Payload.PSObject.Properties.Name -contains 'canonicalProof' -and $Payload.canonicalProof) { $sources += $Payload.canonicalProof }
  if ($Payload -and $Payload.PSObject.Properties.Name -contains 'agentLeeCanonical' -and $Payload.agentLeeCanonical) { $sources += $Payload.agentLeeCanonical }
  if ($Payload -and $Payload.PSObject.Properties.Name -contains 'canonicalAgentLee' -and $Payload.canonicalAgentLee) { $sources += $Payload.canonicalAgentLee }
  if ($Payload -and $Payload.PSObject.Properties.Name -contains 'coreMap' -and $Payload.coreMap) {
    $sources += $Payload.coreMap
    if ($Payload.coreMap.PSObject.Properties.Name -contains 'canonicalProof' -and $Payload.coreMap.canonicalProof) { $sources += $Payload.coreMap.canonicalProof }
    if ($Payload.coreMap.PSObject.Properties.Name -contains 'canonicalAgentLee' -and $Payload.coreMap.canonicalAgentLee) { $sources += $Payload.coreMap.canonicalAgentLee }
  }
  if ($Payload -and $Payload.PSObject.Properties.Name -contains 'universe' -and $Payload.universe) {
    $sources += $Payload.universe
    if ($Payload.universe.PSObject.Properties.Name -contains 'canonicalAgentLee' -and $Payload.universe.canonicalAgentLee) { $sources += $Payload.universe.canonicalAgentLee }
  }
  if ($Payload -and $Payload.PSObject.Properties.Name -contains 'manifest' -and $Payload.manifest) {
    $sources += $Payload.manifest
    if ($Payload.manifest.PSObject.Properties.Name -contains 'canonicalAgentLee' -and $Payload.manifest.canonicalAgentLee) { $sources += $Payload.manifest.canonicalAgentLee }
  }
  return $sources
}

function Get-CanonicalSummary {
  param([Parameter(Mandatory = $true)]$Payload)

  $sources = Get-Sources -Payload $Payload
  $fingerprint = $null
  foreach ($source in $sources) {
    $candidate = Add-PropertyValue -Target $source -Names @('identityFingerprint', 'expectedIdentityFingerprint', 'expectedFingerprint')
    if ($candidate) { $fingerprint = $candidate; break }
  }

  $canonical = $false
  foreach ($source in $sources) {
    $candidate = Add-PropertyValue -Target $source -Names @('canonical')
    if ($null -ne $candidate) { $canonical = [bool]$candidate; break }
  }

  $agentMode = $null
  foreach ($source in $sources) {
    $candidate = Add-PropertyValue -Target $source -Names @('agent_mode', 'agentMode')
    if ($candidate) { $agentMode = $candidate; break }
  }

  $role = $null
  foreach ($source in $sources) {
    $candidate = Add-PropertyValue -Target $source -Names @('role')
    if ($candidate) { $role = $candidate; break }
  }

  $instanceContract = $null
  foreach ($source in $sources) {
    $candidate = Add-PropertyValue -Target $source -Names @('instance_contract', 'instanceContract')
    if ($candidate) { $instanceContract = $candidate; break }
  }

  $expected = 'leeway.agent-lee.code-mode.canonical.supreme-agent-lead.v1'
  return [ordered]@{
    identityFingerprint = $fingerprint
    fingerprintMatches = ($fingerprint -eq $expected)
    canonical = $canonical
    agentMode = $agentMode
    role = $role
    instanceContract = $instanceContract
    expectedFingerprint = $expected
    universeVisible = Test-UniverseVisible -Payload $Payload
  }
}

function Get-UniverseManifest {
  param([Parameter(Mandatory = $true)]$Payload)

  if ($Payload -and $Payload.PSObject.Properties.Name -contains 'manifest' -and $Payload.manifest) {
    return $Payload.manifest
  }

  if ($Payload -and $Payload.PSObject.Properties.Name -contains 'universe' -and $Payload.universe) {
    if ($Payload.universe.PSObject.Properties.Name -contains 'manifest' -and $Payload.universe.manifest) {
      return $Payload.universe.manifest
    }
    return $Payload.universe
  }

  if ($Payload -and $Payload.PSObject.Properties.Name -contains 'coreMap' -and $Payload.coreMap) {
    if ($Payload.coreMap.PSObject.Properties.Name -contains 'universe' -and $Payload.coreMap.universe -and $Payload.coreMap.universe.PSObject.Properties.Name -contains 'manifest' -and $Payload.coreMap.universe.manifest) {
      return $Payload.coreMap.universe.manifest
    }

    return [ordered]@{
      searchPaths = [ordered]@{
        skills = $Payload.coreMap.activeSkillSearchPaths
        capabilities = $Payload.coreMap.activeCapabilitySearchPaths
        agents = $Payload.coreMap.activeAgentSearchPaths
        tools = $Payload.coreMap.activeToolSearchPaths
        workflows = $Payload.coreMap.activeWorkflowSearchPaths
        benchmarks = $Payload.coreMap.activeBenchmarkSearchPaths
      }
      statefulResearchHarness = $Payload.coreMap.statefulResearchHarnessCopies
    }
  }

  return $null
}

function Test-UniverseVisible {
  param([Parameter(Mandatory = $true)]$Payload)

  if ($Payload -and $Payload.PSObject.Properties.Name -contains 'canonicalAgentLee' -and $Payload.canonicalAgentLee) {
    if ($Payload.canonicalAgentLee.PSObject.Properties.Name -contains 'universeVisible' -and $Payload.canonicalAgentLee.universeVisible) {
      return $true
    }
  }
  if ($Payload -and $Payload.PSObject.Properties.Name -contains 'agentLeeCanonical' -and $Payload.agentLeeCanonical) {
    if ($Payload.agentLeeCanonical.PSObject.Properties.Name -contains 'universeVisible' -and $Payload.agentLeeCanonical.universeVisible) {
      return $true
    }
  }

  $manifest = Get-UniverseManifest -Payload $Payload
  if ($null -eq $manifest) { return $false }

  $searchPaths = $manifest.searchPaths
  $harness = $manifest.statefulResearchHarness
  if ($null -eq $harness -and $Payload -and $Payload.PSObject.Properties.Name -contains 'coreMap') {
    $harness = $Payload.coreMap.statefulResearchHarnessCopies
  }
  if ($null -eq $harness -and $Payload -and $Payload.PSObject.Properties.Name -contains 'statefulResearchHarnessCopies') {
    $harness = $Payload.statefulResearchHarnessCopies
  }

  $skills = @()
  $capabilities = @()
  if ($searchPaths) {
    if ($searchPaths.PSObject.Properties.Name -contains 'skills' -and $searchPaths.skills) { $skills = @($searchPaths.skills) }
    if ($searchPaths.PSObject.Properties.Name -contains 'capabilities' -and $searchPaths.capabilities) { $capabilities = @($searchPaths.capabilities) }
  }
  if (-not $skills -and $Payload -and $Payload.PSObject.Properties.Name -contains 'activeSkillSearchPaths' -and $Payload.activeSkillSearchPaths) {
    $skills = @($Payload.activeSkillSearchPaths)
  }
  if (-not $capabilities -and $Payload -and $Payload.PSObject.Properties.Name -contains 'activeCapabilitySearchPaths' -and $Payload.activeCapabilitySearchPaths) {
    $capabilities = @($Payload.activeCapabilitySearchPaths)
  }
  if (-not $skills -and $Payload -and $Payload.PSObject.Properties.Name -contains 'coreMap' -and $Payload.coreMap -and $Payload.coreMap.PSObject.Properties.Name -contains 'activeSkillSearchPaths') {
    $skills = @($Payload.coreMap.activeSkillSearchPaths)
  }
  if (-not $capabilities -and $Payload -and $Payload.PSObject.Properties.Name -contains 'coreMap' -and $Payload.coreMap -and $Payload.coreMap.PSObject.Properties.Name -contains 'activeCapabilitySearchPaths') {
    $capabilities = @($Payload.coreMap.activeCapabilitySearchPaths)
  }

  $skillVisible = $false
  foreach ($entry in $skills) {
    $value = if ($entry -and $entry.PSObject.Properties.Name -contains 'absolute') { $entry.absolute } else { $entry }
    if ($value -and $value.ToString().ToLower().Contains('stateful-research-harness')) { $skillVisible = $true; break }
  }

  $capabilityVisible = $false
  foreach ($entry in $capabilities) {
    $value = if ($entry -and $entry.PSObject.Properties.Name -contains 'absolute') { $entry.absolute } else { $entry }
    if ($value -and $value.ToString().ToLower().Contains('capability-registry')) { $capabilityVisible = $true; break }
  }

  $harnessVisible = $false
  if ($harness -and $harness.PSObject.Properties.Name -contains 'activeCopy' -and $harness.activeCopy) { $harnessVisible = $true }
  elseif ($harness -and $harness.PSObject.Properties.Name -contains 'path' -and $harness.path) { $harnessVisible = $true }
  elseif ($Payload -and $Payload.PSObject.Properties.Name -contains 'harnessMirrors' -and $Payload.harnessMirrors) { $harnessVisible = $true }

  return [bool]($skillVisible -and $capabilityVisible -and $harnessVisible)
}

function Invoke-JsonProbe {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][string]$Url
  )

  try {
    $response = Invoke-WebRequest -Uri $Url -TimeoutSec 6 -UseBasicParsing -ErrorAction Stop
    $data = $null
    if ($response.Content) {
      try { $data = $response.Content | ConvertFrom-Json } catch { $data = $response.Content }
    }
    return [ordered]@{
      name = $Name
      url = $Url
      reachable = $true
      statusCode = [int]$response.StatusCode
      data = $data
      error = $null
    }
  } catch {
    $statusCode = 0
    $body = $null
    if ($_.Exception.Response) {
      try {
        $statusCode = [int]$_.Exception.Response.StatusCode
        $stream = $_.Exception.Response.GetResponseStream()
        if ($stream) {
          $reader = New-Object System.IO.StreamReader($stream)
          $body = $reader.ReadToEnd()
          $reader.Close()
        }
      } catch {}
    }
    $data = $null
    if ($body) {
      try { $data = $body | ConvertFrom-Json } catch { $data = $body }
    }
    return [ordered]@{
      name = $Name
      url = $Url
      reachable = $false
      statusCode = $statusCode
      data = $data
      error = $_.Exception.Message
    }
  }
}

function New-CanonicalSummary {
  param([Parameter(Mandatory = $false)]$Payload)

  if ($null -eq $Payload) {
    return [ordered]@{
      identityFingerprint = $null
      fingerprintMatches = $false
      canonical = $false
      agentMode = $null
      role = $null
      instanceContract = $null
      universeVisible = $false
    }
  }

  return Get-CanonicalSummary -Payload $Payload
}

function New-SurfaceReport {
  param(
    [Parameter(Mandatory = $true)]$Probe
  )

  $summary = New-CanonicalSummary -Payload $Probe.data
  return [ordered]@{
    name = $Probe.name
    url = $Probe.url
    reachable = $Probe.reachable
    statusCode = $Probe.statusCode
    fingerprint = $summary.identityFingerprint
    fingerprintMatches = $summary.fingerprintMatches
    canonical = $summary.canonical
    agentMode = $summary.agentMode
    role = $summary.role
    instanceContract = $summary.instanceContract
    universeVisible = $summary.universeVisible
    error = $Probe.error
    raw = $Probe.data
  }
}

function New-StatusProof {
  param(
    [Parameter(Mandatory = $true)]$Probe
  )

  $summary = New-CanonicalSummary -Payload $Probe.data
  return [ordered]@{
    name = $Probe.name
    url = $Probe.url
    reachable = $Probe.reachable
    statusCode = $Probe.statusCode
    fingerprint = $summary.identityFingerprint
    fingerprintMatches = $summary.fingerprintMatches
    canonical = $summary.canonical
    agentMode = $summary.agentMode
    role = $summary.role
    instanceContract = $summary.instanceContract
    universeVisible = $summary.universeVisible
    error = $Probe.error
    raw = $Probe.data
  }
}

function Read-VscodeChatProof {
  param([Parameter(Mandatory = $true)][string]$WorkspaceRoot)

  $expected = 'leeway.agent-lee.code-mode.canonical.supreme-agent-lead.v1'
  $profileFiles = Get-ChildItem -LiteralPath (Join-Path $WorkspaceRoot '.vscode') -File -Filter 'chatLanguageModels.agent-lee*.json' -ErrorAction SilentlyContinue
  $candidateFiles = @(
    (Join-Path $WorkspaceRoot '.vscode\settings.json'),
    (Join-Path $WorkspaceRoot '.vscode\agent-lee-byok-candidate-settings.json'),
    (Join-Path $WorkspaceRoot '.leeway-vscode\devhost-user-data\User\settings.json'),
    (Join-Path $WorkspaceRoot 'agent-lee-coding-mode\.vscode\settings.json')
  )

  $profiles = @()
  foreach ($file in $profileFiles) {
    $json = Read-JsonFile -Path $file.FullName
    if ($json -is [System.Collections.IEnumerable]) {
      foreach ($entry in $json) {
        $profiles += [ordered]@{
          file = $file.FullName
          identityFingerprint = $entry.identityFingerprint
          verifyCanonicalIdentity = $entry.verifyCanonicalIdentity
          canonicalIdentityManifest = $entry.canonicalIdentityManifest
          canonicalUniverseManifest = $entry.canonicalUniverseManifest
          modelUrl = $entry.models[0].url
          modelId = $entry.models[0].id
        }
      }
    }
  }

  $settings = @()
  foreach ($filePath in $candidateFiles) {
    if (Test-Path -LiteralPath $filePath) {
      $json = Read-JsonFile -Path $filePath
      if ($json) {
        $fingerprintValue = $json.'agentLeeCodingMode.identityFingerprint'
        if (-not $fingerprintValue -and $json.PSObject.Properties.Name -contains 'identityFingerprint') { $fingerprintValue = $json.identityFingerprint }
        if (-not $fingerprintValue -and $json.PSObject.Properties.Name -contains 'leeway.agentLee.byok') {
          $fingerprintValue = $json.'leeway.agentLee.byok'.identityFingerprint
        }
        $settings += [ordered]@{
          file = $filePath
          identityFingerprint = $fingerprintValue
          verifyCanonicalIdentity = $json.'agentLeeCodingMode.enforceCanonicalIdentity'
        }
      }
    }
  }

  $allProfilesMatch = $true
  foreach ($profile in $profiles) {
    if ($profile.identityFingerprint -ne $expected) { $allProfilesMatch = $false }
    if (-not $profile.verifyCanonicalIdentity) { $allProfilesMatch = $false }
  }

  $routerIdentity = Invoke-JsonProbe -Name 'VS Code Chat Router Identity' -Url 'http://127.0.0.1:8080/agent-lee/identity'
  $routerUniverse = Invoke-JsonProbe -Name 'VS Code Chat Router Universe' -Url 'http://127.0.0.1:8080/agent-lee/universe'
  $routerIdentitySummary = New-CanonicalSummary -Payload $routerIdentity.data
  $routerUniverseSummary = New-CanonicalSummary -Payload $routerUniverse.data
  $configured = ($profiles.Count -gt 0 -or $settings.Count -gt 0)

  return [ordered]@{
    configured = $configured
    profileFiles = $profileFiles.FullName
    profiles = $profiles
    settings = $settings
    fingerprintMatches = $allProfilesMatch -and $routerIdentitySummary.fingerprintMatches -and $routerUniverseSummary.fingerprintMatches
    canonicalProof = [ordered]@{
      routerIdentity = New-SurfaceReport -Probe $routerIdentity
      routerUniverse = New-SurfaceReport -Probe $routerUniverse
    }
  }
}

$WorkspaceRoot = Resolve-WorkspaceRoot
$ExpectedFingerprint = 'leeway.agent-lee.code-mode.canonical.supreme-agent-lead.v1'

$SurfaceSpecs = @(
  @{ Name = 'Router Identity'; Kind = 'identity'; Url = 'http://127.0.0.1:8080/agent-lee/identity' },
  @{ Name = 'Router Universe'; Kind = 'universe'; Url = 'http://127.0.0.1:8080/agent-lee/universe' },
  @{ Name = 'Runtime Identity'; Kind = 'identity'; Url = 'http://127.0.0.1:4001/agent-lee/identity' },
  @{ Name = 'Runtime Universe'; Kind = 'universe'; Url = 'http://127.0.0.1:4001/agent-lee/universe' },
  @{ Name = 'Runtime Health'; Kind = 'health'; Url = 'http://127.0.0.1:4001/runtime/health' },
  @{ Name = 'Agent API Identity'; Kind = 'identity'; Url = 'http://127.0.0.1:4000/agent/identity' },
  @{ Name = 'Agent API Universe'; Kind = 'universe'; Url = 'http://127.0.0.1:4000/agent/universe' },
  @{ Name = 'IDE Local Status'; Kind = 'status'; Url = 'http://127.0.0.1:3000/api/leeway/local-status' },
  @{ Name = 'IDE Runtime Fabric Health'; Kind = 'status'; Url = 'http://127.0.0.1:3000/api/leeway/runtime-fabric/health' },
  @{ Name = 'Cerebral Health'; Kind = 'status'; Url = 'http://127.0.0.1:8765/health' },
  @{ Name = 'Cerebral API Health'; Kind = 'status'; Url = 'http://127.0.0.1:8765/api/health' }
)

$SurfaceReports = @()
$UnreachableSurfaces = @()
$DivergentSurfaces = @()
$IdentityFingerprints = @()

foreach ($spec in $SurfaceSpecs) {
  $probe = Invoke-JsonProbe -Name $spec.Name -Url $spec.Url
  $report = if ($spec.Kind -eq 'status') { New-StatusProof -Probe $probe } else { New-SurfaceReport -Probe $probe }
  $SurfaceReports += $report

  if (-not $report.reachable) {
    $UnreachableSurfaces += $report.name
    continue
  }

  if ($report.fingerprint) {
    $IdentityFingerprints += [ordered]@{ surface = $report.name; fingerprint = $report.fingerprint }
  }

  if (
    ($spec.Kind -eq 'identity' -or $spec.Kind -eq 'health') -and (
      -not $report.fingerprintMatches -or
      -not $report.canonical -or
      $report.agentMode -ne 'code-mode' -or
      $report.role -ne 'supreme-agent-lead' -or
      $report.instanceContract -ne 'canonical-agent-lee-code-mode'
    )
  ) {
    $DivergentSurfaces += $report.name
  }
}

$IdeProof = ($SurfaceReports | Where-Object { $_.name -eq 'IDE Local Status' } | Select-Object -First 1)
$CerebralProof = ($SurfaceReports | Where-Object { $_.name -in @('Cerebral Health', 'Cerebral API Health') } | Select-Object -First 1)
$VscodeProof = Read-VscodeChatProof -WorkspaceRoot $WorkspaceRoot

if ($VscodeProof.configured -and -not $VscodeProof.fingerprintMatches) {
  $DivergentSurfaces += 'VS Code Chat configuration'
}

$expectedFingerprint = $ExpectedFingerprint
$allReachableIdentityMatch = $true
foreach ($entry in $IdentityFingerprints) {
  if ($entry.fingerprint -ne $expectedFingerprint) {
    $allReachableIdentityMatch = $false
  }
}

$overallPass = ($allReachableIdentityMatch -and $DivergentSurfaces.Count -eq 0 -and $IdeProof -and $IdeProof.fingerprintMatches -and $IdeProof.canonical -and $CerebralProof -and $CerebralProof.fingerprintMatches -and $CerebralProof.canonical -and $VscodeProof.fingerprintMatches -and $VscodeProof.canonicalProof.routerIdentity.fingerprintMatches)

$Report = [ordered]@{
  status = $(if ($overallPass) { 'PASS' } else { 'FAIL' })
  expectedFingerprint = $expectedFingerprint
  identityFingerprints = $IdentityFingerprints
  surfaces = $SurfaceReports
  ideCanonicalProof = $IdeProof
  cerebralCanonicalProof = $CerebralProof
  vscodeChatCanonicalProof = $VscodeProof
  divergentSurfaces = $DivergentSurfaces
  unreachableSurfaces = $UnreachableSurfaces
  recommendedFixes = @(
    'Keep the canonical fingerprint mirrored in the identity manifest, universe manifest, and VS Code chat config files.',
    'Do not point IDE or Cerebral chat at any runtime that fails the canonical fingerprint guard.',
    'Keep stateful-research-harness visible from both the runtime-fabric and agent-lee-coding-mode copies.'
  )
}

Write-Host "PASS/FAIL: $($Report.status)"
Write-Host "Canonical fingerprint expected: $expectedFingerprint"
Write-Host "Divergent surfaces found: $(@($DivergentSurfaces) -join ', ')"
Write-Host "Unreachable surfaces: $(@($UnreachableSurfaces) -join ', ')"
Write-Host "IDE canonical proof result: $($IdeProof | ConvertTo-Json -Depth 8)"
Write-Host "Cerebral canonical proof result: $($CerebralProof | ConvertTo-Json -Depth 8)"
Write-Host "VS Code Chat canonical proof result: $($VscodeProof | ConvertTo-Json -Depth 8)"
Write-Host ($Report | ConvertTo-Json -Depth 12)

if (-not $overallPass) {
  exit 1
}

exit 0
