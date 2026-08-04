# 1. Disable all User-level startup apps (Registry)
$Paths = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run", "HKLM:\Software\Microsoft\Windows\CurrentVersion\Run"
foreach ($Path in $Paths) {
    Get-ItemProperty -Path $Path | Get-Member -MemberType NoteProperty | ForEach-Object {
        if ($_.Name -ne "CerebralPrime") {
            Remove-ItemProperty -Path $Path -Name $_.Name -ErrorAction SilentlyContinue
        }
    }
}

# 2. Register Cerebral as the ONLY High-Priority Task
$Action = New-ScheduledTaskAction -Execute "python.exe" -Argument "C:\Cerebral\cerebral_prime.py" -WorkingDirectory "C:\Cerebral"
$Trigger = New-ScheduledTaskTrigger -AtLogOn
$Principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest

Register-ScheduledTask -TaskName "Cerebral_Prime_OS" -Action $Action -Trigger $Trigger -Principal $Principal -Force

Write-Host "[!] Cerebral is now the sole startup application." -ForegroundColor Cyan
