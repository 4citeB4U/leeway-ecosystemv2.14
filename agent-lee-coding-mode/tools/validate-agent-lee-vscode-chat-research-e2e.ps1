# LEEWAY_HEADER - DO NOT REMOVE
#
# ID: LEEWAY_APP::AGENT_LEE::VSCODE_CHAT_RESEARCH_E2E::VALIDATE_AGENT_LEE_VSCODE_CHAT_RESEARCH_E2E
# CLASSIFICATION: VALIDATION
# OWNER: LeeWay Local Runtime Stabilization
# PURPOSE: Prove stateful research enters through VS Code Chat adapter and produces candidate, curated, rejected evidence, claim checks, and a receipt.

[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Resolve-WorkspaceRoot {
  Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
}

function Invoke-ChatCompletion {
  param(
    [Parameter(Mandatory = $true)][object]$Body
  )

  $payload = $Body | ConvertTo-Json -Depth 40
  try {
    $response = Invoke-RestMethod -Uri 'http://127.0.0.1:8787/v1/chat/completions' -Method Post -ContentType 'application/json' -Body $payload -TimeoutSec 240 -ErrorAction Stop
    return [ordered]@{
      ok = $true
      data = $response
      error = $null
    }
  } catch {
    return [ordered]@{
      ok = $false
      data = $null
      error = $_.Exception.Message
    }
  }
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

function Get-ToolCall {
  param([Parameter(Mandatory = $true)]$Response)
  if ($null -eq $Response -or -not $Response.choices) { return $null }
  $choice = $Response.choices[0]
  if ($null -eq $choice -or $null -eq $choice.message -or -not $choice.message.tool_calls) { return $null }
  return $choice.message.tool_calls[0]
}

function Add-AssistantToolMessage {
  param(
    [Parameter(Mandatory = $true)][System.Collections.IList]$Messages,
    [Parameter(Mandatory = $true)]$ToolCall
  )

  $Messages.Add(@{
    role = 'assistant'
    content = $null
    tool_calls = @(
      @{
        id = $ToolCall.id
        type = 'function'
        function = @{
          name = $ToolCall.function.name
          arguments = $ToolCall.function.arguments
        }
      }
    )
  }) | Out-Null
}

function Add-ToolMessage {
  param(
    [Parameter(Mandatory = $true)][System.Collections.IList]$Messages,
    [Parameter(Mandatory = $true)][string]$ToolCallId,
    [Parameter(Mandatory = $true)][string]$ToolName,
    [Parameter(Mandatory = $true)][object]$Result
  )

  $Messages.Add(@{
    role = 'tool'
    tool_call_id = $ToolCallId
    name = $ToolName
    content = ($Result | ConvertTo-Json -Depth 40)
  }) | Out-Null
}

function New-ResearchToolDefs {
  @(
    @{
      type = 'function'
      function = @{
        name = 'leeway_research_start'
        description = 'Start a stateful research session.'
        parameters = @{
          type = 'object'
          properties = @{
            objective = @{ type = 'string' }
            query = @{ type = 'string' }
            entrySurface = @{ type = 'string' }
            adapterEndpoint = @{ type = 'string' }
          }
          additionalProperties = $true
        }
      }
    }
    @{
      type = 'function'
      function = @{
        name = 'leeway_research_search'
        description = 'Search with browser runtime and capture candidate evidence.'
        parameters = @{
          type = 'object'
          properties = @{
            researchId = @{ type = 'string' }
            query = @{ type = 'string' }
          }
          additionalProperties = $true
        }
      }
    }
    @{
      type = 'function'
      function = @{
        name = 'leeway_research_inspect'
        description = 'Inspect a source and add it to the evidence ledger.'
        parameters = @{
          type = 'object'
          properties = @{
            researchId = @{ type = 'string' }
            source = @{ type = 'string' }
            title = @{ type = 'string' }
            url = @{ type = 'string' }
            localPath = @{ type = 'string' }
            sourceType = @{ type = 'string' }
            status = @{ type = 'string' }
            keyEvidence = @{ type = 'string' }
            relevanceScore = @{ type = 'number' }
            freshnessScore = @{ type = 'number' }
          }
          additionalProperties = $true
        }
      }
    }
    @{
      type = 'function'
      function = @{
        name = 'leeway_research_curate'
        description = 'Curate evidence into the trusted set.'
        parameters = @{
          type = 'object'
          properties = @{
            researchId = @{ type = 'string' }
            evidenceId = @{ type = 'string' }
            reason = @{ type = 'string' }
          }
          additionalProperties = $true
        }
      }
    }
    @{
      type = 'function'
      function = @{
        name = 'leeway_research_claim_check'
        description = 'Record a claim check against evidence.'
        parameters = @{
          type = 'object'
          properties = @{
            researchId = @{ type = 'string' }
            claim = @{ type = 'string' }
            evidenceIds = @{ type = 'array' }
            result = @{ type = 'string' }
          }
          additionalProperties = $true
        }
      }
    }
    @{
      type = 'function'
      function = @{
        name = 'leeway_research_apply_to_build'
        description = 'Apply curated evidence to a build decision.'
        parameters = @{
          type = 'object'
          properties = @{
            researchId = @{ type = 'string' }
            buildTarget = @{ type = 'string' }
            evidenceIds = @{ type = 'array' }
          }
          additionalProperties = $true
        }
      }
    }
    @{
      type = 'function'
      function = @{
        name = 'leeway_research_receipt'
        description = 'Write a research receipt.'
        parameters = @{
          type = 'object'
          properties = @{
            researchId = @{ type = 'string' }
          }
          additionalProperties = $true
        }
      }
    }
  )
}

$WorkspaceRoot = Resolve-WorkspaceRoot
$ReceiptDir = Join-Path $WorkspaceRoot 'Archive\receipts'
New-Item -ItemType Directory -Force -Path $ReceiptDir | Out-Null

$Prompt = 'Agent Lee, from VS Code Chat, use your stateful research harness to research high-quality sources for a 3D chess game with themed pieces. Keep candidate evidence, curated evidence, rejected evidence, claim checks, and a receipt.'
$Tools = New-ResearchToolDefs
$Messages = New-Object System.Collections.Generic.List[object]
$Messages.Add(@{
  role = 'user'
  content = $Prompt
}) | Out-Null

$ToolSequence = @(
  'leeway_research_start',
  'leeway_research_search',
  'leeway_research_inspect',
  'leeway_research_inspect',
  'leeway_research_curate',
  'leeway_research_claim_check',
  'leeway_research_apply_to_build',
  'leeway_research_receipt'
)

$ResearchId = $null
$FinalReceiptPath = $null
$ToolResults = @()
$FinalAssistantResponse = $null
$EntrySurfaceOk = $false
$AdapterEndpoint = 'http://127.0.0.1:8787/v1/chat/completions'

foreach ($toolName in $ToolSequence) {
  $choice = @{
    type = 'function'
    function = @{
      name = $toolName
    }
  }

  $Chat = Invoke-ChatCompletion -Body @{
    model = 'agent-lee-code-mode'
    messages = @($Messages)
    tools = $Tools
    tool_choice = $choice
    temperature = 0
    max_tokens = 320
    stream = $false
  }

  if (-not $Chat.ok) {
    throw "VS Code Chat request failed for ${toolName}: $($Chat.error)"
  }

  $ToolCall = Get-ToolCall -Response $Chat.data
  if ($null -eq $ToolCall) {
    throw "Expected tool call for $toolName but none was returned."
  }
  if ($ToolCall.function.name -ne $toolName) {
    throw "Expected tool call $toolName but got $($ToolCall.function.name)."
  }

  $Arguments = @{}
  if ($ToolCall.function.arguments) {
    try {
      $Arguments = $ToolCall.function.arguments | ConvertFrom-Json
    } catch {
      $Arguments = @{}
    }
  }

  switch ($toolName) {
    'leeway_research_start' {
      $Arguments.objective = 'Find quality references for chess rules, chess engine concepts, 3D chess game design, themed chess sets, and WebGL/WebXR implementation patterns.'
      $Arguments.query = 'quality sources chess rules engine concepts 3D chess design themed pieces WebGL WebXR'
      $Arguments.entrySurface = 'vscode-chat'
      $Arguments.adapterEndpoint = $AdapterEndpoint
      $Result = Invoke-JsonRequest -Method POST -Url 'http://127.0.0.1:8080/agent-lee/research/start' -TimeoutSec 60 -Body $Arguments
      if ($Result.ok) {
        $ResearchId = $Result.data.session.researchId
      }
    }
    'leeway_research_search' {
      $Arguments.researchId = $ResearchId
      $Arguments.query = 'FIDE laws chess rules Stockfish official docs Three.js Babylon.js WebXR glTF Bobby Fischer'
      $Result = Invoke-JsonRequest -Method POST -Url 'http://127.0.0.1:8080/agent-lee/research/search' -TimeoutSec 300 -Body $Arguments
    }
    'leeway_research_inspect' {
      if ($ToolResults.Count -eq 0) {
        $Arguments.researchId = $ResearchId
        $Arguments.source = 'FIDE Laws of Chess'
        $Arguments.title = 'FIDE Laws of Chess'
        $Arguments.url = 'https://www.fide.com/fide/handbook.html?id=171&view=article'
        $Arguments.sourceType = 'official_doc'
        $Arguments.status = 'candidate'
        $Arguments.keyEvidence = 'Official rules define legal moves, castling, promotion, and other move constraints.'
        $Arguments.relevanceScore = 98
        $Arguments.freshnessScore = 90
      } else {
        $Arguments.researchId = $ResearchId
        $Arguments.source = 'SEO filler chess blog'
        $Arguments.title = 'SEO filler chess blog'
        $Arguments.url = 'https://example.com/filler-chess'
        $Arguments.sourceType = 'seo_filler'
        $Arguments.status = 'rejected'
        $Arguments.keyEvidence = 'Thin summary with no primary support.'
        $Arguments.relevanceScore = 10
        $Arguments.freshnessScore = 15
      }
      $Result = Invoke-JsonRequest -Method POST -Url 'http://127.0.0.1:8080/agent-lee/research/inspect' -TimeoutSec 60 -Body $Arguments
    }
    'leeway_research_curate' {
      $EvidenceId = $ToolResults | Where-Object { $_.tool -eq 'leeway_research_inspect' } | Select-Object -First 1 | ForEach-Object { $_.result.data.evidence.id }
      if (-not $EvidenceId) {
        $EvidenceId = $ToolResults | Where-Object { $_.tool -eq 'leeway_research_search' } | Select-Object -First 1 | ForEach-Object { $_.result.data.candidateEvidence.id }
      }
      $Arguments.researchId = $ResearchId
      $Arguments.evidenceId = $EvidenceId
      $Arguments.reason = 'Curate the highest quality source for the working chess proof.'
      $Result = Invoke-JsonRequest -Method POST -Url 'http://127.0.0.1:8080/agent-lee/research/curate' -TimeoutSec 60 -Body $Arguments
    }
    'leeway_research_claim_check' {
      $CuratedId = $ToolResults | Where-Object { $_.tool -eq 'leeway_research_curate' } | Select-Object -First 1 | ForEach-Object { $_.result.data.evidence.id }
      $SearchEvidenceId = $ToolResults | Where-Object { $_.tool -eq 'leeway_research_search' } | Select-Object -First 1 | ForEach-Object { $_.result.data.candidateEvidence.id }
      $RejectedId = $ToolResults | Where-Object { $_.tool -eq 'leeway_research_inspect' } | Select-Object -Last 1 | ForEach-Object { $_.result.data.evidence.id }
      $Arguments.researchId = $ResearchId
      $Arguments.claim = 'Agent Lee can curate evidence for chess research, separate rejected sources, and keep a receipt trail.'
      $Arguments.claimType = 'current fact'
      $Arguments.evidenceIds = @($SearchEvidenceId, $CuratedId, $RejectedId)
      $Arguments.counterevidence = 'Rejected SEO filler does not outrank official docs.'
      $Arguments.result = 'supported'
      $Arguments.confidence = 'high'
      $Arguments.finalWording = 'Agent Lee uses candidate, curated, and rejected evidence with claim checks.'
      $Result = Invoke-JsonRequest -Method POST -Url 'http://127.0.0.1:8080/agent-lee/research/claim-check' -TimeoutSec 60 -Body $Arguments
    }
    'leeway_research_apply_to_build' {
      $CuratedId = $ToolResults | Where-Object { $_.tool -eq 'leeway_research_curate' } | Select-Object -First 1 | ForEach-Object { $_.result.data.evidence.id }
      $Arguments.researchId = $ResearchId
      $Arguments.buildTarget = 'agent-lee-coding-mode/build-sandbox/agent-lee-3d-chess-proof'
      $Arguments.evidenceIds = @($CuratedId)
      $Arguments.reason = 'Apply curated chess evidence to the 3D proof build.'
      $Result = Invoke-JsonRequest -Method POST -Url 'http://127.0.0.1:8080/agent-lee/research/apply-to-build' -TimeoutSec 60 -Body $Arguments
    }
    'leeway_research_receipt' {
      $Arguments.researchId = $ResearchId
      $Result = Invoke-JsonRequest -Method POST -Url "http://127.0.0.1:8080/agent-lee/research/$ResearchId/receipt" -TimeoutSec 60 -Body $Arguments
      if ($Result.ok) {
        $FinalReceiptPath = $Result.data.receiptPath
      }
    }
  }

  $ToolResults += [ordered]@{
    tool = $toolName
    response = $Chat.data
    toolCall = $ToolCall
    arguments = $Arguments
    result = $Result
  }

  Add-AssistantToolMessage -Messages $Messages -ToolCall $ToolCall
  Add-ToolMessage -Messages $Messages -ToolCallId $ToolCall.id -ToolName $toolName -Result $Result

  if ($toolName -eq 'leeway_research_start') {
    $EntrySurfaceOk = $Result.ok -and [string]$Result.data.session.entrySurface -eq 'vscode-chat'
  }
}

$SummaryChat = Invoke-ChatCompletion -Body @{
  model = 'agent-lee-code-mode'
  messages = @(
    $Messages
    @{
      role = 'user'
      content = 'Summarize the research in one compact paragraph and mention the receipt path.'
    }
  )
  temperature = 0
  max_tokens = 220
  stream = $false
}

if (-not $SummaryChat.ok) {
  throw "Final summary request failed: $($SummaryChat.error)"
}

$FinalAssistantResponse = [string]$SummaryChat.data.choices[0].message.content

$ResearchStatus = Invoke-JsonRequest -Method GET -Url "http://127.0.0.1:8080/agent-lee/research/$ResearchId" -TimeoutSec 30
$Evidence = Invoke-JsonRequest -Method GET -Url "http://127.0.0.1:8080/agent-lee/research/$ResearchId/evidence" -TimeoutSec 30

$CandidateOk = $Evidence.ok -and $Evidence.data.candidateEvidence.Count -ge 1
$CuratedOk = $Evidence.ok -and $Evidence.data.curatedEvidence.Count -ge 1
$RejectedOk = $Evidence.ok -and $Evidence.data.rejectedEvidence.Count -ge 1
$ClaimOk = $Evidence.ok -and $Evidence.data.claimChecks.Count -ge 1
$ReceiptOk = $Evidence.ok -and ($ToolResults | Where-Object { $_.tool -eq 'leeway_research_receipt' }).Count -ge 1 -and -not [string]::IsNullOrWhiteSpace($FinalReceiptPath)
$FinalResponseOk = -not [string]::IsNullOrWhiteSpace($FinalAssistantResponse)

$OverallOk =
  $EntrySurfaceOk -and
  $CandidateOk -and
  $CuratedOk -and
  $RejectedOk -and
  $ClaimOk -and
  $ReceiptOk -and
  $FinalResponseOk -and
  $ResearchStatus.ok -and
  $ResearchStatus.data.researchId -eq $ResearchId

$Report = [ordered]@{
  status = $(if ($OverallOk) { 'PASS' } else { 'FAIL' })
  adapterEndpoint = $AdapterEndpoint
  researchId = $ResearchId
  entrySurface = 'vscode-chat'
  receiptPath = $FinalReceiptPath
  toolResults = $ToolResults
  finalAssistantResponse = $FinalAssistantResponse
  proof = [ordered]@{
    researchStatus = $ResearchStatus
    evidence = $Evidence
  }
  checks = [ordered]@{
    entrySurface = $EntrySurfaceOk
    candidateEvidence = $CandidateOk
    curatedEvidence = $CuratedOk
    rejectedEvidence = $RejectedOk
    claimChecks = $ClaimOk
    receipt = $ReceiptOk
    finalResponse = $FinalResponseOk
  }
}

$ReceiptPath = Join-Path $ReceiptDir "agent-lee-vscode-chat-research-e2e-$((Get-Date).ToString('yyyyMMdd-HHmmss')).json"
$Report | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $ReceiptPath -Encoding UTF8

Write-Host "`n=== Agent Lee VS Code Chat Research E2E ===" -ForegroundColor Magenta
Write-Host "Receipt: $ReceiptPath" -ForegroundColor DarkGray
Write-Host ($Report | ConvertTo-Json -Depth 6)

if ($OverallOk) {
  Write-Host 'Agent Lee VS Code Chat research E2E passed.' -ForegroundColor Green
  exit 0
}

Write-Host 'Agent Lee VS Code Chat research E2E failed.' -ForegroundColor Red
exit 1
