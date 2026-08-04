# LEEWAY_HEADER - DO NOT REMOVE
#
# ID: LEEWAY_APP::AGENT_LEE::VS_CODE_CHAT::VALIDATE_AGENT_LEE_VSCODE_CHAT
# CLASSIFICATION: VALIDATION
# OWNER: LeeWay Local Runtime Stabilization
# PURPOSE: Validate the live VS Code Agent Lee chat profile, adapter, and canonical proofs.

[CmdletBinding()]
param()

Set-StrictMode -Version Latest
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

function Invoke-JsonProbe {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][string]$Url
  )

  try {
    $response = Invoke-WebRequest -Uri $Url -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop
    $data = $null
    if ($response.Content) {
      try {
        $data = $response.Content | ConvertFrom-Json
      } catch {
        $data = $response.Content
      }
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
    return [ordered]@{
      name = $Name
      url = $Url
      reachable = $false
      statusCode = 0
      data = $null
      error = $_.Exception.Message
    }
  }
}

function Invoke-ChatRequest {
  param(
    [Parameter(Mandatory = $true)][string]$Url,
    [Parameter(Mandatory = $true)]$Body,
    [Parameter(Mandatory = $true)][bool]$Stream
  )

  $payload = $Body | ConvertTo-Json -Depth 20
  try {
    if ($Stream) {
      $response = Invoke-WebRequest -Uri $Url -Method Post -ContentType 'application/json' -Body $payload -TimeoutSec 180 -UseBasicParsing -ErrorAction Stop
      $raw = [string]$response.Content
      return [ordered]@{
        ok = ($response.StatusCode -ge 200 -and $response.StatusCode -lt 300 -and $raw -match 'data:\s*\[DONE\]')
        statusCode = [int]$response.StatusCode
        raw = $raw
        data = $null
        error = $null
      }
    }

    $response = Invoke-RestMethod -Uri $Url -Method Post -ContentType 'application/json' -Body $payload -TimeoutSec 180 -ErrorAction Stop
    return [ordered]@{
      ok = $true
      statusCode = 200
      raw = $response
      data = $response
      error = $null
    }
  } catch {
    return [ordered]@{
      ok = $false
      statusCode = 0
      raw = $null
      data = $null
      error = $_.Exception.Message
    }
  }
}

function Test-CompletionShape {
  param([Parameter(Mandatory = $true)]$Response)

  if ($null -eq $Response) { return $false }
  if (-not ($Response.PSObject.Properties.Name -contains 'choices')) { return $false }
  if (-not $Response.choices -or $Response.choices.Count -lt 1) { return $false }

  $choice = $Response.choices[0]
  if ($null -eq $choice -or $null -eq $choice.message) { return $false }
  if ($choice.finish_reason -ne 'stop' -and $choice.finish_reason -ne 'tool_calls') { return $false }

  if ($choice.message.PSObject.Properties.Name -contains 'tool_calls' -and $choice.message.tool_calls) {
    if ($choice.finish_reason -ne 'tool_calls') { return $false }
    if ($null -ne $choice.message.content -and ([string]$choice.message.content).Trim().Length -gt 0) { return $false }
    if (-not ($choice.message.tool_calls -is [System.Collections.IEnumerable])) { return $false }
    foreach ($toolCall in $choice.message.tool_calls) {
      if ($null -eq $toolCall) { return $false }
      if ($toolCall.type -ne 'function') { return $false }
      if ($null -eq $toolCall.function) { return $false }
      if ([string]::IsNullOrWhiteSpace([string]$toolCall.function.name)) { return $false }
      if (-not ($toolCall.function.arguments -is [string])) { return $false }
    }
    return $true
  }

  return ($choice.message.content -is [string] -and ([string]$choice.message.content).Trim().Length -gt 0)
}

function Test-SseStreamShape {
  param(
    [Parameter(Mandatory = $true)][string]$Raw,
    [Parameter(Mandatory = $true)][bool]$ExpectToolCalls
  )

  if ([string]::IsNullOrWhiteSpace($Raw)) { return $false }
  if ($Raw -notmatch 'data:\s*\[DONE\]') { return $false }
  if ($Raw -notmatch 'chat\.completion\.chunk') { return $false }
  if ($Raw -notmatch '"role"\s*:\s*"assistant"') { return $false }

  if ($ExpectToolCalls) {
    return ($Raw -match '"tool_calls"\s*:' -and $Raw -match '"finish_reason"\s*:\s*"tool_calls"')
  }

  return ($Raw -match '"content"\s*:' -and $Raw -match '"finish_reason"\s*:\s*"stop"')
}

