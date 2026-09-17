#region LeeWay capability consolidation
# TAG: LEEWAY-EIGHT-TO-ONE-CUTOVER
# WHO: Agent Lee, Creator-authorized diagnostic operator.
# WHAT: Consolidate eight equivalent work-order shells with original contracts.
# WHY: Reduce duplicate processes after storage recovery. WHEN: 2026-09-17.
# WHERE: Validated canonical root. HOW: snapshot, cutover, real request, restart, receipt.
# LICENSE: Repository license applies. Rollback: stop replacement, start preserved original IDs.
param([Parameter(Mandatory=$true)][string]$Root)
$ErrorActionPreference='Stop'
if((Get-Content (Join-Path $Root '.leeway-root') -Raw|ConvertFrom-Json).ecosystemId -ne 'leeway.ecosystem'){throw 'Root mismatch'}
$suite=Join-Path $Root 'runtime\container-fabric\capability-suite'
$lanes=Get-Content (Join-Path $suite 'configuration\lanes.json') -Raw|ConvertFrom-Json
$proof=Get-Content (Join-Path $suite 'candidate-verification.json') -Raw|ConvertFrom-Json
if($proof.status -ne 'CANDIDATE_VERIFIED_NOT_PROMOTED' -or !$proof.restartPersistence -or !$proof.storageFailureReturns503){throw 'Candidate proof missing'}
$source=Get-Content (Join-Path $suite 'source-provenance.json') -Raw|ConvertFrom-Json
$raw=docker inspect @($lanes.name)|Out-String
if($LASTEXITCODE){throw 'Original inventory failed'}
$originals=$raw|ConvertFrom-Json
if($originals.Count -ne 8){throw 'Expected eight originals'}
$image=docker image inspect leeway-capability-suite:20260917 --format '{{.Id}}'
if($LASTEXITCODE -or $image -ne 'sha256:5bb71cbcfbcdc32be833c34f75b348c50e3819222312e9de7e7e88bf83eaac95'){throw 'Candidate image drift'}
if(@(docker ps -a --format '{{.Names}}') -contains 'leeway_capability_suite'){throw 'Replacement already exists'}
foreach($c in $originals){
 $expected=$source|Where-Object id -eq $c.Id
 if(!$expected -or !$c.State.Running){throw 'Original identity/state changed'}
 $hash=docker exec $c.Id sha256sum /app/app.py
 if($LASTEXITCODE -or ($hash -split '\s+')[0] -ne $expected.sourceSHA256){throw 'Live source drift'}
 if(@($c.NetworkSettings.Networks.PSObject.Properties).Count -ne 1 -or !$c.NetworkSettings.Networks.'leeway-ecosystemv214_leeway-net'){throw 'Network contract changed'}
}
$stamp=Get-Date -Format 'yyyyMMdd-HHmmss'
$backup=Join-Path $Root ('Archive\backups\capability-cutover-'+$stamp)
New-Item -ItemType Directory $backup|Out-Null
Add-Type -AssemblyName System.Security
$sealed=[Security.Cryptography.ProtectedData]::Protect([Text.Encoding]::UTF8.GetBytes($raw),$null,[Security.Cryptography.DataProtectionScope]::CurrentUser)
$cp=Join-Path $backup 'originals.configuration.dpapi.bin'
[IO.File]::WriteAllBytes($cp,$sealed)
if([Text.Encoding]::UTF8.GetString([Security.Cryptography.ProtectedData]::Unprotect([IO.File]::ReadAllBytes($cp),$null,[Security.Cryptography.DataProtectionScope]::CurrentUser)) -cne $raw){throw 'Configuration backup failed'}
$originals|Select-Object Id,Name,Image|ConvertTo-Json|Set-Content (Join-Path $backup 'originals.json') -Encoding UTF8
$receiptPath=Join-Path $Root ('Archive\receipts\capability-cutover-'+$stamp+'.json')
$r=[ordered]@{Status='PREPARED';Backup=$backup;Scope='DIAGNOSTIC_ONLY_NOT_OFFICIAL';OriginalIds=@($originals.Id);CandidateImage=$image;Formula='NOT_EXECUTED';LearningLedger='NOT_UPDATED';ScriptSHA256=(Get-FileHash $PSCommandPath).Hash}
$r|ConvertTo-Json -Depth 6|Set-Content $receiptPath -Encoding UTF8
$stopped=$false;$created=$false;$tags=@();$checks=@()
try{
 $stopped=$true
 docker stop --time 30 @($originals.Id)|Out-Null
 if($LASTEXITCODE){throw 'Original stop failed'}
 $stopped=$true
 foreach($c in $originals){
  foreach($m in $c.Mounts){if(@(Get-ChildItem -LiteralPath $m.Source -File -Recurse -Force).Count){throw 'New source data appeared; reconcile before cutover'}}
  $tag='leeway-rollback/'+$c.Name.TrimStart('/')+':'+$stamp
  docker commit $c.Id $tag|Out-Null;if($LASTEXITCODE){throw 'Snapshot failed'}
  $tags+=$tag
 }
 $archive=Join-Path $backup 'original-images.tar'
 docker image save -o $archive @tags
 if($LASTEXITCODE){throw 'Image archive failed'}
 $archiveHash=(Get-FileHash $archive -Algorithm SHA256).Hash
 docker image load -i $archive|Out-Null
 if($LASTEXITCODE){throw 'Image archive reload failed'}
 $r['ArchiveSHA256']=$archiveHash;$r['SnapshotTags']=$tags;$r['ArchiveReloadVerified']=$true
 $r|ConvertTo-Json -Depth 6|Set-Content $receiptPath -Encoding UTF8
 foreach($lane in $lanes){foreach($kind in @('state','receipts')){$p=Join-Path $suite ('state\'+$lane.name+'\'+$kind);if(Test-Path $p){throw 'Production target already exists'};New-Item -ItemType Directory $p -Force|Out-Null}}
 docker compose -f (Join-Path $suite 'compose.json') --profile data-custody-verified config --quiet
 if($LASTEXITCODE){throw 'Compose validation failed'}
 $created=$true
 docker compose -f (Join-Path $suite 'compose.json') --profile data-custody-verified up -d --no-build
 if($LASTEXITCODE){throw 'Replacement start failed'}
 $created=$true
 for($attempt=0;$attempt -lt 20;$attempt++){
  try{$h=Invoke-RestMethod ('http://127.0.0.1:'+ $lanes[0].port+'/health') -TimeoutSec 3;if($h.ok){break}}catch{}
  Start-Sleep -Seconds 2
 }
 foreach($lane in $lanes){
  $url='http://127.0.0.1:'+$lane.port
  $h=Invoke-RestMethod ($url+'/health') -TimeoutSec 10
  $s=Invoke-RestMethod ($url+'/status') -TimeoutSec 10
  if(!$h.ok -or $h.runtime -ne $lane.name -or $s.runtime -ne $lane.name){throw 'Lane contract failed'}
  $body=@{request='LeeWay consolidation acceptance check';source='diagnostic-maintenance';approval_state='PENDING_APPROVAL';metadata=@{diagnostic=$true;external_execution=$false}}|ConvertTo-Json
  $w=Invoke-RestMethod ($url+'/work/create') -Method Post -ContentType application/json -Body $body -TimeoutSec 10
  if($w.work_order.runtime -ne $lane.name -or $w.work_order.approval_state -ne 'PENDING_APPROVAL'){throw 'Work contract failed'}
  $checks+=@{Name=$lane.name;Port=$lane.port;WorkId=$w.work_order.work_id}
 }
 docker restart leeway_capability_suite|Out-Null
 if($LASTEXITCODE){throw 'Replacement restart failed'}
 Start-Sleep -Seconds 4
 foreach($check in $checks){
  $url='http://127.0.0.1:'+$check.Port
  $latest=Invoke-RestMethod ($url+'/work/latest') -TimeoutSec 10
  $receipt=Invoke-RestMethod ($url+'/receipts/latest') -TimeoutSec 10
  if($latest.work_order.work_id -ne $check.WorkId -or $receipt.runtime -ne $check.Name){throw 'Persistence/receipt mismatch'}
 }
 docker exec leeway_capability_suite python /app/healthcheck.py
 if($LASTEXITCODE){throw 'Aggregate health failed'}
 $processes=@(docker top leeway_capability_suite -eo pid,comm)
 if($LASTEXITCODE -or @($processes|Where-Object {$_ -match '^\s*\d+\s+python'}).Count -ne 1){throw 'Process consolidation failed'}
 $r.Status='PROMOTED_PENDING_RETIREMENT';$r['Checks']=$checks;$r['RestartPersistence']=$true;$r['ReplacementId']=(docker inspect leeway_capability_suite --format '{{.Id}}')
}catch{
 $r.Status='CUTOVER_FAILED';$r['Failure']=$_.Exception.Message
 if($created){docker stop leeway_capability_suite|Out-Null}
 if($stopped){docker start @($originals.Id)|Out-Null;$r['RollbackStartExitCode']=$LASTEXITCODE}
 throw
}finally{
 $r['ScriptSHA256After']=(Get-FileHash $PSCommandPath).Hash
 $r|ConvertTo-Json -Depth 7|Set-Content $receiptPath -Encoding UTF8
}
Get-Content $receiptPath -Raw
#endregion


