# LEEWAY-CAPABILITY-CANDIDATE-CHECKPOINT-V1
# Preserve tested source and receipts; remove only the isolated candidate and its generated fixtures.
param([Parameter(Mandatory=$true)][string]$LeeWayRoot)
$ErrorActionPreference='Stop'
$suite=Join-Path $LeeWayRoot 'runtime\container-fabric\capability-suite'
$repo=Join-Path $LeeWayRoot 'Archive\tmp\docker-publication-20260916'
$dest=Join-Path $repo 'docker\capability-suite'
$test=Get-Content (Join-Path $suite 'candidate-verification.json') -Raw|ConvertFrom-Json
if($test.status -ne 'CANDIDATE_VERIFIED_NOT_PROMOTED' -or $test.lanes -ne 8){throw 'Candidate proof missing'}
$compose=Get-Content (Join-Path $suite 'compose.json') -Raw|ConvertFrom-Json
$compose.services.capability_suite.volumes=@(@{type='bind';source='./configuration';target='/config';read_only=$true;bind=@{create_host_path=$false}},@{type='bind';source='./state';target='/data';bind=@{create_host_path=$false}})
$compose.services.capability_suite|Add-Member profiles @('data-custody-verified') -Force
$compose|ConvertTo-Json -Depth 25|Set-Content (Join-Path $suite 'compose.json') -Encoding UTF8
New-Item -ItemType Directory $dest -Force|Out-Null
foreach($f in @('lane.py','server.py','healthcheck.py','requirements.txt','Dockerfile','.dockerignore','.gitignore','compose.json','source-provenance.json','data-custody.json','candidate-verification.json')){Copy-Item (Join-Path $suite $f) (Join-Path $dest $f)}
$lanes=Get-Content (Join-Path $suite 'configuration\lanes.json') -Raw|ConvertFrom-Json
$example=@($lanes|ForEach-Object {@{name=$_.name;port=$_.port;environment=@{LEEWAY_RUNTIME_NAME=$_.name;LEEWAY_RUNTIME_TITLE=$_.name;LEEWAY_RUNTIME_LANE=$_.name;LEEWAY_RUNTIME_PORT=[string]$_.port;LEEWAY_RUNTIME_STATE=('/data/'+$_.name+'/state');LEEWAY_RECEIPT_DIR=('/data/'+$_.name+'/receipts');LEEWAY_RUNTIME_TRUTH_JSON='{"provider_execution":"UNVERIFIED"}';LEEWAY_RUNTIME_CAPABILITIES_JSON='[]'}}})
$example|ConvertTo-Json -Depth 15|Set-Content (Join-Path $dest 'lanes.example.json') -Encoding UTF8
foreach($f in @('Prepare-LeeWayCapabilitySuite-v1.ps1','Prepare-LeeWayCapabilityCandidate-v2.ps1','Test-LeeWayCapabilitySuite-v1.ps1','Save-LeeWayCapabilityCheckpoint-v1.ps1')){Copy-Item (Join-Path $LeeWayRoot "Archive\operator-scripts\$f") (Join-Path $repo "docker\recovery\$f")}
$bindings=Join-Path $LeeWayRoot 'Archive\diagnostics\docker-consolidation-20260916-152552\bind-accessibility-20260917.json'
Copy-Item $bindings (Join-Path $repo 'docker\evidence\bind-accessibility-20260917.json')
$c=docker inspect leeway_capability_suite_candidate|Out-String|ConvertFrom-Json
if($LASTEXITCODE -or $c[0].Config.Labels.'com.docker.compose.project' -ne 'leeway-capability-suite-test'){throw 'Candidate cleanup identity mismatch'}
docker compose -f (Join-Path $suite 'candidate.json') down --volumes
if($LASTEXITCODE){throw 'Candidate cleanup failed'}
$rows=@(docker ps -a --format '{{json .}}'|ForEach-Object {$_|ConvertFrom-Json})
$r=@{status='SOURCE_AND_CANDIDATE_VERIFIED_DEPLOYMENT_BLOCKED';time=(Get-Date).ToUniversalTime().ToString('o');productionContainers=$rows.Count;running=@($rows|Where-Object State -eq 'running').Count;stopped=@($rows|Where-Object State -ne 'running').Count;candidateRemoved=$true;candidateFixtureVolumesRemoved=$true;productionChanged=$false;originalDataDeleted=$false;blocker='Original E: state inaccessible; Docker Desktop D: mount stale; empty canonical copies do not prove complete history';proof='DIAGNOSTIC_ONLY_NOT_OFFICIAL';formulaExecution='NOT_EXECUTED';learningLedger='NOT_UPDATED';scriptSHA256=(Get-FileHash $PSCommandPath).Hash}
$r|ConvertTo-Json -Depth 8|Set-Content (Join-Path $LeeWayRoot 'Archive\receipts\capability-suite-checkpoint-20260917.json') -Encoding UTF8
$r|ConvertTo-Json -Depth 8|Set-Content (Join-Path $repo 'docker\evidence\capability-suite-checkpoint-20260917.json') -Encoding UTF8
$r|ConvertTo-Json -Depth 8