function Get-ProfileReport {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$ExpectedEndpoint,
    [Parameter(Mandatory = $true)][string]$ExpectedFingerprint,
    [Parameter(Mandatory = $true)][string]$ExpectedModelId
  )

  if (-not (Test-Path -LiteralPath $Path)) {
    return [ordered]@{ file = $Path; exists = $false }
  }

  $profile = Read-JsonFile -Path $Path
  if (-not $profile) {
    return [ordered]@{ file = $Path; exists = $true; parseable = $false }
  }

  $model = $profile.models | Select-Object -First 1
  return [ordered]@{
    file = $Path
    exists = $true
    parseable = $true
    groupName = $profile.name
    vendor = $profile.vendor
    apiType = $profile.apiType
    identityFingerprint = $profile.identityFingerprint
    canonicalIdentityManifest = $profile.canonicalIdentityManifest
    canonicalUniverseManifest = $profile.canonicalUniverseManifest
    verifyCanonicalIdentity = [bool]$profile.verifyCanonicalIdentity
    modelName = $model.name
    modelId = $model.id
    modelUrl = $model.url
    toolCalling = [bool]$model.toolCalling
    vision = [bool]$model.vision
    streaming = [bool]$model.streaming
    maxInputTokens = $model.maxInputTokens
    maxOutputTokens = $model.maxOutputTokens
    matchesFingerprint = ($profile.identityFingerprint -eq $ExpectedFingerprint)
    modelMatchesEndpoint = ($model.url -eq $ExpectedEndpoint)
    modelMatchesId = ($model.id -eq $ExpectedModelId)
  }
}

function Get-SettingValue {
  param(
    [Parameter(Mandatory = $true)]$Settings,
    [Parameter(Mandatory = $true)][string]$Key
  )

  if ($null -eq $Settings) { return $null }
  if ($Settings.PSObject.Properties.Name -contains $Key) {
    return $Settings.$Key
  }
  return $null
}

function Test-SettingsReport {
  param(
    [Parameter(Mandatory = $true)]$Settings,
    [Parameter(Mandatory = $true)][string]$ExpectedModelId,
    [Parameter(Mandatory = $true)][string]$ExpectedEndpoint
  )

  if (-not $Settings) {
    return [ordered]@{ exists = $false; ok = $false }
  }

  $modelValue = $null
  $endpointValue = $null
  $fingerprintValue = $null

  if ($Settings.PSObject.Properties.Name -contains 'agentLeeCodingMode') {
    $modelValue = $Settings.agentLeeCodingMode.model
    $endpointValue = $Settings.agentLeeCodingMode.endpoint
    $fingerprintValue = $Settings.agentLeeCodingMode.identityFingerprint
  } elseif ($Settings.PSObject.Properties.Name -contains 'agentLeeCodingMode.model' -or $Settings.PSObject.Properties.Name -contains 'agentLeeCodingMode.endpoint') {
    $modelValue = Get-SettingValue -Settings $Settings -Key 'agentLeeCodingMode.model'
    $endpointValue = Get-SettingValue -Settings $Settings -Key 'agentLeeCodingMode.endpoint'
    $fingerprintValue = Get-SettingValue -Settings $Settings -Key 'agentLeeCodingMode.identityFingerprint'
  } elseif ($Settings.PSObject.Properties.Name -contains 'leeway.agentLee.byok') {
    $modelValue = $Settings.'leeway.agentLee.byok'.model
    $endpointValue = $Settings.'leeway.agentLee.byok'.baseUrl
    $fingerprintValue = $Settings.'leeway.agentLee.byok'.identityFingerprint
  } else {
    $modelValue = Get-SettingValue -Settings $Settings -Key 'model'
    $endpointValue = Get-SettingValue -Settings $Settings -Key 'baseUrl'
    $fingerprintValue = Get-SettingValue -Settings $Settings -Key 'identityFingerprint'
  }

  return [ordered]@{
    exists = $true
    model = $modelValue
    endpoint = $endpointValue
    identityFingerprint = $fingerprintValue
    ok = ($modelValue -eq $ExpectedModelId -and $endpointValue -eq $ExpectedEndpoint -and $fingerprintValue -eq 'leeway.agent-lee.code-mode.canonical.supreme-agent-lead.v1')
  }
}

