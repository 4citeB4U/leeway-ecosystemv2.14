<#
LEEWAY_HEADER - DO NOT REMOVE

REGION: CORE
TAG: CORE.GOVERNANCE.APPLICATION.IDENTITY_MESH_GATE
PURPOSE: Verifies LeeWay identity mesh families, sovereign layer anatomy, provenance records, and tracer pack IDs.
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
#>

param(
  [string]$ExtensionDir = (Join-Path $PSScriptRoot ".."),
  [string]$WorkspaceRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..")).Path,
  [string]$EvidencePath
)

$ErrorActionPreference = "Stop"

function New-IdentityMeshCheck {
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

function Get-IdentityMeshData {
  param([string]$ExtensionRoot)

  $compiledModulePath = Join-Path $ExtensionRoot "out\leeway-application\leewayIdentityMesh.js"
  if (-not (Test-Path -LiteralPath $compiledModulePath)) {
    throw "Compiled identity mesh module not found: $compiledModulePath"
  }

  $nodeScript = @"
const mod = require(process.argv[1]);
process.stdout.write(JSON.stringify({
  version: mod.LEEWAY_IDENTITY_MESH_VERSION,
  families: mod.LEEWAY_ID_FAMILIES,
  sovereignLayers: mod.LEEWAY_SOVEREIGN_LAYER_ANATOMY,
  tracerPackRequiredIds: mod.LEEWAY_TRACER_PACK_REQUIRED_IDS,
  records: mod.LEEWAY_IDENTITY_MESH_RECORDS
}));
"@

  $json = & node.exe -e $nodeScript $compiledModulePath
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to read compiled identity mesh module."
  }

  return ($json | ConvertFrom-Json)
}

function Get-FamilyFromLeeWayId {
  param([string]$Id)

  if ($Id -notmatch '^LEEWAY_([^:]+)::') {
    return ""
  }

  return $Matches[1]
}

$resolvedExtensionDir = (Resolve-Path $ExtensionDir).Path
$resolvedWorkspaceRoot = (Resolve-Path $WorkspaceRoot).Path
$resultPath = if ($EvidencePath) {
  $EvidencePath
} else {
  Join-Path $resolvedExtensionDir "test-evidence\leeway-identity-mesh-result.json"
}

New-Item -ItemType Directory -Force -Path (Split-Path -Parent $resultPath) | Out-Null

$meshData = Get-IdentityMeshData -ExtensionRoot $resolvedExtensionDir
$records = @($meshData.records)
$recordIds = @($records | ForEach-Object { $_.id })
$families = @($meshData.families)
$sovereignLayers = @($meshData.sovereignLayers)
$tracerPackRequiredIds = @($meshData.tracerPackRequiredIds)

$checks = New-Object System.Collections.Generic.List[object]

$requiredFamilies = @(
  "APP",
  "ACTOR",
  "INTENT",
  "PROMPT",
  "TX",
  "GATE",
  "EVENT",
  "CMD",
  "FILE",
  "ARTIFACT",
  "EVIDENCE",
  "RECEIPT",
  "ATTEST",
  "POLICY",
  "AUTHORITY",
  "QUARANTINE",
  "TRACE",
  "PULSE",
  "OBJECT",
  "ORIGIN",
  "WATERMARK",
  "INDUCTION"
)

$missingFamilies = @($requiredFamilies | Where-Object { $_ -notin $families })
$checks.Add((New-IdentityMeshCheck -Name "required ID families are defined" -Pass ($missingFamilies.Count -eq 0) -Detail ("Missing families: " + $missingFamilies.Count)))

$familiesWithoutRecords = @(
  $requiredFamilies | Where-Object {
    $family = $_
    -not (@($records | Where-Object { (Get-FamilyFromLeeWayId -Id $_.id) -eq $family }).Count -gt 0)
  }
)
$checks.Add((New-IdentityMeshCheck -Name "required ID families have records" -Pass ($familiesWithoutRecords.Count -eq 0) -Detail ("Families without records: " + $familiesWithoutRecords.Count)))

$unknownFamilyRecords = @(
  $records | Where-Object {
    $family = Get-FamilyFromLeeWayId -Id $_.id
    [string]::IsNullOrWhiteSpace($family) -or ($family -notin $families)
  }
)
$checks.Add((New-IdentityMeshCheck -Name "all record IDs use known families" -Pass ($unknownFamilyRecords.Count -eq 0) -Detail ("Unknown family records: " + $unknownFamilyRecords.Count)))

