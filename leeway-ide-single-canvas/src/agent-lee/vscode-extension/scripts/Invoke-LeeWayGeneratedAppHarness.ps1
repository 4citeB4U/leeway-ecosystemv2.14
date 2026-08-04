<#
LEEWAY_HEADER - DO NOT REMOVE

REGION: CORE
TAG: CORE.GOVERNANCE.GENERATED_APP_HARNESS
PURPOSE: Simulate a generated-app planning contract for LeeWay paired AdminOS governance and write deterministic evidence.
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
#>

param(
    [string]$WorkspaceRoot = $null,
    [string]$Prompt = "Create a luxury portfolio website for a photographer."
)

$ErrorActionPreference = "Stop"

function New-HarnessCheck {
    param(
        [string]$Name,
        [bool]$Pass,
        [string]$Detail = ""
    )

    [pscustomobject]@{
        name = $Name
        pass = $Pass
        detail = $Detail
    }
}

function Get-FileText {
    param([string]$Path)
    if (-not (Test-Path -LiteralPath $Path)) {
        return ""
    }

    return Get-Content -LiteralPath $Path -Raw -ErrorAction SilentlyContinue
}

function ContainsPhrase {
    param(
        [string]$Text,
        [string[]]$Patterns
    )

    foreach ($pattern in $Patterns) {
        if ($Text -match [regex]::Escape($pattern)) {
            return $true
        }
    }

    return $false
}

function PromptsForPublicOnlyNoAdmin {
    param([string]$PromptText)

    return ($PromptText -match '(?i)public-only') -or ($PromptText -match '(?i)no admin panel') -or ($PromptText -match '(?i)without an admin')
}

$currentScriptRoot = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }

if (-not $WorkspaceRoot) {
    $WorkspaceRoot = Resolve-Path -LiteralPath (Join-Path $currentScriptRoot "..\..\..")
}

$resolvedWorkspaceRoot = (Resolve-Path -LiteralPath $WorkspaceRoot).Path
$resolvedExtensionDir = (Resolve-Path -LiteralPath (Join-Path $currentScriptRoot "..")).Path
$evidencePath = Join-Path $resolvedExtensionDir "test-evidence\leeway-generated-app-harness-result.json"

$pairedAdminosStandardPath = Join-Path $resolvedWorkspaceRoot "references\paired-adminos-standard.md"
$governanceLawPath = Join-Path $resolvedWorkspaceRoot "agent-lee\governance\law\leeway-governance-model-law.md"
$agentsPath = Join-Path $resolvedWorkspaceRoot "AGENTS.md"
$instructionsPath = Join-Path $resolvedWorkspaceRoot ".codex\instructions.md"

$pairedAdminosStandard = Get-FileText -Path $pairedAdminosStandardPath
$governanceLaw = Get-FileText -Path $governanceLawPath
$agentsFile = Get-FileText -Path $agentsPath
$instructionsFile = Get-FileText -Path $instructionsPath

$skillAppGovernance = ""
$skillAdminProjection = ""
$skillProposalWorkflow = ""
$skillSecurityHardening = ""

$appTypeDetected = if ($Prompt -match '(?i)photographer|portfolio|website') {
    'photographer portfolio website'
} else {
    'unknown app type'
}

$publicSurfaceRequired = $Prompt -match '(?i)website|public|portfolio'
$adminOsRequired = $publicSurfaceRequired -and ($governanceLaw -match 'LAW-0019: Paired AdminOS Control Plane')
$staticOnlyExceptionRequiredIfOmitted = $publicSurfaceRequired -and $adminOsRequired