function Test-RendererSafeResponse {
  param([Parameter(Mandatory = $true)]$Response)
  return Test-CompletionShape -Response $Response
}

function Test-ToolResultRoundtrip {
  param(
    [Parameter(Mandatory = $true)][string]$Url,
    [Parameter(Mandatory = $true)]$ToolCallResponse
  )

  $toolCall = $ToolCallResponse.choices[0].message.tool_calls[0]
  $followUpBody = @{
    model = 'agent-lee-code-mode'
    messages = @(
      @{
        role = 'user'
        content = 'Use the tool result and answer in one sentence.'
      },
      @{
        role = 'assistant'
        content = $null
        tool_calls = @(
          @{
            id = $toolCall.id
            type = 'function'
            function = @{
              name = $toolCall.function.name
              arguments = $toolCall.function.arguments
            }
          }
        )
      },
      @{
        role = 'tool'
        tool_call_id = $toolCall.id
        name = $toolCall.function.name
        content = '{"ok":true,"summary":"canonical tool result"}'
      }
    )
    temperature = 0
    max_tokens = 128
    stream = $false
  }

  $response = Invoke-ChatRequest -Url $Url -Body $followUpBody -Stream:$false
  if (-not $response.ok) {
    return [ordered]@{
      ok = $false
      statusCode = $response.statusCode
      error = $response.error
      response = $null
    }
  }

  $shapeOk = Test-CompletionShape -Response $response.data
  $content = [string]$response.data.choices[0].message.content
  return [ordered]@{
    ok = ($shapeOk -and -not [string]::IsNullOrWhiteSpace($content) -and (-not ($response.data.choices[0].message.PSObject.Properties.Name -contains 'tool_calls')))
    statusCode = $response.statusCode
    response = $response.data
    content = $content
  }
}

$WorkspaceRoot = Resolve-WorkspaceRoot
$ExpectedFingerprint = 'leeway.agent-lee.code-mode.canonical.supreme-agent-lead.v1'
$ExpectedModelId = 'agent-lee-code-mode'
$ExpectedEndpoint = 'http://127.0.0.1:8787/v1/chat/completions'
$AdapterHealthUrl = 'http://127.0.0.1:8787/health'
$RouterIdentityUrl = 'http://127.0.0.1:8080/agent-lee/identity'
$RouterUniverseUrl = 'http://127.0.0.1:8080/agent-lee/universe'
$WorkspaceSettingsPath = Join-Path $WorkspaceRoot '.vscode\settings.json'
$CodeModeSettingsPath = Join-Path $WorkspaceRoot 'agent-lee-coding-mode\.vscode\settings.json'
$CandidateSettingsPath = Join-Path $WorkspaceRoot '.vscode\agent-lee-byok-candidate-settings.json'
$PrimaryProfilePath = Join-Path $WorkspaceRoot '.vscode\chatLanguageModels.agent-lee.adapter.json'
$ProfilePaths = @(
  (Join-Path $WorkspaceRoot '.vscode\chatLanguageModels.agent-lee.adapter.json'),
  (Join-Path $WorkspaceRoot '.vscode\chatLanguageModels.agent-lee.candidate.json'),
  (Join-Path $WorkspaceRoot '.vscode\chatLanguageModels.agent-lee.fast-direct.json'),
  (Join-Path $WorkspaceRoot '.vscode\chatLanguageModels.agent-lee.full-fabric.json'),
  (Join-Path $WorkspaceRoot '.vscode\chatLanguageModels.agent-lee.turbo-local.json')
)
$SettingsPaths = @(
  $WorkspaceSettingsPath,
  $CodeModeSettingsPath,
  $CandidateSettingsPath
)

$Profiles = @()
foreach ($path in $ProfilePaths) {
  $Profiles += Get-ProfileReport -Path $path -ExpectedEndpoint $ExpectedEndpoint -ExpectedFingerprint $ExpectedFingerprint -ExpectedModelId $ExpectedModelId
}

