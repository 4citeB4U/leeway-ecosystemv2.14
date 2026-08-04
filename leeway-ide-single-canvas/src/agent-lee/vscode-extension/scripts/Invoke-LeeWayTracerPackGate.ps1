<#
LEEWAY_HEADER - DO NOT REMOVE

REGION: CORE
TAG: CORE.GOVERNANCE.APPLICATION.TRACER_PACK_GATE
PURPOSE: Verifies LeeWay Tracer Pack law, skill standard, identity mesh TRACE support, public-safe reporting, and integrity-gate wiring.
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
#>

param(
  [string]$ExtensionDir = (Join-Path $PSScriptRoot ".."),
  [string]$WorkspaceRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..")).Path,
  [string]$EvidencePath
)

$ErrorActionPreference = "Stop"

function New-TracerPackCheck {
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

function Get-ModuleData {
  param(
    [string]$ModulePath,
    [string]$Script
  )

  if (-not (Test-Path -LiteralPath $ModulePath)) {
    throw "Compiled module not found: $ModulePath"
  }

  $json = & node.exe -e $Script $ModulePath
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to read compiled module: $ModulePath"
  }

  return ($json | ConvertFrom-Json)
}

$resolvedExtensionDir = (Resolve-Path $ExtensionDir).Path
$resolvedWorkspaceRoot = (Resolve-Path $WorkspaceRoot).Path
$resultPath = if ($EvidencePath) {
  $EvidencePath
} else {
  Join-Path $resolvedExtensionDir "test-evidence\leeway-tracer-pack-result.json"
}
$skillRoot = if ($env:CODEX_HOME) {
  Join-Path $env:CODEX_HOME "skills\leeway-application-standards"
} else {
  Join-Path $env:USERPROFILE ".codex\skills\leeway-application-standards"
}

New-Item -ItemType Directory -Force -Path (Split-Path -Parent $resultPath) | Out-Null

$meshModulePath = Join-Path $resolvedExtensionDir "out\leeway-application\leewayIdentityMesh.js"
$meshData = Get-ModuleData -ModulePath $meshModulePath -Script @"
const mod = require(process.argv[1]);
process.stdout.write(JSON.stringify({
  families: mod.LEEWAY_ID_FAMILIES,
  tracerPackRequiredIds: mod.LEEWAY_TRACER_PACK_REQUIRED_IDS,
  records: mod.LEEWAY_IDENTITY_MESH_RECORDS
}));
"@

$graphModulePath = Join-Path $resolvedExtensionDir "out\leeway-application\leewayApplicationIdentityGraph.js"
$graphData = Get-ModuleData -ModulePath $graphModulePath -Script @"
const mod = require(process.argv[1]);
process.stdout.write(JSON.stringify({
  nodes: mod.LEEWAY_APPLICATION_IDENTITY_GRAPH
}));
"@

$records = @($meshData.records)
$recordIds = @($records | ForEach-Object { $_.id })
$graphNodeIds = @($graphData.nodes | ForEach-Object { $_.id })
$checks = New-Object System.Collections.Generic.List[object]

$tracerPackLawPath = Join-Path $resolvedWorkspaceRoot "agent-lee\governance\law\leeway-tracer-pack-law.md"
$tracerPackLawPass = (Test-Path -LiteralPath $tracerPackLawPath) -and ((Get-Content -LiteralPath $tracerPackLawPath -Raw) -match "No LeeWay action, rejection, quarantine, conversion, or agent induction is valid")
$checks.Add((New-TracerPackCheck -Name "tracer pack law exists" -Pass $tracerPackLawPass -Detail "agent-lee/governance/law/leeway-tracer-pack-law.md" -EvidencePath $tracerPackLawPath))

$skillStandardPath = Join-Path $skillRoot "references\leeway-tracer-pack-standard.md"
$skillStandardPass = (Test-Path -LiteralPath $skillStandardPath) -and ((Get-Content -LiteralPath $skillStandardPath -Raw) -match "Before acting, create or update the Tracer Pack")
$checks.Add((New-TracerPackCheck -Name "tracer pack standard exists in skill" -Pass $skillStandardPass -Detail "references/leeway-tracer-pack-standard.md" -EvidencePath $skillStandardPath))

$traceFamilyPass = "TRACE" -in @($meshData.families)
$traceRecordPass = @($records | Where-Object { $_.id -like "LEEWAY_TRACE::*" }).Count -gt 0
$checks.Add((New-TracerPackCheck -Name "identity mesh defines TRACE IDs" -Pass ($traceFamilyPass -and $traceRecordPass) -Detail ("TRACE family: $traceFamilyPass; TRACE records: $traceRecordPass")))

