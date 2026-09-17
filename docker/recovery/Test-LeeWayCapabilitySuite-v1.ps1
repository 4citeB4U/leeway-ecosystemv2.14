# LEEWAY-CAPABILITY-SUITE-VERIFY-V1
# Tests use isolated candidate data. No production state or external actions.
param([Parameter(Mandatory=$true)][string]$LeeWayRoot)
$ErrorActionPreference='Stop'
$suite=Join-Path $LeeWayRoot 'runtime\container-fabric\capability-suite'
$lanes=Get-Content (Join-Path $suite 'configuration\lanes.json') -Raw|ConvertFrom-Json
$checks=@();$created=@()
foreach($lane in $lanes){
 $url='http://127.0.0.1:'+($lane.port+20000)
 $health=Invoke-RestMethod ($url+'/health') -TimeoutSec 10
 if(!$health.ok -or $health.runtime -ne $lane.name){throw 'Wrong lane identity'}
 $cross=Invoke-RestMethod ($url+'/health') -Headers @{Host='other-capability.invalid'} -TimeoutSec 10
 if($cross.runtime -ne $lane.name){throw 'Host header changed lane routing'}
 $status=Invoke-RestMethod ($url+'/status') -TimeoutSec 10
 if($status.runtime -ne $lane.name){throw 'Status lane identity mismatch'}
 $bad=0
 try{$null=Invoke-WebRequest -UseBasicParsing ($url+'/work/create') -Method Post -ContentType application/json -Body '{"request":""}' -TimeoutSec 10}catch{$bad=[int]$_.Exception.Response.StatusCode}
 if($bad -ne 422){throw 'Invalid work order was not rejected'}
 $work=Invoke-RestMethod ($url+'/work/create') -Method Post -ContentType application/json -Body '{"request":"LeeWay isolated consolidation test","source":"diagnostic-test","approval_state":"PENDING_APPROVAL","metadata":{"test":true}}' -TimeoutSec 10
 if($work.work_order.runtime -ne $lane.name -or $work.work_order.status -ne 'WORK_ORDER_CREATED' -or $work.work_order.approval_state -ne 'PENDING_APPROVAL'){throw 'Work-order contract failed'}
 $latest=Invoke-RestMethod ($url+'/work/latest') -TimeoutSec 10
 $receipt=Invoke-RestMethod ($url+'/receipts/latest') -TimeoutSec 10
 if($latest.work_order.work_id -ne $work.work_order.work_id -or $receipt.runtime -ne $lane.name){throw 'Persisted lane identity mismatch'}
 $created+=@{name=$lane.name;port=$lane.port;workId=$work.work_order.work_id}
 $checks+=@{name=$lane.name;health=$true;status=$true;hostHeaderIsolation=$true;invalidPayload422=$true;workOrderCreated=$true;receiptIdentity=$true}
}
docker restart leeway_capability_suite_candidate|Out-Null
if($LASTEXITCODE){throw 'Candidate restart failed'}
Start-Sleep -Seconds 3
foreach($item in $created){
 $latest=Invoke-RestMethod ('http://127.0.0.1:'+($item.port+20000)+'/work/latest') -TimeoutSec 10
 if($latest.work_order.work_id -ne $item.workId){throw 'Persistence after restart failed'}
}
$lane=$lanes[0];$folder='/data/'+$lane.name+'/receipts'
docker exec leeway_capability_suite_candidate mv $folder ($folder+'.test-unavailable')
if($LASTEXITCODE){throw 'Failure-path setup failed'}
$failureStatus=0
try{try{$null=Invoke-WebRequest -UseBasicParsing ('http://127.0.0.1:'+($lane.port+20000)+'/health') -TimeoutSec 10}catch{$failureStatus=[int]$_.Exception.Response.StatusCode}}
finally{docker exec leeway_capability_suite_candidate mv ($folder+'.test-unavailable') $folder|Out-Null;if($LASTEXITCODE){throw 'Failure-path cleanup failed'}}
if($failureStatus -ne 503){throw 'Missing storage was reported healthy'}
docker exec leeway_capability_suite_candidate python /app/healthcheck.py
if($LASTEXITCODE){throw 'Aggregate health check failed'}
$processes=@(docker top leeway_capability_suite_candidate -eo pid,comm)
if($LASTEXITCODE -or @($processes|Where-Object {$_ -match '^\s*\d+\s+python'}).Count -ne 1){throw 'Expected one Python server process'}
$r=@{status='CANDIDATE_VERIFIED_NOT_PROMOTED';lanes=8;checks=$checks;restartPersistence=$true;storageFailureReturns503=$true;serverProcesses=1;data='ISOLATED_TEST_FIXTURES';historicalDataRestored=$false;productionChanged=$false;time=(Get-Date).ToUniversalTime().ToString('o');proof='DIAGNOSTIC_ONLY_NOT_OFFICIAL';formulaExecution='NOT_EXECUTED';scriptSHA256=(Get-FileHash $PSCommandPath).Hash}
$r|ConvertTo-Json -Depth 8|Set-Content (Join-Path $suite 'candidate-verification.json') -Encoding UTF8
$r|ConvertTo-Json -Depth 8

