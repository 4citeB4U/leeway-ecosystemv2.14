# LEEWAY-CAPABILITY-SUITE-CANDIDATE-PREPARE-V2
# Build only. Original E: data is inaccessible; do not promote or infer historical state is empty.
param([Parameter(Mandatory=$true)][string]$LeeWayRoot)
$ErrorActionPreference='Stop'
$suite=Join-Path $LeeWayRoot 'runtime\container-fabric\capability-suite'
$backup=Join-Path $LeeWayRoot 'Archive\backups\capability-suite-20260916'
$pub=Join-Path $LeeWayRoot 'Archive\tmp\docker-publication-20260916\docker\recovered-services'
Add-Type -AssemblyName System.Security
$bytes=[IO.File]::ReadAllBytes((Join-Path $backup 'originals.configuration.dpapi.bin'))
$originals=[Text.Encoding]::UTF8.GetString([Security.Cryptography.ProtectedData]::Unprotect($bytes,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser))|ConvertFrom-Json
$lanes=@();$sources=@();$baseline=@();$normalized=@();$custody=@()
$utf8=New-Object Text.UTF8Encoding($false)
foreach($c in $originals){
 $name=$c.Name.TrimStart('/');$sourceFile=Join-Path $pub "$name\app.py"
 $live=docker exec $c.Id sha256sum /app/app.py;if($LASTEXITCODE){throw 'Live source verification failed'}
 $hash=(Get-FileHash $sourceFile).Hash
 if(($live -split '\s+')[0] -ne $hash){throw 'Previously recovered source differs from live executable'}
 Copy-Item $sourceFile (Join-Path $backup ($name+'.app.py'))
 $source=[IO.File]::ReadAllText($sourceFile);$normalized+=$source.Replace($name,'LANE')
 $sources+=@{name=$name;id=$c.Id;image=$c.Image;sourceSHA256=$hash}
 $env=@{}
 foreach($e in $c.Config.Env){$kv=$e -split '=',2;if($kv[0] -like 'LEEWAY_*'){$env[$kv[0]]=$kv[1]}}
 $port=[int]$env.LEEWAY_RUNTIME_PORT
 $env.LEEWAY_RUNTIME_STATE='/data/'+$name+'/state';$env.LEEWAY_RECEIPT_DIR='/data/'+$name+'/receipts'
 $lanes+=@{name=$name;port=$port;environment=$env}
 New-Item -ItemType Directory (Join-Path $suite "test-state\$name\state"),(Join-Path $suite "test-state\$name\receipts") -Force|Out-Null
 $row=@{name=$name;port=$port;responses=@{};failures=@()}
 foreach($route in @('/health','/status','/work','/work/latest','/receipts/latest','/routes','/openapi.json')){
  try{$row.responses[$route]=Invoke-RestMethod -Uri ('http://127.0.0.1:'+$port+$route) -TimeoutSec 10}
  catch{$row.failures+=@{route=$route;reason='CURRENT_ENDPOINT_UNAVAILABLE'}}
 }
 $baseline+=$row
 $custody+=@{name=$name;originalBindData='INACCESSIBLE_E_DRIVE';canonicalStateDirectoryExists=(Test-Path (Join-Path $LeeWayRoot "runtime\$name-state"));candidateData='ISOLATED_EMPTY_TEST_FIXTURE';historicalDataRestored=$false}
}
if(@($normalized|Select-Object -Unique).Count -ne 1){throw 'Source equivalence failed'}
$common=$normalized[0].Replace('_leeway_service_name = "LANE"','_leeway_service_name = RUNTIME_NAME').Replace('os.environ.get(','settings.get(')
$common=$common.Replace('from fastapi.responses import HTMLResponse','from fastapi.responses import HTMLResponse, JSONResponse')
$common=$common.Replace("def health():","def health():"+[Environment]::NewLine+"    try:"+[Environment]::NewLine+"        STATE_DIR.stat(); RECEIPT_DIR.stat()"+[Environment]::NewLine+"        if not os.access(STATE_DIR, os.W_OK) or not os.access(RECEIPT_DIR, os.W_OK):"+[Environment]::NewLine+"            raise OSError('Storage is not writable')"+[Environment]::NewLine+"    except OSError:"+[Environment]::NewLine+"        return JSONResponse(status_code=503, content={'ok': False, 'runtime': RUNTIME_NAME, 'reason': 'STORAGE_UNAVAILABLE'})")
$factory="def create_app(settings):"+[Environment]::NewLine+(($common -split '\r?\n'|ForEach-Object {'    '+$_}) -join [Environment]::NewLine)+[Environment]::NewLine+'    return app'+[Environment]::NewLine
[IO.File]::WriteAllText((Join-Path $suite 'lane.py'),$factory,$utf8)
[IO.File]::WriteAllText((Join-Path $suite 'configuration\lanes.json'),($lanes|ConvertTo-Json -Depth 30),$utf8)
[IO.File]::WriteAllText((Join-Path $backup 'baseline.json'),($baseline|ConvertTo-Json -Depth 60),$utf8)
[IO.File]::WriteAllText((Join-Path $suite 'source-provenance.json'),($sources|ConvertTo-Json -Depth 10),$utf8)
[IO.File]::WriteAllText((Join-Path $suite 'data-custody.json'),($custody|ConvertTo-Json -Depth 10),$utf8)
$aliases=@($originals|ForEach-Object {$_.Name.TrimStart('/');$_.NetworkSettings.Networks.'leeway-ecosystemv214_leeway-net'.Aliases}|Where-Object {$_}|Select-Object -Unique)
$service=@{build='.';image='leeway-capability-suite:20260917';container_name='leeway_capability_suite';restart='unless-stopped';ports=@($lanes|ForEach-Object {"$($_.port):$($_.port)"});volumes=@('./configuration:/config:ro','./state:/data');networks=@{'leeway-net'=@{aliases=$aliases}};healthcheck=@{test=@('CMD','python','/app/healthcheck.py');interval='20s';timeout='10s';retries=3;start_period='20s'};labels=@{'leeway.object.id'='leeway.capability-suite';'leeway.execution.scope'='work-order-management'}}
$compose=@{name='leeway-capability-suite';services=@{capability_suite=$service};networks=@{'leeway-net'=@{external=$true;name='leeway-ecosystemv214_leeway-net'}}}
[IO.File]::WriteAllText((Join-Path $suite 'compose.json'),($compose|ConvertTo-Json -Depth 20),$utf8)
$service.container_name='leeway_capability_suite_candidate';$service.restart='no'
$service.ports=@($lanes|ForEach-Object {"127.0.0.1:$($_.port+20000):$($_.port)"})
$service.volumes=@('./configuration:/config:ro','./test-state:/data');$service.networks=@{'test-net'=@{}}
$compose.name='leeway-capability-suite-test';$compose.networks=@{'test-net'=@{internal=$false}}
[IO.File]::WriteAllText((Join-Path $suite 'candidate.json'),($compose|ConvertTo-Json -Depth 20),$utf8)
Write-Output 'EIGHT_EQUIVALENT_MODULES_PREPARED_WITH_TEST_DATA_ONLY'
& docker compose -f (Join-Path $suite 'candidate.json') up -d --build
if($LASTEXITCODE){throw 'Candidate build/start failed'}

