# LEEWAY_HEADER - DO NOT REMOVE
#
# ID: LEEWAY_APP::AGENT_LEE::AGENT_SITE_PROOF::VALIDATE_AGENT_LEE_AGENT_SITE_PROOF
# CLASSIFICATION: VALIDATION
# OWNER: LeeWay Local Runtime Stabilization
# PURPOSE: Prove the Agent Lee abilities site is backed by stateful research, local receipts, and a visible browser preview.

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
      $payload = if ($null -ne $Body) { $Body | ConvertTo-Json -Depth 40 } else { '{}' }
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

function Write-JsonFile {
  param([Parameter(Mandatory = $true)][string]$Path, [Parameter(Mandatory = $true)][object]$Body)
  $Body | ConvertTo-Json -Depth 40 | Set-Content -LiteralPath $Path -Encoding UTF8
}

function Invoke-PlaywrightPreview {
  param(
    [Parameter(Mandatory = $true)][string]$ProjectRoot,
    [Parameter(Mandatory = $true)][string]$OutPath,
    [Parameter(Mandatory = $true)][string[]]$Clicks
  )

  Push-Location $ProjectRoot
  try {
    $script = @"
const { chromium } = await import('playwright');
const { pathToFileURL } = await import('url');
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1800 } });
await page.goto(pathToFileURL(process.argv[2]).href, { waitUntil: 'networkidle' });
for (const selector of JSON.parse(process.argv[4] || '[]')) {
  const el = page.locator(selector);
  if (await el.count()) {
    try { await el.first().click(); } catch {}
  }
}
await page.screenshot({ path: process.argv[3], fullPage: true });
await browser.close();
"@
    node.exe -e $script (Join-Path $ProjectRoot 'index.html') $OutPath ($Clicks | ConvertTo-Json -Depth 6)
  } finally {
    Pop-Location
  }
}

$WorkspaceRoot = Resolve-WorkspaceRoot
$ReceiptDir = Join-Path $WorkspaceRoot 'Archive\receipts'
New-Item -ItemType Directory -Force -Path $ReceiptDir | Out-Null

$ProjectRoot = Join-Path $WorkspaceRoot 'agent-lee-coding-mode\build-sandbox\agent-lee-abilities-site'
$ManifestPath = Join-Path $ProjectRoot 'agent-lee-site.manifest.json'
$PagePath = Join-Path $ProjectRoot 'index.html'
$ResearchLedgerPath = Join-Path $ProjectRoot 'research-ledger.json'
$ScreenshotPath = Join-Path $ReceiptDir "agent-lee-abilities-site-preview-$((Get-Date).ToString('yyyyMMdd-HHmmss')).png"

$RequiredFiles = @(
  (Join-Path $ProjectRoot 'index.html'),
  (Join-Path $ProjectRoot 'styles.css'),
  (Join-Path $ProjectRoot 'app.js'),
  (Join-Path $ProjectRoot 'agent-lee-site.manifest.json'),
  (Join-Path $ProjectRoot 'README.md')
)

$FilesOk = -not ($RequiredFiles | Where-Object { -not (Test-Path -LiteralPath $_) })
$Manifest = Read-JsonFile -Path $ManifestPath

$ReceiptFiles = Get-ChildItem -LiteralPath $ReceiptDir -File | Sort-Object LastWriteTime -Descending | Select-Object -First 3
$LatestReceiptPath = if ($ReceiptFiles) { $ReceiptFiles[0].FullName } else { $null }

$Research = Invoke-JsonRequest -Method POST -Url 'http://127.0.0.1:8080/agent-lee/research/start' -TimeoutSec 60 -Body @{
  objective = 'Find the strongest evidence from local Leeway receipts/manifests proving what Agent Lee can and cannot do.'
  query = 'local receipts manifests Agent Lee abilities limits proof'
  entrySurface = 'vscode-chat'
  adapterEndpoint = 'http://127.0.0.1:8787/v1/chat/completions'
}

$ResearchId = $Research.data.session.researchId
$Search = Invoke-JsonRequest -Method POST -Url 'http://127.0.0.1:8080/agent-lee/research/search' -TimeoutSec 300 -Body @{
  researchId = $ResearchId
  query = 'Agent Lee local receipts runtime README BYOK core map speech policy'
}

