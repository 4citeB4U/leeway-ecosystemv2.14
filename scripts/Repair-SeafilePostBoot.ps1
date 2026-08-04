$ErrorActionPreference = "Stop"

$Root = "D:\Leeway-Ecosystem v2.1.4"
$ReceiptDir = Join-Path $Root "Archive\receipts\seafile-postboot"
New-Item -ItemType Directory -Force -Path $ReceiptDir | Out-Null

$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$Receipt = Join-Path $ReceiptDir "seafile-postboot-repair-$Stamp.json"

$result = [ordered]@{
    startedAt = (Get-Date).ToString("o")
    task = "LeeWaySeafilePostBootRepair"
    dbHealthy = $false
    seafileWasReadyBeforeRepair = $false
    repairAction = "none"
    seafileReadyAfterRepair = $false
    errors = @()
}

function Test-SeafileWeb {
    try {
        $r = Invoke-WebRequest -Uri "http://127.0.0.1:8082/accounts/login/" -UseBasicParsing -TimeoutSec 15
        return ($r.StatusCode -eq 200)
    }
    catch {
        return $false
    }
}

try {
    Start-Sleep -Seconds 60

    for ($i = 1; $i -le 60; $i++) {
        try {
            $status = docker inspect -f "{{.State.Health.Status}}" leeway-seafile-db 2>$null
            if ($status -eq "healthy") {
                $result.dbHealthy = $true
                break
            }
        }
        catch {
            $result.errors += "DB health check failed: $($_.Exception.Message)"
        }

        Start-Sleep -Seconds 5
    }

    if (-not $result.dbHealthy) {
        $result.repairAction = "skipped-db-not-healthy"
        return
    }

    if (Test-SeafileWeb) {
        $result.seafileWasReadyBeforeRepair = $true
        $result.seafileReadyAfterRepair = $true
        $result.repairAction = "none-already-ready"
        return
    }

    $result.repairAction = "docker-restart-leeway-seafile"
    docker restart leeway-seafile | Out-Null

    for ($i = 1; $i -le 40; $i++) {
        Start-Sleep -Seconds 5

        if (Test-SeafileWeb) {
            $result.seafileReadyAfterRepair = $true
            break
        }
    }
}
catch {
    $result.errors += $_.Exception.Message
}
finally {
    $result.finishedAt = (Get-Date).ToString("o")
    $result | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $Receipt -Encoding UTF8
}