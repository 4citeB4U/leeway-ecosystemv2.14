$ErrorActionPreference = "Continue"

$Root = "D:\Leeway-Ecosystem v2.1.4"
$Proof = Join-Path $Root "Archive\proofs\agent-lee-creation-kernel"
New-Item -ItemType Directory -Force -Path $Proof | Out-Null

$ReportPath = Join-Path $Proof "AGENT_LEE_CREATION_KERNEL_ROUTES.txt"
$JsonPath = Join-Path $Proof "AGENT_LEE_CREATION_KERNEL_ROUTES.receipt.json"

$Base = "http://127.0.0.1:8098"

$Candidates = @(
  "/",
  "/health",
  "/docs",
  "/openapi.json",
  "/status",
  "/generate",
  "/create",
  "/image",
  "/image/generate",
  "/images/generate",
  "/create/image",
  "/pdf",
  "/pdf/generate",
  "/document",
  "/document/generate",
  "/website",
  "/website/generate",
  "/app",
  "/app/generate",
  "/artifact",
  "/artifacts",
  "/3d",
  "/3d/generate",
  "/object",
  "/object/generate",
  "/mesh",
  "/mesh/generate"
)

$Results = @()

foreach ($Path in $Candidates) {
  $Uri = "$Base$Path"
  try {
    $Resp = Invoke-WebRequest -Method Get -Uri $Uri -UseBasicParsing -TimeoutSec 15
    $Results += [pscustomobject]@{
      method = "GET"
      path = $Path
      ok = $true
      status = $Resp.StatusCode
      content_type = $Resp.Headers["Content-Type"]
      body_preview = $Resp.Content.Substring(0, [Math]::Min(500, $Resp.Content.Length))
    }
  }
  catch {
    $Results += [pscustomobject]@{
      method = "GET"
      path = $Path
      ok = $false
      error = $_.Exception.Message
    }
  }
}

$OpenApi = $null

try {
  $OpenApi = Invoke-RestMethod -Method Get -Uri "$Base/openapi.json" -TimeoutSec 30
}
catch {
  $OpenApi = @{
    error = $_.Exception.Message
  }
}

$RouteSummary = @()

if ($OpenApi.paths) {
  foreach ($Prop in $OpenApi.paths.PSObject.Properties) {
    $Methods = ($Prop.Value.PSObject.Properties.Name -join ",")
    $RouteSummary += [pscustomobject]@{
      path = $Prop.Name
      methods = $Methods
    }
  }
}

@"
AGENT LEE CREATION KERNEL ROUTE REPORT
Base: $Base
Created: $((Get-Date).ToString("o"))

==================== ROUTE SUMMARY FROM OPENAPI ====================
$($RouteSummary | Format-Table -AutoSize | Out-String -Width 4096)

==================== CANDIDATE ROUTE CHECKS ====================
$($Results | Format-Table -AutoSize | Out-String -Width 4096)

==================== DOCKER LOGS ====================
$(docker logs --tail 160 agent-lee-creation-kernel 2>&1 | Out-String -Width 4096)
"@ | Set-Content -Path $ReportPath -Encoding UTF8

$Receipt = @{
  verdict = "AGENT_LEE_CREATION_KERNEL_ROUTES_INSPECTED"
  base = $Base
  route_summary = $RouteSummary
  candidate_checks = $Results
  openapi_available = [bool]($OpenApi.paths)
  report = $ReportPath
  created_at = (Get-Date).ToString("o")
}

$Receipt | ConvertTo-Json -Depth 30 | Set-Content -Path $JsonPath -Encoding UTF8

notepad $ReportPath
notepad $JsonPath

Write-Host ""
Write-Host "Creation Kernel route inspection complete." -ForegroundColor Green
Write-Host "Report: $ReportPath" -ForegroundColor Cyan