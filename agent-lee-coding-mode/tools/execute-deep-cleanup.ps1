param(
    [Parameter(Mandatory=$true)]
    [string]$ApprovalToken,
    [switch]$WhatIf
)

$RequiredToken = 'I_AUTHORIZE_LEEWAY_DESTRUCTIVE_ACTION'
if ($ApprovalToken -ne $RequiredToken) {
    Write-Error "Approval token mismatch. Provide exact: $RequiredToken"
    exit 1
}

$ScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Definition
$WorkspaceRoot = (Resolve-Path (Join-Path $ScriptRoot '..\..')).ProviderPath
$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$ArchiveDir = Join-Path $WorkspaceRoot "Archive\deep-cleanup-$Timestamp"
New-Item -ItemType Directory -Path $ArchiveDir -Force | Out-Null

# Conservative candidate list - non-runtime-critical, dev, bench, or presentation artifacts
$candidates = @(
    'Leeway system coverage',
    'leeway-ide-single-canvas',
    'leeway_complete_cockpit',
    'leeway-80-bench',
    'leeway-agentic-svg-creator-2',
    'leeway-presentation-engine',
    'leeway-model-family',
    'leeway-created-files.log',
    'leeway-file-inventory.log'
)

Write-Output "Archive target: $ArchiveDir"

foreach ($name in $candidates) {
    $path = Join-Path $WorkspaceRoot $name
    if (-not (Test-Path $path)) {
        Write-Output "Not found: $name"
        continue
    }
    try {
        if ($WhatIf) {
            Write-Output "WhatIf: Move $path -> $ArchiveDir"
            continue
        }
        Move-Item -Path $path -Destination $ArchiveDir -Force -ErrorAction Stop
        Write-Output "Moved $path -> $ArchiveDir"
    } catch {
        $err = $_.ToString()
        Write-Warning ("Failed to move {0}: {1}" -f $path, $err)
    }
}

# Write a receipt JSON
$moved = Get-ChildItem -Path $ArchiveDir -Recurse -File -ErrorAction SilentlyContinue | ForEach-Object { $_.FullName }
$receipt = [PSCustomObject]@{
    schema = 'leeway.cleanup.deep.v1'
    executedAt = (Get-Date).ToString('o')
    archivePath = $ArchiveDir
    movedItems = $moved
}
$receiptPath = Join-Path $ArchiveDir "deep-cleanup-receipt-$Timestamp.json"
$receipt | ConvertTo-Json -Depth 6 | Out-File -FilePath $receiptPath -Encoding utf8
Write-Output "Wrote receipt to $receiptPath"
