#region LEEWAY_IDENTITY
# TAG: LEEWAY-STOPPED-CONTAINER-PRESERVATION-V1
# WHO: Agent Lee / Leonard Lee. WHAT: preserve stopped containers before retirement.
# WHY: retain changed code, receipts and recreation configuration. WHERE: verified root.
# WHEN: invocation. HOW: immutable targets, protected config, Docker snapshots and archive.
# ROLE: backup operator. LICENSE: MIT.
#endregion
param([Parameter(Mandatory=$true)][string]$LeeWayRoot)
$ErrorActionPreference='Stop'
if((Get-Content (Join-Path $LeeWayRoot '.leeway-root') -Raw|ConvertFrom-Json).ecosystemId -ne 'leeway.ecosystem'){throw 'Root mismatch'}
$stamp=Get-Date -Format yyyyMMdd-HHmmss
$dest=Join-Path $LeeWayRoot "Archive\backups\stopped-docker-$stamp"
New-Item -ItemType Directory -Path $dest|Out-Null
$sid=[Security.Principal.WindowsIdentity]::GetCurrent().User.Value
& icacls $dest /inheritance:r /grant:r ("*{0}:(OI)(CI)F" -f $sid) '*S-1-5-18:(OI)(CI)F' '*S-1-5-32-544:(OI)(CI)F' | Out-Null
if($LASTEXITCODE){throw 'Private backup ACL failed'}
Add-Type -AssemblyName System.Security
$utf8=New-Object Text.UTF8Encoding($false)
function Save($name,$obj){[IO.File]::WriteAllText((Join-Path $dest $name),($obj|ConvertTo-Json -Depth 40),$utf8)}
$ids=@(& docker ps -aq --filter status=exited --filter status=created)
$all=& docker inspect @ids|Out-String|ConvertFrom-Json
if($LASTEXITCODE -or $all.Count -ne $ids.Count){throw 'Incomplete baseline'}
$plain=$utf8.GetBytes(($all|ConvertTo-Json -Depth 60))
$cipher=[Security.Cryptography.ProtectedData]::Protect($plain,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser)
[IO.File]::WriteAllBytes((Join-Path $dest 'configuration.dpapi.bin'),$cipher)
$roundtrip=[Security.Cryptography.ProtectedData]::Unprotect($cipher,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser)
if([Convert]::ToBase64String($plain) -ne [Convert]::ToBase64String($roundtrip)){throw 'Configuration restore verification failed'}
$records=@()
$tags=@()
foreach($c in $all){
  $id=$c.Id;$short=$id.Substring(0,12);$name=$c.Name.TrimStart('/')
  $current=docker inspect $id|Out-String|ConvertFrom-Json
  if($LASTEXITCODE -or $current[0].State.Running){throw "Target changed: $short"}
  $ErrorActionPreference='Continue'; $log=@(& docker logs $id 2>&1|ForEach-Object{"$_"}); $ErrorActionPreference='Stop'
  [IO.File]::WriteAllLines((Join-Path $dest "$short.log"),[string[]]$log,$utf8)
  $tag=("leeway-retired-snapshot/{0}:{1}" -f $short,$stamp)
  $ErrorActionPreference='Continue'; $snap=@(& docker commit --pause=false $id $tag 2>&1|ForEach-Object{"$_"}); $ErrorActionPreference='Stop'
  $exit=$LASTEXITCODE
  $entry=[ordered]@{id=$id;name=$name;originalImage=$c.Image;originalState=$c.State.Status;snapshotTag=$tag;commitExit=$exit;mountsRetained=@($c.Mounts|Select-Object Type,Name,Destination,RW);backupVerified=$false;removed=$false}
  if($exit -eq 0){
    $snapshot=docker image inspect $tag|Out-String|ConvertFrom-Json
    if($LASTEXITCODE){throw 'Snapshot inspect failed'}
    $entry.snapshotImage=$snapshot[0].Id
    $tags+=$tag
  }else{
    $entry.commitError=$snap -join ' '
    $entry.exportFile="$short.rootfs.tar"
    & docker export --output (Join-Path $dest $entry.exportFile) $id
    if($LASTEXITCODE){$entry.exportFailed=$true}else{$entry.exportSha256=(Get-FileHash (Join-Path $dest $entry.exportFile)).Hash}
  }
  $records+=$entry
  Save 'progress.json' $records
  Write-Output ("PRESERVED {0}/{1}: {2}; snapshotExit={3}" -f $records.Count,$all.Count,$name,$exit)
}
if($tags.Count){
  Write-Output "Saving $($tags.Count) snapshots to a shared-layer archive."
  & docker image save --output (Join-Path $dest 'snapshots.tar') @tags
  if($LASTEXITCODE){throw 'Snapshot archive failed'}
  $archiveHash=(Get-FileHash (Join-Path $dest 'snapshots.tar')).Hash
  Write-Output "ARCHIVE_SHA256=$archiveHash"
  $ErrorActionPreference='Continue'; $load=@(& docker image load --input (Join-Path $dest 'snapshots.tar') 2>&1|ForEach-Object{"$_"}); $ErrorActionPreference='Stop'
  if($LASTEXITCODE){throw 'Archive reload verification failed'}
  [IO.File]::WriteAllLines((Join-Path $dest 'archive-load-verification.log'),[string[]]$load,$utf8)
  foreach($r in $records){if($r.commitExit -eq 0){$r.backupVerified=$true}}
}
Save 'preservation-manifest.json' $records
$receipt=@{schema='leeway.stopped-docker.preservation.v1';status='PRESERVED_NOT_REMOVED';time=(Get-Date).ToUniversalTime().ToString('o');backupRoot=$dest;count=$records.Count;verifiedImageSnapshots=@($records|Where-Object{$_.backupVerified}).Count;exportFallbacks=@($records|Where-Object{$_.commitExit -ne 0}).Count;archiveSha256=$archiveHash;configurationDecryptVerified=$true;containersRemoved=0;volumesDeleted=0;formulaExecution='NOT_EXECUTED';proof='DIAGNOSTIC_ONLY_NOT_OFFICIAL';scriptSHA256=(Get-FileHash $PSCommandPath).Hash}
Save 'receipt.json' $receipt
$rp=Join-Path $LeeWayRoot "Archive\receipts\stopped-docker-preservation-$stamp.json"
[IO.File]::WriteAllText($rp,($receipt|ConvertTo-Json -Depth 10),$utf8)
$receipt|ConvertTo-Json -Depth 10
Write-Output "RECEIPT=$rp"
