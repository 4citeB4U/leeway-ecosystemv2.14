param()

function Stop-ByPort($port) {
    try {
        $conns = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
        if ($conns) {
            $processIds = $conns | Select-Object -ExpandProperty OwningProcess -Unique
            foreach ($processId in $processIds) {
                try { Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue; Write-Host "Stopped PID $processId for port $port" } catch { Write-Host ("Failed to stop PID {0}: {1}" -f $processId, $_) }
            }
        } else { Write-Host "No listener on port $port" }
    } catch { Write-Host "Stop-ByPort failed: $_" }
}

Write-Host "Stopping Agent Lee VS Code stack..."
Stop-ByPort 8787
Stop-ByPort 8080
Stop-ByPort 4001
Stop-ByPort 8091
Write-Host "Stop script completed."
