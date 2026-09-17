#region LeeWay diagnostic startup recovery
# TAG: LEEWAY-DESKTOP-ENV-REPAIR; WHO: Agent Lee, Creator-authorized operator.
# WHAT/WHY: Repair missing process ProgramData after supported restart.
# WHEN: 2026-09-17. WHERE: Current host. HOW: Windows-known-folder evidence.
# LICENSE: Repository license applies. No persistent environment/settings change.
$ErrorActionPreference='Stop'
$known=[Environment]::GetFolderPath('CommonApplicationData')
$registered=(Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\ProfileList').ProgramData
if($known -ne $registered -or !(Test-Path $known)){throw 'Common data authority mismatch'}
$env:ProgramData=$known
$env:ALLUSERSPROFILE=$known
foreach($id in @(35656,44544,3920)){
 $p=Get-Process -Id $id -ErrorAction SilentlyContinue
 if($p -and $p.ProcessName -in @('com.docker.backend','Docker Desktop') -and $p.StartTime.ToUniversalTime() -gt [datetime]'2026-09-17T04:30:00Z'){Stop-Process -Id $id -Force}
}
Start-Process -FilePath 'C:\Program Files\Docker\Docker\Docker Desktop.exe'
[pscustomobject]@{Status='START_REQUESTED_NOT_VERIFIED';ProgramData=$known;PersistentEnvironmentChanged=$false;ScriptSHA256=(Get-FileHash $PSCommandPath).Hash;Scope='DIAGNOSTIC_ONLY_NOT_OFFICIAL'}|ConvertTo-Json|Set-Content 'D:\LeeWay\Ecosystem\Archive\receipts\docker-desktop-environment-recovery-20260917.json' -Encoding UTF8
#endregion
