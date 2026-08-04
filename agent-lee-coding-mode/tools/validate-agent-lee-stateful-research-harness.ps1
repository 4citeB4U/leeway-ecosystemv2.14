# LEEWAY_HEADER - DO NOT REMOVE
#
# ID: LEEWAY_APP::AGENT_LEE::STATEFUL_RESEARCH_HARNESS::VALIDATE_AGENT_LEE_STATEFUL_RESEARCH_HARNESS
# CLASSIFICATION: VALIDATION
# OWNER: LeeWay Local Runtime Stabilization
# PURPOSE: Prove the canonical stateful research harness, evidence ledger schema, browser integration, and research receipts.

[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Resolve-WorkspaceRoot {
  Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
}

function Read-JsonFile {
  param([Parameter(Mandatory = $true)][string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) { return $null }
  try { return (Get-Content -LiteralPath $Path -Raw) | ConvertFrom-Json } catch { return $null }
}

function Invoke-JsonRequest {
  param(
    [Parameter(Mandatory = $true)][ValidateSet('GET', 'POST')][string]$Method,
    [Parameter(Mandatory = $true)][string]$Url,
    [Parameter()][object]$Body = $null,
    [int]$TimeoutSec = 120
  )

  try {
    if ($Method -eq 'GET') {
      $response = Invoke-WebRequest -Uri $Url -Method Get -TimeoutSec $TimeoutSec -UseBasicParsing -ErrorAction Stop
    } else {
      $payload = if ($null -ne $Body) { $Body | ConvertTo-Json -Depth 32 } else { '{}' }
      $response = Invoke-WebRequest -Uri $Url -Method Post -ContentType 'application/json' -Body $payload -TimeoutSec $TimeoutSec -UseBasicParsing -ErrorAction Stop
    }

    $data = $null
    if ($response.Content) {
      try { $data = $response.Content | ConvertFrom-Json } catch { $data = $response.Content }
    }

    return [ordered]@{
      ok = ($response.StatusCode -ge 200 -and $response.StatusCode -lt 300)
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
      ok = $false
      statusCode = $statusCode
      data = $data
      error = $_.Exception.Message
    }
  }
}

$WorkspaceRoot = Resolve-WorkspaceRoot
$ReceiptDir = Join-Path $WorkspaceRoot 'Archive\receipts'
New-Item -ItemType Directory -Force -Path $ReceiptDir | Out-Null

$SkillPath = Join-Path $WorkspaceRoot 'agent-lee-coding-mode\skills\stateful-research-harness\SKILL.md'
$RuntimeSkillPath = Join-Path $WorkspaceRoot 'Leeway Runtime Fabric\skills\stateful-research-harness\SKILL.md'
$RuntimeRootSkillPath = Join-Path $WorkspaceRoot 'Leeway Runtime Fabric\stateful-research-harness\SKILL.md'
$ManifestPath = Join-Path $WorkspaceRoot 'agent-lee-coding-mode\runtime\agent-lee-research-harness.manifest.json'
$SchemaPath = Join-Path $WorkspaceRoot 'agent-lee-coding-mode\runtime\agent-lee-evidence-ledger.schema.json'
$RouterBase = 'http://127.0.0.1:8080'
$AdapterBase = 'http://127.0.0.1:8787'
$DesktopBase = 'http://127.0.0.1:8091'

$Manifest = Read-JsonFile -Path $ManifestPath
$Schema = Read-JsonFile -Path $SchemaPath
$Health = Invoke-JsonRequest -Method GET -Url "$RouterBase/agent-lee/research/health" -TimeoutSec 30
$ToolsFull = Invoke-JsonRequest -Method GET -Url "$RouterBase/agent-lee/tools/full" -TimeoutSec 60
$HarnessTool = Invoke-JsonRequest -Method POST -Url "$RouterBase/agent-lee/tools/call" -TimeoutSec 60 -Body @{
  toolName = 'leeway_stateful_research_harness_status'
}
$QualityTool = Invoke-JsonRequest -Method POST -Url "$RouterBase/agent-lee/tools/call" -TimeoutSec 60 -Body @{
  toolName = 'leeway_research_quality_sources'
}

$Start = Invoke-JsonRequest -Method POST -Url "$RouterBase/agent-lee/research/start" -TimeoutSec 30 -Body @{
  objective = 'Harness-1-derived stateful research proof for Agent Lee.'
  query = 'Find high-quality local and public sources that prove Agent Lee research behavior.'
  entrySurface = 'vscode-chat'
  adapterEndpoint = "$AdapterBase/v1/chat/completions"
}

$ResearchId = $Start.data.session.researchId
$Search = Invoke-JsonRequest -Method POST -Url "$RouterBase/agent-lee/research/search" -TimeoutSec 300 -Body @{
  researchId = $ResearchId
  query = 'stateful research harness evidence ledger candidate curated rejected claim checks'
}

$InspectCandidate = Invoke-JsonRequest -Method POST -Url "$RouterBase/agent-lee/research/inspect" -TimeoutSec 60 -Body @{
  researchId = $ResearchId
  source = 'agent-lee-coding-mode/README.md'
  title = 'Agent Lee README evidence'
  localPath = 'agent-lee-coding-mode/README.md'
  sourceType = 'local_doc'
  status = 'candidate'
  keyEvidence = 'Local README documents the runtime contract and proof surfaces.'
  supports = @('Agent Lee proof culture', 'runtime and validation paths')
  relevanceScore = 92
  freshnessScore = 88
  confidence = 'high'
  notes = 'Local source-of-truth doc.'
}

$InspectRejected = Invoke-JsonRequest -Method POST -Url "$RouterBase/agent-lee/research/inspect" -TimeoutSec 60 -Body @{
  researchId = $ResearchId
  source = 'SEO filler article'
  title = 'Obvious SEO filler'
  url = 'https://example.com/filler'
  sourceType = 'seo_filler'
  status = 'rejected'
  keyEvidence = 'Thin summary with no primary support.'
  supports = @('none')
  relevanceScore = 12
  freshnessScore = 20
  confidence = 'low'
  notes = 'Rejected on quality grounds.'
}

$Curate = Invoke-JsonRequest -Method POST -Url "$RouterBase/agent-lee/research/curate" -TimeoutSec 60 -Body @{
  researchId = $ResearchId
  evidenceId = $Search.data.candidateEvidence.id
  reason = 'Browser search evidence is the initial candidate and is curated for the working set.'
}

$ClaimCheck = Invoke-JsonRequest -Method POST -Url "$RouterBase/agent-lee/research/claim-check" -TimeoutSec 60 -Body @{
  researchId = $ResearchId
  claim = 'Agent Lee uses a stateful research harness with candidate, curated, and rejected evidence.'
  claimType = 'current fact'
  evidenceIds = @($Search.data.candidateEvidence.id, $InspectCandidate.data.evidence.id, $InspectRejected.data.evidence.id)
  counterevidence = 'None found in the local evidence set.'
  freshnessRequirement = 'high'
  result = 'supported'
  confidence = 'high'
  finalWording = 'Agent Lee keeps a recoverable research state with evidence buckets and claim checks.'
  notes = 'Harness state verified against live runtime responses.'
}

$Receipt = Invoke-JsonRequest -Method POST -Url "$RouterBase/agent-lee/research/$ResearchId/receipt" -TimeoutSec 60 -Body @{
  extra = @{
    validation = 'validate-agent-lee-stateful-research-harness.ps1'
  }
}

$Evidence = Invoke-JsonRequest -Method GET -Url "$RouterBase/agent-lee/research/$ResearchId/evidence" -TimeoutSec 30

$SkillExists = (Test-Path -LiteralPath $SkillPath) -and (Test-Path -LiteralPath $RuntimeSkillPath) -and (Test-Path -LiteralPath $RuntimeRootSkillPath)
$ManifestOk = [bool]$Manifest -and [string]$Manifest.entrySurfaceRequirement -eq 'vscode-chat' -and [string]$Manifest.adapterEndpoint -eq "$AdapterBase/v1/chat/completions"
$SchemaOk = [bool]$Schema -and ($Schema.required -contains 'entrySurface') -and ($Schema.properties.entrySurface.enum -contains 'vscode-chat')
$HealthOk = $Health.ok -and $Health.statusCode -eq 200 -and [string]$Health.data.entrySurfaceRequirement -eq 'vscode-chat'
$ResearchIdOk = -not [string]::IsNullOrWhiteSpace([string]$ResearchId)
$EvidenceCountsOk =
  $Search.ok -and
  $Curate.ok -and
  $InspectCandidate.ok -and
  $InspectRejected.ok -and
  $ClaimCheck.ok -and
  $Receipt.ok -and
  (@($Evidence.data.candidateEvidence).Count -ge 1) -and
  (@($Evidence.data.curatedEvidence).Count -ge 1) -and
  (@($Evidence.data.rejectedEvidence).Count -ge 1) -and
  (@($Evidence.data.claimChecks).Count -ge 1)
$BrowserIntegrationOk = $Search.data.browserOpened -eq $true -and -not [string]::IsNullOrWhiteSpace([string]$Search.data.browserSearch.data.runRoot)
$ToolSurfaceOk =
  (@($ToolsFull.data.tools | Where-Object { $_.name -eq 'leeway_stateful_research_harness_status' }).Count -ge 1) -and
  (@($ToolsFull.data.tools | Where-Object { $_.name -eq 'leeway_research_start' }).Count -ge 1) -and
  (@($ToolsFull.data.tools | Where-Object { $_.name -eq 'leeway_research_search' }).Count -ge 1) -and
  (@($ToolsFull.data.tools | Where-Object { $_.name -eq 'leeway_research_apply_to_build' }).Count -ge 1)
$QualityToolOk = $QualityTool.ok -and $QualityTool.statusCode -eq 200 -and (@($QualityTool.data.result.preferredSources).Count -gt 0)
$HarnessToolOk = $HarnessTool.ok -and $HarnessTool.statusCode -eq 200 -and $HarnessTool.data.result.ok -eq $true

$OverallOk = $SkillExists -and $ManifestOk -and $SchemaOk -and $HealthOk -and $ResearchIdOk -and $EvidenceCountsOk -and $BrowserIntegrationOk -and $ToolSurfaceOk -and $QualityToolOk -and $HarnessToolOk

$Report = [ordered]@{
  status = $(if ($OverallOk) { 'PASS' } else { 'FAIL' })
  workspaceRoot = $WorkspaceRoot
  manifestPath = $ManifestPath
  schemaPath = $SchemaPath
  researchId = $ResearchId
  proof = [ordered]@{
    health = $Health
    start = $Start
    search = $Search
    inspectCandidate = $InspectCandidate
    inspectRejected = $InspectRejected
    curate = $Curate
    claimCheck = $ClaimCheck
    receipt = $Receipt
    evidence = $Evidence
    toolsFull = $ToolsFull
    harnessTool = $HarnessTool
    qualityTool = $QualityTool
  }
  checks = [ordered]@{
    skillExists = $SkillExists
    manifestOk = $ManifestOk
    schemaOk = $SchemaOk
    healthOk = $HealthOk
    researchIdOk = $ResearchIdOk
    candidateEvidence = (@($Evidence.data.candidateEvidence).Count -ge 1)
    curatedEvidence = (@($Evidence.data.curatedEvidence).Count -ge 1)
    rejectedEvidence = (@($Evidence.data.rejectedEvidence).Count -ge 1)
    claimChecks = (@($Evidence.data.claimChecks).Count -ge 1)
    browserIntegration = $BrowserIntegrationOk
    toolSurface = $ToolSurfaceOk
    qualityScoring = $QualityToolOk
    harnessStatusTool = $HarnessToolOk
  }
}

$ReceiptPath = Join-Path $ReceiptDir "agent-lee-stateful-research-harness-$((Get-Date).ToString('yyyyMMdd-HHmmss')).json"
$Report | ConvertTo-Json -Depth 18 | Set-Content -LiteralPath $ReceiptPath -Encoding UTF8

Write-Host "`n=== Agent Lee Stateful Research Harness Proof ===" -ForegroundColor Magenta
Write-Host "Receipt: $ReceiptPath" -ForegroundColor DarkGray
Write-Host ($Report | ConvertTo-Json -Depth 6)

if ($OverallOk) {
  Write-Host 'Agent Lee stateful research harness proof passed.' -ForegroundColor Green
  exit 0
}

Write-Host 'Agent Lee stateful research harness proof failed.' -ForegroundColor Red
exit 1
