# Cerebral Master Bootloader - locks startup to CerebralOS and Lively
# Run in the current user context (HKCU). Administrator not required.

# 1. Path to your Prime Engine
$PrimeScript = 'C:\Cerebral\cerebral_prime.py'
$PythonW = 'C:\Cerebral\.venv\Scripts\pythonw.exe'

# 2. Clear out the 'User Run' registry to stop other apps (keep CerebralOS)
$RegPath = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run'
Get-ItemProperty $RegPath | Get-Member -MemberType NoteProperty | ForEach-Object {
    if ($_.Name -ne 'CerebralOS') {
        Remove-ItemProperty -Path $RegPath -Name $_.Name -ErrorAction SilentlyContinue
    }
}

# 3. Add Cerebral OS to the Registry as the Prime Startup
Set-ItemProperty -Path $RegPath -Name 'CerebralOS' -Value "$PythonW $PrimeScript"

Write-Host 'Master Startup Lock Engaged. Only Cerebral OS will boot with Windows.' -ForegroundColor Cyan
