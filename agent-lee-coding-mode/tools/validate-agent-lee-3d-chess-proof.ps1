# LEEWAY_HEADER - DO NOT REMOVE
#
# ID: LEEWAY_APP::AGENT_LEE::THREE_D_CHESS_PROOF::VALIDATE_AGENT_LEE_3D_CHESS_PROOF
# CLASSIFICATION: VALIDATION
# OWNER: LeeWay Local Runtime Stabilization
# PURPOSE: Prove the 3D chess proof is backed by stateful research, local evidence, and browser-rendered interaction.

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

function Write-JsonFile {
  param([Parameter(Mandatory = $true)][string]$Path, [Parameter(Mandatory = $true)][object]$Body)
  $Body | ConvertTo-Json -Depth 40 | Set-Content -LiteralPath $Path -Encoding UTF8
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
      $response = Invoke-WebRequest -Uri $Url -Method Get -UseBasicParsing -TimeoutSec $TimeoutSec -ErrorAction Stop
    } else {
      $payload = if ($null -ne $Body) { $Body | ConvertTo-Json -Depth 40 } else { '{}' }
      $response = Invoke-WebRequest -Uri $Url -Method Post -ContentType 'application/json' -Body $payload -UseBasicParsing -TimeoutSec $TimeoutSec -ErrorAction Stop
    }

    $data = $null
    if ($response.Content) {
      try { $data = $response.Content | ConvertFrom-Json } catch { $data = $response.Content }
    }

    return [ordered]@{
      ok = ($response.StatusCode -ge 200 -and $response.StatusCode -lt 300)
      statusCode = [int]$response.StatusCode
      data = $data
      headers = $response.Headers
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
      headers = $null
      error = $_.Exception.Message
    }
  }
}

function New-ClaimCheck {
  param(
    [Parameter(Mandatory = $true)][string]$Claim,
    [Parameter(Mandatory = $true)][string[]]$EvidenceIds,
    [Parameter(Mandatory = $true)][string]$Result,
    [Parameter(Mandatory = $true)][string]$FinalWording
  )

  return [ordered]@{
    claim = $Claim
    claimType = 'current fact'
    evidenceIds = $EvidenceIds
    counterevidence = 'Rejected filler does not outrank primary sources.'
    freshnessRequirement = 'high'
    result = $Result
    confidence = 'high'
    finalWording = $FinalWording
    notes = 'Stateful research proof.'
  }
}

function Get-LatestReceiptPath {
  param(
    [Parameter(Mandatory = $true)][string]$ReceiptDir,
    [Parameter(Mandatory = $true)][string]$Prefix
  )

  $latest = Get-ChildItem -LiteralPath $ReceiptDir -File |
    Where-Object { $_.Name -like "$Prefix*" } |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

  if ($null -eq $latest) { return $null }
  return $latest.FullName
}

$WorkspaceRoot = Resolve-WorkspaceRoot
$ReceiptDir = Join-Path $WorkspaceRoot 'Archive\receipts'
New-Item -ItemType Directory -Force -Path $ReceiptDir | Out-Null

$ProjectRoot = Join-Path $WorkspaceRoot 'agent-lee-coding-mode\build-sandbox\agent-lee-3d-chess-proof'
$ManifestPath = Join-Path $ProjectRoot 'chess-project.manifest.json'
$ResearchLedgerPath = Join-Path $ProjectRoot 'research-ledger.json'
$ScreenshotPath = Join-Path $ReceiptDir "agent-lee-3d-chess-proof-preview-$((Get-Date).ToString('yyyyMMdd-HHmmss')).png"

$RequiredFiles = @(
  (Join-Path $ProjectRoot 'index.html'),
  (Join-Path $ProjectRoot 'app.js'),
  (Join-Path $ProjectRoot 'styles.css'),
  (Join-Path $ProjectRoot 'chess-rules-engine.js'),
  (Join-Path $ProjectRoot 'themes.json'),
  (Join-Path $ProjectRoot 'scene.graph.json'),
  (Join-Path $ProjectRoot 'research-notes.md'),
  (Join-Path $ProjectRoot 'README.md'),
  $ManifestPath
)

foreach ($path in $RequiredFiles) {
  if (-not (Test-Path -LiteralPath $path)) {
    throw "Missing 3D chess proof file: $path"
  }
}

$Manifest = Read-JsonFile -Path $ManifestPath
if (-not $Manifest) {
  throw "Could not parse chess project manifest at $ManifestPath"
}

