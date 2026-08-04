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
$ArchiveDir = Join-Path $WorkspaceRoot "Archive\top-level-cleanup-$Timestamp"
New-Item -ItemType Directory -Path $ArchiveDir -Force | Out-Null

$itemsToMove = @(
    'build.log',
    'fabric_err.txt',
    'supervisor-log.txt',
    'tempfile.txt',
    'test-output.mp3',
    'real.wav',
    'test_1.wav',
    'test_2.wav',
    'test_3.wav',
    'tmp',
    '.tmp',
    '_logs',
    'logs',
    'start-leeway-local-agent-stack.ps1.bak*',
    '*.bak'
)

Write-Output "Archive target: $ArchiveDir"

foreach ($pattern in $itemsToMove) {
    $matches = Get-ChildItem -Path $WorkspaceRoot -Filter $pattern -Force -ErrorAction SilentlyContinue
    if (!$matches) {
        Write-Output "No match for pattern: $pattern"
        continue
    }
    foreach ($m in $matches) {
        $dest = Join-Path $ArchiveDir $m.Name
        try {
            if ($WhatIf) {
                Write-Output "WhatIf: Move $($m.FullName) -> $ArchiveDir"
                continue
            }
            Move-Item -Path $m.FullName -Destination $ArchiveDir -Force -ErrorAction Stop
            Write-Output "Moved $($m.FullName) -> $ArchiveDir"
        } catch {
            Write-Warning "Failed to move $($m.FullName): $_"
        }
    }
}

# Write a receipt JSON with moved items
$moved = Get-ChildItem -Path $ArchiveDir -Recurse -File -ErrorAction SilentlyContinue | ForEach-Object { $_.FullName }
$receipt = [PSCustomObject]@{
    schema = 'leeway.cleanup.top-level.v1'
    executedAt = (Get-Date).ToString('o')
    archivePath = $ArchiveDir
    movedItems = $moved
}
$receiptPath = Join-Path $ArchiveDir "cleanup-receipt-$Timestamp.json"
$receipt | ConvertTo-Json -Depth 6 | Out-File -FilePath $receiptPath -Encoding utf8
Write-Output "Wrote receipt to $receiptPath"