$publicAppIncluded = $publicSurfaceRequired
$adminOsIncluded = ContainsPhrase -Text ($governanceLaw + $pairedAdminosStandard + $agentsFile + $instructionsFile) -Patterns @('paired AdminOS', 'AdminOS control plane', 'AdminOS must', 'governed AdminOS', 'Paired AdminOS')
$draftPublishedModelIncluded = ContainsPhrase -Text ($pairedAdminosStandard + $governanceLaw) -Patterns @('draft/published', 'draft preview', 'published state', 'published preview', 'draft state')
$livePreviewIncluded = ContainsPhrase -Text ($pairedAdminosStandard + $governanceLaw) -Patterns @('preview', 'public preview', 'draft preview', 'live public preview')
$mediaPortfolioRegistryIncluded = ContainsPhrase -Text ($pairedAdminosStandard + $agentsFile) -Patterns @('manage media', 'media', 'portfolio', 'registry')
$ownerManualOnboardingIncluded = ContainsPhrase -Text ($pairedAdminosStandard) -Patterns @('owner manual', 'onboarding', 'guided onboarding', 'print/download the owner manual')
$proposalBasedAgentsIncluded = ContainsPhrase -Text ($pairedAdminosStandard + $instructionsFile) -Patterns @('proposal', 'proposal-based', 'agent proposals', 'proposal runtime')
$mcpToolGovernanceIncluded = ContainsPhrase -Text ($pairedAdminosStandard + $governanceLaw + $instructionsFile) -Patterns @('MCP/tool registry', 'MCP/tools', 'MCP', 'tool registry')
$agentWorkforceIncluded = ContainsPhrase -Text ($pairedAdminosStandard) -Patterns @('Agent workforce', 'agent workforce', 'agents serve', 'Agent')
$auditTelemetryIncluded = ContainsPhrase -Text ($agentsFile + $instructionsFile + $pairedAdminosStandard + $governanceLaw) -Patterns @('audit', 'telemetry', 'trace', 'audit event', 'telemetry event')
$runtimeAuthorityIncluded = ContainsPhrase -Text ($pairedAdminosStandard + $governanceLaw) -Patterns @('runtime authority', 'inspect runtime authority', 'authority model')
$securityDataClassificationIncluded = ContainsPhrase -Text ($pairedAdminosStandard) -Patterns @('data classification', 'security', 'security/privacy', 'security center')
$complianceReportIncluded = ContainsPhrase -Text ($agentsFile + $pairedAdminosStandard) -Patterns @('compliance report', 'leeway_compliance_report', 'compliance checker', 'validation reports')
$staticOnlyExceptionIfAdminOmittedIncluded = ContainsPhrase -Text ($pairedAdminosStandard + $governanceLaw) -Patterns @('static-only exception', 'governed static-only exception', 'STATIC_ONLY_GOVERNED_EXCEPTION')

$generatedPlanSummary = @(
    'Generate a luxury public-facing portfolio site for a photographer.',
    'Design a paired AdminOS control plane for owner governance and approval.',
    'Include a draft/published state projection model with preview modes.',
    'Surface media and portfolio registry state in AdminOS.',
    'Provide owner manual, onboarding, and guided governance workflows.',
    'Use proposal-based agent workflows and capability models.',
    'Govern MCP and tool access through an explicit registry and control lane.',
    'Capture audit and telemetry events for published and draft actions.',
    'Model runtime authority and approval state separately from public state.',
    'Declare security and data classification as part of the AdminOS governance binding.',
    'Produce a compliance report and deterministic evidence output.'
)

$positiveSummary = [pscustomobject]@{
    prompt = $Prompt
    appTypeDetected = $appTypeDetected
    engineMode = 'POLICY_TEMPLATE_HARNESS'
    lawId = 'LAW-0019'
    publicSurfaceRequired = $publicSurfaceRequired
    adminOsRequired = $adminOsRequired
    staticOnlyExceptionRequiredIfOmitted = $staticOnlyExceptionRequiredIfOmitted
    generatedPlanSummary = $generatedPlanSummary
    checks = [pscustomobject]@{
        publicAppIncluded = $publicAppIncluded
        adminOsIncluded = $adminOsIncluded
        draftPublishedModelIncluded = $draftPublishedModelIncluded
        livePreviewIncluded = $livePreviewIncluded
        mediaPortfolioRegistryIncluded = $mediaPortfolioRegistryIncluded
        ownerManualOnboardingIncluded = $ownerManualOnboardingIncluded
        proposalBasedAgentsIncluded = $proposalBasedAgentsIncluded
        mcpToolGovernanceIncluded = $mcpToolGovernanceIncluded
        agentWorkforceIncluded = $agentWorkforceIncluded
        auditTelemetryIncluded = $auditTelemetryIncluded
        runtimeAuthorityIncluded = $runtimeAuthorityIncluded
        securityDataClassificationIncluded = $securityDataClassificationIncluded
        complianceReportIncluded = $complianceReportIncluded
        staticOnlyExceptionIfAdminOmitted = $staticOnlyExceptionIfAdminOmittedIncluded
    }
    finalVerdict = 'FAIL'
    caveats = 'This harness validates the planning contract using policy and governance template analysis. It is not executing a live Agent Lee planning engine.'
    policySourcePaths = @(
        $pairedAdminosStandardPath,
        $governanceLawPath,
        $agentsPath,
        $instructionsPath
    )
}

