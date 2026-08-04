# LEEWAY_HEADER - DO NOT REMOVE
#
# ID: LEEWAY_APP::AGENT_LEE::FULL_CAPABILITY::VALIDATE_AGENT_LEE_FULL_CAPABILITY
# CLASSIFICATION: VALIDATION
# OWNER: LeeWay Local Runtime Stabilization
# PURPOSE: Validate the canonical full capability surface for Agent Lee, including new Runtime Fabric capability status routes and adapter tool names.

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
    $response = Invoke-WebRequest -Uri $Url -TimeoutSec 12 -UseBasicParsing -ErrorAction Stop
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

function Invoke-ChatRequest {
  param(
    [Parameter(Mandatory = $true)][string]$Url,
    [Parameter(Mandatory = $true)]$Body
  )

  $payload = $Body | ConvertTo-Json -Depth 24
  try {
    $response = Invoke-RestMethod -Uri $Url -Method Post -ContentType 'application/json' -Body $payload -TimeoutSec 180 -ErrorAction Stop
    return [ordered]@{
      ok = $true
      statusCode = 200
      data = $response
      raw = $response
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
      raw = $body
      error = $_.Exception.Message
    }
  }
}

function Invoke-VisionGuardProbe {
  param(
    [Parameter(Mandatory = $true)][string]$Url,
    [Parameter(Mandatory = $true)]$Body
  )

  $payload = $Body | ConvertTo-Json -Depth 24
  $tempPath = Join-Path $env:TEMP "agent-lee-vision-guard-$([Guid]::NewGuid().ToString('N')).json"
  [System.IO.File]::WriteAllText($tempPath, $payload, (New-Object System.Text.UTF8Encoding($false)))

  try {
    $raw = (& curl.exe -i -s -X POST $Url -H 'Content-Type: application/json' --data-binary "@$tempPath") -join "`n"
    $statusMatch = [regex]::Match([string]$raw, 'HTTP/\S+\s+(\d{3})')
    $statusCode = 0
    if ($statusMatch.Success) {
      $statusCode = [int]$statusMatch.Groups[1].Value
    }

    $bodyText = ''
    $split = [regex]::Split([string]$raw, '\r?\n\r?\n', 2)
    if ($split.Count -gt 1) {
      $bodyText = $split[1]
    }

    $data = $null
    if ($bodyText) {
      try { $data = $bodyText | ConvertFrom-Json } catch { $data = $bodyText }
    }

    return [ordered]@{
      ok = ($statusCode -ge 200 -and $statusCode -lt 300)
      statusCode = $statusCode
      data = $data
      raw = $raw
      error = $null
    }
  } finally {
    Remove-Item -LiteralPath $tempPath -ErrorAction SilentlyContinue
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

function Test-ToolCallResponse {
  param(
    [Parameter(Mandatory = $true)][string]$ToolName,
    [Parameter(Mandatory = $true)]$Response
  )

  if (-not (Test-CompletionShape -Response $Response)) {
    return $false
  }

  $choice = $Response.choices[0]
  if ($choice.finish_reason -ne 'tool_calls') {
    return $false
  }

  if (-not ($choice.message.PSObject.Properties.Name -contains 'tool_calls')) {
    return $false
  }

  $toolCall = $choice.message.tool_calls | Select-Object -First 1
  if ($null -eq $toolCall) { return $false }
  return ($toolCall.function.name -eq $ToolName)
}

function Test-VisionErrorResponse {
  param([Parameter(Mandatory = $true)]$Response)

  if ($null -eq $Response) { return $false }
  if ($Response.PSObject.Properties.Name -contains 'error') {
    return ($Response.error.code -eq 'AGENT_LEE_VISION_BACKEND_MISSING' -and $Response.error.details.visionEnabled -eq $false)
  }
  return $false
}

function Test-ManifestContains {
  param(
    [Parameter(Mandatory = $true)]$Manifest,
    [Parameter(Mandatory = $true)][string]$Section,
    [Parameter(Mandatory = $true)][string[]]$ExpectedRelativePaths
  )

  $entries = @()
  if ($Manifest -and $Manifest.PSObject.Properties.Name -contains 'searchPaths' -and $Manifest.searchPaths.PSObject.Properties.Name -contains $Section) {
    $entries = @($Manifest.searchPaths.$Section)
  }

  $actual = @()
  foreach ($entry in $entries) {
    if ($entry -and $entry.PSObject.Properties.Name -contains 'relative' -and $entry.relative) {
      $actual += [string]$entry.relative
    }
  }

  $missing = @()
  foreach ($expected in $ExpectedRelativePaths) {
    if (-not ($actual -contains $expected)) {
      $missing += $expected
    }
  }

  return [ordered]@{
    ok = ($missing.Count -eq 0)
    actual = $actual
    missing = $missing
  }
}

$WorkspaceRoot = Resolve-WorkspaceRoot
$ExpectedFingerprint = 'leeway.agent-lee.code-mode.canonical.supreme-agent-lead.v1'
$ExpectedModelId = 'agent-lee-code-mode'
$ExpectedEndpoint = 'http://127.0.0.1:8787/v1/chat/completions'
$AdapterBase = 'http://127.0.0.1:8787'
$RuntimeBase = 'http://127.0.0.1:4001'
$ReceiptDir = Join-Path $WorkspaceRoot 'Archive\receipts'
New-Item -ItemType Directory -Force -Path $ReceiptDir | Out-Null

$ManifestPath = Join-Path $WorkspaceRoot 'Leeway Runtime Fabric\capability-registry\registry\leeway-universe.manifest.json'
$ProfilePath = Join-Path $WorkspaceRoot '.vscode\chatLanguageModels.agent-lee.adapter.json'

$Manifest = Read-JsonFile -Path $ManifestPath
$Profile = Read-JsonFile -Path $ProfilePath

$ManifestCapabilityCheck = Test-ManifestContains -Manifest $Manifest -Section 'capabilities' -ExpectedRelativePaths @(
  'Leeway Runtime Fabric/capability-registry',
  'Leeway Runtime Fabric/capability-augmentation',
  'Leeway Runtime Fabric/provider-fabric',
  'Leeway Runtime Fabric/automation-runtime',
  'Leeway Runtime Fabric/deployment-ownership-runtime',
  'Leeway Runtime Fabric/ledger',
  'Leeway Runtime Fabric/risk',
  'Leeway Runtime Fabric/device-intelligence',
  'Leeway Runtime Fabric/device-os',
  'Leeway Runtime Fabric/hardware-intelligence',
  'Leeway Runtime Fabric/iot-os',
  'Leeway Runtime Fabric/real-world-hardware',
  'Leeway Runtime Fabric/real-device-hardening',
  'Leeway Runtime Fabric/robotics-runtime',
  'Leeway Runtime Fabric/physical-intelligence-engine',
  'Leeway Runtime Fabric/sim-runtime',
  'Leeway Runtime Fabric/simulations',
  'Leeway Runtime Fabric/multimodal-runtime',
  'Leeway Runtime Fabric/human-voice-platform',
  'Leeway Runtime Fabric/vision-os',
  'Leeway Runtime Fabric/model-gateway',
  'Leeway Runtime Fabric/model-execution-runtime',
  'Leeway Runtime Fabric/enterprise-proof',
  'Leeway Runtime Fabric/production-proof'
)

$ManifestBenchmarkCheck = Test-ManifestContains -Manifest $Manifest -Section 'benchmarks' -ExpectedRelativePaths @(
  'leeway-80-bench',
  'leeway-80-bench/skills',
  'Leeway Runtime Fabric/standards/skills-university/benchmarks/leeway-80-bench'
)

$Routes = [ordered]@{
  full = "$RuntimeBase/agent-lee/capabilities/full"
  vision = "$RuntimeBase/agent-lee/capabilities/vision"
  iot = "$RuntimeBase/agent-lee/capabilities/iot"
  devices = "$RuntimeBase/agent-lee/capabilities/devices"
  hardware = "$RuntimeBase/agent-lee/capabilities/hardware"
  robotics = "$RuntimeBase/agent-lee/capabilities/robotics"
  automation = "$RuntimeBase/agent-lee/capabilities/automation"
  deployment = "$RuntimeBase/agent-lee/capabilities/deployment"
  proof = "$RuntimeBase/agent-lee/capabilities/proof"
  benchmarks = "$RuntimeBase/agent-lee/capabilities/benchmarks"
  registry = "$RuntimeBase/agent-lee/capabilities/registry"
  skillsGateway = "$RuntimeBase/skills-gateway/status"
}

$RouteResults = @{}
foreach ($entry in $Routes.GetEnumerator()) {
  $RouteResults[$entry.Key] = Invoke-JsonProbe -Name $entry.Key -Url $entry.Value
}

$FullRoute = $RouteResults.full
$VisionRoute = $RouteResults.vision
$SkillsGatewayRoute = $RouteResults.skillsGateway

$ToolNames = @(
  'leeway_identity',
  'leeway_universe',
  'leeway_skill_status',
  'leeway_runtime_health',
  'leeway_capability_registry',
  'leeway_skills_gateway',
  'leeway_vision_status',
  'leeway_iot_status',
  'leeway_device_status',
  'leeway_hardware_status',
  'leeway_robotics_status',
  'leeway_automation_status',
  'leeway_deployment_status',
  'leeway_proof_status',
  'leeway_benchmark_status',
  'leeway_full_capability_status'
)

$ToolCallResults = @()
foreach ($toolName in $ToolNames) {
  $body = @{
    model = $ExpectedModelId
    messages = @(
      @{
        role = 'user'
        content = "Call $toolName and return the canonical status."
      }
    )
    tools = @(
      @{
        type = 'function'
        function = @{
          name = $toolName
          description = "Validate $toolName"
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

  $response = Invoke-ChatRequest -Url $ExpectedEndpoint -Body $body
  $ToolCallResults += [ordered]@{
    tool = $toolName
    ok = ($response.ok -and (Test-ToolCallResponse -ToolName $toolName -Response $response.data))
    statusCode = $response.statusCode
    response = $response.data
  }
}

$PlainVisionRequest = @{
  model = $ExpectedModelId
  messages = @(
    @{
      role = 'user'
      content = @(
        @{ type = 'text'; text = 'Describe this image in one short sentence.' },
        @{ type = 'image_url'; image_url = @{ url = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB' } }
      )
    }
  )
  temperature = 0
  max_tokens = 64
  stream = $false
}
$VisionErrorResponse = Invoke-VisionGuardProbe -Url $ExpectedEndpoint -Body $PlainVisionRequest

$ProfileOk = $false
if ($Profile) {
  $profileModel = $Profile.models | Select-Object -First 1
  $ProfileOk = (
    $Profile.identityFingerprint -eq $ExpectedFingerprint -and
    $profileModel.id -eq $ExpectedModelId -and
    $profileModel.url -eq $ExpectedEndpoint -and
    [bool]$profileModel.toolCalling -eq $true -and
    [bool]$profileModel.vision -eq $false
  )
}

$FullOk = $FullRoute.reachable -and $FullRoute.data.status -eq 'FULL_CAPABILITY_WORKING_EXCEPT_VISION_BACKEND'
$VisionOk = $VisionRoute.reachable -and $VisionRoute.data.backendAvailable -eq $false -and [string]$VisionRoute.data.missingBackendReason
$SkillsGatewayOk = $SkillsGatewayRoute.reachable -and $SkillsGatewayRoute.data.status -eq 'PASS' -and $SkillsGatewayRoute.data.routeCount -ge 2
$ManifestOk = $ManifestCapabilityCheck.ok -and $ManifestBenchmarkCheck.ok
$ToolRegistryOk = (@($ToolCallResults | Where-Object { -not $_.ok })).Count -eq 0
$VisionGuardOk = $VisionErrorResponse.statusCode -eq 400 -and (Test-VisionErrorResponse -Response $VisionErrorResponse.data)

$OverallPass = $ProfileOk -and $FullOk -and $VisionOk -and $SkillsGatewayOk -and $ManifestOk -and $ToolRegistryOk -and $VisionGuardOk

$Report = [ordered]@{
  status = $(if ($OverallPass) { 'PASS' } else { 'FAIL' })
  workspaceRoot = $WorkspaceRoot
  fingerprint = $ExpectedFingerprint
  modelId = $ExpectedModelId
  endpoint = $ExpectedEndpoint
  profile = [ordered]@{
    path = $ProfilePath
    ok = $ProfileOk
    data = $Profile
  }
  manifest = [ordered]@{
    path = $ManifestPath
    capabilities = $ManifestCapabilityCheck
    benchmarks = $ManifestBenchmarkCheck
  }
  routes = $RouteResults
  toolCalls = $ToolCallResults
  visionGuard = [ordered]@{
    ok = $VisionGuardOk
    response = $VisionErrorResponse
  }
  fullCapability = $FullRoute
}

$ReceiptStamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$ReceiptPath = Join-Path $ReceiptDir "agent-lee-full-capability-$ReceiptStamp.json"
$Report | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath $ReceiptPath -Encoding UTF8

Write-Host "`n=== Agent Lee Full Capability Validation ===" -ForegroundColor Magenta
Write-Host "Receipt: $ReceiptPath" -ForegroundColor DarkGray
Write-Host ($Report | ConvertTo-Json -Depth 6)

if ($OverallPass) {
  Write-Host 'Agent Lee full capability validation passed.' -ForegroundColor Green
  exit 0
}

Write-Host 'Agent Lee full capability validation failed.' -ForegroundColor Red
exit 1
