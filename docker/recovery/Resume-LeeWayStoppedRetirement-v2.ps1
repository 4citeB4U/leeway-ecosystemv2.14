# LEEWAY-STOPPED-RETIREMENT-RESUME-V2
# C3 diagnostic: reconcile exact preserved IDs; no volume/image pruning.
param([string]$LeeWayRoot='D:\LeeWay\Ecosystem')
$ErrorActionPreference='Stop'
$b=Join-Path $LeeWayRoot 'Archive\backups\stopped-docker-20260916-154303'
$p=Join-Path $b 'preservation-manifest.json'
$r=Get-Content $p -Raw|ConvertFrom-Json
$t=Get-Content (Join-Path $b 'restore-tests.json') -Raw|ConvertFrom-Json
$receipt=Get-Content (Join-Path $b 'receipt.json') -Raw|ConvertFrom-Json
$utf8=New-Object Text.UTF8Encoding($false)
if(@($r).Count -ne 52 -or @($t).Count -ne 52 -or $receipt.archiveSha256 -ne '072A3ACF8F52E49A322B2B58AD80E960B9038E993081F1572F9ADA8AE9F23D3B'){throw 'Recovery evidence mismatch'}
if(!(Test-Path (Join-Path $LeeWayRoot '.leeway-root')) -or !(Test-Path (Join-Path $b 'archive-load-verification.log'))){throw 'Authority or archive receipt unavailable'}
function SaveJson($destination,$value){
 $temp=$destination+'.pending'
 [IO.File]::WriteAllText($temp,($value|ConvertTo-Json -Depth 35),$utf8)
 $null=Get-Content $temp -Raw|ConvertFrom-Json
 if(Test-Path $destination){[IO.File]::Replace($temp,$destination,($destination+'.previous'))}else{[IO.File]::Move($temp,$destination)}
}
$before=@(docker ps -aq --no-trunc);if($LASTEXITCODE){throw 'Inventory failed'}
$absent=@();$removedNow=@()
foreach($item in $r){
 $test=@($t|Where-Object {$_.name -eq ('leeway-restore-test-'+$item.id.Substring(0,12))})
 if(!$item.backupVerified -or $test.Count -ne 1 -or !$test[0].isolated -or $test[0].image -ne $item.snapshotImage){throw 'Per-container recovery evidence mismatch'}
 & docker image inspect $item.snapshotImage --format '{{.Id}}'|Out-Null
 if($LASTEXITCODE){throw 'Preserved image missing'}
 foreach($m in $item.mountsRetained){if($m.Type -eq 'volume'){& docker volume inspect $m.Name --format '{{.Name}}'|Out-Null;if($LASTEXITCODE){throw 'Original data volume missing'}}}
 if($item.id -notin $before){$absent+=@{id=$item.id;name=$item.name;previouslyRecordedRemoved=[bool]$item.removed}}
}
$checkpoint=@{status='PRECHECK_VERIFIED';time=(Get-Date).ToUniversalTime().ToString('o');alreadyAbsent=$absent;scope=52;restoreCreateTests=52;scriptSHA256=(Get-FileHash $PSCommandPath).Hash}
SaveJson (Join-Path $b 'resume-checkpoint.json') $checkpoint
foreach($item in $r){
 if($item.id -in $before){
  $current=docker inspect $item.id|Out-String|ConvertFrom-Json
  if($LASTEXITCODE -or $current[0].State.Running -or $current[0].Name.TrimStart('/') -ne $item.name){throw 'Exact retirement target drift'}
  SaveJson (Join-Path $b 'next-retirement-intent.json') @{id=$item.id;name=$item.name;time=(Get-Date).ToUniversalTime().ToString('o')}
  & docker rm $item.id|Out-Null
  if($LASTEXITCODE){throw 'Exact stopped-container removal failed'}
  $removedNow+=$item.name
 }
 $item.removed=$true
 SaveJson $p $r
 Write-Output ('RECONCILED '+$item.name)
}
$after=@(docker ps -aq --no-trunc);if($LASTEXITCODE){throw 'Final inventory failed'}
if(@($r|Where-Object {$_.id -in $after}).Count){throw 'Preserved original still present'}
$result=@{schema='leeway.stopped.docker.retirement.v2';status='VERIFIED';removedCount=52;alreadyAbsentCount=$absent.Count;removedThisResume=$removedNow.Count;previouslyAbsent=$absent;removed=@($r|ForEach-Object {$_.name});restoreCreateTests=52;nativeArchiveReloadVerified=$true;archiveSha256=$receipt.archiveSha256;originalVolumesDeleted=0;imagesDeleted=0;containersStartedByRestoreTests=0;proof='DIAGNOSTIC_ONLY_NOT_OFFICIAL';formulaExecution='NOT_EXECUTED';learningLedger='NOT_UPDATED';time=(Get-Date).ToUniversalTime().ToString('o');scriptSHA256=(Get-FileHash $PSCommandPath).Hash}
SaveJson (Join-Path $b 'retirement-receipt.json') $result
SaveJson (Join-Path $LeeWayRoot 'Archive\receipts\stopped-docker-retirement-resume-20260916.json') $result
$result|ConvertTo-Json -Depth 8

