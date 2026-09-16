#region LEEWAY_IDENTITY
# TAG: LEEWAY-SKILLS-CUTOVER-V1
# WHO: Agent Lee / Leonard Lee. WHAT: upgrade existing skills service without losing legacy data.
# WHY: expose canonical instructions and live inventory with persistent storage.
# WHERE: verified root. WHEN: after candidate verification. HOW: backup, rebind, verify, rollback.
# ROLE: operator. LICENSE: MIT.
#endregion
param([Parameter(Mandatory=$true)][string]$LeeWayRoot,[Parameter(Mandatory=$true)][string]$SourceDir)
$ErrorActionPreference='Stop'
if((Get-Content (Join-Path $LeeWayRoot '.leeway-root') -Raw|ConvertFrom-Json).ecosystemId -ne 'leeway.ecosystem'){throw 'Wrong root'}
$old=docker inspect leeway_agent_skills|Out-String|ConvertFrom-Json
if($LASTEXITCODE -or !$old[0].Id.StartsWith('6d850fd0242b') -or !$old[0].State.Running){throw 'Legacy identity drift'}
$tests=& docker exec leeway_agent_skills_candidate python /tmp/verify_authority.py
if($LASTEXITCODE){throw 'Candidate verification failed'}
$stamp=Get-Date -Format yyyyMMdd-HHmmss
$backup=Join-Path $LeeWayRoot "Archive\backups\skills-cutover-$stamp"
New-Item -ItemType Directory -Path $backup|Out-Null
$utf8=New-Object Text.UTF8Encoding($false)
Add-Type -AssemblyName System.Security
$bytes=$utf8.GetBytes(($old|ConvertTo-Json -Depth 50))
[IO.File]::WriteAllBytes((Join-Path $backup 'configuration.dpapi.bin'),[Security.Cryptography.ProtectedData]::Protect($bytes,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser))
[IO.File]::WriteAllText((Join-Path $backup 'tests.json'),($tests -join [Environment]::NewLine),$utf8)
$canonical=Join-Path $LeeWayRoot 'runtime\container-fabric\agent-skills'
$state=Join-Path $LeeWayRoot 'runtime\container-fabric\agent-skills-state'
if((Test-Path $canonical) -or (Test-Path $state)){throw 'Target already exists; inspect before retry'}
Copy-Item -LiteralPath $SourceDir -Destination $canonical -Recurse
New-Item -ItemType Directory -Path $state|Out-Null
$env:LEEWAY_ROOT=$LeeWayRoot
$compose=Join-Path $canonical 'compose.json'
$renamed=$false;$stopped=$false;$result='FAILED';$failure=$null
try {
  $stopped=$true
  & docker stop --timeout 15 leeway_agent_skills
  if($LASTEXITCODE){throw 'Legacy stop failed'}
  & docker cp leeway_agent_skills:/skills (Join-Path $state 'skills')
  if($LASTEXITCODE){throw 'Registry copy failed'}
  & docker cp leeway_agent_skills:/app/receipts (Join-Path $state 'receipts')
  if($LASTEXITCODE){throw 'Receipt copy failed'}
  Copy-Item -LiteralPath $state -Destination (Join-Path $backup 'state') -Recurse
  $registryHash=(Get-FileHash (Join-Path $state 'skills\skills-registry.json')).Hash
  $snapshotTag="leeway-skills-rollback:$stamp"
  & docker commit --pause=false leeway_agent_skills $snapshotTag
  if($LASTEXITCODE){throw 'Legacy snapshot failed'}
  & docker image save --output (Join-Path $backup 'legacy-image.tar') $snapshotTag
  if($LASTEXITCODE){throw 'Legacy image backup failed'}
  $imageHash=(Get-FileHash (Join-Path $backup 'legacy-image.tar')).Hash
  & docker rename leeway_agent_skills leeway_agent_skills_rollback_20260916
  if($LASTEXITCODE){throw 'Legacy rename failed'}
  $renamed=$true
  & docker compose -f $compose up -d --no-build --wait --wait-timeout 45
  if($LASTEXITCODE){throw 'New service startup failed'}
  $authority=Invoke-RestMethod 'http://127.0.0.1:5327/authority' -TimeoutSec 10
  if($authority.commit -ne '66c976bb0e79e24503c847ef90929c6fb9d5d818' -or $authority.skill_count -ne 100){throw 'Authority mismatch'}
  $legacy=Invoke-RestMethod 'http://127.0.0.1:5327/skills' -TimeoutSec 5
  if(@($legacy.registry.skills.PSObject.Properties).Count -ne 8){throw 'Legacy recipe mismatch'}
  if((Get-FileHash (Join-Path $state 'skills\skills-registry.json')).Hash -ne $registryHash){throw 'Registry changed'}
  $runtime=Invoke-RestMethod 'http://127.0.0.1:5327/authority/runtime' -TimeoutSec 10
  if(!@($runtime.containers|Where-Object{$_.name -eq 'leeway_capability_centers' -and $_.state -eq 'running'}).Count){throw 'Live inventory failed'}
  $result='CUTOVER_VERIFIED'
} catch {
  $failure=$_.Exception.Message
  if($renamed){& docker compose -f $compose down;& docker rename leeway_agent_skills_rollback_20260916 leeway_agent_skills}
  if($stopped){& docker start leeway_agent_skills}
  $result='FAILED_ROLLBACK_ATTEMPTED'
  throw
} finally {
  $receipt=@{schema='leeway.skills.cutover.v1';status=$result;time=(Get-Date).ToUniversalTime().ToString('o');backupRoot=$backup;source=$canonical;canonicalSkillsCommit='66c976bb0e79e24503c847ef90929c6fb9d5d818';canonicalSkills=100;legacyRecipes=8;legacyRegistrySHA256=$registryHash;legacyImageArchiveSHA256=$imageHash;error=$failure;formulaExecution='NOT_EXECUTED';proof='DIAGNOSTIC_ONLY_NOT_OFFICIAL';scriptSHA256=(Get-FileHash $PSCommandPath).Hash}
  $rp=Join-Path $LeeWayRoot "Archive\receipts\skills-cutover-$stamp.json"
  [IO.File]::WriteAllText($rp,($receipt|ConvertTo-Json -Depth 10),$utf8)
  [IO.File]::WriteAllText((Join-Path $backup 'receipt.json'),($receipt|ConvertTo-Json -Depth 10),$utf8)
  Write-Output "RECEIPT=$rp"
}
Write-Output "RESULT=$result"
Write-Output "BACKUP=$backup"

