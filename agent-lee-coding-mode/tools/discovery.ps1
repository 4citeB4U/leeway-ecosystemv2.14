function Get-DiscoveryIndex {
    param(
        [string]$WorkspaceRoot = "$PSScriptRoot\..\.."
    )
    $indexPaths = @(
        Join-Path (Resolve-Path $WorkspaceRoot).ProviderPath "agent-lee-coding-mode\source-index\all-leeway-files.index.json.new",
        Join-Path (Resolve-Path $WorkspaceRoot).ProviderPath "agent-lee-coding-mode\source-index\all-leeway-files.index.json",
        Join-Path (Resolve-Path $WorkspaceRoot).ProviderPath "agent-lee-coding-mode\source-index\all-leeway-files.index.json.backup"
    )

    foreach ($p in $indexPaths) {
        if (Test-Path $p) {
            try {
                $raw = Get-Content -Path $p -Raw -ErrorAction Stop
                $parsed = $null
                try { $parsed = ConvertFrom-Json $raw -ErrorAction Stop } catch {
                    # Try to extract last JSON object
                    $lastOpen = $raw.LastIndexOf('{')
                    $lastClose = $raw.LastIndexOf('}')
                    if ($lastOpen -ge 0 -and $lastClose -gt $lastOpen) {
                        $candidate = $raw.Substring($lastOpen, $lastClose - $lastOpen + 1)
                        try { $parsed = ConvertFrom-Json $candidate -ErrorAction Stop } catch {}
                    }
                }
                if ($parsed) { return $parsed }
            } catch { continue }
        }
    }
    return $null
}

function Find-DiscoveryFilesByName {
    param(
        [string]$Name,
        [string]$WorkspaceRoot = "$PSScriptRoot\..\.."
    )
    $index = Get-DiscoveryIndex -WorkspaceRoot $WorkspaceRoot
    if (-not $index) { return @() }
    $files = @()
    if ($index -is [System.Array]) {
        $items = $index
    } else {
        $items = $index.files
    }
    if (-not $items) { return @() }
    foreach ($it in $items) {
        if ($it.Name -eq $Name -or $it.FullName -like "*$Name*") { $files += $it.FullName }
    }
    return $files
}

function Find-DiscoveryFileByPattern {
    param(
        [string]$Pattern,
        [string]$WorkspaceRoot = "$PSScriptRoot\..\.."
    )
    $index = Get-DiscoveryIndex -WorkspaceRoot $WorkspaceRoot
    if (-not $index) { return @() }
    $items = $index.files
    if (-not $items) { return @() }
    $matches = @()
    foreach ($it in $items) {
        if ($it.FullName -like $Pattern -or $it.Name -like $Pattern) { $matches += $it.FullName }
    }
    return $matches
}
