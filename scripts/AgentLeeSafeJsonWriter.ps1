# ============================================================
# AgentLeeSafeJsonWriter.ps1
#
# Safe JSON writer for Leeway scripts.
# PowerShell ConvertTo-Json maximum depth is 100.
# This clamps depth and returns success/failure.
# Do not mark lane READY unless ok is true.
# ============================================================

function Write-LeewaySafeJsonFile {
    param(
        [string]$Path,
        $Object,
        [int]$Depth = 80
    )

    try {
        if ($Depth -gt 100) {
            $Depth = 100
        }

        $parent = Split-Path -Parent $Path
        if (-not (Test-Path $parent)) {
            New-Item -ItemType Directory -Force -Path $parent | Out-Null
        }

        $utf8 = New-Object System.Text.UTF8Encoding($false)
        $json = $Object | ConvertTo-Json -Depth $Depth
        [System.IO.File]::WriteAllText($Path, $json, $utf8)

        if (Test-Path $Path) {
            $bytes = (Get-Item $Path).Length
            if ($bytes -gt 2) {
                return [ordered]@{
                    ok = $true
                    path = $Path
                    bytes = $bytes
                    error = ""
                }
            }
        }

        return [ordered]@{
            ok = $false
            path = $Path
            bytes = 0
            error = "File missing or empty after write."
        }
    } catch {
        return [ordered]@{
            ok = $false
            path = $Path
            bytes = 0
            error = $_.Exception.Message
        }
    }
}
