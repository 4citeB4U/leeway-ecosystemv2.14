# LEEWAY-SEAFILE-CLONE-CREDENTIAL-RECONCILIATION-V1
# C3 diagnostic. Changes only the isolated recovery clone; original volumes untouched.
param([string]$LeeWayRoot='D:\LeeWay\Ecosystem')
$ErrorActionPreference='Stop'
$dir=Join-Path $LeeWayRoot 'Archive\diagnostics\docker-consolidation-20260916-152552\seafile-recovery'
$dbName='leeway_seafile_db_check_20260916';$app='leeway_seafile_app_check_20260916';$admin='leeway_seafile_clone_admin_20260916'
function Inspect($n){$v=docker inspect $n|Out-String|ConvertFrom-Json;if($LASTEXITCODE){throw 'Inspect failed'};return $v[0]}
$db=Inspect $dbName
if($db.Config.Labels.'leeway.scope' -ne 'seafile-recovery-check' -or @($db.Mounts).Count -ne 1 -or $db.Mounts[0].Name -ne 'leeway-seafile-db-recovery-clone-20260916'){throw 'Clone identity mismatch'}
if(@(docker ps -aq --filter "name=^/$admin$").Count){throw 'Admin name already exists'}
$canonical=Inspect 'leeway-seafile-db'
$line=@($canonical.Config.Env|Where-Object {$_ -match '^(MYSQL|MARIADB)_ROOT_PASSWORD='})
if($line.Count -ne 1){throw 'Canonical root credential is ambiguous'}
$secret=$line[0].Substring($line[0].IndexOf('=')+1)
if(!$secret -or $secret.Contains([char]0)){throw 'Credential unsupported'}
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
Add-Type -AssemblyName System.Security
$private=Join-Path $LeeWayRoot 'Archive\backups\seafile-cutover-20260916'
New-Item -ItemType Directory -Path $private -Force|Out-Null
$who=[Security.Principal.WindowsIdentity]::GetCurrent().Name
& icacls $private /inheritance:r /grant:r "$($who):(OI)(CI)F" 'SYSTEM:(OI)(CI)F' 'Administrators:(OI)(CI)F'|Out-Null
if($LASTEXITCODE){throw 'Backup ACL failed'}
$bytes=[Text.Encoding]::UTF8.GetBytes(($db|ConvertTo-Json -Depth 60))
$protected=[Security.Cryptography.ProtectedData]::Protect($bytes,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser)
[IO.File]::WriteAllBytes((Join-Path $private 'candidate-db.configuration.dpapi.bin'),$protected)
$verify=[Security.Cryptography.ProtectedData]::Unprotect($protected,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser)
if([Convert]::ToBase64String($bytes) -ne [Convert]::ToBase64String($verify)){throw 'Protected configuration verification failed'}
& docker stop $app|Out-Null;if($LASTEXITCODE){throw 'Candidate app stop failed'}
& docker stop $dbName|Out-Null;if($LASTEXITCODE){throw 'Candidate DB stop failed'}
$cfg=@{Image=$db.Image;Entrypoint=$db.Config.Entrypoint;Cmd=@('mariadbd','--skip-grant-tables','--skip-networking');Env=$db.Config.Env;Labels=@{'leeway.scope'='seafile-clone-admin'};Healthcheck=@{Test=@('NONE')};HostConfig=@{NetworkMode='none';RestartPolicy=@{Name='no'};Mounts=@(@{Type='volume';Source='leeway-seafile-db-recovery-clone-20260916';Target='/var/lib/mysql'})}}
$id=CreateContainer $admin $cfg
$changed=$false
try{
 & docker start $id|Out-Null;if($LASTEXITCODE){throw 'Isolated admin start failed'}
 $ready=$false
 for($i=0;$i -lt 30;$i++){$ErrorActionPreference='Continue';$null=& docker exec $id mariadb-admin ping --silent 2>&1;$exit=$LASTEXITCODE;$ErrorActionPreference='Stop';if(!$exit){$ready=$true;break};Start-Sleep -Seconds 2}
 if(!$ready){throw 'Isolated admin unavailable'}
 $ErrorActionPreference='Continue'
 $hosts=@("SELECT Host FROM mysql.user WHERE User='root';"|docker exec -i $id mariadb -uroot --batch --skip-column-names 2>$null)
 $exit=$LASTEXITCODE;$ErrorActionPreference='Stop'
 if($exit -or !$hosts.Count -or @($hosts|Where-Object {$_ -notmatch '^[a-zA-Z0-9.%:_-]+$'}).Count){throw 'Root account discovery failed'}
 $sql="SET sql_mode='NO_BACKSLASH_ESCAPES'; FLUSH PRIVILEGES; "
 $escaped=$secret.Replace("'","''")
 foreach($h in $hosts){$sql+="ALTER USER 'root'@'$h' IDENTIFIED BY '$escaped'; "}
 $ErrorActionPreference='Continue';$out=$sql|docker exec -i $id mariadb -uroot --batch 2>&1;$exit=$LASTEXITCODE;$ErrorActionPreference='Stop'
 if($exit){throw 'Clone credential reconciliation failed; SQL output withheld'}
 $changed=$true
}finally{
 & docker stop $id|Out-Null
 if($LASTEXITCODE -eq 0){& docker rm $id|Out-Null}
}
if(!$changed){throw 'Clone credential update incomplete'}
& docker start $dbName|Out-Null;if($LASTEXITCODE){throw 'Normal candidate DB start failed'}
$valid=$false
for($i=0;$i -lt 30;$i++){
 $ErrorActionPreference='Continue';$out=& docker exec $dbName sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mariadb -uroot --batch --skip-column-names -e "SELECT 1"' 2>&1;$exit=$LASTEXITCODE;$ErrorActionPreference='Stop'
 if(!$exit -and ($out -join '').Trim() -eq '1'){$valid=$true;break};Start-Sleep -Seconds 2
}
if(!$valid){throw 'Normal authentication did not verify'}
& docker start $app|Out-Null;if($LASTEXITCODE){throw 'Candidate app start failed'}
$result=@{status='CLONE_CREDENTIAL_RECONCILED';rootAuthenticationVerified=$true;productionChanged=$false;originalVolumesChanged=$false;updatedRootAccounts=$hosts.Count;time=(Get-Date).ToUniversalTime().ToString('o');proof='DIAGNOSTIC_ONLY_NOT_OFFICIAL';scriptSHA256=(Get-FileHash $PSCommandPath).Hash}
$result|ConvertTo-Json|Set-Content (Join-Path $dir 'clone-credential-reconciliation.json') -Encoding UTF8
$result|ConvertTo-Json

