# LeeWay OS Persistent Startup - MIG-008D-P0 Emergency Recovery Gate
# Governed launcher for: Runtime Kernel BFF (4002) + 4 default applications + LeeWay OS frontend (3001)
# Idempotent: skips anything already listening. Writes logs + startup receipt.
# Authorization: MIG-008D-P0 bounded repair authorization (LeeWay OS frontend, same-origin BFF, required adapters).

$ErrorActionPreference = "Continue"
$Mission = "MIG-008D-P0-EMERGENCY-RECOVERY-GATE"
$Root = "D:\Leeway-Ecosystem v2.1.4"
$Ts = Get-Date -Format "yyyyMMdd-HHmmss"
$Iso = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
$LogDir = Join-Path $Root "Archive\logs\leeway-os"
$ReceiptDir = Join-Path $Root "Archive\receipts\leeway-os"
New-Item -ItemType Directory -Path $LogDir, $ReceiptDir -Force | Out-Null

function Test-Port($Port) {
  return [bool](Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
}

function Start-Detached($Name, $Exe, $ArgsList, $WorkDir) {
  $stdout = Join-Path $LogDir "$Name-$Ts.out.log"
  $stderr = Join-Path $LogDir "$Name-$Ts.err.log"
  $p = Start-Process -FilePath $Exe -ArgumentList $ArgsList -WorkingDirectory $WorkDir -WindowStyle Hidden -RedirectStandardOutput $stdout -RedirectStandardError $stderr -PassThru
  return @{ name = $Name; pid = $p.Id; stdout = $stdout; stderr = $stderr }
}

function Wait-Http($Url, $MaxSec) {
  $deadline = (Get-Date).AddSeconds($MaxSec)
  while ((Get-Date) -lt $deadline) {
    try {
      $r = Invoke-WebRequest -Uri $Url -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop
      if ($r.StatusCode -eq 200) { return @{ ok = $true; http = $r.StatusCode; type = $r.Headers["Content-Type"] } }
    } catch { Start-Sleep -Milliseconds 1500 }
  }
  return @{ ok = $false; http = 0 }
}

$results = [ordered]@{}

# ---- 1. Runtime Kernel BFF (4002) ----
if (-not (Test-Port 4002)) {
  $k = Start-Detached "kernel" "node" @("runtime-kernel-service.mjs") (Join-Path $Root "Leeway Runtime Fabric\runtime-kernel")
  $results.kernel = @{ action = "started"; pid = $k.pid; stdout = $k.stdout; stderr = $k.stderr }
} else {
  $results.kernel = @{ action = "already-listening" }
}
$results.kernelHealth = Wait-Http "http://127.0.0.1:4002/health" 60

# Wait for startup policy to settle (kernel auto-launches 4 apps 2.5s after start)
Start-Sleep -Seconds 8

# ---- 2. Four default applications via governed BFF ----
$apps = @("leeway-ide", "leeway-employment-center", "leeway-svg-creator")
foreach ($appId in $apps) {
  $port = @{ "leeway-ide" = 3000; "leeway-employment-center" = 3004; "leeway-svg-creator" = 3005 }[$appId]
  if (Test-Port $port) {
    $results[$appId] = @{ action = "already-listening"; port = $port }
  } else {
    try {
      $r = Invoke-RestMethod -Uri "http://127.0.0.1:4002/api/leeway/applications/$appId/restart" -Method POST -TimeoutSec 150
      $results[$appId] = @{ action = "bff-restart"; ok = $r.ok; state = $r.state; error = $r.error; reason = $r.reason; evidence = $r.evidence }
    } catch {
      $results[$appId] = @{ action = "bff-restart"; ok = $false; error = $_.Exception.Message }
    }
  }
}

# Open Notebook: container-managed; verify health only
if (Test-Port 5326) {
  $results["leeway-open-notebook"] = @{ action = "already-listening"; port = 5326 }
} else {
  try {
    $r = Invoke-RestMethod -Uri "http://127.0.0.1:4002/api/leeway/applications/leeway-open-notebook/restart" -Method POST -TimeoutSec 90
    $results["leeway-open-notebook"] = @{ action = "bff-restart"; ok = $r.ok; state = $r.state; error = $r.error }
  } catch {
    $results["leeway-open-notebook"] = @{ action = "bff-restart"; ok = $false; error = $_.Exception.Message }
  }
}

# ---- 3. LeeWay OS frontend on 3001 (leeway-os-nextjs, production build) ----
if (Test-Port 3001) {
  $results.os3001 = @{ action = "already-listening"; port = 3001 }
} else {
  $o = Start-Detached "leeway-os-3001" "node" @("node_modules\next\dist\bin\next", "start", "-p", "3001") (Join-Path $Root "leeway-os-nextjs")
  $results.os3001 = @{ action = "started"; pid = $o.pid; stdout = $o.stdout; stderr = $o.stderr }
}
$results.os3001Http = Wait-Http "http://127.0.0.1:3001/" 90

# ---- 4. Final verification snapshot ----
$endpoints = [ordered]@{}
foreach ($ep in @(@("os-shell-3000", "http://127.0.0.1:3000/"), @("os-3001", "http://127.0.0.1:3001/"), @("ec-3004", "http://localhost:3004/"), @("svg-3005", "http://127.0.0.1:3005/api/health"), @("notebook-5326", "http://127.0.0.1:5326/health"), @("kernel-4002", "http://127.0.0.1:4002/health"))) {
  $endpoints[$ep[0]] = Wait-Http $ep[1] 10
}

$receipt = @{
  schema = "leeway-proof-backed-receipt-schema.json"
  receiptId = "leeway-os-persistent-startup-$Ts"
  status = if ($results.kernelHealth.ok -and $endpoints["os-shell-3000"].ok -and $endpoints["os-3001"].ok) { "complete" } else { "partial" }
  startedAt = $Iso
  endedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
  mission = $Mission
  controlSurface = "governed_startup_script"
  agentIdentity = "agent-lee"
  actions = $results
  endpoints = $endpoints
  ok = ($results.kernelHealth.ok -and $endpoints["os-shell-3000"].ok -and $endpoints["os-3001"].ok -and $endpoints["ec-3004"].ok -and $endpoints["svg-3005"].ok -and $endpoints["notebook-5326"].ok)
  officialLockClaimed = $false
  proofLevel = "PROOF_LEVEL_3_RUNTIME_ENDPOINT"
}
$receiptPath = Join-Path $ReceiptDir "leeway-os-startup-$Ts.json"
$receipt | ConvertTo-Json -Depth 8 | Set-Content $receiptPath -Encoding UTF8

Write-Output "RECEIPT: $receiptPath"
Write-Output ($receipt | ConvertTo-Json -Depth 8)
