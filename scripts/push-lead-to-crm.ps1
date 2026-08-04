<#
Push a lead JSON to the LeeWay Bridge or an external CRM API, or print manual import instructions.

Usage examples:
  .\scripts\push-lead-to-crm.ps1 -Mode Manual -LeadFile ".\exported-leads\ballers_club_barbershop_go.json"
  .\scripts\push-lead-to-crm.ps1 -Mode Bridge -BridgeUrl "http://localhost:8787" -LeadFile ".\exported-leads\ballers_club_barbershop_go.json"
  .\scripts\push-lead-to-crm.ps1 -Mode Api -CrmApiUrl "https://example.com/api/campaigns/queue" -AuthToken "TOKEN" -LeadFile ".\exported-leads\ballers_club_barbershop_go.json"
#>

param(
  [Parameter(Mandatory=$false)]
  [string]$LeadFile = "exported-leads/ballers_club_barbershop_go.json",

  [Parameter(Mandatory=$false)]
  [string]$BridgeUrl = "http://localhost:8787",

  [Parameter(Mandatory=$false)]
  [string]$CrmApiUrl,

  [Parameter(Mandatory=$false)]
  [string]$AuthToken,

  [Parameter(Mandatory=$true)]
  [ValidateSet('Manual','Bridge','Api')]
  [string]$Mode
)

$ErrorActionPreference = 'Stop'

function Read-LeadJson {
  param([string]$Path)
  if (-not (Test-Path $Path)) {
    Write-Error "Lead file not found: $Path"
    return $null
  }
  try {
    $text = Get-Content -Raw -Path $Path -ErrorAction Stop
    $obj = $text | ConvertFrom-Json -ErrorAction Stop
    return @{ raw = $text; obj = $obj }
  } catch {
    Write-Error "Failed to parse JSON: $($_.Exception.Message)"
    return $null
  }
}

function Print-LeadSummary {
  param($lead)
  Write-Host "Lead summary:" -ForegroundColor Cyan
  Write-Host "  Org:      $($lead.org)"
  Write-Host "  Category: $($lead.category)"
  Write-Host "  Priority: $($lead.priority)"
  Write-Host "  Contact:  $($lead.contact) ($($lead.role))"
  Write-Host "  Stage:    $($lead.stage)"
  Write-Host "  Offer:    $($lead.offer)"
  Write-Host "  Value:    $($lead.value)"
  if ($lead.missingInfo) { Write-Host "  Missing:  $($lead.missingInfo -join ', ')" }
}

function Manual-Mode {
  param($lead, $raw)
  Print-LeadSummary -lead $lead
  Write-Host "`nManual import mode: To import this lead into the GitHub Pages CRM, open the CRM UI → Import / Export → Upload JSON file and choose this file." -ForegroundColor Yellow
  try { Write-Host "Lead file path:" (Resolve-Path $LeadFile) } catch { Write-Host "Lead file path: $LeadFile" }
}

function Bridge-Mode {
  param($leadJson, $bridge)
  if (-not $bridge) { Write-Error "Bridge URL not provided."; return }
  $uri = [Uri]::new($bridge.TrimEnd('/'))
  $endpoint = "$($uri.AbsoluteUri.TrimEnd('/'))/assistant"
  Write-Host "Posting to bridge endpoint:" $endpoint
  $payload = @{ task = 'file_to_lead'; leewayStandard = $true; lead = $leadJson.obj } | ConvertTo-Json -Depth 20
  try {
    $resp = Invoke-RestMethod -Uri $endpoint -Method Post -ContentType 'application/json' -Body $payload -TimeoutSec 120
    if ($resp -and $resp.ok) {
      Write-Host "Bridge returned OK. Cleaned object:" -ForegroundColor Green
      $resp.result | ConvertTo-Json -Depth 20 | Write-Host
      return $true
    } else {
      Write-Warning "Bridge did not return ok. Response: $($resp | ConvertTo-Json -Depth 6)";
      return $false
    }
  } catch {
    Write-Error "Bridge POST failed: $($_.Exception.Message)"
    return $false
  }
}

function Api-Mode {
  param($leadJson, $apiUrl, $token)
  if (-not $apiUrl) { Write-Error "CRM API URL not provided."; return }
  Write-Host "Posting to CRM API:" $apiUrl
  $headers = @{}
  if ($token) { $headers['Authorization'] = "Bearer $token" }
  try {
    $resp = Invoke-RestMethod -Uri $apiUrl -Method Post -ContentType 'application/json' -Headers $headers -Body ($leadJson.raw) -TimeoutSec 120
    Write-Host "CRM API response:" -ForegroundColor Green
    $resp | ConvertTo-Json -Depth 20 | Write-Host
    return $true
  } catch {
    Write-Error "CRM API POST failed: $($_.Exception.Message)"
    return $false
  }
}

Write-Host "Push Lead Script - Mode: $Mode" -ForegroundColor Cyan

$leadJson = Read-LeadJson -Path $LeadFile
if (-not $leadJson) { Write-Error "Aborting: invalid lead JSON."; exit 2 }

switch ($Mode) {
  'Manual' {
    Manual-Mode -lead $leadJson.obj -raw $leadJson.raw
    exit 0
  }
  'Bridge' {
    $ok = Bridge-Mode -leadJson $leadJson -bridge $BridgeUrl
    if (-not $ok) { Write-Warning "Bridge mode did not succeed. No CRM changes were made."; exit 3 }
    exit 0
  }
  'Api' {
    $ok = Api-Mode -leadJson $leadJson -apiUrl $CrmApiUrl -token $AuthToken
    if (-not $ok) { Write-Warning "API mode did not succeed. No CRM changes were made."; exit 4 }
    exit 0
  }
}
