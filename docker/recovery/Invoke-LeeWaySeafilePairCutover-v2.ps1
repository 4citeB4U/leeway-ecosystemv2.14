# LEEWAY-SEAFILE-PAIR-CUTOVER-V2
# C3 diagnostic. Promote verified recovery clone; preserve original database and application data.
param([string]$LeeWayRoot='D:\LeeWay\Ecosystem')
$ErrorActionPreference='Stop'
$dir=Join-Path $LeeWayRoot 'Archive\diagnostics\docker-consolidation-20260916-152552\seafile-recovery'
$backup=Join-Path $LeeWayRoot 'Archive\backups\seafile-cutover-20260916'
$auth=Get-Content (Join-Path $dir 'clone-credential-reconciliation.json') -Raw|ConvertFrom-Json
$fsck=Get-Content (Join-Path $dir 'fsck-readonly-result.json') -Raw|ConvertFrom-Json
if(!$auth.rootAuthenticationVerified -or $fsck.exit -ne 0 -or $fsck.repositoriesChecked -ne 2){throw 'Recovery proofs incomplete'}
function Inspect($n){$v=docker inspect $n|Out-String|ConvertFrom-Json;if($LASTEXITCODE){throw 'Inspect failed'};return $v[0]}
$app=Inspect 'leeway-seafile';$db=Inspect 'leeway-seafile-db';$candidate=Inspect 'leeway_seafile_db_check_20260916'
if($db.Id -ne '1e08f8bca2316c42b8a8f1e1f6e44085c009e758ba4d3c79d23d6c7aa1f77051' -or $app.Id -ne 'b549d876ea739dd8ee3dd9643e31a4f0e56d42dbd9385cf9a017d10c2938603b'){throw 'Production identity drift'}
if($candidate.Mounts[0].Name -ne 'leeway-seafile-db-recovery-clone-20260916' -or $candidate.Config.Labels.'leeway.scope' -ne 'seafile-recovery-check'){throw 'Candidate identity drift'}
$oldName='leeway_seafile_db_before_recovery_20260916';$network='leeway-seafile-network'
if(@(docker ps -aq --filter "name=^/$oldName$").Count){throw 'Rollback identity already exists'}
$ctx=docker context inspect (docker context show)|Out-String|ConvertFrom-Json
$pipeName=($ctx[0].Endpoints.docker.Host -split '/')[-1];$api=docker version --format '{{.Server.APIVersion}}'
function CreateContainer($name,$config){
 $body=[Text.Encoding]::UTF8.GetBytes(($config|ConvertTo-Json -Depth 60 -Compress));$crlf=[string][char]13+[char]10
 $header='POST /v'+$api+'/containers/create?name='+[Uri]::EscapeDataString($name)+' HTTP/1.1'+$crlf+'Host: docker'+$crlf+'Content-Type: application/json'+$crlf+'Content-Length: '+$body.Length+$crlf+'Connection: close'+$crlf+$crlf
 $stream=New-Object IO.Pipes.NamedPipeClientStream('.',$pipeName,[IO.Pipes.PipeDirection]::InOut)
 try{$stream.Connect(5000);$head=[Text.Encoding]::ASCII.GetBytes($header);$stream.Write($head,0,$head.Length);$stream.Write($body,0,$body.Length);$stream.Flush();$reader=New-Object IO.StreamReader($stream);$response=$reader.ReadToEnd()}finally{$stream.Dispose()}
 if(($response -split $crlf)[0] -notmatch ' 201 '){throw 'Docker create failed; response withheld to protect credentials'}
 return (Inspect $name).Id
}

$python=@'
import configparser,pathlib,json,urllib.request,pymysql
c=configparser.ConfigParser();c.read('/shared/seafile/conf/seafile.conf');d=c['database']
con=pymysql.connect(host=d.get('host'),user=d.get('user'),password=d.get('password'),database=d.get('db_name','seafile_db'),port=int(d.get('port','3306')))
with con.cursor() as cur:
 cur.execute("SELECT r.repo_id,b.commit_id FROM Repo r LEFT JOIN Branch b ON r.repo_id=b.repo_id AND b.name='master'")
 rows=cur.fetchall()
