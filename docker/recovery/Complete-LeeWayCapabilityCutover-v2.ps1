#region LeeWay verified retirement
# TAG: LEEWAY-CAPABILITY-RETIREMENT; WHO: Agent Lee, authorized operator.
# WHAT/WHY: Test rollback recreation, verify legacy DNS, retire replaced shells.
# WHEN: 2026-09-17. WHERE: Canonical root. HOW: Exact IDs and verified archive.
# LICENSE: Repository license applies. Preserve original data/images and receipts.
param([Parameter(Mandatory=$true)][string]$Root)
$ErrorActionPreference='Stop'
$rp=Join-Path $Root 'Archive\receipts\capability-cutover-20260916-233813.json'
$r=Get-Content $rp -Raw|ConvertFrom-Json
if($r.Status -ne 'PROMOTED_PENDING_RETIREMENT' -or !$r.RestartPersistence){throw 'Promotion proof missing'}
$live=docker inspect leeway_capability_suite|ConvertFrom-Json
if($LASTEXITCODE -or $live.Id -ne $r.ReplacementId -or !$live.State.Running){throw 'Replacement identity mismatch'}
if((Get-FileHash (Join-Path $r.Backup 'original-images.tar')).Hash -ne $r.ArchiveSHA256){throw 'Archive hash mismatch'}
$python=@'
import json, urllib.request
checks=[("leeway_phone_runtime",5332),("leeway_email_runtime",5330),("leeway_calendar_runtime",5331),("leeway_browser_runtime",5333),("leeway_desktop_runtime",5334),("leeway_license_runtime",5335),("leeway_installer_runtime",5336),("leeway_pwa_dashboard",5337)]
for name,port in checks:
    result=json.load(urllib.request.urlopen("http://%s:%s/health"%(name,port),timeout=8))
    assert result["ok"] and result["runtime"]==name, name
print("EIGHT_LEGACY_DNS_CONTRACTS_VERIFIED")
'@
$python|docker exec -i leeway_agent_skills python -
if($LASTEXITCODE){throw 'Legacy DNS contracts failed'}
$rehearsals=@()
foreach($tag in $r.SnapshotTags){
 $name='leeway-rollback-check-'+[guid]::NewGuid().ToString('N').Substring(0,8)
 $id=docker create --name $name --network none $tag
 if($LASTEXITCODE){throw 'Rollback recreate failed'}
 try{
  $c=docker inspect $id|ConvertFrom-Json
  if($c.State.Running -or $c.State.Status -ne 'created'){throw 'Unexpected rehearsal state'}
  $rehearsals+=@{Tag=$tag;Created=$true;Started=$false}
 }finally{docker rm $id|Out-Null;if($LASTEXITCODE){throw 'Rehearsal cleanup failed'}}
}
$old=docker inspect @($r.OriginalIds)|ConvertFrom-Json
if($LASTEXITCODE -or @($old).Count -ne 8 -or @($old|Where-Object {$_.State.Running}).Count){throw 'Retirement identities changed'}
Add-Type -AssemblyName System.Security
$config=[Text.Encoding]::UTF8.GetString([Security.Cryptography.ProtectedData]::Unprotect([IO.File]::ReadAllBytes((Join-Path $r.Backup 'originals.configuration.dpapi.bin')),$null,[Security.Cryptography.DataProtectionScope]::CurrentUser))|ConvertFrom-Json
$services=@{}
foreach($c in $config){
 $name=$c.Name.TrimStart('/')
 $ports=@()
 foreach($entry in $c.HostConfig.PortBindings.PSObject.Properties){foreach($b in $entry.Value){$ports+=($b.HostPort+':'+$entry.Name.Replace('/tcp',''))}}
 $volumes=@($c.Mounts|ForEach-Object {@{type='bind';source=$_.Source;target=$_.Destination;read_only=(!$_.RW);bind=@{create_host_path=$false}}})
 $tag=$r.SnapshotTags|Where-Object {$_ -like ('leeway-rollback/'+$name+':*')}
 $services[$name]=@{image=$tag;container_name=$name;restart=$c.HostConfig.RestartPolicy.Name;ports=$ports;volumes=$volumes;networks=@{'leeway-net'=@{aliases=@(@($name)+@($c.NetworkSettings.Networks.'leeway-ecosystemv214_leeway-net'.Aliases)|Where-Object {$_}|Select-Object -Unique)}}}
}
$rollback=@{name='leeway-capability-rollback';services=$services;networks=@{'leeway-net'=@{external=$true;name='leeway-ecosystemv214_leeway-net'}}}
$rollbackFile=Join-Path $r.Backup 'rollback.compose.json'
$rollback|ConvertTo-Json -Depth 20|Set-Content $rollbackFile -Encoding UTF8
docker compose -f $rollbackFile config --quiet
if($LASTEXITCODE){throw 'Rollback recipe validation failed'}
$r|Add-Member RollbackRehearsals $rehearsals
$r|Add-Member RollbackCompose $rollbackFile
$r|Add-Member LegacyDnsVerified $true
$r|Add-Member RetirementScriptSHA256 (Get-FileHash $PSCommandPath).Hash
$r.Status='RETIREMENT_READY'
$r|ConvertTo-Json -Depth 8|Set-Content $rp -Encoding UTF8
docker rm @($r.OriginalIds)|Out-Null
if($LASTEXITCODE){throw 'Exact-ID retirement incomplete; inspect before resume'}
$rows=@(docker ps -a --format '{{json .}}'|ForEach-Object {$_|ConvertFrom-Json})
$r.Status='PROMOTED_AND_ORIGINALS_RETIRED'
$r|Add-Member Running @($rows|Where-Object State -eq 'running').Count
$r|Add-Member Stopped @($rows|Where-Object State -ne 'running').Count
$r|ConvertTo-Json -Depth 8|Set-Content $rp -Encoding UTF8
$r|Select-Object Status,Running,Stopped,LegacyDnsVerified,RestartPersistence,RollbackCompose|ConvertTo-Json
#endregion