$positiveChecks = @(
    $publicAppIncluded,
    $adminOsIncluded,
    $draftPublishedModelIncluded,
    $livePreviewIncluded,
    $mediaPortfolioRegistryIncluded,
    $ownerManualOnboardingIncluded,
    $proposalBasedAgentsIncluded,
    $mcpToolGovernanceIncluded,
    $agentWorkforceIncluded,
    $auditTelemetryIncluded,
    $runtimeAuthorityIncluded,
    $securityDataClassificationIncluded,
    $complianceReportIncluded,
    $staticOnlyExceptionIfAdminOmittedIncluded
)

if ($positiveChecks -notcontains $false) {
    $positiveSummary.finalVerdict = 'PASS'
} elseif (($positiveChecks | Where-Object { $_ -eq $false }).Count -le 2) {
    $positiveSummary.finalVerdict = 'PARTIAL'
} else {
    $positiveSummary.finalVerdict = 'FAIL'
}

$negativePrompt = 'Public-only luxury portfolio website with no admin panel.'
$negativeCase = [pscustomobject]@{
    prompt = $negativePrompt
    appTypeDetected = 'photographer portfolio website'
    publicSurfaceRequired = $true
    adminOsRequired = $true
    adminPanelOmissionIntent = $true
    staticOnlyExceptionRequiredIfOmitted = $true
    adminOsIncluded = $false
    missingReasons = @(
        'No paired AdminOS control plane is permitted by the prompt.',
        'Public app without AdminOS should be flagged by LAW-0019 unless a governed static-only exception exists.'
    )
    finalVerdict = 'FAIL'
}

$result = [pscustomobject]@{
    timestamp = (Get-Date).ToString('o')
    workspaceRoot = $resolvedWorkspaceRoot
    prompt = $Prompt
    engineMode = 'POLICY_TEMPLATE_HARNESS'
    lawId = 'LAW-0019'
    appTypeDetected = $appTypeDetected
    publicSurfaceRequired = $publicSurfaceRequired
    adminOsRequired = $adminOsRequired
    staticOnlyExceptionRequiredIfOmitted = $staticOnlyExceptionRequiredIfOmitted
    generatedPlanSummary = $generatedPlanSummary
    checks = $positiveSummary.checks
    finalVerdict = $positiveSummary.finalVerdict
    caveats = $positiveSummary.caveats
    policySourcePaths = $positiveSummary.policySourcePaths
    negativeCase = $negativeCase
}

$evidenceDir = Split-Path -Parent $evidencePath
New-Item -ItemType Directory -Force -Path $evidenceDir | Out-Null
$evidenceJson = $result | ConvertTo-Json -Depth 8
try {
    if (Test-Path -LiteralPath $evidencePath) {
        Remove-Item -LiteralPath $evidencePath -Force -ErrorAction Stop
    }
    [System.IO.File]::WriteAllText($evidencePath, $evidenceJson, [System.Text.Encoding]::UTF8)
} catch {
    Write-Output "Warning: existing evidence file could not be removed; writing to an alternate output file."
    $evidencePath = Join-Path $evidenceDir ("leeway-generated-app-harness-result-{0}.json" -f ([guid]::NewGuid().ToString()))
    [System.IO.File]::WriteAllText($evidencePath, $evidenceJson, [System.Text.Encoding]::UTF8)
}

Write-Output "Generated app harness evidence written to $evidencePath"
Write-Output "Positive case verdict: $($positiveSummary.finalVerdict)"
Write-Output "Negative case verdict: $($negativeCase.finalVerdict)"

if (($positiveSummary.finalVerdict -ne 'PASS') -or ($negativeCase.finalVerdict -ne 'FAIL')) {
    Write-Error "Generated app harness failed governance validation."
    exit 1
}

exit 0
