#region LeeWay consolidation publication
# TAG: LEEWAY-DOCKER-VERIFIED-CHECKPOINT; WHO: Agent Lee, authorized operator.
# WHAT/WHY: Verify remaining fleet and publish traceable maintenance evidence.
# WHEN: 2026-09-17. WHERE: Canonical root and isolated publication checkout.
# HOW: Native inspection, HTTP reads, hashes, sanitized records. LICENSE: Repository license.
param([Parameter(Mandatory=$true)][string]$Root)
$ErrorActionPreference='Stop'
$repo=Join-Path $Root 'Archive\tmp\docker-publication-20260916'
$r=Get-Content (Join-Path $Root 'Archive\receipts\capability-cutover-20260916-233813.json') -Raw|ConvertFrom-Json
if($r.Status -ne 'PROMOTED_AND_ORIGINALS_RETIRED'){throw 'Cutover not complete'}
$ids=@(docker ps -aq);$fleet=docker inspect @ids|ConvertFrom-Json
if($LASTEXITCODE -or $fleet.Count -ne 43 -or @($fleet|Where-Object {!$_.State.Running}).Count){throw 'Unexpected fleet'}
$baseline=Get-Content (Join-Path $Root 'Archive\backups\docker-mount-recovery-20260916-233034\baseline.json') -Raw|ConvertFrom-Json
foreach($b in $baseline){if($b.Id -notin $r.OriginalIds -and $b.Id -notin $fleet.Id){throw 'Unrelated container identity changed'}}
$mounts=@()
foreach($c in $fleet){
 foreach($m in @($c.Mounts|Where-Object {$_.Type -eq 'bind' -and $_.Source -match '^[CDE]:[\\/]'})){
  docker exec $c.Id stat -- $m.Destination|Out-Null
  if($LASTEXITCODE){throw 'Mount inaccessible'}
  $mounts+=@{Name=$c.Name.TrimStart('/');Drive=$m.Source.Substring(0,1);Destination=$m.Destination;Accessible=$true}
 }
}
$authority=Invoke-RestMethod 'http://127.0.0.1:5327/authority' -TimeoutSec 15
$runtime=Invoke-RestMethod 'http://127.0.0.1:5327/authority/runtime' -TimeoutSec 15
if($authority.skill_count -ne 100 -or $runtime.total -ne 43){throw 'Skills integration drift'}
$final=[ordered]@{AtUtc=[datetime]::UtcNow.ToString('o');Status='STORAGE_RESTORED_EIGHT_TO_ONE_VERIFIED';Scope='DIAGNOSTIC_ONLY_NOT_OFFICIAL';Running=43;Stopped=0;UnrelatedContainerIdsPreserved=42;AccessibleWindowsMounts=$mounts.Count;Mounts=$mounts;SkillsAuthority=$authority;SkillsRuntimeTotal=$runtime.total;Cutover=$r|Select-Object Status,CandidateImage,ArchiveSHA256,ArchiveReloadVerified,Checks,RestartPersistence,ReplacementId,LegacyDnsVerified,RollbackRehearsals,ScriptSHA256,RetirementScriptSHA256;Health=@($fleet|Select-Object Name,@{n='DockerHealth';e={$_.State.Health.Status}});Formula='NOT_EXECUTED';LearningLedger='NOT_UPDATED';ScriptSHA256=(Get-FileHash $PSCommandPath).Hash}
$final|ConvertTo-Json -Depth 12|Set-Content (Join-Path $Root 'Archive\receipts\docker-consolidation-live-20260917.json') -Encoding UTF8
$final|ConvertTo-Json -Depth 12|Set-Content (Join-Path $repo 'docker\evidence\consolidation-live-20260917.json') -Encoding UTF8
$ops=@('Repair-LeeWayDockerMounts-v1.ps1','Resume-LeeWayDockerDesktop-v1.ps1','Invoke-LeeWayCapabilityCutover-v1.ps1','Complete-LeeWayCapabilityCutover-v2.ps1','Publish-LeeWayConsolidationCheckpoint-v1.ps1')
foreach($n in $ops){Copy-Item (Join-Path $Root ('Archive\operator-scripts\'+$n)) (Join-Path $repo ('docker\recovery\'+$n))}
$summary=@'
# LeeWay Docker current status - 2026-09-17
C0 -> C1 -> C2 -> C3 CURRENT -> C4 -> C5 -> C6.
## Executed and verified
- 43 running containers, zero stopped; 42 unrelated container IDs preserved.
- Docker storage access restored after supported Desktop restart. Initial relaunch failed because the remote process lacked ProgramData; a process-only Windows-known-folder repair restored startup.
- All 63 pre-consolidation Windows mounts were accessible. Current mount count and per-container checks are in evidence/consolidation-live-20260917.json.
- Eight duplicated work-order shells replaced by leeway_capability_suite: one Python process, legacy ports 5330-5337 and eight legacy DNS names.
- Real diagnostic work orders and receipts survived restart. These are work-order interfaces, not proof of email, phone, browser, desktop or installation execution.
- Original eight containers retired only after image archive reload, isolated create-without-start tests, rollback Compose validation and legacy DNS checks. Original source data directories and rollback snapshots remain.
- Canonical D: holds new module state. Original eight E: state/receipt directories were inspected while stopped and contained zero files.
- Agent Skills reports 100 pinned skills and sees all 43 containers through Docker Reality. This adapter remains read-only for execution.
## Remaining work
Map Hybrid Fabric monitoring consumers before folding it into existing monitoring. Reconcile six previously unresolved service targets. Evaluate workspace and sensory module contracts before any further consolidation.
Docker health and mount readability are not proof that every application or external provider works. No official governed C3 execution was performed.
Formula: NOT_EXECUTED. Learning Ledger: NOT_UPDATED.
## Recovery
Private rollback archive/configuration and validated rollback Compose remain under the canonical Archive/backups/capability-cutover-20260916-233813 directory.
Stop the replacement before restoring original host ports. Preserve any new D: work orders and receipts and reconcile them back per module before reverting; do not discard post-cutover state.
The earlier candidate and storage-blocker receipts remain historical evidence, superseded for current status by the live checkpoint.
'@
$summary|Set-Content (Join-Path $repo 'docker\CURRENT_STATUS.md') -Encoding UTF8
$path=Join-Path $repo 'docker\CONTAINER_CONTENTS.md'
$old=Get-Content $path
$names=@($r.Checks|ForEach-Object {$_.Name})
$rows=@($old|Where-Object {$_ -match '^\| '})
$rows=@($rows|Where-Object { $parts=$_ -split '\|';$parts[1].Trim() -notin $names })
$rows+='| leeway_capability_suite | One Python process, eight port-selected work-order/receipt modules; legacy ports and DNS names preserved; state on canonical D: | Promoted and restart/persistence verified; original eight retired with rollback archive |'
$table=$rows -join [Environment]::NewLine
foreach($phrase in @('D:/E: mounts currently fail','D: state and receipt mounts currently fail','E: data unavailable','E: documents/receipts unavailable','E: notebooks/receipts unavailable','four E: mounts unavailable','E: state unavailable','E: context/receipts unavailable','E: approvals/CRM/receipts unavailable','E: briefs/receipts unavailable','three E: mounts unavailable')){$table=$table.Replace($phrase,'storage access restored')}
$header="# LeeWay running container contents - 43 containers"+[Environment]::NewLine+[Environment]::NewLine+"Current checkpoint: storage access restored; eight duplicated shells consolidated. See CURRENT_STATUS.md and evidence/consolidation-live-20260917.json. Provider execution remains unverified where noted."+[Environment]::NewLine+[Environment]::NewLine
# Restore the Markdown table separator deliberately; it does not match the data-row filter.
$table=$table.Replace('| Consolidation decision |','| Consolidation decision |'+[Environment]::NewLine+'|---|---|---|')
($header+$table)|Set-Content $path -Encoding UTF8
$readme=Join-Path $repo 'docker\README.md'
$notice="## Current checkpoint: September 17"+[Environment]::NewLine+"43 running, zero stopped. Storage repaired and eight-to-one consolidation deployed. See [current status](CURRENT_STATUS.md), [43-container inventory](CONTAINER_CONTENTS.md), and [live evidence](evidence/consolidation-live-20260917.json). Earlier sections below describe prior checkpoints."+[Environment]::NewLine+[Environment]::NewLine
($notice+(Get-Content $readme -Raw))|Set-Content $readme -Encoding UTF8
$cap=Join-Path $repo 'docker\capability-suite\README.md'
($notice.Replace('(CURRENT_STATUS.md)','(../CURRENT_STATUS.md)').Replace('(CONTAINER_CONTENTS.md)','(../CONTAINER_CONTENTS.md)').Replace('(evidence/','(../evidence/')+(Get-Content $cap -Raw))|Set-Content $cap -Encoding UTF8
$desktop=Join-Path ([Environment]::GetFolderPath('Desktop')) 'LeeWay-Docker-Current'
New-Item -ItemType Directory $desktop -Force|Out-Null
Copy-Item $path (Join-Path $desktop 'CONTAINER_CONTENTS.md')
Copy-Item (Join-Path $repo 'docker\CURRENT_STATUS.md') $desktop
$html='<!doctype html><meta charset="utf-8"><title>LeeWay Docker current</title><style>body{font:16px system-ui;margin:3rem}pre{white-space:pre-wrap;line-height:1.6}</style><h1>LeeWay Docker: 43 running, zero stopped</h1><pre>'+[Net.WebUtility]::HtmlEncode(($summary+[Environment]::NewLine+$header+$table))+'</pre>'
$html|Set-Content (Join-Path $desktop 'OPEN-ME.html') -Encoding UTF8
& node (Join-Path $Root 'Archive\operator-scripts\Scan-LeeWayDockerPublication-v1.mjs') $repo
if($LASTEXITCODE){throw 'Publication scan failed'}
git -C $repo add -- docker
if($LASTEXITCODE){throw 'Stage failed'}
git -C $repo -c core.whitespace=-blank-at-eol,-blank-at-eof diff --cached --check
if($LASTEXITCODE){throw 'Diff check failed'}
$final|Select-Object Status,Running,Stopped,AccessibleWindowsMounts,SkillsRuntimeTotal|ConvertTo-Json
#endregion

