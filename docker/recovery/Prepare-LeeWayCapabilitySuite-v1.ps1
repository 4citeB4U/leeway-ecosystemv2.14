# LEEWAY-CAPABILITY-SUITE-PREPARE-V1
# Authorized consolidation: eight equivalent work-order shells into one service host.
param([Parameter(Mandatory=$true)][string]$LeeWayRoot)
$ErrorActionPreference='Stop'
if(!(Test-Path (Join-Path $LeeWayRoot '.leeway-root'))){throw 'Root authority missing'}
$suite=Join-Path $LeeWayRoot 'runtime\container-fabric\capability-suite'
$backup=Join-Path $LeeWayRoot 'Archive\backups\capability-suite-20260916'
if(Test-Path $suite){throw 'Suite already exists; inspect before resuming'}
New-Item -ItemType Directory $suite,$backup,(Join-Path $suite 'configuration'),(Join-Path $suite 'test-state') -Force|Out-Null
$who=[Security.Principal.WindowsIdentity]::GetCurrent().Name
& icacls $backup /inheritance:r /grant:r "$($who):(OI)(CI)F" 'SYSTEM:(OI)(CI)F' 'Administrators:(OI)(CI)F'|Out-Null
if($LASTEXITCODE){throw 'Private backup ACL failed'}
$names=@('leeway_phone_runtime','leeway_email_runtime','leeway_calendar_runtime','leeway_browser_runtime','leeway_desktop_runtime','leeway_license_runtime','leeway_installer_runtime','leeway_pwa_dashboard')
$originals=docker inspect @names|Out-String|ConvertFrom-Json
if($LASTEXITCODE -or @($originals).Count -ne 8 -or @($originals|Where-Object {!$_.State.Running}).Count){throw 'Eight running originals required'}
Add-Type -AssemblyName System.Security
$bytes=[Text.Encoding]::UTF8.GetBytes(($originals|ConvertTo-Json -Depth 60))
$encrypted=[Security.Cryptography.ProtectedData]::Protect($bytes,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser)
[IO.File]::WriteAllBytes((Join-Path $backup 'originals.configuration.dpapi.bin'),$encrypted)
$clear=[Security.Cryptography.ProtectedData]::Unprotect($encrypted,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser)
if([Convert]::ToBase64String($bytes) -ne [Convert]::ToBase64String($clear)){throw 'Configuration preservation failed'}
$utf8=New-Object Text.UTF8Encoding($false)
$lanes=@();$baseline=@();$sources=@();$normalized=@()
foreach($c in $originals){
 $name=$c.Name.TrimStart('/');$dest=Join-Path $backup $name
 New-Item -ItemType Directory $dest,(Join-Path $dest 'state'),(Join-Path $dest 'receipts') -Force|Out-Null
 & docker cp ($c.Id+':/app/app.py') (Join-Path $dest 'app.py');if($LASTEXITCODE){throw 'Source copy failed'}
 & docker cp ($c.Id+':/state/.') (Join-Path $dest 'state');if($LASTEXITCODE){throw 'State copy failed'}
 & docker cp ($c.Id+':/app/receipts/.') (Join-Path $dest 'receipts');if($LASTEXITCODE){throw 'Receipts copy failed'}
 $source=[IO.File]::ReadAllText((Join-Path $dest 'app.py'))
 $normal=$source.Replace($name,'LANE')
 $normalized+=$normal
 $sources+=@{name=$name;sourceSHA256=(Get-FileHash (Join-Path $dest 'app.py')).Hash;id=$c.Id;image=$c.Image}
 $env=@{}
 foreach($e in $c.Config.Env){$kv=$e -split '=',2;if($kv[0] -like 'LEEWAY_*'){$env[$kv[0]]=$kv[1]}}
 $port=[int]$env.LEEWAY_RUNTIME_PORT
 if($port -lt 5330 -or $port -gt 5337){throw 'Unexpected legacy port'}
 $env.LEEWAY_RUNTIME_STATE='/data/'+$name+'/state'
 $env.LEEWAY_RECEIPT_DIR='/data/'+$name+'/receipts'
 $lanes+=@{name=$name;port=$port;environment=$env}
 $row=@{name=$name;port=$port;responses=@{}}
 foreach($route in @('/health','/status','/work','/work/latest','/receipts/latest','/routes','/openapi.json')){
  $row.responses[$route]=Invoke-RestMethod -Uri ('http://127.0.0.1:'+$port+$route) -TimeoutSec 15
 }
 $baseline+=$row
 Copy-Item $dest (Join-Path $suite 'test-state') -Recurse
}
if(@($normalized|Select-Object -Unique).Count -ne 1){throw 'Sources differ beyond service identity; consolidation rejected'}
$common=$normalized[0].Replace('_leeway_service_name = "LANE"','_leeway_service_name = RUNTIME_NAME').Replace('os.environ.get(','settings.get(')
$factory="def create_app(settings):"+[Environment]::NewLine
$factory+=(($common -split '\r?\n'|ForEach-Object {'    '+$_}) -join [Environment]::NewLine)
$factory+=[Environment]::NewLine+'    return app'+[Environment]::NewLine
[IO.File]::WriteAllText((Join-Path $suite 'lane.py'),$factory,$utf8)
[IO.File]::WriteAllText((Join-Path $suite 'configuration\lanes.json'),($lanes|ConvertTo-Json -Depth 30),$utf8)
[IO.File]::WriteAllText((Join-Path $backup 'baseline.json'),($baseline|ConvertTo-Json -Depth 60),$utf8)
[IO.File]::WriteAllText((Join-Path $suite 'source-provenance.json'),($sources|ConvertTo-Json -Depth 10),$utf8)
$aliases=@($originals|ForEach-Object {$_.Name.TrimStart('/');$_.NetworkSettings.Networks.'leeway-ecosystemv214_leeway-net'.Aliases}|Where-Object {$_}|Select-Object -Unique)
$service=@{build='.';image='leeway-capability-suite:20260916';container_name='leeway_capability_suite';restart='unless-stopped';ports=@($lanes|ForEach-Object {"$($_.port):$($_.port)"});volumes=@('./configuration:/config:ro','./state:/data');networks=@{'leeway-net'=@{aliases=$aliases}};healthcheck=@{test=@('CMD','python','/app/healthcheck.py');interval='20s';timeout='10s';retries=3;start_period='20s'}}
$compose=@{name='leeway-capability-suite';services=@{capability_suite=$service};networks=@{'leeway-net'=@{external=$true;name='leeway-ecosystemv214_leeway-net'}}}
[IO.File]::WriteAllText((Join-Path $suite 'compose.json'),($compose|ConvertTo-Json -Depth 20),$utf8)
$service.container_name='leeway_capability_suite_candidate';$service.restart='no'
$service.ports=@($lanes|ForEach-Object {"127.0.0.1:$($_.port+20000):$($_.port)"})
$service.volumes=@('./configuration:/config:ro','./test-state:/data')
$service.networks=@{'test-net'=@{}}
$compose.name='leeway-capability-suite-test';$compose.networks=@{'test-net'=@{internal=$false}}
[IO.File]::WriteAllText((Join-Path $suite 'candidate.json'),($compose|ConvertTo-Json -Depth 20),$utf8)
Write-Output ('PREPARED_EQUIVALENT_LANES='+$lanes.Count)

