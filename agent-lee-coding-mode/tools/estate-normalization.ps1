param(
    [switch]$WhatIf,
    [string]$ApprovalToken
)

$RequiredToken = 'I_AUTHORIZE_LEEWAY_DESTRUCTIVE_ACTION'

$ScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Definition
# agent-lee-coding-mode/tools -> workspace root is two levels up
$WorkspaceRoot = (Resolve-Path (Join-Path $ScriptRoot '..\..')).ProviderPath
$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$ArchiveBase = Join-Path $WorkspaceRoot "Archive"
$ReceiptDir = Join-Path $ArchiveBase "receipts"
New-Item -ItemType Directory -Path $ReceiptDir -Force | Out-Null

# Mapping: pattern -> relative archive path
# Conservative mapping: archive audits, plans, generated, and receipts only.
$mappings = @(
    @{ pattern = 'AGENT_LEE_*.md'; dest = "plans" },
    @{ pattern = 'AGENT-LEE-*.md'; dest = "audits" },
    @{ pattern = 'VOICE-KERNEL-INTEGRATION-GUIDE.md'; dest = "agent-lee-voice-kernel\docs" },
    @{ pattern = 'leeway-created-files.log'; dest = "generated" },
    @{ pattern = 'leeway-file-inventory.log'; dest = "generated" },
    @{ pattern = 'COPILOT_*_RECEIPT.json'; dest = "receipts" },
    @{ pattern = 'receipts'; dest = "receipts" },
    @{ pattern = 'leeway-*.log'; dest = "generated" }
)

$movedItems = @()

foreach ($map in $mappings) {
    $pattern = $map.pattern
    $destRel = $map.dest
    $destDir = Join-Path $ArchiveBase $destRel
    New-Item -ItemType Directory -Path $destDir -Force | Out-Null

    # If pattern is a directory name exactly, move the directory
    $fullPath = Join-Path $WorkspaceRoot $pattern
    if (Test-Path $fullPath -PathType Container) {
        $items = @(Get-Item $fullPath)
    } else {
        $items = Get-ChildItem -Path $WorkspaceRoot -Filter $pattern -Force -ErrorAction SilentlyContinue
    }

    if (!$items -or $items.Count -eq 0) {
        Write-Output "No match for pattern: $pattern"
        continue
    }

    foreach ($it in $items) {
        $dest = Join-Path $destDir $it.Name
        if ($WhatIf -or ($ApprovalToken -ne $RequiredToken)) {
            Write-Output "WhatIf: Move $($it.FullName) -> $dest"
            continue
        }
        try {
            Move-Item -Path $it.FullName -Destination $dest -Force -ErrorAction Stop
            Write-Output "Moved $($it.FullName) -> $dest"
            $movedItems += $dest
        } catch {
            Write-Warning "Failed to move $($it.FullName): $_"
        }
    }
}

# Write a receipt
$receipt = [PSCustomObject]@{
    schema = 'leeway.estate.normalization.v1'
    executedAt = (Get-Date).ToString('o')
    whatIf = [bool]$WhatIf
    approvalProvided = ($ApprovalToken -eq $RequiredToken)
    movedItems = $movedItems
}
$receiptPath = Join-Path $ReceiptDir "estate-normalization-receipt-$Timestamp.json"
$receipt | ConvertTo-Json -Depth 6 | Out-File -FilePath $receiptPath -Encoding utf8
Write-Output "Wrote receipt to $receiptPath"
