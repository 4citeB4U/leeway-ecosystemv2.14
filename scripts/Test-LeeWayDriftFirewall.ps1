# Test-LeeWayDriftFirewall.ps1
# Leeway Ecosystem v2.1.4 - Standards Root Drift Firewall

param(
    [switch]$NoExitOnFail,
    [switch]$VerboseRaw
)

$ErrorActionPreference = "Continue"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$WorkspaceRoot = Split-Path -Parent $ScriptDir
$ReportsRoot = Join-Path $WorkspaceRoot "Archive\reports"
$ReceiptsRoot = Join-Path $WorkspaceRoot "Archive\receipts"

New-Item -ItemType Directory -Force -Path $ReportsRoot | Out-Null
New-Item -ItemType Directory -Force -Path $ReceiptsRoot | Out-Null

$StartedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
$Timestamp = (Get-Date).ToString("yyyyMMdd-HHmmss")

. "$ScriptDir\leeway-receipt-helper.ps1" -ErrorAction SilentlyContinue

$CanonicalRoot = Join-Path $WorkspaceRoot "LeeWay-Standards"
$DeprecatedRoot = Join-Path $WorkspaceRoot "Leeway-Standards"
$ArchivedRoot = Join-Path $WorkspaceRoot "Archive\docs\deprecated-standards-roots\Leeway-Standards"
$RootMapPath = Join-Path $CanonicalRoot "standards-root-map.json"
$SourceRootsPath = Join-Path $WorkspaceRoot "agent-lee-coding-mode\leeway-source-roots.txt"
$SourceLockPath = Join-Path $WorkspaceRoot "agent-lee-coding-mode\source.lock"
$LoaderPath = Join-Path $WorkspaceRoot "agent-lee-coding-mode\runtime\discovery-loader.mjs"
$LoaderPyPath = Join-Path $WorkspaceRoot "agent-lee-coding-mode\runtime\discovery_loader.py"

function Get-TextLines {
    param([string]$Path)
    if (-not (Test-Path $Path)) { return @() }
    return @(Get-Content -Path $Path -ErrorAction SilentlyContinue)
}

function Get-NonCommentLines {
    param([string[]]$Lines)
    return @($Lines | Where-Object { $_ -and $_.Trim() -ne "" -and $_ -notmatch '^\s*#' })
}

function Get-SettingValue {
    param(
        [string[]]$Lines,
        [string]$Key
    )
    foreach ($line in $Lines) {
        if ($line -match "^(?<key>[^=]+)=(?<value>.*)$" -and $Matches.key -eq $Key) {
            return $Matches.value
        }
    }
    return $null
}

function Test-LineContains {
    param(
        [string[]]$Lines,
        [string]$Pattern
    )
    return [bool]($Lines | Where-Object { $_ -match $Pattern } | Select-Object -First 1)
}

$Checks = [ordered]@{}

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host " Leeway Standards Drift Firewall" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host " Started: $StartedAt"
Write-Host ""

Write-Host "--- Root Presence ---" -ForegroundColor White
Write-Host " Checking canonical root... " -NoNewline
$workspaceDirNames = @(cmd /c dir /ad /b "$WorkspaceRoot" 2>$null)
$canonicalRootEntry = $workspaceDirNames | Where-Object { $_ -ceq 'LeeWay-Standards' } | Select-Object -First 1
$Checks['canonicalRootPresent'] = [ordered]@{ ok = $null -ne $canonicalRootEntry; path = $CanonicalRoot }
Write-Host $(if ($Checks['canonicalRootPresent'].ok) { "PASS" } else { "FAIL" }) -ForegroundColor $(if ($Checks['canonicalRootPresent'].ok) { "Green" } else { "Red" })

Write-Host " Checking archived root... " -NoNewline
$Checks['archivedRootPresent'] = [ordered]@{ ok = (Test-Path $ArchivedRoot); path = $ArchivedRoot }
Write-Host $(if ($Checks['archivedRootPresent'].ok) { "PASS" } else { "FAIL" }) -ForegroundColor $(if ($Checks['archivedRootPresent'].ok) { "Green" } else { "Red" })

Write-Host " Checking deprecated root outside archive... " -NoNewline
$deprecatedActive = $null -ne ($workspaceDirNames | Where-Object { $_ -ceq 'Leeway-Standards' } | Select-Object -First 1)
$Checks['deprecatedRootOutsideArchive'] = [ordered]@{ ok = (-not $deprecatedActive); path = $DeprecatedRoot }
Write-Host $(if ($Checks['deprecatedRootOutsideArchive'].ok) { "PASS" } else { "FAIL" }) -ForegroundColor $(if ($Checks['deprecatedRootOutsideArchive'].ok) { "Green" } else { "Red" })

