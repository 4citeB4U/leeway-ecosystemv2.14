# LEEWAY-FRESH-SOURCE-REBUILD-V1: prove published recipes do not require legacy local base images.
param([string]$LeeWayRoot='D:\LeeWay\Ecosystem')
$ErrorActionPreference='Stop'
$source=Join-Path $LeeWayRoot 'Archive\tmp\docker-publication-20260916\docker'
$dest=Join-Path $LeeWayRoot 'Archive\diagnostics\docker-consolidation-20260916-152552\fresh-rebuild'
New-Item -ItemType Directory -Force $dest|Out-Null
$utf8=New-Object Text.UTF8Encoding($false)
$results=@()
foreach($item in @(@{dir='capability-centers';dockerfile='Dockerfile';name='leeway_centers_fresh_verify';tag='leeway-capability-centers:fresh-source-20260916'},@{dir='agent-skills';dockerfile='Dockerfile.rebuild';name='leeway_skills_fresh_verify';tag='leeway-agent-skills:fresh-source-20260916'})){
 if(@(docker ps -aq --filter "name=^/$($item.name)$").Count){throw 'Verification name already exists'}
 Write-Output "BUILDING=$($item.dir)"
 $ErrorActionPreference='Continue';$output=@(docker build --pull -f (Join-Path $source "$($item.dir)\$($item.dockerfile)") -t $item.tag (Join-Path $source $item.dir) 2>&1|ForEach-Object{"$_"});$code=$LASTEXITCODE;$ErrorActionPreference='Stop'
 [IO.File]::WriteAllLines((Join-Path $dest "$($item.dir)-build.log"),[string[]]$output,$utf8)
 if($code){throw "Fresh build failed: $($item.dir); log preserved"}
 $args=@('run','-d','--name',$item.name,'--network','leeway-ecosystemv214_leeway-net','--label','leeway.scope=fresh-source-validation')
 if($item.dir -eq 'agent-skills'){
  $state=Join-Path $dest 'skills-state'
  New-Item -ItemType Directory -Force $state|Out-Null
  Copy-Item (Join-Path $LeeWayRoot 'runtime\container-fabric\agent-skills-state\skills') $state -Recurse -Force
  $args+=@('--mount',"type=bind,source=$state\skills,target=/skills",'-e','LEEWAY_ARCHITECTURE_PATH=/architecture-unverified/latest-canonical-architecture.json')
 }
 $args+=$item.tag
 & docker @args|Out-Null
 if($LASTEXITCODE){throw 'Fresh candidate start failed'}
 try{
  $ready=$false
  for($i=0;$i -lt 45;$i++){
   $c=docker inspect $item.name|Out-String|ConvertFrom-Json
   if($c[0].State.Health.Status -eq 'healthy'){$ready=$true;break}
   if(!$c[0].State.Running){break}
   Start-Sleep -Seconds 1
  }
  if(!$ready){throw 'Fresh candidate failed health check'}
  if($item.dir -eq 'agent-skills'){
   docker cp (Join-Path $source 'agent-skills\verify.py') "$($item.name):/tmp/leeway-verify.py"
   $test=& docker exec $item.name python /tmp/leeway-verify.py
  }else{$test=& docker exec $item.name node /app/verify.mjs}
  if($LASTEXITCODE){throw 'Fresh candidate contract verification failed'}
  $image=docker image inspect $item.tag|Out-String|ConvertFrom-Json
  $results+=@{service=$item.dir;status='PASS';image=$image[0].Id;tests=($test|Out-String|ConvertFrom-Json)}
  [IO.File]::WriteAllText((Join-Path $dest 'results.json'),($results|ConvertTo-Json -Depth 20),$utf8)
  Write-Output "FRESH_SOURCE_VERIFIED=$($item.dir)"
 }finally{
  $check=docker inspect $item.name|Out-String|ConvertFrom-Json
  if($check[0].Config.Labels.'leeway.scope' -eq 'fresh-source-validation'){docker rm -f $item.name|Out-Null}
 }
}
