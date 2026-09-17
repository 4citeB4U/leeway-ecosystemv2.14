# LEEWAY-DOCKER-FINAL-EVIDENCE-V2
param([string]$LeeWayRoot='D:\LeeWay\Ecosystem')
$ErrorActionPreference='Stop'
$ops=Join-Path $LeeWayRoot 'Archive\operator-scripts'
$pub=Join-Path $LeeWayRoot 'Archive\tmp\docker-publication-20260916'
$audit=Join-Path $LeeWayRoot 'Archive\diagnostics\docker-consolidation-20260916-152552'
$generator=Join-Path $ops 'Prepare-LeeWayDockerEvidence-v1.mjs'
$source=Get-Content $generator -Raw
$source=$source.Replace('Other local application build contexts still need reconciliation and publication.','Eighteen additional live service sources and reference build contexts are published in recovered-services with provenance; their fresh builds are not verified. Remaining build contexts still require reconciliation.')
$source=$source.Replace('## Production blockers','## Remaining production work')
$source=$source.Replace('Initial native PowerShell/serialization errors were repaired before dependent destructive actions.','All 52 original recreation tests passed. Retirement was interrupted by an unavailable backup path; the resume reconciled 11 already absent containers and removed the remaining 41. Two of the prior absences were not recorded in the last saved manifest, so their removal timing is not asserted. Progress was then saved using verified temporary files and replacement backups.')
$utf8=New-Object Text.UTF8Encoding($false)
[IO.File]::WriteAllText($generator,$source,$utf8)
& node (Join-Path $ops 'Audit-LeeWayLiveFleet-v1.mjs') $LeeWayRoot
if($LASTEXITCODE){throw 'Final fleet audit failed'}
& node $generator $LeeWayRoot
if($LASTEXITCODE){throw 'Evidence assembly failed'}
$evidence=Join-Path $pub 'docker\evidence'
$recovery=Join-Path $pub 'docker\recovery'
$files=@('Resume-LeeWayStoppedRetirement-v2.ps1','Repair-LeeWaySeafileCloneCredential-v1.ps1','Resume-LeeWaySeafileCloneAuth-v1.ps1','Invoke-LeeWaySeafileRecoveryCutover-v1.ps1','Invoke-LeeWaySeafilePairCutover-v2.ps1','Complete-LeeWaySeafileRecovery-v1.ps1','Save-LeeWaySeafileCompose-v1.ps1','Publish-LeeWayDockerEvidence-v2.ps1')
foreach($file in $files){Copy-Item (Join-Path $ops $file) (Join-Path $recovery $file)}
$seafile=Join-Path $audit 'seafile-recovery'
foreach($file in @('repository-link-check.json','fsck-readonly-result.json','clone-credential-reconciliation.json')){Copy-Item (Join-Path $seafile $file) (Join-Path $evidence ('seafile-'+$file))}
Copy-Item (Join-Path $LeeWayRoot 'Archive\backups\stopped-docker-20260916-154303\retirement-receipt.json') (Join-Path $evidence 'stopped-retirement-resume.json')
$receiptPath=Join-Path $seafile 'production-recovery-receipt.json'
$reportPath=Join-Path $pub 'docker\README.md'
$report=Get-Content $reportPath -Raw
if(Test-Path $receiptPath){
 $r=Get-Content $receiptPath -Raw|ConvertFrom-Json
 if($r.status -ne 'PRODUCTION_RECOVERY_VERIFIED'){throw 'Invalid production receipt'}
 Copy-Item $receiptPath (Join-Path $evidence 'seafile-production-recovery.json')
 $report=$report.Replace('1. Seafile remains unhealthy and returns HTTP 502. MariaDB responds, but ccnet_db and seafile_db have no tables; seahub_db has 100 tables and no auth_user entries. No account creation, schema initialization or destructive database reset was performed. Recovery requires establishing the authoritative data/backup.','1. Seafile recovered: the verified application/database pair now passes live HTTP ping, service database authentication, both repository heads and read-only fsck. The first database-only cutover failed and rolled back; the verified pair cutover followed. Original volumes and protected configuration remain preserved. A real user login/upload workflow has not been exercised. See seafile/README.md and evidence/seafile-production-recovery.json.')
 $inventoryPath=Join-Path $pub 'docker\SERVICE_INVENTORY.md'
 $inventory=Get-Content $inventoryPath -Raw
 $inventory=$inventory.Replace('File application; unhealthy, HTTP 502','File application; recovered pair, HTTP 200 and repository integrity verified').Replace('MariaDB; two Seafile databases have no tables','MariaDB; recovered database clone, authenticated application verified')
 [IO.File]::WriteAllText($inventoryPath,$inventory,$utf8)
}else{
 $report=$report.Replace('Recovery requires establishing the authoritative data/backup.','An isolated recovery clone passed API, normal database authentication, two repository heads and read-only fsck. Production promotion failed and was rolled back. The original production application still needs repair; do not treat the isolated proof as production success.')
}
Copy-Item (Join-Path $LeeWayRoot 'Archive\backups\seafile-cutover-20260916\cleanup-receipt.json') (Join-Path $evidence 'seafile-cleanup.json')
[IO.File]::WriteAllText($reportPath,$report,$utf8)
& node (Join-Path $ops 'Scan-LeeWayDockerPublication-v1.mjs') $pub
if($LASTEXITCODE){throw 'Publication secret scan blocked'}
& git -C $pub add -- docker
if($LASTEXITCODE){throw 'Stage failed'}
& git -C $pub -c core.whitespace=blank-at-eol,space-before-tab,cr-at-eol,-blank-at-eof diff --cached --check
if($LASTEXITCODE){throw 'Whitespace verification failed'}
& git -C $pub diff --cached --stat
Write-Output 'EVIDENCE_READY_FOR_COMMIT'