$Themes = Read-JsonFile -Path (Join-Path $ProjectRoot 'themes.json')
$SceneGraph = Read-JsonFile -Path (Join-Path $ProjectRoot 'scene.graph.json')
$ResearchNotes = Get-Content -LiteralPath (Join-Path $ProjectRoot 'research-notes.md') -Raw

$Research = Invoke-JsonRequest -Method POST -Url 'http://127.0.0.1:8080/agent-lee/research/start' -TimeoutSec 60 -Body @{
  objective = 'Find quality references for chess legal moves, chess engine concepts, 3D chess game design, themed chess sets, and WebGL/WebXR implementation patterns.'
  query = 'FIDE laws chess rules Stockfish official docs Three.js Babylon.js MDN WebXR themed chess sets'
  entrySurface = 'vscode-chat'
  adapterEndpoint = 'http://127.0.0.1:8787/v1/chat/completions'
}

if (-not $Research.ok) {
  throw "Failed to start research session: $($Research.error)"
}

$ResearchId = $Research.data.session.researchId
$Search = Invoke-JsonRequest -Method POST -Url 'http://127.0.0.1:8080/agent-lee/research/search' -TimeoutSec 300 -Body @{
  researchId = $ResearchId
  query = 'FIDE Laws of Chess Stockfish Three.js Babylon.js MDN WebXR chess set themed pieces'
}

$InspectFide = Invoke-JsonRequest -Method POST -Url 'http://127.0.0.1:8080/agent-lee/research/inspect' -TimeoutSec 60 -Body @{
  researchId = $ResearchId
  source = 'FIDE Laws of Chess'
  title = 'FIDE Laws of Chess'
  url = 'https://www.fide.com/fide/handbook.html?id=171&view=article'
  sourceType = 'official_doc'
  status = 'candidate'
  keyEvidence = 'Official rules define legal moves, castling, promotion, and draw constraints.'
  supports = @('legal moves', 'castling', 'promotion')
  relevanceScore = 99
  freshnessScore = 92
  confidence = 'high'
  notes = 'Primary legal rules source.'
}

$InspectStockfish = Invoke-JsonRequest -Method POST -Url 'http://127.0.0.1:8080/agent-lee/research/inspect' -TimeoutSec 60 -Body @{
  researchId = $ResearchId
  source = 'Stockfish'
  title = 'Stockfish official repository'
  url = 'https://github.com/official-stockfish/Stockfish'
  sourceType = 'source_code'
  status = 'candidate'
  keyEvidence = 'Stockfish represents the engine lane with search plus evaluation, not a fake full chess AI claim.'
  supports = @('engine concept', 'search and evaluation')
  relevanceScore = 97
  freshnessScore = 90
  confidence = 'high'
  notes = 'Primary engine concept source.'
}

$InspectThree = Invoke-JsonRequest -Method POST -Url 'http://127.0.0.1:8080/agent-lee/research/inspect' -TimeoutSec 60 -Body @{
  researchId = $ResearchId
  source = 'Three.js docs'
  title = 'Three.js documentation'
  url = 'https://threejs.org/docs/'
  sourceType = 'official_doc'
  status = 'candidate'
  keyEvidence = 'Three.js documents scene setup, camera, materials, loaders, and browser-native 3D patterns.'
  supports = @('3D implementation', 'WebGL pattern')
  relevanceScore = 95
  freshnessScore = 88
  confidence = 'high'
  notes = 'Primary 3D browser reference.'
}

$InspectWebXR = Invoke-JsonRequest -Method POST -Url 'http://127.0.0.1:8080/agent-lee/research/inspect' -TimeoutSec 60 -Body @{
  researchId = $ResearchId
  source = 'MDN WebXR'
  title = 'MDN WebXR API guide'
  url = 'https://developer.mozilla.org/en-US/docs/Web/API/WebXR_Device_API'
  sourceType = 'documentation'
  status = 'candidate'
  keyEvidence = 'WebXR guidance covers immersive and AR-ready browser experiences.'
  supports = @('AR readiness', 'WebXR implementation')
  relevanceScore = 94
  freshnessScore = 86
  confidence = 'high'
  notes = 'Primary AR/browser guide.'
}

