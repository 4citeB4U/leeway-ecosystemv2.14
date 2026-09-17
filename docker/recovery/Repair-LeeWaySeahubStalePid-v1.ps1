#region LeeWay Seafile diagnostic repair
# TAG: LEEWAY-SEAHUB-PID-RECOVERY; WHO: Agent Lee, authorized operator.
# WHAT/WHY: Preserve a stale Seahub PID file now pointing to seafevents.
# WHEN: 2026-09-17. WHERE: Existing recovered application container.
# HOW: Guard process identity, preserve PID, invoke vendor startup. LICENSE: Repository license.
$ErrorActionPreference='Stop'
$code=@'
from pathlib import Path
p=Path("/opt/seafile/pids/seahub.pid")
pid=int(p.read_text().strip())
cmd=Path("/proc/%s/cmdline"%pid).read_bytes()
assert b"seafevents.main" in cmd and b"gunicorn" not in cmd, "PID ownership changed"
target=p.with_name("seahub.pid.pre-recovery-20260917")
assert not target.exists(), "Recovery already attempted"
p.rename(target)
print("STALE_PID_PRESERVED_SEAFEVENTS_UNTOUCHED")
'@
$code|docker exec -i leeway-seafile python3 -
if($LASTEXITCODE){throw 'PID guard failed'}
docker exec leeway-seafile /opt/seafile/seafile-server-11.0.13/seahub.sh start
if($LASTEXITCODE){throw 'Vendor Seahub startup failed; preserved PID remains'}
docker exec leeway-seafile curl -fsS http://localhost/api2/ping/
if($LASTEXITCODE){throw 'Seafile ping failed'}
[ordered]@{Status='SEAHUB_PING_VERIFIED';Scope='DIAGNOSTIC_ONLY_NOT_OFFICIAL';Change='Preserved stale PID file; started Seahub using vendor script';DatabaseChanged=$false;ScriptSHA256=(Get-FileHash $PSCommandPath).Hash}|ConvertTo-Json|Set-Content 'D:\LeeWay\Ecosystem\Archive\receipts\seahub-pid-recovery-20260917.json' -Encoding UTF8
#endregion
