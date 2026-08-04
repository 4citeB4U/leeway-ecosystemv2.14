# LEEWAY_HEADER - DO NOT REMOVE
#
# ID: LEEWAY_APP::AGENT_LEE::SKILL_FABRIC::VALIDATE_AGENT_LEE_SKILL_FABRIC
# CLASSIFICATION: VALIDATION
# OWNER: LeeWay Local Runtime Stabilization
# PURPOSE: Prove canonical skill and MCP registry attachment, sandbox skill creation, validation, simulation, and tool-call proof.

[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Resolve-WorkspaceRoot {
  Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
}

function Read-JsonBody {
  param([Parameter(Mandatory = $true)][string]$Text)
  if ([string]::IsNullOrWhiteSpace($Text)) { return $null }
  try { return $Text | ConvertFrom-Json } catch { return $Text }
}

function Invoke-JsonRequest {
  param(
    [Parameter(Mandatory = $true)][ValidateSet('GET', 'POST')][string]$Method,
    [Parameter(Mandatory = $true)][string]$Url,
    [Parameter()][object]$Body,
    [int]$TimeoutSec = 120
  )

  try {
    if ($Method -eq 'GET') {
      $response = Invoke-WebRequest -Uri $Url -Method Get -UseBasicParsing -TimeoutSec $TimeoutSec -ErrorAction Stop
    } else {
      $payload = if ($null -ne $Body) { $Body | ConvertTo-Json -Depth 24 } else { '{}' }
      $response = Invoke-WebRequest -Uri $Url -Method Post -ContentType 'application/json' -Body $payload -UseBasicParsing -TimeoutSec $TimeoutSec -ErrorAction Stop
    }

    $data = $null
    if ($response.Content) {
      $data = Read-JsonBody -Text $response.Content
    }

    return [ordered]@{
      ok = ($response.StatusCode -ge 200 -and $response.StatusCode -lt 300)
      statusCode = [int]$response.StatusCode
      url = $Url
      data = $data
      error = $null
    }
  } catch {
    $statusCode = 0
    $bodyText = $null
    if ($_.Exception.Response) {
      try {
        $statusCode = [int]$_.Exception.Response.StatusCode
        $stream = $_.Exception.Response.GetResponseStream()
        if ($stream) {
          $reader = New-Object System.IO.StreamReader($stream)
          $bodyText = $reader.ReadToEnd()
          $reader.Close()
        }
      } catch {}
    }

    $data = if ($bodyText) { Read-JsonBody -Text $bodyText } else { $null }

    return [ordered]@{
      ok = $false
      statusCode = $statusCode
      url = $Url
      data = $data
      error = $_.Exception.Message
    }
  }
}

function Ensure-ReceiptDir {
  param([string]$Path)
  New-Item -ItemType Directory -Force -Path $Path | Out-Null
}

$WorkspaceRoot = Resolve-WorkspaceRoot
$ReceiptDir = Join-Path $WorkspaceRoot 'Archive\receipts'
Ensure-ReceiptDir -Path $ReceiptDir

$RouterBase = 'http://127.0.0.1:8080'
$Stamp = Get-Date -Format 'yyyyMMdd-HHmmss'

$Skills = Invoke-JsonRequest -Method GET -Url "$RouterBase/agent-lee/skills/full" -TimeoutSec 30
$Mcps = Invoke-JsonRequest -Method GET -Url "$RouterBase/agent-lee/mcps" -TimeoutSec 30
$Tools = Invoke-JsonRequest -Method GET -Url "$RouterBase/agent-lee/tools/full" -TimeoutSec 30
$SkillRouteCoding = Invoke-JsonRequest -Method POST -Url "$RouterBase/agent-lee/skills/route" -TimeoutSec 30 -Body @{
  taskType = 'coding'
  prompt = 'Choose the best skill for a coding change.'
}
$SkillRouteResearch = Invoke-JsonRequest -Method POST -Url "$RouterBase/agent-lee/skills/route" -TimeoutSec 30 -Body @{
  taskType = 'research'
  prompt = 'Choose the best skill for browser research.'
}
$SkillRouteCreative = Invoke-JsonRequest -Method POST -Url "$RouterBase/agent-lee/skills/route" -TimeoutSec 30 -Body @{
  taskType = '3d'
  prompt = 'Choose the best skill for 3D asset work.'
}
$SkillCreate = Invoke-JsonRequest -Method POST -Url "$RouterBase/agent-lee/skills/create" -TimeoutSec 120 -Body @{
  skillId = 'agent-lee-skill-self-test'
  name = 'Agent Lee Skill Self Test'
}
$SkillValidate = Invoke-JsonRequest -Method POST -Url "$RouterBase/agent-lee/skills/validate" -TimeoutSec 120 -Body @{
  skillId = 'agent-lee-skill-self-test'
}
$SkillSimulate = Invoke-JsonRequest -Method POST -Url "$RouterBase/agent-lee/skills/simulate" -TimeoutSec 120 -Body @{
  skillId = 'agent-lee-skill-self-test'
  scenario = 'sandbox-proof'
}
$ToolCallSkillRegistry = Invoke-JsonRequest -Method POST -Url "$RouterBase/agent-lee/tools/call" -TimeoutSec 120 -Body @{
  toolName = 'leeway_skill_registry_full'
}
$ToolCallMcpRegistry = Invoke-JsonRequest -Method POST -Url "$RouterBase/agent-lee/tools/call" -TimeoutSec 120 -Body @{
  toolName = 'leeway_mcp_registry'
}

$SkillRoot = Join-Path $WorkspaceRoot 'agent-lee-coding-mode\skills-sandbox\agent-lee-skill-self-test'
$SkillMd = Join-Path $SkillRoot 'SKILL.md'
$SkillManifest = Join-Path $SkillRoot 'skill.manifest.json'
$SkillActions = Join-Path $SkillRoot 'actions.json'

$Checks = [ordered]@{
  skillsAttached = $Skills.ok -and $Skills.statusCode -eq 200 -and $Skills.data.attached -eq $true -and $Skills.data.canonicalSkillPackages.Count -ge 4
  mcpsAttached = $Mcps.ok -and $Mcps.statusCode -eq 200 -and $Mcps.data.attached -eq $true -and $Mcps.data.mcps.Count -ge 5
  toolsAttached = $Tools.ok -and $Tools.statusCode -eq 200 -and $Tools.data.tools.Count -ge 10
  routeCoding = $SkillRouteCoding.ok -and $SkillRouteCoding.statusCode -eq 200 -and -not [string]::IsNullOrWhiteSpace([string]$SkillRouteCoding.data.selectedSkillId)
  routeResearch = $SkillRouteResearch.ok -and $SkillRouteResearch.statusCode -eq 200 -and -not [string]::IsNullOrWhiteSpace([string]$SkillRouteResearch.data.selectedSkillId)
  routeCreative = $SkillRouteCreative.ok -and $SkillRouteCreative.statusCode -eq 200 -and -not [string]::IsNullOrWhiteSpace([string]$SkillRouteCreative.data.selectedSkillId)
  createSkill = $SkillCreate.ok -and $SkillCreate.statusCode -eq 200 -and (Test-Path -LiteralPath $SkillMd) -and (Test-Path -LiteralPath $SkillManifest) -and (Test-Path -LiteralPath $SkillActions)
  validateSkill = $SkillValidate.ok -and $SkillValidate.statusCode -eq 200 -and [string]$SkillValidate.data.validation -eq 'PASS'
  simulateSkill = $SkillSimulate.ok -and $SkillSimulate.statusCode -eq 200 -and [string]$SkillSimulate.data.skillId -eq 'agent-lee-skill-self-test'
  toolRegistryCall = $ToolCallSkillRegistry.ok -and $ToolCallSkillRegistry.statusCode -eq 200 -and $ToolCallSkillRegistry.data.ok -eq $true
  mcpRegistryCall = $ToolCallMcpRegistry.ok -and $ToolCallMcpRegistry.statusCode -eq 200 -and $ToolCallMcpRegistry.data.ok -eq $true
}

$OverallOk = -not ($Checks.Values -contains $false)

$Receipt = [ordered]@{
  status = $(if ($OverallOk) { 'PASS' } else { 'FAIL' })
  workspaceRoot = $WorkspaceRoot
  routerBase = $RouterBase
  timestamp = (Get-Date).ToString('o')
  registries = [ordered]@{
    skills = $Skills
    mcps = $Mcps
    tools = $Tools
  }
  routes = [ordered]@{
    coding = $SkillRouteCoding
    research = $SkillRouteResearch
    creative = $SkillRouteCreative
  }
  sandboxSkill = [ordered]@{
    create = $SkillCreate
    validate = $SkillValidate
    simulate = $SkillSimulate
    skillRoot = $SkillRoot
  }
  toolCalls = [ordered]@{
    skills = $ToolCallSkillRegistry
    mcps = $ToolCallMcpRegistry
  }
  checks = $Checks
  finalStatus = $(if ($OverallOk) { 'AGENT_LEE_ORCHESTRATION_LOCKED' } else { 'AGENT_LEE_ORCHESTRATION_PARTIAL' })
}

$ReceiptPath = Join-Path $ReceiptDir "agent-lee-skill-fabric-$Stamp.json"
$Receipt | ConvertTo-Json -Depth 18 | Set-Content -LiteralPath $ReceiptPath -Encoding UTF8

Write-Host "`n=== Agent Lee Skill Fabric Proof ===" -ForegroundColor Magenta
Write-Host "Receipt: $ReceiptPath" -ForegroundColor DarkGray
Write-Host ($Receipt | ConvertTo-Json -Depth 6)

if ($OverallOk) {
  Write-Host 'Agent Lee skill fabric proof passed.' -ForegroundColor Green
  exit 0
}

Write-Host 'Agent Lee skill fabric proof failed.' -ForegroundColor Red
exit 1
