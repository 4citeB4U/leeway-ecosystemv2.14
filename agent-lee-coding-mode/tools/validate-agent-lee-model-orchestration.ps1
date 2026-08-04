# LEEWAY_HEADER - DO NOT REMOVE
#
# ID: LEEWAY_APP::AGENT_LEE::MODEL_ORCHESTRATION::VALIDATE_AGENT_LEE_MODEL_ORCHESTRATION
# CLASSIFICATION: VALIDATION
# OWNER: LeeWay Local Runtime Stabilization
# PURPOSE: Prove model pool classification, model warm routing, task-type routing, queue depth, and overload receipts.

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

$Models = Invoke-JsonRequest -Method GET -Url "$RouterBase/agent-lee/models" -TimeoutSec 30
$WarmConversation = Invoke-JsonRequest -Method POST -Url "$RouterBase/agent-lee/models/warm" -TimeoutSec 240 -Body @{
  role = 'light_conversation_model'
  prompt = 'Warm the conversation model and prove the model pool can be probed.'
}
$WarmCoding = Invoke-JsonRequest -Method POST -Url "$RouterBase/agent-lee/models/warm" -TimeoutSec 240 -Body @{
  role = 'coding_model'
  prompt = 'Warm the coding model and prove the model pool can be probed.'
}
$WarmResearch = Invoke-JsonRequest -Method POST -Url "$RouterBase/agent-lee/models/warm" -TimeoutSec 240 -Body @{
  role = 'research_reasoning_model'
  prompt = 'Warm the research model and prove the model pool can be probed.'
}

$RouteConversation = Invoke-JsonRequest -Method POST -Url "$RouterBase/agent-lee/models/route" -TimeoutSec 240 -Body @{
  taskType = 'conversation'
  prompt = 'Route a conversation task.'
  probe = $true
}
$RouteCoding = Invoke-JsonRequest -Method POST -Url "$RouterBase/agent-lee/models/route" -TimeoutSec 240 -Body @{
  taskType = 'coding'
  prompt = 'Route a coding task.'
  probe = $true
}
$RouteResearch = Invoke-JsonRequest -Method POST -Url "$RouterBase/agent-lee/models/route" -TimeoutSec 240 -Body @{
  taskType = 'research'
  prompt = 'Route a browser research task.'
  probe = $true
}
$RouteCreative = Invoke-JsonRequest -Method POST -Url "$RouterBase/agent-lee/models/route" -TimeoutSec 240 -Body @{
  taskType = '3d'
  prompt = 'Route a 3D/AR task.'
  probe = $true
}
$RouteVision = Invoke-JsonRequest -Method POST -Url "$RouterBase/agent-lee/models/route" -TimeoutSec 240 -Body @{
  taskType = 'vision'
  prompt = 'Route an image analysis task.'
  probe = $true
}

$Lane1 = Invoke-JsonRequest -Method POST -Url "$RouterBase/agent-lee/lanes/start" -TimeoutSec 30 -Body @{
  kind = 'coding'
  title = 'Coding lane 1'
  task = 'Coding lane 1 proof'
  durationMs = 12000
}
$Lane2 = Invoke-JsonRequest -Method POST -Url "$RouterBase/agent-lee/lanes/start" -TimeoutSec 30 -Body @{
  kind = 'coding'
  title = 'Coding lane 2'
  task = 'Coding lane 2 proof'
  durationMs = 12000
}
$Lane3 = Invoke-JsonRequest -Method POST -Url "$RouterBase/agent-lee/lanes/start" -TimeoutSec 30 -Body @{
  kind = 'coding'
  title = 'Coding lane 3'
  task = 'Coding lane 3 proof'
  durationMs = 12000
}
$Lane4 = Invoke-JsonRequest -Method POST -Url "$RouterBase/agent-lee/lanes/start" -TimeoutSec 30 -Body @{
  kind = 'coding'
  title = 'Coding lane 4'
  task = 'Coding lane 4 proof'
  durationMs = 12000
}
$Lane5 = Invoke-JsonRequest -Method POST -Url "$RouterBase/agent-lee/lanes/start" -TimeoutSec 30 -Body @{
  kind = 'coding'
  title = 'Coding lane 5'
  task = 'Coding lane 5 overload proof'
  durationMs = 12000
}

