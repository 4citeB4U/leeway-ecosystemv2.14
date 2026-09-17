#region LEEWAY_IDENTITY
# TAG: LEEWAY-DOCKER-CONSOLIDATION-DISCOVERY-V1
# WHO: Agent Lee under Leonard Lee authorization.
# WHAT: Read-only Docker evidence and recreation coverage inventory.
# WHY: Establish safe consolidation and retirement boundaries.
# WHERE: Verified LeeWay root; WHEN: invocation timestamp; HOW: native Docker inspection.
# ROLE: diagnostic operator. LICENSE: MIT.
#endregion
param([Parameter(Mandatory=$true)][string]$LeeWayRoot,[string]$ResumeRun)
$ErrorActionPreference='Stop'
$marker=Join-Path $LeeWayRoot '.leeway-root'
if ((Get-Content -LiteralPath $marker -Raw | ConvertFrom-Json).ecosystemId -ne 'leeway.ecosystem') { throw 'Root authority mismatch' }
$stamp=Get-Date -Format 'yyyyMMdd-HHmmss'
$run=if($ResumeRun){$ResumeRun}else{Join-Path $LeeWayRoot "Archive\diagnostics\docker-consolidation-$stamp"}
if(!$ResumeRun){New-Item -ItemType Directory -Path $run | Out-Null}
$utf8=New-Object System.Text.UTF8Encoding($false)
function Save-Json($name,$value) { [IO.File]::WriteAllText((Join-Path $run $name),($value|ConvertTo-Json -Depth 35),$utf8) }
if(!$ResumeRun){
$ids=@(& docker ps -aq)
if ($LASTEXITCODE -ne 0 -or $ids.Count -eq 0) { throw 'Docker inventory unavailable' }
$all=@((& docker inspect @ids | Out-String | ConvertFrom-Json))
if ($LASTEXITCODE -ne 0 -or $all.Count -ne $ids.Count) { throw 'Incomplete inspect' }
$rows=@()
$diffs=@()
$processes=@()
foreach($c in $all) {
  $compose=@()
  foreach($p in @($c.Config.Labels.'com.docker.compose.project.config_files' -split ',' | Where-Object {$_})) {
    $exists=Test-Path -LiteralPath $p -PathType Leaf
    $hash=if($exists){(Get-FileHash -LiteralPath $p -Algorithm SHA256).Hash}else{$null}
    $compose+=@{path=$p;exists=$exists;sha256=$hash}
  }
  $rows+= [ordered]@{id=$c.Id;name=$c.Name.TrimStart('/');state=$c.State.Status;health=$c.State.Health.Status;image=$c.Image;imageTag=$c.Config.Image;executable=$c.Path;workingDirectory=$c.Config.WorkingDir;restart=$c.HostConfig.RestartPolicy;ports=$c.HostConfig.PortBindings;activePorts=$c.NetworkSettings.Ports;networks=$c.NetworkSettings.Networks;mounts=$c.Mounts;compose=$compose;environmentNames=@($c.Config.Env|ForEach-Object{($_ -split '=',2)[0]});hasHealthcheck=($null -ne $c.Config.Healthcheck);privileged=$c.HostConfig.Privileged}
  if($c.State.Running){
    $top=@(& docker top $c.Id -eo pid,ppid,comm 2>&1)
    $processes+=@{id=$c.Id;name=$c.Name;exit=$LASTEXITCODE;processes=$top}
  } else {
    $delta=@(& docker diff $c.Id 2>&1)
    $diffs+=@{id=$c.Id;name=$c.Name;exit=$LASTEXITCODE;changes=$delta}
  }
}
Save-Json 'containers.json' $rows
Save-Json 'running-processes.json' $processes
Save-Json 'stopped-writable-layer-changes.json' $diffs
}else{$rows=(Get-Content -LiteralPath (Join-Path $run 'containers.json') -Raw|ConvertFrom-Json)}
$summary=[ordered]@{timestamp=(Get-Date).ToUniversalTime().ToString('o');total=$rows.Count;running=@($rows|Where-Object{$_.state -eq 'running'}).Count;exited=@($rows|Where-Object{$_.state -eq 'exited'}).Count;created=@($rows|Where-Object{$_.state -eq 'created'}).Count;runningUnhealthy=@($rows|Where-Object{$_.state -eq 'running' -and $_.health -eq 'unhealthy'}|ForEach-Object{$_.name});runningWithoutHealthcheck=@($rows|Where-Object{$_.state -eq 'running' -and !$_.hasHealthcheck}).Count;withoutCompose=@($rows|Where-Object{@($_.compose).Count -eq 0}).Count;missingComposePaths=@($rows|ForEach-Object{$_.compose}|Where-Object{!$_.exists}|ForEach-Object{$_.path}|Sort-Object -Unique);dockerMutation=$false;formulaExecution='NOT_EXECUTED';controlSurface='Desktop Commander';proof='DIAGNOSTIC_ONLY_NOT_OFFICIAL';resumedFromSavedInventory=[bool]$ResumeRun}
Save-Json 'summary.json' $summary
$files=@(Get-ChildItem -LiteralPath $run -File | ForEach-Object{@{name=$_.Name;sha256=(Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash;bytes=$_.Length}})
Save-Json 'manifest.json' $files
$receipt=[ordered]@{schema='leeway.docker.discovery.receipt.v1';status='INVENTORY_CAPTURED_NOT_CONSOLIDATED';createdAt=(Get-Date).ToUniversalTime().ToString('o');rootIdentity='leeway.ecosystem';runRoot=$run;scriptSHA256=(Get-FileHash -LiteralPath $PSCommandPath -Algorithm SHA256).Hash;manifestSHA256=(Get-FileHash -LiteralPath (Join-Path $run 'manifest.json') -Algorithm SHA256).Hash;summary=$summary;learningLedgerUpdated=$false;deletions=0}
$receiptPath=Join-Path $LeeWayRoot "Archive\receipts\docker-consolidation-discovery-$stamp.json"
[IO.File]::WriteAllText($receiptPath,($receipt|ConvertTo-Json -Depth 20),$utf8)
$summary|ConvertTo-Json -Depth 6
Write-Output "RUN_ROOT=$run"
Write-Output "RECEIPT=$receiptPath"