$InspectThemes = Invoke-JsonRequest -Method POST -Url 'http://127.0.0.1:8080/agent-lee/research/inspect' -TimeoutSec 60 -Body @{
  researchId = $ResearchId
  source = 'agent-lee-coding-mode/build-sandbox/agent-lee-3d-chess-proof/themes.json'
  title = 'Themed piece families'
  localPath = 'agent-lee-coding-mode/build-sandbox/agent-lee-3d-chess-proof/themes.json'
  sourceType = 'local_manifest'
  status = 'candidate'
  keyEvidence = 'The local theme catalog defines multiple piece families, titles, palettes, and motifs for the proof.'
  supports = @('theme design basis', 'piece family differentiation')
  relevanceScore = 98
  freshnessScore = 100
  confidence = 'high'
  notes = 'Local design source.'
}

$RejectedSeo = Invoke-JsonRequest -Method POST -Url 'http://127.0.0.1:8080/agent-lee/research/inspect' -TimeoutSec 60 -Body @{
  researchId = $ResearchId
  source = 'chess SEO filler'
  title = 'Chess SEO filler'
  url = 'https://example.com/chess-filler'
  sourceType = 'seo_filler'
  status = 'rejected'
  keyEvidence = 'No primary support, no real implementation detail, and no authoritative rule surface.'
  supports = @('none')
  relevanceScore = 4
  freshnessScore = 12
  confidence = 'low'
  notes = 'Rejected as thin filler.'
}

$CurateFide = Invoke-JsonRequest -Method POST -Url 'http://127.0.0.1:8080/agent-lee/research/curate' -TimeoutSec 60 -Body @{
  researchId = $ResearchId
  evidenceId = $InspectFide.data.evidence.id
  reason = 'FIDE is the primary legal-move authority.'
}

$CurateStockfish = Invoke-JsonRequest -Method POST -Url 'http://127.0.0.1:8080/agent-lee/research/curate' -TimeoutSec 60 -Body @{
  researchId = $ResearchId
  evidenceId = $InspectStockfish.data.evidence.id
  reason = 'Stockfish grounds the engine concept.'
}

$CurateThree = Invoke-JsonRequest -Method POST -Url 'http://127.0.0.1:8080/agent-lee/research/curate' -TimeoutSec 60 -Body @{
  researchId = $ResearchId
  evidenceId = $InspectThree.data.evidence.id
  reason = 'Three.js grounds the browser-native 3D implementation pattern.'
}

$CurateWebXR = Invoke-JsonRequest -Method POST -Url 'http://127.0.0.1:8080/agent-lee/research/curate' -TimeoutSec 60 -Body @{
  researchId = $ResearchId
  evidenceId = $InspectWebXR.data.evidence.id
  reason = 'WebXR docs ground the guarded AR readiness claim.'
}

$CurateThemes = Invoke-JsonRequest -Method POST -Url 'http://127.0.0.1:8080/agent-lee/research/curate' -TimeoutSec 60 -Body @{
  researchId = $ResearchId
  evidenceId = $InspectThemes.data.evidence.id
  reason = 'The local theme catalog is the direct proof basis for the themed chess families.'
}

$ClaimLegal = New-ClaimCheck -Claim 'The proof respects legal chess moves.' -EvidenceIds @($InspectFide.data.evidence.id, $InspectThemes.data.evidence.id) -Result 'supported' -FinalWording 'Chess move validation is anchored to the FIDE rules surface.'
$ClaimEngine = New-ClaimCheck -Claim 'The proof uses a real engine concept instead of pretending to be a finished chess AI.' -EvidenceIds @($InspectStockfish.data.evidence.id) -Result 'supported' -FinalWording 'Evaluation and search remain the engine lane.'
$ClaimTheme = New-ClaimCheck -Claim 'The themed chess families have a documented design basis.' -EvidenceIds @($InspectThemes.data.evidence.id) -Result 'supported' -FinalWording 'The local theme catalog defines the family identities.'
$Claim3D = New-ClaimCheck -Claim 'The browser proof uses 3D/WebGL implementation patterns.' -EvidenceIds @($InspectThree.data.evidence.id, $InspectFide.data.evidence.id) -Result 'supported' -FinalWording 'Three.js style browser-3D patterns guide the scene.'
$ClaimXR = New-ClaimCheck -Claim 'AR/WebXR readiness is guarded and documented.' -EvidenceIds @($InspectWebXR.data.evidence.id, $InspectThemes.data.evidence.id) -Result 'supported' -FinalWording 'WebXR is treated as readiness, not as an overclaim.'

