# LEEWAY-SEAFILE-CLONE-AUTH-RESUME-V1
param([string]$LeeWayRoot='D:\LeeWay\Ecosystem')
$ErrorActionPreference='Stop'
$db='leeway_seafile_db_check_20260916'
$c=docker inspect $db|Out-String|ConvertFrom-Json
if($LASTEXITCODE -or $c[0].Config.Labels.'leeway.scope' -ne 'seafile-recovery-check' -or $c[0].Mounts[0].Name -ne 'leeway-seafile-db-recovery-clone-20260916'){throw 'Clone identity mismatch'}
$probe='export MYSQL_PWD="$MYSQL_ROOT_PASSWORD"; printf ''SELECT 1;\n'' | mariadb -uroot --batch --skip-column-names #'
$ErrorActionPreference='Continue';$out=$probe|docker exec -i $db sh 2>&1;$code=$LASTEXITCODE;$ErrorActionPreference='Stop'
if($code -or ($out -join '').Trim() -ne '1'){throw 'Clone root authentication failed'}
& docker start leeway_seafile_app_check_20260916|Out-Null
if($LASTEXITCODE){throw 'Candidate application start failed'}
$r=@{status='CLONE_CREDENTIAL_RECONCILED';rootAuthenticationVerified=$true;productionChanged=$false;originalVolumesChanged=$false;priorProbe='FAILED_POWERSHELL_NATIVE_QUOTING';time=(Get-Date).ToUniversalTime().ToString('o');proof='DIAGNOSTIC_ONLY_NOT_OFFICIAL';scriptSHA256=(Get-FileHash $PSCommandPath).Hash}
$r|ConvertTo-Json|Set-Content (Join-Path $LeeWayRoot 'Archive\diagnostics\docker-consolidation-20260916-152552\seafile-recovery\clone-credential-reconciliation.json') -Encoding UTF8
$r|ConvertTo-Json
