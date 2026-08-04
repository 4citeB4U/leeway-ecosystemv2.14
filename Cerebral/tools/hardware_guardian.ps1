param(
    [string]$Output = "C:\Cerebral\tools\reports\Wave1_Hardware.json"
)

$ErrorActionPreference = "Stop"

$cpu = Get-CimInstance Win32_Processor | Select-Object Name, MaxClockSpeed, CurrentClockSpeed, NumberOfCores, NumberOfLogicalProcessors
$os = Get-CimInstance Win32_OperatingSystem | Select-Object Caption, Version, BuildNumber, LastBootUpTime, TotalVisibleMemorySize, FreePhysicalMemory
$board = Get-CimInstance Win32_BaseBoard | Select-Object Manufacturer, Product, SerialNumber

$payload = [ordered]@{
    wave = 1
    agent = "Agent.Hardware-Guardian"
    generated_at = (Get-Date).ToUniversalTime().ToString("o")
    status = "read_only"
    cpu = $cpu
    os = $os
    baseboard = $board
}

$dir = Split-Path -Parent $Output
if (!(Test-Path $dir)) {
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
}

$payload | ConvertTo-Json -Depth 8 | Out-File -FilePath $Output -Encoding utf8
Write-Output (@{ status = "ok"; output = $Output } | ConvertTo-Json)