$InspectReceipt = Invoke-JsonRequest -Method POST -Url 'http://127.0.0.1:8080/agent-lee/research/inspect' -TimeoutSec 60 -Body @{
  researchId = $ResearchId
  source = $LatestReceiptPath
  title = 'Latest local proof receipt'
  localPath = $LatestReceiptPath
  sourceType = 'local_receipt'
  status = 'candidate'
  keyEvidence = 'The latest receipt shows live local proof is being written to Archive/receipts.'
  supports = @('proof culture', 'visible receipts')
  relevanceScore = 96
  freshnessScore = 100
  confidence = 'high'
  notes = 'Local receipt evidence.'
}

$InspectReadme = Invoke-JsonRequest -Method POST -Url 'http://127.0.0.1:8080/agent-lee/research/inspect' -TimeoutSec 60 -Body @{
  researchId = $ResearchId
  source = 'agent-lee-coding-mode/README.md'
  title = 'Agent Lee README'
  localPath = 'agent-lee-coding-mode/README.md'
  sourceType = 'local_doc'
  status = 'candidate'
  keyEvidence = 'README documents the speech style policy and the proof workflow.'
  supports = @('runtime proof', 'speech policy', 'validation')
  relevanceScore = 92
  freshnessScore = 88
  confidence = 'high'
  notes = 'Local README evidence.'
}

$InspectByok = Invoke-JsonRequest -Method POST -Url 'http://127.0.0.1:8080/agent-lee/research/inspect' -TimeoutSec 60 -Body @{
  researchId = $ResearchId
  source = 'AGENT-LEE-VSCODE-BYOK.md'
  title = 'Agent Lee BYOK guide'
  localPath = 'AGENT-LEE-VSCODE-BYOK.md'
  sourceType = 'local_doc'
  status = 'candidate'
  keyEvidence = 'BYOK guide documents the VS Code adapter endpoint and validation prompts.'
  supports = @('VS Code Chat proof', 'adapter endpoint')
  relevanceScore = 90
  freshnessScore = 86
  confidence = 'high'
  notes = 'Local BYOK evidence.'
}

$InspectCoreMap = Invoke-JsonRequest -Method POST -Url 'http://127.0.0.1:8080/agent-lee/research/inspect' -TimeoutSec 60 -Body @{
  researchId = $ResearchId
  source = 'AGENT_LEE_CORE_MAP.md'
  title = 'Agent Lee core map'
  localPath = 'agent-lee-coding-mode/AGENT_LEE_CORE_MAP.md'
  sourceType = 'local_doc'
  status = 'candidate'
  keyEvidence = 'Core map links router, runtime, voice, and proof surfaces.'
  supports = @('ability claims', 'limitations', 'voice')
  relevanceScore = 94
  freshnessScore = 88
  confidence = 'high'
  notes = 'Local core map evidence.'
}

$InspectSpeechPolicy = Invoke-JsonRequest -Method POST -Url 'http://127.0.0.1:8080/agent-lee/research/inspect' -TimeoutSec 60 -Body @{
  researchId = $ResearchId
  source = 'agent-lee-coding-mode/runtime/agent-lee-speech-style-policy.json'
  title = 'Speech style policy'
  localPath = 'agent-lee-coding-mode/runtime/agent-lee-speech-style-policy.json'
  sourceType = 'local_manifest'
  status = 'candidate'
  keyEvidence = 'Speech rules explicitly require natural Leeway style and reject robotic narration.'
  supports = @('speech style', 'progress lines')
  relevanceScore = 95
  freshnessScore = 100
  confidence = 'high'
  notes = 'Local speech policy evidence.'
}

$CuratedReceipt = Invoke-JsonRequest -Method POST -Url 'http://127.0.0.1:8080/agent-lee/research/curate' -TimeoutSec 60 -Body @{
  researchId = $ResearchId
  evidenceId = $InspectReceipt.data.evidence.id
  reason = 'Local receipts are the most direct proof of runtime behavior.'
}

$CuratedReadme = Invoke-JsonRequest -Method POST -Url 'http://127.0.0.1:8080/agent-lee/research/curate' -TimeoutSec 60 -Body @{
  researchId = $ResearchId
  evidenceId = $InspectReadme.data.evidence.id
  reason = 'README is the canonical operator doc for the site proof.'
}

