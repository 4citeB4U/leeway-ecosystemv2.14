# LEEWAY-CONTINUE-STOPPED-RETIREMENT-V1: wait for this exact preservation run, then execute guarded recovery checks.
param([string]$LeeWayRoot='D:\LeeWay\Ecosystem')
$ErrorActionPreference='Stop'
$backup=Join-Path $LeeWayRoot 'Archive\backups\stopped-docker-20260916-154303'
$deadline=(Get-Date).AddMinutes(45)
while(!(Test-Path (Join-Path $backup 'receipt.json'))){
 if((Get-Date) -gt $deadline){throw 'Preservation wait expired; no retirement attempted'}
 $p=Get-CimInstance Win32_Process -Filter 'ProcessId=6456'
 if(!$p -or $p.CommandLine -notmatch 'Invoke-LeeWayStoppedDockerPreservation-v1.ps1'){throw 'Preservation process ended without success receipt'}
 Start-Sleep -Seconds 5
}
$receipt=Get-Content (Join-Path $backup 'receipt.json') -Raw|ConvertFrom-Json
if($receipt.status -ne 'PRESERVED_NOT_REMOVED' -or $receipt.count -ne 52 -or $receipt.archiveSha256 -ne '072A3ACF8F52E49A322B2B58AD80E960B9038E993081F1572F9ADA8AE9F23D3B'){throw 'Preservation receipt does not match this run'}
Write-Output 'PRESERVATION_VERIFIED; beginning isolated recreation checks before original removal'
& (Join-Path $LeeWayRoot 'Archive\operator-scripts\Invoke-LeeWayStoppedDockerRetirement-v1.ps1') -LeeWayRoot $LeeWayRoot -BackupRoot $backup
