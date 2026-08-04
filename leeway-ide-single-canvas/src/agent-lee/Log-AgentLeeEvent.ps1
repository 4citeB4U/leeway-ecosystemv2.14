<#
LEEWAY_HEADER - DO NOT REMOVE

REGION: CORE
TAG: CORE.AGENT_LEE.LOG_AGENTLEEEVENT
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
#>

param(
  [string]$Type = "info",
  [string]$Agent = "agent-lee",
  [string]$Message = "",
  [string]$Details = ""
)

$Root = "$HOME\.leeway-vscode"
$Date = Get-Date -Format "yyyy-MM-dd"
$Timestamp = Get-Date -Format "o"

$LogDir = "$Root\logs\daily"
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

$Entry = [PSCustomObject]@{
  timestamp = $Timestamp
  type = $Type
  agent = $Agent
  message = $Message
  details = $Details
}

$Line = $Entry | ConvertTo-Json -Compress
Add-Content "$LogDir\agent-lee-$Date.jsonl" $Line
Add-Content "$Root\memory\db\agent-lee-memory.jsonl" $Line