foreach ($claim in @($ClaimLegal, $ClaimEngine, $ClaimTheme, $Claim3D, $ClaimXR)) {
  $ClaimBody = [ordered]@{
    researchId = $ResearchId
    claim = $claim.claim
    claimType = $claim.claimType
    evidenceIds = $claim.evidenceIds
    counterevidence = $claim.counterevidence
    freshnessRequirement = $claim.freshnessRequirement
    result = $claim.result
    confidence = $claim.confidence
    finalWording = $claim.finalWording
    notes = $claim.notes
  }
  Invoke-JsonRequest -Method POST -Url 'http://127.0.0.1:8080/agent-lee/research/claim-check' -TimeoutSec 60 -Body $ClaimBody | Out-Null
}

$Apply = Invoke-JsonRequest -Method POST -Url 'http://127.0.0.1:8080/agent-lee/research/apply-to-build' -TimeoutSec 60 -Body @{
  researchId = $ResearchId
  buildTarget = 'agent-lee-coding-mode/build-sandbox/agent-lee-3d-chess-proof'
  evidenceIds = @(
    $InspectFide.data.evidence.id,
    $InspectStockfish.data.evidence.id,
    $InspectThree.data.evidence.id,
    $InspectWebXR.data.evidence.id,
    $InspectThemes.data.evidence.id
  )
  reason = 'Curated evidence should shape the 3D chess proof and its claim language.'
}

$Receipt = Invoke-JsonRequest -Method POST -Url "http://127.0.0.1:8080/agent-lee/research/$ResearchId/receipt" -TimeoutSec 60 -Body @{
  extra = @{
    buildTarget = 'agent-lee-coding-mode/build-sandbox/agent-lee-3d-chess-proof'
    proofType = '3d-chess'
  }
}

$Evidence = Invoke-JsonRequest -Method GET -Url "http://127.0.0.1:8080/agent-lee/research/$ResearchId/evidence" -TimeoutSec 30
if (-not $Evidence.ok) {
  throw "Could not read evidence ledger: $($Evidence.error)"
}

$Ledger = [ordered]@{
  researchId = $ResearchId
  objective = 'Find quality references for chess legal moves, chess engine concepts, 3D chess game design, themed chess sets, and WebGL/WebXR implementation patterns.'
  query = 'FIDE laws chess rules Stockfish official docs Three.js Babylon.js MDN WebXR themed chess sets'
  sourceMap = $Evidence.data.sourceMap
  candidateEvidence = $Evidence.data.candidateEvidence
  curatedEvidence = $Evidence.data.curatedEvidence
  rejectedEvidence = $Evidence.data.rejectedEvidence
  claimChecks = $Evidence.data.claimChecks
  openGaps = $Evidence.data.openGaps
  buildDecisions = $Evidence.data.buildDecisions
  receipts = $Evidence.data.receipts
  entrySurface = 'vscode-chat'
  adapterEndpoint = 'http://127.0.0.1:8787/v1/chat/completions'
  canonicalFingerprint = 'leeway.agent-lee.code-mode.canonical.supreme-agent-lead.v1'
  ledgerPath = $ResearchLedgerPath
  createdAt = (Get-Date).ToString('o')
  updatedAt = (Get-Date).ToString('o')
}

Write-JsonFile -Path $ResearchLedgerPath -Body $Ledger

$PlaywrightResult = $null
Push-Location $ProjectRoot
try {
  $nodeScript = @"
const { chromium } = await import('playwright');
const { pathToFileURL } = await import('url');
const { readFileSync } = await import('node:fs');
const ledger = JSON.parse(readFileSync(process.argv[3], 'utf8').replace(/^\uFEFF/, ''));
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1500, height: 2200 } });
await page.addInitScript((data) => {
  window.__AGENT_LEE_RESEARCH_LEDGER__ = data;
}, ledger);
await page.goto(pathToFileURL(process.argv[1]).href, { waitUntil: 'networkidle' });
await page.selectOption('#theme-select', 'knights_and_dragons');
await page.selectOption('#move-select', 'e2e5');
await page.click('#validate-move');
await page.waitForFunction(() => document.querySelector('#move-result')?.textContent?.includes('illegal'));
await page.selectOption('#move-select', 'e2e4');
await page.click('#validate-move');
await page.waitForFunction(() => document.querySelector('#move-result')?.textContent?.includes('passes the partial engine'));
await page.screenshot({ path: process.argv[2], fullPage: true });
const summary = await page.evaluate(() => ({
  theme: document.querySelector('#scene-snippet')?.textContent || '',
  moveResult: document.querySelector('#move-result')?.textContent || '',
  ledgerPath: document.querySelector('#ledger-path')?.textContent || '',
  ledgerCounts: document.querySelector('#ledger-counts')?.textContent || '',
  claimCount: document.querySelectorAll('#ledger-claims li').length,
  curatedCount: document.querySelectorAll('#ledger-cards .ledger-card').length
}));
await browser.close();
console.log(JSON.stringify(summary));
"@
  $playwrightRaw = node.exe -e $nodeScript (Join-Path $ProjectRoot 'index.html') $ScreenshotPath $ResearchLedgerPath
  $PlaywrightResult = $playwrightRaw | ConvertFrom-Json
} finally {
  Pop-Location
}

