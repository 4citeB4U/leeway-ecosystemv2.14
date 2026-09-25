#requires -Version 7.0
<#
Read-only LeeWay disaster-recovery inventory.
Searches known C:/D:/E: authority roots and records metadata/hashes for high-value
small text/config artifacts. It performs no deletion, repair, format, move, or overwrite.
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$OutputDirectory
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$knownRoots = @(
    'C:\LeeWay-Storage-Science',
    'C:\LeeWay\Forgejo',
    'D:\Leeway-Ecosystem v2.1.4',
    'D:\LeeWay\Recovered-From-Recycle\Leeway-Ecosystem-v2.1.4-20260907',
    'E:\Leeway-Ecosystem v2.1.4',
    'E:\.LeeWay-Produucts-File\Leeway-Ecosystem v2.1.4'
)

$highValueNames = @(
    '.leeway-root',
    'LEEWAY-FORMULA-v1.0.md',
    'leeway-formula-v1.mjs',
    'canonical-input.mjs',
    'raw-base64-v1.mjs',
    'formula-service.mjs',
    'S4R-runtime-formula-authority.json',
    'X5-Formula-MultiVariable-Controller-v1.5.0.ps1',
    'FORMULA-AUTHORITY-RECOVERY-MANIFEST.json',
    'compose.recovery.agent-lee.yaml',
    'compose.healthcheck.agent-lee.override.yaml',
    'docker-compose.agent-lee-on-demand.override.yml'
)

New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null

$rootState = foreach ($root in $knownRoots) {
    [pscustomobject]@{
        Path = $root
        Exists = Test-Path -LiteralPath $root
        CapturedAt = (Get-Date).ToString('o')
    }
}

$matches = New-Object System.Collections.Generic.List[object]
foreach ($root in $knownRoots) {
    if (-not (Test-Path -LiteralPath $root)) { continue }

    foreach ($name in $highValueNames) {
        Get-ChildItem -LiteralPath $root -Filter $name -File -Recurse -ErrorAction SilentlyContinue |
            ForEach-Object {
                $hash = $null
                try { $hash = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash } catch {}
                $matches.Add([pscustomobject]@{
                    Name = $_.Name
                    FullName = $_.FullName
                    Length = $_.Length
                    LastWriteTimeUtc = $_.LastWriteTimeUtc.ToString('o')
                    Sha256 = $hash
                })
            }
    }
}

$driveState = Get-CimInstance Win32_LogicalDisk |
    Select-Object DeviceID, DriveType, VolumeName, FileSystem, Size, FreeSpace

$payload = [ordered]@{
    schema = 'LEEWAY_DISASTER_RECOVERY_INVENTORY_V1'
    capturedAt = (Get-Date).ToString('o')
    roots = $rootState
    drives = $driveState
    artifacts = $matches
    mutation = 'NONE'
}

$json = Join-Path $OutputDirectory 'leeway-disaster-inventory.json'
$payload | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $json -Encoding utf8
$matches | Export-Csv -LiteralPath (Join-Path $OutputDirectory 'leeway-disaster-artifacts.csv') -NoTypeInformation -Encoding utf8

Write-Host "Read-only inventory complete."
Write-Host "JSON: $json"
Write-Host "CSV : $(Join-Path $OutputDirectory 'leeway-disaster-artifacts.csv')"
