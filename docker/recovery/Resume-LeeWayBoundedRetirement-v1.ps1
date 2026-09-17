# LEEWAY-BOUNDED-RETIREMENT-RESUME-V1: guarded continuation after model-order comparison failed.
param([string]$LeeWayRoot='D:\LeeWay\Ecosystem')
$ErrorActionPreference='Stop'
$backup=Join-Path $LeeWayRoot 'Archive\backups\bounded-runtime-retirement-20260916-160111'
$tag='leeway-ollama-retired:20260916-160111'
$old=docker inspect leeway_ollama_before_fix_20260815-012444|Out-String|ConvertFrom-Json
$active=docker inspect leeway_ollama|Out-String|ConvertFrom-Json
if($LASTEXITCODE -or $old[0].State.Running -or !$active[0].State.Running){throw 'Runtime state drift'}
if(@($old[0].NetworkSettings.Networks.PSObject.Properties).Count -ne 0){throw 'Unexpected old network attachment'}
$ov=@($old[0].Mounts|Where-Object Destination -eq '/root/.ollama')
$av=@($active[0].Mounts|Where-Object Destination -eq '/root/.ollama')
if($ov.Count -ne 1 -or $av.Count -ne 1 -or $ov[0].Source -ne $av[0].Source){throw 'Model store is not shared as expected'}
function Models { $a=Invoke-RestMethod 'http://127.0.0.1:11434/api/tags' -TimeoutSec 15; @($a.models|Sort-Object name|Select-Object name,digest,size) }
$before=Models
if(!$before.Count){throw 'Active model list empty'}
$utf8=New-Object Text.UTF8Encoding($false)
[IO.File]::WriteAllText((Join-Path $backup 'models-before-resume.json'),($before|ConvertTo-Json -Depth 5),$utf8)
$file=Join-Path $backup 'ollama-image.tar'
$fs=New-Object IO.FileStream($file,[IO.FileMode]::Open,[IO.FileAccess]::Read,[IO.FileShare]::Read,1048576,[IO.FileOptions]::SequentialScan)
$sha=[Security.Cryptography.SHA256]::Create()
try{$hash=[BitConverter]::ToString($sha.ComputeHash($fs)).Replace('-','')}finally{$fs.Dispose();$sha.Dispose()}
[IO.File]::WriteAllText((Join-Path $backup 'ollama-image.sha256'),$hash,$utf8)
$ErrorActionPreference='Continue';$load=@(docker image load --input $file 2>&1|ForEach-Object{"$_"});$code=$LASTEXITCODE;$ErrorActionPreference='Stop'
if($code){throw 'Ollama archive reload failed'}
[IO.File]::WriteAllLines((Join-Path $backup 'archive-load-verification.log'),[string[]]$load,$utf8)
$after=Models
if(($before|ConvertTo-Json -Compress) -ne ($after|ConvertTo-Json -Compress)){throw 'Sorted model identities changed during resume; original retained'}
$check=docker inspect $old[0].Id|Out-String|ConvertFrom-Json
if($LASTEXITCODE -or $check[0].State.Running){throw 'Old target state drift'}
docker rm $old[0].Id|Out-Null
if($LASTEXITCODE){throw 'Old Ollama removal failed'}
$removed=@('leeway_agent_skills_rollback_20260916','leeway_agent_skills_candidate','leeway_ollama_before_fix_20260815-012444')
foreach($name in $removed){if(@(docker ps -aq --filter "name=^/$name$").Count){throw 'Expected retired name remains'}}
$receipt=@{status='VERIFIED';schema='leeway.bounded.runtime.retirement.v2';removed=$removed;backupRoot=$backup;ollamaArchiveSHA256=$hash;nativeArchiveReloadVerified=$true;modelCount=$after.Count;sortedModelsUnchangedDuringResume=$true;earlierUnsortedComparison='FAILED_CAUSE_NOT_PROVEN';sharedModelStoreRetained=$true;volumesDeleted=0;imagesDeleted=0;formulaExecution='NOT_EXECUTED';proof='DIAGNOSTIC_ONLY_NOT_OFFICIAL';time=(Get-Date).ToUniversalTime().ToString('o');scriptSHA256=(Get-FileHash $PSCommandPath).Hash}
$rp=Join-Path $LeeWayRoot 'Archive\receipts\bounded-runtime-retirement-20260916-160111.json'
[IO.File]::WriteAllText($rp,($receipt|ConvertTo-Json -Depth 10),$utf8)
[IO.File]::WriteAllText((Join-Path $backup 'receipt.json'),($receipt|ConvertTo-Json -Depth 10),$utf8)
Write-Output "RECEIPT=$rp"
