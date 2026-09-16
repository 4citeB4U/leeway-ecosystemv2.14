# LEEWAY-SEAFILE-RECOVERY-COMPLETION-V1
# Preserve rollback images and configuration, then retire only exact old/test containers.
param([string]$LeeWayRoot='D:\LeeWay\Ecosystem')
$ErrorActionPreference='Stop'
$backup=Join-Path $LeeWayRoot 'Archive\backups\seafile-cutover-20260916'
$r=Get-Content (Join-Path $backup 'cutover-state.json') -Raw|ConvertFrom-Json
if($r.status -ne 'PRODUCTION_RECOVERY_VERIFIED'){throw 'Verified recovery required'}
$ping=Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:8082/api2/ping/' -TimeoutSec 10
if($ping.StatusCode -ne 200){throw 'Production service unavailable'}
$old=@(@{id=$r.oldApplicationId;name='leeway_seafile_app_before_recovery_20260916';tag='leeway-seafile-rollback-app:20260916'},@{id=$r.oldDatabaseId;name='leeway_seafile_db_before_recovery_20260916';tag='leeway-seafile-rollback-db:20260916'})
foreach($o in $old){
 $c=docker inspect $o.id|Out-String|ConvertFrom-Json
 if($LASTEXITCODE -or $c[0].State.Running -or $c[0].Name -ne '/'+$o.name){throw 'Rollback identity mismatch'}
 & docker commit $o.id $o.tag|Out-Null
 if($LASTEXITCODE){throw 'Rollback snapshot failed'}
}
$archive=Join-Path $backup 'rollback-images.tar'
& docker image save --output $archive $old[0].tag $old[1].tag
if($LASTEXITCODE){throw 'Rollback archive save failed'}
$hash=(Get-FileHash $archive -Algorithm SHA256).Hash
$ErrorActionPreference='Continue';$load=& docker image load --input $archive 2>&1;$exit=$LASTEXITCODE;$ErrorActionPreference='Stop'
$load|Set-Content (Join-Path $backup 'rollback-archive-load.log') -Encoding UTF8
if($exit){throw 'Rollback archive reload failed'}
$removed=@()
foreach($o in $old){& docker rm $o.id|Out-Null;if($LASTEXITCODE){throw 'Rollback retirement failed'};$removed+=$o.name}
$tests=@(
 @{id='07ae46699a71309d170b1e0e7a7e17af90584d6b0bc17716d13cbd3abb90ff47';name='leeway_seafile_app_check_20260916'},
 @{id='8060d73943ab90ad95af6d3dba284bd1026aa957814b75908164bee1a8b6176c';name='leeway_seafile_db_check_20260916'},
 @{id='55aac49d7a81';name='leeway_seafile_cache_check_20260916'}
)
foreach($t in $tests){
 $c=docker inspect $t.id|Out-String|ConvertFrom-Json
 if($LASTEXITCODE -or $c[0].Config.Labels.'leeway.scope' -ne 'seafile-recovery-check' -or $c[0].Name -ne '/'+$t.name){throw 'Temporary identity mismatch'}
 $ErrorActionPreference='Continue';$logs=& docker logs $c[0].Id 2>&1;$ErrorActionPreference='Stop'
 $logs|Set-Content (Join-Path $backup ($t.name+'.log')) -Encoding UTF8
 if($c[0].State.Running){& docker stop $c[0].Id|Out-Null;if($LASTEXITCODE){throw 'Temporary stop failed'}}
 & docker rm $c[0].Id|Out-Null
 if($LASTEXITCODE){throw 'Temporary removal failed'}
 $removed+=$t.name
}
& docker network rm leeway-seafile-isolated-check-20260916|Out-Null
if($LASTEXITCODE){throw 'Temporary network removal failed'}
$result=@{status='RECOVERY_CLEANUP_VERIFIED';removed=$removed;rollbackArchiveSha256=$hash;rollbackArchiveReloadVerified=$true;originalVolumesDeleted=0;recoveryVolumesDeleted=0;imagesDeleted=0;time=(Get-Date).ToUniversalTime().ToString('o');proof='DIAGNOSTIC_ONLY_NOT_OFFICIAL';scriptSHA256=(Get-FileHash $PSCommandPath).Hash}
$result|ConvertTo-Json -Depth 6|Set-Content (Join-Path $backup 'cleanup-receipt.json') -Encoding UTF8
$result|ConvertTo-Json -Depth 6

