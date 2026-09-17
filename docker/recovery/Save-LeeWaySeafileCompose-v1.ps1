# LEEWAY-SEAFILE-CANONICAL-COMPOSE-V1
# Capture verified live image digests and external volume bindings.
param([string]$LeeWayRoot='D:\LeeWay\Ecosystem')
$ErrorActionPreference='Stop'
$backup=Join-Path $LeeWayRoot 'Archive\backups\seafile-cutover-20260916'
$r=Get-Content (Join-Path $backup 'cutover-state.json') -Raw|ConvertFrom-Json
if($r.status -ne 'PRODUCTION_RECOVERY_VERIFIED'){throw 'Production recovery not verified'}
$dir=Join-Path $LeeWayRoot 'seafile'
$pub=Join-Path $LeeWayRoot 'Archive\tmp\docker-publication-20260916\docker\seafile'
New-Item -ItemType Directory $pub -Force|Out-Null
$services=[ordered]@{};$volumes=[ordered]@{};$secretLines=@();$example=@()
foreach($name in @('leeway-seafile-db','leeway-seafile-cache','leeway-seafile')){
 $all=docker inspect $name|Out-String|ConvertFrom-Json;if($LASTEXITCODE){throw 'Live inspect failed'};$c=$all[0]
 $im=docker image inspect $c.Image|Out-String|ConvertFrom-Json
 if($LASTEXITCODE -or !@($im[0].RepoDigests).Count){throw 'Immutable registry image digest missing'}
 $service=[ordered]@{image=$im[0].RepoDigests[0];container_name=$name;restart='unless-stopped';networks=@('seafile-net')}
 if($c.Config.Entrypoint){$service.entrypoint=@($c.Config.Entrypoint)}
 if($c.Config.Cmd){$service.command=@($c.Config.Cmd)}
 $env=[ordered]@{}
 foreach($line in $c.Config.Env){
  $pair=$line -split '=',2;$key=$pair[0];$value=$pair[1]
  if($key -notmatch '^(MYSQL_ROOT_PASSWORD|MYSQL_LOG_CONSOLE|MARIADB_AUTO_UPGRADE|DB_HOST|DB_ROOT_PASSWD|TIME_ZONE|SEAFILE_.*)$'){continue}
  if($key -match '(?i)PASSWORD|PASSWD|EMAIL'){
   if($value -match '[\r\n]'){throw 'Multiline credential requires manual encoding'}
   $variable='LEEWAY_SEAFILE_'+($name.Replace('-','_').ToUpper())+'_'+$key
   $env[$key]='$'+'{'+$variable+':?Set this value in the private .env file}'
   $secretLines+=$variable+"='"+$value.Replace("'","\'")+"'"
   $example+=$variable+'='
  }else{$env[$key]=$value}
 }
 if($env.Count){$service.environment=$env}
 $mounts=@()
 foreach($m in $c.Mounts){
  if($m.Type -ne 'volume'){throw 'Unexpected Seafile mount type'}
  $volumeKey=if($m.Destination -eq '/shared'){'seafile-data'}else{'seafile-db'}
  $volumes[$volumeKey]=@{external=$true;name=$m.Name}
  $mounts+=@{type='volume';source=$volumeKey;target=$m.Destination;read_only=(!$m.RW)}
 }
 if($mounts.Count){$service.volumes=$mounts}
 if($name -eq 'leeway-seafile'){$service.ports=@('8082:80');$service.depends_on=@{'leeway-seafile-db'=@{condition='service_healthy'};'leeway-seafile-cache'=@{condition='service_started'}}}
 if($c.Config.Healthcheck){
  $h=$c.Config.Healthcheck;$hc=@{test=@($h.Test)}
  foreach($pair in @(@('Interval','interval'),@('Timeout','timeout'),@('StartPeriod','start_period'))){$val=$h.($pair[0]);if($val){$hc[$pair[1]]=[string]$val+'ns'}}
  if($h.Retries){$hc.retries=$h.Retries};$service.healthcheck=$hc
 }
 $services[$name]=$service
}
$compose=@{name='seafile';services=$services;networks=@{'seafile-net'=@{external=$true;name='leeway-seafile-network'}};volumes=$volumes}
$utf8=New-Object Text.UTF8Encoding($false)
$composePath=Join-Path $dir 'docker-compose.yml';$envPath=Join-Path $dir '.env'
Copy-Item $composePath (Join-Path $backup 'original-docker-compose.yml') -ErrorAction Stop
$oldEnv=@()
if(Test-Path $envPath){Copy-Item $envPath (Join-Path $backup 'original.env');$oldEnv=@(Get-Content $envPath|Where-Object {$_ -notmatch '^LEEWAY_SEAFILE_'})}
[IO.File]::WriteAllText($envPath,(($oldEnv+$secretLines) -join [Environment]::NewLine)+[Environment]::NewLine,$utf8)
[IO.File]::WriteAllText($composePath,($compose|ConvertTo-Json -Depth 20)+[Environment]::NewLine,$utf8)
& docker compose --env-file $envPath -f $composePath config --quiet
if($LASTEXITCODE){throw 'Canonical Compose validation failed'}
Copy-Item $composePath (Join-Path $pub 'docker-compose.yml')
[IO.File]::WriteAllText((Join-Path $pub '.env.example'),($example -join [Environment]::NewLine)+[Environment]::NewLine,$utf8)
[IO.File]::WriteAllText((Join-Path $pub '.gitignore'),'.env'+[Environment]::NewLine,$utf8)
$readme=@'
# LeeWay Seafile recovery deployment

This recipe records the verified Seafile 11 application, MariaDB 10.11 and cache using immutable registry digests. It uses existing external data volumes and the existing network; it does not initialize a fresh empty replacement.

Copy .env.example to a private .env and restore the original protected credentials. Restore the recorded database and application volumes before starting on another machine. Never commit .env, database files or private recovery logs.

Run docker compose config --quiet, then docker compose up -d. Verify http://127.0.0.1:8082/api2/ping/ and application login. Recovery verified API ping, database authentication, both repository heads and read-only fsck; a user login/upload workflow was not exercised.

The original database volume and original recovery source volume remain preserved. The active database is the verified recovery clone. Evidence is in ../evidence/seafile-production-recovery.json. This recipe was validated against live configuration; the cutover itself used the saved PowerShell recovery script.
'@
[IO.File]::WriteAllText((Join-Path $pub 'README.md'),$readme,$utf8)
@{status='COMPOSE_VALIDATED';immutableImages=3;externalVolumes=$volumes.Count;secretValuesPublished=0;time=(Get-Date).ToUniversalTime().ToString('o');scriptSHA256=(Get-FileHash $PSCommandPath).Hash}|ConvertTo-Json|Set-Content (Join-Path $backup 'compose-recovery-receipt.json') -Encoding UTF8
Write-Output 'SEAFILE_COMPOSE_VALIDATED'

