<#
LEEWAY_HEADER - DO NOT REMOVE

REGION: CORE
TAG: CORE.AGENT_LEE.GUARD.GOLD_GUARD
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
#>

$Root = "$HOME\.leeway-vscode"
$Verify = "$Root\scripts\run-full-test.ps1"
$Log = "$Root\logs\daily\gold-guard.log"

while ($true) {
  try {
    $out = & $Verify 2>&1 | Out-String
    if ($out -match "Grade:\s+GOLD") {
      Add-Content $Log "[OK] GOLD 05/03/2026 18:52:13"
    } else {
      Add-Content $Log "[DRIFT] GOLD lost 05/03/2026 18:52:13"
      Write-Host "Attempting self-heal..." -ForegroundColor Yellow

      & "C:\Users\Leona\.leeway-vscode\agent-lee\self-heal\self-heal.ps1"

      Start-Sleep -Seconds 10
      $re = & $Verify 2>&1 | Out-String

      if ($re -match "Grade:\s+GOLD") {
        Add-Content $Log "[RECOVERED] GOLD restored"
      } else {
        Add-Content $Log "[FAIL] Could not restore GOLD"
        break
      }
    }
  } catch {
    Add-Content $Log "[ERROR] "
  }

  Start-Sleep -Seconds 300
}