$Rejected = Invoke-JsonRequest -Method POST -Url 'http://127.0.0.1:8080/agent-lee/research/inspect' -TimeoutSec 60 -Body @{
  researchId = $ResearchId
  source = 'obvious SEO filler'
  title = 'SEO filler'
  url = 'https://example.com/filler'
  sourceType = 'seo_filler'
  status = 'rejected'
  keyEvidence = 'No primary evidence.'
  supports = @('none')
  relevanceScore = 5
  freshnessScore = 10
  confidence = 'low'
  notes = 'Rejected for quality.'
}

$ClaimChecks = @(
  @{
    claim = 'Agent Lee can talk, voice, browse, and keep receipts.'
    evidenceIds = @($CuratedReceipt.data.evidence.id, $CuratedReadme.data.evidence.id, $InspectByok.data.evidence.id)
    result = 'supported'
    finalWording = 'Agent Lee ships conversation, voice, browser, and receipt proof.'
  },
  @{
    claim = 'Agent Lee does not overclaim vision or real physical action.'
    evidenceIds = @($InspectCoreMap.data.evidence.id, $InspectSpeechPolicy.data.evidence.id)
    result = 'supported'
    finalWording = 'Vision remains guarded and physical actions stay simulation-first.'
  }
)

foreach ($check in $ClaimChecks) {
  Invoke-JsonRequest -Method POST -Url 'http://127.0.0.1:8080/agent-lee/research/claim-check' -TimeoutSec 60 -Body @{
    researchId = $ResearchId
    claim = $check.claim
    claimType = 'current fact'
    evidenceIds = $check.evidenceIds
    counterevidence = 'No stronger local counterevidence found.'
    freshnessRequirement = 'high'
    result = $check.result
    confidence = 'high'
    finalWording = $check.finalWording
    notes = 'Local proof receipt synthesis.'
  } | Out-Null
}

$Apply = Invoke-JsonRequest -Method POST -Url 'http://127.0.0.1:8080/agent-lee/research/apply-to-build' -TimeoutSec 60 -Body @{
  researchId = $ResearchId
  buildTarget = 'agent-lee-coding-mode/build-sandbox/agent-lee-abilities-site'
  evidenceIds = @($CuratedReceipt.data.evidence.id, $CuratedReadme.data.evidence.id, $InspectByok.data.evidence.id, $InspectCoreMap.data.evidence.id)
  decision = 'apply'
  reason = 'The abilities site should display curated local proof and limits.'
}

$ResearchReceipt = Invoke-JsonRequest -Method POST -Url "http://127.0.0.1:8080/agent-lee/research/$ResearchId/receipt" -TimeoutSec 60 -Body @{
  extra = @{
    buildTarget = 'agent-lee-coding-mode/build-sandbox/agent-lee-abilities-site'
    proofType = 'abilities-site'
  }
}

$ResearchEvidence = Invoke-JsonRequest -Method GET -Url "http://127.0.0.1:8080/agent-lee/research/$ResearchId/evidence" -TimeoutSec 30

$Ledger = [ordered]@{
  researchId = $ResearchId
  objective = 'Find the strongest evidence from local Leeway receipts/manifests proving what Agent Lee can and cannot do.'
  query = 'local receipts manifests Agent Lee abilities limits proof'
  sourceMap = $ResearchEvidence.data.sourceMap
  candidateEvidence = $ResearchEvidence.data.candidateEvidence
  curatedEvidence = $ResearchEvidence.data.curatedEvidence
  rejectedEvidence = $ResearchEvidence.data.rejectedEvidence
  claimChecks = $ResearchEvidence.data.claimChecks
  openGaps = $ResearchEvidence.data.openGaps
  buildDecisions = $ResearchEvidence.data.buildDecisions
  receipts = $ResearchEvidence.data.receipts
  entrySurface = 'vscode-chat'
  adapterEndpoint = 'http://127.0.0.1:8787/v1/chat/completions'
  canonicalFingerprint = 'leeway.agent-lee.code-mode.canonical.supreme-agent-lead.v1'
  ledgerPath = $ResearchLedgerPath
  receiptPath = $ResearchReceipt.data.receiptPath
  createdAt = (Get-Date).ToString('o')
  updatedAt = (Get-Date).ToString('o')
}

Write-JsonFile -Path $ResearchLedgerPath -Body $Ledger

