#region LEEWAY_IDENTITY
# TAG: LEEWAY-DOCKER-RESTORE-V1
# WHO: Agent Lee / Leonard Lee. WHAT: recreate a preserved container without starting it.
# WHY: make retirement reversible. WHERE: current Docker context, verified backup.
# WHEN: explicit -Create. HOW: decrypt original configuration and use Docker Engine API.
# ROLE: recovery operator. LICENSE: MIT.
#endregion
param([Parameter(Mandatory=$true)][string]$BackupRoot,[Parameter(Mandatory=$true)][string]$ContainerId,[switch]$Create,[switch]$IsolatedValidation)
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Security
$records=Get-Content (Join-Path $BackupRoot 'preservation-manifest.json') -Raw|ConvertFrom-Json
$record=@($records|Where-Object{$_.id -eq $ContainerId})
if($record.Count -ne 1 -or !$record[0].backupVerified){throw 'No unique verified recovery record'}
$record=$record[0]
$bytes=[IO.File]::ReadAllBytes((Join-Path $BackupRoot 'configuration.dpapi.bin'))
$clear=[Security.Cryptography.ProtectedData]::Unprotect($bytes,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser)
$originals=[Text.Encoding]::UTF8.GetString($clear)|ConvertFrom-Json
$c=@($originals|Where-Object{$_.Id -eq $ContainerId})
if($c.Count -ne 1){throw 'Original configuration missing'}
$c=$c[0]
$image=docker image inspect $record.snapshotTag|Out-String|ConvertFrom-Json
if($LASTEXITCODE -or $image[0].Id -ne $record.snapshotImage){throw 'Load/import the verified image archive before restoring'}
$name=$c.Name.TrimStart('/')
$request=$c.Config
$request.Image=$record.snapshotTag
if($IsolatedValidation){
  $name='leeway-restore-test-'+$ContainerId.Substring(0,12)
  $request=[pscustomobject]@{Image=$record.snapshotTag;Entrypoint=@('/bin/true');Cmd=@();Labels=@{'leeway.scope'='restore-validation'};HostConfig=@{NetworkMode='none';RestartPolicy=@{Name='no'}}}
}else{
  $hostConfig=$c.HostConfig
  # Bind exact existing volumes; do not silently substitute new empty anonymous volumes.
  $mounts=@()
  foreach($m in $c.Mounts){
    if($m.Type -eq 'volume'){
      & docker volume inspect $m.Name --format '{{.Name}}'|Out-Null
      if($LASTEXITCODE){throw 'Required data volume missing'}
      $mounts+=@{Type='volume';Source=$m.Name;Target=$m.Destination;ReadOnly=(!$m.RW)}
    }elseif($m.Type -eq 'bind'){
      $mounts+=@{Type='bind';Source=$m.Source;Target=$m.Destination;ReadOnly=(!$m.RW);BindOptions=@{Propagation=$m.Propagation}}
    }elseif($m.Type -ne 'tmpfs'){throw 'Unsupported original mount type'}
  }
  $hostConfig.Binds=$null
  $hostConfig|Add-Member -NotePropertyName Mounts -NotePropertyValue $mounts -Force
  $request|Add-Member -NotePropertyName HostConfig -NotePropertyValue $hostConfig -Force
  $endpoints=@{}
  foreach($network in $c.NetworkSettings.Networks.PSObject.Properties){
    $ep=@{Aliases=$network.Value.Aliases}
    if($network.Value.IPAMConfig){$ep.IPAMConfig=$network.Value.IPAMConfig}
    $endpoints[$network.Name]=$ep
  }
  $request|Add-Member -NotePropertyName NetworkingConfig -NotePropertyValue @{EndpointsConfig=$endpoints} -Force
}
if(!$Create){
  [pscustomobject]@{mode='PREVIEW_ONLY';name=$name;image=$record.snapshotImage;start=$false;originalMountCount=@($c.Mounts).Count;isolated=[bool]$IsolatedValidation}|ConvertTo-Json
  return
}
$contextName=docker context show
$context=docker context inspect $contextName|Out-String|ConvertFrom-Json
$endpoint=$context[0].Endpoints.docker.Host
if($endpoint -notmatch '^npipe:'){throw 'This authority script requires the verified Windows Docker named-pipe adapter'}
$pipeName=($endpoint -split '/')[-1]
$api=docker version --format '{{.Server.APIVersion}}'
$body=[Text.Encoding]::UTF8.GetBytes(($request|ConvertTo-Json -Depth 60 -Compress))
$crlf=[string][char]13+[char]10
$header='POST /v'+$api+'/containers/create?name='+[Uri]::EscapeDataString($name)+' HTTP/1.1'+$crlf+'Host: docker'+$crlf+'Content-Type: application/json'+$crlf+'Content-Length: '+$body.Length+$crlf+'Connection: close'+$crlf+$crlf
$stream=New-Object IO.Pipes.NamedPipeClientStream('.',$pipeName,[IO.Pipes.PipeDirection]::InOut)
try{
  $stream.Connect(5000)
  $head=[Text.Encoding]::ASCII.GetBytes($header)
  $stream.Write($head,0,$head.Length);$stream.Write($body,0,$body.Length);$stream.Flush()
  $reader=New-Object IO.StreamReader($stream)
  $response=$reader.ReadToEnd()
}finally{$stream.Dispose()}
$status=($response -split $crlf)[0]
if($status -notmatch ' 201 '){throw "Docker create failed: $status"}
$recreated=docker inspect $name|Out-String|ConvertFrom-Json
if($LASTEXITCODE -or $recreated[0].State.Running -or $recreated[0].Image -ne $record.snapshotImage){throw 'Recreated container validation failed'}
[pscustomobject]@{status='CREATED_NOT_STARTED';name=$name;id=$recreated[0].Id;image=$recreated[0].Image;isolated=[bool]$IsolatedValidation}|ConvertTo-Json