$traceFieldFailures = @(
  $records | Where-Object {
    [string]::IsNullOrWhiteSpace([string]$_.actorId) -or
    [string]::IsNullOrWhiteSpace([string]$_.promptId) -or
    [string]::IsNullOrWhiteSpace([string]$_.intentId) -or
    [string]::IsNullOrWhiteSpace([string]$_.transactionId) -or
    [string]::IsNullOrWhiteSpace([string]$_.authorityId) -or
    [string]::IsNullOrWhiteSpace([string]$_.evidenceId) -or
    [string]::IsNullOrWhiteSpace([string]$_.receiptId) -or
    @($_.verification).Count -eq 0
  }
)
$checks.Add((New-IdentityMeshCheck -Name "identity records include traceability fields" -Pass ($traceFieldFailures.Count -eq 0) -Detail ("Records missing trace fields: " + $traceFieldFailures.Count)))

$emptyLayerAnatomy = @($sovereignLayers | Where-Object { [string]::IsNullOrWhiteSpace([string]$_.layerId) -or @($_.subIds).Count -eq 0 })
$checks.Add((New-IdentityMeshCheck -Name "eight sovereign layers have internal anatomy" -Pass (($sovereignLayers.Count -eq 8) -and ($emptyLayerAnatomy.Count -eq 0)) -Detail ("Layers: $($sovereignLayers.Count); Empty anatomy: $($emptyLayerAnatomy.Count)")))

$missingLayerRecords = @($sovereignLayers | Where-Object { $_.layerId -notin $recordIds })
$checks.Add((New-IdentityMeshCheck -Name "sovereign layer IDs have records" -Pass ($missingLayerRecords.Count -eq 0) -Detail ("Missing layer records: " + $missingLayerRecords.Count)))

$missingSublayerRecords = New-Object System.Collections.Generic.List[string]
foreach ($layer in $sovereignLayers) {
  foreach ($subId in @($layer.subIds)) {
    if ($subId -notin $recordIds) {
      $missingSublayerRecords.Add([string]$subId)
    }
  }
}
$checks.Add((New-IdentityMeshCheck -Name "sovereign sub-IDs have records" -Pass ($missingSublayerRecords.Count -eq 0) -Detail ("Missing sub-ID records: " + $missingSublayerRecords.Count)))

$missingTracerIds = @($tracerPackRequiredIds | Where-Object { $_ -notin $recordIds })
$checks.Add((New-IdentityMeshCheck -Name "tracer pack required IDs have records" -Pass ($missingTracerIds.Count -eq 0) -Detail ("Missing tracer IDs: " + $missingTracerIds.Count)))

$ingressEvent = $records | Where-Object { $_.id -eq "LEEWAY_EVENT::GOVERNANCE::UNTRUSTED_LLM_INGRESS" } | Select-Object -First 1
$ingressInputs = @($ingressEvent.inputs)
$ingressPass = ($null -ne $ingressEvent) -and ("actorId" -in $ingressInputs) -and ("promptId" -in $ingressInputs)
$checks.Add((New-IdentityMeshCheck -Name "untrusted ingress requires actor ID and prompt ID" -Pass $ingressPass -Detail ("Ingress inputs: " + ($ingressInputs -join ", "))))

$receiptFailures = @(
  $records | Where-Object {
    $_.status -in @("QUARANTINED", "REJECTED", "HUMAN_REVIEW_REQUIRED") -and
    ([string]$_.receiptId -notmatch '^LEEWAY_RECEIPT::')
  }
)
$checks.Add((New-IdentityMeshCheck -Name "rejected or quarantined records require receipt IDs" -Pass ($receiptFailures.Count -eq 0) -Detail ("Receipt failures: " + $receiptFailures.Count)))

$failedChecks = @($checks | Where-Object { -not $_.pass })
$result = [pscustomobject]@{
  gate = "LEEWAY_IDENTITY_MESH_GATE"
  generatedAt = (Get-Date).ToString("o")
  workspaceRoot = $resolvedWorkspaceRoot
  extensionDir = $resolvedExtensionDir
  version = $meshData.version
  passed = ($failedChecks.Count -eq 0)
  summary = [pscustomobject]@{
    totalChecks = $checks.Count
    failedChecks = $failedChecks.Count
    registeredRecords = $records.Count
    sovereignLayers = $sovereignLayers.Count
  }
  checks = $checks
  mesh = [pscustomobject]@{
    families = $families
    sovereignLayers = $sovereignLayers
    tracerPackRequiredIds = $tracerPackRequiredIds
    records = $records
  }
}

$result | ConvertTo-Json -Depth 18 | Out-File -LiteralPath $resultPath -Encoding utf8
Write-Host "Identity mesh result written to $resultPath" -ForegroundColor Green

if (-not $result.passed) {
  exit 1
}
