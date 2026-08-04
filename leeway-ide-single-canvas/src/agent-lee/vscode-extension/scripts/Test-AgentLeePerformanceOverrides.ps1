<#
LEEWAY_HEADER - DO NOT REMOVE

REGION: 🟠 UTIL
TAG: UTIL.SCRIPT.PERFORMANCE.TEST
DISCOVERY_PIPELINE:
  Voice → Intent → Location → Vertical → Ranking → Render
#>

param(
  [string]$BaseUrl = "http://127.0.0.1:7671",
  [switch]$RunCompile
)

$ErrorActionPreference = "Stop"

function Write-Step {
  param([string]$Message)
  Write-Host "[Agent Lee Test] $Message"
}

function Get-Json {
  param([string]$Uri)
  Invoke-RestMethod -Uri $Uri -Method GET
}

function Send-Transcript {
  param([string]$Text)
  Invoke-RestMethod -Uri "$BaseUrl/transcript" -Method POST -ContentType "application/json" -Body (@{ text = $Text } | ConvertTo-Json -Compress)
}

function Assert-True {
  param(
    [bool]$Condition,
    [string]$Message
  )

  if (-not $Condition) {
    throw "ASSERT FAILED: $Message"
  }
}

Write-Step "Checking transcript bridge health."
$health = Get-Json -Uri "$BaseUrl/health"
Assert-True ($health.ok -eq $true) "Transcript bridge health endpoint did not return ok=true."

Write-Step "Checking performance status endpoint."
$initial = Get-Json -Uri "$BaseUrl/performance/status"
Assert-True ($initial.ok -eq $true) "Performance status endpoint did not return ok=true."

$tests = @(
  @{
    Phrase = "performance status"
    Assert = {
      param($status)
      Assert-True ($null -ne $status.profile) "Profile was not returned after 'performance status'."
    }
  },
  @{
    Phrase = "turn off heavy MCPs"
    Assert = {
      param($status)
      Assert-True ($status.budget.enableHeavyMcpCalls -eq $false) "Heavy MCP calls were not disabled."
    }
  },
  @{
    Phrase = "stop background indexing"
    Assert = {
      param($status)
      Assert-True ($status.budget.enableBackgroundIndexing -eq $false) "Background indexing was not disabled."
    }
  },
  @{
    Phrase = "quiet narration"
    Assert = {
      param($status)
      Assert-True ($status.budget.enableVerboseNarration -eq $false) "Verbose narration was not disabled."
    }
  },
  @{
    Phrase = "manual verification only"
    Assert = {
      param($status)
      Assert-True ($status.budget.enableAutoVerification -eq $false) "Auto verification was not disabled."
    }
  },
  @{
    Phrase = "clear performance overrides"
    Assert = {
      param($status)
      Assert-True (($status.overrides.PSObject.Properties.Name.Count -eq 0) -or ($status.overrides.Count -eq 0)) "Overrides were not cleared."
    }
  }
)

foreach ($test in $tests) {
  Write-Step "Sending transcript phrase: $($test.Phrase)"
  $response = Send-Transcript -Text $test.Phrase
  Assert-True ($response.accepted -eq $true) "Transcript '$($test.Phrase)' was not accepted."

  Start-Sleep -Milliseconds 300
  $status = Get-Json -Uri "$BaseUrl/performance/status"
  & $test.Assert $status
}

if ($RunCompile) {
  Write-Step "Running compile check."
  Push-Location (Join-Path $PSScriptRoot "..")
  try {
    npm run compile
    Assert-True ($LASTEXITCODE -eq 0) "Compile did not succeed."
  }
  finally {
    Pop-Location
  }
}

Write-Step "All performance override smoke tests passed."