Write-Host ""
Write-Host "--- Standards Root Map ---" -ForegroundColor White
Write-Host " Checking standards-root-map.json... " -NoNewline
if (Test-Path $RootMapPath) {
    try {
        $rootMap = Get-Content -Raw -Path $RootMapPath -ErrorAction Stop | ConvertFrom-Json
        $rootMapOk = $true
        if ($rootMap.canonicalRoot -ne "LeeWay-Standards") { $rootMapOk = $false }
        if (-not ($rootMap.archivedRoots -contains "Archive/docs/deprecated-standards-roots/Leeway-Standards")) { $rootMapOk = $false }
        if ($rootMap.discoveryPolicy -notmatch "Only canonical root is active") { $rootMapOk = $false }
        $Checks['rootMap'] = [ordered]@{
            ok = $rootMapOk
            path = $RootMapPath
            canonicalRoot = $rootMap.canonicalRoot
            archivedRoots = @($rootMap.archivedRoots)
        }
        Write-Host $(if ($rootMapOk) { "PASS" } else { "FAIL" }) -ForegroundColor $(if ($rootMapOk) { "Green" } else { "Red" })
    } catch {
        $Checks['rootMap'] = [ordered]@{ ok = $false; path = $RootMapPath; error = $_.Exception.Message }
        Write-Host "FAIL" -ForegroundColor Red
    }
} else {
    $Checks['rootMap'] = [ordered]@{ ok = $false; path = $RootMapPath; error = "missing" }
    Write-Host "FAIL" -ForegroundColor Red
}

Write-Host ""
Write-Host "--- Source Root Lists ---" -ForegroundColor White
$sourceRootsLines = Get-TextLines $SourceRootsPath
$sourceRootsVisibleLines = Get-NonCommentLines $sourceRootsLines
$sourceRootHasCanonical = [bool]($sourceRootsVisibleLines | Where-Object { $_ -ceq $CanonicalRoot } | Select-Object -First 1)
$sourceRootHasDeprecated = [bool]($sourceRootsVisibleLines | Where-Object { $_ -ceq $DeprecatedRoot } | Select-Object -First 1)
$Checks['sourceRootsCanonicalOnly'] = [ordered]@{
    ok = ($sourceRootHasCanonical -and -not $sourceRootHasDeprecated)
    path = $SourceRootsPath
    canonicalPresent = $sourceRootHasCanonical
    deprecatedPresent = $sourceRootHasDeprecated
}
Write-Host " Checking leeway-source-roots.txt... " -NoNewline
Write-Host $(if ($Checks['sourceRootsCanonicalOnly'].ok) { "PASS" } else { "FAIL" }) -ForegroundColor $(if ($Checks['sourceRootsCanonicalOnly'].ok) { "Green" } else { "Red" })

$sourceLockLines = Get-TextLines $SourceLockPath
$sourceLockVisible = Get-NonCommentLines $sourceLockLines
$sourceLockActiveValue = Get-SettingValue -Lines $sourceLockVisible -Key 'LEEWAY_ACTIVE_STANDARDS_ROOT'
$sourceLockArchivedValue = Get-SettingValue -Lines $sourceLockVisible -Key 'LEEWAY_ARCHIVED_STANDARDS_ROOT'
$sourceLockSourceRootsValue = Get-SettingValue -Lines $sourceLockVisible -Key 'LEEWAY_SOURCE_ROOTS'
$sourceLockHasActive = $sourceLockActiveValue -ceq $CanonicalRoot
$sourceLockHasArchived = $sourceLockArchivedValue -ceq 'Archive\docs\deprecated-standards-roots\Leeway-Standards'
$sourceLockHasCanonicalSourceRoots = $sourceLockSourceRootsValue -and ($sourceLockSourceRootsValue -cmatch [regex]::Escape($CanonicalRoot))
$sourceLockHasDeprecatedActive = $sourceLockSourceRootsValue -and ($sourceLockSourceRootsValue -cmatch [regex]::Escape($DeprecatedRoot))
$Checks['sourceLockAligned'] = [ordered]@{
    ok = ($sourceLockHasActive -and $sourceLockHasArchived -and $sourceLockHasCanonicalSourceRoots -and -not $sourceLockHasDeprecatedActive)
    path = $SourceLockPath
    activeLine = $sourceLockHasActive
    archivedLine = $sourceLockHasArchived
    canonicalSourceRootsLine = $sourceLockHasCanonicalSourceRoots
    deprecatedActiveInSourceRoots = $sourceLockHasDeprecatedActive
}
Write-Host " Checking source.lock... " -NoNewline
Write-Host $(if ($Checks['sourceLockAligned'].ok) { "PASS" } else { "FAIL" }) -ForegroundColor $(if ($Checks['sourceLockAligned'].ok) { "Green" } else { "Red" })

