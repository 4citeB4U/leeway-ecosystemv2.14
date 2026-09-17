# LEEWAY-RECOVER-SERVICE-SOURCE-V1: preserve running app bytes and reference build inputs.
param([string]$LeeWayRoot='D:\LeeWay\Ecosystem')
$ErrorActionPreference='Stop'
$a=Get-Content (Join-Path $LeeWayRoot 'Archive\diagnostics\docker-consolidation-20260916-152552\running-source-structure.json') -Raw|ConvertFrom-Json
$dest=Join-Path $LeeWayRoot 'Archive\backups\running-service-source-20260916'
New-Item -ItemType Directory -Force $dest|Out-Null
$records=@()
foreach($row in $a){
 if($row.name -eq 'leeway_agent_skills'){continue}
 $reference=Join-Path $LeeWayRoot ('Services\'+$row.name)
 if(!(Test-Path (Join-Path $reference 'Dockerfile'))){continue}
 $live=@($row.files|Where-Object file -eq '/app/app.py')
 if($live.Count -ne 1){continue}
 $dir=Join-Path $dest $row.name
 New-Item -ItemType Directory -Force $dir|Out-Null
 docker cp "$($row.name):/app/app.py" (Join-Path $dir 'app.py')
 if($LASTEXITCODE -or (Get-FileHash (Join-Path $dir 'app.py')).Hash -ne $live[0].sha256){throw 'Live source changed during recovery'}
 Copy-Item (Join-Path $reference 'Dockerfile') (Join-Path $dir 'Dockerfile') -Force
 $ErrorActionPreference='Continue';docker cp "$($row.name):/app/requirements.txt" (Join-Path $dir 'requirements.txt') 2>$null;$code=$LASTEXITCODE;$ErrorActionPreference='Stop'
 if($code){Copy-Item (Join-Path $reference 'requirements.txt') (Join-Path $dir 'requirements.txt') -Force}
 $records+=@{name=$row.name;appSHA256=$live[0].sha256;appSource='LIVE_CONTAINER';dockerfileSource='EXISTING_SERVICES_REFERENCE';requirementsSource=$(if($code){'EXISTING_SERVICES_REFERENCE'}else{'LIVE_CONTAINER'});freshBuildVerified=$false;referenceAppMatchesLive=((Get-FileHash (Join-Path $reference 'app.py')).Hash -eq $live[0].sha256)}
 Write-Output "RECOVERED=$($row.name)"
}
[IO.File]::WriteAllText((Join-Path $dest 'source-provenance.json'),($records|ConvertTo-Json -Depth 10),(New-Object Text.UTF8Encoding($false)))
Write-Output "SOURCE_COUNT=$($records.Count)"
