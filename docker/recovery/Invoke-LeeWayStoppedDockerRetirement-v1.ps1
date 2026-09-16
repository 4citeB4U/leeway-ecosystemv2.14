#region LEEWAY_IDENTITY
# TAG: LEEWAY-STOPPED-DOCKER-RETIREMENT-V1
# WHO: Agent Lee / Leonard Lee. WHAT: verify restoration then retire precisely preserved containers.
# WHY: clear stopped containers without losing their files or data references.
# WHERE: verified root. WHEN: after archive reload verification.
# HOW: import fallbacks, test container creation without execution, then guarded removal.
# ROLE: recovery operator. LICENSE: MIT.
#endregion
param([Parameter(Mandatory=$true)][string]$LeeWayRoot,[Parameter(Mandatory=$true)][string]$BackupRoot)
$ErrorActionPreference='Stop'
$receipt=Get-Content (Join-Path $BackupRoot 'receipt.json') -Raw|ConvertFrom-Json
if($receipt.status -ne 'PRESERVED_NOT_REMOVED' -or !(Test-Path (Join-Path $BackupRoot 'archive-load-verification.log'))){throw 'Archive has not passed native reload verification'}
$path=Join-Path $BackupRoot 'preservation-manifest.json'
$records=Get-Content $path -Raw|ConvertFrom-Json
$utf8=New-Object Text.UTF8Encoding($false)
function SaveManifest{[IO.File]::WriteAllText($path,($records|ConvertTo-Json -Depth 35),$utf8)}
foreach($r in $records){
  if(!$r.backupVerified){
    if($r.exportFailed -or !$r.exportFile){throw 'Missing recovery payload'}
    $file=Join-Path $BackupRoot $r.exportFile
    if((Get-FileHash $file).Hash -ne $r.exportSha256){throw 'Filesystem export hash mismatch'}
    & docker image import $file $r.snapshotTag|Out-Null
    if($LASTEXITCODE){throw 'Filesystem import failed'}
    $im=docker image inspect $r.snapshotTag|Out-String|ConvertFrom-Json
    if($LASTEXITCODE){throw 'Imported image unreadable'}
    $r|Add-Member -NotePropertyName snapshotImage -NotePropertyValue $im[0].Id -Force
    $r.backupVerified=$true
    SaveManifest
  }
}
$restore=Join-Path $LeeWayRoot 'Archive\operator-scripts\Restore-LeeWayPreservedDocker-v1.ps1'
$tests=@()
foreach($r in $records){
  $testName='leeway-restore-test-'+$r.id.Substring(0,12)
  $existing=@(docker ps -aq --filter "name=^/$testName$")
  if($existing.Count){throw "Existing validation container: $testName"}
  $json=& $restore -BackupRoot $BackupRoot -ContainerId $r.id -Create -IsolatedValidation
  $test=$json|ConvertFrom-Json
  if($test.status -ne 'CREATED_NOT_STARTED' -or !$test.isolated){throw 'Isolated restoration proof failed'}
  $check=docker inspect $test.id|Out-String|ConvertFrom-Json
  if($LASTEXITCODE -or $check[0].State.Running -or $check[0].Config.Labels.'leeway.scope' -ne 'restore-validation'){throw 'Validation cleanup identity failed'}
  & docker rm -v $test.id|Out-Null
  if($LASTEXITCODE){throw 'Validation cleanup failed'}
  $tests+=$test
  Write-Output ("RESTORE_VERIFIED {0}/{1}: {2}" -f $tests.Count,$records.Count,$r.name)
}
[IO.File]::WriteAllText((Join-Path $BackupRoot 'restore-tests.json'),($tests|ConvertTo-Json -Depth 10),$utf8)
$removed=@()
foreach($r in $records){
  $current=docker inspect $r.id|Out-String|ConvertFrom-Json
  if($LASTEXITCODE -or $current[0].State.Running -or $current[0].Name.TrimStart('/') -ne $r.name){throw 'Retirement target drift; remaining originals retained'}
  foreach($m in $current[0].Mounts){if($m.Type -eq 'volume'){& docker volume inspect $m.Name --format '{{.Name}}'|Out-Null;if($LASTEXITCODE){throw 'Data volume unavailable'}}}
  & docker rm $r.id|Out-Null
  if($LASTEXITCODE){throw 'Guarded container removal failed'}
  $r.removed=$true;$removed+=$r.name
  SaveManifest
}
$result=@{schema='leeway.stopped.docker.retirement.v1';status='VERIFIED';removedCount=$removed.Count;removed=$removed;restoreCreateTests=$tests.Count;backupRoot=$BackupRoot;nativeArchiveReloadVerified=$true;archiveSha256=$receipt.archiveSha256;originalVolumesDeleted=0;imagesDeleted=0;containersStartedByRestoreTests=0;formulaExecution='NOT_EXECUTED';proof='DIAGNOSTIC_ONLY_NOT_OFFICIAL';time=(Get-Date).ToUniversalTime().ToString('o');scriptSHA256=(Get-FileHash $PSCommandPath).Hash}
$rp=Join-Path $LeeWayRoot ("Archive\receipts\stopped-docker-retirement-"+(Get-Date -Format yyyyMMdd-HHmmss)+'.json')
[IO.File]::WriteAllText($rp,($result|ConvertTo-Json -Depth 10),$utf8)
[IO.File]::WriteAllText((Join-Path $BackupRoot 'retirement-receipt.json'),($result|ConvertTo-Json -Depth 10),$utf8)
Write-Output "REMOVED=$($removed.Count)"
Write-Output "RECEIPT=$rp"