Start-Sleep -Seconds 2
$Lane1Status = Invoke-JsonRequest -Method GET -Url "$RouterBase/agent-lee/lanes/$($Lane1.data.lane.laneId)" -TimeoutSec 30
$Lane2Status = Invoke-JsonRequest -Method GET -Url "$RouterBase/agent-lee/lanes/$($Lane2.data.lane.laneId)" -TimeoutSec 30
$Lane3Status = Invoke-JsonRequest -Method GET -Url "$RouterBase/agent-lee/lanes/$($Lane3.data.lane.laneId)" -TimeoutSec 30
$Lane4Status = Invoke-JsonRequest -Method GET -Url "$RouterBase/agent-lee/lanes/$($Lane4.data.lane.laneId)" -TimeoutSec 30
$Lane5Status = Invoke-JsonRequest -Method GET -Url "$RouterBase/agent-lee/lanes/$($Lane5.data.lane.laneId)" -TimeoutSec 30

$ModelsOk = $Models.ok -and $Models.statusCode -eq 200 -and ($Models.data.roles.Count -ge 5)
$WarmStatusesOk = @($WarmConversation, $WarmCoding, $WarmResearch) | ForEach-Object { $_.ok -and $_.statusCode -eq 200 -and [string]$_.data.status -in @('RUNNING','WARM','SEMI_WARM') } | Where-Object { $_ -eq $false } | Measure-Object | Select-Object -ExpandProperty Count
$RoutesOk = @($RouteConversation, $RouteCoding, $RouteResearch, $RouteCreative, $RouteVision) | ForEach-Object { $_.ok -and $_.statusCode -eq 200 -and -not [string]::IsNullOrWhiteSpace([string]$_.data.roleId) } | Where-Object { $_ -eq $false } | Measure-Object | Select-Object -ExpandProperty Count
$QueueOk = $Lane5.ok -and $Lane5.statusCode -eq 200 -and [string]$Lane5.data.lane.status -eq 'QUEUED'
$LaneCountOk = ($Lane1Status.ok -and $Lane2Status.ok -and $Lane3Status.ok -and $Lane4Status.ok -and $Lane5Status.ok)
$CodingActiveOk = @($Lane1Status, $Lane2Status, $Lane3Status, $Lane4Status) | ForEach-Object { [string]$_.data.lane.status -in @('RUNNING','WAITING_ON_TOOL','WAITING_ON_MODEL','WAITING_ON_CONFIRMATION','VALIDATING','QUEUED') } | Where-Object { $_ -eq $false } | Measure-Object | Select-Object -ExpandProperty Count
$OverloadReasonOk = -not [string]::IsNullOrWhiteSpace([string]$Lane5.data.lane.queueReason)

$OverallOk = $ModelsOk -and $WarmStatusesOk -eq 0 -and $RoutesOk -eq 0 -and $QueueOk -and $LaneCountOk -and $CodingActiveOk -eq 0 -and $OverloadReasonOk

$Receipt = [ordered]@{
  status = $(if ($OverallOk) { 'PASS' } else { 'FAIL' })
  workspaceRoot = $WorkspaceRoot
  routerBase = $RouterBase
  timestamp = (Get-Date).ToString('o')
  models = $Models
  warms = [ordered]@{
    conversation = $WarmConversation
    coding = $WarmCoding
    research = $WarmResearch
  }
  routes = [ordered]@{
    conversation = $RouteConversation
    coding = $RouteCoding
    research = $RouteResearch
    creative = $RouteCreative
    vision = $RouteVision
  }
  lanes = [ordered]@{
    lane1 = $Lane1
    lane2 = $Lane2
    lane3 = $Lane3
    lane4 = $Lane4
    lane5 = $Lane5
    lane1Status = $Lane1Status
    lane2Status = $Lane2Status
    lane3Status = $Lane3Status
    lane4Status = $Lane4Status
    lane5Status = $Lane5Status
  }
  checks = [ordered]@{
    models = $ModelsOk
    warms = ($WarmStatusesOk -eq 0)
    routes = ($RoutesOk -eq 0)
    queue = $QueueOk
    laneCount = $LaneCountOk
    codingActive = ($CodingActiveOk -eq 0)
    overloadReason = $OverloadReasonOk
  }
  finalStatus = $(if ($OverallOk) { 'AGENT_LEE_ORCHESTRATION_LOCKED' } else { 'AGENT_LEE_ORCHESTRATION_PARTIAL' })
}

$ReceiptPath = Join-Path $ReceiptDir "agent-lee-model-orchestration-$Stamp.json"
$Receipt | ConvertTo-Json -Depth 18 | Set-Content -LiteralPath $ReceiptPath -Encoding UTF8

Write-Host "`n=== Agent Lee Model Orchestration Proof ===" -ForegroundColor Magenta
Write-Host "Receipt: $ReceiptPath" -ForegroundColor DarkGray
Write-Host ($Receipt | ConvertTo-Json -Depth 6)

if ($OverallOk) {
  Write-Host 'Agent Lee model orchestration proof passed.' -ForegroundColor Green
  exit 0
}

Write-Host 'Agent Lee model orchestration proof failed.' -ForegroundColor Red
exit 1
