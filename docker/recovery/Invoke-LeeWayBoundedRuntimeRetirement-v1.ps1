#region LEEWAY_IDENTITY
# TAG: LEEWAY-BOUNDED-RUNTIME-RETIREMENT-V1
# WHO: Agent Lee / Leonard Lee. WHAT: retire replaced skills containers and isolated idle Ollama.
# WHY: remove verified redundant processes. WHERE: verified root. WHEN: after replacement proof.
# HOW: exact IDs, encrypted configuration, filesystem backup, model-list equivalence.
# ROLE: operator. LICENSE: MIT.
#endregion
param([Parameter(Mandatory=$true)][string]$LeeWayRoot)
$ErrorActionPreference='Stop'
$utf8=New-Object Text.UTF8Encoding($false)
$stamp=Get-Date -Format yyyyMMdd-HHmmss
$backup=Join-Path $LeeWayRoot "Archive\backups\bounded-runtime-retirement-$stamp"
New-Item -ItemType Directory -Path $backup|Out-Null
$removed=@()
$skillsBackup=Join-Path $LeeWayRoot 'Archive\backups\skills-cutover-20260916-155520'
$proof=Get-Content (Join-Path $skillsBackup 'receipt.json') -Raw|ConvertFrom-Json
if($proof.status -ne 'CUTOVER_VERIFIED' -or (Get-FileHash (Join-Path $skillsBackup 'legacy-image.tar')).Hash -ne $proof.legacyImageArchiveSHA256){throw 'Skills backup verification failed'}
$a=Invoke-RestMethod 'http://127.0.0.1:5327/authority' -TimeoutSec 10
if($a.commit -ne '66c976bb0e79e24503c847ef90929c6fb9d5d818' -or $a.skill_count -ne 100){throw 'Skills replacement changed'}
$old=docker inspect leeway_agent_skills_rollback_20260916|Out-String|ConvertFrom-Json
if($LASTEXITCODE -or !$old[0].Id.StartsWith('6d850fd0242b') -or $old[0].State.Running){throw 'Wrong skills rollback target'}
& docker rm $old[0].Id|Out-Null
if($LASTEXITCODE){throw 'Skills retirement failed'}
$removed+='leeway_agent_skills_rollback_20260916'
$candidate=docker inspect leeway_agent_skills_candidate|Out-String|ConvertFrom-Json
if($LASTEXITCODE -or !$candidate[0].Id.StartsWith('30e1c2e618f2')){throw 'Wrong skills candidate'}
& docker stop --timeout 10 $candidate[0].Id|Out-Null
if($LASTEXITCODE){throw 'Candidate stop failed'}
& docker rm $candidate[0].Id|Out-Null
if($LASTEXITCODE){throw 'Candidate removal failed'}
$removed+='leeway_agent_skills_candidate'
$ollama=docker inspect leeway_ollama_before_fix_20260815-012444|Out-String|ConvertFrom-Json
if($LASTEXITCODE -or @($ollama[0].NetworkSettings.Networks.PSObject.Properties).Count -ne 0){throw 'Old Ollama has network dependencies'}
$resident=@(& docker exec $ollama[0].Id ollama ps)
if($LASTEXITCODE -or $resident.Count -ne 1){throw 'Old Ollama has loaded models or failed inspection'}
$modelsBefore=Invoke-RestMethod 'http://127.0.0.1:11434/api/tags' -TimeoutSec 10
Add-Type -AssemblyName System.Security
$bytes=$utf8.GetBytes(($ollama|ConvertTo-Json -Depth 50))
[IO.File]::WriteAllBytes((Join-Path $backup 'ollama-config.dpapi.bin'),[Security.Cryptography.ProtectedData]::Protect($bytes,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser))
& docker update --restart=no $ollama[0].Id|Out-Null
if($LASTEXITCODE){throw 'Restart policy update failed'}
& docker stop --timeout 15 $ollama[0].Id|Out-Null
if($LASTEXITCODE){throw 'Old Ollama stop failed'}
$tag="leeway-ollama-retired:$stamp"
$ErrorActionPreference='Continue'
$snapshot=& docker commit --pause=false $ollama[0].Id $tag 2>&1
$commitExit=$LASTEXITCODE
$ErrorActionPreference='Stop'
if($commitExit){
  & docker export --output (Join-Path $backup 'ollama.rootfs.tar') $ollama[0].Id
  if($LASTEXITCODE){throw 'Ollama export failed; original retained stopped'}
  & docker import (Join-Path $backup 'ollama.rootfs.tar') $tag|Out-Null
  if($LASTEXITCODE){throw 'Ollama import verification failed; original retained'}
}
& docker image save --output (Join-Path $backup 'ollama-image.tar') $tag
if($LASTEXITCODE){throw 'Ollama archive failed; original retained'}
$hash=(Get-FileHash (Join-Path $backup 'ollama-image.tar')).Hash
$modelsAfter=Invoke-RestMethod 'http://127.0.0.1:11434/api/tags' -TimeoutSec 10
if(($modelsBefore.models|ConvertTo-Json -Depth 10 -Compress) -ne ($modelsAfter.models|ConvertTo-Json -Depth 10 -Compress)){throw 'Active model inventory changed; old container retained'}
& docker rm $ollama[0].Id|Out-Null
if($LASTEXITCODE){throw 'Old Ollama retirement failed'}
$removed+='leeway_ollama_before_fix_20260815-012444'
$receipt=@{schema='leeway.bounded.runtime.retirement.v1';status='VERIFIED';removed=$removed;backupRoot=$backup;ollamaArchiveSHA256=$hash;activeOllamaModelInventoryUnchanged=$true;volumesDeleted=0;imagesDeleted=0;formulaExecution='NOT_EXECUTED';proof='DIAGNOSTIC_ONLY_NOT_OFFICIAL';time=(Get-Date).ToUniversalTime().ToString('o');scriptSHA256=(Get-FileHash $PSCommandPath).Hash}
$p=Join-Path $LeeWayRoot "Archive\receipts\bounded-runtime-retirement-$stamp.json"
[IO.File]::WriteAllText($p,($receipt|ConvertTo-Json -Depth 8),$utf8)
$receipt|ConvertTo-Json -Depth 8
Write-Output "RECEIPT=$p"