$SettingsReports = @()
foreach ($path in $SettingsPaths) {
  $expectedSettingsEndpoint = $ExpectedEndpoint
  if ($path -ne $CodeModeSettingsPath) {
    $expectedSettingsEndpoint = 'http://127.0.0.1:8787/v1'
  }
  $SettingsReports += [ordered]@{
    file = $path
    report = Test-SettingsReport -Settings (Read-JsonFile -Path $path) -ExpectedModelId $ExpectedModelId -ExpectedEndpoint $expectedSettingsEndpoint
  }
}

$AdapterHealth = Invoke-JsonProbe -Name 'Adapter Health' -Url $AdapterHealthUrl
$RouterIdentity = Invoke-JsonProbe -Name 'Router Identity' -Url $RouterIdentityUrl
$RouterUniverse = Invoke-JsonProbe -Name 'Router Universe' -Url $RouterUniverseUrl

$RouterFingerprint = $null
if ($RouterIdentity.reachable) {
  $RouterFingerprint = $RouterIdentity.data.identityFingerprint
  if (-not $RouterFingerprint -and $RouterIdentity.data.canonicalProof) {
    $RouterFingerprint = $RouterIdentity.data.canonicalProof.expectedIdentityFingerprint
  }
}

$UniverseHarnessVisible = $false
if ($RouterUniverse.reachable -and $RouterUniverse.data -and $RouterUniverse.data.universe -and $RouterUniverse.data.universe.statefulResearchHarnessCopies) {
  $UniverseHarnessVisible = [bool]$RouterUniverse.data.universe.statefulResearchHarnessCopies.activeCopy
}

$MainProfile = $Profiles | Where-Object { $_.file -eq $PrimaryProfilePath } | Select-Object -First 1
$ActiveProfilesPass = $true
foreach ($profile in $Profiles) {
  if (-not $profile.exists -or -not $profile.parseable -or -not $profile.matchesFingerprint -or -not $profile.verifyCanonicalIdentity -or -not $profile.modelMatchesEndpoint -or -not $profile.modelMatchesId -or -not $profile.toolCalling -or $profile.vision) {
    $ActiveProfilesPass = $false
  }
}

$SettingsPass = $true
foreach ($entry in $SettingsReports) {
  if (-not $entry.report.ok) {
    $SettingsPass = $false
  }
}

$IdentityPass = $RouterIdentity.reachable -and ($RouterFingerprint -eq $ExpectedFingerprint)
$UniversePass = $RouterUniverse.reachable -and $UniverseHarnessVisible
$AdapterPass = $AdapterHealth.reachable -and ($AdapterHealth.data.model -eq $ExpectedModelId)

$PlainChatRequest = @{
  model = $ExpectedModelId
  messages = @(
    @{
      role = 'user'
      content = 'Hello Agent Lee. Reply with one concise sentence.'
    }
  )
  temperature = 0
  max_tokens = 128
  stream = $false
}
$PlainChat = Invoke-ChatRequest -Url $ExpectedEndpoint -Body $PlainChatRequest -Stream:$false

$StreamingChatRequest = @{
  model = $ExpectedModelId
  messages = @(
    @{
      role = 'user'
      content = 'Hello Agent Lee. Reply with one concise sentence.'
    }
  )
  temperature = 0
  max_tokens = 128
  stream = $true
}
$StreamingChat = Invoke-ChatRequest -Url $ExpectedEndpoint -Body $StreamingChatRequest -Stream:$true

$ToolChoiceRequest = @{
  model = $ExpectedModelId
  messages = @(
    @{
      role = 'user'
      content = 'Use your tool and report the canonical status.'
    }
  )
  tools = @(
    @{
      type = 'function'
      function = @{
        name = 'leeway_status'
        description = 'Return Leeway Agent Lee canonical status.'
        parameters = @{
          type = 'object'
          properties = @{}
          additionalProperties = $false
        }
      }
    }
  )
  tool_choice = 'required'
  temperature = 0
  max_tokens = 128
  stream = $false
}
$ToolCall = Invoke-ChatRequest -Url $ExpectedEndpoint -Body $ToolChoiceRequest -Stream:$false
$ToolCallShapePass = $ToolCall.ok -and (Test-CompletionShape -Response $ToolCall.data) -and $ToolCall.data.choices[0].finish_reason -eq 'tool_calls'

$ToolRoundtrip = $null
if ($ToolCallShapePass) {
  $ToolRoundtrip = Test-ToolResultRoundtrip -Url $ExpectedEndpoint -ToolCallResponse $ToolCall.data
}