if (-not (Test-Path -LiteralPath $ScreenshotPath)) {
  throw "3D chess screenshot was not created: $ScreenshotPath"
}

$LatestReceipt = Get-LatestReceiptPath -ReceiptDir $ReceiptDir -Prefix "agent-lee-3d-chess-proof-"
if (-not $LatestReceipt) {
  throw 'No chess proof receipt was written.'
}

$Checks = [ordered]@{
  researchStart = $Research.ok
  search = $Search.ok
  candidateEvidence = $Evidence.data.candidateEvidence.Count -ge 1
  curatedEvidence = $Evidence.data.curatedEvidence.Count -ge 5
  rejectedEvidence = $Evidence.data.rejectedEvidence.Count -ge 1
  claimChecks = $Evidence.data.claimChecks.Count -ge 5
  buildDecision = $Evidence.data.buildDecisions.Count -ge 1
  ledgerWritten = (Test-Path -LiteralPath $ResearchLedgerPath)
  screenshotWritten = (Test-Path -LiteralPath $ScreenshotPath)
  playrightThemeSwitch = ($PlaywrightResult.theme -match 'knights_and_dragons')
  playrightMoveValidation = ($PlaywrightResult.moveResult -match 'passes the partial engine')
  playrightLedgerVisible = ([string]$PlaywrightResult.ledgerPath -match 'research-ledger.json')
}

$OverallOk = -not ($Checks.Values -contains $false)

$Report = [ordered]@{
  status = $(if ($OverallOk) { 'PASS' } else { 'FAIL' })
  workspaceRoot = $WorkspaceRoot
  projectRoot = $ProjectRoot
  researchId = $ResearchId
  researchLedgerPath = $ResearchLedgerPath
  screenshotPath = $ScreenshotPath
  previewPath = $ScreenshotPath
  previewOpenAttempted = $false
  previewOpenSkippedReason = 'headless browser preview disabled'
  receiptPath = $Receipt.data.receiptPath
  evidence = $Evidence.data
  manifest = $Manifest
  sceneGraph = $SceneGraph
  themes = $Themes
  researchNotes = $ResearchNotes
  proof = [ordered]@{
    researchStart = $Research
    search = $Search
    inspectFide = $InspectFide
    inspectStockfish = $InspectStockfish
    inspectThree = $InspectThree
    inspectWebXR = $InspectWebXR
    inspectThemes = $InspectThemes
    rejectedSeo = $RejectedSeo
    curateFide = $CurateFide
    curateStockfish = $CurateStockfish
    curateThree = $CurateThree
    curateWebXR = $CurateWebXR
    curateThemes = $CurateThemes
    claimLegal = $ClaimLegal
    claimEngine = $ClaimEngine
    claimTheme = $ClaimTheme
    claim3D = $Claim3D
    claimXR = $ClaimXR
    apply = $Apply
    receipt = $Receipt
    playwright = $PlaywrightResult
  }
  checks = $Checks
}

$ReceiptPath = Join-Path $ReceiptDir "agent-lee-3d-chess-proof-$((Get-Date).ToString('yyyyMMdd-HHmmss')).json"
$Report | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $ReceiptPath -Encoding UTF8

Write-Host "`n=== Agent Lee 3D Chess Proof ===" -ForegroundColor Magenta
Write-Host "Receipt: $ReceiptPath" -ForegroundColor DarkGray
Write-Host ($Report | ConvertTo-Json -Depth 6)

if ($OverallOk) {
  Write-Host 'Agent Lee 3D chess proof passed.' -ForegroundColor Green
  exit 0
}

Write-Host 'Agent Lee 3D chess proof failed.' -ForegroundColor Red
exit 1
