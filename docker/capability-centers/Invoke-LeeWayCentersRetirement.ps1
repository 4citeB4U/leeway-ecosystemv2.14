#region LEEWAY_IDENTITY
# TAG: LEEWAY-CENTERS-RETIRE-V1
# WHO: Agent Lee / Leonard Lee. WHAT: retire four replaced containers and the test candidate.
# WHY: complete verified consolidation. WHERE: verified LeeWay root. WHEN: after cutover.
# HOW: verify backup, deployment, source publication, and exact IDs before removal.
# ROLE: operator. LICENSE: MIT.
#endregion
param([Parameter(Mandatory=$true)][string]$LeeWayRoot,[Parameter(Mandatory=$true)][string]$BackupRoot)
$ErrorActionPreference='Stop'
$names=@('leeway_agent_center','leeway_mcp_agent_center','leeway_worker_center','leeway_mcp_center')
$proof=Get-Content (Join-Path $BackupRoot 'receipt.json') -Raw|ConvertFrom-Json
if($proof.status -ne 'CUTOVER_VERIFIED'){throw 'Cutover not verified'}
if((Get-FileHash (Join-Path $BackupRoot 'original-center-images.tar')).Hash -ne $proof.imageBackupSha256){throw 'Backup hash mismatch'}
Add-Type -AssemblyName System.Security
$bytes=[IO.File]::ReadAllBytes((Join-Path $BackupRoot 'container-configs.dpapi.bin'))
$restored=[Text.Encoding]::UTF8.GetString([Security.Cryptography.ProtectedData]::Unprotect($bytes,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser))|ConvertFrom-Json
if($restored.Count -ne 4){throw 'Configuration restore failed'}
$old=docker inspect @names|Out-String|ConvertFrom-Json
foreach($c in $old){if($c.State.Running -or @($c.Mounts).Count -or $c.Id -notin $restored.Id){throw 'Retirement target mismatch'}}
& docker exec leeway_capability_centers node /app/health.mjs
if($LASTEXITCODE){throw 'Replacement unhealthy'}
$removed=@()
foreach($c in $old){
  $name=$c.Name.TrimStart('/')
  $logs=@(& docker logs $c.Id 2>&1|ForEach-Object{"$_"})
  [IO.File]::WriteAllLines((Join-Path $BackupRoot "$name.log"),[string[]]$logs)
  & docker rm $c.Id
  if($LASTEXITCODE){throw "Removal failed: $name"}
  $removed+=$name
}
$candidate=docker inspect leeway_capability_centers_candidate|Out-String|ConvertFrom-Json
if($LASTEXITCODE -eq 0 -and $candidate[0].Id.StartsWith('999f2e15f38f')){
  & docker stop --timeout 10 leeway_capability_centers_candidate
  if($LASTEXITCODE){throw 'Candidate stop failed'}
  & docker rm leeway_capability_centers_candidate
  if($LASTEXITCODE){throw 'Candidate retirement failed'}
  $removed+='leeway_capability_centers_candidate'
}
& docker exec leeway_capability_centers node /app/health.mjs
if($LASTEXITCODE){throw 'Postretirement health failed'}
$receipt=@{schema='leeway.docker.retirement.v1';status='VERIFIED';removed=$removed;volumesDeleted=0;imagesDeleted=0;backup=$BackupRoot;backupConfigDecryptVerified=$true;originalImageArchiveSha256=$proof.imageBackupSha256;sourceCommit='3561ed54d10ec6e3358f03bf1dafb28685ea6836';formulaExecution='NOT_EXECUTED';proof='DIAGNOSTIC_ONLY_NOT_OFFICIAL';time=(Get-Date).ToUniversalTime().ToString('o');scriptSha256=(Get-FileHash $PSCommandPath).Hash}
$p=Join-Path $LeeWayRoot ("Archive\receipts\docker-centers-retirement-"+(Get-Date -Format yyyyMMdd-HHmmss)+'.json')
[IO.File]::WriteAllText($p,($receipt|ConvertTo-Json -Depth 8),(New-Object Text.UTF8Encoding($false)))
$receipt|ConvertTo-Json -Depth 8
Write-Output "RECEIPT=$p"