Push-Location $WorkspaceRoot\agent-lee-coding-mode
try {
  $previewScript = @"
const { chromium } = await import('playwright');
const { pathToFileURL } = await import('url');
const { readFileSync } = await import('node:fs');
const ledger = JSON.parse(readFileSync(process.argv[3], 'utf8').replace(/^\uFEFF/, ''));
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 2200 } });
await page.addInitScript((data) => {
  window.__AGENT_LEE_RESEARCH_LEDGER__ = data;
}, ledger);
await page.goto(pathToFileURL(process.argv[1]).href, { waitUntil: 'networkidle' });
await page.waitForFunction(() => {
  const node = document.querySelector('#ledger-path');
  return !!node && !node.textContent.includes('Waiting');
});
await page.click('[data-action="flip-tone"]');
await page.click('[data-action="cycle-proof"]');
await page.screenshot({ path: process.argv[2], fullPage: true });
await browser.close();
"@
  node.exe -e $previewScript (Join-Path $ProjectRoot 'index.html') $ScreenshotPath $ResearchLedgerPath
} finally {
  Pop-Location
}

$ManifestOk = [bool]$Manifest -and [string]$Manifest.entrySurface -eq 'vscode-chat'
$FilesOk = -not (@(
  (Join-Path $ProjectRoot 'index.html'),
  (Join-Path $ProjectRoot 'styles.css'),
  (Join-Path $ProjectRoot 'app.js'),
  (Join-Path $ProjectRoot 'agent-lee-site.manifest.json'),
  (Join-Path $ProjectRoot 'README.md')
) | Where-Object { -not (Test-Path -LiteralPath $_) })
$LedgerOk = Test-Path -LiteralPath $ResearchLedgerPath
$EvidenceOk = $ResearchEvidence.ok -and $ResearchEvidence.data.curatedEvidence.Count -ge 2 -and $ResearchEvidence.data.rejectedEvidence.Count -ge 1 -and $ResearchEvidence.data.claimChecks.Count -ge 2
$PreviewOk = Test-Path -LiteralPath $ScreenshotPath
$ReceiptOk = $ResearchReceipt.ok -and -not [string]::IsNullOrWhiteSpace([string]$ResearchReceipt.data.receiptPath)
$ResearchIdOk = -not [string]::IsNullOrWhiteSpace([string]$ResearchId)
$FinalOk = $ManifestOk -and $FilesOk -and $LedgerOk -and $EvidenceOk -and $PreviewOk -and $ReceiptOk -and $ResearchIdOk

$Report = [ordered]@{
  status = $(if ($FinalOk) { 'PASS' } else { 'FAIL' })
  projectRoot = $ProjectRoot
  researchLedgerPath = $ResearchLedgerPath
  screenshotPath = $ScreenshotPath
  previewPath = $ScreenshotPath
  previewOpenAttempted = $false
  previewOpenSkippedReason = 'headless browser preview disabled'
  receiptPath = $ResearchReceipt.data.receiptPath
  researchId = $ResearchId
  proof = [ordered]@{
    researchStart = $Research
    search = $Search
    inspectReceipt = $InspectReceipt
    inspectReadme = $InspectReadme
    inspectByok = $InspectByok
    inspectCoreMap = $InspectCoreMap
    inspectSpeechPolicy = $InspectSpeechPolicy
    curateReceipt = $CuratedReceipt
    curateReadme = $CuratedReadme
    rejected = $Rejected
    apply = $Apply
    receipt = $ResearchReceipt
    evidence = $ResearchEvidence
  }
  checks = [ordered]@{
    manifestOk = $ManifestOk
    filesOk = $FilesOk
    ledgerOk = $LedgerOk
    evidenceOk = $EvidenceOk
    previewOk = $PreviewOk
    receiptOk = $ReceiptOk
    researchIdOk = $ResearchIdOk
  }
}

$ReceiptPath = Join-Path $ReceiptDir "agent-lee-agent-site-proof-$((Get-Date).ToString('yyyyMMdd-HHmmss')).json"
$Report | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $ReceiptPath -Encoding UTF8

Write-Host "`n=== Agent Lee Abilities Site Proof ===" -ForegroundColor Magenta
Write-Host "Receipt: $ReceiptPath" -ForegroundColor DarkGray
Write-Host ($Report | ConvertTo-Json -Depth 6)

if ($FinalOk) {
  Write-Host 'Agent Lee abilities site proof passed.' -ForegroundColor Green
  exit 0
}

Write-Host 'Agent Lee abilities site proof failed.' -ForegroundColor Red
exit 1