$ingressEvent = $records | Where-Object { $_.id -eq "LEEWAY_EVENT::GOVERNANCE::UNTRUSTED_LLM_INGRESS" } | Select-Object -First 1
$ingressInputs = @($ingressEvent.inputs)
$ingressPass = ($null -ne $ingressEvent) -and ("actorId" -in $ingressInputs) -and ("promptId" -in $ingressInputs)
$checks.Add((New-TracerPackCheck -Name "agent and LLM ingress events require actor ID and prompt ID" -Pass $ingressPass -Detail ("Ingress inputs: " + ($ingressInputs -join ", "))))

$receiptFailures = @(
  $records | Where-Object {
    $_.status -in @("QUARANTINED", "REJECTED", "HUMAN_REVIEW_REQUIRED") -and
    ([string]$_.receiptId -notmatch '^LEEWAY_RECEIPT::')
  }
)
$checks.Add((New-TracerPackCheck -Name "rejected and quarantined actions require receipt IDs" -Pass ($receiptFailures.Count -eq 0) -Detail ("Receipt failures: " + $receiptFailures.Count)))

$publicReportTemplatePath = Join-Path $resolvedWorkspaceRoot "agent-lee\governance\templates\leeway-public-safe-tracer-report-template.md"
$publicReportPass = (Test-Path -LiteralPath $publicReportTemplatePath) -and ((Get-Content -LiteralPath $publicReportTemplatePath -Raw) -match "Human review status")
$checks.Add((New-TracerPackCheck -Name "public-safe tracer report template exists" -Pass $publicReportPass -Detail "agent-lee/governance/templates/leeway-public-safe-tracer-report-template.md" -EvidencePath $publicReportTemplatePath))

$integrityGatePath = Join-Path $resolvedExtensionDir "scripts\Invoke-LeeWayApplicationIntegrityGate.ps1"
$integrityGateContent = Get-Content -LiteralPath $integrityGatePath -Raw
$integrityIncludesTracerPass = $integrityGateContent -match "Invoke-LeeWayTracerPackGate\.ps1"
$checks.Add((New-TracerPackCheck -Name "integrity gate includes tracer pack gate" -Pass $integrityIncludesTracerPass -Detail "Invoke-LeeWayApplicationIntegrityGate.ps1 must invoke the tracer pack gate." -EvidencePath $integrityGatePath))

$requiredTracerGraphNodes = @(
  "LEEWAY_APP::GOVERNANCE::TRACER_PACK::ROOT",
  "LEEWAY_APP::GOVERNANCE::TRACER_PACK::UNTRUSTED_INGRESS",
  "LEEWAY_APP::GOVERNANCE::TRACER_PACK::QUARANTINE_RECORD",
  "LEEWAY_APP::GOVERNANCE::TRACER_PACK::REJECTION_RECEIPT",
  "LEEWAY_APP::GOVERNANCE::TRACER_PACK::PUBLIC_SAFE_REPORT",
  "LEEWAY_APP::GOVERNANCE::TRACER_PACK::HUMAN_REVIEW_GATE"
)
$missingTracerGraphNodes = @($requiredTracerGraphNodes | Where-Object { $_ -notin $graphNodeIds })
$checks.Add((New-TracerPackCheck -Name "tracer pack identity graph nodes exist" -Pass ($missingTracerGraphNodes.Count -eq 0) -Detail ("Missing graph nodes: " + $missingTracerGraphNodes.Count)))

$missingTracerRequiredIds = @(@($meshData.tracerPackRequiredIds) | Where-Object { $_ -notin $recordIds })
$checks.Add((New-TracerPackCheck -Name "tracer pack required IDs are registered" -Pass ($missingTracerRequiredIds.Count -eq 0) -Detail ("Missing tracer IDs: " + $missingTracerRequiredIds.Count)))

$failedChecks = @($checks | Where-Object { -not $_.pass })
$result = [pscustomobject]@{
  gate = "LEEWAY_TRACER_PACK_GATE"
  generatedAt = (Get-Date).ToString("o")
  workspaceRoot = $resolvedWorkspaceRoot
  extensionDir = $resolvedExtensionDir
  skillRoot = $skillRoot
  passed = ($failedChecks.Count -eq 0)
  summary = [pscustomobject]@{
    totalChecks = $checks.Count
    failedChecks = $failedChecks.Count
    tracerPackRequiredIds = @($meshData.tracerPackRequiredIds).Count
  }
  checks = $checks
  tracerPack = [pscustomobject]@{
    requiredIds = $meshData.tracerPackRequiredIds
    records = @($records | Where-Object { $_.id -in @($meshData.tracerPackRequiredIds) -or $_.pipeline -eq "TRACER_PACK" })
  }
}

$result | ConvertTo-Json -Depth 18 | Out-File -LiteralPath $resultPath -Encoding utf8
Write-Host "Tracer pack result written to $resultPath" -ForegroundColor Green

if (-not $result.passed) {
  exit 1
}