base=pathlib.Path('/shared/seafile/seafile-data/storage/commits')
missing=sum(not head or not(base/repo/head[:2]/head[2:]).is_file() for repo,head in rows)
resp=urllib.request.urlopen('http://127.0.0.1/api2/ping/',timeout=5)
print(json.dumps(dict(repositories=len(rows),missingHeadObjects=missing,apiPingStatus=resp.status,serviceDatabaseAuthentication=True)))
'@
& docker start $candidate.Id|Out-Null;if($LASTEXITCODE){throw 'Candidate DB resume failed'}
& docker start leeway_seafile_app_check_20260916|Out-Null;if($LASTEXITCODE){throw 'Candidate app resume failed'}
$ready=$false
for($i=0;$i -lt 60;$i++){if((Inspect 'leeway_seafile_app_check_20260916').State.Health.Status -eq 'healthy'){$ready=$true;break};Start-Sleep -Seconds 2}
if(!$ready){throw 'Candidate must pass fresh health before pair promotion'}
$check=$python|docker exec -i leeway_seafile_app_check_20260916 python3 -
if($LASTEXITCODE){throw 'Fresh candidate application check failed'}
$pre=$check|ConvertFrom-Json
if($pre.repositories -ne 2 -or $pre.missingHeadObjects -ne 0 -or $pre.apiPingStatus -ne 200){throw 'Candidate data proof mismatch'}
Add-Type -AssemblyName System.Security
$bytes=[Text.Encoding]::UTF8.GetBytes((@($app,$db)|ConvertTo-Json -Depth 60))
$encrypted=[Security.Cryptography.ProtectedData]::Protect($bytes,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser)
[IO.File]::WriteAllBytes((Join-Path $backup 'production-before-pair.configuration.dpapi.bin'),$encrypted)
$roundtrip=[Security.Cryptography.ProtectedData]::Unprotect($encrypted,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser)
if([Convert]::ToBase64String($bytes) -ne [Convert]::ToBase64String($roundtrip)){throw 'Recovery configuration roundtrip failed'}
$state=@{status='PRECHECK_VERIFIED';oldDatabaseId=$db.Id;originalDatabaseVolume='leeway-seafile-db';recoveredDatabaseVolume=$candidate.Mounts[0].Name;originalDataVolumesRetained=$true;time=(Get-Date).ToUniversalTime().ToString('o')}
$state|ConvertTo-Json|Set-Content (Join-Path $backup 'cutover-state.json') -Encoding UTF8
& docker stop leeway_seafile_app_check_20260916|Out-Null;if($LASTEXITCODE){throw 'Candidate app stop failed'}
& docker stop $candidate.Id|Out-Null;if($LASTEXITCODE){throw 'Candidate database stop failed'}
& docker stop $app.Id|Out-Null;if($LASTEXITCODE){throw 'Production app stop failed'}
New-Item -ItemType Directory (Join-Path $backup 'original-app-data-before-pair') -Force|Out-Null
& docker cp 'leeway-seafile:/shared/.' (Join-Path $backup 'original-app-data-before-pair')
if($LASTEXITCODE){& docker start $app.Id|Out-Null;throw 'Application data backup failed'}
$renamed=$false;$disconnected=$false;$newId=$null;$success=$false;$newApp=$null;$appRenamed=$false;$appDisconnected=$false
try{
 & docker stop $db.Id|Out-Null;if($LASTEXITCODE){throw 'Original database stop failed'}
 & docker network disconnect $network $db.Id|Out-Null;if($LASTEXITCODE){throw 'Original network detach failed'};$disconnected=$true
 & docker rename $db.Id $oldName;if($LASTEXITCODE){throw 'Original identity preservation failed'};$renamed=$true
 $cfg=$db.Config;$cfg.Image=$db.Image
 $hc=$db.HostConfig;$hc.Binds=$null
 $hc|Add-Member Mounts @(@{Type='volume';Source=$candidate.Mounts[0].Name;Target='/var/lib/mysql'}) -Force
 $cfg|Add-Member HostConfig $hc -Force
 $cfg|Add-Member NetworkingConfig @{EndpointsConfig=@{$network=@{Aliases=@('leeway-seafile-db')}}} -Force
 $newId=CreateContainer 'leeway-seafile-db' $cfg
 & docker start $newId|Out-Null;if($LASTEXITCODE){throw 'Recovered database start failed'}
 $dbReady=$false
 for($i=0;$i -lt 60;$i++){if((Inspect $newId).State.Health.Status -eq 'healthy'){$dbReady=$true;break};Start-Sleep -Seconds 2}
 if(!$dbReady){throw 'Recovered database health failed'}
 & docker network disconnect $network $app.Id|Out-Null;if($LASTEXITCODE){throw 'Original app network detach failed'};$appDisconnected=$true
 & docker rename $app.Id 'leeway_seafile_app_before_recovery_20260916';if($LASTEXITCODE){throw 'Original app rename failed'};$appRenamed=$true
 $appCfg=$app.Config;$appCfg.Image=$app.Image;$ah=$app.HostConfig;$ah.Binds=$null
 $ah|Add-Member Mounts @(@{Type='volume';Source='leeway-seafile-data-recovery-clone-20260916';Target='/shared'}) -Force
 $appCfg|Add-Member HostConfig $ah -Force
 $appCfg|Add-Member NetworkingConfig @{EndpointsConfig=@{$network=@{Aliases=@('leeway-seafile')}}} -Force
 $newApp=CreateContainer 'leeway-seafile' $appCfg
 & docker start $newApp|Out-Null;if($LASTEXITCODE){throw 'Recovered application start failed'}
 $ready=$false
 for($i=0;$i -lt 90;$i++){try{$response=Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:8082/api2/ping/' -TimeoutSec 5;if($response.StatusCode -eq 200 -and $response.Content -match 'pong'){$ready=$true;break}}catch{};Start-Sleep -Seconds 2}
 if(!$ready){throw 'Production HTTP ping failed'}
 $check=$python|docker exec -i leeway-seafile python3 -
 if($LASTEXITCODE){throw 'Production repository link check failed'}
 $post=$check|ConvertFrom-Json
 if($post.repositories -ne 2 -or $post.missingHeadObjects -ne 0){throw 'Production repository integrity failed'}
 $ErrorActionPreference='Continue';$fsckOutput=& docker exec -w /opt/seafile/seafile-server-latest leeway-seafile ./seaf-fsck.sh 2>&1;$code=$LASTEXITCODE;$ErrorActionPreference='Stop'
 $fsckOutput|Set-Content (Join-Path $backup 'production-fsck-readonly.log') -Encoding UTF8
 if($code -or ($fsckOutput -join [Environment]::NewLine) -match '(?i)corrupt|damaged|failed'){throw 'Production read-only fsck failed'}
 $success=$true
 $state=@{status='PRODUCTION_RECOVERY_VERIFIED';time=(Get-Date).ToUniversalTime().ToString('o');oldDatabaseId=$db.Id;newDatabaseId=$newId;oldApplicationId=$app.Id;newApplicationId=$newApp;activeApplicationVolume='leeway-seafile-data-recovery-clone-20260916';httpPing=200;repositories=$post.repositories;missingHeadObjects=$post.missingHeadObjects;serviceDatabaseAuthentication=$true;readOnlyFsckExit=$code;rootAuthenticationVerifiedInCandidate=$true;originalDatabaseVolume='leeway-seafile-db';recoveredDatabaseVolume=$candidate.Mounts[0].Name;originalDataVolumesRetained=$true;appImageUnchanged=$true;databaseImageUnchanged=$true;proof='DIAGNOSTIC_ONLY_NOT_OFFICIAL';formulaExecution='NOT_EXECUTED';learningLedger='NOT_UPDATED';scriptSHA256=(Get-FileHash $PSCommandPath).Hash}
 $state|ConvertTo-Json -Depth 8|Set-Content (Join-Path $dir 'production-recovery-receipt.json') -Encoding UTF8
 $state|ConvertTo-Json -Depth 8|Set-Content (Join-Path $backup 'cutover-state.json') -Encoding UTF8
 $state|ConvertTo-Json -Depth 8
}catch{
 $failure=$_.Exception.Message
 if(!$success){
  if($newApp){& docker stop $newApp|Out-Null;& docker rm $newApp|Out-Null}
  if($appRenamed){& docker rename $app.Id 'leeway-seafile'}
  if($appDisconnected){& docker network connect --alias leeway-seafile $network $app.Id}
  if($newId){& docker stop $newId|Out-Null;& docker rm $newId|Out-Null}
  if($renamed){& docker rename $db.Id 'leeway-seafile-db'}
  if($disconnected){& docker network connect --alias leeway-seafile-db $network $db.Id}
  & docker start $db.Id|Out-Null
  & docker start $app.Id|Out-Null
 }
 @{status='CUTOVER_FAILED_ROLLBACK_ATTEMPTED';failure=$failure;time=(Get-Date).ToUniversalTime().ToString('o')}|ConvertTo-Json|Set-Content (Join-Path $backup 'pair-cutover-failure.json') -Encoding UTF8
 throw $failure
}

