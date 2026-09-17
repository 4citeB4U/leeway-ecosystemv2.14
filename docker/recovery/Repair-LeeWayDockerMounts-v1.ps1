#region LeeWay governed diagnostic
# TAG: LEEWAY-DOCKER-MOUNT-RECOVERY
# WHO: Agent Lee; Creator authorized Docker repair.
# WHAT/WHY: Preserve configuration and refresh stale Desktop mounts.
# WHERE: Validated canonical root. WHEN: 2026-09-17.
# HOW: DPAPI backup, host preflight, supported Desktop restart.
# LICENSE: Repository license applies. Roles: diagnostic operator.
param([Parameter(Mandatory=$true)][string]$Root)
$ErrorActionPreference='Stop'
if((Get-Content (Join-Path $Root '.leeway-root') -Raw|ConvertFrom-Json).ecosystemId -ne 'leeway.ecosystem'){throw 'Root mismatch'}
$ids=@(docker ps -q); if($LASTEXITCODE -ne 0 -or $ids.Count -ne 50){throw 'Fleet changed; reconcile first'}
$json=docker inspect @ids | Out-String
if($LASTEXITCODE -ne 0){throw 'Inspect failed'}
$fleet=$json|ConvertFrom-Json
foreach($c in $fleet){foreach($m in $c.Mounts){if($m.Type -eq 'bind' -and $m.Source -match '^[A-Z]:[\\/]' -and !(Test-Path -LiteralPath $m.Source)){throw ('Missing '+$m.Source)}}}
$stamp=Get-Date -Format 'yyyyMMdd-HHmmss'
$backup=Join-Path $Root ('Archive\backups\docker-mount-recovery-'+$stamp)
New-Item -ItemType Directory $backup|Out-Null
Add-Type -AssemblyName System.Security
$bytes=[Text.Encoding]::UTF8.GetBytes($json)
$protected=[Security.Cryptography.ProtectedData]::Protect($bytes,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser)
$p=Join-Path $backup 'fleet.configuration.dpapi.bin'
[IO.File]::WriteAllBytes($p,$protected)
$round=[Security.Cryptography.ProtectedData]::Unprotect([IO.File]::ReadAllBytes($p),$null,[Security.Cryptography.DataProtectionScope]::CurrentUser)
if([Text.Encoding]::UTF8.GetString($round) -cne $json){throw 'Backup roundtrip failed'}
$fleet|Select-Object Id,Name,Image,@{n='RestartPolicy';e={$_.HostConfig.RestartPolicy.Name}}|ConvertTo-Json|Set-Content (Join-Path $backup 'baseline.json') -Encoding UTF8
$receipt=[ordered]@{Status='PREPARED';Scope='DIAGNOSTIC_ONLY_NOT_OFFICIAL';Backup=$backup;Count=$ids.Count;ConfigBackupSHA256=(Get-FileHash $p -Algorithm SHA256).Hash;ScriptSHA256=(Get-FileHash $PSCommandPath -Algorithm SHA256).Hash;Rollback='Existing container IDs/config/images/volumes preserved; start baseline IDs if auto-restart fails. No recreate or deletion.';Acceptance='Same 50 IDs running; 63 host bind paths accessible; functional probes follow';Formula='NOT_EXECUTED';LearningLedger='NOT_UPDATED'}
$rp=Join-Path $Root ('Archive\receipts\docker-mount-recovery-'+$stamp+'.json')
$receipt|ConvertTo-Json|Set-Content $rp -Encoding UTF8
docker desktop restart --detach
$code=$LASTEXITCODE
$receipt.Status=if($code -eq 0){'RESTART_REQUESTED_NOT_VERIFIED'}else{'RESTART_REQUEST_FAILED'}
$receipt['ExitCode']=$code
$receipt|ConvertTo-Json|Set-Content $rp -Encoding UTF8
Get-Content $rp -Raw
#endregion