Write-Host ""
Write-Host "--- Discovery Loader Surface ---" -ForegroundColor White
$loaderText = Get-Content -Raw -Path $LoaderPath -ErrorAction SilentlyContinue
$loaderPyText = Get-Content -Raw -Path $LoaderPyPath -ErrorAction SilentlyContinue
$loaderCanonicalOnly = ($loaderText -match 'ACTIVE_STANDARDS_ROOT' -and $loaderText -match 'ARCHIVED_STANDARDS_ROOT' -and $loaderText -notmatch 'LeeWay-Standards", "governance", "manifest.json"' )
$loaderPyCanonicalOnly = ($loaderPyText -match '_standards_root_map_candidates' -and $loaderPyText -match 'LeeWay-Standards')
$Checks['loaderConfigured'] = [ordered]@{
    ok = ($loaderCanonicalOnly -and $loaderPyCanonicalOnly)
    path = $LoaderPath
    pythonPath = $LoaderPyPath
    jsConfigured = $loaderCanonicalOnly
    pyConfigured = $loaderPyCanonicalOnly
}
Write-Host " Checking discovery loader configuration... " -NoNewline
Write-Host $(if ($Checks['loaderConfigured'].ok) { "PASS" } else { "FAIL" }) -ForegroundColor $(if ($Checks['loaderConfigured'].ok) { "Green" } else { "Red" })

$criticalChecks = @(
    'canonicalRootPresent',
    'archivedRootPresent',
    'deprecatedRootOutsideArchive',
    'rootMap',
    'sourceRootsCanonicalOnly',
    'sourceLockAligned',
    'loaderConfigured'
)
$criticalFails = $criticalChecks | Where-Object { -not $Checks[$_].ok } | Measure-Object | Select-Object -ExpandProperty Count
$productionAllowed = ($criticalFails -eq 0)
$verdict = if ($productionAllowed) { "LEEWAY_STANDARDS_ROOT_MERGED_AND_ARCHIVED" } else { "LEEWAY_STANDARDS_ROOT_MERGE_BLOCKED" }
if ($criticalFails -gt 0) {
    $verdict = if ($deprecatedActive -or -not $Checks['rootMap'].ok) { "LEEWAY_STANDARDS_ROOT_MERGE_PARTIAL_CONFLICTS_REMAIN" } else { "LEEWAY_STANDARDS_ROOT_MERGE_BLOCKED" }
}

$EndedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
$Report = [ordered]@{
    schema            = "leeway.standards-root-drift-firewall.v1"
    generatedAt       = $EndedAt
    startedAt         = $StartedAt
    verdict           = $verdict
    productionAllowed = $productionAllowed
    reportPath        = $null
    receiptPath       = $null
    checks            = $Checks
    blockers          = @(
        if (-not $Checks['canonicalRootPresent'].ok) { "canonical root missing" }
        if (-not $Checks['archivedRootPresent'].ok) { "archived root missing" }
        if (-not $Checks['deprecatedRootOutsideArchive'].ok) { "deprecated root still active outside archive" }
        if (-not $Checks['rootMap'].ok) { "standards root map invalid or missing" }
        if (-not $Checks['sourceRootsCanonicalOnly'].ok) { "source roots list still includes deprecated active root" }
        if (-not $Checks['sourceLockAligned'].ok) { "source.lock does not match canonical-only policy" }
        if (-not $Checks['loaderConfigured'].ok) { "discovery loader not aligned to canonical-only policy" }
    )
}

$ReportPath = Join-Path $ReportsRoot "leeway-standards-root-drift-firewall.json"
$Report | ConvertTo-Json -Depth 20 | Set-Content -Path $ReportPath -Encoding UTF8
$Report.reportPath = $ReportPath
Write-Host ""
Write-Host " Report: $ReportPath" -ForegroundColor Gray
Write-Host " Verdict: $verdict" -ForegroundColor $(if ($productionAllowed) { "Green" } else { "Red" })

$ReceiptPath = $null
try {
    $ReceiptPath = Write-LeeWayReceipt `
        -Action "leeway-standards-root-drift-firewall" `
        -Result @{ ok = $productionAllowed; verdict = $verdict; reportPath = $ReportPath } `
        -Metadata @{ agentId = "agent-lee"; controlSurface = "direct-powershell"; domain = "governance"; startedAt = $StartedAt } `
        -StartedAt $StartedAt
} catch {}

if ($ReceiptPath) {
    $Report.receiptPath = $ReceiptPath
    Write-Host " Receipt: $ReceiptPath" -ForegroundColor Gray
}

if ($VerboseRaw) {
    $Report | ConvertTo-Json -Depth 20 | Write-Host
}

if (-not $NoExitOnFail -and -not $productionAllowed) {
    exit 1
}

return [pscustomobject]$Report
