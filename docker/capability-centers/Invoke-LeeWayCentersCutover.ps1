#region LEEWAY_IDENTITY
# TAG: LEEWAY-CAPABILITY-CENTERS-CUTOVER-V1
# WHO: Agent Lee under Leonard Lee authorization.
# WHAT: Consolidate four verified registry servers; preserve source, images, state and rollback.
# WHY: Eliminate duplicate runtime processes. WHERE: verified LeeWay root.
# WHEN: explicit invocation. HOW: backup, compare, stop, start, verify, retire.
# ROLE: infrastructure operator. LICENSE: MIT.
#endregion
param([Parameter(Mandatory=$true)][string]$LeeWayRoot,[Parameter(Mandatory=$true)][string]$SourceDir)
$ErrorActionPreference='Stop'
if((Get-Content (Join-Path $LeeWayRoot '.leeway-root') -Raw|ConvertFrom-Json).ecosystemId -ne 'leeway.ecosystem'){throw 'Wrong root'}
$names=@('leeway_agent_center','leeway_mcp_agent_center','leeway_worker_center','leeway_mcp_center')
$keys=@('agent-center','mcp-agent-center','worker-center','mcp-center')
$expected=@('1099317041b7','a83b52cb97c0','5832b7f6e2cb','c69b47d7ed5c')
$before=docker inspect @names|Out-String|ConvertFrom-Json
if($LASTEXITCODE -or $before.Count -ne 4){throw 'Incomplete baseline'}
for($i=0;$i -lt 4;$i++){
  if(!$before[$i].Id.StartsWith($expected[$i]) -or !$before[$i].State.Running -or @($before[$i].Mounts).Count){throw 'Baseline drift'}
}
$stamp=Get-Date -Format yyyyMMdd-HHmmss
$backup=Join-Path $LeeWayRoot "Archive\backups\docker-centers-$stamp"
New-Item -ItemType Directory -Path $backup|Out-Null
$utf8=New-Object Text.UTF8Encoding($false)
function Save($file,$obj){[IO.File]::WriteAllText((Join-Path $backup $file),($obj|ConvertTo-Json -Depth 30),$utf8)}
$states=@()
foreach($port in 8860..8863){$states+=Invoke-RestMethod "http://127.0.0.1:$port/state" -TimeoutSec 5}
Add-Type -AssemblyName System.Security; $bytes=[Text.Encoding]::UTF8.GetBytes(($before|ConvertTo-Json -Depth 50)); [IO.File]::WriteAllBytes((Join-Path $backup 'container-configs.dpapi.bin'),[Security.Cryptography.ProtectedData]::Protect($bytes,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser))
$bytes=[Text.Encoding]::UTF8.GetBytes(($states|ConvertTo-Json -Depth 50)); [IO.File]::WriteAllBytes((Join-Path $backup 'runtime-states.dpapi.bin'),[Security.Cryptography.ProtectedData]::Protect($bytes,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser))
$test=docker exec leeway_capability_centers_candidate node /app/verify.mjs
if($LASTEXITCODE){throw 'Candidate equivalence failed'}
Save 'precutover-tests.json' ($test|ConvertFrom-Json)
$images=@($before|ForEach-Object{$_.Config.Image})
& docker image save --output (Join-Path $backup 'original-center-images.tar') @images
if($LASTEXITCODE){throw 'Image backup failed'}
$imageHash=(Get-FileHash (Join-Path $backup 'original-center-images.tar') -Algorithm SHA256).Hash
$canonical=Join-Path $LeeWayRoot 'agent-lee-coding-mode\capability-center-runtime-v23\consolidated-v1'
if(Test-Path $canonical){throw 'Canonical target already exists; inspect before retry'}
Copy-Item -LiteralPath $SourceDir -Destination $canonical -Recurse
$compose=Join-Path $canonical 'compose.json'
& docker compose -f $compose config --quiet
if($LASTEXITCODE){throw 'Canonical Compose invalid'}
$stopped=$false
$result='FAILED'
try {
  $stopped=$true
  & docker stop --time 15 @names
  if($LASTEXITCODE){throw 'Stop failed'}
  $stopped=$true
  & docker compose -f $compose up -d --no-build --wait --wait-timeout 45
  if($LASTEXITCODE){throw 'Consolidated startup failed'}
  $checks=@()
  for($i=0;$i -lt 4;$i++){
    $port=8860+$i
    $h=Invoke-RestMethod "http://127.0.0.1:$port/health" -TimeoutSec 5
    $r=Invoke-RestMethod "http://127.0.0.1:$port/registry" -TimeoutSec 5
    $wanted=Get-Content (Join-Path $canonical "registries\$($keys[$i]).json") -Raw|ConvertFrom-Json
    if($h.centerId -ne "leeway-$($keys[$i])" -or ($r|ConvertTo-Json -Depth 25 -Compress) -ne ($wanted|ConvertTo-Json -Depth 25 -Compress)){throw "Contract mismatch on $port"}
    $checks+=@{port=$port;identity=$h.centerId;items=$h.itemCount;registry='EXACT_JSON_EQUIVALENCE'}
  }
  & docker exec leeway_runtime_fabric getent hosts @names
  if($LASTEXITCODE){throw 'Runtime Fabric cannot resolve legacy names'}
  Save 'postcutover-checks.json' $checks
  $result='CUTOVER_VERIFIED'
} catch {
  $failure=$_.Exception.Message
  if($stopped){
    & docker compose -f $compose down
    & docker start @names
    $restored=docker inspect @names|Out-String|ConvertFrom-Json
    $result=if(@($restored|Where-Object{$_.State.Running}).Count -eq 4){'ROLLED_BACK'}else{'ROLLBACK_FAILED'}
  }
  throw
} finally {
  $receipt=@{schema='leeway.docker.centers.cutover.v1';status=$result;createdAt=(Get-Date).ToUniversalTime().ToString('o');controlSurface='Desktop Commander';proof='DIAGNOSTIC_ONLY_NOT_OFFICIAL';formulaExecution='NOT_EXECUTED';backup=$backup;imageBackupSha256=$imageHash;canonicalSource=$canonical;originalContainers=$names;error=$failure;scriptSha256=(Get-FileHash $PSCommandPath -Algorithm SHA256).Hash;learningLedgerUpdated=$false}
  Save 'receipt.json' $receipt
  $rp=Join-Path $LeeWayRoot "Archive\receipts\docker-centers-cutover-$stamp.json"
  [IO.File]::WriteAllText($rp,($receipt|ConvertTo-Json -Depth 10),$utf8)
  Write-Output "RECEIPT=$rp"
}
Write-Output "BACKUP=$backup"
Write-Output "RESULT=$result"