$RendererSafetyPass = $PlainChat.ok -and (Test-RendererSafeResponse -Response $PlainChat.data) -and $ToolCallShapePass -and (Test-RendererSafeResponse -Response $ToolCall.data)
$PlainChatPass = $PlainChat.ok -and (Test-CompletionShape -Response $PlainChat.data)
$StreamingChatPass = $StreamingChat.ok -and (Test-SseStreamShape -Raw $StreamingChat.raw -ExpectToolCalls:$false)
$ToolRoundtripPass = $null -ne $ToolRoundtrip -and $ToolRoundtrip.ok -and (Test-RendererSafeResponse -Response $ToolRoundtrip.response)
$VisionValue = $null
if ($MainProfile) {
  $VisionValue = $MainProfile.vision
}
$VisionPass = ($VisionValue -eq $false)

$StaleConfigs = @()
foreach ($profile in $Profiles) {
  if (-not $profile.modelMatchesId -or -not $profile.modelMatchesEndpoint) {
    $StaleConfigs += $profile.file
  }
}
foreach ($entry in $SettingsReports) {
  if (-not $entry.report.ok) {
    $StaleConfigs += $entry.file
  }
}

$OverallPass =
  $ActiveProfilesPass -and
  $SettingsPass -and
  $IdentityPass -and
  $UniversePass -and
  $AdapterPass -and
  $PlainChatPass -and
  $StreamingChatPass -and
  $ToolCallShapePass -and
  $ToolRoundtripPass -and
  $RendererSafetyPass -and
  $VisionPass -and
  ($StaleConfigs.Count -eq 0)

$Report = [ordered]@{
  status = $(if ($OverallPass) { 'PASS' } else { 'FAIL' })
  configPath = $PrimaryProfilePath
  checkedConfigPaths = $ProfilePaths
  modelId = $ExpectedModelId
  toolCalling = [bool]$MainProfile.toolCalling
  vision = $VisionValue
  chatEndpoint = $ExpectedEndpoint
  identityProof = [ordered]@{
    reachable = $RouterIdentity.reachable
    fingerprint = $RouterFingerprint
    matches = $IdentityPass
  }
  universeProof = [ordered]@{
    reachable = $RouterUniverse.reachable
    statefulResearchHarnessVisible = $UniverseHarnessVisible
    matches = $UniversePass
  }
  adapterHealth = $AdapterHealth
  mainProfile = $MainProfile
  profileReports = $Profiles
  settingsReports = $SettingsReports
  plainChatResult = $PlainChat
  streamingChatResult = $StreamingChat
  toolCallResult = $ToolCall
  toolResultRoundtrip = $ToolRoundtrip
  rendererSafetyResult = [ordered]@{
    pass = $RendererSafetyPass
    plainChatSafe = (Test-RendererSafeResponse -Response $PlainChat.data)
    toolCallSafe = (Test-RendererSafeResponse -Response $ToolCall.data)
  }
  staleConfigs = $StaleConfigs
  manualReloadStep = 'Developer: Reload Window, then reopen Chat and reselect Leeway Agent Lee / Agent Lee Turbo.'
}

Write-Host "PASS/FAIL: $($Report.status)"
Write-Host "Config path: $($Report.configPath)"
Write-Host "Model id: $($Report.modelId)"
Write-Host "toolCalling: $($Report.toolCalling)"
Write-Host "vision: $($Report.vision)"
Write-Host "Chat endpoint: $($Report.chatEndpoint)"
Write-Host "Identity proof: $($Report.identityProof | ConvertTo-Json -Depth 6)"
Write-Host "Universe proof: $($Report.universeProof | ConvertTo-Json -Depth 6)"
Write-Host "Plain chat result: $($PlainChat | ConvertTo-Json -Depth 8)"
Write-Host "Streaming chat result: $($StreamingChat | ConvertTo-Json -Depth 8)"
Write-Host "Tool-call result: $($ToolCall | ConvertTo-Json -Depth 8)"
Write-Host "Tool-result roundtrip result: $($ToolRoundtrip | ConvertTo-Json -Depth 8)"
Write-Host "Renderer safety result: $($Report.rendererSafetyResult | ConvertTo-Json -Depth 6)"
Write-Host "Manual VS Code reload step: $($Report.manualReloadStep)"
Write-Host ($Report | ConvertTo-Json -Depth 12)

if (-not $OverallPass) {
  exit 1
}

exit 0
