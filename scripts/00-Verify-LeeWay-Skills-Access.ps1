$ErrorActionPreference = 'Stop'

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Resolve-Path (Join-Path $scriptRoot '..')
$registryPath = Join-Path $repoRoot 'LEEWAY-SKILLS-REGISTRY.json'
$canonicalSkillsPath = Join-Path $repoRoot 'Leeway Runtime Fabric\skills-university'
$exportsPath = Join-Path $repoRoot 'Leeway Runtime Fabric\skills-university-exports'
$receiptsPath = Join-Path $repoRoot 'Archive\receipts'

New-Item -ItemType Directory -Force -Path $receiptsPath | Out-Null

$results = [ordered]@{
  ok = $false
  registryPath = $registryPath
  canonicalSkillsPath = $canonicalSkillsPath
  exportsPath = $exportsPath
  checks = @()
  failures = @()
}

function Add-CheckResult {
  param(
    [string]$Name,
    [bool]$Passed,
    [string]$Detail
  )

  $results.checks += [ordered]@{
    name = $Name
    passed = $Passed
    detail = $Detail
  }

  if (-not $Passed) {
    $results.failures += $Name
  }
}

function Test-DirectoryWriteAccess {
  param([string]$Path)
  try {
    if (-not (Test-Path -LiteralPath $Path)) {
      return $false
    }

    $probeName = '.write-probe-' + [Guid]::NewGuid().ToString('N') + '.tmp'
    $probePath = Join-Path $Path $probeName
    Set-Content -LiteralPath $probePath -Value 'probe' -Encoding UTF8
    Remove-Item -LiteralPath $probePath -Force
    return $true
  } catch {
    return $false
  }
}

try {
  if (Test-Path -LiteralPath $registryPath) {
    $registry = Get-Content -LiteralPath $registryPath -Raw | ConvertFrom-Json
    Add-CheckResult -Name 'registry-readable' -Passed $true -Detail 'Registry JSON loaded.'
  } else {
    Add-CheckResult -Name 'registry-readable' -Passed $false -Detail 'Registry file missing.'
    $registry = $null
  }

  if ($registry) {
    Add-CheckResult -Name 'ecosystem-root-exists' -Passed (Test-Path -LiteralPath $registry.ecosystemRoot) -Detail $registry.ecosystemRoot
    Add-CheckResult -Name 'agent-lee-coding-mode-exists' -Passed (Test-Path -LiteralPath $registry.agentLeeCanonicalEmbodiment) -Detail $registry.agentLeeCanonicalEmbodiment
    Add-CheckResult -Name 'canonical-skills-path-exists' -Passed (Test-Path -LiteralPath $registry.canonicalSkillsUniversity) -Detail $registry.canonicalSkillsUniversity
    Add-CheckResult -Name 'exports-path-exists' -Passed (Test-Path -LiteralPath $registry.skillsUniversityExports) -Detail $registry.skillsUniversityExports
    Add-CheckResult -Name 'canonical-skills-path-writable' -Passed (Test-DirectoryWriteAccess -Path $registry.canonicalSkillsUniversity) -Detail $registry.canonicalSkillsUniversity
    Add-CheckResult -Name 'exports-path-writable' -Passed (Test-DirectoryWriteAccess -Path $registry.skillsUniversityExports) -Detail $registry.skillsUniversityExports
  }
} catch {
  Add-CheckResult -Name 'preflight-exception' -Passed $false -Detail $_.Exception.Message
}

$results.ok = ($results.failures.Count -eq 0)

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$receiptPath = Join-Path $receiptsPath ("skills-access-preflight-{0}.json" -f $stamp)
$results | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath $receiptPath -Encoding UTF8

if ($results.ok) {
  Write-Host "Skills access preflight passed. Receipt: $receiptPath"
  exit 0
}

Write-Error ("Skills access preflight failed: " + ($results.failures -join ', '))
exit 1
